import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }) }));
import { BuscaMunicipio } from "./BuscaMunicipio";

describe("BuscaMunicipio (SSR)", () => {
  const html = renderToStaticMarkup(createElement(BuscaMunicipio, { municipios: [{ slug: "goiania", nome: "Goiânia" }] }));
  it("form GET para /buscar com combobox rotulado", () => {
    expect(html).toContain('method="get"');
    expect(html).toContain('action="/buscar"');
    expect(html).toContain('name="q"');
    expect(html).toContain('role="combobox"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-autocomplete="list"');
    expect(html).toMatch(/aria-controls="[^"]+"/);
    expect(html).toMatch(/<label[^>]*for="[^"]+"[^>]*>[^<]+/);
  });
  it("botão de GPS com texto, type=button e alvo de 48px", () => {
    expect(html).toMatch(/<button[^>]*type="button"[^>]*>[^<]*Usar minha localização/);
    expect(html).toContain("min-h-12");
  });
});
