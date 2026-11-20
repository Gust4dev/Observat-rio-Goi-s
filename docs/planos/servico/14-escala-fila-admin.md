# Plano 14 — Escala da fila administrativa

## Objetivo

Preparar a fila e o detalhe administrativo para volume e moderação concorrente sem totais por página, coleções ilimitadas ou decisões baseadas em estado antigo que passem sem aviso.

## Decisões e evidências

- Fatos do checkout em 2026-11-18: branch `main`, sem arquivos staged; migrations locais até 024. `src/lib/admin/handlers/http.ts` consulta página e contagem exata separada, ordena prioridade por contadores mutáveis e recalcula idade por página. `AdminConsole.tsx` acumula páginas e não usa `total`; fixa `ordem=prioridade`, não expõe filtros urgentes, e o botão Atualizar usa o cursor atual. A RPC 018 agrega filhos ilimitados com `to_jsonb`; o consumidor administrativo atual não renderiza arrays do detalhe.
- Fato operacional inicial: `npx supabase migration list --linked --project-ref hvekgzxuciyewtybwads` retornou `migrations: []` e classificou o alvo como `production`. Em 2026-11-18, o responsável autorizou explicitamente seguir no projeto principal, sem staging, informando que o sistema não tem usuários. Confirmei o nome `Observatorio-Goias` e o ref exato antes da escrita.
- Decisão: keyset determinístico por `(criado_em,id)`, cursor assinado e vinculado a filtros, ordenação e instante de referência; páginas devolvem `itens` e `proximo_cursor`, nunca `total`. Pendências urgentes terão filtros acessíveis e resumo com `calculado_em`, obtido por chamada separada. “Atualizar” reinicia a navegação e o resumo.
- Detalhe: ocorrência com projeção explícita e imagens limitadas; denúncias, respostas e atualizações terão consultas keyset próprias, teto de 100, cursor vinculado à ocorrência/coleção/filtro e indicação de continuação. Contato permanece exclusivo da rota de gestor auditada.
- Concorrência: versão monotônica por entidade, verificada sob lock dentro das RPCs auditadas; decisão obsoleta falha com SQLSTATE contratual mapeado para HTTP 409 antes de escrever auditoria. Lotes validam todas as versões antes de qualquer alteração. Assinaturas antigas de decisão não podem continuar executáveis como bypass.
- Índices só serão adicionados para predicados/ordens comprovados pela consulta concreta e plano local. A chave `origem_hash` parcial de 022 não cobre denúncias com hash nulo. Nenhum índice duplicado para `imagens(ocorrencia_id)`.

## Alternativas rejeitadas e debate

- Manter prioridade no cursor por contadores: ataques dos pares de arquitetura e segurança apontaram que uma nova denúncia muda a posição de linhas não vistas e pode fazê-las saltar para trás do cursor; também repete ordenação/contagem correlacionada da view 021.
- Offset: item removido do filtro entre páginas desloca índices e pode pular ou repetir resultados.
- Materializar uma sessão completa de IDs: resolveria o snapshot dos membros, mas exigiria tabela de sessão, expiração, limpeza e autorização por cursor. O contrato adotará percurso vivo com atualização explícita, sem prometer snapshot.
- Verificar versão apenas no handler: rejeitado porque há janela entre leitura e RPC e chamadas diretas às assinaturas antigas ainda seriam possíveis.
- Resíduo/dissidência: keyset não captura até o fim da passagem um relato antigo que só se torna elegível após nova denúncia. A UI deve mostrar o resumo separado e reiniciar o cursor em Atualizar; a documentação não afirmará snapshot completo.
- A party configurada não resolveu o nome `mercury-team`; foram feitas seis posições independentes e três rodadas de ataques sobre cursores, filtros, RPCs, índices e compatibilidade. A equipe convergiu nas decisões acima, mantendo a semântica viva da fila e o ambiente principal explicitamente autorizado como limite operacional.

## Plano executável e critérios

