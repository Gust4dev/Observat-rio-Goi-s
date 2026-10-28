import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
const dados = vi.hoisted(() => ({ indicadores: vi.fn(), recentes: vi.fn() }));
beforeEach(() => { dados.indicadores.mockResolvedValue(null); dados.recentes.mockResolvedValue([]); });
vi.mock("@/lib/dados/consultas", async (original) => ({ ...await original<typeof import("@/lib/dados/consultas")>(), listarMunicipios: async () => Array.from({length: 20}, (_, i) => ({id:i+1,nome:`Cidade ${i}`,slug:`cidade-${i}`})), indicadoresGerais: dados.indicadores, ultimosProblemas: dados.recentes }));
import { HomeConteudo } from "./HomeConteudo";
describe("home sem JavaScript", () => {
 it("limita opções de busca e mantém município nos dois destinos", async () => {
  const html = renderToStaticMarkup(await HomeConteudo({searchParams:Promise.resolve({nome_municipio:"Cidade",municipio:"cidade-2"})}));
  expect((html.match(/<option /g) ?? []).length).toBe(13);
  expect(html).toContain('action="/registrar"');
  expect(html).toContain('name="municipio"');
  expect(html).toContain('value="cidade-2" selected=""');
  expect(html).toContain('formAction="/problemas"');
  expect(html).toContain('method="get"');
 });
 it("não envia catálogo sem busca nem aceita seleção desconhecida", async () => {
  const html = renderToStaticMarkup(await HomeConteudo({searchParams:Promise.resolve({municipio:"inexistente"})}));
  expect(html).not.toContain('value="cidade-');
  expect(html).not.toContain('value="inexistente"');
  expect(html).toContain("Ainda não há indicadores disponíveis");
  expect(html).toContain("Ainda não há relatos publicados");
 });
});


it("rotula métricas e relatos fictícios e apresenta método antes das contagens", async () => {
 dados.indicadores.mockResolvedValue({total_ocorrencias:7,municipios_com_registros:2,com_resposta_oficial:1,resolvidas_documentadas:0});
 dados.recentes.mockResolvedValue([{id:"00000000-0000-4000-8000-000000000001",titulo:"Relato de teste",municipio_slug:"cidade-2",municipio_nome:"Cidade 2",categoria_slug:"outros",categoria_nome:"Outros",situacao:"recebido",publicado_em:"2026-10-20T12:00:00Z",tem_resposta_oficial:false}]);
 const html = renderToStaticMarkup(await HomeConteudo({searchParams:Promise.resolve({})}));
 expect(html.match(/Dados de demonstração/g)).toHaveLength(2);
 expect(html.indexOf("Como ler")).toBeLessThan(html.indexOf("<dd"));
 expect(html).toContain("Relato de teste");
 expect(html.indexOf("Relato de teste")).toBeLessThan(html.indexOf("Como funciona"));
});
