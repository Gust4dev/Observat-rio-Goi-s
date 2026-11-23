import { ErroRegistro } from "./erros";
import { supabaseProjectRef } from "../supabase-origin";

export function ambienteEscritaHabilitado(): boolean {
  if (process.env.VERCEL_ENV === "production") {
    const ref = supabaseProjectRef(process.env.NEXT_PUBLIC_SUPABASE_URL);
    const refEsperada = process.env.SUPABASE_PRODUCTION_PROJECT_REF?.trim();
    return process.env.BETA_REGISTRO_TEXTUAL_ATIVA === "true"
      && process.env.AMBIENTE_REGISTRO === "production"
      && process.env.MODO_PUBLICACAO === "moderar_tudo"
      && process.env.FOTOS_HABILITADAS !== "true"
      && Boolean(ref && refEsperada && ref === refEsperada);
  }

  return process.env.AMBIENTE_REGISTRO === "staging_ficticio"
    && (process.env.VERCEL !== "1" || (process.env.VERCEL_ENV === "preview"
      && Boolean(process.env.ACESSO_STAGING_USUARIO?.trim()) && Boolean(process.env.ACESSO_STAGING_SENHA?.trim())));
}

/** Gate de escrita: staging fictício ou beta textual Production explicitamente ativada. */
export function exigirStaging(request: Request) {
  if (!ambienteEscritaHabilitado()) throw new ErroRegistro("indisponivel");
  if (process.env.VERCEL_ENV !== "production" && process.env.VERCEL !== "1"
    && !["localhost", "127.0.0.1", "[::1]"].includes(new URL(request.url).hostname)) throw new ErroRegistro("indisponivel");
}

export function captchaRegistroObrigatorio(): boolean {
  return !(process.env.NODE_ENV === "production"
    && process.env.VERCEL === "1"
    && process.env.VERCEL_ENV === "production"
    && process.env.BETA_REGISTRO_PROTEGIDA_VERCEL === "true"
    && ambienteEscritaHabilitado());
}
