import { afterEach, beforeEach, expect, it, vi } from "vitest";
import sharp from "sharp";
import { POST } from "../../app/api/imagem/route";
let calls: { url: string; init?: RequestInit }[];
let falha = false; let perdida = false; let existente = false;
const token = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
beforeEach(() => {
  calls=[]; falha=false; perdida=false; existente=false;
  for (const [k,v] of Object.entries({ NODE_ENV:"test", VERCEL:"", VERCEL_ENV:"", AMBIENTE_REGISTRO:"staging_ficticio", NEXT_PUBLIC_SUPABASE_URL:"https://db.example", SUPABASE_SERVICE_ROLE_KEY:"segredo", HMAC_SEGREDO:"a".repeat(32), TURNSTILE_SECRET:"teste", NEXT_PUBLIC_TURNSTILE_SITE_KEY:"teste", MODO_PUBLICACAO:"moderar_tudo", LIMITE_REGISTRO_MAXIMO:"5", LIMITE_ACOMPANHAR_MAXIMO:"20", LIMITE_EXCLUIR_MAXIMO:"5", LIMITE_JANELA_SEGUNDOS:"60", TRIAGEM_JANELA_SEGUNDOS:"60", TRIAGEM_LIMITE_ORIGEM:"5" })) vi.stubEnv(k,v);
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    calls.push({url,init});
    if(url.endsWith("consumir_limite")) return Response.json(true);
    if(url.endsWith("acompanhar_por_token")) return Response.json([{out_moderacao:"pendente"}]);
    if(url.includes("/storage/")) return new Response(null,{status:200});
    if(url.includes("/imagens?")) return Response.json(existente ? [{id:"7419b75e-86a9-4e4a-8a1a-9fb13f701a1e"}] : []);
    if(url.endsWith("registrar_imagem")) { if(perdida) throw new Error("resposta perdida"); return falha ? Response.json({code:"23505",message:"segredo"},{status:409}) : Response.json("7419b75e-86a9-4e4a-8a1a-9fb13f701a1e"); }
    throw Error("inesperado");
  });
});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
async function req(ordem="1",contexto="Buraco na calçada",extra=false) {
  const bytes=await sharp({create:{width:4,height:4,channels:3,background:"red"}}).jpeg().toBuffer();
  const f=new FormData(); f.set("token",token);f.set("ordem",ordem);f.set("contexto",contexto);f.set("foto",new File([new Uint8Array(bytes)],"privado.jpg",{type:"image/jpeg"})); if(extra) f.append("foto",new File([],"extra.jpg"));
  return new Request("https://localhost/api/imagem",{method:"POST",headers:{origin:"https://localhost"},body:f});
}
it("envia somente objeto reencodado privado e metadata pendente com contexto",async()=>{
  expect((await POST(await req())).status).toBe(201);
  const upload=calls.find(c=>c.url.includes("/storage/"))!;
  expect(upload.url).toMatch(/imagens-quarentena\/[a-f0-9]{64}\/1\/[a-f0-9]{64}\.jpg$/);
  expect(upload.url).not.toContain(token);expect(upload.init?.headers).toMatchObject({"x-upsert":"false"});
  expect(JSON.parse(String(calls.find(c=>c.url.endsWith("registrar_imagem"))!.init?.body))).toMatchObject({p_contexto:"Buraco na calçada",p_ordem:1,p_mime:"image/jpeg"});
});
it.each(["0","4"])("rejeita slot %s e alt ausente sem upload",async ordem=>{expect((await POST(await req(ordem))).status).toBe(422);expect(calls.some(c=>c.url.includes("/storage/"))).toBe(false);});
it("rejeita contexto ausente e várias fotos por request",async()=>{expect((await POST(await req("1",""))).status).toBe(422);expect((await POST(await req("1","Calçada",true))).status).toBe(422);});
it("mantém objeto em commit ambíguo, retry usa mesmo caminho",async()=>{
  perdida=true;expect((await POST(await req())).status).toBe(503);
  const caminho=calls.find(c=>c.url.includes("/storage/"))!.url;
  expect(calls.some(c=>c.init?.method==="DELETE")).toBe(false);
  perdida=false;expect((await POST(await req())).status).toBe(201);
  expect(calls.filter(c=>c.url.includes("/storage/")).every(c=>c.url===caminho)).toBe(true);
});
it("limpa objeto sem metadata após conflito definitivo, preserva objeto já gravado",async()=>{
  falha=true; expect((await POST(await req())).status).toBe(409);
  expect(calls.some(c=>c.init?.method==="DELETE")).toBe(true);
  calls=[];existente=true;expect((await POST(await req())).status).toBe(409);expect(calls.some(c=>c.init?.method==="DELETE")).toBe(false);
});
it("bloqueia origem, body real grande e produção",async()=>{
  const r=await req();r.headers.set("origin","https://evil.test");expect((await POST(r)).status).toBe(403);
  const grande=await req();grande.headers.set("content-length","4500000");expect((await POST(grande)).status).toBe(413);
  const semHeader = new Request("https://localhost/api/imagem", { method:"POST", headers:{origin:"https://localhost","content-type":"multipart/form-data; boundary=teste"}, body:new Uint8Array(2*1024*1024+16385) });
  expect((await POST(semHeader)).status).toBe(413);
  vi.stubEnv("VERCEL_ENV","production");expect((await POST(await req())).status).toBe(503);
});
