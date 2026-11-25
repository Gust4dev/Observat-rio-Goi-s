import { channel } from "node:diagnostics_channel";
import { AsyncLocalStorage } from "node:async_hooks";

const roteiro = new AsyncLocalStorage();
const chamadas = new WeakMap();
const entradas = new WeakMap();
const host = "https://hvekgzxuciyewtybwads.supabase.co";
const etapas = new Map([
  ["/auth/v1/user", "auth"],
  ["/rest/v1/administradores", "papel"],
  ["/rest/v1/rpc/consumir_limite", "limite"],
  ["/rest/v1/rpc/admin_pagina_fila", "rpc_fila"],
  ["/rest/v1/rpc/admin_detalhar_ocorrencia", "rpc_detalhe"],
  ["/rest/v1/rpc/registrar_confirmacao", "rpc_afeta"],
]);

// Registra apenas nomes fixos de etapas, status e duração. Nenhum cabeçalho,
// query, identificador, corpo ou segredo entra na telemetria.
channel("http.server.request.start").subscribe(({ request }) => {
  const path = request.url?.split("?", 1)[0] ?? "";
  const rota = request.method === "POST" && path === "/api/afeta" ? "afeta"
    : request.method === "GET" && (path === "/api/admin/fila" ? "fila"
      : /^\/api\/admin\/ocorrencias\/[a-f0-9-]{36}$/i.test(path) ? "detalhe" : undefined);
  const entrada = rota ? { rota, inicio: performance.now(), remoto: 0, etapas: 0, duracoes: {} } : undefined;
  if (entrada) entradas.set(request, entrada);
  roteiro.enterWith(entrada);
});
channel("undici:request:create").subscribe(({ request }) => {
  const entrada = roteiro.getStore();
  if (!entrada) return;
  const path = request.path.split("?", 1)[0];
  const etapa = request.origin === host ? etapas.get(path)
    : entrada.rota === "afeta" && request.origin === "https://challenges.cloudflare.com"
      && path === "/turnstile/v0/siteverify" ? "turnstile" : undefined;
  if (etapa) chamadas.set(request, { entrada, etapa, inicio: performance.now() });
});
channel("undici:request:headers").subscribe(({ request, response }) => {
  const amostra = chamadas.get(request);
  if (!amostra) return;
  chamadas.delete(request);
  const ms = performance.now() - amostra.inicio;
  amostra.entrada.remoto += ms;
  amostra.entrada.etapas++;
  amostra.entrada.duracoes[amostra.etapa] = Math.round(ms);
  emitir(amostra.entrada.rota, amostra.etapa, ms, response.statusCode);
});
channel("http.server.response.finish").subscribe(({ request, response }) => {
  const entrada = entradas.get(request);
  if (!entrada || entrada.etapas !== (entrada.rota === "afeta" ? 3 : 4)) return;
  entradas.delete(request);
  const total = performance.now() - entrada.inicio;
  emitir(entrada.rota, "servidor", total, response.statusCode);
  emitir(entrada.rota, "residual", Math.max(0, total - entrada.remoto), response.statusCode);
  if (entrada.rota === "afeta") emitir(entrada.rota, "decomposicao", total, response.statusCode, entrada.duracoes);
});

function emitir(rota, etapa, ms, status, duracoes) {
  process.stdout.write(`CARGA_BACKEND ${JSON.stringify([rota, etapa, ms, status, duracoes])}\n`);
}
