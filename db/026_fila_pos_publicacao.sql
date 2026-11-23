-- Preserva assinaturas, grants, fila de pendências e contrato de retirada.
begin;

create or replace function public.admin_pagina_fila(
  p_limite integer,p_ordem text,p_referencia_em timestamptz,
  p_cursor_criado_em timestamptz default null,p_cursor_id uuid default null,
  p_moderacao public.moderacao_ocorrencia default null,p_situacao public.situacao_ocorrencia default null,
  p_municipio_id integer default null,p_categoria_id integer default null,
  p_criado_desde timestamptz default null,p_criado_ate timestamptz default null,
  p_denuncia boolean default null,p_foto_pendente boolean default null
) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare resultado jsonb; sentido text; operador text;
begin
  perform interno.exige_admin('moderador');
  if p_moderacao = 'removido' then
    perform interno.exige_admin('gestor');
  end if;
  if p_limite is null or p_limite not between 1 and 100 or p_ordem is null or p_ordem not in ('antigos','recentes')
    or p_referencia_em is null or (p_cursor_criado_em is null)<>(p_cursor_id is null)
    or p_criado_desde>p_criado_ate then
    raise exception 'paginação ou filtros inválidos' using errcode='22023';
  end if;
  sentido := case when p_ordem='recentes' then 'desc' else 'asc' end;
  operador := case when p_ordem='recentes' then '<' else '>' end;
  -- Somente direção e operador fixos entram no SQL. Os filtros são parâmetros bindados.
  execute format($consulta$
    with pagina as materialized (
      select o.id,o.protocolo,o.municipio_id,o.categoria_id,o.titulo,o.descricao,o.situacao,
             o.moderacao,o.criado_em,o.versao_admin
      from public.ocorrencias o
      where ($4 = 'removido' or o.moderacao<>'removido') and o.criado_em<=$1
        and ($2 is null or (o.criado_em,o.id) %2$s ($2,$3))
        and ($4 is null or o.moderacao=$4) and ($5 is null or o.situacao=$5)
        and ($6 is null or o.municipio_id=$6) and ($7 is null or o.categoria_id=$7)
        and ($8 is null or o.criado_em>=$8) and ($9 is null or o.criado_em<=$9)
        and ($4 in ('publicado','removido') or o.moderacao in ('pendente','retido')
          or exists (select 1 from public.imagens i where i.ocorrencia_id=o.id and i.moderacao='pendente')
          or exists (select 1 from public.denuncias d where d.ocorrencia_id=o.id and d.status in ('aberta','em_analise')))
        and ($10 is null or $10=(exists (select 1 from public.denuncias d where d.ocorrencia_id=o.id and d.status in ('aberta','em_analise'))))
        and ($11 is null or $11=(exists (select 1 from public.imagens i where i.ocorrencia_id=o.id and i.moderacao='pendente')))
      order by o.criado_em %1$s,o.id %1$s limit $12
    ), itens as (
      select p.*,m.nome as municipio_nome,c.nome as categoria_nome,
        (select count(*) from public.imagens i where i.ocorrencia_id=p.id and i.moderacao='pendente') as imagens_pendentes,
        (select count(*) from public.denuncias d where d.ocorrencia_id=p.id and d.status in ('aberta','em_analise')) as denuncias_abertas
      from pagina p
      join public.municipios m on m.id=p.municipio_id
      join public.categorias c on c.id=p.categoria_id
    )
    select coalesce(jsonb_agg(to_jsonb(itens) order by criado_em %1$s,id %1$s),'[]'::jsonb) from itens
  $consulta$,sentido,operador) into resultado
  using p_referencia_em,p_cursor_criado_em,p_cursor_id,p_moderacao,p_situacao,p_municipio_id,p_categoria_id,
    p_criado_desde,p_criado_ate,p_denuncia,p_foto_pendente,p_limite+1;
  return resultado;
