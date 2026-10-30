import "server-only";
import { z } from "zod";
import { ErroRegistro, respostaErro } from "./erros";
import { entradaHttp, origemHttp, respostaPrivada, verificarTurnstile } from "./http";
import { bytea, hmacSha256 } from "./seguranca";
import { configServidor, rpc } from "./servidor";
import { exigirStaging } from "./staging";
import { criarLoggerRequisicao } from "../observabilidade/logger";

type Operacao = "denunciar" | "resposta";
type Config = ReturnType<typeof configServidor>;

function texto(minimo: number, maximo: number) {
  return z.string().refine(v => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u.test(v)
    && Array.from(v).every(c => { const p = c.codePointAt(0)!; return !(p >= 0xd800 && p <= 0xdfff) && !(p >= 0xfdd0 && p <= 0xfdef) && (p & 0xffff) < 0xfffe; }))
    .transform(v => v.trim().normalize("NFC").replace(/\r\n?/g, "\n"))
    .refine(v => Array.from(v).length >= minimo && Array.from(v).length <= maximo);
}

const comum = { ocorrencia_id: z.uuid(), turnstile: z.string().trim().min(1).max(2048) };
export const denunciaSchema = z.strictObject({ ...comum, motivo: z.enum(["dado_pessoal", "acusacao_sem_base", "ameaca", "conteudo_ilegal", "spam", "duplicado", "outro"]), texto: texto(1, 1000).optional() });
export const respostaSchema = z.strictObject({ ...comum, vinculo: texto(2, 120), contato: texto(3, 254), texto: texto(10, 4000) });

function maximo(operacao: Operacao) {
  const valor = process.env[operacao === "denunciar" ? "LIMITE_DENUNCIA_MAXIMO" : "LIMITE_RESPOSTA_MAXIMO"]?.trim();
  if (!valor || !/^[1-9][0-9]*$/.test(valor) || !Number.isSafeInteger(Number(valor))) throw new ErroRegistro("indisponivel");
  return Number(valor);
}

async function preparar(request: Request, operacao: Operacao) {
  exigirStaging(request);
  const config = configServidor();
  if (config.modoPublicacao !== "moderar_tudo") throw new ErroRegistro("indisponivel");
  const limite = maximo(operacao);
  const origem = origemHttp(request, config);
  // Mesmo namespace HMAC dos limites existentes, com orçamento próprio por rota.
  const chave = hmacSha256(config.hmacSegredo, JSON.stringify(["limite-v1", operacao, origem]));
  if (!await rpc("consumir_limite", { p_chave: bytea(chave), p_janela: `${config.limites.janelaSegundos} seconds`, p_maximo: limite }, z.boolean())) throw new ErroRegistro("limite_excedido");
  return { config, origem };
}

async function triar(titulo: string, descricao: string, origem: string, config: Config) {
  // Sinais são consultivos: ambas as ações sempre seguem para revisão humana.
  try {
    await rpc("triagem_sinais", { p_titulo: titulo, p_descricao: descricao, p_origem_hash: bytea(origem), p_janela: `${config.triagem.janelaSegundos} seconds`, p_limite_origem: config.triagem.limiteOrigem },
      z.array(z.object({ out_texto_repetido: z.boolean(), out_origem_sinalizada: z.boolean() })).length(1));
  } catch { throw new ErroRegistro("indisponivel"); }
}

/** Allowlist fechada: este transporte não admite nomes nem endpoints vindos do cliente. */
async function registrar(funcao: "registrar_denuncia" | "registrar_resposta", parametros: Record<string, unknown>, config: Config) {
  let resposta: Response;
  try {
    resposta = await fetch(`${config.base}/rest/v1/rpc/${funcao}`, {
      method: "POST", cache: "no-store", signal: AbortSignal.timeout(8000),
      headers: { apikey: config.chave, Authorization: `Bearer ${config.chave}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(parametros),
    });
    if (!resposta.ok || !z.boolean().safeParse(await resposta.json()).success) throw new ErroRegistro("indisponivel");
  } catch { throw new ErroRegistro("indisponivel"); }
}

function falha(erro: unknown) {
  const resposta = respostaErro(erro);
  resposta.headers.set("Referrer-Policy", "no-referrer");
  return resposta;
}

function concluir(resposta: Response, logger: ReturnType<typeof criarLoggerRequisicao>, inicio: number) {
  resposta.headers.set("X-Request-Id", logger.requestId);
  logger.registrar(resposta.status >= 400 ? "requisicao.falhou" : "requisicao.concluida", { status: resposta.status, duracaoMs: performance.now() - inicio });
  return resposta;
}

export async function denunciar(request: Request) {
  const inicio = performance.now(); const logger = criarLoggerRequisicao(request);
  try {
    const entrada = await entradaHttp(request, denunciaSchema);
    const { config, origem } = await preparar(request, "denunciar");
    await verificarTurnstile(entrada.turnstile, config);
    await triar(entrada.motivo, entrada.texto ?? "", origem, config);
    await registrar("registrar_denuncia", { p_ocorrencia_id: entrada.ocorrencia_id, p_motivo: entrada.motivo, p_texto: entrada.texto ?? null, p_origem_hash: bytea(origem) }, config);
    return concluir(respostaPrivada({ confirmacao: "Envio recebido para revisão." }, 202), logger, inicio);
  } catch (erro) { return concluir(falha(erro), logger, inicio); }
}

export async function responder(request: Request) {
  const inicio = performance.now(); const logger = criarLoggerRequisicao(request);
  try {
    const entrada = await entradaHttp(request, respostaSchema);
    const { config, origem } = await preparar(request, "resposta");
    await verificarTurnstile(entrada.turnstile, config);
    await triar(entrada.vinculo, entrada.texto, origem, config);
    // O RPC grava pendente; nenhum status ou decisão de publicação vem do navegador.
    await registrar("registrar_resposta", { p_ocorrencia_id: entrada.ocorrencia_id, p_vinculo: entrada.vinculo, p_contato: entrada.contato, p_texto: entrada.texto, p_origem_hash: bytea(origem) }, config);
    return concluir(respostaPrivada({ confirmacao: "Envio recebido para revisão." }, 202), logger, inicio);
  } catch (erro) { return concluir(falha(erro), logger, inicio); }
}

export function afetaIndisponivel(request: Request) {
  try {
    exigirStaging(request);
    if (process.env.AFETA_HABILITADO !== "true") throw new ErroRegistro("indisponivel");
    // ADR-0004: opt-in sozinho não aprova identidade, deduplicação ou política de abuso.
    throw new ErroRegistro("indisponivel");
  } catch (erro) { return falha(erro); }
}
