import Link from "next/link";
import { metadataInstitucional, PaginaInstitucional } from "@/components/PaginaInstitucional";

export const metadata = metadataInstitucional("Regras de publicação");

export default function RegrasPage() {
  return <PaginaInstitucional titulo="Regras de publicação" secoes={[
    { titulo: "Como enviar um relato", conteudo: <p>Descreva de forma objetiva um problema de interesse coletivo que você observou. Não inclua nomes, telefones, documentos, endereço residencial, ameaças ou acusações contra pessoas. Esta beta aceita relatos em texto; o envio de fotos permanece desativado.</p> },
    { titulo: "Antes de aparecer no site", conteudo: <p>Os relatos enviados nesta versão passam por análise antes de aparecer no site. Uma resposta oficial ou uma mudança de situação não comprova, por si só, que o problema foi resolvido.</p> },
    { titulo: "Política editorial pendente", conteudo: <p>Os critérios completos de publicação, revisão de fotos, conferência, correção, denúncia, retirada e recurso ainda precisam ser aprovados. Nenhum prazo de análise está definido. Consulte os <Link href="/termos">termos em preparação</Link>.</p> },
  ]} />;
}
