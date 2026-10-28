import { tokenSchema } from "@/lib/registro/token";

export type CorpoRegistroEntrada = {
  municipio: string;
  categoria: string;
  titulo: string;
  descricao: string;
  tokenHash: string;
  chaveIdempotencia: string;
  turnstile: string;
};

export type CorpoRegistro = Omit<CorpoRegistroEntrada, "tokenHash" | "chaveIdempotencia"> & {
  token_hash: string;
  chave_idempotencia: string;
};

export function criarCorpoRegistro(dados: CorpoRegistroEntrada): CorpoRegistro {
  return {
    municipio: dados.municipio,
    categoria: dados.categoria,
    titulo: dados.titulo,
    descricao: dados.descricao,
    token_hash: dados.tokenHash,
    chave_idempotencia: dados.chaveIdempotencia,
    turnstile: dados.turnstile,
  };
}

export function criarLinkPrivado(base: string, token: string): string {
  const valido = tokenSchema.parse(token);
  const url = new URL("/acompanhar", base);
  url.hash = valido;
  return url.toString();
}

export function tokenDoFragmento(fragmento: string): string | null {
  const token = fragmento.startsWith("#") ? fragmento.slice(1) : "";
  const resultado = tokenSchema.safeParse(token);
  return resultado.success ? resultado.data : null;
}

export function permiteEditarAposErro(codigo: string | undefined): boolean {
  return codigo === "entrada_invalida";
}
