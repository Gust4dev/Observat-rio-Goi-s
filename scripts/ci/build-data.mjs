import { createServer } from "node:http";

// CI-only empty public data for prerendering. Never connect to a real Supabase.
const resources = new Set([
  "/rest/v1/v_dados_painel",
  "/rest/v1/municipios",
  "/rest/v1/categorias",
  "/rest/v1/v_imagens_publicas",
  "/rest/v1/v_atualizacoes_publicas",
  "/rest/v1/v_respostas_publicas",
  "/rest/v1/v_indicadores_gerais",
  "/rest/v1/v_indicadores_municipio_categoria",
  "/rest/v1/v_indicadores_mensal",
  "/rest/v1/v_indicadores_situacao",
  "/rest/v1/v_ocorrencias_publicas",
]);

createServer((request, response) => {
  const path = new URL(request.url, "http://127.0.0.1").pathname;
  if (request.method === "HEAD" && path === "/rest/v1/municipios") {
    response.writeHead(200, { "Content-Type": "application/json" }).end();
    return;
  }
  if (request.method !== "GET" || !resources.has(path)) {
    console.error(`Unexpected CI fixture request: ${request.method} ${path}`);
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, { "Content-Type": "application/json" });
  response.end("[]");
}).listen(54321, "127.0.0.1");
