import { NextRequest } from "next/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { POST } from "./route";

const segredo = "segredo-ficticio-dedicado";
beforeEach(() => vi.stubEnv("MODO_ADMIN_SEGREDO", segredo));
afterEach(() => vi.unstubAllEnvs());

const url = "https://teste/api/demonstracao";
const requisicao = (campos: Record<string, string>, headers: Record<string, string> = {}, destino = url) =>
  new NextRequest(destino, {
    method: "POST",
    body: new URLSearchParams(campos),
    headers: { origin: "https://teste", ...headers },
  });

it("inicia pela credencial no corpo e limpa a URL sem devolver o segredo", async () => {
  const res = await POST(requisicao({ acao: "entrar", segredo }));
  expect(res.status).toBe(303);
  expect(res.headers.get("location")).toBe("https://teste/");
  expect(res.headers.get("cache-control")).toBe("no-store");
  expect(res.headers.get("referrer-policy")).toBe("no-referrer");
  const cookies = res.headers.getSetCookie();
  expect(cookies).toHaveLength(2);
  for (const cookie of cookies) {
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Secure/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
    expect(cookie).toMatch(/Path=\//i);
    expect(cookie).not.toContain(segredo);
  }
});

it("rejeita segredo fora do corpo, entrada incompleta e outra origem", async () => {
  for (const req of [
    requisicao({ acao: "entrar" }, {}, url + "?admin=" + segredo),
    requisicao({ acao: "entrar", segredo: "errado" }),
    requisicao({ acao: "entrar", segredo }, { origin: "https://outro.teste" }),
    requisicao({ acao: "entrar", segredo }, { origin: "null" }),
    requisicao({ acao: "entrar", segredo }, { "sec-fetch-site": "cross-site" }),
  ]) {
    const res = await POST(req);
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.headers.getSetCookie()).toEqual([]);
    expect(await res.text()).not.toContain(segredo);
  }
});

it("exige cookie autorizado para alternar e encerra os dois cookies ao sair", async () => {
  const sem = await POST(requisicao({ acao: "desligar" }, { cookie: "obs_admin=falso" }));
  expect(sem.status).toBe(403);
  const entrar = await POST(requisicao({ acao: "entrar", segredo }));
  const sessao = entrar.headers.getSetCookie().find(c => c.startsWith("obs_admin="))!.split(";")[0]!;
  const desligar = await POST(requisicao({ acao: "desligar" }, { cookie: sessao }));
  expect(desligar.headers.getSetCookie().join(";")).toContain("obs_ficticios=0");
  const ligar = await POST(requisicao({ acao: "ligar" }, { cookie: sessao }));
  expect(ligar.headers.getSetCookie().join(";")).toContain("obs_ficticios=1");
  const sair = await POST(requisicao({ acao: "sair" }, { cookie: sessao }));
  expect(sair.headers.getSetCookie()).toHaveLength(2);
  expect(sair.headers.getSetCookie().every(c => c.includes("Max-Age=0"))).toBe(true);
});

it("recusa corpo maior que 2 KB sem Content-Length sem refletir o conteúdo", async () => {
  const valor = "x".repeat(2048);
  const req = requisicao({ acao: "entrar", segredo: valor });
  expect(req.headers.has("content-length")).toBe(false);
  const res = await POST(req);
  expect(res.status).toBe(413);
  expect(res.headers.getSetCookie()).toEqual([]);
  expect(await res.text()).not.toContain(valor);
});

it("cancela a leitura assim que um chunk ultrapassa 2 KB, mesmo com Content-Length falso", async () => {
  const cancel = vi.fn();
  const body = new ReadableStream<Uint8Array>({
    start(controller) { controller.enqueue(new Uint8Array(2049)); },
    cancel,
  });
  const req = new NextRequest(url, {
    method: "POST",
    body,
    duplex: "half",
    headers: { origin: "https://teste", "content-type": "application/x-www-form-urlencoded", "content-length": "4" },
  });
  expect((await POST(req)).status).toBe(413);
  expect(cancel).toHaveBeenCalledOnce();
});
