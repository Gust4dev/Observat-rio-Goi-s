import "server-only";
import { isIP } from "node:net";
import { z, type ZodType } from "zod";
import { ErroRegistro, respostaErro } from "./erros";
import { bytea, chaveLimite, hmacOrigem } from "./seguranca";
import { configServidor, rpc } from "./servidor";
import { mesmaOrigem } from "../seguranca/origem";
import { resolveSupabaseKeys, supabaseApiHeaders } from "../supabase-keys.mjs";

type Operacao = "registrar" | "acompanhar" | "excluir" | "foto";
export type ConfigRegistro = ReturnType<typeof configServidor>;
const MAX_CORPO_BYTES = 24 * 1024;
const headersPrivados = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, nofollow", "Referrer-Policy": "no-referrer" };

export function respostaPrivada(dados: unknown, status = 200) { return Response.json(dados, { status, headers: headersPrivados }); }

/** Nenhum texto de entrada, header, endereço ou segredo é incluído no log. */
export function falhaHttp(erro: unknown, operacao: Operacao, etapa?: string) {
  if (!(erro instanceof ErroRegistro) || erro.codigo === "indisponivel") {
    console.error(JSON.stringify({ evento: "falha_operacao", operacao, ...(etapa ? { etapa } : {}), codigo: erro instanceof ErroRegistro ? erro.codigo : "inesperado", requisicao: crypto.randomUUID() }));
  }
  const r = respostaErro(erro); r.headers.set("Referrer-Policy", "no-referrer"); return r;
}

export async function entradaHttp<T>(request: Request, schema: ZodType<T>, token = false): Promise<T> {
  const url = new URL(request.url);
  if (!mesmaOrigem(request) || request.headers.get("sec-fetch-site") === "cross-site") throw new ErroRegistro("origem_invalida");
  if (url.search) throw new ErroRegistro(token ? "token_invalido" : "entrada_invalida");
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") throw new ErroRegistro("corpo_invalido");
  const tamanho = request.headers.get("content-length");
  if (tamanho && (!/^\d+$/.test(tamanho) || Number(tamanho) > MAX_CORPO_BYTES)) throw new ErroRegistro("corpo_grande");
  if (!request.body) throw new ErroRegistro("corpo_invalido");
  const leitor = request.body.getReader(); const partes: Uint8Array[] = []; let total = 0;
  try {
    while (true) {
      const { value, done } = await leitor.read(); if (done) break;
      total += value.byteLength;
      if (total > MAX_CORPO_BYTES) { await leitor.cancel(); throw new ErroRegistro("corpo_grande"); }
      partes.push(value);
    }
  } catch (erro) { if (erro instanceof ErroRegistro) throw erro; throw new ErroRegistro("corpo_invalido"); }
  finally { leitor.releaseLock(); }
  let corpo: unknown;
  try {
    const bytes = new Uint8Array(total); let offset = 0;
    for (const parte of partes) { bytes.set(parte, offset); offset += parte.byteLength; }
    corpo = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch { throw new ErroRegistro("corpo_invalido"); }
  const resultado = schema.safeParse(corpo);
  if (!resultado.success) throw new ErroRegistro(token && resultado.error.issues.some((issue) => issue.path[0] === "token") ? "token_invalido" : "entrada_invalida");
  return resultado.data;
}

export function origemHttp(request: Request, config: ConfigRegistro): string {
  // Vercel sobrescreve XFF no ingresso. Fora dela, o header do público não é confiável.
  let endereco = "local-sem-endereco";
  if (process.env.VERCEL === "1") {
    const informado = request.headers.get("x-forwarded-for")?.trim();
    if (!informado || !isIP(informado)) throw new ErroRegistro("indisponivel");
    endereco = informado;
  } else if (process.env.NODE_ENV === "production" && !["localhost", "127.0.0.1", "[::1]"].includes(new URL(request.url).hostname)) throw new ErroRegistro("indisponivel");
  // UA não compõe a chave: o cliente poderia mudá-lo para contornar o limite.
  return hmacOrigem(config.hmacSegredo, endereco, "");
}

export async function limitarHttp(request: Request, config: ConfigRegistro, operacao: Operacao) {
  const origem = origemHttp(request, config);
  const permitida = await rpc("consumir_limite", {
    p_chave: bytea(chaveLimite(config.hmacSegredo, operacao, origem)),
    p_janela: `${config.limites.janelaSegundos} seconds`, p_maximo: config.limites[operacao],
  }, z.boolean());
  if (!permitida) throw new ErroRegistro("limite_excedido");
  return origem;
}

export async function resolverReferencia(recurso: "municipios" | "categorias", slug: string, config: ConfigRegistro): Promise<number> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new ErroRegistro("entrada_invalida");
  const chavePublica = resolveSupabaseKeys(process.env).publicKey;
  if (!chavePublica) throw new ErroRegistro("indisponivel");
  const query = new URLSearchParams({ select: "id,slug", slug: `eq.${slug}`, limit: "1" });
  let r: Response;
  try { r = await fetch(`${config.base}/rest/v1/${recurso}?${query}`, { cache: "no-store", headers: { ...supabaseApiHeaders(chavePublica), Accept: "application/json" }, signal: AbortSignal.timeout(8000) }); }
  catch { throw new ErroRegistro("indisponivel"); }
  if (!r.ok) throw new ErroRegistro("indisponivel");
  let corpo: unknown; try { corpo = await r.json(); } catch { throw new ErroRegistro("indisponivel"); }
  const resultado = z.array(z.object({ id: z.number().int().positive(), slug: z.literal(slug) })).max(1).safeParse(corpo);
  if (!resultado.success) throw new ErroRegistro("indisponivel");
  if (!resultado.data.length) throw new ErroRegistro("entrada_invalida");
  return resultado.data[0].id;
}

export async function verificarTurnstile(token: string, config: ConfigRegistro) {
  let r: Response;
  try { r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ secret: config.turnstileSecret, response: token }), signal: AbortSignal.timeout(8000) }); }
  catch { throw new ErroRegistro("indisponivel"); }
  if (!r.ok) throw new ErroRegistro("indisponivel");
  let corpo: unknown; try { corpo = await r.json(); } catch { throw new ErroRegistro("indisponivel"); }
  const resultado = z.object({ success: z.boolean() }).safeParse(corpo);
  if (!resultado.success) throw new ErroRegistro("indisponivel");
  if (!resultado.data.success) throw new ErroRegistro("captcha_invalido");
}
