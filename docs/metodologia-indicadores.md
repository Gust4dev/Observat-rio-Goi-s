# Metodologia dos indicadores

Os dados têm origem nos relatos do Observatório Goiás com moderação `publicado`, nos cadastros de municípios e categorias e nas atualizações públicas. Não constituem levantamento censitário, amostra probabilística ou estatística oficial. A unidade é um relato; vários relatos podem descrever o mesmo problema, e uma pessoa pode registrar mais de um relato. Não há denominador populacional: as contagens não medem incidência por habitante.

## População e fórmulas

A view `v_dados_painel` agrega relatos publicados por município, categoria, mês de publicação (fuso America/Sao_Paulo) e situação atual. O mês indica publicação, não necessariamente a data do fato. O identificador da célula é determinístico, não identifica uma pessoa ou relato.

| Campo | Fórmula e interpretação |
| --- | --- |
| `total` | Número de relatos publicados da célula. |
| `com_resposta_oficial` | Número desses relatos com ao menos uma atualização pública do tipo `resposta_oficial`. Cada relato conta uma vez, independentemente do número de respostas. |
| `resolvidas_documentadas` | Número desses relatos cuja situação atual é `resolvido`, com ao menos uma atualização pública que indique `resolvido` e tenha texto e evidência não vazios. |
| Municípios com registros | Quantidade de municípios distintos com relatos publicados na população da consulta; o indicador global usa todos os publicados. |

Se apresentada uma proporção de respostas ou resoluções, a fórmula é a contagem correspondente dividida pelo `total` da mesma população, multiplicada por 100. Com denominador zero a proporção é indefinida. Resposta oficial não implica solução; resolução documentada significa presença dos registros definidos acima, não auditoria independente de sua qualidade ou comprovação de que o problema deixou de existir.

## Supressão e comparação

A migration `019_supressao_indicadores.sql` aplica no banco o limiar provisório de engenharia **k=5**. Células com menos de cinco relatos são omitidas. Também são omitidas células com subcontagens positivas de resposta ou resolução menores que cinco, ou com complementos positivos menores que cinco. Se uma célula de uma coorte município/categoria precisar ser omitida, as demais células dessa coorte também são omitidas para reduzir inferência por subtração. Zero não é tratado como contagem positiva pequena.

Os subtotais por município/categoria, mês e situação e as exportações usam o universo retido dessa view. Uma ausência não significa zero relatos. Totais retidos podem divergir dos totais globais de `v_indicadores_gerais`, que continuam abrangendo todos os relatos publicados. Não se deve preencher células ausentes com zero nem comparar universos como se fossem equivalentes.

Esse limiar não é decisão jurídica nem garantia de anonimato. Os detalhes públicos dos relatos e os totais globais permanecem acessíveis; cruzamentos com essas informações ou fontes externas podem permitir inferência residual, inclusive por diferenças entre totais. A supressão reduz exposição nas tabelas agregadas, sem eliminar esse risco.

## Limitações e exportação

As contagens refletem participação, acesso ao canal, moderação e atualização dos relatos. Não medem prevalência real dos problemas, desempenho comparável entre prefeituras, pessoas afetadas, satisfação, causalidade ou representatividade da população. Município sem registro não significa município sem problema. Situações e correções podem alterar séries históricas.

`GET /api/dados` retorna JSON por padrão; `formato=csv` retorna CSV em UTF-8 com BOM, cabeçalho e linhas terminadas em CRLF. Os únicos filtros são `municipio` e `categoria` (slugs); parâmetros desconhecidos, repetidos ou inválidos são recusados. Ambos os formatos contêm as mesmas colunas públicas agregadas, sem textos individuais nem URLs de armazenamento. No CSV, textos que possam ser interpretados como fórmulas recebem apóstrofo de proteção.

O limite é de 5000 células, não relatos. Ao excedê-lo, a exportação inteira é recusada; restrinja os filtros. A paginação usa ordem determinística por identificador, mas múltiplas leituras não constituem snapshot transacional: alterações durante a leitura podem afetar o resultado. Cache do servidor e cache público podem apresentar dados anteriores por alguns minutos; indisponibilidade não equivale a conjunto vazio. Para reproduzir uma análise, preserve o arquivo exportado, os filtros e a data de obtenção.
