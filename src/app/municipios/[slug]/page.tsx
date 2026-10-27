import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AvisoMetodologico } from "@/components/AvisoMetodologico";
import { CarregandoLista, ListaProblemas } from "@/components/ListaProblemas";
import { obterMunicipio } from "@/lib/dados/consultas";

// Valor de exemplo só para o Next validar a rota em tempo de build; slugs reais são
// renderizados sob demanda. É inválido de propósito (não consulta o banco).
export function generateStaticParams() {
  return [{ slug: "_" }];
}

export async function generateMetadata({
  params,
}: PageProps<"/municipios/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const m = await obterMunicipio(slug);
  if (!m) return { title: "Município não encontrado" };
  return {
    title: m.nome,
    description: `Relatos de problemas públicos em ${m.nome}, Goiás.`,
  };
}

export default async function PaginaMunicipio(props: PageProps<"/municipios/[slug]">) {
  // Resolve o município antes de qualquer Suspense: assim o 404 sai com status HTTP 404.
  const { slug } = await props.params;
  const m = await obterMunicipio(slug);
  if (!m) notFound();

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1>{m.nome}</h1>
        <p className="mt-2 text-texto-suave">
          {m.total === 1 ? "1 relato publicado" : `${m.total} relatos publicados`} neste município
        </p>
      </header>
      <AvisoMetodologico />
      <Suspense fallback={<CarregandoLista />}>
        <ListaProblemas
          searchParams={props.searchParams}
          base={`/municipios/${m.slug}`}
          municipioFixo={m.slug}
        />
      </Suspense>
    </div>
  );
}
