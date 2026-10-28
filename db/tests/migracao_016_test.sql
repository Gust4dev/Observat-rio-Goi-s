begin;
do $$
declare u uuid:=gen_random_uuid(); oc uuid; img uuid; op uuid; p record; ck jsonb:='{"rosto":false,"menor":false,"placa":false,"numero_residencia":false,"documento":false,"agressao":false}';
begin
 if to_regprocedure('public.admin_moderar_imagem(uuid,text,text)') is not null then raise exception 'assinatura antiga existe';end if;
 insert into auth.users(id,email) values(u,'m4-admin@example.invalid');
 insert into public.administradores(user_id,papel) values(u,'moderador');
 insert into public.ocorrencias(protocolo,municipio_id,categoria_id,titulo,descricao) select 'T16',m.id,c.id,'Relato fictício','Descrição fictícia suficiente para este teste.' from public.municipios m,public.categorias c limit 1 returning id into oc;
 insert into public.imagens(ocorrencia_id,ordem,caminho_storage,tipo_mime,tamanho_bytes) values(oc,1,repeat('8',64)||'/1/'||repeat('9',64)||'.jpg','image/jpeg',100) returning id into img;
 perform set_config('request.jwt.claim.sub',u::text,true);set local role authenticated;
 select * into p from public.admin_preparar_imagem(img,'aprovar');op:=p.out_operacao;
 begin perform public.admin_moderar_imagem(img,'aprovar',null,'Buraco visível','{}'::jsonb,op);raise exception 'checklist incompleto aceito';exception when sqlstate '22023' then null;end;
 begin perform public.admin_preparar_imagem(img,'remover');raise exception 'lease simultâneo aceito';exception when sqlstate '55P03' then null;end;
 begin perform public.admin_moderar_imagem(img,'aprovar',null,null,ck,op);raise exception 'alt vazio aceito';exception when sqlstate '22023' then null;end;
 begin perform public.admin_moderar_imagem(img,'aprovar',null,'Buraco visível',ck||'{"placa":true}',op);raise exception 'checklist risco aceito';exception when sqlstate '22023' then null;end;
 perform public.admin_moderar_imagem(img,'aprovar',null,'Buraco visível',ck,op);
 select * into p from public.admin_preparar_imagem(img,'aprovar');
 perform public.admin_moderar_imagem(img,'aprovar',null,'Buraco visível',ck,p.out_operacao);
 reset role;
 if (select count(*) from public.historico_moderacao where ocorrencia_id=oc and acao='imagem_aprovar')<>1 then raise exception 'aprovação duplicou histórico';end if;
 if not exists(select 1 from public.historico_moderacao where ocorrencia_id=oc and depois->'checklist'=ck and depois->>'descricao_publica'='Buraco visível') then raise exception 'checklist/alt ausente';end if;
 set local role authenticated;select * into p from public.admin_preparar_imagem(img,'remover');
 perform public.admin_moderar_imagem(img,'remover','Retirada fictícia',null,ck,p.out_operacao);reset role;
 if (select moderacao from public.imagens where id=img)<>'removido' then raise exception 'remoção não mudou estado';end if;
 perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);set local role authenticated;
 begin perform public.admin_preparar_imagem(img,'aprovar');raise exception 'sem papel autorizou';exception when insufficient_privilege then null;end;reset role;
 set local role anon;
 begin perform public.admin_preparar_imagem(img,'aprovar');raise exception 'anon autorizou';exception when insufficient_privilege then null;end;reset role;
end $$;
rollback;


