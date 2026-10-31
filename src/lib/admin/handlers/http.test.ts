import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { handleAdmin } from "./http";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));
const id = "12345678-1234-4234-8234-123456789012";
const token = (aal = "aal2") => `head.${Buffer.from(JSON.stringify({ sub: id, aal })).toString("base64url")}.sig`;
function req(data?: unknown, auth = true, headers: Record<string,string> = {}) { return new Request("https://app.example/api/admin/test", { method: data === undefined ? "GET" : "POST", headers: { "content-type": "application/json", ...(auth ? { Authorization: `Bearer ${token()}` } : {}), ...headers }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) }); }
function network(role = "moderador", result: unknown = null, aal = "aal2") {
 const f = vi.fn().mockResolvedValueOnce(Response.json({ id })).mockResolvedValueOnce(Response.json([{ user_id: id, papel: role, ativo: true }])).mockResolvedValue(Response.json(result)); vi.stubGlobal("fetch", (url:string,init:RequestInit) => url.includes("/rpc/consumir_limite") ? Promise.resolve(Response.json(true)) : f(url,init)); return { f, request: (data?: unknown) => req(data, true, { Authorization: `Bearer ${token(aal)}` }) };
}
beforeEach(() => { vi.stubEnv("LIMITE_ADMIN_MAXIMO", "60"); vi.stubEnv("LIMITE_ADMIN_JANELA_SEGUNDOS", "60"); vi.stubEnv("HMAC_SEGREDO", "h".repeat(32)); vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://db.example"); vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test"); vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_service"); vi.spyOn(console,"info").mockImplementation(() => {}); vi.spyOn(console,"error").mockImplementation(() => {}); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it("uses the verified user JWT for atomic moderation and private headers", async () => {
 const { f, request } = network(); const r = await handleAdmin(request({ acao: "remover", motivo_codigo: "spam", motivo: "Confirmado" }), "moderar", id);
 expect(r.status).toBe(200); expect(f.mock.calls[2][0]).toContain("rpc/admin_moderar_ocorrencia"); expect(f.mock.calls[2][1].headers.Authorization).toBe(`Bearer ${token()}`); expect(JSON.parse(f.mock.calls[2][1].body)).toEqual({ p_id: id, p_acao: "remover", p_motivo_codigo: "spam", p_motivo: "Confirmado" });
 expect(r.headers.get("cache-control")).toBe("no-store"); expect(r.headers.get("x-request-id")).toBeTruthy(); expect(r.headers.get("referrer-policy")).toBe("no-referrer");
});
it.each(["fila", "detalhe", "contato", "moderar", "lote", "mesclar", "situacao", "atualizacao", "denuncias", "respostas", "resolver-denuncia", "revisar-resposta", "auditoria", "foto", "equipe", "equipe-convidar", "equipe-papel", "equipe-desativar"])("rejects unauthenticated %s", async action => {
 const f = vi.fn(); vi.stubGlobal("fetch", f); expect([401,403]).toContain((await handleAdmin(req(undefined,false), action, id)).status); expect(f).not.toHaveBeenCalled();
});
it("rejects AAL1 and insufficient role", async () => {
 let n = network("superadmin", null, "aal1"); expect((await handleAdmin(n.request(), "equipe")).status).toBe(403); expect(n.f).toHaveBeenCalledTimes(1);
 n = network(); expect((await handleAdmin(n.request(), "contato", id)).status).toBe(403); expect(n.f).toHaveBeenCalledTimes(2);
});
it.each<Record<string,string>>([{ origin: "https://evil.example", "X-Observatorio-CSRF": "1" }, { origin: "https://app.example" }])("enforces cookie origin and CSRF", async headers => {
 const f = vi.fn(); vi.stubGlobal("fetch",f); expect((await handleAdmin(req({acao:"aprovar"},false,{ cookie:`og_admin_access_token=${token()}`, ...headers }),"moderar",id)).status).toBe(403); expect(f).not.toHaveBeenCalled();
});
it.each([{ acao: "remover", motivo: "spam" }, { acao: "reter" }, { acao: "aprovar", unknown: true }])("rejects invalid moderation body",async body => { const n=network(); expect((await handleAdmin(n.request(body),"moderar",id)).status).toBe(400); expect(n.f).toHaveBeenCalledTimes(2); });
it("rejects oversized/duplicate batch and oversized streamed body", async () => {
 for(const ids of [Array(51).fill(id),[id,id]]) { const n=network(); expect((await handleAdmin(n.request({ids,acao:"aprovar"}),"lote")).status).toBe(400); expect(n.f).toHaveBeenCalledTimes(2); }
 const n=network(); expect((await handleAdmin(n.request({acao:"aprovar",motivo:"x".repeat(17000)}),"moderar",id)).status).toBe(413);
});
it("fails closed for database and missing configuration",async()=>{
 let n=network(); n.f.mockReset().mockRejectedValue(new Error("secret")); expect((await handleAdmin(n.request(),"fila")).status).toBe(503);
 vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL",""); n=network(); expect((await handleAdmin(n.request(),"fila")).status).toBe(503); expect(n.f).not.toHaveBeenCalled();
});
it("redacts storage/contact from detail and audit snapshots",async()=>{
 const n=network("gestor",{ ocorrencia:{id},imagens:[{id,caminho_storage:"private.jpg",url:"secret"}],respostas:[{contato:"secret",texto:"resposta"}] }); const r=await handleAdmin(n.request(),"detalhe",id); const output=await r.text(); expect(output).not.toContain("secret"); expect(output).not.toContain("private.jpg");
});
it("only returns a short lived quarantine URL after authorization",async()=>{
 const path=`${"a".repeat(64)}/1/${"b".repeat(64)}.jpg`; const n=network("moderador",[{caminho_storage:path,moderacao:"pendente"}]); n.f.mockResolvedValueOnce(Response.json({id})).mockResolvedValueOnce(Response.json([{user_id:id,papel:"moderador",ativo:true}]));
 n.f.mockReset().mockResolvedValueOnce(Response.json({id})).mockResolvedValueOnce(Response.json([{user_id:id,papel:"moderador",ativo:true}])).mockResolvedValueOnce(Response.json([{caminho_storage:path,moderacao:"pendente"}])).mockResolvedValueOnce(Response.json({signedURL:`/object/sign/imagens-quarentena/${path}?token=secret`}));
 const r=await handleAdmin(n.request(),"foto",id); expect(r.status).toBe(200); expect(await r.json()).toEqual({url:`https://db.example/storage/v1/object/sign/imagens-quarentena/${path}?token=secret`,expira_em_segundos:60}); expect(JSON.parse(n.f.mock.calls[3][1].body)).toEqual({expiresIn:60});
});
it("enumerates every new admin route and proves anonymous requests are denied",async()=>{
 function files(dir:string):string[]{ return readdirSync(dir,{withFileTypes:true}).flatMap(e=> e.isDirectory()?files(join(dir,e.name)):e.name==="route.ts"?[join(dir,e.name)]:[]); }
 const routes=files(join(process.cwd(),"src/app/api/admin")).filter(p=> !/[\\/]auth[\\/]|[\\/]imagem[\\/]/.test(p)); expect(routes.length).toBeGreaterThanOrEqual(18);
 for(const file of routes){const source=readFileSync(file,"utf8"); const action=source.match(/handleAdmin\(req, "([^"]+)"/)?.[1]; expect(action,file).toBeTruthy(); const r=await handleAdmin(req({},false),action!,id);expect([401,403],file).toContain(r.status);}
});
it("generates an invite capability only for superadmin and associates via caller JWT",async()=>{
 const n=network("superadmin"); n.f.mockReset().mockResolvedValueOnce(Response.json({id})).mockResolvedValueOnce(Response.json([{user_id:id,papel:"superadmin",ativo:true}])).mockResolvedValueOnce(Response.json({},{status:429})).mockResolvedValueOnce(Response.json({user:{id},properties:{action_link:"https://db.example/auth/v1/verify?token=one-time-secret&type=invite"}})).mockResolvedValueOnce(new Response(null,{status:204}));
 const r=await handleAdmin(n.request({email:"new@example.com",papel:"moderador",motivo:"Nova equipe"}),"equipe-convidar");expect(r.status).toBe(200);expect((await r.json()).link_convite).toContain("one-time-secret");expect(n.f.mock.calls[2][0]).toContain("/auth/v1/invite");expect(n.f.mock.calls[3][1].headers.apikey).toBe("sb_secret_service");expect(n.f.mock.calls[3][1].headers.Authorization).toBeUndefined();expect(n.f.mock.calls[4][1].headers.Authorization).toBe(`Bearer ${token()}`);expect(JSON.parse(String(n.f.mock.calls[4][1].body)).p_user_id).toBe(id);expect(JSON.stringify(vi.mocked(console.info).mock.calls)).not.toContain("one-time-secret");expect(JSON.stringify(vi.mocked(console.info).mock.calls)).not.toContain("sb_secret_service");
});
it("lists the queue using filters and stable order without public sources",async()=>{
 const n=network(); n.f.mockResolvedValueOnce(Response.json([{id,criado_em:"2026-10-28T12:00:00Z",denuncias_abertas:2,imagens_pendentes:1}])).mockResolvedValueOnce(Response.json([{id}],{headers:{"content-range":"0-0/10"}})); const request=new Request("https://app.example/api/admin/fila?moderacao=pendente&ordem=recentes&limite=1",{headers:{Authorization:`Bearer ${token()}`}});
 const r=await handleAdmin(request,"fila");expect(r.status).toBe(200);expect((await r.json()).total).toBe(10);const url=new URL(n.f.mock.calls[2][0]);expect(url.pathname).toBe("/rest/v1/v_fila_moderacao");expect(url.searchParams.get("moderacao")).toBe("eq.pendente");expect(url.searchParams.get("order")).toBe("criado_em.desc,id.desc");expect(url.searchParams.get("limit")).toBe("2");
});
it("keeps full filtered count outside priority cursor and applies age/photo/report filters",async()=>{
 const c={id,criado_em:"2026-10-28T12:00:00Z",denuncias_abertas:2,imagens_pendentes:1};const n=network();n.f.mockResolvedValueOnce(Response.json([c])).mockResolvedValueOnce(Response.json([{id}],{headers:{"content-range":"0-0/20"}}));
 const url=new URL("https://app.example/api/admin/fila");url.search=new URLSearchParams({cursor:Buffer.from(JSON.stringify(c)).toString("base64url"),denuncia:"true",foto_pendente:"false",idade_min_dias:"1",idade_max_dias:"30",municipio_id:"2",categoria_id:"3"}).toString();
 const r=await handleAdmin(new Request(url,{headers:{Authorization:`Bearer ${token()}`}}),"fila");expect(r.status).toBe(200);expect((await r.json()).total).toBe(20);const page=new URL(n.f.mock.calls[2][0]);const count=new URL(n.f.mock.calls[3][0]);expect(page.searchParams.get("or")).toContain("denuncias_abertas.lt.2");expect(count.searchParams.has("or")).toBe(false);expect(count.searchParams.get("denuncias_abertas")).toBe("gt.0");expect(count.searchParams.get("imagens_pendentes")).toBe("eq.0");expect(count.searchParams.getAll("criado_em")).toHaveLength(2);expect(page.searchParams.get("order")).toBe("denuncias_abertas.desc,imagens_pendentes.desc,criado_em.asc,id.asc");
});
it("sends SMTP invite without returning a capability when delivery works",async()=>{
 const n=network("superadmin");n.f.mockResolvedValueOnce(Response.json({id})).mockResolvedValueOnce(new Response(null,{status:204}));const r=await handleAdmin(n.request({email:"new@example.com",papel:"gestor",motivo:"Equipe"}),"equipe-convidar");expect(r.status).toBe(200);expect(await r.json()).toEqual({user_id:id,convite_enviado:true});expect(n.f.mock.calls).toHaveLength(4);
});
it("expired quarantine paths are unavailable while admin detail remains readable",async()=>{
 let n=network("moderador",[{caminho_storage:null,moderacao:"retido"}]);expect((await handleAdmin(n.request(),"foto",id)).status).toBe(404);expect(n.f.mock.calls).toHaveLength(3);
 n=network("moderador",{imagens:[{id,caminho_storage:null,moderacao:"retido",retencao_expirada_em:"2026-10-28T12:00:00Z"}]});const r=await handleAdmin(n.request(),"detalhe",id);expect(r.status).toBe(200);expect(await r.json()).toEqual({imagens:[{id,moderacao:"retido",retencao_expirada_em:"2026-10-28T12:00:00Z"}]});
});
it("limits the verified session with an HMAC key and returns 429 before the action",async()=>{
 const calls: {url:string,init:RequestInit}[]=[];vi.stubGlobal("fetch",async(url:string,init:RequestInit)=>{calls.push({url,init});if(url.includes("auth/v1/user"))return Response.json({id});if(url.includes("administradores"))return Response.json([{user_id:id,papel:"moderador",ativo:true}]);return Response.json(false);});
 const r=await handleAdmin(req({acao:"aprovar"}),"moderar",id);expect(r.status).toBe(429);expect(calls).toHaveLength(3);expect(calls[2].url).toContain("rpc/consumir_limite");const body=JSON.parse(String(calls[2].init.body));expect(body.p_chave).toMatch(/^\\x[a-f0-9]{64}$/);expect(body.p_janela).toBe("60 seconds");expect(body.p_maximo).toBe(60);expect(JSON.stringify(vi.mocked(console.info).mock.calls)).not.toContain(body.p_chave);expect(String(calls[2].init.body)).not.toContain(token());
});
it("fails closed before actions without limiter configuration",async()=>{
 for(const key of ["HMAC_SEGREDO","SUPABASE_SECRET_KEY"]){const n=network();vi.stubEnv(key,"");expect((await handleAdmin(n.request({acao:"aprovar"}),"moderar",id)).status).toBe(503);expect(n.f).toHaveBeenCalledTimes(2);vi.stubEnv(key,key==="HMAC_SEGREDO"?"h".repeat(32):"sb_secret_service");}
});
it.each(["LIMITE_ADMIN_MAXIMO", "LIMITE_ADMIN_JANELA_SEGUNDOS"])("requires valid %s without defaults",async key=>{
 for(const value of [undefined,"","invalid","0","-1"]){const n=network();vi.stubEnv(key,value);expect((await handleAdmin(n.request({acao:"aprovar"}),"moderar",id)).status).toBe(503);expect(n.f).toHaveBeenCalledTimes(2);}
});

