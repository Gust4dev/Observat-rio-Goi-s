import { renderToStaticMarkup } from "react-dom/server";
import { gzipSync } from "node:zlib";
import { describe, expect, it, vi } from "vitest";
import { ListaProblemas, montarHref } from "./ListaProblemas";

vi.mock("@/lib/dados/consultas", async (original) => ({
  ...await original<typeof import("@/lib/dados/consultas")>(),
  listarCategorias: async () => [{ slug: "saude", nome: "Saúde", ordem: 1 }],
  listarMunicipios: async () => [
    { slug: "goiania", nome: "Goiânia" },
    ...Array.from({ length: 245 }, (_, id) => ({ slug: `municipio-${id}`, nome: `Goiás ${id}` })),
  ],
  listarProblemas: async () => ({ itens: [], proximoCursor: "proximo" }),
}));

const render = async (searchParams: Record<string, string> = {}) => renderToStaticMarkup(await ListaProblemas({
  searchParams: Promise.resolve(searchParams), base: "/problemas", comSeletorDeMunicipio: true,
}));

describe("filtros GET progressivos", () => {
  it("preserva o nome pesquisado ao trocar categoria e avançar o cursor", async () => {
    const html = await render({ municipio: "goiania", categoria: "saude", nome_municipio: "Goiânia" });
    const links = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1].replaceAll("&amp;", "&"));
    expect(links).toContain("/problemas?municipio=goiania&nome_municipio=Goi%C3%A2nia");
    expect(links).toContain("/problemas?municipio=goiania&categoria=saude&nome_municipio=Goi%C3%A2nia");
    expect(links).toContain("/problemas?municipio=goiania&categoria=saude&cursor=proximo&nome_municipio=Goi%C3%A2nia#titulo-lista");
    expect(links).toContain("/problemas");
  });
  it("oferece busca de município e aplicação sem JavaScript preservando categoria", async () => {
    const html = await render({ municipio: "goiania", categoria: "saude", nome_municipio: "Goi" });
    expect(html).toContain('name="nome_municipio"');
    expect(html).toContain('method="get"');
    expect(html).toContain('value="Goi"');
    expect(html).toContain('value="goiania" selected=""');
    expect(html).toContain("Aplicar filtros");
    expect(html).toContain("Buscar município");
    // 12 resultados nominais no máximo, mais a opção Todos.
    expect((html.match(/<option /g) ?? []).length).toBe(13);
  });
  it("pagina com ambos os filtros e ancora no título focável, sem inventar total", async () => {
    const html = await render({ municipio: "goiania", categoria: "saude" });
    expect(html).toContain('href="/problemas?municipio=goiania&amp;categoria=saude&amp;cursor=proximo#titulo-lista"');
    expect(html).toContain('id="titulo-lista" tabindex="-1"');
    expect(html).not.toContain("7 relatos");
    expect(montarHref("/problemas", { municipio: "goiania", categoria: "saude" })).toBe("/problemas?municipio=goiania&categoria=saude");
  });
  it("mantém o fragmento de lista compacto em HTML e gzip", async () => {
    const html = await render();
    expect((html.match(/<option /g) ?? []).length).toBe(1);
    expect(Buffer.byteLength(html)).toBeLessThan(100_000);
    expect(gzipSync(html).byteLength).toBeLessThan(100_000);
  });
});
