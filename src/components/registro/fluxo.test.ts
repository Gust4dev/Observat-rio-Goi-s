import { describe, expect, it } from "vitest";
import { criarCorpoRegistro, criarLinkPrivado, permiteEditarAposErro, tokenDoFragmento } from "./fluxo";

const token = "A".repeat(43);

describe("segredo de acompanhamento no navegador", () => {
  it("libera correção só quando a API rejeita os campos antes de registrar", () => {
    expect(permiteEditarAposErro("entrada_invalida")).toBe(true);
    expect(permiteEditarAposErro("captcha_invalido")).toBe(false);
    expect(permiteEditarAposErro("limite_excedido")).toBe(false);
    expect(permiteEditarAposErro("indisponivel")).toBe(false);
  });

  it("envia somente o hash do token e preserva a chave de idempotência", () => {
    const corpo = criarCorpoRegistro({
      municipio: "goiania", categoria: "mobilidade", titulo: "Buraco na rua",
      descricao: "Há um buraco grande na avenida principal.", tokenHash: "b".repeat(64),
      chaveIdempotencia: "7e3988aa-2c1e-4d9e-a8fa-455e84ce0634", turnstile: "captcha",
    });
    expect(corpo.token_hash).toBe("b".repeat(64));
    expect(JSON.stringify(corpo)).not.toContain(token);
    expect(corpo.chave_idempotencia).toBe("7e3988aa-2c1e-4d9e-a8fa-455e84ce0634");
    expect(corpo).not.toHaveProperty("token");
  });

  it("mantém o token exclusivamente no fragmento e lê fragmentos válidos", () => {
    const link = criarLinkPrivado("https://observatorio.test/acompanhar", token);
    const url = new URL(link);
    expect(url.pathname).toBe("/acompanhar");
    expect(url.search).toBe("");
    expect(url.hash).toBe(`#${token}`);
    expect(tokenDoFragmento(`#${token}`)).toBe(token);
    expect(tokenDoFragmento("?token=segredo")).toBeNull();
    expect(tokenDoFragmento(`#${"A".repeat(42)}!`)).toBeNull();
  });
});
