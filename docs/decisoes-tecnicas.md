# Registro de decisões técnicas (ADR)

Formato: contexto → decisão → alternativas → consequências. Status: Proposta · Aceita · Rejeitada · Substituída.

## ADR-0001 — Supabase como backend (Proposta, 2026-10-26)
- **Contexto:** equipe de uma pessoa, prazo curto, necessidade de BD relacional, auth admin e storage.
- **Decisão:** Supabase (PostgreSQL + Auth + Storage + Edge Functions).
- **Alternativas:** backend próprio (Node/Fastify + Postgres): mais controle, mais manutenção.
- **Consequências:** a separação público/privado depende de RLS correta e testada; risco de dependência do fornecedor.

## ADR-0002 — Escrita pública apenas pela camada de servidor (Proposta, 2026-10-26; atualizada em 2026-10-27)
- **Contexto:** registro sem conta é alvo de spam e abuso.
- **Decisão:** nenhum `INSERT` direto do cliente anônimo; validação, captcha e limite de taxa no servidor (rotas `/api/*`, ver ADR-0008). Antes previa Edge Functions.
- **Consequências:** mais código de servidor; controle central de abuso.

## ADR-0003 — Renderização no servidor para páginas públicas (Proposta, 2026-10-27)
- **Contexto:** o compartilhamento por WhatsApp depende das tags Open Graph no HTML inicial; SPA puro mostraria pré-visualização vazia. Indexação em buscadores também.
- **Decisão:** Next.js com renderização no servidor e revalidação periódica para `/problemas`, `/problema/:id`, `/municipios/:slug`, `/inteligencia`.
- **Alternativas:** SPA com pré-renderização (frágil para conteúdo dinâmico); Astro com ilhas React (boa, mas sem o servidor de rotas que o ADR-0008 aproveita).
- **Consequências:** exige hospedagem com runtime Node ou plataforma que suporte Next.

## ADR-0008 — Camada de servidor no Next.js em vez de Edge Functions (Proposta, 2026-10-27)
- **Contexto:** a escrita do cidadão precisa validar, checar Turnstile, limitar taxa e **reencodar imagens para remover EXIF**. O runtime das Edge Functions tem limites de CPU/memória (verificar) e pouca opção de biblioteca de imagem.
- **Decisão:** rotas `/api/*` do Next.js (Node, `sharp`), uma base de código, tipos compartilhados.
- **Alternativas:** Edge Functions (menos peças fora do Supabase, mas processamento de imagem frágil); serviço Node separado (mais uma peça para uma pessoa manter).
- **Consequências:** a hospedagem do app guarda a `service_role`; precisa de conta da organização, MFA e rotação de chave. Limite de corpo da plataforma (ex.: Vercel ~4,5 MB, verificar) obriga compressão no cliente.
- **Em aberto:** onde hospedar (região, custo, quem detém a conta).

## ADR-0004 — Contador "também me afeta" (Proposta, 2026-10-26)
- **Contexto:** sem conta, é fácil inflar o contador.
- **Decisão:** deduplicação básica e exibição com ressalva, ou adiar o recurso.
- **Consequências:** o número não pode ser usado como métrica de gravidade (consistente com a metodologia).

## ADR-0006 — Escritas só por funções; nenhuma política de escrita nas tabelas (Proposta, 2026-10-26)
- **Contexto:** a auditoria só vale se não houver caminho de escrita que a contorne.
- **Decisão:** administradores alteram dados apenas via `admin_*` (SECURITY DEFINER), que checam o papel e gravam em `historico_moderacao`. Leitura de contato idem, com registro de cada acesso.
- **Alternativas:** políticas de `UPDATE` por papel + gatilho de auditoria — mais flexível, mas um erro de política deixa escrever sem rastro.
- **Consequências:** toda ação nova do admin exige uma função nova; o frontend não faz `UPDATE` direto.

## ADR-0007 — Significado de "anônimo" (Proposta, 2026-10-26)
- **Contexto:** os documentos de origem não definem. Como nome e WhatsApp nunca são publicados, "anônimo" só tem efeito se significar algo além da exibição.
- **Decisão:** anônimo = **nenhum dado de contato é guardado** (imposto por gatilho). O acompanhamento é pelo token do link.
- **Consequências:** impossível contatar o autor; perde-se um canal de apuração. Se a política quiser anônimo com contato retido, é uma mudança deliberada e de LGPD.

## ADR-0005 — Moderação em dois eixos (Proposta, 2026-10-26)
- **Decisão:** separar `situacao` (andamento) de `moderacao` (publicação); remoção como *soft delete* com motivo e histórico *append-only*.
- **Consequências:** permite auditoria e um registro público de remoções, caso a política decida por isso.
