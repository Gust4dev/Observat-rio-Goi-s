# Plano 01 — Reproduzir o build com o fixture da CI

**Status:** Concluído em 2026-10-30. A primeira tentativa falhou no typecheck; a validação geral posterior passou com a fixture ativa. O histórico e os limites estão no [índice de homologação](README.md#registro-de-avanco--seguranca-chaves-e-validacao-geral).

> **Para quem executar:** concluir este diagnóstico sem editar código nem avançar para outro plano. Não fazer commit.

**Objetivo:** obter um resultado confiável do build para o checkout atual, separando falha de fixture ausente de falha real de prerender.

**Arquitetura:** iniciar o servidor HTTP local da CI em processo separado, provar que responde e só então iniciar o build com as variáveis fictícias. Se falhar com a fixture ativa, parar e abrir plano de correção separado.

**Stack:** Node.js, Next.js 16.4.3, PowerShell, fixture HTTP local da CI.

**Spec:** [roteiro de homologação do serviço](README.md), `.github/workflows/ci.yml` e `scripts/ci/build-data.mjs`.

## Restrições globais

- Não tocar em `HomeConteudo`, `MapaGoias` ou outros diffs concorrentes.
- Não acessar staging/produção nem usar segredo real.
- Não mudar comportamento do serviço neste diagnóstico.
- Não limpar, stashar, reverter ou commitar arquivos do checkout compartilhado.

## Estado inicial

- Este plano começou após um relatório de falha de rede durante o prerender, sem confirmação de que o fixture local estivesse ativo.
- A receita CI inicia `node scripts/ci/build-data.mjs` em background, espera o endpoint local `/rest/v1/municipios` responder e então executa `npm run build` com URL `http://127.0.0.1:54321` e credencial dummy.
- A primeira execução deste plano confirmou a fixture, mas falhou no typecheck de `MapaGoias.tsx:141` antes do prerender. Uma execução geral posterior passou com a mesma fixture; a falha de rede antiga continua sem reprodução.
- O checkout compartilhado contém alterações do serviço em `scripts/contrato-staging.mjs`, `scripts/contrato-staging.test.mjs`, `vitest.config.mts`, e alterações de interface em `HomeConteudo` e `MapaGoias`. Não limpar, reverter, mover ou editar essas alterações.

## Task 1: Reproduzir o build no ambiente local da CI

**Arquivos consultados:** `.github/workflows/ci.yml`, `scripts/ci/build-data.mjs`, `package.json`.

**Arquivo atualizado:** `docs/planos/servico/README.md`.

**Aceite:** fixture confirmada antes do build; resultado do build registrado com código de saída e limites. Se falhar com fixture ativa, diagnóstico reproduzível registrado e nenhuma correção misturada nesta task.

- [x] Registrar `git rev-parse --short HEAD` e `git status --short`. Guardar o inventário dos diffs para garantir que nenhuma alteração concorrente se perca.
- [x] Em um terminal separado, iniciar `node scripts/ci/build-data.mjs` e mantê-lo ativo durante a validação.
- [x] Confirmar o fixture antes do build:

   ```powershell
   $fixture = Invoke-WebRequest -Uri 'http://127.0.0.1:54321/rest/v1/municipios' -Method Get -UseBasicParsing
   "$($fixture.StatusCode) $($fixture.Content)"
   ```

   Esperado: HTTP 200 e corpo `[]`. Se falhar, parar; não executar o build nem substituir o host por staging.

- [x] No terminal do build, aplicar somente as variáveis dummy que a CI usa e compilar:

   ```powershell
   $env:NEXT_TELEMETRY_DISABLED = '1'
   $env:NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321'
   $env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_ci-dummy-key'
   $env:NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'ci-dummy-site-key'
   $env:NEXT_PUBLIC_SITE_URL = 'https://ci.example.invalid'
   npm run build
   ```

- [x] Anotar código de saída e a primeira falha completa, se houver. Não publicar variáveis reais, cookies, tokens ou o corpo de dados privados.
- [x] Parar apenas o processo de fixture que foi iniciado para esta validação. Não encerrar processos preexistentes por nome genérico.
- [x] Atualizar a tabela do Plano 01 no [roteiro](README.md) com data, comando, fixture HTTP, resultado e limite. Não alterar a conclusão de `CONTRATO PÚBLICO PARCIAL`.

## Critérios de encerramento

- **PASSOU:** fixture respondeu 200 antes do build; `npm run build` saiu com código 0; resultado registrado para o estado atual do worktree.
- **FALHOU COM CAUSA LOCALIZADA:** fixture respondeu 200, build falhou; a primeira requisição e a exceção foram identificadas. Encerrar este plano com diagnóstico e abrir um plano de correção isolado. Não corrigir no mesmo plano.
- **FALHOU, CAUSA NÃO LOCALIZADA:** fixture respondeu 200, build falhou, mas a saída não identifica a origem com confiança. Registrar a falha e abrir plano de diagnóstico separado; não editar arquivos neste plano.
- **NÃO VERIFICADO:** fixture não iniciou, respondeu diferente de 200, ou a saída não permite localizar a falha. Registrar a limitação e parar sem declarar regressão do produto.

## Limites

- Esta validação inclui o estado atual do checkout, inclusive os diffs de interface concorrentes. Não prova que uma falha venha do serviço.
- Não usa Supabase staging/produção, não escreve dados remotos, não faz deploy e não modifica código.
- Não repetir typecheck, lint, suíte ou banco nesta etapa: o objetivo é resolver somente a evidência de build que está pendente.

## Resultado final

- A validação geral posterior reportou 507 testes, `db:test`, typecheck, lint sem erros, build com fixture ativa e 50 páginas geradas, além da checagem do bundle público. Consulte o índice para os comandos e limites registrados.
- O erro inicial `MapaGoias.tsx:141` não foi corrigido neste plano. O build posterior passou sem alteração de interface.
- A falha de rede relatada antes continua não reproduzida; ela não é requisito pendente deste plano.
