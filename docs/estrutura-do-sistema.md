# Estrutura do sistema — mapa de pilares

Este arquivo é o **índice mestre**: divide o sistema inteiro em pilares, diz o que cada um precisa ter antes e
durante a construção, aponta onde isso já está documentado ou construído e lista o que **ainda não existe em lugar
nenhum**. Ele não repete o conteúdo dos outros documentos; referencia.

> Inventário feito sobre o repositório em 2026-10-27 (commit `4f16296` + alterações do M2 ainda não commitadas).
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

**Marcos** (de [`desenho-geral.md` §13](desenho-geral.md)): M0 base · M1 migração 007 · **M2 leitura pública** (em curso) ·
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
| Páginas institucionais | `/sobre`, `/transparencia`, `/privacidade`, `/termos` | citadas em [`fluxos.md`](fluxos.md) | ⬜ conteúdo; ⛔ aprovação jurídica |
| Microcopy do formulário | Rótulos, ajuda, erros, consentimento, mensagens de sucesso | — | ⬜ |
| Política de "não verificado" | Como o selo `verificado` é exibido e quando muda | coluna `verificado`; sem regra de uso | ⬜ |
| Metodologia dos indicadores | Fonte, limitação, o que cada número **não** significa | só o princípio | ⬜ (necessário antes de `/inteligencia`) |
| Estados de "município em breve" | O que o cidadão vê em município sem operação ativa | coluna existe; sem desenho de UI | ⬜ |

---

## 3. Pilar B — Frontend (público)

### 3.1 Mapa de design

Fundação já fixada em [`plano-m2.md` M2-11/M2-12](plano-m2.md) e implementada em `src/app/globals.css`.

| Camada | Definição atual | Onde | Status |
|---|---|---|---|
| Princípios | Celular simples e 4G fraco; funciona sem JS; página < 100 KB; sem webfont | M2-11 | ✅ |
| Cores | Fundo, superfície, texto, texto suave, borda; **uma** cor de ação (`#0b4f9c`); 4 tons de selo (neutro, andamento, sucesso, encerrado); aviso amarelo | `globals.css` `@theme` | ✅ só tema claro |
| Tipografia | Fonte do sistema; corpo 18 px; h1 28/32 px, h2 21,6/24 px; linha 1,6 | `globals.css` | ✅ |
| Espaçamento e grade | Coluna única `max-w-3xl`, gutter 16 px | `layout.tsx` | 🟡 sem escala de espaçamento documentada |
| Interação | Foco visível de 3 px; alvos de toque ≥ 48 px; links sublinhados | `globals.css` | ✅ |
| Acessibilidade | Contraste AA; HTML semântico; "pular para o conteúdo"; situação sempre com texto + ícone | `layout.tsx`, `SeloSituacao` | 🟡 sem checklist de verificação |
| Ícones | Conjunto usado nos selos | `SeloSituacao` | 🟡 inventário e regra de uso não escritos |
| Estados de tela | Carregando, vazio, erro, 404, indisponível, rate-limit | `EstadoVazio` (vazio) | 🟡 falta `error.tsx`, `not-found.tsx`, `loading` |
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
| Formulário (campos, upload, progresso, erros) | — | 📐 M3/M4 |
| Seletor de município / categoria | Filtro por link no M2; seletor no M3 | 🟡 |
| Botão compartilhar (WhatsApp) | Central no público-alvo ([`desenho-geral.md` §5](desenho-geral.md)) | ⬜ |
| Galeria de fotos | Fotos publicadas na página de detalhe | ⬜ |
| Paginação "Próxima página" | Cursor opaco | 🟡 lógica em `params.ts`; falta componente |

### 3.2 Mapa de rotas e features

