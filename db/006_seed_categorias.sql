-- Observatório Goiás — 006: categorias iniciais
insert into public.categorias (slug, nome, ordem) values
  ('saude',               'Saúde',               1),
  ('educacao',            'Educação',            2),
  ('infraestrutura',      'Infraestrutura',      3),
  ('seguranca',           'Segurança',           4),
  ('transporte',          'Transporte',          5),
  ('iluminacao-publica',  'Iluminação pública',  6),
  ('saneamento',          'Saneamento',          7),
  ('meio-ambiente',       'Meio ambiente',       8),
  ('emprego',             'Emprego',             9),
  ('servicos-publicos',   'Serviços públicos',  10),
  ('outros',              'Outros',             99)
on conflict (slug) do nothing;

-- Municípios (246): popular a partir da API do IBGE, NÃO digitar à mão:
--   https://servicodados.ibge.gov.br/api/v1/localidades/estados/52/municipios
-- Gerar slug sem acento/minúsculas e conferir que a contagem final é 246.
