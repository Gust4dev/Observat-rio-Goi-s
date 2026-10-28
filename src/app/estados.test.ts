import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import Erro from "./error";
import NaoEncontrado from "./not-found";
import Carregando from "./loading";
import { mensagemConsulta } from "@/components/registro/estado-consulta";

it("erro de leitura oferece recuperação sem revelar detalhes internos", () => {
 const html = renderToStaticMarkup(createElement(Erro, {error:new Error("SQL token privado"), retry:()=>{}}));
 expect(html).toContain("Tentar de novo");
 expect(html).toContain("filtros");
 expect(html).not.toMatch(/SQL|token privado/);
});
it("404 usa a mesma mensagem para endereço ausente e relato indisponível",()=>{
 const html=renderToStaticMarkup(createElement(NaoEncontrado));
 expect(html).toContain("Não há conteúdo público disponível neste endereço.");
 expect(html).not.toMatch(/removido|não publicado/);
});
it("carregamento é status esperado e não um alerta",()=>{
 const html=renderToStaticMarkup(createElement(Carregando));
 expect(html).toContain('role="status"'); expect(html).not.toContain('role="alert"');
});
it("consulta distingue taxa e manutenção sem revelar existência",()=>{
 expect(mensagemConsulta(429)).toBe("Muitas consultas em pouco tempo. Aguarde e tente novamente.");
 expect(mensagemConsulta(503)).toBe("Acompanhamento indisponível no momento. Tente novamente mais tarde.");
 expect(mensagemConsulta(0)).toContain("conexão");
 expect(mensagemConsulta(404)).toBe(mensagemConsulta(400));
});
