import { ErroRegistro } from "./erros";
import { supabaseProjectRef } from "../supabase-origin";

/** Gate de escrita: staging fictício ou beta textual Production explicitamente ativada. */
export function exigirStaging(request: Request) {
  if (process.env.VERCEL_ENV === "production") {
    const ref = supabaseProjectRef(process.env.NEXT_PUBLIC_SUPABASE_URL);
    const refEsperada = process.env.SUPABASE_PRODUCTION_PROJECT_REF?.trim();
    const betaTextualSegura = process.env.BETA_REGISTRO_TEXTUAL_ATIVA === "true"
      && process.env.AMBIENTE_REGISTRO === "production"
      && process.env.MODO_PUBLICACAO === "moderar_tudo"
      && process.env.FOTOS_HABILITADAS !== "true"
      && Boolean(ref && refEsperada && ref === refEsperada);
    if (!betaTextualSegura) throw new ErroRegistro("indisponivel");
    return;
  }

  if (process.env.AMBIENTE_REGISTRO !== "staging_ficticio") throw new ErroRegistro("indisponivel");
  if (process.env.VERCEL === "1") {
    if (process.env.VERCEL_ENV !== "preview" || !process.env.ACESSO_STAGING_USUARIO?.trim() || !process.env.ACESSO_STAGING_SENHA?.trim()) throw new ErroRegistro("indisponivel");
  } else if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(request.url).hostname)) throw new ErroRegistro("indisponivel");
}
