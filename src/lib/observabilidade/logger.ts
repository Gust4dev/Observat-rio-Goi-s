import "server-only";
import { randomUUID } from "node:crypto";

type Evento = "saude.verificada" | "requisicao.concluida" | "requisicao.falhou";
export type EstadoBanco = "ok" | "nao_configurado" | "indisponivel";
type DadosOperacionais = { status?: number; duracaoMs?: number; banco?: EstadoBanco };

const EVENTOS: readonly string[] = ["saude.verificada", "requisicao.concluida", "requisicao.falhou"];
const METODOS: readonly string[] = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"];

/** Somente campos operacionais permitidos; nunca serializa Request, erro ou dados arbitrários. */
export function criarLoggerRequisicao(request: Request) {
  const requestId = randomUUID();
  const metodo = METODOS.includes(request.method) ? request.method : "OUTRO";

  return {
    requestId,
    registrar(evento: Evento, dados: DadosOperacionais = {}) {
      if (!EVENTOS.includes(evento)) return;
      const campos: DadosOperacionais = {};
      if (typeof dados.status === "number" && Number.isInteger(dados.status) && dados.status >= 100 && dados.status <= 599) {
        campos.status = dados.status;
      }
      if (typeof dados.duracaoMs === "number" && Number.isFinite(dados.duracaoMs) && dados.duracaoMs >= 0) {
        campos.duracaoMs = Math.round(dados.duracaoMs);
      }
      if (dados.banco === "ok" || dados.banco === "nao_configurado" || dados.banco === "indisponivel") {
        campos.banco = dados.banco;
      }
      const nivel = evento === "requisicao.falhou" ? "error" : "info";
      const linha = JSON.stringify({ timestamp: new Date().toISOString(), nivel, requestId, metodo, evento, ...campos });
      if (nivel === "error") console.error(linha);
      else console.info(linha);
    },
  };
}
