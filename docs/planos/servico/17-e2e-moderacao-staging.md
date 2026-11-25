# Plano 17 — E2E de moderação no staging

**Resultado:** passou em 23/11/2026. O catálogo registrou o cadastro às 19:24:12 BRT e a última ação auditada às 19:24:22 BRT. A aplicação rodou localmente em loopback com build de produção, configuração `staging_ficticio` e Supabase real do staging. A sessão fictícia AAL2 completou a jornada administrativa. O teste não executou a interface Vercel publicada.

## Alvo e schema

- A CLI autenticada listou `Observatorio-Goias`, ref `hvekgzxuciyewtybwads`, `ACTIVE_HEALTHY`, região `us-east-1`. O rótulo `production` da CLI se refere à branch principal desse projeto Supabase. O projeto Production da aplicação usa outro ref.
- O catálogo somente leitura mostrou a assinatura versionada de moderação da 025, ledger ausente e a RPC nova da 026 ausente. Apliquei somente a 026 com `npx --no-install supabase db query --remote=hvekgzxuciyewtybwads --file db/026_fila_pos_publicacao.sql --yes`. A conferência posterior confirmou execução da nova RPC por `authenticated` e negação para `anon`.

## Jornada

```powershell
node scripts/e2e-admin-staging.mjs --moderacao-mvp
```

O runner usa as três variáveis de teste do Turnstile declaradas no projeto. Foram usados os valores públicos de teste da Cloudflare somente no ambiente do processo. O modo de moderação evita o fluxo de convite e mantém fotos desligadas. [Turnstile em testes automatizados](https://developers.cloudflare.com/turnstile/troubleshooting/testing/)

| Etapa | Evidência observada |
| --- | --- |
| Sessão | Login, fator TOTP, challenge, verificação e sessão AAL2 do administrador fictício funcionaram |
| Relato | Cadastro HTTP 201, aprovação administrativa e aparição na fila de publicados antes de qualquer pendência |
| Denúncia | Envio HTTP 202, item único na fila da fixture e resolução versionada como procedente |
| Direito de resposta | Envio HTTP 202 com contato reservado `.invalid`. Resposta pendente ausente da view e visível somente após aprovação versionada |
| Remoção | Remoção com motivo por AAL2. O relato e a resposta ficaram fora das views públicas |
| Auditoria | A leitura administrativa encontrou os quatro eventos de aprovação, resolução da denúncia, publicação da resposta e remoção |
| Titular | Exclusão retornou HTTP 200 e nova consulta com o token retornou HTTP 404 |
| Limpeza | Helper removeu papel e conta Auth do administrador fictício. Uma transação SQL eliminou a denúncia e resposta por IDs exatos, UUID da ocorrência e conteúdo sintético confirmado |

A leitura final, restrita à fixture `6c73d7a0-d053-4503-92c0-98b74088b20e`, observou zero linhas públicas, tokens, denúncias e respostas, além de uma ocorrência anonimizada e cinco eventos históricos com referência administrativa nula. Esses eventos permanecem por auditoria. O runner ganhou limpeza das participações vinculadas por UUID, ID e dados sintéticos para futuras chamadas. Nesta execução, a limpeza das duas participações foi feita pela transação SQL descrita acima.

O perfil comprova a jornada funcional de moderação com o banco real do staging. Publicação automática de texto, fotos, latência na Vercel e carga de usuários simultâneos exigem as evidências dos ensaios próprios.

## Participação e limites — 24/11/2026

Às 10h37 BRT, o build local do checkout `main` em `a1b01e5` executou o perfil de moderação com asserções de participação adicionais. O processo validou o host `hvekgzxuciyewtybwads.supabase.co` antes de gravar. Usou um relato com marcador exclusivo por execução, sessão administrativa fictícia AAL2, fotos desligadas e supressão de SMTP. O perfil base foi executado por uma cópia temporária com os limites de afeta, denúncia e resposta em dois pedidos por operação e chaves [de teste do Turnstile](https://developers.cloudflare.com/turnstile/troubleshooting/testing/).

| Jornada | Evidência observada |
| --- | --- |
| Também me afeta | Agregado público começou em 0. Primeiro envio e retry retornaram 202 com total 1. Terceiro envio retornou 429. A view permaneceu em 1. |
| Denúncia | Envio e retry retornaram 202, terceiro envio retornou 429. Um único item chegou à fila e foi resolvido em AAL2. |
| Direito de resposta | Envio e retry retornaram 202, terceiro envio retornou 429. Um único item chegou à fila. A view pública não retornou a resposta pendente. Após revisão em AAL2, retornou o item sem contato e sem hash de origem. A retirada administrativa voltou a ocultá-lo. |
| Retirada e limpeza | A retirada pelo titular confirmou exclusão e a nova consulta retornou 404. Leituras pelo ID confirmaram zero relato público, token, confirmação ou linha de imagem. O runner apagou uma denúncia e uma resposta sintéticas pelos IDs e marcadores da execução, conferiu ausência e removeu papel e conta Auth fictícios. Com fotos desligadas, o ensaio não criou nem consultou objetos de Storage. |

Uma ocorrência anonimizada e o histórico das decisões permanecem para auditoria, com os vínculos ao administrador fictício anonimizados. Os contadores internos de taxa usam chaves derivadas da execução e seguem a janela de expiração do banco. O runner saiu com código 0. A prova cobre o runtime Next em loopback com o Supabase de staging, incluindo as rotas públicas e de administração. A aplicação publicada na Vercel e seus limites ficam fora desta prova.
