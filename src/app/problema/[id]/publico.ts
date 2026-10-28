import type { obterProblema } from "@/lib/dados/consultas";
import { rotuloSituacao, temDocumentacaoResolucao } from "@/lib/situacao";
type Dados = NonNullable<Awaited<ReturnType<typeof obterProblema>>>;
/** Usa exclusivamente o histórico público; não presume documentação privada. */
export function resolucaoPublica(dados: Dados) {
  if (dados.problema.situacao !== "resolvido") return undefined;
  return [...dados.atualizacoes].sort((a, b) => Date.parse(b.criado_em) - Date.parse(a.criado_em) || b.id - a.id).find(a => a.situacao_nova === "resolvido");
}
export function situacaoPublica(dados: Dados) {
  const evento = resolucaoPublica(dados);
  return dados.problema.situacao === "resolvido" && !temDocumentacaoResolucao({ justificativa: evento?.texto ?? null, evidencia: evento?.evidencia ?? null }) ? "Resolução sem documentação" : rotuloSituacao(dados.problema.situacao);
}
/** Sem domínio aprovado não inventamos URL nem usamos cabeçalhos do visitante. */
export function urlPublica(id: string): string | null {
  try {
    const base = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "");
    if (base.protocol !== "https:" || base.username || base.password) return null;
    return new URL(`/problema/${encodeURIComponent(id)}`, base.origin).href;
  } catch { return null; }
}
