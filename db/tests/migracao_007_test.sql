-- Testes da migração 007. Independente do rls_test.sql (cria os próprios dados).
-- Use dados e usuários de teste; no Supabase real, executar dentro de BEGIN ... ROLLBACK.

do $$
declare v_mun smallint; v_cat smallint;
begin
  insert into auth.users (id, email) values
    ('00000000-0000-0000-0000-0000000000b1', 'mod007@teste'),
    ('00000000-0000-0000-0000-0000000000b3', 'comum007@teste');
  insert into public.administradores (user_id, papel) values ('00000000-0000-0000-0000-0000000000b1', 'moderador');
  insert into public.municipios (ibge_codigo, nome, slug) values (5208707, 'Goiânia Teste', 'goiania-teste-007') returning id into v_mun;
  select id into v_cat from public.categorias where slug = 'transporte';
  perform set_config('t7.mun', v_mun::text, true);
  perform set_config('t7.cat', v_cat::text, true);
  raise notice 'ok: fixtures 007';
end $$;

-- ---------------------------------------------------------------- L2: idempotência
do $$
declare
  v_mun smallint := current_setting('t7.mun')::smallint; v_cat smallint := current_setting('t7.cat')::smallint;
  k uuid := '11111111-1111-1111-1111-111111111111'; r1 record; r2 record; n integer;
begin
  set local role service_role;
  select * into r1 from public.registrar_ocorrencia(v_mun, v_cat, 'Ônibus não passa mais', 'A linha 101 deixou de passar no bairro há duas semanas sem aviso.',
       false, null, null, false, null, sha256('t7-a'::bytea), 'pendente', null, k, sha256('origem-1'::bytea));
  select * into r2 from public.registrar_ocorrencia(v_mun, v_cat, 'Ônibus não passa mais', 'A linha 101 deixou de passar no bairro há duas semanas sem aviso.',
       false, null, null, false, null, sha256('t7-a'::bytea), 'pendente', null, k, sha256('origem-1'::bytea));
  reset role;
  if r1.out_repetida or not r2.out_repetida then raise exception 'FALHOU: flags de repetição incorretas'; end if;
  if r1.out_id <> r2.out_id or r1.out_protocolo <> r2.out_protocolo then raise exception 'FALHOU: repetição criou outra ocorrência'; end if;
  select count(*) into n from public.ocorrencias where chave_idempotencia = k;
  if n <> 1 then raise exception 'FALHOU: % ocorrências para a mesma chave', n; end if;

  -- mesma chave com token diferente: recusa (não devolve protocolo alheio)
  set local role service_role;
  begin
    perform * from public.registrar_ocorrencia(v_mun, v_cat, 'Ônibus não passa mais', 'A linha 101 deixou de passar no bairro há duas semanas sem aviso.',
       false, null, null, false, null, sha256('t7-outro'::bytea), 'pendente', null, k);
    raise exception 'FALHOU: chave reutilizada com outro token foi aceita';
  exception when sqlstate '22023' then null; end;
  reset role;
  raise notice 'ok: idempotência';
end $$;

-- ---------------------------------------------------------------- L1: imagens
do $$
declare
  v_mun smallint := current_setting('t7.mun')::smallint; v_cat smallint := current_setting('t7.cat')::smallint;
  v_oc uuid; v_img uuid; n integer; h bytea := sha256('t7-img'::bytea);
begin
  set local role service_role;
  select out_id into v_oc from public.registrar_ocorrencia(v_mun, v_cat, 'Calçada quebrada na praça', 'A calçada em frente à escola está quebrada e já houve queda de idosos.',
       false, null, null, false, null, h, 'publicado');
  v_img := public.registrar_imagem(h, 1::smallint, 'q/7-1.jpg', 'image/jpeg', 2000);
  perform public.registrar_imagem(h, 2::smallint, 'q/7-2.jpg', 'image/png', 3000);
  perform public.registrar_imagem(h, 3::smallint, 'q/7-3.jpg', 'image/webp', 4000);
  begin perform public.registrar_imagem(h, 4::smallint, 'q/7-4.jpg', 'image/jpeg', 1);
    raise exception 'FALHOU: 4ª foto aceita';
  exception when check_violation then null; end;
  begin perform public.registrar_imagem(h, 1::smallint, 'q/7-x.jpg', 'image/jpeg', 1);
    raise exception 'FALHOU: ordem repetida aceita';
  exception when unique_violation then null; end;
  begin perform public.registrar_imagem(h, 1::smallint, 'q/7-gif.gif', 'image/gif', 1);
    raise exception 'FALHOU: tipo gif aceito';
  exception when check_violation then null; end;
  begin perform public.registrar_imagem(sha256('token-errado'::bytea), 1::smallint, 'q/z.jpg', 'image/jpeg', 1);
    raise exception 'FALHOU: token errado aceito';
  exception when sqlstate 'P0002' then null; end;
  reset role;

  set local role anon;
  select count(*) into n from public.v_imagens_publicas where ocorrencia_id = v_oc;
  reset role;
  if n <> 0 then raise exception 'FALHOU: foto pendente apareceu para o público'; end if;
  select count(*) into n from public.imagens where ocorrencia_id = v_oc and moderacao = 'pendente';
  if n <> 3 then raise exception 'FALHOU: fotos deveriam nascer pendentes'; end if;
  perform set_config('t7.oc_img', v_oc::text, true);
  raise notice 'ok: imagens';
