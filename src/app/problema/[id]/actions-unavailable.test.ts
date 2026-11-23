import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";

vi.mock("next/navigation", async original => ({
  ...await original<typeof import("next/navigation")>(),
  useRouter: () => ({ refresh: () => {} }),
}));

afterEach(() => vi.unstubAllEnvs());

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

it("exibe as três ações no detalhe da beta protegida com formulários POST", async () => {
  const ref = "abcdefghijklmnopqrst";
  for (const [nome, valor] of Object.entries({
    NODE_ENV: "production", VERCEL: "1", VERCEL_ENV: "production",
    AMBIENTE_REGISTRO: "production", BETA_REGISTRO_TEXTUAL_ATIVA: "true",
    BETA_REGISTRO_PROTEGIDA_VERCEL: "true", BETA_PARTICIPACAO_PROTEGIDA_VERCEL: "true",
    SUPABASE_PRODUCTION_DATA_APPROVED: "true", SUPABASE_PRODUCTION_PROJECT_REF: ref,
    NEXT_PUBLIC_SUPABASE_URL: `https://${ref}.supabase.co`, FOTOS_HABILITADAS: "false",
    MODO_PUBLICACAO: "moderar_tudo", AFETA_HABILITADO: "true",
  })) vi.stubEnv(nome, valor);
  const html = renderToStaticMarkup(await Pagina({
    params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }),
    searchParams: Promise.resolve({}),
  }));
  expect(html).toContain('>Também me afeta</button>');
  expect(html).toContain('action="/api/denunciar"');
  expect(html).toContain('action="/api/resposta"');
  expect(html.match(/method="post"/g)).toHaveLength(2);
  expect(html).not.toContain("ações aguardam implementação");
});