| Rota | Features | Renderização | Marco | Status |
|---|---|---|---|---|
| `/` | O que é o projeto; aviso metodológico; últimos 5 problemas; contagens gerais; chamada para registrar (M3) | estática + `use cache` | M2 | ⬜ página ainda é o modelo padrão do Next |
| `/problemas` | Lista por município (1 filtro) e categoria por link; cursor | servidor, filtros na URL | M2 | ⬜ |
| `/problema/[id]` | Situação, local, categoria, descrição, fotos, linha do tempo, resposta oficial, metadados Open Graph, denunciar, "também me afeta" | servidor + `use cache` | M2 (leitura), M6 (ações) | ⬜ |
| `/municipios/[slug]` | Cabeçalho do município, contagem, lista filtrada | servidor + `use cache` | M2 | ⬜ |
| `/registrar` | Formulário curto, rascunho local, compressão de foto, consentimento, anônimo | cliente | M3/M4 | 📐 |
| `/acompanhar` | Estado privado pelo token no fragmento `#`; pedir exclusão | cliente | M3 | 📐 |
| `/inteligencia` | Indicadores com fonte e limitação | servidor + `use cache` | M6 | 📐 / ⬜ metodologia |
| `/sobre`, `/transparencia`, `/privacidade`, `/termos` | Texto institucional e legal | estática | Gate | ⬜ / ⛔ |
| `/admin/*` | Ver pilar E | cliente autenticado | M5 | 📐 |
| `robots.txt` | `Disallow` enquanto o ambiente for fechado | `src/app/robots.ts` | M2 | ✅ |
| `sitemap.xml`, imagem OG padrão, `404`, `500` | — | — | M2/M6 | ⬜ (sitemap só depois de abrir) |

**Inconsistência a resolver:** [`fluxos.md`](fluxos.md) lista `/acompanhar/:token`; [`desenho-geral.md`](desenho-geral.md)
decide `/acompanhar#TOKEN` (fragmento não vai para logs nem `Referer`). Vale o desenho geral; corrigir `fluxos.md`.

### 3.3 Como o frontend conversa com o backend

Regra única: **o navegador nunca fala com o Supabase** nas páginas públicas (M2-1, M2-4). Leitura passa por
`src/lib/dados/` no servidor; escrita passa por `/api/*`.

**Leitura (M2 — a camada já existe)**

| Tela | Função em `src/lib/dados/` | View lida | Cache / tag |
|---|---|---|---|
| `/` | contagens + últimos problemas | `v_indicadores_gerais`, `v_ocorrencias_publicas` | `problemas` |
| `/problemas`, `/municipios/[slug]` | lista paginada | `v_ocorrencias_publicas` | `problemas`, `municipio:<slug>` |
| `/problema/[id]` | detalhe, atualizações, imagens, respostas | `v_ocorrencias_publicas`, `v_atualizacoes_publicas`, `v_imagens_publicas`, `v_respostas_publicas` | `problema:<id>` |
| `/inteligencia` | agregados | `v_indicadores_municipio_categoria`, `_mensal`, `_situacao` | `indicadores` (a criar) |

Contratos: `schemas.ts` (zod, colunas explícitas), `params.ts` (filtros e cursor com `.catch(padrão)`),
`rest.ts` (PostgREST via `fetch`), `db/colunas-publicas.json` (lista permitida, travada por teste).

**Escrita (M3+ — nada construído)** — ver matriz completa na seção 5.

---

## 4. Pilar C — Camada de servidor (`/api/*`)

Detalhe completo em [`desenho-geral.md` §3](desenho-geral.md); aqui só o que falta decidir/construir.

| Item | Status | Observação |
|---|---|---|
| Esquema de validação compartilhado (zod) cliente/servidor | 📐 | Reaproveitar o padrão de `schemas.ts` |
| Resposta de erro uniforme `{erro:{codigo,mensagem}}` | 📐 | Definir tabela de códigos |
| Verificação Turnstile | 📐 | Segredo já previsto em `.env.example`; sem código |
| Limite de taxa (`consumir_limite`) + chave HMAC de origem | 📐 / ✅ banco | Função existe; falta o uso no servidor |
| Pipeline de imagem (`sharp`, tipo por bytes, EXIF, 1600 px) | 📐 | Dependência `sharp` ainda não instalada |
| Triagem (`triagem_sinais`, lista de bloqueio, `MODO_PUBLICACAO`) | 📐 / ✅ banco | Lista e pesos ficam no servidor, fora da documentação pública |
| Idempotência (`chave_idempotencia`) | ✅ banco / 📐 servidor | |
| Cliente com `service_role` isolado em módulo `server-only` | 📐 | Teste: `grep service_role` em `.next/` precisa continuar vazio |
| CORS restrito, CSP com nonce | ⬜ | Nonce adiado para M3 (M2-8) |
| Rotas de cron (limpeza de quarentena, reconciliação de imagens) | 📐 | Depende da hospedagem (Vercel Cron) |
| Endpoints: `registrar`, `acompanhar`, `excluir`, `denunciar`, `afeta`, `resposta`, `admin/imagem` | 📐 | Catálogo em [`desenho-geral.md` §3.1](desenho-geral.md) |

