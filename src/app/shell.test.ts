import { readFileSync } from "node:fs";
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


describe("identidade e espaço seguro do shell", () => {
  it("usa wordmark tipográfico sem símbolo institucional", () => {
    const html = renderToStaticMarkup(createElement(Cabecalho, { pathname: "/" }));
    expect(html).toContain('class="shell-wordmark"');
    expect(html).toContain("Observat\u00f3rio <span>Goi\u00e1s</span>");
    expect(html).not.toMatch(/<svg|<img/);
  });
  it("reserva a altura integral da barra e a área segura para conteúdo e foco", () => {
    const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8");
    expect(css).toContain('padding-bottom: calc(5.5rem + env(safe-area-inset-bottom, 0px))');
    expect(css).toContain('scroll-margin-bottom: calc(6rem + env(safe-area-inset-bottom, 0px))');
    expect(css).toContain('.shell-nav-destaque:hover, .shell-nav-destaque:active');
  });
});
