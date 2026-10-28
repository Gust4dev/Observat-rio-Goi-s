import Link from "next/link";
import { metadataInstitucional, PaginaInstitucional } from "@/components/PaginaInstitucional";

export const metadata = metadataInstitucional("Contato");

export default function ContatoPage() {
  return <PaginaInstitucional titulo="Contato" secoes={[
    { titulo: "Canal de contato ainda não definido", conteudo: <p>O endereço e a equipe de atendimento ainda precisam ser confirmados. Esta versão de testes não recebe mensagens de contato por esta página.</p> },
    { titulo: "Acompanhar um relato", conteudo: <p>Se você guardou o link privado de um relato de teste, use a <Link href="/acompanhar">página de acompanhamento</Link>. Não publique o código privado em outro relato.</p> },
    { titulo: "Atendimento oficial", conteudo: <p>Este espaço não substitui os canais oficiais de atendimento ou de emergência. Nenhum encaminhamento ou atendimento por esta página está disponível.</p> },
  ]} />;
}
