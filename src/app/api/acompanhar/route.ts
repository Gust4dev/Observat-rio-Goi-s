import { z } from "zod";
import { SITUACOES } from "@/lib/situacao";
import { acompanharSchema } from "@/lib/registro/schemas";
import { ErroRegistro } from "@/lib/registro/erros";
import { bytea, hashSha256 } from "@/lib/registro/seguranca";
import { configServidor, rpc } from "@/lib/registro/servidor";
import { entradaHttp, falhaHttp, limitarHttp, respostaPrivada } from "@/lib/registro/http";

const instante = z.string().datetime({ offset: true });
const atualizacao = z.object({ id: z.union([z.string(), z.number()]), tipo: z.string(), situacao_nova: z.enum(SITUACOES).nullable(), texto: z.string(), evidencia: z.string().nullable(), criado_em: instante });
const resposta = z.object({ id: z.union([z.string(), z.number()]), autor_vinculo: z.string(), texto: z.string(), criado_em: instante });
const resultadoSchema = z.array(z.object({ out_id: z.uuid(), out_protocolo: z.string(), out_titulo: z.string(), out_situacao: z.enum(SITUACOES), out_moderacao: z.enum(["pendente", "publicado", "retido", "removido"]), out_motivo_remocao: z.string().nullable(), out_publicado_em: instante.nullable(), out_criado_em: instante, out_atualizacoes: z.array(atualizacao), out_respostas: z.array(resposta) })).max(1);

export async function POST(request: Request) {
  try {
    const entrada = await entradaHttp(request, acompanharSchema, true);
    const config = configServidor(); await limitarHttp(request, config, "acompanhar");
    const [r] = await rpc("acompanhar_por_token", { p_token_hash: bytea(hashSha256(entrada.token)) }, resultadoSchema);
    if (!r) throw new ErroRegistro("token_invalido");
    return respostaPrivada({ protocolo: r.out_protocolo, titulo: r.out_titulo, situacao: r.out_situacao, moderacao: r.out_moderacao, motivo_remocao: r.out_motivo_remocao, publicado_em: r.out_publicado_em, criado_em: r.out_criado_em, atualizacoes: r.out_atualizacoes, respostas: r.out_respostas });
  } catch (erro) { return falhaHttp(erro, "acompanhar"); }
}
