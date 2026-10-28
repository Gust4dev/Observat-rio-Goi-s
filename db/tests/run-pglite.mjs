// Executa migrações + testes num Postgres embutido (PGlite), sem Docker.
//   npm i @electric-sql/pglite
//   node db/tests/run-pglite.mjs
// Aviso: PGlite não é o Supabase. Valida lógica, grants e RLS; não substitui um teste no projeto real.
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

import { verificarColunasViews } from './colunas-views.mjs';
const { PGlite } = await import(process.env.PGLITE_MODULE ? pathToFileURL(process.env.PGLITE_MODULE).href : '@electric-sql/pglite');

const dir = path.dirname(fileURLToPath(import.meta.url));
const ler = (f) => readFile(path.join(dir, f), 'utf8');
const arquivos = [
  '00_stub_supabase.sql', '../001_tipos_e_tabelas.sql', '../002_funcoes.sql',
  '../003_views.sql', '../004_rls_e_grants.sql', '../006_seed_categorias.sql', '../007_lacunas_do_desenho.sql',
  '../009_view_sem_busca.sql', '../010_acompanhamento_completo.sql',
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

for (const t of ['rls_test.sql', 'migracao_007_test.sql', 'migracao_010_test.sql']) {
  try {
    await db.exec(await ler(t));
    console.log('ok   ', t);
  } catch (e) {
    console.error('FALHA em', t, '->', e.message);
    process.exit(1);
  }
}
// ---- colunas das views públicas (db/colunas-publicas.json)
try {
  const n = await verificarColunasViews(db, path.join(dir, '../colunas-publicas.json'));
  console.log('ok   ', 'colunas-views (' + n + ' views)');
} catch (e) {
  console.error('FALHA em colunas-views ->', e.message);
  process.exit(1);
}
// ---- seeds (banco novo: os testes acima já inseriram municípios/ocorrências próprios)
{
  const falha = (m) => { console.error('FALHA em seed_test ->', m); process.exit(1); };
  const seeds = ['../008_seed_municipios.sql', '../seed/staging_ficticio.sql'];
  const contar = async (d, t) => Number((await d.query(`select count(*) as n from ${t}`)).rows[0].n);
  const todas = async (d) => [await contar(d, 'public.municipios'), await contar(d, 'public.ocorrencias'),
                              await contar(d, 'public.atualizacoes'), await contar(d, 'public.confirmacoes')];
  const sdb = new PGlite();
  try {
    for (const f of arquivos) await sdb.exec(await ler(f));
    for (const f of seeds) await sdb.exec(await ler(f));
    await sdb.exec(await ler('seed_test.sql'));
    const antes = await todas(sdb);
    for (const f of seeds) await sdb.exec(await ler(f));   // reexecução não pode duplicar
    const depois = await todas(sdb);
    if (antes.join() !== depois.join()) falha(`reexecução duplicou dados: ${antes} -> ${depois}`);
    await sdb.exec(await ler('seed_test.sql'));
    console.log('ok   ', 'seed_test.sql (+ idempotência)', antes.join('/'));

    // trava: com uma ocorrência "real" presente, o seed precisa abortar e não inserir nada
    await sdb.exec('begin');
    await sdb.exec(`insert into public.ocorrencias (protocolo, municipio_id, categoria_id, titulo, descricao)
      select 'OG-26-0001', m.id, c.id, 'Ocorrência real', 'Descrição real com mais de vinte caracteres'
        from public.municipios m, public.categorias c limit 1`);
    let abortou = false;
    try { await sdb.exec(await ler('../seed/staging_ficticio.sql')); } catch (e) { abortou = /TRAVA DO SEED/.test(e.message); }
    await sdb.exec('rollback');
    if (!abortou) falha('a trava não abortou com ocorrência real presente');
    const apos = await contar(sdb, 'public.ocorrencias');
    if (apos !== 28) falha(`rollback da trava deixou ${apos} ocorrências`);
    console.log('ok   ', 'trava do seed');
  } catch (e) {
    falha(e.message);
  }
}

console.log('\nTODOS OS TESTES PASSARAM');
