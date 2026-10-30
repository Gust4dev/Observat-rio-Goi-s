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
| `017_admin_mfa_equipe.sql` | Exige AAL2 nas autorizações administrativas; gestão da equipe por RPC auditada, sem escrita direta |
| `018_admin_operacoes.sql` | Operações administrativas auditadas, lotes atômicos, mesclagem e motivos fechados |
| `019_supressao_indicadores.sql` | Supressão de células pequenas e complementar nos indicadores públicos |
| `020_retencao_imagens.sql` | Prazo provisório configurável; desreferencia conteúdo vencido retido/removido e deixa Storage remover órfãos após 24h e nova checagem |
| `021_fila_moderacao_filtros.sql` | Acrescenta IDs de município e categoria à fila administrativa sem expor a view ao público |
| `022_deduplicacao_participacao.sql` | Deduplica denúncias e respostas pela origem HMAC enquanto aguardam revisão e apaga a chave ao resolver/revisar |
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

A partir da 017, todas as autorizações de `interno.eh_admin` exigem JWT com `aal = aal2`.
Papéis vêm da tabela `administradores`, nunca de um papel administrativo alegado no JWT.
As RPCs `admin_convidar_administrador(user_id, papel, motivo)`,
`admin_alterar_papel_administrador(user_id, papel, motivo)` e
`admin_desativar_administrador(user_id, motivo)` exigem superadmin ativo com MFA.
O convite Auth e seu envio são responsabilidade do servidor; a primeira RPC associa um usuário Auth
já existente à equipe e não envia e-mail. Duplicatas falham, sem reativação implícita.
Todas registram motivo e snapshots no histórico. Um lock de tabela serializa essas operações para
impedir desativação ou rebaixamento concorrente do último superadmin ativo. O primeiro superadmin
continua sendo provisionado por operação administrativa confiável fora das RPCs.
`authenticated` não recebe INSERT/UPDATE/DELETE na equipe; as políticas antigas de escrita são removidas.
O teste `migracao_017_test.sql` cobre MFA, papéis, inatividade, auditoria, grants e o último superadmin;
`node db/tests/mutacao_017.mjs` confirma que regressões de MFA, invariante, EXECUTE e auditoria são detectadas.

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
Aplicar `012_dados_painel.sql` após 011: corrige resolução documentada (situação resolvido + atualização pública da resolução com texto e evidência não vazios). A view pública agregada `v_dados_painel` agrupa município, categoria, mês de publicação em America/Sao_Paulo e situação, com contagens sem duplicar atualizações. O cliente percorre todas as páginas por id determinístico, sem limite total. Leituras entre páginas não são um snapshot transacional.

Configure `DADOS_DEMONSTRACAO=true` somente no ambiente com seed fictício confirmado; ausência da variável não presume demonstração. Não altera a fonte de dados.

### Operações administrativas (018)

Aplicar `018_admin_operacoes.sql` após 017. Todas as RPCs exigem sessão autenticada, administrador ativo e AAL2. A assinatura antiga de `admin_moderar_ocorrencia(uuid,text,text)` é removida; a nova recebe `p_id`, `p_acao`, `p_motivo` (complemento) e `p_motivo_codigo` (somente remoção). O código pertence à tabela fechada `motivos_remocao`; remoção exige código e complemento. Registros históricos e exclusão pelo titular preservam seus motivos anteriores.

`admin_mesclar_duplicata(p_origem,p_destino,p_motivo)` remove a origem e registra `duplicata_de` no snapshot da auditoria. O destino deve estar publicado. Não transfere imagens, denúncias, confirmações, respostas ou atualizações. Restaurar exige gestor e retorna a origem para pendente, limpando a relação.

`admin_moderar_lote(p_ids,p_acao,p_motivo)` aceita de 1 a 50 UUIDs únicos para aprovar ou reter; retorna `out_id/out_moderacao`. Um erro desfaz o lote completo e suas auditorias. Locks seguem ordem de UUID para evitar deadlocks entre lotes/mesclas concorrentes.

