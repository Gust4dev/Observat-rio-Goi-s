-- Observatório Goiás — dados de teste FICTÍCIOS para o ambiente de staging.
-- NUNCA aplicar em produção. Tudo aqui é sintético: títulos com prefixo '[TESTE]', ruas e bairros
-- inventados, sem nomes de pessoas, órgãos ou locais reais. Sem imagens.
-- Requer 006 (categorias) e 008 (municípios) já aplicados.
-- Idempotente: marcador estável = protocolo 'TESTE-NNN'; reexecutar não duplica.
-- Aplicar:  npx supabase db query --linked --project-ref <ref-staging> -f db/seed/staging_ficticio.sql

-- ---------------------------------------------------------------- TRAVA DE SEGURANÇA
-- Aborta se existir qualquer ocorrência que não seja deste seed (protege contra produção/dado real).
do $$
begin
  -- Tolera apenas o resíduo anonimizado de uma exclusão a pedido do titular (teste ponta a ponta):
  -- a linha fica como 'removido' por desenho (auditoria somente-inserção) e não é dado real.
  if exists (select 1 from public.ocorrencias o where o.protocolo not like 'TESTE-%'
             and not (o.moderacao = 'removido' and o.motivo_remocao = 'Exclusão solicitada pelo titular')) then
    raise exception 'TRAVA DO SEED: existem ocorrências que não são de teste; abortando (nunca rodar em produção).';
  end if;
  if (select count(*) from public.municipios) <> 246 then
    raise exception 'TRAVA DO SEED: aplique 008_seed_municipios.sql antes (esperados 246 municípios).';
  end if;
end $$;

-- ---------------------------------------------------------------- ocorrências
insert into public.ocorrencias
  (protocolo, municipio_id, categoria_id, titulo, descricao, situacao, moderacao, anonimo, verificado,
   motivo_remocao, criado_em, publicado_em)
