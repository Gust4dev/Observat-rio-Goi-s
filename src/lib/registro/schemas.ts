import { z } from "zod";
import { tokenSchema } from "./token";

export const LIMITE_TITULO = 120;
export const LIMITE_DESCRICAO = 4000;

function unicodeValido(texto: string): boolean {
  for (const c of texto) {
    const p = c.codePointAt(0)!;
    if ((p < 32 && p !== 9 && p !== 10 && p !== 13) || (p >= 127 && p <= 159)
      || (p >= 0xd800 && p <= 0xdfff) || (p >= 0xfdd0 && p <= 0xfdef)
      || (p & 0xffff) >= 0xfffe || (p >= 0x202a && p <= 0x202e)
      || (p >= 0x2066 && p <= 0x2069)) return false;
  }
  return true;
}

function texto(minimo: number, maximo: number, mensagem: string) {
  return z.string().refine(unicodeValido, "Confira os caracteres deste campo.")
    .transform((v) => v.trim().normalize("NFC").replace(/\r\n?/g, "\n"))
    .refine((v) => Array.from(v).length >= minimo && Array.from(v).length <= maximo, mensagem);
}

const slug = z.string().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const tokenHashSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const chaveIdempotenciaSchema = z.uuid();

export const registroSchema = z.strictObject({
  municipio: slug,
  categoria: slug,
  titulo: texto(5, LIMITE_TITULO, "Escreva um título de 5 a 120 caracteres.").refine((v) => !/[\r\n\t]/.test(v), "Escreva o título em uma linha."),
  descricao: texto(20, LIMITE_DESCRICAO, "Conte o que está acontecendo em 20 a 4000 caracteres."),
  token_hash: tokenHashSchema,
  chave_idempotencia: chaveIdempotenciaSchema,
  turnstile: z.string().min(1).max(2048),
});
export const acompanharSchema = z.strictObject({ token: tokenSchema });
export const excluirSchema = z.strictObject({ token: tokenSchema, confirmacao: z.literal(true) });
export type EntradaRegistro = z.infer<typeof registroSchema>;
