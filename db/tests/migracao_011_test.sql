do $$
declare h bytea:=sha256('t11-img'::bytea); oc uuid; a uuid; b uuid;
  caminho text:=repeat('a',64)||'/1/'||repeat('b',64)||'.jpg'; n integer;
  mun smallint; cat smallint;
begin
  select id into mun from public.municipios limit 1;
  select id into cat from public.categorias limit 1;
  set local role service_role;
  select out_id into oc from public.registrar_ocorrencia(
    mun,cat,
    'Calçada de teste', 'Descrição fictícia suficiente para o contrato de teste.',
    true,null,null,false,null,h,'pendente');
  a:=public.registrar_imagem(h,1::smallint,caminho,'image/jpeg',2000,'Buraco na calçada');
  b:=public.registrar_imagem(h,1::smallint,caminho,'image/jpeg',2000,'Buraco na calçada');
  if a<>b then raise exception 'retry duplicou foto'; end if;
  begin perform public.registrar_imagem(h,1::smallint,replace(caminho,repeat('b',64),repeat('c',64)),'image/jpeg',2000,'Outra foto'); raise exception 'slot substituído'; exception when unique_violation then null; end;
  begin perform public.registrar_imagem(h,2::smallint,replace(caminho,'/1/','/2/'),'image/jpeg',2000,null); raise exception 'sem contexto'; exception when sqlstate '22023' then null; end;
  begin perform public.registrar_imagem(h,2::smallint,'https://evil.test/foto','image/jpeg',2000,'Calçada'); raise exception 'URL aceita'; exception when sqlstate '22023' then null; end;
  for n in 2..3 loop perform public.registrar_imagem(h,n::smallint,replace(caminho,'/1/','/'||n||'/'),'image/jpeg',2000,'Calçada'); end loop;
  begin perform public.registrar_imagem(h,4::smallint,caminho,'image/jpeg',2000,'Calçada'); raise exception 'quarta aceita'; exception when sqlstate '22023' then null; end;
  reset role;
  select count(*) into n from public.imagens where ocorrencia_id=oc;
  if n<>3 then raise exception 'quantidade incorreta'; end if;
  if not exists(select 1 from public.imagens where id=a and descricao_contexto='Buraco na calçada' and moderacao='pendente') then raise exception 'metadados ausentes'; end if;
  if has_function_privilege('anon','public.registrar_imagem(bytea,smallint,text,text,integer,text)','EXECUTE') or has_function_privilege('authenticated','public.registrar_imagem(bytea,smallint,text,text,integer,text)','EXECUTE') then raise exception 'grant indevido'; end if;
end $$;
