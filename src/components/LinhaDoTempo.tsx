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
const TIPOS: Record<string, string> = { mudanca_situacao: "Mudança de situação", providencia: "Providência", evidencia: "Evidência", resposta_oficial: "Resposta oficial", nota: "Nota" };
function linkSeguro(valor: string): boolean {
  try { const url = new URL(valor); return url.protocol === "https:" && !url.username && !url.password && !/[\s\\]/.test(valor); } catch { return false; }
}
export function LinhaDoTempo({ itens }: { itens: ItemLinhaDoTempo[] }) {
  const ordenados = [...itens].sort((a, b) => {
    const instante = (valor: string) => { const n = Date.parse(valor); return Number.isNaN(n) ? Infinity : n; };
    return instante(a.criadoEm) - instante(b.criadoEm) || String(a.id).localeCompare(String(b.id), "pt-BR", { numeric: true });
  });
  if (!ordenados.length) return <p className="text-texto-suave">Ainda não há atualizações publicadas.</p>;
  return <ol aria-label="Histórico, do mais antigo ao mais recente" className="border-l border-borda pl-5">{ordenados.map(item => <li key={item.id} className="relative pb-6 last:pb-0">
    <span aria-hidden="true" className="absolute -left-[1.6rem] top-2 h-3 w-3 bg-acao" />
    <p className="text-sm text-texto-suave">{formatarData(item.criadoEm) ? <time dateTime={item.criadoEm}>{formatarData(item.criadoEm)}</time> : "Data não informada"}</p>
    <p className="font-semibold">{TIPOS[item.tipo] ?? "Atualização"}</p>
    {item.situacaoNova && (item.situacaoNova === "resolvido" && !(item.texto.trim() && item.evidencia?.trim()) ? <p>Resolução sem documentação</p> : <p>Situação: {rotuloSituacao(item.situacaoNova)}</p>)}
    <p className="whitespace-pre-line break-words">{item.texto}</p>
    {item.evidencia && <p className="mt-1 break-words text-sm"><span className="font-semibold">Evidência: </span>{linkSeguro(item.evidencia) ? <a href={item.evidencia} rel="noopener noreferrer">{item.evidencia}</a> : <span className="whitespace-pre-line">{item.evidencia}</span>}</p>}
  </li>)}</ol>;
}