select d.protocolo, m.id, c.id, '[TESTE] ' || d.titulo,
       'Registro fictício e sintético, criado só para testes do sistema. ' || d.descricao,
       d.situacao::public.situacao_ocorrencia, d.moderacao::public.moderacao_ocorrencia,
       d.anonimo, d.protocolo in ('TESTE-003','TESTE-006','TESTE-012','TESTE-013','TESTE-019'),
       d.motivo,
       now() - make_interval(days => d.dias + 1),
       case when d.moderacao = 'publicado' then now() - make_interval(days => d.dias) end
  from (values
    ('TESTE-001','anapolis','saude','Fila de espera no posto da Rua das Palmeiras de Mentira','Relato inventado sobre demora em atendimento num posto imaginário.','registrado','publicado',false,null,3),
    ('TESTE-002','anapolis','educacao','Telhado de escola fictícia no Bairro Jardim Imaginário','Relato inventado sobre goteiras numa escola que não existe.','em_analise','publicado',false,null,12),
    ('TESTE-003','anapolis','infraestrutura','Buraco na Avenida Sem Nome do Setor Fictício','Relato inventado sobre buraco numa avenida que não existe.','encaminhado','publicado',true,null,20),
    ('TESTE-004','anapolis','seguranca','Praça sem policiamento no Residencial Faz de Conta','Relato inventado sobre sensação de insegurança numa praça imaginária.','aguardando_resposta','publicado',false,null,25),
    ('TESTE-005','anapolis','transporte','Ponto de ônibus sem cobertura na Rua Exemplo Um','Relato inventado sobre ponto de ônibus sem abrigo numa rua inventada.','em_atendimento','publicado',true,null,30),
    ('TESTE-006','goiania','iluminacao-publica','Poste apagado na Rua Exemplo Dois, Vila Teste','Relato inventado sobre poste apagado, já tratado no cenário de teste.','resolvido','publicado',false,null,60),
    ('TESTE-007','goiania','saneamento','Esgoto a céu aberto no Conjunto Inventado','Relato inventado sobre esgoto num conjunto habitacional imaginário.','encerrado_sem_solucao','publicado',false,null,45),
    ('TESTE-008','goiania','meio-ambiente','Lixo acumulado no Parque Imaginário','Relato inventado sobre acúmulo de lixo num parque que não existe.','registrado','publicado',true,null,2),
    ('TESTE-009','goiania','emprego','Vagas não preenchidas no Centro de Trabalho Fictício','Relato inventado sobre atendimento de um posto de emprego imaginário.','em_analise','publicado',false,null,9),
    ('TESTE-010','goiania','servicos-publicos','Coleta de entulho atrasada na Rua Exemplo Três','Relato inventado sobre atraso de coleta numa rua inventada.','encaminhado','publicado',false,null,18),
    ('TESTE-011','goiania','outros','Sinalização confusa no Terminal Imaginário','Relato inventado sobre placas confusas num terminal que não existe.','aguardando_resposta','publicado',true,null,22),
    ('TESTE-012','ceres','infraestrutura','Calçada quebrada na Rua Exemplo Quatro','Relato inventado sobre calçada danificada numa rua inventada.','em_atendimento','publicado',false,null,35),
    ('TESTE-013','ceres','saude','Falta de sinalização no posto do Bairro Faz de Conta','Relato inventado sobre sinalização num posto imaginário, já resolvido.','resolvido','publicado',false,null,70),
    ('TESTE-014','ceres','iluminacao-publica','Lâmpada piscando na Travessa Inventada','Relato inventado sobre lâmpada defeituosa numa travessa imaginária.','registrado','publicado',true,null,1),
    ('TESTE-015','ceres','transporte','Horário irregular da linha Fictícia 99','Relato inventado sobre atraso de uma linha de ônibus imaginária.','em_analise','publicado',false,null,8),
    ('TESTE-016','ceres','saneamento','Vazamento de água na Rua Exemplo Cinco','Relato inventado sobre vazamento numa rua inventada.','encaminhado','publicado',false,null,14),
    ('TESTE-017','jaragua','educacao','Falta de merenda na Escola Modelo Fictícia','Relato inventado sobre merenda numa escola que não existe.','aguardando_resposta','publicado',true,null,28),
    ('TESTE-018','jaragua','meio-ambiente','Queimada em terreno baldio do Setor Imaginário','Relato inventado sobre fogo num terreno inexistente.','em_atendimento','publicado',false,null,16),
    ('TESTE-019','jaragua','seguranca','Cruzamento perigoso na Rua Exemplo Seis','Relato inventado sobre cruzamento sem sinalização, já resolvido.','resolvido','publicado',false,null,80),
    ('TESTE-020','jaragua','servicos-publicos','Atendimento fechado no Balcão Fictício','Relato inventado sobre balcão de atendimento imaginário.','encerrado_sem_solucao','publicado',false,null,50),
    ('TESTE-021','anapolis','iluminacao-publica','Quadra escura no Bairro Jardim Imaginário','Relato inventado sobre falta de luz numa quadra imaginária.','registrado','publicado',true,null,4),
    ('TESTE-022','goiania','infraestrutura','Ponte de madeira instável no Córrego Inventado','Relato inventado sobre uma ponte que não existe.','em_atendimento','publicado',false,null,40),
    ('TESTE-023','ceres','outros','Placa de rua caída na Rua Exemplo Sete','Relato inventado sobre placa de rua caída numa rua inventada.','em_analise','publicado',false,null,6),
    ('TESTE-024','jaragua','infraestrutura','Bueiro entupido na Avenida Exemplo Oito','Relato inventado sobre bueiro numa avenida inventada.','encaminhado','publicado',true,null,11),
    -- NÃO publicadas: não podem aparecer nas views públicas
    ('TESTE-025','anapolis','saude','Relato pendente de moderação (teste)','Relato inventado aguardando triagem; não deve aparecer em lugar nenhum.','registrado','pendente',true,null,0),
    ('TESTE-026','goiania','seguranca','Relato pendente de moderação (teste)','Relato inventado aguardando triagem; não deve aparecer em lugar nenhum.','registrado','pendente',true,null,0),
    ('TESTE-027','ceres','meio-ambiente','Relato retido para análise (teste)','Relato inventado retido por sinal da triagem; não deve aparecer em lugar nenhum.','registrado','retido',true,null,1),
    ('TESTE-028','jaragua','outros','Relato removido (teste)','Relato inventado removido da moderação; não deve aparecer em lugar nenhum.','registrado','removido',true,'Conteúdo de teste removido para validar o fluxo de remoção.',5)
  ) as d(protocolo, muni, cat, titulo, descricao, situacao, moderacao, anonimo, motivo, dias)
  join public.municipios m on m.slug = d.muni
  join public.categorias c on c.slug = d.cat
