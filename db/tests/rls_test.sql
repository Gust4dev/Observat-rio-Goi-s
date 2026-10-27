-- Testes de segurança do banco. Cada bloco aborta com exceção se uma garantia for violada.
-- Executar depois de 00_stub_supabase.sql + 001..004 + 006.

-- ======================================================== fixtures (superusuário)
do $$
declare
  v_mun smallint; v_cat smallint; v_a uuid; v_b uuid; v_img uuid;
begin
  insert into auth.users (id, email) values
    ('00000000-0000-0000-0000-0000000000a1', 'mod@teste'),
    ('00000000-0000-0000-0000-0000000000a2', 'gestor@teste'),
    ('00000000-0000-0000-0000-0000000000a3', 'comum@teste');
  insert into public.administradores (user_id, papel) values
    ('00000000-0000-0000-0000-0000000000a1', 'moderador'),
    ('00000000-0000-0000-0000-0000000000a2', 'gestor');

  insert into public.municipios (ibge_codigo, nome, slug, ativo_acompanhamento) values (5201108, 'Anápolis', 'anapolis', true) returning id into v_mun;
  select id into v_cat from public.categorias where slug = 'saude';

  set local role service_role;
  -- A: publicada, com contato e consentimento
  select out_id into v_a from public.registrar_ocorrencia(
    v_mun, v_cat, 'Falta de médicos no posto', 'Faz três semanas que o posto do bairro está sem clínico geral.',
    false, 'Maria Teste', '+5562999990000', true, 'v1', sha256('tokenA'::bytea), 'publicado', 365);
  -- B: anônima, pendente
  select out_id into v_b from public.registrar_ocorrencia(
    v_mun, v_cat, 'Buraco enorme na rua', 'Há um buraco que já causou acidentes na esquina da avenida principal.',
    true, null, null, false, null, sha256('tokenB'::bytea), 'pendente');
  reset role;

  insert into public.imagens (ocorrencia_id, ordem, caminho_storage, tipo_mime, tamanho_bytes)
    values (v_a, 1, 'q/a1.jpg', 'image/jpeg', 1000) returning id into v_img;

  perform set_config('test.a', v_a::text, true);
  perform set_config('test.b', v_b::text, true);
  perform set_config('test.img', v_img::text, true);
  raise notice 'ok: fixtures';
end $$;

-- ======================================================== anon
do $$
declare n integer;
begin
  set local role anon;

  select count(*) into n from public.v_ocorrencias_publicas;
  if n <> 1 then raise exception 'FALHOU: anon deveria ver 1 ocorrência pública, viu %', n; end if;

  select count(*) into n from public.v_imagens_publicas;
  if n <> 0 then raise exception 'FALHOU: imagem pendente apareceu para anon'; end if;

  begin perform 1 from public.ocorrencias;
    raise exception 'FALHOU: anon leu a tabela ocorrencias';
  exception when insufficient_privilege then null; end;

  begin perform 1 from public.contatos_privados;
    raise exception 'FALHOU: anon leu contatos_privados';
  exception when insufficient_privilege then null; end;

  begin perform 1 from public.tokens_gestao;
    raise exception 'FALHOU: anon leu tokens_gestao';
  exception when insufficient_privilege then null; end;

  begin insert into public.ocorrencias (protocolo, municipio_id, categoria_id, titulo, descricao)
          values ('X', 1, 1, 'titulo ok', 'descricao com mais de vinte caracteres');
    raise exception 'FALHOU: anon inseriu direto em ocorrencias';
  exception when insufficient_privilege then null; end;

  begin perform public.admin_moderar_ocorrencia(current_setting('test.a')::uuid, 'remover', 'x');
    raise exception 'FALHOU: anon executou função admin';
  exception when insufficient_privilege then null; end;

  begin perform * from public.registrar_ocorrencia(1::smallint, 1::smallint, 'titulo ok', 'descricao com mais de vinte caracteres', false, null, null, false, null, sha256('x'::bytea));
    raise exception 'FALHOU: anon executou registrar_ocorrencia';
  exception when insufficient_privilege then null; end;

  begin perform 1 from public.historico_moderacao;
    raise exception 'FALHOU: anon leu o histórico';
  exception when insufficient_privilege then null; end;

  reset role;
  raise notice 'ok: anon';
end $$;

-- views não podem expor colunas sensíveis
do $$
declare cols text;
begin
  select string_agg(column_name, ',') into cols from information_schema.columns
   where table_schema = 'public' and table_name like 'v\_%'
     and column_name in ('nome','whatsapp','contato','token_hash','admin_id','motivo_remocao','anonimo','revisado_por');
  if cols is not null then raise exception 'FALHOU: views expõem colunas sensíveis: %', cols; end if;
  raise notice 'ok: views sem colunas sensíveis';
end $$;

