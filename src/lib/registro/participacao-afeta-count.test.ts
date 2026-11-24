import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { POST } from "@/app/api/afeta/route";

const { revalidateTag } = vi.hoisted(() => ({ revalidateTag: vi.fn() }));
vi.mock("next/cache", () => ({ revalidateTag }));

const id = "7419b75e-86a9-4e4a-8a1a-9fb13f701a1e";
const confirmacao = "Confirmação recebida.";
const consulta = vi.fn();
const confirmar = vi.fn();
const consumirLimite = vi.fn();

function enviar() {
  return POST(new Request("https://localhost/api/afeta", {
    method: "POST",
    headers: { origin: "https://localhost", "content-type": "application/json" },
    body: JSON.stringify({ ocorrencia_id: id, turnstile: "teste" }),
  }));
}

beforeEach(() => {
  revalidateTag.mockReset();
  consulta.mockReset().mockImplementation(() => Response.json([{ confirmacoes_total: 7 }]));
  confirmar.mockReset().mockImplementation(() => Response.json(true));
  consumirLimite.mockReset().mockImplementation(() => Response.json(true));
  for (const [nome, valor] of Object.entries({
    NODE_ENV: "test", VERCEL: "", VERCEL_ENV: "",
    AMBIENTE_REGISTRO: "staging_ficticio", MODO_PUBLICACAO: "moderar_tudo",
    AFETA_HABILITADO: "true", LIMITE_AFETA_MAXIMO: "5",
    NEXT_PUBLIC_SUPABASE_URL: "https://db.example",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
    SUPABASE_SECRET_KEY: "sb_secret_test",
    TURNSTILE_SECRET: "captcha-ficticio", NEXT_PUBLIC_TURNSTILE_SITE_KEY: "site-ficticio",
    HMAC_SEGREDO: "h".repeat(32),
    LIMITE_FOTO_MAXIMO: "5", LIMITE_REGISTRO_MAXIMO: "5", LIMITE_ACOMPANHAR_MAXIMO: "5",
    LIMITE_EXCLUIR_MAXIMO: "5", LIMITE_JANELA_SEGUNDOS: "5",
    TRIAGEM_JANELA_SEGUNDOS: "5", TRIAGEM_LIMITE_ORIGEM: "5",
  })) vi.stubEnv(nome, valor);
  vi.stubGlobal("fetch", async (entrada: string | URL, init?: RequestInit) => {
    const url = new URL(entrada);
    switch (url.pathname) {
      case "/turnstile/v0/siteverify": return Response.json({ success: true });
      case "/rest/v1/rpc/consumir_limite": return consumirLimite();
      case "/rest/v1/rpc/registrar_confirmacao": return confirmar();
      case "/rest/v1/v_ocorrencias_publicas": return consulta(url, init);
      default: throw new Error("Recurso inesperado");
    }
  });
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

it("retorna o mesmo total público no retry e invalida a tag somente após inserir", async () => {
  confirmar.mockImplementationOnce(() => Response.json(true)).mockImplementationOnce(() => Response.json(false));

  const primeiro = await enviar();
  const retry = await enviar();
  for (const resposta of [primeiro, retry]) {
    expect(resposta.status).toBe(202);
    expect(await resposta.json()).toEqual({ confirmacao, confirmacoes_total: 7 });
  }
  expect(revalidateTag).toHaveBeenCalledExactlyOnceWith(`problema:${id}`, { expire: 0 });
  expect(consulta).toHaveBeenCalledTimes(2);
  for (const [url, init] of consulta.mock.calls) {
    expect(url.searchParams.get("id")).toBe(`eq.${id}`);
    expect(url.searchParams.get("select")).toBe("confirmacoes_total");
    expect(init).toMatchObject({ method: "GET", cache: "no-store", headers: { apikey: "sb_publishable_test" } });
  }
});

it("preserva o aceite e omite o total quando a leitura do agregado falha", async () => {
  consulta.mockRejectedValueOnce(new Error("leitura indisponível"));
  const resposta = await enviar();
  expect(resposta.status).toBe(202);
  expect(await resposta.json()).toEqual({ confirmacao });
  expect(revalidateTag).toHaveBeenCalledExactlyOnceWith(`problema:${id}`, { expire: 0 });
});

it.each([429, 409])("preserva o cache e dispensa a consulta do total após HTTP %s", async status => {
  if (status === 429) consumirLimite.mockImplementationOnce(() => Response.json(false));
  else confirmar.mockImplementationOnce(() => Response.json({ code: "22023" }, { status: 400 }));
  expect((await enviar()).status).toBe(status);
  expect(revalidateTag).not.toHaveBeenCalled();
  expect(consulta).not.toHaveBeenCalled();
});
