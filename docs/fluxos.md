# Fluxos e rotas

## Registro de ocorrência
1. Cidadão abre `/registrar` (ou parte de `/`), escolhe município e categoria.
2. Informa título e descrição; opcionalmente adiciona fotos (limite a definir).
3. Informa nome e WhatsApp (opcionais) **ou** marca publicação anônima. Consentimento para
   atualizações é separado e explícito.
4. Aceita as regras e envia.
5. Edge Function valida campos, captcha e limite de taxa; cria `ocorrencias` e, se houver, `contatos_privados`.
6. Triagem automática básica define `moderacao`:
   - texto aprovado → `publicado` **[PROPOSTO: pode ser `pendente` conforme política]**;
   - imagens → `pendente` até revisão **[PROPOSTO]**;
   - conteúdo suspeito → `retido`.
7. O cidadão recebe **protocolo** e um **token de gestão** (link) para acompanhar e pedir exclusão.

## Moderação
- Fila de itens `pendente`/`retido` e de `denuncias`.
- Ações: aprovar, reter, remover (motivo obrigatório), mesclar duplicidade.
- Toda ação gera linha em `historico_moderacao`.
- Remoções ficam registradas; a política pública define quais são as causas válidas **[PENDENTE]**.

## Atualização de situação
- Admin adiciona `atualizacao` e altera `situacao`.
- `resolvido` exige texto de justificativa e evidência anexada.
- A linha do tempo na página pública mostra as atualizações marcadas como públicas.

## Rotas
| Rota | Finalidade |
|---|---|
| `/` | Página inicial: "O que precisa melhorar na sua cidade?" |
| `/registrar` | Registro |
| `/problemas` | Painel do Cidadão (lista + filtros) |
| `/problema/:id` | Detalhe e linha do tempo |
| `/acompanhar/:token` | Acompanhamento privado pelo cidadão **[PROPOSTO]** |
| `/municipios/:slug` | Painel municipal |
| `/inteligencia` | Painel de Inteligência |
| `/sobre`, `/transparencia`, `/privacidade`, `/termos` | Institucional e legal |
| `/admin` | Administração protegida |

## Critérios de aceite do MVP (resumo)
- Registrar pelo smartphone sem conta.
- Protocolo gerado e página pública criada.
- Indicadores refletem registros existentes.
- Admin consegue moderar e atualizar; histórico público visível.
- Dados pessoais permanecem protegidos (teste de RLS).
