import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { obterProblema } from "@/lib/dados/consultas";
const consulta = vi.hoisted(() => vi.fn());
vi.mock("@/lib/dados/consultas", async (importOriginal) => ({ ...await importOriginal<typeof import("@/lib/dados/consultas")>(), obterProblema: consulta }));
import Pagina, { generateMetadata } from "./page";
type Dados = NonNullable<Awaited<ReturnType<typeof obterProblema>>>;
const id = "11111111-1111-4111-8111-111111111111";
const props = { params: Promise.resolve({ id }), searchParams: Promise.resolve({}) };
let dados: Dados;
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://observatorio.example");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://teste.supabase.co");
  dados = { problema: { id, protocolo: "GO-123", titulo: "Rua sem luz", descricao: "<script>alert(1)</script>", situacao: "resolvido", verificado: true, publicado_em: "2026-10-26T12:00:00Z", atualizado_em: "2026-10-27T12:00:00Z", municipio_id: 1, municipio_nome: "Goiânia", municipio_slug: "goiania", categoria_id: 1, categoria_nome: "Iluminação pública", categoria_slug: "iluminacao-publica", confirmacoes_total: 2, tem_resposta_oficial: false }, imagens: [], atualizacoes: [], respostas: [] };
  consulta.mockImplementation(async () => dados);
});
describe("detalhe público", () => {
  it("compartilha somente URL pública, ordena informações e não confirma resolução sem documentos", async () => {
    const html = renderToStaticMarkup(await Pagina(props));
    expect(html).toContain("Compartilhar no WhatsApp");
    expect(html).toContain(encodeURIComponent(`https://observatorio.example/problema/${id}`));
    expect(html).toContain("Resolução sem documentação");
    expect(html).toContain("Conferido pela equipe");
    expect(html.indexOf("Iluminação pública")).toBeLessThan(html.indexOf("Rua sem luz"));
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("/acompanhar");
    expect(html).toContain("disabled");
  });
  it("metadata mantém estado honesto e canonical público", async () => {
    const meta = await generateMetadata(props);
    expect(meta.twitter).toMatchObject({ title: "Rua sem luz", images: [{ url: "/opengraph-image.png", alt: "Observatório Goiás" }] });
    expect(meta.description).toContain("Resolução sem documentação");
    expect(meta.alternates?.canonical).toBe(`https://observatorio.example/problema/${id}`);
    expect(JSON.stringify(meta)).not.toContain("GO-123");
  });
  it("não publica resposta sem data e mostra resolução apenas com justificativa e evidência", async () => {
    dados.respostas = [{ id: 1, ocorrencia_id: id, autor_vinculo: "Órgão pendente", texto: "Resposta pendente", publicada_em: null }];
    dados.atualizacoes = [{ id: 1, ocorrencia_id: id, tipo: "mudanca_situacao", situacao_nova: "resolvido", texto: "Reparo documentado", evidencia: "Relatório público", criado_em: "2026-10-27T12:00:00Z" }];
    const html = renderToStaticMarkup(await Pagina(props));
    expect(html).not.toContain("Resposta pendente");
    expect(html).toContain("Como sabemos que foi resolvido");
    expect(html).toContain("Relatório público");
    expect((await generateMetadata(props)).description).toContain("situação: Resolvido");
  });
  it("retorna a mesma ausência e notFound para qualquer relato invisível", async () => {
    consulta.mockResolvedValue(null);
    expect((await generateMetadata(props)).title).toBe("Relato não encontrado");
    await expect(Pagina(props)).rejects.toMatchObject({ digest: "NEXT_HTTP_ERROR_FALLBACK;404" });
  });
});

// Integração com o renderizador real do Next: valida o artefato PNG entregue ao crawler.
import Imagem, { size } from "./opengraph-image";
it("gera PNG neutro 1200 por 630 para o relato público", async () => {
  const resposta = await Imagem({ params: props.params });
  const png = Buffer.from(await resposta.arrayBuffer());
  expect(resposta.headers.get("content-type")).toBe("image/png");
  expect(png.subarray(1, 4).toString()).toBe("PNG");
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(630);
  const sharp = (await import("sharp")).default;
  const actual = await sharp(png).extract({ left: 80, top: 64, width: 64, height: 64 }).removeAlpha().raw().toBuffer();
  const expected = await sharp("public/brand/favicon.png").resize(64, 64).flatten({ background: "#F7F5EF" }).removeAlpha().raw().toBuffer();
  const difference = actual.reduce((sum, value, index) => sum + Math.abs(value - expected[index]), 0) / actual.length;
  expect(difference).toBeLessThan(5);
  expect(size).toEqual({ width: 1200, height: 630 });
});
it("imagem social usa a mesma ausência pública", async () => {
  consulta.mockResolvedValue(null);
  await expect(Imagem({ params: props.params })).rejects.toMatchObject({ digest: "NEXT_HTTP_ERROR_FALLBACK;404" });
});
it("fotos públicas usam somente o alt revisado e o UUID no caminho público", async () => {
  dados.imagens = [{ id, ocorrencia_id: id, ordem: 1, descricao_publica: "Buraco no pavimento, sem pessoas ou placas visíveis" }];
  const html = renderToStaticMarkup(await Pagina(props));
  expect(html).toContain('alt="Buraco no pavimento, sem pessoas ou placas visíveis"');
  expect(html).toContain(`${id}.jpg`);
  expect(html).toContain('loading="lazy"');
  expect(html).not.toContain("Descrição visual não informada");
});
it("omite compartilhamento se não existe domínio público seguro", async () => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://usuario:segredo@observatorio.example");
  const html = renderToStaticMarkup(await Pagina(props));
  expect(html).not.toContain("wa.me");
  expect(html).not.toContain("segredo");
  expect((await generateMetadata(props)).alternates).toBeUndefined();
});

it("exibe somente resposta publicada após a situação, com data e vínculo não confirmado", async () => {
  dados.respostas = [
    { id: 1, ocorrencia_id: id, autor_vinculo: "Vínculo pendente", texto: "Texto aguardando revisão", publicada_em: null },
    { id: 2, ocorrencia_id: id, autor_vinculo: "Órgão declarado", texto: '<script>alert(1)</script>Resposta publicada', publicada_em: "2026-10-28T12:00:00Z" },
  ];
  const html = renderToStaticMarkup(await Pagina(props));
  expect(html).not.toContain("Vínculo pendente");
  expect(html).not.toContain("Texto aguardando revisão");
  expect(html).not.toContain("Ainda não há resposta oficial publicada");
  expect(html).toContain("Vínculo informado: Órgão declarado");
  expect(html).toContain("Vínculo não confirmado pela equipe");
  expect(html).toContain('dateTime="2026-10-28T12:00:00Z"');
  expect(html).toContain("28 de outubro de 2026");
  expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;Resposta publicada");
  expect(html).not.toContain("<script>");
  expect(html.indexOf("Resolução sem documentação")).toBeLessThan(html.indexOf("<h2>Resposta oficial</h2>"));
  expect(html.indexOf("<h2>Resposta oficial</h2>")).toBeLessThan(html.indexOf("O que foi relatado"));
});
