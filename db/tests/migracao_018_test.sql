begin;
do $$
declare u uuid:=gen_random_uuid(); g uuid:=gen_random_uuid(); a uuid; b uuid; c uuid; n bigint; f text; v_papel text; resultado jsonb;
begin
 if to_regprocedure('public.admin_moderar_ocorrencia(uuid,text,text)') is not null then raise exception 'assinatura antiga existe'; end if;
 insert into auth.users(id,email) values(u,'mod18@test'),(g,'gestor18@test');
 insert into public.administradores(user_id,papel) values(u,'moderador'),(g,'gestor');
 insert into public.municipios(ibge_codigo,nome,slug) values(5200001,'Teste de operações','teste-operacoes-18') on conflict do nothing;
 insert into public.ocorrencias(protocolo,municipio_id,categoria_id,titulo,descricao)
 select 'T18-'||s,m.id,c.id,'Relato de teste','Descrição fictícia suficiente para testes administrativos.' from generate_series(1,3) s,
 (select id from public.municipios limit 1) m,(select id from public.categorias limit 1)c;
 select id into a from public.ocorrencias where protocolo='T18-1'; select id into b from public.ocorrencias where protocolo='T18-2'; select id into c from public.ocorrencias where protocolo='T18-3';
 insert into public.denuncias(ocorrencia_id,motivo) values(a,'duplicado');
 insert into public.respostas(ocorrencia_id,autor_vinculo,contato,texto) values(a,'Órgão teste','segredo-contato','Resposta fictícia de teste');
 perform set_config('request.jwt.claim.sub',u::text,true); perform set_config('request.jwt.claims','{"aal":"aal2"}',true); set local role authenticated;
 begin perform public.admin_moderar_ocorrencia(a,'remover','Complemento','inventado'); raise exception 'motivo livre aceito'; exception when sqlstate '22023' then null; end;
 begin perform public.admin_moderar_ocorrencia(a,'remover','Complemento'); raise exception 'motivo ausente aceito'; exception when sqlstate '22023' then null; end;
 begin perform public.admin_moderar_ocorrencia(a,'remover',' ','spam'); raise exception 'complemento vazio aceito'; exception when sqlstate '22023' then null; end;
 begin insert into public.motivos_remocao values('inventado','Livre'); raise exception 'tabela motivos aberta'; exception when insufficient_privilege then null; end;
 begin perform public.admin_moderar_lote(array[a,gen_random_uuid()],'aprovar'); raise exception 'lote parcial aceito'; exception when no_data_found then null; end;
 if (select moderacao from public.ocorrencias where id=a)<>'pendente' then raise exception 'lote sem atomicidade'; end if;
 reset role;
 if exists(select 1 from public.historico_moderacao where ocorrencia_id=a) then raise exception 'lote deixou auditoria parcial'; end if;
 set local role authenticated;
 begin perform public.admin_moderar_lote(array(select gen_random_uuid() from generate_series(1,51)),'aprovar'); raise exception 'limite lote ignorado'; exception when sqlstate '22023' then null; end;
 begin perform public.admin_moderar_lote(array[a,a],'aprovar'); raise exception 'IDs repetidos aceitos'; exception when sqlstate '22023' then null; end;
 begin perform public.admin_moderar_lote(array[a],'remover','Teste'); raise exception 'ação lote indevida'; exception when sqlstate '22023' then null; end;
 select count(*) into n from public.admin_moderar_lote(array[a,b],'aprovar');
 if n<>2 then raise exception 'resultado lote incompleto'; end if;
 select public.admin_detalhar_ocorrencia(a) into resultado;
 if resultado::text like '%segredo-contato%' or jsonb_array_length(resultado->'denuncias')<>1 then raise exception 'detalhe expôs contato ou perdeu filhos'; end if;
 begin perform public.admin_listar_auditoria(); raise exception 'moderador leu auditoria'; exception when insufficient_privilege then null; end;
 begin perform public.admin_ver_contato(a); raise exception 'moderador leu contato'; exception when insufficient_privilege then null; end;
 begin perform public.admin_convidar_administrador(gen_random_uuid(),'moderador','Teste'); raise exception 'moderador geriu equipe'; exception when insufficient_privilege then null; end;
 begin perform public.admin_mesclar_duplicata(a,a,'Duplicada'); raise exception 'mescla consigo aceita'; exception when sqlstate '22023' then null; end;
 perform public.admin_mesclar_duplicata(a,b,'Duplicada confirmada');
 begin perform public.admin_mesclar_duplicata(a,b,'Repetida'); raise exception 'mescla removida aceita'; exception when sqlstate '22023' then null; end;
 begin perform public.admin_moderar_ocorrencia(a,'restaurar','Teste'); raise exception 'moderador restaurou'; exception when insufficient_privilege then null; end;
 reset role;
 if not exists(select 1 from public.historico_moderacao where ocorrencia_id=a and acao='mesclar_duplicata' and antes->>'moderacao'='publicado' and depois->>'duplicata_de'=b::text) then raise exception 'auditoria mescla incompleta'; end if;
 if (select count(*) from public.denuncias where ocorrencia_id=a)<>1 or exists(select 1 from public.denuncias where ocorrencia_id=b) then raise exception 'mescla transferiu denúncia'; end if;
 if (select count(*) from public.historico_moderacao where acao='aprovar' and ocorrencia_id in(a,b))<>2 then raise exception 'auditoria lote incompleta'; end if;
 begin update public.historico_moderacao set motivo='Adulterado' where ocorrencia_id=a; raise exception 'auditoria mutável'; exception when insufficient_privilege then null; end;
 begin delete from public.historico_moderacao where ocorrencia_id=a; raise exception 'auditoria deletável'; exception when insufficient_privilege then null; end;
 set local role anon;
 if exists(select 1 from public.v_ocorrencias_publicas where id=a) or not exists(select 1 from public.v_ocorrencias_publicas where id=b) then raise exception 'mescla pública incorreta'; end if;
 reset role;
 perform set_config('request.jwt.claim.sub',g::text,true); set local role authenticated;
 select count(*) into n from public.admin_listar_auditoria(a,u,'mesclar_duplicata',now()-interval '1 day',now()+interval '1 day');
 if n<>1 then raise exception 'filtros auditoria incorretos'; end if;
 perform public.admin_ver_contato(a);
 begin perform public.admin_convidar_administrador(gen_random_uuid(),'moderador','Teste'); raise exception 'gestor geriu equipe'; exception when insufficient_privilege then null; end;
 perform public.admin_moderar_ocorrencia(a,'restaurar','Revisão de mescla');
 perform public.admin_moderar_ocorrencia(c,'remover','Exposição identificada','dados_pessoais');
 reset role;
 if not exists(select 1 from public.ocorrencias where id=c and motivo_remocao_codigo='dados_pessoais' and motivo_remocao='Exposição identificada') then raise exception 'remoção sem motivo fechado'; end if;
 foreach v_papel in array array['moderador','gestor','superadmin'] loop
  update public.administradores set papel=v_papel::public.papel_admin where user_id=u;
  perform set_config('request.jwt.claim.sub',u::text,true); perform set_config('request.jwt.claims','{"aal":"aal1"}',true); set local role authenticated;
  begin perform public.admin_detalhar_ocorrencia(a); raise exception 'AAL1 detalhe autorizado'; exception when insufficient_privilege then null; end;
  begin perform public.admin_moderar_lote(array[a],'aprovar'); raise exception 'AAL1 lote autorizado'; exception when insufficient_privilege then null; end;
  begin perform public.admin_mesclar_duplicata(a,b,'Teste'); raise exception 'AAL1 mescla autorizada'; exception when insufficient_privilege then null; end;
  begin perform public.admin_moderar_ocorrencia(a,'aprovar'); raise exception 'AAL1 moderação autorizada'; exception when insufficient_privilege then null; end;
  begin perform public.admin_listar_auditoria(); raise exception 'AAL1 auditoria autorizada'; exception when insufficient_privilege then null; end;
  reset role;
 end loop;
 perform set_config('request.jwt.claims','{"aal":"aal2"}',true);
 perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true); set local role authenticated;
 begin perform public.admin_detalhar_ocorrencia(a); raise exception 'sem papel leu detalhe'; exception when insufficient_privilege then null; end;
 begin perform public.admin_moderar_lote(array[a],'aprovar'); raise exception 'sem papel moderou lote'; exception when insufficient_privilege then null; end;
 begin perform public.admin_mesclar_duplicata(a,b,'Teste'); raise exception 'sem papel mesclou'; exception when insufficient_privilege then null; end;
 begin perform public.admin_listar_auditoria(); raise exception 'sem papel leu auditoria'; exception when insufficient_privilege then null; end;
 reset role;
 update public.administradores set ativo=false where user_id=u;
 perform set_config('request.jwt.claim.sub',u::text,true); set local role authenticated;
 begin perform public.admin_detalhar_ocorrencia(a); raise exception 'inativo leu detalhe'; exception when insufficient_privilege then null; end;
 reset role;
 foreach f in array array['admin_moderar_ocorrencia(uuid,text,text,text)','admin_mesclar_duplicata(uuid,uuid,text)','admin_moderar_lote(uuid[],text,text)','admin_listar_auditoria(uuid,uuid,text,timestamptz,timestamptz,integer,integer)','admin_detalhar_ocorrencia(uuid)'] loop
  if has_function_privilege('anon','public.'||f,'execute') or has_function_privilege('service_role','public.'||f,'execute') or not has_function_privilege('authenticated','public.'||f,'execute') then raise exception 'EXECUTE operações incorreto'; end if;
 end loop;
end $$;
rollback;


