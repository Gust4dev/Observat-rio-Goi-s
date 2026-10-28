const MAX_ORIGINAL = 12 * 1024 * 1024;
const MAX_ENVIO = 2 * 1024 * 1024;
type Bitmap = { width: number; height: number; close: () => void };
export type ApiCompressao = {
  decodificar: (arquivo: File) => Promise<Bitmap>;
  converter: (bitmap: Bitmap, largura: number, altura: number, qualidade: number) => Promise<Blob>;
};
const navegador: ApiCompressao = {
  decodificar: arquivo => createImageBitmap(arquivo),
  converter: async (bitmap, largura, altura, qualidade) => {
    const canvas = document.createElement("canvas"); canvas.width = largura; canvas.height = altura;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Não foi possível preparar esta foto.");
    ctx.fillStyle = "white"; ctx.fillRect(0, 0, largura, altura);
    ctx.drawImage(bitmap as ImageBitmap, 0, 0, largura, altura);
    try { return await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Não foi possível preparar esta foto.")), "image/jpeg", qualidade)); }
    finally { canvas.width = 0; canvas.height = 0; }
  },
};
export function validarSelecaoFotos(atuais: number, arquivos: readonly File[]) {
  if (atuais + arquivos.length > 3) throw new Error("Escolha no máximo três fotos.");
  if (arquivos.some(f => !["image/jpeg", "image/png", "image/webp"].includes(f.type) || !f.size || f.size > MAX_ORIGINAL)) throw new Error("Use JPEG, PNG ou WebP de até 12 MB por foto original.");
}
/** Output is kept in memory unchanged for stable retries; server validates again. */
export async function comprimirFoto(arquivo: File, api: ApiCompressao = navegador): Promise<File> {
  validarSelecaoFotos(0, [arquivo]);
  const bitmap = await api.decodificar(arquivo);
  try {
    const { width, height } = bitmap;
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 12000 || height > 12000 || width * height > 24_000_000) throw new Error("Esta foto tem dimensões muito grandes. Escolha uma menor.");
    const escala = Math.min(1, 1600 / Math.max(width, height));
    const blob = await api.converter(bitmap, Math.max(1, Math.round(width * escala)), Math.max(1, Math.round(height * escala)), 0.8);
    if (blob.type !== "image/jpeg" || !blob.size || blob.size > MAX_ENVIO) throw new Error("Não foi possível reduzir a foto para 2 MB. Escolha uma menor.");
    return new File([blob], "foto.jpg", { type: "image/jpeg", lastModified: 0 });
  } finally { bitmap.close(); }
}
