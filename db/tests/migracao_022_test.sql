begin;
do $$
declare
  v_municipio smallint;
  v_categoria smallint;
  v_publicada uuid;
  v_pendente uuid;
  v_h1 bytea := decode(repeat('a',64),'hex');
  v_h2 bytea := decode(repeat('b',64),'hex');
  v_ok boolean;
  v_id bigint;
  v_old bigint;
begin
  if to_regprocedure('public.registrar_denuncia(uuid,text,text)') is not null
     or to_regprocedure('public.registrar_resposta(uuid,text,text,text)') is not null then
    raise exception 'assinatura sem origem ainda existe';
  end if;
  if not has_function_privilege('service_role','public.registrar_denuncia(uuid,text,text,bytea)','execute')
     or has_function_privilege('anon','public.registrar_denuncia(uuid,text,text,bytea)','execute')
     or has_function_privilege('authenticated','public.registrar_denuncia(uuid,text,text,bytea)','execute')
     or not has_function_privilege('service_role','public.registrar_resposta(uuid,text,text,text,bytea)','execute')
     or has_function_privilege('anon','public.registrar_resposta(uuid,text,text,text,bytea)','execute')
     or has_function_privilege('authenticated','public.registrar_resposta(uuid,text,text,text,bytea)','execute') then
    raise exception 'grants das funções de participação incorretos';
  end if;

  insert into public.municipios(ibge_codigo,nome,slug)
    values(5299922,'Município participação 022','municipio-participacao-022') returning id into v_municipio;
  select id into v_categoria from public.categorias order by id limit 1;
  insert into public.ocorrencias(protocolo,municipio_id,categoria_id,titulo,descricao,moderacao,publicado_em)
    values('PART-022-'||replace(gen_random_uuid()::text,'-',''),v_municipio,v_categoria,'Relato publicado','Descrição fictícia publicada para testar deduplicação.','publicado',now()) returning id into v_publicada;
  insert into public.ocorrencias(protocolo,municipio_id,categoria_id,titulo,descricao,moderacao)
    values('PART-022-'||replace(gen_random_uuid()::text,'-',''),v_municipio,v_categoria,'Relato pendente','Descrição fictícia pendente para testar ocultação.','pendente') returning id into v_pendente;

  select public.registrar_denuncia(v_publicada,'spam','Texto de teste',v_h1) into v_ok;
  if not v_ok then raise exception 'primeira denúncia não inserida'; end if;
  select public.registrar_denuncia(v_publicada,'outro','Texto duplicado',v_h1) into v_ok;
  if v_ok then raise exception 'denúncia duplicada da mesma origem foi inserida'; end if;
  select public.registrar_denuncia(v_publicada,'outro','Outra origem',v_h2) into v_ok;
  if not v_ok then raise exception 'origem distinta foi deduplicada'; end if;
  select id into v_old from public.denuncias where ocorrencia_id=v_publicada and origem_hash=v_h1;
  update public.denuncias set status='em_analise' where id=v_old;
  select public.registrar_denuncia(v_publicada,'spam','Ainda em análise',v_h1) into v_ok;
  if v_ok then raise exception 'denúncia em análise perdeu a deduplicação'; end if;
  update public.denuncias set status='procedente' where id=v_old;
  if exists(select 1 from public.denuncias where id=v_old and origem_hash is not null) then raise exception 'hash de denúncia resolvida não foi apagado'; end if;
  select public.registrar_denuncia(v_publicada,'spam','Nova manifestação após resolução',v_h1) into v_ok;
  if not v_ok then raise exception 'hash resolvido não foi liberado'; end if;

  select public.registrar_resposta(v_publicada,'Órgão teste','contato-privado','Resposta fictícia com tamanho suficiente para revisão.',v_h1) into v_ok;
  if not v_ok then raise exception 'primeira resposta não inserida'; end if;
  select public.registrar_resposta(v_publicada,'Outro vínculo','outro-contato','Resposta duplicada com tamanho suficiente para revisão.',v_h1) into v_ok;
  if v_ok then raise exception 'resposta duplicada da mesma origem foi inserida'; end if;
  select public.registrar_resposta(v_publicada,'Outro vínculo','outro-contato','Resposta independente com tamanho suficiente para revisão.',v_h2) into v_ok;
  if not v_ok then raise exception 'origem distinta de resposta foi deduplicada'; end if;
  select id into v_id from public.respostas where ocorrencia_id=v_publicada and origem_hash=v_h1;
  update public.respostas set status='publicada' where id=v_id;
  if exists(select 1 from public.respostas where id=v_id and origem_hash is not null) then raise exception 'hash de resposta revisada não foi apagado'; end if;
  select public.registrar_resposta(v_publicada,'Órgão teste','contato-privado','Resposta após revisão com tamanho suficiente.',v_h1) into v_ok;
  if not v_ok then raise exception 'hash de resposta revisada não foi liberado'; end if;

  select public.registrar_denuncia(v_pendente,'spam',null,v_h1) into v_ok;
  if v_ok then raise exception 'denúncia de relato não publicado foi aceita'; end if;
  select public.registrar_resposta(v_pendente,'Órgão teste','contato-privado','Resposta pendente com tamanho suficiente para revisão.',v_h1) into v_ok;
  if v_ok then raise exception 'resposta a relato não publicado foi aceita'; end if;
  begin
    perform public.registrar_denuncia(v_publicada,'spam',null,null);
    raise exception 'hash nulo foi aceito';
  exception when sqlstate '22023' then null;
  end;
end $$;
rollback;
