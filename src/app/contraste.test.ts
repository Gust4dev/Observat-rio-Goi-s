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
// Convert CSS OKLCH through linear sRGB, clipping out-of-gamut channels as the browser does.
function luminance(value: string) {
  const match = value.match(/^oklch\(([\d.]+)% ([\d.]+) ([\d.]+)\)$/);
  expect(match, `Cor OKLCH ${value}`).not.toBeNull();
  const l = Number(match![1]) / 100;
  const c = Number(match![2]);
  const h = Number(match![3]) * Math.PI / 180;
  const a = c * Math.cos(h), b = c * Math.sin(h);
  const ll = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mm = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const ss = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const clip = (channel: number) => Math.max(0, Math.min(1, channel));
  return 0.2126 * clip(4.0767416621 * ll - 3.3077115913 * mm + 0.2309699292 * ss)
    + 0.7152 * clip(-1.2684380046 * ll + 2.6097574011 * mm - 0.3413193965 * ss)
    + 0.0722 * clip(-0.0041960863 * ll - 0.7034186147 * mm + 1.707614701 * ss);
}

const pairs: [string, string, number][] = [
  ["texto", "fundo", 4.5], ["texto", "superficie", 4.5],
  ["texto-suave", "fundo", 4.5], ["texto-suave", "superficie", 4.5],
  ["acao", "fundo", 4.5], ["acao", "superficie", 4.5],
  ["sobre-acao", "acao", 4.5], ["sobre-acao", "acao-pressionada", 4.5],
  ["sobre-acao", "erro", 4.5],
  ["territorio", "destaque-suave", 4.5], ["territorio", "fundo", 4.5],
  ["info", "fundo", 4.5], ["terra", "fundo", 4.5],
  ...["destaque", "destaque-suave", "secundario", "acao-suave", "sucesso-fundo", "info-fundo", "neutro-fundo", "erro-fundo"].map((bg): [string, string, number] => ["texto", bg, 4.5]),
  ["erro", "fundo", 4.5], ["erro", "superficie", 4.5],
  ["borda", "fundo", 3], ["borda", "superficie", 3],
  ["foco", "fundo", 3], ["foco", "superficie", 3], ["foco", "acao-suave", 3],
  ["tom-neutro-texto", "tom-neutro-fundo", 4.5],
  ["tom-encerrado-texto", "tom-encerrado-fundo", 4.5],
];

describe("Contraste WCAG 2.x dos pares normativos da seção B", () => {
  it("mantém ouro como superfície e texto de erros sobre fundo suave em tinta escura", () => {
    expect(css).toContain(".text-destaque { color: var(--color-territorio); }");
    expect(css).toContain(".bg-erro-fundo.text-erro { color: var(--color-texto); }");
  });
  it.each(pairs)("%s sobre %s atinge %s:1", (fg, bg, minimum) => {
    const values = [luminance(color(fg)), luminance(color(bg))].sort((a, b) => b - a);
    expect((values[0] + 0.05) / (values[1] + 0.05)).toBeGreaterThanOrEqual(minimum);
  });
});
