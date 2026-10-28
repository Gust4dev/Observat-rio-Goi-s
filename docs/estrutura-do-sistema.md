# Estrutura do sistema — mapa de pilares

Este arquivo é o **índice mestre**: divide o sistema inteiro em pilares, diz o que cada um precisa ter antes e
durante a construção, aponta onde isso já está documentado ou construído e lista o que **ainda não existe em lugar
nenhum**. Ele não repete o conteúdo dos outros documentos; referencia.

> Inventário feito sobre o repositório em 2026-10-27 (checkout atual; reconciliação Task 0.1, sem consultar ambiente remoto).
> Se algo aqui divergir do código, vale o código; corrija este arquivo.
> Informação operacional (pessoas, partido, financiamento, valores anti-abuso) **não** entra aqui: este repositório é público.

## 0. Como ler

**Status de cada item**

| Marca | Significado |
|---|---|
| ✅ Feito | Existe no repositório e tem teste ou verificação |
| 🟡 Parcial | Existe uma parte; o que falta está descrito |
| 📐 Projetado | Está desenhado em documento, sem código |
| ⬜ Sem desenho | Nenhum documento cobre; precisa ser pensado antes de construir |
| ⛔ Externo | Depende de decisão fora do código (jurídico, institucional) |

**Marcos** (de [`desenho-geral.md` §13](desenho-geral.md)): M0 base · M1 migração 007 · **M2 leitura pública** (implementado) ·
M3 registro + acompanhamento · M4 fotos · M5 admin · M6 denúncia/afeta/resposta/indicadores · Gate jurídico · M7 piloto.

## 1. Visão em uma tela

| # | Pilar | Resumo | Status | Marco | Fonte principal |
|---|---|---|---|---|---|
| A | Produto e conteúdo | Objetivo, módulos, textos, metodologia, páginas institucionais | 🟡 | M2–M6 | [`visao-geral.md`](visao-geral.md) |
| B | Frontend (público) | Design, rotas, componentes, features, acessibilidade, desempenho | 🟡 | M2–M6 | [`plano-m2.md`](plano-m2.md), `src/` |
| C | Camada de servidor (`/api/*`) | Escrita do cidadão, imagens, Turnstile, limite de taxa | 📐 | M3–M6 | [`desenho-geral.md` §3](desenho-geral.md) |
| D | Banco de dados | Tabelas, funções, views, RLS, storage, cron | ✅ (M1) | M0–M1 | [`../db/README.md`](../db/README.md) |
| E | Administração | Moderação, situação, denúncias, auditoria, equipe | 🟡 banco / ⬜ telas | M5 | [`desenho-geral.md` §4](desenho-geral.md) |
| F | Segurança, privacidade e anti-abuso | RLS, segredos, cabeçalhos, LGPD, triagem | 🟡 | M2–M6 | [`privacidade-e-seguranca.md`](privacidade-e-seguranca.md) |
| G | Moderação e triagem (regras) | Política de publicação e remoção | 📐 / ⛔ | M3, M5 | [`desenho-geral.md` §6](desenho-geral.md) |
| H | Dados e inteligência | Indicadores, metodologia, séries | 🟡 | M2, M6 | `db/003_views.sql` |
| I | Infraestrutura e ambientes | Hospedagem, Supabase, domínio, segredos, CI | 🟡 | M0, M2 | [`desenho-geral.md` §9](desenho-geral.md) |
| J | Observabilidade e operação técnica | Logs, alertas, rotinas, backup | 📐 | M3+ | [`desenho-geral.md` §8, §11](desenho-geral.md) |
| K | Qualidade e testes | Testes de banco, unitários, contrato, invasão, E2E | 🟡 | contínuo | [`desenho-geral.md` §12](desenho-geral.md) |
| L | Governança e portões externos | Controlador, termos, retenção, moderação | ⛔ | Gate | documentação privada |
| M | Documentação e convenções | Docs, ADRs, commits, idioma | ✅ | contínuo | [`convencao-de-commits.md`](convencao-de-commits.md) |

---

## 2. Pilar A — Produto e conteúdo

**Para que existe:** definir *o que* o sistema promete ao cidadão e *como* fala com ele, antes de qualquer tela.

| Item | O que precisa existir | Onde está | Status |
|---|---|---|---|
| Objetivo e princípios | Mobile first, sem conta, público/privado separados, transparência metodológica, rastreabilidade | [`visao-geral.md`](visao-geral.md) | ✅ |
| Módulos | Portal do Cidadão, Painel do Cidadão, Painel de Inteligência, Administração | [`visao-geral.md`](visao-geral.md) | ✅ |
| Escopo do MVP / fora do MVP | Lista fechada, critério de aceite em smartphone | [`visao-geral.md`](visao-geral.md) | ✅ |
| Categorias | 11 categorias iniciais | `db/006_seed_categorias.sql` | ✅ |
| Municípios | 246 de Goiás, `ativo_acompanhamento` | `db/008_seed_municipios.sql` | ✅ |
| Vocabulário da situação | Texto, descrição e tom de cada `situacao_ocorrencia` | `src/lib/situacao.ts`, [`plano-m2.md` §4](plano-m2.md) | ✅ |
| Aviso metodológico | Texto padrão ("relato voluntário não é pesquisa estatística") | componente `AvisoMetodologico` | 🟡 texto precisa de revisão final |
| Páginas institucionais | `/sobre`, `/transparencia`, `/privacidade`, `/termos`, `/regras`, `/contato` | modelos previstos em `design.md`; rotas ausentes | 📐 conteúdo-modelo; ⛔ aprovação jurídica |
| Microcopy do formulário | Rótulos, ajuda, erros, consentimento e sucesso | `design.md` G | 📐 texto desenhado; política pendente |
| Política de "não verificado" | Como o selo `verificado` é exibido e quando muda | coluna `verificado`; sem regra de uso | ⬜ |
| Metodologia dos indicadores | Fonte, limitação, o que cada número **não** significa | só o princípio | ⬜ (necessário antes de `/dados`) |
| Estados de "município em breve" | O que o cidadão vê em município sem operação ativa | coluna existe; design define estado sem acompanhamento; DTO ainda omite a coluna | 🟡 |

---

## 3. Pilar B — Frontend (público)

### 3.1 Mapa de design

Fundação M2 implementada em `src/app/globals.css`; a direção verde/creme e fontes locais de [`design.md`](design.md) ainda será aplicada. Os status abaixo descrevem o código atual, não o design concluído.

