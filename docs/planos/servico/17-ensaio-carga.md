# Ensaio de capacidade do MVP na Vercel

Execute na janela aprovada, depois de o mesmo deployment Production concluir a jornada funcional pelo navegador. Use o ID `dpl_…` dessa revisão e um relato sintético público `[DEMO-MVP:…]` que exista no Supabase Production. Retire essa fixture de leitura após o ensaio pelo procedimento do ensaio integrado.

Configure o processo que vai executar o script.

| Variável | Valor |
| --- | --- |
| `MVP_TARGET` | `https://observatorio-go.vercel.app` |
| `MVP_PROJECT_REF` | `acxcqtknxjiwopdtjxoc` |
| `MVP_DEPLOYMENT_ID` | ID Production verificado pelo E2E |
| `MVP_DETAIL_ID` | UUID exato da fixture pública de leitura |
| `MVP_MUNICIPIO`, `MVP_CATEGORIA` | Slugs reais correspondentes à fixture |
| `MVP_PUBLISHABLE_KEY` | Chave publishable do Supabase Production, disponível no processo e omitida do relatório |
| `MVP_DEMO_ACCESS_CODE` | Código compartilhado de demonstração, fornecido apenas ao processo; não registrar nem incluir no relatório |
| `MVP_RAMP_MINUTES` | Minutos em 20 e 40 sessões, padrão 3 |
| `MVP_SOAK_MINUTES` | Minutos em cada patamar de 50 e 60 sessões, padrão 30 |
| `MVP_WRITE_COUNT` | Número de cadastros sintéticos durante o patamar 60, padrão 0 e máximo 3 |

Rode uma vez por janela de hora e verifique o saldo do limite de 10 cadastros/hora no IP de origem antes de habilitar escritas. O runner respeita o limite do aplicativo, spacing entre cadastros e mantém os tokens apenas em memória. A limpeza usa o token desta execução, o título de execução único, o protocolo e o UUID exatos.

```powershell
node scripts/load-mvp.mjs --execute
```

Para medir navegação pública sem criar ou alterar dados, use o perfil somente leitura:

```powershell
node scripts/load-mvp.mjs --execute-read-only
```

Esse perfil requer `MVP_TARGET`, `MVP_PROJECT_REF`, `MVP_DEPLOYMENT_ID`, `MVP_DEMO_ACCESS_CODE` e os limites de duração; usa `goiania`/`vias` como filtro limitado por padrão, substituíveis por `MVP_MUNICIPIO` e `MVP_CATEGORIA`. Antes da rampa, faz um único `POST /api/demonstracao` para obter o cookie de acesso; não segue redirects, não imprime o código nem o cookie, e mantém ambos somente em memória. As sessões virtuais compartilham esse cookie stateless. Durante a medição, percorre home, lista, municípios, detalhe municipal, dados e exportação filtrada, sem criar ou alterar dados de negócio e sem consultar PostgREST diretamente. Se o runtime responder com Challenge, o runner encerra antes da rampa; não tente contornar a proteção. O perfil mede navegação no alias, mas não substitui as jornadas de cadastro, acompanhamento, participação ou moderação.

O cliente mantém até uma requisição em andamento por sessão e alterna entre home, lista, detalhe, página municipal e exportação filtrada. O relatório JSON registra o deployment, o ID da execução, vazão, p50/p95/p99 e contagens por classe e rota. Challenge e 429 interrompem a campanha sem reduzir as proteções. O relatório também acusa abortos por erro acumulado e eventual fixture cujo desaparecimento não pôde ser comprovado. Nesse caso, confira o ID/protocolo exato pelo console; mantenha a auditoria. O script evita seguir redirecionamentos.

O perfil concentra leituras e inclui até três cadastros com acompanhamento opcional. Cada cadastro exige que o protocolo e o título retornados pelo acompanhamento coincidam com a fixture. Um patamar de leitura aprovado demonstra capacidade para esse perfil. Valide participação e administração em uma jornada E2E separada e registre a concorrência desses fluxos como pendente de medição enquanto não houver carga representativa.

### Checklist do relatório

- Identificar deployment, horário, duração efetiva, número de sessões e se a fase foi interrompida. O mínimo do Plano 17 é 50 sessões por 30 minutos, com 60 como alvo preferido.
- Comparar o p95 de cada leitura pública com 2 s, o p95 dos envios, participação e ações administrativas com 3 s e o p99 com 5 s. Mostrar os valores medidos e as divergências por rota. Declarar quais fluxos ficaram fora da carga. Até três amostras de cadastro e acompanhamento só dão evidência pontual.
- Informar vazão, taxa de erro inesperado frente à meta de menos de 1%, timeouts, desafios, 429 e validações esperadas. Se a proteção impedir o cliente HTTP, apresentar o resultado de capacidade do alias como inconclusivo para este ensaio.
- Cruzar a jornada com a telemetria Vercel/Supabase e documentar a limpeza das fixtures. Registrar no Plano 17 o aceite funcional e de carga separadamente.

## Rajada somente leitura no deployment de 24/11/2026

**Resultado: 50 abas por 91,7 s em oito ondas, com capacidade sustentada ainda inconclusiva.** A CLI confirmou que o alias `observatorio-go.vercel.app` apontava para `dpl_6xdKpXhEkN21enesmWTV1fZRc4NS`, projeto `observatorio-go`, Production READY. O ref Supabase Production previamente confirmado é `acxcqtknxjiwopdtjxoc`. A campanha acessou somente o alias e não leu configuração secreta nem acessou o banco diretamente.

