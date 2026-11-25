// Interruptor dos dados FICTÍCIOS (gerados). Um único sistema, igual em qualquer ambiente: os relatos
// gerados ficam no mesmo banco dos reais (coluna `gerado`, migração 027) e o interruptor só decide se o
// site os pede ao banco (cabeçalho x-modo-gerados).
//
// Desligado por padrão. A sessão de demonstração é iniciada pelo formulário em /demonstracao.
export const COOKIE_ADMIN = "obs_admin";
export const COOKIE_FICTICIOS = "obs_ficticios";
export const DURACAO_COOKIE_SEGUNDOS = 12 * 60 * 60;
export const CABECALHO_GERADOS = "x-modo-gerados";

export type Modo = {
  /** Mostrar também os relatos gerados (fictícios). */
  gerados: boolean;
  /** Quem vê a faixa com o interruptor (admin válido). */
  alternavel: boolean;
};

/** Segredo válido (16+ caracteres) ou null: sem segredo o interruptor fica indisponível. */
export function segredoAdmin(env: Record<string, string | undefined> = process.env): string | null {
  const s = env.MODO_ADMIN_SEGREDO?.trim();
  return s && s.length >= 16 ? s : null;
}

/** Tempo constante em relação ao conteúdo. */
export function compararSeguro(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

/** Valor do cookie de admin: HMAC-SHA256(segredo, rótulo) em hexadecimal; o segredo nunca vai ao navegador. */
export async function tokenAdmin(segredo: string): Promise<string> {
  const enc = new TextEncoder();
  const chave = await crypto.subtle.importKey("raw", enc.encode(segredo), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const assinatura = await crypto.subtle.sign("HMAC", chave, enc.encode("observatorio-modo-admin-v1"));
  return Array.from(new Uint8Array(assinatura), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function adminValido(cookieAdmin: string | undefined, env: Record<string, string | undefined> = process.env): Promise<boolean> {
  const segredo = segredoAdmin(env);
  if (!segredo || !cookieAdmin) return false;
  return compararSeguro(cookieAdmin, await tokenAdmin(segredo));
}

export async function resolverModo(
  cookies: { admin?: string; ficticios?: string },
  env: Record<string, string | undefined> = process.env,
): Promise<Modo> {
  const admin = await adminValido(cookies.admin, env);
  return { gerados: admin && cookies.ficticios === "1", alternavel: admin };
}
