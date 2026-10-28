begin;
do $$
declare h bytea:=sha256('t15'::bytea); oc uuid; a uuid; b uuid; mun smallint; cat smallint; raw text:=repeat('c',64); caminho text:=repeat('e',64)||'/1/'||repeat('f',64)||'.jpg';
begin
 select id into mun from public.municipios limit 1; select id into cat from public.categorias limit 1;
 set local role service_role;
 select out_id into oc from public.registrar_ocorrencia(mun,cat,'Foto teste quinze','Descrição fictícia para verificar idempotência de imagens.',true,null,null,false,null,h,'pendente');
 if exists(select 1 from public.consultar_slot_imagem(h,1::smallint,raw,'Primeiro contexto')) then raise exception 'slot novo ocupado'; end if;
 a:=public.registrar_imagem(h,1::smallint,caminho,'image/jpeg',100,'Primeiro contexto',raw);
 select out_id into b from public.consultar_slot_imagem(h,1::smallint,raw,'Contexto alterado');
 if a<>b then raise exception 'retry sem identidade'; end if;
 b:=public.registrar_imagem(h,1::smallint,caminho,'image/jpeg',100,'Contexto novo',raw);
 if a<>b then raise exception 'retry duplicou'; end if;
 begin perform public.consultar_slot_imagem(h,1::smallint,repeat('d',64),'Outra foto');raise exception 'slot sobrescrito'; exception when unique_violation then null; end;
 reset role;
 if (select descricao_contexto from public.imagens where id=a)<>'Contexto novo' then raise exception 'contexto pendente não atualizado';end if;
 update public.imagens set moderacao='publicado' where id=a;
 set local role service_role; perform public.consultar_slot_imagem(h,1::smallint,raw,'Não alterar publicado');reset role;
 if (select descricao_contexto from public.imagens where id=a)<>'Contexto novo' then raise exception 'contexto publicado alterado';end if;
 if has_function_privilege('anon','public.consultar_slot_imagem(bytea,smallint,text,text)','execute') then raise exception 'preflight anon';end if;
end $$;
rollback;
