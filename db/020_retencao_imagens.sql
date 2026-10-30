-- M5: prazo configurável para imagens retidas/removidas; padrão provisório de engenharia.
-- Retenção provisória de engenharia; não define prazo jurídico.
create table if not exists interno.configuracao_retencao (
  chave text primary key,
  valor_dias integer not null check (valor_dias between 1 and 3650),
  atualizado_em timestamptz not null default now()
);
alter table interno.configuracao_retencao enable row level security;
revoke all on interno.configuracao_retencao from public, anon, authenticated, service_role;
insert into interno.configuracao_retencao(chave, valor_dias)
values ('imagens_rejeitadas_retidas_dias', 365)
on conflict (chave) do nothing;

alter table public.imagens alter column caminho_storage drop not null;
alter table public.imagens add column if not exists retencao_expirada_em timestamptz;
create index if not exists imagens_retencao_expirada_idx
  on public.imagens (retencao_expirada_em) where retencao_expirada_em is not null;

create or replace function interno.limpar_expirados() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_contatos integer; v_hashes integer; v_limites integer; v_imagens integer; v_prazo integer;
begin
  with apagados as (
    delete from public.contatos_privados where expira_em is not null and expira_em < now()
    returning ocorrencia_id)
  insert into public.historico_moderacao (ocorrencia_id, admin_id, acao, motivo)
    select ocorrencia_id, null, 'retencao_contato_expirado', 'Contato apagado por fim do prazo de retenção'
      from apagados;
  get diagnostics v_contatos = row_count;

  update public.ocorrencias set origem_hash = null, texto_hash = null
   where (origem_hash is not null or texto_hash is not null) and criado_em < now() - interval '30 days';
  get diagnostics v_hashes = row_count;
  delete from interno.limites_taxa where janela_inicio < now() - interval '2 days';
  get diagnostics v_limites = row_count;

  select valor_dias into v_prazo from interno.configuracao_retencao
   where chave = 'imagens_rejeitadas_retidas_dias';
  v_prazo := coalesce(v_prazo, 365);
  with expiradas as (
    select i.id from public.imagens i
     where i.moderacao in ('retido','removido') and i.retencao_expirada_em is null
       and i.caminho_storage is not null
       and i.criado_em < clock_timestamp() - make_interval(days => v_prazo)
       and coalesce(i.operacao_admin_ate, '-infinity'::timestamptz) <= clock_timestamp()
     for update skip locked
  )
  update public.imagens i set caminho_storage=null, hash_entrada=null,
    descricao_contexto=null, retencao_expirada_em=clock_timestamp()
   from expiradas e where i.id=e.id
     and coalesce(i.operacao_admin_ate, '-infinity'::timestamptz) <= clock_timestamp();
  get diagnostics v_imagens = row_count;

  return jsonb_build_object('contatos_apagados',v_contatos,'hashes_limpos',v_hashes,
    'limites_apagados',v_limites,'imagens_expiradas',v_imagens,'retencao_imagens_dias',v_prazo);
end $$;
revoke all on function interno.limpar_expirados() from public, anon, authenticated;
