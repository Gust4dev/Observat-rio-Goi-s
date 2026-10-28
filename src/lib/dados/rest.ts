import "server-only";
import type { ZodType } from "zod";

// Cliente fetch fino ao PostgREST do Supabase (somente SELECT nas views públicas e tabelas de referência).
// Sem supabase-js (M2-2). Sempre `select` com lista explícita; query montada com URLSearchParams.

export const RECURSOS_PERMITIDOS = [
  "v_dados_painel",
  "v_ocorrencias_publicas",
  "v_imagens_publicas",
  "v_atualizacoes_publicas",
  "v_respostas_publicas",
  "v_indicadores_gerais",
  "v_indicadores_municipio_categoria",
  "v_indicadores_mensal",
  "v_indicadores_situacao",
  "municipios",
  "categorias",
] as const;
export type Recurso = (typeof RECURSOS_PERMITIDOS)[number];

const COLUNA_RE = /^[a-z][a-z0-9_]*$/;
const LIMITE_MAXIMO = 300; // 246 municípios de Goiás cabem em uma chamada
const TIMEOUT_MS = 8000;

export class ErroRest extends Error {
  constructor(
    message: string,
    readonly recurso: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ErroRest";
  }
}
export type OpcoesConsulta = {
  /** Colunas explícitas. `*` e nomes fora de [a-z0-9_] são recusados. */
  select: readonly string[];
  /** Pares [coluna, "operador.valor"]. O valor JÁ deve ter sido validado por quem chama. */
  filtros?: readonly (readonly [string, string])[];
  ordem?: readonly { coluna: string; direcao: "asc" | "desc" }[];
  limite?: number;
};

/** Pura (sem rede). Lança se receber select inseguro. */
export function montarQuery(o: OpcoesConsulta): URLSearchParams {
  if (o.select.length === 0) throw new Error("select vazio");
  for (const c of o.select) {
    if (!COLUNA_RE.test(c)) throw new Error(`coluna inválida no select: ${c}`);
  }
  const q = new URLSearchParams();
  q.set("select", o.select.join(","));
  for (const [coluna, valor] of o.filtros ?? []) {
    if (!COLUNA_RE.test(coluna)) throw new Error(`coluna inválida no filtro: ${coluna}`);
    q.append(coluna, valor);
  }
  if (o.ordem?.length) {
    for (const x of o.ordem) {
      if (!COLUNA_RE.test(x.coluna) || (x.direcao !== "asc" && x.direcao !== "desc")) {
        throw new Error("ordem inválida");
      }
    }
    q.set("order", o.ordem.map((x) => `${x.coluna}.${x.direcao}`).join(","));
  }
  if (o.limite !== undefined) {
    if (!Number.isInteger(o.limite) || o.limite < 1 || o.limite > LIMITE_MAXIMO) {
      throw new Error("limite inválido");
    }
    q.set("limit", String(o.limite));
  }
  return q;
}

function config(): { base: string; chave: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url) throw new Error("Variável de ambiente ausente: NEXT_PUBLIC_SUPABASE_URL");
  if (!chave) throw new Error("Variável de ambiente ausente: NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return { base: url.replace(/\/+$/, ""), chave };
}

export async function consultar<T>(
  recurso: Recurso,
  opcoes: OpcoesConsulta,
  schema: ZodType<T>,
): Promise<T[]> {
  if (!(RECURSOS_PERMITIDOS as readonly string[]).includes(recurso)) {
    throw new Error(`recurso não permitido: ${recurso}`);
  }
  const { base, chave } = config();
  const url = `${base}/rest/v1/${recurso}?${montarQuery(opcoes).toString()}`;

  let resposta: Response;
  try {
    resposta = await fetch(url, {
      method: "GET",
      headers: { apikey: chave, Authorization: `Bearer ${chave}`, Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    throw new ErroRest(`falha de rede ao consultar ${recurso}: ${(e as Error).name}`, recurso);
  }
  if (!resposta.ok) {
    throw new ErroRest(`PostgREST respondeu ${resposta.status} em ${recurso}`, recurso, resposta.status);
  }
  const corpo: unknown = await resposta.json();
  const r = schema.array().safeParse(corpo);
  if (!r.success) {
    throw new ErroRest(`resposta de ${recurso} fora do contrato: ${r.error.issues[0]?.message ?? "?"}`, recurso);
  }
  return r.data;
}