`admin_detalhar_ocorrencia(p_id)` permite ao moderador consultar ocorrência e filhos, incluindo material retido. Não retorna contato do autor, contato de resposta nem token. Contato do autor continua exclusivo de `admin_ver_contato` (gestor, leitura auditada). A lista de ocorrências usa a tabela base com RLS administrativa. `admin_listar_auditoria` é exclusiva de gestor e aceita filtros de ocorrência, administrador, ação, início/fim, limite (1–100) e offset; ordena por data e ID decrescentes. Gestão da equipe permanece exclusiva de superadmin pelas RPCs 017.

`npm run db:test` executa as suítes históricas antes do upgrade 018, depois a suíte do novo contrato e os seeds com 018 aplicada. `node db/tests/mutacao_018.mjs` verifica regressões em motivos, complemento, limite/atomicidade do lote, auditoria, mescla, grants, papel e AAL2, exclusivamente em bancos PGlite descartáveis. Não aplica nenhuma migração remota.

### Deduplicação de participação (022)

`registrar_denuncia` e `registrar_resposta` agora recebem `p_origem_hash` de 32 bytes, calculado pelo servidor por HMAC; nenhum endereço bruto é armazenado. Enquanto denúncia aguarda análise ou resposta aguarda revisão, uma origem só pode gerar uma linha por ocorrência. Repetições retornam `false` na RPC e a API mantém a confirmação neutra `202`. A chave é apagada automaticamente quando a denúncia é resolvida ou a resposta é publicada/rejeitada, e o índice parcial permite nova manifestação depois da decisão.

### Retenção de imagens (020)

`interno.configuracao_retencao` controla `imagens_rejeitadas_retidas_dias`; o padrão é 365 dias e é provisório de engenharia, não prazo legal aprovado. `interno.limpar_expirados()` não apaga a linha da imagem: após o prazo e sem lease administrativo ativo, desreferencia o caminho do Storage e limpa o hash de entrada e o contexto. O limpador M4 encontra o objeto privado sem referência após 24 horas, reconsulta a referência antes de remover e mantém a linha anonimizada para histórico. A retenção configurada é exercitada em `tests/migracao_020_test.sql`.


### Supressão de indicadores (019, M6)

Aplicar `019_supressao_indicadores.sql` após 018. O limiar **k=5** é provisório de engenharia,
não uma decisão jurídica nem garantia de anonimato. `v_dados_painel` omite células com menos
 de cinco relatos publicados. As subcontagens de resposta oficial e resolução documentada e
seus complementos precisam ser zero ou pelo menos cinco; caso contrário a célula inteira é omitida.
Zero continua sendo um valor válido em métricas de células retidas.

A supressão complementar retira toda a coorte município/categoria se qualquer combinação
mês/situação dessa coorte for insegura. Os três subtotais (`v_indicadores_municipio_categoria`,
`v_indicadores_mensal`, `v_indicadores_situacao`) somam exclusivamente as células retidas.
Portanto mesmo uma célula com cinco ou mais relatos pode ser omitida por proteção complementar;
esses subtotais representam cobertura parcial, e ausência não significa zero ocorrências.
Colunas, tipos e permissões públicas permanecem iguais.

`v_indicadores_gerais` continua expondo totais globais completos. A diferença entre esses totais
e as células retidas ainda pode revelar o volume suprimido, especialmente se houver uma única
coorte oculta. Publicações sucessivas, cruzamentos externos e a própria listagem pública de
ocorrências também permitem derivar contagens. A medida é defesa em profundidade para os
indicadores, inclusive suas subcontagens; não fornece anonimização formal nem privacidade diferencial.

`npm run db:test` executa o contrato histórico antes de 019, depois a suíte 019 e a allowlist
com a migração aplicada; o seed histórico é validado até 018. `node db/tests/mutacao_019.mjs`
valida o controle e prova que remover o `HAVING` expõe uma célula de quatro relatos e quebra
a suíte. Os bancos são locais e descartáveis; nenhuma migração remota é aplicada.
