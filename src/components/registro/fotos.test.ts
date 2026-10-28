import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { EtapaFotos, type FotoRegistro } from "./EtapaFotos";
const foto = (ordem: number, estado: FotoRegistro["estado"] = "pronta"): FotoRegistro => ({ id: String(ordem), ordem, estado, progresso: 0, contexto: "Buraco na calçada", previa: `blob:local-${ordem}`, arquivo: new File([], "local.jpg", { type: "image/jpeg" }) });
it.each([0,1,3])("renderiza %s fotos opcionais e contexto obrigatório", quantidade => {
  const html = renderToStaticMarkup(createElement(EtapaFotos, { fotos: Array.from({length:quantidade},(_,i)=>foto(i+1)), mudar: ()=>{} }));
  expect((html.match(/<img /g)||[]).length).toBe(quantidade);
  expect(html).toContain("até três");
  if(quantidade) expect(html).toContain("(obrigatório)");
  if(quantidade===3) expect(html).toContain('multiple="" disabled=""');
});
it("falha parcial preserva confirmação do relato e retry da foto",()=>{
  const html=renderToStaticMarkup(createElement(EtapaFotos,{fotos:[foto(1,"enviada"),foto(2,"erro")],mudar:()=>{},confirmado:true,token:"privado"}));
  expect(html).toContain("Seu relato já foi recebido");expect(html).toContain("Tentar novamente esta foto");expect(html).toContain("Foto recebida para revisão");expect(html).toContain("Seu relato está preservado");
  expect(html).not.toContain("privado");
});
it("mostra avisos antes do seletor e só confirma persistência após o protocolo",()=>{
 const html=renderToStaticMarkup(createElement(EtapaFotos,{fotos:[foto(1)],mudar:()=>{}}));
 expect(html.indexOf("Não inclua rostos, placas ou documentos")).toBeLessThan(html.indexOf('type="file"'));
 expect(html).toContain("Ao fechar ou sair desta página, as fotos não enviadas serão perdidas");
 expect(html).not.toContain("Seu relato fica salvo");
 expect(html).toContain('required=""');
 expect(html).toContain("Exemplo: buraco no pavimento, ao lado da faixa de pedestres");
 expect(html).toContain("A equipe revisa esse texto antes de publicar a descrição da foto");
});
it("resume confirmações individuais e permite retentar resposta ambígua",()=>{
 const html=renderToStaticMarkup(createElement(EtapaFotos,{fotos:[foto(1,"enviada"),foto(2,"enviada"),foto(3,"incerta")],mudar:()=>{},confirmado:true,token:"privado"}));
 expect(html).toContain("2 de 3 enviadas");
 expect(html).toContain("Enviar fotos restantes");
 expect(html).toContain("Não foi possível confirmar o recebimento desta foto");
 expect(html).toContain("Seu relato fica salvo");
 expect((html.match(/Foto recebida para revisão/g)||[]).length).toBe(2);
});
