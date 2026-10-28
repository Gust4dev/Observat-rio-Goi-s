import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CartaoProblema, type CartaoProblemaProps } from "./CartaoProblema";

const base: CartaoProblemaProps = {
  id: "abc 1", titulo: "Buraco na rua", municipioNome: "Goiânia", categoriaNome: "Saúde", categoriaSlug: "saude",
  situacao: "registrado", publicadoEm: "2026-01-10T12:00:00Z", demonstracao: true,
};
const render = (p: Partial<CartaoProblemaProps> = {}) => renderToStaticMarkup(createElement(CartaoProblema, { ...base, ...p }));

describe("CartaoProblema", () => {
  it("variante home: ícone com nome, demonstração, status, data e ação", () => {
    const html = render({ variante: "home", temRespostaOficial: true, confirmacoesTotal: 5 });
    expect(html).toContain("Saúde");
    expect(html).toContain("<svg");
    expect(html).toContain("Dados de demonstração");
    expect(html).toContain("Publicado em");
    expect(html).toContain("Tem resposta oficial");
    expect(html).toContain("Ver relato");
    expect(html).toContain("min-h-12");
    expect(html).toContain("w-full");
    expect(html).toContain("cursor-pointer");
    expect(html).toContain("md:hover:scale-[1.02]");
    expect(html).toContain("after:absolute after:inset-0");
    expect(html).toContain('href="/problema/abc%201"');
    expect(html).not.toContain("Também me afeta");
    expect(html).not.toMatch(/<a\s[^>]*>(?:(?!<\/a>)[\s\S])*<a\s/);
  });
  it("variante home: sem resposta oficial nem demonstração quando ausentes", () => {
    const html = render({ variante: "home", demonstracao: false, categoriaSlug: undefined });
    expect(html).not.toContain("Tem resposta oficial");
    expect(html).not.toContain("Dados de demonstração");
    expect(html).toContain("Saúde");
  });
  it("preserva a variante lista", () => {
    const html = render({ variante: "lista", temRespostaOficial: true });
    expect(html).toContain('class="border-b border-borda-suave py-5"');
    expect(html).toContain("text-xl");
    expect(html).toContain("Tem resposta oficial");
    expect(html).not.toContain("Ver relato");
    expect(html).not.toContain("<svg width=\"24\"");
  });
  it("preserva a variante resumo e a contagem de confirmações", () => {
    const html = render({ confirmacoesTotal: 3 });
    expect(html).toContain('class="rounded-2xl border border-borda-suave bg-superficie p-5"');
    expect(html).toContain("text-lg");
    expect(html).toContain("Também me afeta: 3");
    expect(html).not.toContain("Ver relato");
    expect(html).not.toContain("<svg width=\"24\"");
  });
});
