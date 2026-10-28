-- Contexto acessível privado e retry transacional do mesmo slot/conteúdo.
alter table public.imagens add column descricao_contexto text
  check (char_length(btrim(descricao_contexto)) between 3 and 300);

create function public.registrar_imagem(
  p_token_hash bytea, p_ordem smallint, p_caminho text, p_mime text, p_tamanho integer, p_contexto text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_oc public.ocorrencias; v_im public.imagens; v_id uuid;
begin
  select o.* into v_oc from public.tokens_gestao t join public.ocorrencias o on o.id=t.ocorrencia_id
    where t.token_hash=p_token_hash for update of o;
  if not found then raise exception 'token inválido' using errcode='P0002'; end if;
  if v_oc.moderacao='removido' then raise exception 'removido' using errcode='22023'; end if;
  if p_ordem is null or p_ordem not between 1 and 3 or p_contexto is null or char_length(btrim(p_contexto)) not between 3 and 300
    or p_caminho !~ '^[a-f0-9]{64}/[1-3]/[a-f0-9]{64}\.jpg$'
    or split_part(p_caminho,'/',2) <> p_ordem::text
    or p_mime <> 'image/jpeg' or p_tamanho not between 1 and 2097152 then
    raise exception 'imagem inválida' using errcode='22023';
  end if;
  select * into v_im from public.imagens where ocorrencia_id=v_oc.id and ordem=p_ordem;
  if found then
    if v_im.caminho_storage=p_caminho and v_im.tipo_mime=p_mime and v_im.tamanho_bytes=p_tamanho
      and v_im.descricao_contexto=btrim(p_contexto) then return v_im.id; end if;
    raise exception 'slot ocupado' using errcode='23505';
  end if;
  insert into public.imagens(ocorrencia_id,ordem,caminho_storage,tipo_mime,tamanho_bytes,descricao_contexto)
    values(v_oc.id,p_ordem,p_caminho,p_mime,p_tamanho,btrim(p_contexto)) returning id into v_id;
  return v_id;
end $$;
revoke all on function public.registrar_imagem(bytea,smallint,text,text,integer,text) from public,anon,authenticated;
grant execute on function public.registrar_imagem(bytea,smallint,text,text,integer,text) to service_role;