end $$;

-- ---------------------------------------------------------------- L6 + L8: sinais de triagem
do $$
declare
  v_mun smallint := current_setting('t7.mun')::smallint; v_cat smallint := current_setting('t7.cat')::smallint;
  s record; i integer; o bytea := sha256('origem-ruim'::bytea);
begin
  set local role service_role;
  -- texto repetido (mesmo conteúdo, caixa e espaços diferentes)
  select * into s from public.triagem_sinais('ÔNIBUS  não passa mais', 'A linha 101 deixou de passar no bairro há duas semanas sem aviso.', null);
  if not s.out_texto_repetido then raise exception 'FALHOU: texto repetido não detectado'; end if;
  select * into s from public.triagem_sinais('Assunto inédito aqui', 'Descrição completamente diferente de qualquer outra anterior.', null);
  if s.out_texto_repetido then raise exception 'FALHOU: falso positivo de texto repetido'; end if;

  -- origem sinalizada após 3 relatos retidos/removidos
  for i in 1..3 loop
    perform * from public.registrar_ocorrencia(v_mun, v_cat, 'Relato retido número ' || i, 'Texto suficientemente longo para o relato retido número ' || i,
        false, null, null, false, null, sha256(('t7-ruim-' || i)::bytea), 'retido', null, null, o);
  end loop;
  select * into s from public.triagem_sinais('x titulo', 'x descricao com tamanho', o, interval '7 days', 3);
  if not s.out_origem_sinalizada then raise exception 'FALHOU: origem não sinalizada'; end if;
  select * into s from public.triagem_sinais('x titulo', 'x descricao com tamanho', sha256('origem-boa'::bytea), interval '7 days', 3);
  if s.out_origem_sinalizada then raise exception 'FALHOU: origem boa sinalizada'; end if;
  select * into s from public.triagem_sinais('x titulo', 'x descricao com tamanho', o, interval '7 days', 4);
  if s.out_origem_sinalizada then raise exception 'FALHOU: limiar ignorado'; end if;
  reset role;
  raise notice 'ok: sinais de triagem';
end $$;

-- ---------------------------------------------------------------- L4: limite de taxa
do $$
declare ok1 boolean; ok2 boolean; ok3 boolean; ok4 boolean; outro boolean;
begin
  set local role service_role;
  select public.consumir_limite(sha256('rota-a|origem-1'::bytea), interval '1 minute', 3) into ok1;
  select public.consumir_limite(sha256('rota-a|origem-1'::bytea), interval '1 minute', 3) into ok2;
  select public.consumir_limite(sha256('rota-a|origem-1'::bytea), interval '1 minute', 3) into ok3;
  select public.consumir_limite(sha256('rota-a|origem-1'::bytea), interval '1 minute', 3) into ok4;
  select public.consumir_limite(sha256('rota-a|origem-2'::bytea), interval '1 minute', 3) into outro;
  begin perform public.consumir_limite(sha256('x'::bytea), interval '0 seconds', 3);
    raise exception 'FALHOU: janela zero aceita';
  exception when sqlstate '22023' then null; end;
  reset role;
  if not (ok1 and ok2 and ok3) then raise exception 'FALHOU: dentro do limite foi negado'; end if;
  if ok4 then raise exception 'FALHOU: 4ª chamada deveria estourar o limite'; end if;
  if not outro then raise exception 'FALHOU: limite de uma origem afetou outra'; end if;

  set local role anon;
  begin perform 1 from interno.limites_taxa;
    raise exception 'FALHOU: anon enxerga limites_taxa';
  exception when insufficient_privilege then null; end;
  reset role;
  raise notice 'ok: limite de taxa';
end $$;

