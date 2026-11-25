import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("server-only", () => ({}));

import { consultar } from "./rest";

const schema = z.object({ id: z.string() });
const query = { select: ["id"] } as const;

beforeEach(() => {
  vi.stubEnv("VERCEL_ENV", "production");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://hvekgzxuciyewtybwads.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
  vi.stubEnv("SUPABASE_PRODUCTION_PROJECT_REF", "");
  vi.stubGlobal("fetch", vi.fn(async () => Response.json([{ id: "publico" }])));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("leituras públicas de Supabase em Production", () => {
  it("falha fechado sem ref confirmado antes de consultar o PostgREST", async () => {
    await expect(consultar("municipios", query, schema)).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("falha fechado em runtime Node de produção quando VERCEL_ENV está ausente", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "");

    await expect(consultar("municipios", query, schema)).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("falha fechado quando o ref autorizado diverge da URL antes da rede", async () => {
    vi.stubEnv("SUPABASE_PRODUCTION_PROJECT_REF", "rocebqrdbvrucxyzbien");

    await expect(consultar("municipios", query, schema)).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("não libera leituras só por confirmar o ref sem aprovação dos dados", async () => {
    vi.stubEnv("SUPABASE_PRODUCTION_PROJECT_REF", "hvekgzxuciyewtybwads");
    vi.stubEnv("SUPABASE_PRODUCTION_DATA_APPROVED", "");

    await expect(consultar("municipios", query, schema)).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    "http://hvekgzxuciyewtybwads.supabase.co",
    "https://hvekgzxuciyewtybwads.supabase.co.evil.example",
    "https://hvekgzxuciyewtybwads.supabase.co/rest/v1",
  ])("falha fechado para origem inválida antes da rede (%s)", async (url) => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", url);
    vi.stubEnv("SUPABASE_PRODUCTION_PROJECT_REF", "hvekgzxuciyewtybwads");

    await expect(consultar("municipios", query, schema)).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("permite a leitura quando o ref confirmado corresponde ao host Supabase", async () => {
    vi.stubEnv("SUPABASE_PRODUCTION_PROJECT_REF", "hvekgzxuciyewtybwads");
    vi.stubEnv("SUPABASE_PRODUCTION_DATA_APPROVED", "true");

    await expect(consultar("municipios", query, schema)).resolves.toEqual([{ id: "publico" }]);
    expect(fetch).toHaveBeenCalledExactlyOnceWith(
      "https://hvekgzxuciyewtybwads.supabase.co/rest/v1/municipios?select=id",
      expect.objectContaining({ method: "GET" }),
    );
  });
});

it("não exige ref Production no Preview", async () => {
  vi.stubEnv("VERCEL_ENV", "preview");

  await expect(consultar("municipios", query, schema)).resolves.toEqual([{ id: "publico" }]);
  expect(fetch).toHaveBeenCalledOnce();
});

it("usa credencial exclusiva do servidor somente na leitura de demonstração", async () => {
  vi.stubEnv("VERCEL_ENV", "preview");
  vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_teste");
  const recurso = "v_ocorrencias_publicas";

  await consultar(recurso, query, schema);
  await consultar(recurso, { ...query, gerados: true }, schema);

  expect(fetch).toHaveBeenNthCalledWith(1, expect.any(String), expect.objectContaining({
    headers: { apikey: "sb_publishable_test", Accept: "application/json" },
  }));
  expect(fetch).toHaveBeenNthCalledWith(2, expect.any(String), expect.objectContaining({
    headers: { apikey: "sb_secret_teste", Accept: "application/json", "x-modo-gerados": "1" },
    cache: "no-store", redirect: "error",
  }));
});

it("não rebaixa a leitura de demonstração para uma chave pública sem credencial de servidor", async () => {
  vi.stubEnv("VERCEL_ENV", "preview");
  vi.stubEnv("SUPABASE_SECRET_KEY", "");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

  await expect(consultar("v_ocorrencias_publicas", { ...query, gerados: true }, schema)).rejects.toThrow();
  expect(fetch).not.toHaveBeenCalled();
});
