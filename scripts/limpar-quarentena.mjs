// Run on a trusted server daily. Dry run unless --apply. No paths/secrets in output.
const base = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '');
if (base.protocol !== 'https:' || base.username || base.password || base.pathname !== '/' || base.search || base.hash) throw Error('Configuração inválida');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!key) throw Error('Configuração ausente');
const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
async function api(path, init = {}) {
  const r = await fetch(new URL(path, base), { ...init, headers, signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw Error('Reconciliação indisponível');
  return r.json();
}
const cutoff = Date.now() - 24 * 60 * 60 * 1000;
let candidates = 0, removed = 0;
async function scan(prefix = '', depth = 0) {
  const files = [];
  for (let offset = 0; ; offset += 100) {
    const page = await api('/storage/v1/object/list/imagens-quarentena', { method: 'POST', body: JSON.stringify({ prefix, limit: 100, offset, sortBy: { column: 'name', order: 'asc' } }) });
    if (!Array.isArray(page)) throw Error('Resposta inválida');
    files.push(...page);
    if (page.length < 100) break;
  }
  for (const item of files) {
    if (typeof item.name !== 'string') continue;
    const path = prefix ? `${prefix}/${item.name}` : item.name;
    if (!item.id && depth < 2 && (depth === 0 ? /^[a-f0-9]{64}$/.test(item.name) : /^[1-3]$/.test(item.name))) { await scan(path, depth + 1); continue; }
    if (!/^[a-f0-9]{64}\/[1-3]\/[a-f0-9]{64}\.jpg$/.test(path) || !item.created_at || !(Date.parse(item.created_at) < cutoff)) continue;
    // Read immediately before delete. Every referenced object is retained,
    // regardless of moderation, age, or whether a response was lost.
    const q = new URLSearchParams({ select: 'id', caminho_storage: `eq.${path}`, limit: '1' });
    const rows = await api(`/rest/v1/imagens?${q}`);
    if (!Array.isArray(rows)) throw Error('Resposta inválida');
    if (rows.length) continue;
    candidates++;
    if (process.argv.includes('--apply')) {
      await api('/storage/v1/object/imagens-quarentena', { method: 'DELETE', body: JSON.stringify({ prefixes: [path] }) });
      removed++;
    }
  }
}
try { await scan(); console.log(JSON.stringify({ candidates, removed, dryRun: !process.argv.includes('--apply') })); }
catch { console.error('Limpeza não concluída; repetir no próximo agendamento.'); process.exitCode = 1; }
