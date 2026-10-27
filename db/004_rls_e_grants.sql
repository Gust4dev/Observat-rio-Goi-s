-- Observatório Goiás — 004: RLS e privilégios
-- Modelo: negar tudo, liberar o mínimo.
--   anon           -> SELECT nas views públicas e nas tabelas de referência. Nada mais.
--   authenticated  -> SELECT nas tabelas operacionais, filtrado por RLS conforme o papel (administradores);
--                     escritas somente via funções admin_* (002). Sem acesso direto a dado pessoal.
--   service_role   -> executa só as funções do servidor (registrar_*, acompanhar_*, ...).

-- ---------------------------------------------------------------- limpa privilégios padrão
revoke all on all tables    in schema public from public, anon, authenticated;
revoke all on all sequences in schema public from public, anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated, service_role;
alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- ---------------------------------------------------------------- RLS
alter table public.municipios           enable row level security;
alter table public.categorias           enable row level security;
alter table public.ocorrencias          enable row level security;
alter table public.tokens_gestao        enable row level security;  -- sem políticas: ninguém lê
alter table public.contatos_privados    enable row level security;  -- sem políticas: ninguém lê (usar admin_ver_contato)
alter table public.imagens              enable row level security;
alter table public.atualizacoes         enable row level security;
alter table public.confirmacoes         enable row level security;  -- sem políticas
alter table public.denuncias            enable row level security;
alter table public.respostas            enable row level security;
alter table public.administradores      enable row level security;
alter table public.historico_moderacao  enable row level security;

-- referência pública
create policy leitura_publica on public.municipios for select to anon, authenticated using (true);
create policy leitura_publica on public.categorias for select to anon, authenticated using (true);

-- leitura operacional (moderador ou acima)
create policy admin_le on public.ocorrencias  for select to authenticated using (interno.eh_admin('moderador'));
create policy admin_le on public.imagens      for select to authenticated using (interno.eh_admin('moderador'));
create policy admin_le on public.atualizacoes for select to authenticated using (interno.eh_admin('moderador'));
create policy admin_le on public.denuncias    for select to authenticated using (interno.eh_admin('moderador'));
create policy admin_le on public.respostas    for select to authenticated using (interno.eh_admin('moderador'));

-- auditoria: gestor ou acima
create policy gestor_le on public.historico_moderacao for select to authenticated using (interno.eh_admin('gestor'));

-- administradores: cada um vê a própria linha; superadmin vê e gerencia todas
create policy ve_proprio_ou_superadmin on public.administradores for select to authenticated
  using (user_id = (select auth.uid()) or interno.eh_admin('superadmin'));
create policy superadmin_insere on public.administradores for insert to authenticated
  with check (interno.eh_admin('superadmin'));
create policy superadmin_altera on public.administradores for update to authenticated
  using (interno.eh_admin('superadmin')) with check (interno.eh_admin('superadmin'));
create policy superadmin_remove on public.administradores for delete to authenticated
  using (interno.eh_admin('superadmin'));

-- ---------------------------------------------------------------- GRANTs de tabelas e views
grant select on public.municipios, public.categorias to anon, authenticated;

grant select on public.v_ocorrencias_publicas, public.v_imagens_publicas, public.v_atualizacoes_publicas,
                public.v_respostas_publicas, public.v_indicadores_gerais, public.v_indicadores_municipio_categoria,
                public.v_indicadores_mensal, public.v_indicadores_situacao
  to anon, authenticated;

grant select on public.ocorrencias, public.imagens, public.atualizacoes, public.denuncias,
                public.respostas, public.historico_moderacao
  to authenticated;
grant select, insert, update, delete on public.administradores to authenticated;
-- contatos_privados, tokens_gestao e confirmacoes: nenhum GRANT para anon/authenticated.

-- ---------------------------------------------------------------- funções
grant usage on schema interno to authenticated;   -- as políticas chamam interno.eh_admin
grant execute on function interno.papel_atual()                    to authenticated;
grant execute on function interno.eh_admin(public.papel_admin)     to authenticated;

-- administração (usuário autenticado; o papel é checado dentro de cada função)
grant execute on function public.admin_moderar_ocorrencia(uuid, text, text)                                          to authenticated;
grant execute on function public.admin_atualizar_situacao(uuid, public.situacao_ocorrencia, text, text, boolean)     to authenticated;
grant execute on function public.admin_adicionar_atualizacao(uuid, public.tipo_atualizacao, text, text, boolean)     to authenticated;
grant execute on function public.admin_moderar_imagem(uuid, text, text)                                              to authenticated;
grant execute on function public.admin_ver_contato(uuid)                                                             to authenticated;
grant execute on function public.admin_resolver_denuncia(bigint, public.status_denuncia)                             to authenticated;
grant execute on function public.admin_revisar_resposta(bigint, text, text)                                          to authenticated;

-- servidor (Edge Functions com service_role)
grant execute on function public.registrar_ocorrencia(smallint, smallint, text, text, boolean, text, text, boolean, text, bytea, public.moderacao_ocorrencia, integer) to service_role;
grant execute on function public.acompanhar_por_token(bytea)                  to service_role;
grant execute on function public.solicitar_exclusao_por_token(bytea, boolean) to service_role;
grant execute on function public.registrar_denuncia(uuid, text, text)         to service_role;
grant execute on function public.registrar_confirmacao(uuid, bytea)           to service_role;
