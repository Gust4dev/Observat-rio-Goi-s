begin;
do $$
declare
  u uuid:=gen_random_uuid(); g uuid:=gen_random_uuid();
  a uuid:='11111111-1111-4111-8111-111111111111'; b uuid:='22222222-2222-4222-8222-222222222222';
  t timestamptz:='2026-01-01T00:00:00Z'; d bigint; r bigint; resultado jsonb;
  linha text; plano text; tabela text; legado text;
begin
  insert into auth.users(id,email) values(u,'mod025@test.invalid'),(g,'gestor025@test.invalid');
  insert into public.administradores(user_id,papel) values(u,'moderador'),(g,'gestor');
  insert into public.municipios(ibge_codigo,nome,slug) values(5299925,'Município fictício 025','municipio-fila-025');
  insert into public.ocorrencias(id,protocolo,municipio_id,categoria_id,titulo,descricao,criado_em)
  select v.id,v.protocolo,m.id,c.id,'Relato fictício','Descrição fictícia suficiente para teste administrativo.',t
  from (values(a,'FILA-025-A'),(b,'FILA-025-B')) v(id,protocolo)
  cross join (select id from public.municipios where slug='municipio-fila-025') m
  cross join (select id from public.categorias order by id limit 1) c;
  insert into public.denuncias(ocorrencia_id,motivo) values(a,'duplicado') returning id into d;
  insert into public.respostas(ocorrencia_id,autor_vinculo,contato,texto)
    values(a,'Órgão fictício','contato-ficticio-omitido','Resposta fictícia suficiente') returning id into r;
  insert into public.atualizacoes(ocorrencia_id,tipo,texto,publica)
    values(a,'nota','nota-privada-omitida',false);
  insert into public.imagens(ocorrencia_id,ordem,caminho_storage,tipo_mime,tamanho_bytes)
  select a, n, 'caminho-privado-omitido-'||n,'image/jpeg',100 from generate_series(1,3) n;

  perform set_config('request.jwt.claim.sub',u::text,true);
  perform set_config('request.jwt.claims','{"aal":"aal1"}',true);
  set local role authenticated;
  begin perform public.admin_resumo_fila(); raise exception 'AAL1 acessou fila'; exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claims','{"aal":"aal2"}',true);
  perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
  begin perform public.admin_detalhar_ocorrencia(a); raise exception 'conta sem papel acessou detalhe'; exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claim.sub',u::text,true);

  resultado:=public.admin_pagina_fila(1,'antigos',t);
  if jsonb_array_length(resultado)<>2 or resultado->0->>'id'<>a::text then raise exception 'página inicial ou sentinela incorreta'; end if;
  resultado:=public.admin_pagina_fila(1,'antigos',t,t,a);
  if jsonb_array_length(resultado)<>1 or resultado->0->>'id'<>b::text then raise exception 'cursor não desempata por ID'; end if;
  resultado:=public.admin_pagina_fila(1,'recentes',t,p_denuncia=>true);
  if jsonb_array_length(resultado)<>1 or resultado->0->>'id'<>a::text or (resultado->0->>'denuncias_abertas')::int<>1 then raise exception 'filtro de denúncias excluiu origem nula'; end if;
  begin perform public.admin_pagina_fila(101,'recentes',t); raise exception 'página acima do teto aceita'; exception when invalid_parameter_value then null; end;
  resultado:=public.admin_resumo_fila();
  if resultado->>'com_denuncias'<>'1' or resultado->>'com_fotos_pendentes'<>'1' or resultado->>'calculado_em' is null then raise exception 'resumo incorreto'; end if;

  resultado:=public.admin_detalhar_ocorrencia(a);
  if resultado->'resumos'->>'tem_atualizacoes' is distinct from 'false' then
    raise exception 'resumo revelou existência de atualização privada';
  end if;
  if jsonb_array_length(resultado->'imagens')<>3
     or resultado ?| array['denuncias','respostas','atualizacoes']
     or resultado::text ~ 'contato-ficticio-omitido|caminho-privado-omitido|origem_hash|caminho_storage'
  then raise exception 'detalhe não é limitado ou expõe campos privados'; end if;
  perform public.admin_moderar_ocorrencia(a,'reter',1,'decisão vencedora');
  perform set_config('request.jwt.claim.sub',g::text,true);
  begin perform public.admin_moderar_ocorrencia(a,'aprovar',1); raise exception 'versão antiga sobrescreveu decisão'; exception when sqlstate 'PT409' then null; end;
  begin perform public.admin_moderar_lote(array[b,a],'aprovar',array[1,1]); raise exception 'lote aceitou versão antiga'; exception when sqlstate 'PT409' then null; end;
  perform public.admin_resolver_denuncia(d,'procedente',1);
  begin perform public.admin_resolver_denuncia(d,'improcedente',1); raise exception 'decisão de denúncia sobrescrita'; exception when sqlstate 'PT409' then null; end;
  perform public.admin_revisar_resposta(r,'rejeitar',1,'motivo vencedor');
  begin perform public.admin_revisar_resposta(r,'publicar',1); raise exception 'decisão de resposta sobrescrita'; exception when sqlstate 'PT409' then null; end;
  begin perform public.admin_atualizar_situacao(a,'em_analise','Texto de teste',1); raise exception 'mudança de situação aceitou versão anterior'; exception when sqlstate 'PT409' then null; end;
  begin perform public.admin_mesclar_duplicata(b,a,'Motivo fictício',1,1); raise exception 'mescla aceitou versão anterior do destino'; exception when sqlstate 'PT409' then null; end;
  reset role;

  if (select count(*) from public.historico_moderacao where ocorrencia_id=a)<>3
     or not exists (select 1 from public.historico_moderacao where ocorrencia_id=a and acao='reter' and motivo='decisão vencedora')
     or exists (select 1 from public.historico_moderacao where ocorrencia_id=b)
     or (select moderacao from public.ocorrencias where id=a)<>'retido'
     or (select moderacao from public.ocorrencias where id=b)<>'pendente'
  then raise exception 'conflito mudou estado/auditoria ou lote não foi atômico'; end if;
  foreach legado in array array[
    'admin_moderar_ocorrencia(uuid,text,text,text)',
    'admin_atualizar_situacao(uuid,public.situacao_ocorrencia,text,text,boolean)',
    'admin_resolver_denuncia(bigint,public.status_denuncia)',
    'admin_revisar_resposta(bigint,text,text)',
    'admin_mesclar_duplicata(uuid,uuid,text)'
  ] loop
    if to_regprocedure('public.'||legado) is not null
       or has_function_privilege('authenticated','interno.'||legado,'execute')
    then raise exception 'assinatura antiga acessível: %',legado; end if;
  end loop;
  if has_function_privilege('anon','public.admin_detalhar_ocorrencia(uuid)','execute')
     or to_regprocedure('public.admin_moderar_lote(uuid[],text,text)') is not null
  then raise exception 'grant expõe RPC'; end if;

  -- Fixtures pequenas favorecem varredura sequencial. Desabilite-a localmente
  -- para provar que os índices atendem às condições e à ordem das consultas.
  perform set_config('enable_seqscan','off',true);
  plano:='';
  for linha in explain (costs off)
    select o.id,o.criado_em from public.ocorrencias o
    where o.moderacao<>'removido' and o.criado_em<=t and (o.criado_em,o.id)>(t,a)
      and (o.moderacao in ('pendente','retido')
        or exists(select 1 from public.imagens i where i.ocorrencia_id=o.id and i.moderacao='pendente')
        or exists(select 1 from public.denuncias x where x.ocorrencia_id=o.id and x.status in ('aberta','em_analise')))
    order by o.criado_em,o.id limit 2
  loop plano:=plano||E'\n'||linha; end loop;
  if plano not like '%ocorrencias_fila_keyset_idx%' or plano not like '%denuncias_pendentes_ocorrencia_idx%' then
    raise exception 'índices não atendem ao plano da fila: %',plano;
  end if;
  foreach tabela in array array['denuncias','respostas','atualizacoes'] loop
    plano:='';
    for linha in execute format(
      'explain (costs off) select id,criado_em from public.%I where ocorrencia_id=$1 and (criado_em,id)<($2,$3) order by criado_em desc,id desc limit 2',tabela)
      using a,t,d
    loop plano:=plano||E'\n'||linha; end loop;
    if plano not like '%'||tabela||'_ocorrencia_keyset_idx%' or plano like '%Sort%' then
      raise exception 'índice não atende à paginação de %: %',tabela,plano;
    end if;
  end loop;
end $$;
rollback;
