# Observatório Goiás — Documentação técnica

Plataforma web (mobile first) para registrar, acompanhar e analisar problemas de interesse público
nos 246 municípios de Goiás.

> **Estado:** planejamento. Esta documentação descreve o desenho proposto; itens marcados
> **[PROPOSTO]** ainda não foram aprovados e itens **[PENDENTE]** dependem de decisão externa.
> **Organização responsável:** a definir e será divulgada em `/transparencia` antes do lançamento.

## Como rodar
```bash
npm install
cp .env.example .env.local   # preencher com as chaves do seu projeto Supabase (staging)
npm run dev                  # http://localhost:3000
npm run typecheck && npm run lint && npm run build
npm run db:test              # migrações + testes de segurança do banco (Postgres embutido, sem Docker)
```
Este repositório é **público**. Nunca commitar chaves, `.env*`, dados reais de cidadãos nem documentação operacional.

## Índice
| Documento | Conteúdo |
|---|---|
| [`docs/visao-geral.md`](docs/visao-geral.md) | Objetivo, módulos, escopo do MVP, fora de escopo |
| [`docs/desenho-geral.md`](docs/desenho-geral.md) | Como o sistema funciona: endpoints, fluxos, admin, rotinas, ordem de construção |
| [`docs/arquitetura.md`](docs/arquitetura.md) | Stack, camadas, separação público/privado |
| [`docs/modelo-de-dados.md`](docs/modelo-de-dados.md) | Tabelas, estados, visões públicas, RLS |
| [`docs/fluxos.md`](docs/fluxos.md) | Fluxo de registro, moderação, estados, rotas |
| [`docs/privacidade-e-seguranca.md`](docs/privacidade-e-seguranca.md) | Princípios técnicos de LGPD e segurança |
| [`docs/decisoes-tecnicas.md`](docs/decisoes-tecnicas.md) | Registro de decisões (ADR) |
| [`docs/convencao-de-commits.md`](docs/convencao-de-commits.md) | Padrão obrigatório das mensagens de commit |
| [`db/README.md`](db/README.md) | Migrações SQL, RLS e testes de segurança |

## Convenções
- Mensagens de commit seguem [`docs/convencao-de-commits.md`](docs/convencao-de-commits.md) (português + `EN`).
- Idioma da documentação e dos nomes de domínio (tabelas, rotas): português.
- Decisões relevantes entram em `docs/decisoes-tecnicas.md` com data e status.
- Esta pasta é pública: **não** colocar aqui nomes de pessoas, valores de limites anti-abuso,
  chaves, endpoints internos ou qualquer informação operacional.
