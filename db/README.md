# Banco de dados (PostgreSQL / Supabase) **[PROPOSTO]**

Migrações em ordem. Descrição das tabelas e dos estados em [`../docs/modelo-de-dados.md`](../docs/modelo-de-dados.md).

| Arquivo | Conteúdo |
|---|---|
| `001_tipos_e_tabelas.sql` | Tipos, tabelas, índices, gatilhos (somente-inserção, anonimato) |
| `002_funcoes.sql` | Funções auxiliares (`interno`), funções do servidor e funções administrativas `admin_*` |
| `003_views.sql` | Visões públicas e indicadores |
| `004_rls_e_grants.sql` | RLS, políticas e privilégios |
| `005_storage.sql` | Buckets (só no Supabase) |
| `006_seed_categorias.sql` | Categorias; municípios vêm da API do IBGE |
| `007_lacunas_do_desenho.sql` | Idempotência, fotos, direito de resposta, limite de taxa, retenção (com `pg_cron`), sinais de triagem, fila de moderação |
| `tests/` | Stub do Supabase, testes de segurança (`rls_test.sql`, `migracao_007_test.sql`) e executor |

### Funções do servidor (`service_role`) — contrato resumido
| Função | Retorna | Observação |
|---|---|---|
| `registrar_ocorrencia(..., p_chave_idempotencia, p_origem_hash)` | `out_id`, `out_protocolo`, `out_repetida` | Repetição com a mesma chave **e mesmo token** devolve a existente; com outro token, erro `22023` |
| `registrar_imagem(token_hash, ordem, caminho, mime, tamanho)` | id da imagem | Nasce `pendente`; ordem 1–3; token inválido → `P0002` |
| `registrar_resposta(ocorrencia, vinculo, contato, texto)` | boolean | `false` se a ocorrência não está publicada; entra `pendente` |
| `triagem_sinais(titulo, descricao, origem_hash, janela, limite)` | `out_texto_repetido`, `out_origem_sinalizada` | Os limiares vêm do servidor (não públicos) |
| `consumir_limite(chave, janela, maximo)` | boolean | `false` = estourou. Janela fixa; a chave é composta no servidor |
| `interno.limpar_expirados()` | jsonb com contagens | Agendada às 06:00 UTC (`pg_cron`, job `limpeza-diaria`): contatos vencidos, hashes de triagem >30 dias, contadores >2 dias |

Fila de moderação do painel: `v_fila_moderacao` (`security_invoker`; sem papel, devolve zero linhas).

## Modelo de acesso
| Quem | Pode |
|---|---|
| `anon` (público) | `SELECT` nas views `v_*` e em `municipios`/`categorias`. Nada mais. |
| `authenticated` com papel | `SELECT` nas tabelas operacionais (filtrado por papel); **escreve apenas via `admin_*`**, que registram em `historico_moderacao` |
| `authenticated` sem papel | Nada (RLS devolve zero linhas; funções `admin_*` negam) |
| `service_role` (Edge Functions) | Executa `registrar_*`, `acompanhar_por_token`, `solicitar_exclusao_por_token` |

Papéis: `moderador` < `gestor` < `superadmin`. Ler dado pessoal (`admin_ver_contato`) exige `gestor` e é registrado.

## Rodar os testes (sem Docker)
```bash
npm i @electric-sql/pglite
node db/tests/run-pglite.mjs
```
Cobrem: o que `anon` não consegue ler ou executar, escrita direta bloqueada, matriz de `EXECUTE` por papel,
regras de moderação (motivo obrigatório, "resolvido" exige evidência), auditoria somente-inserção,
anonimato sem contato, exclusão a pedido do titular.

**No Supabase real (sem deixar dados):** executar a suíte dentro de uma transação desfeita no fim.
```bash
# monta: begin; rls_test.sql; migracao_007_test.sql; rollback;
npx supabase db query --linked --project-ref <ref> -f suite_staging.sql
```
Sem erro = passou (qualquer falha vira exceção e a transação é desfeita). Nunca rodar fora de `BEGIN ... ROLLBACK`: os testes criam usuários e dados.

**Limites:** PGlite não é o Supabase (não valida PostgREST, JWT real, Storage nem Auth). Antes do lançamento,
repetir os testes no projeto Supabase real e fazer um teste de invasão básico via API com a chave `anon`.

## Avisos do linter do Supabase (`supabase db advisors`) — aceitos de propósito
| Aviso | Motivo de aceitar |
|---|---|
| `security_definer_view` (ERRO, nas 8 views `v_*`) | As views rodam com o dono para ler tabelas que o público não pode ler. É o mecanismo de isolamento: só colunas seguras, sempre filtrando `moderacao = 'publicado'`. Alternativa possível: `security_invoker` + políticas por coluna em cada tabela (mais superfície de erro). Reavaliar se o Supabase passar a tratar como bloqueio |
| `authenticated_security_definer_function_executable` (7 funções `admin_*`) | Intencional: o painel chama essas funções com a sessão do admin, e cada uma exige papel dentro do corpo. Sem papel, nada acontece (testado) |

Observação: o teste de matriz de execução no Supabase real acusa 1 função (`rls_auto_enable`), que é do próprio Supabase e não do projeto.

## Pontos de atenção ao implementar
- Nunca usar a chave `service_role` no navegador; só nas Edge Functions.
- Toda função nova em `public` fica **sem** `EXECUTE` para `anon`/`authenticated` até um `GRANT` explícito.
- Ao criar uma view pública nova, listar as colunas à mão e filtrar por `moderacao = 'publicado'`.
- Evitar o Realtime do Supabase nas tabelas base: ele depende das mesmas políticas e é fácil expor demais.
