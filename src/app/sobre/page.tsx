import Link from "next/link";
import { metadataInstitucional, PaginaInstitucional } from "@/components/PaginaInstitucional";

export const metadata = metadataInstitucional("Sobre");

export default function SobrePage() {
  return <PaginaInstitucional titulo="Sobre o Observatório" secoes={[
    { titulo: "O que você encontra aqui", conteudo: <p>Esta versão organiza relatos sobre problemas públicos em Goiás e permite consultar o que foi publicado. O acompanhamento de um relato depende das informações disponíveis em sua página.</p> },
    { titulo: "Como ler os relatos", conteudo: <p>Um relato descreve a experiência de quem o enviou. Situação, resposta oficial e documentação de resolução são informações distintas. As contagens não medem a população afetada, a gravidade dos problemas ou o desempenho de um órgão.</p> },
    { titulo: "Definições em preparação", conteudo: <p>A organização responsável, a identidade institucional e as condições de operação pública ainda precisam ser confirmadas. Consulte a <Link href="/transparencia">página de transparência</Link> para conhecer os limites desta versão.</p> },
  ]} />;
}
