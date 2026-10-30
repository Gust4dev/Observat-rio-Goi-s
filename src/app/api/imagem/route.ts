import { createHash } from "node:crypto";
import { z } from "zod";
import { tokenSchema } from "@/lib/registro/token";
import { bytea, hashSha256, hmacSha256 } from "@/lib/registro/seguranca";
import { configServidor, fotosHabilitadas, rpc } from "@/lib/registro/servidor";
import { limitarHttp, respostaPrivada } from "@/lib/registro/http";
import { ErroRegistro, respostaErro } from "@/lib/registro/erros";
import { exigirStaging } from "@/lib/registro/staging";
import { mesmaOrigem } from "@/lib/seguranca/origem";
import { caminhoImagem } from "@/lib/registro/caminho-imagem.mjs";
import { MAX_IMAGEM, prepararImagem } from "@/lib/registro/imagem";

const MAX_REQUEST = MAX_IMAGEM + 16 * 1024;
const campos = z.object({ token: tokenSchema, ordem: z.coerce.number().int().min(1).max(3), contexto: z.string().trim().min(3).max(300).refine(v => !/[\u0000-\u001f\u007f]/.test(v)) }).strict();

export async function POST(request: Request) {
  try {
    if (!fotosHabilitadas()) throw new ErroRegistro("indisponivel");
    const url = new URL(request.url);
    if (!mesmaOrigem(request) || request.headers.get("sec-fetch-site") === "cross-site") throw new ErroRegistro("origem_invalida");
    if (url.search) throw new ErroRegistro("entrada_invalida");
    if (!request.headers.get("content-type")?.startsWith("multipart/form-data;")) throw new ErroRegistro("corpo_invalido");
    const tamanho = request.headers.get("content-length");
    if (tamanho && (!/^\d+$/.test(tamanho) || Number(tamanho) > MAX_REQUEST)) throw new ErroRegistro("corpo_grande");
    exigirStaging(request);
    const config = configServidor();
    if (config.modoPublicacao !== "moderar_tudo") throw new ErroRegistro("indisponivel");
    if (!request.body) throw new ErroRegistro("corpo_invalido");
    const reader = request.body.getReader(); let total = 0; const chunks: Uint8Array[] = [];
    try { while (true) { const r = await reader.read(); if (r.done) break; total += r.value.length; if (total > MAX_REQUEST) { await reader.cancel(); throw new ErroRegistro("corpo_grande"); } chunks.push(r.value); } } finally { reader.releaseLock(); }
    let form: FormData;
    try { form = await new Request(request.url, { method: "POST", headers: { "content-type": request.headers.get("content-type")! }, body: Buffer.concat(chunks) }).formData(); } catch { throw new ErroRegistro("corpo_invalido"); }
    if ([...form.keys()].length !== 4 || ![...form.keys()].every(k => ["token", "ordem", "contexto", "foto"].includes(k))) throw new ErroRegistro("entrada_invalida");
    const entrada = campos.safeParse({ token: form.get("token"), ordem: form.get("ordem"), contexto: form.get("contexto") });
    const foto = form.get("foto");
    if (!entrada.success || !(foto instanceof File)) throw new ErroRegistro("entrada_invalida");
    const hash = hashSha256(entrada.data.token);
    const [oc] = await rpc("acompanhar_por_token", { p_token_hash: bytea(hash) }, z.array(z.object({ out_moderacao: z.string() })).max(1));
    if (!oc) throw new ErroRegistro("token_invalido");
    if (oc.out_moderacao === "removido") throw new ErroRegistro("conflito");
    if (!foto.size || foto.size > MAX_IMAGEM) throw new ErroRegistro("corpo_grande");
    const original = Buffer.from(await foto.arrayBuffer());
    const hashEntrada = createHash("sha256").update(original).digest("hex");
    const retry = await rpc("consultar_slot_imagem", { p_token_hash: bytea(hash), p_ordem: entrada.data.ordem, p_hash_entrada: hashEntrada, p_contexto: entrada.data.contexto }, z.array(z.object({ out_id: z.uuid() })).max(1));
    await limitarHttp(request, config, "foto");
    if (retry.length) return respostaPrivada({ confirmacao: "Foto recebida para revisão.", ordem: entrada.data.ordem }, 201);
    const bytes = await prepararImagem(original, foto.type);
    const digest = createHash("sha256").update(bytes).digest("hex");
    const caminho = caminhoImagem(hmacSha256(config.hmacSegredo, `foto:${hash}`), entrada.data.ordem, digest);
    const headers = { apikey: config.chave, Authorization: `Bearer ${config.chave}` };
    const storage = `${config.base}/storage/v1/object/imagens-quarentena/${caminho}`;
    const upload = await fetch(storage, { method: "POST", headers: { ...headers, "Content-Type": "image/jpeg", "x-upsert": "false" }, body: new Uint8Array(bytes), cache: "no-store", signal: AbortSignal.timeout(15000) });
    // Storage retries may find the immutable object left by a lost response.
    if (!upload.ok && upload.status !== 409 && !(upload.status === 400 && (await upload.json().catch(() => ({}))).error === "Duplicate")) throw new ErroRegistro("indisponivel");
    try {
      await rpc("registrar_imagem", { p_token_hash: bytea(hash), p_ordem: entrada.data.ordem, p_caminho: caminho, p_mime: "image/jpeg", p_tamanho: bytes.length, p_contexto: entrada.data.contexto, p_hash_entrada: hashEntrada }, z.uuid());
    } catch (erro) {
      // Never delete on an ambiguous commit (timeout/lost response). Reconcile by
      // exact private path before cleanup; failure to read means retain for cron.
      try {
        const q = new URLSearchParams({ select: "id", caminho_storage: `eq.${caminho}`, limit: "1" });
        const r = await fetch(`${config.base}/rest/v1/imagens?${q}`, { headers, cache: "no-store", signal: AbortSignal.timeout(8000) });
        const rows = r.ok ? z.array(z.object({ id: z.uuid() })).max(1).safeParse(await r.json()) : null;
        if (erro instanceof ErroRegistro && erro.sqlstate && rows?.success && !rows.data.length) await fetch(storage, { method: "DELETE", headers, signal: AbortSignal.timeout(8000) });
      } catch { /* orphan cleanup after 24h, never risk an already committed photo */ }
      throw erro;
    }
    return respostaPrivada({ confirmacao: "Foto recebida para revisão.", ordem: entrada.data.ordem }, 201);
  } catch (erro) { return respostaErro(erro); }
}
