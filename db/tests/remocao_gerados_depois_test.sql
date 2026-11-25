-- Depois de remover_gerados.sql: nenhum gerado, o real continua, e os gatilhos de auditoria foram religados.
do $$
declare n integer;
begin
  if exists (select 1 from public.ocorrencias where gerado) then raise exception 'REMOÇÃO: sobraram relatos gerados'; end if;
  select count(*) into n from public.ocorrencias where protocolo = 'OG-REAL-0002';
  if n <> 1 then raise exception 'REMOÇÃO: o relato real foi apagado'; end if;
  select count(*) into n from public.atualizacoes a join public.ocorrencias o on o.id = a.ocorrencia_id where o.protocolo = 'OG-REAL-0002';
  if n <> 1 then raise exception 'REMOÇÃO: a linha do tempo do real foi apagada'; end if;
  if exists (select 1 from public.atualizacoes a where a.texto like '%gerada para demonstração%') then
    raise exception 'REMOÇÃO: sobraram atualizações geradas';
  end if;
  if exists (select 1 from public.confirmacoes) then raise exception 'REMOÇÃO: sobraram confirmações geradas'; end if;
  begin
    update public.atualizacoes set texto = 'alterado' where texto = 'Nota real que deve sobreviver.';
    raise exception 'REMOÇÃO: gatilho somente-inserção não foi religado';
  exception when sqlstate '42501' then null;
  end;
end $$;
