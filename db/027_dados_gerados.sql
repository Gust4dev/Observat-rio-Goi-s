-- Observatório Goiás — 027: dados GERADOS (demonstração) marcados no banco e filtrados nas views públicas.
-- Um relato com gerado = true foi produzido por seed/script, nunca por uma pessoa. Fica no mesmo banco
-- dos relatos reais, mas as views públicas só o expõem quando a requisição pede o "modo gerados":
-- papel service_role e cabeçalho HTTP `x-modo-gerados: 1` no cliente interno do aplicativo.
-- Sem o cabeçalho (padrão), as views se comportam como antes: só relatos criados por pessoas.
-- Remoção total: db/seed/remover_gerados.sql. Colunas das views: db/colunas-publicas.json.
-- CREATE OR REPLACE preserva grants; v_dados_painel e as views de indicadores derivadas herdam o filtro.

alter table public.ocorrencias add column gerado boolean not null default false;
create index ocorrencias_gerado_idx on public.ocorrencias (criado_em) where gerado;

-- true se o relato pode aparecer nesta requisição. O cabeçalho vem do PostgREST (GUC request.headers);
-- fora do PostgREST (psql, testes) o setting não existe e o resultado é "só reais".
create function interno.gerado_visivel(p_gerado boolean) returns boolean
  language sql stable set search_path = '' as $$
  select not p_gerado
      or (current_user = 'service_role'
          and coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'x-modo-gerados', '') = '1')
$$;
-- Funções chamadas por uma view são autorizadas para quem consulta a view (não para o dono dela):
-- sem este EXECUTE as views públicas falham com 'permission denied for function'.
-- A função só lê um cabeçalho e devolve boolean; o schema interno continua sem USAGE para anon.
revoke all on function interno.gerado_visivel(boolean) from public;
grant execute on function interno.gerado_visivel(boolean) to anon, authenticated, service_role;

create or replace view public.v_ocorrencias_publicas as
select o.id, o.protocolo,
       o.municipio_id, m.nome as municipio_nome, m.slug as municipio_slug,
       o.categoria_id, c.nome as categoria_nome, c.slug as categoria_slug,
       o.titulo, o.descricao, o.situacao, o.verificado,
       o.publicado_em, o.atualizado_em,
       (select count(*) from public.confirmacoes f where f.ocorrencia_id = o.id)::integer as confirmacoes_total,
       exists (select 1 from public.atualizacoes a
                where a.ocorrencia_id = o.id and a.publica and a.tipo = 'resposta_oficial') as tem_resposta_oficial,
       o.gerado
  from public.ocorrencias o
  join public.municipios m on m.id = o.municipio_id
  join public.categorias c on c.id = o.categoria_id
 where o.moderacao = 'publicado' and interno.gerado_visivel(o.gerado);

create or replace view public.v_imagens_publicas as
select i.id, i.ocorrencia_id, i.ordem, i.descricao_publica
  from public.imagens i
  join public.ocorrencias o on o.id=i.ocorrencia_id
 where i.moderacao='publicado' and o.moderacao='publicado' and interno.gerado_visivel(o.gerado)
   and i.descricao_publica is not null and char_length(btrim(i.descricao_publica))>0;

create or replace view public.v_atualizacoes_publicas as
select a.id, a.ocorrencia_id, a.tipo, a.situacao_nova, a.texto, a.evidencia, a.criado_em
  from public.atualizacoes a
  join public.ocorrencias o on o.id = a.ocorrencia_id
 where a.publica and o.moderacao = 'publicado' and interno.gerado_visivel(o.gerado);

create or replace view public.v_respostas_publicas as
select r.id, r.ocorrencia_id, r.autor_vinculo, r.texto, r.revisado_em as publicada_em
  from public.respostas r
  join public.ocorrencias o on o.id = r.ocorrencia_id
 where r.status = 'publicada' and o.moderacao = 'publicado' and interno.gerado_visivel(o.gerado);

