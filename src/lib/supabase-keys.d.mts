export type SupabaseEnvironment = Readonly<Record<string, string | undefined>>;
export declare function resolveSupabaseKeys(env: SupabaseEnvironment): {
  publicKey: string;
  secretKey: string;
};
export declare function supabaseApiHeaders(apiKey: string, userJwt?: string): Record<string, string>;
