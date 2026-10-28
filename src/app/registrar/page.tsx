import type { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";
import { Suspense } from "react";
import { listarCategorias, listarMunicipios } from "@/lib/dados/consultas";
import { configServidor } from "@/lib/registro/servidor";
import { RegistrarForm, SemJavaScript } from "@/components/registro/RegistrarForm";

export const metadata: Metadata = {
  title: "Registrar um problema",
  robots: { index: false, follow: false },
};

type Consulta = Promise<{ municipio?: string | string[] }>;

async function FormularioRegistroRuntime({ siteKey, searchParams }: { siteKey: string | undefined; searchParams: Consulta }) {
  // Os segredos são lidos por requisição, dentro do limite Suspense do shell estático.
  await connection();
  const consulta = await searchParams;
  const municipioInicial = typeof consulta.municipio === "string" ? consulta.municipio : "";
  let municipios: { slug: string; nome: string }[] = [];
  let categorias: { slug: string; nome: string }[] = [];
  let indisponivel = false;
  let fotosHabilitadas = false;
  try {
    fotosHabilitadas = configServidor().fotosHabilitadas;
    [municipios, categorias] = await Promise.all([listarMunicipios(), listarCategorias()]);
  } catch {
    indisponivel = true;
  }
  return <RegistrarForm municipioInicial={municipioInicial} municipios={municipios} categorias={categorias} siteKey={siteKey} indisponivel={indisponivel} fotosHabilitadas={fotosHabilitadas} />;
}

export default function RegistrarPage({ searchParams }: { searchParams: Consulta }) {
  return <article className="mx-auto max-w-[var(--width-reading)] space-y-5">
    <Link href="/" className="inline-flex min-h-12 items-center font-semibold underline">Voltar ao início</Link>
    <header>
      <h1>Registrar um problema</h1>
      <p className="mt-2 text-texto-suave">Sem conta e sem contato. Os relatos são analisados antes de aparecer no site.</p>
    </header>
    <SemJavaScript />
    <Suspense fallback={<p role="status" aria-busy="true">Verificando disponibilidade do registro…</p>}>
      <FormularioRegistroRuntime searchParams={searchParams} siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} />
    </Suspense>
  </article>;
}
