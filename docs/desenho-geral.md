# Desenho geral do sistema **[PROPOSTO]**

Escopo: como as partes se encaixam, quais operações existem, como cada uma funciona e em que ordem construir.
O banco já está desenhado em [`../db/`](../db/README.md); aqui está o que fica **em volta** dele.

## 1. Visão em uma página

```
 Celular / navegador
        │
        ▼
 ┌─────────────────────────────────────────────┐
 │ Aplicação web (Next.js, TypeScript, Tailwind) │
 │  • Páginas públicas  (renderizadas no servidor)│
 │  • Formulário        (cliente)                 │
 │  • /admin            (sessão Supabase Auth)    │
 │  • /api/*            (camada de servidor)      │
 └───────┬──────────────────────┬────────────────┘
         │ chave anon           │ service_role (só no servidor)
         │ (leitura: views)     │ (escrita: funções registrar_*)
         ▼                      ▼
 ┌─────────────────────────────────────────────┐        ┌───────────────┐
 │ Supabase                                      │        │ Turnstile      │
 │  PostgreSQL (RLS, funções, views)             │◄──────►│ (anti-bot)     │
 │  Auth (só administradores)                    │        └───────────────┘
 │  Storage: imagens-quarentena | imagens-publicas│
 │  pg_cron (retenção, limpeza)                  │
 └─────────────────────────────────────────────┘
```

Três caminhos, e só três:
| Caminho | Quem | Como acessa o banco |
|---|---|---|
| **Leitura pública** | qualquer pessoa | páginas renderizadas no servidor leem as **views** `v_*` |
| **Escrita do cidadão** | qualquer pessoa, sem conta | `POST /api/*` → servidor valida → função `registrar_*` com `service_role` |
| **Administração** | equipe com papel | sessão Supabase Auth → funções `admin_*` com o JWT do usuário (o banco checa o papel) |

## 2. Mudança em relação ao desenho anterior
O desenho inicial previa **Supabase Edge Functions** para a escrita do cidadão. Proponho trocar por
**rotas de servidor do próprio Next.js** (`/api/*`), pelos motivos abaixo. É uma decisão aberta (ADR-0008).

| Critério | Edge Functions | Rotas do Next.js |
|---|---|---|
| Bases de código / deploys | 2 (app + funções) | **1** |
| Tipos compartilhados com o frontend | não | **sim** |
| Remover EXIF e reencodar imagem (`sharp`) | difícil: runtime Deno com limites de CPU/memória (verificar) | **natural** (Node) |
| Cold start / latência | bom | depende da hospedagem |
| Limite de corpo de requisição | a verificar | ~4,5 MB em plataformas serverless como a Vercel (verificar); sem limite prático em servidor próprio |
| Chave `service_role` | em segredo do Supabase | em variável de ambiente da hospedagem |

Contrapartida: a hospedagem do Next passa a guardar a `service_role`, então é preciso conta da organização, MFA e
rotação de chave. Se o limite de corpo for problema, comprimir no cliente (seção 5) resolve para fotos de celular.

## 3. Operações (catálogo)

### 3.1 Cidadão (sem conta) — `POST /api/...`
| Endpoint | Função | Banco |
|---|---|---|
| `/api/registrar` | M3: cria relato anônimo sem fotos/contato | `registrar_ocorrencia` |
| `/api/acompanhar` | Estado privado da própria ocorrência | `acompanhar_por_token` |
| `/api/excluir` | Apaga contato e, se pedido, o conteúdo | `solicitar_exclusao_por_token` |
| `/api/denunciar` | Denuncia conteúdo público | `registrar_denuncia` |
| `/api/afeta` | "Esse problema também me afeta" | `registrar_confirmacao` |
| `/api/resposta` | Direito de resposta (quem foi citado) | `registrar_resposta`* |

`*` ainda não existe no banco (seção 10).

