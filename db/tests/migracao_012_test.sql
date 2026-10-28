begin;
do $$
declare mun smallint; cat smallint; oc uuid; n integer; before_n integer;
begin
 select id into mun from public.municipios limit 1;
 select id into cat from public.categorias limit 1;
 select resolvidas_documentadas into before_n from public.v_indicadores_gerais;
 for n in 1..5 loop
 insert into public.ocorrencias(protocolo,municipio_id,categoria_id,titulo,descricao,situacao,moderacao,publicado_em)
 values('TEST-DADOS-'||n,mun,cat,'Fixture painel','Descrição fictícia suficiente para testar indicadores.', 'resolvido',case when n=5 then 'pendente'::public.moderacao_ocorrencia else 'publicado'::public.moderacao_ocorrencia end,'2026-01-10') returning id into oc;
 if n<>1 then
 insert into public.atualizacoes(ocorrencia_id,tipo,situacao_nova,texto,evidencia,publica)
 values(oc,'mudanca_situacao','resolvido','Justificativa publicada',case when n=2 then '   ' else 'https://example.test/evidencia' end,n<>3);
 end if;
 end loop;
 select resolvidas_documentadas into n from public.v_indicadores_gerais;
 if n<>before_n+1 then raise exception 'resolução exige texto + evidência públicos: esperado %, veio %',before_n+1,n;end if;
 set local role anon;
 if (select sum(resolvidas_documentadas) from public.v_dados_painel)<>n then raise exception 'agregação diverge de gerais'; end if;
 if (select sum(total) from public.v_dados_painel)<>(select total_ocorrencias from public.v_indicadores_gerais) then raise exception 'total agregado incorreto';end if;
end $$;
rollback;
