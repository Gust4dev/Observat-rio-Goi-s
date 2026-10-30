// Apenas bancos locais descartáveis; remover HAVING precisa expor a célula de 4.
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { verificarColunasViews } from './colunas-views.mjs';
import { fileURLToPath } from 'node:url';
const ler = f => readFile(new URL(f, import.meta.url), 'utf8');
const original = await ler('../019_supressao_indicadores.sql');
for (const mutar of [false,true]) {
 const db = new PGlite();
 try {
  for (const f of ['00_stub_supabase.sql','../001_tipos_e_tabelas.sql','../002_funcoes.sql','../003_views.sql','../004_rls_e_grants.sql','../009_view_sem_busca.sql','../012_dados_painel.sql','../014_imagens_publicas.sql']) await db.exec(await ler(f));
  await db.exec(mutar ? original.replace('having count(*) >= 5','') : original);
  await verificarColunasViews(db,fileURLToPath(new URL('../colunas-publicas.json',import.meta.url)));
  let detectada=false;
  try { await db.exec(await ler('migracao_019_test.sql')); }
  catch(e) { if (!mutar || !e.message.includes('M6 célula pequena exposta')) throw e; detectada=true; }
  if(mutar && !detectada) throw new Error('Mutação HAVING não detectada');
  console.log(mutar ? 'ok mutação HAVING detectada' : 'ok controle 019 e allowlist');
 } finally { await db.close(); }
}
