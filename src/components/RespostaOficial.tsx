import type { Resposta } from "@/lib/dados/schemas";
import { formatarData } from "@/lib/formato";
import { EstadoVazio } from "./EstadoVazio";
import { SeloDemonstracao } from "./SeloDemonstracao";

export function RespostaOficial({ resposta, demonstracao = false, historicoId }: {
  resposta?: Resposta | null;
  demonstracao?: boolean;
  historicoId?: string;
}) {
  if (!resposta?.publicada_em) return <EstadoVazio variante="sem-resposta" />;
  const data = formatarData(resposta.publicada_em);
  return (
    <section aria-label="Resposta oficial" className="rounded-2xl border border-territorio bg-info-fundo p-5">
      {demonstracao && <SeloDemonstracao />}
      <h2>Resposta oficial</h2>
      {resposta.autor_vinculo.trim() && <p className="mt-2">Vínculo informado: {resposta.autor_vinculo}</p>}
      <p className="text-sm text-texto-suave">Vínculo não confirmado pela equipe</p>
      {data && <p className="mt-2 text-sm">Publicada em <time dateTime={resposta.publicada_em}>{data}</time></p>}
      <p className="mt-4 whitespace-pre-line break-words">{resposta.texto}</p>
      {historicoId && <a className="mt-3 inline-flex min-h-12 items-center" href={`#${encodeURIComponent(historicoId)}`}>Ver histórico</a>}
    </section>
  );
}
