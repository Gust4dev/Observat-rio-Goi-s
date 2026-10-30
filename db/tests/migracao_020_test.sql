begin;
do $$
declare
  v_municipio smallint;
  v_categoria smallint;
  v_ocorrencia uuid;
  v_imagem uuid;
  v_resultado jsonb;
  v_contagem integer;
  v_prefix text := replace(gen_random_uuid()::text, '-', '');
begin
  if not exists (select 1 from interno.configuracao_retencao where chave='imagens_rejeitadas_retidas_dias' and valor_dias=365) then
    raise exception 'padrão provisório de retenção não aplicado';
  end if;
  insert into public.municipios(ibge_codigo,nome,slug)
    values ('5299911','Teste retenção','teste-retencao-020') on conflict (ibge_codigo) do update set nome=excluded.nome returning id into v_municipio;
  select id into v_categoria from public.categorias order by id limit 1;

  insert into public.ocorrencias(protocolo,municipio_id,categoria_id,titulo,descricao)
    values ('T20-'||v_prefix,v_municipio,v_categoria,'Relato retenção','Descrição fictícia para teste de retenção') returning id into v_ocorrencia;
  insert into public.imagens(ocorrencia_id,ordem,caminho_storage,tipo_mime,tamanho_bytes,moderacao,criado_em,hash_entrada,descricao_contexto)
    values(v_ocorrencia,1,v_prefix||'/1/'||repeat('a',64)||'.jpg','image/jpeg',1024,'retido',now()-interval '400 days',repeat('b',64),'Contexto fictício');
  select id into v_imagem from public.imagens where ocorrencia_id=v_ocorrencia;

  insert into public.ocorrencias(protocolo,municipio_id,categoria_id,titulo,descricao)
    values ('T20-'||substring(v_prefix,1,30)||'1',v_municipio,v_categoria,'Relato lease','Descrição fictícia para teste de lease') returning id into v_ocorrencia;
  insert into public.imagens(ocorrencia_id,ordem,caminho_storage,tipo_mime,tamanho_bytes,moderacao,criado_em,operacao_admin_ate)
    values(v_ocorrencia,1,v_prefix||'/2/'||repeat('c',64)||'.jpg','image/jpeg',1024,'removido',now()-interval '400 days',now()+interval '5 minutes');

  insert into public.ocorrencias(protocolo,municipio_id,categoria_id,titulo,descricao)
    values ('T20-'||substring(v_prefix,1,30)||'2',v_municipio,v_categoria,'Relato recente','Descrição fictícia para teste recente') returning id into v_ocorrencia;
  insert into public.imagens(ocorrencia_id,ordem,caminho_storage,tipo_mime,tamanho_bytes,moderacao,criado_em)
    values(v_ocorrencia,1,v_prefix||'/3/'||repeat('d',64)||'.jpg','image/jpeg',1024,'removido',now()-interval '100 days');

  v_resultado := interno.limpar_expirados();
  if (v_resultado->>'imagens_expiradas')::integer <> 1 then raise exception 'quantidade expirada incorreta: %',v_resultado; end if;
  if (v_resultado->>'retencao_imagens_dias')::integer <> 365 then raise exception 'prazo padrão incorreto'; end if;
  if not exists(select 1 from public.imagens where id=v_imagem and caminho_storage is null and hash_entrada is null and descricao_contexto is null and retencao_expirada_em is not null) then
    raise exception 'conteúdo da foto não foi desreferenciado ao expirar';
  end if;
  if exists(select 1 from public.imagens where caminho_storage=v_prefix||'/2/'||repeat('c',64)||'.jpg' and retencao_expirada_em is not null) then raise exception 'lease ativo foi limpo'; end if;
  if exists(select 1 from public.imagens where caminho_storage=v_prefix||'/3/'||repeat('d',64)||'.jpg' and retencao_expirada_em is not null) then raise exception 'foto dentro do prazo foi limpa'; end if;

  update interno.configuracao_retencao set valor_dias=90 where chave='imagens_rejeitadas_retidas_dias';
  insert into public.ocorrencias(protocolo,municipio_id,categoria_id,titulo,descricao)
    values ('T20-'||substring(v_prefix,1,30)||'3',v_municipio,v_categoria,'Relato prazo alterado','Descrição fictícia para teste de prazo alterado') returning id into v_ocorrencia;
  insert into public.imagens(ocorrencia_id,ordem,caminho_storage,tipo_mime,tamanho_bytes,moderacao,criado_em)
    values(v_ocorrencia,1,v_prefix||'/1/'||repeat('e',64)||'.jpg','image/jpeg',1024,'retido',now()-interval '100 days');
  v_resultado := interno.limpar_expirados();
  if (v_resultado->>'imagens_expiradas')::integer <> 2 or (v_resultado->>'retencao_imagens_dias')::integer <> 90 then raise exception 'prazo configurado não foi aplicado'; end if;

  if has_function_privilege('anon','interno.limpar_expirados()','execute') or has_function_privilege('authenticated','interno.limpar_expirados()','execute') then
    raise exception 'rotina exposta a papel público';
  end if;
end $$;
rollback;