---

## 5. Matriz frontend ↔ backend (escrita e administração)

| Ação do usuário | Tela | Endpoint | Função no banco | Quem executa | Marco |
|---|---|---|---|---|---|
| Registrar relato | `/registrar` | `POST /api/registrar` | `registrar_ocorrencia` | `service_role` | M3 |
| Enviar foto | `/registrar` | (mesmo endpoint) | `registrar_imagem` | `service_role` | M4 |
| Acompanhar | `/acompanhar#token` | `POST /api/acompanhar` | `acompanhar_por_token` | `service_role` | M3 |
| Pedir exclusão | `/acompanhar#token` | `POST /api/excluir` | `solicitar_exclusao_por_token` | `service_role` | M3 |
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
| Funções | 5 de servidor + 7 `admin_*` + auxiliares `interno.*` | `002` | ✅ |
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
`fluxos.md` passo 5 idem; ADR-0001 lista "Edge Functions" na decisão.

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
| Segredos só no servidor; `service_role` fora do bundle | 🟡 variáveis definidas; verificação por `grep` em `.next/` ainda manual | `.env.example` |
| Cabeçalhos (HSTS, nosniff, Referrer-Policy, Permissions-Policy, CSP base) | ✅ | `next.config.ts` |
| CSP com nonce | 📐 | M3 |
| Ambiente fechado (autenticação básica, noindex, falha fechada) | ✅ | `src/proxy.ts`, `robots.ts` |
| Entrada hostil (parâmetros da URL) | ✅ | `params.ts` + testes |
| Texto de cidadão só como texto; imagens de host fechado | ✅ desenho / 🟡 verificar nas páginas | M2-7 |
| Turnstile, limite de taxa, origem sinalizada, texto repetido | 📐 | pilar C |
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

## 16. Lacunas — o que nenhum documento cobre hoje

Ordenadas pelo custo de descobrir tarde.

1. **Wireframes e documento de design** (pilar B). Sem eles, M2 vira decisão de tela no meio do código e M3/M5 repetem o erro.
2. **Modelo de autenticação do admin** (seção 5) conflita com a decisão de não usar `supabase-js` e com o CSP.
3. **Funções ausentes no banco** para ações já prometidas: mesclar duplicidade e gestão de equipe (pilar D).
4. **Metodologia dos indicadores e regra de agregados pequenos** (pilar H), necessárias antes de `/inteligencia`.
5. **Telas do admin** (pilar E): não há desenho nenhum, e o moderador é o gargalo real do produto.
6. **CI e deploy** (pilar I): o critério de pronto do M2 exige deploy automático e nada o define.
7. **Estados de erro e vazio globais** (pilar B): `error.tsx`, `not-found.tsx`, `loading`.
8. **Canal de contato público** (denúncia fora da página, LGPD, imprensa): depende do pilar L, mas o formulário/endereço é tarefa de sistema.
9. **Runbook e backup testado** (pilar J).
10. **Inconsistências entre documentos** (listadas nas seções 3.2, 6 e 13): rota de acompanhamento, "Edge Functions", `seed-staging.mjs`.

## 17. Estado do M2 hoje (resumo)

| Entrega | Situação |
|---|---|
| Camada de dados (`src/lib/dados/`), testes unitários | ✅ escrita |
| Componentes (6) | ✅ escritos |
| Cabeçalhos, CSP base, `proxy.ts`, `robots.ts`, `AvisoAmbiente` | ✅ |
| Seeds (municípios e fictícios) e teste de colunas das views | ✅ |
| **Rotas `/`, `/problemas`, `/problema/[id]`, `/municipios/[slug]`** | ⬜ ainda não construídas (`page.tsx` é o modelo do Next) |
| Open Graph do detalhe, `error`/`not-found` | ⬜ |
| Deploy na Vercel, verificação de Lighthouse, `grep` de `service_role` | ⬜ |

Próximo passo natural: construir as 4 rotas do M2 na ordem do plano (detalhe → lista → município → home) e, em paralelo,
escrever `docs/design.md` com os wireframes (lacuna 1).
