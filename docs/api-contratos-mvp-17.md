# Adendo de contrato da API — Plano 17

Este adendo registra a alteração do contrato de participação feita durante o Plano 17. Ele complementa a tabela de `POST /api/afeta` em [api-contratos.md](api-contratos.md), que está staged e foi preservado sem edição.

## `POST /api/afeta`

**Entrada:** JSON `{ "ocorrencia_id": "<UUID>", "turnstile": "<token>" }`.

**Sucesso:** HTTP `202`, `Cache-Control: no-store`, `Referrer-Policy: no-referrer` e JSON:

```json
{
  "confirmacao": "Confirmação recebida.",
  "nova_confirmacao": true
}
```

`nova_confirmacao` indica o resultado persistido do RPC: `true` somente quando esta chamada criou a participação; `false` quando a chave estável de idempotência já existia. A interface incrementa a contagem somente no primeiro caso, portanto um retry não duplica a contagem visível. A rota invalida apenas a tag `problema:<ocorrencia_id>` após uma nova inserção e não faz uma consulta adicional ao banco.

A confirmação é neutra nos dois casos e não revela identidade nem se outra pessoa já confirmou. A rota mantém validação de origem, proteção antiabuso, limite independente e os gates de ambiente configurados. Configuração ausente resulta em falha fechada, sem chamada ao RPC.

**Evidências:** testes de rota para inserção nova, repetição deduplicada, ausência de invalidação na repetição e falha de limite; teste do componente para incremento otimista apenas em inserção nova; execução publicada anterior confirmou que a repetição não alterou o total persistido. O E2E atual do Plano 17 cobre os demais fluxos administrativos no staging.

**Pendência de consolidação:** incorporar esta linha à tabela canônica quando `docs/api-contratos.md` deixar de estar staged e puder ser editado sem afetar conteúdo já preparado pelo responsável.
