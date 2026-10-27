-- Observatório Goiás — 002: funções
-- Todas as funções SECURITY DEFINER usam search_path vazio (tudo qualificado).
-- Quem pode chamar o quê é definido em 004 (grants).

-- ================================================================ auxiliares (schema interno)
create function interno.papel_atual() returns public.papel_admin
language sql stable security definer set search_path = '' as $$
  select a.papel from public.administradores a where a.user_id = auth.uid() and a.ativo
$$;

create function interno.eh_admin(p_minimo public.papel_admin) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(interno.papel_atual() >= p_minimo, false)
$$;

create function interno.exige_admin(p_minimo public.papel_admin) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not interno.eh_admin(p_minimo) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
end $$;

create function interno.registra_historico(
  p_ocorrencia uuid, p_acao text, p_motivo text, p_antes jsonb, p_depois jsonb
) returns void language sql security definer set search_path = '' as $$
  insert into public.historico_moderacao (ocorrencia_id, admin_id, acao, motivo, antes, depois)
  values (p_ocorrencia, auth.uid(), p_acao, p_motivo, p_antes, p_depois)
$$;

-- ================================================================ chamadas do servidor (Edge Function, service_role)

-- Cria ocorrência + token + contato (se houver) numa transação. O token é gerado na Edge Function;
-- aqui chega só o SHA-256. A triagem automática define p_moderacao.
create function public.registrar_ocorrencia(
  p_municipio_id smallint, p_categoria_id smallint, p_titulo text, p_descricao text,
  p_anonimo boolean, p_nome text, p_whatsapp text,
  p_consentimento boolean, p_consentimento_versao text, p_token_hash bytea,
  p_moderacao public.moderacao_ocorrencia default 'pendente',
  p_retencao_dias integer default null
) returns table (out_id uuid, out_protocolo text)
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_protocolo text;
  v_tentativas integer := 0;
begin
  if p_moderacao not in ('pendente','publicado','retido') then
    raise exception 'moderação inicial inválida' using errcode = '22023';
  end if;
  if p_anonimo and (p_nome is not null or p_whatsapp is not null) then
    raise exception 'ocorrência anônima não pode ter contato' using errcode = '22023';
  end if;
  if p_token_hash is null or octet_length(p_token_hash) <> 32 then
    raise exception 'token inválido' using errcode = '22023';
  end if;

  loop
    v_protocolo := 'OG-' || to_char(now() at time zone 'America/Sao_Paulo', 'YY') || '-'
                   || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (select 1 from public.ocorrencias o where o.protocolo = v_protocolo);
    v_tentativas := v_tentativas + 1;
    if v_tentativas > 5 then raise exception 'não foi possível gerar protocolo'; end if;
  end loop;

  insert into public.ocorrencias (protocolo, municipio_id, categoria_id, titulo, descricao, anonimo, moderacao, publicado_em)
  values (v_protocolo, p_municipio_id, p_categoria_id, btrim(p_titulo), btrim(p_descricao), p_anonimo,
          p_moderacao, case when p_moderacao = 'publicado' then now() end)
  returning id into v_id;

  insert into public.tokens_gestao (ocorrencia_id, token_hash) values (v_id, p_token_hash);

  if p_nome is not null or p_whatsapp is not null then
    insert into public.contatos_privados
      (ocorrencia_id, nome, whatsapp, consentimento_atualizacoes, consentimento_em, consentimento_versao, expira_em)
    values
      (v_id, nullif(btrim(p_nome), ''), p_whatsapp, coalesce(p_consentimento, false),
       case when coalesce(p_consentimento, false) then now() end,
       case when coalesce(p_consentimento, false) then p_consentimento_versao end,
       case when p_retencao_dias is not null then now() + make_interval(days => p_retencao_dias) end);
  end if;

  out_id := v_id;
  out_protocolo := v_protocolo;
  return next;
end $$;

