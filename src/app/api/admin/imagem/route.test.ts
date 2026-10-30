import { afterEach, beforeEach, expect, it, vi } from "vitest";
const revalidate=vi.hoisted(()=>vi.fn());
vi.mock("next/cache",()=>({revalidateTag:revalidate}));
const id="11111111-1111-4111-8111-111111111111", user="22222222-2222-4222-8222-222222222222", op="33333333-3333-4333-8333-333333333333";
const criarJwt=(aal:string,sub=user)=>`header.${Buffer.from(JSON.stringify({aal,sub})).toString("base64url")}.signature`;
const jwt=criarJwt("aal2");let tokenJwt=jwt;
const checklist={rosto:false,menor:false,placa:false,numero_residencia:false,documento:false,agressao:false};
let calls:{url:string;init?:RequestInit}[], role=true, failRpc=false, failDelete=false, duplicate=false, publicExists=false, uploadLost=false, rpcCommitted=false, rpcCommittedAction="aprovar";
const content=new Uint8Array([255,216,255,1]);
beforeEach(()=>{tokenJwt=jwt;calls=[];revalidate.mockReset();revalidate.mockImplementation((tag:string)=>calls.push({url:`cache:${tag}`}));role=true;failRpc=false;failDelete=false;duplicate=false;publicExists=false;uploadLost=false;rpcCommitted=false;rpcCommittedAction="aprovar";
 for(const [k,v] of Object.entries({FOTOS_HABILITADAS:"true",AMBIENTE_REGISTRO:"staging_ficticio",VERCEL:"",VERCEL_ENV:"",NEXT_PUBLIC_SUPABASE_URL:"https://test.supabase.co",NEXT_PUBLIC_SUPABASE_ANON_KEY:"anon",SUPABASE_SERVICE_ROLE_KEY:"service",MODO_PUBLICACAO:"moderar_tudo"}))vi.stubEnv(k,v);
 vi.stubGlobal("fetch",async(url:string,init?:RequestInit)=>{calls.push({url,init});
  if(url.endsWith("/auth/v1/user"))return Response.json({id:user});
  if(url.includes("/administradores?"))return Response.json(role?[{user_id:user,papel:"moderador",ativo:true}]:[]);
  if(url.endsWith("admin_preparar_imagem"))return Response.json([{out_operacao:op,out_caminho:`${"a".repeat(64)}/1/${"b".repeat(64)}.jpg`,out_moderacao:"pendente"}]);
  if(url.endsWith("admin_moderar_imagem"))return failRpc||rpcCommitted?Response.json({code:"22023"},{status:400}):Response.json(null);
  if(url.endsWith("admin_abandonar_imagem"))return Response.json(true);
  if(url.includes("/imagens?"))return Response.json([{moderacao:rpcCommitted?(rpcCommittedAction==="remover"?"removido":"publicado"):"pendente",operacao_admin_id:rpcCommitted?null:op}]);
  if(url.includes("/storage/")&&init?.method==="POST"){publicExists=true;if(uploadLost)throw Error("Resposta perdida após gravar");return new Response(null,{status:duplicate?409:200});}
  if(url.includes("/storage/")&&init?.method==="DELETE"){if(!failDelete&&url.includes("imagens-publicas"))publicExists=false;return new Response(null,{status:failDelete?500:200});}
  if(url.includes("/storage/"))return new Response(content,{status:url.includes("imagens-publicas")&&!publicExists?404:200});
  throw Error("fetch inesperado");
 });
});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
async function post(body:unknown,auth=true){const modulo=await import("./route").catch(()=>({POST:async()=>new Response(null,{status:503})}));return modulo.POST(new Request("https://localhost/api/admin/imagem",{method:"POST",headers:{origin:"https://localhost","X-Observatorio-CSRF":"1","content-type":"application/json",...(auth?{authorization:`Bearer ${tokenJwt}`}:{})},body:JSON.stringify(body)}));}
const aprovar=()=>({imagem_id:id,acao:"aprovar",descricao_publica:"Buraco no pavimento",checklist});
it("nega sessão e papel antes de tocar Storage",async()=>{expect((await post(aprovar(),false)).status).toBe(401);role=false;expect((await post(aprovar())).status).toBe(403);expect(calls.some(c=>c.url.includes("/storage/"))).toBe(false);});
it("copia antes de publicar com JWT administrativo e confere duplicado",async()=>{duplicate=true;expect((await post(aprovar())).status).toBe(200);const copy=calls.findIndex(c=>c.url.includes("/storage/")&&c.init?.method==="POST");const rpc=calls.findIndex(c=>c.url.endsWith("admin_moderar_imagem"));expect(copy).toBeLessThan(rpc);expect(calls[rpc].init?.headers).toMatchObject({Authorization:`Bearer ${jwt}`});expect(calls[copy].url.endsWith(`${id}.jpg`)).toBe(true);});
it("rejeita alt/checklist e nunca copia uma foto com risco sinalizado",async()=>{expect((await post({...aprovar(),descricao_publica:""})).status).toBe(422);expect((await post({...aprovar(),checklist:{...checklist,rosto:true}})).status).toBe(422);expect((await post({...aprovar(),checklist:{}})).status).toBe(422);expect(calls.some(c=>c.url.includes("/storage/"))).toBe(false);});
it("compensa cópia em RPC falha e libera lease após apagar",async()=>{failRpc=true;expect((await post(aprovar())).status).toBe(503);const rpc=calls.findIndex(c=>c.url.endsWith("admin_moderar_imagem"));const del=calls.findIndex(c=>c.init?.method==="DELETE");expect(del).toBeGreaterThan(rpc);expect(calls.findIndex(c=>c.url.endsWith("admin_abandonar_imagem"))).toBeGreaterThan(del);});
it("remoção muda estado antes de excluir ambas cópias e pode ser repetida",async()=>{const body={imagem_id:id,acao:"remover",motivo:"Retirada fictícia",checklist};expect((await post(body)).status).toBe(200);expect(calls.findIndex(c=>c.init?.method==="DELETE")).toBeGreaterThan(calls.findIndex(c=>c.url.endsWith("admin_moderar_imagem")));expect(calls.filter(c=>c.init?.method==="DELETE")).toHaveLength(2);expect((await post(body)).status).toBe(200);});
it("falha de delete mantém erro genérico e permite retry",async()=>{failDelete=true;expect((await post({imagem_id:id,acao:"remover",motivo:"Retirada fictícia",checklist})).status).toBe(503);});


