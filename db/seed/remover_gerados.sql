-- Observatório Goiás — REMOVE todos os dados gerados (ocorrencias.gerado = true) e o que depende deles.
-- Relatos criados por pessoas (gerado = false) não são tocados.
-- Linha do tempo e histórico são somente-inserção por gatilho; este script desliga esses gatilhos
-- dentro da transação, só para as linhas dos relatos gerados, e os religa antes do commit.
-- Aplicar:  npx supabase db query --linked --project-ref <ref> -f db/seed/remover_gerados.sql
-- Requer a migração 027. Se algo falhar, a transação inteira é revertida.

begin;

alter table public.atualizacoes disable trigger atualizacoes_somente_insercao;
alter table public.historico_moderacao disable trigger historico_somente_insercao;

delete from public.atualizacoes
 where ocorrencia_id in (select id from public.ocorrencias where gerado);
delete from public.historico_moderacao
 where ocorrencia_id in (select id from public.ocorrencias where gerado);
-- tokens_gestao, contatos_privados, imagens, confirmacoes, denuncias e respostas saem em cascata
delete from public.ocorrencias where gerado;

alter table public.atualizacoes enable trigger atualizacoes_somente_insercao;
alter table public.historico_moderacao enable trigger historico_somente_insercao;

do $$
begin
  if exists (select 1 from public.ocorrencias where gerado) then
    raise exception 'ainda restam relatos gerados';
  end if;
end $$;

commit;
