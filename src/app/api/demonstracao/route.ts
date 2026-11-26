import { NextResponse, type NextRequest } from "next/server";
import {
  adminValido, compararSeguro, COOKIE_ADMIN, COOKIE_FICTICIOS, DURACAO_COOKIE_SEGUNDOS,
  segredoAdmin, tokenAdmin,
} from "@/lib/modo/modo";
import { origemDaRequisicao } from "@/lib/seguranca/origem";

const headers = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow",
};
const LIMITE_CORPO = 2048;

async function lerCorpo(request: Request): Promise<string | null> {
  if (!request.body) return "";
  const leitor = request.body.getReader();
  const caracteres = new TextDecoder();
  let total = 0;
  let corpo = "";
  try {
    while (true) {
      const { value, done } = await leitor.read();
      if (done) return corpo + caracteres.decode();
      total += value.byteLength;
      if (total > LIMITE_CORPO) {
        void leitor.cancel().catch(() => {});
        return null;
      }
      corpo += caracteres.decode(value, { stream: true });
    }
  } finally {
    leitor.releaseLock();
  }
}

export async function POST(request: NextRequest) {
  const origem = origemDaRequisicao(request);
  if (!origem || request.headers.get("origin") !== origem || request.headers.get("sec-fetch-site") === "cross-site") {
    return new NextResponse("Origem inválida.", { status: 403, headers });
  }
  if (request.headers.get("content-type")?.split(";")[0]?.trim() !== "application/x-www-form-urlencoded") {
    return new NextResponse("Formato inválido.", { status: 415, headers });
  }
  if (Number(request.headers.get("content-length")) > LIMITE_CORPO) {
    return new NextResponse("Formulário excede o limite.", { status: 413, headers });
  }

  let corpo: string | null;
  try { corpo = await lerCorpo(request); } catch {
    return new NextResponse("Formulário inválido.", { status: 400, headers });
  }
  if (corpo === null) return new NextResponse("Formulário excede o limite.", { status: 413, headers });

  const campos = new URLSearchParams(corpo);
  const acao = campos.get("acao");
  if (campos.getAll("acao").length !== 1 || !acao || !["entrar", "ligar", "desligar", "sair"].includes(acao)) {
    return new NextResponse("Ação inválida.", { status: 400, headers });
  }

  const redirect = () => NextResponse.redirect(new URL("/", origem), { status: 303, headers });
  const opcoes = {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: origem.startsWith("https:"),
    path: "/",
    maxAge: DURACAO_COOKIE_SEGUNDOS,
  };
  if (acao === "entrar") {
    const configurado = segredoAdmin();
    const enviado = campos.get("segredo");
    if (!configurado || !enviado || campos.getAll("segredo").length !== 1 || !compararSeguro(enviado, configurado)) {
      return redirect();
    }
    const res = redirect();
    res.cookies.set(COOKIE_ADMIN, await tokenAdmin(configurado), opcoes);
    res.cookies.set(COOKIE_FICTICIOS, "1", opcoes);
    return res;
  }

  if (!(await adminValido(request.cookies.get(COOKIE_ADMIN)?.value))) {
    return new NextResponse("Acesso indisponível.", { status: 403, headers });
  }
  const res = redirect();
  if (acao === "sair") {
    res.cookies.set(COOKIE_ADMIN, "", { ...opcoes, maxAge: 0 });
    res.cookies.set(COOKIE_FICTICIOS, "", { ...opcoes, maxAge: 0 });
  } else {
    res.cookies.set(COOKIE_FICTICIOS, acao === "ligar" ? "1" : "0", opcoes);
  }
  return res;
}