-- Acompanhamento privado pelo cidadão (inclui estados que ainda não são públicos).
create function public.acompanhar_por_token(p_token_hash bytea)
returns table (out_id uuid, out_protocolo text, out_titulo text, out_situacao public.situacao_ocorrencia,
               out_moderacao public.moderacao_ocorrencia, out_motivo_remocao text,
               out_publicado_em timestamptz, out_criado_em timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  return query
    select o.id, o.protocolo, o.titulo, o.situacao, o.moderacao, o.motivo_remocao, o.publicado_em, o.criado_em
    from public.tokens_gestao t join public.ocorrencias o on o.id = t.ocorrencia_id
    where t.token_hash = p_token_hash;
end $$;

-- Pedido do titular (LGPD): apaga o contato; opcionalmente o conteúdo. Devolve caminhos de arquivos
-- para a Edge Function remover do Storage.
create function public.solicitar_exclusao_por_token(p_token_hash bytea, p_apagar_conteudo boolean default false)
returns text[]
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_paths text[] := '{}';
begin
  select t.ocorrencia_id into v_id from public.tokens_gestao t where t.token_hash = p_token_hash;
  if v_id is null then
    raise exception 'token não encontrado' using errcode = 'P0002';
  end if;

  delete from public.contatos_privados where ocorrencia_id = v_id;

  if p_apagar_conteudo then
    select coalesce(array_agg(i.caminho_storage), '{}') into v_paths from public.imagens i where i.ocorrencia_id = v_id;
    delete from public.imagens where ocorrencia_id = v_id;
    update public.ocorrencias
       set titulo = '[conteúdo removido a pedido do titular]',
           descricao = '[conteúdo removido a pedido do titular]',
           moderacao = 'removido', removido_em = now(),
           motivo_remocao = 'Exclusão solicitada pelo titular'
     where id = v_id;
    insert into public.historico_moderacao (ocorrencia_id, admin_id, acao, motivo)
      values (v_id, null, 'exclusao_titular', 'Contato e conteúdo apagados a pedido do titular');
  else
    insert into public.historico_moderacao (ocorrencia_id, admin_id, acao, motivo)
      values (v_id, null, 'exclusao_contato_titular', 'Contato apagado a pedido do titular');
  end if;
  return v_paths;
end $$;

-- Denúncia de conteúdo. Retorna false se a ocorrência não estiver publicada (não vaza existência).
create function public.registrar_denuncia(p_ocorrencia_id uuid, p_motivo text, p_texto text default null)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.ocorrencias o where o.id = p_ocorrencia_id and o.moderacao = 'publicado') then
    return false;
  end if;
  insert into public.denuncias (ocorrencia_id, motivo, texto) values (p_ocorrencia_id, p_motivo, p_texto);
  return true;
end $$;

-- "Esse problema também me afeta". A chave de deduplicação é calculada na Edge Function
-- (hash com segredo e sal rotativo); a deduplicação é parcial por natureza (ver ADR-0004).
create function public.registrar_confirmacao(p_ocorrencia_id uuid, p_chave_hash bytea)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_n integer;
begin
  if not exists (select 1 from public.ocorrencias o where o.id = p_ocorrencia_id and o.moderacao = 'publicado') then
    return false;
  end if;
  insert into public.confirmacoes (ocorrencia_id, chave_dedup_hash) values (p_ocorrencia_id, p_chave_hash)
    on conflict do nothing;
  get diagnostics v_n = row_count;
  return v_n = 1;
end $$;

-- ================================================================ administração (usuário autenticado + papel)
-- Escritas administrativas só acontecem aqui: nenhuma política de INSERT/UPDATE/DELETE nas tabelas,
-- então é impossível alterar sem deixar rastro em historico_moderacao.

create function public.admin_moderar_ocorrencia(p_id uuid, p_acao text, p_motivo text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_antes public.ocorrencias;
  v_novo public.moderacao_ocorrencia;
begin
  perform interno.exige_admin('moderador');
  select * into v_antes from public.ocorrencias where id = p_id for update;
  if not found then raise exception 'ocorrência não encontrada' using errcode = 'P0002'; end if;

  if v_antes.moderacao = 'removido' and p_acao <> 'restaurar' then
    raise exception 'ocorrência removida: restaure antes' using errcode = '22023';
  end if;

  case p_acao
    when 'aprovar'   then v_novo := 'publicado';
    when 'reter'     then v_novo := 'retido';
    when 'remover'   then v_novo := 'removido';
    when 'restaurar' then
      perform interno.exige_admin('gestor');
      v_novo := 'pendente';
    else raise exception 'ação inválida: %', p_acao using errcode = '22023';
  end case;

  if p_acao <> 'aprovar' and char_length(btrim(coalesce(p_motivo, ''))) = 0 then
    raise exception 'motivo obrigatório' using errcode = '22023';
  end if;

  update public.ocorrencias
     set moderacao      = v_novo,
         publicado_em   = case when v_novo = 'publicado' then coalesce(publicado_em, now()) else publicado_em end,
         removido_em    = case when v_novo = 'removido' then now() end,
         motivo_remocao = case when v_novo = 'removido' then btrim(p_motivo) end
   where id = p_id;

  perform interno.registra_historico(p_id, p_acao, p_motivo,
    jsonb_build_object('moderacao', v_antes.moderacao), jsonb_build_object('moderacao', v_novo));
end $$;

create function public.admin_atualizar_situacao(
  p_id uuid, p_situacao public.situacao_ocorrencia, p_texto text,
  p_evidencia text default null, p_publica boolean default true
) returns void language plpgsql security definer set search_path = '' as $$
declare v_antes public.ocorrencias;
begin
  perform interno.exige_admin('moderador');
  select * into v_antes from public.ocorrencias where id = p_id for update;
  if not found then raise exception 'ocorrência não encontrada' using errcode = 'P0002'; end if;
  if v_antes.moderacao = 'removido' then
    raise exception 'ocorrência removida' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_texto, ''))) = 0 then
    raise exception 'texto obrigatório' using errcode = '22023';
  end if;
  if p_situacao = 'resolvido' and char_length(btrim(coalesce(p_evidencia, ''))) = 0 then
    raise exception '"resolvido" exige justificativa e evidência' using errcode = '22023';
  end if;

  insert into public.atualizacoes (ocorrencia_id, tipo, situacao_nova, texto, evidencia, publica, admin_id)
    values (p_id, 'mudanca_situacao', p_situacao, btrim(p_texto), nullif(btrim(coalesce(p_evidencia, '')), ''), p_publica, auth.uid());
  update public.ocorrencias set situacao = p_situacao where id = p_id;

  perform interno.registra_historico(p_id, 'atualizar_situacao', p_texto,
    jsonb_build_object('situacao', v_antes.situacao), jsonb_build_object('situacao', p_situacao));
