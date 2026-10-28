import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RegistrarForm, SemJavaScript } from "./RegistrarForm";
const props = { municipios:[{slug:"goiania",nome:"Goiânia"}], categorias:[{slug:"mobilidade",nome:"Mobilidade"}], siteKey:"test", indisponivel:false, fotosHabilitadas:true };
describe("formulário SSR acessível", () => {
 it("omite o passo de fotos por padrão", () => {
  const html = renderToStaticMarkup(createElement(RegistrarForm, {...props, fotosHabilitadas:undefined}));
  expect(html).toContain("Etapa 1 de 4 · Local");
  expect(html).toContain('aria-label="Progresso: etapa 1 de 4"');
  expect(html).not.toContain("de 5");
 });
 it("anuncia progresso e mantém controles nativos com município inicial validado", () => {
  const html = renderToStaticMarkup(createElement(RegistrarForm, {...props, municipioInicial:"goiania"}));
  expect(html).toContain("Etapa 1 de 5 · Local");
  expect(html).toContain('aria-live="polite"');
  expect(html).toContain('aria-label="Progresso: etapa 1 de 5"');
  expect(html).toContain('value="goiania" selected=""');
  expect(html).toContain('for="campo-municipio"');
  expect(html).toContain('type="submit"');
  expect(html).toContain("Continuar");
  expect(html).not.toMatch(/type="(?:email|tel|file)"/);
  expect(html).toContain("aparelho compartilhado");
 });
 it("explica indisponibilidade e exige JavaScript sem simular envio", () => {
  const html = renderToStaticMarkup(createElement(RegistrarForm, {...props, siteKey:undefined, indisponivel:true}));
  expect(html).toContain("Registro indisponível no momento");
  expect(renderToStaticMarkup(createElement(SemJavaScript))).toContain("Nenhum relato será enviado sem esse link");
 });
});
