import Link from "next/link";
import { metadataInstitucional, PaginaInstitucional } from "@/components/PaginaInstitucional";

export const metadata = metadataInstitucional("Privacidade");

export default function PrivacidadePage() {
  return <PaginaInstitucional titulo="Privacidade" secoes={[
    { titulo: "Antes de enviar", conteudo: <p>O formulário de relato não solicita nome ou contato. Não inclua dados pessoais no título, na descrição ou nas fotos. O texto publicado pode ser copiado por outras pessoas. O contato enviado junto de um direito de resposta serve à revisão da equipe e permanece privado.</p> },
    { titulo: "Guarda do link privado", conteudo: <p>O link privado permite acompanhar o relato e pedir sua retirada. Guarde-o com cuidado e evite compartilhá-lo com outras pessoas. O protocolo público, sozinho, não recupera esse acesso. Abra a <Link href="/acompanhar">página de acompanhamento</Link> para consultar as opções.</p> },
    { titulo: "Informações ainda pendentes", conteudo: <p>Controlador, canal para exercício de direitos, finalidades, bases legais, retenção, armazenamento e procedimento de atendimento precisam de definição e revisão. Este texto não substitui uma política de privacidade aprovada. O <Link href="/contato">canal de contato</Link> permanece em preparação.</p> },
  ]} />;
}
