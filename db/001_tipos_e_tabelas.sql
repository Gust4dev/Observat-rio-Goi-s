-- Observatório Goiás — 001: tipos e tabelas
-- Alvo: PostgreSQL 15+ (Supabase). Estado: PROPOSTO.

create schema if not exists interno;   -- funções auxiliares; NÃO exposto pela API

-- ---------------------------------------------------------------- tipos
create type public.situacao_ocorrencia as enum
  ('registrado','em_analise','encaminhado','aguardando_resposta','em_atendimento','resolvido','encerrado_sem_solucao');
create type public.moderacao_ocorrencia as enum ('pendente','publicado','retido','removido');
-- a ordem importa: moderador < gestor < superadmin (comparação >= em interno.eh_admin)
create type public.papel_admin as enum ('moderador','gestor','superadmin');
create type public.tipo_atualizacao as enum ('mudanca_situacao','providencia','evidencia','resposta_oficial','nota');
create type public.status_denuncia as enum ('aberta','em_analise','procedente','improcedente');
create type public.status_resposta as enum ('pendente','publicada','rejeitada');

-- ---------------------------------------------------------------- referência
create table public.municipios (
  id                    smallint generated always as identity primary key,
  ibge_codigo           integer  not null unique check (ibge_codigo between 5200000 and 5299999),
  nome                  text     not null,
  slug                  text     not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  ativo_acompanhamento  boolean  not null default false  -- onde há operação ativa (piloto)
);

create table public.categorias (
  id     smallint generated always as identity primary key,
  slug   text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  nome   text not null,
  ordem  smallint not null default 0
);

-- ---------------------------------------------------------------- ocorrências
create table public.ocorrencias (
  id              uuid primary key default gen_random_uuid(),
  protocolo       text not null unique,
  municipio_id    smallint not null references public.municipios(id),
  categoria_id    smallint not null references public.categorias(id),
  titulo          text not null check (char_length(btrim(titulo))    between 5 and 120),
  descricao       text not null check (char_length(btrim(descricao)) between 20 and 4000),
  situacao        public.situacao_ocorrencia  not null default 'registrado',
  moderacao       public.moderacao_ocorrencia not null default 'pendente',
  anonimo         boolean not null default false,
  verificado      boolean not null default false,   -- relatos nascem "não verificados"
  motivo_remocao  text,
  criado_em       timestamptz not null default now(),
  publicado_em    timestamptz,
  removido_em     timestamptz,
  atualizado_em   timestamptz not null default now(),
  busca           tsvector generated always as
                    (to_tsvector('portuguese'::regconfig, titulo || ' ' || descricao)) stored,
  constraint remocao_exige_motivo check (moderacao <> 'removido' or char_length(btrim(coalesce(motivo_remocao,''))) > 0),
  constraint publicado_exige_data check (moderacao <> 'publicado' or publicado_em is not null)
);
create index ocorrencias_municipio_idx on public.ocorrencias (municipio_id, publicado_em desc) where moderacao = 'publicado';
create index ocorrencias_categoria_idx on public.ocorrencias (categoria_id)                      where moderacao = 'publicado';
create index ocorrencias_situacao_idx  on public.ocorrencias (situacao)                          where moderacao = 'publicado';
create index ocorrencias_recentes_idx  on public.ocorrencias (publicado_em desc)                 where moderacao = 'publicado';
create index ocorrencias_fila_idx      on public.ocorrencias (criado_em)                         where moderacao in ('pendente','retido');
create index ocorrencias_busca_idx     on public.ocorrencias using gin (busca);

-- Token secreto de acompanhamento (o token em si só existe no link do cidadão; guardamos o SHA-256).
create table public.tokens_gestao (
  ocorrencia_id  uuid primary key references public.ocorrencias(id) on delete cascade,
  token_hash     bytea not null unique check (octet_length(token_hash) = 32),
  criado_em      timestamptz not null default now()
);

-- Dados pessoais. NUNCA expostos por API pública. Ocorrência anônima não tem linha aqui.
create table public.contatos_privados (
  ocorrencia_id               uuid primary key references public.ocorrencias(id) on delete cascade,
  nome                        text,
  whatsapp                    text check (whatsapp ~ '^\+?[0-9]{10,15}$'),
  consentimento_atualizacoes  boolean not null default false,
  consentimento_em            timestamptz,
  consentimento_versao        text,
  expira_em                   timestamptz,        -- retenção (prazo a definir)
  criado_em                   timestamptz not null default now(),
  constraint telefone_exige_consentimento check (whatsapp is null or consentimento_atualizacoes),
  constraint consentimento_registrado check (not consentimento_atualizacoes or (consentimento_em is not null and consentimento_versao is not null))
);

