import { criarLoggerRequisicao, type EstadoBanco } from "@/lib/observabilidade/logger";
import { resolveSupabaseKeys, supabaseApiHeaders } from "@/lib/supabase-keys.mjs";

async function verificarBanco(): Promise<EstadoBanco> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const { publicKey: chave } = resolveSupabaseKeys(process.env);
  if (!base || !chave) return "nao_configurado";

  try {
    const url = new URL(`${base.replace(/\/+$/, "")}/rest/v1/municipios?select=slug&limit=1`);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "indisponivel";
    const resposta = await fetch(url.toString(), {
      method: "HEAD",
      headers: supabaseApiHeaders(chave),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(3000),
    });
    return resposta.ok ? "ok" : "indisponivel";
  } catch {
    return "indisponivel";
  }
}

export async function GET(request: Request): Promise<Response> {
  const inicio = performance.now();
  const logger = criarLoggerRequisicao(request);
  const banco = await verificarBanco();
  const status = banco === "ok" ? 200 : 503;
  logger.registrar("saude.verificada", { status, banco, duracaoMs: performance.now() - inicio });
  return Response.json({ aplicacao: "ok", banco }, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
      "Referrer-Policy": "no-referrer",
      "X-Request-Id": logger.requestId,
    },
  });
}
