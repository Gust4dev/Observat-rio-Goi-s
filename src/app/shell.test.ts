import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import RootLayout from "./layout";

describe("shell público sem JavaScript", () => {
  it("oferece destinos móveis e páginas institucionais já implementados", () => {
    const html = renderToStaticMarkup(createElement(RootLayout, null, "Conteúdo"));
    expect(html).toContain('aria-label="Navegação móvel"');
    expect(html).not.toContain('aria-disabled="true"');
    for (const rota of ["registrar", "dados", "municipios", "transparencia", "privacidade"]) expect(html).toContain(`href="/${rota}"`);
  });
  it("oferece um destino de foco para pular diretamente ao conteúdo", () => {
    const html = renderToStaticMarkup(createElement(RootLayout, null, "Conteúdo"));
    expect(html).toMatch(/<main[^>]*id="conteudo"[^>]*tabindex="-1"/);
  });
});

import { Cabecalho } from "@/components/Cabecalho";
import { NavegacaoInferior } from "@/components/NavegacaoInferior";

describe("destino atual e navegação móvel", () => {
  it.each(["/registrar", "/registrar/local", "/acompanhar", "/acompanhar/protocolo"])("omite a barra em %s", (pathname) => {
    expect(renderToStaticMarkup(createElement(NavegacaoInferior, { pathname }))).toBe("");
  });
  it("mantém a ordem de quatro destinos disponíveis", () => {
    const html = renderToStaticMarkup(createElement(NavegacaoInferior, { pathname: "/problemas" }));
    expect(html.match(/href="[^"]+"/g)).toEqual(['href="/"', 'href="/problemas"', 'href="/registrar"', 'href="/dados"']);
    expect(html.indexOf("Início")).toBeLessThan(html.indexOf("Problemas"));
    expect(html.indexOf("Problemas")).toBeLessThan(html.indexOf("Registrar"));
    expect(html.indexOf("Registrar")).toBeLessThan(html.indexOf("Dados"));
    expect(html).toMatch(/<a(?=[^>]*href="\/problemas")(?=[^>]*aria-current="page")[^>]*>/);
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
  });
  it("indica Problemas como seção atual no detalhe do relato", () => {
    const html = renderToStaticMarkup(createElement(Cabecalho, { pathname: "/problema/abc" }));
    expect(html).toMatch(/<a(?=[^>]*href="\/problemas")(?=[^>]*aria-current="page")[^>]*>/);
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
  });
});
