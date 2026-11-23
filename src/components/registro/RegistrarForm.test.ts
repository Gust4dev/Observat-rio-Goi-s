import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { RegistrarForm, SemJavaScript } from "./RegistrarForm";

vi.mock("next/script", () => ({
  default: ({ src }: { src: string }) => createElement("script", { src }),
}));

const props = { municipios:[{slug:"goiania",nome:"Goiânia"}], categorias:[{slug:"mobilidade",nome:"Mobilidade"}], siteKey:"test", captchaObrigatorio:true, registroDisponivel:true, fotosHabilitadas:true };
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
  expect(html).toContain("challenges.cloudflare.com");
  expect(html).not.toMatch(/type="(?:email|tel|file)"/);
  expect(html).toContain("aparelho compartilhado");
 });
 it("explica indisponibilidade e exige JavaScript sem simular envio", () => {
  const html = renderToStaticMarkup(createElement(RegistrarForm, {...props, siteKey:undefined}));
  expect(html).toContain("Registro indisponível no momento");
  expect(renderToStaticMarkup(createElement(SemJavaScript))).toContain("Nenhum relato será enviado sem esse link");
 });
 it("não carrega Turnstile quando a proteção do formulário vem da Vercel", () => {
  const html = renderToStaticMarkup(createElement(RegistrarForm, {...props, siteKey:undefined, captchaObrigatorio:false}));
  expect(html).not.toContain("challenges.cloudflare.com");
  expect(html).not.toContain('aria-label="Verificação de segurança"');
  expect(html).not.toContain("Registro indisponível no momento");
  expect(html).toContain('type="submit"');
  expect(html).not.toContain('type="submit" disabled');
 });
 it("fecha o formulário quando o cadastro Production não está habilitado", () => {
  const html = renderToStaticMarkup(createElement(RegistrarForm, {...props, registroDisponivel:false}));
  expect(html).toContain("Registro indisponível no momento");
  expect(html).toContain('type="submit" disabled');
 });
});
