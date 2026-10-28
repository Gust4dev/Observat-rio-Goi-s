export const PADRAO_CAMINHO_IMAGEM = "^[a-f0-9]{64}/[1-3]/[a-f0-9]{64}\\.jpg$";
export function caminhoImagemValido(caminho) { return typeof caminho === "string" && new RegExp(PADRAO_CAMINHO_IMAGEM).test(caminho); }
export function caminhoImagem(identidade, ordem, digest) {
 const caminho = `${identidade}/${ordem}/${digest}.jpg`;
 if (!caminhoImagemValido(caminho)) throw new Error("Caminho de imagem inválido");
 return caminho;
}
