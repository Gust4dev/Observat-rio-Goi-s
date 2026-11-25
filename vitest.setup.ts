import { vi } from "vitest";

// Fora de uma requisição não há cookies. Os testes escolhem o estado do interruptor pela variável
// MODO_TESTE_FICTICIOS (padrão: ligado, para exercitar os selos); "0" simula o interruptor desligado.
vi.mock("@/lib/modo/servidor", () => ({
  modoAtual: async () => ({ gerados: process.env.MODO_TESTE_FICTICIOS !== "0", alternavel: false }),
}));
