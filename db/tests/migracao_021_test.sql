begin;
do $$
declare
  v_usuario uuid := gen_random_uuid();
  v_municipio smallint;
  v_categoria smallint;
  v_id uuid;
  v_municipio_filtro smallint;
  v_categoria_filtro smallint;
  v_colunas text[];
begin
  select array_agg(column_name order by ordinal_position) into v_colunas
    from information_schema.columns where table_schema='public' and table_name='v_fila_moderacao';
  if v_colunas[array_length(v_colunas,1)-1] <> 'municipio_id' or v_colunas[array_length(v_colunas,1)] <> 'categoria_id' then
    raise exception 'IDs de filtros não são colunas finais da fila';
  end if;
  if has_table_privilege('anon','public.v_fila_moderacao','select') or not has_table_privilege('authenticated','public.v_fila_moderacao','select') then
    raise exception 'grants da fila alterados';
  end if;
  insert into auth.users(id,email) values(v_usuario,'fila021@test');
  insert into public.administradores(user_id,papel) values(v_usuario,'moderador');
  insert into public.municipios(ibge_codigo,nome,slug) values(5299921,'Município fila 021','municipio-fila-021') returning id into v_municipio;
  select id into v_categoria from public.categorias order by id limit 1;
  insert into public.ocorrencias(protocolo,municipio_id,categoria_id,titulo,descricao)
    values('FILA-021-'||replace(v_usuario::text,'-',''),v_municipio,v_categoria,'Teste fila','Descrição fictícia suficiente para validar os filtros.') returning id into v_id;
  perform set_config('request.jwt.claim.sub',v_usuario::text,true);
  perform set_config('request.jwt.claims','{"aal":"aal2"}',true);
  set local role authenticated;
  select municipio_id,categoria_id into v_municipio_filtro,v_categoria_filtro from public.v_fila_moderacao where id=v_id;
  if v_municipio_filtro is distinct from v_municipio or v_categoria_filtro is distinct from v_categoria then
    raise exception 'IDs de município/categoria não permitem filtrar a fila';
  end if;
end $$;
rollback;