end $$;
create or replace function public.solicitar_exclusao_por_token(p_token_hash bytea, p_apagar_conteudo boolean default false)
returns text[]
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_paths text[] := '{}';
begin
  select t.ocorrencia_id into v_id from public.tokens_gestao t where t.token_hash = p_token_hash for update;
  if v_id is null then
    raise exception 'token não encontrado' using errcode = 'P0002';
  end if;

  delete from public.contatos_privados where ocorrencia_id = v_id;

  if p_apagar_conteudo then
    perform 1 from public.ocorrencias where id = v_id for update;
    delete from public.tokens_gestao where ocorrencia_id = v_id;
    delete from public.confirmacoes where ocorrencia_id = v_id;
    with retiradas as (
      delete from public.imagens where ocorrencia_id = v_id returning id, caminho_storage
    )
    select coalesce(array_agg(caminho) filter (where caminho is not null), '{}')
      into v_paths
      from retiradas cross join lateral (values (caminho_storage), (id::text || '.jpg')) as objetos(caminho);
    update public.ocorrencias
       set titulo = '[conteúdo removido a pedido do titular]',
           descricao = '[conteúdo removido a pedido do titular]',
           moderacao = 'removido', removido_em = now(),
           motivo_remocao = 'Exclusão solicitada pelo titular'
     where id = v_id;
    insert into public.historico_moderacao (ocorrencia_id, admin_id, acao, motivo)
      values (v_id, null, 'exclusao_titular', 'Contato e conteúdo apagados a pedido do titular');
  else
    insert into public.historico_moderacao (ocorrencia_id, admin_id, acao, motivo)
      values (v_id, null, 'exclusao_contato_titular', 'Contato apagado a pedido do titular');
  end if;
  return v_paths;
end $$;

create or replace function public.registrar_confirmacao(p_ocorrencia_id uuid, p_chave_hash bytea)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_n integer;
begin
  -- A retirada definitiva usa FOR UPDATE antes de apagar as confirmações.
  perform 1 from public.ocorrencias
    where id = p_ocorrencia_id and moderacao = 'publicado' for share;
  if not found then return false; end if;
  insert into public.confirmacoes (ocorrencia_id, chave_dedup_hash)
    values (p_ocorrencia_id, p_chave_hash) on conflict do nothing;
  get diagnostics v_n = row_count;
  return v_n = 1;
end $$;

create or replace function public.admin_moderar_ocorrencia(
  p_id uuid, p_acao text, p_versao_esperada integer, p_motivo text default null, p_motivo_codigo text default null
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  versao integer;
begin
  perform interno.exige_admin('moderador');
  if p_acao = 'restaurar' then perform interno.exige_admin('gestor'); end if;
  select versao_admin into versao from public.ocorrencias where id = p_id for update;
  if not found then raise exception 'item não encontrado' using errcode = 'P0002'; end if;
  perform interno.admin_confere_versao(versao, p_versao_esperada);
  if p_acao = 'restaurar' and exists (
    select 1 from public.historico_moderacao where ocorrencia_id = p_id and acao = 'exclusao_titular'
  ) then
    raise exception 'relato excluído pelo titular não pode ser restaurado' using errcode = '22023';
  end if;
  perform interno.admin_moderar_ocorrencia(p_id, p_acao, p_motivo, p_motivo_codigo);
end $$;

create function interno.retirar_imagens_de_relato_removido() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- A ausência de referências faz a próxima rotina de Storage recolher os dois buckets.
  update public.imagens set
    moderacao = 'removido', descricao_publica = null, caminho_storage = null,
    hash_entrada = null, descricao_contexto = null, retencao_expirada_em = now(),
    operacao_admin_id = null, operacao_admin_ate = null, operacao_admin_por = null,
    operacao_admin_acao = null
  where ocorrencia_id = new.id;
  return new;
end $$;
revoke all on function interno.retirar_imagens_de_relato_removido() from public,anon,authenticated,service_role;
create trigger ocorrencias_retirar_imagens
after update of moderacao on public.ocorrencias
for each row when (new.moderacao = 'removido' and old.moderacao <> 'removido')
execute function interno.retirar_imagens_de_relato_removido();

create function public.admin_remover_ocorrencia_com_imagens(
  p_id uuid, p_versao_esperada integer, p_motivo text, p_motivo_codigo text
) returns text[]
language plpgsql security definer set search_path = '' as $$
declare
  v_paths text[];
begin
  perform interno.exige_admin('moderador');
  perform 1 from public.ocorrencias where id = p_id for update;
  with bloqueadas as materialized (
    select id, caminho_storage from public.imagens where ocorrencia_id = p_id order by id for update
  )
  select coalesce(array_agg(caminho) filter (where caminho is not null), '{}')
    into v_paths from bloqueadas
    cross join lateral (values (caminho_storage), (id::text || '.jpg')) as objetos(caminho);
  perform public.admin_moderar_ocorrencia(p_id,'remover',p_versao_esperada,p_motivo,p_motivo_codigo);
  return v_paths;
end $$;
revoke all on function public.admin_remover_ocorrencia_com_imagens(uuid,integer,text,text) from public,anon,authenticated,service_role;
grant execute on function public.admin_remover_ocorrencia_com_imagens(uuid,integer,text,text) to authenticated;

commit;
