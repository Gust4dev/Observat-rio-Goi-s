import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Resposta } from "@/lib/dados/schemas";
import { RespostaOficial } from "./RespostaOficial";

const resposta: Resposta = {
  id: 1,
  ocorrencia_id: "11111111-1111-4111-8111-111111111111",
  autor_vinculo: "Secretaria informada",
  texto: "Vistoria prevista.\nAguardamos confirmação.",
  publicada_em: "2026-10-27T12:00:00Z",
};
const render = (dados?: Resposta | null) => renderToStaticMarkup(createElement(RespostaOficial, { resposta: dados }));

describe("resposta oficial pública", () => {
  it("mantém texto e vínculo pendentes invisíveis e mostra somente ausência pública", () => {
    const html = render({ ...resposta, publicada_em: null });
    expect(html).not.toContain(resposta.texto);
    expect(html).not.toContain(resposta.autor_vinculo);
    expect(html).not.toContain('aria-label="Resposta oficial"');
    expect(html).toContain("Ainda não há resposta oficial publicada");
    expect(render()).toBe(html);
  });

  it("mostra rótulo, data de publicação legível e texto integral", () => {
    const html = render(resposta);
    expect(html).toContain("<h2>Resposta oficial</h2>");
    expect(html).toContain('dateTime="2026-10-27T12:00:00Z"');
    expect(html).toContain("27 de outubro de 2026");
    expect(html).toContain(resposta.texto);
  });

  it("trata vínculo informado como não confirmado", () => {
    const html = render(resposta);
    expect(html).toContain("Vínculo informado: Secretaria informada");
    expect(html).toContain("Vínculo não confirmado pela equipe");
  });

  it("não inventa identificação quando o vínculo está em branco", () => {
    const html = render({ ...resposta, autor_vinculo: "   " });
    expect(html).not.toContain("Vínculo informado:");
    expect(html).toContain("Vínculo não confirmado pela equipe");
    expect(html).not.toMatch(/<img|<svg|Secretaria|Prefeito|Secretário/);
    expect(html).toContain(resposta.texto);
  });

  it("escapa HTML hostil no texto e no vínculo sem criar elementos ou links", () => {
    const html = render({ ...resposta, autor_vinculo: '<img src=x onerror="alert(1)">', texto: '<script>alert(1)</script>\n<a href="javascript:alert(1)">Texto</a>' });
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(html).toContain("&lt;a href=&quot;javascript:alert(1)&quot;&gt;Texto&lt;/a&gt;");
    expect(html).not.toMatch(/<script|<img|<a /);
  });
});
