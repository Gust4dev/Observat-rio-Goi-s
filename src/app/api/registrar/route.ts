import { captchaRegistroObrigatorio, exigirStaging, publicacaoTextoImediata } from "@/lib/registro/staging";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { ErroRegistro } from "@/lib/registro/erros";
import { registroProtegidoVercelSchema, registroSchema } from "@/lib/registro/schemas";
import { bytea } from "@/lib/registro/seguranca";
import { configServidor, rpc } from "@/lib/registro/servidor";
import { entradaHttp, falhaHttp, limitarHttp, resolverReferencia, respostaPrivada, verificarTurnstile } from "@/lib/registro/http";

const resultadoSchema = z.array(z.object({ out_id: z.uuid(), out_protocolo: z.string().min(1).max(100), out_repetida: z.boolean() })).length(1);
const sinaisSchema = z.array(z.object({ out_texto_repetido: z.boolean(), out_origem_sinalizada: z.boolean() })).length(1);

export async function POST(request: Request) {
  let etapa = "entrada";
  try {
    const schema = captchaRegistroObrigatorio() ? registroSchema : registroProtegidoVercelSchema;
    const entrada = await entradaHttp(request, schema);
    etapa = "ambiente";
    exigirStaging(request);
    const config = configServidor("registrar");
    if (!config.registroDisponivel) throw new ErroRegistro("indisponivel");
    const publicado = publicacaoTextoImediata();
    if (publicado && !entrada.aceite_publicacao_imediata) throw new ErroRegistro("entrada_invalida");
    etapa = "limite";
    const origem = await limitarHttp(request, config, "registrar");
    etapa = "captcha";
    if (config.captchaRegistroObrigatorio) {
      if (!entrada.turnstile) throw new ErroRegistro("entrada_invalida");
      await verificarTurnstile(entrada.turnstile, config);
    }
    etapa = "referencias";
    const [municipio, categoria] = await Promise.all([resolverReferencia("municipios", entrada.municipio, config), resolverReferencia("categorias", entrada.categoria, config)]);
    etapa = "triagem";
    await rpc("triagem_sinais", { p_titulo: entrada.titulo, p_descricao: entrada.descricao, p_origem_hash: bytea(origem), p_janela: `${config.triagem.janelaSegundos} seconds`, p_limite_origem: config.triagem.limiteOrigem }, sinaisSchema, config);
    etapa = "registro";
    const [resultado] = await rpc("registrar_ocorrencia", {
      p_municipio_id: municipio, p_categoria_id: categoria, p_titulo: entrada.titulo, p_descricao: entrada.descricao,
      p_anonimo: true, p_nome: null, p_whatsapp: null, p_consentimento: false, p_consentimento_versao: null,
      p_token_hash: bytea(entrada.token_hash), p_moderacao: publicado ? "publicado" : "pendente", p_retencao_dias: null,
      p_chave_idempotencia: entrada.chave_idempotencia, p_origem_hash: bytea(origem),
    }, resultadoSchema, config);
    if (publicado) for (const tag of ["problemas", "municipios", "indicadores"]) revalidateTag(tag, { expire: 0 });
    return respostaPrivada({ protocolo: resultado.out_protocolo, confirmacao: "Relato recebido." }, 201);
  } catch (erro) { return falhaHttp(erro, "registrar", etapa); }
}
