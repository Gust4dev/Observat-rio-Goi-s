import { z } from "zod";
import { revalidateTag } from "next/cache";
import { excluirSchema } from "@/lib/registro/schemas";
import { bytea, hashSha256 } from "@/lib/registro/seguranca";
import { configServidor, rpc } from "@/lib/registro/servidor";
import { entradaHttp, falhaHttp, limitarHttp, respostaPrivada } from "@/lib/registro/http";
import { caminhoImagemValido } from "@/lib/registro/caminho-imagem.mjs";
import { supabaseApiHeaders } from "@/lib/supabase-keys.mjs";

const caminhoPublico = z.uuid();

async function removerArquivos(caminhos: string[], config: ReturnType<typeof configServidor>) {
  const resultados = await Promise.allSettled([...new Set(caminhos)].map(async caminho => {
    const publico = caminho.endsWith(".jpg") && caminhoPublico.safeParse(caminho.slice(0, -4)).success;
    if (!publico && !caminhoImagemValido(caminho)) throw new Error("Caminho retornado inválido");
    const bucket = publico ? "imagens-publicas" : "imagens-quarentena";
    const resposta = await fetch(`${config.base}/storage/v1/object/${bucket}/${caminho}`, {
      method: "DELETE", headers: supabaseApiHeaders(config.chave), signal: AbortSignal.timeout(3000),
    });
    if (!resposta.ok && resposta.status !== 404) throw new Error("Storage indisponível");
  }));
  if (resultados.some(r => r.status === "rejected")) {
    // A retirada no banco já foi confirmada. O cron reconcilia objetos órfãos.
    console.warn(JSON.stringify({ evento: "limpeza_imagens_titular_pendente" }));
    return false;
  }
  return true;
}

export async function POST(request: Request) {
  try {
    const entrada = await entradaHttp(request, excluirSchema, true);
    const config = configServidor("titular"); await limitarHttp(request, config, "excluir");
    const caminhos = await rpc("solicitar_exclusao_por_token", { p_token_hash: bytea(hashSha256(entrada.token)), p_apagar_conteudo: true }, z.array(z.string()).max(6), config);
    for (const tag of ["problemas", "municipios", "indicadores"]) revalidateTag(tag, { expire: 0 });
    const arquivosRemovidos = await removerArquivos(caminhos, config);
    return respostaPrivada({ confirmacao: "Exclusão concluída.", ...(!arquivosRemovidos && { limpeza_imagens_pendente: true }) });
  } catch (erro) { return falhaHttp(erro, "excluir"); }
}
