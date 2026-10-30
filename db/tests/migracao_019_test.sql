begin;
do $$
declare mun smallint; cat smallint; oc uuid; i integer; j integer;
begin
 insert into public.categorias(slug,nome) values('m6-categoria','M6 categoria') returning id into cat;
 for i in 1..5 loop
  insert into public.municipios(ibge_codigo,slug,nome) values(5299900+i,'m6-'||i,'M6 '||i) returning id into mun;
  for j in 1..case when i=1 then 4 when i=3 then 9 when i=4 then 6 else 5 end loop
   insert into public.ocorrencias(protocolo,municipio_id,categoria_id,titulo,descricao,moderacao,publicado_em)
   values('M6-'||i||'-'||j,mun,cat,'Teste M6','Descrição fictícia para supressão M6.', 'publicado',
    case when i=3 and j>5 then '2035-02-10'::timestamptz else '2035-01-10'::timestamptz end) returning id into oc;
   if i=4 and j=1 then
    insert into public.atualizacoes(ocorrencia_id,tipo,texto,publica) values(oc,'resposta_oficial','Resposta pública fictícia',true);
   end if;
  end loop;
 end loop;
 set local role anon;
 if exists(select 1 from public.v_dados_painel where municipio_slug='m6-1') then raise exception 'M6 célula pequena exposta';end if;
 if not exists(select 1 from public.v_dados_painel where municipio_slug='m6-2' and total=5) then raise exception 'M6 limiar não publicado';end if;
 if exists(select 1 from public.v_dados_painel where municipio_slug='m6-3') then raise exception 'M6 supressão complementar ausente';end if;
 if exists(select 1 from public.v_dados_painel where municipio_slug='m6-4') then raise exception 'M6 subcontagem pequena exposta';end if;
 if (select sum(total) from public.v_indicadores_municipio_categoria where categoria_slug='m6-categoria')<>10 then raise exception 'M6 subtotal recupera células';end if;
 if exists(select 1 from public.v_indicadores_mensal where total<5) or exists(select 1 from public.v_indicadores_situacao where total<5) then raise exception 'M6 subtotal pequeno';end if;
 if (select total from public.v_indicadores_mensal where mes='2035-01-01')<>10 then raise exception 'M6 mensal inclui ocultas';end if;
 if (select total_ocorrencias from public.v_indicadores_gerais)<29 then raise exception 'M6 global foi suprimido';end if;
end $$;
rollback;
