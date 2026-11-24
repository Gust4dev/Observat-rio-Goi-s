import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Pagina from "./page";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

// A página é síncrona: div > [header, Suspense > filho assíncrono que lê searchParams].
async function resolver(q?: string | string[]) {
  const raiz = Pagina({ params: Promise.resolve({}), searchParams: Promise.resolve(q === undefined ? {} : { q }) } as unknown as Props & Parameters<typeof Pagina>[0]) as ReactElement<{
    children: [unknown, ReactElement<{ children: ReactElement<unknown, (p: unknown) => Promise<ReactElement>> }>];
  }>;
  const filho = raiz.props.children[1].props.children;
  return renderToStaticMarkup(await filho.type(filho.props));
}

describe("/buscar", () => {
  it("um único match redireciona para o município", async () => {
    await expect(resolver("Anápolis")).rejects.toMatchObject({
      digest: expect.stringContaining("/municipios/anapolis"),
    });
  });

  it("vários matches listam links para os municípios", async () => {
    const html = await resolver("goian");
    expect((html.match(/href="\/municipios\//g) ?? []).length).toBeGreaterThan(1);
    expect(html).toContain('action="/buscar"');
  });

  it("nenhum match mostra mensagem e o campo de busca", async () => {
    const html = await resolver("zzzzzz");
    expect(html).toContain("Nenhum município encontrado");
    expect(html).toContain('name="q"');
  });

  it("q ausente ou vazia pede um nome", async () => {
    for (const q of [undefined, "", "   "]) {
      const html = await resolver(q);
      expect(html).toContain("Digite o nome de um município");
      expect(html).toContain('name="q"');
    }
  });

  it("q gigante não quebra", async () => {
    const html = await resolver("a".repeat(500));
    expect(html).toContain('name="q"');
    expect(html).not.toContain("a".repeat(100));
  });

  it("q em array usa o primeiro valor", async () => {
    await expect(resolver(["Anápolis", "x"])).rejects.toMatchObject({
      digest: expect.stringContaining("/municipios/anapolis"),
    });
  });
});