| Camada | Definição atual | Onde | Status |
|---|---|---|---|
| Princípios | Celular simples e 4G fraco; funciona sem JS; página < 100 KB; sem webfont | M2-11 | ✅ |
| Cores | Fundo, superfície, texto, texto suave, borda; **uma** cor de ação (`#0b4f9c`); 4 tons de selo (neutro, andamento, sucesso, encerrado); aviso amarelo | `globals.css` `@theme` | ✅ só tema claro |
| Tipografia | Fonte do sistema; corpo 18 px; h1 28/32 px, h2 21,6/24 px; linha 1,6 | `globals.css` | ✅ |
| Espaçamento e grade | Coluna única `max-w-3xl`, gutter 16 px | `layout.tsx` | 🟡 sem escala de espaçamento documentada |
| Interação | Foco visível de 3 px; alvos de toque ≥ 48 px; links sublinhados | `globals.css` | ✅ |
| Acessibilidade | Contraste AA; HTML semântico; "pular para o conteúdo"; situação sempre com texto + ícone | `layout.tsx`, `SeloSituacao` | 🟡 sem checklist de verificação |
| Ícones | Conjunto usado nos selos | `SeloSituacao` | 🟡 inventário e regra de uso não escritos |
| Estados de tela | Vazio, erro, 404 e carregamento da lista implementados | `EstadoVazio`, `error.tsx`, `not-found.tsx`, `CarregandoLista` | 🟡 faltam loading global, offline, 429 e manutenção na UI |
| Tema escuro | Não previsto | — | ⬜ decisão: fora do MVP |
| Wireframes por tela | Esboço de cada rota em 360 px | [`design.md` §5](design.md) | 🟡 M2/M3/M6 desenhados; admin pendente |
| Documento de design | Tokens, componentes, regras, exemplos num único lugar | [`design.md`](design.md) | ✅ |

**Componentes** (`src/components/`)

| Componente | Função | Status |
|---|---|---|
| `CartaoProblema` | Item de lista: título, município, categoria, situação, data | ✅ |
| `SeloSituacao` | Rótulo + ícone + tom por situação | ✅ |
| `LinhaDoTempo` | Atualizações públicas em ordem, com evidência | ✅ |
| `AvisoMetodologico` | Aviso padrão sobre natureza dos dados | ✅ |
| `EstadoVazio` | "Ainda não há relatos aqui" sem painel falso | ✅ |
| `AvisoAmbiente` | Faixa "ambiente de teste — dados fictícios" | ✅ |
| Cabeçalho / rodapé / navegação | No `layout.tsx` | 🟡 rodapé provisório; navegação com 1 link |
| Formulário (campos, envio e erros) | — | ✅ M3; upload permanece em M4 |
| Seletor de município / categoria | Select GET de município e categorias por links em `ListaProblemas` | 🟡 feito na lista; falta seletor progressivo do design |
| Botão compartilhar (WhatsApp) | Central no público-alvo ([`desenho-geral.md` §5](desenho-geral.md)) | ⬜ |
| Galeria de fotos | Fotos publicadas na página de detalhe | ⬜ |
| Paginação "Próxima página" | Cursor opaco | ✅ em `ListaProblemas`, preserva filtros |

### 3.2 Mapa de rotas e features

| Rota | Features | Renderização | Marco | Status |
|---|---|---|---|---|
| `/` | Introdução, método, últimos 5 relatos e quatro contagens; faltam seletor, CTA e composição do design | servidor + consultas em cache | M2 | 🟡 implementada |
| `/problemas` | Lista, município por GET, categoria por link, limpar e próxima página por cursor | servidor, filtros na URL | M2 | 🟡 implementada; falta evolução visual/performance |
| `/problema/[id]` | Situação, local, categoria, descrição, fotos, linha do tempo, resposta oficial, metadados Open Graph, denunciar, "também me afeta" | servidor + `use cache` | M2 (leitura), M6 (ações) | 🟡 leitura, fotos, respostas e OG textual implementados; faltam imagem OG e ações |
| `/municipios/[slug]` | Nome, contagem e lista com categoria/cursor; falta estado de cobertura | servidor + consultas em cache | M2 | 🟡 implementada |
| `/registrar` | Município, categoria, título e descrição; anônimo; Turnstile; retry idempotente | shell + formulário client-side | M3 | ✅ implementada; fotos permanecem em M4 |
| `/acompanhar` | Situação, atualizações e respostas via token no fragmento; pedir exclusão | shell + consulta client-side | M3 | ✅ implementada |
| `/dados` | Indicadores com fonte e limitação | servidor + `use cache` | M6 | 📐 / ⬜ metodologia |
| `/sobre`, `/transparencia`, `/privacidade`, `/termos` | Texto institucional e legal | estática | Gate | ⬜ / ⛔ |
| `/admin/*` | Ver pilar E | cliente autenticado | M5 | 📐 |
| `robots.txt` | `Disallow` enquanto o ambiente for fechado | `src/app/robots.ts` | M2 | ✅ |
| `not-found.tsx`, `error.tsx` | 404 e erro com nova tentativa | servidor / error cliente | M2 | 🟡 arquivos implementados; validação HTTP/acessibilidade pendente |
| `sitemap.xml`, imagem OG padrão, `loading.tsx` | Ausentes; lista tem fallback `CarregandoLista` | — | M2/M6 | 📐 sitemap só após abertura |

**Contrato de rota:** `/acompanhar#TOKEN`, sem token em path/query. Ver reconciliação da seção 18 para protocolo + código e lacunas do retorno SQL.

### 3.3 Como o frontend conversa com o backend

Regra única: **o navegador nunca fala com o Supabase** nas páginas públicas (M2-1, M2-4). Leitura passa por
`src/lib/dados/` no servidor; escrita passa por `/api/*`.

**Leitura (M2 — a camada já existe)**

| Tela | Função em `src/lib/dados/` | View lida | Cache / tag |
|---|---|---|---|
| `/` | contagens + últimos problemas | `v_indicadores_gerais`, `v_ocorrencias_publicas` | `problemas` |
| `/problemas`, `/municipios/[slug]` | lista paginada | `v_ocorrencias_publicas` | `problemas`, `municipio:<slug>` |
| `/problema/[id]` | detalhe, atualizações, imagens, respostas | `v_ocorrencias_publicas`, `v_atualizacoes_publicas`, `v_imagens_publicas`, `v_respostas_publicas` | `problema:<id>` |
| `/dados` (a criar) | consultas agregadas adicionais pendentes | `v_indicadores_municipio_categoria`, `_mensal`, `_situacao` | tag `indicadores` já existe na consulta geral |

Contratos: `schemas.ts` (zod, colunas explícitas), `params.ts` (filtros e cursor com `.catch(padrão)`),
`rest.ts` (PostgREST via `fetch`), `db/colunas-publicas.json` (lista permitida, travada por teste).

**Escrita (M3 implementado)** — registro, acompanhamento e exclusão estão descritos na seção 19. A matriz da seção 5 também mantém as ações posteriores em M5/M6.

