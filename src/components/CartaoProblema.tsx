import Link from "next/link";
import { formatarData } from "@/lib/formato";
import type { Situacao } from "@/lib/situacao";
import { SeloSituacao } from "./SeloSituacao";
import { SeloDemonstracao } from "./SeloDemonstracao";

export type CartaoProblemaProps = {
  id: string | number;
  titulo: string;
  municipioNome?: string | null;
  categoriaNome?: string | null;
  situacao: Situacao;
  publicadoEm?: string | null;
  atualizadoEm?: string | null;
  temRespostaOficial?: boolean;
  variante?: "resumo" | "lista";
  demonstracao?: boolean;
  confirmacoesTotal?: number | null;
};

export function CartaoProblema({ id, titulo, municipioNome, categoriaNome, situacao, publicadoEm, atualizadoEm, temRespostaOficial, variante = "resumo", demonstracao = false, confirmacoesTotal }: CartaoProblemaProps) {
  const data = atualizadoEm || publicadoEm;
  const dataLegivel = data ? formatarData(data) : "";
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
