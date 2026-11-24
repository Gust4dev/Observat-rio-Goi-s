import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MapaEstatico } from "./MapaEstatico";

const pontos = [
 { slug: "goiania", nome: "Goiânia", total: 16 },
 { slug: "anapolis", nome: "Anápolis", total: 4 },
 { slug: "catalao", nome: "Catalão", total: 3 },
];
const descricao = "Mapa de Goiás com os municípios mais relatados na semana.";
const html = (p = pontos) => renderToStaticMarkup(MapaEstatico({ pontos: p, descricao }));
const raios = (h: string) => [...h.matchAll(/<circle[^>]* r="([\d.]+)"/g)].map((m) => Number(m[1]));

describe("MapaEstatico", () => {
 it("renderiza um svg role=img com a descrição e 246 municípios", () => {
  const h = html();
  expect(h.match(/<svg /g)).toHaveLength(1);
  expect(h).toContain('role="img"');
  expect(h).toContain(`aria-label="${descricao}"`);
  expect(h.match(/<path /g)).toHaveLength(246);
  expect(h.match(/<circle /g)).toHaveLength(pontos.length);
 });
 it("é estático: sem links, foco, handlers nem slug", () => {
  const h = html();
  expect(h).not.toContain("<a");
  expect(h).not.toMatch(/tabindex/i);
  expect(h).not.toMatch(/onclick/i);
  expect(h).not.toContain("data-slug");
 });
 it("raio cresce com sqrt(total) dentro de limites fixos", () => {
  const [a, b, c] = raios(html());
  expect(a).toBeGreaterThan(b);
  expect(b).toBeGreaterThan(c);
  const extremo = raios(html([{ slug: "goiania", nome: "Goiânia", total: 100000 }, { slug: "anapolis", nome: "Anápolis", total: 1 }]));
  expect(extremo[0]).toBeLessThanOrEqual(60);
  expect(extremo[1]).toBeGreaterThanOrEqual(8);
  expect(extremo[0]).toBeGreaterThan(extremo[1]);
 });
 it("sem pontos renderiza o mapa sem círculos", () => {
  const h = html([]);
  expect(h.match(/<path /g)).toHaveLength(246);
  expect(h).not.toContain("<circle");
 });
 it("ignora ponto de município desconhecido", () => {
  expect(html([{ slug: "inexistente", nome: "Z", total: 9 }])).not.toContain("<circle");
 });
 it("é Server Component", () => {
  expect(readFileSync(new URL("./MapaEstatico.tsx", import.meta.url), "utf8")).not.toContain("use client");
 });
});
