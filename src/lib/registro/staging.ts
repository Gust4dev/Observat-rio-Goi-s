import { ErroRegistro } from "./erros";
/** Gate temporário até aprovação jurídica/operacional: apenas dados fictícios em revisão. */
export function exigirStaging(request: Request) {
  if (process.env.AMBIENTE_REGISTRO !== "staging_ficticio" || process.env.VERCEL_ENV === "production") throw new ErroRegistro("indisponivel");
  if (process.env.VERCEL === "1") {
    if (process.env.VERCEL_ENV !== "preview" || !process.env.ACESSO_STAGING_USUARIO?.trim() || !process.env.ACESSO_STAGING_SENHA?.trim()) throw new ErroRegistro("indisponivel");
  } else if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(request.url).hostname)) throw new ErroRegistro("indisponivel");
}
