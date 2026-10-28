import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";

vi.mock("@/lib/dados/consultas", () => ({
  obterProblema: vi.fn(async () => ({
    problema: {
      id: "11111111-1111-4111-8111-111111111111", protocolo: "GO-123",
      titulo: "Rua sem luz", descricao: "Relato de demonstração", situacao: "recebido",
      verificado: false, publicado_em: "2026-10-26T12:00:00Z", atualizado_em: "2026-10-27T12:00:00Z",
      municipio_id: 1, municipio_nome: "Goiânia", municipio_slug: "goiania",
      categoria_id: 1, categoria_nome: "Iluminação pública", categoria_slug: "iluminacao-publica",
      confirmacoes_total: 2, tem_resposta_oficial: false,
    },
    imagens: [], atualizacoes: [], respostas: [],
  })),
  urlImagem: vi.fn(),
}));

import Pagina from "./page";

it("mantém as duas ações adiadas inativas e explica privacidade e limites da contagem", async () => {
  const html = renderToStaticMarkup(await Pagina({
    params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }),
    searchParams: Promise.resolve({}),
  }));
  for (const rotulo of ["Também me afeta — indisponível", "Sinalizar este relato — indisponível"]) {
    const botao = html.match(new RegExp(`<button[^>]*>${rotulo}</button>`))?.[0];
    expect(botao).toBeDefined();
    expect(botao).toContain('disabled=""');
    expect(botao).toContain('type="button"');
    expect(botao).toContain('aria-describedby="acoes-indisponiveis"');
  }
  expect(html).toContain('id="acoes-indisponiveis"');
  expect(html).toContain("Estas ações aguardam implementação e definição das regras de privacidade.");
  expect(html).toContain("A contagem não mede gravidade nem quantidade total de pessoas afetadas.");
  expect(html).not.toContain("/api/afeta");
  expect(html).not.toContain("/api/denunciar");
});
