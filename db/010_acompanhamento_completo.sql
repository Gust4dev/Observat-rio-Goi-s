-- Observatório Goiás — 010: cronologia e respostas no acompanhamento privado.
-- Mantém os campos existentes e acrescenta DTOs com colunas explícitas; sem contato ou notas internas.
-- A alteração do tipo de retorno exige recriar a função e seus privilégios.
drop function public.acompanhar_por_token(bytea);

create function public.acompanhar_por_token(p_token_hash bytea)
returns table (
  out_id uuid, out_protocolo text, out_titulo text, out_situacao public.situacao_ocorrencia,
  out_moderacao public.moderacao_ocorrencia, out_motivo_remocao text,
  out_publicado_em timestamptz, out_criado_em timestamptz,
  out_atualizacoes jsonb, out_respostas jsonb
)
language sql stable security definer set search_path = '' as $$
  select o.id, o.protocolo, o.titulo, o.situacao, o.moderacao, o.motivo_remocao,
         o.publicado_em, o.criado_em,
         coalesce((
           select jsonb_agg(jsonb_build_object(
             'id', a.id, 'tipo', a.tipo, 'situacao_nova', a.situacao_nova,
             'texto', a.texto, 'evidencia', a.evidencia, 'criado_em', a.criado_em
           ) order by a.criado_em, a.id)
             from public.atualizacoes a
            where a.ocorrencia_id = o.id and a.publica
         ), '[]'::jsonb),
         coalesce((
           select jsonb_agg(jsonb_build_object(
             'id', r.id, 'autor_vinculo', r.autor_vinculo, 'texto', r.texto, 'criado_em', r.criado_em
           ) order by r.criado_em, r.id)
             from public.respostas r
            where r.ocorrencia_id = o.id and r.status = 'publicada'
         ), '[]'::jsonb)
    from public.tokens_gestao t
    join public.ocorrencias o on o.id = t.ocorrencia_id
   where t.token_hash = p_token_hash
$$;

revoke execute on function public.acompanhar_por_token(bytea) from public, anon, authenticated;
grant execute on function public.acompanhar_por_token(bytea) to service_role;