-- v_dados_painel (definição de 019 + filtro nos dois pontos que leem ocorrencias). As views de
-- indicadores (gerais, município/categoria, mensal, situação) derivam desta e herdam o filtro.
create or replace view public.v_dados_painel as
with celulas as (
select overlay(overlay(md5(concat_ws('|',o.municipio_id,o.categoria_id,date_trunc('month',o.publicado_em at time zone 'America/Sao_Paulo')::date,o.situacao)) placing '5' from 13 for 1) placing '8' from 17 for 1)::uuid as id,
 m.slug as municipio_slug,m.nome as municipio_nome,c.slug as categoria_slug,c.nome as categoria_nome,
 date_trunc('month',o.publicado_em at time zone 'America/Sao_Paulo')::date as mes,o.situacao,
 count(*)::integer as total,
 count(*) filter(where exists(select 1 from public.atualizacoes a where a.ocorrencia_id=o.id and a.publica and a.tipo='resposta_oficial'))::integer as com_resposta_oficial,
 count(*) filter(where o.situacao='resolvido' and exists(select 1 from public.atualizacoes a where a.ocorrencia_id=o.id and a.publica and a.situacao_nova='resolvido' and length(btrim(a.texto))>0 and length(btrim(a.evidencia))>0))::integer as resolvidas_documentadas
from public.ocorrencias o join public.municipios m on m.id=o.municipio_id join public.categorias c on c.id=o.categoria_id
where o.moderacao='publicado' and interno.gerado_visivel(o.gerado)
group by o.municipio_id,o.categoria_id,m.slug,m.nome,c.slug,c.nome,mes,o.situacao
having count(*) >= 5
), seguras as (
 select * from celulas
 where (com_resposta_oficial = 0 or com_resposta_oficial >= 5)
   and (com_resposta_oficial = 0 or total-com_resposta_oficial = 0 or total-com_resposta_oficial >= 5)
   and (resolvidas_documentadas = 0 or resolvidas_documentadas >= 5)
   and (resolvidas_documentadas = 0 or total-resolvidas_documentadas = 0 or total-resolvidas_documentadas >= 5)
)
select s.id,s.municipio_slug,s.municipio_nome,s.categoria_slug,s.categoria_nome,
 s.mes,s.situacao,s.total,s.com_resposta_oficial,s.resolvidas_documentadas
from seguras s
where not exists (
 select 1 from public.ocorrencias o
 join public.municipios m on m.id=o.municipio_id
 join public.categorias c on c.id=o.categoria_id
 where o.moderacao='publicado' and interno.gerado_visivel(o.gerado) and m.slug=s.municipio_slug and c.slug=s.categoria_slug
 and not exists (
  select 1 from seguras t where t.municipio_slug=m.slug and t.categoria_slug=c.slug
  and t.mes=date_trunc('month',o.publicado_em at time zone 'America/Sao_Paulo')::date
  and t.situacao=o.situacao
 )
);

-- O servidor consulta somente as projeções de leitura do modo de demonstração.
grant select on public.v_ocorrencias_publicas, public.v_imagens_publicas,
  public.v_atualizacoes_publicas, public.v_respostas_publicas, public.v_dados_painel,
  public.v_indicadores_gerais, public.v_indicadores_municipio_categoria
  to service_role;

-- Relatos gerados são leitura de demonstração e não aceitam participação.
create or replace function public.registrar_confirmacao(p_ocorrencia_id uuid, p_chave_hash bytea)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_n integer;
begin
  -- A retirada definitiva usa FOR UPDATE antes de apagar as confirmações.
  perform 1 from public.ocorrencias
    where id = p_ocorrencia_id and moderacao = 'publicado' and not gerado for share;
  if not found then return false; end if;
  insert into public.confirmacoes (ocorrencia_id, chave_dedup_hash)
    values (p_ocorrencia_id, p_chave_hash) on conflict do nothing;
  get diagnostics v_n = row_count;
  return v_n = 1;
end $$;

create or replace function public.registrar_denuncia(p_ocorrencia_id uuid, p_motivo text, p_texto text, p_origem_hash bytea)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_inserida integer;
begin
  if p_origem_hash is null or octet_length(p_origem_hash) <> 32 then
    raise exception 'origem inválida' using errcode = '22023';
  end if;
  if not exists (select 1 from public.ocorrencias o where o.id = p_ocorrencia_id and o.moderacao = 'publicado' and not o.gerado) then
    return false;
  end if;
  insert into public.denuncias (ocorrencia_id, motivo, texto, origem_hash)
    values (p_ocorrencia_id, p_motivo, p_texto, p_origem_hash)
    on conflict do nothing;
  get diagnostics v_inserida = row_count;
  return v_inserida = 1;
end $$;

create or replace function public.registrar_resposta(p_ocorrencia_id uuid, p_vinculo text, p_contato text, p_texto text, p_origem_hash bytea)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_inserida integer;
begin
  if p_origem_hash is null or octet_length(p_origem_hash) <> 32 then
    raise exception 'origem inválida' using errcode = '22023';
  end if;
  if not exists (select 1 from public.ocorrencias o where o.id = p_ocorrencia_id and o.moderacao = 'publicado' and not o.gerado) then
    return false;
  end if;
  insert into public.respostas (ocorrencia_id, autor_vinculo, contato, texto, origem_hash)
    values (p_ocorrencia_id, btrim(p_vinculo), btrim(p_contato), btrim(p_texto), p_origem_hash)
    on conflict do nothing;
  get diagnostics v_inserida = row_count;
  return v_inserida = 1;
end $$;

-- O seed insere relatos e o script de retirada os exclui. A fila não pode editá-los.
create function interno.proteger_relato_gerado() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.gerado or new.gerado then
    raise exception 'Relato de demonstração é somente leitura' using errcode = '22023';
  end if;
  return new;
end $$;

revoke all on function interno.proteger_relato_gerado() from public;
create trigger proteger_relato_gerado before update on public.ocorrencias
for each row when (old.gerado or new.gerado) execute function interno.proteger_relato_gerado();
