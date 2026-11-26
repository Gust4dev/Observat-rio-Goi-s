import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AvisoMetodologico } from "@/components/AvisoMetodologico";
import { CarregandoLista, ListaProblemas } from "@/components/ListaProblemas";
import { obterMunicipio } from "@/lib/dados/consultas";
import { modoAtual } from "@/lib/modo/servidor";
import { TextoPainelMunicipio } from "@/components/TextoPainelMunicipio";

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

const CLASSE_CTA_REGISTRO =
  "inline-flex min-h-12 items-center self-start rounded-lg bg-acao px-5 font-semibold text-sobre-acao no-underline";

export default async function PaginaMunicipio(props: PageProps<"/municipios/[slug]">) {
  // Resolve o município antes de qualquer Suspense: assim o 404 sai com status HTTP 404.
  const { slug } = await props.params;
  const m = await obterMunicipio(slug);
  if (!m) notFound();

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1>{m.nome}</h1>
        <Suspense fallback={null}><TextoPainelMunicipio slug={m.slug} /></Suspense>
      </header>
      <Suspense fallback={<CarregandoLista />}>
        <ConteudoMunicipio municipio={m} searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function ConteudoMunicipio({
  municipio,
  searchParams,
}: {
  municipio: NonNullable<Awaited<ReturnType<typeof obterMunicipio>>>;
  searchParams: PageProps<"/municipios/[slug]">["searchParams"];
}) {
  const modo = await modoAtual();
  const m = modo.gerados ? await obterMunicipio(municipio.slug, true) : municipio;
  if (!m) notFound();

  // Municípios sem acompanhamento real podem ter relatos fictícios no modo de demonstração.
  if (!m.ativo_acompanhamento && !(modo.gerados && m.total > 0)) return (
    <>
      <p>Ainda não acompanhamos relatos neste município</p>
      <p className="text-texto-suave">Isso não significa ausência de problemas. Não há prazo de início de acompanhamento definido.</p>
      <Link href={`/registrar?municipio=${m.slug}`} prefetch={false} className={CLASSE_CTA_REGISTRO}>Registrar um problema</Link>
    </>
  );

  return (
    <>
      <Link href={`/registrar?municipio=${m.slug}`} prefetch={false} className={CLASSE_CTA_REGISTRO}>
        Registrar um problema
      </Link>
      <AvisoMetodologico />
      <Suspense fallback={<CarregandoLista />}>
        <ListaProblemas
          searchParams={searchParams}
          base={`/municipios/${m.slug}`}
          municipioFixo={m.slug}
        />
      </Suspense>
    </>
  );
}