end $$;

-- Atualização sem mudança de situação (providência, evidência, resposta oficial, nota)
create function public.admin_adicionar_atualizacao(
  p_id uuid, p_tipo public.tipo_atualizacao, p_texto text,
  p_evidencia text default null, p_publica boolean default true
) returns void language plpgsql security definer set search_path = '' as $$
begin
  perform interno.exige_admin('moderador');
  if p_tipo = 'mudanca_situacao' then
    raise exception 'use admin_atualizar_situacao' using errcode = '22023';
  end if;
  if not exists (select 1 from public.ocorrencias o where o.id = p_id and o.moderacao <> 'removido') then
    raise exception 'ocorrência não encontrada ou removida' using errcode = 'P0002';
  end if;
  insert into public.atualizacoes (ocorrencia_id, tipo, texto, evidencia, publica, admin_id)
    values (p_id, p_tipo, btrim(p_texto), nullif(btrim(coalesce(p_evidencia, '')), ''), p_publica, auth.uid());
  perform interno.registra_historico(p_id, 'adicionar_atualizacao', p_texto, null, jsonb_build_object('tipo', p_tipo));
end $$;

create function public.admin_moderar_imagem(p_imagem_id uuid, p_acao text, p_motivo text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_img public.imagens; v_novo public.moderacao_ocorrencia;
begin
  perform interno.exige_admin('moderador');
  select * into v_img from public.imagens where id = p_imagem_id for update;
  if not found then raise exception 'imagem não encontrada' using errcode = 'P0002'; end if;
  case p_acao
    when 'aprovar' then v_novo := 'publicado';
    when 'remover' then v_novo := 'removido';
    else raise exception 'ação inválida: %', p_acao using errcode = '22023';
  end case;
  if p_acao = 'remover' and char_length(btrim(coalesce(p_motivo, ''))) = 0 then
    raise exception 'motivo obrigatório' using errcode = '22023';
  end if;
  update public.imagens set moderacao = v_novo where id = p_imagem_id;
  perform interno.registra_historico(v_img.ocorrencia_id, 'imagem_' || p_acao, p_motivo,
    jsonb_build_object('imagem', p_imagem_id, 'moderacao', v_img.moderacao), jsonb_build_object('moderacao', v_novo));
end $$;

-- Leitura de dado pessoal: só gestor+, e cada leitura fica registrada.
create function public.admin_ver_contato(p_id uuid)
returns table (out_nome text, out_whatsapp text, out_consentimento_atualizacoes boolean)
language plpgsql security definer set search_path = '' as $$
begin
  perform interno.exige_admin('gestor');
  perform interno.registra_historico(p_id, 'ver_contato', null, null, null);
  return query
    select c.nome, c.whatsapp, c.consentimento_atualizacoes
    from public.contatos_privados c where c.ocorrencia_id = p_id;
end $$;

create function public.admin_resolver_denuncia(p_denuncia_id bigint, p_status public.status_denuncia)
returns void language plpgsql security definer set search_path = '' as $$
declare v_oc uuid;
begin
  perform interno.exige_admin('moderador');
  update public.denuncias
     set status = p_status,
         resolvido_em  = case when p_status in ('procedente','improcedente') then now() end,
         resolvido_por = case when p_status in ('procedente','improcedente') then auth.uid() end
   where id = p_denuncia_id
   returning ocorrencia_id into v_oc;
  if v_oc is null then raise exception 'denúncia não encontrada' using errcode = 'P0002'; end if;
  perform interno.registra_historico(v_oc, 'resolver_denuncia', null, null, jsonb_build_object('status', p_status));
end $$;

create function public.admin_revisar_resposta(p_resposta_id bigint, p_acao text, p_motivo text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_oc uuid; v_novo public.status_resposta;
begin
  perform interno.exige_admin('moderador');
  case p_acao
    when 'publicar' then v_novo := 'publicada';
    when 'rejeitar' then v_novo := 'rejeitada';
    else raise exception 'ação inválida: %', p_acao using errcode = '22023';
  end case;
  if p_acao = 'rejeitar' and char_length(btrim(coalesce(p_motivo, ''))) = 0 then
    raise exception 'motivo obrigatório' using errcode = '22023';
  end if;
  update public.respostas set status = v_novo, revisado_por = auth.uid(), revisado_em = now()
   where id = p_resposta_id returning ocorrencia_id into v_oc;
  if v_oc is null then raise exception 'resposta não encontrada' using errcode = 'P0002'; end if;
  perform interno.registra_historico(v_oc, 'resposta_' || p_acao, p_motivo, null, jsonb_build_object('status', v_novo));
end $$;
