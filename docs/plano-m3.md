# Plano do M3 — registro e acompanhamento

Marco do [`desenho-geral.md` §13](desenho-geral.md). Estado: implementação concluída e pronta para revisão. O M3 completa o primeiro fluxo de escrita do cidadão; a configuração dos ambientes e a abertura pública seguem seus próprios gates.

## 1. Escopo e pronto

| Entrega | Resultado |
|---|---|
| `/registrar` | Formulário mobile first para município, categoria, título e descrição; anônimo por padrão; sem fotos ou contato; validação, enviando, sucesso, erro e indisponível. |
| `POST /api/registrar` | Validação Zod e limites, verificação Turnstile, CSRF/origem, HMAC de origem, limite de taxa, triagem, idempotência e RPC `registrar_ocorrencia` via `service_role`. `MODO_PUBLICACAO` usa `moderar_tudo` por padrão. |
| `/acompanhar` e API | Token de 32 bytes gerado no navegador, somente SHA-256 enviado/guardado; segredo permanece em `/acompanhar#<token>`. Consulta neutra de token inválido, situação, atualizações e respostas visíveis. Exclusão exige confirmação clara e estado final. |
| Banco | Migração `010_*.sql` somente se necessária para retornar a linha do tempo/respostas com segurança; executar testes PGlite. Não aplicar no staging sem listar explicitamente no relatório final. |
| Segurança e operação | Chaves de teste Turnstile apenas em staging/teste; limites de corpo, cabeçalhos, CSP revisada, logs sem PII/token, noindex mantido e falha fechada amigável sem configuração de servidor. |
| Verificação | Unitários, handlers com dependências simuladas, regressão M2, ataques de entrada, build/typecheck/lint, navegador 375 px e ponta a ponta local quando houver credencial já disponível. |

**Fora do marco:** fotos, painel administrativo/moderação, denúncias, confirmações, direito de resposta, indicadores, busca, analytics e troca de domínio. Nenhum contato opcional será coletado: a retenção não está definida e o ADR-0007 define anonimato como não guardar contato.

**Sem JavaScript:** leitura e conteúdo explicativo continuam disponíveis. Registro e consulta do link privado informam que exigem JavaScript, porque a geração e leitura segura do token ocorrem no cliente; não enviar relato sem token. O link privado é a única credencial recuperável pelo cidadão.

## 2. Decisões após o debate

