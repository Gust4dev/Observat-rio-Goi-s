import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AvisoMetodologico } from '@/components/AvisoMetodologico';
import { SeloDemonstracao } from '@/components/SeloDemonstracao';
import { PainelDados } from '@/components/TabelaDados';
import { obterDadosPainel,listarCategorias,listarMunicipios } from '@/lib/dados/consultas';
import { lerFiltros,type SearchParamsBrutos } from '@/lib/dados/params';
export const metadata:Metadata={title:'Dados',description:'Contagens dos relatos publicados e metodologia do Observatório Goiás.'};
async function Conteudo({searchParams}:{searchParams:Promise<SearchParamsBrutos>}){
 const filtros=lerFiltros(await searchParams);
 const [linhas,categorias,municipios]=await Promise.all([obterDadosPainel(filtros),listarCategorias(),listarMunicipios()]);
 return <><form action="/dados" method="get" className="flex flex-wrap items-end gap-4"><label>Município<select name="municipio" defaultValue={filtros.municipio??''} className="block max-w-full"><option value="">Todos os municípios</option>{municipios.map(m=><option key={m.slug} value={m.slug}>{m.nome}</option>)}</select></label><label>Categoria<select name="categoria" defaultValue={filtros.categoria??''} className="block max-w-full"><option value="">Todas as categorias</option>{categorias.map(c=><option key={c.slug} value={c.slug}>{c.nome}</option>)}</select></label><button type="submit" className="rounded-xl bg-acao px-4 py-2 text-sobre-acao">Aplicar filtros</button><a href="/dados">Limpar filtros</a><label>Período — Fase 2 — ainda sem backend<select disabled aria-describedby="periodo-nota"><option>Todo o período publicado</option></select></label><p id="periodo-nota" className="w-full text-sm">O filtro de período está inativo. Município e categoria filtram todos os indicadores e tabelas.</p></form><PainelDados linhas={linhas}/></>;
}
export default function PaginaDados({searchParams}:{searchParams:Promise<SearchParamsBrutos>}){
 return <div className="space-y-6"><h1>Dados dos relatos</h1><AvisoMetodologico/><p>Fonte: relatos voluntários publicados no Observatório Goiás. As contagens não representam a população, a gravidade dos problemas nem o desempenho dos órgãos. Dados de moderação e atualizações privadas ficam fora das contagens. Atualização em cache: alguns minutos.</p>{process.env.DADOS_DEMONSTRACAO==='true'&&<SeloDemonstracao/>}<Suspense fallback={<p role="status">Carregando dados publicados…</p>}><Conteudo searchParams={searchParams}/></Suspense><section><h2>Indicadores oficiais — em preparação</h2><p>Não há conexão ativa com IBGE, INEP ou DataSUS nesta página.</p></section></div>;
}
