# Plano 17 — MVP demonstrável em 15 dias

> **Plano de implementação:** trabalhar diretamente em `main`; não criar branches ou worktrees. Commits pequenos e publicação automática pela integração Git/Vercel fazem parte da execução somente conforme a autorização já vigente para esta entrega. Não iniciar deploy manual em Production.

**Objetivo:** até o fim do Dia 15, demonstrar o Observatório no endereço Vercel atual com relatos textuais publicados logo após o envio, home alimentada por relatos reais, remoção administrativa auditada e todos os fluxos existentes do MVP utilizáveis de ponta a ponta, sustentando uma carga representativa de 50–60 sessões simultâneas.

**Arquitetura:** reutilizar o banco e os fluxos já existentes, separando a política de publicação do texto da autenticação, proteção antiabuso e revisão de fotos. Relatos textuais comuns ficam públicos ao concluir o registro; imagens continuam privadas até revisão humana; denúncias, respostas e “também me afeta” usam os contratos existentes, controles de origem/limite e moderação apropriada. A home, a lista e os detalhes leem as projeções públicas existentes e são invalidados após publicar ou remover.

**Stack:** Next.js 16.4.6, React 19.3, TypeScript, Supabase/Postgres/PostgREST/Storage, Vercel Production e Vitest/PGlite.

**Base observada:** `main` em `785e719e7548f984511d5d0a50e8537449a7e909`, com `origin/main` no mesmo SHA. Conforme registros de 23/11/2026 no Plano 15, a beta está publicada em `https://observatorio-go.vercel.app`; o cadastro salva `pendente`, e por isso o relato não entra na home pública até aprovação. A fila administrativa com decisão versionada foi conferida em Production nos registros anteriores. Não fiz nova consulta remota para elaborar este plano. A evidência de capacidade do Plano 16 é somente do PostgREST de staging.

## Restrições globais

- Permanecer na branch `main`; nunca criar/trocar branches ou worktrees para esta execução.
- Preservar integralmente qualquer arquivo já staged. No início de cada tarefa, conferir `git status --short`; não usar `git add .`, `git reset`, `git restore` ou `git stash`.
- O checkout inicial contém arquivos staged, incluindo `docs/api-contratos.md`, `docs/planos/servico/13-fechamento-go-mvp.md` e `docs/planos/servico/README.md`, além de diffs concorrentes em interface, testes e backend. Não editar arquivos staged. Ao tocar arquivos com diffs preexistentes, preservar o conteúdo e integrar sobre ele; se a alteração depender do conteúdo staged, avançar as tarefas independentes e relatar somente a dependência específica.
- O push em `main` dispara publicação Production. Usar o projeto Vercel autorizado `observatorio-go` e o endereço existente. Não trocar domínio, DNS ou Cloudflare neste MVP; manter Bot Protection da Vercel em Challenge. Não fazer deploy manual com `--prod`.
- O banco Production registrado no Plano 15 é `acxcqtknxjiwopdtjxoc`; confirmar o ref efetivo e as variáveis não secretas antes de qualquer mudança remota. Não misturar chaves entre projetos nem expor valores secretos.
- Relato de texto fica público imediatamente após sucesso do cadastro; não implementar detecção automática de má intenção nesta entrega. Mostrar antes do envio um aviso explícito de publicação imediata e exigir confirmação. Contato, token, identificadores privados, notas internas e caminhos do Storage nunca entram nas projeções públicas.
- Fotos não seguem a publicação imediata do texto: upload privado/quarentena, remoção de EXIF, revisão humana com alt/checklist e só então publicação. Para demonstração, usar imagens sintéticas/sem pessoas, rostos ou placas. Não habilitar coleta pública de fotos sem o responsável documentar consentimento e canal de retirada.
- Não redesenhar a interface. Fazer os controles existentes funcionarem, corrigindo somente mensagens, estados e navegação necessários para as jornadas.
- Não reservar dias inteiros só para validação. Executar testes direcionados junto de cada fatia e agrupar as jornadas integradas e a carga no fechamento, sem repetir baterias já aprovadas.
- Não repetir baterias que já passaram sem alteração relevante. Executar testes direcionados a cada fatia e uma validação integrada final no ciclo de testes.

## Resultado de produto

### Fluxos que precisam funcionar

1. **Relato público:** formulário → aviso/consentimento → envio idempotente → protocolo e link privado de acompanhamento → aparição na home, lista e detalhe público.
2. **Acompanhamento e exclusão:** titular consulta pelo token privado, vê situação e atualizações públicas e solicita exclusão; o relato desaparece das leituras públicas e o evento de auditoria permanece.
3. **Moderação pós-publicação:** administrador entra com MFA/AAL2, localiza relato já publicado, consulta detalhe, remove com motivo fechado, registra auditoria e confirma desaparecimento de home/lista/detalhe; restauração exige papel e motivo adequados.
4. **Participação pública:** “também me afeta”, denúncia e direito de resposta completam envio, limites, idempotência/deduplicação aplicável, retorno e destino administrativo. Nenhum desses controles fica desabilitado ou responde sucesso sem gravar.
5. **Fotos:** envio após registro, armazenamento privado, limpeza de metadados, revisão, publicação com alt, remoção e limpeza de órfãos. Texto continua público mesmo enquanto a foto aguarda revisão.
6. **Administração:** fila/paginação e detalhe, denúncias, respostas, atualização de situação, mescla de duplicidade, ações em lote, acesso auditado a contato, auditoria legível e equipe/MFA. O conjunto existente que não mudou será coberto por smoke integrado, sem reexecutar sua suíte unitária sem necessidade.
7. **Dados públicos:** home mostra relatos atuais; busca/lista/detalhe e mapa usam dados reais; indicadores mantêm supressão de células pequenas; nenhuma view pública expõe contato, token, IP, caminho de arquivo ou anotação interna.

### Capacidade-alvo mensurável

“50–60 usuários simultâneos” significa **sessões virtuais ativas por 30 minutos**, com pausas humanas: no patamar de 50, 38 navegam home/lista/detalhe/mapa, 6 executam registro/acompanhamento, 3 fazem participação/denúncia/resposta e 3 sessões AAL2 leem fila/detalhe e moderam; no patamar de 60, 45 navegam, 8 registram/acompanhamento, 4 participam e 3 moderam. Fazer rampa 20 → 40 → 50 → 60 e uma rajada curta de 90 sessões para localizar a margem, sem exigir que 90 seja suportado. **50 sessões estáveis é o mínimo de aceite; 60 é o alvo preferido.**

Critérios no caminho real `observatorio-go.vercel.app` → Vercel → Supabase:

- Pelo menos 50 sessões sustentadas por 30 minutos (alvo preferido: 60), sem reinício de serviço, sem timeout inesperado e com taxa de erro inesperado inferior a 1%; desafios WAF, respostas de validação e conflitos esperados são contados separadamente, mas desafio recorrente a usuários legítimos reprova a experiência.
- p95 de leituras públicas até 2 s; p95 de envio/participação e ações administrativas até 3 s; p99 até 5 s. Medir do cliente até a resposta, incluindo o caminho Vercel e banco.
- Nenhum relato perdido, duplicado sem intenção ou publicado duas vezes por retry; decisão concorrente resulta em um vencedor e conflitos versionados, sem sobrescrever alteração alheia.
- Um envio sintético confirmado fica visível em home/lista/detalhe em até 5 s; remoção administrativa ou exclusão pelo titular o oculta em até 5 s, incluindo leitura nova após invalidação de cache.
- Registrar CPU/conexões/uso e erros do banco, duração de funções, respostas 429 do Vercel, rate-limit da aplicação e latências por rota. Aumentar compute/plano somente após identificar o gargalo e apresentar a cobrança ao responsável.

O limite de 10 cadastros por hora por IP é compartilhado por pessoas atrás do mesmo NAT. O plano verifica isso no teste de carga; não confundir 60 sessões de navegação com 60 envios oriundos do mesmo IP.

## Debate e decisões

- **Decisão:** priorizar primeiro a fatia vertical relato → home → acompanhamento → remoção administrativa; depois conectar participação, respostas, fotos e indicadores. Isso cria valor demonstrável cedo e fornece a base da carga mista.
- **Não basta trocar `MODO_PUBLICACAO`:** `src/app/api/registrar/route.ts` fixa `p_moderacao: "pendente"`; `db/007_lacunas_do_desenho.sql` já aceita `publicado` e preenche `publicado_em`. Ao mesmo tempo, `src/lib/registro/participacao.ts` e outras rotas amarram disponibilidade a `moderar_tudo`. Criar uma configuração separada para publicação inicial do relato e manter proteções/moderação de outras ações independentes.
- **Alternativa rejeitada:** pré-moderar todos os textos. Contraria o objetivo explícito de mostrar imediatamente os relatos dos participantes.
- **Alternativa rejeitada:** inverter uma variável global e considerar terminado. Isso pode desligar participação, deixar a fila sem relatos publicados e manter o texto da interface prometendo análise prévia.
- **Capacidade:** não extrapolar os 75 pedidos de fila do Plano 16. Esse resultado veio de staging/PostgREST com pool aquecido; a mesma documentação registrou p95 de leitura fria de 11,6 s, e não mediu a jornada na Vercel.
- **Risco/dissidência ainda válida:** uma remoção posterior não desfaz cópia de conteúdo nocivo já publicado. A equipe de segurança defendeu retenção prévia de PII/ameaças; a decisão do responsável é publicar texto imediatamente sem classificador de intenção. Ela ressalta que consentimento do autor não autoriza expor terceiros e que views privadas não filtram texto deliberadamente público. Mitigações desta entrega: consentimento claro, aviso para não inserir dados pessoais, campos privados fora da view, denúncia acessível, moderação de remoção e capacidade de resposta operacional. Risco residual fica aceito e explícito, não “resolvido”.

