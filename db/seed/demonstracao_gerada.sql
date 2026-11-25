-- Observatório Goiás — dados GERADOS de demonstração (~1.750 relatos, todos com gerado = true).
-- São sintéticos: títulos com prefixo '[GERADO]', ruas inventadas, sem pessoas, órgãos ou locais reais.
-- Ficam no mesmo banco dos relatos reais, mas só aparecem quando o site está no modo administrativo
-- "desenvolvimento" (ver 027). No modo "produção" o site mostra apenas relatos criados por pessoas.
-- Requer 006 (categorias), 008 (municípios) e 027 (coluna gerado). Idempotente: protocolos determinísticos
-- 'GERADO-AAMM-NNNN' (blocos densos), 'GERADO-T-NNNN' (cauda), 'GERADO-P-NN' (fila); reexecutar no mesmo mês
-- não duplica, e em outro mês só acrescenta os meses novos.
-- Remover tudo: db/seed/remover_gerados.sql.
--
-- Desenho: o painel e os indicadores suprimem células com menos de 5 relatos (019). Por isso os municípios
-- grandes recebem relatos em BLOCOS de 5 a 7 por (município, categoria, situação, mês), todos com a mesma
-- resposta oficial (ou nenhuma) e, nas resolvidas, todos com evidência: assim o painel não esconde o seed.
-- Os municípios menores recebem poucos relatos recentes só para aparecerem no mapa e nas listas.
-- Aplicar:  npx supabase db query --linked --project-ref <ref> -f db/seed/demonstracao_gerada.sql

do $$
begin
  if not exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'ocorrencias' and column_name = 'gerado') then
    raise exception 'SEED GERADO: aplique db/027_dados_gerados.sql antes.';
  end if;
  if (select count(*) from public.municipios) <> 246 then
    raise exception 'SEED GERADO: aplique 008_seed_municipios.sql antes (esperados 246 municípios).';
  end if;
  if (select count(*) from public.categorias) < 11 then
    raise exception 'SEED GERADO: aplique 006_seed_categorias.sql antes.';
  end if;
end $$;

-- número pseudoaleatório determinístico em [0,1) a partir de uma chave
create or replace function pg_temp.u(chave text) returns numeric language sql immutable as $$
  select (abs(hashtextextended(chave, 0) % 100000)) / 100000.0
$$;
-- uma célula (município, categoria, situação, mês) inteira tem resposta oficial, ou nenhuma
create or replace function pg_temp.celula_com_resposta(muni text, cat text, sit text, mes text) returns boolean
  language sql immutable as $$ select pg_temp.u(muni || '|' || cat || '|' || sit || '|' || mes || '|r') < 0.34 $$;

