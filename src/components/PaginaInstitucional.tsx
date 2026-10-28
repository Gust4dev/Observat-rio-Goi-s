import type { Metadata } from "next";
import type { ReactNode } from "react";

export function metadataInstitucional(titulo: string): Metadata {
  return {
    title: titulo,
    description: `${titulo} — conteúdo provisório do Observatório Goiás, em revisão.`,
    robots: { index: false, follow: false },
  };
}

export function PaginaInstitucional({ titulo, secoes }: {
  titulo: string;
  secoes: { titulo: string; conteudo: ReactNode }[];
}) {
  return <article className="mx-auto max-w-[var(--width-reading)] space-y-8">
    <header className="space-y-3">
      <h1>{titulo}</h1>
      <p className="rounded-controle border border-borda bg-destaque-suave p-4">
        Conteúdo provisório para revisão. Esta versão de trabalho ainda não é uma política aprovada.
      </p>
      <p className="text-sm text-texto-suave">Versão de trabalho: <time dateTime="2026-10-28">28 de outubro de 2026</time>. Revisão jurídica pendente.</p>
    </header>
    {secoes.map((secao) => <section key={secao.titulo} className="space-y-3">
      <h2>{secao.titulo}</h2>
      <p className="text-sm font-semibold text-destaque">[A REVISAR PELO JURÍDICO]</p>
      <div className="space-y-3">{secao.conteudo}</div>
    </section>)}
  </article>;
}
