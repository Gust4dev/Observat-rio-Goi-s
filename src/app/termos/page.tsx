import Link from "next/link";
import { metadataInstitucional, PaginaInstitucional } from "@/components/PaginaInstitucional";

export const metadata = metadataInstitucional("Termos de uso");

export default function TermosPage() {
  return <PaginaInstitucional titulo="Termos de uso" secoes={[
    { titulo: "Versão em preparação", conteudo: <p>Os termos de uso ainda precisam de revisão e aprovação. As condições definitivas serão apresentadas antes da operação pública. Esta página registra os assuntos que precisam ser definidos.</p> },
    { titulo: "Limites do serviço", conteudo: <p>O Observatório permite ler e acompanhar relatos. Este espaço não substitui os canais oficiais de atendimento ou de emergência. A publicação de um relato não estabelece prazo de resposta ou de solução pelo órgão citado.</p> },
    { titulo: "Exibição pública e retirada", conteudo: <p>Quando o formulário indicar publicação imediata, o título, a descrição, o município e a categoria ficarão públicos após o envio. Outras pessoas podem copiar esse conteúdo. Guarde o <Link href="/acompanhar">link privado</Link> para acompanhar o relato e pedir sua retirada.</p> },
    { titulo: "Condições a definir", conteudo: <p>Responsabilidades, uso do conteúdo, critérios de publicação, correção, retirada e eventual recurso dependem de política aprovada. As <Link href="/regras">orientações de publicação</Link> também estão em revisão.</p> },
  ]} />;
}
