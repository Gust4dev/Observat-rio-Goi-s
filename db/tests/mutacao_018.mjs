// Regressões aplicadas apenas em bancos locais descartáveis.
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const ler = (f) => readFile(new URL(f, import.meta.url), 'utf8');
const original = await ler('../018_admin_operacoes.sql');
const casos = [
 ['motivo fechado', original.replace("if p_acao='remover' and (", "if false and (").replace("then p_motivo_codigo end", "then 'spam' end"), 'motivo livre aceito'],
 ['complemento', original.replace("if p_acao<>'aprovar' and", "if p_acao='reter' and").replace("then btrim(p_motivo) end", "then 'substituído' end"), 'complemento vazio aceito'],
 ['limite lote', original.replace('between 1 and 50','between 1 and 500'), 'ocorrência não encontrada'],
 ['atomicidade lote', original.replace('perform public.admin_moderar_ocorrencia(item,p_acao,p_motivo,null);', 'begin perform public.admin_moderar_ocorrencia(item,p_acao,p_motivo,null); exception when no_data_found then null; end;'), 'lote parcial aceito'],
 ['auditoria por item', original.replace('perform interno.registra_historico(p_id,p_acao,p_motivo,to_jsonb(antes),to_jsonb(depois));',''), 'auditoria lote incompleta'],
 ['auditoria append-only', original+'\nalter table public.historico_moderacao disable trigger historico_somente_insercao;', 'auditoria mutável'],
 ['efeito público mescla', original.replace("set moderacao='removido',removido_em=now()", "set moderacao='publicado',removido_em=now()"), 'mescla removida aceita'],
 ['grant', original+'\ngrant execute on function public.admin_detalhar_ocorrencia(uuid) to anon;', 'EXECUTE operações incorreto'],
 ['papel auditoria', original.replace("perform interno.exige_admin('gestor');\n if p_limite", "perform interno.exige_admin('moderador');\n if p_limite"), 'moderador leu auditoria'],
 ['MFA', original+`\ncreate or replace function interno.eh_admin(p_minimo public.papel_admin) returns boolean language sql stable security definer set search_path='' as $$ select coalesce(interno.papel_atual()>=p_minimo,false) $$;`, 'AAL1 detalhe autorizado'],
];
const base=['00_stub_supabase.sql','../001_tipos_e_tabelas.sql','../002_funcoes.sql','../003_views.sql','../004_rls_e_grants.sql','../006_seed_categorias.sql','../007_lacunas_do_desenho.sql','../009_view_sem_busca.sql','../010_acompanhamento_completo.sql','../011_imagens_resilientes.sql','../012_dados_painel.sql','../014_imagens_publicas.sql','../015_upload_imagens.sql','../016_moderacao_imagens.sql','../017_admin_mfa_equipe.sql'];
for (const [nome,sql,esperado] of casos) {
 const db=new PGlite();
 try {
  for(const f of base) await db.exec(await ler(f));
  await db.exec(sql);
  let detectada=false;
  try { await db.exec(await ler('migracao_018_test.sql')); }
  catch(e) { if(!e.message.includes(esperado)) throw new Error(`${nome}: falha inesperada: ${e.message}`); detectada=true; }
  if(!detectada) throw new Error(`Mutação não detectada: ${nome}`);
  console.log(`ok    mutação detectada: ${nome}`);
 } finally { await db.close(); }
}