---

## 4. Pilar C — Camada de servidor (`/api/*`)

Detalhe completo em [`desenho-geral.md` §3](desenho-geral.md); aqui só o que falta decidir/construir.

| Item | Status | Observação |
|---|---|---|
| Esquema de validação compartilhado (zod) cliente/servidor | ✅ | Registro e acompanhamento M3 |
| Resposta de erro uniforme `{erro:{codigo,mensagem}}` | ✅ | Erros genéricos e falha fechada |
| Verificação Turnstile | ✅ | Widget no registro e verificação server-side |
| Limite de taxa (`consumir_limite`) + chave HMAC de origem | ✅ | Aplicado nos handlers M3 |
| Pipeline de imagem (`sharp`, tipo por bytes, EXIF, 1600 px) | 📐 | Dependência `sharp` ainda não instalada |
| Triagem (`triagem_sinais`, sinais de risco, `MODO_PUBLICACAO`) | ✅ | Uso server-side; critérios operacionais não são publicados |
| Idempotência (`chave_idempotencia`) | ✅ | Chave persistida no aparelho para retries |
| Cliente com `service_role` isolado em módulo `server-only` | ✅ | Chave permanece server-only; validar que valores não entram nos artefatos compilados |
| Origem restrita, CSP e headers | ✅ | Origem validada nos handlers; Cloudflare permitido somente no registro; `unsafe-inline` residual documentado |
| Rotas de cron (limpeza de quarentena, reconciliação de imagens) | 📐 | Depende da hospedagem (Vercel Cron) |
| Endpoints M3: `registrar`, `acompanhar`, `excluir` | ✅ | Catálogo em [`desenho-geral.md` §3.1](desenho-geral.md) |
| Endpoints posteriores: `denunciar`, `afeta`, `resposta`, `admin/imagem` | 📐 | Fora do M3; ver marcos M4–M6 |

---

## 5. Matriz frontend ↔ backend (escrita e administração)

| Ação do usuário | Tela | Endpoint | Função no banco | Quem executa | Marco |
|---|---|---|---|---|---|
| Registrar relato | `/registrar` | `POST /api/registrar` | `registrar_ocorrencia` | `service_role` | M3 |
| Enviar foto | `/registrar` | (mesmo endpoint) | `registrar_imagem` | `service_role` | M4 |
| Acompanhar | `/acompanhar#token` | `POST /api/acompanhar` | `acompanhar_por_token` | `service_role` | M3 |
| Pedir exclusão | `/acompanhar#token` | `POST /api/excluir` | `solicitar_exclusao_por_token`; conteúdo retirado de exibição, auditoria preservada | `service_role` | M3 |
| Denunciar conteúdo | `/problema/[id]` | `POST /api/denunciar` | `registrar_denuncia` | `service_role` | M6 |
| "Também me afeta" | `/problema/[id]` | `POST /api/afeta` | `registrar_confirmacao` | `service_role` | M6 |
| Direito de resposta | `/problema/[id]` | `POST /api/resposta` | `registrar_resposta` | `service_role` | M6 |
| Aprovar/reter/remover relato | `/admin` fila | direto (sessão) | `admin_moderar_ocorrencia` | JWT do admin | M5 |
| Moderar foto | `/admin` fotos | `/api/admin/imagem` | `admin_moderar_imagem` + cópia de arquivo | JWT + `service_role` | M5 |
| Mudar situação | `/admin` detalhe | direto | `admin_atualizar_situacao` | JWT | M5 |
| Publicar atualização | `/admin` detalhe | direto | `admin_adicionar_atualizacao` | JWT | M5 |
| Resolver denúncia | `/admin` denúncias | direto | `admin_resolver_denuncia` | JWT | M5 |
| Revisar resposta | `/admin` respostas | direto | `admin_revisar_resposta` | JWT | M5 |
| Ver contato | `/admin` detalhe | direto | `admin_ver_contato` (gestor+, registrado) | JWT | M5 |
| Ler auditoria / equipe | `/admin` | direto (tabela) | RLS por papel | JWT | M5 |

**Conflito a decidir no M5:** o desenho diz que o admin chama `admin_*` direto do navegador com a sessão do
Supabase Auth. Mas M2-2 decidiu **não usar `supabase-js`** e M2-8 restringe `connect-src`. O admin precisará de
(a) um cliente de Auth (biblioteca ou `fetch` próprio com refresh de token), (b) sessão em cookie `httpOnly` ou no
cliente, (c) ajuste do CSP. Decisão ainda **não registrada** (sugestão de ADR-0009).

---

## 6. Pilar D — Banco de dados

Fonte: [`../db/README.md`](../db/README.md) e [`modelo-de-dados.md`](modelo-de-dados.md). Resumo do inventário:

| Grupo | Conteúdo | Arquivo | Status |
|---|---|---|---|
| Tipos e tabelas | 12 tabelas, 6 enums, gatilhos (somente-inserção, anonimato) | `001` | ✅ |
| Funções | 9 de servidor (incluindo `triagem_sinais`) + 7 `admin_*` + auxiliares `interno.*` | `002`, `007` | ✅ banco; contratos na seção 18 |
| Views públicas | 8 `v_*` com colunas explícitas | `003`, `009` (sem coluna de busca) | ✅ |
| RLS e grants | `anon` só lê views; escrita só por função | `004` | ✅ |
| Storage | Buckets `imagens-quarentena` (privado) e `imagens-publicas` | `005` | ✅ (sem políticas em `storage.objects`, de propósito) |
| Seeds | Categorias; 246 municípios; staging fictício (28 ocorrências) | `006`, `008`, `seed/` | ✅ |
| Lacunas L1–L8 | Idempotência, fotos, resposta, taxa, retenção, triagem, fila | `007` | ✅ |
| Testes | PGlite: RLS, matriz de `EXECUTE`, migração 007, seed, colunas das views | `db/tests/` (`npm run db:test`) | ✅ |
| Busca textual | Coluna `busca`, `websearch` em português | projetada; fora do M2 | 📐 (>~100 registros reais) |
| "Mesclar duplicidade" | Citada em [`fluxos.md`](fluxos.md) como ação de moderação | **sem função `admin_*`** | ⬜ |
| Gestão de equipe | Convidar/alterar papéis em `administradores` | **sem função**; hoje só inserção manual | ⬜ |
| Prazo de retenção do contato | `expira_em` existe; prazo é **a definir** | — | ⛔ |
| Dados de mapa (lat/long) | Fora do MVP | — | ⬜ |
| Migração com histórico (`db push`) | Staging recebeu SQL avulso, sem `supabase_migrations` | — | 🟡 |

**Desatualizações de texto a corrigir:** `db/README.md` ainda cita "Edge Functions" (hoje é `/api/*`, ADR-0008);
ADR-0001 lista "Edge Functions" na decisão. `fluxos.md` foi reconciliado para Route Handlers.

