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
  '../009_view_sem_busca.sql', '../010_acompanhamento_completo.sql', '../011_imagens_resilientes.sql', '../012_dados_painel.sql', '../014_imagens_publicas.sql', '../015_upload_imagens.sql', '../016_moderacao_imagens.sql',
  '../017_admin_mfa_equipe.sql',
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

for (const t of ['rls_test.sql', 'migracao_007_test.sql', 'migracao_010_test.sql', 'migracao_011_test.sql', 'migracao_012_test.sql', 'migracao_014_test.sql', 'migracao_015_test.sql', 'migracao_016_test.sql', 'migracao_017_test.sql']) {
  try {
    // Suítes anteriores exercitam administradores que já concluíram MFA.
    await db.exec(`select set_config('request.jwt.claims','{"aal":"aal2"}',false)`);
    await db.exec(await ler(t));
    console.log('ok   ', t);
  } catch (e) {
    console.error('FALHA em', t, '->', e.message);
    process.exit(1);
  }
}
// ---- colunas das views públicas (db/colunas-publicas.json)
// 018 substitui a assinatura testada nas suítes históricas; exercitar o upgrade após elas.
try {
  await db.exec(await ler('../018_admin_operacoes.sql'));
  await db.exec(await ler('migracao_018_test.sql'));
  console.log('ok   ', '018_admin_operacoes.sql + migracao_018_test.sql');
} catch (e) {
  console.error('FALHA em migracao_018_test.sql ->', e.message);
  process.exit(1);
}
await db.exec(await ler('../019_supressao_indicadores.sql'));
await db.exec(await ler('migracao_019_test.sql'));
console.log('ok    migracao_019_test.sql');
await db.exec(await ler('../020_retencao_imagens.sql'));
await db.exec(await ler('migracao_020_test.sql'));
console.log('ok    migracao_020_test.sql');
await db.exec(await ler('../021_fila_moderacao_filtros.sql'));
await db.exec(await ler('migracao_021_test.sql'));
console.log('ok    migracao_021_test.sql');
await db.exec(await ler('../022_deduplicacao_participacao.sql'));
await db.exec(await ler('migracao_022_test.sql'));
console.log('ok    migracao_022_test.sql');
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
    await sdb.exec(await ler('../018_admin_operacoes.sql'));
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

    // resíduo anonimizado de exclusão a pedido não conta como dado real: o seed continua rodando
    await sdb.exec('begin');
    await sdb.exec(`insert into public.ocorrencias (protocolo, municipio_id, categoria_id, titulo, descricao, moderacao, motivo_remocao)
      select 'OG-26-0002', m.id, c.id, '[conteúdo removido a pedido do titular]', '[conteúdo removido a pedido do titular]', 'removido', 'Exclusão solicitada pelo titular'
        from public.municipios m, public.categorias c limit 1`);
    let tolerou = true;
    try { await sdb.exec(await ler('../seed/staging_ficticio.sql')); } catch { tolerou = false; }
    const comResiduo = await contar(sdb, 'public.ocorrencias');
    await sdb.exec('rollback');
    if (!tolerou) falha('a trava abortou por causa do resíduo anonimizado de exclusão');
    if (comResiduo !== 29) falha(`seed com resíduo deixou ${comResiduo} ocorrências (esperado 29)`);
    console.log('ok   ', 'trava tolera resíduo de exclusão a pedido');
  } catch (e) {
    falha(e.message);
  } finally {
    await sdb.close();
  }
}

await db.close();
console.log('\nTODOS OS TESTES PASSARAM');

