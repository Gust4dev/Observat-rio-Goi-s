import { afterEach, beforeEach, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const request = () => new Request("https://app.test/api/saude?token=secret", {
  headers: { authorization: "Bearer secret", cookie: "session=secret", "x-request-id": "pessoa@example.test" },
});

it("informa configuração ausente sem consultar rede nem expor variáveis", async () => {
  const fetch = vi.fn(() => { throw new Error("não deve consultar rede"); });
  vi.stubGlobal("fetch", fetch);
  const { GET } = await import("./route");
  const response = await GET(request());
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ aplicacao: "ok", banco: "nao_configurado" });
  expect(fetch).not.toHaveBeenCalled();
});

it("desabilita cache, indexação e referência e correlaciona resposta com log seguro", async () => {
  const { GET } = await import("./route");
  const response = await GET(request());
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(response.headers.get("x-robots-tag")).toContain("noindex");
  expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  const id = response.headers.get("x-request-id");
  expect(id).toMatch(/^[0-9a-f-]{36}$/);
  const output = vi.mocked(console.info).mock.calls.flat().join("");
  expect(JSON.parse(output)).toMatchObject({ requestId: id, banco: "nao_configurado", status: 503 });
  expect(output).not.toMatch(/secret|example|token|cookie|authorization/i);
});

it("consulta recurso público com a publishable key somente em apikey", async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://public.supabase.co/");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "legacy-public-ignored");
  vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_not_public");
  let sent: RequestInit | undefined;
  let target = "";
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    target = url;
    sent = init;
    return new Response(null, { status: 200 });
  });
  const { GET } = await import("./route");
  const response = await GET(request());
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ aplicacao: "ok", banco: "ok" });
  expect(target).toBe("https://public.supabase.co/rest/v1/municipios?select=slug&limit=1");
  expect(sent).toMatchObject({ method: "HEAD", cache: "no-store", redirect: "error", headers: { apikey: "sb_publishable_test" } });
  expect(new Headers(sent?.headers).has("authorization")).toBe(false);
  expect(sent?.signal).toBeInstanceOf(AbortSignal);
  expect(JSON.stringify(sent)).not.toContain("sb_secret_not_public");
});

it("mantém o fallback Bearer de uma chave anon JWT legada", async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://public.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
  const legacy = "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiJ9.signature";
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", legacy);
  let sent: RequestInit | undefined;
  vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => { sent = init; return new Response(null, { status: 200 }); });
  const { GET } = await import("./route");
  expect((await GET(request())).status).toBe(200);
  expect(new Headers(sent?.headers).get("apikey")).toBe(legacy);
  expect(new Headers(sent?.headers).get("authorization")).toBe(`Bearer ${legacy}`);
});

it("trata URL inválida como indisponibilidade sem revelar configuração", async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "configuracao-invalida-secret");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-test");
  const { GET } = await import("./route");
  const response = await GET(request());
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ aplicacao: "ok", banco: "indisponivel" });
  expect(vi.mocked(console.info).mock.calls.flat().join("")).not.toContain("secret");
});

it.each(["rede", "http"])("retorna falha genérica quando banco falha por %s", async (tipo) => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://public.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-test");
  vi.stubGlobal("fetch", async () => {
    if (tipo === "rede") throw new Error("senha=secret pessoa@example.test");
    return Response.json({ detalhe: "secret" }, { status: 500 });
  });
  const { GET } = await import("./route");
  const response = await GET(request());
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ aplicacao: "ok", banco: "indisponivel" });
  expect(vi.mocked(console.info).mock.calls.flat().join("")).not.toMatch(/secret|example|senha/);
});
