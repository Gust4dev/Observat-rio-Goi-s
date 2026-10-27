import { formatarData } from "@/lib/formato";
import { rotuloSituacao, type Situacao } from "@/lib/situacao";

export type ItemLinhaDoTempo = {
  id: string | number;
  tipo: string;
  situacaoNova: Situacao | null;
  texto: string;
  evidencia: string | null;
  criadoEm: string;
};

export function LinhaDoTempo({ itens }: { itens: ItemLinhaDoTempo[] }) {
  return (
    <ol className="border-l-2 border-borda pl-4">
      {itens.map((item) => (
        <li key={item.id} className="relative pb-6 last:pb-0">
          <span
            aria-hidden="true"
            className="absolute -left-[1.45rem] top-2 h-3 w-3 rounded-full bg-acao"
          />
          <p className="text-sm text-texto-suave">
            <time dateTime={item.criadoEm}>{formatarData(item.criadoEm)}</time>
          </p>
          {item.situacaoNova ? (
            <p className="font-semibold">
              Situação: {rotuloSituacao(item.situacaoNova)}
            </p>
          ) : null}
          <p className="whitespace-pre-line">{item.texto}</p>
          {item.evidencia ? (
            <p className="mt-1 text-sm">
              <span className="font-semibold">Evidência:</span>{" "}
              <span className="whitespace-pre-line">{item.evidencia}</span>
            </p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