Regras comuns a todos:
1. Valida o corpo com um esquema (ex.: Zod): tipos, tamanhos, formatos. Rejeita campos desconhecidos.
2. Verifica **Turnstile** no registro; acompanhamento e exclusão autenticam pelo token. Todas aplicam **limite de taxa**.
3. Só então chama o banco. O cliente **nunca** escolhe `moderacao`, `situacao`, `verificado` nem `protocolo`.
4. Resposta de erro uniforme: `{ "erro": { "codigo": "...", "mensagem": "..." } }`; sem detalhes internos.
5. Nenhum dado pessoal em logs, nem em URL ou query string.
6. CORS restrito à origem do site.

### 3.2 `POST /api/registrar` em detalhe — M3

Entrada JSON estrita: `municipio` (slug), `categoria` (slug), `titulo`, `descricao`, `token_hash` (SHA-256 hexadecimal), `chave_idempotencia` (UUID) e `turnstile`. O M3 não recebe fotos, contato, `anonimo`, `moderacao` ou `situacao`; o servidor envia anonimato verdadeiro ao banco. Fotos ficam para M4 e contato exige decisão própria.

1. Valida origem, tipo/tamanho de corpo, JSON e esquema; limites e Unicode são verificados no servidor.
2. Verifica Turnstile server-side e consome limite por endpoint/origem HMAC; IP puro não é guardado. Na Vercel, usa somente header sobrescrito pela plataforma; runtime genérico não confia em header arbitrário.
3. Resolve slugs de município/categoria para IDs e consulta `triagem_sinais`.
4. Define moderação a partir de `MODO_PUBLICACAO`, com `moderar_tudo` por padrão, e chama `registrar_ocorrencia` com o hash que veio do navegador.
5. Responde só protocolo e confirmação. O navegador já tem o segredo e constrói `/acompanhar#<token>`; o token nunca vai no registro nem volta na resposta.

**Gate da Task 4.1 (prevalece sobre o modo automático descrito acima):** `POST /api/registrar` exige `AMBIENTE_REGISTRO=staging_ficticio` no servidor e `MODO_PUBLICACAO=moderar_tudo` (também é o padrão quando vazio). Sempre grava `pendente`; `texto_automatico` responde 503 antes de qualquer rede. `VERCEL_ENV=production` fica bloqueado mesmo com opt-in. Na Vercel, só preview com usuário/senha de staging configurados; o proxy exige autenticação básica. Fora da Vercel, somente origem loopback em dev/start com opt-in. Configurar somente banco separado de staging e usar exclusivamente relatos fictícios; a flag não comprova a proveniência dos dados nem aprova produção.

**Idempotência:** o navegador conserva token e UUID durante retries. Mesma chave e mesmo hash retornam o mesmo protocolo; chave com outro hash é recusada sem revelar protocolo. Resposta perdida após gravação é tratada como resultado ainda não confirmado, permitindo repetir a mesma tentativa.

**Indisponibilidade:** sem configuração obrigatória do servidor, as APIs falham fechadas com 503 e mensagem genérica; a UI preserva a tentativa e mostra indisponibilidade. Sem JavaScript, registro e acompanhamento explicam a dependência do código privado no cliente e não fazem envio sem credencial.

### 3.3 Demais operações
- **`acompanhar`:** recebe o token, hasheia (`sha256`) e chama `acompanhar_por_token`. Devolve situação, estado de
  moderação (por ex. "em revisão"), motivo de remoção se houver e a linha do tempo. Token inválido → `404`
  (sem distinguir "não existe" de "expirou").
- **`excluir`:** token + `apagar_conteudo` (bool). Apaga contato; opcionalmente conteúdo e fotos (o servidor remove
  os arquivos devolvidos pela função). Responde com confirmação; ação fica no histórico.
- **`denunciar`:** motivo da lista fechada + texto curto. Sempre responde `202`, exista ou não a ocorrência
  (não revela o estado de moderação).