drop table if exists pg_temp._titulos;
create temp table _titulos (cat text primary key, titulos text[], detalhe text);
insert into _titulos values
 ('saude', array['Fila de espera no posto de saúde','Falta de medicamento na farmácia da unidade','Consulta demorada na policlínica','Ambulância sem atendimento no bairro'], 'Atendimento de saúde descrito de forma genérica e inventada.'),
 ('educacao', array['Goteiras na escola municipal','Falta de merenda na escola','Transporte escolar atrasado','Sala de aula sem ventilador'], 'Situação escolar descrita de forma genérica e inventada.'),
 ('infraestrutura', array['Buraco na avenida principal','Calçada quebrada perto da praça','Ponte com cabeceira danificada','Rua sem pavimentação após a chuva'], 'Problema de via pública descrito de forma genérica e inventada.'),
 ('seguranca', array['Praça sem policiamento à noite','Cruzamento sem sinalização','Terreno baldio usado como ponto de risco','Faixa de pedestres apagada'], 'Sensação de insegurança descrita de forma genérica e inventada.'),
 ('transporte', array['Ponto de ônibus sem cobertura','Linha de ônibus com atraso frequente','Terminal sem informação de horários','Ônibus lotado no horário de pico'], 'Dificuldade de transporte descrita de forma genérica e inventada.'),
 ('iluminacao-publica', array['Poste apagado na rua','Lâmpada piscando na travessa','Quadra inteira às escuras','Praça sem iluminação'], 'Falha de iluminação descrita de forma genérica e inventada.'),
 ('saneamento', array['Esgoto a céu aberto','Vazamento de água na calçada','Bueiro entupido','Falta de água no bairro'], 'Problema de saneamento descrito de forma genérica e inventada.'),
 ('meio-ambiente', array['Lixo acumulado em terreno','Queimada em área vazia','Árvore caída sobre a rua','Córrego com mau cheiro'], 'Problema ambiental descrito de forma genérica e inventada.'),
 ('emprego', array['Atendimento demorado no posto de emprego','Vagas divulgadas sem retorno','Curso de qualificação sem turma','Balcão de emprego fechado'], 'Dificuldade de acesso a emprego descrita de forma genérica e inventada.'),
 ('servicos-publicos', array['Coleta de entulho atrasada','Atendimento fechado no balcão municipal','Fila no serviço de documentos','Limpeza de rua irregular'], 'Falha de serviço público descrita de forma genérica e inventada.'),
 ('outros', array['Sinalização confusa no terminal','Placa de rua caída','Banco de praça quebrado','Quadra esportiva sem manutenção'], 'Ocorrência diversa descrita de forma genérica e inventada.');

-- ---------------------------------------------------------------- blocos densos (entram no painel)
insert into public.ocorrencias
  (protocolo, municipio_id, categoria_id, titulo, descricao, situacao, moderacao, anonimo, verificado, gerado, criado_em, publicado_em)
select 'GERADO-' || to_char(b.mes_ref, 'YYMM') || '-' || lpad((row_number() over (
         partition by b.mes_ref order by b.cidade, b.cat, b.sit, b.k))::text, 4, '0'),
       b.municipio_id, b.categoria_id,
       '[GERADO] ' || t.titulos[1 + floor(pg_temp.u(b.chave || 't') * 4)::int] || ' — Rua Exemplo ' || (1 + floor(pg_temp.u(b.chave || 'n') * 60)::int),
       'Relato fictício gerado automaticamente para demonstração do sistema; não descreve uma situação real. ' || t.detalhe,
       b.sit::public.situacao_ocorrencia, 'publicado',
       pg_temp.u(b.chave || 'a') < 0.4,
       b.sit in ('resolvido','encaminhado') and pg_temp.u(b.chave || 'v') < 0.5,
       true,
       b.publicado - interval '3 hours', b.publicado
  from (
    select cid.slug as cidade, cat.slug as cat, m.id as municipio_id, cat.id as categoria_id, s.sit, mm.mes_ref, k.k,
           cid.slug || '|' || cat.slug || '|' || s.sit || '|' || mm.mes_ref || '|' || k.k as chave,
           case when mm.d = 0
             then now() - make_interval(secs => (
                    greatest(0, least(pg_temp.u(cid.slug || cat.slug || s.sit || mm.mes_ref || k.k) ^ 2,  1) * mm.horas_disp - 0.01) * 3600))
             else (mm.mes_ref::timestamp at time zone 'America/Sao_Paulo')
                  + make_interval(secs => pg_temp.u(cid.slug || cat.slug || s.sit || mm.mes_ref || k.k) * (mm.horas_disp - 1) * 3600)
           end as publicado
      from (values ('goiania'),('aparecida-de-goiania'),('anapolis'),('rio-verde'),('luziania'),
                   ('aguas-lindas-de-goias'),('catalao'),('itumbiara')) as cid(slug)
      join public.municipios m on m.slug = cid.slug
      cross join public.categorias cat
      cross join (values ('registrado'),('em_analise'),('encaminhado'),('aguardando_resposta'),
                         ('em_atendimento'),('resolvido'),('encerrado_sem_solucao')) as s(sit)
      cross join lateral (
        select d,
               (date_trunc('month', now() at time zone 'America/Sao_Paulo') - make_interval(months => d))::date as mes_ref,
               case when d = 0
                 then extract(epoch from (now() at time zone 'America/Sao_Paulo') - date_trunc('month', now() at time zone 'America/Sao_Paulo')) / 3600.0
                 else extract(epoch from (date_trunc('month', now() at time zone 'America/Sao_Paulo')
                        - (date_trunc('month', now() at time zone 'America/Sao_Paulo') - interval '1 month'))) / 3600.0
               end as horas_disp
          from generate_series(0, 1) d
      ) mm
      cross join lateral generate_series(1, 5 + floor(pg_temp.u(cid.slug || cat.slug || s.sit || mm.mes_ref || 'q') * 3)::int) as k(k)
     where pg_temp.u(cid.slug || '|' || cat.slug) < 0.6
       and pg_temp.u(cid.slug || '|' || cat.slug || '|' || s.sit) < 0.3
  ) b
  join _titulos t on t.cat = b.cat
