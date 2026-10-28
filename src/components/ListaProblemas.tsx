import Link from "next/link";
import {
  listarCategorias,
  listarMunicipios,
  listarProblemas,
  selecionarMunicipios,
} from "@/lib/dados/consultas";
import { lerBuscaMunicipio, lerFiltros, type SearchParamsBrutos } from "@/lib/dados/params";
import { CartaoProblema } from "./CartaoProblema";
import { EstadoVazio } from "./EstadoVazio";

type Consulta = { municipio?: string; categoria?: string; cursor?: string; nomeMunicipio?: string };

/** Monta "base?municipio=..&categoria=..&cursor=.." só com o que existe. */
export function montarHref(base: string, q: Consulta): string {
  const p = new URLSearchParams();
  if (q.municipio) p.set("municipio", q.municipio);
  if (q.categoria) p.set("categoria", q.categoria);
  if (q.cursor) p.set("cursor", q.cursor);
  if (q.nomeMunicipio) p.set("nome_municipio", q.nomeMunicipio);
  const s = p.toString();
  return s ? `${base}?${s}` : base;
}

const CLASSE_CHIP =
  "rounded-full border border-borda px-4 text-texto no-underline hover:bg-superficie";
const CLASSE_CHIP_ATIVO =
  "rounded-full border border-acao bg-acao px-4 font-semibold text-sobre-acao no-underline hover:bg-acao-escura hover:text-sobre-acao";

/**
 * Filtros (categoria e, em /problemas, município) + lista + paginação.
 * Lê searchParams: use sempre dentro de <Suspense>.
 * Em /municipios/[slug], `municipioFixo` vale sobre qualquer ?municipio= da URL.
 */
