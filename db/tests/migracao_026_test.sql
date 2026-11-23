begin;
do $$
declare
  operador uuid := gen_random_uuid();
  gestor uuid := gen_random_uuid();
  relato uuid := gen_random_uuid();
  outro_relato uuid := gen_random_uuid();
  foto uuid := gen_random_uuid();
  foto_admin uuid := gen_random_uuid();
  caminho text := encode(sha256(relato::text::bytea),'hex') || '/1/' || encode(sha256(foto::text::bytea),'hex') || '.jpg';
  caminho_admin text := encode(sha256(outro_relato::text::bytea),'hex') || '/1/' || encode(sha256(foto_admin::text::bytea),'hex') || '.jpg';
  caminhos text[];
  hash bytea := sha256('fixture-026'::bytea);
  outro_hash bytea := sha256('fixture-026-outro'::bytea);
  pagina jsonb;
begin
  insert into auth.users(id,email) values (operador,'moderacao026@test.invalid'),(gestor,'gestao026@test.invalid');
  insert into public.administradores(user_id,papel) values (operador,'moderador'),(gestor,'gestor');
  insert into public.municipios(ibge_codigo,nome,slug) values (5299926,'Município fictício 026','municipio-fila-026');
  insert into public.ocorrencias(id,protocolo,municipio_id,categoria_id,titulo,descricao,moderacao,publicado_em)
  select relato,'FILA-026',m.id,c.id,'Relato de teste','Descrição fictícia para o teste de fila.', 'publicado',now()
  from public.municipios m cross join public.categorias c where m.slug='municipio-fila-026' order by c.id limit 1;
  insert into public.tokens_gestao(ocorrencia_id,token_hash) values (relato,hash);
  insert into public.ocorrencias(id,protocolo,municipio_id,categoria_id,titulo,descricao,moderacao,publicado_em)
  select outro_relato,'FILA-026-ADMIN',municipio_id,categoria_id,titulo,descricao,'publicado',now()
    from public.ocorrencias where id=relato;
  insert into public.imagens(id,ocorrencia_id,ordem,caminho_storage,tipo_mime,tamanho_bytes,moderacao,descricao_publica)
    values (foto_admin,outro_relato,1,caminho_admin,'image/jpeg',100,'publicado','Foto sintética');
  perform set_config('request.jwt.claim.sub',operador::text,true);
  perform set_config('request.jwt.claims','{"aal":"aal2"}',true);
  set local role authenticated;
  pagina := public.admin_pagina_fila(50,'recentes',now(),p_moderacao=>'publicado');
  if not pagina @> jsonb_build_array(jsonb_build_object('id',relato)) then
    raise exception 'relato publicado sem pendências ausente do filtro';
  end if;
  pagina := public.admin_pagina_fila(50,'recentes',now());
  if pagina @> jsonb_build_array(jsonb_build_object('id',relato)) then
    raise exception 'relato sem pendências foi incluído na fila padrão';
  end if;
  begin
    perform public.admin_pagina_fila(50,'recentes',now(),p_moderacao=>'removido');
    raise exception 'papel moderador acessou filtro reservado a gestor';
  exception when insufficient_privilege then null;
  end;
  caminhos := public.admin_remover_ocorrencia_com_imagens(outro_relato,1,'Fixture administrativa','spam');
  if cardinality(caminhos) <> 2 or not caminhos @> array[caminho_admin, foto_admin::text || '.jpg'] then
    raise exception 'remoção administrativa não entregou o conjunto de purga';
  end if;
  begin
    perform public.admin_moderar_ocorrencia(outro_relato,'remover',1,'Versão concorrente','spam');
    raise exception 'decisão obsoleta não foi rejeitada';
  exception when sqlstate 'PT409' then null;
  end;
  begin
    perform public.admin_moderar_ocorrencia(outro_relato,'restaurar',2,'Fixture administrativa');
    raise exception 'moderador restaurou sem ser gestor';
  exception when insufficient_privilege then null;
  end;
  reset role;
  if exists (select 1 from public.v_ocorrencias_publicas where id=outro_relato)
     or 1 <> (select count(*) from public.historico_moderacao where ocorrencia_id=outro_relato and acao='remover') then
    raise exception 'remoção administrativa visível ou auditada incorretamente';
  end if;
  if not exists (select 1 from public.imagens where id=foto_admin and moderacao='removido' and caminho_storage is null) then
    raise exception 'imagem removida ainda está referenciada no Storage';
  end if;
  if has_function_privilege('anon','public.registrar_confirmacao(uuid,bytea)','EXECUTE') then
    raise exception 'confirmação concedida diretamente a anon';
  end if;
  set local role service_role;
  if not public.registrar_confirmacao(relato,outro_hash)
     or public.registrar_confirmacao(relato,outro_hash) then
    raise exception 'confirmação nova recusada ou repetida inserida';
  end if;
  reset role;
  if (select confirmacoes_total from public.v_ocorrencias_publicas where id=relato) <> 1 then
    raise exception 'confirmação não deduplicada';
  end if;
  insert into public.imagens(id,ocorrencia_id,ordem,caminho_storage,tipo_mime,tamanho_bytes)
    values (foto,relato,1,caminho,'image/jpeg',100);
  set local role service_role;
  perform public.solicitar_exclusao_por_token(hash,false);
  caminhos := public.solicitar_exclusao_por_token(hash,true);
  if cardinality(caminhos) <> 2 or not caminhos @> array[caminho, foto::text || '.jpg'] then
    raise exception 'retirada deve fornecer os caminhos privado e público da mesma foto';
  end if;
  if public.registrar_confirmacao(relato,outro_hash) then
    raise exception 'confirmação aceita para relato retirado';
  end if;
  reset role;
  if exists (select 1 from public.tokens_gestao where ocorrencia_id=relato)
     or exists (select 1 from public.confirmacoes where ocorrencia_id=relato)
     or exists (select 1 from public.v_ocorrencias_publicas where id=relato) then
    raise exception 'retirada deixou token, confirmação ou relato público';
  end if;
  if not exists (select 1 from public.historico_moderacao where ocorrencia_id=relato and acao='exclusao_titular') then
    raise exception 'retirada sem auditoria';
  end if;
  perform set_config('request.jwt.claim.sub',gestor::text,true);
  set local role authenticated;
  pagina := public.admin_pagina_fila(50,'recentes',now(),p_moderacao=>'removido');
  if not pagina @> jsonb_build_array(jsonb_build_object('id',relato)) then
    raise exception 'gestor não localiza o histórico do relato removido';
  end if;
  perform public.admin_moderar_ocorrencia(outro_relato,'restaurar',2,'Fixture administrativa');
  begin
    perform public.admin_moderar_ocorrencia(relato,'restaurar',2,'Fixture de teste');
    raise exception 'relato retirado pelo titular foi restaurado';
  exception when invalid_parameter_value then null;
  end;
  reset role;
  if (select moderacao from public.ocorrencias where id=outro_relato) <> 'pendente' then
    raise exception 'restauração precisa voltar à fila prévia';
  end if;
  if exists (select 1 from public.imagens where id=foto_admin and moderacao<>'removido') then
    raise exception 'restauração reativou a imagem anteriormente retirada';
  end if;
end $$;
rollback;
