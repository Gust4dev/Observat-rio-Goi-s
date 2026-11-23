import { afterEach, expect, it, vi } from "vitest";
import { limparImagens } from "./limpeza-imagens.mjs";
import { GET } from "../../app/api/cron/limpar-quarentena/route";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it("limpeza repetida é idempotente depois de apagar os órfãos", async () => {
  const caminhoPrivado = `${"a".repeat(64)}/1/${"b".repeat(64)}.jpg`;
  const caminhoPublico = "11111111-1111-4111-8111-111111111111.jpg";
  const objetos = new Map([
    ["imagens-quarentena", new Set([caminhoPrivado])],
    ["imagens-publicas", new Set([caminhoPublico])],
  ]);
  const criado = "2026-10-01T00:00:00Z";
  const transportar = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    if (url.pathname.includes("/object/list/")) {
      const bucket = url.pathname.endsWith("imagens-quarentena") ? "imagens-quarentena" : "imagens-publicas";
      const prefix = JSON.parse(String(init?.body)).prefix as string;
      const paths = [...objetos.get(bucket)!].filter(path => path.startsWith(prefix));
      const rows = paths.map(path => ({
        name: path.slice(prefix ? prefix.length + 1 : 0),
        id: path.endsWith(".jpg") ? "object-id" : null,
        created_at: criado,
      }));
      return Response.json(rows);
    }
    if (url.pathname === "/rest/v1/imagens") return Response.json([]);
    if (init?.method === "DELETE") {
      const bucket = url.pathname.endsWith("imagens-quarentena") ? "imagens-quarentena" : "imagens-publicas";
      const [path] = JSON.parse(String(init.body)).prefixes as string[];
      objetos.get(bucket)!.delete(path);
      return Response.json([]);
    }
    throw new Error(`Unexpected request ${url.pathname}`);
  };

  const base = "https://staging.example.supabase.co";
  const key = "sb_secret_test";
  const now = Date.parse("2026-10-31T00:00:00Z");
  const primeira = await limparImagens({ base, key, apply: true, now, fetch: transportar });
  const segunda = await limparImagens({ base, key, apply: true, now, fetch: transportar });

  expect(primeira).toMatchObject({ candidates: 2, removed: 2, dryRun: false });
  expect(segunda).toMatchObject({ candidates: 0, removed: 0, dryRun: false });
});

it("User-Agent de cron não substitui Bearer e Bearer funciona sem marcador de origem", async () => {
  vi.stubEnv("CRON_SECRET", "segredo-cron-de-teste");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://staging.example.supabase.co");
  vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_test");
  const fetch = vi.fn().mockImplementation(async () => Response.json([]));
  vi.stubGlobal("fetch", fetch);

  const semBearer = await GET(new Request("https://app.example/api/cron/limpar-quarentena", {
    headers: { "user-agent": "vercel-cron/1.0" },
  }));
  const bearerErrado = await GET(new Request("https://app.example/api/cron/limpar-quarentena", {
    headers: { "user-agent": "vercel-cron/1.0", authorization: "Bearer errado" },
  }));
  expect(semBearer.status).toBe(401);
  expect(bearerErrado.status).toBe(401);
  expect(fetch).not.toHaveBeenCalled();

  const bearerCorreto = await GET(new Request("https://app.example/api/cron/limpar-quarentena", {
    headers: { authorization: "Bearer segredo-cron-de-teste" },
  }));
  expect(bearerCorreto.status).toBe(200);
  expect(fetch).toHaveBeenCalledTimes(2);
});
