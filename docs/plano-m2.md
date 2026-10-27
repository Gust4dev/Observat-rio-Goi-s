# Plano do M2 — leitura pública

Marco do [`desenho-geral.md` §13](desenho-geral.md). Estado: **implementado em staging** (2026-10-27); falta o deploy na Vercel e a medição de LCP. Hospedagem: Vercel.

Desvios em relação ao plano original, descobertos na implementação:
- `partialPrefetching` ficou `false` em `next.config.ts`: com `true`, a primeira visita a uma URL inexistente devolve 200 em vez de 404.
- Migração 009: a view pública expunha o `tsvector` interno `busca`.
- `/problemas` tem ~105 KB de HTML cru (22 KB com gzip), por causa do seletor com os 246 municípios.
Tudo roda em staging com dados fictícios. Nenhum dado real de cidadão entra aqui.

## 1. Escopo

| Rota | Entrega no M2 |
|---|---|
| `/problema/[id]` | **Primeira a ser construída.** Situação em linguagem simples, local, categoria, descrição, fotos publicadas, linha do tempo de atualizações, resposta oficial, aviso metodológico |
| `/problemas` | Lista com **um** filtro (município) e categoria por link. Paginação por cursor ("Próxima página"), sem scroll infinito |
| `/municipios/[slug]` | Fina: mesma lista, filtrada, com cabeçalho do município e contagem. Reaproveita o componente da lista |
| `/` | Mínima: o que é o projeto, aviso metodológico, últimos 5 problemas, contagens de `v_indicadores_gerais` |

**Fora do M2:** busca textual, mapa, ordenação, gráficos, filtros múltiplos, formulário, analytics, "afeta", denúncia.
A busca (coluna `busca`, `websearch`/`wfts` em português) fica projetada para quando houver mais de ~100 registros reais.

## 2. Decisões

| # | Decisão | Por quê |
|---|---|---|
| M2-1 | Camada de dados única em `src/lib/dados/`, só no servidor (`server-only`). Nenhum componente de cliente fala com o Supabase | Um único ponto para colunas explícitas, limites, escape e cache |
| M2-2 | Acesso por `fetch` direto ao PostgREST (`rest.ts`), sem `supabase-js` | Só há `SELECT` em 8 views; evita dependência com realtime/auth que não usamos. O `use cache` cacheia qualquer função assíncrona, então não depende da biblioteca |
| M2-3 | `cacheComponents` (já ligado) com `'use cache'` + `cacheLife` + `cacheTag` (`problemas`, `problema:<id>`, `municipio:<slug>`) | A visita vinda do WhatsApp não bate no banco a cada vez. As tags permitem invalidar quando o M3/M5 mudarem dados |
| M2-4 | Respostas validadas com zod contra um DTO por view; `select` sempre com lista explícita de colunas, nunca `*` | As views rodam com os privilégios do dono (`003_views.sql`): coluna nova vira dado público |
| M2-5 | `searchParams` e cursor passam por zod com `.catch(padrão)`; limite máximo de itens fixo; nunca interpolar texto em filtros PostgREST | Parâmetro de URL é entrada hostil. Valor inválido vira padrão, nunca erro 500 |
| M2-6 | Paginação por cursor opaco em `(publicado_em desc, id)` | O feed recebe inserções; offset duplicaria itens |
| M2-7 | Conteúdo de cidadão só como texto no React; imagens só do host do bucket público, via `next/image` com `remotePatterns` fechado | XSS e imagem arbitrária |
| M2-8 | Cabeçalhos: HSTS, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, CSP base (`frame-ancestors`, `object-src`, `base-uri`, `form-action`, `img-src`/`connect-src` restritos). CSP de `script-src` com nonce **fica para o M3** | Nonce força renderização dinâmica e conflita com o shell estático; avaliar com o formulário |
| M2-9 | Ambiente fechado: `proxy.ts` com autenticação básica, **falha fechada** fora de desenvolvimento; `X-Robots-Tag: noindex`; `robots.txt` com `Disallow`; sem sitemap; banner fixo "Ambiente de teste — dados fictícios" | URL pública é publicação. Indexação não se desfaz |
| M2-10 | Hospedagem: Vercel, deploy a cada push. Staging em `iad1` (Supabase em us-east-1); produção em `gru1` com Supabase em sa-east-1 | Latência é dominada pela distância entre função e banco |
| M2-11 | Design: fonte do sistema (sem webfont), corpo 18 px, uma cor de ação, contraste AA, alvos de toque de 48 px, HTML semântico, funciona sem JS, páginas < 100 KB | Celular simples e 4G fraco |
| M2-12 | Situação em palavras do cidadão (ver §4), sempre com texto + ícone, nunca só cor | Acessibilidade e clareza |

