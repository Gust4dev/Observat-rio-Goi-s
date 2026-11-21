-- 023: todos os indicadores usam o universo retido pela supressão 019.
-- Um total integral ao lado de recortes parciais permitiria recuperar o volume
-- oculto por diferença. CREATE OR REPLACE preserva colunas, tipos e grants.
create or replace view public.v_indicadores_gerais as
select coalesce(sum(total),0)::integer as total_ocorrencias,
 count(distinct municipio_slug)::integer as municipios_com_registros,
 coalesce(sum(com_resposta_oficial),0)::integer as com_resposta_oficial,
 coalesce(sum(resolvidas_documentadas),0)::integer as resolvidas_documentadas
from public.v_dados_painel;
