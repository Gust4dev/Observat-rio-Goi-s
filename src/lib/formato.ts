const FUSO = "America/Sao_Paulo";

const longa = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: FUSO,
});

const curta = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: FUSO,
});

function paraData(iso: string): Date | null {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Ex.: "27 de outubro de 2026". Entrada inválida devolve "". */
export function formatarData(iso: string): string {
  const d = paraData(iso);
  return d ? longa.format(d) : "";
}

/** Ex.: "27/10/2026". Entrada inválida devolve "". */
export function formatarDataCurta(iso: string): string {
  const d = paraData(iso);
  return d ? curta.format(d) : "";
}
