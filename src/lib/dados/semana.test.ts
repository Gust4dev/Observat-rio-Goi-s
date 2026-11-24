import { describe, expect, it } from "vitest";
import { agregarSemana, JANELA_DIAS, LIMIAR_MANCHETE, LIMIAR_PONTO, MAX_PONTOS } from "./semana";

type L = Parameters<typeof agregarSemana>[0][number];
const linha = (m: string, c = "saude"): L => ({
  municipio_slug: m, municipio_nome: m.toUpperCase(), categoria_slug: c, categoria_nome: c.toUpperCase(),
});
const varias = (m: string, n: number, c = "saude") => Array.from({ length: n }, () => linha(m, c));

describe("agregarSemana", () => {
  it("constantes", () => {
    expect([LIMIAR_PONTO, LIMIAR_MANCHETE, MAX_PONTOS, JANELA_DIAS]).toEqual([3, 5, 8, 7]);
  });

  it("lista vazia", () => {
    expect(agregarSemana([])).toEqual({ total: 0, categoriaLider: null, pontos: [] });
  });

  it("município com 2 relatos não aparece em pontos nem tem seu total serializado", () => {
    const r = agregarSemana([...varias("a", 2), ...varias("b", 3)]);
    expect(r.pontos).toEqual([{ slug: "b", nome: "B", total: 3 }]);
    expect(JSON.stringify(r)).not.toContain('"slug":"a"');
    expect(r.total).toBe(5);
  });

  it("ordena por total desc e desempata por slug", () => {
    const r = agregarSemana([...varias("c", 3), ...varias("a", 4), ...varias("b", 3)]);
    expect(r.pontos.map((p) => p.slug)).toEqual(["a", "b", "c"]);
  });

  it("limita a 8 pontos", () => {
    const linhas = Array.from({ length: 12 }, (_, i) => varias(`m${String(i).padStart(2, "0")}`, 3)).flat();
    const r = agregarSemana(linhas);
    expect(r.pontos).toHaveLength(8);
    expect(r.pontos[0].slug).toBe("m00");
  });

  it("categoria líder: maior total, empate por slug", () => {
    const r = agregarSemana([...varias("a", 3, "z"), ...varias("b", 3, "y")]);
    expect(r.categoriaLider).toEqual({ slug: "y", nome: "Y", total: 3 });
    const r2 = agregarSemana([...varias("a", 3, "z"), ...varias("b", 2, "y"), ...varias("c", 1, "z")]);
    expect(r2.categoriaLider).toEqual({ slug: "z", nome: "Z", total: 4 });
  });

  it("total < 5 => categoriaLider null mesmo com pontos", () => {
    const r = agregarSemana(varias("a", 4));
    expect(r.pontos).toHaveLength(1);
    expect(r.categoriaLider).toBeNull();
    expect(agregarSemana(varias("a", 5)).categoriaLider).not.toBeNull();
  });
});
