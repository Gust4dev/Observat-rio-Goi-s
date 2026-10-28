import {readFileSync} from "node:fs";
import {expect,it} from "vitest";
import {PADRAO_CAMINHO_IMAGEM,caminhoImagem,caminhoImagemValido} from "./caminho-imagem.mjs";
it("valida o mesmo formato imutável no SQL e no runtime",()=>{
 const caminho=caminhoImagem("a".repeat(64),1,"b".repeat(64));expect(caminhoImagemValido(caminho)).toBe(true);
 for(const ruim of ["../foto.jpg", caminho+"?x",caminho.replace("/1/","/4/"),caminho.replace(".jpg",".png")])expect(caminhoImagemValido(ruim)).toBe(false);
 expect(readFileSync("db/015_upload_imagens.sql","utf8")).toContain(PADRAO_CAMINHO_IMAGEM);
});
