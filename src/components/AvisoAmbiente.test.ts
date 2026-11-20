import { afterEach, describe, expect, it, vi } from "vitest";
import { AvisoAmbiente } from "./AvisoAmbiente";

afterEach(() => vi.unstubAllEnvs());

describe("aviso global de teste", () => {
  it("não mostra o aviso em Production", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://hvekgzxuciyewtybwads.supabase.co");
    vi.stubEnv("SUPABASE_PRODUCTION_PROJECT_REF", "hvekgzxuciyewtybwads");
    vi.stubEnv("SUPABASE_PRODUCTION_DATA_APPROVED", "true");

    expect(AvisoAmbiente()).toBeNull();
  });

  it("oculta o aviso em Production mesmo enquanto leituras ficam bloqueadas", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://hvekgzxuciyewtybwads.supabase.co");
    vi.stubEnv("SUPABASE_PRODUCTION_PROJECT_REF", "");
    vi.stubEnv("SUPABASE_PRODUCTION_DATA_APPROVED", "");

    expect(AvisoAmbiente()).toBeNull();
  });

  it.each(["preview", "development"])("mantém o aviso em %s", (environment) => {
    vi.stubEnv("VERCEL_ENV", environment);

    expect(AvisoAmbiente()?.props.children).toBe("Ambiente de teste — dados fictícios");
  });
});
