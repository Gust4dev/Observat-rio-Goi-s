import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { acompanharSchema, excluirSchema, registroSchema } from "./schemas";
import { gerarToken, hashToken, tokenSchema } from "./token";
import { bytea, chaveLimite, hashSha256, hmacOrigem, hmacSha256 } from "./seguranca";
import { ErroRegistro, respostaErro } from "./erros";
import { configServidor, rpc } from "./servidor";

const entrada = {
  municipio: "anapolis", categoria: "saude", titulo: "Posto sem atendimento",
  descricao: "O posto está sem atendimento desde a semana passada.",
  token_hash: "a".repeat(64), chave_idempotencia: "7419b75e-86a9-4e4a-8a1a-9fb13f701a1e",
  turnstile: "XXXX.DUMMY.TOKEN.XXXX",
};
const token = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("entrada do registro", () => {
  it("normaliza espaços externos e acentos sem interpretar HTML", () => {
    const r = registroSchema.parse({ ...entrada, titulo: "  Praça <script>  ", descricao: "  A praça está sem iluminac\u0327a\u0303o há várias semanas.  " });
    expect(r.titulo).toBe("Praça <script>");
    expect(r.descricao).toBe("A praça está sem iluminação há várias semanas.");
  });
  it.each(["nome", "whatsapp", "anonimo", "moderacao", "situacao", "fotos"])("recusa campo não previsto %s", (campo) => {
    expect(registroSchema.safeParse({ ...entrada, [campo]: "indevido" }).success).toBe(false);
  });
  it.each([
    { titulo: "abcd" }, { titulo: "a".repeat(121) }, { descricao: "curta" },
    { descricao: "a".repeat(4001) }, { municipio: "a,b)" }, { categoria: 3 },
    { token_hash: "B".repeat(64) }, { token_hash: "a".repeat(63) },
    { chave_idempotencia: "não-é-uuid" }, { turnstile: "" }, { turnstile: "a".repeat(2049) },
  ])("recusa formato/tamanho inválido %j", (invalida) => {
    expect(registroSchema.safeParse({ ...entrada, ...invalida }).success).toBe(false);
  });
  it.each(["\u0000", "\u202e", "\ud800", "\ufdd0", "\uffff"])("recusa Unicode de controle ou inválido", (c) => {
    expect(registroSchema.safeParse({ ...entrada, descricao: entrada.descricao + c }).success).toBe(false);
  });
  it("aceita Unicode válido e limites em pontos de código como PostgreSQL", () => {
    expect(registroSchema.safeParse({ ...entrada, titulo: "🙂".repeat(120), descricao: "Texto válido\ncom nova linha e tabulação\tpara leitura." }).success).toBe(true);
  });
  it("recusa quebra de linha no título e preserva a chave original da retentativa", () => {
    expect(registroSchema.safeParse({ ...entrada, titulo: "Título\nquebrado" }).success).toBe(false);
    expect(registroSchema.parse(entrada).chave_idempotencia).toBe("7419b75e-86a9-4e4a-8a1a-9fb13f701a1e");
  });
  it("recusa token sem confirmação ou campos de consulta desconhecidos", () => {
    expect(acompanharSchema.safeParse({ token, protocolo: "OG-26-X" }).success).toBe(false);
    expect(excluirSchema.safeParse({ token, confirmacao: false }).success).toBe(false);
    expect(excluirSchema.parse({ token, confirmacao: true })).toEqual({ token, confirmacao: true });
  });
});

