-- Antes de remover_gerados.sql: existe um relato real com linha do tempo, e os gatilhos somente-inserção
-- estão ativos. Chamado por run-pglite.mjs (insere o real, roda a remoção, confere com remocao_gerados_depois_test.sql).
insert into public.ocorrencias (protocolo, municipio_id, categoria_id, titulo, descricao, moderacao, publicado_em)
  select 'OG-REAL-0002', m.id, c.id, 'Relato real que deve sobreviver', 'Descrição humana com mais de vinte caracteres.', 'publicado', now()
    from public.municipios m, public.categorias c where m.slug = 'goiania' and c.slug = 'saude';
insert into public.atualizacoes (ocorrencia_id, tipo, texto, publica)
  select id, 'nota', 'Nota real que deve sobreviver.', true from public.ocorrencias where protocolo = 'OG-REAL-0002';
