import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AvisoMetodologico } from "@/components/AvisoMetodologico";
import { LinhaDoTempo } from "@/components/LinhaDoTempo";
import { SeloSituacao } from "@/components/SeloSituacao";
import { obterProblema, urlImagem } from "@/lib/dados/consultas";
import { formatarData } from "@/lib/formato";
import { descricaoSituacao, rotuloSituacao } from "@/lib/situacao";

// Valor de exemplo só para o Next validar a rota em tempo de build; ids reais são
// renderizados sob demanda. É inválido de propósito (não consulta o banco).
export function generateStaticParams() {
  return [{ id: "exemplo" }];
}

export async function generateMetadata({
  params,
}: PageProps<"/problema/[id]">): Promise<Metadata> {
  const { id } = await params;
  const dados = await obterProblema(id);
  if (!dados) return { title: "Relato não encontrado" };
  const p = dados.problema;
  const description = `${p.categoria_nome} em ${p.municipio_nome} — situação: ${rotuloSituacao(p.situacao)}`;
  return {
    title: p.titulo,
    description,
    openGraph: {
      type: "article",
      title: p.titulo,
      description,
      siteName: "Observatório Goiás",
      locale: "pt_BR",
    },
    twitter: { card: "summary", title: p.titulo, description },
  };
}

/** Evidência só vira link se for https válido; qualquer outra coisa é texto. */
function ehLinkSeguro(texto: string): boolean {
  if (!texto.startsWith("https://")) return false;
  try {
    return new URL(texto).protocol === "https:";
  } catch {
    return false;
  }
}

function paragrafos(texto: string): string[] {
  return texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

export default async function PaginaProblema(props: PageProps<"/problema/[id]">) {
  // Dados resolvidos antes de qualquer Suspense: assim o 404 sai com status HTTP 404.
  const { id } = await props.params;
  const dados = await obterProblema(id);
  if (!dados) notFound();

  const { problema: p, imagens, atualizacoes, respostas } = dados;
  const resolucao =
    p.situacao === "resolvido"
      ? [...atualizacoes].reverse().find((a) => a.situacao_nova === "resolvido")
      : undefined;
  const fotos = imagens
    .map((i) => ({ id: i.id, url: urlImagem(i.caminho_storage) }))
    .filter((f): f is { id: string; url: string } => f.url !== null);

  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <h1>{p.titulo}</h1>
        <div>
          <SeloSituacao situacao={p.situacao} />
        </div>
        <p>{descricaoSituacao(p.situacao)}</p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          <dt className="font-semibold">Município</dt>
          <dd>
            <Link href={`/municipios/${p.municipio_slug}`} prefetch={false}>
              {p.municipio_nome}
            </Link>
          </dd>
          <dt className="font-semibold">Categoria</dt>
          <dd>{p.categoria_nome}</dd>
          <dt className="font-semibold">Protocolo</dt>
          <dd>{p.protocolo}</dd>
          <dt className="font-semibold">Publicado em</dt>
          <dd>{formatarData(p.publicado_em)}</dd>
          <dt className="font-semibold">Atualizado em</dt>
          <dd>{formatarData(p.atualizado_em)}</dd>
        </dl>
      </header>

      <section aria-labelledby="titulo-descricao" className="flex flex-col gap-3">
        <h2 id="titulo-descricao">O que foi relatado</h2>
        {paragrafos(p.descricao).map((linha, i) => (
          <p key={i}>{linha}</p>
        ))}
      </section>

      {resolucao ? (
        <section
          aria-labelledby="titulo-resolucao"
          className="flex flex-col gap-3 rounded-lg border border-tom-sucesso-texto bg-tom-sucesso-fundo p-4 text-tom-sucesso-texto"
        >
          <h2 id="titulo-resolucao">Como sabemos que foi resolvido</h2>
          {paragrafos(resolucao.texto).map((linha, i) => (
            <p key={i}>{linha}</p>
          ))}
          {resolucao.evidencia ? (
            <p>
              <span className="font-semibold">Evidência:</span>{" "}
              {ehLinkSeguro(resolucao.evidencia) ? (
                <a
                  href={resolucao.evidencia}
                  rel="noopener noreferrer nofollow"
                  className="break-all text-tom-sucesso-texto"
                >
                  {resolucao.evidencia}
                </a>
              ) : (
                <span className="whitespace-pre-line">{resolucao.evidencia}</span>
              )}
            </p>
          ) : null}
        </section>
      ) : null}

      {fotos.length > 0 ? (
        <section aria-labelledby="titulo-fotos" className="flex flex-col gap-3">
          <h2 id="titulo-fotos">Fotos</h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {fotos.map((f) => (
              <li
                key={f.id}
                className="relative aspect-[4/3] overflow-hidden rounded-lg border border-borda bg-superficie"
              >
                <Image
                  src={f.url}
                  alt="Foto enviada pelo cidadão"
                  fill
                  sizes="(min-width: 768px) 360px, 100vw"
                  loading="lazy"
                  className="object-cover"
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {atualizacoes.length > 0 ? (
        <section aria-labelledby="titulo-linha" className="flex flex-col gap-3">
          <h2 id="titulo-linha">Atualizações</h2>
          <LinhaDoTempo
            itens={atualizacoes.map((a) => ({
              id: a.id,
              tipo: a.tipo,
              situacaoNova: a.situacao_nova,
              texto: a.texto,
              evidencia: a.evidencia,
              criadoEm: a.criado_em,
            }))}
          />
        </section>
      ) : null}

      <section aria-labelledby="titulo-respostas" className="flex flex-col gap-3">
        <h2 id="titulo-respostas">Direito de resposta</h2>
        {respostas.length > 0 ? (
          <ul className="flex flex-col gap-4">
            {respostas.map((r) => (
              <li key={r.id} className="rounded-lg border border-borda p-4">
                <p className="font-semibold">{r.autor_vinculo}</p>
                {r.publicada_em ? (
                  <p className="text-sm text-texto-suave">
                    <time dateTime={r.publicada_em}>{formatarData(r.publicada_em)}</time>
                  </p>
                ) : null}
                {paragrafos(r.texto).map((linha, i) => (
                  <p key={i} className="mt-2">
                    {linha}
                  </p>
                ))}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-texto-suave">Ainda não há resposta publicada para este relato.</p>
        )}
      </section>

      <AvisoMetodologico />
    </article>
  );
}
