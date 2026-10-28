import { z } from "zod";
import { SITUACOES } from "@/lib/situacao";

// DTO por view pública. Toda resposta do PostgREST passa por aqui (teste de contrato em runtime).
// As listas COLUNAS_* são as ÚNICAS que podem ir em `select`; nunca `*`.
// Fora de propósito: `busca` (tsvector) e qualquer dado de contato/admin.

const uuid = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
const situacao = z.enum(SITUACOES);
// Timestamp mantido como TEXTO: o cursor precisa da precisão de microssegundos do Postgres.
export const TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$/;
const timestamp = z.string().regex(TIMESTAMP_RE);

// ---------------------------------------------------------------- v_ocorrencias_publicas
export const COLUNAS_PROBLEMA_LISTA = [
  "id", "titulo", "situacao", "verificado", "publicado_em",
  "municipio_nome", "municipio_slug", "categoria_nome", "categoria_slug",
  "confirmacoes_total", "tem_resposta_oficial",
] as const;

export const COLUNAS_PROBLEMA_DETALHE = [
  "id", "protocolo", "titulo", "descricao", "situacao", "verificado", "publicado_em", "atualizado_em",
  "municipio_id", "municipio_nome", "municipio_slug",
  "categoria_id", "categoria_nome", "categoria_slug",
  "confirmacoes_total", "tem_resposta_oficial",
] as const;

export const problemaListaSchema = z.object({
  id: uuid,
  titulo: z.string(),
  situacao,
  verificado: z.boolean(),
  publicado_em: timestamp,
  municipio_nome: z.string(),
  municipio_slug: z.string(),
  categoria_nome: z.string(),
  categoria_slug: z.string(),
  confirmacoes_total: z.number().int(),
  tem_resposta_oficial: z.boolean(),
});
export type ProblemaLista = z.infer<typeof problemaListaSchema>;

export const problemaDetalheSchema = z.object({
  id: uuid,
  protocolo: z.string(),
  titulo: z.string(),
  descricao: z.string(),
  situacao,
  verificado: z.boolean(),
  publicado_em: timestamp,
  atualizado_em: timestamp,
  municipio_id: z.number().int(),
  municipio_nome: z.string(),
  municipio_slug: z.string(),
  categoria_id: z.number().int(),
  categoria_nome: z.string(),
  categoria_slug: z.string(),
  confirmacoes_total: z.number().int(),
  tem_resposta_oficial: z.boolean(),
});
export type ProblemaDetalhe = z.infer<typeof problemaDetalheSchema>;

// ---------------------------------------------------------------- demais views
export const COLUNAS_IMAGEM = ["id", "ocorrencia_id", "ordem", "caminho_storage"] as const;
export const imagemSchema = z.object({
  id: uuid,
  ocorrencia_id: uuid,
  ordem: z.number().int(),
  caminho_storage: z.string(),
});
export type Imagem = z.infer<typeof imagemSchema>;

export const TIPOS_ATUALIZACAO = ["mudanca_situacao", "providencia", "evidencia", "resposta_oficial", "nota"] as const;
export const COLUNAS_ATUALIZACAO = ["id", "ocorrencia_id", "tipo", "situacao_nova", "texto", "evidencia", "criado_em"] as const;
export const atualizacaoSchema = z.object({
  id: z.number().int(),
  ocorrencia_id: uuid,
  tipo: z.enum(TIPOS_ATUALIZACAO),
  situacao_nova: situacao.nullable(),
  texto: z.string(),
  evidencia: z.string().nullable(),
  criado_em: timestamp,
});
export type Atualizacao = z.infer<typeof atualizacaoSchema>;

export const COLUNAS_RESPOSTA = ["id", "ocorrencia_id", "autor_vinculo", "texto", "publicada_em"] as const;
export const respostaSchema = z.object({
  id: z.number().int(),
  ocorrencia_id: uuid,
  autor_vinculo: z.string(),
  texto: z.string(),
  publicada_em: timestamp.nullable(),
});
export type Resposta = z.infer<typeof respostaSchema>;

export const COLUNAS_INDICADORES_GERAIS = [
  "total_ocorrencias", "municipios_com_registros", "com_resposta_oficial", "resolvidas_documentadas",
] as const;
export const indicadoresGeraisSchema = z.object({
  total_ocorrencias: z.number().int(),
  municipios_com_registros: z.number().int(),
  com_resposta_oficial: z.number().int(),
  resolvidas_documentadas: z.number().int(),
});
export type IndicadoresGerais = z.infer<typeof indicadoresGeraisSchema>;

export const COLUNAS_INDICADOR_MUNICIPIO_CATEGORIA = [
  "municipio_slug", "municipio_nome", "categoria_slug", "categoria_nome", "total",
] as const;
export const indicadorMunicipioCategoriaSchema = z.object({
  municipio_slug: z.string(),
  municipio_nome: z.string(),
  categoria_slug: z.string(),
  categoria_nome: z.string(),
  total: z.number().int(),
});

export const COLUNAS_INDICADOR_MENSAL = ["mes", "total"] as const;
export const indicadorMensalSchema = z.object({
  mes: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  total: z.number().int(),
});

export const COLUNAS_INDICADOR_SITUACAO = ["situacao", "total"] as const;
export const indicadorSituacaoSchema = z.object({ situacao, total: z.number().int() });

// ---------------------------------------------------------------- tabelas de referência (leitura anon, 004)
export const COLUNAS_MUNICIPIO = ["slug", "nome"] as const;
export const municipioSchema = z.object({ slug: z.string(), nome: z.string() });
export type Municipio = z.infer<typeof municipioSchema>;

export const COLUNAS_CATEGORIA = ["slug", "nome", "ordem"] as const;
export const categoriaSchema = z.object({ slug: z.string(), nome: z.string(), ordem: z.number().int() });
export type Categoria = z.infer<typeof categoriaSchema>;

// Sinal público já autorizado por 004: SELECT da tabela com leitura_publica usando true.
export const COLUNAS_MUNICIPIO_COBERTURA = [...COLUNAS_MUNICIPIO, 'ativo_acompanhamento'] as const;
export const municipioCoberturaSchema = municipioSchema.extend({ ativo_acompanhamento: z.boolean() });

export const COLUNAS_DADO_PAINEL = ['id','municipio_slug','municipio_nome','categoria_slug','categoria_nome','mes','situacao','total','com_resposta_oficial','resolvidas_documentadas'] as const;
export const dadoPainelSchema = z.object({id:uuid,municipio_slug:z.string(),municipio_nome:z.string(),categoria_slug:z.string(),categoria_nome:z.string(),mes:z.string().regex(/^\d{4}-\d{2}-01$/),situacao,total:z.number().int().nonnegative(),com_resposta_oficial:z.number().int().nonnegative(),resolvidas_documentadas:z.number().int().nonnegative()});
export type DadoPainel = z.infer<typeof dadoPainelSchema>;
