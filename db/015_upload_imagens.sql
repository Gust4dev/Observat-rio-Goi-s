-- Identidade bruta para retry pré-decoder; hash do JPEG preservado no caminho.
alter table public.imagens add column if not exists hash_entrada text check (hash_entrada ~ '^[a-f0-9]{64}$');
create or replace function public.consultar_slot_imagem(p_token_hash bytea,p_ordem smallint,p_hash_entrada text,p_contexto text)
returns table(out_id uuid) language plpgsql security definer set search_path='' as $$
declare oc public.ocorrencias; im public.imagens;
begin
 select o.* into oc from public.tokens_gestao t join public.ocorrencias o on o.id=t.ocorrencia_id where t.token_hash=p_token_hash for update of o;
 if not found then raise exception 'token inválido' using errcode='P0002';end if;
 if oc.moderacao='removido' then raise exception 'removido' using errcode='22023';end if;
 if p_ordem is null or p_ordem not between 1 and 3 or p_hash_entrada is null or p_hash_entrada !~ '^[a-f0-9]{64}$' or p_contexto is null or char_length(btrim(p_contexto)) not between 3 and 300 then raise exception 'imagem inválida' using errcode='22023';end if;
 select * into im from public.imagens where ocorrencia_id=oc.id and ordem=p_ordem;
 if not found then return;end if;
 if im.hash_entrada is distinct from p_hash_entrada or im.moderacao='removido' then raise exception 'slot ocupado' using errcode='23505';end if;
 if im.moderacao='pendente' then update public.imagens set descricao_contexto=btrim(p_contexto) where id=im.id;end if;
 return query select im.id;
end $$;
revoke all on function public.consultar_slot_imagem(bytea,smallint,text,text) from public,anon,authenticated;
grant execute on function public.consultar_slot_imagem(bytea,smallint,text,text) to service_role;

create or replace function public.registrar_imagem(p_token_hash bytea,p_ordem smallint,p_caminho text,p_mime text,p_tamanho integer,p_contexto text,p_hash_entrada text)
returns uuid language plpgsql security definer set search_path='' as $$
declare oc public.ocorrencias; im public.imagens; resultado uuid;
begin
 select o.* into oc from public.tokens_gestao t join public.ocorrencias o on o.id=t.ocorrencia_id where t.token_hash=p_token_hash for update of o;
 if not found then raise exception 'token inválido' using errcode='P0002';end if;
 if oc.moderacao='removido' then raise exception 'removido' using errcode='22023';end if;
 if p_ordem is null or p_ordem not between 1 and 3 or p_hash_entrada is null or p_hash_entrada !~ '^[a-f0-9]{64}$' or p_contexto is null or char_length(btrim(p_contexto)) not between 3 and 300 or p_caminho is null or p_caminho !~ '^[a-f0-9]{64}/[1-3]/[a-f0-9]{64}\.jpg$' or split_part(p_caminho,'/',2)<>p_ordem::text or p_mime is distinct from 'image/jpeg' or p_tamanho is null or p_tamanho not between 1 and 2097152 then raise exception 'imagem inválida' using errcode='22023';end if;
 select * into im from public.imagens where ocorrencia_id=oc.id and ordem=p_ordem;
 if found then
  if im.hash_entrada=p_hash_entrada and im.caminho_storage=p_caminho and im.tipo_mime=p_mime and im.tamanho_bytes=p_tamanho and im.moderacao<>'removido' then
   if im.moderacao='pendente' then update public.imagens set descricao_contexto=btrim(p_contexto) where id=im.id;end if;
   return im.id;
  end if;
  raise exception 'slot ocupado' using errcode='23505';
 end if;
 insert into public.imagens(ocorrencia_id,ordem,caminho_storage,tipo_mime,tamanho_bytes,descricao_contexto,hash_entrada) values(oc.id,p_ordem,p_caminho,p_mime,p_tamanho,btrim(p_contexto),p_hash_entrada) returning id into resultado;
 return resultado;
end $$;
revoke all on function public.registrar_imagem(bytea,smallint,text,text,integer,text,text) from public,anon,authenticated;
grant execute on function public.registrar_imagem(bytea,smallint,text,text,integer,text,text) to service_role;