## Plano diário

Contagem original: Dia 1 = **23/11/2026**. O registro do Dia 1 foi concluído. A partir desta atualização, o calendário é orientativo: integrar validação às tarefas e remover dias inteiros reservados somente a testes.

### Dia 1 — Congelar escopo e verificar o alvo

**Objetivo:** começar no estado real sem sobrescrever o trabalho compartilhado e fechar inventário de jornada/ambiente.

**Ações:** conferir SHA, estado staged/unstaged/untracked, variáveis por nome/escopo, deployment atual, Bot Protection, ref do Supabase e identidade AAL2 existente. Não ler/exibir segredos. Mapear cada fluxo acima para rota, componente, RPC/view e status atual. Confirmar quota e compute do Supabase/Vercel; Plano 15 registrou Supabase Production no Free. Desenhar um manifesto pequeno de dados sintéticos com prefixo `[DEMO-MVP]`, titular e chave de limpeza, sem usar dados de usuários.

**Arquivos/fontes:** `docs/planos/servico/13-fechamento-go-mvp.md`, `14-escala-fila-admin.md`, `15-beta-prod-execucao.md`, `16-capacidade-fila.md`, `src/app/api/**`, `src/components/**`, `db/001–025`, Vercel/Supabase CLI autenticadas.

**Aceite:** matriz fluxo→estado atual→lacuna preenchida no próprio Plano 17; `main` e projeto/ref confirmados; fixtures e procedimento de limpeza definidos; nenhum arquivo staged alterado e nenhuma variável/banco remoto modificado.

### Dia 2 — Contrato de publicação imediata e consentimento

**Objetivo:** deixar uma única regra explícita para publicação de texto, sem alterar o significado das proteções restantes.

**Arquivos prováveis:** `src/lib/registro/servidor.ts`, `src/lib/registro/staging.ts`, `src/lib/registro/schemas.ts`, `src/app/api/registrar/route.ts`, criar `src/app/api/registrar/route.test.ts`, `src/components/registro/RegistrarForm.tsx`, `src/components/registro/RegistrarForm.test.ts`, `src/app/registrar/page.tsx`. Ler o guia de Next.js local em `node_modules/next/dist/docs/` para qualquer mudança que dependa de API do Next.

**Mudança:** adicionar uma flag de Production explicitamente nomeada para publicação textual imediata, com parsing fail-closed; não reutilizar `MODO_PUBLICACAO` como controle de denúncia, resposta, foto ou proteção. A rota escolhe `publicado` apenas quando todos os gates de ambiente/origem/registro passam; usar a RPC já existente se ela preservar idempotência e auditoria. Exigir aceite da mensagem de publicação imediata. A confirmação informa protocolo e local para acompanhar/solicitar retirada. Atualizar os textos da página e os documentos públicos `src/app/regras/page.tsx`, `src/app/termos/page.tsx` e `src/app/privacidade/page.tsx` para explicar o que será publicado e como pedir retirada. HTML/texto continua escapado pelo renderizador.

**Aceite:** teste confirma que flag ausente/falsa não publica; Production autorizada grava `publicado` e `publicado_em`; repetição com mesma chave retorna a mesma ocorrência; nenhuma rota de foto/participação/admin perde seu gate; formulário e `/regras` deixam de prometer análise prévia.

**Validação:** `npx vitest run src/app/api/registrar/route.test.ts src/lib/registro/primitivas.test.ts src/lib/registro/participacao-http.test.ts src/components/registro/RegistrarForm.test.ts`. Sem escrita remota neste dia.

### Dia 3 — Home, lista, mapa e detalhe com relatos atuais

**Objetivo:** fazer a confirmação de publicação virar uma página pública atual e consistente.

**Arquivos prováveis:** `src/components/HomeConteudo.tsx`, `src/components/HomeConteudo.test.ts`, `src/components/MapaGoias.tsx`, `src/components/MapaGoias.test.ts`, `src/app/problemas/page.tsx`, `src/app/problema/[id]/page.tsx`, módulos de leitura em `src/lib`.

**Mudança:** mostrar os relatos mais recentes e linkar para “ver todos”; preservar os filtros/ordem/paginação existentes; remover selos fixos de dado fictício quando carregarem dados do banco, mantendo estados vazios claramente distintos de indisponibilidade. Integrar a consulta de home/lista com views públicas existentes; manter indicadores suprimidos e não buscar detalhe de cada relato em loop N+1. Publicar deve invalidar tags `problemas`, `municipios` e `indicadores` quando afetadas.

**Aceite:** um item público de fixture aparece em home/lista/detalhe; pendente/retido/removido não aparece; cada leitura é paginada/limitada; falha de banco não é apresentada como lista vazia; nenhuma credencial/contato/token está no HTML.

**Validação:** testes das páginas e componentes tocados; inspeção de consulta/contagem de chamadas e HTML renderizado. Preservar os diffs concorrentes existentes nesses componentes.

### Dia 4 — Fila pós-publicação e remoção administrativa

**Objetivo:** permitir localizar e remover relato que já nasceu público.

**Arquivos prováveis:** criar `db/026_fila_pos_publicacao.sql` e `db/tests/migracao_026_test.sql`; incluir o teste em `db/tests/run-pglite.mjs`; modificar `src/lib/admin/handlers/http.ts`, `src/lib/admin/handlers/http.test.ts`, `src/app/api/admin/fila/route.ts`, `src/components/admin/AdminConsole.tsx` e testes existentes do console.

**Mudança:** a migration 025 já aceita `p_moderacao='publicado'`, mas seu predicado de elegibilidade só inclui `pendente`/`retido`, fotos pendentes ou denúncias abertas. Na 026, ampliar esse predicado para incluir relatos publicados somente quando o filtro pedido for `publicado`; preservar cursor keyset, teto de página 100, filtros, versão esperada e grants. Adicionar filtro “publicados recentes” na fila e reaproveitar a RPC de remoção auditada. Não adicionar contagem exata cara nem índice sem plano SQL que justifique. Manter restauração restrita a papel com permissão.

**Aceite:** o teste de migration comprova que filtro publicado retorna somente relatos públicos não removidos; admin AAL2 localiza um relato publicado, remove com motivo de lista fechada, recebe conflito 409 em versão obsoleta, e evento aparece na auditoria; usuário anônimo não pode chamar RPC admin.

**Validação:** testes focados de fila/handlers e `npm run db:test` se houver SQL. Nenhuma migração remota antes de confirmar alvo `acxcqtknxjiwopdtjxoc` e compatibilidade com migration remota atual.

### Dia 5 — Cache, acompanhamento, exclusão e idempotência

**Objetivo:** fazer o titular conseguir confirmar e retirar seu conteúdo, inclusive com conexão instável.

**Arquivos prováveis:** `src/app/api/acompanhar/route.ts`, `src/app/api/excluir/route.ts`, `src/components/registro/AcompanharClient.tsx`, `src/lib/registro/token.ts`, `src/lib/admin/handlers/http.ts` e respectivos testes.

**Mudança:** conectar cadastro ao link privado de acompanhamento; mostrar situação e atualizações/respostas públicas; usar ação de exclusão já existente; confirmar cache invalidation após remoção do titular. Requisições repetidas devem retornar resultado coerente e nunca apagar relatos que não possuam o token.

**Aceite:** sequência browser registro→página pública→acompanhamento pelo token→pedido de exclusão→sumir em nova leitura; tentativa sem token/ID correspondente falha; auditoria fica append-only sem armazenar token em claro.

**Validação:** testes focados de HTTP/token/página. A jornada gravadora usa somente fixture `[DEMO-MVP]` criada e limpa pelo próprio fluxo.

### Dia 6 — Denúncia e “também me afeta”

**Objetivo:** habilitar as ações públicas hoje indisponíveis e fazer com que cada uma produza efeito visível e verificável.

**Arquivos prováveis:** `src/app/api/denunciar/route.ts`, `src/app/api/afeta/route.ts`, `src/lib/registro/participacao.ts`, `src/lib/registro/participacao-http.test.ts`, `src/app/problema/[id]/page.tsx`, `src/app/problema/[id]/actions-unavailable.test.ts`, `src/components/**` do detalhe.

**Mudança:** separar gate de participação da política de publicação de relatos. Usar Bot Protection gerenciada pela Vercel no deployment e limites atuais/dedicados; não desligar WAF nem introduzir Cloudflare/Turnstile como dependência deste MVP. Confirmar que as políticas de origem e idempotência/deduplicação permanecem no servidor e que a resposta ao público não revela conteúdo privado da denúncia.

**Aceite:** botões não são mais desabilitados; denúncia legítima chega à fila, duplicata segue regra da migration 022, tentativa contra relato não publicado/removido falha; “também me afeta” altera a resposta/indicador correto sem revelar a origem; abuso de limite responde estado claro.

