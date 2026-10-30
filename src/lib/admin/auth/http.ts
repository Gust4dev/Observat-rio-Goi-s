import "server-only";
import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { mesmaOrigem } from "@/lib/seguranca/origem";
import { criarLoggerRequisicao } from "@/lib/observabilidade/logger";
import { NextResponse } from "next/server";
import { z } from "zod";

const ACCESS = "og_admin_access_token", REFRESH = "og_admin_refresh_token";
const tokenSchema = z.string().min(1).max(16384).regex(/^[A-Za-z0-9._~-]+$/);
const sessionSchema = z.object({ access_token: tokenSchema, refresh_token: tokenSchema, expires_in: z.number().int().positive() });
const factorSchema = z.object({ id: z.uuid(), factor_type: z.string(), status: z.string() });
const userSchema = z.object({ id: z.uuid(), factors: z.array(factorSchema).optional() });
const roleSchema = z.enum(["moderador", "gestor", "superadmin"]);
export const loginSchema = z.strictObject({ email: z.email().max(254), password: z.string().min(1).max(1024) });
const challengeSchema = z.strictObject({ factor_id: z.uuid() });
const verifySchema = z.strictObject({ factor_id: z.uuid(), challenge_id: z.uuid(), code: z.string().regex(/^\d{6}$/) });
type Action = "login" | "session" | "refresh" | "logout" | "factors" | "enroll" | "challenge" | "verify";
class Failure extends Error { constructor(readonly status: number, readonly codigo = "autenticacao_indisponivel") { super("Não foi possível autenticar a sessão administrativa."); } }
function config() {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash || !key) throw new Error();
    return { base: url.origin, key };
  } catch { throw new Failure(503); }
}
async function call(path: string, jwt?: string, body?: unknown, method = body === undefined ? "GET" : "POST") {
  const c = config();
  return fetch(c.base + path, { method, cache: "no-store", signal: AbortSignal.timeout(10000), headers: { apikey: c.key, Authorization: `Bearer ${jwt ?? c.key}`, "Content-Type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
function cookie(req: Request, name: string) {
  const raw = req.headers.get("cookie")?.split(";").map(v => v.trim()).find(v => v.startsWith(name + "="))?.slice(name.length + 1);
  if (!raw) return undefined;
  try { return tokenSchema.parse(decodeURIComponent(raw)); } catch { throw new Failure(401); }
}
function credential(req: Request) {
  const header = req.headers.get("authorization");
  if (header?.trim().toLowerCase().startsWith("bearer ")) {
    const parsed = tokenSchema.safeParse(header.match(/^Bearer ([^\s]+)$/i)?.[1]);
    if (!parsed.success) throw new Failure(401);
    return parsed.data;
  }
  const jwt = cookie(req, ACCESS); if (!jwt) throw new Failure(401); return jwt;
}
function csrf(req: Request) {
  if (!mesmaOrigem(req)) throw new Failure(403, "origem_invalida");
  if (req.headers.get("X-Observatorio-CSRF") !== "1") throw new Failure(403, "csrf_invalido");
}
async function body<T>(req: Request, schema: z.ZodType<T>): Promise<T> {
  if (!req.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new Failure(415);
  if (Number(req.headers.get("content-length")) > 4096) throw new Failure(413);
  const reader = req.body?.getReader(); if (!reader) throw new Failure(400);
  let bytes = 0; const chunks: Uint8Array[] = [];
  try {
    for (;;) { const next = await reader.read(); if (next.done) break; bytes += next.value.byteLength; if (bytes > 4096) { await reader.cancel(); throw new Failure(413); } chunks.push(next.value); }
    const parsed = schema.safeParse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    if (!parsed.success) throw new Failure(400); return parsed.data;
  } catch (error) { if (error instanceof Failure) throw error; throw new Failure(400); }
}
function response(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow", "Referrer-Policy": "no-referrer" } });
}
function setSession(res: NextResponse, session: z.infer<typeof sessionSchema>) {
  const options = { httpOnly: true, secure: true, sameSite: "strict" as const, path: "/api/admin" };
  res.cookies.set(ACCESS, session.access_token, { ...options, maxAge: Math.min(900, session.expires_in) });
  res.cookies.set(REFRESH, session.refresh_token, { ...options, path: "/api/admin/auth", maxAge: 28800 });
  return res;
}
function clear(res: NextResponse) {
  res.cookies.set(ACCESS, "", { httpOnly: true, secure: true, sameSite: "strict", path: "/api/admin", maxAge: 0 });
  res.cookies.set(REFRESH, "", { httpOnly: true, secure: true, sameSite: "strict", path: "/api/admin/auth", maxAge: 0 });
  return res;
}
async function identify(jwt: string, aal2: boolean) {
  const auth = await call("/auth/v1/user", jwt);
  if (!auth.ok) throw new Failure(401);
  const user = userSchema.parse(await auth.json());
  if (aal2) {
    try { const claims = z.object({ sub: z.literal(user.id), aal: z.literal("aal2") }).safeParse(JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString("utf8"))); if (!claims.success) throw new Error(); }
    catch { throw new Failure(403); }
  }
  const result = await call(`/rest/v1/administradores?${new URLSearchParams({ select: "user_id,papel,ativo", user_id: `eq.${user.id}` })}`, jwt);
  if (!result.ok) throw new Failure(503);
  const admins = z.array(z.object({ user_id: z.uuid(), papel: roleSchema, ativo: z.boolean() })).parse(await result.json());
  const admin = admins.find(a => a.user_id === user.id && a.ativo); if (!admin) throw new Failure(403);
  return { user, admin };
}
/** Auth validates the token before any decoded AAL claim is trusted. */
export async function requireAdmin(req: Request, minimum: z.infer<typeof roleSchema> = "moderador") {
  if (!["GET", "HEAD"].includes(req.method) && !req.headers.get("authorization")?.trim().toLowerCase().startsWith("bearer ")) csrf(req);
  const jwt = credential(req); const identity = await identify(jwt, true);
  const ranks = { moderador: 0, gestor: 1, superadmin: 2 };
  if (ranks[identity.admin.papel] < ranks[minimum]) throw new Failure(403);
  return { ...identity.admin, token: jwt };
}
async function throttle(req: Request, email: string) {
  const secret = process.env.HMAC_SEGREDO, service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || Buffer.byteLength(secret) < 32 || !service) throw new Failure(503);
  // The ingress must overwrite XFF; arbitrary public proxy headers are never trusted.
  let origin = "local-sem-endereco";
  if (process.env.VERCEL === "1") {
    const forwarded = req.headers.get("x-forwarded-for")?.trim();
    if (!forwarded || !isIP(forwarded)) throw new Failure(503);
    origin = forwarded;
  } else if (process.env.NODE_ENV === "production" && !["localhost", "127.0.0.1", "[::1]"].includes(new URL(req.url).hostname)) throw new Failure(503);
  const keys = [["admin-login-origin-v1", origin], ["admin-login-email-v1", email.toLowerCase()]];
  const c = config();
  for (const key of keys) {
  const hash = createHmac("sha256", secret).update(JSON.stringify(key)).digest("hex");
  const result = await fetch(c.base + "/rest/v1/rpc/consumir_limite", { method: "POST", cache: "no-store", signal: AbortSignal.timeout(10000), headers: { apikey: service, Authorization: `Bearer ${service}`, "Content-Type": "application/json" }, body: JSON.stringify({ p_chave: `\\x${hash}`, p_janela: "900 seconds", p_maximo: 5 }) });
  if (!result.ok) throw new Failure(503);
  const allowed = z.boolean().parse(await result.json()); if (!allowed) throw new Failure(429);
  }
}
async function handleAuthInternal(req: Request, action: Action) {
  try {
    if (req.method !== "GET") csrf(req);
    config();
    if (action === "login") {
      const input = await body(req, loginSchema); await throttle(req, input.email);
      const result = await call("/auth/v1/token?grant_type=password", undefined, input);
      if (!result.ok) throw new Failure(401);
      const session = sessionSchema.parse(await result.json());
      try {
        await identify(session.access_token, false);
      } catch { await call("/auth/v1/logout", session.access_token, {}, "POST").catch(() => {}); throw new Failure(401); }
      return setSession(response({ mfa_required: true }), session);
    }
    if (action === "refresh") {
      const refresh = cookie(req, REFRESH); if (!refresh) throw new Failure(401);
      const result = await call("/auth/v1/token?grant_type=refresh_token", undefined, { refresh_token: refresh });
      if (!result.ok) throw new Failure(401);
      const session = sessionSchema.parse(await result.json()); await identify(session.access_token, true);
      return setSession(response({ authenticated: true }), session);
    }
    const jwt = credential(req);
    if (action === "logout") {
      const result = await call("/auth/v1/logout", jwt, {}, "POST");
      if (!result.ok && result.status !== 401) throw new Failure(503);
      return clear(response({ authenticated: false }));
    }
    const identity = await identify(jwt, action === "session");
    if (action === "session") return response({ authenticated: true, papel: identity.admin.papel });
    if (action === "factors") return response({ factors: identity.user.factors?.filter(f => f.factor_type === "totp").map(f => ({ id: f.id, status: f.status })) ?? [] });
    if (action === "enroll") {
      await body(req, z.strictObject({}));
      const result = await call("/auth/v1/factors", jwt, { factor_type: "totp", friendly_name: "Observatório Goiás" });
      if (!result.ok) throw new Failure(400);
      return response(z.object({ id: z.uuid(), type: z.literal("totp"), totp: z.object({ qr_code: z.string(), secret: z.string(), uri: z.string() }) }).parse(await result.json()));
    }
    const input = await body(req, action === "challenge" ? challengeSchema : verifySchema);
    if (!identity.user.factors?.some(f => f.id === input.factor_id && f.factor_type === "totp")) throw new Failure(403);
    const payload = action === "challenge" ? {} : verifySchema.parse(input);
    const result = await call(`/auth/v1/factors/${input.factor_id}/${action}`, jwt, action === "challenge" ? payload : { challenge_id: verifySchema.parse(payload).challenge_id, code: verifySchema.parse(payload).code });
    if (!result.ok) throw new Failure(401);
    if (action === "challenge") return response(z.object({ id: z.uuid(), expires_at: z.number() }).parse(await result.json()));
    const session = sessionSchema.parse(await result.json()); await identify(session.access_token, true);
    return setSession(response({ authenticated: true }), session);
  } catch (error) {
    const res = response({ erro: { codigo: error instanceof Failure ? error.codigo : "autenticacao_indisponivel", mensagem: "Não foi possível autenticar a sessão administrativa." } }, error instanceof Failure ? error.status : 503);
    return action === "logout" || action === "refresh" ? clear(res) : res;
  }
}


/** Only allowlisted operational metadata reaches logs; correlation IDs are server-generated. */
export async function handleAuth(req: Request, action: Action) {
  const logger = criarLoggerRequisicao(req);
  const started = Date.now();
  const result = await handleAuthInternal(req, action);
  result.headers.set("X-Request-Id", logger.requestId);
  logger.registrar(result.status >= 500 ? "requisicao.falhou" : "requisicao.concluida", { status: result.status, duracaoMs: Date.now() - started });
  return result;
}
