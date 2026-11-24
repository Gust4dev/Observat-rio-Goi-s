import { lerGeometria, type Ponto } from './geometria';
import { MUNICIPIOS_GEO } from './goias-estatico.generated';

export { MUNICIPIOS_GEO };
export const VIEWBOX = { w: 1000, h: 968 } as const;

/**
 * O SVG do IBGE é plate carrée (equiretangular): escala uniforme de ~135 px/grau, sem Mercator.
 * Calibrado pelo bbox do estado (caixa do SVG: x 1..997, y 7..963) e validado contra cidades
 * de referência (11 cidades) em projecao.test.ts.
 */
const OESTE = -53.2495;
const LESTE = -45.9069;
const NORTE = -12.3949;
const SUL = -19.4989;
const X0 = 1;
const X1 = 997;
const Y0 = 7;
const Y1 = 963;
const ESCALA_X = (X1 - X0) / (LESTE - OESTE);
const ESCALA_Y = (Y1 - Y0) / (NORTE - SUL);

/** Distância máxima (px do SVG, ~35 km) para aceitar "município mais próximo" fora dos polígonos. */
const LIMITE_PROXIMO = 45;

export function latLonParaSvg(lat: number, lon: number): { x: number; y: number } {
  return { x: X0 + (lon - OESTE) * ESCALA_X, y: Y0 + (NORTE - lat) * ESCALA_Y };
}

type Poligono = { slug: string; nome: string; aneis: Ponto[][] };
let cache: Poligono[] | null = null;
function poligonos(): Poligono[] {
  cache ??= MUNICIPIOS_GEO.map((m) => ({ slug: m.slug, nome: m.nome, aneis: lerGeometria(m.d) }));
  return cache;
}

function contem(x: number, y: number, aneis: Ponto[][]): boolean {
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

function distanciaBorda(x: number, y: number, aneis: Ponto[][]): number {
  let min = Infinity;
  for (const anel of aneis) {
    for (let i = 0, j = anel.length - 1; i < anel.length; j = i++) {
      const [ax, ay] = anel[j];
      const dx = anel[i][0] - ax;
      const dy = anel[i][1] - ay;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
      min = Math.min(min, Math.hypot(x - ax - t * dx, y - ay - t * dy));
    }
  }
  return min;
}

export type ResultadoGps =
  | { slug: string; nome: string; exato: boolean }
  | { foraDeGoias: true };

export function resolverGps(lat: number, lon: number): ResultadoGps {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return { foraDeGoias: true };
  const { x, y } = latLonParaSvg(lat, lon);
  const lista = poligonos();
  for (const p of lista) {
    if (contem(x, y, p.aneis)) return { slug: p.slug, nome: p.nome, exato: true };
  }
  let melhor: { p: Poligono; d: number } | null = null;
  for (const p of lista) {
    const d = distanciaBorda(x, y, p.aneis);
    if (!melhor || d < melhor.d) melhor = { p, d };
  }
  if (melhor && melhor.d <= LIMITE_PROXIMO) {
    return { slug: melhor.p.slug, nome: melhor.p.nome, exato: false };
  }
  return { foraDeGoias: true };
}
