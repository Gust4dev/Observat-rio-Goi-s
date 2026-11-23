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
  const [sp, municipios, indicadores, recentes] = await Promise.all([searchParams, listarMunicipios(), indicadoresGerais().catch(() => undefined), ultimosProblemas(5).catch(() => null)]);
  const demonstracao = process.env.VERCEL_ENV !== "production";
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
  const numeros = indicadores ? [
    {valor: indicadores.total_ocorrencias, texto: "relatos publicados"},
    {valor: indicadores.municipios_com_registros, texto: "municípios com registros"},
    {valor: indicadores.com_resposta_oficial, texto: "relatos com resposta oficial"},
    {valor: indicadores.resolvidas_documentadas, texto: "resolvidos com documentação"},
  ] : [];
  return <div className="flex min-w-0 flex-col gap-12">
    <MapaGoias municipios={municipios} municipioSelecionado={selecionado?.slug} painel={painel} demonstracao={demonstracao && Boolean(indicadores || recentes?.length)} variante="hero" />
    <section aria-labelledby="titulo-numeros" className="border-t border-borda-suave pt-8"><h2 id="titulo-numeros">Números da plataforma</h2><div className="my-4"><AvisoMetodologico /></div>
      {indicadores === undefined ? <p>Indicadores indisponíveis no momento.</p> : numeros.length ? <>{demonstracao && <SeloDemonstracao />}<dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-6 lg:grid-cols-4">{numeros.map(n => <div key={n.texto} className="border-l-2 border-borda-suave pl-4"><dt className="text-sm text-texto-suave">{n.texto}</dt><dd className="mt-1 text-3xl font-bold tracking-tight tabular-nums">{n.valor.toLocaleString("pt-BR")}</dd></div>)}</dl></> : <EstadoVazio titulo="Ainda não há indicadores disponíveis" texto="Os números aparecerão quando houver dados agregados disponíveis." />}
    </section>
    <section aria-labelledby="titulo-recentes"><h2 id="titulo-recentes">Relatos recentes</h2>{recentes === null ? <p>Relatos recentes indisponíveis no momento.</p> : recentes.length ? <><ul className="mt-4 grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{recentes.map(p => <li key={p.id} className="min-w-0"><CartaoProblema id={p.id} titulo={p.titulo} municipioNome={p.municipio_nome} categoriaNome={p.categoria_nome} categoriaSlug={p.categoria_slug} situacao={p.situacao} publicadoEm={p.publicado_em} temRespostaOficial={p.tem_resposta_oficial} variante="home" demonstracao={demonstracao} /></li>)}</ul><Link prefetch={false} href="/problemas" className="mt-4 inline-flex min-h-12 items-center font-semibold">Ver todos os relatos</Link></> : <EstadoVazio titulo="Ainda não há relatos publicados" texto="Quando houver relatos publicados, os mais recentes aparecem aqui." />}</section>
    <section aria-labelledby="titulo-como" className="border-t border-borda-suave pt-8"><h2 id="titulo-como">Como funciona</h2><PassosInicio /></section>
  </div>;
}