---

## 7. Pilar E — Administração

Banco pronto; **nenhuma tela desenhada**. Funcional em [`desenho-geral.md` §4](desenho-geral.md).

| Item | Status | O que falta |
|---|---|---|
| Autenticação (e-mail + senha + MFA, sem cadastro aberto, convite) | 📐 | Cadastro aberto precisa estar desligado no Supabase; MFA a ativar; fluxo de convite sem desenho |
| Primeiro superadmin | 📐 | Criação manual; procedimento a documentar sem dados sensíveis |
| Layout do painel e navegação | ⬜ | Wireframes; deve funcionar no celular do moderador? |
| Fila de moderação (`v_fila_moderacao`) | 🟡 | View pronta; tela, filtros por idade/prioridade, ações em lote |
| Revisão de fotos (URL assinada da quarentena) | 📐 | Geração de URL assinada; mover arquivo |
| Detalhe da ocorrência + linha do tempo | 📐 | Editor de atualização; regra "resolvido exige evidência" na UI |
| Denúncias, respostas, contato, auditoria, equipe | 📐 | Telas |
| Motivos de remoção (lista fechada) | ⬜ | Hoje é texto livre; política pública depende do pilar L |
| Papéis e permissões por tela | 🟡 | Papéis no banco; matriz papel × tela não escrita |
| Sessão, expiração, proteção contra CSRF | ⬜ | Depende da decisão do conflito da seção 5 |

---

## 8. Pilar F — Segurança, privacidade e anti-abuso

| Controle | Estado | Onde |
|---|---|---|
| RLS em todas as tabelas; `anon` só lê `v_*`, `municipios`, `categorias` | ✅ testado (PGlite e staging real) | `db/004`, `db/tests/` |
| Colunas das views travadas por teste | ✅ | `db/colunas-publicas.json`, `db/tests/colunas-views.mjs` |
| Segredos só no servidor; valores fora dos bundles de produção | ✅ chaves lidas em módulo `server-only`; busca em `.next/server` sem nomes completos ou valores sensíveis | `.env.example`, `src/lib/registro/servidor.ts` |
| Cabeçalhos (HSTS, nosniff, Referrer-Policy, Permissions-Policy, CSP base) | ✅ | `next.config.ts` |
| CSP do M3 | ✅ | Cloudflare restrito ao registro; nonce global não usado; risco de `unsafe-inline` documentado na seção 19 |
| Ambiente fechado (autenticação básica, noindex, falha fechada) | ✅ | `src/proxy.ts`, `robots.ts` |
| Entrada hostil (parâmetros da URL) | ✅ | `params.ts` + testes |
| Texto de cidadão só como texto; imagens de host fechado | ✅ renderização textual escapada e origens de imagem validadas | componentes e testes |
| Turnstile, limite de taxa, origem sinalizada, texto repetido | ✅ handlers M3; regras operacionais ficam no servidor | pilar C |
| EXIF/GPS removidos de toda foto | 📐 | pilar C |
| Teste de invasão básico com chave `anon` | 🟡 feito uma vez no staging; falta script reutilizável | `contrato-staging.mjs` cobre contrato, não invasão |
| Limites do papel `anon` no Supabase (`statement_timeout`, máx. de linhas) | ⬜ configurar no painel | risco em [`plano-m2.md` §8](plano-m2.md) |
| Rotação da chave `service_role` e política de rotação | ⬜ | |
| Resposta a incidentes | ⬜ ⛔ | listada em [`privacidade-e-seguranca.md`](privacidade-e-seguranca.md) |
| Direitos do titular (acesso, correção, exclusão) | 🟡 exclusão por token no banco; demais pedidos sem canal | ⛔ canal de contato |
| Análise de ameaças formal (STRIDE ou similar) | ⬜ | opcional, recomendado antes do Gate |

---

## 9. Pilar G — Moderação e triagem

| Item | Status | Observação |
|---|---|---|
| Dois eixos de estado (`situacao` × `moderacao`) | ✅ | ADR-0005 |
| Modos de publicação (`moderar_tudo` / `texto_automatico`) | 📐 | Padrão seguro: `moderar_tudo` |
| Critérios objetivos de retenção/remoção | ⛔ | Política pública ainda não definida |
| Registro público de remoções | ⛔ / ⬜ | Banco guarda motivo; falta view/página pública se a política decidir publicar |
| Tempo máximo de fila e alertas | ⬜ | Gargalo real é humano ([`desenho-geral.md` §14](desenho-geral.md)) |
| Roteiro de revisão de foto (rostos, placas, menores, conteúdo ilegal) | ⬜ | Escrever como procedimento do moderador |
| Direito de resposta: quem pode, prazo, publicação | 🟡 banco; ⛔ política | |

---

## 10. Pilar H — Dados e inteligência

| Item | Status |
|---|---|
| Views agregadas (geral, município×categoria, mensal, situação) | ✅ |
| Definição de cada indicador (fórmula, população, limitação) | ⬜ |
| Série histórica e base pública exportável | ⬜ (não está no MVP; é diferencial citado no planejamento) |
| Gráficos acessíveis (tabela equivalente, sem depender de cor) | ⬜ |
| Integrações IBGE/INEP/DataSUS, mapa, IA | fora do MVP |
| Regra de privacidade em agregados (suprimir células pequenas) | ⬜ — relevante em municípios com poucos relatos |

---

## 11. Pilar I — Infraestrutura e ambientes

| Item | Estado | Observação |
|---|---|---|
| Ambientes local / staging / produção | 🟡 | Staging existe (fictício); produção só após o Gate |
| Staging Supabase em `us-east-1` | ✅ | Produção deve ser nova instância em São Paulo (região não muda depois) |
| Hospedagem do Next.js | 🟡 | Vercel decidida no M2-10; staging em `iad1`, produção em `gru1` |
| Deploy automático por push | ⬜ | Critério de pronto do M2 |
| CI (typecheck, lint, test, build, `db:test`) | ⬜ | Hoje roda localmente |
| Domínio e DNS | ⛔ | |
| Contas em nome da organização, MFA | ⛔ | |
| E-mail transacional / de contato | ⬜ | Nenhum fluxo de e-mail no MVP; canal de contato do público indefinido |
| Variáveis de ambiente | ✅ nomes em `.env.example` | Quadro em [`desenho-geral.md` §9](desenho-geral.md) |
| Dependências e atualização (Dependabot ou equivalente) | ⬜ | |
| Custos e limites dos planos (Vercel, Supabase, Turnstile) | ⬜ | A verificar antes de produção |

---

## 12. Pilar J — Observabilidade e operação técnica

