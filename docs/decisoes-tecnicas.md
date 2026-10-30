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
- **Disposição da Task 5.2 (2026-10-28): adiada.** O detalhe mantém “Também me afeta” e “Sinalizar este relato” desabilitados, com explicação de indisponibilidade e ressalva metodológica. `registrar_confirmacao(uuid, bytea)` deduplica somente ocorrência/hash de 32 bytes; não define origem, janela temporal, limite, desafio ou desfazer. `registrar_denuncia(uuid, text, text)` aceita motivos fechados e texto de até 1000 caracteres, mas não implementa proteção de abuso nem uniformização HTTP. Ambos os RPCs são restritos a `service_role`; não há endpoint público contratado. Produto, engenharia e privacidade precisam definir esses contratos e a política de denúncia antes de habilitar as ações; nenhuma identidade, retenção ou possibilidade de desfazer foi presumida.

## ADR-0006 — Escritas só por funções; nenhuma política de escrita nas tabelas (Proposta, 2026-10-26)
- **Contexto:** a auditoria só vale se não houver caminho de escrita que a contorne.
- **Decisão:** administradores alteram dados apenas via `admin_*` (SECURITY DEFINER), que checam o papel e gravam em `historico_moderacao`. Leitura de contato idem, com registro de cada acesso.
- **Alternativas:** políticas de `UPDATE` por papel + gatilho de auditoria — mais flexível, mas um erro de política deixa escrever sem rastro.
- **Consequências:** toda ação nova do admin exige uma função nova; o frontend não faz `UPDATE` direto.

## ADR-0007 — Significado de "anônimo" (Proposta, 2026-10-26)
- **Contexto:** os documentos de origem não definem. Como nome e WhatsApp nunca são publicados, "anônimo" só tem efeito se significar algo além da exibição.
- **Decisão:** anônimo = **nenhum dado de contato é guardado** (imposto por gatilho). O acompanhamento é pelo token do link.
- **Consequências:** impossível contatar o autor; perde-se um canal de apuração. Se a política quiser anônimo com contato retido, é uma mudança deliberada e de LGPD.

## ADR-0009 — Sessão administrativa com MFA no servidor (Aceita, 2026-10-28)
- **Contexto:** o painel futuro precisa usar Supabase Auth sem `supabase-js`, preservar a autorização no Postgres e permitir consumo por navegador e CLI. O endpoint M4 de imagem já usa `og_admin_access_token`, mas não existe ciclo completo de autenticação.
- **Decisão:** Route Handlers Node chamam Auth REST. Login por senha é seguido de TOTP obrigatório; somente sessão AAL2 de usuário ativo em `administradores` recebe acesso. O access token fica em cookie `HttpOnly; Secure; SameSite=Strict`, nome unificado `og_admin_access_token`; refresh token usa cookie HttpOnly separado. Access e refresh são rotacionados conforme a resposta do Auth e expirados no logout. Clientes não navegador podem enviar `Authorization: Bearer`. Mutação autenticada por cookie exige `Origin` same-origin e cabeçalho próprio anti-CSRF; login, MFA e logout também validam origem. Limite de login é mantido no servidor com chave HMAC, resposta neutra e atraso uniforme para reduzir enumeração. A autorização final continua em `interno.eh_admin`, que exige `aal2` e papel ativo em banco.
- **Alternativas rejeitadas:** tokens em `localStorage` (XSS pode extraí-los e cada cliente teria de implementar rotação); privilégio concedido apenas no handler (não protege chamadas diretas ao PostgREST); cadastro aberto (equipe só entra por convite de superadmin).
- **Consequências:** navegador não precisa de biblioteca Supabase e não recebe refresh token legível por JavaScript. A UI pode usar a sessão por cookie; ferramentas automatizadas usam Bearer. A sessão depende do Auth do Supabase e de configuração externa que desative signup. Convite cria/associa usuário pelo servidor e entrega link de uso único quando SMTP não estiver configurado; isso não substitui processo institucional de onboarding.
- **Ataques considerados:** acesso AAL1 via PostgREST direto é negado pela migration 017; token roubado sem MFA não autoriza; CSRF cross-site é bloqueado por `Origin`, SameSite estrito e cabeçalho próprio; resposta de login não distingue e-mail inexistente, senha errada, usuário inativo ou MFA não verificado.
- **Riscos em aberto:** redefinição de senha e recuperação de fator TOTP exigem procedimento operacional; configuração SMTP e desligamento de signup são responsabilidade do projeto Supabase. Nenhum fluxo administrativo deve ser liberado em produção antes da revisão institucional.

## ADR-0005 — Moderação em dois eixos (Proposta, 2026-10-26)
- **Decisão:** separar `situacao` (andamento) de `moderacao` (publicação); remoção como *soft delete* com motivo e histórico *append-only*.
- **Consequências:** permite auditoria e um registro público de remoções, caso a política decida por isso.

## Decisão M3 — CSP e código privado (adotada no código, 2026-10-27)
- **Contexto:** o formulário precisa do Turnstile e o shell de leitura usa Cache Components/PPR. Nonce global tornaria a renderização dinâmica; SRI experimental só acrescentou integridade a scripts externos no build observado, mantendo bootstrap/RSC inline.
- **Decisão:** manter a CSP compatível com o shell, com `unsafe-inline` registrado como risco residual. Liberar `https://challenges.cloudflare.com` em `script-src` e `frame-src` apenas em `/registrar`; usar `no-referrer` no registro/acompanhamento. Não ativar SRI experimental sem benefício comprovado para os scripts inline.
- **Alternativas rejeitadas:** nonce global (quebra o modelo de prerenderização) e afirmar CSP estrita só por habilitar SRI (não cobre o bootstrap inline observado).
- **Consequências:** conteúdo de cidadão deve permanecer como texto escapado; política estrita exige revisão de arquitetura/renderização futura. O registro envia somente SHA-256 do código gerado no navegador; acompanhamento/exclusão usam POST e segredo no fragmento do link.
- **Fontes:** guia instalado `node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`; [Cloudflare CSP](https://developers.cloudflare.com/turnstile/reference/content-security-policy/); [Vercel headers](https://vercel.com/docs/headers/request-headers) para origem confiável na plataforma.
