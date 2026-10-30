import { z } from "zod";

export const papelAdminSchema = z.enum(["moderador", "gestor", "superadmin"]);
export const erroApiSchema = z.object({ erro: z.union([z.string(), z.object({ codigo: z.string(), mensagem: z.string() })]) });
export const respostaOkSchema = z.object({ ok: z.literal(true) });
export const filaQuerySchema = z.object({ limite: z.coerce.number().int().min(1).max(100).default(50), moderacao: z.enum(["pendente", "publicado", "retido", "removido"]).optional(), situacao: z.string().optional(), municipio_id: z.coerce.number().int().positive().optional(), categoria_id: z.coerce.number().int().positive().optional(), ordem: z.enum(["antigos", "recentes"]).default("antigos"), cursor: z.string().max(1024).optional() });
export const moderarSchema = z.object({ acao: z.enum(["aprovar", "reter", "remover", "restaurar"]), motivo: z.string().min(1).max(1000).optional(), motivo_codigo: z.enum(["dados_pessoais", "conteudo_ofensivo", "fora_escopo", "spam", "duplicidade", "outro"]).optional() });
export const loteSchema = z.object({ ids: z.array(z.uuid()).min(1).max(50), acao: z.enum(["aprovar", "reter"]), motivo: z.string().min(1).max(1000).optional() });
export const exportacaoQuerySchema = z.object({ municipio: z.string().optional(), categoria: z.string().optional(), formato: z.enum(["json", "csv"]).default("json") });
export const dadosJsonSchema = z.object({ dados: z.array(z.record(z.string(), z.unknown())), total_linhas: z.number().int().nonnegative() });
export const loginAdminSchema = z.object({ email: z.email().max(254), password: z.string().min(1).max(1024) });
export const denunciaInputSchema = z.object({ ocorrencia_id: z.uuid(), turnstile: z.string().min(1).max(2048), motivo: z.enum(["dado_pessoal", "acusacao_sem_base", "ameaca", "conteudo_ilegal", "spam", "duplicado", "outro"]), texto: z.string().min(1).max(1000).optional() });
export const respostaInputSchema = z.object({ ocorrencia_id: z.uuid(), turnstile: z.string().min(1).max(2048), vinculo: z.string().min(2).max(120), contato: z.string().min(3).max(254), texto: z.string().min(10).max(4000) });
export const acompanharInputSchema = z.object({ token: z.string().min(1) });
export const excluirInputSchema = z.object({ token: z.string().min(1), confirmacao: z.literal(true) });
export const situacaoSchema = z.enum(["registrado", "em_analise", "encaminhado", "aguardando_resposta", "em_atendimento", "resolvido", "encerrado_sem_solucao"]);
export const moderacaoSchema = z.enum(["pendente", "publicado", "retido", "removido"]);
export const situacaoPublicaSchema = z.object({ protocolo: z.string(), titulo: z.string(), situacao: situacaoSchema, moderacao: moderacaoSchema, publicado_em: z.iso.datetime({ offset: true }).nullable(), criado_em: z.iso.datetime({ offset: true }), atualizacoes: z.array(z.object({ id: z.union([z.string(), z.number()]), tipo: z.string(), situacao_nova: situacaoSchema.nullable(), texto: z.string(), evidencia: z.string().nullable(), criado_em: z.iso.datetime({ offset: true }) })), respostas: z.array(z.object({ id: z.union([z.string(), z.number()]), autor_vinculo: z.string(), texto: z.string(), criado_em: z.iso.datetime({ offset: true }) })) });
export const denunciaAdminQuerySchema = z.object({ limite: z.coerce.number().int().min(1).max(100).default(50), offset: z.coerce.number().int().min(0).max(100000).default(0), ocorrencia_id: z.uuid().optional(), status: z.enum(["aberta", "em_analise", "procedente", "improcedente"]).optional() });
export const respostaAdminQuerySchema = z.object({ limite: z.coerce.number().int().min(1).max(100).default(50), offset: z.coerce.number().int().min(0).max(100000).default(0), ocorrencia_id: z.uuid().optional(), status: z.enum(["pendente", "publicada", "rejeitada"]).optional() });
export const filaAdminQuerySchema = filaQuerySchema.extend({ idade_min_dias: z.coerce.number().int().min(0).max(36500).optional(), idade_max_dias: z.coerce.number().int().min(0).max(36500).optional(), denuncia: z.enum(["true", "false"]).optional(), foto_pendente: z.enum(["true", "false"]).optional() });
export const saudeSchema = z.object({ aplicacao: z.literal("ok"), banco: z.enum(["ok", "indisponivel", "nao_configurado"]) });
export const equipeAdminSchema = z.array(z.object({ user_id: z.uuid(), papel: papelAdminSchema, ativo: z.boolean(), criado_em: z.iso.datetime({ offset: true }) }));
export const auditoriaAdminSchema = z.object({ ocorrencia_id: z.uuid().optional(), admin_id: z.uuid().optional(), acao: z.string().regex(/^[a-z_]{1,80}$/).optional(), desde: z.iso.datetime({ offset: true }).optional(), ate: z.iso.datetime({ offset: true }).optional(), limite: z.coerce.number().int().min(1).max(100).default(50), offset: z.coerce.number().int().min(0).max(100000).default(0) });

