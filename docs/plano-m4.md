# Plano do M4 — fotos

Marco do [`desenho-geral.md` §13](desenho-geral.md). Estado: **planejado** (2026-10-28). O código de coleta já existe
(`/api/imagem`, `src/lib/registro/imagem.ts`, migração 011); este plano define o **M4 completo**: coleta robusta, contrato
público, aprovação no servidor, leitura pública das fotos e limpeza agendada. Só as telas do painel ficam no M5.
A flag de fotos permanece desligada em qualquer ambiente com dado real até as travas do §4. Hospedagem: Vercel. Tudo em staging com dados fictícios.

## 1. Situação encontrada
- Coleta: o servidor valida os bytes, recodifica para JPEG de até 2 MiB (remove EXIF/GPS) e grava em `imagens-quarentena` (privado).
- Nenhuma foto pode ser exibida hoje: não há aprovação nem cópia para o bucket público, e a galeria exige um texto alternativo que não existe em nenhuma view pública (`descricao_contexto` é privado).
- Lacunas de robustez: a rota consome o limite do acompanhamento antes de validar o token, processa a imagem antes de checar o slot, e o caminho do arquivo inclui o texto do contexto (variar uma vírgula gera objeto novo). O regex do caminho está repetido em três lugares. Não há teste contra o Storage real nem agendador da limpeza.
- A view pública `v_imagens_publicas` expõe `caminho_storage`, que hoje é o caminho da quarentena.

## 2. Decisões

| # | Decisão | Por quê |
|---|---|---|
| M4-1 | Flag de servidor `FOTOS_HABILITADAS`, **desligada por padrão e falhando fechada**: com ela desligada, `/api/imagem` responde 503 e a etapa de fotos não aparece no formulário | Foto sem quem a modere é conteúdo sensível armazenado sem utilidade. O relato em texto já valida o produto |
| M4-2 | Contrato público de foto: coluna `imagens.descricao_publica` (nula até a aprovação, preenchida só por função administrativa); `v_imagens_publicas` expõe `id, ocorrencia_id, ordem, descricao_publica` e **deixa de expor `caminho_storage`**; só lista fotos aprovadas com descrição pública | Texto alternativo é obrigatório para exibir; o texto bruto do cidadão pode ter nome, endereço ou acusação |
| M4-3 | O caminho público é `<id da imagem>.jpg` no bucket público, independente do token e do caminho da quarentena | Não correlaciona nem expõe a origem do arquivo |
| M4-4 | Módulo único `armazenarImagem` dono do formato do caminho (rota, script de limpeza e SQL consomem a mesma definição); o resumo do arquivo para o caminho usa **só os bytes**, não o contexto | Remove a duplicação e a amplificação de custo por variação do texto |
| M4-5 | Antes de qualquer processamento pesado: validar token, checar slot livre e consumir um limite **próprio** de fotos, separado do acompanhamento | O upload é o recurso mais caro; um NAT compartilhado não pode derrubar o acompanhamento |
| M4-6 | Configurar `sharp` com concorrência e cache limitados; testar bomba de pixels, corpo sem `Content-Length` e PNG de 24 MP | DoS de CPU/memória em ambiente serverless |
| M4-7 | Teste de integração real contra o Storage do staging fictício (upload, duplicado, slot ocupado, limpeza), com limpeza ao final | Os testes atuais usam `fetch` simulado; o que quebra é o contrato com o Storage |
| M4-8 | Limpeza da quarentena por rota de cron diária protegida por segredo (a confirmar os limites do plano da Vercel); o script continua como execução manual | Nada roda a limpeza hoje |
| M4-9 | UX: aviso sobre rostos, placas e documentos **antes** de escolher a foto; aviso de que fechar a página perde as fotos não enviadas (o relato fica salvo); envio de todas com resumo "2 de 3 enviadas"; o campo "o que a foto mostra" continua obrigatório, com exemplo e a informação de que a equipe revisa o texto antes de publicar | Celular simples e 4G fraco; sem texto o moderador não consegue escrever o alt |

