# Modelo de dados **[PROPOSTO]**

Dois eixos de estado independentes na ocorrência:
- **`situacao`**: andamento do problema (visível ao público).
- **`moderacao`**: ciclo de publicação (controle interno).

## Estados
`situacao`: `registrado`, `em_analise`, `encaminhado`, `aguardando_resposta`, `em_atendimento`,
`resolvido`, `encerrado_sem_solucao`.
`resolvido` exige justificativa e evidência.

`moderacao`: `pendente`, `publicado`, `retido`, `removido`.
Remoção é *soft delete*: registra motivo e autor, não apaga a linha.

## Tabelas
| Tabela | Campos principais | Observações |
|---|---|---|
| `municipios` | `id`, `ibge_codigo` (único), `nome`, `slug` (único), `ativo_acompanhamento` | 246 registros; `ativo_acompanhamento` controla onde há operação ativa |
| `categorias` | `id`, `slug`, `nome` | |
| `ocorrencias` | `id` (uuid), `protocolo` (único), `municipio_id`, `categoria_id`, `titulo`, `descricao`, `situacao`, `moderacao`, `anonimo`, `verificado` (padrão `false`), `criado_em`, `publicado_em`, `atualizado_em` | Nenhum dado pessoal aqui |
| `tokens_gestao` | `ocorrencia_id` (PK/FK), `token_hash` (SHA-256) | Todo registro tem token, inclusive o anônimo; permite acompanhar e pedir exclusão sem conta |
| `contatos_privados` | `ocorrencia_id` (PK/FK), `nome`, `whatsapp`, `consentimento_atualizacoes`, `consentimento_em`, `consentimento_versao`, `expira_em` | Sem acesso público nem direto. **Ocorrência anônima não tem linha aqui** (imposto por gatilho). Telefone exige consentimento (constraint) |
| `imagens` | `id`, `ocorrencia_id`, `caminho_storage`, `moderacao`, `criado_em` | Sem EXIF; limite de quantidade/tamanho/tipo |
| `atualizacoes` | `id`, `ocorrencia_id`, `tipo`, `situacao_nova`, `texto`, `evidencia`, `publica`, `admin_id`, `criado_em` | Alimenta a linha do tempo |
| `confirmacoes` | `id`, `ocorrencia_id`, `chave_dedup_hash`, `criado_em` | Contador é indicativo, não prova (ver ADR-0004) |
| `denuncias` | `id`, `ocorrencia_id`, `motivo`, `texto`, `status`, `criado_em` | |
| `respostas` | `id`, `ocorrencia_id`, `autor_tipo`, `texto`, `status`, `criado_em` | Direito de resposta **[PENDENTE]** |
| `administradores` | `user_id`, `papel`, `ativo` | Papéis: `moderador`, `gestor`, `superadmin` (a refinar) |
| `historico_moderacao` | `id`, `ocorrencia_id`, `admin_id`, `acao`, `motivo`, `antes` (jsonb), `depois` (jsonb), `criado_em` | Somente inserção (*append-only*) |

## Visões públicas
- `v_ocorrencias_publicas`: ocorrências com `moderacao = 'publicado'`, sem campos internos.
- `v_atualizacoes_publicas`: atualizações com `publica = true` de ocorrências publicadas.
- `v_indicadores_*`: agregados para o Painel de Inteligência.

## RLS (resumo)
Implementação e testes em [`../db/`](../db/README.md).

| Recurso | `anon` | `authenticated` (admin) |
|---|---|---|
| Views públicas | `SELECT` | `SELECT` |
| Tabelas operacionais | nenhum | `SELECT` conforme papel; **sem** `INSERT`/`UPDATE`/`DELETE` diretos |
| `contatos_privados`, `tokens_gestao`, `confirmacoes` | nenhum | nenhum acesso direto; contato só por `admin_ver_contato` (gestor+, registrado) |
| `historico_moderacao`, `atualizacoes` | nenhum | `SELECT` (gestor+ / moderador+); somente-inserção por gatilho |
| Escritas administrativas | — | funções `admin_*` (checam papel e gravam no histórico) |

Funções do servidor (`registrar_ocorrencia`, `acompanhar_por_token`, `solicitar_exclusao_por_token`,
`registrar_denuncia`, `registrar_confirmacao`) executam apenas com `service_role`.

## Pontos em aberto
- Retenção e expiração de `contatos_privados` (campo `expira_em`) **[PENDENTE]**.
- Fluxo e tabela de direito de resposta **[PENDENTE]**.
- Tratamento de solicitações de titulares (LGPD) via token de gestão **[PROPOSTO]**.