create table public.imagens (
  id                uuid primary key default gen_random_uuid(),
  ocorrencia_id     uuid not null references public.ocorrencias(id) on delete cascade,
  ordem             smallint not null check (ordem between 1 and 3),   -- máx. 3 fotos
  caminho_storage   text not null unique,
  tipo_mime         text not null check (tipo_mime in ('image/jpeg','image/png','image/webp')),
  tamanho_bytes     integer not null check (tamanho_bytes between 1 and 5242880),
  moderacao         public.moderacao_ocorrencia not null default 'pendente',
  criado_em         timestamptz not null default now(),
  unique (ocorrencia_id, ordem)
);
create index imagens_ocorrencia_idx on public.imagens (ocorrencia_id);

create table public.atualizacoes (
  id             bigint generated always as identity primary key,
  ocorrencia_id  uuid not null references public.ocorrencias(id) on delete restrict,
  tipo           public.tipo_atualizacao not null,
  situacao_nova  public.situacao_ocorrencia,
  texto          text not null check (char_length(btrim(texto)) > 0),
  evidencia      text,                                   -- link ou caminho de arquivo
  publica        boolean not null default true,
  admin_id       uuid references auth.users(id) on delete set null,
  criado_em      timestamptz not null default now(),
  constraint mudanca_exige_situacao check (tipo <> 'mudanca_situacao' or situacao_nova is not null)
);
create index atualizacoes_ocorrencia_idx on public.atualizacoes (ocorrencia_id, criado_em);

create table public.confirmacoes (
  id                bigint generated always as identity primary key,
  ocorrencia_id     uuid not null references public.ocorrencias(id) on delete cascade,
  chave_dedup_hash  bytea not null check (octet_length(chave_dedup_hash) = 32),
  criado_em         timestamptz not null default now(),
  unique (ocorrencia_id, chave_dedup_hash)
);

create table public.denuncias (
  id             bigint generated always as identity primary key,
  ocorrencia_id  uuid not null references public.ocorrencias(id) on delete cascade,
  motivo         text not null check (motivo in ('dado_pessoal','acusacao_sem_base','ameaca','conteudo_ilegal','spam','duplicado','outro')),
  texto          text check (char_length(texto) <= 1000),
  status         public.status_denuncia not null default 'aberta',
  criado_em      timestamptz not null default now(),
  resolvido_em   timestamptz,
  resolvido_por  uuid references auth.users(id) on delete set null
);
create index denuncias_abertas_idx on public.denuncias (criado_em) where status in ('aberta','em_analise');

-- Direito de resposta (política a definir): o contato de quem responde é privado.
create table public.respostas (
  id             bigint generated always as identity primary key,
  ocorrencia_id  uuid not null references public.ocorrencias(id) on delete cascade,
  autor_vinculo  text not null check (char_length(btrim(autor_vinculo)) between 2 and 120),  -- ex.: "Prefeitura de X"
  contato        text not null,
  texto          text not null check (char_length(btrim(texto)) between 10 and 4000),
  status         public.status_resposta not null default 'pendente',
  criado_em      timestamptz not null default now(),
  revisado_por   uuid references auth.users(id) on delete set null,
  revisado_em    timestamptz
);

create table public.administradores (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  papel      public.papel_admin not null,
  ativo      boolean not null default true,
  criado_em  timestamptz not null default now()
);

create table public.historico_moderacao (
  id             bigint generated always as identity primary key,
  ocorrencia_id  uuid references public.ocorrencias(id) on delete restrict,
  admin_id       uuid references auth.users(id) on delete set null,   -- nulo = ação do sistema/titular
  acao           text not null,
  motivo         text,
  antes          jsonb,
  depois         jsonb,
  criado_em      timestamptz not null default now()
);
create index historico_ocorrencia_idx on public.historico_moderacao (ocorrencia_id, criado_em);

-- ---------------------------------------------------------------- triggers
create function interno.toca_atualizado_em() returns trigger language plpgsql set search_path = '' as $$
begin new.atualizado_em := now(); return new; end $$;
create trigger ocorrencias_atualizado_em before update on public.ocorrencias
  for each row execute function interno.toca_atualizado_em();

-- tabelas somente-inserção (auditoria e linha do tempo; correções entram como nova linha)
create function interno.bloqueia_alteracao() returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'a tabela % é somente inserção', tg_table_name using errcode = '42501';
end $$;
create trigger historico_somente_insercao before update or delete on public.historico_moderacao
  for each row execute function interno.bloqueia_alteracao();
create trigger historico_sem_truncate before truncate on public.historico_moderacao
  for each statement execute function interno.bloqueia_alteracao();
create trigger atualizacoes_somente_insercao before update or delete on public.atualizacoes
  for each row execute function interno.bloqueia_alteracao();

-- ocorrência anônima não pode ter dado de contato
create function interno.contato_nao_anonimo() returns trigger language plpgsql set search_path = '' as $$
begin
  if exists (select 1 from public.ocorrencias o where o.id = new.ocorrencia_id and o.anonimo) then
    raise exception 'ocorrência anônima não pode ter contato' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger contato_nao_anonimo before insert or update on public.contatos_privados
  for each row execute function interno.contato_nao_anonimo();
