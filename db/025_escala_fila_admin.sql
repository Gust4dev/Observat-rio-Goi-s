begin;

alter table public.ocorrencias add column versao_admin integer not null default 1;
alter table public.denuncias add column versao_admin integer not null default 1;
alter table public.respostas add column versao_admin integer not null default 1;

create function interno.admin_incrementa_versao() returns trigger
language plpgsql set search_path='' as $$
begin
  new.versao_admin := old.versao_admin + 1;
  return new;
end $$;
revoke all on function interno.admin_incrementa_versao() from public,anon,authenticated,service_role;

-- Inclui decisões que reaplicam o mesmo estado e mudanças de moderação fora do painel.
create trigger ocorrencias_versao_admin before update of moderacao,situacao,duplicata_de
  on public.ocorrencias for each row execute function interno.admin_incrementa_versao();
create trigger denuncias_versao_admin before update of status
  on public.denuncias for each row execute function interno.admin_incrementa_versao();
create trigger respostas_versao_admin before update of status
  on public.respostas for each row execute function interno.admin_incrementa_versao();

create function interno.admin_confere_versao(p_atual integer,p_esperada integer)
returns void language plpgsql set search_path='' as $$
begin
  if p_esperada is null or p_esperada < 1 then
    raise exception 'versão esperada obrigatória' using errcode='22023';
  end if;
  if p_atual is distinct from p_esperada then
    raise exception 'estado administrativo desatualizado' using errcode='PT409';
  end if;
end $$;
revoke all on function interno.admin_confere_versao(integer,integer) from public,anon,authenticated,service_role;

-- Preserva as regras e a auditoria originais em funções acessíveis apenas pelo dono.
drop function public.admin_moderar_lote(uuid[],text,text);
alter function public.admin_moderar_ocorrencia(uuid,text,text,text) set schema interno;
revoke all on function interno.admin_moderar_ocorrencia(uuid,text,text,text) from public,anon,authenticated,service_role;
alter function public.admin_atualizar_situacao(uuid,public.situacao_ocorrencia,text,text,boolean) set schema interno;
revoke all on function interno.admin_atualizar_situacao(uuid,public.situacao_ocorrencia,text,text,boolean) from public,anon,authenticated,service_role;
alter function public.admin_resolver_denuncia(bigint,public.status_denuncia) set schema interno;
revoke all on function interno.admin_resolver_denuncia(bigint,public.status_denuncia) from public,anon,authenticated,service_role;
alter function public.admin_revisar_resposta(bigint,text,text) set schema interno;
revoke all on function interno.admin_revisar_resposta(bigint,text,text) from public,anon,authenticated,service_role;
alter function public.admin_mesclar_duplicata(uuid,uuid,text) set schema interno;
revoke all on function interno.admin_mesclar_duplicata(uuid,uuid,text) from public,anon,authenticated,service_role;

create function public.admin_moderar_ocorrencia(p_id uuid,p_acao text,p_versao_esperada integer,p_motivo text default null,p_motivo_codigo text default null)
returns void language plpgsql security definer set search_path='' as $$
declare versao integer;
begin
  perform interno.exige_admin('moderador');
  if p_acao='restaurar' then perform interno.exige_admin('gestor'); end if;
  select versao_admin into versao from public.ocorrencias where id=p_id for update;
  if not found then raise exception 'item não encontrado' using errcode='P0002'; end if;
  perform interno.admin_confere_versao(versao,p_versao_esperada);
  perform interno.admin_moderar_ocorrencia(p_id,p_acao,p_motivo,p_motivo_codigo);
end $$;
revoke all on function public.admin_moderar_ocorrencia(uuid,text,integer,text,text) from public,anon,authenticated,service_role;
grant execute on function public.admin_moderar_ocorrencia(uuid,text,integer,text,text) to authenticated;


create function public.admin_atualizar_situacao(p_id uuid,p_situacao public.situacao_ocorrencia,p_texto text,p_versao_esperada integer,p_evidencia text default null,p_publica boolean default true)
returns void language plpgsql security definer set search_path='' as $$
declare versao integer;
begin
  perform interno.exige_admin('moderador');
  select versao_admin into versao from public.ocorrencias where id=p_id for update;
  if not found then raise exception 'item não encontrado' using errcode='P0002'; end if;
  perform interno.admin_confere_versao(versao,p_versao_esperada);
  perform interno.admin_atualizar_situacao(p_id,p_situacao,p_texto,p_evidencia,p_publica);
end $$;
revoke all on function public.admin_atualizar_situacao(uuid,public.situacao_ocorrencia,text,integer,text,boolean) from public,anon,authenticated,service_role;
grant execute on function public.admin_atualizar_situacao(uuid,public.situacao_ocorrencia,text,integer,text,boolean) to authenticated;