**Validação:** testes HTTP e da página; uma chamada real de navegador no deployment depois que chegar ao teste integrado, não abrir agora uma sessão de dados remotos.

### Dia 7 — Resposta de interessado e atualizações oficiais

**Objetivo:** completar a participação institucional sem publicar texto de resposta sem revisão.

**Arquivos prováveis:** `src/app/api/resposta/route.ts`, `src/app/api/admin/respostas/**`, `src/app/api/admin/ocorrencias/[id]/atualizacoes/route.ts`, views/RPCs em `db/002_funcoes.sql`, migration/tests 022 e UI do detalhe/admin.

**Mudança:** habilitar envio de resposta associada a relato público, manter contato privado, deduplicar pela origem conforme contrato, e fazer revisão AAL2 antes de exibir resposta. Ligar alteração de situação/atualizações oficiais às views públicas somente quando `publica=true`; notas internas nunca entram na home.

**Aceite:** resposta enviada aparece pendente para equipe; após revisão aprovada aparece no detalhe; contato e texto não aprovado permanecem privados; resubmissão não multiplica itens; moderação e resposta aparecem na auditoria.

**Validação:** testes direcionados da API, RPC e detalhe; migration nova só se for necessária para corrigir contrato ou grant demonstrado.

### Dia 8 — Fotos opcionais com revisão humana

**Objetivo:** completar o ciclo de imagens sem bloquear a publicação do texto.

**Arquivos prováveis:** `src/app/api/imagem/route.ts`, `src/app/api/admin/imagem/route.ts`, `src/app/api/admin/fotos/[id]/revisao/route.ts`, `src/components/registro/EtapaFotos.tsx`, `src/components/GaleriaFotos.tsx`, módulos `src/lib/registro/imagem.ts`, `caminho-imagem.mjs`, migrations 014–016 e tests.

**Mudança:** permitir até o limite já configurado, validar bytes/MIME/dimensões antes de RPC/Storage, remover EXIF com `sharp`, armazenar na quarentena, apresentar estado “foto em revisão”, aprovar com checklist e alt antes de copiar ao bucket público, remover e limpar órfãos idempotentemente. Manter flag de fotos independente da publicação do relato. Não coletar foto identificável; usar imagem sintética na demonstração.

**Aceite:** ciclo upload→quarentena→revisão→publicação/remoção→limpeza passa; arquivo privado não tem EXIF; caminho de quarentena não é público; falhas parciais retornam resposta recuperável e não deixam foto publicável sem registro aprovado.

**Validação:** teste de rota/Storage local e fluxo integrado com fixture sintética; reusar Plano 04/Plano 16 sem repetir casos inalterados. Não ativar flag Production até política/consentimento e canal de retirada estarem apresentados no formulário.

### Dia 9 — Home completa, busca, mapa e indicadores

**Objetivo:** demonstrar o sistema, não uma tela vazia com formulário.

**Arquivos prováveis:** `src/components/HomeConteudo.tsx`, `src/components/MapaGoias.tsx`, `src/app/problemas/page.tsx`, `src/app/api/dados/route.ts`, views `v_ocorrencias_publicas`, `v_dados_painel`, `v_indicadores_gerais`, `db/019_supressao_indicadores.sql`, `db/023_totais_indicadores_suprimidos.sql`, testes de leitura pública.

**Mudança:** integrar home a relatos reais, manter recentes acessíveis por paginação, indicadores com supressão vigente, filtros municipais/categoria/situação e mapa que não baixa o conjunto todo. Corrigir estados de carregamento/zero/indisponibilidade e rótulos de dado demonstrativo que contradigam dados reais. Invalidação deve ocorrer ao publicar, atualizar situação, publicar resposta/foto ou remover.

**Aceite:** fixture é localizável via home, filtros, mapa e URL compartilhável; item removido desaparece; leitura sem dados mostra estado vazio; células pequenas seguem suprimidas; volume grande não altera o teto de retorno por request.

**Validação:** testes de leitura, paginação e mapa tocados; `npm run db:test` se SQL/schema mudar.

### Dia 10 — Completar console admin e operação

**Objetivo:** assegurar que a equipe consegue cuidar dos fluxos durante e após a demonstração.

**Arquivos prováveis:** `src/components/admin/AdminConsole.tsx`, rotas `src/app/api/admin/**`, `src/lib/admin/handlers/http.ts`, `src/app/api/admin/auditoria/**`, `src/app/api/cron/limpar-quarentena/route.ts`, `vercel.json` e testes dirigidos.

**Mudança:** fechar gaps observados em ações em lote, detalhe/coleções paginadas, papel de gestor/revisor, acesso auditado ao contato, revisão de denúncias/respostas/fotos, equipe e auditoria. Confirmar cron configurado na Vercel, execução e proteção por `CRON_SECRET`; manter SMTP sem envio não solicitado. Corrigir navegação/mensagens apenas para eliminar ação quebrada.

**Aceite:** papéis autorizados concluem ação; não autorizados recebem 401/403; leitura de contato deixa evento; lote é atômico/relata conflito sem sucesso parcial; cron repetido não deixa arquivo público nem apaga arquivo de outra ocorrência.

**Validação:** smoke focado de cada rota alterada e leitura read-only da configuração de cron; não repetir suite administrativa completa sem modificação relevante.

### Dia 11 — Perfil de desempenho e preparar teste de carga

**Objetivo:** chegar ao teste com medições e massa sintética pronta, sem criar carga cega na produção.

**Arquivos prováveis:** scripts novos `scripts/carga-mvp.mjs` e fixtures/relatório em `docs/planos/servico/17-mvp-demonstracao-15-dias.md`; rotas de dados e fila apenas se profiling apontar gargalo. Aproveitar consultas do Plano 16 e instrumento HTTP que separa cabeçalhos, socket e corpo.

**Mudança:** criar cenário reproduzível, rampa 20/40/60, pausas humanas, mix publicado, interações e moderação, marcação exclusiva `[CARGA-MVP-<execucao>]`, deadline/abortos, relatório de latência/erros e limpeza somente dos IDs criados. Confirmar teto de conexões, CPU, limites da Vercel/Supabase e o rate-limit por IP antes do teste. Otimizar somente consultas/projeções que sejam gargalo observado; nenhuma troca especulativa de índice/compute.

**Aceite:** uma execução curta de validação do harness cria e remove fixtures próprias; script aborta ao sair do alvo/ref esperado, não imprime tokens/segredos e verifica contagens antes/depois; Bot Protection continua em Challenge; rollback para modo anterior pode ser feito pela flag de publicação sem migration destrutiva.

**Validação:** apenas teste mínimo do harness e leitura das métricas do perfil. O teste completo fica reservado aos dias 13–15.

### Dia 12 — Congelar escopo e entregar release candidate

**Objetivo:** colocar o candidato no endereço Vercel e concluir o fechamento integrado sem criar uma fase separada de dias de teste.

**Ações:** revisar todos os fluxos e flags, documentação de uso/retirada, configuração de fotos, publicação, proteção e rate limits; confirmar que as migrations pendentes estão aplicadas no projeto/ref certo; coletar CI para a revisão final; confirmar o deployment automático `READY`; fazer uma smoke curta de saúde e página, sem fixture nova. Congelar features. Deixar plano de rollback: desligar cadastro ou voltar flag a pendente; não reverter migration destrutiva; manter banco/auditoria.

**Aceite:** commit/SHA e deployment estão relacionados; todos os fluxos classificados `pronto para validar`; nenhuma diferença local, migration pendente ou flag desconhecida; runbook de rollback operável. Se houver atraso, continuar a implementação e suas validações direcionadas sem chamar os testes restantes de uma fase concluída.

### Gate integrado A — Jornadas completas junto da integração

**Objetivo:** validar cada jornada completa assim que os dois fluxos de implementação estiverem integrados no deployment do endereço atual.

**Execução:** 3 contextos de usuário e 2 operadores autorizados; cobrir registro/imediata aparição, acompanhamento, exclusão, denúncia, afeta, resposta, foto (imagem sintética), moderação de relato/resposta/imagem, auditoria e leitura de home/detalhe. Verificar persistência e limpeza própria, retries, dupla submissão, versão obsoleta, perda de conexão e tentativa sem permissão.

**Aceite:** todos os fluxos de produto acima passam pelo browser real; resultado do banco coincide com páginas públicas; zero fixture ativa depois da limpeza, auditoria esperada preservada; segredo, token, contato e storage path ausentes no HTML/network bundle público.

**Cadência:** executar como uma passagem única depois da integração dos agentes. Se uma jornada falhar, corrigir o bloqueador no fluxo dono e repetir somente os passos afetados e seus contratos dependentes.

### Gate integrado B — Carga progressiva junto do fechamento

**Objetivo:** medir o patamar estável real e localizar o primeiro gargalo sem criar mais um dia reservado só a testes.

**Execução:** rodar o harness pelo endereço Vercel e não pelo PostgREST direto; rampa 20→40→60, 30 minutos no patamar 60 e rajada curta até 90. Usar só fixtures controladas, pausas e limites definidos. Não desligar Bot Protection para melhorar o número. Separar 429 de WAF, limite de aplicação, conflitos esperados e erros 5xx/timeout. Limpar apenas registros da execução e conferir contagens.

