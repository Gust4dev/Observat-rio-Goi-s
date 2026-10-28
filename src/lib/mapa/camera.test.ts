import { describe, expect, it } from 'vitest';
import { LIMITES_PADRAO, SVG_H, SVG_W, VIEW_INICIAL, centro, deslocar, enquadrarEstado, zoomar, type ViewBox } from './camera';

const ok = (v: ViewBox) => [v.x, v.y, v.w, v.h].every(Number.isFinite) && v.w > 0 && v.h > 0;
const dentro = (v: ViewBox) => v.x >= 0 && v.y >= 0 && v.x + v.w <= SVG_W + 1e-9 && v.y + v.h <= SVG_H + 1e-9;

describe('camera do mapa', () => {
  it('enquadramento inicial é o SVG inteiro e devolve cópia', () => {
    const a = enquadrarEstado();
    expect(a).toEqual({ x: 0, y: 0, w: 1000, h: 968 });
    a.x = 5;
    expect(enquadrarEstado().x).toBe(0);
    expect(VIEW_INICIAL.w).toBe(1000);
  });
  it('zoom in reduz a janela e mantém proporção', () => {
    const v = zoomar(enquadrarEstado(), 2, { x: 500, y: 484 });
    expect(v.w).toBe(500);
    expect(v.h).toBeCloseTo(484);
    expect(dentro(v)).toBe(true);
  });
  it('zoom out volta ao máximo e não passa do SVG', () => {
    const v = zoomar(zoomar(enquadrarEstado(), 4, { x: 300, y: 300 }), 0.01, { x: 300, y: 300 });
    expect(v).toEqual({ x: 0, y: 0, w: 1000, h: 968 });
  });
  it('respeita o limite mínimo', () => {
    let v = enquadrarEstado();
    for (let i = 0; i < 30; i++) v = zoomar(v, 2, { x: 100, y: 100 });
    expect(v.w).toBe(LIMITES_PADRAO.minW);
    expect(zoomar(v, 2, { x: 100, y: 100 }).w).toBe(LIMITES_PADRAO.minW);
  });
  it('mantém o ponto sob o cursor na mesma posição relativa', () => {
    const base = { x: 100, y: 100, w: 600, h: 580.8 };
    const p = { x: 250, y: 300 };
    const v = zoomar(base, 2, p);
    expect((p.x - v.x) / v.w).toBeCloseTo((p.x - base.x) / base.w);
    expect((p.y - v.y) / v.h).toBeCloseTo((p.y - base.y) / base.h);
  });
  it('zoom central fica ancorado no centro', () => {
    const base = { x: 100, y: 100, w: 600, h: 580.8 };
    const v = zoomar(base, 2, centro(base));
    expect(centro(v).x).toBeCloseTo(centro(base).x);
    expect(centro(v).y).toBeCloseTo(centro(base).y);
  });
  it('pan positivo e negativo, limitado à extensão', () => {
    const z = zoomar(enquadrarEstado(), 2, { x: 500, y: 484 });
    const d = deslocar(z, 100, 50);
    expect(d.x).toBe(z.x + 100);
    expect(d.y).toBe(z.y + 50);
    expect(deslocar(z, -9999, -9999)).toMatchObject({ x: 0, y: 0 });
    const f = deslocar(z, 9999, 9999);
    expect(f.x + f.w).toBeCloseTo(SVG_W);
    expect(f.y + f.h).toBeCloseTo(SVG_H);
    expect(deslocar(enquadrarEstado(), 50, 50)).toEqual(enquadrarEstado());
  });
  it('restauração é previsível após zoom e pan', () => {
    const v = deslocar(zoomar(enquadrarEstado(), 3, { x: 200, y: 200 }), 40, 40);
    expect(v).not.toEqual(enquadrarEstado());
    expect(enquadrarEstado()).toEqual({ x: 0, y: 0, w: 1000, h: 968 });
  });
  it('nunca produz valores não finitos', () => {
    const bad = [NaN, Infinity, -Infinity, 0, -1];
    for (const f of bad) for (const p of bad) {
      expect(ok(zoomar(enquadrarEstado(), f, { x: p, y: p }))).toBe(true);
      expect(ok(deslocar(enquadrarEstado(), p, p))).toBe(true);
    }
    expect(ok(zoomar({ x: NaN, y: NaN, w: NaN, h: NaN }, 2, { x: 1, y: 1 }))).toBe(true);
    expect(ok(zoomar(enquadrarEstado(), 2, { x: 1, y: 1 }, { minW: NaN, maxW: NaN }))).toBe(true);
  });
});
