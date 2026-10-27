import { describe, expect, it } from "vitest";
import { SITUACOES, rotuloSituacao } from "./situacao";

describe("rótulos de situação (plano-m2 §4)", () => {
  const esperado: Record<string, string> = {
    registrado: "Recebido",
    em_analise: "Em análise",
    encaminhado: "Encaminhado ao órgão",
    aguardando_resposta: "Aguardando resposta do órgão",
    em_atendimento: "Sendo resolvido",
    resolvido: "Resolvido",
    encerrado_sem_solucao: "Encerrado sem solução",
  };
  it("cobre todos os valores do enum, com o texto do plano", () => {
    expect([...SITUACOES].sort()).toEqual(Object.keys(esperado).sort());
    for (const s of SITUACOES) expect(rotuloSituacao(s)).toBe(esperado[s]);
  });
});
