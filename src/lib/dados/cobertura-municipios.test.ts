import { afterEach, expect, it, vi } from "vitest";
import { obterMunicipio } from "./consultas";
vi.mock("next/cache", () => ({ cacheLife: () => {}, cacheTag: () => {} }));
const consultar = vi.hoisted(() => vi.fn());
vi.mock("./rest", async (original) => ({ ...await original<typeof import("./rest")>(), consultar }));
afterEach(() => vi.resetAllMocks());
it("lê cobertura explícita já pública sem deduzir a partir de zero relatos", async () => {
 consultar.mockImplementation(async (recurso, opcoes, schema) => {
   if (recurso === "municipios") {
     expect(opcoes.select).toEqual(["slug", "nome", "ativo_acompanhamento"]);
     return [schema.parse({slug:"goiania",nome:"Goiânia",ativo_acompanhamento:true})];
   }
   return [];
 });
 expect(await obterMunicipio("goiania")).toEqual({slug:"goiania",nome:"Goiânia",ativo_acompanhamento:true,total:0});
});
it("rejeita slug malformado e município ausente", async () => {
 expect(await obterMunicipio("a,b)")).toBeNull();
 consultar.mockResolvedValue([]);
 expect(await obterMunicipio("inexistente")).toBeNull();
});
