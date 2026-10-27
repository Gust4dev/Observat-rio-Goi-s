-- Observatório Goiás — 007: lacunas do desenho geral (L1–L8)
-- L1 registrar_imagem · L2 idempotência · L3 registrar_resposta · L4 limite de taxa
-- L5 retenção · L6 texto repetido · L7 fila de moderação · L8 origem sinalizada
--
-- Funções e views novas recebem REVOKE explícito: não dependemos de privilégios padrão do ambiente.

-- ================================================================ colunas (L2, L6, L8)
alter table public.ocorrencias
  add column chave_idempotencia uuid unique,   -- gerada no cliente; repetição devolve a mesma ocorrência
  add column texto_hash         bytea,         -- SHA-256 do texto normalizado (detecção de repetição)
  add column origem_hash        bytea;         -- HMAC da origem calculado no servidor; nunca IP em claro
create index ocorrencias_texto_hash_idx  on public.ocorrencias (texto_hash,  criado_em) where texto_hash  is not null;
create index ocorrencias_origem_hash_idx on public.ocorrencias (origem_hash, criado_em) where origem_hash is not null;

-- atualizado_em só muda quando o conteúdo público muda (a limpeza de hashes não deve "atualizar" a ocorrência)
drop trigger ocorrencias_atualizado_em on public.ocorrencias;
create trigger ocorrencias_atualizado_em
  before update of titulo, descricao, situacao, moderacao, verificado, motivo_remocao on public.ocorrencias
  for each row execute function interno.toca_atualizado_em();

create function interno.hash_texto(p_titulo text, p_descricao text) returns bytea
language sql immutable set search_path = '' as $$
  select sha256(convert_to(lower(regexp_replace(btrim(p_titulo || ' ' || p_descricao), '\s+', ' ', 'g')), 'UTF8'))
$$;

-- ================================================================ L4: limite de taxa (janela fixa)
create table interno.limites_taxa (
  chave          bytea       not null,      -- o servidor compõe: HMAC(endpoint || origem)
  janela_inicio  timestamptz not null,
  contagem       integer     not null default 0,
  primary key (chave, janela_inicio)
);
alter table interno.limites_taxa enable row level security;   -- sem políticas; schema não exposto
revoke all on interno.limites_taxa from public, anon, authenticated;