describe("token e hashes", () => {
  it("gera 32 bytes aleatórios em base64url canônico sem padding", () => {
    const tokens = Array.from({ length: 20 }, () => gerarToken());
    expect(new Set(tokens).size).toBe(20);
    for (const t of tokens) {
      expect(tokenSchema.safeParse(t).success).toBe(true);
      expect(Buffer.from(t, "base64url")).toHaveLength(32);
    }
  });
  it.each(["", token + "=", token.slice(1), "A".repeat(42) + "B", "x/".repeat(22)])("recusa token não canônico", (t) => {
    expect(tokenSchema.safeParse(t).success).toBe(false);
  });
  it("SHA-256 do token é estável e só revela hexadecimal", async () => {
    expect(await hashToken(token)).toBe("0f007385b6f9d4b7eeb2748605afe1a984a0a3bfa3f014d09e2a784ce9e5cd1a");
    expect(hashSha256("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    await expect(hashToken("inválido")).rejects.toThrow();
  });
  it("HMAC usa segredo e separa origem de limite por endpoint", () => {
    expect(hmacSha256("key", "The quick brown fox jumps over the lazy dog")).toBe("f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8");
    const origem = hmacOrigem("segredo", "192.0.2.1", "browser");
    expect(origem).toMatch(/^[a-f0-9]{64}$/);
    expect(origem).not.toBe(hmacOrigem("outro", "192.0.2.1", "browser"));
    expect(origem).not.toBe(hmacOrigem("segredo", "192.0.2.2", "browser"));
    expect(chaveLimite("segredo", "registrar", origem)).not.toBe(chaveLimite("segredo", "acompanhar", origem));
    expect(chaveLimite("segredo", "registrar", origem)).not.toBe(origem);
    expect(hmacOrigem("segredo", "a|b", "c")).not.toBe(hmacOrigem("segredo", "a", "b|c"));
  });
  it("converte só hashes válidos para bytea sem permitir conteúdo arbitrário", () => {
    expect(bytea("a".repeat(64))).toBe("\\x" + "a".repeat(64));
    expect(() => bytea("abc")).toThrow();
  });
});

describe("erros públicos", () => {
  it("não ecoa erro desconhecido nem sua causa", async () => {
    const r = respostaErro(new Error("segredo-privado token IP texto"));
    expect(r.status).toBe(503);
    expect(await r.json()).toEqual({ erro: { codigo: "indisponivel", mensagem: "Não foi possível concluir agora. Tente novamente mais tarde." } });
    expect(r.headers.get("cache-control")).toBe("no-store");
  });
  it("mapeia erro tipado sem aceitar mensagem arbitrária", async () => {
    const r = respostaErro(new ErroRegistro("token_invalido"));
    expect(r.status).toBe(404);
    expect(await r.json()).toEqual({ erro: { codigo: "token_invalido", mensagem: "Não foi possível acessar este acompanhamento. Confira seu link privado." } });
  });
});

function ambiente() {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://exemplo.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "segredo-ficticio");
  vi.stubEnv("TURNSTILE_SECRET", "captcha-ficticio");
  vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "site-ficticio");
  vi.stubEnv("HMAC_SEGREDO", "h".repeat(32));
  for (const nome of ["LIMITE_REGISTRO_MAXIMO", "LIMITE_ACOMPANHAR_MAXIMO", "LIMITE_EXCLUIR_MAXIMO", "LIMITE_JANELA_SEGUNDOS", "TRIAGEM_JANELA_SEGUNDOS", "TRIAGEM_LIMITE_ORIGEM"]) vi.stubEnv(nome, "5");
}

describe("cliente de servidor", () => {
  it("lê as credenciais por nome composto no runtime e não aceita ausência de cada uma", () => {
    ambiente();
    expect(configServidor()).toMatchObject({ chave: "segredo-ficticio", turnstileSecret: "captcha-ficticio", hmacSegredo: "h".repeat(32) });
    for (const nome of ["SUPABASE_SERVICE_ROLE_KEY", "TURNSTILE_SECRET", "HMAC_SEGREDO"]) {
      ambiente(); vi.stubEnv(nome, "");
      expect(() => configServidor()).toThrow(ErroRegistro);
    }
  });
  it("falha fechado sem env e não informa nome ou valor ausente", () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    expect(() => configServidor()).toThrow(ErroRegistro);
    expect(() => configServidor()).toThrow("Não foi possível concluir agora.");
  });
  it("recusa URL inválida e modo de publicação desconhecido", () => {
    ambiente(); vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "file:///segredo");
    expect(() => configServidor()).toThrow(ErroRegistro);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://exemplo.supabase.co"); vi.stubEnv("MODO_PUBLICACAO", "publicar_tudo");
    expect(() => configServidor()).toThrow(ErroRegistro);
  });
  it("permite HTTP só no loopback em desenvolvimento", () => {
    ambiente(); vi.stubEnv("NODE_ENV", "development");
    for (const base of ["http://localhost:54321", "http://127.0.0.1:54321", "http://[::1]:54321"]) {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", base);
      expect(configServidor().base).toBe(base);
    }
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://externo.example");
    expect(() => configServidor()).toThrow(ErroRegistro);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321"); vi.stubEnv("NODE_ENV", "production");
    expect(() => configServidor()).toThrow(ErroRegistro);
  });
  it("default de publicação é moderar_tudo", () => {
    ambiente(); vi.stubEnv("MODO_PUBLICACAO", "");
    expect(configServidor().modoPublicacao).toBe("moderar_tudo");
  });
  it("limites anti-abuso precisam estar configurados com inteiros positivos", () => {
    ambiente(); vi.stubEnv("LIMITE_JANELA_SEGUNDOS", "");
    expect(() => configServidor()).toThrow(ErroRegistro);
    for (const valor of ["0", "-1", "1.5", "NaN"]) {
      vi.stubEnv("LIMITE_JANELA_SEGUNDOS", valor);
      expect(() => configServidor()).toThrow(ErroRegistro);
    }
  });
  it("envia parâmetros no corpo de RPC e valida resposta", async () => {
    ambiente();
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      expect(url).toBe("https://exemplo.supabase.co/rest/v1/rpc/consumir_limite");
      expect(init.method).toBe("POST");
      expect(init.cache).toBe("no-store");
      expect(JSON.parse(String(init.body))).toEqual({ p_chave: "\\x1234" });
      expect(new Headers(init.headers).get("authorization")).toBe("Bearer segredo-ficticio");
      return Response.json(true);
    });
    expect(await rpc("consumir_limite", { p_chave: "\\x1234" }, z.boolean())).toBe(true);
  });
  it("não inclui corpo do banco em erros, e preserva apenas SQLSTATE conhecido", async () => {
    ambiente();
    vi.stubGlobal("fetch", async () => Response.json({ code: "22023", message: "segredo token texto" }, { status: 400 }));
    await expect(rpc("registrar_ocorrencia", {}, z.unknown())).rejects.toMatchObject({ codigo: "conflito", sqlstate: "22023" });
    try { await rpc("registrar_ocorrencia", {}, z.unknown()); } catch (e) { expect(String(e)).not.toContain("segredo"); }
  });
  it("resposta malformada, rede e erro não conhecido viram indisponível", async () => {
    ambiente();
    for (const fetcher of [async () => Response.json("errado"), async () => { throw new Error("segredo"); }, async () => Response.json({ message: "segredo" }, { status: 500 })]) {
      vi.stubGlobal("fetch", fetcher);
      await expect(rpc("consumir_limite", {}, z.boolean())).rejects.toMatchObject({ codigo: "indisponivel" });
    }
  });
});
