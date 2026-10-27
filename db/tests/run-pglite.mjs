// Executa migrações + testes num Postgres embutido (PGlite), sem Docker.
//   npm i @electric-sql/pglite
//   node db/tests/run-pglite.mjs
// Aviso: PGlite não é o Supabase. Valida lógica, grants e RLS; não substitui um teste no projeto real.
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const { PGlite } = await import(process.env.PGLITE_MODULE ? pathToFileURL(process.env.PGLITE_MODULE).href : '@electric-sql/pglite');

const dir = path.dirname(fileURLToPath(import.meta.url));
const ler = (f) => readFile(path.join(dir, f), 'utf8');
const arquivos = [
  '00_stub_supabase.sql', '../001_tipos_e_tabelas.sql', '../002_funcoes.sql',
  '../003_views.sql', '../004_rls_e_grants.sql', '../006_seed_categorias.sql', '../007_lacunas_do_desenho.sql',
];

const db = new PGlite();
for (const f of arquivos) {
  try {
    await db.exec(await ler(f));
    console.log('ok   ', path.basename(f));
  } catch (e) {
    console.error('ERRO ', path.basename(f), '->', e.message);
    process.exit(1);
  }
}

for (const t of ['rls_test.sql', 'migracao_007_test.sql']) {
  try {
    await db.exec(await ler(t));
    console.log('ok   ', t);
  } catch (e) {
    console.error('FALHA em', t, '->', e.message);
    process.exit(1);
  }
}
console.log('\nTODOS OS TESTES PASSARAM');
