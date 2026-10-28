import { createElement } from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ListaMunicipios } from "./ListaMunicipios";
const seed = readFileSync("db/008_seed_municipios.sql", "utf8");
const municipios = [...seed.matchAll(/\(\d+, '((?:[^']|'')*)', '([^']+)'\)/g)].map((m) => ({ nome: m[1].replaceAll("''", "'"), slug: m[2] }));
describe("índice oficial de municípios", () => {
  it("oferece cada um dos 246 nomes e slugs oficiais em ordem alfabética", () => {
    const html = renderToStaticMarkup(createElement(ListaMunicipios, { municipios, busca: "" }));
    expect(municipios).toHaveLength(246);
    for (const m of municipios) expect(html).toContain(`href="/municipios/${m.slug}"`);
    expect(html.indexOf("Abadia de Goiás")).toBeLessThan(html.indexOf("Goiânia"));
    expect(html.indexOf("Goiânia")).toBeLessThan(html.indexOf("Vila Propício"));
  });
  it("busca por GET sem JavaScript e limita resultados sem excluir catálogo", () => {
    const html = renderToStaticMarkup(createElement(ListaMunicipios, { municipios, busca: "goias" }));
    expect(html).toContain('method="get"');
    expect(html).toContain('name="nome_municipio"');
    expect((html.match(/href="\/municipios\//g) ?? [])).toHaveLength(12);
    expect(html).toContain("Até 12 resultados");
    expect(html).toContain('href="/municipios"');
  });
  it("não apresenta contagem indisponível como zero e descreve zero disponível", () => {
    const html = renderToStaticMarkup(createElement(ListaMunicipios, { municipios: [{nome:"Goiânia",slug:"goiania",total:0},{nome:"Anápolis",slug:"anapolis"}], busca: "" }));
    expect((html.match(/Sem relatos publicados/g) ?? [])).toHaveLength(1);
    expect(html).not.toContain("0 relatos");
  });
});