on conflict (protocolo) do nothing;

-- ---------------------------------------------------------------- cauda: municípios menores (mapa e listas)
insert into public.ocorrencias
  (protocolo, municipio_id, categoria_id, titulo, descricao, situacao, moderacao, anonimo, verificado, gerado, criado_em, publicado_em)
select 'GERADO-T-' || lpad((row_number() over (order by x.slug, x.k))::text, 4, '0'),
       m.id, c.id,
       '[GERADO] ' || t.titulos[1 + floor(pg_temp.u(x.chave || 't') * 4)::int] || ' — Rua Exemplo ' || (1 + floor(pg_temp.u(x.chave || 'n') * 60)::int),
       'Relato fictício gerado automaticamente para demonstração do sistema; não descreve uma situação real. ' || t.detalhe,
       (array['registrado','registrado','em_analise','encaminhado','aguardando_resposta','em_atendimento','resolvido','encerrado_sem_solucao'])
         [1 + floor(pg_temp.u(x.chave || 's') * 8)::int]::public.situacao_ocorrencia,
       'publicado', pg_temp.u(x.chave || 'a') < 0.4, false, true,
       x.publicado - interval '3 hours', x.publicado
  from (
    select s.slug, k.k, s.slug || '|' || k.k as chave,
           (array['saude','educacao','infraestrutura','seguranca','transporte','iluminacao-publica','saneamento','meio-ambiente','emprego','servicos-publicos','outros'])
             [1 + floor(pg_temp.u(s.slug || '|' || k.k || 'c') * 11)::int] as cat,
           -- os 3 primeiros ficam nos últimos 7 dias (o mapa só marca município com 3+ relatos na semana)
           now() - make_interval(secs => (case when k.k <= 3 then pg_temp.u(s.slug || '|' || k.k || 'd') * 6.5
                                               else pg_temp.u(s.slug || '|' || k.k || 'd') * 25 end) * 86400)  as publicado
      from (values ('valparaiso-de-goias'),('trindade'),('formosa'),('novo-gama'),('senador-canedo'),('jatai'),
                   ('planaltina'),('caldas-novas'),('goianesia'),('mineiros'),('cristalina'),('inhumas'),('jaragua'),
                   ('ceres'),('quirinopolis'),('morrinhos'),('porangatu'),('niquelandia'),('uruacu'),('pires-do-rio'),
                   ('ipora'),('crixas'),('silvania'),('santa-helena-de-goias'),('goianira'),('cidade-ocidental'),
                   ('bela-vista-de-goias'),('padre-bernardo'),('alexania'),('pirenopolis')) as s(slug)
      cross join lateral generate_series(1, 3 + floor(pg_temp.u(s.slug || 'q') * 4)::int) as k(k)
  ) x
  join public.municipios m on m.slug = x.slug
  join public.categorias c on c.slug = x.cat
  join _titulos t on t.cat = x.cat
