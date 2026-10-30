import { beforeEach, expect, it, vi } from "vitest";
import { LimiteExportacao } from "@/lib/dados/exportacao";
vi.mock("@/lib/dados/consultas", () => ({ obterExportacaoDados: vi.fn() }));
import { obterExportacaoDados } from "@/lib/dados/consultas";
import { GET } from "./route";
const consulta = vi.mocked(obterExportacaoDados);
beforeEach(() => consulta.mockReset());
it("JSON e CSV têm tipo e cache públicos explícitos", async () => {
  consulta.mockResolvedValue([]);
  const json = await GET(new Request("https://site/api/dados?municipio=goiania"));
  expect(await json.json()).toEqual({ dados: [], total_linhas: 0 });
  expect(consulta).toHaveBeenCalledWith({ municipio: "goiania" });
  expect(json.headers.get("cache-control")).toContain("public");
  expect(json.headers.get("content-type")).toContain("application/json");
  const csv = await GET(new Request("https://site/api/dados?formato=csv"));
  expect(csv.headers.get("content-type")).toBe("text/csv; charset=utf-8");
  expect(csv.headers.get("content-disposition")).toContain("attachment");
  expect((await csv.arrayBuffer()).byteLength).toBeGreaterThan(3);
});
it("entrada inválida não consulta e falhas nunca viram exportações vazias", async () => {
  const invalida = await GET(new Request("https://site/api/dados?limite=1"));
  expect(invalida.status).toBe(400);
  expect(consulta).not.toHaveBeenCalled();
  for (const [erro, status] of [[new LimiteExportacao(), 422], [new Error("segredo"), 503]] as const) {
    consulta.mockRejectedValueOnce(erro);
    const resposta = await GET(new Request("https://site/api/dados"));
    expect(resposta.status).toBe(status);
    expect(resposta.headers.get("cache-control")).toBe("no-store");
    expect(await resposta.text()).not.toContain("segredo");
  }
});
