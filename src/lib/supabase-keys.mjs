const CHAVE_NOVA = /^sb_(?:publishable|secret)_/;
const JWT_LEGADO = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

/** Resolve the new variables first and retain legacy names during rollout. */
export function resolveSupabaseKeys(env) {
  return {
    publicKey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
      || env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
      || "",
    secretKey: env.SUPABASE_SECRET_KEY?.trim()
      || env.SUPABASE_SERVICE_ROLE_KEY?.trim()
      || "",
  };
}

/**
 * API keys identify the project via apikey. A user JWT is an explicit Bearer;
 * legacy API-key JWTs keep their old Bearer behavior only during migration.
 */
export function supabaseApiHeaders(apiKey, userJwt) {
  const headers = { apikey: apiKey };
  if (userJwt && !CHAVE_NOVA.test(userJwt)) headers.Authorization = `Bearer ${userJwt}`;
  else if (!CHAVE_NOVA.test(apiKey) && JWT_LEGADO.test(apiKey)) {
    headers.Authorization = `Bearer ${apiKey}`;
  }
  return headers;
}
