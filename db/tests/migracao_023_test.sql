begin;
do $$
declare mun smallint; cat smallint; oc uuid; i integer; j integer;
begin
 insert into public.categorias(slug,nome) values('e2e-sec-indicadores','[E2E-SEC] indicadores') returning id into cat;
 for i in 1..3 loop
  insert into public.municipios(ibge_codigo,slug,nome) values(5299800+i,'e2e-sec-indicadores-'||i,'[E2E-SEC] '||i) returning id into mun;
  for j in 1..case when i=1 then 4 else 5 end loop
   insert into public.ocorrencias(protocolo,municipio_id,categoria_id,titulo,descricao,moderacao,situacao,publicado_em)
   values('E2E-SEC-IND-'||i||'-'||j,mun,cat,'[E2E-SEC] indicador','Descrição sintética para teste de supressão.', 'publicado',
    case when i<3 then 'resolvido'::public.situacao_ocorrencia else 'registrado'::public.situacao_ocorrencia end,'2036-01-10') returning id into oc;
   if i<3 then
    insert into public.atualizacoes(ocorrencia_id,tipo,situacao_nova,texto,evidencia,publica)
    values(oc,'resposta_oficial','resolvido','[E2E-SEC] resposta','https://exemplo.invalid/evidencia',true);
   end if;
  end loop;
 end loop;
 set local role anon;
 if exists(select 1 from public.v_dados_painel where municipio_slug='e2e-sec-indicadores-1') then raise exception '023 célula pequena exposta';end if;
 if (select total_ocorrencias from public.v_indicadores_gerais) <> (select coalesce(sum(total),0) from public.v_dados_painel) then raise exception '023 total global revela diferença suprimida';end if;
 if (select com_resposta_oficial from public.v_indicadores_gerais) <> (select coalesce(sum(com_resposta_oficial),0) from public.v_dados_painel) then raise exception '023 resposta global revela diferença suprimida';end if;
 if (select resolvidas_documentadas from public.v_indicadores_gerais) <> (select coalesce(sum(resolvidas_documentadas),0) from public.v_dados_painel) then raise exception '023 resolução global revela diferença suprimida';end if;
 if (select municipios_com_registros from public.v_indicadores_gerais) <> (select count(distinct municipio_slug) from public.v_dados_painel) then raise exception '023 municípios globais incluem coorte suprimida';end if;
 if (select sum(total) from public.v_indicadores_municipio_categoria where categoria_slug='e2e-sec-indicadores') <> 10 then raise exception '023 fixture segura ausente';end if;
 if (select total from public.v_indicadores_mensal where mes='2036-01-01') <> 10 then raise exception '023 subtotal mensal inclui ocultas';end if;
end $$;
rollback;
