# Plano 17 — Jornada pública no Production

**Deployment:** Production `dpl_9TyRW7YU93g3CT4NGrzQXpqJS7F4`
**Revisão:** `300f18e94ea5d3847b535dd9cba6bf436a606b4d`
**Alvo:** `observatorio-go.vercel.app`
**Banco:** Production Supabase `acxcqtknxjiwopdtjxoc`
**Data do ensaio:** 23/11/2026 (BRT)

## Resultado funcional

A jornada pública de cadastro, publicação, leitura e retirada passou com conteúdo estritamente sintético. Dois relatos com título `[DEMO-MVP:20261123T1730Z-01/02]` foram publicados durante o ensaio. O primeiro também passou pela consulta privada do titular e pelo envio de “Também me afeta”, que recebeu confirmação; a contagem chegou a 1 após nova leitura. O link privado não foi incluído neste documento.

Depois da autorização explícita do responsável, os dois relatos foram retirados pelo fluxo normal do titular. As telas confirmaram “Relato retirado”; os dois detalhes responderam “Página não encontrada”, a listagem ficou vazia e a home voltou a zero. Uma consulta GET com a chave pública de Production, executada via ambiente Vercel sem imprimir valores, confirmou HTTP 200 e zero IDs restantes na `v_ocorrencias_publicas`. A auditoria permaneceu.

- Relato 01: UUID `f97e2b0c-e7ce-40e3-850b-eec9e62b30bb`, protocolo `OG-26-9BB021EB`.
- Relato 02: UUID `83612907-9744-4393-b5cd-9c05b090404d`, protocolo `OG-26-5FC4F9DA`.
- O POST do primeiro cadastro concluiu em aproximadamente 3,34 s. A medição de navegação entre home e lista foi afetada pelo tempo de interação entre ferramentas; não é usada como latência da aplicação.
- A contagem do “Também me afeta” não atualizou no DOM imediatamente após o aceite, embora tenha aparecido como 1 após nova leitura. A tag do relato já é invalidada no POST; a reprodução local em Next 16.4.6 atualiza o RSC sem atraso. Não foi encontrada causa suficiente para alterar produção; a discrepância Vercel/browser fica registrada para observar numa próxima publicação.

## Jornada administrativa

A jornada de denúncia, direito de resposta, revisão por administrador fictício AAL2, remoção, auditoria e revogação do token passou no staging. Consulte [17-e2e-moderacao-staging.md](./17-e2e-moderacao-staging.md). Esse ensaio usou banco real do staging e build local; não equivale a um teste da interface administrativa hospedada na Vercel Production.

## Capacidade e limite de rede

O preflight do runner HTTP na URL da Vercel foi interrompido por resposta `429` com `x-vercel-mitigated: challenge`; a mesma resposta ocorreu no alias e no host único do deployment. Nenhuma fase de carga do app foi disparada e o desafio não foi contornado.

A campanha complementar de leitura direta do PostgREST Production está em andamento, com 50 sessões concorrentes e sem escritas. Ela mede somente capacidade do Supabase; não valida Vercel, renderização SSR/RSC, cache da aplicação ou comportamento de usuários no browser. Os resultados serão anexados após o encerramento.

## Limites

- O caminho de fotos continua desligado em Production e não foi testado nesta jornada; manter a trava jurídica do Plano 17.
- Denúncia/resposta e decisões administrativas foram exercitadas no staging, não em Production.
- Não declarar capacidade ponta a ponta de 50–60 sessões com base no ensaio direto ao PostgREST.

A confirmação final também leu o banco de Production por uma transação CLI `--read-only`, filtrando somente os dois UUIDs sintéticos e retornando agregados: `active_public_occurrences=0`, `active_tokens=0`, `confirmations=0` e `audit_events=2`. O tombstone e os eventos históricos permanecem pelo desenho de auditoria; não há credencial de titular ativa.

A verificação adicional do escopo Production via `vercel env run` retornou `url_ref_matches_configured=true`, `ref_matches_confirmed_project=true` e `data_approved=true`; a chave pública estava presente. Nenhum valor de credencial foi impresso.

A leitura agregada completa do catálogo de Production mostrou `total_occurrences=3`, `public=0`, `pending=0`, `retained=0`, `removed=3`, `test_named=0`. Portanto, a home/lista vazias correspondem ao estado do banco; os três registros são tombstones sem conteúdo público ativo.

## Ensaio PostgREST Production — 50 sessões

