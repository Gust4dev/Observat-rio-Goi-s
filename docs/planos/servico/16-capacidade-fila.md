# Plano 16 — Capacidade da fila administrativa

Em 2026-11-21, a migration 025 foi confirmada no Supabase `hvekgzxuciyewtybwads`, usado como staging do Observatório. O cliente da prova usou uma conta fictícia de moderador com sessão AAL2 confirmada. As chamadas de cada lote foram disparadas em paralelo pelo PostgREST, com 12 s de timeout por requisição. As latências incluem cliente, rede, gateway, pool e banco.

| Operação | Chamadas concorrentes | Resultado | p50 | p95 | p99 | Vazão |
| --- | ---: | --- | ---: | ---: | ---: | ---: |
| Reter o mesmo relato com versão esperada 1 | 25 | 1 HTTP 204 e 24 HTTP 409 `PT409` | 2.035 ms | 3.778 ms | 3.965 ms | 6,30 req/s |
| Paginar a fila, até 100 itens por página | 50 | 50 HTTP 200 com resposta válida | 7.948 ms | 11.641 ms | 11.961 ms | 4,18 req/s |

Os dois lotes se sobrepuseram. A vazão conjunta foi de 6,27 req/s, sem timeout ou erro inesperado. O relato em disputa ficou retido, na versão 2, com exatamente um evento de decisão. O handler da aplicação mapeia `PT409` para `estado_desatualizado` e o teste focado existente cobre esse mapeamento. A rodada remota mediu o PostgREST.

A travessia anterior ao lote misto devolveu 1.001 IDs distintos em 11 páginas, sem duplicatas, perdas ou registros de fora do recorte. Todos os registros compartilhavam o mesmo timestamp, exercitando o desempate por ID. O `EXPLAIN ANALYZE` do trecho seletivo de paginação usou `ocorrencias_fila_keyset_idx`, retornou 101 linhas e registrou 0,291 ms de execução e 1,820 ms de planejamento. Esse tempo descreve o trecho SQL isolado. O p95 de leitura no lote alcançou 11,641 s, perto do timeout, e limita a conclusão sobre capacidade interativa sob rajadas desse tamanho. A prova não separou tempo de conexão, fila do gateway, pool ou execução completa da RPC. Sem evidência de gargalo num índice ou na paginação, nenhuma mudança foi aplicada ao schema ou aos handlers.

Foram removidos 1.000 relatos de carga que não receberam decisões. O relato moderado foi anonimizado pela função de exclusão do titular. A consulta final comprovou zero fixtures ativas, zero tokens e um relato anonimizado com dois eventos preservados pela auditoria, ambos sem vínculo com uma identidade administrativa. A conta e o papel fictícios foram removidos.

## Perfil da latência

Uma medição adicional no mesmo staging executou a RPC completa de uma página de 100 itens no banco com papel `authenticated` e contexto de moderador AAL2. `EXPLAIN ANALYZE` registrou 12,154 ms de execução. O lote HTTP comparativo disparou oito resumos, oito páginas de um item e oito páginas de 100 itens em paralelo, após aquecer uma conexão. O primeiro resumo desse lote retornou em 170 ms. As respostas das três operações chegaram intercaladas até 5.128 ms, com p95 de 4.970 ms no conjunto. Consumir e interpretar cada corpo levou até 1 ms. Os relógios do lote envolvem apenas as requisições RPC e excluem a CLI, o preparo de fixtures, a autenticação e a leitura sequencial de cursores. O gateway não expôs `Server-Timing` ou métricas upstream na resposta.

O atraso apareceu antes dos cabeçalhos e também afetou o resumo e a página pequena. A medição isolada não atribui a espera ao cliente, à rede, ao gateway ou ao pool. Não há evidência suficiente para aplicar uma otimização de consulta ou handler. O perfil adicional deixou zero fixtures ativas e um segundo relato anonimizado pelo fluxo do titular. A conta e o papel fictícios foram removidos.

## Conexões reutilizadas

Uma medição dirigida com `node:https` separou abertura do socket, handshake TLS, recebimento dos cabeçalhos e consumo do corpo. A rodada original usou `fetch` sem instrumentação de socket, portanto não é possível confirmar quantas conexões ela reaproveitou. Nesta medição, 50 chamadas paralelas de paginação retornaram HTTP `200` em cada lote. O primeiro lote abriu 50 conexões, com p95 de 14 ms para alocar o socket, 85 ms para o handshake e 1.097 ms até os cabeçalhos. O segundo lote reaproveitou as 50 conexões e registrou p50 de 219 ms, p95 de 441 ms e p99 de 450 ms até os cabeçalhos. A alocação do socket teve p95 de 2 ms e o consumo do corpo p95 inferior a 1 ms.

Esta medição usou os dados correntes do staging e teve corpo mediano de 1.678 bytes. Ela indica que o cliente, a reutilização das conexões ou condições do caminho HTTP afetam a latência observada. Ela não repete o cenário de 1.001 itens com disputa de escrita e não permite atribuir a cauda anterior ao gateway ou ao pool. Nenhum relato foi gerado nessa medição, e a conta fictícia foi removida após o lote.

## Aceite da carga mista com conexões aquecidas

A rodada final repetiu o cenário de 1.001 relatos, disputa pelo mesmo relato e paginação no recorte. O cliente aqueceu o pool HTTP persistente de 50 sockets e disparou as 75 requisições juntas, com deadline de 12 s a partir do disparo. Os tempos abaixo incluem espera pela alocação do socket. A espera teve p95 de 2 ms nas decisões e 265 ms nas leituras.

| Operação | Chamadas | Resultado | p50 | p95 | p99 |
| --- | ---: | --- | ---: | ---: | ---: |
| Reter o mesmo relato com versão esperada 1 | 25 | 1 HTTP 204 e 24 HTTP 409 `PT409` | 261 ms | 478 ms | 482 ms |
| Paginar a fila, até 100 itens por página | 50 | 50 HTTP 200 com JSON válido | 393 ms | 672 ms | 908 ms |

A vazão mista foi de 82,31 req/s. O lote terminou sem erros inesperados ou timeouts, com p95 abaixo de 2 s em ambas as operações. A travessia do cursor encontrou 1.001 IDs distintos em 11 páginas, sem duplicatas, perdas ou itens externos. A decisão vencedora deixou o relato retido na versão 2, com um evento. A limpeza deixou zero fixtures ativas, zero tokens e um relato anonimizado com dois eventos de auditoria sem identidade administrativa. A conta e o papel fictícios foram removidos.

**GO para o critério de concorrência e capacidade da beta em staging.** A medição cobre o pico misto de 75 chamadas com pool aquecido. O primeiro cenário preserva o alerta sobre a cauda observada com outro cliente HTTP. O desempenho no caminho Vercel de produção continua fora desta prova.

As validações focadas passaram: 53 testes Vitest (handlers e cliente administrativo) e o teste SQL local da migration 025. Nenhum código ou migration foi alterado nesta rodada.