| Item | Status |
|---|---|
| Logs estruturados com id de requisição, sem dado pessoal | 📐 |
| Contadores e alertas (fila, 5xx, falha de cópia de imagem, 429) | 📐 |
| Rotinas: retenção (`pg_cron`) | ✅ job `limpeza-diaria` |
| Rotinas: limpeza de quarentena, reconciliação de imagens | 📐 |
| Backup, exportação mensal e **teste de restauração** | 📐 |
| Painel de saúde do sistema (para a equipe, não público) | ⬜ |
| Runbook: o que fazer quando algo cai | ⬜ |

---

## 13. Pilar K — Qualidade e testes

| Camada | Estado | Comando |
|---|---|---|
| Banco (RLS, matriz de execução, regras, seed, colunas das views) | ✅ | `npm run db:test` |
| Unitários (`params`, `consultas`, `situacao`) | ✅ | `npm test` |
| Contrato contra staging real | 🟡 script existe | `npm run contrato:staging` |
| Typecheck, lint, build | ✅ | `npm run typecheck`, `lint`, `build` |
| Componentes (renderização, acessibilidade) | ⬜ | |
| Contratos dos endpoints `/api/*` | ⬜ | M3 |
| Invasão básica com chave `anon` | 🟡 | ver pilar F |
| Ponta a ponta no celular (critério de aceite do MVP) | ⬜ | M6 |
| Acessibilidade (axe/Lighthouse) e desempenho em 3G simulado | ⬜ | LCP < 2,5 s no detalhe (M2) |
| `seed-staging.mjs` citado em `package.json` e no plano do M2 | ⬜ arquivo não existe | O seed foi feito em SQL (`db/seed/`); atualizar o `package.json` ou criar o script |

---

## 14. Pilar L — Governança e portões externos

Detalhes e responsáveis ficam fora do repositório público. Aqui só **o que o código precisa que seja decidido**:

| Decisão necessária | O que bloqueia no sistema |
|---|---|
| Controlador dos dados e encarregado | Texto de `/privacidade`, `/termos`, contratos com fornecedores |
| Prazo de retenção do contato | Valor de `expira_em`; texto de privacidade |
| Política de moderação e de remoção | Admin (motivos), `/transparencia`, modo de publicação |
| Fotos: moderar antes de publicar | Fluxo de upload e carga da fila |
| Direito de resposta | Fluxo e prazos |
| Marca e domínio | Identidade visual, lançamento |
| Equipe de moderação nomeada | Piloto (M7) |
| Parecer jurídico geral | Qualquer abertura pública |

**Regra de ouro:** tudo até M6 roda em staging com dados fictícios; nada disso abre ao público sem o Gate jurídico.

---

## 15. Pilar M — Documentação e convenções

| Item | Status |
|---|---|
| Docs técnicas públicas (visão, desenho, arquitetura, dados, fluxos, privacidade) | ✅ |
| ADRs 0001–0008 | ✅ (todos "Proposta") |
| Convenção de commits bilíngue | ✅ |
| `AGENTS.md` (aviso do Next 16) | ✅ |
| Este mapa (`estrutura-do-sistema.md`) | ✅ (novo) |
| `docs/design.md` | ✅ |
| ADR-0009: modelo de autenticação do admin | ⬜ |
| ADR-0010: hospedagem (Vercel) e região | ⬜ (hoje só em `plano-m2.md` M2-10) |
| Aceitar/rejeitar formalmente os ADRs "Proposta" | ⬜ |
| Registrar M2-1…M2-12 nos ADRs ou manter só em `plano-m2.md` | ⬜ decisão de organização |
| Glossário (ocorrência, situação, moderação, protocolo, token de gestão) | ⬜ |

---

## 16. Lacunas — trabalho ainda pendente

Ordenadas pelo custo de descobrir tarde.

1. **Aplicação do design** (pilar B). O documento existe; composição, tokens e fluxos ainda precisam ser implementados e verificados.
2. **Modelo de autenticação do admin** (seção 5) conflita com a decisão de não usar `supabase-js` e com o CSP.
3. **Funções ausentes no banco** para ações já prometidas: mesclar duplicidade e gestão de equipe (pilar D).
4. **Metodologia dos indicadores e regra de agregados pequenos** (pilar H), necessárias antes de `/dados`.
5. **Telas do admin** (pilar E): não há desenho nenhum, e o moderador é o gargalo real do produto.
6. **CI e deploy** (pilar I): o critério de pronto do M2 exige deploy automático e nada o define.
7. **Estados de erro e vazio globais** (pilar B): `error.tsx` e `not-found.tsx` existem; faltam loading global, offline, 429 e manutenção.
8. **Canal de contato público** (denúncia fora da página, LGPD, imprensa): depende do pilar L, mas o formulário/endereço é tarefa de sistema.
9. **Runbook e backup testado** (pilar J).
10. **Inconsistências entre documentos** (listadas nas seções 3.2, 6 e 13): referências legadas a "Edge Functions" e `seed-staging.mjs`; rota de acompanhamento já reconciliada aqui e em `fluxos.md`.

## 17. Estado do M2 hoje (resumo)

| Entrega | Situação |
|---|---|
| Camada de dados (`src/lib/dados/`), testes unitários | ✅ escrita |
| Componentes (7 arquivos; `ListaProblemas` inclui `CarregandoLista`) | ✅ escritos; evolução do design pendente |
| Cabeçalhos, CSP base, `proxy.ts`, `robots.ts`, `AvisoAmbiente` | ✅ |
| Seeds (municípios e fictícios) e teste de colunas das views | ✅ |
| **Rotas `/`, `/problemas`, `/problema/[id]`, `/municipios/[slug]`** | 🟡 leitura implementada; composição completa do design pendente |
| Open Graph do detalhe, `error`/`not-found` | 🟡 OG textual e arquivos de estado existem; imagem OG e validação runtime pendentes |
| Deploy na Vercel, verificação de Lighthouse, `grep` de `service_role` | ⬜ |

Próximo passo: aplicar a direção visual do design às rotas existentes e implementar as lacunas, seguindo os contratos e bloqueios abaixo; não reconstruir a leitura já existente.

## 18. Reconciliação do mapa e contratos — Task 0.1 (2026-10-27)

Inventário por leitura do checkout, não comprovação de deploy. Nenhuma migração ou API foi criada nesta tarefa.
O design é especificação; os estados abaixo distinguem capacidade existente de composição ainda ausente.

### 18.1 Cobertura do mapa de design

