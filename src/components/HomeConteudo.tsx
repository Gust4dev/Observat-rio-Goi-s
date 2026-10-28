import Link from "next/link";
import { AvisoMetodologico } from "./AvisoMetodologico";
import { CartaoProblema } from "./CartaoProblema";
import { EstadoVazio } from "./EstadoVazio";
import { SeloDemonstracao } from "./SeloDemonstracao";
import { indicadoresGerais, listarMunicipios, selecionarMunicipios, ultimosProblemas } from "@/lib/dados/consultas";
import { lerBuscaMunicipio, lerFiltros, type SearchParamsBrutos } from "@/lib/dados/params";

/** Conteúdo dependente da URL: renderizar sob Suspense com Cache Components. */
export async function HomeConteudo({ searchParams }: { searchParams: Promise<SearchParamsBrutos> }) {
  const [sp, municipios, indicadores, recentes] = await Promise.all([searchParams, listarMunicipios(), indicadoresGerais(), ultimosProblemas(5)]);
  const busca = lerBuscaMunicipio(sp.nome_municipio);
  const selecionado = municipios.find(m => m.slug === lerFiltros(sp).municipio);
  const resultados = selecionarMunicipios(municipios, busca);
  // A seleção atual ocupa uma das 12 opções, mesmo ao refinar a busca.
  const opcoes = selecionado && !resultados.some(m => m.slug === selecionado.slug)
    ? [selecionado, ...resultados].slice(0, 12) : resultados;
  const numeros = indicadores ? [
    {valor: indicadores.total_ocorrencias, texto: "relatos publicados"},
    {valor: indicadores.municipios_com_registros, texto: "municípios com registros"},
    {valor: indicadores.com_resposta_oficial, texto: "relatos com resposta oficial"},
    {valor: indicadores.resolvidas_documentadas, texto: "resolvidos com documentação"},
  ] : [];
  return <div className="flex min-w-0 flex-col gap-8">
    <section aria-labelledby="titulo-inicio" className="border-l-2 border-acao pl-4 sm:pl-6">
      <p className="text-sm font-semibold uppercase tracking-wide text-texto-suave">Relatos públicos em Goiás</p>
      <h1 id="titulo-inicio" className="mt-2 max-w-xl">Veja o que precisa melhorar na sua cidade.</h1>
      <p className="mt-2 max-w-xl">Registre um problema e acompanhe as atualizações com um protocolo.</p>
      <form action="/" method="get" className="mt-4 flex flex-wrap items-end gap-2">
        {selecionado && <input type="hidden" name="municipio" value={selecionado.slug} />}
        <div className="min-w-0 flex-1"><label htmlFor="busca-home" className="block font-semibold">Qual é o seu município?</label><input id="busca-home" name="nome_municipio" type="search" maxLength={80} defaultValue={busca} placeholder="Digite o nome" aria-describedby="ajuda-home" className="min-h-12 w-full rounded-lg border border-borda bg-superficie px-3" /></div>
        <button className="min-h-12 rounded-lg border border-borda px-3" type="submit">Buscar</button>
      </form>
      <p id="ajuda-home" className="mt-1 text-sm text-texto-suave">Até 12 opções por busca. Refine o nome para encontrar seu município.</p>
      {busca && !resultados.length && <p role="status" className="mt-2">Nenhum município encontrado. Tente outro nome.</p>}
      <form action="/registrar" method="get" className="mt-3 flex max-w-xl flex-col gap-2">
        {opcoes.length > 0 && <><label htmlFor="municipio-home">Escolha o município</label><select id="municipio-home" name="municipio" defaultValue={selecionado?.slug ?? ""} required className="min-h-12 w-full rounded-lg border border-borda bg-superficie px-3"><option value="" disabled>Selecione um município</option>{opcoes.map(m => <option key={m.slug} value={m.slug}>{m.nome}</option>)}</select></>}
        <button type="submit" className="min-h-12 rounded-lg bg-acao px-4 font-semibold text-sobre-acao">Registrar um problema</button>
        {opcoes.length ? <button type="submit" formAction="/problemas" className="min-h-12 text-left font-semibold underline underline-offset-4">Ver relatos deste município</button> : <Link prefetch={false} href="/municipios" className="inline-flex min-h-12 items-center">Ver relatos por município</Link>}
      </form>
      <p className="mt-2 text-sm text-texto-suave">Não é canal oficial de atendimento.</p>
    </section>
    <section aria-labelledby="titulo-numeros"><h2 id="titulo-numeros">Números da plataforma</h2><div className="my-3"><AvisoMetodologico /></div>
      {numeros.length ? <><SeloDemonstracao /><dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-5">{numeros.map(n => <div key={n.texto}><dt className="text-sm text-texto-suave">{n.texto}</dt><dd className="text-2xl font-bold tabular-nums">{n.valor.toLocaleString("pt-BR")}</dd></div>)}</dl></> : <EstadoVazio titulo="Ainda não há indicadores disponíveis" texto="Os números aparecerão quando houver dados agregados disponíveis." />}
    </section>
    <section aria-labelledby="titulo-recentes"><h2 id="titulo-recentes">Relatos recentes</h2>{recentes.length ? <><ul>{recentes.map(p => <li key={p.id}><CartaoProblema id={p.id} titulo={p.titulo} municipioNome={p.municipio_nome} categoriaNome={p.categoria_nome} situacao={p.situacao} publicadoEm={p.publicado_em} temRespostaOficial={p.tem_resposta_oficial} variante="lista" demonstracao /></li>)}</ul><Link prefetch={false} href="/problemas" className="inline-flex min-h-12 items-center font-semibold">Ver todos os relatos</Link></> : <EstadoVazio titulo="Ainda não há relatos publicados" texto="Quando houver relatos publicados, os mais recentes aparecem aqui." />}</section>
    <section aria-labelledby="titulo-como"><h2 id="titulo-como">Como funciona</h2><ol className="mt-3 list-decimal space-y-3 pl-6"><li><strong>Registre.</strong> Escolha o município e descreva o problema.</li><li><strong>Guarde o protocolo.</strong> Use o acesso privado para acompanhar seu envio.</li><li><strong>Acompanhe.</strong> Consulte a situação e as atualizações disponíveis.</li></ol></section>
  </div>;
}
