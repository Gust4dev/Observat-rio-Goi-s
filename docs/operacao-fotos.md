# Operação das fotos M4

A coleta permanece desligada por padrão (`FOTOS_HABILITADAS=false`). Usar apenas staging fictício até cumprir as travas de privacidade de `plano-m4.md`. Aplicar as migrações M4 antes de executar a limpeza; a reconciliação pública lê o lease administrativo da migração 016 e falha fechada se esse contrato não existir.

## Limpeza

`scripts/limpar-quarentena.mjs` e `GET /api/cron/limpar-quarentena` usam a mesma rotina. Ela considera apenas caminhos M4 válidos, com mais de 24 horas. Conserva toda quarentena referenciada no banco e toda cópia pública de imagem publicada ou com operação administrativa ainda ativa. Reconcilia cópias públicas órfãs e cópias deixadas por remoção incompleta. Uma falha de leitura interrompe a rotina; a referência é conferida novamente imediatamente antes de cada exclusão.

Esta rotina não define retenção de fotos rejeitadas/retidas ainda referenciadas. O prazo de retenção continua como trava antes de qualquer dado real.

No servidor confiável, simular e depois aplicar:

```powershell
node --env-file=.env.local scripts/limpar-quarentena.mjs
node --env-file=.env.local scripts/limpar-quarentena.mjs --apply
```

São necessários `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SECRET_KEY` somente no servidor. `SUPABASE_SERVICE_ROLE_KEY` continua aceito temporariamente como fallback até a configuração dos ambientes ser migrada; remova-o depois da rotação legada. Chaves `sb_secret_*` vão apenas em `apikey`, nunca em `Authorization`. A saída contém contagens, sem caminhos ou segredos.

## Vercel

`vercel.json` agenda a rota diariamente às 06:00 UTC (03:00 em São Paulo). Configurar `CRON_SECRET` aleatório no ambiente da Vercel: a plataforma envia `Authorization: Bearer <CRON_SECRET>`. A rota compara o segredo em tempo constante, responde `no-store` e não usa segredo em URL. O proxy dispensa Basic Auth somente nesse caminho exato; a autenticação continua obrigatória no próprio handler.

O cron passa a existir após o deploy que registrar a configuração. Conferir o job e suas execuções no painel da Vercel; a configuração no repositório não comprova execução agendada. Cron é disponível em todos os planos; Hobby aceita execução diária e pode disparar em qualquer momento da hora configurada. A função limita sua duração a 60 segundos; em falha/timeout, repetir manualmente e investigar os logs, que não devem conter credenciais nem caminhos privados.

Fontes operacionais: [Vercel Cron usage](https://vercel.com/docs/cron-jobs/usage-and-pricing), [Vercel Cron management](https://vercel.com/docs/cron-jobs/manage-cron-jobs), [Vercel Functions limits](https://vercel.com/docs/functions/limitations). O limite documentado de corpo das funções é 4,5 MB; o upload M4 já limita o corpo a 2 MiB + 16 KiB.

## Ciclo real de staging

`npm run test:fotos:staging -- --verificar` executa somente sondas de schema no projeto fictício conhecido. O script recusa outro host e não cria fixtures se faltarem as migrações 014, 015 ou 016. `npm run contrato:staging` também sonda a coluna privada removida mesmo quando a view está vazia.

Para `npm run test:fotos:staging`, configurar no ambiente do comando `FOTOS_STAGING_APP_URL` (app local ou staging), `FOTOS_STAGING_ADMIN_TOKEN` (access token de administrador fictício com MFA AAL2) e o mesmo `HMAC_SEGREDO` usado pelo app. O app precisa das variáveis de registro, `FOTOS_HABILITADAS=true`, `AMBIENTE_REGISTRO=staging_ficticio` e `MODO_PUBLICACAO=moderar_tudo`; fornecer Basic Auth pelas variáveis já existentes se o app estiver fechado. Não salvar o token administrativo no repositório nem em comandos registrados no histórico.

O ciclo registra um relato sintético pela função de servidor, envia JPEG pelo HTTP do app, repete upload/contexto, tenta slot ocupado, aprova pelo endpoint administrativo, confere view/arquivo/página pública, remove e exercita a rotina real de limpeza com prefixo exclusivo. A rotina de teste limita as listagens ao prefixo recém-criado e avança apenas o relógio do teste para exercitar órfãos >24h. O `finally` apaga todos os objetos da fixture e confere a ausência nos dois buckets, inclusive em falha intermediária. O relato é anonimizado pela função de exclusão do titular; o histórico administrativo imutável permanece como evidência fictícia. Nenhum segredo ou caminho privado é impresso.

As falhas entre cópia e RPC são injetadas pelos testes locais da rota; o ciclo remoto não altera endpoints de produção para introduzir falhas. Um resultado de preflight bloqueado não conta como ciclo real aprovado.