## 3. Aprovação e publicação (servidor no M4; telas do painel no M5)
- A aprovação mora numa rota `/api/admin/imagem` com sessão administrativa: **copia primeiro** a foto da quarentena para o bucket público (idempotente) e **só depois** chama `admin_moderar_imagem` com a sessão do administrador; na remoção, vira o estado primeiro e apaga o arquivo depois.
- `admin_moderar_imagem` passa a receber `p_descricao_publica` (obrigatória ao aprovar) e o resultado de um checklist (registrado no histórico).
- O registro de aprovação é imutável (histórico somente-inserção).

## 4. Travas antes de publicar qualquer foto (não são código)
A flag permanece desligada em qualquer ambiente com dado real até que existam: responsável pelo tratamento definido; avaliação de impacto à privacidade; política de revisão humana com checklist (rosto, menor, placa, número de residência, documento, agressão; na dúvida, rejeitar); definição de como tratar rostos e placas (corte ou borrão antes de publicar); canal público de retirada com prazo e purga da quarentena e das cópias; aviso ao cidadão de que a legenda também é pública; e identificação pública da organização responsável.

## 5. Escopo e ordem
O M4 é um marco só: M4-1 a M4-9, mais a aprovação do §3 (rota de servidor, função administrativa com alt público e
checklist, cópia para o bucket público) e a limpeza agendada. As telas do painel administrativo (fila, detalhe, botões)
são o M5; até lá a aprovação é exercitada por testes e por um usuário administrador fictício no staging.

## 6. Critérios de pronto do M4
1. Com `FOTOS_HABILITADAS` ausente ou desligada: `/api/imagem` devolve 503 e o formulário não mostra fotos (teste).
2. `v_imagens_publicas` não expõe caminho nenhum; o teste de colunas falha se isso mudar.
3. Variar o contexto não gera arquivo novo; um segundo envio idêntico no mesmo slot não reprocessa a imagem.
4. O limite de fotos é independente do de acompanhamento (teste).
5. Aprovar exige texto alternativo público e checklist; a função antiga sem esses campos não existe mais; sem papel administrativo, nada passa (teste e mutação).
6. A rota de aprovação copia antes de virar o estado e é idempotente; a remoção vira o estado antes de apagar o arquivo (teste, inclusive com falha injetada entre os passos).
7. Uma foto aprovada aparece em `/problema/[id]` com o texto alternativo público; uma não aprovada nunca aparece.
8. Ciclo completo real no staging fictício (registrar, enviar foto, aprovar, ver, remover, limpar), sem deixar objeto no Storage.
9. A limpeza da quarentena roda por rota agendada protegida por segredo e por script manual, com o mesmo formato de caminho.
10. Testes, `db:test`, `typecheck`, `lint`, `build` e `contrato:staging` limpos.

## 7. Riscos abertos
- Coletar fotos em quarentena já é tratamento de dados; por isso a flag fica desligada em qualquer ambiente com dado real.
- Tratamento de rostos e placas (corte/borrão) ainda sem desenho técnico.
- A corrida entre a limpeza e o reenvio de um arquivo idêntico após 24 horas (janela pequena; o script só apaga objetos sem linha no banco).
- Limites de cron e de corpo na Vercel a confirmar.

## 8. Ataques do debate e decisões incorporadas

