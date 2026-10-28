import "server-only";
import { createHash, createHmac } from "node:crypto";

export function hashSha256(texto: string): string {
  return createHash("sha256").update(texto, "utf8").digest("hex");
}

export function hmacSha256(segredo: string, texto: string): string {
  return createHmac("sha256", segredo).update(texto, "utf8").digest("hex");
}

/** Recebe o endereço já validado de um proxy confiável. Nunca persiste IP/UA. */
export function hmacOrigem(segredo: string, endereco: string, agente: string): string {
  return hmacSha256(segredo, JSON.stringify(["origem-v1", endereco, agente]));
}

export function chaveLimite(segredo: string, endpoint: "registrar" | "acompanhar" | "excluir" | "foto", origemHash: string): string {
  return hmacSha256(segredo, JSON.stringify(["limite-v1", endpoint, origemHash]));
}

export function bytea(hash: string): string {
  if (!/^[a-f0-9]{64}$/.test(hash)) throw new Error("Hash inválido");
  return `\\x${hash}`;
}