on conflict (protocolo) do nothing;

-- ---------------------------------------------------------------- fila de moderação (só o admin vê)
insert into public.ocorrencias
  (protocolo, municipio_id, categoria_id, titulo, descricao, situacao, moderacao, anonimo, gerado, criado_em, publicado_em)
select 'GERADO-P-' || lpad(f.n::text, 2, '0'), m.id, c.id,
       '[GERADO] Relato aguardando moderação ' || f.n,
       'Relato fictício gerado automaticamente para demonstração da fila de moderação; não descreve uma situação real.',
       'registrado', f.moderacao::public.moderacao_ocorrencia, true, true,
       now() - make_interval(hours => f.n * 3), null
  from (values (1,'goiania','saude','pendente'),(2,'anapolis','seguranca','pendente'),(3,'rio-verde','infraestrutura','pendente'),
               (4,'aparecida-de-goiania','transporte','pendente'),(5,'luziania','saneamento','pendente'),
               (6,'catalao','meio-ambiente','pendente'),(7,'goiania','outros','retido'),(8,'itumbiara','servicos-publicos','retido')
       ) as f(n, muni, cat, moderacao)
  join public.municipios m on m.slug = f.muni
  join public.categorias c on c.slug = f.cat
on conflict (protocolo) do nothing;

-- ---------------------------------------------------------------- linha do tempo
-- mudança de situação (resolvidas levam evidência; o link .invalid nunca resolve)
insert into public.atualizacoes (ocorrencia_id, tipo, situacao_nova, texto, evidencia, publica, criado_em)
select o.id, 'mudanca_situacao', o.situacao,
       'Situação alterada para "' || o.situacao || '" (atualização gerada para demonstração).',
       case when o.situacao = 'resolvido' then 'https://exemplo.invalid/evidencia/' || o.protocolo end,
       true, least(o.publicado_em + interval '1 day', now())
  from public.ocorrencias o
 where o.gerado and o.moderacao = 'publicado' and o.situacao <> 'registrado'
   and not exists (select 1 from public.atualizacoes a where a.ocorrencia_id = o.id and a.tipo = 'mudanca_situacao');

-- resposta oficial: célula inteira (blocos densos) ou ~15% da cauda
insert into public.atualizacoes (ocorrencia_id, tipo, texto, publica, criado_em)
select o.id, 'resposta_oficial',
       'Resposta oficial fictícia: o órgão imaginário informou que o caso de demonstração está sendo tratado.',
       true, least(o.publicado_em + interval '2 days', now())
  from public.ocorrencias o
  join public.municipios m on m.id = o.municipio_id
  join public.categorias c on c.id = o.categoria_id
 where o.gerado and o.moderacao = 'publicado' and o.situacao <> 'registrado'
   and ((o.protocolo ~ '^GERADO-[0-9]{4}-'
         and pg_temp.celula_com_resposta(m.slug, c.slug, o.situacao::text,
               to_char(o.publicado_em at time zone 'America/Sao_Paulo', 'YYMM')))
     or (o.protocolo like 'GERADO-T-%' and pg_temp.u(o.protocolo || 'r') < 0.15))
   and not exists (select 1 from public.atualizacoes a where a.ocorrencia_id = o.id and a.tipo = 'resposta_oficial');

-- ---------------------------------------------------------------- confirmações ("isso também me afeta")
insert into public.confirmacoes (ocorrencia_id, chave_dedup_hash)
select o.id, sha256(convert_to('gerado-' || o.protocolo || '-' || g, 'UTF8'))
  from public.ocorrencias o
  cross join lateral generate_series(1, 1 + floor(pg_temp.u(o.protocolo || 'n') * 14)::int) g
 where o.gerado and o.moderacao = 'publicado' and pg_temp.u(o.protocolo || 'c') < 0.35
on conflict do nothing;
