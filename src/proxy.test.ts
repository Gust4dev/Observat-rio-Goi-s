import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { proxy } from "./proxy";

const basic = `Basic ${Buffer.from("usuario:senha").toString("base64")}`;

afterEach(() => vi.unstubAllEnvs());

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("VERCEL_ENV", "preview");
  vi.stubEnv("ACESSO_STAGING_USUARIO", "usuario");
  vi.stubEnv("ACESSO_STAGING_SENHA", "senha");
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
    expect(res.headers.get("x-middleware-next")).toBe("1");
    expect(res.headers.getSetCookie()).toEqual([]);
    expect(res.headers.get("location")).toBeNull();
  }
});