-- true = dentro do limite; false = estourou. Os valores de janela/máximo vêm do servidor (não públicos).
create function public.consumir_limite(p_chave bytea, p_janela interval, p_maximo integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_seg    double precision := extract(epoch from p_janela);
  v_inicio timestamptz;
  v_n      integer;
begin
  if p_chave is null or v_seg < 1 or p_maximo < 1 then
    raise exception 'parâmetros inválidos' using errcode = '22023';
  end if;
  v_inicio := to_timestamp(floor(extract(epoch from now()) / v_seg) * v_seg);
  insert into interno.limites_taxa as l (chave, janela_inicio, contagem)
    values (p_chave, v_inicio, 1)
  on conflict (chave, janela_inicio) do update set contagem = l.contagem + 1
  returning contagem into v_n;
  return v_n <= p_maximo;
end $$;

-- ================================================================ L2 + L6 + L8: registrar_ocorrencia v2
drop function public.registrar_ocorrencia(smallint, smallint, text, text, boolean, text, text, boolean, text, bytea, public.moderacao_ocorrencia, integer);

create function public.registrar_ocorrencia(
  p_municipio_id smallint, p_categoria_id smallint, p_titulo text, p_descricao text,
  p_anonimo boolean, p_nome text, p_whatsapp text,
  p_consentimento boolean, p_consentimento_versao text, p_token_hash bytea,
  p_moderacao public.moderacao_ocorrencia default 'pendente',
  p_retencao_dias integer default null,
  p_chave_idempotencia uuid default null,
  p_origem_hash bytea default null
) returns table (out_id uuid, out_protocolo text, out_repetida boolean)
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_protocolo text;
  v_tentativas integer := 0;
  v_ex record;
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

  -- repetição da mesma requisição (rede ruim no celular): devolve a existente
  if p_chave_idempotencia is not null then
    select o.id as id, o.protocolo as protocolo, t.token_hash as token_hash into v_ex
      from public.ocorrencias o join public.tokens_gestao t on t.ocorrencia_id = o.id
     where o.chave_idempotencia = p_chave_idempotencia;
    if found then
      if v_ex.token_hash <> p_token_hash then
        raise exception 'chave de idempotência já usada' using errcode = '22023';
      end if;
      out_id := v_ex.id; out_protocolo := v_ex.protocolo; out_repetida := true;
      return next; return;
    end if;
  end if;

  loop
    v_protocolo := 'OG-' || to_char(now() at time zone 'America/Sao_Paulo', 'YY') || '-'
                   || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (select 1 from public.ocorrencias o where o.protocolo = v_protocolo);
    v_tentativas := v_tentativas + 1;
    if v_tentativas > 5 then raise exception 'não foi possível gerar protocolo'; end if;
  end loop;

  begin
    insert into public.ocorrencias
      (protocolo, municipio_id, categoria_id, titulo, descricao, anonimo, moderacao, publicado_em,
       chave_idempotencia, texto_hash, origem_hash)
    values
      (v_protocolo, p_municipio_id, p_categoria_id, btrim(p_titulo), btrim(p_descricao), p_anonimo,
       p_moderacao, case when p_moderacao = 'publicado' then now() end,
       p_chave_idempotencia, interno.hash_texto(p_titulo, p_descricao), p_origem_hash)
    returning id into v_id;
  exception when unique_violation then
    -- corrida: outra requisição com a mesma chave acabou de gravar
    if p_chave_idempotencia is null then raise; end if;
    select o.id as id, o.protocolo as protocolo, t.token_hash as token_hash into v_ex
      from public.ocorrencias o join public.tokens_gestao t on t.ocorrencia_id = o.id
     where o.chave_idempotencia = p_chave_idempotencia;
    if not found or v_ex.token_hash <> p_token_hash then raise; end if;
    out_id := v_ex.id; out_protocolo := v_ex.protocolo; out_repetida := true;
    return next; return;
  end;

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

  out_id := v_id; out_protocolo := v_protocolo; out_repetida := false;
  return next;
end $$;

-- Sinais para a triagem automática. Os limiares chegam do servidor (não ficam documentados publicamente).
create function public.triagem_sinais(
  p_titulo text, p_descricao text, p_origem_hash bytea,
  p_janela interval default interval '7 days', p_limite_origem integer default 3
) returns table (out_texto_repetido boolean, out_origem_sinalizada boolean)
language plpgsql stable security definer set search_path = '' as $$
declare v_hash bytea := interno.hash_texto(p_titulo, p_descricao);
begin
  out_texto_repetido := exists (
    select 1 from public.ocorrencias o where o.texto_hash = v_hash and o.criado_em > now() - p_janela);
  out_origem_sinalizada := p_origem_hash is not null and (
    select count(*) from public.ocorrencias o
     where o.origem_hash = p_origem_hash and o.criado_em > now() - p_janela
       and o.moderacao in ('retido','removido')) >= p_limite_origem;
  return next;
end $$;

-- ================================================================ L1: fotos de uma ocorrência
create function public.registrar_imagem(
  p_token_hash bytea, p_ordem smallint, p_caminho text, p_mime text, p_tamanho integer
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_oc public.ocorrencias; v_id uuid;
begin
  select o.* into v_oc
    from public.tokens_gestao t join public.ocorrencias o on o.id = t.ocorrencia_id
   where t.token_hash = p_token_hash;
  if not found then raise exception 'token não encontrado' using errcode = 'P0002'; end if;
  if v_oc.moderacao = 'removido' then raise exception 'ocorrência removida' using errcode = '22023'; end if;
  insert into public.imagens (ocorrencia_id, ordem, caminho_storage, tipo_mime, tamanho_bytes)
    values (v_oc.id, p_ordem, p_caminho, p_mime, p_tamanho)
  returning id into v_id;
  return v_id;
end $$;

-- ================================================================ L3: direito de resposta
create function public.registrar_resposta(p_ocorrencia_id uuid, p_vinculo text, p_contato text, p_texto text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.ocorrencias o where o.id = p_ocorrencia_id and o.moderacao = 'publicado') then
    return false;
  end if;
  insert into public.respostas (ocorrencia_id, autor_vinculo, contato, texto)
    values (p_ocorrencia_id, btrim(p_vinculo), btrim(p_contato), btrim(p_texto));
  return true;
end $$;

-- ================================================================ L5: retenção
-- Prazos: contatos pelo `expira_em` de cada um (o padrão ainda será definido); hashes de triagem, 30 dias;
-- contadores de limite, 2 dias. Cada contato apagado deixa uma linha no histórico.
create function interno.limpar_expirados() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_contatos integer; v_hashes integer; v_limites integer;
begin
  with apagados as (
    delete from public.contatos_privados where expira_em is not null and expira_em < now()
    returning ocorrencia_id)
  insert into public.historico_moderacao (ocorrencia_id, admin_id, acao, motivo)
    select ocorrencia_id, null, 'retencao_contato_expirado', 'Contato apagado por fim do prazo de retenção'
      from apagados;
  get diagnostics v_contatos = row_count;

  update public.ocorrencias set origem_hash = null, texto_hash = null
   where (origem_hash is not null or texto_hash is not null) and criado_em < now() - interval '30 days';
  get diagnostics v_hashes = row_count;

  delete from interno.limites_taxa where janela_inicio < now() - interval '2 days';
  get diagnostics v_limites = row_count;

  return jsonb_build_object('contatos_apagados', v_contatos, 'hashes_limpos', v_hashes, 'limites_apagados', v_limites);
end $$;
revoke all on function interno.limpar_expirados() from public, anon, authenticated;

-- Agendamento diário (03:00 em Brasília = 06:00 UTC) quando o pg_cron existe (Supabase). No teste local é ignorado.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('limpeza-diaria', '0 6 * * *', 'select interno.limpar_expirados()');
  else
    raise notice 'pg_cron indisponível: agendar interno.limpar_expirados() por outro meio';
  end if;
end $$;

-- ================================================================ L7: fila de moderação (admin)
-- security_invoker: vale a RLS de quem consulta; sem papel, a view devolve zero linhas.
create view public.v_fila_moderacao with (security_invoker = true) as
select o.id, o.protocolo, m.nome as municipio_nome, c.nome as categoria_nome,
       o.titulo, o.descricao, o.situacao, o.moderacao, o.criado_em,
       (select count(*) from public.imagens i where i.ocorrencia_id = o.id and i.moderacao = 'pendente')::integer as imagens_pendentes,
       (select count(*) from public.denuncias d where d.ocorrencia_id = o.id and d.status in ('aberta','em_analise'))::integer as denuncias_abertas
  from public.ocorrencias o
  join public.municipios m on m.id = o.municipio_id
  join public.categorias c on c.id = o.categoria_id
 where o.moderacao <> 'removido'
   and (o.moderacao in ('pendente','retido')
        or exists (select 1 from public.imagens i where i.ocorrencia_id = o.id and i.moderacao = 'pendente')
        or exists (select 1 from public.denuncias d where d.ocorrencia_id = o.id and d.status in ('aberta','em_analise')));

-- ================================================================ privilégios
revoke all on public.v_fila_moderacao from public, anon, authenticated;
grant select on public.v_fila_moderacao to authenticated;

revoke execute on function
  public.consumir_limite(bytea, interval, integer),
  public.registrar_ocorrencia(smallint, smallint, text, text, boolean, text, text, boolean, text, bytea, public.moderacao_ocorrencia, integer, uuid, bytea),
  public.triagem_sinais(text, text, bytea, interval, integer),
  public.registrar_imagem(bytea, smallint, text, text, integer),
  public.registrar_resposta(uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function
  public.consumir_limite(bytea, interval, integer),
  public.registrar_ocorrencia(smallint, smallint, text, text, boolean, text, text, boolean, text, bytea, public.moderacao_ocorrencia, integer, uuid, bytea),
  public.triagem_sinais(text, text, bytea, interval, integer),
  public.registrar_imagem(bytea, smallint, text, text, integer),
  public.registrar_resposta(uuid, text, text, text)
  to service_role;
