-- Observatório Goiás — 005: Storage (somente Supabase; não roda no teste local)
--
-- Dois buckets:
--   imagens-quarentena  PRIVADO. Todo upload entra aqui (feito pela Edge Function com service_role,
--                       após validar tipo/tamanho e remover EXIF). Ninguém lê sem URL assinada.
--   imagens-publicas    PÚBLICO (leitura por URL). Recebe a imagem só depois de admin_moderar_imagem('aprovar'),
--                       copiada pela Edge Function de aprovação.
--
-- Não criamos políticas em storage.objects para anon/authenticated: sem política = sem acesso por API.
-- Escrita e URLs assinadas passam por Edge Functions (service_role).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('imagens-quarentena', 'imagens-quarentena', false, 5242880, array['image/jpeg','image/png','image/webp']),
  ('imagens-publicas',   'imagens-publicas',   true,  5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- Se uma imagem for removida depois de publicada, a Edge Function apaga o objeto de imagens-publicas.
