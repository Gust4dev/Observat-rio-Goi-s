import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
afterEach(() => vi.unstubAllEnvs());
const dados = vi.hoisted(() => ({ indicadores: vi.fn(), recentes: vi.fn(), semana: vi.fn(), catalogo: vi.fn() }));
beforeEach(() => { dados.indicadores.mockResolvedValue(null); dados.recentes.mockResolvedValue([]); dados.semana.mockReset(); dados.semana.mockResolvedValue({total:0,categoriaLider:null,pontos:[]}); });
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }) }));
beforeEach(() => dados.catalogo.mockImplementation(async () => (await import("@/lib/mapa/municipios.json")).default));
vi.mock("@/lib/dados/consultas", async (original) => ({ ...await original<typeof import("@/lib/dados/consultas")>(), listarMunicipios: dados.catalogo, resumoSemana: dados.semana, indicadoresGerais: dados.indicadores, ultimosProblemas: dados.recentes }));
import { HomeConteudo } from "./HomeConteudo";
describe("home", () => {
 it("renderiza hero com busca, mapa estático e mantém as demais seções", async () => {
  const html = renderToStaticMarkup(await HomeConteudo());
  expect(html).toContain('role="combobox"');
  expect(html).toContain('href="/registrar"');
  expect(html).toContain("Números da plataforma");
  expect(html).toContain("Relatos recentes");
  expect(html).toContain("Como funciona");
  expect(html).not.toContain("<select");
  expect(html).not.toContain("Mapa interativo");
  expect(html).toContain("Ainda não há indicadores disponíveis");
  expect(html).toContain("Ainda não há relatos publicados");
 });
 it("mostra a manchete de 7 dias e a lista de destaques", async () => {
  dados.semana.mockResolvedValue({total:8,categoriaLider:{slug:"saude",nome:"Saúde",total:5},pontos:[{slug:"goiania",nome:"Goiânia",total:4}]});
  const html = renderToStaticMarkup(await HomeConteudo());
  expect(html).toContain("5 relatos sobre Saúde nos últimos 7 dias");
  expect(html).toContain('href="/municipios/goiania"');
 });
 it("não cai quando o resumo semanal falha", async () => {
  dados.semana.mockRejectedValueOnce(new Error("rede indisponível"));
  const html = renderToStaticMarkup(await HomeConteudo());
  expect(html).toContain("Registrar um problema");
  expect(html).not.toContain("últimos 7 dias nos");
  expect(html).toContain("Mapa de Goiás sem destaques nos últimos 7 dias");
 });
 it("a busca do hero usa o catálogo local de 246 municípios, sem depender do banco", async () => {
  dados.catalogo.mockResolvedValue([]); // banco sem municípios (ex.: fixture) não pode esvaziar o autocomplete
  const raiz = await HomeConteudo() as { props: { children: { props: { municipios: unknown[] } }[] } };
  expect(raiz.props.children[0].props.municipios).toHaveLength(246);
  expect(dados.catalogo).not.toHaveBeenCalled();
  expect(renderToStaticMarkup(await HomeConteudo())).toContain('role="combobox"');
 });
 it("distingue falha de leitura de uma lista vazia", async () => {
  dados.recentes.mockRejectedValueOnce(new Error("rede indisponível"));
  const html = renderToStaticMarkup(await HomeConteudo());
  expect(html).toContain("Relatos recentes indisponíveis no momento");
  expect(html).not.toContain("Ainda não há relatos publicados");
 });
 it("mostra relatos da Production sem selo demonstrativo", async () => {
  vi.stubEnv("VERCEL_ENV", "production");
  dados.recentes.mockResolvedValueOnce([{id:"00000000-0000-4000-8000-000000000001",titulo:"Relato público",municipio_slug:"goiania",municipio_nome:"Goiânia",categoria_slug:"outros",categoria_nome:"Outros",situacao:"registrado",publicado_em:"2026-10-20T12:00:00Z",tem_resposta_oficial:false}]);
  const html = renderToStaticMarkup(await HomeConteudo());
  expect(html).toContain("Relato público");
  expect(html).not.toContain("Dados de demonstração");
 });
});


it("rotula métricas e relatos fictícios e apresenta método antes das contagens", async () => {
 dados.indicadores.mockResolvedValue({total_ocorrencias:7,municipios_com_registros:2,com_resposta_oficial:1,resolvidas_documentadas:0});
 dados.recentes.mockResolvedValue([{id:"00000000-0000-4000-8000-000000000001",titulo:"Relato de teste",municipio_slug:"cidade-2",municipio_nome:"Cidade 2",categoria_slug:"outros",categoria_nome:"Outros",situacao:"recebido",publicado_em:"2026-10-20T12:00:00Z",tem_resposta_oficial:false}]);
 const html = renderToStaticMarkup(await HomeConteudo());
 expect(html.match(/Dados de demonstração/g)).toHaveLength(3);
 expect(html.indexOf("Como ler")).toBeLessThan(html.indexOf("<dd"));
 expect(html).toContain("Os totais consideram apenas os grupos que podem ser divulgados.");
 expect(html).toContain("Relato de teste");
 expect(html.indexOf("Relato de teste")).toBeLessThan(html.indexOf("Como funciona"));
});

it("mostra cinco relatos recentes com categoria e rótulos demonstrativos, antes de Como funciona", async () => {
 dados.indicadores.mockResolvedValue({total_ocorrencias:7,municipios_com_registros:2,com_resposta_oficial:1,resolvidas_documentadas:0});
 dados.recentes.mockResolvedValue([1,2,3,4,5].map(n => ({id:`00000000-0000-4000-8000-00000000000${n}`,titulo:`Relato ${n}`,municipio_slug:"goiania",municipio_nome:"Goiânia",categoria_slug:"saude",categoria_nome:"Saúde",situacao:"recebido",publicado_em:"2026-10-20T12:00:00Z",tem_resposta_oficial:false})));
 const html = renderToStaticMarkup(await HomeConteudo());
 expect(html.match(/<article /g)).toHaveLength(5);
 expect(html).toContain("Saúde");
 expect(html.match(/Dados de demonstração/g)!.length).toBeGreaterThanOrEqual(6);
 expect(html).toContain("Ver todos os relatos");
 expect(html).not.toContain("list-decimal");
 expect(html.indexOf("Relatos recentes")).toBeLessThan(html.indexOf("Como funciona"));
 expect(html.indexOf("Explore seu município")).toBeLessThan(html.indexOf("Registrar um problema"));
 expect(html.indexOf("Explore seu município")).toBeLessThan(html.indexOf("Números da plataforma"));
});
