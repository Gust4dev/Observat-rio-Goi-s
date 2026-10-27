import type { NextConfig } from "next";

// Host do Supabase (pode estar vazio em build local).
function hostSupabase(): string | null {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return url ? new URL(url).host : null;
  } catch {
    return null;
  }
}

const host = hostSupabase();
const origemSupabase = host ? `https://${host}` : "";

// CSP base, sem nonce. 'unsafe-inline' em script-src é necessário porque o Next injeta
// scripts inline (bootstrap/RSC payload) e um nonce forçaria renderização dinâmica,
// conflitando com cacheComponents. Nonce fica para o M3 (formulário).
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'" +
    (process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"),
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: ${origemSupabase}`.trim(),
  `connect-src 'self' ${origemSupabase}`.trim(),
  "font-src 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    remotePatterns: host
      ? [
          {
            protocol: "https",
            hostname: host.split(":")[0],
            pathname: "/storage/v1/object/public/imagens-publicas/**",
          },
        ]
      : [],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            // Sem includeSubDomains/preload: domínio de teste; preload é difícil de desfazer.
            value: "max-age=63072000",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
          },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
