-- Contrato privado do acompanhamento. No Supabase real: executar em BEGIN ... ROLLBACK.
-- Notas internas, contatos, autoria administrativa e respostas não publicadas não fazem parte do DTO.
do $$
declare
  v_mun smallint; v_cat smallint; v_oc uuid; v_outro uuid; r record; dto jsonb; n integer;
  v_hash bytea := sha256('teste-010-titular'::bytea);
  chaves text[];
begin
  insert into public.municipios (ibge_codigo, nome, slug)
    values (5299910, 'Município fictício 010', 'municipio-ficticio-010') returning id into v_mun;
  select id into v_cat from public.categorias order by id limit 1;
  set local role service_role;
  select out_id into v_oc from public.registrar_ocorrencia(v_mun, v_cat,
    'Relato fictício de acompanhamento', 'Descrição fictícia suficientemente longa para o acompanhamento.',
    true, null, null, false, null, v_hash, 'pendente');
  select out_id into v_outro from public.registrar_ocorrencia(v_mun, v_cat,
    'Outro relato fictício de acompanhamento', 'Outra descrição fictícia suficientemente longa para o acompanhamento.',
    true, null, null, false, null, sha256('teste-010-outro'::bytea), 'publicado');
  select * into r from public.acompanhar_por_token(v_hash);
  dto := to_jsonb(r);
  if dto->'out_atualizacoes' is distinct from '[]'::jsonb or dto->'out_respostas' is distinct from '[]'::jsonb then
    raise exception 'FALHOU: relato sem eventos deve retornar arrays vazios';
  end if;
  reset role;

  insert into public.atualizacoes (ocorrencia_id, tipo, texto, publica, criado_em) values
    (v_oc, 'nota', 'Atualização pública posterior', true, '2026-01-02T12:00:00Z'),
    (v_oc, 'resposta_oficial', 'Resposta oficial visível ao titular', true, '2026-01-01T12:00:00Z'),
    (v_oc, 'nota', 'NOTA INTERNA NÃO PODE VAZAR', false, '2026-01-03T12:00:00Z'),
    (v_outro, 'nota', 'OUTRO RELATO NÃO PODE VAZAR', true, '2026-01-01T12:00:00Z');
  insert into public.respostas (ocorrencia_id, autor_vinculo, contato, texto, status, criado_em) values
    (v_oc, 'Vínculo fictício', 'CONTATO NÃO PODE VAZAR', 'Resposta publicada e visível ao titular.', 'publicada', '2026-01-03T12:00:00Z'),
    (v_oc, 'Vínculo pendente', 'contato-pendente', 'RESPOSTA PENDENTE NÃO PODE VAZAR', 'pendente', '2026-01-04T12:00:00Z'),
    (v_oc, 'Vínculo rejeitado', 'contato-rejeitado', 'RESPOSTA REJEITADA NÃO PODE VAZAR', 'rejeitada', '2026-01-05T12:00:00Z'),
    (v_outro, 'Outro vínculo', 'outro-contato', 'RESPOSTA DE OUTRO RELATO NÃO PODE VAZAR', 'publicada', '2026-01-03T12:00:00Z');

  set local role service_role;
  select * into r from public.acompanhar_por_token(v_hash);
  dto := to_jsonb(r);
  if r.out_id is distinct from v_oc or r.out_moderacao <> 'pendente' then
    raise exception 'FALHOU: acompanhamento perdeu o contrato básico do titular';
  end if;
  if jsonb_array_length(dto->'out_atualizacoes') is distinct from 2 then
    raise exception 'FALHOU: acompanhamento deve retornar somente as duas atualizações públicas';
  end if;
  if dto->'out_atualizacoes'->0->>'texto' <> 'Resposta oficial visível ao titular' then
    raise exception 'FALHOU: atualizações devem estar em ordem cronológica';
  end if;
  if jsonb_array_length(dto->'out_respostas') is distinct from 1 then
    raise exception 'FALHOU: acompanhamento deve retornar somente a resposta publicada';
  end if;
  select array_agg(k order by k) into chaves from jsonb_object_keys(dto->'out_atualizacoes'->0) k;
  if chaves <> array['criado_em','evidencia','id','situacao_nova','texto','tipo'] then
    raise exception 'FALHOU: campos inesperados na atualização: %', chaves;
  end if;
  select array_agg(k order by k) into chaves from jsonb_object_keys(dto->'out_respostas'->0) k;
  if chaves <> array['autor_vinculo','criado_em','id','texto'] then
    raise exception 'FALHOU: campos inesperados na resposta: %', chaves;
  end if;
  if dto::text like '%NÃO PODE VAZAR%' or dto::text like '%contato%' or dto::text like '%admin_id%' then
    raise exception 'FALHOU: acompanhamento expôs dado interno ou de outro relato';
  end if;
  select count(*) into n from public.acompanhar_por_token(sha256('teste-010-invalido'::bytea));
  if n <> 0 then raise exception 'FALHOU: token inválido retornou acompanhamento'; end if;
  select count(*) into n from public.acompanhar_por_token(null);
  if n <> 0 then raise exception 'FALHOU: token nulo retornou acompanhamento'; end if;
  begin
    perform public.solicitar_exclusao_por_token(sha256('teste-010-invalido'::bytea), true);
    raise exception 'FALHOU: exclusão aceitou token inválido';
  exception when sqlstate 'P0002' then null; end;
  reset role;
  raise notice 'ok: DTO e isolamento do acompanhamento 010';
end $$;

do $$
declare papel text;
begin
  if not has_function_privilege('service_role', 'public.acompanhar_por_token(bytea)', 'execute') then
    raise exception 'FALHOU: service_role não executa acompanhamento';
  end if;
  foreach papel in array array['anon', 'authenticated'] loop
    if has_function_privilege(papel, 'public.acompanhar_por_token(bytea)', 'execute') then
      raise exception 'FALHOU: % recebeu EXECUTE no acompanhamento', papel;
    end if;
  end loop;
  set local role anon;
  begin
    perform * from public.acompanhar_por_token(sha256('teste-010-titular'::bytea));
    raise exception 'FALHOU: anon executou acompanhamento';
  exception when insufficient_privilege then null; end;
  reset role;
  set local role authenticated;
  begin
    perform * from public.acompanhar_por_token(sha256('teste-010-titular'::bytea));
    raise exception 'FALHOU: authenticated executou acompanhamento';
  exception when insufficient_privilege then null; end;
  reset role;
  raise notice 'ok: privilégios do acompanhamento 010';
end $$;
