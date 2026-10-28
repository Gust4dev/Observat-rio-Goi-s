import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CartaoProblema } from "./CartaoProblema";
import { LinhaDoTempo } from "./LinhaDoTempo";
import { AvisoMetodologico } from "./AvisoMetodologico";

const render = renderToStaticMarkup;
describe("leitura pública compartilhada", () => {
  it("mostra categoria antes do título, e atualização somente quando fornecida", () => {
    const html = render(createElement(CartaoProblema, { id: "123", titulo: "Rua sem luz", municipioNome: "Goiânia", categoriaNome: "Iluminação pública", situacao: "registrado", publicadoEm: "2026-10-27T12:00:00Z", temRespostaOficial: false }));
    expect(html.indexOf("Iluminação pública")).toBeLessThan(html.indexOf("Rua sem luz"));
    expect(html).not.toContain("Atualizado em");
    expect(html).not.toContain("Tem resposta oficial");
  });
  it("ordena eventos por instante sem modificar a lista recebida e transforma apenas HTTPS seguro em link", () => {
    const itens = [
      { id: 2, tipo: "evidencia", situacaoNova: null, texto: "Depois", evidencia: "https://exemplo.org/evidencia", criadoEm: "2026-10-27T12:00:00Z" },
      { id: 1, tipo: "nota", situacaoNova: null, texto: "Antes", evidencia: "javascript:alert(1)", criadoEm: "2026-10-26T12:00:00Z" },
    ];
    const html = render(createElement(LinhaDoTempo, { itens }));
    expect(html.indexOf("Antes")).toBeLessThan(html.indexOf("Depois"));
    expect(itens[0].id).toBe(2);
    expect(html).toContain('href="https://exemplo.org/evidencia"');
    expect(html).not.toContain('href="javascript:');
  });
  it("explica números e limites de Também me afeta junto ao painel", () => {
    const html = render(createElement(AvisoMetodologico));
    expect(html).toContain("Como ler estes números");
    expect(html).toContain("não medem a gravidade");
    expect(html).toContain("quantidade total de pessoas afetadas");
  });
});
import { EstadoVazio } from "./EstadoVazio";

describe("conteúdo opcional e limites", () => {
  it("distingue falta de cobertura da ausência de relatos", () => {
    const cobertura = render(createElement(EstadoVazio, { variante: "municipio-sem-cobertura" }));
    const lista = render(createElement(EstadoVazio, { variante: "lista-vazia" }));
    expect(cobertura).toContain("Ainda não acompanhamos relatos neste município");
    expect(lista).toContain("Ainda não há relatos publicados");
    expect(cobertura).not.toContain("Nenhum problema");
  });
  it("oferece limpar filtros somente quando destino é informado", () => {
    const html = render(createElement(EstadoVazio, { variante: "busca", acaoHref: "/problemas", acaoRotulo: "Limpar filtros" }));
    expect(html).toContain("Nenhum relato encontrado");
    expect(html).toContain('href="/problemas"');
    expect(render(createElement(EstadoVazio, { variante: "sem-resposta" }))).toContain("Ainda não há resposta oficial publicada");
  });
  it("omite resposta pendente e identifica vínculo publicado sem inventar verificação", async () => {
    const { RespostaOficial } = await import("./RespostaOficial");
    const resposta = { id: 1, ocorrencia_id: "123", autor_vinculo: "Secretaria", texto: "<script>perigo</script>", publicada_em: null as string | null };
    expect(render(createElement(RespostaOficial, { resposta }))).not.toContain("Secretaria");
    const html = render(createElement(RespostaOficial, { resposta: { ...resposta, publicada_em: "2026-10-27T12:00:00Z" } }));
    expect(html).toContain("Vínculo informado: Secretaria");
    expect(html).toContain("Vínculo não confirmado pela equipe");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
  });
  it("mantém metodologia e demonstração na seção do indicador inclusive para zero", async () => {
    const { CartaoIndicador } = await import("./CartaoIndicador");
    const html = render(createElement(CartaoIndicador, { nome: "Relatos publicados", valor: 0, nota: "Total publicado", demonstracao: true }));
    expect(html).toContain(">0<");
    expect(html).toContain("Dados de demonstração");
    expect(html).toContain("Como ler estes números");
    expect(html).toMatch(/<section[\s\S]*Dados de demonstração[\s\S]*Como ler estes números[\s\S]*<\/section>/);
  });
  it("limita fotos, preserva descrição contextual e bloqueia origens não autorizadas", async () => {
    const { GaleriaFotos } = await import("./GaleriaFotos");
    const fotos = Array.from({ length: 4 }, (_, i) => ({ id: i, url: `https://fotos.exemplo.org/${i}.jpg`, descricao: `Buraco na rua, ângulo ${i + 1}` }));
    const html = render(createElement(GaleriaFotos, { fotos, origensPermitidas: ["https://fotos.exemplo.org"] }));
    expect(html.match(/<img /g)).toHaveLength(3);
    expect(html).toContain('alt="Buraco na rua, ângulo 1"');
    expect(html.match(/loading="lazy"/g)).toHaveLength(3);
    expect(html).not.toContain("/3.jpg");
    const invalida = render(createElement(GaleriaFotos, { fotos: [{ id: 1, url: "https://outro.example/img.jpg", descricao: "Rua alagada" }] }));
    expect(invalida).not.toContain("<img");
    expect(invalida).toContain("Imagem indisponível");
    expect(invalida).toContain("Rua alagada");
    expect(render(createElement(GaleriaFotos, { fotos: [] }))).toContain("Nenhuma foto publicada");
  });
});


