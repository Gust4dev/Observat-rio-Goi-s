import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { handleAuth, requireAdmin } from "./http";
const id = "12345678-1234-4234-8234-123456789012";
const jwt = (aal = "aal2") => `head.${Buffer.from(JSON.stringify({ sub: id, aal })).toString("base64url")}.sig`;
const request = (action: string, data?: unknown, headers: Record<string,string> = {}) => new Request(`https://app.example/api/admin/auth/${action}`, { method: data === undefined ? "GET" : "POST", headers: { Origin: "https://app.example", "X-Observatorio-CSRF": "1", "Content-Type": "application/json", ...headers }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
const ok = (data: unknown) => Promise.resolve(Response.json(data));
function identity(fetcher: ReturnType<typeof vi.fn>, aal = "aal2", role = "moderador", active = true) {
  fetcher.mockImplementationOnce(() => ok({ id, factors: [] })).mockImplementationOnce(() => ok([{ user_id: id, papel: role, ativo: active }]));
  return jwt(aal);
}
beforeEach(() => { vi.spyOn(console, "info").mockImplementation(() => {}); vi.spyOn(console, "error").mockImplementation(() => {}); vi.stubEnv("VERCEL", ""); vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://db.example"); vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon"); vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service"); vi.stubEnv("HMAC_SEGREDO", "h".repeat(32)); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe("admin auth", () => {
 it("does not allow rotating emails to bypass the per-origin budget", async () => {
  vi.stubEnv("VERCEL", "1");
  const counts = new Map<string, number>(); const keys: string[] = [];
  const f = vi.fn(async (url: string, init: RequestInit) => {
   if (url.includes("consumir_limite")) {
    const key = JSON.parse(String(init.body)).p_chave as string;
    keys.push(key); const count = (counts.get(key) ?? 0) + 1; counts.set(key, count);
    return Response.json(count <= 5);
   }
   return Response.json({}, { status: 400 });
  }); vi.stubGlobal("fetch", f);
  for (let i = 0; i < 6; i++) {
   const res = await handleAuth(request("login", { email: `user${i}@example.com`, password: "sensitive-password" }, { "x-forwarded-for": "203.0.113.10" }), "login");
   expect(res.status).toBe(i === 5 ? 429 : 401);
  }
  expect(keys[0]).toBe(keys[2]); expect(keys[1]).not.toBe(keys[3]);
  expect(JSON.stringify(keys)).not.toContain("203.0.113.10"); expect(JSON.stringify(keys)).not.toContain("example.com");
 });
 it("fails closed when ingress source is not trustworthy", async () => {
  const f = vi.fn(); vi.stubGlobal("fetch", f); vi.stubEnv("VERCEL", "1");
  expect((await handleAuth(request("login", { email: "admin@example.com", password: "secret" }), "login")).status).toBe(503);
  expect((await handleAuth(request("login", { email: "admin@example.com", password: "secret" }, { "x-forwarded-for": "203.0.113.10, 203.0.113.11" }), "login")).status).toBe(503);
  vi.stubEnv("VERCEL", ""); vi.stubEnv("NODE_ENV", "production");
  expect((await handleAuth(request("login", { email: "admin@example.com", password: "secret" }, { "x-forwarded-for": "203.0.113.10" }), "login")).status).toBe(503);
  expect(f).not.toHaveBeenCalled();
 });
 it("correlates operational logs and responses without input or secrets", async () => {
  const res = await handleAuth(request("login", { email: "private@example.com", password: "private-password" }, { "X-Observatorio-CSRF": "0", "x-request-id": "untrusted-client-id" }), "login");
  const logged = JSON.parse(vi.mocked(console.info).mock.calls[0][0]);
  expect(res.headers.get("X-Request-Id")).toBe(logged.requestId); expect(logged.requestId).not.toBe("untrusted-client-id");
  expect(Object.keys(logged).sort()).toEqual(["timestamp", "nivel", "requestId", "metodo", "evento", "status", "duracaoMs"].sort());
  expect(JSON.stringify(logged)).not.toContain("private"); expect(logged.status).toBe(403);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  const failure = await handleAuth(request("session"), "session");
  expect(JSON.parse(vi.mocked(console.error).mock.calls[0][0]).requestId).toBe(failure.headers.get("X-Request-Id"));
 });
 it("enrolls, challenges and verifies TOTP before issuing full cookies", async () => {
  const factor = "22345678-1234-4234-8234-123456789012", challenge = "32345678-1234-4234-8234-123456789012";
  const f = vi.fn(); vi.stubGlobal("fetch", f);
  identity(f, "aal1");
  f.mockImplementationOnce(() => ok({ id: factor, type: "totp", totp: { qr_code: "svg", secret: "secret", uri: "otpauth://totp/test" } }));
  expect((await handleAuth(request("enroll", {}, { Authorization: `Bearer ${jwt("aal1")}` }), "enroll")).status).toBe(200);
  const withFactor = () => f.mockImplementationOnce(() => ok({ id, factors: [{ id: factor, factor_type: "totp", status: "unverified" }] })).mockImplementationOnce(() => ok([{ user_id: id, papel: "moderador", ativo: true }]));
  withFactor(); f.mockImplementationOnce(() => ok({ id: challenge, expires_at: 123 }));
  expect((await handleAuth(request("challenge", { factor_id: factor }, { Authorization: `Bearer ${jwt("aal1")}` }), "challenge")).status).toBe(200);
  withFactor(); f.mockImplementationOnce(() => ok({ access_token: jwt(), refresh_token: "verified-refresh", expires_in: 600 })); identity(f);
  const res = await handleAuth(request("verify", { factor_id: factor, challenge_id: challenge, code: "123456" }, { Authorization: `Bearer ${jwt("aal1")}` }), "verify");
  expect(res.status).toBe(200); expect(await res.json()).toEqual({ authenticated: true }); expect(res.headers.get("set-cookie")).toContain("verified-refresh");
 });
 it("keeps unknown credentials and inactive-user errors neutral", async () => {
  const f = vi.fn().mockImplementationOnce(() => ok(true)).mockImplementationOnce(() => ok(true)).mockResolvedValueOnce(Response.json({}, { status: 400 })); vi.stubGlobal("fetch", f);
  const input = { email: "unknown@example.com", password: "wrong" };
  const unknown = await handleAuth(request("login", input), "login");
  f.mockImplementationOnce(() => ok(true)).mockImplementationOnce(() => ok(true)).mockImplementationOnce(() => ok({ access_token: jwt("aal1"), refresh_token: "refresh", expires_in: 600 })); identity(f, "aal1", "moderador", false); f.mockResolvedValueOnce(new Response(null, { status: 204 }));
  const inactive = await handleAuth(request("login", input), "login");
  expect(inactive.status).toBe(401); expect(await inactive.json()).toEqual(await unknown.json()); expect(inactive.headers.get("set-cookie")).toBeNull();
 });
 it("rejects missing sessions and fails closed on absent environment", async () => {
  expect((await handleAuth(request("session"), "session")).status).toBe(401);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://bad.example");
  expect((await handleAuth(request("session"), "session")).status).toBe(503);
 });
 it("accepts validated AAL2 and returns private headers without tokens", async () => {
  const f = vi.fn(); vi.stubGlobal("fetch", f); const token = identity(f);
  const res = await handleAuth(request("session", undefined, { Authorization: `Bearer ${token}` }), "session");
  expect(res.status).toBe(200); expect(await res.json()).toEqual({ authenticated: true, papel: "moderador" });
  expect(res.headers.get("cache-control")).toBe("no-store"); expect(res.headers.get("referrer-policy")).toBe("no-referrer");
 });
 it("rejects AAL1 before administrative authorization", async () => {
  const f = vi.fn().mockImplementation(() => ok({ id })); vi.stubGlobal("fetch", f);
  const res = await handleAuth(request("session", undefined, { Authorization: `Bearer ${jwt("aal1")}` }), "session"); expect(res.status).toBe(403); expect(f).toHaveBeenCalledTimes(1);
 });
 it("uses the session cookie when an outer staging Basic gate is present", async () => {
  const f = vi.fn(); vi.stubGlobal("fetch", f); identity(f);
  const req = request("acao", {}, { Authorization: "Basic ZmljdGljaW86ZmljdGljaW8=", Cookie: `og_admin_access_token=${jwt()}` });
  await expect(requireAdmin(req, "moderador")).resolves.toMatchObject({ papel: "moderador", token: jwt() });
  expect(f).toHaveBeenCalledTimes(2);
 });
 it("rejects inactive admins and insufficient roles", async () => {
  const f = vi.fn(); vi.stubGlobal("fetch", f); identity(f, "aal2", "moderador", false);
  expect((await handleAuth(request("session", undefined, { Authorization: `Bearer ${jwt()}` }), "session")).status).toBe(403);
  identity(f); await expect(requireAdmin(request("session", undefined, { Authorization: `Bearer ${jwt()}` }), "gestor")).rejects.toMatchObject({ status: 403 });
 });
 it("checks origin and CSRF on auth mutations including bearer clients", async () => {
  const f = vi.fn(); vi.stubGlobal("fetch", f);
  for (const headers of [{ Origin: "https://evil.example" }, { "X-Observatorio-CSRF": "0" }] as Record<string, string>[]) expect((await handleAuth(request("login", {}, headers), "login")).status).toBe(403);
  expect(f).not.toHaveBeenCalled();
 });
 it("denies every protected auth action without a session", async () => {
  const f = vi.fn(); vi.stubGlobal("fetch", f);
  const actions = ["session", "refresh", "logout", "factors", "enroll", "challenge", "verify"] as const;
  for (const action of actions) {
   const needsBody = action !== "session";
   const response = await handleAuth(request(action, needsBody ? {} : undefined), action);
   expect([401, 403], action).toContain(response.status);
  }
  expect(f).not.toHaveBeenCalled();
 });
 it("rejects malformed, overlong and non-JSON bodies", async () => {
  expect((await handleAuth(request("login", { email: "bad" }), "login")).status).toBe(400);
  expect((await handleAuth(request("login", { password: "x".repeat(5000) }), "login")).status).toBe(413);
  expect((await handleAuth(request("login", {}, { "Content-Type": "text/plain" }), "login")).status).toBe(415);
 });
 it("throttles with HMAC before password exchange", async () => {
  const f = vi.fn().mockImplementation(() => ok(false)); vi.stubGlobal("fetch", f);
  expect((await handleAuth(request("login", { email: "admin@example.com", password: "secret" }), "login")).status).toBe(429);
  expect(f).toHaveBeenCalledTimes(1); expect(f.mock.calls[0][1].body).not.toContain("admin@example.com");
 });
 it("allows a short AAL1 setup cookie for first TOTP enrollment", async () => {
  const f = vi.fn().mockImplementationOnce(() => ok(true)).mockImplementationOnce(() => ok(true)).mockImplementationOnce(() => ok({ access_token: jwt("aal1"), refresh_token: "refresh", expires_in: 3600 })); vi.stubGlobal("fetch", f); identity(f, "aal1");
  const res = await handleAuth(request("login", { email: "admin@example.com", password: "secret" }), "login");
  expect(res.status).toBe(200); expect(await res.json()).toEqual({ mfa_required: true });
  const cookies = res.headers.get("set-cookie"); expect(cookies).toContain("og_admin_access_token="); expect(cookies).toContain("Max-Age=900"); expect(cookies).toContain("HttpOnly"); expect(cookies).toContain("Secure"); expect(cookies).toContain("SameSite=strict");
 });
 it("rotates refresh cookies only after full AAL2 authorization", async () => {
  const f = vi.fn().mockImplementationOnce(() => ok({ access_token: jwt(), refresh_token: "rotated", expires_in: 600 })); vi.stubGlobal("fetch", f); identity(f);
  const res = await handleAuth(request("refresh", {}, { Cookie: "og_admin_refresh_token=old" }), "refresh"); expect(res.status).toBe(200); expect(res.headers.get("set-cookie")).toContain("rotated");
 });
 it("revokes logout and clears both cookies", async () => {
  const f = vi.fn().mockResolvedValue(new Response(null, { status: 204 })); vi.stubGlobal("fetch", f);
  const res = await handleAuth(request("logout", {}, { Authorization: `Bearer ${jwt()}` }), "logout");
  expect(res.status).toBe(200); expect(f.mock.calls[0][0]).toContain("/auth/v1/logout"); expect(res.headers.get("set-cookie")?.match(/Max-Age=0/g)).toHaveLength(2);
 });
});