- **`afeta`:** chave de deduplicação = HMAC(IP+UA+data) com segredo. Responde o total atual. Não é prova de nada (ADR-0004).
- **`resposta`:** vínculo (ex.: órgão), contato privado e texto. Entra como `pendente` para revisão; nunca publica sozinha.

## 4. Administração
Sem rota de servidor para a maioria das ações: o painel usa a sessão do administrador e chama `admin_*` direto;
**o banco decide** se pode. Isso mantém a regra de permissão em um só lugar.

| Tela | Lê | Ação (função) |
|---|---|---|
| Fila de moderação | `ocorrencias` (pendente/retido), `imagens` | `admin_moderar_ocorrencia` (aprovar/reter/remover/restaurar) |
| Revisão de fotos | `imagens` + URL assinada da quarentena | `admin_moderar_imagem` + mover arquivo |
| Detalhe da ocorrência | `ocorrencias`, `atualizacoes`, `denuncias` | `admin_atualizar_situacao`, `admin_adicionar_atualizacao` |
| Denúncias | `denuncias` | `admin_resolver_denuncia` |
| Respostas | `respostas` | `admin_revisar_resposta` |
| Contato | — | `admin_ver_contato` (gestor+, registrado) |
| Auditoria | `historico_moderacao` (gestor+) | — |
| Equipe | `administradores` (superadmin) | inserir/alterar papéis |

Única rota de servidor do admin: **`/api/admin/imagem`**. Verifica a sessão, chama `admin_moderar_imagem` com o
JWT do usuário (autoriza e audita) e, só então, com `service_role`, copia a foto de `imagens-quarentena` para
`imagens-publicas` (aprovar) ou apaga (remover). Se a cópia falhar, a rotina de reconciliação (seção 8) corrige.

Autenticação do admin: e-mail + senha com **MFA obrigatório**; sem cadastro aberto (convite pelo superadmin).

## 5. Frontend
**Renderização.** O compartilhamento por WhatsApp é central em público mobile: a pré-visualização do link lê as
tags Open Graph do HTML inicial. Por isso as páginas públicas são **renderizadas no servidor** (resolve ADR-0003).

| Rota | Renderização | Dados |
|---|---|---|
| `/` | estática | municípios (ativos primeiro) |
| `/registrar` | cliente | formulário |
| `/problemas` | servidor, com filtros na URL | `v_ocorrencias_publicas` (paginação por cursor) |
| `/problema/:id` | servidor, revalida a cada poucos minutos | view + atualizações + imagens + respostas |
| `/municipios/:slug` | servidor, revalida | indicadores do município |
| `/inteligencia` | servidor, revalida | `v_indicadores_*` |
| `/acompanhar` | cliente | token no fragmento da URL (`#`), não em query string |
| `/admin/*` | cliente autenticado | RPC/tabelas conforme papel |
| institucionais | estáticas | texto |

**Detalhes que importam no celular**
- O token vive no **fragmento** (`/acompanhar#TOKEN`): fragmentos não vão para logs de servidor nem para o `Referer`.
- Compressão de foto no cliente antes do envio (lado maior ≤ 1600 px, JPEG ~80%) para caber no corpo da requisição
  e poupar o plano de dados do usuário.
- Rascunho do formulário salvo localmente (texto) para não perder o relato se a conexão cair.
- Formulário curto; botão de registrar sempre visível; alvos de toque grandes; contraste AA; teclado numérico no WhatsApp.
- Sem cookies de rastreamento; analytics, se houver, sem identificador pessoal.
- Páginas com 0 resultados dizem a verdade ("ainda não há relatos aqui"), sem painel falso.

**Acesso a dados:** o cliente do navegador usa a chave `anon` e só enxerga o que o banco libera (views). Mesmo assim,
as listagens públicas são lidas no servidor para controlar cache e não depender do navegador.

