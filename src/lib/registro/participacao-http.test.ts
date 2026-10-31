import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as denunciar } from "../../app/api/denunciar/route";
import { POST as responder } from "../../app/api/resposta/route";
import { POST as afeta } from "../../app/api/afeta/route";

const id = "7419b75e-86a9-4e4a-8a1a-9fb13f701a1e";
const denuncia = { ocorrencia_id: id, motivo: "dado_pessoal", texto: "Documento pessoal visível no relato.", turnstile: "captcha-ficticio" };
const resposta = { ocorrencia_id: id, vinculo: "Órgão fictício", contato: "contato@teste.invalid", texto: "Esta é uma resposta fictícia para revisão da equipe.", turnstile: "captcha-ficticio" };
let chamadas: { url: string; body: Record<string, unknown> }[];
let captcha: boolean, limite: boolean, retorno: boolean, falha: string, malformado: boolean;
function request(body: unknown, origin = "https://localhost") {
  return new Request("https://localhost/api/participacao", { method: "POST", headers: { origin, "content-type": "application/json" }, body: typeof body === "string" ? body : JSON.stringify(body) });
}
beforeEach(() => {
  chamadas = []; captcha = true; limite = true; retorno = true; falha = ""; malformado = false;
  vi.stubEnv("NODE_ENV", "test"); vi.stubEnv("VERCEL", ""); vi.stubEnv("VERCEL_ENV", "");
  vi.stubEnv("AMBIENTE_REGISTRO", "staging_ficticio"); vi.stubEnv("MODO_PUBLICACAO", "moderar_tudo");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://db.example"); vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_test");
  vi.stubEnv("TURNSTILE_SECRET", "captcha-segredo"); vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "site-ficticio"); vi.stubEnv("HMAC_SEGREDO", "h".repeat(32));
  for (const nome of ["LIMITE_FOTO_MAXIMO", "LIMITE_REGISTRO_MAXIMO", "LIMITE_ACOMPANHAR_MAXIMO", "LIMITE_EXCLUIR_MAXIMO", "LIMITE_JANELA_SEGUNDOS", "TRIAGEM_JANELA_SEGUNDOS", "TRIAGEM_LIMITE_ORIGEM", "LIMITE_DENUNCIA_MAXIMO", "LIMITE_RESPOSTA_MAXIMO"]) vi.stubEnv(nome, "5");
  vi.stubGlobal("fetch", async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input); chamadas.push({ url, body: JSON.parse(String(init?.body || "{}")) });
    if (falha && url.endsWith(falha)) return Response.json({ code: "22023", message: "contato@teste.invalid segredo privado" }, { status: 400 });
    if (url.includes("siteverify")) return Response.json({ success: captcha });
    if (url.endsWith("consumir_limite")) return Response.json(limite);
    if (url.endsWith("triagem_sinais")) return Response.json([{ out_texto_repetido: false, out_origem_sinalizada: false }]);
    if (url.endsWith("registrar_denuncia") || url.endsWith("registrar_resposta")) return Response.json(malformado ? { contato: "privado" } : retorno);
    throw new Error("RPC inesperado");
  });
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe.each([{ nome: "denunciar", post: denunciar, entrada: denuncia, rpc: "registrar_denuncia", env: "LIMITE_DENUNCIA_MAXIMO" }, { nome: "resposta", post: responder, entrada: resposta, rpc: "registrar_resposta", env: "LIMITE_RESPOSTA_MAXIMO" }])("participação pública: $nome", ({ post, entrada, rpc, env }) => {
  it("confirma de modo uniforme sem revelar existência nem conteúdo privado", async () => {
    const a = await post(request(entrada)); retorno = false; const b = await post(request(entrada));
    expect(a.status).toBe(202); expect(b.status).toBe(202); expect(await a.json()).toEqual(await b.json());
    expect(a.headers.get("cache-control")).toBe("no-store"); expect(a.headers.get("referrer-policy")).toBe("no-referrer");
    expect(chamadas.filter(c => c.url.endsWith(rpc))).toHaveLength(2);
    const escritas = chamadas.filter(c => c.url.endsWith(rpc));
    expect(escritas.every(c => typeof c.body.p_origem_hash === "string" && /^\\x[a-f0-9]{64}$/.test(String(c.body.p_origem_hash)))).toBe(true);
    expect(JSON.stringify(escritas.map(c => c.body))).not.toContain("local-sem-endereco");
  });
  it("fecha sem env e com limite inválido, sem chamadas externas", async () => {
    for (const nome of [env, "SUPABASE_SECRET_KEY", "TURNSTILE_SECRET"]) {
      const anterior = process.env[nome]; vi.stubEnv(nome, ""); expect((await post(request(entrada))).status).toBe(503); vi.stubEnv(nome, anterior!);
    }
    vi.stubEnv(env, "1.5"); expect((await post(request(entrada))).status).toBe(503); expect(chamadas).toHaveLength(0);
  });
  it("bloqueia origem inválida, JSON malformado, corpo grande e campos extras", async () => {
    expect((await post(request(entrada, "https://hostil.invalid"))).status).toBe(403);
    expect((await post(request("{"))).status).toBe(400);
    expect((await post(request("x".repeat(25000)))).status).toBe(413);
    for (const body of [{ ...entrada, status: "publicada" }, { ...entrada, ocorrencia_id: "inexistente" }, { ...entrada, texto: "\u202eoculto" }, { ...entrada, texto: "" }]) expect((await post(request(body))).status).toBe(422);
    expect(chamadas).toHaveLength(0);
  });
  it("exige staging fictício e moderação antes da rede", async () => {
    vi.stubEnv("AMBIENTE_REGISTRO", "production"); expect((await post(request(entrada))).status).toBe(503);
    vi.stubEnv("AMBIENTE_REGISTRO", "staging_ficticio"); vi.stubEnv("MODO_PUBLICACAO", "texto_automatico"); expect((await post(request(entrada))).status).toBe(503); expect(chamadas).toHaveLength(0);
  });
  it("limita antes do captcha e recusa captcha antes da escrita", async () => {
    limite = false; expect((await post(request(entrada))).status).toBe(429); expect(chamadas).toHaveLength(1);
    chamadas = []; limite = true; captcha = false; expect((await post(request(entrada))).status).toBe(422); expect(chamadas.some(c => c.url.endsWith(rpc))).toBe(false);
  });
  it("sanitiza erros e rejeita contrato malformado do banco", async () => {
    falha = rpc; const r = await post(request(entrada)); expect(r.status).toBe(503); expect(await r.text()).not.toMatch(/contato@|segredo|privado/);
    expect(vi.mocked(console.error).mock.calls.flat().join()).not.toMatch(/contato@|segredo|privado/);
    falha = ""; malformado = true; expect((await post(request(entrada))).status).toBe(503);
    vi.stubGlobal("fetch", async () => { throw new Error("segredo"); }); expect((await post(request(entrada))).status).toBe(503);
  });
  it("consulta triagem antes da escrita e falha fechado se ela falhar", async () => {
    const r = await post(request(entrada)); expect(r.status).toBe(202);
    const triagem = chamadas.findIndex(c => c.url.endsWith("triagem_sinais"));
    expect(triagem).toBeGreaterThan(-1); expect(triagem).toBeLessThan(chamadas.findIndex(c => c.url.endsWith(rpc)));
    expect(chamadas[triagem].body).toMatchObject({ p_descricao: entrada.texto, p_origem_hash: expect.stringMatching(/^\\x[a-f0-9]{64}$/) });
    expect(JSON.stringify(chamadas[triagem].body)).not.toContain("contato@teste.invalid");
    chamadas = []; falha = "triagem_sinais"; expect((await post(request(entrada))).status).toBe(503); expect(chamadas.some(c => c.url.endsWith(rpc))).toBe(false);
  });
  it("correlaciona respostas e logs sem aceitar ID hostil nem registrar dados privados", async () => {
    const req = request(entrada); req.headers.set("x-request-id", "contato@teste.invalid");
    const ok = await post(req);
    const log = JSON.parse(String(vi.mocked(console.info).mock.calls[0]?.[0] || "{}"));
    expect(log).toMatchObject({ evento: "requisicao.concluida", status: 202, metodo: "POST", requestId: ok.headers.get("x-request-id") });
    expect(log.requestId).toMatch(/^[a-f0-9-]{36}$/);
    falha = rpc; const ruim = await post(request(entrada));
    const erro = JSON.parse(String(vi.mocked(console.error).mock.calls[0]?.[0] || "{}"));
    expect(erro).toMatchObject({ evento: "requisicao.falhou", status: 503, requestId: ruim.headers.get("x-request-id") });
    expect(JSON.stringify([log, erro])).not.toMatch(/contato@|segredo|Documento|192\.0|captcha-ficticio/);
  });
});

