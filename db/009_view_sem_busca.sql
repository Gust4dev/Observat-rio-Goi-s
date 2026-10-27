-- Observatório Goiás — 009: v_ocorrencias_publicas deixa de expor a coluna `busca`
-- A busca textual está fora do M2 (docs/plano-m2.md §1) e o tsvector é detalhe interno de índice.
-- Regra do projeto: coluna nova numa view pública vira dado público; a lista permitida fica em
-- db/colunas-publicas.json e é conferida por db/tests/colunas-views.mjs.
-- CREATE OR REPLACE não remove coluna de view, por isso drop + create + grants (idênticos aos de 004).

drop view public.v_ocorrencias_publicas;

create view public.v_ocorrencias_publicas as
select o.id, o.protocolo,
       o.municipio_id, m.nome as municipio_nome, m.slug as municipio_slug,
       o.categoria_id, c.nome as categoria_nome, c.slug as categoria_slug,
       o.titulo, o.descricao, o.situacao, o.verificado,
       o.publicado_em, o.atualizado_em,
       (select count(*) from public.confirmacoes f where f.ocorrencia_id = o.id)::integer as confirmacoes_total,
       exists (select 1 from public.atualizacoes a
                where a.ocorrencia_id = o.id and a.publica and a.tipo = 'resposta_oficial') as tem_resposta_oficial
  from public.ocorrencias o
  join public.municipios m on m.id = o.municipio_id
  join public.categorias c on c.id = o.categoria_id
 where o.moderacao = 'publicado';

revoke all on public.v_ocorrencias_publicas from public, anon, authenticated;
grant select on public.v_ocorrencias_publicas to anon, authenticated;