describe("metadados honestos e entradas hostis", () => {
  it("mantém variante de lista sem acrescentar dados, com data válida e ressalva da contagem zero", () => {
    const html = render(createElement(CartaoProblema, { id: "abc", titulo: "Relato", situacao: "registrado", variante: "lista", demonstracao: true, atualizadoEm: "2026-10-27T12:00:00Z", confirmacoesTotal: 0 }));
    expect(html).toContain('href="/problema/abc"');
    expect(html).toContain("Atualizado em");
    expect(html).toMatch(/datetime="2026-10-27T12:00:00Z"/i);
    expect(html).toContain("Também me afeta: 0");
    expect(html).toContain("não mede a gravidade");
    expect(html).toContain("Dados de demonstração");
    expect(html).not.toContain("undefined");
  });
  it.each(["http://exemplo.org", "https://usuario:senha@exemplo.org", "//exemplo.org", "<b>Evidência</b>"])("mantém evidência %s como texto", (evidencia) => {
    const html = render(createElement(LinhaDoTempo, { itens: [{ id: 1, tipo: "nota", situacaoNova: null, texto: "Texto", evidencia, criadoEm: "data inválida" }] }));
    expect(html).not.toContain("<a ");
    expect(html).not.toContain("<b>");
    expect(html).toContain("Data não informada");
  });
  it("não desenha trilho vazio", () => {
    expect(render(createElement(LinhaDoTempo, { itens: [] }))).not.toContain("<ol");
  });
  it("não envia imagem sem descrição contextual e não infere URL de storage", async () => {
    const { GaleriaFotos } = await import("./GaleriaFotos");
    const html = render(createElement(GaleriaFotos, { fotos: [{ id: 1, url: "/imagem.jpg", descricao: " " }, { id: 2, url: "bucket/arquivo.jpg", descricao: "Lixo na calçada" }] }));
    expect(html).not.toContain("<img");
    expect(html).toContain("Descrição da imagem não informada");
    expect(html).toContain("Lixo na calçada");
  });
});


describe("resolução documentada no histórico", () => {
  it.each([
    { texto: "Reparo concluído", evidencia: null },
    { texto: "Reparo concluído", evidencia: "   " },
    { texto: "   ", evidencia: "https://exemplo.org/comprovante" },
  ])("não afirma resolução quando falta justificativa ou evidência: %j", ({ texto, evidencia }) => {
    const html = render(createElement(LinhaDoTempo, { itens: [{ id: 1, tipo: "mudanca_situacao", situacaoNova: "resolvido", texto, evidencia, criadoEm: "2026-10-27T12:00:00Z" }] }));
    expect(html).toContain("Resolução sem documentação");
    expect(html).not.toContain("Situação: Resolvido");
  });
  it("afirma resolução quando justificativa e evidência estão presentes", () => {
    const html = render(createElement(LinhaDoTempo, { itens: [{ id: 1, tipo: "mudanca_situacao", situacaoNova: "resolvido", texto: "Reparo concluído", evidencia: "Relatório de vistoria publicado", criadoEm: "2026-10-27T12:00:00Z" }] }));
    expect(html).toContain("Situação: Resolvido");
    expect(html).not.toContain("Resolução sem documentação");
    expect(html).toContain("Reparo concluído");
    expect(html).toContain("Relatório de vistoria publicado");
  });
});
