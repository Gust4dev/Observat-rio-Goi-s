import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("./rest", async (original) => ({ ...(await original<typeof import("./rest")>()), consultar: vi.fn() }));

import { resumoSemana } from "./consultas";
import { consultar } from "./rest";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const linha = (n: number) => ({
  id: id(n), municipio_slug: "a", municipio_nome: "A", categoria_slug: "saude", categoria_nome: "Saúde",
});

describe("resumoSemana", () => {
  beforeEach(() => vi.mocked(consultar).mockReset());

  it("envia filtro gte em publicado_em, pagina por id enquanto o lote vier cheio e agrega", async () => {
    const lote = Array.from({ length: 300 }, (_, i) => linha(i + 1));
    vi.mocked(consultar).mockResolvedValueOnce(lote).mockResolvedValueOnce([linha(301)]);
    const r = await resumoSemana();
    expect(consultar).toHaveBeenCalledTimes(2);
    const [view, op1] = vi.mocked(consultar).mock.calls[0];
    expect(view).toBe("v_ocorrencias_publicas");
    const gte = op1.filtros!.find(([c]) => c === "publicado_em")!;
    expect(gte[1]).toMatch(/^gte\.\d{4}-\d{2}-\d{2}T/);
    expect(op1.limite).toBe(300);
    const op2 = vi.mocked(consultar).mock.calls[1][1];
    expect(op2.filtros).toContainEqual(["id", `gt.${id(300)}`]);
    expect(r.total).toBe(301);
    expect(r.pontos).toEqual([{ slug: "a", nome: "A", total: 301 }]);
  });

  it("para no primeiro lote incompleto", async () => {
    vi.mocked(consultar).mockResolvedValueOnce([linha(1)]);
    expect((await resumoSemana()).total).toBe(1);
    expect(consultar).toHaveBeenCalledTimes(1);
  });
});
