import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth/http";
import { criarLoggerRequisicao } from "@/lib/observabilidade/logger";
import { caminhoImagemValido } from "@/lib/registro/caminho-imagem.mjs";
import { resolveSupabaseKeys, supabaseApiHeaders } from "@/lib/supabase-keys.mjs";

const uuid = z.uuid();
const texto = z.string().trim().min(1).max(4000);
const motivo = z.string().trim().min(1).max(1000);
const papel = z.enum(["moderador", "gestor", "superadmin"]);
const situacao = z.enum(["registrado", "em_analise", "encaminhado", "aguardando_resposta", "em_atendimento", "resolvido", "encerrado_sem_solucao"]);
const moderacao = z.enum(["pendente", "publicado", "retido", "removido"]);
const codigo = z.enum(["dados_pessoais", "conteudo_ofensivo", "fora_escopo", "spam", "duplicidade", "outro"]);
const versao = z.number().int().min(1).max(2147483647);
const moderar = z.strictObject({ acao: z.enum(["aprovar", "reter", "remover", "restaurar"]), motivo: motivo.optional(), motivo_codigo: codigo.optional(), versao_esperada: versao }).refine(v => (v.acao === "aprovar" || !!v.motivo) && (v.acao !== "remover" || !!v.motivo_codigo));
const limite = z.coerce.number().int().min(1).max(100).default(50);
const inteiro = z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const idFilho = z.string().regex(/^[1-9][0-9]{0,18}$/).refine(v => v.length < 19 || v <= "9223372036854775807");
const instante = z.iso.datetime({ offset: true });
const chaveFila = z.object({ criado_em: instante, id: uuid }).passthrough();
const chaveFilho = z.object({ criado_em: instante, id: idFilho }).passthrough();
const cursorSchema = z.strictObject({ v: z.literal(1), consulta: z.string(), referencia: instante, criado_em: instante, id: z.union([uuid, idFilho]) });
const cursorOpaco = z.string().min(1).max(1024).optional();
const dias = z.coerce.number().int().min(0).max(36500).optional();
const booleano = z.enum(["true", "false"]).transform(v => v === "true").optional();
const filtrosFila = z.strictObject({
  limite, moderacao: moderacao.optional(), situacao: situacao.optional(), municipio_id: inteiro.optional(),
  categoria_id: inteiro.optional(), idade_min_dias: dias, idade_max_dias: dias, denuncia: booleano,
  foto_pendente: booleano, ordem: z.enum(["antigos", "recentes"]).default("antigos"), cursor: cursorOpaco,
}).refine(v => v.idade_min_dias === undefined || v.idade_max_dias === undefined || v.idade_min_dias <= v.idade_max_dias);
const colecaoSchema = z.enum(["denuncias", "respostas", "atualizacoes"]);
type Colecao = z.infer<typeof colecaoSchema>;
const statusDenuncia = z.enum(["aberta", "em_analise", "procedente", "improcedente"]);
const statusResposta = z.enum(["pendente", "publicada", "rejeitada"]);
const selecaoFilhos: Record<Colecao, string> = {
  denuncias: "id::text,ocorrencia_id,motivo,texto,status,criado_em,resolvido_em,versao_admin",
  respostas: "id::text,ocorrencia_id,autor_vinculo,texto,status,criado_em,revisado_em,versao_admin",
  atualizacoes: "id::text,ocorrencia_id,tipo,situacao_nova,texto,publica,criado_em",
};
class Falha extends Error { constructor(readonly status: number, readonly codigoExterno?: string) { super("Operação administrativa indisponível."); } }
class SmtpIndisponivel extends Error {}
function config() {
  try { const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""); const key = resolveSupabaseKeys(process.env).publicKey;
    if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash || !key) throw new Error();
    return { base: url.origin, key };
  } catch { throw new Falha(503); }
}
async function chamar(token: string, path: string, data?: unknown, service = false) {
  const c = config(); const key = service ? resolveSupabaseKeys(process.env).secretKey : c.key;
  if (!key) throw new Falha(503);
  const suprimirEmailDeTeste = process.env.E2E_SUPPRESS_SMTP === "true"
    && process.env.VERCEL_ENV === "preview"
    && process.env.AMBIENTE_REGISTRO === "staging_ficticio"
    && process.env.MODO_PUBLICACAO === "moderar_tudo";
  if (service && path === "/auth/v1/invite" && suprimirEmailDeTeste) throw new SmtpIndisponivel();
  const result = await fetch(c.base + path, { method: data === undefined ? "GET" : "POST", cache: "no-store", signal: AbortSignal.timeout(10000), headers: { ...supabaseApiHeaders(key, service ? undefined : token), "Content-Type": "application/json" }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
  if (!result.ok) {
    const error = await result.json().catch(() => ({}));
    const falhaDeEntrega = error.code === "email_provider_disabled" || result.status === 429
      || (result.status >= 500 && /smtp|sending.*email|email.*send/i.test(String(error.msg ?? error.message ?? "")));
    if (service && path === "/auth/v1/invite" && falhaDeEntrega) throw new SmtpIndisponivel();
    const externalCode = typeof error.code === "string" && /^[a-z0-9_:-]{1,64}$/i.test(error.code) ? error.code : undefined;
    throw new Falha(error.code === "P0002" ? 404 : error.code === "42501" ? 403 : ["PT409", "23514", "23505", "55P03"].includes(error.code) ? 409 : error.code === "22023" ? 400 : 503, externalCode);
  }
  return result;
}
async function rpc(token: string, name: string, data: unknown) {
  const r = await chamar(token, `/rest/v1/rpc/${name}`, data);
  return r.status === 204 ? null : r.json();
}
async function limitar(token: string) {
  const secret = process.env.HMAC_SEGREDO;
  const maximum = z.coerce.number().int().min(1).max(2_147_483_647).safeParse(process.env.LIMITE_ADMIN_MAXIMO);
  const window = z.coerce.number().int().min(1).max(2_147_483_647).safeParse(process.env.LIMITE_ADMIN_JANELA_SEGUNDOS);
  if (!secret || Buffer.byteLength(secret) < 32 || !maximum.success || !window.success) throw new Falha(503);
  const hash = createHmac("sha256", secret).update(`admin-session-v1:${token}`).digest("hex");
  const result = await chamar(token, "/rest/v1/rpc/consumir_limite", { p_chave: `\\x${hash}`, p_janela: `${window.data} seconds`, p_maximo: maximum.data }, true);
  const allowed = z.boolean().safeParse(await result.json());
  if (!allowed.success) throw new Falha(503);
  if (!allowed.data) throw new Falha(429);
}
async function entrada<T>(req: Request, schema: z.ZodType<T>): Promise<T> {
  if (!req.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new Falha(415);
  const reader = req.body?.getReader(); if (!reader) throw new Falha(400);
  const chunks: Uint8Array[] = []; let length = 0;
  try { for (;;) { const next = await reader.read(); if (next.done) break; length += next.value.byteLength; if (length > 16384) { await reader.cancel(); throw new Falha(413); } chunks.push(next.value); }
    return schema.parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
  } catch (e) { if (e instanceof Falha) throw e; throw new Falha(400); }
}
// Internal storage locations, contact fields and capabilities never leave generic reads.
function seguro(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(seguro);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([k]) => !/caminho|url|token|contato|operacao_admin|whatsapp|consentimento|origem_hash/i.test(k)).map(([k, v]) => [k, seguro(v)]));
  if (typeof value === "string" && (/\/storage\/v1\//i.test(value) || caminhoImagemValido(value))) return "[armazenamento privado]";
  return value;
}
function invalidar() { for (const tag of ["problemas", "municipios", "indicadores"]) revalidateTag(tag, { expire: 0 }); }
async function purgarImagensDoRelato(dados: unknown): Promise<boolean> {
  const objetoPublico = z.string().regex(/^[a-f0-9-]{36}\.jpg$/).refine(caminho => uuid.safeParse(caminho.slice(0, -4)).success);
  const caminhos = z.array(z.union([z.string().refine(caminhoImagemValido), objetoPublico])).max(6).safeParse(dados);
  if (!caminhos.success) return false;
  if (!caminhos.data.length) return true;
  const chave = resolveSupabaseKeys(process.env).secretKey;
  if (!chave) return false;
  const { base } = config();
  const resultados = await Promise.allSettled(caminhos.data.map(async caminho => {
    const bucket = caminhoImagemValido(caminho) ? "imagens-quarentena" : "imagens-publicas";
    const resposta = await fetch(base + "/storage/v1/object/" + bucket + "/" + caminho, {
      method: "DELETE",
      headers: supabaseApiHeaders(chave),
      signal: AbortSignal.timeout(5000),
      redirect: "error",
      cache: "no-store",
    });
    return resposta.ok || resposta.status === 404;
  }));
  return resultados.every(resultado => resultado.status === "fulfilled" && resultado.value);
}
function assinaturaCursor(payload: string) {
  const secret = process.env.HMAC_SEGREDO;
  if (!secret || Buffer.byteLength(secret) < 32) throw new Falha(503);
  return createHmac("sha256", secret).update("admin-cursor-v1:").update(payload).digest("base64url");
}

function janelaCursor(opaco: string | undefined, consulta: string, idSchema: z.ZodType<string>) {
  if (!opaco) return { consulta, referencia: new Date().toISOString(), anterior: null };
  const [payload, assinatura, ...extras] = opaco.split(".");
  if (!payload || !assinatura || extras.length) throw new Falha(400);
  const esperado = Buffer.from(assinaturaCursor(payload));
  const recebido = Buffer.from(assinatura);
  if (esperado.length !== recebido.length || !timingSafeEqual(esperado, recebido)) throw new Falha(400);
  try {
    const anterior = cursorSchema.parse(JSON.parse(Buffer.from(payload, "base64url").toString("utf8")));
    if (anterior.consulta !== consulta || !idSchema.safeParse(anterior.id).success) throw new Error();
    return { consulta, referencia: anterior.referencia, anterior };
  } catch {
    throw new Falha(400);
  }
}

function respostaPagina(
  value: unknown, quantidade: number, chave: typeof chaveFila | typeof chaveFilho,
  janela: ReturnType<typeof janelaCursor>,
) {
  const result = z.array(chave).max(quantidade + 1).safeParse(value);
  if (!result.success) throw new Falha(503);
  const itens = result.data.slice(0, quantidade);
  const ultimo = itens.at(-1);
  let proximo_cursor: string | null = null;
  if (ultimo && result.data.length > quantidade) {
    const payload = Buffer.from(JSON.stringify({
      v: 1, consulta: janela.consulta, referencia: janela.referencia, criado_em: ultimo.criado_em, id: ultimo.id,
    })).toString("base64url");
    proximo_cursor = payload + "." + assinaturaCursor(payload);
  }
  return { itens: seguro(itens), proximo_cursor };
}

async function paginaFila(token: string, query: Record<string, string>) {
  if ("resumo" in query) {
    z.strictObject({ resumo: z.literal("true") }).parse(query);
    return await rpc(token, "admin_resumo_fila", {});
  }
  const { cursor, limite, ...filtros } = filtrosFila.parse(query);
  const janela = janelaCursor(cursor, JSON.stringify(["fila", filtros]), uuid);
  const dataOffset = (valor: number | undefined) => valor === undefined ? null
    : new Date(Date.parse(janela.referencia) - valor * 86400000).toISOString();
  const rows = await rpc(token, "admin_pagina_fila", {
    p_limite: limite, p_ordem: filtros.ordem, p_referencia_em: janela.referencia,
    p_cursor_criado_em: janela.anterior?.criado_em ?? null, p_cursor_id: janela.anterior?.id ?? null,
    p_moderacao: filtros.moderacao ?? null, p_situacao: filtros.situacao ?? null,
    p_municipio_id: filtros.municipio_id ?? null, p_categoria_id: filtros.categoria_id ?? null,
    p_criado_desde: dataOffset(filtros.idade_max_dias), p_criado_ate: dataOffset(filtros.idade_min_dias),
    p_denuncia: filtros.denuncia ?? null, p_foto_pendente: filtros.foto_pendente ?? null,
  });
  return respostaPagina(rows, limite, chaveFila, janela);
}

async function paginaFilhos(token: string, colecao: Colecao, query: Record<string, string>, ocorrencia?: string) {
  const q = z.strictObject({
    limite, cursor: cursorOpaco, ...(ocorrencia ? {} : { ocorrencia_id: uuid.optional(), id: idFilho.optional() }),
    status: colecao === "denuncias" ? statusDenuncia.optional()
      : colecao === "respostas" ? statusResposta.optional() : z.never().optional(),
  }).parse(query);
  const id = ocorrencia ?? q.ocorrencia_id;
  const janela = janelaCursor(q.cursor, JSON.stringify([colecao, id ?? null, q.status ?? null, q.id ?? null]), idFilho);
  const params = new URLSearchParams({
    select: selecaoFilhos[colecao], limit: String(q.limite + 1), order: "criado_em.asc,id.asc",
    criado_em: `lte.${janela.referencia}`,
  });
  if (id) params.set("ocorrencia_id", `eq.${id}`);
  if (q.id) params.set("id", `eq.${q.id}`);
  if (q.status) params.set("status", `eq.${q.status}`);
  if (colecao === "atualizacoes") params.set("publica", "eq.true");
  if (janela.anterior) {
    const { criado_em, id } = janela.anterior;
    params.set("or", `(criado_em.gt.${criado_em},and(criado_em.eq.${criado_em},id.gt.${id}))`);
  }
  const result = await chamar(token, `/rest/v1/${colecao}?${params}`);
  return respostaPagina(await result.json(), q.limite, chaveFilho, janela);
}

export async function handleAdmin(req: Request, action: string, rawId?: string) {
  const logger = criarLoggerRequisicao(req); const started = Date.now(); let status = 200; let data: unknown; let codigoExterno: string | undefined;
  try {
    const minimum = action.startsWith("equipe") ? "superadmin" : ["contato", "auditoria"].includes(action) ? "gestor" : "moderador";
    const admin = await requireAdmin(req, minimum); const token = admin.token;
    await limitar(token);
    const id = rawId === undefined ? undefined : ["resolver-denuncia", "revisar-resposta"].includes(action) ? idFilho.parse(rawId) : uuid.parse(rawId);
    const query = Object.fromEntries(new URL(req.url).searchParams);
    if (action === "fila") data = await paginaFila(token, query);
    else if (action === "detalhe") {
      const { colecao, ...filtros } = query;
      const ocorrencia = uuid.parse(id);
      if (colecao !== undefined) data = await paginaFilhos(token, colecaoSchema.parse(colecao), filtros, ocorrencia);
      else {
        z.strictObject({}).parse(filtros);
        data = seguro(await rpc(token, "admin_detalhar_ocorrencia", { p_id: ocorrencia }));
      }
    }
    else if (action === "contato") data = await rpc(token, "admin_ver_contato", { p_id: id });
    else if (action === "moderar") {
      const b = await entrada(req, moderar); if (b.acao === "restaurar" && admin.papel === "moderador") throw new Falha(403);
      const args = { p_id: id, p_motivo: b.motivo ?? null, p_motivo_codigo: b.motivo_codigo ?? null, p_versao_esperada: b.versao_esperada };
      if (b.acao === "remover") {
        const caminhos = await rpc(token, "admin_remover_ocorrencia_com_imagens", args);
        invalidar();
        data = await purgarImagensDoRelato(caminhos) ? { ok: true } : { ok: true, limpeza_pendente: true };
      } else {
        await rpc(token, "admin_moderar_ocorrencia", { ...args, p_acao: b.acao });
        invalidar();
        data = { ok: true };
      }
    } else if (action === "lote") {
      const b = await entrada(req, z.strictObject({ ids: z.array(uuid).min(1).max(50).refine(a => new Set(a).size === a.length), versoes_esperadas: z.array(versao).min(1).max(50), acao: z.enum(["aprovar", "reter"]), motivo: motivo.optional() }).refine(v => v.ids.length === v.versoes_esperadas.length && (v.acao === "aprovar" || !!v.motivo)));
      data = await rpc(token, "admin_moderar_lote", { p_ids: b.ids, p_versoes_esperadas: b.versoes_esperadas, p_acao: b.acao, p_motivo: b.motivo ?? null }); invalidar();
    } else if (action === "mesclar") {
      const b = await entrada(req, z.strictObject({ destino: uuid, motivo, versao_esperada: versao, versao_destino_esperada: versao }).refine(v => v.destino !== id)); await rpc(token, "admin_mesclar_duplicata", { p_origem: id, p_destino: b.destino, p_motivo: b.motivo, p_versao_esperada: b.versao_esperada, p_versao_destino_esperada: b.versao_destino_esperada }); invalidar(); data = { ok: true };
    } else if (action === "situacao" || action === "atualizacao") {
      const common = { texto, evidencia: texto.optional(), publica: z.boolean().default(true) };
      if (action === "situacao") { const b = await entrada(req, z.strictObject({ ...common, situacao, versao_esperada: versao }).refine(v => v.situacao !== "resolvido" || !!v.evidencia)); await rpc(token, "admin_atualizar_situacao", { p_id: id, p_situacao: b.situacao, p_versao_esperada: b.versao_esperada, p_texto: b.texto, p_evidencia: b.evidencia ?? null, p_publica: b.publica }); }
      else { const b = await entrada(req, z.strictObject({ ...common, tipo: z.enum(["providencia", "evidencia", "resposta_oficial", "nota"]) })); await rpc(token, "admin_adicionar_atualizacao", { p_id: id, p_tipo: b.tipo, p_texto: b.texto, p_evidencia: b.evidencia ?? null, p_publica: b.publica }); }
      invalidar(); data = { ok: true };
    } else if (action === "denuncias" || action === "respostas") {
      data = await paginaFilhos(token, action, query);
    } else if (action === "resolver-denuncia") {
      const b = await entrada(req, z.strictObject({ status: z.enum(["em_analise", "procedente", "improcedente"]), versao_esperada: versao })); await rpc(token, "admin_resolver_denuncia", { p_denuncia_id: id, p_status: b.status, p_versao_esperada: b.versao_esperada }); data = { ok: true };
    } else if (action === "revisar-resposta") {
      const b = await entrada(req, z.strictObject({ acao: z.enum(["publicar", "rejeitar"]), motivo: motivo.optional(), versao_esperada: versao }).refine(v => v.acao !== "rejeitar" || !!v.motivo)); await rpc(token, "admin_revisar_resposta", { p_resposta_id: id, p_acao: b.acao, p_motivo: b.motivo ?? null, p_versao_esperada: b.versao_esperada }); invalidar(); data = { ok: true };
    } else if (action === "auditoria") {
      const q = z.strictObject({ ocorrencia_id: uuid.optional(), admin_id: uuid.optional(), acao: z.string().regex(/^[a-z_]{1,80}$/).optional(), desde: z.iso.datetime({ offset: true }).optional(), ate: z.iso.datetime({ offset: true }).optional(), limite, offset: z.coerce.number().int().min(0).max(100000).default(0) }).refine(v => !v.desde || !v.ate || Date.parse(v.desde) <= Date.parse(v.ate)).parse(query);
      data = seguro(await rpc(token, "admin_listar_auditoria", { p_ocorrencia_id: q.ocorrencia_id ?? null, p_admin_id: q.admin_id ?? null, p_acao: q.acao ?? null, p_desde: q.desde ?? null, p_ate: q.ate ?? null, p_limite: q.limite, p_offset: q.offset }));
    } else if (action === "foto") {
      const rows = z.array(z.object({ caminho_storage: z.string().nullable(), moderacao })).length(1).parse(await (await chamar(token, `/rest/v1/imagens?${new URLSearchParams({ select: "caminho_storage,moderacao", id: `eq.${id}` })}`)).json());
      const image = rows[0]; if (image.moderacao !== "pendente" || !caminhoImagemValido(image.caminho_storage)) throw new Falha(404);
      const path = `/storage/v1/object/sign/imagens-quarentena/${image.caminho_storage}`;
      const signed = z.object({ signedURL: z.string() }).parse(await (await chamar(token, path, { expiresIn: 60 }, true)).json());
      const url = new URL(signed.signedURL.startsWith("/object/sign/") ? `/storage/v1${signed.signedURL}` : signed.signedURL, config().base + "/storage/v1/");
      if (url.origin !== config().base || url.pathname !== `/storage/v1/object/sign/imagens-quarentena/${image.caminho_storage}` || !url.searchParams.get("token")) throw new Falha(503);
      data = { url: url.href, expira_em_segundos: 60 };
    } else if (action === "equipe") {
      z.strictObject({}).parse(query); data = await (await chamar(token, "/rest/v1/administradores?select=user_id,papel,ativo,criado_em&order=criado_em.asc")).json();
    } else if (action === "equipe-convidar") {
      const b = await entrada(req, z.strictObject({ email: z.email().max(254), papel, motivo }));
      try {
        const invited = z.object({ id: uuid }).parse(await (await chamar(token, "/auth/v1/invite", { email: b.email }, true)).json());
        await rpc(token, "admin_convidar_administrador", { p_user_id: invited.id, p_papel: b.papel, p_motivo: b.motivo });
        data = { user_id: invited.id, convite_enviado: true };
      } catch (error) {
      if (!(error instanceof SmtpIndisponivel)) throw error;
      const generated = await (await chamar(token, "/auth/v1/admin/generate_link", { type: "invite", email: b.email }, true)).json();
      const generatedSchema = z.object({ id: uuid.optional(), user: z.object({ id: uuid }).optional(), action_link: z.url().optional(), properties: z.object({ action_link: z.url() }).optional() });
      const parsed = generatedSchema.parse(generated);
      const userId = parsed.user?.id ?? parsed.id;
      const actionLink = parsed.properties?.action_link ?? parsed.action_link;
      if (!userId || !actionLink) throw new Falha(503);
      const link = new URL(actionLink); if (link.protocol !== "https:" || link.origin !== config().base) throw new Falha(503);
      await rpc(token, "admin_convidar_administrador", { p_user_id: userId, p_papel: b.papel, p_motivo: b.motivo });
      data = { user_id: userId, link_convite: link.href };
      }
    } else if (action === "equipe-papel" || action === "equipe-desativar") {
      if (action === "equipe-papel") { const b = await entrada(req, z.strictObject({ papel, motivo })); await rpc(token, "admin_alterar_papel_administrador", { p_user_id: id, p_papel: b.papel, p_motivo: b.motivo }); }
      else { const b = await entrada(req, z.strictObject({ motivo })); await rpc(token, "admin_desativar_administrador", { p_user_id: id, p_motivo: b.motivo }); } data = { ok: true };
    } else throw new Falha(404);
  } catch (e) {
    if (e instanceof Falha) codigoExterno = e.codigoExterno;
    const supplied = e && typeof e === "object" && "status" in e ? e.status : undefined;
    status = typeof supplied === "number" && [400, 401, 403, 404, 409, 413, 415, 429, 503].includes(supplied) ? supplied : e instanceof z.ZodError ? 400 : 503;
    data = { erro: codigoExterno === "PT409"
      ? { codigo: "estado_desatualizado", mensagem: "O item mudou desde que foi carregado. Atualize o estado para revisar sua decisão." }
      : { codigo: "operacao_admin_falhou", mensagem: "Não foi possível concluir a operação administrativa." } };
  }
  logger.registrar(status >= 500 ? "requisicao.falhou" : "requisicao.concluida", { status, ...(codigoExterno ? { codigoExterno } : {}), duracaoMs: Date.now() - started });
  return Response.json(data, { status, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow", "Referrer-Policy": "no-referrer", "X-Request-Id": logger.requestId } });
}
