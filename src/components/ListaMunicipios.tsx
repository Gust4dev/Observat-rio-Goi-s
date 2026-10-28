import Link from "next/link";
import type { Municipio } from "@/lib/dados/schemas";
import { selecionarMunicipios } from "@/lib/dados/consultas";
export function ListaMunicipios({ municipios, busca }: { municipios: (Municipio & { total?: number })[]; busca: string }) {
  const ordenados = [...municipios].sort((a,b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const itens = busca ? selecionarMunicipios(ordenados, busca) : ordenados;
  return <section className="flex min-w-0 flex-col gap-4" aria-label="Municípios de Goiás">
    <form action="/municipios" method="get" className="flex min-w-0 flex-wrap items-end gap-3">
      <div className="flex min-w-0 flex-1 flex-col"><label htmlFor="nome-municipio" className="font-semibold">Nome do município</label>
      <input id="nome-municipio" name="nome_municipio" type="search" maxLength={80} defaultValue={busca} aria-describedby="ajuda-busca" className="min-h-12 w-full rounded-lg border border-borda bg-fundo px-3" /></div>
      <button type="submit" className="min-h-12 rounded-lg bg-acao px-4 font-semibold text-sobre-acao">Buscar município</button>
    </form>
    <p id="ajuda-busca" className="text-sm text-texto-suave">Até 12 resultados por busca. Refine o nome para encontrar outros municípios. A busca funciona sem JavaScript.</p>
    {busca ? <Link href="/municipios" prefetch={false}>Ver todos os municípios</Link> : null}
    {!itens.length ? <p role="status">Nenhum município encontrado. Tente outro nome.</p> : <ul className="grid min-w-0 gap-2 sm:grid-cols-2">{itens.map(m => <li key={m.slug} className="min-w-0 rounded-lg border border-borda p-3"><Link href={`/municipios/${m.slug}`} prefetch={false} className="flex min-h-12 items-center break-words font-semibold">{m.nome}</Link>{m.total !== undefined ? <p className="text-sm text-texto-suave">{m.total === 0 ? "Sem relatos publicados" : `${m.total} ${m.total === 1 ? "relato publicado" : "relatos publicados"}`}</p> : null}</li>)}</ul>}
  </section>;
}
