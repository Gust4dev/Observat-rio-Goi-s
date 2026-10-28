import type { DadoPainel } from './schemas';
import { rotuloSituacao } from '@/lib/situacao';
export type LinhaDados = {nome:string;total:number};
const ATIVAS = new Set(['registrado','em_analise','encaminhado','aguardando_resposta','em_atendimento']);
export function sumarizarDados(linhas: DadoPainel[]) {
 const agrupar=(chave:(l:DadoPainel)=>string):LinhaDados[]=>{
  const grupos=new Map<string,number>();
  for(const l of linhas){const k=chave(l);grupos.set(k,(grupos.get(k)??0)+l.total)}
  return [...grupos].map(([nome,total])=>({nome,total})).sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
 };
 const meses=agrupar(l=>l.mes);
 if(meses.length>1){
  const inicio=new Date(meses[0].nome+'T00:00:00Z');
  const fim=meses[meses.length-1].nome;
  const contagens=new Map(meses.map(l=>[l.nome,l.total]));
  meses.length=0;
  for(let data=inicio;data.toISOString().slice(0,10)<=fim;data.setUTCMonth(data.getUTCMonth()+1)){
   const nome=data.toISOString().slice(0,10);meses.push({nome,total:contagens.get(nome)??0});
  }
 }
 return {indicadores:{total:linhas.reduce((s,l)=>s+l.total,0),municipios:new Set(linhas.map(l=>l.municipio_slug)).size,respostas:linhas.reduce((s,l)=>s+l.com_resposta_oficial,0),documentadas:linhas.reduce((s,l)=>s+l.resolvidas_documentadas,0),acompanhamento:linhas.filter(l=>ATIVAS.has(l.situacao)).reduce((s,l)=>s+l.total,0)},categorias:agrupar(l=>l.categoria_nome),municipios:agrupar(l=>l.municipio_nome),meses,situacoes:agrupar(l=>rotuloSituacao(l.situacao))};
}
