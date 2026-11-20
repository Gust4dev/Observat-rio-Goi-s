import { afterEach, describe, expect, it, vi } from "vitest";
import { adminRequest, mensagemErroAdmin, resumoAuditoriaAdmin, rotaColecaoAdmin, rotaFilaAdmin } from "./admin-api";
import { avancarPaginaAdmin, cursorPaginaAdmin, voltarPaginaAdmin } from "./admin-api";

afterEach(() => vi.unstubAllGlobals());

describe("API administrativa do navegador", () => {
  it("volta pelos cursores até a primeira página e usa a continuação recalculada", () => {
    const primeira: (string | null)[] = [null];
    const segunda = avancarPaginaAdmin(primeira, "segunda");
    const terceira = avancarPaginaAdmin(segunda, "terceira");
    expect(cursorPaginaAdmin(terceira)).toBe("terceira");
    expect(cursorPaginaAdmin(voltarPaginaAdmin(terceira))).toBe("segunda");
    expect(cursorPaginaAdmin(voltarPaginaAdmin(segunda))).toBeNull();
    expect(voltarPaginaAdmin(primeira)).toEqual([null]);
    expect(avancarPaginaAdmin(voltarPaginaAdmin(terceira), "nova-terceira")).toEqual([null, "segunda", "nova-terceira"]);
  });
  it("continua a fila com os mesmos filtros e reinicia sem reutilizar cursor", () => {
    const filtros = { ordem: "antigos", pendencia: "denuncia" } as const;
    const page = new URL(rotaFilaAdmin(filtros, "curso+r/?"), "https://app.example");
    expect(Object.fromEntries(page.searchParams)).toEqual({ ordem: "antigos", limite: "50", denuncia: "true", cursor: "curso+r/?" });
    const refreshed = new URL(rotaFilaAdmin(filtros), "https://app.example");
    expect(Object.fromEntries(refreshed.searchParams)).toEqual({ ordem: "antigos", limite: "50", denuncia: "true" });
  });

  it("mantém cada cursor na coleção e ocorrência selecionadas", () => {
    expect(rotaColecaoAdmin("relato", "atualizacoes", "pagina-2"))
      .toBe("/api/admin/ocorrencias/relato?colecao=atualizacoes&limite=50&cursor=pagina-2");
  });

  it("comunica conflito sem reenviar a decisão com o motivo", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ erro: { codigo: "estado_desatualizado" } }, { status: 409 }));
    vi.stubGlobal("fetch", fetchMock);
    const decisao = { acao: "reter", versao_esperada: 3, motivo: "Aguardando avaliação." };
    await expect(adminRequest("/api/admin/ocorrencias/abc/moderar", decisao)).rejects.toMatchObject({
      status: 409,
      message: expect.stringContaining("confirme novamente"),
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(decisao);
  });
  it("usa somente same-origin, no-store e CSRF nas escritas", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    await adminRequest("/api/admin/ocorrencias/abc/moderar", { acao: "aprovar" });
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/ocorrencias/abc/moderar", expect.objectContaining({
      credentials: "same-origin", cache: "no-store", headers: { "Content-Type": "application/json", "X-Observatorio-CSRF": "1" },
    }));
  });

  it("preserva status e distingue dependência indisponível de lista vazia", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ erro: { codigo: "operacao_admin_falhou", mensagem: "Indisponível" } }, { status: 503 })));
    await expect(adminRequest("/api/admin/fila")).rejects.toMatchObject({ status: 503 });
    expect(mensagemErroAdmin(503)).toContain("indisponível");
    expect(mensagemErroAdmin(403)).toContain("permissão");
  });

  it("mapeia sessão expirada e indisponibilidade para feedback operacional específico", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ erro: "falha" }, { status: 401 })));
    await expect(adminRequest("/api/admin/auth/session")).rejects.toMatchObject({
      status: 401, message: "Sua sessão expirou. Entre novamente para continuar.",
    });
    expect(mensagemErroAdmin(503)).toContain("indisponível");
  });

  it("resume a auditoria com ação, IDs e data sem incluir snapshots", () => {
    const evento = {
      acao: "aprovar", ocorrencia_id: "oc-123", admin_id: "admin-456", criado_em: "2026-11-09T20:00:00Z",
      antes: { contato: "privado" }, depois: { token: "privado" },
    };
    expect(resumoAuditoriaAdmin(evento)).toEqual({
      titulo: "aprovar",
      detalhe: "Ocorrência oc-123 · Administração admin-456 · 2026-11-09T20:00:00Z",
    });
  });
});
