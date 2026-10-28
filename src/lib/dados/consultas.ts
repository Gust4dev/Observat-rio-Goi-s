import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { consultar, type OpcoesConsulta } from "./rest";
import {
  atualizacaoSchema, categoriaSchema, imagemSchema, indicadoresGeraisSchema, indicadorMunicipioCategoriaSchema,
  municipioCoberturaSchema, COLUNAS_MUNICIPIO_COBERTURA, municipioSchema, problemaDetalheSchema, problemaListaSchema, respostaSchema,
  COLUNAS_ATUALIZACAO, COLUNAS_CATEGORIA, COLUNAS_IMAGEM, COLUNAS_INDICADORES_GERAIS,
  COLUNAS_INDICADOR_MUNICIPIO_CATEGORIA, COLUNAS_MUNICIPIO, COLUNAS_PROBLEMA_DETALHE, COLUNAS_PROBLEMA_LISTA,
  COLUNAS_RESPOSTA,
  type Atualizacao, type Categoria, type Imagem, type IndicadoresGerais, type Municipio, type ProblemaDetalhe,
  type ProblemaLista, type Resposta,
} from "./schemas";
import {
  codificarCursor, decodificarCursor, idSchema, lerBuscaMunicipio, lerFiltros, slugSchema, TAMANHO_PAGINA,
  type Cursor, type Filtros,
} from "./params";

// ---------------------------------------------------------------- montagem pura (testável sem rede)

/** Filtro de cursor. Revalida estritamente antes de interpolar. */
export function filtroCursor(c: Cursor): string {
  const v = decodificarCursor(codificarCursor(c));
  if (!v) throw new Error("cursor inválido");
  return `(publicado_em.lt.${v.t},and(publicado_em.eq.${v.t},id.lt.${v.id}))`;
}

export function montarConsultaLista(f: Filtros, tamanho: number = TAMANHO_PAGINA): OpcoesConsulta {
  const filtros: [string, string][] = [];
  if (f.municipio !== undefined) filtros.push(["municipio_slug", `eq.${slugSchema.parse(f.municipio)}`]);
  if (f.categoria !== undefined) filtros.push(["categoria_slug", `eq.${slugSchema.parse(f.categoria)}`]);
  if (f.cursor !== undefined) filtros.push(["or", filtroCursor(f.cursor)]);
  return {
    select: COLUNAS_PROBLEMA_LISTA,
    filtros,
    ordem: [
      { coluna: "publicado_em", direcao: "desc" },
      { coluna: "id", direcao: "desc" },
    ],
    limite: tamanho + 1, // +1 para saber se existe próxima página
  };
}

export function montarConsultaPorOcorrencia(
  colunas: readonly string[],
  id: string,
  ordem: OpcoesConsulta["ordem"],
): OpcoesConsulta {
  return { select: colunas, filtros: [["ocorrencia_id", `eq.${idSchema.parse(id)}`]], ordem };
}

// ---------------------------------------------------------------- imagens

const BUCKET_IMAGENS = "imagens-publicas";
const SEGMENTO_RE = /^[A-Za-z0-9._-]{1,200}$/;

/** URL pública do bucket; null se o caminho ou o host forem suspeitos. Base injetável para teste. */
export function urlImagem(
  caminho: string,
  base: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL,
): string | null {
  if (!base) return null;
  let host: URL;
  try {
    host = new URL(base);
  } catch {
    return null;
  }
  if (host.protocol !== "https:" || !host.hostname.endsWith(".supabase.co")) return null;
  const segmentos = caminho.split("/");
  if (segmentos.length > 6 || !segmentos.every((s) => SEGMENTO_RE.test(s) && s !== "." && s !== "..")) return null;
  const url = new URL(`/storage/v1/object/public/${BUCKET_IMAGENS}/${segmentos.join("/")}`, host.origin);
  return url.origin === host.origin ? url.toString() : null;
}

// ---------------------------------------------------------------- consultas em cache

export async function listarProblemas(
  entrada: { municipio?: string; categoria?: string; cursor?: string } = {},
): Promise<{ itens: ProblemaLista[]; proximoCursor: string | null }> {
  "use cache";
  cacheLife("minutes");
  cacheTag("problemas");
  // Revalida tudo: o chamador pode ter passado qualquer coisa.
  const f = lerFiltros(entrada);
  if (f.municipio) cacheTag(`municipio:${f.municipio}`);

  const linhas = await consultar("v_ocorrencias_publicas", montarConsultaLista(f), problemaListaSchema);
  const itens = linhas.slice(0, TAMANHO_PAGINA);
  const ultimo = itens[itens.length - 1];
  const proximoCursor =
    linhas.length > TAMANHO_PAGINA && ultimo ? codificarCursor({ t: ultimo.publicado_em, id: ultimo.id }) : null;
  return { itens, proximoCursor };
}

