import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
const obter = vi.hoisted(() => vi.fn());
vi.mock("@/lib/dados/consultas", () => ({ obterMunicipio: obter }));
import Pagina from "./page";
import { TextoPainelMunicipio } from "@/components/TextoPainelMunicipio";
const props = { params: Promise.resolve({slug:"goiania"}), searchParams: Promise.resolve({}) };
it("separa município acompanhado vazio do município sem acompanhamento e preserva seleção no CTA", async () => {
 obter.mockResolvedValue({slug:"goiania",nome:"Goiânia",total:0,ativo_acompanhamento:false});
 const html = renderToStaticMarkup(await Pagina(props));
 expect(html).toContain("Ainda não acompanhamos relatos neste município");
 expect(html).toContain('href="/registrar?municipio=goiania"');
 expect(html).not.toContain("Carregando relatos");
 obter.mockResolvedValue({slug:"goiania",nome:"Goiânia",total:0,ativo_acompanhamento:true});
 const ativo = await Pagina(props);
 // O cabeçalho é SSR síncrono; o texto do total depende do modo (cookie) e a lista fica em Suspense.
 const cabecalho = renderToStaticMarkup(createElement("div", {}, ativo.props.children[0]));
 expect(cabecalho).toContain("<h1>Goiânia</h1>");
 const texto = renderToStaticMarkup(await TextoPainelMunicipio({ slug: "goiania" }));
 expect(texto).toContain("Não há dados agregados exibíveis para este município.");
 expect(texto).not.toContain("Sem relatos publicados");
});
it("slug ausente retorna 404 antes da lista", async () => {
 obter.mockResolvedValue(null);
 await expect(Pagina(props)).rejects.toMatchObject({digest:"NEXT_HTTP_ERROR_FALLBACK;404"});
});
it("ramo ativo oferece o CTA de registro com o município selecionado", async () => {
 obter.mockResolvedValue({slug:"anapolis",nome:"Anápolis",total:4,ativo_acompanhamento:true});
 const ativo = await Pagina({ ...props, params: Promise.resolve({slug:"anapolis"}) });
 const cta = renderToStaticMarkup(createElement("div", {}, ativo.props.children[1]));
 expect(cta).toContain("Registrar um problema");
 expect(cta).toContain('href="/registrar?municipio=anapolis"');
});
