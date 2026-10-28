import { z } from "zod";
import { ErroRegistro } from "@/lib/registro/erros";
import { registroSchema } from "@/lib/registro/schemas";
import { bytea } from "@/lib/registro/seguranca";
import { configServidor, rpc } from "@/lib/registro/servidor";
import { entradaHttp, falhaHttp, limitarHttp, resolverReferencia, respostaPrivada, verificarTurnstile } from "@/lib/registro/http";

const resultadoSchema = z.array(z.object({ out_id: z.uuid(), out_protocolo: z.string().min(1).max(100), out_repetida: z.boolean() })).length(1);
const sinaisSchema = z.array(z.object({ out_texto_repetido: z.boolean(), out_origem_sinalizada: z.boolean() })).length(1);

/** Gate temporário até aprovação jurídica/operacional: apenas dados fictícios em revisão. */
function exigirStaging(request: Request) {
  if (process.env.AMBIENTE_REGISTRO !== "staging_ficticio" || process.env.VERCEL_ENV === "production") throw new ErroRegistro("indisponivel");
  if (process.env.VERCEL === "1") {
    if (process.env.VERCEL_ENV !== "preview" || !process.env.ACESSO_STAGING_USUARIO?.trim() || !process.env.ACESSO_STAGING_SENHA?.trim()) throw new ErroRegistro("indisponivel");
  } else if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(request.url).hostname)) throw new ErroRegistro("indisponivel");
}

export async function POST(request: Request) {
  try {
    const entrada = await entradaHttp(request, registroSchema);
    exigirStaging(request);
    const config = configServidor();
    if (config.modoPublicacao !== "moderar_tudo") throw new ErroRegistro("indisponivel");
    const origem = await limitarHttp(request, config, "registrar");
    await verificarTurnstile(entrada.turnstile, config);
    const [municipio, categoria] = await Promise.all([resolverReferencia("municipios", entrada.municipio, config), resolverReferencia("categorias", entrada.categoria, config)]);
    await rpc("triagem_sinais", { p_titulo: entrada.titulo, p_descricao: entrada.descricao, p_origem_hash: bytea(origem), p_janela: `${config.triagem.janelaSegundos} seconds`, p_limite_origem: config.triagem.limiteOrigem }, sinaisSchema);
    const [resultado] = await rpc("registrar_ocorrencia", {
      p_municipio_id: municipio, p_categoria_id: categoria, p_titulo: entrada.titulo, p_descricao: entrada.descricao,
      p_anonimo: true, p_nome: null, p_whatsapp: null, p_consentimento: false, p_consentimento_versao: null,
      p_token_hash: bytea(entrada.token_hash), p_moderacao: "pendente", p_retencao_dias: null,
      p_chave_idempotencia: entrada.chave_idempotencia, p_origem_hash: bytea(origem),
    }, resultadoSchema);
    return respostaPrivada({ protocolo: resultado.out_protocolo, confirmacao: "Relato recebido." }, 201);
  } catch (erro) { return falhaHttp(erro, "registrar"); }
}
