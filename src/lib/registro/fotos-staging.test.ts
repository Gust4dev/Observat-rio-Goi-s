import { expect, it } from "vitest";
import { executarCicloFotos, verificarStagingFotos } from "../../../scripts/lib/fotos-staging.mjs";
const config = { base: "https://hvekgzxuciyewtybwads.supabase.co", anon: "anon", service: "service" };
it("bloqueia alvo diferente sem fazer requisições", async () => {
 let chamadas=0;
 await expect(verificarStagingFotos({...config,base:"https://outro.supabase.co"},async()=>{chamadas++;return Response.json([]);})).rejects.toThrow("staging conhecido");
 expect(chamadas).toBe(0);
});
it("detecta schema antigo mesmo com view vazia e não escreve", async () => {
 const metodos:string[]=[];
 await expect(verificarStagingFotos(config,async(input:RequestInfo|URL,init?:RequestInit)=>{
  metodos.push(init?.method??"GET"); const url=new URL(String(input));
  return url.searchParams.get("select")?.includes("descricao_publica")?Response.json({code:"42703"},{status:400}):Response.json([]);
 })).rejects.toThrow("014/015/016");
 expect(metodos.every(m=>m==="GET")).toBe(true);
});
it("rejeita caminho privado ainda exposto mesmo em view vazia", async () => {
 await expect(verificarStagingFotos(config,async()=>Response.json([]))).rejects.toThrow("caminho_storage");
});
it("limpa objeto criado por upload com resposta de falha e anonimiza a fixture no finally", async () => {
 const user="22222222-2222-4222-8222-222222222222",oc="11111111-1111-4111-8111-111111111111";
 const token=`header.${Buffer.from(JSON.stringify({sub:user,aal:"aal2"})).toString("base64url")}.sig`;
 let apagados=0,anonimizado=false,objeto=true;
 const transportar=async(input:RequestInfo|URL,init?:RequestInit)=>{
  const url=new URL(String(input));
  if(url.searchParams.get("select")==="caminho_storage")return Response.json({code:"42703"},{status:400});
  if(url.pathname==="/auth/v1/user")return Response.json({id:user});
  if(url.pathname.endsWith("/municipios")||url.pathname.endsWith("/categorias"))return Response.json([{id:1}]);
  if(url.pathname.endsWith("/rpc/registrar_ocorrencia"))return Response.json([{out_id:oc}]);
  if(url.pathname.endsWith("/rpc/admin_moderar_ocorrencia"))return Response.json(null);
  if(url.pathname==="/api/imagem")return new Response(null,{status:503});
  if(url.pathname.includes("/object/list/"))return Response.json(objeto?[{id:oc,name:`${"c".repeat(64)}.jpg`}]:[]);
  if(init?.method==="DELETE"){apagados++;objeto=false;return Response.json([]);}
  if(url.pathname.endsWith("/rpc/solicitar_exclusao_por_token")){anonimizado=true;return Response.json([]);}
  if(url.pathname.includes("/object/"))return new Response(null,{status:404});
  return Response.json([]);
 };
 await expect(executarCicloFotos({...config,app:"http://localhost:3000",adminToken:token,hmac:"x".repeat(32)},transportar)).rejects.toThrow("Upload de teste falhou");
 expect(apagados).toBe(1);expect(anonimizado).toBe(true);
});
