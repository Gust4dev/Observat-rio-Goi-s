import { expect, it, vi } from "vitest";
import { carregarExportacao, exportarCSV, lerParametrosExportacao, LimiteExportacao } from "./exportacao";
import type { DadoPainel } from "./schemas";

const linha = (n = 1): DadoPainel => ({ id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`, municipio_slug: "goiania", municipio_nome: "Goiânia", categoria_slug: "saude", categoria_nome: "Saúde", mes: "2026-01-01", situacao: "registrado", total: 5, com_resposta_oficial: 0, resolvidas_documentadas: 0 });

it("recusa parâmetros desconhecidos, duplicados e filtros injetados", () => {
  for (const query of ["foo=1", "municipio=a&municipio=b", "categoria=a,b)", "formato=xml", "municipio=", "cursor=a", "__proto__=a"]) {
    expect(() => lerParametrosExportacao(new URLSearchParams(query))).toThrow();
  }
  expect(lerParametrosExportacao(new URLSearchParams("municipio=goiania&categoria=saude&formato=csv"))).toEqual({ municipio: "goiania", categoria: "saude", formato: "csv" });
});

it("pagina deterministically com filtros e DTO sem colunas extras", async () => {
  const consultar = vi.fn().mockResolvedValueOnce(Array.from({ length: 300 }, (_, n) => linha(n + 1))).mockResolvedValueOnce([{ ...linha(301), url_privada: "secret" }]);
  const dados = await carregarExportacao({ municipio: "goiania", categoria: "saude" }, consultar);
  expect(dados).toHaveLength(301);
  expect(dados[300]).not.toHaveProperty("url_privada");
  expect(consultar.mock.calls[1][0]).toMatchObject({ filtros: [["municipio_slug", "eq.goiania"], ["categoria_slug", "eq.saude"], ["id", `gt.${linha(300).id}`]], ordem: [{ coluna: "id", direcao: "asc" }] });
});

it("recusa 5001 células sem retornar exportação parcial; permite exatamente 5000", async () => {
  for (const total of [5000, 5001]) {
    let inicio = 0;
    const resultado = carregarExportacao({}, async ({ limite = 300 }) => {
      const lote = Array.from({ length: Math.min(limite, total - inicio) }, (_, n) => linha(inicio + n + 1));
      inicio += lote.length;
      return lote;
    });
    if (total === 5000) expect(await resultado).toHaveLength(5000);
    else await expect(resultado).rejects.toBeInstanceOf(LimiteExportacao);
  }
});

it("propaga falha e recusa DTO inválido", async () => {
  await expect(carregarExportacao({}, async () => { throw new Error("db"); })).rejects.toThrow("db");
  await expect(carregarExportacao({}, async () => [{ ...linha(), total: -1 }])).rejects.toThrow();
});

it("CSV tem BOM, esquema explícito, escaping e neutralização de fórmulas", () => {
  const csv = exportarCSV([{ ...linha(), municipio_nome: ' =SUM(1,2)"\n', categoria_nome: "@formula" }]);
  expect(csv.startsWith("\uFEFFid,municipio_slug,municipio_nome,")).toBe(true);
  expect(csv).toContain('"\' =SUM(1,2)""\n"');
  expect(csv).toContain('"\'@formula"');
  expect(csv.endsWith("\r\n")).toBe(true);
});