-- matriz de EXECUTE (por introspecção: não depende de a função se proteger sozinha)
do $$
declare f record; erros text := '';
begin
  for f in select p.oid::regprocedure as sig, p.proname from pg_proc p
            where p.pronamespace = 'public'::regnamespace
              and p.proname <> 'rls_auto_enable'   -- função do próprio Supabase, não do projeto
            loop
    if has_function_privilege('anon', f.sig, 'execute') then
      erros := erros || ' anon:' || f.sig; end if;
    if has_function_privilege('authenticated', f.sig, 'execute') <> (f.proname like 'admin\_%') then
      erros := erros || ' authenticated:' || f.sig; end if;
    if has_function_privilege('service_role', f.sig, 'execute') <> (f.proname not like 'admin\_%') then
      erros := erros || ' service_role:' || f.sig; end if;
  end loop;
  if erros <> '' then raise exception 'FALHOU: matriz de EXECUTE incorreta:%', erros; end if;
  raise notice 'ok: matriz de execute';
end $$;

-- ======================================================== authenticated sem papel de admin
do $$
declare n integer;
begin
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a3', true);

  select count(*) into n from public.ocorrencias;
  if n <> 0 then raise exception 'FALHOU: usuário comum viu % ocorrências na tabela', n; end if;

  begin perform 1 from public.contatos_privados;
    raise exception 'FALHOU: usuário comum leu contatos_privados';
  exception when insufficient_privilege then null; end;

  begin perform public.admin_moderar_ocorrencia(current_setting('test.b')::uuid, 'aprovar');
    raise exception 'FALHOU: usuário comum moderou';
  exception when insufficient_privilege then null; end;

  begin insert into public.administradores (user_id, papel) values ('00000000-0000-0000-0000-0000000000a3', 'superadmin');
    raise exception 'FALHOU: usuário comum se promoveu a superadmin';
  exception when insufficient_privilege then null; end;

  reset role;
  raise notice 'ok: authenticated sem papel';
end $$;

-- ======================================================== moderador
do $$
declare n integer; v_a uuid := current_setting('test.a')::uuid; v_b uuid := current_setting('test.b')::uuid;
begin
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);

  select count(*) into n from public.ocorrencias;
  if n <> 2 then raise exception 'FALHOU: moderador deveria ver 2 ocorrências, viu %', n; end if;

  begin update public.ocorrencias set moderacao = 'publicado' where id = v_b;
    raise exception 'FALHOU: moderador atualizou ocorrencias direto';
  exception when insufficient_privilege then null; end;

  begin perform * from public.admin_ver_contato(v_a);
    raise exception 'FALHOU: moderador leu contato';
  exception when insufficient_privilege then null; end;

  select count(*) into n from public.historico_moderacao;
  if n <> 0 then raise exception 'FALHOU: moderador leu histórico'; end if;

  -- aprovar B
  perform public.admin_moderar_ocorrencia(v_b, 'aprovar');
  reset role; set local role anon;
  select count(*) into n from public.v_ocorrencias_publicas;
  if n <> 2 then raise exception 'FALHOU: B aprovada deveria aparecer (n=%)', n; end if;
  reset role; set local role authenticated;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);

  -- remover exige motivo
  begin perform public.admin_moderar_ocorrencia(v_b, 'remover');
    raise exception 'FALHOU: remoção sem motivo foi aceita';
  exception when sqlstate '22023' then null; end;
  perform public.admin_moderar_ocorrencia(v_b, 'remover', 'dado pessoal no texto');

  -- restaurar exige gestor
  begin perform public.admin_moderar_ocorrencia(v_b, 'restaurar', 'engano');
    raise exception 'FALHOU: moderador restaurou';
  exception when insufficient_privilege then null; end;

  -- "resolvido" exige evidência
  begin perform public.admin_atualizar_situacao(v_a, 'resolvido', 'Resolvido');
    raise exception 'FALHOU: resolvido sem evidência foi aceito';
  exception when sqlstate '22023' then null; end;
  perform public.admin_atualizar_situacao(v_a, 'em_atendimento', 'Secretaria confirmou o recebimento');
  perform public.admin_atualizar_situacao(v_a, 'resolvido', 'Médico contratado', 'https://exemplo.gov.br/portaria-123');

  -- aprovar imagem
  perform public.admin_moderar_imagem(current_setting('test.img')::uuid, 'aprovar');

  reset role;
  raise notice 'ok: moderador';
end $$;

-- efeitos visíveis ao público
do $$
declare n integer; s public.situacao_ocorrencia;
begin
  set local role anon;
  select count(*) into n from public.v_ocorrencias_publicas;
  if n <> 1 then raise exception 'FALHOU: B removida ainda aparece (n=%)', n; end if;
  select situacao into s from public.v_ocorrencias_publicas;
  if s <> 'resolvido' then raise exception 'FALHOU: situação pública = %', s; end if;
  select count(*) into n from public.v_atualizacoes_publicas;
  if n <> 2 then raise exception 'FALHOU: linha do tempo pública com % itens', n; end if;
  select count(*) into n from public.v_imagens_publicas;
  if n <> 1 then raise exception 'FALHOU: imagem aprovada não aparece'; end if;
  select resolvidas_documentadas into n from public.v_indicadores_gerais;
  if n <> 1 then raise exception 'FALHOU: indicador de resolvidas = %', n; end if;
  reset role;
  raise notice 'ok: efeitos públicos';
