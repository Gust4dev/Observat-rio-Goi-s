-- M4: lease durável cobre o intervalo entre Storage e PostgreSQL.
alter table public.imagens add column if not exists operacao_admin_id uuid;
alter table public.imagens add column if not exists operacao_admin_ate timestamptz;
alter table public.imagens add column if not exists operacao_admin_por uuid references auth.users(id);
alter table public.imagens add column if not exists operacao_admin_acao text;

drop function if exists public.admin_moderar_imagem(uuid,text,text);
create or replace function public.admin_preparar_imagem(p_imagem_id uuid,p_acao text)
returns table(out_operacao uuid,out_caminho text,out_moderacao public.moderacao_ocorrencia)
language plpgsql security definer set search_path='' as $$
declare im public.imagens; operacao uuid:=gen_random_uuid();
begin
 perform interno.exige_admin('moderador');
 if p_acao not in ('aprovar','remover') or p_acao is null then raise exception 'ação inválida' using errcode='22023';end if;
 select * into im from public.imagens where id=p_imagem_id for update;
 if not found then raise exception 'imagem inexistente' using errcode='P0002';end if;
 if im.operacao_admin_ate>clock_timestamp() then raise exception 'operação em andamento' using errcode='55P03';end if;
 if p_acao='aprovar' and im.moderacao not in ('pendente','publicado') then raise exception 'imagem indisponível' using errcode='22023';end if;
 update public.imagens set operacao_admin_id=operacao,operacao_admin_ate=clock_timestamp()+interval '2 minutes',operacao_admin_por=auth.uid(),operacao_admin_acao=p_acao where id=p_imagem_id;
 return query select operacao,im.caminho_storage,im.moderacao;
end $$;

create or replace function public.admin_abandonar_imagem(p_imagem_id uuid,p_operacao uuid)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 perform interno.exige_admin('moderador');
 update public.imagens set operacao_admin_id=null,operacao_admin_ate=null,operacao_admin_por=null,operacao_admin_acao=null where id=p_imagem_id and operacao_admin_id=p_operacao and operacao_admin_por=auth.uid();
 return found;
end $$;

create or replace function public.admin_moderar_imagem(p_imagem_id uuid,p_acao text,p_motivo text,p_descricao_publica text,p_checklist jsonb,p_operacao uuid)
returns void language plpgsql security definer set search_path='' as $$
declare im public.imagens; novo public.moderacao_ocorrencia; descricao text:=nullif(btrim(p_descricao_publica),''); esperado text[]:=array['agressao','documento','menor','numero_residencia','placa','rosto']; chaves text[];
begin
 perform interno.exige_admin('moderador');
 select * into im from public.imagens where id=p_imagem_id for update;
 if not found then raise exception 'imagem inexistente' using errcode='P0002';end if;
 if im.operacao_admin_id is distinct from p_operacao or p_operacao is null or im.operacao_admin_por is distinct from auth.uid() or im.operacao_admin_acao is distinct from p_acao or im.operacao_admin_ate<=clock_timestamp() then raise exception 'operação vencida' using errcode='55P03';end if;
 if p_checklist is null or jsonb_typeof(p_checklist)<>'object' then raise exception 'checklist obrigatório' using errcode='22023';end if;
 select array_agg(k order by k) into chaves from jsonb_object_keys(p_checklist) k;
 if chaves is distinct from esperado or exists(select 1 from jsonb_each(p_checklist) e where jsonb_typeof(e.value)<>'boolean') then raise exception 'checklist inválido' using errcode='22023';end if;
 if p_acao='aprovar' then
  if descricao is null or char_length(descricao)>300 or exists(select 1 from jsonb_each(p_checklist) e where e.value<>'false'::jsonb) or im.moderacao not in ('pendente','publicado') then raise exception 'aprovação inválida' using errcode='22023';end if;
  if im.moderacao='publicado' and im.descricao_publica is distinct from descricao then raise exception 'aprovação conflitante' using errcode='22023';end if;
  novo:='publicado';
 elsif p_acao='remover' then
  if char_length(btrim(coalesce(p_motivo,'')))=0 then raise exception 'motivo obrigatório' using errcode='22023';end if;
  novo:='removido';descricao:=null;
 else raise exception 'ação inválida' using errcode='22023';end if;
 update public.imagens set moderacao=novo,descricao_publica=descricao,operacao_admin_id=null,operacao_admin_ate=null,operacao_admin_por=null,operacao_admin_acao=null where id=p_imagem_id;
 if im.moderacao<>novo then
  perform interno.registra_historico(im.ocorrencia_id,'imagem_'||p_acao,p_motivo,jsonb_build_object('imagem',p_imagem_id,'moderacao',im.moderacao),jsonb_build_object('imagem',p_imagem_id,'moderacao',novo,'descricao_publica',descricao,'checklist',p_checklist));
 end if;
end $$;
revoke all on function public.admin_preparar_imagem(uuid,text),public.admin_abandonar_imagem(uuid,uuid),public.admin_moderar_imagem(uuid,text,text,text,jsonb,uuid) from public,anon,service_role;
grant execute on function public.admin_preparar_imagem(uuid,text),public.admin_abandonar_imagem(uuid,uuid),public.admin_moderar_imagem(uuid,text,text,text,jsonb,uuid) to authenticated;
