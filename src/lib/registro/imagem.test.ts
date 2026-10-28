import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { prepararImagem } from "./imagem";

describe("pipeline privado de fotos", () => {
  it("reencoda e remove EXIF/GPS", async () => {
    const original = await sharp({ create: { width: 20, height: 20, channels: 3, background: "red" } }).jpeg().withExif({ IFD0: { Artist: "privado" }, IFD3: { GPSLatitudeRef: "N" } }).toBuffer();
    expect((await sharp(original).metadata()).exif).toBeDefined();
    const resultado = await prepararImagem(original, "image/jpeg");
    expect((await sharp(resultado).metadata()).exif).toBeUndefined();
    expect((await sharp(resultado).metadata()).format).toBe("jpeg");
  });
  it("rejeita spoof, SVG, corrompido e arquivo grande", async () => {
    const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: "red" } }).png().toBuffer();
    await expect(prepararImagem(png, "image/jpeg")).rejects.toThrow();
    await expect(prepararImagem(Buffer.from("<svg><script/></svg>"), "image/svg+xml")).rejects.toThrow();
    await expect(prepararImagem(Buffer.from([255, 216, 255, 0]), "image/jpeg")).rejects.toThrow();
    await expect(prepararImagem(Buffer.alloc(2 * 1024 * 1024 + 1), "image/jpeg")).rejects.toThrow();
  });
  it("recusa dimensões excessivas antes de reencodar", async () => {
    const largo = await sharp({ create: { width: 13001, height: 1, channels: 3, background: "red" } }).png().toBuffer();
    await expect(prepararImagem(largo, "image/png")).rejects.toThrow();
  });
});
