import { afterEach, expect, it, vi } from "vitest";
import { limparImagens } from "./limpeza-imagens.mjs";
import { GET } from "../../app/api/cron/limpar-quarentena/route";
import { proxy } from "../../proxy";
import { NextRequest } from "next/server";
const old = "2026-10-01T00:00:00Z";
const id = "11111111-1111-4111-8111-111111111111";
const path = `${"a".repeat(64)}/1/${"b".repeat(64)}.jpg`;
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
function storage(referenced=false,failRead=false,lease=false){
 const deletes:string[]=[];
 const transport=async(input: RequestInfo|URL,init?:RequestInit)=>{
  const url=new URL(String(input));
  if(init?.method==="DELETE"){deletes.push(url.pathname+":"+String(init.body));return Response.json([]);}
  if(url.pathname.includes("/object/list/")){
   const prefix=JSON.parse(String(init?.body)).prefix;
   const name=url.pathname.endsWith("imagens-publicas")?`${id}.jpg`:prefix===""?"a".repeat(64):prefix==="a".repeat(64)?"1":`${"b".repeat(64)}.jpg`;
   return Response.json([{name,id:name.includes(".jpg")?id:null,created_at:old}]);
  }
  if(failRead)return new Response(null,{status:503});
  return Response.json(referenced?[{id,moderacao:"publicado",operacao_admin_ate:null}]:lease?[{id,moderacao:"pendente",operacao_admin_ate:"2026-10-29T00:00:00Z"}]:[]);
 };
 return {transport,deletes};
}
it("preserva referenciados e simula órfãos sem apagar",async()=>{
 for(const referenced of [true,false]){
  const {transport,deletes}=storage(referenced);
  const result=await limparImagens({base:"https://teste.supabase.co",key:"secret",fetch:transport,now:Date.parse("2026-10-28T00:00:00Z")});
  expect(result.candidates).toBe(referenced?0:2);expect(deletes).toEqual([]);
 }
});
it("apaga órfãos antigos nos dois buckets com os caminhos exatos",async()=>{
 const {transport,deletes}=storage();
 const result=await limparImagens({base:"https://teste.supabase.co",key:"secret",fetch:transport,apply:true,now:Date.parse("2026-10-28T00:00:00Z")});
 expect(result.removed).toBe(2);expect(deletes).toEqual([
  `/storage/v1/object/imagens-quarentena:${JSON.stringify({prefixes:[path]})}`,
  `/storage/v1/object/imagens-publicas:${JSON.stringify({prefixes:[`${id}.jpg`]})}`,
 ]);
});
it("aborta sem apagar quando a referência não pode ser lida",async()=>{
 const {transport,deletes}=storage(false,true);
 await expect(limparImagens({base:"https://teste.supabase.co",key:"secret",fetch:transport,apply:true})).rejects.toThrow();expect(deletes).toEqual([]);
});
it("conserva a cópia pública enquanto uma operação administrativa detém o lease",async()=>{
 const {transport,deletes}=storage(false,false,true);
 const result=await limparImagens({base:"https://teste.supabase.co",key:"secret",fetch:transport,apply:true,now:Date.parse("2026-10-28T00:00:00Z")});
 expect(result.removed).toBe(0);expect(deletes).toEqual([]);
});
it("reconfere referências criadas após a descoberta antes de apagar",async()=>{
 const {transport,deletes}=storage();let leituras=0;
 const corrida=async(input:RequestInfo|URL,init?:RequestInit)=>{
  if(new URL(String(input)).pathname==="/rest/v1/imagens" && ++leituras>2)return Response.json([{id,moderacao:"publicado",operacao_admin_ate:null}]);
  return transport(input,init);
 };
 const result=await limparImagens({base:"https://teste.supabase.co",key:"secret",fetch:corrida,apply:true});
 expect(result.candidates).toBe(2);expect(result.removed).toBe(0);expect(deletes).toEqual([]);
});
it("não considera objetos recentes nem caminhos alheios ao formato M4",async()=>{
 const {transport,deletes}=storage();
 const recente=async(input:RequestInfo|URL,init?:RequestInit)=>{
  const resposta=await transport(input,init);
  if(new URL(String(input)).pathname.includes('/object/list/')){
   const rows=await resposta.json();return Response.json(rows.map((row:object)=>({...row,created_at:"2026-10-28T00:00:00Z"})));
  }
  return resposta;
 };
 const result=await limparImagens({base:"https://teste.supabase.co",key:"secret",fetch:recente,apply:true,now:Date.parse("2026-10-28T01:00:00Z")});
 expect(result.candidates).toBe(0);expect(deletes).toEqual([]);
});
it("cron falha fechado sem segredo ou com segredo errado e não chama Storage",async()=>{
 vi.stubEnv("CRON_SECRET","");const fetch=vi.fn();vi.stubGlobal("fetch",fetch);
 expect((await GET(new Request("https://teste/api/cron/limpar-quarentena"))).status).toBe(503);
 vi.stubEnv("CRON_SECRET","segredo-longo");
 const resposta=await GET(new Request("https://teste/api/cron/limpar-quarentena",{headers:{authorization:"Bearer errado"}}));
 expect(resposta.status).toBe(401);expect(resposta.headers.get("cache-control")).toContain("no-store");expect(fetch).not.toHaveBeenCalled();
});
it("cron autorizado aplica a mesma limpeza e passa pelo proxy sem Basic",async()=>{
 vi.stubEnv("CRON_SECRET","segredo-longo");vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL","https://teste.supabase.co");vi.stubEnv("SUPABASE_SECRET_KEY","sb_secret_test");
 const {transport,deletes}=storage();vi.stubGlobal("fetch",transport);
 const request=new Request("https://teste/api/cron/limpar-quarentena",{headers:{authorization:"Bearer segredo-longo"}});
 expect((await GET(request)).status).toBe(200);expect(deletes).toHaveLength(2);
 vi.stubEnv("ACESSO_STAGING_USUARIO","u");vi.stubEnv("ACESSO_STAGING_SENHA","s");
 expect(proxy(new NextRequest(request)).headers.get("x-middleware-next")).toBe("1");
 expect(proxy(new NextRequest("https://teste/api/cron/outra")).status).toBe(401);
});