create function public.admin_resolver_denuncia(p_denuncia_id bigint,p_status public.status_denuncia,p_versao_esperada integer)
returns void language plpgsql security definer set search_path='' as $$
declare versao integer;
begin
  perform interno.exige_admin('moderador');
  select versao_admin into versao from public.denuncias where id=p_denuncia_id for update;
  if not found then raise exception 'item não encontrado' using errcode='P0002'; end if;
  perform interno.admin_confere_versao(versao,p_versao_esperada);
  perform interno.admin_resolver_denuncia(p_denuncia_id,p_status);
end $$;
revoke all on function public.admin_resolver_denuncia(bigint,public.status_denuncia,integer) from public,anon,authenticated,service_role;
grant execute on function public.admin_resolver_denuncia(bigint,public.status_denuncia,integer) to authenticated;


create function public.admin_revisar_resposta(p_resposta_id bigint,p_acao text,p_versao_esperada integer,p_motivo text default null)
returns void language plpgsql security definer set search_path='' as $$
declare versao integer;
begin
  perform interno.exige_admin('moderador');
  select versao_admin into versao from public.respostas where id=p_resposta_id for update;
  if not found then raise exception 'item não encontrado' using errcode='P0002'; end if;
  perform interno.admin_confere_versao(versao,p_versao_esperada);
  perform interno.admin_revisar_resposta(p_resposta_id,p_acao,p_motivo);
end $$;
revoke all on function public.admin_revisar_resposta(bigint,text,integer,text) from public,anon,authenticated,service_role;
grant execute on function public.admin_revisar_resposta(bigint,text,integer,text) to authenticated;


create function public.admin_mesclar_duplicata(
  p_origem uuid,p_destino uuid,p_motivo text,p_versao_esperada integer,p_versao_destino_esperada integer
) returns void language plpgsql security definer set search_path='' as $$
declare origem integer; destino integer;
begin
  perform interno.exige_admin('moderador');
  if p_origem is null or p_destino is null or p_origem=p_destino then
    raise exception 'origem e destino distintos obrigatórios' using errcode='22023';
  end if;
  perform 1 from public.ocorrencias where id in (p_origem,p_destino) order by id for update;
  select versao_admin into origem from public.ocorrencias where id=p_origem;
  select versao_admin into destino from public.ocorrencias where id=p_destino;
  if origem is null or destino is null then raise exception 'ocorrência não encontrada' using errcode='P0002'; end if;
  perform interno.admin_confere_versao(origem,p_versao_esperada);
  perform interno.admin_confere_versao(destino,p_versao_destino_esperada);
  perform interno.admin_mesclar_duplicata(p_origem,p_destino,p_motivo);
end $$;
revoke all on function public.admin_mesclar_duplicata(uuid,uuid,text,integer,integer) from public,anon,authenticated,service_role;
grant execute on function public.admin_mesclar_duplicata(uuid,uuid,text,integer,integer) to authenticated;

create function public.admin_moderar_lote(p_ids uuid[],p_acao text,p_versoes_esperadas integer[],p_motivo text default null)
returns table(out_id uuid,out_moderacao public.moderacao_ocorrencia)
language plpgsql security definer set search_path='' as $$
declare item record; versao integer;
begin
  perform interno.exige_admin('moderador');
  if p_acao is null or p_acao not in ('aprovar','reter') or coalesce(cardinality(p_ids),0) not between 1 and 50
    or cardinality(p_ids) is distinct from cardinality(p_versoes_esperadas)
    or (select count(distinct id) from unnest(p_ids) id)<>cardinality(p_ids) then
    raise exception 'lote inválido (1 a 50 IDs únicos e versões correspondentes)' using errcode='22023';
  end if;

  perform 1 from public.ocorrencias where id=any(p_ids) order by id for update;
  for item in select * from unnest(p_ids,p_versoes_esperadas) as requisicao(id,esperada) loop
    select versao_admin into versao from public.ocorrencias where id=item.id;
    if not found then raise exception 'ocorrência não encontrada' using errcode='P0002'; end if;
    perform interno.admin_confere_versao(versao,item.esperada);
  end loop;
  for item in select id from unnest(p_ids) id loop
    perform interno.admin_moderar_ocorrencia(item.id,p_acao,p_motivo,null);
    return query select o.id,o.moderacao from public.ocorrencias o where o.id=item.id;
  end loop;
end $$;
revoke all on function public.admin_moderar_lote(uuid[],text,integer[],text) from public,anon,authenticated,service_role;
grant execute on function public.admin_moderar_lote(uuid[],text,integer[],text) to authenticated;

-- Uma inserção aditiva não invalida outra. O lock serializa a checagem de remoção.
create or replace function public.admin_adicionar_atualizacao(
  p_id uuid,p_tipo public.tipo_atualizacao,p_texto text,p_evidencia text default null,p_publica boolean default true
) returns void language plpgsql security definer set search_path='' as $$
begin
  perform interno.exige_admin('moderador');
  if p_tipo='mudanca_situacao' then
    raise exception 'use admin_atualizar_situacao' using errcode='22023';
  end if;
  perform 1 from public.ocorrencias where id=p_id and moderacao<>'removido' for update;
  if not found then raise exception 'ocorrência não encontrada ou removida' using errcode='P0002'; end if;
  insert into public.atualizacoes(ocorrencia_id,tipo,texto,evidencia,publica,admin_id)
  values(p_id,p_tipo,btrim(p_texto),nullif(btrim(p_evidencia),''),p_publica and p_tipo<>'nota',auth.uid());
  perform interno.registra_historico(p_id,'adicionar_atualizacao',p_texto,null,jsonb_build_object('tipo',p_tipo));
