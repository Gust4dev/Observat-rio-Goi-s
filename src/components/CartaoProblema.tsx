import Link from "next/link";
import { formatarData } from "@/lib/formato";
import type { Situacao } from "@/lib/situacao";
import { SeloSituacao } from "./SeloSituacao";

export type CartaoProblemaProps = {
  id: string | number;
  titulo: string;
  municipioNome: string;
  categoriaNome: string;
  situacao: Situacao;
  publicadoEm: string;
  temRespostaOficial: boolean;
};

export function CartaoProblema({
  id,
  titulo,
  municipioNome,
  categoriaNome,
  situacao,
  publicadoEm,
  temRespostaOficial,
}: CartaoProblemaProps) {
  return (
    <article className="rounded-lg border border-borda p-4">
      <h3 className="text-lg font-bold leading-snug">
        <Link href={`/problema/${id}`}>{titulo}</Link>
      </h3>
      <p className="mt-1 text-texto-suave">
        {municipioNome} · {categoriaNome}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <SeloSituacao situacao={situacao} />
        <span className="text-sm text-texto-suave">
          Publicado em {formatarData(publicadoEm)}
        </span>
        {temRespostaOficial ? (
          <span className="text-sm font-semibold">Tem resposta oficial</span>
        ) : null}
      </div>
    </article>
  );
}
