import Link from "next/link";
import { BuscaMunicipio } from "./BuscaMunicipio";
import { MapaEstatico } from "./MapaEstatico";
import { SeloDemonstracao } from "./SeloDemonstracao";
import type { ResumoSemana } from "@/lib/dados/semana";

type Indicadores = { total_ocorrencias: number; municipios_com_registros: number };
type Municipio = { slug: string; nome: string };

const plural = (n: number, singular: string, pluralTexto: string) => `${n.toLocaleString("pt-BR")} ${n === 1 ? singular : pluralTexto}`;

function manchete(resumo: ResumoSemana, indicadores?: Indicadores | null): string {
  if (resumo.categoriaLider) {
    const { total, nome } = resumo.categoriaLider;
    return `${plural(total, "relato", "relatos")} sobre ${nome} nos últimos 7 dias`;
  }
  if (indicadores && indicadores.total_ocorrencias > 0) {
    return `${plural(indicadores.total_ocorrencias, "relato publicado", "relatos publicados")} em ${plural(indicadores.municipios_com_registros, "município", "municípios")}`;
  }
  return "Goiás, visto de perto.";
}

function descricaoMapa(resumo: ResumoSemana): string {
  if (!resumo.pontos.length) return "Mapa de Goiás sem destaques nos últimos 7 dias";
  return `Mapa de Goiás; destaques em ${resumo.pontos.map(p => p.nome).join(", ")}`;
}

export function HeroInicio({ resumo, indicadores, municipios, demonstracao }: { resumo: ResumoSemana; indicadores?: Indicadores | null; municipios: readonly Municipio[]; demonstracao: boolean }) {
  return <section id="territorio" aria-label="Explore os municípios de Goiás" className="grid min-w-0 scroll-mb-32 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-x-8">
    <div className="min-w-0 space-y-5">
      <header>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-territorio">Explore seu município</p>
        <h1 id="titulo-inicio" className="text-4xl leading-tight tracking-tight sm:text-5xl">{manchete(resumo, indicadores)}</h1>
        <p className="mt-3 max-w-2xl text-base text-texto-suave sm:text-lg">Encontre sua cidade, consulte relatos públicos e acompanhe as atualizações.</p>
        {demonstracao ? <p className="mt-2"><SeloDemonstracao /></p> : null}
      </header>
      <BuscaMunicipio municipios={municipios} />
      <Link prefetch={false} href="/registrar" className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-acao px-4 py-3 font-semibold text-sobre-acao no-underline hover:bg-acao-pressionada hover:text-sobre-acao">Registrar um problema</Link>
      <p className="text-xs text-texto-suave">Não é canal oficial de atendimento.</p>
    </div>
    <div className="min-w-0 space-y-4">
      <MapaEstatico pontos={resumo.pontos} descricao={descricaoMapa(resumo)} />
      {resumo.pontos.length ? <div className="border-t border-borda-suave pt-4">
        <h2 className="text-xl font-semibold text-territorio">Onde mais se fala agora</h2>
        <ul className="mt-2">{resumo.pontos.map(p => <li key={p.slug}><Link prefetch={false} href={`/municipios/${p.slug}`} className="inline-flex min-h-12 items-center font-semibold underline underline-offset-4">{p.nome}</Link></li>)}</ul>
      </div> : <p className="border-t border-borda-suave pt-4 text-sm text-texto-suave">Ainda há poucos relatos nos últimos 7 dias para destacar municípios. Seja a primeira pessoa a registrar um problema na sua cidade.</p>}
      <details className="border-t border-borda-suave pt-3 text-texto-suave"><summary className="cursor-pointer py-2 text-sm font-semibold">Sobre os dados e fonte do mapa</summary><div className="space-y-2 pt-2">
        <p className="text-sm">Os relatos são publicações voluntárias na plataforma; não medem a situação de todo o município. A seleção não indica endereço nem gravidade.</p>
        <p className="text-xs">Fonte: <a href="https://servicodados.ibge.gov.br/api/v3/malhas/estados/52?intrarregiao=municipio&amp;formato=image%2Fsvg%2Bxml&amp;qualidade=minima" className="underline">IBGE, malha municipal de Goiás</a>, captura em 28/10/2026. Geometria simplificada pelo Observatório Goiás, com alterações das características originais; licença <a href="https://creativecommons.org/licenses/by/4.0/" className="underline">CC BY 4.0</a>. Referência territorial, sem valor de demarcação legal.</p>
      </div></details>
    </div>
  </section>;
}
