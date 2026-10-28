import { expect, it, vi } from "vitest";
import { comprimirFoto, validarSelecaoFotos, type ApiCompressao } from "./comprimir-foto";
const original = (size = 3 * 1024 * 1024) => new File([new Uint8Array(size)], "celular.png", { type: "image/png" });
function ambiente(width=4000,height=3000) {
  const close=vi.fn(); const converter=vi.fn(async()=>new Blob([new Uint8Array(80000)],{type:"image/jpeg"}));
  const api: ApiCompressao={decodificar:vi.fn(async()=>({width,height,close})),converter};
  return {api,close,converter};
}
it("comprime original >2 MiB para JPEG 80% até 1600px antes do upload",async()=>{
  const {api,close,converter}=ambiente();const resultado=await comprimirFoto(original(),api);
  expect(converter).toHaveBeenCalledWith(expect.anything(),1600,1200,0.8);
  expect(resultado.type).toBe("image/jpeg");expect(resultado.size).toBe(80000);expect(resultado.name).toBe("foto.jpg");expect(close).toHaveBeenCalledOnce();
});
it("não amplia foto pequena e fecha bitmap em falha de conversão",async()=>{
  const a=ambiente(300,600);await comprimirFoto(original(),a.api);expect(a.converter).toHaveBeenCalledWith(expect.anything(),300,600,0.8);
  const b=ambiente();b.converter.mockRejectedValue(new Error());await expect(comprimirFoto(original(),b.api)).rejects.toThrow();expect(b.close).toHaveBeenCalledOnce();
});
it("rejeita input >12 MiB antes de decodificar, excesso de pixels e output >2 MiB",async()=>{
  const a=ambiente();await expect(comprimirFoto(original(12*1024*1024+1),a.api)).rejects.toThrow();expect(a.api.decodificar).not.toHaveBeenCalled();
  const b=ambiente(6000,5000);await expect(comprimirFoto(original(),b.api)).rejects.toThrow();expect(b.close).toHaveBeenCalledOnce();expect(b.converter).not.toHaveBeenCalled();
  const c=ambiente();c.converter.mockResolvedValue(new Blob([new Uint8Array(2*1024*1024+1)],{type:"image/jpeg"}));await expect(comprimirFoto(original(),c.api)).rejects.toThrow();
});
it.each([0,1,3])("aceita seleção total %s", n=>expect(()=>validarSelecaoFotos(0,Array.from({length:n},()=>original(10)))).not.toThrow());
it("recusa quarta foto inclusive em seleção incremental e MIME não permitido",()=>{
  expect(()=>validarSelecaoFotos(0,Array.from({length:4},()=>original(10)))).toThrow();expect(()=>validarSelecaoFotos(3,[original(10)])).toThrow();
  expect(()=>validarSelecaoFotos(0,[new File(["svg"],"x.svg",{type:"image/svg+xml"})])).toThrow();
});
