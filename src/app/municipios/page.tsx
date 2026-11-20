import type { Metadata } from "next";
import { Suspense } from "react";
import { ListaMunicipios } from "@/components/ListaMunicipios";
import { listarMunicipios } from "@/lib/dados/consultas";
import { lerBuscaMunicipio } from "@/lib/dados/params";
import { publicSupabaseOriginAllowed } from "@/lib/supabase-origin";
export const metadata: Metadata = { title: "Municípios", description: "Consulte os municípios de Goiás e seus relatos públicos." };
async function Indice({ searchParams }: Pick<PageProps<"/municipios">, "searchParams">) {
  const [sp, municipios] = await Promise.all([searchParams, listarMunicipios()]);
  return <ListaMunicipios municipios={municipios} busca={lerBuscaMunicipio(sp.nome_municipio)} />;
}
export default function Pagina(props: PageProps<"/municipios">) {
  if (process.env.VERCEL_ENV === "production" && !publicSupabaseOriginAllowed(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_PRODUCTION_PROJECT_REF,
    process.env.SUPABASE_PRODUCTION_DATA_APPROVED,
  )) {
    return <main role="status" className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold">Municípios temporariamente indisponíveis</h1>
      <p className="mt-4 text-texto-suave">Esta versão ainda não está liberada para consulta pública. Volte mais tarde.</p>
    </main>;
  }

  return <div className="flex min-w-0 flex-col gap-5"><header><h1>Municípios de Goiás</h1><p className="mt-2 text-texto-suave">Encontre seu município na lista alfabética. A presença nesta lista não indica acompanhamento ativo.</p></header><Suspense fallback={<p role="status">Carregando municípios…</p>}><Indice searchParams={props.searchParams} /></Suspense></div>;
}
