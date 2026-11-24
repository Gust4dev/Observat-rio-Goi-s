import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }) }));
import { HeroInicio } from "./HeroInicio";
import type { ResumoSemana } from "@/lib/dados/semana";

const municipios = [{ slug: "goiania", nome: "Goiânia" }, { slug: "anapolis", nome: "Anápolis" }];
const vazio: ResumoSemana = { total: 0, categoriaLider: null, pontos: [] };
const render = (resumo: ResumoSemana, extra: { indicadores?: { total_ocorrencias: number; municipios_com_registros: number } | null; demonstracao?: boolean } = {}) =>
  renderToStaticMarkup(createElement(HeroInicio, { resumo, municipios, demonstracao: false, ...extra }));

describe("HeroInicio", () => {
  it("(a) manchete com categoria líder e singular", () => {
    const resumo: ResumoSemana = { total: 12, categoriaLider: { slug: "saude", nome: "Saúde", total: 7 }, pontos: [{ slug: "goiania", nome: "Goiânia", total: 5 }] };
    const h1 = render(resumo).match(/<h1[^>]*>(.*?)<\/h1>/)![1];
    expect(h1).toContain("7 relatos sobre Saúde nos últimos 7 dias");
    const um = render({ ...resumo, categoriaLider: { slug: "saude", nome: "Saúde", total: 1 } }).match(/<h1[^>]*>(.*?)<\/h1>/)![1];
    expect(um).toContain("1 relato sobre Saúde nos últimos 7 dias");
  });
  it("(b) sem categoria líder cai para o acumulado honesto", () => {
    const html = render(vazio, { indicadores: { total_ocorrencias: 42, municipios_com_registros: 9 } });
    expect(html).toContain("42 relatos publicados em 9 municípios");
    expect(html).not.toContain("últimos 7 dias nos");
    expect(html.match(/<h1[^>]*>(.*?)<\/h1>/)![1]).not.toContain("últimos 7 dias");
    expect(html).not.toContain("0 relatos");
  });
  it("(c) sem pontos o mapa não tem círculos e convida a registrar", () => {
    const html = render(vazio);
    expect(html).not.toContain("<circle");
    expect(html).toContain("registrar um problema");
    expect(html).not.toContain("Onde mais se fala agora");
    expect(html).toContain("Mapa de Goiás sem destaques nos últimos 7 dias");
  });
  it("(d) lista um link por ponto", () => {
    const resumo: ResumoSemana = { total: 9, categoriaLider: { slug: "saude", nome: "Saúde", total: 6 }, pontos: [{ slug: "goiania", nome: "Goiânia", total: 5 }, { slug: "anapolis", nome: "Anápolis", total: 3 }] };
    const html = render(resumo);
    expect(html).toContain("Onde mais se fala agora");
    expect(html).toContain('href="/municipios/goiania"');
    expect(html).toContain('href="/municipios/anapolis"');
    expect(html).not.toContain('href="/municipios/catalao"');
    expect(html.match(/<circle/g)).toHaveLength(2);
  });
  it("(e) CTA de registro", () => {
    expect(render(vazio)).toContain('href="/registrar"');
    expect(render(vazio)).toContain("Registrar um problema");
  });
  it("(f) selo de demonstração só quando demonstracao", () => {
    expect(render(vazio, { demonstracao: true })).toContain("Dados de demonstração");
    expect(render(vazio)).not.toContain("Dados de demonstração");
  });
  it("(g) não usa o mapa interativo", () => {
    expect(readFileSync("src/components/HeroInicio.tsx", "utf8")).not.toContain("MapaGoias");
    expect(render(vazio)).not.toContain("Mapa interativo");
  });
});
