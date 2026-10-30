// Bancos descartáveis: cada regressão deve quebrar a suíte 017.
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const ler = (f) => readFile(new URL(f, import.meta.url), 'utf8');
const original = await ler('../017_admin_mfa_equipe.sql');
const casos = [
  ['MFA', original.replace("auth.jwt()->>'aal' = 'aal2' and ", ''), 'MFA ausente autorizou'],
  ['último superadmin', original.replaceAll("if antes.ativo and antes.papel='superadmin'", "if false and antes.ativo and antes.papel='superadmin'"), 'último superadmin desativado'],
  ['EXECUTE', original + '\ngrant execute on function public.admin_desativar_administrador(uuid,text) to anon;', 'EXECUTE equipe incorreto'],
  ['auditoria', original.replace("perform interno.registra_historico(null,'equipe_convidar',p_motivo,null,to_jsonb(depois));", ''), 'auditoria equipe incompleta'],
];
for (const [nome, sql, erroEsperado] of casos) {
  const db = new PGlite();
  try {
    for (const f of ['00_stub_supabase.sql','../001_tipos_e_tabelas.sql','../002_funcoes.sql','../003_views.sql','../004_rls_e_grants.sql']) await db.exec(await ler(f));
    await db.exec(sql);
    let detectada = false;
    try { await db.exec(await ler('migracao_017_test.sql')); }
    catch (e) { if (!e.message.includes(erroEsperado)) throw e; detectada = true; }
    if (!detectada) throw new Error(`Mutação não detectada: ${nome}`);
    console.log(`ok    mutação detectada: ${nome}`);
  } finally { await db.close(); }
}
