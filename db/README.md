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
| `008_seed_municipios.sql` | Os 246 municípios de Goiás (IBGE); idempotente, vai também para produção |
| `009_view_sem_busca.sql` | `v_ocorrencias_publicas` deixa de expor a coluna `busca`; a lista permitida de colunas públicas fica em `colunas-publicas.json` e é conferida por teste |
| `010_acompanhamento_completo.sql` | Acrescenta cronologia pública e respostas publicadas ao DTO privado de `acompanhar_por_token`, com execução exclusiva para `service_role` |
| `011_imagens_resilientes.sql` | Contexto privado e overload de `registrar_imagem` com bloqueio por ocorrência e retry seguro do mesmo conteúdo/slot; não altera views públicas |
| `seed/staging_ficticio.sql` | Dados fictícios **só para staging** (trava aborta se houver dado real) |
| `tests/` | Stub do Supabase, testes de segurança (`rls_test.sql`, `migracao_007_test.sql`) e executor |

### Funções do servidor (`service_role`) — contrato resumido
| Função | Retorna | Observação |
|---|---|---|
| `registrar_ocorrencia(..., p_chave_idempotencia, p_origem_hash)` | `out_id`, `out_protocolo`, `out_repetida` | Repetição com a mesma chave **e mesmo token** devolve a existente; com outro token, erro `22023` |
| `acompanhar_por_token(token_hash)` | Campos básicos da ocorrência, `out_atualizacoes`, `out_respostas` | Token inválido retorna zero linhas. Arrays cronológicos contêm somente atualizações `publica = true` e respostas `publicada`; nunca contato, nota interna ou autor administrativo |
| `registrar_imagem(token_hash, ordem, caminho, mime, tamanho)` | id da imagem | Nasce `pendente`; ordem 1–3; token inválido → `P0002` |
| `registrar_imagem(token_hash, ordem, caminho, mime, tamanho, contexto)` | id da imagem | M4: contexto privado obrigatório; mesmo caminho/slot/metadados retorna mesmo id; conteúdo diferente no slot retorna `23505`; somente JPEG reencodado ≤2 MiB |
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

O contrato privado da 010 é coberto por `tests/migracao_010_test.sql`. Para provar que os testes detectam
regressões de visibilidade e privilégios, rode `node db/tests/mutacao_010.mjs`: o script remove filtros e
concede `EXECUTE` a `anon` somente em bancos PGlite descartáveis; cada mutação precisa causar a falha esperada.
Nenhum arquivo ou banco remoto é alterado.

**No Supabase real (sem deixar dados):** executar a suíte dentro de uma transação desfeita no fim.
```bash
# monta: begin; rls_test.sql; migracao_007_test.sql; migracao_010_test.sql; rollback;
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

## Dados de teste
- `008_seed_municipios.sql`: os 246 municípios de Goiás (dado público do IBGE). Gerado por `node scripts/gerar-seed-municipios.mjs` (falha se a contagem não for 246) e versionado. Idempotente; este vai também para produção.
- `seed/staging_ficticio.sql`: 28 ocorrências **fictícias** (24 publicadas, 4 não publicadas) em 4 municípios, com linha do tempo, respostas oficiais e resolvidas com evidência. Idempotente (protocolos `TESTE-NNN`).
- Aplicar no staging (nessa ordem, depois de 001 a 007):
```bash
npx supabase db query --linked --project-ref <ref-staging> -f db/008_seed_municipios.sql
npx supabase db query --linked --project-ref <ref-staging> -f db/seed/staging_ficticio.sql
```
- **Nunca aplicar `seed/staging_ficticio.sql` em produção.** Ele tem uma trava que aborta se existir qualquer ocorrência que não seja de teste, mas não dependa só dela.
- Testado em `db/tests/seed_test.sql` (rodado por `npm run db:test`, num banco novo, incluindo reexecução e a trava).

## Pontos de atenção ao implementar
- Nunca usar a chave `service_role` no navegador; só nas Edge Functions.
- Toda função nova em `public` fica **sem** `EXECUTE` para `anon`/`authenticated` até um `GRANT` explícito.
- Ao criar uma view pública nova, listar as colunas à mão e filtrar por `moderacao = 'publicado'`.
- Evitar o Realtime do Supabase nas tabelas base: ele depende das mesmas políticas e é fácil expor demais.

### Dados do painel (012)
Aplicar `012_dados_painel.sql` ap�s 011: corrige resolu��o documentada (situa��o resolvido + atualiza��o p�blica da resolu��o com texto e evid�ncia n�o vazios). A view p�blica agregada `v_dados_painel` agrupa munic�pio, categoria, m�s de publica��o em America/Sao_Paulo e situa��o, com contagens sem duplicar atualiza��es. O cliente percorre todas as p�ginas por id determin�stico, sem limite total. Leituras entre p�ginas n�o s�o um snapshot transacional.

Configure `DADOS_DEMONSTRACAO=true` somente no ambiente com seed fict�cio confirmado; aus�ncia da vari�vel n�o presume demonstra��o. N�o altera a fonte de dados.
