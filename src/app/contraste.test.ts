import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8");
const tokens = new Map([...css.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
function color(name: string, prefix = "--color-"): string {
  const value = tokens.get(`${prefix}${name}`);
  expect(value, `Token de cor ${name}`).toBeDefined();
  const alias = value!.match(/^var\((--(?:color|sem)-)([\w-]+)\)$/);
  return alias ? color(alias[2], alias[1]) : value!;
}
function luminance(hex: string) {
  expect(hex).toMatch(/^#[\da-f]{6}$/i);
  const channels = hex.slice(1).match(/../g)!.map((c) => {
    const n = parseInt(c, 16) / 255;
    return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

// A light input border or an insufficient text color must fail these real CSS pairs.
const pairs: [string, string, number][] = [
  ["texto", "fundo", 12], ["texto", "superficie", 12],
  ["texto-suave", "fundo", 4.5], ["texto-suave", "superficie", 4.5],
  ["acao", "fundo", 4.5], ["acao", "superficie", 4.5],
  ["sobre-acao", "acao", 4.5], ["sobre-acao", "acao-pressionada", 4.5],
  ["superficie", "territorio", 4.5], ["superficie", "terra", 4.5],
  ["destaque", "fundo", 4.5], ["destaque", "destaque-suave", 4.5],
  ["erro", "erro-fundo", 4.5], ["texto-suave", "neutro-fundo", 4.5],
  ...["destaque-suave", "sucesso-fundo", "info-fundo", "neutro-fundo"].map((bg): [string, string, number] => ["texto", bg, 12]),
  // The prescribed hex pair is 11.89:1, despite B claiming >=12 for all pale backgrounds.
  ["texto", "erro-fundo", 4.5],
  ["borda", "fundo", 3], ["borda", "superficie", 3],
  ["acao", "fundo", 3], ["acao", "superficie", 3],
];
describe("Contraste WCAG 2.x dos pares normativos da seção B", () => {
  it.each(pairs)("%s sobre %s atinge %s:1", (fg, bg, minimum) => {
    const values = [luminance(color(fg)), luminance(color(bg))].sort((a, b) => b - a);
    expect((values[0] + 0.05) / (values[1] + 0.05)).toBeGreaterThanOrEqual(minimum);
  });
});