O navegador Brave abriu primeiro 20 abas. A tentativa de rampa retornou o inventário com 40 rotas e 10 abas em branco após um timeout da automação. Retomei as 50 abas já criadas e medi oito ondas completas das 10:43:50 às 10:45:22 BRT, totalizando 400 navegações com URL final esperada e zero títulos de Challenge ou erro do instrumento nessa amostra. As ondas foram espaçadas em 12–18 s, com cerca de 4,36 navegações por segundo na janela total. O tempo por navegação inclui o controle do browser, de `goto` ou recarga até a resolução da operação. O instrumento não expôs Navigation Timing nem status HTTP para cada aba. Todas as abas temporárias foram fechadas.

| Rota | Amostras | p50 (ms) | p95 (ms) | p99 (ms) |
| --- | ---: | ---: | ---: | ---: |
| `/` | 67 | 978 | 1.677 | 2.065 |
| `/problemas` | 68 | 842 | 1.581 | 1.864 |
| `/municipios` | 67 | 923 | 1.663 | 1.864 |
| `/municipios/goiania` | 66 | 1.219 | 1.663 | 1.863 |
| `/dados` | 66 | 854 | 1.567 | 2.065 |
| `/api/dados?municipio=goiania&categoria=infraestrutura` | 66 | 1.069 | 1.336 | 1.644 |

Os logs do mesmo deployment e janela retornaram 1.000 linhas no limite do comando, incluindo assets. Foram 127 HTTP 200 e 873 HTTP 304, todos com `wafAction=allow`. A consulta separada com filtro `httpStatus >= 400` retornou zero registros. A telemetria confirma ausência de 429/5xx na janela consultada e não atribui cada registro a uma sessão. Nenhuma fixture foi criada e nenhum dado foi escrito.

A automação interrompeu a execução em segundo plano entre chamadas, o que limitou a janela a oito ondas. O resultado cobre acessos públicos em um perfil e uma rede. Ficam pendentes 30 minutos sustentados, sessões independentes e o cenário misto com cadastro, acompanhamento, participação e moderação. As proteções permaneceram ativas.

## Navegação sustentada somente leitura em 24/11/2026

Em uma campanha separada no mesmo deployment, 50 abas ficaram abertas por 30 min 27 s. Foram 60 ondas de 10 recargas, totalizando 600 navegações no host esperado, sem falhas observadas nem Challenge. As rotas foram home, lista de relatos, municípios, Goiânia, dados e API de dados filtrada. A unidade concorrente a cada onda foi de 10 recargas em um navegador compartilhado. A campanha mede leitura pública com pausas e 50 abas abertas. Sessões de usuários independentes e o perfil misto com cadastro, acompanhamento, participação e moderação continuam fora dessa medição.

Uma onda teve tempo agregado de 6,64 s na automação. As últimas 100 medições individuais ficaram abaixo de 1,9 s. Os dois números medem unidades diferentes, e as 100 últimas amostras não sustentam um p95 para toda a campanha.

A Vercel retornou **9.995 registros de requisição** no deployment `dpl_6xdKpXhEkN21enesmWTV1fZRc4NS` entre `2026-11-24T13:55:08Z` e `2026-11-24T14:25:36Z`. A CLI retornou 16 janelas consecutivas de até dois minutos, todas com `hasMore=false` e zero intervalos excluídos. Houve 1.306 respostas HTTP 200 e 8.689 HTTP 304, todas com `wafAction=allow`. A consulta separada de toda a janela com `httpStatus >= 400` retornou um resumo válido com `recordsReturned=0`, `hasMore=false` e zero intervalos excluídos. Assim, a telemetria registrou zero HTTP 429 e zero HTTP 5xx. A contagem inclui assets e demais requisições do deployment na janela e não equivale às 600 navegações observadas no navegador.

## Perfil misto local com Supabase de staging em 24/11/2026