it("compensa upload com resposta perdida e GET público fica indisponível",async()=>{uploadLost=true;expect((await post(aprovar())).status).toBe(503);const get=await fetch(`https://test.supabase.co/storage/v1/object/imagens-publicas/${id}.jpg`);expect(get.status).toBe(404);});
it("preserva cópia quando a resposta da RPC se perde depois do commit",async()=>{rpcCommitted=true;expect((await post(aprovar())).status).toBe(503);expect(publicExists).toBe(true);expect(calls.some(c=>c.init?.method==="DELETE")).toBe(false);});
it("conclui a purga se a resposta da remoção se perde depois do commit",async()=>{rpcCommitted=true;rpcCommittedAction="remover";const body={imagem_id:id,acao:"remover",motivo:"Retirada fictícia",checklist};expect((await post(body)).status).toBe(200);expect(calls.filter(c=>c.init?.method==="DELETE")).toHaveLength(2);expect(revalidate).toHaveBeenCalledExactlyOnceWith("problemas",{expire:0});});
it("aceita cookie administrativo com Basic Auth do staging e CSRF",async()=>{const {POST}=await import("./route");const r=await POST(new Request("https://localhost/api/admin/imagem",{method:"POST",headers:{origin:"https://localhost","X-Observatorio-CSRF":"1","content-type":"application/json",authorization:"Basic abc",cookie:`og_admin_access_token=${jwt}`},body:JSON.stringify(aprovar())}));expect(r.status).toBe(200);});
it("rejeita cookie administrativo sem CSRF antes de consultar Auth",async()=>{const {POST}=await import("./route");const r=await POST(new Request("https://localhost/api/admin/imagem",{method:"POST",headers:{origin:"https://localhost","content-type":"application/json",authorization:"Basic abc",cookie:`og_admin_access_token=${jwt}`},body:JSON.stringify(aprovar())}));expect(r.status).toBe(403);expect(calls).toHaveLength(0);});



it.each(["aal1", "ausente"])("exige AAL2 após Auth e nega %s sem consultar banco ou Storage",async aal=>{
 tokenJwt=aal==="ausente"?`header.${Buffer.from(JSON.stringify({sub:user})).toString("base64url")}.signature`:criarJwt(aal);
 expect((await post(aprovar())).status).toBe(403);
 expect(calls.map(c=>new URL(c.url).pathname)).toEqual(["/auth/v1/user"]);
});
it("recusa claim sub divergente do usuário verificado",async()=>{
 tokenJwt=criarJwt("aal2",id);expect((await post(aprovar())).status).toBe(403);
 expect(calls.map(c=>new URL(c.url).pathname)).toEqual(["/auth/v1/user"]);
});

it.each(["aprovar","remover"])("invalida a tag pública imediatamente após RPC de %s",async acao=>{
 const body=acao==="aprovar"?aprovar():{imagem_id:id,acao,motivo:"Retirada fictícia",checklist};
 expect((await post(body)).status).toBe(200);expect(revalidate).toHaveBeenCalledExactlyOnceWith("problemas",{expire:0});
 expect(calls.findIndex(c=>c.url==="cache:problemas")).toBeGreaterThan(calls.findIndex(c=>c.url.endsWith("admin_moderar_imagem")));
});
it("não invalida quando a RPC de moderação falha",async()=>{
 failRpc=true;expect((await post(aprovar())).status).toBe(503);expect(revalidate).not.toHaveBeenCalled();
});
it("invalida remoção confirmada mesmo quando Storage falha depois",async()=>{
 failDelete=true;expect((await post({imagem_id:id,acao:"remover",motivo:"Retirada fictícia",checklist})).status).toBe(503);
 expect(revalidate).toHaveBeenCalledExactlyOnceWith("problemas",{expire:0});
});
