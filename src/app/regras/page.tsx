import Link from "next/link";
import { metadataInstitucional, PaginaInstitucional } from "@/components/PaginaInstitucional";

export const metadata = metadataInstitucional("Regras de publicação");

export default function RegrasPage() {
  return <PaginaInstitucional titulo="Regras de publicação" secoes={[
    { titulo: "Orientação para os testes", conteudo: <p>Use apenas informações fictícias no ambiente de testes. Descreva o problema de forma objetiva, sem dados pessoais, ameaças ou acusações contra pessoas. Envie somente imagens que possam ser usadas nesse contexto.</p> },
    { titulo: "Antes de aparecer no site", conteudo: <p>Os relatos enviados nesta versão passam por análise antes de aparecer no site. Uma resposta oficial ou uma mudança de situação não comprova, por si só, que o problema foi resolvido.</p> },
    { titulo: "Política editorial pendente", conteudo: <p>Os critérios completos de publicação, revisão de fotos, conferência, correção, denúncia, retirada e recurso ainda precisam ser aprovados. Nenhum prazo de análise está definido. Consulte os <Link href="/termos">termos em preparação</Link>.</p> },
  ]} />;
}
