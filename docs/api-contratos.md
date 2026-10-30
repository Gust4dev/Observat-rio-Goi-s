# Contratos da API

Documento dos Route Handlers atuais. Schemas e tipos TypeScript seguros para cliente são exportados em `src/lib/contratos/index.ts`; não importam código `server-only`. O teste `src/lib/contratos/sincronizacao.test.ts` compara o inventário de método e rota com os handlers encontrados no repositório.

## Regras comuns

Todas as rotas usam HTTPS em produção. Corpos JSON usam `Content-Type: application/json`, UTF-8 estrito e no máximo 24 KiB nas rotas públicas de registro/participação; handlers administrativos limitam JSON a 16 KiB, autenticação a 4 KiB. Entrada inválida: `400`; origem/CSRF ou papel insuficiente: `403`; sessão ausente/inválida: `401`; recurso ausente: `404`; conflito de estado/duplicidade: `409`; excesso de corpo: `413`; mídia não suportada: `415`; limite: `429`; dependência/configuração: `503`. Rotas privadas respondem `Cache-Control: no-store`. Não registrar dados pessoais.

Rotas públicas de escrita exigem `Origin` igual à origem da aplicação e rejeitam `Sec-Fetch-Site: cross-site`. Turnstile é enviado no campo JSON `turnstile` (não em header) para denúncias e respostas públicas; cada rota usa limite próprio configurado no servidor. Registro não recebe contato pessoal: é anônimo e exige `AMBIENTE_REGISTRO=staging_ficticio` e `MODO_PUBLICACAO=moderar_tudo` no ambiente de teste. Respostas de sucesso de participação são neutras para reduzir enumeração.

## Escrita e leitura pública

| Método e rota | Entrada exata | Resposta | Cabeçalhos, erros, limites |
|---|---|---|---|
| POST `/api/registrar` | `{municipio,categoria,titulo,descricao,token_hash,chave_idempotencia,turnstile}`; slugs até 100 chars, título 5–120, descrição 20–4000, hash SHA-256 hex, UUID idempotência, Turnstile token até 2048 | `201 {protocolo,confirmacao}` | Origem; JSON ≤24 KiB; limiter `registrar`; Turnstile validado; no-store. Erros comuns, `422`/`503` mapeados pela rota |
| POST `/api/acompanhar` | `{token}`; token privado de acompanhamento | Estado `{protocolo,titulo,situacao,moderacao,motivo_remocao,publicado_em,criado_em,atualizacoes,respostas}` | Origem; JSON ≤24 KiB; limiter `acompanhar`; resposta privada no-store. Token inválido retorna erro neutro |
| POST `/api/excluir` | `{token,confirmacao:true}` | `{confirmacao:"Exclusão concluída."}` | Origem; JSON ≤24 KiB; limiter `excluir`; no-store. Não revela titularidade; erro de token é neutro |
| POST `/api/denunciar` | `{ocorrencia_id,turnstile,motivo,texto?}`; UUID; motivo `dado_pessoal\|acusacao_sem_base\|ameaca\|conteudo_ilegal\|spam\|duplicado\|outro`; texto opcional 1–1000 | `202` confirmação neutra | Origem; Turnstile JSON; limite `LIMITE_DENUNCIA_MAXIMO`; triagem antes do RPC; no-store; erros comuns |
| POST `/api/resposta` | `{ocorrencia_id,turnstile,vinculo,contato,texto}`; vínculo 2–120, contato 3–254, texto 10–4000 | `202` confirmação neutra; revisão pendente | Origem; Turnstile JSON; limite `LIMITE_RESPOSTA_MAXIMO`; triagem; contato armazenado privado; no-store; erros comuns |
| POST `/api/afeta` | Contrato reservado para `{ocorrencia_id,turnstile}` | Rota desligada retorna `503` | Flag padrão `AFETA_HABILITADO=false`; permanece desligada mesmo se flag estiver ativa até decisão de produto; sem medida de gravidade |
| GET `/api/dados` | Query `municipio` e `categoria` opcionais (slugs); `formato=json\|csv`, padrão `json`; parâmetros desconhecidos rejeitados | JSON `{dados,total_linhas}`; CSV UTF-8 BOM, `Content-Disposition: attachment; filename="dados-observatorio.csv"` | Cache `public, max-age=0, s-maxage=60, stale-while-revalidate=60`; tags internas `indicadores`, `problemas`; 5.000 linhas máx.; 400 filtros/formato, 422 teto, 503 dependência. CSV protege fórmulas |
| GET `/api/saude` | Sem entrada | `{aplicacao:"ok",banco:"ok\|indisponivel\|nao_configurado"}` | `200` se DB ok, senão `503`; no-store, noindex, request id; sem segredo/detalhe interno |
| POST `/api/imagem` | Multipart JPEG de imagem pública conforme contrato M4, com token de acompanhamento e contexto/slot; tamanho máximo documentado em `docs/operacao-fotos.md` | Confirmação privada do recebimento | Origem; limite M4; `FOTOS_HABILITADAS`; no-store; 400/403/409/413/415/429/503 |
| GET `/api/cron/limpar-quarentena` | `Authorization: Bearer <CRON_SECRET>` | Contagens da limpeza, sem caminhos | No-store; 401 credencial inválida; 503 ausência/falha; execução limitada a 60s |

