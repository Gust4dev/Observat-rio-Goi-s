import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { filtroCursor, montarConsultaLista, montarConsultaPorOcorrencia, urlImagem } from "./consultas";
import { montarQuery } from "./rest";
import { codificarCursor, TAMANHO_PAGINA } from "./params";
import * as schemas from "./schemas";

const T = "2026-10-27T12:34:56.123456+00:00";
const ID = "3f2b8c1e-5a4d-4e6f-8b7a-1c2d3e4f5a6b";

describe("montarConsultaLista", () => {
  it("nunca usa * e nunca pede a coluna busca ou descricao", () => {
    const q = montarQuery(montarConsultaLista({}));
    const select = q.get("select")!;
    expect(select).not.toContain("*");
    expect(select.split(",")).not.toContain("busca");
    expect(select.split(",")).not.toContain("descricao");
    expect(q.get("order")).toBe("publicado_em.desc,id.desc");
    expect(q.get("limit")).toBe(String(TAMANHO_PAGINA + 1));
  });

  it("monta filtros e cursor com valores validados", () => {
    const q = montarQuery(
      montarConsultaLista({ municipio: "goiania", categoria: "saude", cursor: { t: T, id: ID } }),
    );
    expect(q.get("municipio_slug")).toBe("eq.goiania");
    expect(q.get("categoria_slug")).toBe("eq.saude");
    expect(q.get("or")).toBe(`(publicado_em.lt.${T},and(publicado_em.eq.${T},id.lt.${ID}))`);
  });

  it("recusa interpolar entrada não validada", () => {
    expect(() => montarConsultaLista({ municipio: "a,b)" })).toThrow();
    expect(() => montarConsultaLista({ categoria: ")or(" })).toThrow();
    expect(() => filtroCursor({ t: "x,y", id: ID })).toThrow();
    expect(() => filtroCursor({ t: T, id: "*" })).toThrow();
    expect(() => montarConsultaPorOcorrencia(["id"], "nao-e-uuid", undefined)).toThrow();
  });

  it("codifica valores perigosos na query string (URLSearchParams)", () => {
    const q = montarQuery({ select: ["id"], filtros: [["slug", "eq.a&select=*"]] });
    expect(q.toString()).not.toContain("&select=*");
    expect(q.getAll("select")).toEqual(["id"]);
  });
});

describe("montarQuery", () => {
  it("recusa select com * ou nomes estranhos, vazio, limite absurdo", () => {
    expect(() => montarQuery({ select: ["*"] })).toThrow();
    expect(() => montarQuery({ select: ["id", "a,b"] })).toThrow();
    expect(() => montarQuery({ select: ["id(*)"] })).toThrow();
    expect(() => montarQuery({ select: [] })).toThrow();
    expect(() => montarQuery({ select: ["id"], limite: 100000 })).toThrow();
    expect(() => montarQuery({ select: ["id"], filtros: [["a=b", "x"]] })).toThrow();
  });
});

describe("cursor emitido é aceito pelo filtro", () => {
  it("round trip", () => {
    expect(codificarCursor({ t: T, id: ID })).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe("urlImagem", () => {
  const base = "https://hvekgzxuciyewtybwads.supabase.co";
  it("monta URL do bucket público", () => {
    expect(urlImagem("abc/def.jpg", base)).toBe(
      `${base}/storage/v1/object/public/imagens-publicas/abc/def.jpg`,
    );
  });
  it("recusa host não-Supabase, http e sem base", () => {
    expect(urlImagem("a.jpg", "https://evil.com")).toBeNull();
    expect(urlImagem("a.jpg", "http://x.supabase.co")).toBeNull();
    expect(urlImagem("a.jpg", "https://x.supabase.co.evil.com")).toBeNull();
    expect(urlImagem("a.jpg", undefined)).toBeNull();
    expect(urlImagem("a.jpg", "lixo")).toBeNull();
  });
  it("recusa caminhos suspeitos", () => {
    for (const c of ["../x.jpg", "a/../b", "//evil.com/x", "a b.jpg", "a?x=1", "a#x", "", "a\\b", "%2e%2e/x"]) {
      expect(urlImagem(c, base)).toBeNull();
    }
  });
});

describe("DTOs x db/colunas-publicas.json", () => {
  const permitidas: Record<string, string[]> = JSON.parse(
    readFileSync(fileURLToPath(new URL("../../../db/colunas-publicas.json", import.meta.url)), "utf8"),
  );
  const casos: [string, readonly string[]][] = [
    ["v_ocorrencias_publicas", schemas.COLUNAS_PROBLEMA_LISTA],
    ["v_ocorrencias_publicas", schemas.COLUNAS_PROBLEMA_DETALHE],
    ["v_imagens_publicas", schemas.COLUNAS_IMAGEM],
    ["v_atualizacoes_publicas", schemas.COLUNAS_ATUALIZACAO],
    ["v_respostas_publicas", schemas.COLUNAS_RESPOSTA],
    ["v_indicadores_gerais", schemas.COLUNAS_INDICADORES_GERAIS],
    ["v_indicadores_municipio_categoria", schemas.COLUNAS_INDICADOR_MUNICIPIO_CATEGORIA],
    ["v_indicadores_mensal", schemas.COLUNAS_INDICADOR_MENSAL],
    ["v_indicadores_situacao", schemas.COLUNAS_INDICADOR_SITUACAO],
  ];
  it.each(casos)("%s: colunas do select ⊆ lista permitida e sem busca", (view, colunas) => {
    for (const c of colunas) expect(permitidas[view]).toContain(c);
    expect(colunas).not.toContain("busca");
  });
});

describe("schemas rejeitam resposta fora do contrato", () => {
  it("situação desconhecida e campo ausente", () => {
    const ok = {
      id: ID, titulo: "t", situacao: "registrado", verificado: false, publicado_em: T,
      municipio_nome: "A", municipio_slug: "a", categoria_nome: "B", categoria_slug: "b",
      confirmacoes_total: 0, tem_resposta_oficial: false,
    };
    expect(schemas.problemaListaSchema.safeParse(ok).success).toBe(true);
    expect(schemas.problemaListaSchema.safeParse({ ...ok, situacao: "x" }).success).toBe(false);
    expect(schemas.problemaListaSchema.safeParse({ ...ok, titulo: undefined }).success).toBe(false);
  });
});
