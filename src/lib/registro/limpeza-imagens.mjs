import { caminhoImagemValido } from './caminho-imagem.mjs';
import { supabaseApiHeaders } from '../supabase-keys.mjs';
const DIA = 86400000;
const PUBLICA = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.jpg$/;
/** Shared by manual CLI and cron; returns no paths or secrets. */
export async function limparImagens({ base, key, apply = false, now = Date.now(), fetch: transportar = globalThis.fetch }) {
 const origem = new URL(base);
 if (origem.protocol !== 'https:' || origem.username || origem.password || origem.port || origem.pathname !== '/' || origem.search || origem.hash || !key) throw Error('Configuração inválida');
 const headers = { ...supabaseApiHeaders(key), 'Content-Type': 'application/json' };
 async function api(path, init = {}) {
  const r = await transportar(new URL(path, origem), { ...init, headers, cache: 'no-store', signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw Error('Limpeza indisponível'); const dados = await r.json();
  if (!Array.isArray(dados)) throw Error('Resposta inválida'); return dados;
 }
 const candidatos = [];
 async function referenciado(bucket, caminho) {
  const publico = bucket === 'imagens-publicas';
  const query = new URLSearchParams({ select: publico ? 'id,moderacao,operacao_admin_ate' : 'id', [publico ? 'id' : 'caminho_storage']: `eq.${publico ? caminho.slice(0, -4) : caminho}`, limit: '1' });
  const rows = await api(`/rest/v1/imagens?${query}`);
  if (rows.some(row => !row || typeof row.id !== 'string' || (publico && !['pendente','publicado','retido','removido'].includes(row.moderacao)))) throw Error('Referência inválida');
  return publico ? rows.some(row => row.moderacao === 'publicado' || Date.parse(row.operacao_admin_ate) > now) : rows.length > 0;
 }
 async function scan(bucket, prefix = '', depth = 0) {
  const itens = [];
  for (let offset = 0; ; offset += 100) {
   const page = await api(`/storage/v1/object/list/${bucket}`, { method: 'POST', body: JSON.stringify({ prefix, limit: 100, offset, sortBy: { column: 'name', order: 'asc' } }) });
   if (page.some(item => !item || typeof item.name !== 'string')) throw Error('Lista inválida');
   itens.push(...page); if (page.length < 100) break;
  }
  for (const item of itens) {
   const caminho = prefix ? `${prefix}/${item.name}` : item.name;
   if (bucket === 'imagens-quarentena' && !item.id && depth < 2 && (depth === 0 ? /^[a-f0-9]{64}$/.test(item.name) : /^[1-3]$/.test(item.name))) { await scan(bucket, caminho, depth + 1); continue; }
   const valido = bucket === 'imagens-quarentena' ? caminhoImagemValido(caminho) : PUBLICA.test(caminho);
   const criado = Date.parse(item.created_at);
   if (!valido || !item.id || !Number.isFinite(criado) || criado >= now - DIA) continue;
   if (!(await referenciado(bucket, caminho))) candidatos.push({ bucket, caminho });
  }
 }
 // Finish discovery before deletion; a failed read is never treated as no references.
 await scan('imagens-quarentena'); await scan('imagens-publicas');
 let removed = 0;
 if (apply) for (const { bucket, caminho } of candidatos) {
  if (await referenciado(bucket, caminho)) continue;
  await api(`/storage/v1/object/${bucket}`, { method: 'DELETE', body: JSON.stringify({ prefixes: [caminho] }) }); removed++;
 }
 return { candidates: candidatos.length, removed, dryRun: !apply };
}
