import { describe, expect, it } from "vitest";
import { lerBuscaMunicipio } from "./params";
import { selecionarMunicipios } from "./consultas";

describe("busca de municípios no servidor", () => {
  const municipios = [
    { id: 1, nome: "Goiânia", slug: "goiania", codigo_ibge: "5208707" },
    { id: 2, nome: "Anápolis", slug: "anapolis", codigo_ibge: "5201108" },
  ];
  it("normaliza nome, aceita arrays e rejeita entrada de consulta hostil", () => {
    expect(lerBuscaMunicipio(["  Goiânia  ", "outro"])).toBe("Goiânia");
    for (const v of ["*", "a,b)", "a".repeat(81), {}, undefined]) expect(lerBuscaMunicipio(v)).toBe("");
  });
  it("encontra pelo nome sem acento e preserva slug estável", () => {
    expect(selecionarMunicipios(municipios, "goiania")).toEqual([municipios[0]]);
    expect(selecionarMunicipios(municipios, "ANAP")).toEqual([municipios[1]]);
  });
  it("não envia a lista completa na busca vazia e limita resultados", () => {
    expect(selecionarMunicipios(municipios, "")).toEqual([]);
    const muitos = Array.from({ length: 246 }, (_, id) => ({ ...municipios[0], id, slug: `cidade-${id}` }));
    expect(selecionarMunicipios(muitos, "go")).toHaveLength(12);
    expect(selecionarMunicipios(municipios, "*" )).toEqual([]);
  });
});