## 6. Triagem automática (antes da moderação humana)
Decide só o estado inicial; **não** é veredito. Neste marco, o registro aceita exclusivamente `moderar_tudo`, com o gate de staging fictício da seção 3.2. Publicação automática depende de aprovação jurídica/operacional e implementação futura; alterar a variável não a habilita:

| `MODO_PUBLICACAO` | Texto sem foto | Com foto |
|---|---|---|
| `moderar_tudo` | `pendente` | `pendente` |
| `texto_automatico` | Bloqueado: registro responde 503 | Bloqueado; fotos fora do M3 |

Sinais de **retenção** (`retido`) propostos para uma política futura, ainda inativa no registro M3: dados pessoais óbvios (CPF, CNPJ, e-mail, telefone no texto), links, termos de
uma lista de bloqueio (ameaças, ofensas), texto em caixa alta, texto muito repetido ou idêntico a outro recente,
envio vindo de uma origem já sinalizada. A lista e os pesos ficam no servidor e **não** são documentados
publicamente. Falso positivo é aceitável: vai para a fila, não para o lixo.

Único modo aceito neste marco: `moderar_tudo`; não há publicação automática enquanto os gates de aprovação estiverem pendentes.

## 7. Anti-abuso
- **Turnstile** em registro, denúncia, "também me afeta" e resposta.
- **Limite de taxa** por origem (HMAC) e por endpoint, guardado numa tabela do Postgres (sem infraestrutura extra no MVP).
  Valores em variáveis de ambiente.
- **Origem sinalizada:** muitos relatos retidos/removidos/denunciados da mesma origem elevam a triagem para `retido`.
- **Texto duplicado:** hash do texto normalizado; repetição recente vai para a fila.
- **Conta administrativa:** MFA, convite, sem recuperação por perguntas.
- Limitação conhecida: IP e user-agent são fracos contra quem usa vários aparelhos; o desenho conta com a moderação
  humana como última barreira e não promete impedir abuso determinado.

## 8. Rotinas agendadas
| Rotina | Onde | O que faz |
|---|---|---|
| Retenção | `pg_cron` (SQL puro) | apaga `contatos_privados` com `expira_em` vencida; registra no histórico |
| Limpeza de quarentena | cron do app | remove arquivos de quarentena sem linha em `imagens` (>24 h) |
| Reconciliação de imagens | cron do app | garante `publicado` ⇒ arquivo em `imagens-publicas`, e o inverso |
| Limpeza de limites de taxa | `pg_cron` | apaga contadores antigos |
| Backup | Supabase + exportação mensal | exportar para destino da organização; testar a restauração |

## 9. Configuração, segredos e ambientes
| Variável | Onde | Observação |
|---|---|---|
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | cliente e servidor | públicas |
| `SUPABASE_SERVICE_ROLE_KEY` | **só servidor** | nunca em código, repositório ou navegador; rotacionar |
| `TURNSTILE_SECRET`, `HMAC_SEGREDO` | só servidor | sal diário derivado do segredo |
| `MODO_PUBLICACAO` | servidor | Registro M3 aceita somente `moderar_tudo`; `texto_automatico` responde 503 |
| limites de taxa, lista de bloqueio | servidor | não documentar valores |

Ambientes: **local** (Supabase CLI), **staging** (projeto Supabase separado, **sem dados reais**), **produção**.
Contas de hospedagem, Supabase e domínio pertencem à **organização**, não a uma pessoa.

