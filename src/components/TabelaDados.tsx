import { CartaoIndicador } from './CartaoIndicador';
import type { LinhaDados } from '@/lib/dados/sumarizacao';
import { sumarizarDados } from '@/lib/dados/sumarizacao';
import type { DadoPainel } from '@/lib/dados/schemas';

export function TabelaDados({titulo,linhas,tipo='barras'}:{titulo:string;linhas:LinhaDados[];tipo?:'barras'|'linha'|'tabela'}) {
 const total=linhas.reduce((s,l)=>s+l.total,0);
 const max=Math.max(1,...linhas.map(l=>l.total));
 return <section className="space-y-3"><h2>{titulo}</h2><p>{total} relatos publicados neste recorte. Ordem alfabética; meses em ordem cronológica.</p>
 {!linhas.length ? <p>Nenhum relato publicado neste recorte.</p> : <>
 <div className="overflow-x-auto"><table className="w-full text-left"><caption className="text-left font-semibold">{titulo} — contagem de relatos</caption><thead><tr><th scope="col">{tipo==='linha'?'Mês de publicação (AAAA-MM-DD)':titulo}</th><th scope="col">Relatos</th></tr></thead><tbody>{linhas.map(l=><tr key={l.nome} className="border-b border-borda-suave"><th scope="row" className="py-2 font-normal">{l.nome}</th><td>{l.total}</td></tr>)}</tbody><tfoot><tr><th scope="row">Total</th><td>{total}</td></tr></tfoot></table></div>
 {tipo==='barras'&&<div aria-hidden="true" className="space-y-2">{linhas.map(l=><div key={l.nome}><p className="text-sm">{l.nome}: {l.total}</p><div className="h-2 bg-acao" style={{width:`${100*l.total/max}%`}} /></div>)}</div>}
 {tipo==='linha'&&<><p>Leitura da linha: {linhas[0].nome} começa com {linhas[0].total} relatos; {linhas[linhas.length-1].nome} termina com {linhas[linhas.length-1].total}. Meses ausentes não têm relatos publicados. Eixo horizontal: meses de publicação; eixo vertical: 0 a {max} relatos.</p><svg aria-hidden="true" viewBox="0 0 600 160" className="w-full max-w-2xl"><path d="M20 10V140H580" fill="none" stroke="currentColor"/><polyline points={linhas.map((l,i)=>`${20+(linhas.length===1?0:i*560/(linhas.length-1))},${140-120*l.total/max}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="3"/>{linhas.map((l,i)=><circle key={l.nome} cx={20+(linhas.length===1?0:i*560/(linhas.length-1))} cy={140-120*l.total/max} r="4" fill="currentColor" />)}</svg></>}
 </>}
 </section>;
}
export function PainelDados({linhas}:{linhas:DadoPainel[]}){
 const r=sumarizarDados(linhas);const i=r.indicadores;
 return <div className="space-y-8"><div className="grid gap-4 sm:grid-cols-2">
 <CartaoIndicador nome="Relatos publicados" valor={i.total} nota="Uma contagem por relato publicado, no recorte selecionado."/>
 <CartaoIndicador nome="Municípios com relatos" valor={i.municipios} nota="Municípios distintos com ao menos um relato publicado no recorte."/>
 <CartaoIndicador nome="Com resposta oficial" valor={i.respostas} nota="Relatos com ao menos uma atualização pública do tipo resposta oficial."/>
 <CartaoIndicador nome="Resolvidos com documentação" valor={i.documentadas} nota="Situação atual Resolvido e atualização pública de resolução com justificativa e evidência não vazias."/>
 <CartaoIndicador nome="Em acompanhamento" valor={i.acompanhamento} nota="Soma de Recebido, Em análise, Encaminhado ao órgão, Aguardando resposta do órgão e Sendo resolvido. Exclui os dois estados de encerramento."/>
 </div><TabelaDados titulo="Categorias" linhas={r.categorias}/><TabelaDados titulo="Municípios" linhas={r.municipios}/><TabelaDados titulo="Publicações por mês" linhas={r.meses} tipo="linha"/><TabelaDados titulo="Situações" linhas={r.situacoes} tipo="tabela"/></div>;
}