1. **Banco (`db/025_escala_fila_admin.sql`, teste SQL/PGlite focado):** adicionar versão administrativa, RPCs auditadas com precondição obrigatória, detalhe limitado, consultas keyset de filhos, endpoint de resumo e consulta de fila com filtros e projeções seguras. Preservar AAL2/papéis/grants. Critério: limite imposto no SQL, cursor estável, campos privados ausentes, chamadas diretas antigas revogadas, conflito não audita e lote é atômico.
2. **HTTP/API (`src/lib/admin/handlers/http.ts`, teste focado):** substituir contagem exata e ordenação mutável; assinar/validar cursor; encaminhar consultas limitadas e versões esperadas; mapear conflito para 409; manter `requireAdmin`, rate limit, no-store e motivos. Critério: uma chamada de página, sem `total`, cursor rejeita alteração de filtro, todas as páginas/filhos limitadas.
3. **Consumidor (`src/components/admin/AdminConsole.tsx`, helpers/testes focados):** filtros de denúncia/foto, resumo separado datado, reset explícito, consumo tipado do envelope do detalhe, paginação “carregar mais” por coleção, e conflitos que preservam ação/motivo até recarga e nova confirmação. Critério: sem redesenho, itens pendentes acessíveis sem percorrer a fila cronológica inteira.
4. **Contrato/documentação:** complementar `docs/api-contratos.md` sem apagar conteúdo concorrente e registrar aqui contrato, evidências, arquivos e limites. Rodar os testes direcionados, typecheck e lint nos arquivos alterados; não rodar suíte geral. Só acrescentar a linha literal `ADMIN_QUEUE_READY=YES` depois de todos os critérios, inclusive verificação no ambiente principal autorizado, passarem.

## Novo contrato previsto

- Fila: `GET /api/admin/fila` retorna `{itens,proximo_cursor}`. `limite` aceita 1–100 (padrão 50). A ordenação é `criado_em,id`; `antigos` e `recentes` invertem ambos os campos. Cursor é opaco, assinado, vinculado a versão, filtros e instante de referência. Novas denúncias/moderações podem alterar a elegibilidade durante uma passagem; use Atualizar para reiniciar. Nenhum total aproximado é chamado de exato.
- Resumo: `GET /api/admin/fila?resumo=true` retorna estados/contagens calculados separadamente e `calculado_em`; os valores descrevem aquele instante, não a posição/página atual.
- Detalhe: `GET /api/admin/ocorrencias/{id}` retorna `{ocorrencia,imagens,resumos}` com imagens limitadas. As coleções de denúncias/respostas/atualizações usam rota de filhos, `colecao`, `limite`, cursor e filtros permitidos, com `{itens,proximo_cursor}` e teto 100.
- Decisões: requests mutáveis enviam `versao_esperada`; estado divergente retorna `409` com código `estado_desatualizado`, sem aplicar mutação nem inserir evento de auditoria. Recarregar o estado é explícito; não reenviar automaticamente.

## Resultado e evidências

