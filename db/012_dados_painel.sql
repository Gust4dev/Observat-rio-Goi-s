-- 012: mÃ©tricas pÃºblicas filtrÃ¡veis e resoluÃ§Ã£o com documentaÃ§Ã£o publicada.
create or replace view public.v_indicadores_gerais as
select count(*)::integer as total_ocorrencias,
 count(distinct o.municipio_id)::integer as municipios_com_registros,
 count(*) filter (where exists(select 1 from public.atualizacoes a where a.ocorrencia_id=o.id and a.publica and a.tipo='resposta_oficial'))::integer as com_resposta_oficial,
 count(*) filter (where o.situacao='resolvido' and exists(select 1 from public.atualizacoes a where a.ocorrencia_id=o.id and a.publica and a.situacao_nova='resolvido' and length(btrim(a.texto))>0 and length(btrim(a.evidencia))>0))::integer as resolvidas_documentadas
from public.ocorrencias o where o.moderacao='publicado';

-- Agregação por dimensões filtráveis; id determinístico permite paginação sem teto.
create view public.v_dados_painel as
select overlay(overlay(md5(concat_ws('|',o.municipio_id,o.categoria_id,date_trunc('month',o.publicado_em at time zone 'America/Sao_Paulo')::date,o.situacao)) placing '5' from 13 for 1) placing '8' from 17 for 1)::uuid as id,
 m.slug as municipio_slug,m.nome as municipio_nome,c.slug as categoria_slug,c.nome as categoria_nome,
 date_trunc('month',o.publicado_em at time zone 'America/Sao_Paulo')::date as mes,o.situacao,
 count(*)::integer as total,
 count(*) filter(where exists(select 1 from public.atualizacoes a where a.ocorrencia_id=o.id and a.publica and a.tipo='resposta_oficial'))::integer as com_resposta_oficial,
 count(*) filter(where o.situacao='resolvido' and exists(select 1 from public.atualizacoes a where a.ocorrencia_id=o.id and a.publica and a.situacao_nova='resolvido' and length(btrim(a.texto))>0 and length(btrim(a.evidencia))>0))::integer as resolvidas_documentadas
from public.ocorrencias o join public.municipios m on m.id=o.municipio_id join public.categorias c on c.id=o.categoria_id
where o.moderacao='publicado'
group by o.municipio_id,o.categoria_id,m.slug,m.nome,c.slug,c.nome,mes,o.situacao;
revoke all on public.v_dados_painel from public;
grant select on public.v_dados_painel to anon,authenticated;