**Resultado:** passou no escopo restrito a leituras do Supabase. A configuração foi carregada com `vercel env run` em `Production`; a URL/ref aprovado coincidiu com `acxcqtknxjiwopdtjxoc`. O perfil manteve 50 sessões por 30 minutos, sem escrita, alternando cinco views/tabelas públicas do produto. Total: 11.933 respostas HTTP 200, 6,63 req/s, p50 39 ms, p95 60 ms, p99 94 ms, 0 falhas, 0 timeouts e 0 respostas não-200.

| Rota PostgREST | Requisições | p50 | p95 | p99 |
| --- | ---: | ---: | ---: | ---: |
| relatos públicos | 2.384 | 40 ms | 62 ms | 107 ms |
| municípios | 2.385 | 39 ms | 60 ms | 90 ms |
| categorias | 2.386 | 38 ms | 59 ms | 102 ms |
| indicadores gerais | 2.390 | 39 ms | 60 ms | 92 ms |
| indicador municipal/categoria | 2.388 | 39 ms | 60 ms | 87 ms |

O patamar de 60 sessões por 30 minutos foi concluído no PostgREST Production, sem escritas: 14.273 respostas HTTP 200, 0 falhas, 0 timeouts e 0 respostas não-200; 7,93 req/s, p50 43 ms, p95 69 ms e p99 99 ms. O teste cobre somente o Supabase, não as funções, cache, RSC/SSR ou CDN da Vercel.

## Rajada da aplicação publicada — 50 navegadores

Depois do bloqueio do runner HTTP pela camada Challenge, foi feita uma rajada independente com 50 abas de navegador normal, sem contornar o Challenge e sem autenticação. Na primeira onda, 50 abas navegaram simultaneamente, distribuídas entre home, relatos, municípios, dados e `GET /api/dados?municipio=goiania&categoria=infraestrutura`. As 50 respostas/páginas foram válidas, sem Challenge nem erro observado; p50 de navegação 1.326 ms, p95 2.494 ms e máximo 2.606 ms.

Uma extensão curta manteve as 50 abas e executou mais duas ondas separadas por 25 s, alternando as cinco rotas. Foram observadas 100/100 respostas válidas; p95 por onda de 1.478 ms e 1.524 ms, sem Challenge. Uma tentativa de continuar o loop perdeu a sessão de automação antes de retornar os resultados das ondas seguintes. A inspeção posterior encontrou as páginas abertas com conteúdo normal, mas não permite contar nem medir as requisições dessa tentativa; elas não entram nos números acima.

Este resultado prova uma rajada de 50 leituras simultâneas pela aplicação publicada e duas ondas curtas adicionais. Não equivale a 50 usuários ativos por 30 minutos, nem cobre cadastro, participação, administração autenticada ou jornadas completas. O ensaio PostgREST acima continua sendo a única medição sustentada por 30 minutos; a capacidade ponta a ponta permanece **não comprovada**.

O escopo Production foi lido pelo CLI sem divulgar valores: `PUBLICACAO_IMEDIATA_RELATOS=true` e `FOTOS_HABILITADAS=false`. Isso corresponde ao comportamento observado: texto entra na projeção pública; a etapa de foto permanece ausente. A desativação de fotos em Production é intencional até existir a política humana/jurídica prevista no plano.

A prontidão operacional de Production foi verificada em SQL read-only agregado: um usuário Auth, um administrador ativo (superadmin) e um fator MFA verificado para esse administrador; nenhuma identidade ou fator foi lido/impresso.

## Decisão de aceite nesta retomada

**Estado geral: PARCIAL — ainda não GO.** A jornada pública textual, publicação imediata, leitura pública e retirada auditada passaram no Production; as jornadas de denúncia, resposta, administração AAL2 e ciclo de fotos passaram no staging. As duas fixtures públicas sintéticas de Production foram retiradas pelo fluxo normal, conforme autorização do responsável, e a leitura agregada confirmou zero conteúdo/token ativo para elas; os tombstones e a auditoria ficaram preservados.

Permanecem três lacunas concretas para o aceite final:

1. **Capacidade ponta a ponta:** Supabase PostgREST passou em 60 sessões/30 min, mas Vercel teve uma onda com 50 abas e duas ondas curtas de navegação; o ensaio repetido foi interrompido pela automação e não produziu evidência para 50 sessões/30 min. Não extrapolar o resultado do banco.
2. **Participação em Production:** “Também me afeta” foi aceito e apareceu após recarregar, mas o contador não atualizou imediatamente no DOM da sessão observada. Nesta retomada confirmei que a revisão publicada usa Next 16.4.6, igual ao checkout; o detalhe recebe a tag `problema:<id>`, o POST aplica `revalidateTag(..., { expire: 0 })` e o cliente chama `router.refresh()`. A documentação instalada diz que esse perfil não serve dado stale na próxima leitura, e que `router.refresh()` limpa o cache de cliente. A diferença de runtime não se reproduziu no ensaio local e segue sem causa comprovada; não fiz mudança especulativa.
3. **Fotos em Production:** o ciclo de revisão foi provado no staging, mas a coleta segue desligada em Production por decisão de proteção jurídica/humana. O GO de demonstração não deve declarar este fluxo disponível publicamente enquanto a flag permanecer `false`.

O Vercel Challenge não foi desativado nem contornado. Nenhuma chave foi rotacionada e o domínio atual foi mantido conforme a decisão do responsável. As validações locais gerais já registradas não foram repetidas, pois esta retomada alterou apenas este relatório.

## Retomada de sessões de navegador — 23/11/2026, 21:06 BRT

Uma nova observação read-only encontrou 50 abas simultâneas no browser IAB, distribuídas igualmente entre `/`, `/problemas`, `/municipios`, `/dados` e `GET /api/dados?municipio=goiania&categoria=infraestrutura`. O inventário mostrou o título esperado nas 50 rotas e nenhum título de Challenge; a aba de API inspecionada exibiu `{"dados":[],"total_linhas":0}`, coerente com a limpeza das fixtures. A CLI Vercel confirmou no deployment alvo 624 registros CDN entre 00:02:27 e 00:03:13 UTC, todos no ambiente Production, hostname esperado e `wafAction=allow`: 170 respostas HTTP 200 e 454 HTTP 304, sem 429 ou 5xx. Consulta executada: `npx --no-install vercel logs requests --deployment dpl_9TyRW7YU93g3CT4NGrzQXpqJS7F4 --since 10m --limit 1000 --json --scope mercurygestoria-9113s-projects`. Os caminhos registrados incluíram as cinco rotas da onda, além de assets e páginas auxiliares; os 624 registros não equivalem a 624 sessões nem medem latência. Uma tentativa de obter a amostra detalhada de todas as 40 abas excedeu o limite da ferramenta.

Esta observação reforça somente o aceite de rajada: são abas de um único perfil/rede, sem repetição sustentada e sem usuários independentes. Não prova 50 sessões estáveis por 30 minutos nem substitui a jornada de detalhe com fixture. A lacuna de capacidade ponta a ponta permanece aberta.

## Retirada da fixture de 25/11/2026

O relato sintético do ensaio de Goiânia, protocolo `OG-26-26C869BB` e UUID `3ee3e5de-dace-40a4-af1a-bb1a8837b056`, foi confirmado pela interseção de UUID, protocolo e título no projeto Production. A leitura agregada encontrou **1 relato publicado, 1 token reservado, 1 confirmação e 0 eventos de moderação**. O link privado do titular não foi preservado.

A retirada pelo titular exige o link original, pois o banco guarda apenas o hash do token. A remoção administrativa versionada exige sessão institucional de moderador ativo com AAL2, motivo cadastrado e versão corrente da ocorrência. Essa remoção tira o detalhe do catálogo público e registra auditoria. A ação não equivale à exclusão definitiva do titular, que apaga conteúdo e revoga o token. A limpeza permanece pendente de um desses caminhos autorizados.

## Retirada administrativa da fixture de demonstração — 26/11/2026

- O responsável concluiu o acesso de superadmin com MFA/AAL2 no painel Production. A fila em “Publicados recentes” confirmou o protocolo `OG-26-26C869BB`, título `[DEMO-MVP:20261125-001] Poste apagado em Goiânia` e UUID `3ee3e5de-dace-40a4-af1a-bb1a8837b056` antes da ação.
- A ocorrência foi removida pelo fluxo normal do painel com motivo cadastrado `fora_escopo` e justificativa de que era relato sintético criado para validar o MVP. A interface confirmou “Moderação atualizada” e passou a mostrar “Moderação: removido”.
- A aba de auditoria registrou a ação `remover` para o UUID exato em `2026-11-26T17:25:41.823842+00:00` (14:25:41 BRT), com ator administrativo e sem exclusão direta no banco. A leitura pública posterior do detalhe exibiu “Não há conteúdo público disponível neste endereço”.
- Isso fecha a limpeza auditada desta fixture de ensaio. A ocorrência mantém seu tombstone/auditoria; a ação não foi apresentada como exclusão definitiva nem revogação do token do titular.