**Aceite:** alcançar os critérios de latência/erro/correção da seção de capacidade em 50 sessões; registrar se 60 também passou, p50/p95/p99, throughput, região/cliente, pool frio/quente, CPU/conexões, limites por origem e timestamp. Se 60 não passar, 50 sustentadas ainda atendem o mínimo; se 50 não passar, reduzir para 40, 20 etc. e documentar o maior patamar sem declarar o alvo cumprido.

**Cadência:** executar uma campanha de carga controlada depois do smoke integrado. Se o patamar mínimo falhar, corrigir o gargalo observado e repetir somente o cenário afetado; manter Bot Protection ativa.

### Gate integrado C — Regressão final, demonstração e aceite

**Objetivo:** fechar o estado de entrega sem inflar os resultados e sem uma fase de testes isolada no calendário.

**Execução:** uma rodada final da suíte integrada relevante e CI, `npm run db:test`, `npm run typecheck`, `npm run lint` nos arquivos alterados e `npm run build` com a fixture dummy prevista pelo projeto. Reproduzir no browser a jornada principal, confirmar health, home, fila AAL2, remover fixture, revisar métricas e ensaiar roteiro da apresentação. Verificar `git status`, commits em `main`, CI e deployment Production `READY`.

**Aceite:** GO do MVP somente se os fluxos da seção de produto estiverem demonstrados, as proteções e dados privados continuarem corretos, Production corresponder ao SHA validado e 50 sessões cumprirem os limites. Se 60 também passar, registrar 60 como capacidade comprovada. Se passar 50 mas não 60, comunicar “50 comprovados; 60 não comprovados”, sem estimar além. Se a capacidade ficar abaixo de 50, resultado **NÃO GO para o alvo de demonstração**, com gargalo e correção prioritária documentados.

## Ajuste de execução — validação contínua (23/11/2026)

O responsável concluiu o Dia 1 e determinou que não haja jornadas inteiras só de diagnóstico/teste. Portanto, os antigos gates dos Dias 13–15 acima são critérios integrados de aceite, não dias reservados: cada agente executa teste direcionado e lint/typecheck apropriados à sua fatia; o manager valida em fila; a jornada end-to-end, a suíte geral e a carga de 50–60 sessões são executadas uma vez após integrar os fluxos. Se algo falhar, corrigir a causa e retestar apenas o escopo atingido.

O registro completo e as evidências read-only do Dia 1 estão na seção anterior. O próximo trabalho é iniciar o Dia 2 e as tarefas independentes subsequentes sem repetir o inventário, as consultas de catálogo nem as verificações já registradas. O teste de carga usa o projeto/deployment Vercel autorizado e fixtures com allowlist exata; nenhuma equipe deve apagar dados por prefixo isolado.

## Mapa de arquivos por área

| Área | Locais principais |
|---|---|
| Cadastro e controles | `src/app/api/registrar/route.ts`, `src/lib/registro/servidor.ts`, `src/lib/registro/staging.ts`, `src/lib/registro/schemas.ts`, `src/lib/registro/http.ts`, `src/components/registro/RegistrarForm.tsx`, `src/app/registrar/page.tsx` |
| Home e leitura pública | `src/components/HomeConteudo.tsx`, `src/components/MapaGoias.tsx`, `src/app/problemas/page.tsx`, `src/app/problema/[id]/page.tsx`, `src/app/api/dados/route.ts`, views públicas em `db/003_views.sql`, `db/009_view_sem_busca.sql`, `db/012_dados_painel.sql`, `db/019_supressao_indicadores.sql`, `db/023_totais_indicadores_suprimidos.sql` |
| Acompanhamento e participação | `src/app/api/acompanhar/route.ts`, `excluir/route.ts`, `denunciar/route.ts`, `afeta/route.ts`, `resposta/route.ts`, `src/lib/registro/participacao.ts` e `src/components/registro/**` |
| Admin | `src/components/admin/AdminConsole.tsx`, `src/app/api/admin/**`, `src/lib/admin/handlers/http.ts`, `db/018_admin_operacoes.sql`, `db/021_fila_moderacao_filtros.sql`, `db/025_escala_fila_admin.sql` |
| Fotos e retenção | `src/app/api/imagem/route.ts`, `src/app/api/admin/imagem/route.ts`, `src/app/api/admin/fotos/[id]/revisao/route.ts`, `src/lib/registro/imagem.ts`, `src/lib/registro/limpeza-imagens.mjs`, migrations 013–016/020 |
| Validação, CI e carga | `src/**/*.test.ts(x)`, `db/tests/**`, `scripts/ci/**`, `.github/workflows/ci.yml`, `scripts/carga-mvp.mjs` |

Os caminhos acima são prováveis com base no checkout atual; na tarefa do Dia 1, confirmar qualquer renomeação e acrescentar os arquivos exatos observados ao registro sem substituir o mapa histórico.

## Gates operacionais, rollback e custo

- **Dados/remotos:** antes de migrations ou gravações, identificar equipe/projeto/ref no CLI e comparar com os refs documentados. Migrations devem ser aditivas, transacionais quando possível, testadas no PGlite e verificadas por leitura após aplicar. Não usar dados de usuários como fixtures.
- **Production/Vercel:** é o endereço de demonstração escolhido, não um ambiente de staging separado. Cada push em `main` pode publicar; fazer integração pequena, aguardar CI/deployment, e smoke de leitura antes da próxima mudança remota. Nunca enviar pacote com `.env*`, `observatorio-privado`, `db` ou testes fora do build configurado.
- **Reversão:** desligar a flag de publicação/cadastro em Vercel interrompe novos envios; não transformar tudo de volta silenciosamente. Se for necessário reverter política, preservar relatos existentes e permitir que moderadores continuem removendo; não apagar auditoria nem relatos alheios. Vercel permite retornar ao deployment anterior se o runtime ficar indisponível.
- **Capacidade e preço:** o Plano 15 registrou projeto Supabase Production Free. A documentação atual informa que projetos Free podem ser pausados após sete dias de baixa atividade, e os limites de conexão dependem do compute. Vercel autoescala funções, mas o teto publicado não equivale à capacidade desta aplicação. Se banco ou plano impedir 60, medir o limite, apresentar custo exato de compute/plano, obter autorização para qualquer gasto e seguir com otimização sem declarar aceite prematuro.
- **Proteção:** Vercel Bot Protection Challenge permanece ativo, disponível em todos os planos; o teste deve distinguir bloqueio de cliente de teste da taxa de erro vista por navegadores legítimos. Não introduzir bypass permanente para ganhar throughput.
- **Chaves e domínio:** não rotacionar nem revogar chaves dentro destes 15 dias, conforme decisão do responsável de cuidar disso no GO final. Domínio próprio/Cloudflare/DNS não são critérios deste plano.

## Critérios finais de GO

GO exige simultaneamente: cadastro textual e aviso de publicação imediata coerentes; relatos reais visíveis logo após envio; home/lista/detalhe com conteúdo e filtros; acompanhamento e exclusão do titular; denúncia, “também me afeta” e resposta funcionais; ciclo de foto com revisão humana e dados não identificáveis; console AAL2 cobrindo remoção, atualizações, duplicidade, filas, auditoria e equipe; indicador e view pública sem vazamento; cron protegido; CI/build/deployment no SHA certo; zero fixture de carga esquecida; e medição de 50–60 sessões conforme os limites definidos.

Sem algum desses critérios, registrar precisamente o item como `PARCIAL` ou `NÃO GO`. O Plano 16 é referência de escala da fila, não substituto do teste end-to-end. O GO deste plano é apenas **MVP de demonstração no endereço Vercel atual**; não declara domínio próprio, revisão institucional final, proteção automática contra má intenção ou SLO de serviço público.

## Fontes atuais consultadas em 23/11/2026

