-- Testa 027 (coluna gerado + filtro nas views) com o seed demonstracao_gerada.sql já aplicado
-- em banco novo (migrações 001–027 + 008 + 006). Chamado por run-pglite.mjs.
begin;
do $$
declare n integer; n_pub integer; r record; dens integer; gerado_id uuid;
begin
  select count(*) into n from public.ocorrencias where gerado;
  if n < 900 then raise exception 'GERADO: poucos relatos gerados (%)', n; end if;
  select count(*) into n from public.ocorrencias where gerado and (protocolo not like 'GERADO-%' or titulo not like '[GERADO] %');
  if n <> 0 then raise exception 'GERADO: relato gerado fora do padrão de marcação (%)', n; end if;
  select count(*) into n from public.ocorrencias where moderacao <> 'publicado' and gerado;
  if n <> 8 then raise exception 'GERADO: fila de moderação gerada = %', n; end if;
  select count(*) into n_pub from public.ocorrencias where gerado and moderacao = 'publicado';

  -- relato criado por uma pessoa (gerado = false), com atualização pública
  insert into public.ocorrencias (protocolo, municipio_id, categoria_id, titulo, descricao, moderacao, publicado_em)
    select 'OG-REAL-0001', m.id, c.id, 'Relato real de teste', 'Descrição humana com mais de vinte caracteres.', 'publicado', now()
      from public.municipios m, public.categorias c where m.slug = 'goiania' and c.slug = 'saude';
  insert into public.atualizacoes (ocorrencia_id, tipo, texto, publica)
    select id, 'nota', 'Nota pública real.', true from public.ocorrencias where protocolo = 'OG-REAL-0001';

  select id into gerado_id from public.ocorrencias where gerado and moderacao = 'publicado' limit 1;

  begin
    update public.ocorrencias set titulo = 'Edição indevida' where id = gerado_id;
    raise exception 'GERADO: edição de relato de demonstração foi aceita';
  exception when invalid_parameter_value then null;
  end;

  set local role anon;

  -- ---- modo produção (sem cabeçalho): só o real aparece
  select count(*) into n from public.v_ocorrencias_publicas;
  if n <> 1 then raise exception 'GERADO: sem cabeçalho a view devia mostrar só o real (%)', n; end if;
  select count(*) into n from public.v_atualizacoes_publicas;
  if n <> 1 then raise exception 'GERADO: atualizações geradas vazaram sem cabeçalho (%)', n; end if;
  select * into r from public.v_indicadores_gerais;
  if r.total_ocorrencias <> 0 then raise exception 'GERADO: indicadores contam gerados sem cabeçalho (%)', r.total_ocorrencias; end if;
  if exists (select 1 from public.v_dados_painel) then raise exception 'GERADO: painel mostra gerados sem cabeçalho'; end if;

  -- cabeçalho com outro valor não liga o modo
  perform set_config('request.headers', '{"x-modo-gerados":"0"}', true);
  select count(*) into n from public.v_ocorrencias_publicas;
  if n <> 1 then raise exception 'GERADO: cabeçalho 0 ligou o modo (%)', n; end if;

  -- O cabeçalho por si só não autoriza a leitura.
  perform set_config('request.headers', '{"x-modo-gerados":"1"}', true);
  select count(*) into n from public.v_ocorrencias_publicas;
  if n <> 1 then raise exception 'GERADO: leitura anônima aceitou cabeçalho (%)', n; end if;
  set local role authenticated;
  select count(*) into n from public.v_ocorrencias_publicas;
  if n <> 1 then raise exception 'GERADO: leitura autenticada aceitou cabeçalho (%)', n; end if;

  -- Só o cliente privilegiado do servidor pode incluir o seed.
  set local role service_role;
  perform set_config('request.headers', '{"x-modo-gerados":"1"}', true);
  select count(*) into n from public.v_ocorrencias_publicas;
  if n <> n_pub + 1 then raise exception 'GERADO: modo gerados mostra % (esperado %)', n, n_pub + 1; end if;
  select count(*) into n from public.v_ocorrencias_publicas where gerado;
  if n <> n_pub then raise exception 'GERADO: coluna gerado inconsistente (%)', n; end if;
  select count(*) into n from public.v_ocorrencias_publicas where not gerado and protocolo <> 'OG-REAL-0001';
  if n <> 0 then raise exception 'GERADO: relato real inesperado'; end if;
  select count(*) into n from public.v_ocorrencias_publicas where titulo like '%aguardando moderação%';
  if n <> 0 then raise exception 'GERADO: relato não publicado vazou'; end if;
  select count(*) into n from public.v_atualizacoes_publicas;
  if n < 500 then raise exception 'GERADO: linha do tempo gerada pequena (%)', n; end if;

  if public.registrar_confirmacao(gerado_id, decode(repeat('10',32),'hex'))
     or public.registrar_denuncia(gerado_id, 'outro', null, decode(repeat('11',32),'hex'))
     or public.registrar_resposta(gerado_id, 'Órgão fictício', 'teste@example.org', 'Resposta fictícia para teste.', decode(repeat('12',32),'hex')) then
    raise exception 'GERADO: participação escreveu em relato de demonstração';
  end if;

  -- o painel/indicadores não podem esconder o seed por causa da supressão k=5
  select * into r from public.v_indicadores_gerais;
  if r.total_ocorrencias < n_pub * 0.7 then raise exception 'GERADO: supressão escondeu o seed (% de %)', r.total_ocorrencias, n_pub; end if;
  if r.municipios_com_registros < 8 then raise exception 'GERADO: municípios no painel = %', r.municipios_com_registros; end if;
  if r.com_resposta_oficial < 50 then raise exception 'GERADO: respostas oficiais no painel = %', r.com_resposta_oficial; end if;
  if r.resolvidas_documentadas < 30 then raise exception 'GERADO: resolvidas documentadas no painel = %', r.resolvidas_documentadas; end if;
  select count(*) into n from public.v_indicadores_municipio_categoria;
  if n < 40 then raise exception 'GERADO: poucas linhas município/categoria (%)', n; end if;

  -- mapa: municípios com 3+ relatos nos últimos 7 dias
  select count(*) into n from (
    select municipio_slug from public.v_ocorrencias_publicas
     where publicado_em >= now() - interval '7 days' group by 1 having count(*) >= 3) q;
  if n < 25 then raise exception 'GERADO: municípios com 3+ relatos na semana = %', n; end if;
  select count(*) into dens from public.v_ocorrencias_publicas where publicado_em >= now() - interval '7 days';
  if dens < 150 then raise exception 'GERADO: relatos na semana = %', dens; end if;

  reset role;
  perform set_config('request.headers', '', true);
end $$;
rollback;