end $$;

-- A fila inclui publicados com pendências, portanto o predicado de 001 não atende à ordenação inteira.
create index ocorrencias_fila_keyset_idx on public.ocorrencias(criado_em,id) where moderacao<>'removido';
-- Inclui denúncias anteriores a 022, que não têm origem_hash.
create index denuncias_pendentes_ocorrencia_idx on public.denuncias(ocorrencia_id) where status in ('aberta','em_analise');
-- As consultas dos filhos fixam a ocorrência e avançam em (criado_em,id).
create index denuncias_ocorrencia_keyset_idx on public.denuncias(ocorrencia_id,criado_em,id);
create index respostas_ocorrencia_keyset_idx on public.respostas(ocorrencia_id,criado_em,id);
create index atualizacoes_ocorrencia_keyset_idx on public.atualizacoes(ocorrencia_id,criado_em,id);

create function public.admin_pagina_fila(
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
      where o.moderacao<>'removido' and o.criado_em<=$1
        and ($2 is null or (o.criado_em,o.id) %2$s ($2,$3))
        and ($4 is null or o.moderacao=$4) and ($5 is null or o.situacao=$5)
        and ($6 is null or o.municipio_id=$6) and ($7 is null or o.categoria_id=$7)
        and ($8 is null or o.criado_em>=$8) and ($9 is null or o.criado_em<=$9)
        and (o.moderacao in ('pendente','retido')
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
revoke all on function public.admin_pagina_fila(integer,text,timestamptz,timestamptz,uuid,public.moderacao_ocorrencia,public.situacao_ocorrencia,integer,integer,timestamptz,timestamptz,boolean,boolean) from public,anon,authenticated,service_role;
grant execute on function public.admin_pagina_fila(integer,text,timestamptz,timestamptz,uuid,public.moderacao_ocorrencia,public.situacao_ocorrencia,integer,integer,timestamptz,timestamptz,boolean,boolean) to authenticated;

create function public.admin_resumo_fila() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  perform interno.exige_admin('moderador');
  return jsonb_build_object('calculado_em',statement_timestamp(),
    'com_denuncias',(select count(distinct d.ocorrencia_id) from public.denuncias d
      join public.ocorrencias o on o.id=d.ocorrencia_id
      where o.moderacao<>'removido' and d.status in ('aberta','em_analise')),
    'com_fotos_pendentes',(select count(distinct i.ocorrencia_id) from public.imagens i
      join public.ocorrencias o on o.id=i.ocorrencia_id
      where o.moderacao<>'removido' and i.moderacao='pendente'));
end $$;
revoke all on function public.admin_resumo_fila() from public,anon,authenticated,service_role;
grant execute on function public.admin_resumo_fila() to authenticated;

create or replace function public.admin_detalhar_ocorrencia(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare resultado jsonb;
begin
  perform interno.exige_admin('moderador');
  select jsonb_build_object(
    'ocorrencia',jsonb_build_object(
      'id',o.id,'protocolo',o.protocolo,'municipio_id',o.municipio_id,'categoria_id',o.categoria_id,
      'municipio_nome',m.nome,'categoria_nome',c.nome,'titulo',o.titulo,'descricao',o.descricao,
      'situacao',o.situacao,'moderacao',o.moderacao,'criado_em',o.criado_em,'versao_admin',o.versao_admin,
      'publicado_em',o.publicado_em,'removido_em',o.removido_em,'motivo_remocao_codigo',o.motivo_remocao_codigo,
      'duplicata_de',o.duplicata_de),
    'imagens',coalesce((select jsonb_agg(to_jsonb(i) order by i.ordem) from (
      select id,ordem,tipo_mime,tamanho_bytes,moderacao,criado_em,retencao_expirada_em
      from public.imagens where ocorrencia_id=o.id order by ordem limit 3
    ) i),'[]'::jsonb),
    'resumos',jsonb_build_object(
      'tem_denuncias',exists(select 1 from public.denuncias d where d.ocorrencia_id=o.id),
      'tem_respostas',exists(select 1 from public.respostas r where r.ocorrencia_id=o.id),
      'tem_atualizacoes',exists(select 1 from public.atualizacoes a where a.ocorrencia_id=o.id and a.publica))
  ) into resultado from public.ocorrencias o
  join public.municipios m on m.id=o.municipio_id join public.categorias c on c.id=o.categoria_id
  where o.id=p_id;
  if resultado is null then raise exception 'ocorrência não encontrada' using errcode='P0002'; end if;
  return resultado;
end $$;

commit;