## Sessão administrativa

Rotas mutáveis exigem `Origin` igual à origem e `X-Observatorio-CSRF: 1`. Cookies são HttpOnly, Secure e SameSite=Strict; access cookie `og_admin_access_token`, refresh cookie `og_admin_refresh_token`. Bearer é aceito para cliente/CLI. Sessão administrativa operacional requer MFA TOTP e `aal2`; todas as respostas são no-store, noindex e `Referrer-Policy: no-referrer`. Limite de login é próprio e por email/origem, configurado no servidor; falha não revela se email existe.

| Método e rota | Corpo/credencial | Saída |
|---|---|---|
| POST `/api/admin/auth/login` | `{email,password}` | `{mfa_required:true}` e cookie de configuração inicial AAL1; erros 400/401/403/429/503 |
| GET `/api/admin/auth/session` | Cookie/Bearer | `{authenticated:true,papel}` apenas AAL2 |
| POST `/api/admin/auth/refresh` | Refresh cookie; CSRF | `{authenticated:true}` e rotação dos cookies |
| POST `/api/admin/auth/logout` | Access cookie/Bearer; CSRF | `{authenticated:false}` e cookies apagados; sessão invalidada |
| GET `/api/admin/auth/factors` | Access cookie/Bearer autenticado | `{factors:[{id,status}]}` |
| POST `/api/admin/auth/enroll` | `{}`; access cookie AAL1 | Dados de inscrição TOTP (`id`, tipo, QR/segredo/URI) uma única vez |
| POST `/api/admin/auth/challenge` | `{factor_id}` | `{id,expires_at}` |
| POST `/api/admin/auth/verify` | `{factor_id,challenge_id,code}` com código de seis dígitos | `{authenticated:true}` e cookies AAL2 |

## Administração

Todas as ações administrativas exigem token válido e AAL2. Papel mínimo: moderador em fila, ocorrência, denúncias, respostas e foto; gestor em auditoria/contato; superadmin na equipe. Erros comuns aplicam-se; entradas JSON têm teto 16 KiB. Ações são auditadas em RPC SECURITY DEFINER. Mutações que afetam leitura pública invalidam tags `problemas`, `municipios`, `indicadores`. Endpoints administrativos são no-store.