export async function ListaProblemas({
  searchParams,
  base,
  municipioFixo,
  comSeletorDeMunicipio = false,
}: {
  searchParams: Promise<SearchParamsBrutos>;
  base: string;
  municipioFixo?: string;
  comSeletorDeMunicipio?: boolean;
}) {
  const sp = await searchParams;
  const f = lerFiltros(sp);
  const cursorBruto = Array.isArray(sp.cursor) ? sp.cursor[0] : sp.cursor;
  const municipio = municipioFixo ?? f.municipio;
  const categoria = f.categoria;
  const buscaMunicipio = lerBuscaMunicipio(sp.nome_municipio);
  const [categorias, catalogo, pagina] = await Promise.all([
    listarCategorias(),
    comSeletorDeMunicipio ? listarMunicipios() : Promise.resolve([]),
    // Passa o cursor ainda opaco: a função em cache revalida tudo.
    listarProblemas({
      municipio,
      categoria,
      cursor: cursorBruto,
    }),
  ]);
  const selecionado = catalogo.find((m) => m.slug === municipio);
  const encontrados = selecionarMunicipios(catalogo, buscaMunicipio);
  const municipios = selecionado && !encontrados.some((m) => m.slug === selecionado.slug)
    ? [selecionado, ...encontrados] : encontrados;
  const temFiltro = Boolean(municipio ?? categoria);
  const limpar = municipioFixo ? base : "/problemas";

  return (
    <>
      {comSeletorDeMunicipio ? (
        <div className="flex min-w-0 flex-col gap-4">
        <form method="get" action={base} className="flex min-w-0 flex-wrap items-end gap-3">
          {municipio ? <input type="hidden" name="municipio" value={municipio} /> : null}
          {categoria ? <input type="hidden" name="categoria" value={categoria} /> : null}
          <div className="flex min-w-0 flex-1 flex-col">
            <label htmlFor="busca-municipio" className="font-semibold">Nome do município</label>
            <input id="busca-municipio" name="nome_municipio" type="search" maxLength={80}
              defaultValue={buscaMunicipio} aria-describedby="ajuda-municipio"
              className="min-h-12 w-full rounded-lg border border-borda bg-fundo px-3" />
          </div>
          <button type="submit" className="min-h-12 rounded-lg border border-acao px-4 font-semibold">Buscar município</button>
        </form>
        <p id="ajuda-municipio" className="text-sm text-texto-suave">Digite o nome, busque e escolha abaixo. A busca funciona com teclado e sem JavaScript. Até 12 resultados por busca; refine o nome para encontrar outros municípios.</p>
        {buscaMunicipio ? <p role="status">{encontrados.length ? "Escolha um dos municípios encontrados." : "Nenhum município encontrado. Tente outro nome."}</p> : null}
        <form method="get" action={base} className="flex min-w-0 flex-wrap items-end gap-3">
          {buscaMunicipio ? <input type="hidden" name="nome_municipio" value={buscaMunicipio} /> : null}
          <div className="flex min-w-0 w-full flex-col sm:w-auto">
            <label htmlFor="filtro-municipio" className="font-semibold">
              Município
            </label>
            <select
              id="filtro-municipio"
              name="municipio"
              defaultValue={municipio ?? ""}
              className="min-h-12 w-full max-w-full rounded-lg border border-borda bg-fundo px-3"
            >
              <option value="">Todos os municípios</option>
              {municipios.map((m) => (
                <option key={m.slug} value={m.slug}>
                  {m.nome}
                </option>
              ))}
            </select>
          </div>
          {categoria ? <input type="hidden" name="categoria" value={categoria} /> : null}
          <button
            type="submit"
            className="rounded-lg bg-acao px-5 font-semibold text-sobre-acao hover:bg-acao-escura"
          >
            Aplicar filtros
          </button>
        </form>
        </div>
      ) : null}

      <nav aria-label="Categorias" className="mt-5">
        <p className="font-semibold">Categoria</p>
        <ul className="mt-1 flex flex-wrap gap-2">
          <li>
            <Link
              href={montarHref(base, {
                municipio: comSeletorDeMunicipio ? municipio : undefined,
                nomeMunicipio: comSeletorDeMunicipio ? buscaMunicipio : undefined,
              })}
              prefetch={false}
              aria-current={categoria ? undefined : "true"}
              className={categoria ? CLASSE_CHIP : CLASSE_CHIP_ATIVO}
            >
              Todas
            </Link>
          </li>
          {categorias.map((c) => (
            <li key={c.slug}>
              <Link
                href={montarHref(base, {
                  municipio: comSeletorDeMunicipio ? municipio : undefined,
                  categoria: c.slug,
                  nomeMunicipio: comSeletorDeMunicipio ? buscaMunicipio : undefined,
                })}
                prefetch={false}
                aria-current={categoria === c.slug ? "true" : undefined}
                className={categoria === c.slug ? CLASSE_CHIP_ATIVO : CLASSE_CHIP}
              >
                {c.nome}
              </Link>
            </li>
          ))}
        </ul>
        {temFiltro ? (
          <div className="mt-3">
            <Link href={limpar} prefetch={false}>
              Limpar filtros
            </Link>
          </div>
        ) : null}
      </nav>

      <section aria-labelledby="titulo-lista" className="mt-6">
        <h2 id="titulo-lista" tabIndex={-1} className="mb-4 scroll-mt-24">
          Relatos
        </h2>
        {pagina.itens.length === 0 ? (
          <EstadoVazio
            titulo="Nenhum relato encontrado"
            texto={
              temFiltro
                ? "Não há relatos publicados com esses filtros."
                : "Ainda não há relatos publicados."
            }
            acaoHref={temFiltro ? limpar : undefined}
            acaoRotulo={temFiltro ? "Limpar filtros" : undefined}
          />
        ) : (
          <ul className="flex flex-col gap-4">
            {pagina.itens.map((p) => (
              <li key={p.id}>
                <CartaoProblema
                  id={p.id}
                  titulo={p.titulo}
                  municipioNome={p.municipio_nome}
                  categoriaNome={p.categoria_nome}
                  situacao={p.situacao}
                  publicadoEm={p.publicado_em}
                  temRespostaOficial={p.tem_resposta_oficial}
                />
              </li>
            ))}
          </ul>
        )}
        {pagina.proximoCursor ? (
          <div className="mt-6">
            <a
              href={`${montarHref(base, {
                municipio: comSeletorDeMunicipio ? municipio : undefined,
                categoria,
                cursor: pagina.proximoCursor,
                nomeMunicipio: comSeletorDeMunicipio ? buscaMunicipio : undefined,
              })}#titulo-lista`}
              className="inline-flex min-h-12 items-center rounded-lg border border-acao px-5 font-semibold no-underline"
            >
              Próxima página
            </a>
          </div>
        ) : null}
      </section>
    </>
  );
}

export function CarregandoLista() {
  return (
    <p role="status" className="text-texto-suave">
      Carregando relatos…
    </p>
  );
}
