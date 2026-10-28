import { afterEach, expect, it, vi } from "vitest";
import { enviarFotosEmSequencia, protegerFotosNaoEnviadas } from "./envio-fotos";

afterEach(()=>vi.unstubAllGlobals());
it("preserva confirmações, segue após timeout e retenta com o mesmo arquivo e slot",async()=>{
 const arquivos=[1,2,3].map(n=>({id:String(n),ordem:n,contexto:"Buraco na calçada",arquivo:new File([String(n)],`${n}.jpg`),estado:"pronta" as const}));
 const corpos:FormData[]=[]; const respostas=[201,0,201,201]; let simultaneas=0; let max=0;
 class Transporte {
  status=0; timeout=0; upload={onprogress:null as null|((e:{lengthComputable:boolean;loaded:number;total:number})=>void)};
  onload: null|(()=>void)=null; onerror:null|(()=>void)=null; ontimeout:null|(()=>void)=null;
  open(){} send(corpo:FormData){corpos.push(corpo); simultaneas++;max=Math.max(max,simultaneas); const status=respostas.shift()!; queueMicrotask(()=>{this.upload.onprogress?.({lengthComputable:true,loaded:1,total:1});this.status=status;simultaneas--;if(status)this.onload?.();else this.ontimeout?.();});}
 }
 vi.stubGlobal("XMLHttpRequest",Transporte);
 const estados=new Map<string,string>(); const progresso:number[]=[];
 await enviarFotosEmSequencia(arquivos,"token",(id,estado,valor)=>{estados.set(id,estado);if(estado==="enviando")progresso.push(valor);});
 expect([...estados.values()]).toEqual(["enviada","incerta","enviada"]);
 expect(max).toBe(1);expect(Math.max(...progresso)).toBe(99);
 await enviarFotosEmSequencia(arquivos.map(f=>({...f,estado:estados.get(f.id) as "enviada"|"incerta"})),"token",(id,estado)=>estados.set(id,estado));
 expect([...estados.values()]).toEqual(["enviada","enviada","enviada"]);
 expect(corpos).toHaveLength(4);expect(corpos[3].get("foto")).toBe(arquivos[1].arquivo);expect(corpos[3].get("ordem")).toBe("2");
});
it("avisa saída só enquanto houver fotos pendentes e remove o listener ao sair da etapa",()=>{
 const alvo=new EventTarget(); const desligar=protegerFotosNaoEnviadas(alvo);
 const antes=new Event("beforeunload",{cancelable:true});alvo.dispatchEvent(antes);expect(antes.defaultPrevented).toBe(true);
 desligar();const depois=new Event("beforeunload",{cancelable:true});alvo.dispatchEvent(depois);expect(depois.defaultPrevented).toBe(false);
});
