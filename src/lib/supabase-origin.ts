const PROJECT_REF_RE = /^[a-z0-9]{20}$/;

export function supabaseProjectRef(base: string | undefined): string | null {
  if (!base) return null;

  try {
    const url = new URL(base);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      return null;
    }

    const match = url.hostname.match(/^([a-z0-9]{20})\.supabase\.co$/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

/** Production public reads stay disabled until the project ref and data provenance are explicitly approved. */
export function publicSupabaseOriginAllowed(
  base: string | undefined,
  productionProjectRef: string | undefined,
  productionDataApproved: string | undefined,
  vercelEnv: string | undefined = process.env.VERCEL_ENV,
): boolean {
  if (vercelEnv === "preview" || vercelEnv === "development") return true;
  if (!vercelEnv && (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test")) return true;
  if (vercelEnv !== "production") return false;

  const actualRef = supabaseProjectRef(base);
  const expectedRef = productionProjectRef?.trim();
  return Boolean(
    actualRef &&
      expectedRef &&
      PROJECT_REF_RE.test(expectedRef) &&
      actualRef === expectedRef &&
      productionDataApproved === "true",
  );
}
