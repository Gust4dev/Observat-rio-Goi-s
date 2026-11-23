import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { randomBytes, randomInt } from "node:crypto";
import sharp from "sharp";
import { POST } from "../../app/api/imagem/route";
let calls: { url: string; init?: RequestInit }[];
let falha = false; let perdida = false; let existente = false; let retry = false; let tokenValido = true; let slotLivre = true;
let limiteFotoConfigurado: number;
const token = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
beforeEach(() => {
  calls=[]; falha=false; perdida=false; existente=false; retry=false; tokenValido=true; slotLivre=true;
  vi.stubEnv("FOTOS_HABILITADAS", "true");
  limiteFotoConfigurado = randomInt(1, 1_000_000);
  const valores = { NODE_ENV:"test", VERCEL:"", VERCEL_ENV:"", AMBIENTE_REGISTRO:"staging_ficticio", NEXT_PUBLIC_SUPABASE_URL:"https://db.example", SUPABASE_SECRET_KEY:"sb_secret_test", HMAC_SEGREDO:randomBytes(32).toString("base64url"), TURNSTILE_SECRET:randomBytes(32).toString("base64url"), NEXT_PUBLIC_TURNSTILE_SITE_KEY:"teste", MODO_PUBLICACAO:"moderar_tudo", LIMITE_FOTO_MAXIMO:String(limiteFotoConfigurado), LIMITE_REGISTRO_MAXIMO:String(randomInt(1, 1_000_000)), LIMITE_ACOMPANHAR_MAXIMO:String(randomInt(1, 1_000_000)), LIMITE_EXCLUIR_MAXIMO:String(randomInt(1, 1_000_000)), LIMITE_JANELA_SEGUNDOS:String(randomInt(1, 1_000_000)), TRIAGEM_JANELA_SEGUNDOS:String(randomInt(1, 1_000_000)), TRIAGEM_LIMITE_ORIGEM:String(randomInt(1, 1_000_000)) };
  for (const [k,v] of Object.entries(valores)) vi.stubEnv(k,v);
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    calls.push({url,init});
    if(url.endsWith("consumir_limite")) return Response.json(true);
    if(url.endsWith("acompanhar_por_token")) return Response.json(tokenValido ? [{out_moderacao:"pendente"}] : []);
    if(url.endsWith("consultar_slot_imagem")) return slotLivre ? Response.json(retry ? [{out_id:"7419b75e-86a9-4e4a-8a1a-9fb13f701a1e"}] : []) : Response.json({code:"23505"},{status:409});
    if(url.includes("/storage/")) return new Response(null,{status:200});
    if(url.includes("/imagens?")) return Response.json(existente ? [{id:"7419b75e-86a9-4e4a-8a1a-9fb13f701a1e"}] : []);
    if(url.endsWith("registrar_imagem")) { if(perdida) throw new Error("resposta perdida"); return falha ? Response.json({code:"23505",message:"segredo"},{status:409}) : Response.json("7419b75e-86a9-4e4a-8a1a-9fb13f701a1e"); }
    throw Error("inesperado");
  });
});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
async function req(ordem="1",contexto="Buraco na calçada",extra=false,extraHeaders:Record<string,string>={},mime="image/jpeg",conteudo?:Uint8Array,query="") {
  const bytes=conteudo??await sharp({create:{width:4,height:4,channels:3,background:"red"}}).jpeg().toBuffer();
  const f=new FormData(); f.set("token",token);f.set("ordem",ordem);f.set("contexto",contexto);f.set("foto",new File([new Uint8Array(bytes)],"privado.jpg",{type:mime})); if(extra) f.append("foto",new File([],"extra.jpg"));
  return new Request(`https://localhost/api/imagem${query}`,{method:"POST",headers:{origin:"https://localhost",...extraHeaders},body:f});
}
it.each([undefined, "", "false", "TRUE", "1", " true "])("falha fechado com flag %s antes de consumir o corpo", async valor => {
  if (valor === undefined) delete process.env.FOTOS_HABILITADAS; else vi.stubEnv("FOTOS_HABILITADAS", valor);
  const r = new Request("https://localhost/api/imagem", { method: "POST", body: "corpo não multipart" });
  expect((await POST(r)).status).toBe(503);
  expect(r.bodyUsed).toBe(false);
  expect(calls).toHaveLength(0);
});
it("não habilita fotos no modo texto automático", async () => {
  vi.stubEnv("MODO_PUBLICACAO", "texto_automatico");
  expect((await POST(await req())).status).toBe(503);
  expect(calls).toHaveLength(0);
});
it.each([
  { AMBIENTE_REGISTRO: "" },
  { VERCEL_ENV: "production" },
  { VERCEL: "1", VERCEL_ENV: "preview", ACESSO_STAGING_USUARIO: "", ACESSO_STAGING_SENHA: "" },
])("falha fechado com flag ligada e ambiente incompatível %j", async variaveis => {
  for (const [nome, valor] of Object.entries(variaveis)) vi.stubEnv(nome, valor);
  const r = new Request("https://localhost/api/imagem", { method: "POST", body: "corpo não multipart" });
  expect((await POST(r)).status).toBe(503);
  expect(r.bodyUsed).toBe(false);
});
it("envia somente objeto reencodado privado e metadata pendente com contexto",async()=>{
  expect((await POST(await req())).status).toBe(201);
  const upload=calls.find(c=>c.url.includes("/storage/"))!;
  expect(upload.url).toMatch(/imagens-quarentena\/[a-f0-9]{64}\/1\/[a-f0-9]{64}\.jpg$/);
  expect(upload.url).not.toContain(token);expect(upload.init?.headers).toMatchObject({"x-upsert":"false"});
  expect(new Headers(upload.init?.headers).get("apikey")).toBe("sb_secret_test");expect(new Headers(upload.init?.headers).has("authorization")).toBe(false);
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
it("recusa Origin ausente, Fetch Metadata cross-site e token na query", async()=>{
  expect((await POST(await req("1", "Buraco na calçada", false, { origin: "" }))).status).toBe(403);
  expect((await POST(await req("1", "Buraco na calçada", false, { "sec-fetch-site": "cross-site" }))).status).toBe(403);
  expect((await POST(await req("1", "Buraco na calçada", false, {}, "image/jpeg", undefined, `?token=${token}`))).status).toBe(422);
  expect(calls).toHaveLength(0);
});
it("falha fechado se o rate limit ou Supabase estiver indisponível", async()=>{
  vi.stubGlobal("fetch", async (input: string | URL | Request) => {
    calls.push({ url: String(input) });
    if (String(input).endsWith("consumir_limite")) return Response.json({ message: "segredo" }, { status: 503 });
    throw new Error("Supabase segredo indisponível");
  });
  const limiteIndisponivel = await POST(await req());
  expect(limiteIndisponivel.status).toBe(503);
  expect(await limiteIndisponivel.text()).not.toMatch(/segredo|indisponível/);
  expect(calls).toHaveLength(1);

  calls=[];
  vi.stubGlobal("fetch", async (input: string | URL | Request) => { calls.push({ url: String(input) }); throw new Error("Supabase segredo indisponível"); });
  const supabaseIndisponivel = await POST(await req());
  expect(supabaseIndisponivel.status).toBe(503);
  expect(await supabaseIndisponivel.text()).not.toMatch(/segredo|indisponível/);
  expect(calls).toHaveLength(1);
});

it("aceita origem validada pelo host confiável do proxy",async()=>{
 const resposta=await POST(await req("1","Buraco na calçada",false,{host:"127.0.0.1:3000",origin:"https://127.0.0.1:3000"}));
 expect(resposta.status).toBe(201);
});

it("aplica rate limit antes das consultas de token e slot", async()=>{
 tokenValido=false; expect((await POST(await req())).status).toBe(404); expect(calls.some(c=>c.url.endsWith("consumir_limite"))).toBe(true);
 expect(calls.some(c=>c.url.endsWith("acompanhar_por_token"))).toBe(true);
 calls=[];tokenValido=true;slotLivre=false; expect((await POST(await req())).status).toBe(409);expect(calls.some(c=>c.url.includes("/storage/"))).toBe(false);
});
it("retry reconhecido evita novo processamento e upload", async()=>{
 retry=true; expect((await POST(await req("1","Contexto alterado"))).status).toBe(201);
 expect(calls.some(c=>c.url.includes("/storage/"))).toBe(false);
 expect(calls.some(c=>c.url.endsWith("registrar_imagem"))).toBe(false);
});
it("usa o limite próprio antes de consultar o slot", async()=>{
 expect((await POST(await req())).status).toBe(201);
 const limite=calls.find(c=>c.url.endsWith("consumir_limite"))!;expect(JSON.parse(String(limite.init?.body)).p_maximo).toBe(limiteFotoConfigurado);
 expect(calls.indexOf(limite)).toBeLessThan(calls.findIndex(c=>c.url.endsWith("consultar_slot_imagem")));
});

it.each([
  ["MIME falso", "image/png", undefined],
  ["conteúdo indecodificável", "image/jpeg", new Uint8Array([1, 2, 3, 4])],
])("rejeita %s antes de consultar token/slot ou escrever no Storage", async (_caso, mime, conteudo) => {
  const resposta = await POST(await req("1", "Buraco na calçada", false, {}, mime, conteudo));
  expect(resposta.status).toBe(422);
  expect(calls).toHaveLength(0);
  expect(calls.some(c => c.url.includes("/storage/"))).toBe(false);
});

it("contexto alterado e uploads simultâneos usam a mesma identidade de arquivo", async()=>{
 const respostas=await Promise.all([POST(await req("1","Contexto primeiro")),POST(await req("1","Contexto segundo"))]);
 expect(respostas.map(r=>r.status)).toEqual([201,201]);
 const uploads=calls.filter(c=>c.url.includes("/storage/"));expect(uploads).toHaveLength(2);expect(new Set(uploads.map(c=>c.url)).size).toBe(1);
 const registros=calls.filter(c=>c.url.endsWith("registrar_imagem")).map(c=>JSON.parse(String(c.init?.body)));
 expect(registros[0].p_hash_entrada).toBe(registros[1].p_hash_entrada);
});
