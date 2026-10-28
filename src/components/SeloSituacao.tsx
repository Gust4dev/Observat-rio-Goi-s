import { ICONES_SITUACAO, rotuloSituacao, temDocumentacaoResolucao, tomSituacao, type DocumentacaoResolucao, type Situacao } from "@/lib/situacao";

const CLASSES = {
  neutro: "bg-tom-neutro-fundo text-tom-neutro-texto border-tom-neutro-texto",
  andamento: "bg-tom-andamento-fundo text-tom-andamento-texto border-tom-andamento-texto",
  sucesso: "bg-tom-sucesso-fundo text-tom-sucesso-texto border-tom-sucesso-texto",
  encerrado: "bg-tom-encerrado-fundo text-tom-encerrado-texto border-tom-encerrado-texto",
} as const;

function Icone({ caminho }: { caminho: string }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className="shrink-0"><path d={caminho} /></svg>;
}

export function SeloSituacao({ situacao, resolucao }: { situacao: Situacao; resolucao?: DocumentacaoResolucao }) {
  const semDocumentacao = situacao === "resolvido" && !temDocumentacaoResolucao(resolucao);
  const tom = semDocumentacao ? "neutro" : tomSituacao(situacao);
  const cor = situacao === "aguardando_resposta" ? "bg-destaque-suave text-texto border-destaque" : CLASSES[tom];
  return <span className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold ${cor}`}>
    <Icone caminho={ICONES_SITUACAO[semDocumentacao ? "registrado" : situacao]} />
    <span className="min-w-0 break-words">{semDocumentacao ? "Resolução sem documentação" : rotuloSituacao(situacao)}</span>
  </span>;
}

/** Conferência é uma informação explícita da equipe, independente da situação. */
export function SeloConferencia({ conferido }: { conferido: boolean }) {
  if (!conferido) return null;
  return <span className="inline-flex max-w-full items-center gap-1.5 text-sm text-texto-suave"><Icone caminho="M9 12l2 2 4-4M12 2l8 4v6c0 5-8 10-8 10S4 17 4 12V6z" /><span className="min-w-0 break-words">Conferido pela equipe</span></span>;
}