| Decisão | Ataque considerado | Motivo / alternativa rejeitada |
|---|---|---|
| Manter `/api/*` em Route Handlers Node e funções existentes no banco; criar apenas a migração estritamente necessária para o DTO do acompanhamento. | Caminhos de falha parcial e limitação de credencial exigem teste explícito. | Evita novo serviço e reaproveita transações, idempotência, rate limit e triagem já presentes em `db/007_lacunas_do_desenho.sql`; rejeitada duplicação dessas regras no cliente. |
| Envio anônimo sem fotos ou contato, publicação inicial sempre pendente no modo padrão. | Contato sem prazo de retenção e publicação automática podem expor pessoas/alegações. | Segue ADR-0007, escopo M3 e `moderar_tudo`; texto automático é configuração deliberada fora do default. |
| Preservar token e chave de idempotência no armazenamento local durante retries; apagar o rascunho somente após confirmação do sucesso. | Resposta perdida após commit: nova chave/token poderia criar duplicata e perder acesso. | A migração 007 só reconhece retry com a mesma chave e o mesmo hash. O navegador mantém os dois valores até resultado inequívoco. |
| Origem HMAC usa `X-Forwarded-For` somente em runtime Vercel (a plataforma diz que sobrescreve o header para evitar spoofing); nunca confiar nesse valor em runtime genérico. | Cabeçalho falsificado permite contornar limite e triagem. | Fora da Vercel, exige fonte confiável configurada; não registra IP puro. Fato conferido em [documentação da Vercel](https://vercel.com/docs/headers/request-headers). |
| Manter CSP compatível com shell estático; Turnstile permitido somente em `/registrar`, com `script-src`/`frame-src` para Cloudflare. | Nonce global exige renderização dinâmica e conflita com PPR. No experimento SRI, build passou, mas o HTML manteve 11 scripts inline de bootstrap/RSC sem nonce/hash na política. | Rejeitados nonce global e SRI como solução suficiente: SRI adicionou integridade a arquivos externos, sem resolver os inline. `unsafe-inline` permanece como risco explícito, sem alegação de CSP estrita. |
| Token no fragmento, apenas POST body na consulta/exclusão, respostas e erros sem existência distinguível. | Segredo pode aparecer em logs, Referer, query ou resposta enumerável. | Fragmentos não são enviados ao servidor; DTO mínimo e respostas uniformes reduzem exposição. |

Riscos em aberto: perda do link privado não tem recuperação; Turnstile transfere dados da conexão à Cloudflare; limite por endereço não impede abuso distribuído; API pode permanecer indisponível na Vercel enquanto falta a service role. O detalhamento operacional é mantido fora do repositório público.

## 3. Execução e critérios de aceite

Tarefas em ordem; paralelizar somente as independentes e com arquivos disjuntos. Cada tarefa tem um implementador. Orquestrador valida cada tarefa em fila e faz uma validação geral no fechamento.

### T1 — Contratos do banco e extensão de acompanhamento

Arquivos permitidos: `db/010_*.sql`, `db/tests/*`, `db/README.md`, registro operacional local ignorado (somente migração aplicada). Proibido tocar código da aplicação e outros docs privados.

- Dado token válido, quando a função for chamada, então retorna estado do relato e somente atualizações/respostas permitidas ao autor.
- Dado token inválido, quando consultado ou excluído, então mantém códigos internos existentes sem expor a existência por endpoint.
- Dado papel `anon` ou `authenticated`, quando invocar função nova, então recebe privilégio negado; `service_role` mantém execução.
- PGlite cobre o DTO, limites e grants; teste de mutação de segurança demonstra falha ao remover a proteção/grant esperado.

### T2 — Primitivas de segurança, validação e acesso Supabase

Arquivos permitidos: módulos novos em `src/lib/registro/` e testes correspondentes, `.env.example`. Proibido editar rotas/páginas, SQL ou documentação.

- Zod rejeita campos desconhecidos, tipos errados, strings acima dos limites, controles/Unicode inválidos e corpo malformado sem ecoar entrada.
- Testes cobrem token criptograficamente aleatório, formato base64url, SHA-256, HMAC, composição de chaves por endpoint, idempotência e mensagens neutras.
- Cliente `server-only` lê variáveis apenas no servidor, chama PostgREST/RPC sem interpolar valores e falha com erro tipado sem segredo.
- Limites/janelas anti-abuso são configuráveis por ambiente; nenhum valor é gravado em arquivo versionado. `.env.example` lista apenas nomes de variáveis.
- `.env.example` lista os nomes solicitados para chaves, publicação e limite sem valores.

### T3 — Route Handlers de registro, acompanhamento e exclusão

Arquivos permitidos: `src/app/api/registrar/route.ts`, `src/app/api/acompanhar/route.ts`, `src/app/api/excluir/route.ts`, novos `src/lib/registro/http.ts` e `http.test.ts`, e testes de handlers próprios. O helper HTTP server-only cobre origem, Content-Type, leitura de body limitada, origem confiável e resolução segura de município/categoria. Proibido editar primitives T2 existentes, UI, banco e configuração global.

- Registro valida `Content-Length` e tamanho lido, método, JSON e origem antes de chamar banco; Turnstile precisa validar; serviço sem configuração retorna 503 genérico.
- Limite é consumido antes de criar; triagem recebe hash HMAC; estado inicial respeita variável validada e default `moderar_tudo`; RPC recebe somente SHA-256 e chave de idempotência.
- Repetição com mesmo token/chave retorna mesmo protocolo; token trocado falha genericamente. Nenhum log contém body, texto, IP, token ou segredo.
- Consulta/exclusão aceitam token apenas no corpo POST e exigem origem válida; inválidos/expirados têm mensagem indistinguível. Exclusão pede confirmação na UI; API retorna apenas confirmação genérica/resultado necessário.
- Testes cobrem sucesso, captcha inválido, rate limit, body excessivo/malformado, origem inválida e falsificada, repetição, token trocado, banco indisponível e env ausente.

### T4 — Interface de registro e acompanhamento

Arquivos permitidos: `src/app/registrar/**`, `src/app/acompanhar/**`, componentes novos em `src/components/registro/**`, testes de UI correspondentes. Proibido editar APIs, módulos server-only, banco, CSP e outros docs.

- Formulário contém somente município, categoria, título e descrição; controles rotulados, contagem/limites, foco de erros, teclados móveis e alvos ≥48 px.
- Estados carregando, sucesso, erro, rate limit e indisponível são distinguíveis; campos, token e chave ficam para retries até confirmação.
- Sucesso mostra protocolo, explica que link é a única forma de acompanhar e permite copiar/compartilhar link privado sem expor token em URL do servidor.
- `/acompanhar#<token>` lê fragmento no cliente; mostra situação e cronologia permitida; link inválido/ausente é neutro; exclusão tem confirmação com escopo/efeito e tela final.
- Sem JS, ambas as páginas mostram instrução clara e nenhum registro é enviado sem token.

### T5 — CSP, proxy, documentos e contrato

Arquivos permitidos: `next.config.ts`, `src/proxy.ts` se necessário, `scripts/contrato-staging.mjs`, `docs/plano-m3.md`, `docs/estrutura-do-sistema.md`, `docs/design.md`, `docs/fluxos.md`, `docs/desenho-geral.md`, `docs/decisoes-tecnicas.md`, `docs/privacidade-e-seguranca.md`, `db/README.md`. Proibido editar arquivos privados além de `04-ambientes.md` se T1 aplicar migração.

- CSP efetiva e Turnstile funcionam no formulário sem quebrar shell M2 estático; a política documenta o experimento SRI, o limite de `unsafe-inline` e os headers reais.
- CSRF/origem e cabeçalhos cobrem todos handlers; robots/noindex permanecem.
- Wireframe de registro é reduzido para M3; fluxo e desenho refletem fragmento e degradação sem JS.
- Índice do sistema marca M2 pronto e M3 concluído somente após validação; contrato negativo cobre superfícies novas quando aplicável.

### T6 — Validação ponta a ponta e relatório

Sem arquivos de produto permitidos; pode atualizar apenas registro local de progresso e relatório privado de ambientes já aprovado. Não executar mutações no staging sem listar migração e obter a sequência exata de apply no relatório.

- Rodar `npm test`, `npm run db:test`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run contrato:staging` se env disponível.
- Navegador embutido a 375 px cobre formulário, sucesso, acompanhar, erro e indisponível; conferir teclado, foco, contraste e alvo, restaurando viewport.
- Executar ataques de XSS como texto, payloads gigantes/Unicode/JSON inválido, enumeração de token, vazamento de logs/URL e busca de segredos no `.next/`.
- Se `SUPABASE_SERVICE_ROLE_KEY` já existir, iniciar build e servidor com credenciais só no ambiente do processo, criar relato fictício, consultar/excluir e limpar somente as linhas criadas, nunca `TESTE-*`. Se faltar, registrar o roteiro exato como pendente do usuário.

## 4. Fechamento

Pronto para revisão quando T1–T6 passarem, os documentos forem coerentes, o checkout não tiver segredos e as pendências externas estiverem listadas sem bloquear a implementação restante. Não fazer commit, push, merge, deploy, branch ou worktree. Apresentar evidências, itens pendentes do usuário e mensagens bilíngues propostas conforme `docs/convencao-de-commits.md`; aguardar aprovação explícita antes de versionar.
