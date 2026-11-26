import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { COOKIE_ADMIN, tokenAdmin } from "@/lib/modo/modo";
import { proxy } from "./proxy";

const basic = `Basic ${Buffer.from("usuario:senha").toString("base64")}`;

afterEach(() => vi.unstubAllEnvs());

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("VERCEL_ENV", "preview");
  vi.stubEnv("ACESSO_STAGING_USUARIO", "usuario");
  vi.stubEnv("ACESSO_STAGING_SENHA", "senha");
  vi.stubEnv("MODO_ADMIN_SEGREDO", "");
});

describe("proteção do ambiente Preview", () => {
  it.each(["/", "/api/dados", "/admin", "/api/admin/fila"])(
    "exige Basic em %s no Preview",
    async (path) => {
      const response = await proxy(new NextRequest(`https://teste${path}`));
      expect(response.status).toBe(401);
      expect(response.headers.get("www-authenticate")).toContain("Basic");
      expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    },
  );

  it("encaminha Preview com Basic válido e preserva noindex", async () => {
    const response = await proxy(new NextRequest("https://teste/", { headers: { authorization: basic } }));
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("www-authenticate")).toBeNull();
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  });

  it("recusa credenciais Basic incorretas", async () => {
    const response = await proxy(new NextRequest("https://teste/", {
      headers: { authorization: `Basic ${Buffer.from("usuario:errada").toString("base64")}` },
    }));
    expect(response.status).toBe(401);
  });

  it("falha fechado no Preview sem credenciais configuradas", async () => {
    vi.stubEnv("ACESSO_STAGING_SENHA", "");
    const response = await proxy(new NextRequest("https://teste/"));
    expect(response.status).toBe(503);
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  });
});

it.each(["production", "development"])("encaminha GET público sem Basic em %s", async (environment) => {
  vi.stubEnv("VERCEL_ENV", environment);
  // Variáveis antigas podem continuar presentes sem impor Basic fora do Preview.
  const response = await proxy(new NextRequest("https://teste/api/dados"));
  expect(response.headers.get("x-middleware-next")).toBe("1");
  expect(response.headers.get("www-authenticate")).toBeNull();
  expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
});

it("encaminha Production mesmo sem as variáveis de Basic do Preview", async () => {
  vi.stubEnv("VERCEL_ENV", "production");
  vi.stubEnv("ACESSO_STAGING_USUARIO", undefined);
  vi.stubEnv("ACESSO_STAGING_SENHA", undefined);
  const response = await proxy(new NextRequest("https://teste/"));
  expect(response.headers.get("x-middleware-next")).toBe("1");
  expect(response.headers.get("www-authenticate")).toBeNull();
});

it("encaminha desenvolvimento local sem configuração Vercel ou Basic", async () => {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("VERCEL_ENV", undefined);
  vi.stubEnv("ACESSO_STAGING_USUARIO", undefined);
  vi.stubEnv("ACESSO_STAGING_SENHA", undefined);
  expect((await proxy(new NextRequest("https://teste/"))).headers.get("x-middleware-next")).toBe("1");
});

it("só isenta de Basic o caminho exato do cron, deixando sua autorização para a rota", async () => {
  expect((await proxy(new NextRequest("https://teste/api/cron/limpar-quarentena"))).headers.get("x-middleware-next")).toBe("1");
  for (const path of ["/api/cron/outra", "/api/cron/limpar-quarentena/extra"]) {
    expect((await proxy(new NextRequest(`https://teste${path}`))).status).toBe(401);
  }
});


it("ignora parâmetros legados de ativação, alteração e saída do modo demonstração", async () => {
  vi.stubEnv("VERCEL_ENV", "production");
  const segredo = "segredo-ficticio-dedicado";
  vi.stubEnv("MODO_ADMIN_SEGREDO", segredo);
  for (const query of [`admin=${segredo}`, "ficticios=1", "admin=sair"]) {
    const res = await proxy(new NextRequest(`https://teste/?${query}`));
    expect(res.headers.get("x-middleware-rewrite")).toBe("https://teste/demonstracao");
    expect(res.headers.getSetCookie()).toEqual([]);
    expect(res.headers.get("location")).toBeNull();
  }
});

describe("acesso temporário de demonstração em Production", () => {
  const segredo = "codigo-temporario-de-demonstracao";

  beforeEach(() => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("MODO_ADMIN_SEGREDO", segredo);
  });

  it("serve o formulário na home sem cookie de demonstração válido", async () => {
    const response = await proxy(new NextRequest("https://teste/"));
    expect(response.headers.get("x-middleware-rewrite")).toBe("https://teste/demonstracao");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  });

  it("redireciona páginas protegidas à home sem cookie válido", async () => {
    const response = await proxy(new NextRequest("https://teste/problemas"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://teste/");
  });

  it("nega APIs Next com JSON quando não existe sessão de demonstração", async () => {
    const response = await proxy(new NextRequest("https://teste/api/dados"));
    expect(response.status).toBe(401);
    expect(response.headers.get("content-type")).toContain("application/json");
    await expect(response.json()).resolves.toMatchObject({error:{code:"demo_required"}});
  });

  it("aceita apenas o cookie assinado pelo código configurado", async () => {
    const cookie = await tokenAdmin(segredo);
    const response = await proxy(new NextRequest("https://teste/api/dados", {
      headers: {cookie:`${COOKIE_ADMIN}=${cookie}`},
    }));
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("recusa cookie de demonstração adulterado", async () => {
    const response = await proxy(new NextRequest("https://teste/problemas", {
      headers: {cookie:`${COOKIE_ADMIN}=assinatura-invalida`},
    }));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://teste/");
  });

  it.each(["/demonstracao", "/api/demonstracao", "/api/cron/limpar-quarentena"])(
    "mantém a exceção estreita necessária em %s",
    async (path) => {
      const response = await proxy(new NextRequest(`https://teste${path}`));
      expect(response.headers.get("x-middleware-next")).toBe("1");
    },
  );
});
