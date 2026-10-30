import "server-only";
import { createHmac } from "node:crypto";
import { z } from "zod";
import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth/http";
import { criarLoggerRequisicao } from "@/lib/observabilidade/logger";
import { caminhoImagemValido } from "@/lib/registro/caminho-imagem.mjs";

const uuid = z.uuid();
const texto = z.string().trim().min(1).max(4000);
const motivo = z.string().trim().min(1).max(1000);
const papel = z.enum(["moderador", "gestor", "superadmin"]);
const situacao = z.enum(["registrado", "em_analise", "encaminhado", "aguardando_resposta", "em_atendimento", "resolvido", "encerrado_sem_solucao"]);
const moderacao = z.enum(["pendente", "publicado", "retido", "removido"]);
const codigo = z.enum(["dados_pessoais", "conteudo_ofensivo", "fora_escopo", "spam", "duplicidade", "outro"]);
const moderar = z.strictObject({ acao: z.enum(["aprovar", "reter", "remover", "restaurar"]), motivo: motivo.optional(), motivo_codigo: codigo.optional() }).refine(v => (v.acao === "aprovar" || !!v.motivo) && (v.acao !== "remover" || !!v.motivo_codigo));
const limite = z.coerce.number().int().min(1).max(100).default(50);
const inteiro = z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const cursor = z.strictObject({ criado_em: z.iso.datetime({ offset: true }), id: uuid, denuncias_abertas: z.number().int().nonnegative(), imagens_pendentes: z.number().int().nonnegative() });
class Falha extends Error { constructor(readonly status: number, readonly codigoExterno?: string) { super("Operação administrativa indisponível."); } }
class SmtpIndisponivel extends Error {}
function config() {
  try { const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""); const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash || !key) throw new Error();
    return { base: url.origin, key };
  } catch { throw new Falha(503); }
}
async function chamar(token: string, path: string, data?: unknown, service = false) {
  const c = config(); const key = service ? process.env.SUPABASE_SERVICE_ROLE_KEY : c.key;
  if (!key) throw new Falha(503);
  const result = await fetch(c.base + path, { method: data === undefined ? "GET" : "POST", cache: "no-store", signal: AbortSignal.timeout(10000), headers: { apikey: key, Authorization: `Bearer ${service ? key : token}`, "Content-Type": "application/json", Prefer: "count=exact" }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
  if (!result.ok) {
    const error = await result.json().catch(() => ({}));
    const falhaDeEntrega = error.code === "email_provider_disabled" || result.status === 429
      || (result.status >= 500 && /smtp|sending.*email|email.*send/i.test(String(error.msg ?? error.message ?? "")));
    if (service && path === "/auth/v1/invite" && falhaDeEntrega) throw new SmtpIndisponivel();
    const externalCode = typeof error.code === "string" && /^[a-z0-9_:-]{1,64}$/i.test(error.code) ? error.code : undefined;
    throw new Falha(error.code === "P0002" ? 404 : error.code === "42501" ? 403 : ["23514", "23505", "55P03"].includes(error.code) ? 409 : error.code === "22023" ? 400 : 503, externalCode);
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
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([k]) => !/caminho|url|token|contato|operacao_admin|whatsapp|consentimento/i.test(k)).map(([k, v]) => [k, seguro(v)]));
  if (typeof value === "string" && (/\/storage\/v1\//i.test(value) || caminhoImagemValido(value))) return "[armazenamento privado]";
  return value;
}
function invalidar() { for (const tag of ["problemas", "municipios", "indicadores"]) revalidateTag(tag, { expire: 0 }); }
const ocorrenciaSelect = "id,protocolo,municipio_id,categoria_id,municipio_nome,categoria_nome,titulo,descricao,situacao,moderacao,criado_em,imagens_pendentes,denuncias_abertas";

export async function handleAdmin(req: Request, action: string, rawId?: string) {
  const logger = criarLoggerRequisicao(req); const started = Date.now(); let status = 200; let data: unknown; let codigoExterno: string | undefined;
  try {
    const minimum = action.startsWith("equipe") ? "superadmin" : ["contato", "auditoria"].includes(action) ? "gestor" : "moderador";
    const admin = await requireAdmin(req, minimum); const token = admin.token;
    await limitar(token);
    const id = rawId === undefined ? undefined : ["resolver-denuncia", "revisar-resposta"].includes(action) ? inteiro.parse(rawId) : uuid.parse(rawId);
    const query = Object.fromEntries(new URL(req.url).searchParams);
    if (action === "fila") {
      const dias = z.coerce.number().int().min(0).max(36500).optional();
      const booleano = z.enum(["true", "false"]).optional();
      const q = z.strictObject({ limite, moderacao: moderacao.optional(), situacao: situacao.optional(), municipio_id: inteiro.optional(), categoria_id: inteiro.optional(), idade_min_dias: dias, idade_max_dias: dias, denuncia: booleano, foto_pendente: booleano, ordem: z.enum(["antigos", "recentes", "prioridade"]).default("prioridade"), cursor: z.string().max(1024).optional() }).refine(v => v.idade_min_dias === undefined || v.idade_max_dias === undefined || v.idade_min_dias <= v.idade_max_dias).parse(query);
      const direction = q.ordem === "recentes" ? "desc" : "asc";
      const params = new URLSearchParams({ select: ocorrenciaSelect, order: `${q.ordem === "prioridade" ? "denuncias_abertas.desc,imagens_pendentes.desc," : ""}criado_em.${direction},id.${direction}`, limit: String(q.limite + 1) });
      for (const key of ["moderacao", "situacao", "municipio_id", "categoria_id"] as const) if (q[key] !== undefined) params.set(key, `eq.${q[key]}`);
      const now = Date.now();
      if (q.idade_min_dias !== undefined) params.append("criado_em", `lte.${new Date(now - q.idade_min_dias * 86400000).toISOString()}`);
      if (q.idade_max_dias !== undefined) params.append("criado_em", `gte.${new Date(now - q.idade_max_dias * 86400000).toISOString()}`);
      if (q.denuncia !== undefined) params.set("denuncias_abertas", q.denuncia === "true" ? "gt.0" : "eq.0");
      if (q.foto_pendente !== undefined) params.set("imagens_pendentes", q.foto_pendente === "true" ? "gt.0" : "eq.0");
      const countParams = new URLSearchParams(params); countParams.set("select", "id"); countParams.set("limit", "1"); countParams.delete("order");
      if (q.cursor) { let c; try { c = cursor.parse(JSON.parse(Buffer.from(q.cursor, "base64url").toString("utf8"))); } catch { throw new Falha(400); }
        const op = q.ordem === "recentes" ? "lt" : "gt";
        const tail = `criado_em.${op}.${c.criado_em},and(criado_em.eq.${c.criado_em},id.${op}.${c.id})`;
        params.set("or", q.ordem === "prioridade" ? `(denuncias_abertas.lt.${c.denuncias_abertas},and(denuncias_abertas.eq.${c.denuncias_abertas},imagens_pendentes.lt.${c.imagens_pendentes}),and(denuncias_abertas.eq.${c.denuncias_abertas},imagens_pendentes.eq.${c.imagens_pendentes},or(${tail})))` : `(${tail})`);
      }
      const [response, countResponse] = await Promise.all([chamar(token, `/rest/v1/v_fila_moderacao?${params}`), chamar(token, `/rest/v1/v_fila_moderacao?${countParams}`)]);
      const rows = z.array(cursor.passthrough()).parse(await response.json());
      const more = rows.length > q.limite; const items = rows.slice(0, q.limite); const last = items.at(-1);
      const count = countResponse.headers.get("content-range")?.split("/")[1]; if (!count || !/^\d+$/.test(count)) throw new Falha(503);
      data = { itens: seguro(items), total: Number(count), proximo_cursor: more && last ? Buffer.from(JSON.stringify({ id: last.id, criado_em: last.criado_em, denuncias_abertas: last.denuncias_abertas, imagens_pendentes: last.imagens_pendentes })).toString("base64url") : null };
    } else if (action === "detalhe") data = seguro(await rpc(token, "admin_detalhar_ocorrencia", { p_id: id }));
    else if (action === "contato") data = await rpc(token, "admin_ver_contato", { p_id: id });
    else if (action === "moderar") {
      const b = await entrada(req, moderar); if (b.acao === "restaurar" && admin.papel === "moderador") throw new Falha(403);
      await rpc(token, "admin_moderar_ocorrencia", { p_id: id, p_acao: b.acao, p_motivo: b.motivo ?? null, p_motivo_codigo: b.motivo_codigo ?? null }); invalidar(); data = { ok: true };
    } else if (action === "lote") {
      const b = await entrada(req, z.strictObject({ ids: z.array(uuid).min(1).max(50).refine(a => new Set(a).size === a.length), acao: z.enum(["aprovar", "reter"]), motivo: motivo.optional() }).refine(v => v.acao === "aprovar" || !!v.motivo));
      data = await rpc(token, "admin_moderar_lote", { p_ids: b.ids, p_acao: b.acao, p_motivo: b.motivo ?? null }); invalidar();
    } else if (action === "mesclar") {
      const b = await entrada(req, z.strictObject({ destino: uuid, motivo }).refine(v => v.destino !== id)); await rpc(token, "admin_mesclar_duplicata", { p_origem: id, p_destino: b.destino, p_motivo: b.motivo }); invalidar(); data = { ok: true };
    } else if (action === "situacao" || action === "atualizacao") {
      const common = { texto, evidencia: texto.optional(), publica: z.boolean().default(true) };
      if (action === "situacao") { const b = await entrada(req, z.strictObject({ ...common, situacao }).refine(v => v.situacao !== "resolvido" || !!v.evidencia)); await rpc(token, "admin_atualizar_situacao", { p_id: id, p_situacao: b.situacao, p_texto: b.texto, p_evidencia: b.evidencia ?? null, p_publica: b.publica }); }
      else { const b = await entrada(req, z.strictObject({ ...common, tipo: z.enum(["providencia", "evidencia", "resposta_oficial", "nota"]) })); await rpc(token, "admin_adicionar_atualizacao", { p_id: id, p_tipo: b.tipo, p_texto: b.texto, p_evidencia: b.evidencia ?? null, p_publica: b.publica }); }
      invalidar(); data = { ok: true };
    } else if (action === "denuncias" || action === "respostas") {
      const q = z.strictObject({ limite, offset: z.coerce.number().int().min(0).max(100000).default(0), ocorrencia_id: uuid.optional(), status: (action === "denuncias" ? z.enum(["aberta", "em_analise", "procedente", "improcedente"]) : z.enum(["pendente", "publicada", "rejeitada"])).optional() }).parse(query);
      const select = action === "denuncias" ? "id,ocorrencia_id,motivo,texto,status,criado_em,resolvido_em" : "id,ocorrencia_id,autor_vinculo,texto,status,criado_em,revisado_em";
      const p = new URLSearchParams({ select, limit: String(q.limite), offset: String(q.offset), order: "criado_em.asc,id.asc" }); if (q.status) p.set("status", `eq.${q.status}`); if (q.ocorrencia_id) p.set("ocorrencia_id", `eq.${q.ocorrencia_id}`);
      data = seguro(await (await chamar(token, `/rest/v1/${action}?${p}`)).json());
    } else if (action === "resolver-denuncia") {
      const b = await entrada(req, z.strictObject({ status: z.enum(["em_analise", "procedente", "improcedente"]) })); await rpc(token, "admin_resolver_denuncia", { p_denuncia_id: id, p_status: b.status }); data = { ok: true };
    } else if (action === "revisar-resposta") {
      const b = await entrada(req, z.strictObject({ acao: z.enum(["publicar", "rejeitar"]), motivo: motivo.optional() }).refine(v => v.acao !== "rejeitar" || !!v.motivo)); await rpc(token, "admin_revisar_resposta", { p_resposta_id: id, p_acao: b.acao, p_motivo: b.motivo ?? null }); invalidar(); data = { ok: true };
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
    data = { erro: { codigo: "operacao_admin_falhou", mensagem: "Não foi possível concluir a operação administrativa." } };
  }
  logger.registrar(status >= 500 ? "requisicao.falhou" : "requisicao.concluida", { status, ...(codigoExterno ? { codigoExterno } : {}), duracaoMs: Date.now() - started });
  return Response.json(data, { status, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow", "Referrer-Policy": "no-referrer", "X-Request-Id": logger.requestId } });
}
