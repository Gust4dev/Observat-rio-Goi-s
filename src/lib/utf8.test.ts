import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { extname, join } from "node:path";
import { expect, it } from "vitest";

const extensoes = new Set([".sql", ".ts", ".tsx", ".mjs", ".md", ".json", ".css"]);

it("rejeita sequências de bytes inválidas em UTF-8", () => {
  expect(() => new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.of(0xc3, 0x28))).toThrow();
});

it("mantém todos os arquivos de texto rastreados em UTF-8 válido", () => {
  const raiz = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
  const arquivos = execFileSync("git", ["ls-files", "-z"], { cwd: raiz, encoding: "utf8" })
    .split("\0").filter((arquivo) => extensoes.has(extname(arquivo)));
  expect(arquivos.length).toBeGreaterThan(0);
  const invalidos = arquivos.filter((arquivo) => {
    const bytes = readFileSync(join(raiz, arquivo));
    try {
      new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      return false;
    } catch {
      return true;
    }
  });
  expect(invalidos, "Arquivos rastreados com UTF-8 inválido").toEqual([]);
});
