-- Observatório Goiás — 003: visões públicas
-- Estas views são a ÚNICA superfície de leitura para o público (anon).
-- Elas rodam com os privilégios do dono (não são security_invoker): por isso expõem só colunas
-- seguras e sempre filtram por moderacao = 'publicado'. Nunca incluir contato, token, admin_id,
-- motivo_remocao ou ocorrências não publicadas.

create view public.v_ocorrencias_publicas as
select o.id, o.protocolo,
       o.municipio_id, m.nome as municipio_nome, m.slug as municipio_slug,
       o.categoria_id, c.nome as categoria_nome, c.slug as categoria_slug,
       o.titulo, o.descricao, o.situacao, o.verificado,
       o.publicado_em, o.atualizado_em,
       (select count(*) from public.confirmacoes f where f.ocorrencia_id = o.id)::integer as confirmacoes_total,
       exists (select 1 from public.atualizacoes a
                where a.ocorrencia_id = o.id and a.publica and a.tipo = 'resposta_oficial') as tem_resposta_oficial,
       o.busca
  from public.ocorrencias o
  join public.municipios m on m.id = o.municipio_id
  join public.categorias c on c.id = o.categoria_id
 where o.moderacao = 'publicado';

create view public.v_imagens_publicas as
select i.id, i.ocorrencia_id, i.ordem, i.caminho_storage
  from public.imagens i
  join public.ocorrencias o on o.id = i.ocorrencia_id
 where i.moderacao = 'publicado' and o.moderacao = 'publicado';

create view public.v_atualizacoes_publicas as
select a.id, a.ocorrencia_id, a.tipo, a.situacao_nova, a.texto, a.evidencia, a.criado_em
  from public.atualizacoes a
  join public.ocorrencias o on o.id = a.ocorrencia_id
 where a.publica and o.moderacao = 'publicado';

create view public.v_respostas_publicas as
select r.id, r.ocorrencia_id, r.autor_vinculo, r.texto, r.revisado_em as publicada_em
  from public.respostas r
  join public.ocorrencias o on o.id = r.ocorrencia_id
 where r.status = 'publicada' and o.moderacao = 'publicado';

-- ------------------------------------------------ indicadores (só contagens; ver metodologia)
create view public.v_indicadores_gerais as
select count(*)::integer                                       as total_ocorrencias,
       count(distinct o.municipio_id)::integer                 as municipios_com_registros,
       count(*) filter (where exists (select 1 from public.atualizacoes a
              where a.ocorrencia_id = o.id and a.publica and a.tipo = 'resposta_oficial'))::integer as com_resposta_oficial,
       count(*) filter (where o.situacao = 'resolvido' and exists (select 1 from public.atualizacoes a where a.ocorrencia_id=o.id and a.publica and a.situacao_nova='resolvido' and length(btrim(a.texto))>0 and length(btrim(a.evidencia))>0))::integer as resolvidas_documentadas
  from public.ocorrencias o
 where o.moderacao = 'publicado';

create view public.v_indicadores_municipio_categoria as
select m.slug as municipio_slug, m.nome as municipio_nome,
       c.slug as categoria_slug, c.nome as categoria_nome,
       count(*)::integer as total
  from public.ocorrencias o
  join public.municipios m on m.id = o.municipio_id
  join public.categorias c on c.id = o.categoria_id
 where o.moderacao = 'publicado'
 group by m.slug, m.nome, c.slug, c.nome;

create view public.v_indicadores_mensal as
select date_trunc('month', o.publicado_em at time zone 'America/Sao_Paulo')::date as mes,
       count(*)::integer as total
  from public.ocorrencias o
 where o.moderacao = 'publicado'
 group by 1;

create view public.v_indicadores_situacao as
select o.situacao, count(*)::integer as total
  from public.ocorrencias o
 where o.moderacao = 'publicado'
 group by o.situacao;