-- ---------------------------------------------------------------- L3: direito de resposta
do $$
declare v_oc uuid := current_setting('t7.oc_img')::uuid; ok boolean; n integer; v_rid bigint;
begin
  set local role service_role;
  select public.registrar_resposta(v_oc, 'Secretaria de Obras', 'obras@exemplo.gov.br', 'A calçada será refeita na próxima semana.') into ok;
  if not ok then raise exception 'FALHOU: resposta recusada'; end if;
  select public.registrar_resposta('00000000-0000-0000-0000-00000000dead', 'X', 'x@x.com', 'Texto de resposta longo o suficiente.') into ok;
  if ok then raise exception 'FALHOU: respondeu a ocorrência inexistente'; end if;
  reset role;

  set local role anon;
  select count(*) into n from public.v_respostas_publicas;
  reset role;
  if n <> 0 then raise exception 'FALHOU: resposta pendente ficou pública'; end if;

  select id into v_rid from public.respostas where ocorrencia_id = v_oc;
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', true);
  perform public.admin_revisar_resposta(v_rid, 'publicar');
  reset role;

  set local role anon;
  select count(*) into n from public.v_respostas_publicas where ocorrencia_id = v_oc;
  reset role;
  if n <> 1 then raise exception 'FALHOU: resposta publicada não apareceu'; end if;
  raise notice 'ok: direito de resposta';
end $$;

-- ---------------------------------------------------------------- L7: fila de moderação
do $$
declare n integer; r record; v_oc uuid := current_setting('t7.oc_img')::uuid;
begin
  set local role anon;
  begin perform 1 from public.v_fila_moderacao;
    raise exception 'FALHOU: anon leu a fila';
  exception when insufficient_privilege then null; end;
  reset role;

  set local role authenticated;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b3', true);
  select count(*) into n from public.v_fila_moderacao;
  reset role;
  if n <> 0 then raise exception 'FALHOU: usuário sem papel viu % itens da fila', n; end if;

  set local role authenticated;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', true);
  select count(*) into n from public.v_fila_moderacao;
  select * into r from public.v_fila_moderacao where id = v_oc;
  reset role;
  if n < 4 then raise exception 'FALHOU: moderador viu só % itens da fila', n; end if;
  if r.id is null or r.imagens_pendentes <> 3 then raise exception 'FALHOU: ocorrência publicada com 3 fotos pendentes deveria estar na fila'; end if;
  raise notice 'ok: fila de moderação';
end $$;

-- ---------------------------------------------------------------- L5: retenção
do $$
declare
  v_mun smallint := current_setting('t7.mun')::smallint; v_cat smallint := current_setting('t7.cat')::smallint;
  v_oc uuid; res jsonb; n integer;
begin
  set local role service_role;
  select out_id into v_oc from public.registrar_ocorrencia(v_mun, v_cat, 'Falta de água no bairro', 'Há cinco dias o bairro está sem abastecimento de água regular.',
       false, 'Maria Retenção', '+5562977770000', true, 'v1', sha256('t7-ret'::bytea), 'publicado', 30, null, sha256('origem-velha'::bytea));
  reset role;

  -- envelhece: contato vencido e ocorrência com mais de 30 dias
  update public.contatos_privados set expira_em = now() - interval '1 day' where ocorrencia_id = v_oc;
  update public.ocorrencias set criado_em = now() - interval '40 days' where id = v_oc;

  res := interno.limpar_expirados();
  if (res->>'contatos_apagados')::int < 1 then raise exception 'FALHOU: contato vencido não apagado: %', res; end if;
  if (res->>'hashes_limpos')::int < 1 then raise exception 'FALHOU: hashes antigos não limpos: %', res; end if;

  select count(*) into n from public.contatos_privados where ocorrencia_id = v_oc;
  if n <> 0 then raise exception 'FALHOU: contato continua na tabela'; end if;
  select count(*) into n from public.historico_moderacao where ocorrencia_id = v_oc and acao = 'retencao_contato_expirado';
  if n <> 1 then raise exception 'FALHOU: apagamento sem registro no histórico'; end if;
  select count(*) into n from public.ocorrencias where id = v_oc and origem_hash is null and texto_hash is null;
  if n <> 1 then raise exception 'FALHOU: hashes não foram zerados'; end if;
  select count(*) into n from public.ocorrencias where id = v_oc and atualizado_em >= now() - interval '1 minute';
  raise notice 'ok: retenção (atualizado_em recente após limpeza: %)', n;

  -- anon/authenticated não executam a rotina
  set local role anon;
  begin perform interno.limpar_expirados();
    raise exception 'FALHOU: anon executou limpar_expirados';
  exception when insufficient_privilege then null; end;
  reset role;
end $$;

do $$ begin raise notice 'TESTES DA 007 PASSARAM'; end $$;
