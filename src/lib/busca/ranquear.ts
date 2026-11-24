import { normalizar } from "./normalizar";

const MAX_CONSULTA = 80;
const MIN_FUZZY = 4;

/** Distância de Damerau-Levenshtein (transposição adjacente) com corte em 1. */
function distanciaAte1(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 1) return 2;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + custo);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

/** Pontuação (menor = melhor) ou null se não casa. */
function pontuar(consulta: string, nome: string): number | null {
  if (nome.startsWith(consulta)) return 0;
  const palavras = nome.split(" ");
  if (palavras.some((p) => p.startsWith(consulta))) return 1;
  if (nome.includes(consulta)) return 2;
  if (consulta.length >= MIN_FUZZY) {
    // Compara com o nome inteiro e com o prefixo do mesmo tamanho (consulta parcial com erro).
    const candidatos = [nome, nome.slice(0, consulta.length), ...palavras];
    if (candidatos.some((c) => distanciaAte1(consulta, c) <= 1)) return 3;
  }
  return null;
}

export function ranquearMunicipios<T extends { nome: string; slug: string }>(
  consulta: string,
  catalogo: readonly T[],
  limite = 8,
): T[] {
  const q = normalizar(consulta.slice(0, MAX_CONSULTA));
  if (!q) return [];
  const pontuados: { m: T; nome: string; p: number }[] = [];
  for (const m of catalogo) {
    const nome = normalizar(m.nome);
    const p = pontuar(q, nome);
    if (p !== null) pontuados.push({ m, nome, p });
  }
  pontuados.sort((x, y) => x.p - y.p || x.m.nome.localeCompare(y.m.nome, "pt-BR"));
  return pontuados.slice(0, Math.max(0, limite)).map((x) => x.m);
}
