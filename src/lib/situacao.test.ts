import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SeloSituacao } from "@/components/SeloSituacao";
import { SITUACOES } from "./situacao";

describe("situação pública", () => {
  it("distingue os sete estados pela forma do ícone, além do texto", () => {
    const formas = SITUACOES.map((situacao) => renderToStaticMarkup(createElement(SeloSituacao, { situacao, resolucao: { justificativa: "Reparo", evidencia: "Foto" } })).match(/<svg.*?<\/svg>/)?.[0]);
    expect(new Set(formas).size).toBe(7);
  });
  it("não afirma resolução quando o modelo público não fornece documentação", () => {
    const html = renderToStaticMarkup(createElement(SeloSituacao, { situacao: "resolvido" }));
    expect(html).toContain("Resolução sem documentação");
    expect(html).not.toContain(">Resolvido<");
  });
});

import { IconeCategoria } from "@/components/IconeCategoria";
import { SeloConferencia } from "@/components/SeloSituacao";

const categorias = [
  ["saude", "Saúde"], ["educacao", "Educação"], ["infraestrutura", "Infraestrutura"],
  ["seguranca", "Segurança"], ["transporte", "Transporte e mobilidade"],
  ["iluminacao-publica", "Iluminação pública"], ["saneamento", "Saneamento"],
  ["meio-ambiente", "Meio ambiente"], ["emprego", "Emprego e desenvolvimento"],
  ["servicos-publicos", "Serviços públicos"], ["outros", "Outros"],
] as const;

describe("sinais separados e categorias", () => {
  it.each(categorias)("mantém nome visível e SVG decorativo para %s", (slug, nome) => {
    const html = renderToStaticMarkup(createElement(IconeCategoria, { categoria: slug }));
    expect(html).toContain(nome);
    expect(html).toMatch(/<svg[^>]*aria-hidden="true"/);
    expect(html).toContain('stroke-width="1.75"');
    expect(html).toMatch(/<path d="[^"]+"/);
  });
  it("só apresenta conferência quando explicitamente informada", () => {
    expect(renderToStaticMarkup(createElement(SeloConferencia, { conferido: false }))).toBe("");
    expect(renderToStaticMarkup(createElement(SeloConferencia, { conferido: true }))).toContain("Conferido pela equipe");
  });
  it.each([undefined, { justificativa: "", evidencia: "foto" }, { justificativa: "Relato", evidencia: " " }])("exige os dois campos de documentação: %j", (resolucao) => {
    expect(renderToStaticMarkup(createElement(SeloSituacao, { situacao: "resolvido", resolucao }))).toContain("Resolução sem documentação");
  });
  it("permite resolução documentada sem inferir conferência", () => {
    const html = renderToStaticMarkup(createElement(SeloSituacao, { situacao: "resolvido", resolucao: { justificativa: "Reparo concluído", evidencia: "Foto pública do reparo" } }));
    expect(html).toContain(">Resolvido<");
    expect(html).not.toContain("Conferido pela equipe");
  });
  it("mantém o encerramento em tom neutro, fora do erro vermelho", () => {
    const html = renderToStaticMarkup(createElement(SeloSituacao, { situacao: "encerrado_sem_solucao" }));
    expect(html).toContain("bg-tom-encerrado-fundo");
    expect(html).not.toMatch(/erro|red-/);
  });
});


const estados = [
  ["registrado", "Recebido"], ["em_analise", "Em análise"],
  ["encaminhado", "Encaminhado ao órgão"], ["aguardando_resposta", "Aguardando resposta do órgão"],
  ["em_atendimento", "Sendo resolvido"], ["resolvido", "Resolvido"],
  ["encerrado_sem_solucao", "Encerrado sem solução"],
] as const;

it.each(estados)("preserva rótulo completo e permite quebra no selo %s em uma coluna móvel", (situacao, rotulo) => {
  const html = renderToStaticMarkup(createElement(SeloSituacao, { situacao, resolucao: { justificativa: "Reparo", evidencia: "Foto" } }));
  expect(html).toContain(`>${rotulo}<`);
  expect(html).toContain("max-w-full");
  expect(html).toContain("min-w-0 break-words");
  expect(html).not.toMatch(/whitespace-nowrap|truncate/);
  expect(html).toMatch(/<svg[^>]*aria-hidden="true"/);
});

it.each(categorias)("permite o nome de %s quebrar na largura disponível de 360px", (categoria) => {
  const html = renderToStaticMarkup(createElement(IconeCategoria, { categoria }));
  expect(html).toContain("max-w-full");
  expect(html).toContain("min-w-0 break-words");
  expect(html).not.toMatch(/whitespace-nowrap|truncate/);
});