`scripts/load-mvp-staging.mjs --execute` executa um build Next em loopback e só aceita o ref `hvekgzxuciyewtybwads`. O runtime usa os mecanismos de autenticação, validação e limite do aplicativo e as [credenciais oficiais de teste do Turnstile](https://developers.cloudflare.com/turnstile/troubleshooting/testing/) para envios sintéticos. O perfil inicial manteve 50 loops com pausas de 12–15,5 s. Foram 38 loops de leitura pública, 6 de acompanhamento com tokens distintos, 3 de leitura administrativa com contas AAL2 distintas e 3 de leitura pública após a etapa de participação. Houve 6 cadastros e 3 confirmações em relatos sintéticos distintos antes dos loops de carga. A taxa dessas escritas é amostral.

Para a janela observada de 313,6 s, a vazão foi de aproximadamente 3,52 operações/s nos loops. As **1.103 chamadas** dos loops e as **9 operações preparatórias** listadas completaram sem erro HTTP inesperado ou timeout.

| Operação | Chamadas | p50 (ms) | p95 (ms) | p99 (ms) |
| --- | ---: | ---: | ---: | ---: |
| Seis rotas públicas, em loopback | 912 | 3–12 | 6–18 | 8–220 |
| Acompanhar por token | 128 | 357 | 1.897 | 2.584 |
| Fila administrativa AAL2 | 32 | 895 | 2.764 | 3.003 |
| Detalhe administrativo AAL2 | 31 | 740 | **4.191** | 4.352 |
| Cadastro sintético na preparação | 6 | 1.264 | 1.887 | 1.887 |
| Confirmação “Também me afeta” na preparação | 3 | 525 | 596 | 596 |

As seis ocorrências foram retiradas pelo titular e verificadas pelo ID exato com estado removido e zero tokens ativos. Ficou um evento de retirada por ocorrência, como previsto pela auditoria. As três contas AAL2 fictícias foram removidas e conferidas. Nenhum fluxo de foto ou objeto Storage foi usado. O p95 do detalhe administrativo excedeu o limite de 3 s apesar de todos os status estarem corretos. A rodada usa um runtime local com um único cliente de origem, não mede CDN/SSR hospedado na Vercel e não fecha o cenário misto sustentado de 30 minutos do MVP.

### Sonda administrativa isolada

No acumulado de `pg_stat_statements` antes da sonda, o SQL da RPC de detalhe teve média de 3,92 ms e máximo de 24,99 ms em 62 execuções. A fila teve média de 8,26 ms e máximo de 82,73 ms em 272 execuções. São tempos do banco, sem rede, e incluem a atividade anterior do staging.

A sonda de 120,1 s com duas sessões AAL2 autorizadas completou 46 leituras de fila e 44 de detalhe, todas HTTP 200. A fila ficou em p50 1.044 ms, p95 1.605 ms e p99 1.864 ms. O detalhe ficou em p50 1.020 ms, p95 1.575 ms e p99 1.703 ms. A sonda não reproduziu o p95 de 4.191 ms sob a carga mista inicial.

| Etapa remota | p95 fila (ms) | p95 detalhe (ms) |
| --- | ---: | ---: |
| Validação do usuário Auth | 440 | 446 |
| Consulta do papel ativo | 443 | 205 |
| Rate limit | 587 | 564 |
| RPC de dados | 637 | 633 |

As quatro chamadas remotas são sequenciais por requisição e a instrumentação local mediu tempo até os headers de cada chamada. No detalhe, as medianas por etapa foram 174, 173, 332 e 336 ms, cuja soma de 1.015 ms se aproxima da mediana de 1.020 ms vista no cliente de loopback. Essa comparação agregada não mede o residual de uma requisição individual e não localiza o outlier da primeira campanha. Os dados direcionados apontam o custo dominante no caminho remoto até o Supabase, distribuído entre as etapas. Mantive as checagens do handler.

A autenticação fictícia falhou em tentativas preliminares com HTTP 422 ao verificar o fator no Auth e HTTP 401 no fluxo local. O runner agora usa a referência de tempo do Auth e aguarda um próximo código para a segunda verificação do mesmo fator. A sonda retirou a fixture pelo ID, confirmou zero tokens e confirmações ativas e preservou o evento de auditoria. As duas contas fictícias foram removidas.

Para medir uma janela curta com o cenário misto atual, use `MVP_STAGING_MINUTES=2` e, para a execução sustentada, `MVP_STAGING_MINUTES=30`. O script exige `--execute` em ambos os casos. Execute as janelas em sequência para evitar sobrepor contas, escritas e limites do mesmo cliente de origem. O modo `--admin-only` usa duas sessões AAL2 e uma única ocorrência. O cenário misto destina três ocorrências distintas às sessões de participação, repete as ações com pausas para exercitar a deduplicação e fecha as manifestações no console antes de retirar os filhos sintéticos por ID. Revise o resumo final de erros e limpeza antes de aceitar o resultado.

### Ensaio sustentado com participação apenas na preparação

A versão anterior do runner sustentou 50 loops por 1.800,7 s em loopback com staging. Nas 6.571 chamadas medidas ao app, a vazão foi de 3,65 req/s e não houve falhas nem timeouts. A amostra exclui as chamadas de autenticação inicial, a instrumentação das chamadas ao Supabase e a retirada final.

| Operação | Amostras | p95 (ms) | p99 (ms) |
| --- | ---: | ---: | ---: |
| Seis rotas públicas, em loopback | 5.411 | 12–1.003 | 19–1.812 |
| Cadastro | 6 | 2.155 | 2.155 |
| Acompanhamento | 765 | 1.581 | 2.536 |
| Fila AAL2 | 190 | 2.276 | 2.930 |
| Detalhe AAL2 | 190 | 2.762 | 4.460 |
| Renovação AAL2 | 6 | 1.083 | 1.083 |
| Confirmação “Também me afeta” na preparação | 3 | 3.606 | 3.606 |

No detalhe, o p95 até os headers para Auth, papel, limite e RPC foi de 698, 496, 755 e 604 ms, respectivamente, em 193 amostras por etapa. Essas contagens incluem três consultas de preparação. As seis ocorrências foram retiradas com zero tokens e confirmações ativos e seis eventos de auditoria. O runner confirmou a remoção das três contas AAL2. A fila e o detalhe atenderam ao teto de 3 s nesta janela sem mudança no handler.

O ensaio permaneceu **parcial**: três loops fizeram leitura pública após a etapa de preparação. Só houve três confirmações pontuais, sem participação contínua, denúncias ou respostas na carga. Essa amostra de três inclui uma confirmação acima de 3 s. O perfil misto completo e a Vercel Production continuam fora do aceite desta rodada.

### Janela curta com participação recorrente

A execução de 120,6 s distribuiu 50 loops entre leituras públicas, três titulares com tokens distintos, três participantes com ocorrências publicadas distintas e três moderadores AAL2. Os outros três loops assumiram leitura pública nesta janela, que limitou a preparação a três cadastros para respeitar o orçamento por origem. O trio de participação alternou confirmação, denúncia, direito de resposta, detalhe e lista. As denúncias e respostas permaneceram na fila até o encerramento, e a repetição exerceu a deduplicação.

| Operação | Amostras | p95 (ms) |
| --- | ---: | ---: |
| Seis rotas públicas | 389 | 17–46 |
| Cadastro | 3 | 1.271 |
| Acompanhamento | 26 | 1.345 |
| “Também me afeta” | 6 | 998 |
| Denúncia | 6 | 1.733 |
| Direito de resposta | 4 | 1.215 |
| Detalhe público da fixture | 3 | 243 |
| Fila AAL2 | 14 | 2.783 |
| Detalhe AAL2 | 11 | 1.530 |

Foram 462 requisições medidas ao app e zero erros inesperados. Na amostra correlacionada do runtime local, o p95 do tempo restante após descontar as quatro esperas remotas até os headers ficou em 9 ms na fila e 42 ms no detalhe. Os dados reforçam a predominância do caminho remoto nessa janela e não justificam alterar controles de Auth, papel ou limite.

O runner confirmou que as respostas pendentes não estavam na view pública. Encerrou as manifestações pela interface administrativa, retirou seis linhas filhas pela identidade exata e retirou os três relatos por token. A verificação encontrou zero relatos publicados, zero tokens e zero confirmações ativos para os IDs do ensaio, além de três eventos de retirada preservados. As três contas AAL2 foram removidas. Nenhuma revisão ou limpeza ficou inconclusiva.

### Cobertura restante para comparar com o Plano 17

- A janela sustentada no staging usa seis titulares e três moderadores. Ela intercala o detalhe de uma fixture nas rotas públicas e executa uma decisão versionada por moderador em três ocorrências sintéticas distintas depois do aquecimento. Esse perfil amostra escrita administrativa sem criar uma disputa entre moderadores pelo mesmo relato.
- A janela local usa publicações aprovadas pelo console, pois a regra de publicação imediata textual é de Production. A validação de visibilidade e de retirada em até 5 s no alias continua uma prova separada.
- A carga Vercel disponível para comparação é somente leitura. O cliente HTTP recebeu Challenge no preflight. A janela no Brave teve 50 abas abertas, com dez em recarga a cada onda. Portanto, combinar métricas locais e do navegador não equivale a medir o perfil misto de 50 sessões na Vercel.
- Antes da rodada sustentada nova, `pg_stat_database` mostrou dez backends abertos, limite de 60 conexões e zero deadlocks acumulados no staging. São valores pontuais. CPU, pico de conexões e consumo de funções da Vercel requerem telemetria do ambiente em que a carga for executada.

### Ensaio sustentado com o perfil misto completo no staging

De **15:33:06,940 a 16:03:08,062 BRT** em 24/11/2026, o runtime Next em loopback, conectado exclusivamente ao ref `hvekgzxuciyewtybwads`, sustentou 50 sessões virtuais por 1.801,1 s. Foram 38 leitores, seis titulares com tokens distintos, três participantes com uma ocorrência exata cada e três moderadores com sessões AAL2 independentes. Foram medidas **6.569 chamadas ao aplicativo (3,65 req/s), todas com os status e contratos esperados**, sem timeout, HTTP 429 ou HTTP 5xx. O ensaio usa uma origem de rede e requisições HTTP de Node, sem browser/CDN/Vercel.

| Operação | Amostras | p50 (ms) | p95 (ms) | p99 (ms) |
| --- | ---: | ---: | ---: | ---: |
| Início | 723 | 13 | 24 | 345 |
| Lista de relatos | 792 | 10 | 200 | 484 |
| Municípios | 726 | 11 | 15 | 22 |
| Município Goiânia | 722 | 7 | 11 | 13 |
| Dados | 720 | 10 | 200 | 319 |
| API de dados filtrada | 722 | 3 | 9 | 247 |
| Detalhe de relato público | 787 | 8 | 12 | 203 |
| Cadastro | 6 | 1.151 | 2.660 | 2.660 |
| Acompanhamento | 767 | 423 | 1.510 | 2.921 |
| “Também me afeta” | 72 | 725 | 2.143 | **5.054** |
| Denúncia | 72 | 820 | 2.630 | 4.333 |
| Direito de resposta | 72 | 805 | 1.559 | 2.735 |
| Fila AAL2 | 191 | 844 | 2.701 | 4.831 |
| Detalhe AAL2 | 188 | 826 | 2.337 | 4.350 |
| Moderação versionada | 3 | 1.069 | 1.397 | 1.397 |
| Renovação de sessão AAL2 | 6 | 589 | 875 | 875 |

**Resultado: aceites de duração, perfil, p95, erro e limpeza cumpridos no staging. O teto p99 de 5 s falhou em “Também me afeta” por 54 ms.** Com 72 amostras e cálculo por ordem, o p99 desta rota coincide com a maior latência observada. O runner reportou o desvio e encerrou com código 1 após o cleanup. O ensaio não registrou o tempo de cada etapa da requisição de confirmação mais lenta, então a causa dessa cauda específica continua indeterminada. Cadastro, moderação versionada e renovação têm poucas amostras e só dão evidência pontual de latência.

O p95 do tempo residual correlacionado no runtime, após descontar as quatro esperas remotas até os headers, foi de 7 ms na fila e 6 ms no detalhe. Os p95 das quatro etapas remotas foram, na ordem Auth/papel/limite/RPC, 516/447/773/1.008 ms na fila e 553/564/727/606 ms no detalhe. Não se somam percentis por etapa para estimar o percentil total. Os snapshots agregados do banco registraram 10, 11 e 11 conexões abertas antes, durante e depois, com limite de 60 e zero deadlocks acumulados. Esses snapshots não medem pico de conexões, utilização de CPU ou erros atribuíveis somente à campanha.

O runner fez a retirada definitiva das seis ocorrências por token, conferiu pelo ID ausência na projeção pública, zero tokens e confirmações ativas e preservou seis eventos de retirada. As respostas pendentes ficaram fora da view pública. As seis linhas filhas exatas foram encerradas em sessão AAL2 e retiradas pelo ID, após a retirada do relato. As três contas fictícias foram removidas e conferidas. Nenhuma limpeza ou revisão ficou inconclusiva. O ensaio não exercitou disputa de moderação sobre o mesmo registro nem a publicação textual imediata em Production, e nenhuma medição de staging substitui o aceite de carga mista no alias.

Uma conferência independente em SQL read-only no staging, pela interseção da janela de criação e dos eventos de retirada, encontrou seis ocorrências removidas, seis eventos de retirada, seis eventos de revisão e zero tokens, confirmações, denúncias ou respostas remanescentes. Foi preciso considerar a diferença de cerca de 33 s entre o relógio local e o servidor. A função de visibilidade da view pública não é executável pelo papel dessa consulta CLI. A comprovação da projeção pública permaneceu a leitura por ID do runner.

O classificador agora usa uma lista explícita de leituras para aplicar o teto p95 de 2 s. As demais operações têm teto p95 de 3 s, e todas têm p99 de 5 s. A versão executada já registrou 3 s como teto p95 de `afeta`, cujo rótulo era `afeta` e não o caminho da API. A mudança evita que uma alteração futura de rótulo para `/api/afeta` aplique por engano o teto das leituras. Ela não muda o veredito da rodada. A instrumentação preservada só decompõe fila e detalhe, portanto não há medição por etapa para a confirmação de 5.054 ms. Nenhuma otimização foi aplicada sem evidência dessa causa.

### Redução de uma chamada no POST de confirmação

Uma alteração local retirou a consulta ao agregado da view pública que o POST `/api/afeta` aguardava depois da RPC. A confirmação nova e a repetida recebem o mesmo HTTP 202 e o corpo genérico. O cliente mostra o aceite, pede a atualização do detalhe e apresenta o total canônico devolvido pelo servidor. Isso evita duplicar a contagem num retry sem retornar ao navegador se a ação foi deduplicada.

Os testes direcionados comprovaram o 202 uniforme, a invalidação só após inserção, a ausência da consulta adicional e a atualização do componente quando a nova leitura chega. O runner confere a persistência e a deduplicação uma vez pelo ID exato antes da retirada. A remoção de uma espera do POST não prova que ela causou a amostra mais lenta. O ensaio original continuou com p99 de **5.054 ms**, 54 ms acima do teto; a medição posterior de 30 minutos está registrada abaixo.

### Soak sustentado após remover uma RPC sem efeito de denúncia/resposta — 24/11/2026

O ensaio anterior de 50 sessões mediu p99 de denúncia em **6.138 ms**, acima do teto de 5 s. A leitura do fluxo mostrou uma chamada sequencial a `triagem_sinais` antes do registro. A rota descartava os dois sinais retornados; o endpoint não os armazenava nem os mostrava à equipe. Mantive a triagem do cadastro em `/api/registrar`, onde o contrato consome seus sinais, e retirei apenas essa chamada consultiva sem efeito das rotas de denúncia e resposta. Limite por origem, Turnstile, deduplicação por ocorrência/origem, resposta neutra e revisão humana permanecem iguais.

O teste de regressão foi executado antes da implementação e falhou como esperado: denúncia e resposta devolviam 503 quando a RPC descartada falhava. Depois da remoção, passaram os 31 testes de `participacao-http.test.ts`, ESLint direcionado e typecheck. O ensaio completo, conectado exclusivamente ao staging `hvekgzxuciyewtybwads`, foi executado das **22:31:04 às 23:01:04 BRT**, por **1.800,6 s com 50 sessões**. Houve zero erros HTTP/backend, zero operações fora dos limites e nenhuma limpeza inconclusiva.

| Operação | Amostras | p50 (ms) | p95 (ms) | p99 (ms) |
| --- | ---: | ---: | ---: | ---: |
| Início | 724 | 14 | 24 | 445 |
| Lista de relatos | 794 | 11 | 19 | 250 |
| Municípios / Goiânia | 1.446 | 7–12 | 11–17 | 19–22 |
| Dados / API filtrada | 1.442 | 3–10 | 8–21 | 269–308 |
| Detalhe público sintético | 786 | 8 | 12 | 219 |
| Cadastro | 6 | 942 | 1.510 | 1.510 |
| Acompanhamento | 771 | 379 | 1.077 | 1.810 |
| “Também me afeta” | 74 | 504 | 1.203 | 2.352 |
| Denúncia | 72 | 493 | 1.117 | 1.941 |
| Direito de resposta | 72 | 495 | 1.104 | 1.468 |
| Fila AAL2 | 192 | 811 | 1.990 | 2.986 |
| Detalhe AAL2 | 191 | 741 | 1.683 | 3.249 |
| Moderação versionada | 3 | 874 | 889 | 889 |
| Renovação AAL2 | 6 | 663 | 811 | 811 |

A denúncia melhorou **4.197 ms no p99** em comparação com a execução anterior, e agora está abaixo do teto. O p99 de “Também me afeta” também ficou abaixo do limite (2.352 ms). A fila e o detalhe AAL2 ficaram abaixo de 3 s no p95 e de 5 s no p99. Cadastro, moderação e renovação têm poucas amostras e representam evidência de jornada, não percentis estáveis.

O runner retirou seis relatos com seis eventos de auditoria, encerrou e retirou seis participações, e removeu as três contas fictícias AAL2. A consulta SQL independente encontrou seis relatos em estado removido, seis eventos de exclusão e zero tokens, confirmações, denúncias, respostas ou imagens remanescentes. Uma execução anterior desta retomada perdeu o canal de terminal perto do limite de 30 minutos e deixou seis itens temporários ativos; eles foram identificados pelo marcador único e por uma allowlist exata, fechados por moderador AAL2 e removidos/revogados. Essa execução interrompida não foi usada como evidência de capacidade.

**Limite da evidência:** o runtime medido é Next local ligado ao Supabase staging, numa origem de rede e com 50 VUs HTTP. O resultado comprova a jornada mista do aplicativo e do banco no staging. Não é carga mista pela Vercel Production, não mede redes independentes ou 60 sessões e não registra CPU/pico de conexões do provedor. O soak de 50 abas no alias segue como evidência separada de leitura no caminho Vercel.

### Rajadas repetidas de 50 navegações no alias Production — 25/11/2026

- Alvo `observatorio-go.vercel.app`, deployment `dpl_ABdZMfXy4ti9Fmpz3dNRcLti8zRP` em estado `READY` e SHA `dfecc31397a3bad28c2211671a6ee0cdffc9380d`, confirmados por `vercel inspect` e `vercel ls`.
- O Brave fez rampa com cinco e vinte navegações, seguida de cinco ondas de 50 chamadas concorrentes ao controle do navegador, distribuídas entre início, relatos, municípios, Goiânia, dados e API de dados filtrada (`goiania`/`vias`). Foram 275 navegações confirmadas na URL e no título previstos em 75,3 s (00:07:44–00:08:59 BRT), sem Challenge visível. As ondas de 50 começaram entre 00:08:08 e 00:08:55 BRT. O navegador compartilhou perfil, rede e cache entre as abas.
- A Vercel retornou 3.371 registros no mesmo deployment e host entre `03:07:44Z` e `03:09:00Z`, incluindo assets e prefetch. Todos foram GET e `wafAction=allow`: 250 respostas HTTP 200, 3.121 HTTP 304, zero 429 ou 5xx. A paginação informou `hasMore=false` e zero intervalos excluídos. A CLI não expôs duração por requisição. Para as cinco ondas de 50, a duração do lote no instrumento incluiu controle e conferência do inventário das abas, com p50 4.311 ms e p95/p99 5.004 ms (n=5, mesma amostra máxima nos dois percentis). Esses números não são percentis de latência HTTP por navegação ou rota.
- A extensão do ensaio excedeu o limite do instrumento e derrubou a sessão de automação. O reinício não enumerou nenhum navegador controlável, portanto as ondas sem retorno ficaram fora da amostra e o fechamento das abas temporárias não pôde ser verificado. A campanha comprova cinco rajadas de leitura na versão publicada e não comprova 30 minutos com 50 clientes independentes nem escrita mista. Nenhuma fixture, POST ou alteração de WAF foi realizada.

### Janela de telemetria de Production após a última publicação — 25/11/2026

- O alias `observatorio-go.vercel.app` apontou para o deployment Production `dpl_BpmTqQY2PaU8UfPQwUF9vfwnAWGQ`, `READY`, SHA `14d0bc411c4c77764992d9902270fcb353da7b6e`, por `vercel inspect` e `vercel ls`. O runner `scripts/load-mvp.mjs --execute-read-only` usa seis rotas existentes e exige `/api/saude` com origem confirmada antes da rampa. Seu perfil padrão roda 20, 40, 50 e 60 sessões e não oferece seleção exclusiva do patamar de 50.
- Uma única leitura HTTP direta em `/api/saude` às 00:31:46 BRT retornou 429 com `x-vercel-mitigated: challenge` e a página Vercel Security Checkpoint em 113 ms. A medição é do desafio e não da aplicação. O WAF encerrou a tentativa antes da rampa. O ensaio anterior de cinco rajadas no navegador já cobre esse caminho de leitura sem bypass e não foi repetido.
- Como evidência independente, consultei o registro de requisições da Vercel no intervalo `03:02:00Z`–`03:32:00Z`, restrito ao deployment. A resposta incluiu 204 registros em todos os hosts, sem paginação pendente ou intervalos excluídos. No alias público, houve 141 GETs: 90 HTTP 200, 50 HTTP 304 e um HTTP 429 em `/api/saude`, com `wafAction=challenge`; zero 5xx entre os GETs. O total inclui recursos e navegação natural. A CLI não fornece latência de servidor nesses registros, portanto não é possível calcular p50/p95/p99. A janela não comprova concorrência nem um soak de 50 sessões. Esta retomada fez apenas a leitura HTTP direta e consultas à CLI, sem POST ou fixtures.

### Retomada — sessão de demonstração e preflight Production — 26/11/2026

- O alias `observatorio-go.vercel.app` apontou para o deployment Production `dpl_2tZb9yKb1odB7NW17xkkAF9yBG8s`, `READY`, no projeto `observatorio-go` confirmado pela CLI Vercel autenticada.
- Na sessão real do navegador que já tinha o código de demonstração, `GET /api/saude` retornou HTTP 200 com `aplicacao=ok`, `banco=ok` e `origem_confirmada=true`. A página `/registrar` carregou a etapa 1 de 4 e as condições de publicação; não preenchi nem enviei relato. `/dados` carregou 1.620 relatos identificados como fictícios. Nenhum write, fixture ou alteração de configuração foi feito.
- `scripts/load-mvp.mjs` agora aceita `MVP_DEMO_ACCESS_CODE`, obtém a sessão temporária com um POST de entrada, valida o redirecionamento e os cookies `HttpOnly`, `Secure` e `SameSite=Strict`, mantendo código e cookies em memória. O perfil de navegação não grava dados de negócio. A documentação foi alinhada para dizer isso explicitamente.
- A tentativa de usar o runner Node direto não chegou ao app: a Vercel registrou três POSTs em `/api/demonstracao`, todos `HTTP 429` com `wafAction=challenge` e agente `node`, entre 20:48Z e 20:49Z. Isso não valida nem invalida o código nem o runtime da rota; o WAF interrompeu o tráfego antes da aplicação. Não contornei a proteção e não iniciei carga.
- A suíte direcionada de `scripts/load-mvp.test.mjs` passou (10 testes). ESLint direcionado passou. O soak de 50 sessões por 30 minutos no alias continua pendente; a evidência de 50 sessões no staging e a navegação em navegador de 50 abas não substituem o perfil exigido pelo Plano 17.

### Jornada pública sintética e URL do alias — 26/11/2026

- A Vercel CLI autenticada confirmou a equipe e o projeto `observatorio-go` (`prj_5c7PyLdrz6B3gPX4rN7oPUS1GN28`). Em execução isolada do diretório do repositório, a URL Production correspondeu ao ref aprovado (`ref_matches=true`), `SUPABASE_PRODUCTION_DATA_APPROVED=true`, registro beta textual e publicação imediata estavam habilitados, a publicação estava em `moderar_tudo`, a proteção beta e a participação protegida estavam ligadas, `AFETA_HABILITADO=true` e `FOTOS_HABILITADAS=false`. O health do runtime já tinha confirmado `banco=ok` e origem confirmada. O CLI não consegue puxar quatro Secrets Production; não inferir presença/valor deles pelo resultado de `vercel env run`.
- No navegador com cookie da demonstração, a home exibiu relatos recentes e indicadores fictícios claramente marcados (1.620 registros gerados). O formulário atravessou as quatro etapas sem dados pessoais. Foi enviado um único relato de demonstração, com texto inteiramente fictício, e a lista e o detalhe público mostraram imediatamente título, Goiânia e protocolo `OG-26-81D76BA7`; UUID público `2e6d522c-02a4-417e-9433-0df5859b2501`. Não houve foto, contato nem email.
- **Fixture Production ainda ativa:** deixei o formulário de sucesso para verificar a lista/detalhe em outra navegação e perdi o estado efêmero que continha o link privado. O registro continua na projeção pública; não houve evento de retirada. A retirada deve ser concluída somente pelo link do titular ou por sessão administrativa AAL2, e a auditoria precisa ser conferida. Não tentar remoção SQL direta nem tratar a fixture como limpa.
- O detalhe mostrou participação habilitada (“Também me afeta”, denúncia e direito de resposta) e informou que o compartilhamento depende de URL pública. Como o usuário adiou domínio personalizado, adicionei somente em Production `NEXT_PUBLIC_SITE_URL=https://observatorio-go.vercel.app`, tipo Config. Essa variável ainda requer novo build/deployment para surtir efeito; nenhum domínio/alias foi alterado. A checagem da próxima revisão deve confirmar metadata canonical/OG e o link de compartilhamento no alias.
- O acesso administrativo continua exigindo credenciais e TOTP/AAL2; nenhuma conta administrativa foi criada ou usada nesta jornada. A fila/moderação e o ciclo de revisão de foto em Production continuam sem verificação; fotos permanecem desligadas enquanto o gate jurídico/operacional não for aprovado.
- O ensaio sustentado de 50 sessões por 30 minutos no alias continua pendente. O POST de autenticação do runner Node é parado pelo Vercel WAF com `429 challenge`; não contornar o challenge. A amostra de 50 VUs no staging e as abas no navegador são evidências separadas e não satisfazem esse aceite.

### Retomada após publicação do alias e E2E de fotos no staging — 26/11/2026

- O commit `a94afa1094b7937a8175a88e7951ca2cbac71b17` está em `main` e `origin/main`. A Vercel confirmou o deployment Production READY `dpl_GWkAcCEqXfAcrMGMbFmGdoA6cRUy`, com o alias `observatorio-go.vercel.app`. A CI do mesmo SHA passou: typecheck, lint, testes unitários, PGlite, build e scanner do bundle.
- Após o novo build, o detalhe público do relato sintético retornou canonical `https://observatorio-go.vercel.app/problema/2e6d522c-02a4-417e-9433-0df5859b2501` e link do WhatsApp com essa mesma URL; a mensagem de compartilhamento indisponível desapareceu. Na home da sessão de demonstração, `[DEMO-SINTETICO-20261126] teste de cadastro de infraestrutura` aparece entre os relatos recentes.
- `node scripts/e2e-admin-staging.mjs --fotos-mvp` passou contra o staging confirmado `hvekgzxuciyewtybwads`: ciclo de fotos concluído, EXIF removido, limpeza Storage e do relato comprovada. O admin fictício atingiu o fluxo MFA/AAL2 e foi removido; o registro de auditoria mantém o evento com `admin_id` anonimizado por FK. As chaves Turnstile usadas eram somente as de teste; Production não foi tocado.
- Production continua com `FOTOS_HABILITADAS=false`. Não executar ciclo de fotos com dados Production até aprovação do gate jurídico/operacional. A jornada admin em Production segue sem sessão AAL2 autenticada neste navegador.
- **Resíduo a retirar:** o relato público sintético `OG-26-81D76BA7` permanece ativo porque o link privado efêmero não foi preservado antes da navegação de verificação. O registro, UUID e texto são fictícios e não contêm dados pessoais. A remoção auditada continua pendente; usar o link do titular ou sessão AAL2 legítima e conferir o evento antes de declarar a fixture limpa.
- O alias continua sem evidência de um soak sustentado atual de 50 sessões por 30 minutos. O E2E de staging e a CI aprovada não cobrem esse critério nem substituem sessões independentes na Vercel.
- Depois do novo deployment, uma rajada read-only abriu 50 páginas concorrentes em cinco rotas do alias: 50/50 terminaram na rota esperada, 50/50 reconheceram o cookie da demonstração e zero exibiram Challenge ou falharam na navegação. As páginas compartilharam um perfil de navegador, cookie e rede; a amostra não mediu latência de servidor nem duração sustentada. As 49 abas temporárias foram fechadas.

### Ensaio sustentado de navegação no alias Production — 26/11/2026

- No deployment Production `dpl_GWkAcCEqXfAcrMGMbFmGdoA6cRUy`, mantive 50 abas navegando durante **1.813 s (30 min 13 s)**. Foram 97 ondas de 50 navegações (4.850 navegações), alternando início, relatos, municípios, Goiânia, dados e o detalhe da fixture sintética. Cada aba fez uma navegação por onda, com pausa de 15 s entre ondas.
- As 50 chamadas de navegação concluíram em todas as 97 ondas; nenhuma URL final divergiu da rota atribuída. Amostras de DOM das seis rotas, recolhidas a cada bloco, não mostraram Challenge nem página de erro. Os tempos medidos pelo controle do navegador ficaram entre 1,36 s e 4,84 s por onda; esse intervalo inclui a orquestração das 50 abas e **não é latência HTTP individual nem percentil por rota**.
- A consulta paginada `vercel logs requests`, filtrada pelo deployment, pelo host `observatorio-go.vercel.app` e por `GET`, retornou 10.000 registros no intervalo da Vercel **21:39:11Z–22:14:11Z**. Foram 963 HTTP 200 e 9.037 HTTP 304; os 10.000 registros observados tiveram `wafAction=allow`. A continuação da paginação não trouxe registros. A janela contém assets e prefetch além das navegações, portanto não se atribui uma requisição por registro nem se calculam percentis HTTP a partir dela.
- Não foram observados 429 ou 5xx nos registros retornados. A consulta de `function-invocations` não devolveu linhas ou resumo utilizável; CPU, memória de pico e duração individual do servidor permanecem sem evidência nesta campanha.
- O navegador usou **um perfil, uma rede e o mesmo cookie compartilhado** em todas as abas. O ensaio comprova 50 páginas concorrentes com navegação repetida pela Vercel por mais de 30 minutos; não comprova 50 identidades/cookies independentes, tráfego de origens distribuídas, escrita mista ou p95/p99 do servidor. Não contorna WAF e não faz POSTs de negócio.
- Após o ensaio, as 49 abas temporárias foram fechadas e a aba original voltou à home, ainda acessível pela sessão de demonstração.

### Tentativa de retirar a fixture sintética em Production — 26/11/2026

- A conta temporária de moderador criada para a tentativa foi removida: a equipe voltou a exibir somente o superadmin que já existia antes, e uma busca pelo marcador `production_synthetic_mvp_test` no Auth encontrou zero contas. Não foi lida nem exposta a identidade do administrador existente.
- Na primeira tentativa, a remoção não foi concluída: a view ainda retornava a fixture e não havia evento comprovado. A leitura de OpenAPI pela raiz do PostgREST retornou somente uma rota e não provou que as RPCs administrativas estivessem ausentes. A retomada descrita abaixo concluiu a retirada pelo fluxo administrativo e confirmou a auditoria por consulta somente leitura.

### Retirada auditada da fixture em Production — 26/11/2026

- Antes da ação, o GET da view pública confirmou o protocolo `OG-26-81D76BA7`, o título com o marcador `[DEMO-SINTETICO-20261126]` e o UUID exato `2e6d522c-02a4-417e-9433-0df5859b2501`. A verificação recusaria continuar se qualquer identificador divergisse.
- Foi criada uma conta de moderador fictícia e efêmera no Auth Production, vinculada à equipe e autenticada com TOTP. O JWT foi verificado em memória para o `sub` esperado e `aal=aal2`. Nenhum email real, dado pessoal ou foto foi usado.
- Com esse JWT AAL2, a função `admin_detalhar_ocorrencia` confirmou protocolo, título, UUID, versão e estado publicado; em seguida, `admin_remover_ocorrencia_com_imagens` foi chamada com a versão esperada e motivo de retirada da fixture. O GET seguinte em `v_ocorrencias_publicas` retornou zero linhas para o UUID.
- A conta temporária foi removida e sua ausência na equipe e no Auth foi confirmada. O endpoint `admin_listar_auditoria` respondeu 403 ao perfil moderador porque exige gestor; não se repetiu a mutação. A confirmação independente, por uma consulta SQL `READ ONLY` restrita ao UUID, retornou `removed_rows=1`, `remove_events=1`, `anonymized_remove_events=1` e `remaining_temp_admins=0`.
- Resultado: fixture fora da projeção pública, estado persistido como removido, um evento `remover` preservado com `admin_id` anonimizado após a remoção da conta fictícia. Nenhuma foto ou objeto Storage estava associado. A operação usou o RPC administrativo com JWT AAL2; a confirmação de auditoria no console web Production continua sem teste de ponta a ponta nesta sessão.
