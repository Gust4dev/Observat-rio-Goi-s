# Arquitetura

> O funcionamento detalhado (endpoints, fluxos, rotinas, ordem de construção) está em
> [`desenho-geral.md`](desenho-geral.md). Este arquivo resume stack e fronteiras.

## Stack **[PROPOSTO]**
| Camada | Tecnologia | Observação |
|---|---|---|
| Aplicação web | Next.js (React + TypeScript) + Tailwind CSS | Mobile first; páginas públicas renderizadas no servidor (ADR-0003) |
| Camada de servidor | Rotas `/api/*` do Next.js | Escrita do cidadão; processa imagens com `sharp` (ADR-0008) |
| Banco/Auth/Storage | Supabase (PostgreSQL, Auth, Storage) | Região São Paulo, se disponível (ADR-0001) |
| Anti-bot | Cloudflare Turnstile + limite de taxa em Postgres | Parâmetros não são documentados publicamente |
| Rotinas | `pg_cron` + cron da hospedagem | Retenção, limpeza, reconciliação |
| Hospedagem | A definir (ADR-0008) | Em conta da organização |

## Camadas e fronteiras
```
Navegador
  ├─ leitura pública ─────────► Servidor Next lê views públicas (v_*)
  ├─ escrita do cidadão ──────► /api/* (valida, Turnstile, taxa, imagens) ─► funções registrar_* (service_role)
  ├─ acompanhamento ──────────► /api/acompanhar (token) ─► acompanhar_por_token
  └─ admin ───────────────────► Supabase Auth ─► funções admin_* (JWT do usuário; o banco checa o papel)
```

Regras:
1. O cliente anônimo **nunca** escreve direto em tabela; só via `/api/*`.
2. O cliente anônimo lê **apenas views públicas**, nunca as tabelas base.
3. `contatos_privados` não tem leitura direta para ninguém; só `admin_ver_contato` (gestor+, registrado).
4. Imagens entram em bucket privado (quarentena) e só vão para o público após aprovação.
5. A chave `service_role` e os segredos existem apenas no servidor.
6. Escritas administrativas só por funções `admin_*` (ADR-0006).

## Observabilidade
Logs estruturados sem dados pessoais; auditoria administrativa em `historico_moderacao`.

## Testes mínimos
- Banco: `db/tests/` (RLS, matriz de execução, regras de moderação).
- Contrato dos endpoints e fluxo ponta a ponta do critério de aceite do MVP.
- Teste de acesso com a chave `anon` pela API real antes do lançamento.
