/** Pure camera math for the municipal map; no DOM, no timers. */
export type ViewBox = { x: number; y: number; w: number; h: number };
export type LimitesZoom = { minW: number; maxW: number };
export type Ponto2D = { x: number; y: number };

export const SVG_W = 1000;
export const SVG_H = 968;
export const VIEW_INICIAL: Readonly<ViewBox> = Object.freeze({ x: 0, y: 0, w: SVG_W, h: SVG_H });
export const LIMITES_PADRAO: Readonly<LimitesZoom> = Object.freeze({ minW: 50, maxW: SVG_W });

const RAZAO = SVG_H / SVG_W;
const finito = (n: number, reserva: number) => (Number.isFinite(n) ? n : reserva);

function limitar(view: ViewBox): ViewBox {
  const w = Math.min(SVG_W, Math.max(1e-6, finito(view.w, SVG_W)));
  const h = w * RAZAO;
  const x = Math.min(SVG_W - w, Math.max(0, finito(view.x, 0)));
  const y = Math.min(SVG_H - h, Math.max(0, finito(view.y, 0)));
  return { x, y, w, h };
}

/** Enquadramento inicial (Goiás inteiro). Nunca altera a cidade selecionada. */
export function enquadrarEstado(): ViewBox {
  return { ...VIEW_INICIAL };
}

/** fator > 1 aproxima, < 1 afasta. O ponto (coordenadas do SVG) mantém a posição relativa na viewport. */
export function zoomar(view: ViewBox, fator: number, ponto: Ponto2D, limites: LimitesZoom = LIMITES_PADRAO): ViewBox {
  const atual = limitar(view);
  if (!Number.isFinite(fator) || fator <= 0) return atual;
  const minW = Math.max(1e-6, finito(limites.minW, LIMITES_PADRAO.minW));
  const maxW = Math.min(SVG_W, finito(limites.maxW, LIMITES_PADRAO.maxW));
  const w = Math.min(maxW, Math.max(minW, atual.w / fator));
  const h = w * RAZAO;
  const px = finito(ponto.x, atual.x + atual.w / 2);
  const py = finito(ponto.y, atual.y + atual.h / 2);
  const rx = (px - atual.x) / atual.w;
  const ry = (py - atual.y) / atual.h;
  return limitar({ x: px - rx * w, y: py - ry * h, w, h });
}

/** Desloca em unidades do SVG, sem sair da extensão útil. */
export function deslocar(view: ViewBox, dx: number, dy: number): ViewBox {
  const atual = limitar(view);
  return limitar({ ...atual, x: atual.x + finito(dx, 0), y: atual.y + finito(dy, 0) });
}

export function centro(view: ViewBox): Ponto2D {
  return { x: view.x + view.w / 2, y: view.y + view.h / 2 };
}