export type PapelAdmin = z.infer<typeof papelAdminSchema>;
export type ErroApi = z.infer<typeof erroApiSchema>;
export type FilaQuery = z.infer<typeof filaQuerySchema>;
export type ModerarInput = z.infer<typeof moderarSchema>;
export type LoteInput = z.infer<typeof loteSchema>;
export type ExportacaoQuery = z.infer<typeof exportacaoQuerySchema>;
export type DadosJson = z.infer<typeof dadosJsonSchema>;
export type LoginAdminInput = z.infer<typeof loginAdminSchema>;
export type DenunciaInput = z.infer<typeof denunciaInputSchema>;
export type RespostaInput = z.infer<typeof respostaInputSchema>;
export type AcompanharInput = z.infer<typeof acompanharInputSchema>;
export type ExcluirInput = z.infer<typeof excluirInputSchema>;
export type FilaAdminQuery = z.infer<typeof filaAdminQuerySchema>;
export type DenunciaAdminQuery = z.infer<typeof denunciaAdminQuerySchema>;
export type RespostaAdminQuery = z.infer<typeof respostaAdminQuerySchema>;
export type Saude = z.infer<typeof saudeSchema>;
export type EquipeAdmin = z.infer<typeof equipeAdminSchema>;
export type AuditoriaAdminQuery = z.infer<typeof auditoriaAdminSchema>;

export const exemplosContrato = {
  erro: { erro: { codigo: "operacao_admin_falhou", mensagem: "Não foi possível concluir a operação administrativa." } },
  fila: { itens: [], total: 0, proximo_cursor: null },
  dados: { dados: [], total_linhas: 0 },
} as const;

/** Inventário HTTP intencionalmente explícito, verificado contra os Route Handlers. */
export const rotasContrato = [
  ["POST", "/api/acompanhar"],
  ["GET", "/api/admin/auditoria"],
  ["GET", "/api/admin/auth/factors"], ["POST", "/api/admin/auth/challenge"], ["POST", "/api/admin/auth/enroll"], ["POST", "/api/admin/auth/login"], ["POST", "/api/admin/auth/logout"], ["POST", "/api/admin/auth/refresh"], ["GET", "/api/admin/auth/session"], ["POST", "/api/admin/auth/verify"],
  ["GET", "/api/admin/denuncias"], ["POST", "/api/admin/denuncias/{id}/resolver"],
  ["GET", "/api/admin/equipe"], ["POST", "/api/admin/equipe/convidar"], ["POST", "/api/admin/equipe/{id}/desativar"], ["POST", "/api/admin/equipe/{id}/papel"],
  ["GET", "/api/admin/fila"], ["GET", "/api/admin/fotos/{id}/revisao"], ["POST", "/api/admin/imagem"],
  ["GET", "/api/admin/ocorrencias"], ["GET", "/api/admin/ocorrencias/{id}"], ["POST", "/api/admin/ocorrencias/{id}/atualizacoes"], ["GET", "/api/admin/ocorrencias/{id}/contato"], ["POST", "/api/admin/ocorrencias/{id}/mesclar"], ["POST", "/api/admin/ocorrencias/{id}/moderar"], ["POST", "/api/admin/ocorrencias/{id}/situacao"], ["POST", "/api/admin/ocorrencias/lote"],
  ["GET", "/api/admin/respostas"], ["POST", "/api/admin/respostas/{id}/revisar"],
  ["GET", "/api/cron/limpar-quarentena"], ["GET", "/api/dados"], ["POST", "/api/denunciar"], ["POST", "/api/excluir"], ["POST", "/api/imagem"], ["POST", "/api/registrar"], ["POST", "/api/resposta"], ["GET", "/api/saude"], ["POST", "/api/afeta"],
] as const;
