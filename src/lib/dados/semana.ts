// Agregador puro dos últimos 7 dias. Os limiares são aplicados aqui, antes de qualquer serialização:
// nenhuma contagem abaixo de LIMIAR_PONTO sai deste módulo (exceto o total geral da janela).

export const LIMIAR_PONTO = 3;
export const LIMIAR_MANCHETE = 5;
export const MAX_PONTOS = 8;
export const JANELA_DIAS = 7;

export type PontoSemana = { slug: string; nome: string; total: number };
export type ResumoSemana = {
  total: number;
  /** null quando total < LIMIAR_MANCHETE. */
  categoriaLider: { slug: string; nome: string; total: number } | null;
  pontos: PontoSemana[];
};
export type LinhaSemana = {
  municipio_slug: string;
  municipio_nome: string;
  categoria_slug: string;
  categoria_nome: string;
};

const porSlug = (a: { slug: string }, b: { slug: string }) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0);

export function agregarSemana(linhas: readonly LinhaSemana[]): ResumoSemana {
  const municipios = new Map<string, PontoSemana>();
  const categorias = new Map<string, PontoSemana>();
  for (const l of linhas) {
    const m = municipios.get(l.municipio_slug) ?? { slug: l.municipio_slug, nome: l.municipio_nome, total: 0 };
    m.total += 1;
    municipios.set(m.slug, m);
    const c = categorias.get(l.categoria_slug) ?? { slug: l.categoria_slug, nome: l.categoria_nome, total: 0 };
    c.total += 1;
    categorias.set(c.slug, c);
  }
  const total = linhas.length;
  const pontos = [...municipios.values()]
    .filter((m) => m.total >= LIMIAR_PONTO)
    .sort((a, b) => b.total - a.total || porSlug(a, b))
    .slice(0, MAX_PONTOS);
  const lider = [...categorias.values()].sort((a, b) => b.total - a.total || porSlug(a, b))[0];
  return { total, categoriaLider: total >= LIMIAR_MANCHETE && lider ? { ...lider } : null, pontos };
}
