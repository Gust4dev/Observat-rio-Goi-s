import { describe, expect, it } from 'vitest';
import catalogo from './municipios.json';
import { lerGeometria } from './geometria';
import { MUNICIPIOS_GEO, VIEWBOX } from './projecao';

function dentro(x: number, y: number, aneis: ReturnType<typeof lerGeometria>): boolean {
  let d = false;
  for (const anel of aneis) {
    for (let i = 0, j = anel.length - 1; i < anel.length; j = i++) {
      const [ax, ay] = anel[j];
      const [bx, by] = anel[i];
      if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) d = !d;
    }
  }
  return d;
}

describe('geometria estática dos 246 municípios', () => {
  it('cobre o catálogo inteiro, sem ids duplicados', () => {
    expect(MUNICIPIOS_GEO).toHaveLength(246);
    expect(new Set(MUNICIPIOS_GEO.map((m) => m.id)).size).toBe(246);
    expect(new Set(MUNICIPIOS_GEO.map((m) => m.id))).toEqual(new Set(catalogo.map((m) => m.id)));
    const porId = new Map(catalogo.map((m) => [m.id, m]));
    for (const m of MUNICIPIOS_GEO) {
      expect(porId.get(m.id)?.slug, m.id).toBe(m.slug);
      expect(porId.get(m.id)?.nome, m.id).toBe(m.nome);
    }
  });

  it('cada ponto interior cai dentro do polígono e tem raio positivo', () => {
    expect(VIEWBOX).toEqual({ w: 1000, h: 968 });
    for (const m of MUNICIPIOS_GEO) {
      expect(m.raio, m.id).toBeGreaterThan(0);
      expect(Number.isFinite(m.x + m.y + m.raio), m.id).toBe(true);
      expect(dentro(m.x, m.y, lerGeometria(m.d)), m.id).toBe(true);
    }
  });
});