| Método e rota | Query/corpo | Saída/validação |
|---|---|---|
| GET `/api/admin/fila`, `/api/admin/ocorrencias` | `limite` 1–100 padrão 50; `moderacao`, `situacao`, `municipio_id`, `categoria_id`; `idade_min_dias`, `idade_max_dias` inteiros 0–36500; `denuncia=true\|false`; `foto_pendente=true\|false`; `ordem=prioridade\|antigos\|recentes` padrão prioridade; `cursor` opaco | `{itens,total,proximo_cursor}`; prioridade ordena denúncias abertas e fotos pendentes antes da idade |
| GET `/api/admin/ocorrencias/{id}` | UUID | Detalhe completo para moderação, atualizações, denúncia/histórico; sem contato privado e sem caminho/URL interna |
| POST `/api/admin/ocorrencias/{id}/moderar` | `{acao,motivo?,motivo_codigo?}`; `aprovar\|reter\|remover\|restaurar`; motivo até 1000; códigos fechados `dados_pessoais\|conteudo_ofensivo\|fora_escopo\|spam\|duplicidade\|outro` | `{ok:true}`; remoção exige código e motivo |
| POST `/api/admin/ocorrencias/lote` | `{ids:[UUID...],acao:"aprovar"\|"reter",motivo?}`; 1–50 IDs sem repetição; retenção exige motivo | Resultado por item, transação única |
| POST `/api/admin/ocorrencias/{id}/situacao` | `{situacao,texto,evidencia?,publica?}`; texto/evidência até 4000 | `{ok:true}`; `resolvido` exige evidência |
| POST `/api/admin/ocorrencias/{id}/atualizacoes` | `{situacao?,texto,evidencia?,publica?,tipo}`; tipo `providencia\|evidencia\|resposta_oficial\|nota` | `{ok:true}`; notas privadas não aparecem publicamente |
| POST `/api/admin/ocorrencias/{id}/mesclar` | `{destino:UUID,motivo}`; origem diferente do destino | `{ok:true}`; auditoria e origem marcada como duplicata |
| GET `/api/admin/ocorrencias/{id}/contato` | UUID; gestor+ | Contato, se houver; cada leitura é auditada |
| GET `/api/admin/denuncias` | `limite` 1–100, `offset` 0–100000, `ocorrencia_id`, `status=aberta\|em_analise\|procedente\|improcedente` | Lista de denúncias paginada |
| POST `/api/admin/denuncias/{id}/resolver` | `{status:"em_analise"\|"procedente"\|"improcedente"}` | `{ok:true}` |
| GET `/api/admin/respostas` | `limite`, `offset`, `ocorrencia_id`, `status=pendente\|publicada\|rejeitada` | Lista paginada sem contato privado |
| POST `/api/admin/respostas/{id}/revisar` | `{acao:"publicar"\|"rejeitar",motivo?}`; rejeitar requer motivo | `{ok:true}` |
| GET `/api/admin/fotos/{id}/revisao` | UUID | `{url,expira_em_segundos:60}`; URL privada assinada, não publicar nem persistir |
| POST `/api/admin/imagem` | Ação M4, id da imagem e dados de decisão/checklist conforme esquema do handler | Confirmação de aprovação/remoção; lease e auditoria de banco |
| GET `/api/admin/auditoria` | `ocorrencia_id`, `admin_id`, `acao` (snake_case até 80), `desde`, `ate`, `limite` 1–100, `offset` 0–100000 | Eventos de auditoria filtrados; desde ≤ até |
| GET `/api/admin/equipe` | Sem filtros | Administradores ativos/inativos; superadmin |
| POST `/api/admin/equipe/convidar` | `{email,papel}` | Convite; link de uso único para o superadmin entregar se SMTP não estiver configurado |
| POST `/api/admin/equipe/{id}/papel` | `{papel:"moderador\|gestor\|superadmin"}` | `{ok:true}`; não rebaixa último superadmin |
| POST `/api/admin/equipe/{id}/desativar` | UUID | `{ok:true}`; não desativa último superadmin |

Tipos exportáveis incluem queries da fila, denúncias, respostas e auditoria; tipos de estado de saúde, equipe e respostas públicas; esquemas de escrita pública, login, moderação e lote. `src/lib/contratos/sincronizacao.test.ts` mantém a correspondência exata entre verbos/métodos registrados e exports dos Route Handlers. Atualizações de campos de um endpoint devem atualizar este documento e os schemas correspondentes.
