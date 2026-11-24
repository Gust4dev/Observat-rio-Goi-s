import { describe, expect, it } from "vitest";
import { descreverResolucao, mensagemErroGps } from "./gps";

describe("gps", () => {
  it("mensagens distintas em pt-BR para cada erro", () => {
    const m = ([1, 2, 3, "indisponivel"] as const).map(mensagemErroGps);
    expect(new Set(m).size).toBe(4);
    for (const t of m) expect(t).toMatch(/busque|buscar|Busque/);
  });
  it("descreve a resolução", () => {
    expect(descreverResolucao({ slug: "goiania", nome: "Goiânia", exato: true })).toEqual({ tipo: "ir", slug: "goiania" });
    expect(descreverResolucao({ slug: "goiania", nome: "Goiânia", exato: false })).toEqual({ tipo: "confirmar", slug: "goiania", nome: "Goiânia" });
    expect(descreverResolucao({ foraDeGoias: true })).toEqual({ tipo: "fora" });
  });
});
