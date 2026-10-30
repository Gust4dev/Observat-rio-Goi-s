import { afterEach, expect, it, vi } from "vitest";
import { criarLoggerRequisicao } from "./logger";

afterEach(() => vi.restoreAllMocks());

it("descarta campos arbitrários, mensagens de erro e valores inválidos antes de registrar", () => {
  const output = vi.spyOn(console, "info").mockImplementation(() => {});
  const logger = criarLoggerRequisicao(new Request("https://app.test/?email=pessoa@example.test", {
    headers: { "x-request-id": "secret", authorization: "Bearer secret" },
  }));
  logger.registrar("saude.verificada", {
    status: 200,
    banco: "ok",
    duracaoMs: 12,
    token: "secret",
    error: new Error("pessoa@example.test"),
  } as Parameters<typeof logger.registrar>[1]);
  const record = JSON.parse(output.mock.calls[0][0]);
  expect(record).toMatchObject({ requestId: logger.requestId, metodo: "GET", evento: "saude.verificada", status: 200, banco: "ok", duracaoMs: 12 });
  expect(Object.keys(record).sort()).toEqual(["banco", "duracaoMs", "evento", "metodo", "nivel", "requestId", "status", "timestamp"].sort());
  expect(JSON.stringify(record)).not.toMatch(/secret|example|token|authorization/);
  logger.registrar("saude.verificada", { status: "secret", banco: "pessoa@example.test", duracaoMs: Infinity } as never);
  expect(JSON.parse(output.mock.calls[1][0])).not.toHaveProperty("banco");
  expect(JSON.parse(output.mock.calls[1][0])).not.toHaveProperty("status");
  expect(JSON.parse(output.mock.calls[1][0])).not.toHaveProperty("duracaoMs");
});
