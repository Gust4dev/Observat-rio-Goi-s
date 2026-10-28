import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { AcompanharClient } from "./AcompanharClient";

describe("acompanhamento privado", () => {
  it("oferece consulta explícita, sem enviar credencial na montagem", () => {
    const html = renderToStaticMarkup(createElement(AcompanharClient));
    expect(html).toContain("Consultar acompanhamento");
    const fonte = readFileSync("src/components/registro/AcompanharClient.tsx", "utf8");
    expect(fonte).not.toContain("queueMicrotask");
  });
  it("limpa segredo depois da consulta e permite reapresentá-lo para exclusão", () => {
    const fonte = readFileSync("src/components/registro/AcompanharClient.tsx", "utf8");
    expect(fonte).toContain('window.dispatchEvent(new HashChangeEvent("hashchange"))');
    expect(fonte).toContain('name="link-privado"');
    expect(fonte).toContain('referrerPolicy: "no-referrer"');
    expect(fonte).toContain('titulo.current?.focus()');
  });
  it("HTML público não contém segredo, campo de protocolo nem resultado privado", () => {
    const html = renderToStaticMarkup(createElement(AcompanharClient));
    expect(html).not.toMatch(/name="(?:token|protocolo)"|Atualizações|Respostas publicadas/);
    const pagina = readFileSync("src/app/acompanhar/page.tsx", "utf8");
    expect(pagina).toContain("index: false, follow: false");
    expect(pagina).not.toMatch(/searchParams|generateMetadata|location.hash/);
  });
});
