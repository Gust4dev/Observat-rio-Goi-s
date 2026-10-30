import { z } from "zod";
import { slugSchema, idSchema } from "./params";
import { COLUNAS_DADO_PAINEL, dadoPainelSchema, type DadoPainel } from "./schemas";
import type { OpcoesConsulta } from "./rest";

export const MAX_LINHAS_EXPORTACAO = 5000;
export class LimiteExportacao extends Error {}
export const filtrosExportacaoSchema = z.strictObject({ municipio: slugSchema.optional(), categoria: slugSchema.optional() });
const parametrosSchema = filtrosExportacaoSchema.extend({ formato: z.enum(["json", "csv"]).default("json") });

export function lerParametrosExportacao(params: URLSearchParams) {
  const entrada: Record<string, string> = {};
  for (const [chave, valor] of params) {
    if (Object.hasOwn(entrada, chave)) throw new Error("Parâmetro repetido");
    Object.defineProperty(entrada, chave, { value: valor, enumerable: true });
  }
  return parametrosSchema.parse(entrada);
}

/** Só recebe células da view já suprimida; nunca consulta ocorrências individuais. */
export async function carregarExportacao(
  entrada: z.infer<typeof filtrosExportacaoSchema>,
  consultarLote: (opcoes: OpcoesConsulta) => Promise<DadoPainel[]>,
) {
  const f = filtrosExportacaoSchema.parse(entrada);
  const itens: DadoPainel[] = [];
  let ultimo: string | undefined;
  for (;;) {
    const filtros: [string, string][] = [];
    if (f.municipio) filtros.push(["municipio_slug", `eq.${f.municipio}`]);
    if (f.categoria) filtros.push(["categoria_slug", `eq.${f.categoria}`]);
    if (ultimo) filtros.push(["id", `gt.${idSchema.parse(ultimo)}`]);
    const limite = Math.min(300, MAX_LINHAS_EXPORTACAO + 1 - itens.length);
    const lote = dadoPainelSchema.array().parse(await consultarLote({
      select: COLUNAS_DADO_PAINEL, filtros, ordem: [{ coluna: "id", direcao: "asc" }], limite,
    }));
    itens.push(...lote);
    if (itens.length > MAX_LINHAS_EXPORTACAO) throw new LimiteExportacao();
    if (lote.length < limite) return itens;
    const proximo = lote[lote.length - 1].id;
    if (ultimo && proximo <= ultimo) throw new Error("Cursor sem progresso");
    ultimo = proximo;
  }
}

function celulaCSV(valor: string | number): string {
  let texto = String(valor);
  // Neutraliza fórmulas inclusive após espaços e controles iniciais.
  if (typeof valor === "string" && (/^[\s\u0000-\u001f]*[=+@-]/.test(texto) || /^[\t\r\n]/.test(texto))) texto = `'${texto}`;
  return `"${texto.replaceAll('"', '""')}"`;
}

export function exportarCSV(itens: DadoPainel[]) {
  return "\uFEFF" + [COLUNAS_DADO_PAINEL.join(","), ...itens.map((item) => COLUNAS_DADO_PAINEL.map((coluna) => celulaCSV(item[coluna])).join(","))].join("\r\n") + "\r\n";
}
