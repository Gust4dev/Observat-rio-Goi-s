// Prova rápida de sensibilidade dos testes de segurança da 010. Não altera arquivos ou staging.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';

const dir = path.dirname(fileURLToPath(import.meta.url));
const ler = (f) => readFile(path.join(dir, f), 'utf8');
const anteriores = [
  '00_stub_supabase.sql', '../001_tipos_e_tabelas.sql', '../002_funcoes.sql', '../003_views.sql',
  '../004_rls_e_grants.sql', '../006_seed_categorias.sql', '../007_lacunas_do_desenho.sql',
  '../009_view_sem_busca.sql',
];
const original = await ler('../010_acompanhamento_completo.sql');
const teste = await ler('migracao_010_test.sql');
const mutacoes = [
  ['nota privada', original.replace('where a.ocorrencia_id = o.id and a.publica', 'where a.ocorrencia_id = o.id'), 'duas atualizações públicas'],
  ['resposta pendente', original.replace("where r.ocorrencia_id = o.id and r.status = 'publicada'", 'where r.ocorrencia_id = o.id'), 'somente a resposta publicada'],
  ['EXECUTE para anon', original + '\ngrant execute on function public.acompanhar_por_token(bytea) to anon;', 'anon recebeu EXECUTE'],
];
for (const [nome, sql, esperado] of mutacoes) {
  const db = new PGlite();
  try {
    for (const f of anteriores) await db.exec(await ler(f));
    await db.exec(sql);
    let detectada = false;
    try { await db.exec(teste); }
    catch (erro) {
      if (!erro.message.includes(esperado)) throw erro;
      detectada = true;
    }
    if (!detectada) throw new Error(`mutação não detectada: ${nome}`);
    console.log(`ok    mutação detectada: ${nome}`);
  } finally { await db.close(); }
}
