import { z } from "zod";
import { TIMESTAMP_RE } from "./schemas";

// Parâmetro de URL é entrada hostil: valor inválido vira padrão, nunca exceção.

/** Tamanho de página fixo; nunca vem da URL. */
export const TAMANHO_PAGINA = 20;
export const TAMANHO_PAGINA_MAXIMO = 50;

export const SLUG_RE = /^[a-z0-9-]{1,80}$/;
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const primeiro = (v: unknown) => (Array.isArray(v) ? v[0] : v);

export const slugSchema = z.string().regex(SLUG_RE);
const slugOpcional = z.preprocess(primeiro, slugSchema.optional().catch(undefined));

export const idSchema = z.string().regex(UUID_RE);

// ---------------------------------------------------------------- cursor opaco
export type Cursor = { t: string; id: string };

const cursorSchema = z.strictObject({
  t: z.string().regex(TIMESTAMP_RE),
  id: z.string().regex(UUID_RE),
});

const BASE64URL_RE = /^[A-Za-z0-9_-]{1,300}$/;

export function codificarCursor(c: Cursor): string {
  const valido = cursorSchema.parse(c);
  return Buffer.from(JSON.stringify({ t: valido.t, id: valido.id }), "utf8").toString("base64url");
}

/** Devolve null para qualquer coisa que não seja um cursor que NÓS emitimos (validação estrita). */
export function decodificarCursor(texto: unknown): Cursor | null {
  if (typeof texto !== "string" || !BASE64URL_RE.test(texto)) return null;
  try {
    const bruto: unknown = JSON.parse(Buffer.from(texto, "base64url").toString("utf8"));
    const r = cursorSchema.safeParse(bruto);
    return r.success ? { t: r.data.t, id: r.data.id } : null;
  } catch {
    return null;
  }
}

const cursorParam = z
  .preprocess(primeiro, z.string().optional().catch(undefined))
  .transform((v) => (v === undefined ? undefined : (decodificarCursor(v) ?? undefined)));

// ---------------------------------------------------------------- filtros da lista
export const filtrosSchema = z.object({
  municipio: slugOpcional,
  categoria: slugOpcional,
  cursor: cursorParam,
});
export type Filtros = { municipio?: string; categoria?: string; cursor?: Cursor };

export type SearchParamsBrutos = Record<string, string | string[] | undefined>;

/** Nunca lança. */
export function lerFiltros(sp: SearchParamsBrutos | undefined | null): Filtros {
  const r = filtrosSchema.safeParse(sp && typeof sp === "object" ? sp : {});
  if (!r.success) return {};
  const { municipio, categoria, cursor } = r.data;
  return { municipio, categoria, cursor };
}
