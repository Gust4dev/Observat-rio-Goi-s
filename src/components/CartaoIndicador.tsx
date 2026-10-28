import { AvisoMetodologico } from "./AvisoMetodologico";
import { SeloDemonstracao } from "./SeloDemonstracao";

export function CartaoIndicador({ nome, valor, nota, periodo, fonte, demonstracao = false }: {
  nome: string;
  valor: number | null;
  nota: string;
  periodo?: string;
  fonte?: string;
  demonstracao?: boolean;
}) {
  const disponivel = valor !== null && Number.isFinite(valor) && valor >= 0;
  return (
    <section aria-label={nome} className="rounded-2xl border border-borda-suave bg-superficie p-5">
      {demonstracao && <SeloDemonstracao />}
      <h2 className="text-lg">{nome}</h2>
      <p className="mt-2 text-3xl font-bold tabular-nums">{disponivel ? valor.toLocaleString("pt-BR") : "Dado indisponível"}</p>
      {periodo && <p className="mt-2 text-sm">Período: {periodo}</p>}
      {fonte && <p className="text-sm">Fonte: {fonte}</p>}
      <p className="my-3 text-sm text-texto-suave">{nota}</p>
      <AvisoMetodologico />
    </section>
  );
}
