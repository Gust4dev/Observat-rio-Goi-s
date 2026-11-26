import { createElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
const obter = vi.hoisted(() => vi.fn());
const modoAtual = vi.hoisted(() => vi.fn());
vi.mock("@/lib/dados/consultas", () => ({ obterMunicipio: obter }));
vi.mock("@/lib/modo/servidor", () => ({ modoAtual }));
import Pagina from "./page";
import { TextoPainelMunicipio } from "@/components/TextoPainelMunicipio";
const props = { params: Promise.resolve({slug:"goiania"}), searchParams: Promise.resolve({}) };
beforeEach(() => modoAtual.mockResolvedValue({gerados:false,alternavel:false}));
async function resolverConteudo(pagina: ReactElement) {
 const children = (pagina as ReactElement<{children: ReactElement[]}>).props.children;
 const limite = children[1] as ReactElement<{children: unknown}>;
 const conteudo = limite.props.children as {type: unknown; props: unknown};
 return (conteudo.type as (props: unknown) => Promise<ReactNode>)(conteudo.props);
}
it("separa município acompanhado vazio do município sem acompanhamento e preserva seleção no CTA", async () => {
 obter.mockResolvedValue({slug:"goiania",nome:"Goiânia",total:0,ativo_acompanhamento:false});
 const paginaVazia = await Pagina(props);
 const html = renderToStaticMarkup(await resolverConteudo(paginaVazia));
 expect(html).toContain("Ainda não acompanhamos relatos neste município");
 expect(html).toContain('href="/registrar?municipio=goiania"');
 expect(html).not.toContain("Carregando relatos");
 obter.mockResolvedValue({slug:"goiania",nome:"Goiânia",total:0,ativo_acompanhamento:true});
 const ativo = await Pagina(props);
 // O cabeçalho é SSR síncrono; o texto do total depende do modo (cookie) e a lista fica em Suspense.
 const cabecalho = renderToStaticMarkup(createElement("div", {}, ativo.props.children[0]));
 expect(cabecalho).toContain("<h1>Goiânia</h1>");
 const htmlAtivo = renderToStaticMarkup(await resolverConteudo(ativo));
 expect(htmlAtivo).toContain('href="/registrar?municipio=goiania"');
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
 const cta = renderToStaticMarkup(await resolverConteudo(ativo));
 expect(cta).toContain("Registrar um problema");
 expect(cta).toContain('href="/registrar?municipio=anapolis"');
});
it("mantém relatos gerados visíveis em município sem acompanhamento real", async () => {
 const municipio = {slug:"goiania",nome:"Goiânia",total:0,ativo_acompanhamento:false};
 const municipioComGerados = {...municipio,total:12};
 obter.mockImplementation(async (_slug: string, gerados = false) => gerados ? municipioComGerados : municipio);
 modoAtual.mockResolvedValue({gerados:true,alternavel:true});

 const pagina = await Pagina(props);
 const html = renderToStaticMarkup(await resolverConteudo(pagina));

 expect(obter).toHaveBeenCalledWith("goiania", true);
 expect(html).not.toContain("Ainda não acompanhamos relatos neste município");
 expect(html).toContain("Carregando relatos");
});