- **Cópia pública antes da aprovação:** o bucket público entrega os bytes diretamente; esconder a linha na view não protege uma cópia já feita. A rota deve validar papel e sessão antes de qualquer chamada com `service_role`; se a RPC falhar depois da cópia, tentar compensar apagando o objeto e deixar uma reconciliação para cópias públicas órfãs. O teste de falha deve tentar `GET` no caminho público e comprovar que a compensação o torna indisponível. A janela entre cópia e compensação continua um risco explícito desta ordem, a validar antes da implementação.
- **Retry idêntico e `sharp`:** calcular hash dos bytes de entrada antes de chamar `prepararImagem`; consultar a identidade do relato/slot/hash bruto para reconhecer retry sem recodificar. Guardar também o hash do JPEG normalizado para identificar o objeto. A variação de `contexto` não cria outro objeto; enquanto pendente, o retry atualiza apenas `descricao_contexto` e reutiliza o mesmo ID/caminho. A unicidade e a serialização no banco continuam obrigatórias para duas chamadas simultâneas.
- **Contrato de publicação:** `v_imagens_publicas` só inclui imagem aprovada com `descricao_publica` e ocorrência publicável. O contrato público só fornece o UUID usado para montar `<id>.jpg`; não fornece caminhos de Storage nem a legenda privada.
- **Retenção:** o cron de órfãos não é política de retenção. A limpeza M4 deve apagar da quarentena objetos sem linha após 24h e, ao remover uma imagem, apagar as cópias pública e privada após a mudança de estado. Purga de fotos rejeitadas/retidas que continuam referenciadas depende de prazo de retenção definido antes de qualquer dado real; o ciclo de staging deve verificar remoção total.
- **UX em resposta ambígua:** preservar seleção e estado por foto; distinguir “não foi possível confirmar” de falha certa, oferecer retry idempotente e manter visíveis as confirmações individuais quando outras fotos falharem. O aviso de que o relato permanece salvo só aparece após confirmação do registro.

## 9. Sequência de implementação e arquivos

Executar as tarefas abaixo na ordem. Cada tarefa termina com sua validação direcionada; a integração real usa exclusivamente o projeto Supabase de staging fictício. Não habilitar a flag em produção nem em qualquer ambiente com dado real.

### Tarefa 1 — Flag e configuração segura

**Arquivos:** `src/lib/registro/servidor.ts`, `src/app/api/imagem/route.ts`, `src/app/registrar/page.tsx` e seus testes existentes; `.env.example`.

- Definir `FOTOS_HABILITADAS` como habilitada somente quando o valor for explicitamente `true`; ausente, inválido ou falso mantém o recurso desligado.
- Responder 503 antes de ler/processar o corpo quando a flag estiver desligada; não renderizar a etapa de foto no formulário.
- Validar com `npm test -- src/app/api/imagem src/app/registrar` e `npm run typecheck`.

### Tarefa 2 — Identidade, limite e processamento de upload

**Arquivos:** `src/app/api/imagem/route.ts`, `src/lib/registro/imagem.ts`, `src/lib/registro/imagem.test.ts`, `db/011_imagens_resilientes.sql` (migração corretiva nova, sem editar migração já aplicada) e testes de banco.

- Validar token e estado do relato, verificar slot e aplicar limite próprio de fotos antes de `prepararImagem`; o limite de acompanhamento não conta como limite de upload.
- Usar hash dos bytes recebidos para retry pré-`sharp`, reutilizar ID/caminho para o mesmo relato, slot e bytes, e manter a unicidade transacional do slot para concorrência. Atualizar somente o contexto privado quando o registro ainda estiver pendente.
- Limitar concorrência/cache do `sharp`; cobrir bomba de pixels, PNG de 24 MP, corpo sem `Content-Length`, slot ocupado, retry com contexto alterado e dois uploads concorrentes.
- Validar com `npm test -- src/lib/registro/imagem.test.ts src/app/api/imagem` e `npm run db:test`.

### Tarefa 3 — Contrato SQL e leitura pública

**Arquivos:** nova migração SQL em `db/`, testes em `db/tests/run-pglite.mjs`, contrato de dados e leitura de `src/app/problema/[id]/page.tsx` e testes da página.

- Criar `descricao_publica`, restringir sua escrita à função administrativa, remover `caminho_storage` da view e filtrar para imagem aprovada com descrição pública e relato publicável.
- Fazer a página montar o URL público a partir do ID e do bucket/host permitido, usando apenas `descricao_publica` como `alt`; nunca derivar `alt` de `descricao_contexto`.
- Testar exatamente as colunas públicas e a ausência de fotos pendentes, removidas ou ligadas a relato não publicado.
- Validar com `npm run db:test` e `npm test -- 'src/app/problema/[id]'`.

### Tarefa 4 — Moderação administrativa e consistência Storage/DB

**Arquivos:** nova rota `src/app/api/admin/imagem/route.ts`, função/migração administrativa em `db/`, testes da rota e testes SQL; `docs/desenho-geral.md` para atualizar a ordem que hoje contradiz este plano.

