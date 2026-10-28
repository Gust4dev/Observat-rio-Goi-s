"use client";
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState, useTransition } from 'react';
import type { KeyboardEvent as TecladoEvento, PointerEvent as PonteiroEvento } from 'react';
import catalogo from '@/lib/mapa/municipios.json';
import { destinoMunicipio, textoPainel, type PainelMunicipio } from '@/lib/mapa/geometria';
import { LIMITES_PADRAO, centro, deslocar, enquadrarEstado, zoomar, type LimitesZoom, type ViewBox } from '@/lib/mapa/camera';
export type MapaGoiasProps = {
 municipios: readonly {slug:string;nome:string}[];
 municipioSelecionado?:string;
 painel?:PainelMunicipio;
 formAction?:string;
 demonstracao?:boolean;
 parametros?:Record<string,string>;
};
type Feature={id:string;d:string;slug:string;nome:string};
type Base={view:ViewBox;x:number;y:number;dist:number;foco:{x:number;y:number}};
type Gesto={pontos:Map<number,{x:number;y:number}>;alvo?:string;moveu:boolean;base?:Base};
const asset='/mapas/goias-municipios.svg';
const controle='min-h-12 min-w-12 rounded-lg border border-borda bg-superficie px-3 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco disabled:opacity-50';
const LIMITES:LimitesZoom={minW:30,maxW:LIMITES_PADRAO.maxW};
const LIMIAR_PX=8;
const PASSO=1.5;
const AJUDA='Toque em um município para selecioná-lo. Use + e − para aproximar ou arraste para explorar. O seletor também permite escolher pelo nome.';
export function MapaGoias({municipios,municipioSelecionado,painel={estado:'indisponivel'},formAction='/',demonstracao=false,parametros={}}:MapaGoiasProps){
 const id=useId(),router=useRouter(),[pendente,iniciar]=useTransition();
 const propSlug=municipioSelecionado??'';
 const [selecionado,setSelecionado]=useState(propSlug),[anterior,setAnterior]=useState(propSlug);
 if(anterior!==propSlug){setAnterior(propSlug);if(!pendente)setSelecionado(propSlug);}
 const [features,setFeatures]=useState<Feature[]>([]),[view,setView]=useState<ViewBox>(enquadrarEstado()),[candidato,setCandidato]=useState<string>(),[falha,setFalha]=useState(false);
 const viewRef=useRef(view),svgRef=useRef<SVGSVGElement>(null),gesto=useRef<Gesto>({pontos:new Map(),moveu:false});
 function aplicar(v:ViewBox){viewRef.current=v;setView(v);}
 const escolhido=municipios.find(m=>m.slug===selecionado);
 useEffect(()=>{const controller=new AbortController();fetch(asset,{signal:controller.signal}).then(r=>{if(!r.ok)throw Error();return r.text();}).then(xml=>{
  const document=new DOMParser().parseFromString(xml,'image/svg+xml');const paths=[...document.querySelectorAll('path')];
  if(paths.length!==246)throw Error();
  const parsed=paths.map(path=>{const m=catalogo.find(m=>m.id===path.id);const d=path.getAttribute('d');if(!m||!d)throw Error();return {...m,d};});setFeatures(parsed);
 }).catch(e=>{if(e.name!=='AbortError')setFalha(true);});return()=>controller.abort();},[]);
 // A roda precisa de listener não passivo; o scroll da página só é contido sobre a superfície do SVG.
 useEffect(()=>{const svg=svgRef.current;if(!svg)return;const onWheel=(e:WheelEvent)=>{e.preventDefault();const rect=svg.getBoundingClientRect(),v=viewRef.current;if(!rect.width||!rect.height)return;
  const p={x:v.x+(e.clientX-rect.left)/rect.width*v.w,y:v.y+(e.clientY-rect.top)/rect.height*v.h};aplicar(zoomar(v,Math.exp(-e.deltaY*0.0015),p,LIMITES));};
  svg.addEventListener('wheel',onWheel,{passive:false});return()=>svg.removeEventListener('wheel',onWheel);},[features.length]);
 function selecionarMunicipio(slug:string){
  if(slug&&!municipios.some(m=>m.slug===slug))return;
  setSelecionado(slug);setCandidato(undefined);
  let destino:string|null;
  if(slug)destino=destinoMunicipio(formAction,slug,new URLSearchParams(parametros).toString());
  else{const q=new URLSearchParams(parametros);q.delete('municipio');const s=q.toString();destino=`${formAction}${s?`?${s}`:''}#territorio`;}
  if(!destino)return;
  iniciar(()=>{router.push(destino,{scroll:false});});
 }
 const painelAtual=selecionado===propSlug?painel:null;
 const resumo=!escolhido?'Escolha um município para consultar os relatos publicados.':painelAtual?textoPainel(painelAtual):pendente?`Carregando relatos de ${escolhido.nome}…`:'Dados indisponíveis. Tente novamente mais tarde.';
 function pontoSvg(clientX:number,clientY:number,v:ViewBox){const rect=svgRef.current!.getBoundingClientRect();return {x:v.x+(clientX-rect.left)/rect.width*v.w,y:v.y+(clientY-rect.top)/rect.height*v.h};}
 function rebase(){const g=gesto.current,pts=[...g.pontos.values()],v=viewRef.current;
  if(pts.length===1)g.base={view:v,x:pts[0].x,y:pts[0].y,dist:0,foco:{x:0,y:0}};
  else if(pts.length>=2){const [a,b]=pts,mx=(a.x+b.x)/2,my=(a.y+b.y)/2;g.base={view:v,x:mx,y:my,dist:Math.hypot(a.x-b.x,a.y-b.y),foco:pontoSvg(mx,my,v)};}
  else g.base=undefined;}
 function aoPressionar(e:PonteiroEvento<SVGSVGElement>){
  if(e.pointerType==='mouse'&&e.button!==0)return;
  const g=gesto.current;
  if(!g.pontos.size){g.moveu=false;g.alvo=(e.target as Element).closest?.('path[data-slug]')?.getAttribute('data-slug')??undefined;}
  else{g.moveu=true;g.alvo=undefined;}
  g.pontos.set(e.pointerId,{x:e.clientX,y:e.clientY});
  try{e.currentTarget.setPointerCapture(e.pointerId);}catch{}
  rebase();
 }
 function aoMover(e:PonteiroEvento<SVGSVGElement>){
  const g=gesto.current;if(!g.pontos.has(e.pointerId)||!g.base)return;
  g.pontos.set(e.pointerId,{x:e.clientX,y:e.clientY});
  const rect=e.currentTarget.getBoundingClientRect();if(!rect.width)return;
  const pts=[...g.pontos.values()],b=g.base;
  if(pts.length>=2){
   g.moveu=true;const [p,q]=pts,dist=Math.hypot(p.x-q.x,p.y-q.y),mx=(p.x+q.x)/2,my=(p.y+q.y)/2;
   if(b.dist>0&&dist>0){const z=zoomar(b.view,dist/b.dist,b.foco,LIMITES),esc=z.w/rect.width;aplicar(deslocar(z,-(mx-b.x)*esc,-(my-b.y)*esc));}
  }else{
   const dx=e.clientX-b.x,dy=e.clientY-b.y;
   if(!g.moveu&&Math.hypot(dx,dy)<LIMIAR_PX)return;
   g.moveu=true;
   const esc=b.view.w/rect.width;aplicar(deslocar(b.view,-dx*esc,-dy*esc));
  }
 }
 function aoSoltar(e:PonteiroEvento<SVGSVGElement>,cancelado=false){
  const g=gesto.current;if(!g.pontos.has(e.pointerId))return;
  g.pontos.delete(e.pointerId);try{e.currentTarget.releasePointerCapture(e.pointerId);}catch{}
  if(g.pontos.size){rebase();return;}
  const alvo=g.alvo,moveu=g.moveu;g.alvo=undefined;g.moveu=false;g.base=undefined;
  if(!cancelado&&!moveu&&alvo)selecionarMunicipio(alvo);
 }
 function aoTeclar(event:TecladoEvento<SVGSVGElement>){
  const k=event.key;
  if(k==='Enter'&&candidato){event.preventDefault();selecionarMunicipio(candidato);}
  else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(k)&&features.length){
   event.preventDefault();
   const delta=['ArrowLeft','ArrowUp'].includes(k)?-1:1,atual=features.findIndex(f=>f.slug===(candidato??selecionado)),n=features.length;
   const proximo=atual<0?(delta>0?0:n-1):(atual+delta+n)%n;
   setCandidato(features[proximo].slug);
  }
  else if(k==='Escape'){event.preventDefault();aplicar(enquadrarEstado());setCandidato(undefined);}
  else if(k==='+'||k==='='){event.preventDefault();aplicar(zoomar(viewRef.current,PASSO,centro(viewRef.current),LIMITES));}
  else if(k==='-'||k==='_'){event.preventDefault();aplicar(zoomar(viewRef.current,1/PASSO,centro(viewRef.current),LIMITES));}
 }
 const noLimiteMax=view.w<=LIMITES.minW+1e-6,noLimiteMin=view.w>=LIMITES.maxW-1e-6,semMapa=!features.length;
 const nomeCandidato=features.find(f=>f.slug===candidato)?.nome;
 return <section id="territorio" aria-label="Explore os municípios de Goiás" className="min-w-0 scroll-mb-32 space-y-4">
  <form method="get" action={`${formAction}#territorio`} className="flex flex-wrap items-end gap-3" onSubmit={e=>{const campo=e.currentTarget.elements.namedItem('municipio') as HTMLSelectElement|null;e.preventDefault();selecionarMunicipio(campo?.value??'');}}>
   {Object.entries(parametros).filter(([key])=>key!=='municipio').map(([key,value])=><input key={key} type="hidden" name={key} value={value}/>)}
   <div className="min-w-0 flex-1"><label htmlFor={`${id}-municipio`} className="block font-semibold">Selecione um município</label><select id={`${id}-municipio`} name="municipio" value={selecionado} onChange={e=>selecionarMunicipio(e.target.value)} className={`${controle} w-full`}><option value="">Escolha seu município</option>{municipios.map(m=><option value={m.slug} key={m.slug}>{m.nome}</option>)}</select></div>
   <button type="submit" className={controle}>Ver município</button>
  </form>
  <div role="status" aria-live="polite" aria-atomic="true" className="scroll-mb-32 border-l-4 border-acao pl-4">
   {escolhido?<><h3 className="font-semibold">{escolhido.nome}</h3><p>{resumo}</p></>:<p>{resumo}</p>}
  </div>
  {escolhido?<a className="inline-flex min-h-12 items-center font-semibold underline" href={`/municipios/${escolhido.slug}`}>Ver relatos de {escolhido.nome}</a>:null}
  {demonstracao?<p className="text-sm font-semibold">Dados de demonstração</p>:null}
  <p className="text-sm text-texto-suave">Os relatos são publicações voluntárias na plataforma; não medem a situação de todo o município. A seleção não indica endereço nem gravidade.</p>
  <div className="min-w-0 space-y-2">
   <div role="group" aria-label="Controles do mapa" className="flex flex-wrap gap-2">
    <button type="button" aria-label="Ampliar mapa" disabled={semMapa||noLimiteMax} onClick={()=>aplicar(zoomar(viewRef.current,PASSO,centro(viewRef.current),LIMITES))} className={controle}><span aria-hidden="true">+</span></button>
    <button type="button" aria-label="Reduzir mapa" disabled={semMapa||noLimiteMin} onClick={()=>aplicar(zoomar(viewRef.current,1/PASSO,centro(viewRef.current),LIMITES))} className={controle}><span aria-hidden="true">−</span></button>
    <button type="button" aria-label="Mostrar Goiás inteiro" disabled={semMapa} onClick={()=>aplicar(enquadrarEstado())} className={controle}>Mostrar Goiás inteiro</button>
   </div>
   {semMapa?<Image src={asset} alt="Divisão municipal de Goiás; utilize o seletor para escolher o município" width={1000} height={968} loading="eager" unoptimized className="h-auto w-full"/>:
   <svg ref={svgRef} viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} role="group" aria-label="Mapa municipal de Goiás. Selecione um município." aria-describedby={`${id}-ajuda ${id}-teclado`} tabIndex={0} style={{touchAction:'none'}} className="aspect-[1000/968] w-full select-none rounded-lg border border-borda bg-fundo focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foco"
    onPointerDown={aoPressionar} onPointerMove={aoMover} onPointerUp={e=>aoSoltar(e)} onPointerCancel={e=>aoSoltar(e,true)} onKeyDown={aoTeclar}>
    {features.map(f=>{const sel=f.slug===selecionado,cand=f.slug===candidato;return <path key={f.id} data-ibge={f.id} data-slug={f.slug} d={f.d} fillRule="evenodd" fill={sel?'var(--color-superficie)':'var(--color-fundo)'} stroke={sel?'var(--color-acao)':cand?'var(--color-foco)':'var(--color-texto-suave)'} strokeWidth={sel||cand?3:1} strokeDasharray={cand&&!sel?'4 3':undefined} vectorEffect="non-scaling-stroke" aria-hidden="true"/>;})}
   </svg>}
  </div>
  <p id={`${id}-ajuda`} className="text-sm">{AJUDA}</p>
  <p id={`${id}-teclado`} className="text-sm text-texto-suave">Com o teclado, foque o mapa, use as setas para percorrer municípios, Enter para selecionar e Esc para restaurar o enquadramento.</p>
  <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">{nomeCandidato?`${nomeCandidato}: pressione Enter para selecionar.`:''}</p>
  {falha?<p role="alert">Mapa interativo indisponível. Use o seletor de município acima.</p>:null}
  <p className="text-xs text-texto-suave">Fonte: <a href="https://servicodados.ibge.gov.br/api/v3/malhas/estados/52?intrarregiao=municipio&amp;formato=image%2Fsvg%2Bxml&amp;qualidade=minima" className="underline">IBGE, malha municipal de Goiás</a>, captura em 28/10/2026. Geometria simplificada pelo Observatório Goiás, com alterações das características originais; licença <a href="https://creativecommons.org/licenses/by/4.0/" className="underline">CC BY 4.0</a>. Referência territorial, sem valor de demarcação legal.</p>
 </section>;
}
