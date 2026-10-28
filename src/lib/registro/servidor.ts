import "server-only";
import type { ZodType } from "zod";
import { ErroRegistro } from "./erros";

const FUNCOES = ["registrar_ocorrencia", "acompanhar_por_token", "solicitar_exclusao_por_token", "consumir_limite", "triagem_sinais"] as const;
export type FuncaoRegistro = (typeof FUNCOES)[number];

function obrigatoria(...partes: string[]): string {
  // Composição em runtime também evita incorporar identificadores sensíveis completos no build.
  const valor = process.env[partes.join("_")]?.trim();
  if (!valor) throw new ErroRegistro("indisponivel");
  return valor;
}
function inteiro(nome: string): number {
  const valor = obrigatoria(nome);
  if (!/^[1-9][0-9]*$/.test(valor)) throw new ErroRegistro("indisponivel");
  const n = Number(valor);
  if (!Number.isSafeInteger(n)) throw new ErroRegistro("indisponivel");
  return n;
}

/** Lida apenas no servidor, sem exportar configuração para componente de cliente. */
export function configServidor() {
  let url: URL;
  try { url = new URL(obrigatoria("NEXT_PUBLIC_SUPABASE_URL")); }
  catch { throw new ErroRegistro("indisponivel"); }
  const loopbackDev = process.env.NODE_ENV === "development" && url.protocol === "http:"
    && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if ((url.protocol !== "https:" && !loopbackDev) || url.username || url.password || url.search || url.hash || url.pathname !== "/") throw new ErroRegistro("indisponivel");
  const modoPublicacao = process.env.MODO_PUBLICACAO?.trim() || "moderar_tudo";
  if (modoPublicacao !== "moderar_tudo" && modoPublicacao !== "texto_automatico") throw new ErroRegistro("indisponivel");
  const hmacSegredo = obrigatoria("HMAC", "SEGREDO");
  if (Buffer.byteLength(hmacSegredo, "utf8") < 32) throw new ErroRegistro("indisponivel");
  return {
    base: url.origin,
    chave: obrigatoria("SUPABASE", "SERVICE", "ROLE", "KEY"),
    turnstileSecret: obrigatoria("TURNSTILE", "SECRET"),
    turnstileSiteKey: obrigatoria("NEXT_PUBLIC_TURNSTILE_SITE_KEY"),
    hmacSegredo,
    modoPublicacao,
    limites: {
      registrar: inteiro("LIMITE_REGISTRO_MAXIMO"), acompanhar: inteiro("LIMITE_ACOMPANHAR_MAXIMO"),
      excluir: inteiro("LIMITE_EXCLUIR_MAXIMO"), janelaSegundos: inteiro("LIMITE_JANELA_SEGUNDOS"),
    },
    triagem: { janelaSegundos: inteiro("TRIAGEM_JANELA_SEGUNDOS"), limiteOrigem: inteiro("TRIAGEM_LIMITE_ORIGEM") },
  };
}

export async function rpc<T>(funcao: FuncaoRegistro, parametros: Record<string, unknown>, schema: ZodType<T>): Promise<T> {
  if (!(FUNCOES as readonly string[]).includes(funcao)) throw new ErroRegistro("indisponivel");
  const { base, chave } = configServidor();
  let resposta: Response;
  try {
    resposta = await fetch(`${base}/rest/v1/rpc/${funcao}`, {
      method: "POST", cache: "no-store", signal: AbortSignal.timeout(8000),
      headers: { apikey: chave, Authorization: `Bearer ${chave}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(parametros),
    });
  } catch { throw new ErroRegistro("indisponivel"); }
  if (!resposta.ok) {
    let codigo: unknown;
    try { codigo = (await resposta.json() as { code?: unknown }).code; } catch { /* resposta externa sem contrato */ }
    if (codigo === "P0002") throw new ErroRegistro("token_invalido", codigo);
    if (codigo === "22023" || codigo === "23505") throw new ErroRegistro("conflito", codigo);
    throw new ErroRegistro("indisponivel");
  }
  let corpo: unknown;
  try { corpo = await resposta.json(); } catch { throw new ErroRegistro("indisponivel"); }
  const valido = schema.safeParse(corpo);
  if (!valido.success) throw new ErroRegistro("indisponivel");
  return valido.data;
}