| Item do mapa | Estado no código | Próxima dependência |
|---|---|---|
| Identidade, tokens, fontes e linha de registro | Parcial: tema branco/azul e sistema; verde/creme, Manrope/Source Sans 3 e gramática de registro ausentes | Tasks 0.2/1.1; fontes licenciadas ou fallback |
| Shell, cabeçalho, navegação, rodapé e aviso de ambiente | Parcial: `layout.tsx` tem landmarks, skip link, wordmark, um link e rodapé; `AvisoAmbiente` existe; barra móvel ausente | Task 1.2 |
| Sete situações e onze categorias | Parcial: `situacao.ts`, `SeloSituacao` e seed de categorias existem; iconografia de categoria ausente | Task 2.1; regra editorial de conferência |
| Cartão, timeline, método e vazio | Feito como base: `CartaoProblema`, `LinhaDoTempo`, `AvisoMetodologico`, `EstadoVazio`; evolução visual pendente | Task 2.2 preserva leitura existente |
| Resposta e galeria | Parcial: renderizadas inline no detalhe; `RespostaOficial`/galeria dedicadas ausentes; fotos têm alt genérico | Tasks 2.2/5.3; vínculo declarado não é vínculo verificado |
| Detalhe e compartilhamento | Parcial: dados SSR, resolução/evidência, histórico e respostas; metadata OG textual; sem imagem OG, compartilhar ou ações | Task 3.1; não expor dados privados |
| Lista e filtros/paginação | Parcial: `ListaProblemas` entrega GET municipal, links de categoria, cursor e loading; ainda não composição final | Task 3.2; medir peso de 246 opções |
| Índice e página municipal | Parcial: `/municipios/[slug]` existe; `/municipios` ausente; cobertura operacional omitida no DTO | Task 3.3 e contrato 18.3 |
| Home | Parcial: introdução, quatro números, método e cinco recentes; seletor/registro/passos ausentes | Task 3.4 |
| Registro, etapas, rascunho, fotos e protocolo | Ausente no frontend/API; funções SQL existentes | Tasks 4.1/4.2/5.1; lacunas de local e política |
| Acompanhamento e exclusão | Ausente no frontend/API; SQL autentica hash do token e executa exclusão imediata | Task 4.3; não confundir com fila de pedido |
| Afeta, denúncia e resposta enviada | Ausente no frontend/API; SQL registra os três; sem desfazer confirmação | Task 5.2/5.3; decisões anti-abuso/editoriais |
| Dados, tabelas e gráficos | Ausente na UI; oito views públicas existentes, incluindo quatro agregadas; parte dos DTOs pronta | Task 6.1 e contrato 18.3 |
| Busca, período, mapa e fontes oficiais | Ausentes; backlog fase 2, sem controles ativos no MVP | Task 6.2; fonte/licença/contrato próprios |
| Institucionais e legais | Ausentes: `/sobre`, `/transparencia`, `/privacidade`, `/termos`, `/regras`, `/contato` | Task 7.1; conteúdo-modelo até aprovação |
| Estados globais e resiliência | Parcial: `error.tsx`, `not-found.tsx`, `CarregandoLista`, vazio; sem offline, 429 e manutenção na UI | Task 7.2; validação HTTP ainda necessária |
| Acessibilidade, no-JS e desempenho | Parcial: HTML servidor, GET e foco já existem; auditoria completa e orçamento não comprovados nesta tarefa | Tasks 8.1/8.2 |
| Administração | Ausente na UI; `v_fila_moderacao` é restrita a authenticated e sete funções `admin_*` existem | M5; auth/CSP e operação pendentes |

**Rota canônica:** `/dados` é o destino do mapa e do plano. Nem `/dados` nem `/inteligencia`
existe em `src/app`; não há redirect em `next.config.ts` no checkout. Não criar alias por suposição.
Antes da Task 6.1, o responsável pelo deploy deve verificar histórico de URL publicada/compartilhada:
se `/inteligencia` já foi pública, criar redirect permanente para `/dados`; caso contrário, criar só `/dados`.
Esta verificação remota continua pendente e bloqueia somente a decisão do alias, não a construção de `/dados`.

### 18.2 Contrato SQL efetivo (após 001–009)

Todos os argumentos estão na ordem SQL; `?` significa default. `public.moderacao_ocorrencia` é o enum do banco.
Todas as nove funções de servidor abaixo têm `EXECUTE` somente para `service_role` entre os papéis da aplicação;
`anon` e `authenticated` não executam. `004` revoga a execução geral e concede as cinco originais;
`007` remove a assinatura antiga de registro, revoga PUBLIC/anon/authenticated e concede as novas assinaturas.
Não usar a assinatura de registro de 12 argumentos de `002`/grant de `004`: foi substituída pela de 14 em `007`.

| Operação / fonte | Função e argumentos nomeados/tipos | Retorno e limites |
|---|---|---|
| Registro (`007:58`) | `registrar_ocorrencia(p_municipio_id smallint, p_categoria_id smallint, p_titulo text, p_descricao text, p_anonimo boolean, p_nome text, p_whatsapp text, p_consentimento boolean, p_consentimento_versao text, p_token_hash bytea, p_moderacao public.moderacao_ocorrencia ? 'pendente', p_retencao_dias integer ? null, p_chave_idempotencia uuid ? null, p_origem_hash bytea ? null)` | tabela `out_id uuid, out_protocolo text, out_repetida boolean`; hash do token tem 32 bytes; repetição exige mesmo token para a chave, mas não compara payload (API deve definir conflito de payload); não recebe bairro/referência |
| Acompanhamento (`002:89`) | `acompanhar_por_token(p_token_hash bytea)` | tabela `out_id uuid, out_protocolo text, out_titulo text, out_situacao situacao_ocorrencia, out_moderacao moderacao_ocorrencia, out_motivo_remocao text, out_publicado_em timestamptz, out_criado_em timestamptz`; não retorna histórico, resposta ou contato |
| Exclusão (`002:103`) | `solicitar_exclusao_por_token(p_token_hash bytea, p_apagar_conteudo boolean ? false)` | `text[]` de caminhos para apagar do Storage; apaga contato imediatamente; se true remove imagens e anonimiza/retira conteúdo público; não cria pedido pendente; histórico/token permanecem |
| Denúncia (`002:136`) | `registrar_denuncia(p_ocorrencia_id uuid, p_motivo text, p_texto text ? null)` | `boolean`; false se relato não publicado; API deve uniformizar resposta; validar motivos permitidos antes do RPC |
| Confirmação (`002:148`) | `registrar_confirmacao(p_ocorrencia_id uuid, p_chave_hash bytea)` | `boolean`; deduplica por ocorrência/hash, false para repetido ou não publicado; sem operação de desfazer |
| Resposta (`007:177`) | `registrar_resposta(p_ocorrencia_id uuid, p_vinculo text, p_contato text, p_texto text)` | `boolean`; insere pendente, false se não publicado; publicação depende de `admin_revisar_resposta` |
| Foto (`007:160`) | `registrar_imagem(p_token_hash bytea, p_ordem smallint, p_caminho text, p_mime text, p_tamanho integer)` | `uuid`; autentica token, rejeita removido; limites/ordem/MIME no banco não substituem inspeção de bytes/EXIF no servidor |
| Taxa (`007:37`) | `consumir_limite(p_chave bytea, p_janela interval, p_maximo integer)` | `boolean`; servidor define chave HMAC, janela e máximo; não expor segredos/valores operacionais |
| Triagem (`007`, após registro) | `triagem_sinais(p_titulo text, p_descricao text, p_origem_hash bytea, p_janela interval ? '7 days', p_limite_origem integer ? 3)` | tabela `out_texto_repetido boolean, out_origem_sinalizada boolean`; não é decisão jurídica de publicação |

