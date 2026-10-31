import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const aqui = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": aqui("./src"),
      // 'server-only' lança erro fora do bundler do Next; nos testes vira um módulo vazio.
      "server-only": aqui("./src/lib/dados/stub-server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "scripts/**/*.test.mjs"],
  },
});
