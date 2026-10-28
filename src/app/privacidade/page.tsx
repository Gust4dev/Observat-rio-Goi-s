import Link from "next/link";
import { metadataInstitucional, PaginaInstitucional } from "@/components/PaginaInstitucional";

export const metadata = metadataInstitucional("Privacidade");

export default function PrivacidadePage() {
  return <PaginaInstitucional titulo="Privacidade" secoes={[
    { titulo: "Antes de enviar", conteudo: <p>A versão de testes usa relatos fictícios e não solicita nome ou contato. Evite inserir dados pessoais na descrição ou nas fotos. A política para coleta real ainda depende de aprovação.</p> },
    { titulo: "Guarda do link privado", conteudo: <p>O link privado permite acompanhar o relato. Guarde-o com cuidado e evite compartilhá-lo com outras pessoas. O protocolo público, sozinho, não recupera esse acesso. As opções disponíveis são apresentadas na <Link href="/acompanhar">página de acompanhamento</Link>.</p> },
    { titulo: "Informações ainda pendentes", conteudo: <p>Controlador, canal para exercício de direitos, finalidades, bases legais, retenção, armazenamento e procedimento de atendimento precisam de definição e revisão. Este texto não substitui uma política de privacidade aprovada. O <Link href="/contato">canal de contato</Link> permanece em preparação.</p> },
  ]} />;
}
