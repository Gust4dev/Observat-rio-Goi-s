import Link from "next/link";
import { AvisoMetodologico } from "./AvisoMetodologico";
import { CartaoProblema } from "./CartaoProblema";
import { EstadoVazio } from "./EstadoVazio";
import { SeloDemonstracao } from "./SeloDemonstracao";
import { MapaGoias } from "./MapaGoias";
import { PassosInicio } from "./PassosInicio";
import { indicadoresGerais, listarMunicipios, obterMunicipio, ultimosProblemas } from "@/lib/dados/consultas";
import { lerFiltros, type SearchParamsBrutos } from "@/lib/dados/params";
import type { PainelMunicipio } from "@/lib/mapa/geometria";

/** Conteúdo dependente da URL: renderizar sob Suspense com Cache Components. */
export async function HomeConteudo({ searchParams }: { searchParams: Promise<SearchParamsBrutos> }) {
  const [sp, municipios, indicadores, recentes] = await Promise.all([searchParams, listarMunicipios(), indicadoresGerais(), ultimosProblemas(5)]);
  const selecionado = municipios.find(m => m.slug === lerFiltros(sp).municipio);
  let painel: PainelMunicipio = { estado: "indisponivel" };
  if (selecionado) {
    try {
      const municipio = await obterMunicipio(selecionado.slug);
      if (municipio) painel = { estado: "disponivel", total: municipio.total, ativoAcompanhamento: municipio.ativo_acompanhamento };
    } catch {
      // O painel territorial pode falhar sem retirar a ação de registro da home.
    }
  }
  const queryMunicipio = selecionado ? `?municipio=${encodeURIComponent(selecionado.slug)}` : "";
  const numeros = indicadores ? [
    {valor: indicadores.total_ocorrencias, texto: "relatos publicados"},
    {valor: indicadores.municipios_com_registros, texto: "municípios com registros"},
    {valor: indicadores.com_resposta_oficial, texto: "relatos com resposta oficial"},
    {valor: indicadores.resolvidas_documentadas, texto: "resolvidos com documentação"},
  ] : [];
  return <div className="flex min-w-0 flex-col gap-12">
    <div className="grid min-w-0 gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-start lg:gap-12">
    <section aria-labelledby="titulo-inicio" className="min-w-0 border-l-2 border-acao pl-4 sm:pl-6 md:py-4">
      <p className="text-sm font-semibold uppercase tracking-wide text-texto-suave">Relatos públicos em Goiás</p>
      <h1 id="titulo-inicio" className="mt-2 max-w-xl tracking-tight">Veja o que precisa melhorar na sua cidade.</h1>
      <p className="mt-4 max-w-xl text-lg">Registre um problema e acompanhe as atualizações com um protocolo. Sem criar conta.</p>
      <div className="mt-6 flex max-w-xl flex-col items-start gap-2">
        <Link prefetch={false} href={`/registrar${queryMunicipio}`} className="inline-flex min-h-12 w-full justify-center rounded-lg bg-acao px-4 py-3 font-semibold text-sobre-acao no-underline hover:bg-acao-pressionada hover:text-sobre-acao">Registrar um problema</Link>
        <Link prefetch={false} href={`/problemas${queryMunicipio}`} className="inline-flex min-h-12 items-center py-2 font-semibold underline underline-offset-4">{selecionado ? "Ver relatos deste município" : "Ver relatos em Goiás"}</Link>
      </div>
      <p className="mt-3 text-sm text-texto-suave">{selecionado ? `Município selecionado: ${selecionado.nome}.` : "Escolha seu município no mapa ou na lista para consultar os relatos da sua cidade."}</p>
      <p className="mt-2 text-sm text-texto-suave">Não é canal oficial de atendimento.</p>
    </section>
    <div className="min-w-0 w-full rounded-2xl border border-borda-suave bg-superficie p-4 sm:p-6 md:max-w-xl md:justify-self-end">
      <h2 className="mb-4">Explore seu município</h2>
      <MapaGoias municipios={municipios} municipioSelecionado={selecionado?.slug} painel={painel} demonstracao={Boolean(indicadores || recentes.length)} />
    </div>
    </div>
    <section aria-labelledby="titulo-numeros" className="border-t border-borda-suave pt-8"><h2 id="titulo-numeros">Números da plataforma</h2><div className="my-4"><AvisoMetodologico /></div>
      {numeros.length ? <><SeloDemonstracao /><dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-6 lg:grid-cols-4">{numeros.map(n => <div key={n.texto} className="border-l-2 border-borda-suave pl-4"><dt className="text-sm text-texto-suave">{n.texto}</dt><dd className="mt-1 text-3xl font-bold tracking-tight tabular-nums">{n.valor.toLocaleString("pt-BR")}</dd></div>)}</dl></> : <EstadoVazio titulo="Ainda não há indicadores disponíveis" texto="Os números aparecerão quando houver dados agregados disponíveis." />}
    </section>
    <section aria-labelledby="titulo-recentes"><h2 id="titulo-recentes">Relatos recentes</h2>{recentes.length ? <><ul className="mt-4 grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{recentes.map(p => <li key={p.id} className="min-w-0"><CartaoProblema id={p.id} titulo={p.titulo} municipioNome={p.municipio_nome} categoriaNome={p.categoria_nome} categoriaSlug={p.categoria_slug} situacao={p.situacao} publicadoEm={p.publicado_em} temRespostaOficial={p.tem_resposta_oficial} variante="home" demonstracao /></li>)}</ul><Link prefetch={false} href="/problemas" className="mt-4 inline-flex min-h-12 items-center font-semibold">Ver todos os relatos</Link></> : <EstadoVazio titulo="Ainda não há relatos publicados" texto="Quando houver relatos publicados, os mais recentes aparecem aqui." />}</section>
    <section aria-labelledby="titulo-como" className="border-t border-borda-suave pt-8"><h2 id="titulo-como">Como funciona</h2><PassosInicio /></section>
  </div>;
}
