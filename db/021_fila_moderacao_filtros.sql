-- Expõe os identificadores de referência necessários aos filtros administrativos da fila.
create or replace view public.v_fila_moderacao with (security_invoker = true) as
select o.id, o.protocolo, m.nome as municipio_nome, c.nome as categoria_nome,
       o.titulo, o.descricao, o.situacao, o.moderacao, o.criado_em,
       (select count(*) from public.imagens i where i.ocorrencia_id = o.id and i.moderacao = 'pendente')::integer as imagens_pendentes,
       (select count(*) from public.denuncias d where d.ocorrencia_id = o.id and d.status in ('aberta','em_analise'))::integer as denuncias_abertas,
       o.municipio_id, o.categoria_id
  from public.ocorrencias o
  join public.municipios m on m.id = o.municipio_id
  join public.categorias c on c.id = o.categoria_id
 where o.moderacao <> 'removido'
   and (o.moderacao in ('pendente','retido')
        or exists (select 1 from public.imagens i where i.ocorrencia_id = o.id and i.moderacao = 'pendente')
        or exists (select 1 from public.denuncias d where d.ocorrencia_id = o.id and d.status in ('aberta','em_analise')));

revoke all on public.v_fila_moderacao from public, anon, authenticated;
grant select on public.v_fila_moderacao to authenticated;
