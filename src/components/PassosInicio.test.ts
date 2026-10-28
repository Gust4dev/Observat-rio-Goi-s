import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PassosInicio } from "./PassosInicio";

const html = renderToStaticMarkup(createElement(PassosInicio));

describe("PassosInicio", () => {
 it("é uma lista ordenada com três itens na ordem esperada", () => {
  expect(html.startsWith("<ol")).toBe(true);
  expect(html.match(/<li[ >]/g)).toHaveLength(3);
  const a = html.indexOf("Escolha sua cidade"), b = html.indexOf("Conte o que aconteceu"), c = html.indexOf("Acompanhe com o protocolo");
  expect(a).toBeGreaterThan(-1);
  expect(a).toBeLessThan(b);
  expect(b).toBeLessThan(c);
  expect(html.indexOf("01")).toBeLessThan(html.indexOf("02"));
  expect(html.indexOf("02")).toBeLessThan(html.indexOf("03"));
 });
 it("traz uma frase curta por etapa", () => {
  expect(html).toContain("Escolha pelo nome ou pelo mapa.");
  expect(html).toContain("O relato passa por análise antes de ser publicado.");
  expect(html).toContain("O protocolo ou o link permite acompanhar sem criar conta.");
 });
 it("esconde números e cenas do leitor de tela e não anima", () => {
  expect(html.match(/<svg /g)).toHaveLength(3);
  expect(html.match(/<svg [^>]*aria-hidden="true"/g)).toHaveLength(3);
  for (const n of ["01", "02", "03"]) expect(html).toMatch(new RegExp(`<span aria-hidden="true"[^>]*>${n}</span>`));
  expect(html).not.toMatch(/animate|transition|<animate|<img |<a |gradient/i);
  expect(html.match(/<h3/g)).toHaveLength(3);
 });
});
