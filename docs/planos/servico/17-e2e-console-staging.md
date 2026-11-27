# Plano 17 — E2E das ações do console no staging

Em 23/11/2026, entre 20:44 e 20:45 BRT, o perfil de console executou as rotas administrativas num build local com sessão fictícia AAL2 e banco Supabase do staging `hvekgzxuciyewtybwads`. O preflight read-only confirmou a RPC da 026. Nenhuma migração foi reaplicada e a Vercel Production ficou fora da execução.

```powershell
node scripts/e2e-admin-staging.mjs --console-mvp
node --check scripts/e2e-admin-staging.mjs
git diff --check -- scripts/e2e-admin-staging.mjs
```

O runner usa o perfil `staging_ficticio`, SMTP suprimido e os valores públicos de teste do Turnstile somente no ambiente do processo.

| Fluxo | Evidência observada |
| --- | --- |
| Lote | Duas fixtures pendentes. Uma versão obsoleta retornou 409 e preservou os dois estados e versões. O lote com versões válidas confirmou duas aprovações |
| Situação e atualização | Mudança versionada para `em_atendimento` e atualização pública apareceram na view e no acompanhamento do titular |
| Nota interna | O pedido de inclusão com `publica=true` persistiu como nota privada. A view e o acompanhamento só exibiram as duas linhas públicas |
| Contato | O superadministrador consultou o contato de uma fixture anônima e a ação apareceu na auditoria |
| Mescla | A mescla versionada manteve o destino publicado e retirou a origem da view |
| Equipe | Convite manual sem email, troca para gestor e desativação confirmadas pelo endpoint da equipe e por auditoria. A conta e o papel fictícios foram removidos ao final |
| Auditoria | Foram encontrados os eventos esperados das ações do relato, do lote, da mescla e da equipe |

O comando inicial executou todos os fluxos acima e retirou as duas fixtures pelo titular. Saiu com código 1 apenas na verificação de limpeza: o runner tentou excluir as linhas sintéticas da linha do tempo, que têm trigger somente-inserção. O runner agora verifica, por correspondência exata, a retenção das três atualizações, a ausência nas views e o HTTP 404 de cada detalhe. A validação focada posterior reutilizou os dois IDs sintéticos `16ea073c-f22a-4f0a-94e2-4303b9acaf71` e `fc6eb891-3e3e-41db-8c0b-04b729e249ad` em vez de criar outro lote.

O pós-check SQL read-only confirmou duas ocorrências anonimizadas, **zero relatos públicos, atualizações públicas e tokens**, três atualizações sintéticas retidas (uma nota interna), nove eventos anonimizados dos relatos e três da equipe. Novos GETs no mesmo build de Production local retornaram **404 para ambos os detalhes**. Os resíduos fazem parte do histórico somente-inserção e ficam invisíveis nas superfícies públicas.

Os handlers permaneceram iguais. Essa prova cobre as ações por HTTP e as projeções públicas do build local com staging. A apresentação dos controles no navegador Vercel está fora deste ensaio.

## Retomada — limpeza semântica da página removida — 26/11/2026

O runtime do Next pode transmitir a página `notFound()` com HTTP 200. Por isso, a asserção anterior, que aceitava exclusivamente HTTP 404, confundia o status de transporte com a visibilidade do relato. A verificação agora aceita 404 ou HTML 200 com o título e a mensagem de página não encontrada, desde que o marcador da fixture não apareça; as views públicas continuam sendo verificadas separadamente.

```powershell
$env:TURNSTILE_TEST_SECRET='1x0000000000000000000000000000000AA'
$env:NEXT_PUBLIC_TURNSTILE_TEST_SITE_KEY='1x00000000000000000000AA'
$env:TURNSTILE_TEST_TOKEN='XXXX.DUMMY.TOKEN.XXXX'
npm run e2e:admin:staging -- --console-mvp
```

Resultado: `e2e=aprovado`, `perfil=console-mvp`; conflito de lote retornou 409; duas ocorrências foram moderadas e removidas; três atualizações append-only foram retidas; equipe e conta Auth temporárias foram removidas. A checagem final confirmou as ocorrências e atualizações fora das views públicas e a página de detalhe sem conteúdo da fixture. Os valores Turnstile são credenciais públicas oficiais de teste, usados somente no processo. A verificação não executou mutações em Production.
