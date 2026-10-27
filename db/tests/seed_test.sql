-- Testa os seeds 008 (municípios) e staging_ficticio. Rodar num banco novo (migrações + 006 + 007 + seeds).
-- Contagens absolutas: reexecutar após aplicar os seeds de novo prova a idempotência.
do $$
declare n integer; r record;
begin
  -- municípios
  select count(*) into n from public.municipios;
  if n <> 246 then raise exception 'FALHOU: municípios = %', n; end if;
  select count(distinct slug) into n from public.municipios;
  if n <> 246 then raise exception 'FALHOU: slugs únicos = %', n; end if;

  -- ocorrências no total e não publicadas
  select count(*) into n from public.ocorrencias;
  if n <> 28 then raise exception 'FALHOU: ocorrências = %', n; end if;
  select count(*) into n from public.ocorrencias where protocolo not like 'TESTE-%' or titulo not like '[TESTE] %';
  if n <> 0 then raise exception 'FALHOU: ocorrência fora do padrão de teste (%)', n; end if;
  select count(*) into n from public.ocorrencias where moderacao <> 'publicado';
  if n <> 4 then raise exception 'FALHOU: não publicadas = %', n; end if;
  select count(distinct moderacao) into n from public.ocorrencias where moderacao <> 'publicado';
  if n <> 3 then raise exception 'FALHOU: faltam estados pendente/retido/removido'; end if;

  -- cobertura (publicadas)
  select count(distinct categoria_id) into n from public.ocorrencias where moderacao = 'publicado';
  if n <> 11 then raise exception 'FALHOU: categorias cobertas = %', n; end if;
  select count(distinct situacao) into n from public.ocorrencias where moderacao = 'publicado';
  if n <> 7 then raise exception 'FALHOU: situações cobertas = %', n; end if;
  select count(*) into n from public.atualizacoes a where a.tipo = 'resposta_oficial' and a.publica;
  if n < 2 then raise exception 'FALHOU: respostas oficiais = %', n; end if;
  select count(*) into n from public.ocorrencias o where o.situacao = 'resolvido' and o.moderacao = 'publicado'
    and exists (select 1 from public.atualizacoes a where a.ocorrencia_id = o.id and a.situacao_nova = 'resolvido'
                and char_length(btrim(coalesce(a.evidencia, ''))) > 0);
  if n < 2 then raise exception 'FALHOU: resolvidas com evidência = %', n; end if;

  -- sem contato, sem imagens
  select count(*) into n from public.contatos_privados;
  if n <> 0 then raise exception 'FALHOU: seed não deve ter contatos'; end if;
  select count(*) into n from public.imagens;
  if n <> 0 then raise exception 'FALHOU: seed não deve ter imagens'; end if;

  -- views públicas (como anon)
  set local role anon;
  select count(*) into n from public.v_ocorrencias_publicas;
  if n <> 24 then raise exception 'FALHOU: v_ocorrencias_publicas = %', n; end if;
  select count(distinct municipio_slug) into n from public.v_ocorrencias_publicas;
  if n < 4 then raise exception 'FALHOU: municípios nas views = %', n; end if;
  select count(*) into n from public.v_ocorrencias_publicas where municipio_slug not in ('anapolis','goiania','ceres','jaragua');
  if n <> 0 then raise exception 'FALHOU: município inesperado nas views'; end if;
  select count(*) into n from public.v_ocorrencias_publicas
    where protocolo in ('TESTE-025','TESTE-026','TESTE-027','TESTE-028') or titulo ilike '%moderação (teste)%'
       or titulo ilike '%retido%' or titulo ilike '%removido%';
  if n <> 0 then raise exception 'FALHOU: ocorrência não publicada vazou (%)', n; end if;
  select count(*) into n from public.v_atualizacoes_publicas where texto like '%não pode vazar%' or texto like '%não pública%';
  if n <> 0 then raise exception 'FALHOU: atualização indevida nas views (%)', n; end if;
  select count(*) into n from public.v_atualizacoes_publicas;
  if n < 20 then raise exception 'FALHOU: linha do tempo pública pequena (%)', n; end if;

  -- indicadores batem com as contagens
  select * into r from public.v_indicadores_gerais;
  if r.total_ocorrencias <> 24 or r.municipios_com_registros <> 4 or r.com_resposta_oficial <> 4
     or r.resolvidas_documentadas <> 3 then
    raise exception 'FALHOU: indicadores gerais = %', r;
  end if;
  select coalesce(sum(total), 0) into n from public.v_indicadores_situacao;
  if n <> 24 then raise exception 'FALHOU: soma situação = %', n; end if;
  select coalesce(sum(total), 0) into n from public.v_indicadores_municipio_categoria;
  if n <> 24 then raise exception 'FALHOU: soma município/categoria = %', n; end if;
  select coalesce(sum(total), 0) into n from public.v_indicadores_mensal;
  if n <> 24 then raise exception 'FALHOU: soma mensal = %', n; end if;
  reset role;

  raise notice 'ok: seeds';
end $$;
