# Fluxos e rotas

> Reconciliação Task 0.1 em 2026-10-27, baseada no checkout. Fluxo desenhado não significa endpoint
> implementado ou política aprovada. Inventário, assinaturas SQL, grants e donos dos bloqueios em
> [`estrutura-do-sistema.md` §18](estrutura-do-sistema.md#18-reconciliação-do-mapa-e-contratos--task-01-2026-10-27).

## Leitura pública — implementada parcialmente

- `/`: introdução, aviso metodológico, quatro contagens e cinco relatos recentes.
- `/problemas`: município por GET, categorias por link, lista, limpar e próxima página por cursor.
- `/problema/[id]`: descrição em texto puro, situação, município/categoria/protocolo/datas, fotos publicadas,
  evidência de resolução, atualizações públicas e respostas publicadas. Metadata OG textual existe;
  imagem OG, compartilhar, conferência explicada, denúncia e confirmação ainda não estão implementados.
- `/municipios/[slug]`: nome, contagem e lista filtrada. Não usa ainda `ativo_acompanhamento`;
  zero relatos não é prova de ausência de acompanhamento. O índice `/municipios` não existe.
- `not-found.tsx`, `error.tsx`, vazio e fallback de carregamento da lista existem; faltam estados globais
  de offline, limite e manutenção. Validação HTTP/acessibilidade completa permanece na fase de QA.
- Leitura passa por `src/lib/dados/` no servidor, com DTOs/colunas explícitas e cache;
  o navegador público não acessa Supabase diretamente.

## Registro de ocorrência — contrato M3

1. Cidadão abre `/registrar` e preenche município, categoria, título e descrição. M3 não coleta fotos, endereço ou contato; registro é anônimo conforme ADR-0007.
2. O navegador gera código privado criptográfico e chave idempotente. Só o SHA-256 do código segue no registro; ambos os valores originais permanecem no aparelho durante retries.
3. `POST /api/registrar` valida JSON/campos/limites/origem, verifica Turnstile, consome limite por HMAC de origem e consulta triagem. O módulo `server-only` chama `registrar_ocorrencia` com a `service_role`.
4. O servidor escolhe o estado inicial segundo `MODO_PUBLICACAO`; o padrão `moderar_tudo` mantém o relato pendente. O cliente não escolhe moderação, situação ou protocolo.
5. Sucesso só após confirmação da API; cidadão recebe protocolo e constrói o link `/acompanhar#<código>`. A API nunca devolve o segredo. Repetição usa mesma chave/hash e recebe o mesmo protocolo.
6. Sem JavaScript, a tela explica que não pode gerar o link privado com segurança e não envia o relato. Erro, indisponibilidade ou resposta perdida preservam a tentativa para retry.

## Acompanhamento e exclusão — contrato M3

1. Abrir `/acompanhar#<código>`; o navegador lê o fragmento. Não há consulta por protocolo isolado, nem segredo no path/query/HTML do servidor.
2. `POST /api/acompanhar` aplica origem, limite e `no-store`, calcula SHA-256 e chama `acompanhar_por_token`. Token inválido, expirado ou inexistente tem mensagem única.
3. O contrato estendido da migração M3 retorna resumo, situação/revisão, datas, atualizações visíveis e respostas publicadas; notas internas e contato permanecem fora do DTO.
4. “Pedir exclusão do relato” exige confirmação clara. `POST /api/excluir` autentica pelo código e chama `solicitar_exclusao_por_token(hash, true)`: texto é substituído por marcador, conteúdo retirado de publicação e auditoria preservada. Não há fila de análise humana nesse RPC.
5. M3 não coleta contato; por isso não oferece opção vazia de apagar contato. Sucesso só após confirmação da API; erro conserva acesso e oferece retry. A política de produção continua sujeita à revisão jurídica.

## Interações públicas — banco existente, UI/API ausentes

- “Também me afeta”: `registrar_confirmacao(uuid, bytea)` deduplica por ocorrência/hash e retorna boolean;
  origem/rotação/HMAC, limite e Turnstile dependem do servidor. Não equivale a pessoa única ou gravidade.
  Não existe RPC de desfazer; não oferecer “Desfazer” até contrato aprovado.
- Sinalização: `registrar_denuncia(uuid, text, text)` registra motivo/texto para relato publicado;
  endpoint deve validar motivos fechados e devolver resposta uniforme, sem revelar existência.
  Política editorial/jurídica de análise e recurso pendente; não remove automaticamente.
- Resposta: `registrar_resposta(uuid, text, text, text)` insere resposta pendente com vínculo/contato/texto;
  só aparece em `v_respostas_publicas` após revisão/publicação. Vínculo declarado não é verificação oficial.
- Todas essas operações SQL são restritas a `service_role`; endpoints previstos em `/api/afeta`,
  `/api/denunciar`, `/api/resposta` ainda não existem. Assinaturas/grants completos na matriz §18.2.

## Moderação e atualização — banco existente, telas ausentes

- Fila de `pendente`/`retido`, fotos pendentes e denúncias: `v_fila_moderacao`, restrita a authenticated.
- Aprovar, reter e remover via `admin_*`, com papel interno e trilha de histórico. Mesclar duplicidade
  ainda não tem função SQL; não apresentar essa ação como pronta.
- Admin adiciona atualização e muda situação; `resolvido` exige justificativa/evidência na função.
  Linha do tempo pública só mostra atualizações públicas de ocorrência publicada.
- Modelo de sessão/Auth/CSP do admin, equipe responsável, política de remoção e prazo de fila pendentes.

## Dados — rota projetada, agregados existentes

`/dados` é a rota canônica. Não existe arquivo local de `/dados` nem `/inteligencia`; histórico de
publicação anterior não foi verificado. Responsável pelo deploy verifica antes da Task 6.1:
se `/inteligencia` já foi compartilhada/publicada, criar redirect permanente para `/dados`; senão, sem alias.

As quatro views agregadas existem. Geral retorna quatro números; município×categoria permite contagens
nesses recortes; mensal só retorna mês/total e situação só situação/total. Não aplicar filtros municipais
ou de categoria nesses dois últimos como se houvesse backend. Gráficos filtrados dependem de nova view/RPC.
“Em acompanhamento” não tem fórmula aprovada e fica adiado. Resposta oficial no contador deriva de
atualização pública, enquanto a lista de respostas deriva da tabela `respostas`; dados/editorial devem
resolver a semântica antes de apresentá-los como equivalentes. Método e demonstração ficam visíveis.
Busca textual, período, mapa e fontes oficiais são backlog fase 2 sem controles ativos.

## Rotas e estado atual

| Rota | Finalidade | Estado no checkout |
|---|---|---|
| `/` | Inicial, números e recentes | Parcial: leitura implementada; composição do design pendente |
| `/problemas` | Lista e filtros | Parcial: leitura e paginação implementadas |
| `/problema/[id]` | Detalhe e linha do tempo | Parcial: leitura, fotos, respostas e OG textual implementados |
| `/municipios/[slug]` | Painel municipal | Parcial: falta cobertura operacional |
| `/municipios` | Índice de municípios | Ausente |
| `/registrar` | Registro em cinco etapas | Ausente; SQL existente |
| `/acompanhar#TOKEN` | Consulta privada; código também pode ser digitado | Ausente; nunca usar `/acompanhar/:token` |
| `/dados` | Painel de dados canônico | Ausente; views existentes |
| `/inteligencia` | Legado condicional | Ausente; redirect só se publicação anterior confirmada |
| `/sobre`, `/transparencia`, `/privacidade`, `/termos`, `/regras`, `/contato` | Institucional/legal | Ausentes; modelos até aprovação; canal real não definido |
| `/api/registrar`, `/api/acompanhar`, `/api/excluir`, `/api/afeta`, `/api/denunciar`, `/api/resposta` | Escrita/consulta privada via servidor | Todos ausentes |
| `/admin/*` | Administração protegida | Ausente; banco com funções e grants |
| `/robots.txt` | Bloqueio de indexação do ambiente fechado | Implementado |

## Critérios de aceite do MVP — ainda não concluídos

- Registrar pelo smartphone sem conta, com idempotência e sucesso confirmado no servidor.
- Receber protocolo/link privado; página pública somente após moderação permitida pela política.
- Indicadores refletirem publicações com fórmula, fonte e limites documentados.
- Equipe conseguir moderar e atualizar com histórico público, sem prometer operação não disponível.
- Dados pessoais protegidos; testes de RLS existentes não substituem validação dos endpoints futuros.
- Nenhuma abertura pública antes dos gates jurídico, institucional, operacional e de infraestrutura.

Fontes/licenças WOFF2 e geometria Goiás, Turnstile, aprovação de sharp e políticas de contato, publicação,
denúncia, exclusão e cobertura têm dono/ponto de bloqueio em `estrutura-do-sistema.md` §18.4.

## Estado atual do mapa — 2026-10-28

As tabelas de rotas acima são um inventário anterior ao mapa de implementação e ficam supersedidas pelo estado descrito aqui e em `estrutura-do-sistema.md` §21. Rotas de leitura, `/registrar`, `/acompanhar` e `/dados` existem e foram incluídas no build. O registro segue fechado salvo opt-in de staging fictício/local ou preview protegido e sempre aguarda moderação; não usar produção para testes. Acompanhamento usa o segredo apenas do fragmento e POST.

A UI de `/dados` está construída, mas a instância conectada ainda não expõe `v_dados_painel`: resposta PostgREST 404. A migration `012_dados_painel.sql` passou em PGlite; staging aguarda a aplicação operacional das migrations 011/012 e configuração do bucket privado. Nenhuma escrita externa foi feita nesta validação. Busca, período, mapa e indicadores oficiais continuam no backlog de fase 2.

Validação em build local: 287 testes unitários, `npm run db:test`, `npm run typecheck`, `npm run lint` e `npm run build` passaram. Rotas inexistentes testadas responderam 404, `/sobre` e o shell de `/dados` responderam 200, e acesso anônimo ao ambiente fechado foi recusado (401). Por causa de streaming/PPR, o 200 inicial da página de dados não confirma a leitura da view nem o estado final renderizado. Não houve contrato real de staging, teste com NVDA/VoiceOver, Lighthouse/LCP ou confirmação de escrita ponta a ponta.