on conflict (protocolo) do nothing;

-- ---------------------------------------------------------------- confirmações (chaves sintéticas)
insert into public.confirmacoes (ocorrencia_id, chave_dedup_hash)
select o.id, sha256(convert_to('teste-' || o.protocolo || '-' || g, 'UTF8'))
  from public.ocorrencias o
 cross join generate_series(1, 3) g
 where o.protocolo in ('TESTE-001','TESTE-003','TESTE-006','TESTE-010')
on conflict do nothing;

-- ---------------------------------------------------------------- linha do tempo (atualizações)
-- 1) mudança de situação para cada ocorrência publicada que não está em 'registrado'
--    ('resolvido' leva evidência; link .invalid nunca resolve, é só um marcador de teste)
insert into public.atualizacoes (ocorrencia_id, tipo, situacao_nova, texto, evidencia, publica, criado_em)
select o.id, 'mudanca_situacao', o.situacao,
       'Situação alterada para "' || o.situacao || '" (dado fictício de teste).',
       case when o.situacao = 'resolvido' then 'https://exemplo.invalid/evidencia/' || o.protocolo end,
       true, o.publicado_em + interval '1 day'
  from public.ocorrencias o
 where o.protocolo like 'TESTE-%' and o.moderacao = 'publicado' and o.situacao <> 'registrado'
   and not exists (select 1 from public.atualizacoes a
                    where a.ocorrencia_id = o.id and a.tipo = 'mudanca_situacao');

-- 2) providências, evidências, respostas oficiais e notas (inclui uma nota NÃO pública e
--    uma atualização "pública" em ocorrência NÃO publicada, que não pode vazar)
insert into public.atualizacoes (ocorrencia_id, tipo, texto, evidencia, publica, criado_em)
select o.id, a.tipo::public.tipo_atualizacao, a.texto, a.evidencia, a.publica, o.criado_em + make_interval(days => a.dia)
  from (values
    ('TESTE-003','providencia','Providência fictícia: equipe de teste acionada para vistoria.',null,true,3),
    ('TESTE-005','resposta_oficial','Resposta oficial fictícia: o órgão imaginário informou que a obra de teste está em andamento.',null,true,5),
    ('TESTE-005','providencia','Providência fictícia: material de teste solicitado.',null,true,8),
    ('TESTE-010','resposta_oficial','Resposta oficial fictícia: o órgão imaginário previu a coleta de teste para a próxima semana.',null,true,4),
    ('TESTE-006','resposta_oficial','Resposta oficial fictícia: o serviço de teste foi concluído pelo órgão imaginário.',null,true,10),
    ('TESTE-006','evidencia','Evidência fictícia da conclusão do serviço de teste.','https://exemplo.invalid/evidencia/TESTE-006-extra',true,12),
    ('TESTE-018','resposta_oficial','Resposta oficial fictícia: brigada imaginária enviada ao local de teste.',null,true,3),
    ('TESTE-013','providencia','Providência fictícia: placas de teste instaladas.',null,true,6),
    ('TESTE-019','evidencia','Evidência fictícia: registro de teste da nova sinalização.','https://exemplo.invalid/evidencia/TESTE-019-extra',true,9),
    ('TESTE-012','nota','Nota interna fictícia (não pública): conferir andamento.',null,false,5),
    ('TESTE-027','nota','Nota fictícia marcada como pública em ocorrência retida: não pode vazar.',null,true,1)
  ) as a(protocolo, tipo, texto, evidencia, publica, dia)
  join public.ocorrencias o on o.protocolo = a.protocolo
 where not exists (select 1 from public.atualizacoes x where x.ocorrencia_id = o.id and x.texto = a.texto);
