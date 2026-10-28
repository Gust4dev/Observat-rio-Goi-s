import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Cabecalho } from "@/components/Cabecalho";
import { NavegacaoInferior } from "@/components/NavegacaoInferior";
import { Rodape } from "@/components/Rodape";

const rotas = ["sobre", "transparencia", "privacidade", "termos", "regras", "contato"];
const paginas = [
  ["sobre", () => import("./sobre/page")],
  ["transparencia", () => import("./transparencia/page")],
  ["privacidade", () => import("./privacidade/page")],
  ["termos", () => import("./termos/page")],
  ["regras", () => import("./regras/page")],
  ["contato", () => import("./contato/page")],
] as const;

describe("informação institucional provisória", () => {
  it.each(paginas)("renderiza /%s para leitura sem depender de interação", async (_rota, carregar) => {
    const pagina = await carregar();
    const html = renderToStaticMarkup(createElement(pagina.default));
    expect(html.match(/<h1[ >]/g)).toHaveLength(1);
    expect(html).not.toMatch(/<h[3-6][ >]/);
    expect(html).toContain('[A REVISAR PELO JURÍDICO]');
    expect(html.match(/\[A REVISAR PELO JURÍDICO\]/g)).toHaveLength(html.match(/<section[ >]/g)!.length);
    expect(html).toMatch(/<time datetime="\d{4}-\d{2}-\d{2}"/i);
    expect(html).not.toMatch(/<form|mailto:|tel:/);
    expect(pagina.metadata.robots).toEqual({ index: false, follow: false });
    expect(pagina.metadata.alternates?.canonical).toBeUndefined();
  });

  it("não apresenta o contato indefinido como uma ação disponível", async () => {
    const pagina = await import("./contato/page");
    const html = renderToStaticMarkup(createElement(pagina.default));
    expect(html).toContain("Canal de contato ainda não definido");
    expect(html).not.toMatch(/<button|<input|href="(?:mailto|tel):/);
  });

  it("permite chegar às páginas de leitura pelo rodapé", () => {
    const html = renderToStaticMarkup(createElement(Rodape));
    for (const rota of rotas) expect(html).toContain(`href="/${rota}"`);
  });

  it("habilita os destinos do produto já implementados", () => {
    const header = renderToStaticMarkup(createElement(Cabecalho, { pathname: "/dados" }));
    for (const rota of ["dados", "municipios", "registrar"]) expect(header).toContain(`href="/${rota}"`);
    const mobile = renderToStaticMarkup(createElement(NavegacaoInferior, { pathname: "/dados" }));
    expect(mobile).toContain('href="/registrar"');
    expect(mobile).toMatch(/<a(?=[^>]*href="\/dados")(?=[^>]*aria-current="page")/);
  });
});