- **Fila/API:** `src/lib/admin/handlers/http.ts` removeu `Prefer: count=exact`, a consulta separada de contagem por página e prioridade mutável. Uma RPC retorna no máximo 101 linhas para páginas de até 100; a resposta HTTP corta a sentinela e retorna `{itens,proximo_cursor}`. O cursor HMAC vincula consulta, filtros, direção e referência temporal. `fila?resumo=true` chama outra RPC e informa horário do cálculo.
- **Detalhe/filhos:** a migration projeta explicitamente a ocorrência e até três imagens. Denúncias, respostas e atualizações públicas têm cursores próprios por ocorrência, coleção, data e ID; ids bigint trafegam como texto. Resumos não sinalizam notas privadas. Contato continua na rota auditada de gestor.
- **UI:** `AdminConsole.tsx` oferece filtros de denúncia/foto e ordem crescente/decrescente, resume pendências com data, reinicia a navegação em Atualizar e mantém apenas uma página renderizada com anterior/próxima. Em 409, bloqueia nova decisão até recarregar a versão, mantém os campos preenchidos e exige confirmação novamente.
- **Concorrência/auditoria:** `db/025_escala_fila_admin.sql` adiciona versões monotônicas e wrappers das decisões com versão obrigatória checada sob lock. Assinaturas antigas sem precondição deixam de estar expostas; lotes validam versões antes de qualquer alteração. O teste focado cobre conflito e ausência de auditoria da decisão rejeitada.
- **Arquivos desta entrega:** `db/025_escala_fila_admin.sql`; `db/tests/escala_admin.mjs`; `db/tests/escala_admin_test.sql`; `src/lib/admin/handlers/http.ts`; `src/lib/admin/handlers/http.test.ts`; `src/components/admin/AdminConsole.tsx`; `src/components/admin/admin-api.ts`; `src/components/admin/admin-api.test.ts`; `docs/api-contratos.md`; este plano. Os outros arquivos modificados/sem commit no checkout pertencem a tarefas compartilhadas e foram preservados.
- **Validações focadas observadas pelo orquestrador:** `node db/tests/escala_admin.mjs` passou; `npx vitest run src/lib/admin/handlers/http.test.ts` passou (45 testes); `npx vitest run src/components/admin/admin-api.test.ts` passou (8 testes); ESLint dos arquivos TypeScript tocados passou; `npx tsc --noEmit --pretty false` passou. Não foi rodada a suíte geral. O teste SQL usa duas intenções com a mesma versão inicial em sequência para verificar conflito/auditoria; o ambiente não tem Docker, PGlite fornece uma conexão e não há `psql`/PostgreSQL local para provar interleaving entre duas sessões reais.
- **Índices:** os planos `EXPLAIN` focados em PGlite confirmaram os índices de fila e coleções para os predicados/ordens das consultas. O teste força `enable_seqscan=off` porque as fixtures pequenas favorecem scan sequencial; isso comprova compatibilidade do predicado/ordem, não seletividade ou custo com cardinalidade de staging/produção.
- **Preflight remoto somente leitura:** a tabela `supabase_migrations.schema_migrations` não existe, portanto não há ledger de migrations. O catálogo confirmou o total 023 presente (`v_indicadores_gerais.total_ocorrencias`), o comportamento 024 em `interno.bloqueia_alteracao()`, as versões/RPC 025 ausentes e a RPC 018 presente antes da aplicação.
- **Aplicação em main:** `npx supabase db query --remote=hvekgzxuciyewtybwads --file db/025_escala_fila_admin.sql --yes` aplicou a migration ao projeto `Observatorio-Goias`, classificado pela CLI como `production`, conforme autorização explícita do responsável. Nenhum deployment Vercel, commit ou push foi feito.
- **Verificação remota:** consulta `--read-only` confirmou as três colunas `versao_admin`, RPC da fila, assinatura antiga de moderação ausente, `EXECUTE` permitido a `authenticated` e negado a `anon`, e os cinco índices novos. `npx supabase db query --remote=hvekgzxuciyewtybwads --file db/tests/escala_admin_test.sql --yes` passou dentro de `BEGIN ... ROLLBACK`. Leitura posterior confirmou zero ocorrências e usuários temporários persistidos.
- **Validação futura de capacidade:** o teste local e o SQL remoto verificam duas decisões com a mesma versão inicial em sequência. Não foi medido interleaving nem carga com duas sessões concorrentes; PGlite usa uma conexão e não há PostgreSQL local. A verificação empírica de concorrência fica para uma validação futura de capacidade, sem bloquear a integração/deploy da primeira beta.

### Handoff para o agente de deploy da beta

O schema 025 já está aplicado e verificado no projeto principal `hvekgzxuciyewtybwads`; não reaplicar a migration. Em 2026-11-20, o responsável confirmou que o sistema tem zero usuários, não precisa de Preview e autorizou a Vercel Production como primeira beta acessível pelo link. Esta prontidão é para integração/deploy da beta; não afirma que foi feito teste de carga ou interleaving real entre duas sessões.

**Compatibilidade obrigatória antes da beta:** a revisão Vercel `84b1e44` ainda envia assinaturas antigas das RPCs de moderação, situação, lote, mescla, denúncia e resposta. A migration 025 moveu as implementações antigas para `interno` e expõe RPCs públicas com `versao_esperada` obrigatória. Publicar o handler desta revisão antes que moderadores dependam das ações administrativas; a fila/detalhe e leitura não dispensam essa compatibilidade.

Consumir `{itens,proximo_cursor}` na fila; não ler `total`. Usar `GET /api/admin/fila?resumo=true` para `{calculado_em,com_denuncias,com_fotos_pendentes}` e exibir a data. Oferecer `denuncia=true|false`, `foto_pendente=true|false`, `ordem=antigos|recentes`; `Atualizar` reinicia cursor e resumo. A ordenação por `(criado_em,id)` não congela elegibilidade: nova denúncia/moderação pode colocar/remover itens antes do cursor; atualizar inicia outro percurso e ausência na página não equivale a ausência de pendências.

O detalhe retorna `{ocorrencia,imagens,resumos}`; as imagens têm teto de três e não incluem caminho. Paginar `denuncias`, `respostas` e `atualizacoes` públicas pela query `colecao`, `limite` e `cursor` no endpoint do detalhe. Decisões devem enviar `versao_esperada` obtida no item selecionado; HTTP `409 estado_desatualizado` exige recarga e confirmação manual. Não reenviar automaticamente nem apagar o motivo digitado.

O schema principal e os testes remotos transacionais estão verificados. A revisão de handler compatível ainda precisa ser publicada pelo agente de deploy; não houve deploy nesta tarefa. A prova de interleaving real e o teste de carga ficam como validações futuras de capacidade, sem bloquear a primeira beta.

ADMIN_QUEUE_READY=YES
