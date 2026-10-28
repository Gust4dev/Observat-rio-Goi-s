import catalogo from './municipios.json';
export type PainelMunicipio = { estado: 'disponivel'; total: number; ativoAcompanhamento: boolean } | { estado: 'indisponivel' } | { estado: 'carregando' };
export type Ponto = [number, number];
/** Decode only the local generated SVG's M/l/Z subset; no third-party markup is inserted. */
export function lerGeometria(d: string): Ponto[][] {
 return d.split('Z').filter(Boolean).map(r=>{let x=0,y=0;const points:Ponto[]=[];for(const [,cmd,args] of r.matchAll(/([Ml])([^Ml]*)/g)){const n=args.match(/-?\d+/g)?.map(Number)??[];for(let i=0;i<n.length;i+=2){x=cmd==='M'?n[i]:x+n[i];y=cmd==='M'?n[i+1]:y+n[i+1];points.push([x,y]);}}return points;});
}
function distancia([x,y]:Ponto,rings:Ponto[][]):number {
 let dentro=false,min=Infinity;
 for(const ring of rings)for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const [ax,ay]=ring[j],[bx,by]=ring[i];
  if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)dentro=!dentro;
  const dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy||1)));
  min=Math.min(min,Math.hypot(x-ax-t*dx,y-ay-t*dy));
 }
 return dentro?min:-min;
}
/** Interior pole centers the amplified selection target within the municipality polygon. */
export function pontoInterior(rings:Ponto[][]):{x:number;y:number;raio:number} {
 const pts=rings.flat(),xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);
 let x0=Math.min(...xs),y0=Math.min(...ys),w=Math.max(...xs)-x0,h=Math.max(...ys)-y0;
 let best={x:x0,y:y0,raio:-Infinity};
 for(let pass=0;pass<4;pass++){
  for(let i=0;i<=20;i++)for(let j=0;j<=20;j++){const x=x0+w*i/20,y=y0+h*j/20,raio=distancia([x,y],rings);if(raio>best.raio)best={x,y,raio};}
  w/=5;h/=5;x0=best.x-w/2;y0=best.y-h/2;
 }
 return best;
}
export function destinoMunicipio(action:string,slug:string,query=''):string|null {
 if(!catalogo.some(m=>m.slug===slug))return null;
 const params=new URLSearchParams(query);params.set('municipio',slug);return `${action}?${params}#territorio`;
}
export function textoPainel(painel:PainelMunicipio):string {
 if(painel.estado==='indisponivel')return 'Dados indisponíveis. Tente novamente mais tarde.';
 if(painel.estado==='carregando')return 'Carregando dados do município…';
 const total=Number.isSafeInteger(painel.total)&&painel.total>=0?painel.total:null;
 if(total===null)return 'Dados indisponíveis. Tente novamente mais tarde.';
 if(!painel.ativoAcompanhamento&&total===0)return 'Ainda não acompanhamos este município. Isso não significa que não existam problemas.';
 if(total===0)return 'Ainda não há relatos publicados neste município.';
 return `${!painel.ativoAcompanhamento?'Ainda não acompanhamos este município. ':''}${total} relatos publicados na plataforma.`;
}
