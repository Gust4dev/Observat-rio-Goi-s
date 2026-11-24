export class AdminApiError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

export function mensagemErroAdmin(status: number): string {
  if (status === 401) return "Sua sessão expirou. Entre novamente para continuar.";
  if (status === 403) return "Sua conta não tem permissão para esta ação.";
  if (status === 409) return "O item mudou desde que foi carregado. Recarregue o estado, confira a decisão atual e confirme novamente.";
  if (status === 429) return "Muitas solicitações. Aguarde um pouco e tente novamente.";
  if (status === 503 || status >= 500) return "O serviço administrativo está indisponível. Tente novamente mais tarde.";
  if (status === 404) return "O item não foi encontrado ou já foi removido.";
  return "Não foi possível concluir a operação. Confira os dados e tente novamente.";
}

export function resumoAuditoriaAdmin(evento: { acao?: string | null; ocorrencia_id?: string | null; admin_id?: string | null; criado_em?: string | null }) {
  const detalhe = [
    evento.ocorrencia_id ? `Ocorrência ${evento.ocorrencia_id}` : "",
    evento.admin_id ? `Administração ${evento.admin_id}` : "",
    evento.criado_em || "",
  ].filter(Boolean).join(" · ");
  return { titulo: evento.acao || "Evento administrativo", detalhe };
}

export type ColecaoAdmin = "denuncias" | "respostas" | "atualizacoes";
export type FiltrosFilaAdmin = {
  ordem: "antigos" | "recentes";
  pendencia: "" | "denuncia" | "foto_pendente";
  moderacao?: "" | "publicado" | "removido";
};
export type HistoricoPaginasAdmin = readonly (string | null)[];
export const primeiraPaginaAdmin: HistoricoPaginasAdmin = [null];

export function cursorPaginaAdmin(historico: HistoricoPaginasAdmin) {
  return historico[historico.length - 1] ?? null;
}

export function avancarPaginaAdmin(historico: HistoricoPaginasAdmin, cursor: string): HistoricoPaginasAdmin {
  return [...historico, cursor];
}

export function voltarPaginaAdmin(historico: HistoricoPaginasAdmin): HistoricoPaginasAdmin {
  return historico.length > 1 ? historico.slice(0, -1) : primeiraPaginaAdmin;
}

export function rotaFilaAdmin(filtros: FiltrosFilaAdmin, cursor?: string | null) {
  const query = new URLSearchParams({ ordem: filtros.ordem, limite: "50" });
  if (filtros.moderacao) query.set("moderacao", filtros.moderacao);
  if (filtros.pendencia) query.set(filtros.pendencia, "true");
  if (cursor) query.set("cursor", cursor);
  return "/api/admin/fila?" + query;
}

export function rotaRevisaoAdmin(colecao: "denuncias" | "respostas", status: string, cursor?: string | null) {
  const query = new URLSearchParams({ limite: "50" });
  if (status) query.set("status", status);
  if (cursor) query.set("cursor", cursor);
  return "/api/admin/" + colecao + "?" + query;
}

export function rotaColecaoAdmin(id: string, colecao: ColecaoAdmin, cursor?: string | null) {
  const query = new URLSearchParams({ colecao, limite: "50" });
  if (cursor) query.set("cursor", cursor);
  return "/api/admin/ocorrencias/" + encodeURIComponent(id) + "?" + query;
}

export async function adminRequest<T = unknown>(path: string, body?: unknown): Promise<T> {
  if (!path.startsWith("/api/admin/")) throw new Error("Rota administrativa inválida.");
  const response = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: body === undefined ? undefined : { "Content-Type": "application/json", "X-Observatorio-CSRF": "1" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new AdminApiError(response.status, mensagemErroAdmin(response.status));
  return data as T;
}
