/** Derives the public request origin from host headers trusted at the ingress. */
export function origemDaRequisicao(request: Request): string | null {
  const url = new URL(request.url);
  const forwardedHost = process.env.VERCEL === "1" ? request.headers.get("x-forwarded-host") : null;
  const host = forwardedHost?.trim() || request.headers.get("host")?.trim() || url.host;
  const forwardedProto = process.env.VERCEL === "1" ? request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() : null;
  const protocol = forwardedProto || url.protocol.slice(0, -1);
  try {
    const expected = new URL(`${protocol}://${host}`);
    if (!["http:", "https:"].includes(expected.protocol) || expected.username || expected.password || expected.pathname !== "/") return null;
    return expected.origin;
  } catch { return null; }
}

export function mesmaOrigem(request: Request): boolean {
  const esperada = origemDaRequisicao(request);
  return esperada !== null && request.headers.get("origin") === esperada;
}
