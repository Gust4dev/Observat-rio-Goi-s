import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { lerBuscaMunicipio } from "@/lib/dados/params";
import { normalizar } from "@/lib/busca/normalizar";
import { ranquearMunicipios } from "@/lib/busca/ranquear";
import catalogo from "@/lib/mapa/municipios.json";

export const metadata: Metadata = {
  title: "Buscar município",
  description: "Busque um município de Goiás pelo nome.",
};

const MAX_RESULTADOS = 20;

function Formulario({ valor }: { valor: string }) {
  return (
    <form method="get" action="/buscar" className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <label htmlFor="busca-q" className="font-semibold">Nome do município</label>
        <input
          id="busca-q"
          name="q"
          type="search"
          defaultValue={valor}
          maxLength={80}
          autoComplete="off"
          className="min-h-12 rounded-lg border border-borda bg-fundo px-3"
        />
      </div>
      <button type="submit" className="min-h-12 rounded-lg bg-acao px-5 font-semibold text-sobre-acao">
        Buscar
      </button>
    </form>
  );
}

async function Resultado({ searchParams }: Pick<PageProps<"/buscar">, "searchParams">) {
  const sp = await searchParams;
  const q = lerBuscaMunicipio(sp.q);
  const achados = ranquearMunicipios(q, catalogo, MAX_RESULTADOS);

  // Um único candidato, ou nome exato, leva direto ao município.
  const exato = achados.find((m) => normalizar(m.nome) === normalizar(q));
  const destino = exato ?? (achados.length === 1 ? achados[0] : undefined);
  if (destino) redirect(`/municipios/${destino.slug}`);

  return (
    <>
      <Formulario valor={q} />
      {!q ? (
        <p role="status">Digite o nome de um município de Goiás para buscar.</p>
      ) : achados.length === 0 ? (
        <p role="status">Nenhum município encontrado para essa busca. Confira a grafia e tente de novo.</p>
      ) : (
        <ul className="flex flex-col gap-2 p-0" style={{ listStyle: "none" }}>
          {achados.map((m) => (
            <li key={m.slug}>
              <Link href={`/municipios/${m.slug}`} prefetch={false} className="inline-flex min-h-12 items-center font-semibold">
                {m.nome}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function PaginaBuscar(props: PageProps<"/buscar">) {
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <header><h1>Buscar município</h1></header>
      <Suspense fallback={<p role="status">Buscando…</p>}>
        <Resultado searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
