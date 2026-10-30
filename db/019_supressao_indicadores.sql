-- 019: supressão de células pequenas (k=5 provisório de engenharia).
-- Não representa decisão jurídica nem garantia de anonimato.
create or replace view public.v_dados_painel as
with celulas as (
select overlay(overlay(md5(concat_ws('|',o.municipio_id,o.categoria_id,date_trunc('month',o.publicado_em at time zone 'America/Sao_Paulo')::date,o.situacao)) placing '5' from 13 for 1) placing '8' from 17 for 1)::uuid as id,
 m.slug as municipio_slug,m.nome as municipio_nome,c.slug as categoria_slug,c.nome as categoria_nome,
 date_trunc('month',o.publicado_em at time zone 'America/Sao_Paulo')::date as mes,o.situacao,
 count(*)::integer as total,
 count(*) filter(where exists(select 1 from public.atualizacoes a where a.ocorrencia_id=o.id and a.publica and a.tipo='resposta_oficial'))::integer as com_resposta_oficial,
 count(*) filter(where o.situacao='resolvido' and exists(select 1 from public.atualizacoes a where a.ocorrencia_id=o.id and a.publica and a.situacao_nova='resolvido' and length(btrim(a.texto))>0 and length(btrim(a.evidencia))>0))::integer as resolvidas_documentadas
from public.ocorrencias o join public.municipios m on m.id=o.municipio_id join public.categorias c on c.id=o.categoria_id
where o.moderacao='publicado'
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
-- Supressão complementar: retire também as outras células da mesma coorte
-- município/categoria quando uma célula dela foi ocultada (inclusive pelo HAVING).
where not exists (
 select 1 from public.ocorrencias o
 join public.municipios m on m.id=o.municipio_id
 join public.categorias c on c.id=o.categoria_id
 where o.moderacao='publicado' and m.slug=s.municipio_slug and c.slug=s.categoria_slug
 and not exists (
  select 1 from seguras t where t.municipio_slug=m.slug and t.categoria_slug=c.slug
  and t.mes=date_trunc('month',o.publicado_em at time zone 'America/Sao_Paulo')::date
  and t.situacao=o.situacao
 )
);

-- Subtotais usam exatamente o mesmo universo retido, nunca a base integral.
create or replace view public.v_indicadores_municipio_categoria as
select municipio_slug,municipio_nome,categoria_slug,categoria_nome,sum(total)::integer as total
from public.v_dados_painel group by municipio_slug,municipio_nome,categoria_slug,categoria_nome;

create or replace view public.v_indicadores_mensal as
select mes,sum(total)::integer as total from public.v_dados_painel group by mes;

create or replace view public.v_indicadores_situacao as
select situacao,sum(total)::integer as total from public.v_dados_painel group by situacao;
-- CREATE OR REPLACE preserva as colunas, tipos e grants existentes.
-- v_indicadores_gerais continua contendo os totais globais publicados.