## 3. Componentes (somente 5)
`CartaoProblema`, `SeloSituacao`, `LinhaDoTempo`, `AvisoMetodologico`, `EstadoVazio`. Mais o layout (cabeçalho, rodapé, banner de ambiente).

## 4. Rótulos de situação (enum `situacao_ocorrencia`)
| Valor | Texto ao cidadão |
|---|---|
| `registrado` | Recebido |
| `em_analise` | Em análise |
| `encaminhado` | Encaminhado ao órgão |
| `aguardando_resposta` | Aguardando resposta do órgão |
| `em_atendimento` | Sendo resolvido |
| `resolvido` | Resolvido (mostra justificativa e evidência) |
| `encerrado_sem_solucao` | Encerrado sem solução |

## 5. Dados de teste
- `scripts/seed-staging.mjs`: manual, idempotente, usa a `service_role` de `.env.local`, só roda se `SEED_ALVO` bater com o ref do staging. Carrega os 246 municípios do IBGE, cria ≥ 20 ocorrências fictícias em ≥ 3 municípios por `registrar_ocorrencia` e as publica por `admin_moderar_ocorrencia`. Sem escrita direta nas tabelas.
- Dados claramente sintéticos: nenhum nome de pessoa, órgão ou local real identificável.

## 6. Testes
| Teste | Onde | O que garante |
|---|---|---|
| Lista de colunas por view | `db/tests` (PGlite) | Falha se qualquer view `v_*` ganhar coluna fora da lista permitida |
| Unitários (vitest) | `src/lib` | zod de `searchParams`/cursor, montagem de query, rótulos de situação |
| Contrato | `npm run contrato:staging` (só chave pública) | As views reais do staging devolvem exatamente os campos esperados |
| Teste de invasão básico | script com a chave pública | Tabelas e funções negadas, views liberadas |
| Build/lint/typecheck | CI local | Sem `service_role` no bundle (`grep` em `.next/`) |

## 7. Critérios de pronto
1. As 4 rotas respondem em staging semeado, com estados vazio e de erro tratados.
2. `/problema/[id]` com LCP < 2,5 s no celular (medido no Lighthouse mobile).
3. Metadados Open Graph corretos (título, município, situação) na página de detalhe.
4. Nenhuma requisição do navegador vai ao Supabase; `grep service_role` em `.next/` vazio.
5. Teste de colunas das views, contrato e unitários passando; `typecheck`, `lint` e `build` limpos.
6. Ambiente fechado (senha + noindex) comprovado por requisição sem credencial.
7. Deploy automático na Vercel funcionando.

## 8. Riscos abertos
- **Prévia do WhatsApp atrás de senha:** o rastreador não passa pela autenticação, então a prévia não pode ser validada no ar. Valida-se o HTML das tags OG localmente; a abertura controlada fica para depois.
- **Região/plano na Vercel:** escolher região de função e proteção de deploy pode depender do plano. Verificar antes de depender disso.
- **Limites do Supabase:** a chave pública continua válida para chamar a API direto. O cache protege o nosso site, não a API; configurar limite de linhas e `statement_timeout` do papel `anon` no painel.
- **Design sem evidência de uso:** a fundação parte de hipóteses sobre o cidadão médio. Testar com poucas pessoas antes de investir mais.
