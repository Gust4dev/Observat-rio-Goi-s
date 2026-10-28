import Link from "next/link";
import { metadataInstitucional, PaginaInstitucional } from "@/components/PaginaInstitucional";

export const metadata = metadataInstitucional("Transparência");

export default function TransparenciaPage() {
  return <PaginaInstitucional titulo="Transparência e metodologia" secoes={[
    { titulo: "De onde vêm as contagens", conteudo: <p>As contagens do painel usam relatos voluntários publicados no Observatório. Registros em análise e informações privadas ficam fora dos dados públicos. O painel apresenta a fonte e a fórmula de cada indicador.</p> },
    { titulo: "O que os números não dizem", conteudo: <p>Mais relatos podem refletir maior participação. Ausência de relatos não significa ausência de problemas. As contagens não formam um ranking de municípios e não representam uma pesquisa da população.</p> },
    { titulo: "Pendências desta versão", conteudo: <p>Responsáveis, financiamento, critérios operacionais de acompanhamento e políticas editoriais precisam de definição antes da abertura pública. Não há conexão ativa com bases oficiais nesta versão do <Link href="/dados">painel de dados</Link>.</p> },
  ]} />;
}
