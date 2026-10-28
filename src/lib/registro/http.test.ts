import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as registrar } from "../../app/api/registrar/route";
import { POST as acompanhar } from "../../app/api/acompanhar/route";
import { POST as excluir } from "../../app/api/excluir/route";
import { resolverReferencia } from "./http";
import { configServidor } from "./servidor";

const token = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const entrada = { municipio: "anapolis", categoria: "saude", titulo: "Posto sem atendimento", descricao: "O posto está sem atendimento desde a semana passada.", token_hash: "a".repeat(64), chave_idempotencia: "7419b75e-86a9-4e4a-8a1a-9fb13f701a1e", turnstile: "captcha-teste" };
const dados = { out_id: "7419b75e-86a9-4e4a-8a1a-9fb13f701a1e", out_protocolo: "OG-26-TESTE", out_titulo: "Posto sem atendimento", out_situacao: "registrado", out_moderacao: "pendente", out_motivo_remocao: null, out_publicado_em: null, out_criado_em: "2026-10-27T12:00:00+00:00", out_atualizacoes: [], out_respostas: [] };
let chamadas: { url: string; body: Record<string, unknown> }[];
let respostaCaptcha = true;
let limite = true;
let falha = "";
let resultadoAcompanhar: unknown = [dados];
let repetida = false;
function request(body: unknown = entrada, headers: Record<string, string> = {}, caminho = "registrar") {
  return new Request(`https://localhost/api/${caminho}`, { method: "POST", headers: { origin: "https://localhost", "content-type": "application/json", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) });
}
beforeEach(() => {
  chamadas = []; respostaCaptcha = true; limite = true; falha = ""; repetida = false; resultadoAcompanhar = [dados];
  vi.stubEnv("NODE_ENV", "test"); vi.stubEnv("VERCEL", "");
  vi.stubEnv("AMBIENTE_REGISTRO", "staging_ficticio"); vi.stubEnv("VERCEL_ENV", "");
  vi.stubEnv("ACESSO_STAGING_USUARIO", ""); vi.stubEnv("ACESSO_STAGING_SENHA", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://db.example"); vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "publica-ficticia"); vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "segredo-ficticio"); vi.stubEnv("TURNSTILE_SECRET", "captcha-ficticio"); vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "site-ficticio"); vi.stubEnv("HMAC_SEGREDO", "h".repeat(32)); vi.stubEnv("MODO_PUBLICACAO", "");
  for (const nome of ["LIMITE_REGISTRO_MAXIMO", "LIMITE_ACOMPANHAR_MAXIMO", "LIMITE_EXCLUIR_MAXIMO", "LIMITE_JANELA_SEGUNDOS", "TRIAGEM_JANELA_SEGUNDOS", "TRIAGEM_LIMITE_ORIGEM"]) vi.stubEnv(nome, "5");
  vi.stubGlobal("fetch", async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input); const body = init?.body ? JSON.parse(String(init.body)) : {};
    chamadas.push({ url, body });
    if (falha && url.includes(falha)) return Response.json({ code: falha === "registrar_ocorrencia" ? "22023" : "XX000", message: "segredo IP token texto privado" }, { status: 500 });
    if (url.includes("siteverify")) return Response.json({ success: respostaCaptcha });
    if (url.includes("/municipios?") || url.includes("/categorias?")) return Response.json([{ id: 1, slug: url.includes("municipios") ? "anapolis" : "saude" }]);
    if (url.endsWith("consumir_limite")) return Response.json(limite);
    if (url.endsWith("triagem_sinais")) return Response.json([{ out_texto_repetido: false, out_origem_sinalizada: false }]);
    if (url.endsWith("registrar_ocorrencia")) return Response.json([{ out_id: dados.out_id, out_protocolo: dados.out_protocolo, out_repetida: repetida }]);
    if (url.endsWith("acompanhar_por_token")) return Response.json(resultadoAcompanhar);
    if (url.endsWith("solicitar_exclusao_por_token")) return Response.json([]);
    throw new Error("fetch não previsto");
  });
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("registro HTTP", () => {
  it("registra anônimo e devolve somente protocolo e confirmação sem cache", async () => {
    const r = await registrar(request()); expect(r.status).toBe(201); expect(await r.json()).toEqual({ protocolo: dados.out_protocolo, confirmacao: "Relato recebido." }); expect(r.headers.get("cache-control")).toBe("no-store");
    const rpc = chamadas.find(c => c.url.endsWith("registrar_ocorrencia"))!;
    expect(rpc.body).toMatchObject({ p_anonimo: true, p_nome: null, p_whatsapp: null, p_token_hash: "\\x" + entrada.token_hash, p_chave_idempotencia: entrada.chave_idempotencia, p_moderacao: "pendente" });
    expect(JSON.stringify(rpc.body)).not.toContain(token);
  });
  it("retorna o mesmo protocolo em retry e não ecoa conflito de token", async () => {
    const inicial = await registrar(request());
    expect(inicial.status).toBe(201);
    const primeiro = await inicial.json();
    repetida = true;
    const replay = await registrar(request());
    expect(replay.status).toBe(201);
    expect((await replay.json()).protocolo).toBe(primeiro.protocolo);
    falha = "registrar_ocorrencia"; const r = await registrar(request({ ...entrada, token_hash: "b".repeat(64) })); expect(r.status).toBe(409); expect(JSON.stringify(await r.json())).not.toContain(dados.out_protocolo);
  });
  it.each(["municipio", "categoria"])("recusa campo obrigatório ausente: %s", async campo => {
    const corpo: Record<string, unknown> = { ...entrada }; delete corpo[campo];
    expect((await registrar(request(corpo))).status).toBe(422); expect(chamadas).toHaveLength(0);
  });
  it("transporta HTML somente como texto no RPC e mantém revisão", async () => {
    const descricao = "<script>alert('conteúdo')</script> no relato da praça.";
    expect((await registrar(request({ ...entrada, descricao }))).status).toBe(201);
    expect(chamadas.find(c => c.url.endsWith("registrar_ocorrencia"))!.body).toMatchObject({ p_descricao: descricao, p_moderacao: "pendente" });
  });
  it.each(["", "development"])("recusa Vercel fora de preview: %s", async ambiente => {
    vi.stubEnv("VERCEL", "1"); vi.stubEnv("VERCEL_ENV", ambiente);
    vi.stubEnv("ACESSO_STAGING_USUARIO", "teste"); vi.stubEnv("ACESSO_STAGING_SENHA", "teste");
    expect((await registrar(request(entrada, { "x-forwarded-for": "192.0.2.1" }))).status).toBe(503);
    expect(chamadas).toHaveLength(0);
  });
  it("recusa captcha antes de criar", async () => { respostaCaptcha = false; expect((await registrar(request())).status).toBe(422); expect(chamadas.some(c => c.url.endsWith("registrar_ocorrencia"))).toBe(false); });
  it("recusa limite excedido antes de criar", async () => { limite = false; expect((await registrar(request())).status).toBe(429); expect(chamadas.some(c => c.url.endsWith("registrar_ocorrencia"))).toBe(false); });
  it("recusa publicação automática antes de qualquer rede", async () => {
    vi.stubEnv("MODO_PUBLICACAO", "texto_automatico");
    expect((await registrar(request())).status).toBe(503);
    expect(chamadas).toHaveLength(0);
  });
  it.each(["", "production", "staging"])("recusa ambiente sem opt-in fictício: %s", async ambiente => {
    vi.stubEnv("AMBIENTE_REGISTRO", ambiente);
    expect((await registrar(request())).status).toBe(503); expect(chamadas).toHaveLength(0);
  });
  it("bloqueia produção Vercel mesmo com opt-in e credenciais", async () => {
    vi.stubEnv("VERCEL", "1"); vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("ACESSO_STAGING_USUARIO", "teste"); vi.stubEnv("ACESSO_STAGING_SENHA", "teste");
    expect((await registrar(request(entrada, { "x-forwarded-for": "192.0.2.1" }))).status).toBe(503);
    expect(chamadas).toHaveLength(0);
  });
  it("preview produtivo exige credenciais de staging e mantém revisão", async () => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("VERCEL", "1"); vi.stubEnv("VERCEL_ENV", "preview");
    const req = () => new Request("https://preview.example/api/registrar", { method: "POST", headers: { origin: "https://preview.example", "content-type": "application/json", "x-forwarded-for": "192.0.2.1" }, body: JSON.stringify(entrada) });
    expect((await registrar(req())).status).toBe(503); expect(chamadas).toHaveLength(0);
    vi.stubEnv("ACESSO_STAGING_USUARIO", "teste");
    expect((await registrar(req())).status).toBe(503); expect(chamadas).toHaveLength(0);
    vi.stubEnv("ACESSO_STAGING_SENHA", "teste");
    expect((await registrar(req())).status).toBe(201);
    expect(chamadas.find(c => c.url.endsWith("registrar_ocorrencia"))!.body.p_moderacao).toBe("pendente");
  });
  it.each(["https://outro.example", "https://localhost.evil", "http://localhost", "null", ""])('recusa origem %s sem rede', async origin => { expect((await registrar(request(entrada, { origin }))).status).toBe(403); expect(chamadas).toHaveLength(0); });
  it("recusa JSON, tipo e corpo gigante sem rede", async () => {
    expect((await registrar(request("{"))).status).toBe(400); expect((await registrar(request(entrada, { "content-type": "text/plain" }))).status).toBe(400);
    expect((await registrar(request("x".repeat(30000)))).status).toBe(413); expect((await registrar(request(entrada, { "content-length": "9999999" }))).status).toBe(413); expect(chamadas).toHaveLength(0);
  });
  it("recusa campos desconhecidos, Unicode inválido e slugs hostis", async () => { for (const body of [{ ...entrada, moderacao: "publicado" }, { ...entrada, descricao: entrada.descricao + "\u202e" }, { ...entrada, municipio: "x,or(id.gt.0)" }]) expect((await registrar(request(body))).status).toBe(422); expect(chamadas).toHaveLength(0); });
  it("ignora XFF forjado fora da Vercel e valida IP quando confia na plataforma", async () => {
    await registrar(request(entrada, { "x-forwarded-for": "192.0.2.1" })); const a = chamadas.find(c => c.url.endsWith("consumir_limite"))!.body.p_chave; chamadas = [];
    await registrar(request(entrada, { "x-forwarded-for": "192.0.2.2" })); expect(chamadas.find(c => c.url.endsWith("consumir_limite"))!.body.p_chave).toBe(a);
    vi.stubEnv("VERCEL", "1"); vi.stubEnv("VERCEL_ENV", "preview"); vi.stubEnv("ACESSO_STAGING_USUARIO", "teste"); vi.stubEnv("ACESSO_STAGING_SENHA", "teste"); expect((await registrar(request(entrada, { "x-forwarded-for": "forjado" }))).status).toBe(503);
    expect((await registrar(request(entrada, { "x-forwarded-for": "192.0.2.1" }))).status).toBe(201);
  });
  it("permite npm start local com bucket único e fecha runtime produtivo genérico", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const externo = new Request("https://externo.example/api/registrar", { method: "POST", headers: { origin: "https://externo.example", "content-type": "application/json" }, body: JSON.stringify(entrada) });
    expect((await registrar(externo)).status).toBe(503); expect(chamadas).toHaveLength(0);
    const local = new Request("http://localhost:3000/api/registrar", { method: "POST", headers: { origin: "http://localhost:3000", "content-type": "application/json", "x-forwarded-for": "forjado" }, body: JSON.stringify(entrada) });
    expect((await registrar(local)).status).toBe(201);
  });
  it("falha fechado sem env e sem ecoar falha do banco/fetch", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", ""); expect((await registrar(request())).status).toBe(503); expect(chamadas).toHaveLength(0);
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "ficticio"); falha = "triagem_sinais"; const r = await registrar(request()); expect(r.status).toBe(503); expect(JSON.stringify(await r.json())).not.toMatch(/segredo|IP|token texto/);
    vi.stubGlobal("fetch", async () => { throw new Error("segredo"); }); expect((await registrar(request())).status).toBe(503);
  });
  it("não usa User-Agent para permitir troca de chave de limite", async () => {
    await registrar(request(entrada, { "user-agent": "primeiro" })); const a = chamadas.find(c => c.url.endsWith("consumir_limite"))!.body.p_chave; chamadas = [];
    await registrar(request(entrada, { "user-agent": "outro" })); expect(chamadas.find(c => c.url.endsWith("consumir_limite"))!.body.p_chave).toBe(a);
  });
  it("recusa referência desconhecida e impede slug hostil antes da rede", async () => {
    const config = configServidor(); await expect(resolverReferencia("municipios", "x,or(id.gt.0)", config)).rejects.toThrow(); expect(chamadas).toHaveLength(0);
    vi.stubGlobal("fetch", async () => Response.json([])); await expect(resolverReferencia("municipios", "inexistente", config)).rejects.toThrow("Confira os campos");
  });
  it("resolve referência com papel público, select explícito e filtro codificado", async () => {
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      expect(new Headers(init.headers).get("authorization")).toBe("Bearer publica-ficticia");
      expect(String(url)).toContain("select=id%2Cslug"); expect(String(url)).toContain("slug=eq.anapolis"); expect(init.cache).toBe("no-store");
      return Response.json([{ id: 1, slug: "anapolis" }]);
    });
    expect(await resolverReferencia("municipios", "anapolis", configServidor())).toBe(1);
  });
  it("log sanitizado não inclui corpo, token, IP ou erro externo", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {}); falha = "triagem_sinais"; await registrar(request());
    expect(log).toHaveBeenCalledOnce(); expect(JSON.parse(log.mock.calls[0][0])).toMatchObject({ evento: "falha_operacao", operacao: "registrar", codigo: "indisponivel" });
    expect(log.mock.calls.flat().join()).not.toMatch(/segredo|192\.0|captcha-teste|Posto sem atendimento|token texto/);
  });
});
describe("acompanhamento e exclusão", () => {
  it.each([undefined, "", "x".repeat(44)])("credencial ausente ou malformada mantém resposta neutra e privada: %s", async valor => {
    const r = await acompanhar(request(valor === undefined ? {} : { token: valor }, {}, "acompanhar"));
    expect(r.status).toBe(404);
    expect(r.headers.get("cache-control")).toBe("no-store");
    expect(r.headers.get("referrer-policy")).toBe("no-referrer");
    expect(chamadas).toHaveLength(0);
  });
  it("sucesso e replay privados não ecoam segredo nem habilitam cache", async () => {
    for (let tentativa = 0; tentativa < 2; tentativa++) {
      const r = await acompanhar(request({ token }, {}, "acompanhar"));
      expect(r.status).toBe(200);
      expect(r.headers.get("cache-control")).toBe("no-store");
      expect(JSON.stringify(await r.json())).not.toContain(token);
    }
    expect(JSON.stringify(chamadas)).not.toContain(token);
  });
  it("limita exclusão antes do RPC e sanitiza logs de falha privada", async () => {
    limite = false;
    const r = await excluir(request({ token, confirmacao: true }, {}, "excluir"));
    expect(r.status).toBe(429);
    expect(r.headers.get("cache-control")).toBe("no-store");
    expect(chamadas.some(c => c.url.endsWith("solicitar_exclusao_por_token"))).toBe(false);
    limite = true; falha = "acompanhar_por_token";
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await acompanhar(request({ token }, {}, "acompanhar"))).status).toBe(503);
    expect(log).toHaveBeenCalledOnce();
    expect(log.mock.calls.flat().join()).not.toMatch(new RegExp(`${token}|segredo IP|texto privado`));
  });
  it("hasheia o segredo do POST e devolve DTO sem id/hash", async () => {
    const r = await acompanhar(request({ token }, {}, "acompanhar")); expect(r.status).toBe(200); const dto = await r.json(); expect(dto.protocolo).toBe(dados.out_protocolo); expect(dto.atualizacoes).toEqual([]); expect(dto.respostas).toEqual([]); expect(dto).not.toHaveProperty("id");
    expect(chamadas.find(c => c.url.endsWith("acompanhar_por_token"))!.body.p_token_hash).toMatch(/^\\x[a-f0-9]{64}$/);
  });
  it("responde a formato inválido e token inexistente com mesma mensagem", async () => {
    const a = await acompanhar(request({ token: "invalido" }, {}, "acompanhar")); resultadoAcompanhar = []; const b = await acompanhar(request({ token }, {}, "acompanhar")); expect(a.status).toBe(404); expect(b.status).toBe(404); expect(await a.json()).toEqual(await b.json());
  });
  it("exige confirmação para excluir e usa somente hash", async () => {
    expect((await excluir(request({ token, confirmacao: false }, {}, "excluir"))).status).toBe(422);
    const r = await excluir(request({ token, confirmacao: true }, {}, "excluir")); expect(r.status).toBe(200); expect(await r.json()).toEqual({ confirmacao: "Exclusão concluída." }); expect(chamadas.find(c => c.url.endsWith("solicitar_exclusao_por_token"))!.body.p_apagar_conteudo).toBe(true);
  });
  it("mantém mensagem neutra ao excluir com token malformado", async () => {
    const r = await excluir(request({ token: "invalido", confirmacao: true }, {}, "excluir")); expect(r.status).toBe(404); expect((await r.json()).erro.codigo).toBe("token_invalido");
  });
  it("nega consulta/exclusão cross-origin, limita consulta e não aceita segredo em query", async () => {
    expect((await acompanhar(request({ token }, { origin: "https://outro.example" }, "acompanhar"))).status).toBe(403);
    expect((await excluir(request({ token, confirmacao: true }, { origin: "null" }, "excluir"))).status).toBe(403);
    limite = false; expect((await acompanhar(request({ token }, {}, "acompanhar"))).status).toBe(429);
    const r = new Request(`https://localhost/api/acompanhar?token=${token}`, { method: "POST", headers: { origin: "https://localhost", "content-type": "application/json" }, body: JSON.stringify({ token }) }); expect((await acompanhar(r)).status).toBe(404);
  });
});
