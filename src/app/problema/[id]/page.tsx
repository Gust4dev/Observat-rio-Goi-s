import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AvisoMetodologico } from "@/components/AvisoMetodologico";
import { LinhaDoTempo } from "@/components/LinhaDoTempo";
import { SeloConferencia, SeloSituacao } from "@/components/SeloSituacao";
import { SeloDemonstracao } from "@/components/SeloDemonstracao";
import { RespostaOficial } from "@/components/RespostaOficial";
import { obterProblema, urlImagem } from "@/lib/dados/consultas";
import { formatarData } from "@/lib/formato";
import { descricaoSituacao, temDocumentacaoResolucao } from "@/lib/situacao";
import { resolucaoPublica, situacaoPublica, urlPublica } from "./publico";

// ID inválido intencional: não consulta o banco ao prerenderizar o exemplo.
export function generateStaticParams() { return [{ id: "exemplo" }]; }

export async function generateMetadata({ params }: PageProps<"/problema/[id]">): Promise<Metadata> {
  const { id } = await params;
  const dados = await obterProblema(id);
  if (!dados) return { title: "Relato não encontrado", description: "Relato não encontrado.", robots: { index: false, follow: false } };
  const p = dados.problema;
  const description = `Dados de demonstração · ${p.categoria_nome} em ${p.municipio_nome} — situação: ${situacaoPublica(dados)}`;
  const url = urlPublica(p.id);
  return {
    title: p.titulo, description,
    ...(url ? { alternates: { canonical: url } } : {}),
    openGraph: { type: "article", title: p.titulo, description, ...(url ? { url } : {}), siteName: "Observatório Goiás", locale: "pt_BR" },
    twitter: { card: "summary_large_image", title: p.titulo, description, images: [{ url: "/opengraph-image.png", alt: "Observatório Goiás" }] },
  };
}

function linkSeguro(texto: string): boolean {
  try { const url = new URL(texto); return url.protocol === "https:" && !url.username && !url.password && !/[\s\\]/.test(texto); } catch { return false; }
}

export default async function PaginaProblema(props: PageProps<"/problema/[id]">) {
  // Antes de Suspense: ausência pública e inexistência seguem o mesmo notFound.
  const { id } = await props.params;
  const dados = await obterProblema(id);
  if (!dados) notFound();
  const { problema: p, imagens, atualizacoes, respostas } = dados;
  const resolucao = resolucaoPublica(dados);
  const documentacao = { justificativa: resolucao?.texto ?? null, evidencia: resolucao?.evidencia ?? null };
  const documentada = temDocumentacaoResolucao(documentacao);
  const url = urlPublica(p.id);
  const publicadas = respostas.filter(r => r.publicada_em);
  const fotos = imagens.slice(0, 3).map(i => ({ id: i.id, descricao: i.descricao_publica, url: urlImagem(i.id) })).filter((f): f is { id: string; descricao: string; url: string } => f.url !== null);
  return <article className="mx-auto flex w-full min-w-0 max-w-[680px] flex-col gap-8 break-words">
    <header className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3"><p className="text-sm font-semibold">{p.categoria_nome}</p><SeloDemonstracao /></div>
      <h1>{p.titulo}</h1>
      <p><Link href={`/municipios/${encodeURIComponent(p.municipio_slug)}`} prefetch={false}>{p.municipio_nome}</Link></p>
      <dl className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-[auto_1fr]">
        <dt className="font-semibold">Protocolo público</dt><dd>{p.protocolo}</dd>
        <dt className="font-semibold">Publicado em</dt><dd><time dateTime={p.publicado_em}>{formatarData(p.publicado_em)}</time></dd>
        <dt className="font-semibold">Atualizado em</dt><dd><time dateTime={p.atualizado_em}>{formatarData(p.atualizado_em)}</time></dd>
      </dl>
      <div><SeloSituacao situacao={p.situacao} resolucao={documentacao} /></div>
      <p>{p.situacao === "resolvido" && !documentada ? "A justificativa e a evidência de resolução ainda não estão ambas publicadas." : descricaoSituacao(p.situacao)}</p>
      <SeloConferencia conferido={p.verificado} />
    </header>
    {publicadas.length ? publicadas.map(r => <RespostaOficial key={r.id} resposta={r} />) : <RespostaOficial />}
    <section aria-labelledby="titulo-descricao" className="flex flex-col gap-3"><h2 id="titulo-descricao">O que foi relatado</h2><p className="whitespace-pre-line">{p.descricao}</p></section>
    {documentada && resolucao && <section aria-labelledby="titulo-resolucao" className="flex flex-col gap-3 rounded-lg border border-tom-sucesso-texto bg-tom-sucesso-fundo p-4"><h2 id="titulo-resolucao">Como sabemos que foi resolvido</h2><p className="whitespace-pre-line">{resolucao.texto}</p><p><strong>Evidência: </strong>{linkSeguro(resolucao.evidencia!) ? <a className="break-all" href={resolucao.evidencia!} rel="noopener noreferrer nofollow">{resolucao.evidencia}</a> : <span className="whitespace-pre-line">{resolucao.evidencia}</span>}</p></section>}
    <section aria-labelledby="titulo-fotos" className="flex flex-col gap-3"><h2 id="titulo-fotos">Fotos</h2>
      {fotos.length ? <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">{fotos.map((f, i) => <li key={f.id}><figure><div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-borda bg-superficie"><Image src={f.url} alt={f.descricao} fill sizes="(min-width: 640px) 328px, 100vw" loading="lazy" className="object-contain" /></div><figcaption className="mt-2 text-sm text-texto-suave">Foto {i + 1}. {f.descricao}</figcaption></figure></li>)}</ul> : <p className="text-texto-suave">Nenhuma foto publicada.</p>}
    </section>
    <section aria-labelledby="titulo-linha" className="flex flex-col gap-3"><h2 id="titulo-linha">Atualizações</h2><LinhaDoTempo itens={atualizacoes.map(a => ({ id: a.id, tipo: a.tipo, situacaoNova: a.situacao_nova, texto: a.texto, evidencia: a.evidencia, criadoEm: a.criado_em }))} /></section>
    <section aria-labelledby="titulo-acoes" className="flex flex-col gap-3"><h2 id="titulo-acoes">Acompanhe este relato</h2>
      {url ? <a className="inline-flex min-h-12 items-center justify-center rounded-lg bg-acao px-4 py-3 text-acao-texto" href={`https://wa.me/?text=${encodeURIComponent(url)}`} rel="noopener noreferrer">Compartilhar no WhatsApp</a> : <p>Compartilhamento indisponível enquanto o endereço público não estiver configurado.</p>}
      <p>Também me afeta: {p.confirmacoes_total}. A contagem não mede gravidade nem quantidade total de pessoas afetadas.</p>
      <button type="button" disabled aria-describedby="acoes-indisponiveis" className="min-h-12 rounded-lg border border-borda px-4">Também me afeta — indisponível</button>
      <button type="button" disabled aria-describedby="acoes-indisponiveis" className="min-h-12 rounded-lg border border-borda px-4">Sinalizar este relato — indisponível</button>
      <p id="acoes-indisponiveis" className="text-sm text-texto-suave">Estas ações aguardam implementação e definição das regras de privacidade.</p>
    </section>
    <AvisoMetodologico />
  </article>;
}