end $$;

-- ======================================================== gestor
do $$
declare n integer; r record; v_a uuid := current_setting('test.a')::uuid; v_b uuid := current_setting('test.b')::uuid;
begin
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a2', true);

  select * into r from public.admin_ver_contato(v_a);
  if r.out_whatsapp is distinct from '+5562999990000' then raise exception 'FALHOU: gestor não leu o contato'; end if;

  select count(*) into n from public.historico_moderacao where acao = 'ver_contato';
  if n <> 1 then raise exception 'FALHOU: leitura de contato não foi registrada'; end if;

  perform public.admin_moderar_ocorrencia(v_b, 'restaurar', 'removida por engano');
  select count(*) into n from public.ocorrencias where id = v_b and moderacao = 'pendente';
  if n <> 1 then raise exception 'FALHOU: restauração não aplicada'; end if;

  begin update public.historico_moderacao set motivo = 'apagado';
    raise exception 'FALHOU: gestor alterou o histórico';
  exception when insufficient_privilege then null; end;

  reset role;
  raise notice 'ok: gestor';
end $$;

-- ======================================================== regras de dados
do $$
declare v_mun smallint := (select id from public.municipios limit 1);
begin
  set local role service_role;
  begin perform * from public.registrar_ocorrencia(v_mun, 1::smallint, 'titulo ok', 'descricao com mais de vinte caracteres',
           true, 'Fulano', null, false, null, sha256('t1'::bytea));
    raise exception 'FALHOU: anônima com nome foi aceita';
  exception when sqlstate '22023' then null; end;

  begin perform * from public.registrar_ocorrencia(v_mun, 1::smallint, 'titulo ok', 'descricao com mais de vinte caracteres',
           false, 'Fulano', '+5562988880000', false, null, sha256('t2'::bytea));
    raise exception 'FALHOU: telefone sem consentimento foi aceito';
  exception when check_violation then null; end;

  begin perform * from public.registrar_ocorrencia(v_mun, 1::smallint, 'abc', 'curta', false, null, null, false, null, sha256('t3'::bytea));
    raise exception 'FALHOU: texto curto aceito';
  exception when check_violation then null; end;
  reset role;

  -- append-only até para o superusuário (gatilho)
  begin update public.historico_moderacao set motivo = 'x';
    raise exception 'FALHOU: histórico alterável';
  exception when insufficient_privilege then null; end;
  begin update public.atualizacoes set texto = 'x';
    raise exception 'FALHOU: linha do tempo alterável';
  exception when insufficient_privilege then null; end;
  begin truncate public.historico_moderacao;
    raise exception 'FALHOU: histórico truncável';
  exception when insufficient_privilege then null; end;

  raise notice 'ok: regras de dados';
end $$;

-- ======================================================== servidor: denúncia, confirmação, token, exclusão
do $$
declare ok boolean; n integer; r record; v_a uuid := current_setting('test.a')::uuid; v_b uuid := current_setting('test.b')::uuid;
        paths text[];
begin
  set local role service_role;

  select public.registrar_confirmacao(v_a, sha256('dispositivo1'::bytea)) into ok;
  if not ok then raise exception 'FALHOU: 1ª confirmação recusada'; end if;
  select public.registrar_confirmacao(v_a, sha256('dispositivo1'::bytea)) into ok;
  if ok then raise exception 'FALHOU: confirmação duplicada aceita'; end if;
  select public.registrar_confirmacao(v_b, sha256('dispositivo1'::bytea)) into ok;
  if ok then raise exception 'FALHOU: confirmou ocorrência não publicada'; end if;
  select public.registrar_denuncia(v_b, 'spam') into ok;
  if ok then raise exception 'FALHOU: denunciou ocorrência não publicada'; end if;
  select public.registrar_denuncia(v_a, 'dado_pessoal', 'tem CPF') into ok;
  if not ok then raise exception 'FALHOU: denúncia recusada'; end if;

  select * into r from public.acompanhar_por_token(sha256('tokenB'::bytea));
  if r.out_id is distinct from v_b or r.out_moderacao <> 'pendente' then raise exception 'FALHOU: acompanhamento por token'; end if;
  select count(*) into n from public.acompanhar_por_token(sha256('token-errado'::bytea));
  if n <> 0 then raise exception 'FALHOU: token errado retornou dados'; end if;

  select public.solicitar_exclusao_por_token(sha256('tokenA'::bytea), true) into paths;
  if paths <> array['q/a1.jpg'] then raise exception 'FALHOU: caminhos de imagem = %', paths; end if;
  reset role;

  select count(*) into n from public.contatos_privados where ocorrencia_id = v_a;
  if n <> 0 then raise exception 'FALHOU: contato não foi apagado'; end if;
  set local role anon;
  select count(*) into n from public.v_ocorrencias_publicas;
  if n <> 0 then raise exception 'FALHOU: conteúdo apagado ainda público (n=%)', n; end if;
  reset role;

  raise notice 'ok: servidor';
end $$;

do $$ begin raise notice 'TODOS OS TESTES PASSARAM'; end $$;
