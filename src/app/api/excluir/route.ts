import { z } from "zod";
import { excluirSchema } from "@/lib/registro/schemas";
import { bytea, hashSha256 } from "@/lib/registro/seguranca";
import { configServidor, rpc } from "@/lib/registro/servidor";
import { entradaHttp, falhaHttp, limitarHttp, respostaPrivada } from "@/lib/registro/http";

export async function POST(request: Request) {
  try {
    const entrada = await entradaHttp(request, excluirSchema, true);
    const config = configServidor(); await limitarHttp(request, config, "excluir");
    await rpc("solicitar_exclusao_por_token", { p_token_hash: bytea(hashSha256(entrada.token)), p_apagar_conteudo: true }, z.array(z.string()));
    return respostaPrivada({ confirmacao: "Exclusão concluída." });
  } catch (erro) { return falhaHttp(erro, "excluir"); }
}