- Vercel Bot Protection Managed Ruleset, disponível em todos os planos e capaz de servir JavaScript Challenge: [WAF managed rulesets](https://vercel.com/docs/vercel-firewall/vercel-waf/managed-rulesets), [Bot Management](https://vercel.com/docs/bot-management).
- Vercel Functions escalam, mas os limites máximos não representam capacidade aferida do app: [Function limits](https://vercel.com/docs/functions/limitations).
- Supabase Free pode pausar projeto com baixa atividade por sete dias; limites de conexão/pool variam conforme compute: [Project pausing](https://supabase.com/docs/guides/platform/free-project-pausing), [pooling e limites](https://supabase.com/docs/guides/database/connecting-to-postgres/pooling-and-limits).

## Registro do Dia 1 — 2026-11-23

**Fuso:** America/Sao_Paulo (BRT, UTC−03:00). **Início:** a hora do primeiro comando não foi capturada; não a estimei. A primeira leitura de relógio disponível durante o fechamento foi 13:07:08 BRT. **Fim:** 2026-11-23 13:23:21 -03:00 (BRT).

### Base e cadeia de evidências

- **Verificado nesta execução:** branch `main`; `HEAD` `785e719e7548f984511d5d0a50e8537449a7e909`; `origin/main` no mesmo SHA; `HEAD...origin/main` = `0 0`. A Production da Vercel aponta para esse mesmo SHA. A working tree continua contendo alterações concorrentes, então igualdade com `HEAD` não significa que o deployment contém os diffs locais.
- **Staged no início:** `M docs/api-contratos.md`, `A docs/planos/servico/13-fechamento-go-mvp.md` e `A docs/planos/servico/README.md`. Blobs staged registrados antes da edição: `9368fa83212c7a8312d65303b9120cf31276835d`, `6566ed9e49110616ab8cc6d4785a3913358e363f` e `a6543ac367d3c2f095feb1c3310134555f839a4b`, respectivamente. Permaneceram intocáveis durante o trabalho; a checagem final está registrada abaixo.
- **Unstaged no início:** 14 arquivos já rastreados: `AGENTS.md`; `db/tests/migracao_018_test.sql`; `scripts/e2e-admin-staging.mjs`; `scripts/lib/admin-ficticio.mjs`; `src/app/api/imagem/route.ts`; `src/components/HomeConteudo.test.ts`; `src/components/HomeConteudo.tsx`; `src/components/MapaGoias.test.ts`; `src/components/MapaGoias.tsx`; `src/lib/admin/handlers/http.test.ts`; `src/lib/admin/handlers/http.ts`; `src/lib/observabilidade/logger.test.ts`; `src/lib/registro/imagem-http.test.ts`; `src/lib/registro/participacao-http.test.ts`. O resumo inicial foi 304 inserções/91 remoções. Os estados `AM` de Plano 13 e README foram preservados exatamente como encontrados.
- **Untracked no início:** oito entradas: um caminho cujo nome começa por `2026-11-09` e contém quebra de linha; `docs/planos/servico/02-signup-staging.md`; `03-adocao-chaves-staging.md`; `04-seguranca-ponta-a-ponta.md`; `05-mvp-operacional.md`; este `17-mvp-demonstracao-15-dias.md`; `docs/planos/servico/runbook-chaves-supabase.md`; `src/lib/registro/cron-retention.test.ts`. O conteúdo de nenhuma delas foi alterado, salvo a inclusão deste registro no Plano 17.
- **Resumo staged inicial:** 3 arquivos, 438 inserções, conforme `git diff --cached --stat`. Nenhuma suíte foi executada; não houve leitura de relatos, contatos, tokens, IPs, textos de denúncia/resposta ou caminhos Storage. Nenhum write remoto foi executado.
- **Escala dos rótulos desta matriz:** **verificado nesta execução** = leitura atual de código, metadados/CLI, navegador ou consulta SQL de catálogo/agregados; **registrado anteriormente, não revalidado agora** = evidência de Planos 13–16; **inferência** = consequência provável, não execução observada; **não comprovado** = falta prova suficiente. Presença de rota/RPC não é prova de jornada completa.

### Debate de abordagem

A resolução do BMad retornou a sala instalada com cinco agentes, sem grupo de projeto chamado `mercury-team`; para cumprir as seis posições mínimas, o debate incluiu uma voz de segurança. Mary (analista), John (produto), Sally (UX), Winston (arquitetura), Amelia (desenvolvimento) e Vex (segurança) fizeram posições cegas. O choque ocorreu em três rodadas:

1. **Matriz de evidências:** Mary, John e Amelia atacaram a leitura “rota existe, logo fluxo funciona”; Sally acrescentou que a página pode continuar vazia depois de um recibo. O SHA implantado igual ao `HEAD`, as alterações locais concorrentes, o zero de itens públicos e o stub de participação sustentam manter estado local, runtime atual e histórico em colunas distintas. Rejeitada a alternativa de copiar o estado do Plano 15 como estado atual.
2. **Fixtures e limpeza:** Vex e Winston atacaram limpeza baseada apenas no prefixo: ele é público, copiável e não identifica autoria exclusiva. A decisão foi exigir `run_id` aleatório por execução, allowlist privada dos IDs criados, marcador exato, titular sintético e contagens agregadas antes/depois. A exclusão do titular não apaga hoje o hash em `tokens_gestao`; a execução futura deve abortar até existir invalidação verificada. Mescla, denúncias, respostas e auditoria podem deixar linhas append-only; “zero ativo” não será relatado como “zero linhas”.
3. **Leitura remota:** Winston e Vex atacaram autenticação ou probes por GET como se fossem neutros. `GET /api/cron/limpar-quarentena` executa limpeza com `apply: true`, e challenge/verify/login de MFA alteram estado ou consomem limite. Não foram chamados. Alternativa rejeitada: confirmar AAL2 desta sessão iniciando login. AAL2 permanece histórico até existir uma sessão já autorizada, sem criar uma durante o Dia 1.

**Decisão:** inventariar o checkout atual e o alvo remoto por fontes próprias; executar SQL somente após confirmar ref e ajuda do CLI, em transação `--read-only`; não tocar nos arquivos staged/diffs concorrentes. **Risco/dissidência em aberto:** grants e RPCs presentes não provam que a jornada administrativa esteja operacional; também não há prova atual de uma sessão MFA/AAL2 nem da navegação pública para uma fixture publicada.

### Matriz de fluxos

| Fluxo | Estado local | Estado remoto comprovado | Evidência local | Lacuna funcional e tarefa prevista |
|---|---|---|---|---|
| Cadastro de relato, publicação inicial e retry idempotente | **Parcial:** rota grava sempre `pendente`; a chave de idempotência existe no contrato da RPC. | **Verificado nesta execução:** Production tem os gates textuais ativos; contagens agregadas: 0 publicados, 0 pendentes/retidos ativos e 1 removido. Nenhum POST foi enviado. **Registrado anteriormente, não revalidado:** Plano 15 relata cadastro sintético pendente e exclusão posterior. | `src/app/api/registrar/route.ts:12–39`; `db/007_lacunas_do_desenho.sql:58–126`; `src/components/registro/RegistrarForm.tsx:56–77, 201–218, 256–258`. | **Dia 2:** flag separada, fail-closed, para publicação inicial; consentimento explícito e texto correto. Preservar a mesma chave/token no retry; provar que retry devolve a ocorrência original. Não reutilizar `MODO_PUBLICACAO`, que também protege outros fluxos. |
| Home e recentes | **Parcial:** consulta cinco relatos e indicadores; a tela diferencia vazio e lista, mas conserva marcadores de demonstração no checkout. | **Verificado nesta execução:** deployment atual no browser exibiu home vazia e zero indicadores; o banco tem zero relatos publicados. Não foi feito POST de prova. | `src/components/HomeConteudo.tsx:8–14, 28–36`; `src/lib/dados/consultas.ts:206–229`. | **Dia 3:** após o contrato do Dia 2, provar item novo na home, estado vazio vs indisponível e invalidação das tags após publicar/remover; **Dia 9** revisar rótulos demonstrativos e indicadores. |
| Lista, filtros e busca | **Parcial:** lista lê view pública, pagina e filtra por município/categoria; busca textual livre não foi localizada no contrato inspecionado. | **Verificado nesta execução:** view `v_ocorrencias_publicas` existe e recebe `SELECT` de `anon`; nenhuma fixture publicada para exercitar o resultado. | `src/app/problemas/page.tsx:11–23`; `src/lib/dados/consultas.ts:84–99`; `src/components/ListaProblemas.tsx`. | **Dia 3/9:** confirmar filtros, cursor e semântica de busca desejada; demonstrar a mesma fixture e retirada sem exceder limites por leitura. |
| Mapa e consulta por município | **Parcial:** mapa e seletor usam catálogo territorial e dados agregados; a tela atual explicita estado sem relatos. | **Verificado nesta execução:** home Production mostrou catálogo de municípios e mapa; 0 relatos publicados. Grants anon das views de dados/indicadores confirmados por SQL read-only. | `src/components/MapaGoias.tsx:28, 115–136`; `src/components/HomeConteudo.tsx:14, 32`; `src/lib/dados/consultas.ts:144–160`. | **Dia 3/9:** navegar por município com fixture, refletir publicação/remoção e confirmar que consulta não baixa o conjunto inteiro. |
| Detalhe público | **Parcial:** agrega ocorrência, imagens públicas, atualizações e respostas publicadas a partir das views. | **Verificado nesta execução:** views existem; estado atual não tem relato publicado nem imagem. Não foi aberto detalhe de fixture. | `src/app/problema/[id]/page.tsx:42–73`; `src/lib/dados/consultas.ts:102–141`. | **Dia 3:** abrir o mesmo ID compartilhável após publicação; conferir que removido/pendente e filhos privados não aparecem e que cache é invalidado. |
| Acompanhamento e exclusão do titular | **Parcial:** POST com token consulta a RPC; exclusão marca removido, apaga contato/imagens relacionadas e cria histórico. A rota de exclusão não revalida tags públicas; a RPC do checkout não remove o hash em `tokens_gestao`. O corpo da função remota não foi consultado, portanto a invalidação remota não está comprovada. | **Verificado nesta execução:** função existe, execução é restrita a `service_role`; 1 linha removida no agregado, sem leitura de token/linha. **Registrado anteriormente, não revalidado:** exclusão de fixture sintética e evento de auditoria nos Planos 15/16, não a jornada atual completa do browser. | `src/app/api/acompanhar/route.ts:14–18`; `src/app/api/excluir/route.ts:7–12`; `db/002_funcoes.sql:89–132`. | **Dia 5:** ligar link privado, situação e retirada pelo titular; acrescentar/provar invalidação; provar token inválido após retirada. Se o token continuar válido, não iniciar fixtures. Verificar Storage separadamente. |
| Denúncias | **Parcial:** endpoint chama RPC após Turnstile/limite; UI do detalhe pode estar indisponível; Production não tem os nomes de variáveis Turnstile necessários para estas rotas. | **Verificado nesta execução:** RPC existe e só `service_role` executa diretamente; 0 denúncias. `TURNSTILE_SECRET` e `NEXT_PUBLIC_TURNSTILE_SITE_KEY` ausentes por nome no escopo Production. | `src/app/api/denunciar/route.ts:1–3`; `src/lib/registro/participacao.ts:76–84`; `db/022_deduplicacao_participacao.sql:38–52`; `src/app/problema/[id]/page.tsx:74–75` (botão e aviso de sinalização indisponíveis). | **Dia 6:** separar gate de participação do cadastro textual, conservar deduplicação e fazer item legítimo chegar à fila; reavaliar requisito de proteção gerenciada no endpoint. |
| “Também me afeta” | **Indisponível:** a rota devolve `afetaIndisponivel`; botão permanece desabilitado e testes locais confirmam que não chama endpoint. | **Verificado nesta execução:** nenhuma confirmação agregada foi criada; não há execução pública a comprovar. | `src/app/api/afeta/route.ts:1–3`; `src/lib/registro/participacao.ts:101`; `src/app/problema/[id]/page.tsx:72–73`; `src/app/problema/[id]/actions-unavailable.test.ts:26–37`. | **Dia 6:** implementar persistência/deduplicação, retorno e contador com limites e sem guardar origem bruta; definir limpeza antes de habilitar a fixture. |
| Direito de resposta e atualizações oficiais | **Parcial:** envio e revisão têm endpoints/RPCs; resposta entra pendente e contato não é público. | **Verificado nesta execução:** RPCs de resposta/revisão e grants existem; 0 respostas e zero atualizações observadas por esta matriz agregada. Nenhuma submissão/revisão feita. | `src/app/api/resposta/route.ts:1–3`; `src/lib/registro/participacao.ts:91–97`; `src/lib/admin/handlers/http.ts:214–222`; `db/022_deduplicacao_participacao.sql:55–75`; `db/025_escala_fila_admin.sql:91–102`. | **Dia 7:** provar pendência → decisão AAL2 → publicação no detalhe; recusa deve manter o texto sintético fora do público, limpar hash de origem e deixar auditoria. Conteúdo fechado permanece dado residual, não fixture ativa. |
| Upload de fotos | **Parcial local; indisponível na configuração Production atual:** a flag está `false`. | **Verificado nesta execução:** buckets `imagens-publicas`/`imagens-quarentena` existem; respectivamente público/privado, JPEG até 2 MiB; 0 imagens. | `src/components/registro/EtapaFotos.tsx:15–56`; `src/app/api/imagem/route.ts:18–72`; `db/015_upload_imagens.sql:3–40`. | **Dia 8:** manter texto independente, usar JPEG sintético sem pessoas/placas/EXIF, provar quarentena privada, revisão e descrição alternativa antes de qualquer ativação. |
| Revisão, publicação e remoção de fotos | **Parcial:** revisão POST usa lease/RPC, aprovação copia ao bucket público e remoção apaga objetos; o GET da revisão não é mutação. | **Verificado nesta execução:** RPCs de preparação/moderação existem com grant authenticated; buckets estão corretos; 0 fotos. Nenhuma imagem/revisão executada. | `src/app/api/admin/fotos/[id]/revisao/route.ts:2`; `src/app/api/admin/imagem/route.ts:40–96`; `db/016_moderacao_imagens.sql:8–56`. | **Dia 8/10:** ciclo upload→revisão→publicação/remoção→limpeza de órfão idempotente; não usar o cron como probe. Política/canal de retirada seguem gates da ativação. |
| Login administrativo MFA/AAL2 | **Implementado localmente:** código valida claim `aal2` e tem rotas de fator, challenge, verify e sessão. | **Verificado nesta execução:** 1 administrador ativo e RPCs administrativas concedidas a authenticated, negadas a anon. **Registrado anteriormente, não revalidado:** Planos 15 e 16 documentam sessão AAL2 em Production/staging. Nenhum login/refresh/challenge foi tentado agora. | `src/lib/admin/auth/http.ts:76–81, 159–164`; `src/app/api/admin/auth/session/route.ts:2`; `src/components/admin/AdminConsole.tsx:160–166`. | **Dia 10/13:** validar com sessão já provisionada, papéis e MFA; não disparar login novo no Dia 1. |
| Fila, resumo e detalhe administrativo | **Parcial:** handlers e console chamam paginação/resumo/detalhe com limites. A migration 025 exclui relato publicado que não tenha outra pendência. | **Verificado nesta execução:** `admin_pagina_fila`, `admin_resumo_fila` e `admin_detalhar_ocorrencia` existem; authenticated executa e anon não. Fila não foi chamada; nenhum relato público disponível. | `src/app/api/admin/fila/route.ts:2`; `src/lib/admin/handlers/http.ts:144–182, 200`; `src/components/admin/AdminConsole.tsx:251–330`; `db/025_escala_fila_admin.sql:176–210, 228–243`. | **Dia 4:** migration/teste local da elegibilidade de publicados e filtro específico antes de depender de pós-moderação. Preflight de objeto atual primeiro; ledger remoto não existe para comparar sequência completa. |
| Remoção/restauração e auditoria da moderação | **Parcial:** actions `remover/restaurar` e motivos/versionamento existem; restauração requer papel acima de moderador. | **Verificado nesta execução:** RPC versionada e grants authenticated estão presentes; sem ação feita neste turno. **Registrado anteriormente, não revalidado:** decisão de remoção auditada em testes/runs anteriores. | `src/lib/admin/handlers/http.ts:18, 205–206`; `db/025_escala_fila_admin.sql:48–60`; RPC `admin_moderar_ocorrencia` observada no catálogo. | **Dia 4/10:** exercer em fixture publicável, remover e restaurar com motivos/papel corretos e confirmar auditoria e sumiço/aparição em leitura nova. |
| Situação e atualizações de ocorrência | **Parcial:** HTTP valida situação/evidência e chama RPC; atualizações públicas/internas têm flag. | **Verificado nesta execução:** `admin_atualizar_situacao` e `admin_adicionar_atualizacao` presentes/grant authenticated. Não exercidas. | `src/app/api/admin/ocorrencias/[id]/situacao/route.ts:2`; `src/app/api/admin/ocorrencias/[id]/atualizacoes/route.ts:2`; `src/lib/admin/handlers/http.ts:214–216`; `db/025_escala_fila_admin.sql:63–75, 152–175`. | **Dia 7/10:** provar atualizações públicas versus notas internas, versão concorrente e atualização do detalhe/cache. |
| Duplicidade e ações em lote | **Parcial:** rotas e RPCs versionadas existem. Mescla remove origem, não transfere filhos e deixa evento histórico. | **Verificado nesta execução:** RPCs/grants existem; nenhum lote/mescla exercido. | `src/app/api/admin/ocorrencias/[id]/mesclar/route.ts:2`; `src/app/api/admin/ocorrencias/lote/route.ts:2`; `src/lib/admin/handlers/http.ts:209–211`; `db/018_admin_operacoes.sql:45–61`; `db/025_escala_fila_admin.sql:105–149`. | **Dia 10/13:** validar atomicidade, conflitos/versionamento e limpeza de fonte/destino; incluir origem removida e filhos retidos no relatório agregado. |
| Contato, equipe e auditoria administrativa | **Parcial:** contato exige papel gestor; equipe superadmin; leituras e mutações passam pelo handler/RPC. | **Verificado nesta execução:** RPCs correspondentes presentes e limitadas a authenticated; 1 administrador ativo. Conteúdo/contato e auditoria não foram lidos. | `src/app/api/admin/ocorrencias/[id]/contato/route.ts:2`; `src/app/api/admin/equipe/route.ts:2`; `src/app/api/admin/auditoria/route.ts:2`; `src/lib/admin/handlers/http.ts:188–225, 234–256`; `db/017_admin_mfa_equipe.sql:13–59`. | **Dia 10/13:** provar RBAC, acesso ao contato com evento auditado, equipe e auditoria sem expor PII nem enviar convite/email real. |
| Indicadores e supressão de células pequenas | **Parcial:** views de indicadores e supressão estão no código; não há dados publicados para observar uma célula. | **Verificado nesta execução:** views de indicadores existem e recebem SELECT anon; as definições locais das migrations 019/023 implementam supressão. Sem ledger, a definição remota/versionamento não foi comparada. Há 0 relatos publicados. Nenhuma célula pequena observável. | `src/lib/dados/consultas.ts:158, 222–229`; `db/019_supressao_indicadores.sql:3–50`; `db/023_totais_indicadores_suprimidos.sql:1–9`. | **Dia 9:** conferir consulta, supressão primária/complementar com dados sintéticos e não inferir proteção de célula a partir de tabela vazia. |
| Cron de limpeza e retenção | **Parcial:** GET protegido pelo `CRON_SECRET` aplica limpeza; rotina privada limpa expirações. O cron é mutável apesar de ser GET. | **Verificado nesta execução:** deployment atual declara cron `0 6 * * *`; `interno.limpar_expirados()` existe e anon/authenticated não têm EXECUTE; configuração de rejeitadas é 365 dias (provisória). Execução/último sucesso não verificados. | `vercel.json:1`; `src/app/api/cron/limpar-quarentena/route.ts:7–12`; `db/020_retencao_imagens.sql:3–57`. | **Dia 10/11:** checar proteção/telemetria e limpeza somente no ensaio dedicado; não chamar cron no preflight. Confirmar policy, órfãos e resíduo sem apagar outra execução. |

### Vercel — consulta atual somente leitura

- **Verificado nesta execução:** Vercel CLI autenticada como `mercurygestoria-9113`, equipe `mercurygestoria-9113s-projects`; projeto `observatorio-go`, ID `prj_5c7PyLdrz6B3gPX4rN7oPUS1GN28`, Production Branch `main`. O alias observado em `inspect` é `https://observatorio-go.vercel.app`.
- O `list` e `inspect` apontaram o deployment Production mais recente como `READY/PROMOTED`, ID `dpl_DVhniFcwpz6vD77iYddUzhZdcGht`, no alias, SHA `785e719e7548f984511d5d0a50e8537449a7e909`. O `HEAD`/`origin/main` coincide. A listagem também devolveu duas publicações mais antigas, não usadas como estado atual. O horário `createdAt` do último deployment foi convertido de epoch para 10:45:36 BRT; não foi usado para inferir comportamento do app.
- **Verificado nesta execução:** o GET de configuração do projeto informou firewall ativo, managed `bot_filter` ativo com ação `challenge`, SSO restrito a Preview, proteção de fork Git ativa, projeto no plano Vercel Hobby e região padrão de função `iad1`. Não houve alteração em proteção, domínio, alias ou deployment. A aba normal do browser já aberta exibiu a home, catálogo municipal e estado vazio; não foi iniciado POST nem se provocou desafio. Não fiz GET por Node/CLI ao alias nesta rodada.
- **Variáveis — nomes/escopos sem valores:** Production lista `AMBIENTE_REGISTRO`, `BETA_REGISTRO_PROTEGIDA_VERCEL`, `BETA_REGISTRO_TEXTUAL_ATIVA`, `CRON_SECRET`, `FOTOS_HABILITADAS`, `HMAC_SEGREDO`, `LIMITE_ACOMPANHAR_MAXIMO`, `LIMITE_ADMIN_JANELA_SEGUNDOS`, `LIMITE_ADMIN_MAXIMO`, `LIMITE_DENUNCIA_MAXIMO`, `LIMITE_EXCLUIR_MAXIMO`, `LIMITE_FOTO_MAXIMO`, `LIMITE_JANELA_SEGUNDOS`, `LIMITE_REGISTRO_MAXIMO`, `LIMITE_RESPOSTA_MAXIMO`, `MODO_PUBLICACAO`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_PRODUCTION_DATA_APPROVED`, `SUPABASE_PRODUCTION_PROJECT_REF`, `SUPABASE_SECRET_KEY`, `TRIAGEM_JANELA_SEGUNDOS`, `TRIAGEM_LIMITE_ORIGEM` e `TURNSTILE_HOSTNAME`. Preview lista `ACESSO_STAGING_SENHA`, `ACESSO_STAGING_USUARIO`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SECRET_KEY`. Os nomes de Turnstile `TURNSTILE_SECRET` e `NEXT_PUBLIC_TURNSTILE_SITE_KEY` não estão listados em Production; a beta textual usa Bot Protection gerenciada.
- **Configuração não secreta verificada em processo isolado (diretório temporário, projeto/equipe explícitos):** Production = `AMBIENTE_REGISTRO=production`, `BETA_REGISTRO_TEXTUAL_ATIVA=true`, `BETA_REGISTRO_PROTEGIDA_VERCEL=true`, `FOTOS_HABILITADAS=false`, `MODO_PUBLICACAO=moderar_tudo`, `SUPABASE_PRODUCTION_DATA_APPROVED=true`, `TURNSTILE_HOSTNAME=observatorio-go.vercel.app`; ref configurado e host Supabase correspondem a `acxcqtknxjiwopdtjxoc`. A leitura `GET /auth/v1/settings` retornou 200 e `disable_signup=true`. Três valores Secret não puderam ser injetados pelo CLI; nenhum valor secreto foi exibido. A execução inicial de `env run` no checkout herdou `.env.local` e foi descartada; a repetição em diretório temporário forneceu a observação válida.
- **Limitação de manuseio:** um GET de metadados do projeto incluiu no retorno do CLI campos cifrados de ambiente; não eram plaintext, não foram copiados para arquivo/plano nem decodificados. As leituras de escopo foram então feitas pelo `env ls` textual filtrado a nomes, sem `--json`, `env pull` ou dump de ambiente.
- **Registrado anteriormente, não revalidado:** o Plano 15 descreve browser atravessando Challenge e um GET por Node recebendo 429. Não repetimos o GET por Node nem alteramos o Challenge. A home no browser desta execução é apenas observação de página renderizada; não substitui a prova de uma requisição fria.

### Supabase Production — consulta atual somente leitura

- **Verificado nesta execução:** `supabase whoami` autenticado; o email/ID pessoal da sessão foi omitido deste registro. `projects list` confirmou o projeto `Observatorio-Goias-Production`, ref explícito `acxcqtknxjiwopdtjxoc`, estado `ACTIVE_HEALTHY`, região `sa-east-1`, Postgres 17.12.0.000. O comando não vinculou a pasta local a outro ref. O dashboard web redirecionou a sessão desta máquina para Sign in; compute/plano não puderam ser confirmados pelo painel.
- **CLI SQL:** help de `supabase db query` confirmou suporte a `--read-only`. As duas consultas usaram `--remote=acxcqtknxjiwopdtjxoc --read-only`, e a consulta confirmou `transaction_read_only=on`. Foram SELECTs de catálogo/configuração e contagens agregadas; sem instrução de escrita e sem contato/conteúdo pessoal. O `ROLLBACK` explícito não foi necessário/suportado pelo invólucro da CLI para a consulta única read-only; a transação encerrou ao término do comando.
- **Ledger e objetos — verificado:** `supabase_migrations.schema_migrations` não existe. Não se conclui que todas as migrations locais estão aplicadas. O catálogo lista 10 views públicas (incluindo `v_ocorrencias_publicas`, `v_dados_painel`, views de indicadores, `v_imagens_publicas`, atualizações/respostas e fila). `admin_pagina_fila`, `admin_resumo_fila`, `admin_detalhar_ocorrencia`, RPCs versionadas e RPCs de cadastro/acompanhamento/participação/foto estão presentes. A checagem de privilégios encontrou `anon` sem EXECUTE nas RPCs administrativas e de escrita, `authenticated` com EXECUTE nas administrativas, `service_role` com EXECUTE nas RPCs de escrita, e anon com SELECT nas views públicas consultadas, mas sem SELECT direto na tabela base `ocorrencias`.
- **RLS/storage — verificado:** RLS ativo em `ocorrencias`, `imagens`, `denuncias`, `respostas`, `administradores` e `historico_moderacao`; `FORCE ROW LEVEL SECURITY` não está ligado nessas tabelas. Buckets `imagens-publicas` (público) e `imagens-quarentena` (privado), ambos limitados a 2 MiB e MIME `image/jpeg`.
- **Auth — verificado:** configuração do escopo Production confirmou host/ref, HTTP 200 em `/auth/v1/settings` e `disable_signup=true`; nenhuma conta foi criada nem alterada.
- **Agregados em 23/11 às 13:00:45 BRT — verificado:** 1 ocorrência total, 0 publicadas, 0 pendentes/retidas ativas, 1 removida, 0 denúncias, 0 respostas, 0 imagens e 1 administrador ativo. A query não classificou a ocorrência removida pelo marcador de fixture; Plano 15 documenta uma fixture anterior removida, mas não se atribuiu essa linha sem ler conteúdo.
- **Métricas — verificado:** CLI `inspect db db-stats` mostrou tamanho do banco 13 MB, tabelas 88 kB, índices 528 kB, WAL 112 MB, cache de índice 0,99 e de tabela 1,00. O comando read-only `inspect db role-stats`, direcionado ao ref confirmado, mostrou 60 conexões de limite por role e conexões ativas por role; o próprio resultado rotula `environment=unverified`, então isto não estabelece quota global do projeto nem compute do projeto. CPU, compute ativo, quota global e plano atual não foram disponibilizados pelas respostas da CLI usada. **Registrado anteriormente, não revalidado:** Plano 15 identifica projeto Free; a listagem atual não traz plano/compute. A sessão web do dashboard não estava autenticada.
- **Retenção — verificado:** `interno.configuracao_retencao` e `interno.limpar_expirados()` existem; prazo de retenção de imagens rejeitadas = 365 dias, explicitamente provisório de engenharia. Anon e authenticated não têm EXECUTE na rotina privada. Não executamos cron nem rotina de limpeza.

### Manifesto de fixtures `[DEMO-MVP]` — planejamento, nenhuma gravação no Dia 1

1. **Namespace:** gerar um `run_id` aleatório por execução; o título e descrição de cada relato conterão `[DEMO-MVP:<run_id>]` e um ordinal sintético. Gerar uma allowlist privada com os IDs retornados pelo fluxo de criação; o prefixo serve para busca agregada, não é autorização de exclusão.
2. **Quantidade mínima para cobrir as jornadas:** quatro relatos textuais sintéticos (um para cadastro/retry/home/lista/detalhe/acompanhamento; um para remoção/restauração; dois para mescla de duplicidade); uma denúncia e uma resposta pendentes associadas a um relato público; uma confirmação “também me afeta” quando o fluxo existir e houver cleanup definido; uma imagem JPEG sintética sem rostos/placas/EXIF ligada a um dos relatos. Não criar usuário admin: usar somente operador institucional já autorizado com MFA/AAL2.
3. **Titular e credenciais:** cada execução terá titular fictício criado pelo próprio fluxo e identificado pela combinação privada `(run_id, ID exato da fixture)`. Token de acompanhamento e eventual contato sintético ficam em cofre temporário do runner; nunca em documento, terminal, screenshot ou log. Se resposta exigir contato, usar destino reservado `.invalid` e bloquear qualquer envio de email. Sem token válido para o ID exato, não executar exclusão.
4. **Limpeza planejada por fluxo:** cada relato remanescente será retirado por `POST /api/excluir` do próprio titular. A fixture de duplicidade passa primeiro pela mescla administrativa, que marca a origem removida e registra auditoria; seus filhos não são transferidos. Denúncia fecha em `POST /api/admin/denuncias/{id}/resolver`; resposta é rejeitada em `POST /api/admin/respostas/{id}/revisar`; depois o relato titular é retirado. Essas linhas sintéticas fechadas podem permanecer como resíduo histórico, sem estado pendente e com hashes de origem limpos. A imagem passa por `POST /api/admin/imagem` com ação `remover`; objeto órfão só é purgado no cron autorizado de limpeza, em janela controlada e depois de confirmar que os IDs pertencem à execução. Não chamar cron genérico para “ver se funciona”.
5. **Gate obrigatório sobre token:** o código local da RPC `solicitar_exclusao_por_token` apaga contato, conteúdo e linhas de imagem, mas não remove `tokens_gestao`; acompanhar/consultar slot de foto ainda consulta essa tabela. O Dia 5 deve implementar ou demonstrar invalidação segura do token removido antes de liberar uma fixture com titular. Se o token continuar utilizável, abortar o ensaio e não alegar limpeza integral.
6. **Antes/depois:** com SQL `--read-only` no ref conferido, emitir somente contagens agregadas por `run_id`/allowlist: relatos ativos por estado; filhos pendentes de denúncia/resposta; imagens pendentes/publicadas e objetos dos buckets ligados apenas aos IDs da execução; tokens válidos da execução. Aceite de limpeza = zero relatos publicáveis ou pendentes, zero participações pendentes, zero imagem acessível/publicável e zero token utilizável; conferir auditoria append-only esperada separadamente. Relatos removidos, linhas encerradas de denúncia/resposta e eventos de auditoria podem continuar no banco e serão contados como resíduo histórico sintético, nunca apresentados como “zero linhas”. O `run_id` e IDs não aparecerão no Plano.
7. **Abortos imediatos:** parar antes de qualquer POST se o project/ref não for exatamente o Production autorizado para o ensaio; se alias/ambiente não corresponderem; se o marcador não incluir o `run_id` desta execução; se a allowlist tiver ID não criado por este run; se o titular/token não resolver exatamente para a fixture; se houver email real, foto identificável ou dado de usuário; se não houver operador AAL2 quando a ação exigir; ou se contagem inicial indicar colisão/resíduo de outra execução. Nunca limpar por prefixo sozinho.

### Riscos priorizados para Dias 2–12

1. **Crítico — publicar sem poder retirar/atender abuso:** relato nasce `pendente` e a UI ainda promete análise; a publicação imediata expõe texto a cópia externa. As rotas denúncia/“também me afeta” não estão utilizáveis na configuração atual. Fechar consentimento, aviso, retirada e moderação dos Dias 2, 5 e 6 antes de divulgar fixtures.
2. **Crítico — fila não enxerga relato publicado limpo:** predicado da migration 025 inclui `pendente/retido`, foto pendente ou denúncia aberta. Um relato recém-publicado sem filhos pode escapar da fila. Corrigir e testar no Dia 4 antes de publicar texto imediatamente.
3. **Alto — token continua válido após exclusão:** a RPC atual não apaga `tokens_gestao`; a limpeza do titular pode retirar o conteúdo sem revogar a chave de acompanhamento. Tratar como gate do Dia 5.
4. **Alto — cache defasado:** consultas públicas têm cache de minutos; a rota do titular não chama `revalidateTag`. Dia 3/5/9 precisam verificar publicação e retirada em leitura nova.
5. **Alto — migrações sem ledger:** o catálogo mostra objetos, mas `schema_migrations` não existe; há registros históricos com classificações distintas do ref de staging. Fazer preflight por objetos/assinaturas antes de qualquer migration; nunca inferir sequência aplicada pela árvore local.
6. **Alto — operabilidade admin/foto:** 1 administrador ativo é contagem, não sessão AAL2; foto está desligada e política de retenção é provisória. Confirmar operador, RBAC, consentimento e ciclo de foto antes dos Dias 8/10/13.
7. **Médio/alto — custo e latência:** Vercel Hobby/`iad1`, Supabase Free documentado anteriormente e banco `sa-east-1`; distância de região pode afetar p95 (**inferência**, não medição desta execução). Plano 16 mede staging/PostgREST aquecido, não o caminho Vercel Production. Dia 11 precisa obter quotas/compute e medir cliente→Vercel→DB sem desativar Challenge.
8. **Médio — cron destrutivo e observabilidade:** o caminho de limpeza é GET com `apply: true`; schedule existe, mas execução/último sucesso não foi verificado. Dias 10/11 devem medir por logs e executar apenas em janela com allowlist, não em probe casual.

### Dia 2 — ordem de execução por dependência

1. Ler novamente os gates locais de registro já mapeados, sem mexer em arquivo staged: `src/lib/registro/servidor.ts`, `staging.ts`, `schemas.ts`, `src/app/api/registrar/route.ts` e `src/components/registro/RegistrarForm.tsx`. A `BETA_REGISTRO_TEXTUAL_ATIVA` atual habilita cadastro protegido; não deve mudar o significado para publicação.
2. Definir contrato/flag própria para publicação textual imediata com parsing fail-closed; usar `p_moderacao='publicado'` apenas quando o gate e o consentimento explícito passam. Preservar idempotência, token/protocolo e auditoria. Começar pelos testes direcionados de flag ausente/falsa, publicação e retry.
3. Atualizar aviso/consentimento no formulário e textos de `/regras`, `/termos` e `/privacidade`: explicar publicação imediata, dados visíveis, risco de cópia, canal de retirada e limite de atendimento; manter contato/token/IP fora da view pública. Confirmar que fotos, denúncia, resposta e admin continuam com gates independentes.
4. Só depois do contrato local aprovado seguir ao Dia 3: home/lista/mapa/detalhe com fixture, cache e estados de indisponibilidade. Não criar dados remotos no Dia 2; nenhuma mudança Production/SQL é pré-requisito para essa fatia.

### Fechamento e preservação

- **Alterações permitidas realizadas:** somente a inclusão deste `Registro do Dia 1` no arquivo novo `docs/planos/servico/17-mvp-demonstracao-15-dias.md`.
- **Remotos:** nenhuma alteração de variáveis, firewall, Challenge, alias, deployment, banco, Auth, Storage, usuários, fixtures ou auditoria. Nenhum commit/push/deploy.
- **Checagem staged ao fim:** verificada após comparar os três blobs staged com os hashes iniciais acima; permanecem idênticos.
- **Encoding:** UTF-8 sem BOM, validado com decoder estrito após a gravação.

### Integração da fila e retirada de imagens em Production — 23/11/2026, 14:07 BRT

- Confirmei pela CLI o projeto Supabase `Observatorio-Goias-Production`, ref `acxcqtknxjiwopdtjxoc`, ativo na região `sa-east-1`. O preflight no mesmo ref, em transação read-only, encontrou a fila, a moderação versionada e a função interna da 025, além das colunas de imagem exigidas. O catálogo não contém ledger `supabase_migrations.schema_migrations`. Os registros consultados já comprovavam os objetos necessários da 025.
- Apliquei apenas `db/026_fila_pos_publicacao.sql` em transação, pelo comando `npx --no-install supabase db query --remote=acxcqtknxjiwopdtjxoc --file db/026_fila_pos_publicacao.sql --yes`, com exit 0. SHA-256 do arquivo aplicado: `913a63345de5054226a69c876937a72fb87c1ca7bfe31daef069a7d334dab77d`.
- O catálogo pós-migração confirmou a nova RPC de remoção com retorno `text[]`, `SECURITY DEFINER` e `search_path` vazio, grant de execução a `authenticated`, ausência de grant a `anon` e `service_role`, trigger de retirada de imagens ativo e revogação de token no ramo de exclusão definitiva. Permaneceram zero relatos publicados e zero imagens. A prova do comportamento com fixtures é local e não houve gravação de dados de teste.
- A aplicação Vercel precisa publicar o handler novo para iniciar a purga após remoção pela interface. A versão anterior segue compatível com a RPC de moderação existente. Se o bucket público ficar indisponível para a exclusão, a galeria deixa de listar os objetos imediatamente e o cron reconcilia os órfãos. Um URL direto conhecido pode continuar acessível até o Storage efetivar a purga.
