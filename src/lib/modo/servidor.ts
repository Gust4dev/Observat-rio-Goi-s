import "server-only";
import { cookies } from "next/headers";
import { COOKIE_ADMIN, COOKIE_FICTICIOS, resolverModo, type Modo } from "./modo";

/** Lê o interruptor da requisição. Dinâmico: chamar sempre sob <Suspense> (Cache Components). */
export async function modoAtual(): Promise<Modo> {
  const c = await cookies();
  return resolverModo({ admin: c.get(COOKIE_ADMIN)?.value, ficticios: c.get(COOKIE_FICTICIOS)?.value });
}
