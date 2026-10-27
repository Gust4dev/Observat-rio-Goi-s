import { describe, expect, it } from "vitest";
import { codificarCursor, decodificarCursor, lerFiltros } from "./params";

const T = "2026-10-27T12:34:56.123456+00:00";
const ID = "3f2b8c1e-5a4d-4e6f-8b7a-1c2d3e4f5a6b";
const b64 = (o: unknown) => Buffer.from(typeof o === "string" ? o : JSON.stringify(o)).toString("base64url");

describe("cursor", () => {
  it("faz ida e volta preservando microssegundos", () => {
    const c = decodificarCursor(codificarCursor({ t: T, id: ID }));
    expect(c).toEqual({ t: T, id: ID });
  });

  it("recusa lixo, tipos errados e tamanho excessivo", () => {
    for (const v of [undefined, null, 42, {}, "", "!!!", "a b", "a".repeat(400), b64("não é json")]) {
      expect(decodificarCursor(v)).toBeNull();
    }
  });

  it("recusa cursor adulterado (injeção em t ou id, campos extras)", () => {
    const ruins = [
      { t: `${T},id.gt.0`, id: ID },
      { t: T, id: `${ID})or(id.gt.0` },
      { t: "a,b)", id: ID },
      { t: ")or(", id: ID },
      { t: "*", id: ID },
      { t: T, id: "*" },
      { t: T, id: ID, extra: 1 },
      { t: T },
      { t: 123, id: ID },
      { t: "2026-10-27", id: ID },
    ];
    for (const r of ruins) expect(decodificarCursor(b64(r))).toBeNull();
  });

  it("codificar recusa entrada inválida", () => {
    expect(() => codificarCursor({ t: "x,y", id: ID })).toThrow();
  });
});

describe("lerFiltros", () => {
  it("aceita slugs válidos e cursor válido", () => {
    const cursor = codificarCursor({ t: T, id: ID });
    expect(lerFiltros({ municipio: "goiania", categoria: "saude-basica", cursor })).toEqual({
      municipio: "goiania",
      categoria: "saude-basica",
      cursor: { t: T, id: ID },
    });
  });

  it("valor inválido vira padrão, nunca exceção", () => {
    const ruins = ["a,b)", ")or(", "*", "A", "a b", "a".repeat(81), "", "a;b", "a.b", "../x", "%27"];
    for (const v of ruins) {
      const f = lerFiltros({ municipio: v, categoria: v, cursor: v });
      expect(f.municipio).toBeUndefined();
      expect(f.categoria).toBeUndefined();
      expect(f.cursor).toBeUndefined();
    }
  });

  it("lida com array, undefined e entradas absurdas", () => {
    expect(lerFiltros({ municipio: ["goiania", "x"] }).municipio).toBe("goiania");
    expect(lerFiltros({ municipio: [] }).municipio).toBeUndefined();
    expect(lerFiltros(undefined)).toEqual({ municipio: undefined, categoria: undefined, cursor: undefined });
    expect(() => lerFiltros(null)).not.toThrow();
    expect(() => lerFiltros("texto" as never)).not.toThrow();
  });

  it("ignora parâmetro de tamanho vindo da URL", () => {
    expect(lerFiltros({ limite: "9999", limit: "9999" } as never)).not.toHaveProperty("limite");
  });
});
