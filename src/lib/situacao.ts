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
  resolvido: "O problema foi resolvido.",
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
