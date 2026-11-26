import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { adminValido, COOKIE_ADMIN, segredoAdmin } from "@/lib/modo/modo";
const NOINDEX = "noindex, nofollow";

function comparar(a: string, b: string): boolean {
  // Tempo constante em relação ao conteúdo; o comprimento vaza, o que é aceitável aqui.
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  const n = Math.max(x.length, y.length);
  for (let i = 0; i < n; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

function responder(status: number, headers: Record<string, string> = {}) {
  return new NextResponse(null, {
    status,
    headers: { "X-Robots-Tag": NOINDEX, ...headers },
  });
}

function prosseguir() {
  const res = NextResponse.next();
  res.headers.set("X-Robots-Tag", NOINDEX);
  return res;
}

function credenciaisDe(request: NextRequest): [string, string] | null {
  const auth = request.headers.get("authorization");
  if (!auth || !auth.toLowerCase().startsWith("basic ")) return null;
  try {
    const bin = atob(auth.slice(6).trim());
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const texto = new TextDecoder().decode(bytes);
    const i = texto.indexOf(":");
    if (i < 0) return null;
    return [texto.slice(0, i), texto.slice(i + 1)];
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  // Vercel Cron sends Bearer CRON_SECRET; this exact handler verifies it itself.
  if (pathname === "/api/cron/limpar-quarentena") return prosseguir();

  if (process.env.VERCEL_ENV === "preview") {
    const usuario = process.env.ACESSO_STAGING_USUARIO;
    const senha = process.env.ACESSO_STAGING_SENHA;

    if (!usuario || !senha) {
      // Preview sem credenciais configuradas falha fechado.
      return responder(503);
    }

    const dadas = credenciaisDe(request);
    // Avalia as duas comparações sempre, sem curto-circuito.
    const okU = comparar(dadas?.[0] ?? "", usuario);
    const okS = comparar(dadas?.[1] ?? "", senha);
    if (!dadas || !(okU && okS)) {
      return responder(401, {
        "WWW-Authenticate": 'Basic realm="Ambiente de teste", charset="UTF-8"',
      });
    }
    return prosseguir();
  }

  // O código temporário só fecha Production enquanto o segredo de demonstração existir.
  if (process.env.VERCEL_ENV !== "production" || !segredoAdmin()) return prosseguir();

  // A tela de entrada valida o segredo; o cron autentica seu próprio Bearer.
  if (pathname === "/demonstracao" || pathname === "/api/demonstracao") return prosseguir();

  if (await adminValido(request.cookies.get(COOKIE_ADMIN)?.value)) return prosseguir();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: { code: "demo_required" } }, {
      status: 401,
      headers: { "Cache-Control": "no-store", "X-Robots-Tag": NOINDEX },
    });
  }

  if (pathname === "/") {
    return NextResponse.rewrite(new URL("/demonstracao", request.url), {
      headers: { "X-Robots-Tag": NOINDEX },
    });
  }

  return NextResponse.redirect(new URL("/", request.url), {
    status: 307,
    headers: { "X-Robots-Tag": NOINDEX },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
