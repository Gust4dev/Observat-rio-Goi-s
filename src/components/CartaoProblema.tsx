import Link from "next/link";
import { formatarData } from "@/lib/formato";
import type { Situacao } from "@/lib/situacao";
import { SeloSituacao } from "./SeloSituacao";
import { SeloDemonstracao } from "./SeloDemonstracao";
import { IconeCategoria } from "./IconeCategoria";

export type CartaoProblemaProps = {
  id: string | number;
  titulo: string;
  municipioNome?: string | null;
  categoriaNome?: string | null;
  categoriaSlug?: string | null;
  situacao: Situacao;
  publicadoEm?: string | null;
  atualizadoEm?: string | null;
  temRespostaOficial?: boolean;
  variante?: "resumo" | "lista" | "home";
  demonstracao?: boolean;
  confirmacoesTotal?: number | null;
};

export function CartaoProblema({ id, titulo, municipioNome, categoriaNome, categoriaSlug, situacao, publicadoEm, atualizadoEm, temRespostaOficial, variante = "resumo", demonstracao = false, confirmacoesTotal }: CartaoProblemaProps) {
  const data = atualizadoEm || publicadoEm;
  const dataLegivel = data ? formatarData(data) : "";
  if (variante === "home") {
    const href = `/problema/${encodeURIComponent(id)}`;
    return (
      <article className="group flex h-full min-w-0 flex-col rounded-xl border border-borda-suave bg-superficie shadow-md shadow-territorio/15 transition-shadow duration-300 hover:shadow-lg hover:shadow-territorio/20">
        <div aria-hidden="true" className="h-1.5 shrink-0 rounded-t-xl bg-linear-to-r from-acao via-territorio to-destaque" />
        <div className="flex flex-1 flex-col p-5 sm:p-6">
        {(categoriaSlug || categoriaNome || demonstracao) && <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-3">
          {categoriaSlug ? <IconeCategoria categoria={categoriaSlug} /> : categoriaNome && <span className="min-w-0 break-words text-sm text-texto-suave">{categoriaNome}</span>}
          {demonstracao && <SeloDemonstracao />}
        </div>}
        <h3 className="mt-4 break-words text-lg font-bold leading-snug tracking-tight"><Link className="inline-flex min-h-12 items-center text-territorio no-underline hover:text-acao hover:underline" href={href}>{titulo}</Link></h3>
        <div className="mt-auto pt-6">
        {municipioNome && <p className="flex items-start gap-1.5 font-medium text-texto"><svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="mt-0.5 shrink-0 text-terra"><path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></svg><span className="min-w-0 break-words">{municipioNome}</span></p>}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <SeloSituacao situacao={situacao} />
          {data && dataLegivel && <p className="text-sm text-texto-suave">{atualizadoEm ? "Atualizado em" : "Publicado em"} <time dateTime={data}>{dataLegivel}</time></p>}
        </div>
        {temRespostaOficial && <p className="mt-3 border-t border-borda-suave pt-3 text-sm font-semibold">Tem resposta oficial</p>}
        </div>
        </div>
        <div className="flex justify-end rounded-b-xl border-t border-borda bg-neutro-fundo px-5 py-4 sm:px-6">
          <Link className="inline-flex min-h-12 items-center justify-center gap-2 rounded-controle bg-acao px-4 py-3 font-semibold text-sobre-acao no-underline hover:bg-acao-pressionada hover:text-sobre-acao" href={href}>Ver relato<span className="sr-only">: {titulo}</span><svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M4 12h16m-6-6 6 6-6 6" /></svg></Link>
        </div>
      </article>
    );
  }
  return (
    <article className={variante === "lista" ? "border-b border-borda-suave py-5" : "rounded-2xl border border-borda-suave bg-superficie p-5"}>
      {(categoriaNome || demonstracao) && <div className="flex flex-wrap items-center gap-2 text-sm text-texto-suave">{categoriaNome && <span>{categoriaNome}</span>}{demonstracao && <SeloDemonstracao />}</div>}
      <h3 className={`mt-2 font-bold leading-snug ${variante === "lista" ? "text-xl" : "text-lg"}`}><Link className="inline-flex min-h-12 items-center" href={`/problema/${encodeURIComponent(id)}`}>{titulo}</Link></h3>
      {municipioNome && <p className="mt-1 text-texto-suave">{municipioNome}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <SeloSituacao situacao={situacao} />
        {data && dataLegivel && <p className="text-sm text-texto-suave">{atualizadoEm ? "Atualizado em" : "Publicado em"} <time dateTime={data}>{dataLegivel}</time></p>}
      </div>
      {temRespostaOficial && <p className="mt-3 border-t border-borda-suave pt-3 text-sm font-semibold">Tem resposta oficial</p>}
      {confirmacoesTotal != null && Number.isSafeInteger(confirmacoesTotal) && confirmacoesTotal >= 0 && <p className="mt-3 text-sm text-texto-suave">Também me afeta: {confirmacoesTotal}. Essa contagem não mede a gravidade nem a quantidade total de pessoas afetadas.</p>}
    </article>
  );
}