Inventário administrativo (`002`, grants `004`, todos `authenticated` + checagem interna de papel):
`admin_moderar_ocorrencia(uuid,text,text)`, `admin_atualizar_situacao(uuid,situacao_ocorrencia,text,text,boolean)`,
`admin_adicionar_atualizacao(uuid,tipo_atualizacao,text,text,boolean)`, `admin_moderar_imagem(uuid,text,text)`,
`admin_ver_contato(uuid)`, `admin_resolver_denuncia(bigint,status_denuncia)`, `admin_revisar_resposta(bigint,text,text)`.
Não há função para mesclar duplicidade, gestão de equipe nem revogar confirmação.

### 18.3 Dados disponíveis e decisões antes do frontend

| Necessidade | Evidência e decisão | Responsável / bloqueio |
|---|---|---|
| Bairro e referência | Não há colunas em `001`, argumentos de registro em `007`, view pública `009` ou DTO. Não guardar silenciosamente na descrição. Decisão: migração aditiva específica para campos opcionais + RPC/view/allowlist/DTO/testes antes de habilitar sua persistência; exposição pública somente após revisão de privacidade | Engenharia + privacidade; bloqueia campos funcionais na Task 4.2 e exibição no detalhe; staging pode omiti-los explicitamente |
| Cobertura ativa | `municipios.ativo_acompanhamento` existe, com SELECT da tabela e RLS de leitura para anon/authenticated (`004`); `COLUNAS_MUNICIPIO` só pede slug/nome e `obterMunicipio` retorna total. Decisão: ampliar DTO/select/retorno e testes na Task 3.3; não precisa nova view/migração para ler essa coluna; zero relatos não define cobertura | Engenharia, operação define valores reais; bloqueia estado municipal de cobertura e promessa de acompanhamento |
| Indicadores gerais | `v_indicadores_gerais`: total publicado, municípios distintos com publicação, existência de atualização pública tipo `resposta_oficial`, situação `resolvido`. `resolvidas_documentadas` conta situação, não revalida evidência na view | Dados/engenharia; Task 6.1 deve documentar fórmula e verificar integridade antes de rotular documentação |
| Resposta oficial | `tem_resposta_oficial`/contador usam `atualizacoes`, enquanto `v_respostas_publicas` usa `respostas.status='publicada'`; podem divergir. Não chamar toda resposta revisada de vínculo verificado | Dados/editorial + engenharia; Task 5.3/6.1 devem escolher semântica ou migrar view/testes antes de igualar os sinais |
| Em acompanhamento | Nenhuma coluna/indicador com esse nome; não inferir automaticamente de total ou cobertura. Decisão: adiar esse cartão até fórmula editorial aprovada; os quatro indicadores existentes bastam ao MVP | Dados + operação; bloqueia só o novo cartão na Task 6.1 |
| Recortes agregados | `v_indicadores_municipio_categoria` possui município/categoria/total; mensal só mes/total; situação só situacao/total. DTOs existem para as quatro, mas consultas agregadas mensal/situação ainda ausentes. Geral/mensal/situação não aceitam filtro municipal/categoria pela view atual | Engenharia/dados; Task 6.1 usa município×categoria para contagens filtráveis; gráficos mensal/situação filtrados ficam adiados até nova view/RPC e testes; não filtrar totais globais como se fossem locais |
| Acompanhar com protocolo + código | RPC só autentica hash. Decisão: endpoint valida token e compara protocolo retornado se protocolo for fornecido; nunca consultar por protocolo isolado. Histórico/resposta de relato não publicado não estão no retorno | Engenharia + privacidade; Task 4.3 precisa RPC privada restrita com allowlist/testes para histórico/respostas, ou reduzir explicitamente a promessa antes da UI |
| Pedido de exclusão | SQL executa apagamento, design pede análise humana. Decisão: não ligar o botão de pedido diretamente à função atual; criar fila/contrato restrito de pedido se política confirmar revisão; nenhum sucesso de pedido simulado | Jurídico/privacidade + engenharia; bloqueia ação da Task 4.3 até contrato aprovado; não bloqueia leitura em staging |
| Desfazer confirmação | Não suportado. Decisão: omitir “Desfazer” até RPC/identidade legítima aprovadas; deduplicação rotativa segue decisão ADR-0004, não garante pessoa única | Produto + engenharia + privacidade; Task 5.2 |

### 18.4 Dependências externas e pontos de bloqueio

Responsáveis abaixo são papéis; a nomeação e dados pessoais ficam fora do repositório público.

| Dependência | Estado verificável | Dono / bloqueio |
|---|---|---|
| Manrope e Source Sans 3 variáveis WOFF2 + licença | Não existem fontes ou licença em `public/`; somente assets padrão Next | Design/engenharia; Task 1.1 usa fallback até obter arquivos/licença registrados; não baixar em runtime |
| Geometria de Goiás e licença | Não existe asset territorial próprio; `globe.svg` é asset padrão, não geometria Goiás | Dados/design + jurídico; bloqueia mapa da fase 2, não MVP de tabelas |
| Turnstile | Só `TURNSTILE_SECRET` em `.env.example`; sem site key, widget ou verificação server implementados | Engenharia + responsável das contas; Task 4.1 deve definir chaves/domínio e comportamento seguro; envio real bloqueado sem verificação |
| sharp | Não é dependência direta em `package.json`; eventual dependência transitiva do Next não é aprovação do pipeline | Engenharia/infra; Task 5.1 depende de aprovação de custo/runtime/limites do deploy e dependência explícita |
| Contato, consentimento, retenção, canal LGPD | Modelo técnico existe; política/prazo/canal não aprovados neste checkout | Jurídico/privacidade + instituição; bloqueia coleta real e conteúdo jurídico definitivo; staging sem contato real |
| Publicação, conferência, fotos, resolução | Política pendente; `MODO_PUBLICACAO=moderar_tudo` previsto; boolean `verificado` não define alcance da revisão | Editorial/operação + jurídico; bloqueia abertura pública/selo sem explicação; staging fictício em revisão |
| Denúncia e resposta | Banco pronto; motivos, revisão, recurso, vínculo e prazos dependem de política | Editorial + jurídico; bloqueia operação pública das Tasks 5.2/5.3 |
| Exclusão/retensão | Função atual é imediata; pedido com fila não existe | Jurídico/privacidade + engenharia; bloqueia ação prometida na Task 4.3 |
| Acompanhamento ativo | Coluna existe; critério operacional e pessoas responsáveis não comprovados | Operação/instituição; bloqueia atribuir cobertura real e prometer prazo |
| `/inteligencia` histórica | Ausente localmente; publicação anterior não verificável pela árvore de arquivos | Responsável pelo deploy; verificar antes de decidir redirect na Task 6.1 |

