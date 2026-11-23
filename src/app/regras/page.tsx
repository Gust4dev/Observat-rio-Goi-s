import Link from "next/link";
import { metadataInstitucional, PaginaInstitucional } from "@/components/PaginaInstitucional";

export const metadata = metadataInstitucional("Regras de publicação");

export default function RegrasPage() {
  return <PaginaInstitucional titulo="Regras de publicação" secoes={[
    { titulo: "Como enviar um relato", conteudo: <p>Descreva de forma objetiva um problema de interesse coletivo que você observou. Não inclua nomes, telefones, documentos, endereço residencial, ameaças ou acusações contra pessoas. Quando o formulário aceitar fotos, a equipe revisará cada imagem antes da publicação.</p> },
    { titulo: "Publicação e revisão", conteudo: <p>O formulário informa se o texto ficará público ao enviar ou se passará por revisão primeiro. A equipe pode retirar relatos após a publicação. Uma resposta oficial ou mudança de situação não comprova, por si só, que o problema foi resolvido.</p> },
    { titulo: "Como pedir retirada", conteudo: <p>Abra seu <Link href="/acompanhar">link privado de acompanhamento</Link> para pedir retirada. Se a sinalização estiver disponível, você também pode comunicar um problema à equipe pelo detalhe público do relato. Consulte os <Link href="/termos">termos em preparação</Link>.</p> },
  ]} />;
}
