import { z } from "zod";

// 32 bytes em base64url sem padding. Os bits não usados precisam ser zero.
export const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/);

export function gerarToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** O segredo permanece no navegador; somente este SHA-256 vai ao registro. */
export async function hashToken(token: string): Promise<string> {
  const valido = tokenSchema.parse(token);
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(valido));
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
