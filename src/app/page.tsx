import { Suspense } from "react";
import { HomeConteudo } from "@/components/HomeConteudo";
import { publicSupabaseOriginAllowed } from "@/lib/supabase-origin";

export default function Home() {
  if (process.env.VERCEL_ENV === "production" && !publicSupabaseOriginAllowed(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_PRODUCTION_PROJECT_REF,
    process.env.SUPABASE_PRODUCTION_DATA_APPROVED,
  )) {
    return <main role="status" className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold">Dados públicos temporariamente indisponíveis</h1>
      <p className="mt-4 text-texto-suave">Esta versão ainda não está liberada para consulta pública. Volte mais tarde.</p>
    </main>;
  }

  return <Suspense fallback={<p role="status">Carregando municípios e relatos…</p>}><HomeConteudo /></Suspense>;
}
