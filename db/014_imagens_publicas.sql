-- M4: descrição revisada e contrato público sem identidade de quarentena.
alter table public.imagens add column if not exists descricao_publica text
  check (descricao_publica is null or char_length(btrim(descricao_publica)) between 1 and 300);

-- Uploads e moderação escrevem por funções security definer, nunca por atualização direta.
revoke insert, update on public.imagens from public, anon, authenticated, service_role;

drop view if exists public.v_imagens_publicas;
create view public.v_imagens_publicas as
select i.id, i.ocorrencia_id, i.ordem, i.descricao_publica
  from public.imagens i
  join public.ocorrencias o on o.id=i.ocorrencia_id
 where i.moderacao='publicado' and o.moderacao='publicado'
   and i.descricao_publica is not null and char_length(btrim(i.descricao_publica))>0;
revoke all on public.v_imagens_publicas from public;
grant select on public.v_imagens_publicas to anon, authenticated;
