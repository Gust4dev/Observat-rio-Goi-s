import "server-only";
import sharp from "sharp";
import { ErroRegistro } from "./erros";

sharp.concurrency(1);
sharp.cache({ memory: 16, files: 0, items: 16 });

export const MAX_IMAGEM = 2 * 1024 * 1024;
export async function prepararImagem(bytes: Buffer, mime: string): Promise<Buffer> {
  if (!bytes.length || bytes.length > MAX_IMAGEM) throw new ErroRegistro("corpo_grande");
  const tipo = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? "jpeg"
    : bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? "png"
    : bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP" ? "webp" : null;
  if (!tipo || mime !== `image/${tipo}`) throw new ErroRegistro("entrada_invalida");
  try {
    const imagem = sharp(bytes, { limitInputPixels: 24_000_000, failOn: "warning", animated: false });
    const meta = await imagem.metadata();
    if (!meta.width || !meta.height || meta.width > 12000 || meta.height > 12000 || (meta.pages ?? 1) > 1 || meta.format !== tipo) throw new Error();
    // sharp strips all metadata by default; never call withMetadata/keepMetadata.
    const saida = await imagem.rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).flatten({ background: "white" }).jpeg({ quality: 80 }).toBuffer();
    if (saida.length > MAX_IMAGEM) throw new Error();
    return saida;
  } catch { throw new ErroRegistro("entrada_invalida"); }
}
