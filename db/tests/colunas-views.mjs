// Teste de colunas das views públicas (plano-m2 §6).
// Falha se: uma view legível por anon não estiver em db/colunas-publicas.json, faltar view da lista,
// ou houver coluna fora da lista (ou faltando nela). Views v_* não concedidas a anon (ex.: v_fila_moderacao) são ignoradas.
import { readFile } from 'node:fs/promises';

export async function verificarColunasViews(db, caminhoJson) {
  const permitidas = JSON.parse(await readFile(caminhoJson, 'utf8'));
  const { rows } = await db.query(`
    select c.relname as view, a.attname as coluna, has_table_privilege('anon', c.oid, 'select') as anon
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
      join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
     where c.relkind = 'v' and c.relname like 'v\\_%'
     order by 1, a.attnum`);
  const reais = new Map();
  for (const r of rows) {
    if (!r.anon) continue;
    if (!reais.has(r.view)) reais.set(r.view, []);
    reais.get(r.view).push(r.coluna);
  }
  const erros = [];
  for (const [view, cols] of reais) {
    if (!(view in permitidas)) { erros.push(`view pública fora da lista: ${view}`); continue; }
    const ok = new Set(permitidas[view]);
    for (const c of cols) if (!ok.has(c)) erros.push(`${view}: coluna proibida/não listada "${c}"`);
    for (const c of ok) if (!cols.includes(c)) erros.push(`${view}: coluna listada ausente "${c}"`);
  }
  for (const view of Object.keys(permitidas)) {
    if (!reais.has(view)) erros.push(`view da lista ausente (ou sem SELECT para anon): ${view}`);
  }
  if (erros.length) throw new Error('colunas das views públicas:\n  - ' + erros.join('\n  - '));
  return reais.size;
}
