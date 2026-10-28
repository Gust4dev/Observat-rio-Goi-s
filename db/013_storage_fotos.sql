-- Observatório Goiás — 013: limites de Storage alinhados ao pipeline de fotos do M4 (somente Supabase)
-- O servidor reencoda toda foto para JPEG de até 2 MiB (src/lib/registro/imagem.ts) antes de gravar na
-- quarentena; o bucket repete esse limite como segunda barreira. Idempotente.
update storage.buckets
   set file_size_limit = 2097152,
       allowed_mime_types = array['image/jpeg']
 where id in ('imagens-quarentena', 'imagens-publicas');
