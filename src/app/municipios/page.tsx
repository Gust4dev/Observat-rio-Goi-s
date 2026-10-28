import type { Metadata } from "next";
import { Suspense } from "react";
import { ListaMunicipios } from "@/components/ListaMunicipios";
import { listarMunicipios } from "@/lib/dados/consultas";
import { lerBuscaMunicipio } from "@/lib/dados/params";
export const metadata: Metadata = { title: "Municípios", description: "Consulte os municípios de Goiás e seus relatos públicos." };
async function Indice({ searchParams }: Pick<PageProps<"/municipios">, "searchParams">) {
  const [sp, municipios] = await Promise.all([searchParams, listarMunicipios()]);
  return <ListaMunicipios municipios={municipios} busca={lerBuscaMunicipio(sp.nome_municipio)} />;
}
export default function Pagina(props: PageProps<"/municipios">) {
  return <div className="flex min-w-0 flex-col gap-5"><header><h1>Municípios de Goiás</h1><p className="mt-2 text-texto-suave">Encontre seu município na lista alfabética. A presença nesta lista não indica acompanhamento ativo.</p></header><Suspense fallback={<p role="status">Carregando municípios…</p>}><Indice searchParams={props.searchParams} /></Suspense></div>;
}