Verificações desta reconciliação: leitura de SQL 001–009, grants 004/007/009, testes de matriz de EXECUTE,
contratos de colunas, testes de registro/idempotência/imagem/resposta, rotas e DTOs. O relatório da tarefa registra
os comandos executados; `npm run db:test` passou (RLS, matriz de EXECUTE, migração 007, oito views, seed e trava do seed), e `git diff --check` passou. Isso não implica validação remota, aprovação jurídica ou aceite visual.

## 19. Atualização do M3 — registro e acompanhamento

Estado em 2026-10-27: **implementado no código e pronto para revisão**, conforme [`plano-m3.md`](plano-m3.md). A seção 18 preserva o inventário anterior ao M3; esta seção registra o estado atual das rotas.

| Parte | Contrato M3 |
|---|---|
| Registro | `/registrar` e `POST /api/registrar`: município, categoria, título e descrição; anônimo, sem fotos/contato; Turnstile, validação, triagem, limite e idempotência no servidor |
| Link privado | Código gerado no navegador; somente SHA-256 segue no registro; `/acompanhar#<código>` lê fragmento no cliente e envia segredo apenas por POST |
| Acompanhamento | Situação, revisão, datas, atualizações visíveis e respostas publicadas, via função de banco restrita; ausência/invalidez sem revelar existência |
| Exclusão | Confirmação explícita antes de `solicitar_exclusao_por_token`; texto substituído por marcador e auditoria mantida; sem prometer fila humana |
| Degradação | Sem JavaScript, explicar a geração/leitura do código e não enviar sem credencial; leitura pública continua acessível |
| CSP | Cloudflare permitido só no registro; nonce global rejeitado por incompatibilidade com PPR. Experimento SRI passou build mas manteve scripts inline; `unsafe-inline` permanece como risco documentado |
| Validação | Suítes unitária, banco/PGlite, TypeScript, lint, build e contrato staging aprovadas; comportamento real de escrita depende da configuração do ambiente |

O marco não inclui fotos, painel administrativo, denúncias, confirmações, direito de resposta, indicadores, busca, analytics ou abertura pública. As mudanças visuais amplas do mapa continuam fora do M3.

## 20. Limite do MVP e backlog de dados — Task 6.2

Inspeção de `src/app/dados/page.tsx`: `/dados` oferece filtros reais de Município e Categoria por GET. Período está desabilitado e rotulado “Fase 2 — ainda sem backend”, com nota de inatividade. O bloco de indicadores oficiais informa ausência de conexão ativa com IBGE, INEP ou DataSUS. Este registro atualiza o inventário histórico de `/dados` nas seções anteriores; não certifica operação remota, fontes oficiais ou política de privacidade aprovada.

Busca textual, período, mapa tocável/choropleth e fontes oficiais ficam fora dos controles ativos do MVP. Sem backend correspondente, não aceitar entrada nem apresentar resultado ou carregamento simulado. Avisos de fase 2 são informativos; eventual controle deve estar realmente desabilitado com explicação visível.

O contrato de cada backlog está registrado em [Backlog de fase 2 — limite do MVP](design.md#backlog-de-fase-2--limite-do-mvp-task-62): busca exige campos/consulta/índice públicos; período exige data/fuso e agregação real; mapa exige geometria licenciada e vínculo territorial; indicador oficial exige dataset, licença, metodologia e cobertura. Para **cada um**, fonte final, cadência de atualização/invalidação, responsável, regra de células pequenas, orçamento incremental e equivalente textual devem ser definidos e aprovados antes de ativação. Os responsáveis e cadências permanecem pendentes, sem atribuição institucional ou prazo presumido. A supressão de células pequenas ainda é pendência, conforme Pilar H, e deve considerar inferência por filtros e diferenças entre totais.

Se a fase 2 for autorizada posteriormente, o mapa começa como incremento independente em SVG estático **<30 KB**, com fonte/licença verificadas, sem biblioteca exigida em páginas de leitura. Tabela/lista permanece equivalente em texto; leitura e navegação funcionam sem mapa. Mapa interativo/choropleth não está ativo nem aprovado por esta tarefa. Busca, período e fontes oficiais terão orçamento próprio a medir/aprovar; não se presume que caibam no orçamento existente.

## 21. Estado implementado e validação final local — 2026-10-28

Este registro supersede o inventário histórico das seções anteriores quanto às rotas incluídas no mapa: `/`, `/problemas`, `/problema/[id]`, `/municipios`, `/municipios/[slug]`, `/registrar`, `/acompanhar`, `/dados` e seis páginas institucionais estão implementadas no checkout. Endpoints públicos de denúncia/resposta/“também me afeta” continuam ausentes conforme as decisões do MVP; essas ações não simulam sucesso. `/dados` consulta `v_dados_painel`, definida em `db/012_dados_painel.sql`.

O banco local PGlite testa as migrations 011 e 012. As migrations e o bucket privado 011 ainda não foram aplicados/configurados no staging; por isso, a instância PostgREST conectada responde 404 para `v_dados_painel`, e os dados da página não podem ser visualmente aceitos até a aplicação aprovada no ambiente. Nenhuma migration remota ou seed foi aplicada nesta rodada.

Validação local de 2026-10-28: `npm test` (287 testes), `npm run db:test`, `npm run typecheck`, `npm run lint` e `npm run build` passaram. Varredura de `.next/server` e `.next/static` não encontrou valor literal da `service_role`. O contrato real de staging não foi executado por depender do staging preparado e credenciais aprovadas.

A medição inicial inclui HTML e recursos JS/CSS referenciados pelo HTML de produção sem compressão, com estimativa gzip separada: home 644 KB brutos / 193 KB gzip; detalhe 644 KB / 197 KB gzip; lista 689 KB / 197 KB gzip; registro 756 KB / 231 KB gzip; dados 618 KB / 190 KB gzip. Esses valores excedem a meta de 100 KB; LCP/Lighthouse ainda não foram medidos. Revisar divisão/carga de chunks e otimizar antes de declarar a meta atendida.
