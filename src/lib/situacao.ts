export const SITUACOES = [
  "registrado",
  "em_analise",
  "encaminhado",
  "aguardando_resposta",
  "em_atendimento",
  "resolvido",
  "encerrado_sem_solucao",
] as const;

export type Situacao = (typeof SITUACOES)[number];

const ROTULOS: Record<Situacao, string> = {
  registrado: "Recebido",
  em_analise: "Em análise",
  encaminhado: "Encaminhado ao órgão",
  aguardando_resposta: "Aguardando resposta do órgão",
  em_atendimento: "Sendo resolvido",
  resolvido: "Resolvido",
  encerrado_sem_solucao: "Encerrado sem solução",
};

const DESCRICOES: Record<Situacao, string> = {
  registrado: "O relato foi recebido e ainda não foi analisado.",
  em_analise: "Estamos conferindo as informações do relato.",
  encaminhado: "O relato foi enviado ao órgão responsável.",
  aguardando_resposta: "Esperamos o órgão responder sobre o problema.",
  em_atendimento: "O órgão já está trabalhando para resolver o problema.",
  resolvido: "Justificativa e evidência da resolução devem estar publicadas.",
  encerrado_sem_solucao: "O caso foi encerrado e o problema não foi resolvido.",
};

const TONS: Record<Situacao, "neutro" | "andamento" | "sucesso" | "encerrado"> = {
  registrado: "neutro",
  em_analise: "neutro",
  encaminhado: "andamento",
  aguardando_resposta: "andamento",
  em_atendimento: "andamento",
  resolvido: "sucesso",
  encerrado_sem_solucao: "encerrado",
};

export function rotuloSituacao(s: Situacao): string {
  return ROTULOS[s];
}

export function descricaoSituacao(s: Situacao): string {
  return DESCRICOES[s];
}

export function tomSituacao(
  s: Situacao,
): "neutro" | "andamento" | "sucesso" | "encerrado" {
  return TONS[s];
}

export const ICONES_SITUACAO: Record<Situacao, string> = {
  registrado: "M4 14H2v6h20v-6h-2M12 3v11m-4-4 4 4 4-4M3 14h5l2 3h4l2-3h5",
  em_analise: "M5 3h10v6M5 3v18h5M8 7h4M8 11h2M20 20l-3-3M18 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  encaminhado: "M5 19 19 5M9 5h10v10",
  aguardando_resposta: "M3 3h13v8h-4l-4 3v-3H3zM22 17a5 5 0 1 1-10 0 5 5 0 0 1 10 0M17 14v3l2 1",
  em_atendimento: "M14 4a6 6 0 0 0-7 7L3 17a3 3 0 0 0 4 4l6-6a6 6 0 0 0 7-7l-4 3-3-3z",
  resolvido: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M7 12l3 3 7-7",
  encerrado_sem_solucao: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M8 12h8",
};

export type DocumentacaoResolucao = { justificativa: string | null; evidencia: string | null };

export function temDocumentacaoResolucao(documentacao?: DocumentacaoResolucao): boolean {
  return Boolean(documentacao?.justificativa?.trim() && documentacao?.evidencia?.trim());
}
