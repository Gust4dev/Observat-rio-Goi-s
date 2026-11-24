import { describe, expect, it } from "vitest";
import catalogo from "@/lib/mapa/municipios.json";
import { normalizar } from "./normalizar";
import { ranquearMunicipios } from "./ranquear";

describe("normalizar", () => {
  it("remove acentos, caixa e espaços redundantes", () => {
    expect(normalizar("  SÃO   Luís ")).toBe("sao luis");
    expect(normalizar("Goiânia")).toBe("goiania");
  });
});

describe("ranquearMunicipios", () => {
  it("prefixo vem antes de substring", () => {
    const r = ranquearMunicipios("goi", catalogo);
    expect(r.length).toBeGreaterThan(0);
    const primeiroSubstring = r.findIndex((m) => !normalizar(m.nome).startsWith("goi"));
    if (primeiroSubstring >= 0) {
      expect(r.slice(primeiroSubstring).every((m) => !normalizar(m.nome).startsWith("goi"))).toBe(true);
    }
    expect(normalizar(r[0].nome).startsWith("goi")).toBe(true);
  });
  it("ignora acento, caixa e espaços", () => {
    expect(ranquearMunicipios("anapolis", catalogo)[0].nome).toBe("Anápolis");
    expect(ranquearMunicipios("  SAO luis ", catalogo).map((m) => m.nome)).toContain("São Luís de Montes Belos");
  });
  it("início de palavra vem antes de substring solta", () => {
    const cat = [{ nome: "Xmontes", slug: "xmontes" }, { nome: "Belos Montes", slug: "belos-montes" }];
    expect(ranquearMunicipios("montes", cat).map((m) => m.slug)).toEqual(["belos-montes", "xmontes"]);
  });
  it("vazio ou só espaços devolve []", () => {
    expect(ranquearMunicipios("", catalogo)).toEqual([]);
    expect(ranquearMunicipios("   ", catalogo)).toEqual([]);
  });
  it("tolera erro de 1 letra em consultas de 4+ letras", () => {
    const nomes = ranquearMunicipios("goiana", catalogo).map((m) => m.nome);
    expect(nomes.some((n) => n === "Goiânia" || n === "Goianésia")).toBe(true);
    const cat = [{ nome: "Goiânia", slug: "goiania" }];
    expect(ranquearMunicipios("goiaina", cat).map((m) => m.slug)).toEqual(["goiania"]);
  });
  it("não aplica fuzzy a consultas curtas", () => {
    const cat = [{ nome: "Ab", slug: "ab" }];
    expect(ranquearMunicipios("xx", cat)).toEqual([]);
    expect(ranquearMunicipios("abc", [{ nome: "Abd", slug: "abd" }])).toEqual([]);
  });
  it("respeita o limite", () => {
    expect(ranquearMunicipios("a", catalogo)).toHaveLength(8);
    expect(ranquearMunicipios("a", catalogo, 3)).toHaveLength(3);
  });
  it("consulta gigante devolve []", () => {
    expect(ranquearMunicipios("a".repeat(500), catalogo)).toEqual([]);
  });
  it("desempata por nome em pt-BR", () => {
    const cat = [{ nome: "Água B", slug: "b" }, { nome: "Água A", slug: "a" }];
    expect(ranquearMunicipios("agua", cat).map((m) => m.slug)).toEqual(["a", "b"]);
  });
});
