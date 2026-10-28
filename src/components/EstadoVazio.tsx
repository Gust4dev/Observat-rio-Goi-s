import Link from "next/link";

const MENSAGENS = {
  busca: { titulo: "Nenhum relato encontrado", texto: "Não há relatos publicados com esses filtros. Tente outros filtros." },
  "lista-vazia": { titulo: "Ainda não há relatos publicados", texto: "Os relatos publicados aparecerão aqui." },
  "sem-resposta": { titulo: "Ainda não há resposta oficial publicada.", texto: "Quando uma resposta for publicada, ela aparecerá aqui." },
  "municipio-sem-cobertura": { titulo: "Ainda não acompanhamos relatos neste município", texto: "Isso não significa que não existam problemas no município." },
} as const;

export type EstadoVazioProps = {
  variante?: keyof typeof MENSAGENS;
  titulo?: string;
  texto?: string;
  acaoHref?: string;
  acaoRotulo?: string;
};
export function EstadoVazio({ variante = "lista-vazia", titulo, texto, acaoHref, acaoRotulo }: EstadoVazioProps) {
  const mensagem = MENSAGENS[variante];
  return (
    <section className="rounded-2xl border border-borda-suave bg-superficie p-6">
      <h2>{titulo ?? mensagem.titulo}</h2>
      <p className="mt-2 text-texto-suave">{texto ?? mensagem.texto}</p>
      {acaoHref && acaoRotulo && <p className="mt-4"><Link href={acaoHref} className="inline-flex min-h-12 items-center rounded-lg border border-acao px-5 font-semibold">{acaoRotulo}</Link></p>}
    </section>
  );
}
