# Plano 17 — E2E de fotos no staging

**Resultado:** passou em 23/11/2026. O cadastro sintético foi registrado às 20:02:43 BRT. O build local acessou o Storage e o banco reais do Supabase staging pelo ref `hvekgzxuciyewtybwads`. A flag de fotos foi habilitada somente no processo local do ensaio.

## Comandos e preparação

```powershell
npm run test:fotos:staging -- --verificar
node scripts/e2e-admin-staging.mjs --fotos-mvp
npm test -- src/lib/registro/fotos-staging.test.ts
```

O primeiro comando retornou `{"schema":true}` e confirmou que a view pública não expõe o caminho de quarentena. Via catálogo read-only, o bucket `imagens-publicas` era público, `imagens-quarentena` era privado e ambos tinham limite de 2 MiB. O perfil `--fotos-mvp` reaproveitou o helper de administrador fictício AAL2 e os valores públicos de teste da Cloudflare Turnstile no ambiente do processo. [Turnstile em testes automatizados](https://developers.cloudflare.com/turnstile/troubleshooting/testing/)

## Jornada observada

| Etapa | Evidência |
| --- | --- |
| Relato | Criado com conteúdo sintético, anonimato e aprovação inicial pela RPC versionada |
| Upload | JPEG de cor sólida com descrição EXIF sintética de origem. HTTP 201 e vínculo único. A leitura autenticada da quarentena confirmou JPEG sem EXIF |
| Retry e precedência | Mesmo JPEG, mesmo slot e contexto alterado retornaram 201. JPEG diferente no slot ocupado retornou 409 |
| Revisão | Moderador fictício AAL2 aprovou com texto alternativo e checklist. A view e o HTML exibiram o alt revisado. A cópia apareceu no bucket público |
| Retirada | A moderação removeu a foto da view pública. O ensaio chamou a rotina de órfãos com escopo limitado aos seus próprios paths |
| Limpeza exata | O bloco `finally` verificou a ausência dos objetos da execução nos dois buckets, retirou o relato pelo token e comprovou revogação do acompanhamento |

Uma consulta SQL read-only após o ensaio verificou a fixture de relato `01247bcf-22a1-4591-9360-83cfbc27c5db` e a imagem `8067b403-0716-4966-b13a-723e8173fece`. Havia **zero** relatos públicos, vínculos de imagem, imagens públicas, objetos públicos e tokens da fixture. Permaneceram uma ocorrência anonimizada e quatro eventos de auditoria com referência administrativa nula. O helper removeu a conta Auth e o papel temporários.

Passaram também os quatro testes locais do runner. A execução comprova a jornada técnica em staging, inclusive a remoção do EXIF e a limpeza exata ao final. Production Vercel continua com fotos desligadas e sujeita à aprovação institucional do Plano 17.

O perfil de execução foi acrescentado a `scripts/e2e-admin-staging.mjs`. O runner em `scripts/lib/fotos-staging.mjs` passou a ler a versão administrativa da fixture, enviar JPEG com EXIF sintético e verificar o Storage e a revogação ao final. A simulação de falha e limpeza permanece coberta em `src/lib/registro/fotos-staging.test.ts`. Nenhuma migration adicional foi necessária.

## Reexecução com `main` em `a1b01e5` — 24/11/2026

O runner confirmou o ref Supabase de staging `hvekgzxuciyewtybwads` e usou um build local em loopback. A primeira execução retirou o registro da view, mas a URL pública já acessada ainda respondeu após a retirada. A verificação combinada daquele ensaio ficou inconclusiva sobre a origem da resposta. O bloco de limpeza encerrou a fixture e confirmou a exclusão da identidade temporária.

A segunda execução passou. O JPEG sintético perdeu o único campo EXIF fictício na quarentena. A aprovação AAL2 exibiu o alt revisado na view e no HTML. Antes da limpeza de contingência, as listagens do Storage confirmaram que ambas as cópias haviam sido apagadas pela rota de moderação e uma leitura nova da URL pública respondeu ausência. A rotina de órfãos removeu o objeto sintético dentro da allowlist. Uma consulta SQL somente leitura pelos identificadores exatos confirmou zero relatos públicos, vínculos de imagem, imagens públicas, objetos públicos e tokens e quatro eventos de auditoria. O runner também verificou a ausência de objetos privados e a exclusão da conta Auth e do papel temporários.

O runner rejeita app fora de loopback e redirecionamentos, gera um identificador aleatório por execução e restringe as verificações e a limpeza aos caminhos das fixtures. A leitura pública nova não mede o tempo de expiração de uma cópia servida por cache na URL já acessada. As fotos seguem desabilitadas em Production.

### Leitura posterior da URL pública — 24/11/2026, 10:41 BRT

Após a limpeza, o manager repetiu um GET sem autenticação, sem cache-buster e sem seguir redirecionamentos para a URL pública exata da foto sintética. A resposta foi HTTP 400, sem cabeçalhos Age/Cache-Status/X-Cache; o corpo não foi retido. Isso confirma que o objeto não foi servido nessa leitura, mas não mede o TTL de cache de um objeto real nem resolve se uma URL antiga pode servir bytes em cache durante uma janela anterior.