## 10. Lacunas no banco reveladas por este desenho — **resolvidas na migração 007**
| # | Falta | Como ficou |
|---|---|---|
| L1 | Gravar fotos de forma validada | `registrar_imagem(token_hash, ordem, caminho, mime, tamanho)`; fotos nascem `pendente` |
| L2 | Repetição de requisição no celular | `ocorrencias.chave_idempotencia`; `registrar_ocorrencia` devolve a existente (`out_repetida`); chave com outro token é recusada |
| L3 | Direito de resposta | `registrar_resposta(...)`; entra `pendente`, publicada só por `admin_revisar_resposta` |
| L4 | Limite de taxa sem infraestrutura extra | `consumir_limite(chave, janela, máximo)` em tabela de schema não exposto |
| L5 | Retenção | `interno.limpar_expirados()` agendada por `pg_cron` (job `limpeza-diaria`); prazo padrão dos contatos é **a definir** |
| L6 | Detecção de texto repetido | `texto_hash` + `triagem_sinais(...)` |
| L7 | Fila de moderação | `v_fila_moderacao` (`security_invoker`) com fotos pendentes e denúncias abertas |
| L8 | Origem sinalizada | `origem_hash` (HMAC calculado no servidor) + `triagem_sinais(...)` |

Efeitos para o servidor: `registrar_ocorrencia` ganhou `p_chave_idempotencia` e `p_origem_hash` e agora devolve `out_repetida`.
Hashes de origem e de texto são apagados após 30 dias (são dado pseudonimizado).

## 11. Observabilidade
- Logs estruturados no servidor com **id de requisição**; sem corpo, sem token, sem contato.
- Contadores: registros por estado, tempo na fila de moderação, fotos rejeitadas, falhas de Turnstile, 429.
- Alertas: fila `pendente` acima do limite por mais de N horas (o gargalo é humano, não técnico), erros 5xx, falha de cópia de imagem.
- Os indicadores públicos de desempenho (tempo de triagem etc.) saem destes mesmos dados.

## 12. Testes
1. Banco: `db/tests/` (já existe). Repetir contra o Supabase real.
2. Contrato dos endpoints: cada rota com casos de validação, Turnstile, limite, idempotência, falha parcial.
3. **Teste de invasão básico** com a chave `anon` via API: tentar ler tabelas, executar funções, enumerar ocorrências não publicadas.
4. Ponta a ponta no celular (critério de aceite do MVP): registrar → publicar com protocolo → ver no painel → mudar status no admin → ver na página pública.
5. Acessibilidade e desempenho em rede 3G simulada.

## 13. Ordem de construção
| Marco | Entrega | Pode começar sem decisões institucionais pendentes? |
|---|---|---|
| M0 | Repositório, ambientes local/staging, CI com testes do banco | sim |
| M1 | Migração 007 (L1–L8) + testes | sim |
| M2 | Leitura pública: `/`, `/problemas`, `/problema/:id`, `/municipios/:slug` com dados de teste | sim |
| M3 | `/api/registrar` + formulário mobile (sem fotos) + acompanhamento | sim, com dados fictícios |
| M4 | Fotos (cliente + servidor + quarentena) | sim |
| M5 | Admin: fila, atualização de situação, auditoria | sim |
| M6 | Denúncia, "afeta", direito de resposta, indicadores | parcialmente (política de resposta a definir) |
| **Gate jurídico** | Privacidade, termos, controlador, parecer | **não** |
| M7 | Piloto em Anápolis com equipe de moderação definida | **não** |

Tudo até M6 roda em staging com dados fictícios, sem tocar em dado real de cidadão.

## 14. Riscos e perguntas abertas do desenho
- **Hospedagem do Next.js** (ADR-0008): Vercel (região São Paulo disponível?) ou servidor próprio. Impacta limite de corpo, custo e quem detém a `service_role`.
- **Moderação é o gargalo real:** sem equipe de moderação definida, qualquer modo que publique algo sem revisão é risco jurídico e qualquer modo que retenha tudo trava o produto.
- **Deduplicação fraca** de "afeta" e de relatos: aceitável no MVP, mas o painel não pode tratar o número como medida.
- **Dependência do Turnstile:** serviço externo recebe o IP do usuário; avaliar na política de privacidade.
- **Escala:** o desenho comporta o piloto com folga; não foi dimensionado para milhares de relatos por dia.
