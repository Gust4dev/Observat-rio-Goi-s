begin;
do $$
declare mun smallint; cat smallint; oc uuid; oculto uuid; removido uuid; n integer; cols text[];
begin
  select array_agg(column_name::text order by ordinal_position) into cols
    from information_schema.columns where table_schema='public' and table_name='v_imagens_publicas';
  if cols<>array['id','ocorrencia_id','ordem','descricao_publica'] then raise exception 'contrato público de imagens incorreto: %',cols; end if;
  select id into mun from public.municipios limit 1;
  select id into cat from public.categorias limit 1;
  insert into public.ocorrencias(protocolo,municipio_id,categoria_id,titulo,descricao,moderacao,publicado_em)
    values('TEST-FOTO-14',mun,cat,'Foto pública de teste','Descrição fictícia para contrato público de imagens.','publicado',now()) returning id into oc;
  insert into public.ocorrencias(protocolo,municipio_id,categoria_id,titulo,descricao,moderacao)
    values('TEST-FOTO-14-PEND',mun,cat,'Relato pendente','Descrição fictícia para contrato público de imagens.','pendente') returning id into oculto;
  insert into public.ocorrencias(protocolo,municipio_id,categoria_id,titulo,descricao,moderacao,motivo_remocao)
    values('TEST-FOTO-14-REM',mun,cat,'Relato removido','Descrição fictícia para contrato público de imagens.','removido','Fixture fictícia removida') returning id into removido;
  insert into public.imagens(ocorrencia_id,ordem,caminho_storage,tipo_mime,tamanho_bytes,moderacao,descricao_publica) values
    (oc,1,'q/test14-publica.jpg','image/jpeg',100,'publicado','Pavimento com buraco visível'),
    (oc,2,'q/test14-sem-alt.jpg','image/jpeg',100,'publicado',null),
    (oc,3,'q/test14-pendente.jpg','image/jpeg',100,'pendente','Descrição que aguarda revisão'),
    (oculto,1,'q/test14-oculto.jpg','image/jpeg',100,'publicado','Foto de relato pendente'),
    (removido,1,'q/test14-removido.jpg','image/jpeg',100,'publicado','Foto de relato removido');
  set local role anon;
  select count(*) into n from public.v_imagens_publicas where ocorrencia_id in (oc,oculto,removido);
  if n<>1 then raise exception 'imagem sem aprovação/alt/relato público vazou: %',n; end if;
  if not exists(select 1 from public.v_imagens_publicas where ocorrencia_id=oc and descricao_publica='Pavimento com buraco visível') then raise exception 'alt público ausente'; end if;
  reset role;
  update public.imagens set moderacao='removido' where ocorrencia_id=oc and ordem=1;
  set local role anon;
  select count(*) into n from public.v_imagens_publicas where ocorrencia_id=oc;
  if n<>0 then raise exception 'imagem removida ainda aparece'; end if;
  reset role;
  if has_column_privilege('anon','public.imagens','descricao_publica','UPDATE') or has_column_privilege('authenticated','public.imagens','descricao_publica','UPDATE') or has_column_privilege('service_role','public.imagens','descricao_publica','UPDATE') then raise exception 'escrita direta de alt público permitida'; end if;
end $$;
rollback;
