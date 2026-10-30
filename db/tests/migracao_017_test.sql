begin;
do $$
declare s uuid:=gen_random_uuid(); u uuid:=gen_random_uuid(); r text; f text; n bigint;
begin
 insert into auth.users(id,email) values(s,'super17@test'),(u,'team17@test');
 insert into public.administradores(user_id,papel) values(s,'superadmin');
 perform set_config('request.jwt.claim.sub',s::text,true);
 set local role authenticated;
 foreach r in array array['{}','{"aal":"aal1"}','{"aal":"aal2","role":"superadmin"}'] loop
  perform set_config('request.jwt.claims',r,true);
  if r not like '%aal2%' then
   if interno.eh_admin('moderador') then raise exception 'MFA ausente autorizou'; end if;
   select count(*) into n from public.ocorrencias;
   if n<>0 then raise exception 'MFA ausente expôs ocorrências'; end if;
   begin perform public.admin_convidar_administrador(u,'moderador','Teste'); raise exception 'MFA ausente permitiu convite'; exception when insufficient_privilege then null; end;
  end if;
 end loop;
 perform set_config('request.jwt.claim.sub',u::text,true);
 if interno.eh_admin('moderador') then raise exception 'papel JWT forjado autorizou'; end if;
 begin perform public.admin_convidar_administrador(u,'superadmin','Teste'); raise exception 'sem papel autorizou convite'; exception when insufficient_privilege then null; end;
 perform set_config('request.jwt.claim.sub',s::text,true);
 perform public.admin_convidar_administrador(u,'moderador','Convite teste');
 begin insert into public.administradores(user_id,papel) values(gen_random_uuid(),'superadmin'); raise exception 'escrita direta permitida'; exception when insufficient_privilege then null; end;
 begin update public.administradores set ativo=false where user_id=s; raise exception 'update direto permitido'; exception when insufficient_privilege then null; end;
 begin delete from public.administradores where user_id=u; raise exception 'delete direto permitido'; exception when insufficient_privilege then null; end;
 begin perform public.admin_desativar_administrador(s,'Teste'); raise exception 'último superadmin desativado'; exception when check_violation then null; end;
 begin perform public.admin_alterar_papel_administrador(s,'gestor','Teste'); raise exception 'último superadmin rebaixado'; exception when check_violation then null; end;
 perform public.admin_alterar_papel_administrador(u,'superadmin','Promoção teste');
 perform public.admin_desativar_administrador(u,'Saída teste');
 perform set_config('request.jwt.claim.sub',u::text,true);
 begin perform public.admin_convidar_administrador(gen_random_uuid(),'gestor','Teste'); raise exception 'inativo autorizou'; exception when insufficient_privilege then null; end;
 reset role;
 update public.administradores set ativo=true,papel='moderador' where user_id=u;
 set local role authenticated;
 begin perform public.admin_alterar_papel_administrador(u,'superadmin','Teste'); raise exception 'moderador autorizou'; exception when insufficient_privilege then null; end;
 reset role;
 update public.administradores set papel='gestor' where user_id=u;
 set local role authenticated;
 begin perform public.admin_desativar_administrador(s,'Teste'); raise exception 'gestor autorizou'; exception when insufficient_privilege then null; end;
 reset role;
 select count(*) into n from public.historico_moderacao where admin_id=s and acao like 'equipe_%';
 if n<>3 then raise exception 'auditoria equipe incompleta'; end if;
 if not exists(select 1 from public.historico_moderacao where admin_id=s and acao='equipe_papel' and antes->>'papel'='moderador' and depois->>'papel'='superadmin' and motivo='Promoção teste') then raise exception 'auditoria sem snapshots'; end if;
 begin update public.historico_moderacao set motivo='alterado' where admin_id=s; raise exception 'auditoria mutável'; exception when insufficient_privilege then null; end;
 begin delete from public.historico_moderacao where admin_id=s; raise exception 'auditoria deletável'; exception when insufficient_privilege then null; end;
 foreach f in array array['admin_convidar_administrador(uuid,public.papel_admin,text)','admin_alterar_papel_administrador(uuid,public.papel_admin,text)','admin_desativar_administrador(uuid,text)'] loop
  if has_function_privilege('anon','public.'||f,'execute') or has_function_privilege('service_role','public.'||f,'execute') or not has_function_privilege('authenticated','public.'||f,'execute') then raise exception 'EXECUTE equipe incorreto'; end if;
 end loop;
end $$;
rollback;
