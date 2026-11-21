// Bancos locais descartáveis: reproduz o oráculo global anterior e testa a correção.
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { verificarColunasViews } from './colunas-views.mjs';
import { fileURLToPath } from 'node:url';
const ler = f => readFile(new URL(f, import.meta.url), 'utf8');
const arquivos = ['00_stub_supabase.sql','../001_tipos_e_tabelas.sql','../002_funcoes.sql','../003_views.sql','../004_rls_e_grants.sql','../009_view_sem_busca.sql','../012_dados_painel.sql','../014_imagens_publicas.sql','../019_supressao_indicadores.sql'];
async function main() {
for (const anterior of process.argv.includes('--before-fix') ? [true] : [false,true]) {
 const db = new PGlite();
 try {
  for (const f of arquivos) await db.exec(await ler(f));
  if (!anterior) {
   await db.exec(await ler('../023_totais_indicadores_suprimidos.sql'));
   await db.exec(await ler('../023_totais_indicadores_suprimidos.sql'));
  }
  await verificarColunasViews(db,fileURLToPath(new URL('../colunas-publicas.json',import.meta.url)));
  let detectada=false;
  try { await db.exec(await ler('migracao_023_test.sql')); }
  catch(e) {
   if (process.argv.includes('--before-fix') || !anterior || !e.message.includes('023 total global revela diferença suprimida')) throw e;
   detectada=true;
  }
  if(anterior && !detectada) throw new Error('Oráculo global anterior não detectado');
  console.log(anterior ? 'ok mutação: total global anterior detectado (14 - 10 = 4)' : 'ok controle 023, idempotência e allowlist');
 } finally { await db.close(); }
}
}
await main().catch(e => { console.error(e.message); process.exitCode = 1; });