export async function obterProblema(id: string): Promise<{
  problema: ProblemaDetalhe;
  imagens: Imagem[];
  atualizacoes: Atualizacao[];
  respostas: Resposta[];
} | null> {
  "use cache";
  cacheLife("minutes");
  const v = idSchema.safeParse(id);
  if (!v.success) return null;
  cacheTag("problemas", `problema:${v.data}`);

  const [problemas, imagens, atualizacoes, respostas] = await Promise.all([
    consultar(
      "v_ocorrencias_publicas",
      { select: COLUNAS_PROBLEMA_DETALHE, filtros: [["id", `eq.${v.data}`]], limite: 1 },
      problemaDetalheSchema,
    ),
    consultar(
      "v_imagens_publicas",
      montarConsultaPorOcorrencia(COLUNAS_IMAGEM, v.data, [{ coluna: "ordem", direcao: "asc" }]),
      imagemSchema,
    ),
    consultar(
      "v_atualizacoes_publicas",
      montarConsultaPorOcorrencia(COLUNAS_ATUALIZACAO, v.data, [
        { coluna: "criado_em", direcao: "asc" },
        { coluna: "id", direcao: "asc" },
      ]),
      atualizacaoSchema,
    ),
    consultar(
      "v_respostas_publicas",
      montarConsultaPorOcorrencia(COLUNAS_RESPOSTA, v.data, [{ coluna: "publicada_em", direcao: "asc" }]),
      respostaSchema,
    ),
  ]);
  const problema = problemas[0];
  if (!problema) return null;
  return { problema, imagens, atualizacoes, respostas };
}

export async function obterMunicipio(slug: string): Promise<{ slug: string; nome: string; total: number; ativo_acompanhamento: boolean } | null> {
  "use cache";
  cacheLife("minutes");
  const v = slugSchema.safeParse(slug);
  if (!v.success) return null;
  cacheTag(`municipio:${v.data}`);

  const [municipios, contagens] = await Promise.all([
    consultar(
      "municipios",
      { select: COLUNAS_MUNICIPIO_COBERTURA, filtros: [["slug", `eq.${v.data}`]], limite: 1 },
      municipioCoberturaSchema,
    ),
    consultar(
      "v_indicadores_municipio_categoria",
      { select: COLUNAS_INDICADOR_MUNICIPIO_CATEGORIA, filtros: [["municipio_slug", `eq.${v.data}`]], limite: 100 },
      indicadorMunicipioCategoriaSchema,
    ),
  ]);
  const m = municipios[0];
  if (!m) return null;
  return { slug: m.slug, nome: m.nome, ativo_acompanhamento: m.ativo_acompanhamento, total: contagens.reduce((s, c) => s + c.total, 0) };
}

export async function listarMunicipios(): Promise<Municipio[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("municipios");
  return consultar(
    "municipios",
    { select: COLUNAS_MUNICIPIO, ordem: [{ coluna: "nome", direcao: "asc" }], limite: 300 },
    municipioSchema,
  );
}

/** Filtra no servidor sobre o catálogo em cache, sem interpolar texto em PostgREST. */
export function selecionarMunicipios<T extends { nome: string; slug: string }>(municipios: T[], entrada: unknown): T[] {
  const normalizar = (nome: string) => nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
  const busca = normalizar(lerBuscaMunicipio(entrada));
  if (!busca) return [];
  return municipios.filter((m) => normalizar(m.nome).includes(busca)).slice(0, 12);
}

export async function pesquisarMunicipios(nome: string): Promise<Municipio[]> {
  return selecionarMunicipios(await listarMunicipios(), nome);
}

export async function listarCategorias(): Promise<Categoria[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("categorias");
  return consultar(
    "categorias",
    {
      select: COLUNAS_CATEGORIA,
      ordem: [{ coluna: "ordem", direcao: "asc" }, { coluna: "slug", direcao: "asc" }],
      limite: 100,
    },
    categoriaSchema,
  );
}

export async function ultimosProblemas(n: number = 5): Promise<ProblemaLista[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("problemas");
  const limite = Number.isInteger(n) ? Math.min(Math.max(n, 1), 20) : 5;
  return consultar(
    "v_ocorrencias_publicas",
    {
      select: COLUNAS_PROBLEMA_LISTA,
      ordem: [{ coluna: "publicado_em", direcao: "desc" }, { coluna: "id", direcao: "desc" }],
      limite,
    },
    problemaListaSchema,
  );
}

export async function indicadoresGerais(): Promise<IndicadoresGerais | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("indicadores");
  const [linha] = await consultar(
    "v_indicadores_gerais",
    { select: COLUNAS_INDICADORES_GERAIS, limite: 1 },
    indicadoresGeraisSchema,
  );
  return linha ?? null;
}

/** Página completa por cursor de id, sem truncar em 300 relatos. */
export async function obterDadosPainel(entrada: {municipio?:string;categoria?:string} = {}) {
  'use cache';
  cacheLife('minutes');
  cacheTag('indicadores','problemas');
  const { dadoPainelSchema, COLUNAS_DADO_PAINEL } = await import('./schemas');
  const f=lerFiltros(entrada);
  const itens: import('./schemas').DadoPainel[]=[];
  let ultimo:string|undefined;
  for (;;) {
    const filtros:[string,string][]=[];
    if(f.municipio) filtros.push(['municipio_slug',`eq.${f.municipio}`]);
    if(f.categoria) filtros.push(['categoria_slug',`eq.${f.categoria}`]);
    if(ultimo) filtros.push(['id',`gt.${idSchema.parse(ultimo)}`]);
    const lote=await consultar('v_dados_painel',{select:COLUNAS_DADO_PAINEL,filtros,ordem:[{coluna:'id',direcao:'asc'}],limite:300},dadoPainelSchema);
    itens.push(...lote);
    if(lote.length<300) return itens;
    ultimo=lote[lote.length-1].id;
  }
}