it("usa orçamentos independentes e ignora User-Agent e XFF forjados", async () => {
  await denunciar(request(denuncia)); await responder(request(resposta));
  const limites = chamadas.filter(c => c.url.endsWith("consumir_limite"));
  expect(limites[0].body.p_chave).not.toBe(limites[1].body.p_chave);
  const outra = request(denuncia); outra.headers.set("user-agent", "outro"); outra.headers.set("x-forwarded-for", "192.0.2.9");
  await denunciar(outra); expect(chamadas.filter(c => c.url.endsWith("consumir_limite"))[2].body.p_chave).toBe(limites[0].body.p_chave);
  const origens = chamadas.filter(c => c.url.endsWith("registrar_denuncia") || c.url.endsWith("registrar_resposta")).map(c => c.body.p_origem_hash);
  expect(origens).toHaveLength(3); expect(origens[0]).toBe(origens[1]); expect(origens[2]).toBe(origens[0]);
});
it("envia contato apenas ao RPC de resposta e não aceita decisões de publicação", async () => {
  const r = await responder(request(resposta)); expect(r.status).toBe(202); expect(await r.text()).not.toContain(resposta.contato);
  const enviada = chamadas.find(c => c.url.endsWith("registrar_resposta"))!.body;
  expect(enviada).toMatchObject({ p_ocorrencia_id: id, p_vinculo: resposta.vinculo, p_contato: resposta.contato, p_texto: resposta.texto });
  expect(enviada.p_origem_hash).toMatch(/^\\x[a-f0-9]{64}$/);
});
it.each(["", "false", "true"])("afeta permanece fechado sem mecanismo aprovado, flag %s", async flag => {
  vi.stubEnv("AFETA_HABILITADO", flag); expect((await afeta(request({ ocorrencia_id: id, turnstile: "teste" }))).status).toBe(503); expect(chamadas).toHaveLength(0);
});
