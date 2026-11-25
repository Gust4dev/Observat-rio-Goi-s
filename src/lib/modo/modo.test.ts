import { describe, expect, it } from "vitest";
import { adminValido, resolverModo, segredoAdmin, tokenAdmin } from "./modo";

const SEGREDO = "segredo-de-teste-123456";
const env = { MODO_ADMIN_SEGREDO: SEGREDO };

describe("segredo", () => {
  it("exige 16+ caracteres", () => {
    expect(segredoAdmin({ MODO_ADMIN_SEGREDO: "curto" })).toBeNull();
    expect(segredoAdmin({})).toBeNull();
    expect(segredoAdmin({ MODO_ADMIN_SEGREDO: ` ${SEGREDO} ` })).toBe(SEGREDO);
  });
  it("cookie de admin não contém o segredo e é determinístico", async () => {
    const t = await tokenAdmin(SEGREDO);
    expect(t).toMatch(/^[0-9a-f]{64}$/);
    expect(t).not.toContain(SEGREDO);
    expect(await tokenAdmin(SEGREDO)).toBe(t);
    expect(await adminValido(t, env)).toBe(true);
    expect(await adminValido("0".repeat(64), env)).toBe(false);
    expect(await adminValido(t, {})).toBe(false);
  });
});

describe("resolverModo (igual em qualquer ambiente)", () => {
  it("padrão: desligado e sem faixa", async () => {
    expect(await resolverModo({}, env)).toEqual({ gerados: false, alternavel: false });
  });
  it("só liga com admin válido e interruptor em 1", async () => {
    const admin = await tokenAdmin(SEGREDO);
    expect(await resolverModo({ admin, ficticios: "1" }, env)).toEqual({ gerados: true, alternavel: true });
    expect(await resolverModo({ admin, ficticios: "0" }, env)).toEqual({ gerados: false, alternavel: true });
    expect(await resolverModo({ admin }, env)).toEqual({ gerados: false, alternavel: true });
    expect(await resolverModo({ admin: "falso", ficticios: "1" }, env)).toEqual({ gerados: false, alternavel: false });
    expect(await resolverModo({ ficticios: "1" }, env)).toEqual({ gerados: false, alternavel: false });
  });
  it("não depende de VERCEL_ENV", async () => {
    const admin = await tokenAdmin(SEGREDO);
    for (const VERCEL_ENV of [undefined, "preview", "production"]) {
      expect(await resolverModo({ admin, ficticios: "1" }, { ...env, VERCEL_ENV })).toEqual({ gerados: true, alternavel: true });
      expect(await resolverModo({}, { ...env, VERCEL_ENV })).toEqual({ gerados: false, alternavel: false });
    }
  });
});
