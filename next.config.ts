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

// O shell estático do Next contém bootstrap/RSC inline. Nonce global exige renderização
// dinâmica e é incompatível com PPR; SRI experimental só deu integridade aos arquivos
// externos no experimento do M3, sem autorizar os scripts inline. O risco residual de
// 'unsafe-inline' está registrado em docs/plano-m3.md. Turnstile só é liberado no registro.
const politicaCsp = (comTurnstile = false) => [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'" +
    (comTurnstile ? " https://challenges.cloudflare.com" : "") +
    (process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"),
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: ${origemSupabase}`.trim(),
  `connect-src 'self' ${origemSupabase}`.trim(),
  "font-src 'self'",
  comTurnstile ? "frame-src https://challenges.cloudflare.com" : "frame-src 'none'",
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
          { key: "Content-Security-Policy", value: politicaCsp() },
        ],
      },
      {
        // A última regra com a mesma chave substitui a base (guia headers do Next).
        source: "/registrar",
        headers: [
          { key: "Content-Security-Policy", value: politicaCsp(true) },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
      {
        source: "/acompanhar",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
    ];
  },
};

export default nextConfig;
