begin;
do $$
declare
  uid uuid := 'f4400ed6-93d4-4df0-8236-8e68eaa27024';
  mun smallint;
  cat smallint;
  oc uuid;
  atualizacao_id bigint;
  historico_id bigint;
begin
  insert into auth.users(id, email) values (uid, 'e2e-sec-024@example.invalid');
  insert into public.administradores(user_id, papel) values (uid, 'superadmin');
  insert into public.municipios(ibge_codigo, slug, nome)
    values (5299999, 'e2e-sec-024', '[E2E-SEC] 024') returning id into mun;
  insert into public.categorias(slug, nome)
    values ('e2e-sec-024', '[E2E-SEC] 024') returning id into cat;
  insert into public.ocorrencias(protocolo, municipio_id, categoria_id, titulo, descricao)
    values ('E2E-SEC-024', mun, cat, '[E2E-SEC] 024', 'Descrição sintética de regressão.') returning id into oc;
  insert into public.atualizacoes(ocorrencia_id, tipo, texto, admin_id)
    values (oc, 'resposta_oficial', '[E2E-SEC] autoria preservada', uid) returning id into atualizacao_id;
  insert into public.historico_moderacao(ocorrencia_id, admin_id, acao)
    values (oc, uid, '[E2E-SEC] autoria anonimizada') returning id into historico_id;

  delete from auth.users where id = uid;
  if exists(select 1 from public.administradores where user_id = uid) then
    raise exception '024 manteve o vínculo de equipe';
  end if;
  if not exists(select 1 from public.atualizacoes where id=atualizacao_id and admin_id is null and texto='[E2E-SEC] autoria preservada') then
    raise exception '024 não anonimiza a autoria da atualização ou alterou o conteúdo';
  end if;
  if not exists(select 1 from public.historico_moderacao where id=historico_id and admin_id is null and acao='[E2E-SEC] autoria anonimizada') then
    raise exception '024 não anonimiza a autoria do histórico ou alterou o conteúdo';
  end if;

  begin
    update public.atualizacoes set texto='alteração direta bloqueada' where id=atualizacao_id;
    raise exception '024 permitiu editar conteúdo append-only';
  exception when insufficient_privilege then null;
  end;
  if not exists(select 1 from public.atualizacoes where id=atualizacao_id and texto='[E2E-SEC] autoria preservada') then
    raise exception '024 deixou alteração direta persistir';
  end if;
end $$;
rollback;
