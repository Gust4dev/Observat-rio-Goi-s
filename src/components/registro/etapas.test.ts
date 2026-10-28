import { describe, expect, it } from "vitest";
import { ETAPAS, validarEtapa, protocoloConfirmado, lerRascunho } from "./etapas";
const campos = { municipio: "", categoria: "", titulo: "", descricao: "" };
describe("registro em etapas", () => {
 it("valida somente a etapa atual", () => {
  expect(ETAPAS).toHaveLength(5);
  expect(Object.keys(validarEtapa(campos, 0))).toEqual(["municipio"]);
  expect(Object.keys(validarEtapa(campos, 1))).toEqual(["categoria"]);
  expect(Object.keys(validarEtapa(campos, 2))).toEqual(["titulo", "descricao"]);
  expect(validarEtapa(campos, 3)).toEqual({});
  expect(validarEtapa(campos, 4)).toEqual({});
 });
 it("restaura só campos do rascunho local sem contato", () => {
  expect(lerRascunho(JSON.stringify({...campos, municipio:"goiania", telefone:"segredo"}))).toEqual({...campos, municipio:"goiania"});
  expect(lerRascunho("inválido")).toBeNull();
 });
 it("confirma sucesso somente com 201 e protocolo completo", () => {
  expect(protocoloConfirmado(201, {protocolo:"OG-123"})).toBe("OG-123");
  expect(protocoloConfirmado(200, {protocolo:"OG-123"})).toBeNull();
  expect(protocoloConfirmado(201, {})).toBeNull();
  expect(protocoloConfirmado(201, {protocolo:" "})).toBeNull();
 });
});

import { enviarRegistro } from "./etapas";
describe("resposta de envio e retry", () => {
 it("mantém o mesmo corpo após falha de rede e confirma somente 201", async () => {
  const corpo = { chave_idempotencia:"mesma-chave", token_hash:"mesmo-hash", descricao:"Texto preservado" };
  const chamadas: string[] = [];
  const rede: typeof fetch = async (_url, init) => {
   chamadas.push(init?.body as string);
   if (chamadas.length === 1) throw new TypeError("offline");
   return new Response(JSON.stringify({protocolo:"OG-123"}), {status:201});
  };
  await expect(enviarRegistro(corpo, rede)).rejects.toThrow("offline");
  await expect(enviarRegistro(corpo, rede)).resolves.toBe("OG-123");
  expect(chamadas[0]).toBe(chamadas[1]);
  expect(corpo.descricao).toBe("Texto preservado");
 });
 it("recusa resposta parcial, 200 e informa limite", async () => {
  await expect(enviarRegistro({}, async () => new Response('{}', {status:201}))).rejects.toThrow();
  await expect(enviarRegistro({}, async () => new Response('{"protocolo":"OG-123"}', {status:200}))).rejects.toThrow();
  await expect(enviarRegistro({}, async () => new Response('{"erro":{"codigo":"limite_excedido"}}', {status:429}))).rejects.toMatchObject({status:429,codigo:"limite_excedido"});
 });
});
