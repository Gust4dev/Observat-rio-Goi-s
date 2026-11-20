import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const ler = (arquivo) => readFile(new URL(arquivo, import.meta.url), 'utf8');
const anteriores = [
  '001_tipos_e_tabelas', '002_funcoes', '003_views', '004_rls_e_grants', '006_seed_categorias',
  '007_lacunas_do_desenho', '009_view_sem_busca', '010_acompanhamento_completo',
  '011_imagens_resilientes', '012_dados_painel', '014_imagens_publicas', '015_upload_imagens',
  '016_moderacao_imagens', '017_admin_mfa_equipe', '018_admin_operacoes', '019_supressao_indicadores',
  '020_retencao_imagens', '021_fila_moderacao_filtros', '022_deduplicacao_participacao',
  '023_totais_indicadores_suprimidos', '024_auditoria_anonymizacao_admin',
];
try {
  await db.exec(await ler('00_stub_supabase.sql'));
  for (const nome of anteriores) await db.exec(await ler('../' + nome + '.sql'));
  if (!process.argv.includes('--sem-025')) await db.exec(await ler('../025_escala_fila_admin.sql'));
  await db.exec(await ler('escala_admin_test.sql'));
  console.log('Migração 025: verificações focadas passaram.');
} catch (error) {
  console.error(`Migração 025: ${error.code ?? 'erro'} — ${error.message}`);
  process.exitCode = 1;
} finally {
  await db.close();
}
