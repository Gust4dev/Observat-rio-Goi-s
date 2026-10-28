"use client";
import Image from 'next/image';
import { useEffect, useId, useRef, useState } from 'react';
import catalogo from '@/lib/mapa/municipios.json';
import { destinoMunicipio, lerGeometria, pontoInterior, textoPainel, type PainelMunicipio } from '@/lib/mapa/geometria';
export type MapaGoiasProps = {
 municipios: readonly {slug:string;nome:string}[];
 municipioSelecionado?:string;
 painel?:PainelMunicipio;
 formAction?:string;
 demonstracao?:boolean;
 parametros?:Record<string,string>;
};
type Feature={id:string;d:string;slug:string;nome:string};
type FeatureAtiva=Feature & {polo:ReturnType<typeof pontoInterior>};
const asset='/mapas/goias-municipios.svg';
const controle='min-h-12 min-w-12 rounded-lg border border-borda bg-superficie px-3 font-semibold';
export function MapaGoias({municipios,municipioSelecionado,painel={estado:'indisponivel'},formAction='/',demonstracao=false,parametros={}}:MapaGoiasProps){
 const id=useId(),form=useRef<HTMLFormElement>(null),container=useRef<HTMLDivElement>(null);
 const [features,setFeatures]=useState<Feature[]>([]),[width,setWidth]=useState(300),[view,setView]=useState({x:0,y:0,w:1000,h:968}),[ativo,setAtivo]=useState<FeatureAtiva>(),[falha,setFalha]=useState(false);
 const escolhido=municipios.find(m=>m.slug===municipioSelecionado);
 useEffect(()=>{const controller=new AbortController();fetch(asset,{signal:controller.signal}).then(r=>{if(!r.ok)throw Error();return r.text();}).then(xml=>{
  const document=new DOMParser().parseFromString(xml,'image/svg+xml');const paths=[...document.querySelectorAll('path')];
  if(paths.length!==246)throw Error();
  const parsed=paths.map(path=>{const m=catalogo.find(m=>m.id===path.id);const d=path.getAttribute('d');if(!m||!d)throw Error();return {...m,d};});setFeatures(parsed);
 }).catch(e=>{if(e.name!=='AbortError')setFalha(true);});return()=>controller.abort();},[]);
 useEffect(()=>{if(!container.current)return;const observer=new ResizeObserver(entries=>setWidth(entries[0].contentRect.width));observer.observe(container.current);return()=>observer.disconnect();},[]);
 function ampliar(feature:Feature){const polo=pontoInterior(lerGeometria(feature.d));const selecionavel={...feature,polo};setAtivo(selecionavel);const w=polo.raio*width/36;setView({x:polo.x-w/2,y:polo.y-w/2,w,h:w});}
 function escolher(slug:string){const campo=form.current?.elements.namedItem('municipio') as HTMLSelectElement|null;if(campo){campo.value=slug;form.current?.requestSubmit();}}
 const featureAtiva=ativo;
 return <section id="territorio" aria-label="Explore os municípios de Goiás" className="min-w-0 scroll-mb-32 space-y-4">
  <form ref={form} method="get" action={`${formAction}#territorio`} className="flex flex-wrap items-end gap-3">
   {Object.entries(parametros).filter(([key])=>key!=='municipio').map(([key,value])=><input key={key} type="hidden" name={key} value={value}/>)}
   <div className="min-w-0 flex-1"><label htmlFor={`${id}-municipio`} className="block font-semibold">Selecione um município</label><select id={`${id}-municipio`} name="municipio" defaultValue={escolhido?.slug??''} className={`${controle} w-full`}><option value="">Escolha seu município</option>{municipios.map(m=><option value={m.slug} key={m.slug}>{m.nome}</option>)}</select></div>
   <button type="submit" className={controle}>Ver município</button>
  </form>
  <div role="status" aria-live="polite" aria-atomic="true" className="scroll-mb-32 border-l-4 border-acao pl-4">
   {escolhido?<><h3 className="font-semibold">{escolhido.nome}</h3><p>{textoPainel(painel)}</p></>:<p>Escolha um município para consultar os relatos publicados.</p>}
  </div>
  {escolhido?<a className="inline-flex min-h-12 items-center font-semibold underline" href={`/municipios/${escolhido.slug}`}>Ver relatos de {escolhido.nome}</a>:null}
  {demonstracao?<p className="text-sm font-semibold">Dados de demonstração</p>:null}
  <p className="text-sm text-texto-suave">Os relatos são publicações voluntárias na plataforma; não medem a situação de todo o município. A seleção não indica endereço nem gravidade.</p>
  <div ref={container} className="min-w-0">
   {!features.length?<Image src={asset} alt="Divisão municipal de Goiás; utilize o seletor para escolher o município" width={1000} height={968} loading="eager" unoptimized className="h-auto w-full"/>:
   <svg viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} role="group" aria-label="Mapa municipal de Goiás. Ative uma região para ampliar e use o alvo circular para selecionar. No teclado, use setas, Enter e Esc; o seletor acima oferece todos os municípios." aria-describedby={`${id}-ajuda`} tabIndex={0} className="aspect-[1000/968] w-full rounded-lg border border-borda bg-fundo focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foco"
    onKeyDown={event=>{if(event.key==='Enter'&&featureAtiva){event.preventDefault();escolher(featureAtiva.slug);}else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();const index=features.findIndex(f=>f.id===ativo?.id),delta=['ArrowLeft','ArrowUp'].includes(event.key)?-1:1;ampliar(features[(index+delta+features.length)%features.length]);}else if(event.key==='Escape'){setView({x:0,y:0,w:1000,h:968});setAtivo(undefined);}}}>
    {features.map(f=><path key={f.id} data-ibge={f.id} d={f.d} fillRule="evenodd" fill={f.slug===escolhido?.slug?'var(--color-superficie)':'var(--color-fundo)'} stroke={f.slug===escolhido?.slug?'var(--color-acao)':'var(--color-texto-suave)'} strokeWidth={f.slug===escolhido?.slug?3:1} vectorEffect="non-scaling-stroke" onClick={()=>ampliar(f)} aria-hidden="true"/>)}
    {featureAtiva&&featureAtiva.polo.raio*width/view.w>=34?<a tabIndex={-1} aria-hidden="true" href={destinoMunicipio(formAction,featureAtiva.slug,new URLSearchParams(parametros).toString())??undefined}><circle cx={featureAtiva.polo.x} cy={featureAtiva.polo.y} r={26*view.w/width} fill="var(--color-acao)"/><text x={featureAtiva.polo.x} y={featureAtiva.polo.y} textAnchor="middle" dominantBaseline="central" fill="var(--color-sobre-acao)" fontSize={18*view.w/width} aria-hidden="true">✓</text></a>:null}
   </svg>}
  </div>
  <p id={`${id}-ajuda`} role="status" aria-live="polite" aria-atomic="true" className="text-sm">{featureAtiva?`${featureAtiva.nome}: a região está ampliada. Toque no alvo circular para selecionar. `:''}Toque em uma região para ampliar até o alvo de seleção ter 48 px. Setas percorrem municípios; Enter seleciona; Esc restaura o mapa. O seletor funciona sem JavaScript.</p>
  {features.length?<button type="button" onClick={()=>{setView({x:0,y:0,w:1000,h:968});setAtivo(undefined);}} className={controle}>Ver todo o estado</button>:null}
  {falha?<p>Não foi possível ativar o mapa. Use o seletor de município acima.</p>:null}
  <p className="text-xs text-texto-suave">Fonte: <a href="https://servicodados.ibge.gov.br/api/v3/malhas/estados/52?intrarregiao=municipio&amp;formato=image%2Fsvg%2Bxml&amp;qualidade=minima" className="underline">IBGE, malha municipal de Goiás</a>, captura em 28/10/2026. Geometria simplificada pelo Observatório Goiás, com alterações das características originais; licença <a href="https://creativecommons.org/licenses/by/4.0/" className="underline">CC BY 4.0</a>. Referência territorial, sem valor de demarcação legal.</p>
 </section>;
}
