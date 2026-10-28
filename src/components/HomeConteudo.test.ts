import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
const dados = vi.hoisted(() => ({ indicadores: vi.fn(), recentes: vi.fn(), municipio: vi.fn() }));
beforeEach(() => { dados.indicadores.mockResolvedValue(null); dados.recentes.mockResolvedValue([]); dados.municipio.mockReset(); dados.municipio.mockResolvedValue({slug:"goiania",nome:"Goiânia",total:3,ativo_acompanhamento:true}); });
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }) }));
vi.mock("@/lib/dados/consultas", async (original) => ({ ...await original<typeof import("@/lib/dados/consultas")>(), listarMunicipios: async () => (await import("@/lib/mapa/municipios.json")).default, obterMunicipio: dados.municipio, indicadoresGerais: dados.indicadores, ultimosProblemas: dados.recentes }));
import { HomeConteudo } from "./HomeConteudo";
describe("home sem JavaScript", () => {
 it("oferece os 246 municípios em um só seletor GET e mantém município nos dois destinos", async () => {
  const html = renderToStaticMarkup(await HomeConteudo({searchParams:Promise.resolve({municipio:"goiania"})}));
  expect(html.match(/<select /g)).toHaveLength(1);
  expect(html.match(/<option /g)).toHaveLength(247);
  expect(html).toContain('href="/registrar?municipio=goiania"');
  expect(html).toContain('href="/problemas?municipio=goiania"');
  expect(html).toContain('value="goiania" selected=""');
  expect(html).toContain('method="get"');
  expect(html).toContain("3 relatos publicados na plataforma");
  expect(html.indexOf("Registrar um problema")).toBeLessThan(html.indexOf('<select '));
  expect(html.indexOf("Registrar um problema")).toBeLessThan(html.indexOf('<img '));
 });
 it("ignora seleção desconhecida e mantém ações sem dados", async () => {
  const html = renderToStaticMarkup(await HomeConteudo({searchParams:Promise.resolve({municipio:"inexistente"})}));
  expect(dados.municipio).not.toHaveBeenCalled();
  expect(html).not.toContain('value="inexistente"');
  expect(html).toContain('href="/registrar"');
  expect(html).toContain('href="/problemas"');
  expect(html).toContain("Ainda não há indicadores disponíveis");
  expect(html).toContain("Ainda não há relatos publicados");
 });
 it("preserva ações quando o agregado municipal está indisponível", async () => {
  dados.municipio.mockRejectedValueOnce(new Error("rede indisponível"));
  const html = renderToStaticMarkup(await HomeConteudo({searchParams:Promise.resolve({municipio:"goiania"})}));
  expect(html).toContain("Dados indisponíveis");
  expect(html).not.toContain("0 relatos publicados");
  expect(html).toContain('href="/registrar?municipio=goiania"');
 });
});


it("rotula métricas e relatos fictícios e apresenta método antes das contagens", async () => {
 dados.indicadores.mockResolvedValue({total_ocorrencias:7,municipios_com_registros:2,com_resposta_oficial:1,resolvidas_documentadas:0});
 dados.recentes.mockResolvedValue([{id:"00000000-0000-4000-8000-000000000001",titulo:"Relato de teste",municipio_slug:"cidade-2",municipio_nome:"Cidade 2",categoria_slug:"outros",categoria_nome:"Outros",situacao:"recebido",publicado_em:"2026-10-20T12:00:00Z",tem_resposta_oficial:false}]);
 const html = renderToStaticMarkup(await HomeConteudo({searchParams:Promise.resolve({})}));
 expect(html.match(/Dados de demonstração/g)).toHaveLength(3);
 expect(html.indexOf("Como ler")).toBeLessThan(html.indexOf("<dd"));
 expect(html).toContain("Relato de teste");
 expect(html.indexOf("Relato de teste")).toBeLessThan(html.indexOf("Como funciona"));
});

it("mostra cinco relatos recentes com categoria e rótulos demonstrativos, antes de Como funciona", async () => {
 dados.indicadores.mockResolvedValue({total_ocorrencias:7,municipios_com_registros:2,com_resposta_oficial:1,resolvidas_documentadas:0});
 dados.recentes.mockResolvedValue([1,2,3,4,5].map(n => ({id:`00000000-0000-4000-8000-00000000000${n}`,titulo:`Relato ${n}`,municipio_slug:"goiania",municipio_nome:"Goiânia",categoria_slug:"saude",categoria_nome:"Saúde",situacao:"recebido",publicado_em:"2026-10-20T12:00:00Z",tem_resposta_oficial:false})));
 const html = renderToStaticMarkup(await HomeConteudo({searchParams:Promise.resolve({})}));
 expect(html.match(/<article /g)).toHaveLength(5);
 expect(html).toContain("Saúde");
 expect(html.match(/Dados de demonstração/g)!.length).toBeGreaterThanOrEqual(6);
 expect(html).toContain("Ver todos os relatos");
 expect(html).not.toContain("list-decimal");
 expect(html.indexOf("Relatos recentes")).toBeLessThan(html.indexOf("Como funciona"));
 expect(html.indexOf("Registrar um problema")).toBeLessThan(html.indexOf("Explore seu município"));
 expect(html.indexOf("Explore seu município")).toBeLessThan(html.indexOf("Números da plataforma"));
});