- Rejeitar sessão sem papel antes de usar `service_role`; exigir decisão, checklist estruturado e `p_descricao_publica` não vazia ao aprovar. Revogar a assinatura antiga da função.
- Aprovação: cópia idempotente para `<id>.jpg`, depois RPC autenticada. Falha na RPC tenta apagar a cópia e deixa reconciliação segura. Remoção: RPC/estado primeiro, exclusões dos dois buckets depois; repetição deve completar exclusões pendentes.
- Registrar cada decisão em histórico somente-inserção; testar papel insuficiente, alt ausente, cópia repetida, falha entre etapas, GET público após compensação, corrida de aprovação/remoção e ausência de privilégios anônimos.
- Validar com `npm run db:test` e `npm test -- src/app/api/admin/imagem`.

### Tarefa 5 — Limpeza e agendamento

**Arquivos:** `scripts/limpar-quarentena.mjs`, nova rota cron em `src/app/api/cron/limpar-quarentena/route.ts`, configuração Vercel (`vercel.json`, se compatível com o plano contratado) e testes do script/rota.

- Compartilhar um único parser/validador de caminhos entre upload e limpeza; SQL deve validar a mesma gramática por contrato de teste, sem uma expressão divergente.
- Exigir segredo em comparação de tempo constante na rota; manter modo manual de simulação e `--apply`. Interromper em erro de consulta e conservar caminhos referenciados.
- Confirmar limite/plano do cron diário e tamanho de função/corpo antes de marcar a configuração operacional como concluída. Testar retenção de referenciados e remoção de órfãos com mais de 24h.
- Validar com testes do script/rota e `npm run contrato:staging`.

### Tarefa 6 — UX móvel e retry

**Arquivos:** fluxo de registro em `src/app/registrar/`, seus componentes e testes; `docs/design.md` para refletir os avisos de M4.

- Mostrar alerta de rostos, placas e documentos antes do seletor; avisar que fotos não enviadas se perdem ao fechar a página; exigir “o que a foto mostra”, dar exemplo e informar que a equipe revisa a descrição antes de publicar.
- Enviar até três fotos individualmente, conservar estado por foto e retry em falha ambígua, e mostrar contagem confirmada (“2 de 3 enviadas”). Não bloquear o relato por erro de foto.
- Validar confirmação do registro antes do aviso de persistência e testar sucesso parcial, navegação/fechamento e retry.
- Validar com os testes do formulário e `npm run lint`.

### Tarefa 7 — Integração real de staging e fechamento

**Arquivos:** novo teste de integração isolado em `scripts/` ou `src/`, `.env.example` e documentação operacional M4.

- No staging fictício, executar registrar → upload → aprovar → leitura pública → remover → limpar; incluir duplicado, slot ocupado e falhas injetadas. Apagar os objetos de teste em `finally`, inclusive quando houver falha.
- Impedir execução se o host/projeto não for o staging explicitamente permitido; nunca imprimir segredos. Guardar evidência de que os dois buckets não contêm objetos do teste ao final.
- Fechar com `npm test`, `npm run db:test`, `npm run typecheck`, `npm run lint`, `npm run build` e `npm run contrato:staging`.

## 10. Divergências e gates

- O documento `desenho-geral.md` §4 descreve atualmente RPC antes da cópia, enquanto este plano escolhe cópia antes da RPC. A divergência deve ser removida na Tarefa 4. A cópia antecipada cria uma janela de bytes publicamente acessíveis sem aprovação; se a equipe não aceitar esse risco após compensação e teste de falha, a ordem precisa ser redesenhada antes da implementação.
- O critério “não reprocessa” passa a significar que retry reconhecido pelo hash bruto não invoca `sharp`; o banco continua a decidir concorrência e unicidade.
- Nenhum cron de órfãos purga registros ainda referenciados. Política e prazo para retenção de imagens rejeitadas/retidas são gate externo para dados reais, junto das travas do §4.
- Limites do cron e corpo no plano Vercel, e atualização de migrations aplicadas no staging, permanecem gates operacionais antes de marcar M4 concluído.
