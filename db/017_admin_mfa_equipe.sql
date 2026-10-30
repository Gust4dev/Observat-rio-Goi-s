-- M5: toda autorização administrativa exige MFA; equipe muda somente por RPC auditada.
create or replace function interno.eh_admin(p_minimo public.papel_admin) returns boolean
language sql stable security definer set search_path = '' as $$
 select coalesce(auth.jwt()->>'aal' = 'aal2' and interno.papel_atual() >= p_minimo, false)
$$;

revoke insert, update, delete on public.administradores from authenticated;
drop policy if exists superadmin_insere on public.administradores;
drop policy if exists superadmin_altera on public.administradores;
drop policy if exists superadmin_remove on public.administradores;

-- O convite de Auth é feito no servidor. Esta RPC associa o usuário já criado ao papel.
create function public.admin_convidar_administrador(p_user_id uuid, p_papel public.papel_admin, p_motivo text)
returns void language plpgsql security definer set search_path='' as $$
declare depois public.administradores;
begin
 lock table public.administradores in share row exclusive mode;
 perform interno.exige_admin('superadmin');
 if p_papel is null or nullif(btrim(p_motivo),'') is null then raise exception 'papel e motivo obrigatórios' using errcode='22023'; end if;
 insert into public.administradores(user_id,papel) values(p_user_id,p_papel) returning * into depois;
 perform interno.registra_historico(null,'equipe_convidar',p_motivo,null,to_jsonb(depois));
end $$;

create function public.admin_alterar_papel_administrador(p_user_id uuid, p_papel public.papel_admin, p_motivo text)
returns void language plpgsql security definer set search_path='' as $$
declare antes public.administradores; depois public.administradores;
begin
 lock table public.administradores in share row exclusive mode;
 perform interno.exige_admin('superadmin');
 if p_papel is null or nullif(btrim(p_motivo),'') is null then raise exception 'papel e motivo obrigatórios' using errcode='22023'; end if;
 select * into antes from public.administradores where user_id=p_user_id;
 if not found then raise exception 'administrador inexistente' using errcode='P0002'; end if;
 if antes.ativo and antes.papel='superadmin' and p_papel<>'superadmin' and
    (select count(*) from public.administradores where ativo and papel='superadmin')<=1 then
  raise exception 'último superadmin ativo' using errcode='23514';
 end if;
 update public.administradores set papel=p_papel where user_id=p_user_id returning * into depois;
 perform interno.registra_historico(null,'equipe_papel',p_motivo,to_jsonb(antes),to_jsonb(depois));
end $$;

create function public.admin_desativar_administrador(p_user_id uuid, p_motivo text)
returns void language plpgsql security definer set search_path='' as $$
declare antes public.administradores; depois public.administradores;
begin
 lock table public.administradores in share row exclusive mode;
 perform interno.exige_admin('superadmin');
 if nullif(btrim(p_motivo),'') is null then raise exception 'motivo obrigatório' using errcode='22023'; end if;
 select * into antes from public.administradores where user_id=p_user_id;
 if not found then raise exception 'administrador inexistente' using errcode='P0002'; end if;
 if antes.ativo and antes.papel='superadmin' and
    (select count(*) from public.administradores where ativo and papel='superadmin')<=1 then
  raise exception 'último superadmin ativo' using errcode='23514';
 end if;
 update public.administradores set ativo=false where user_id=p_user_id returning * into depois;
 perform interno.registra_historico(null,'equipe_desativar',p_motivo,to_jsonb(antes),to_jsonb(depois));
end $$;

revoke all on function public.admin_convidar_administrador(uuid,public.papel_admin,text), public.admin_alterar_papel_administrador(uuid,public.papel_admin,text), public.admin_desativar_administrador(uuid,text) from public,anon,service_role;
grant execute on function public.admin_convidar_administrador(uuid,public.papel_admin,text), public.admin_alterar_papel_administrador(uuid,public.papel_admin,text), public.admin_desativar_administrador(uuid,text) to authenticated;
