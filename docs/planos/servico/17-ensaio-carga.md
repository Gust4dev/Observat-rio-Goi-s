# Ensaio de capacidade do MVP na Vercel

Execute na janela aprovada, depois de o mesmo deployment Production concluir a jornada funcional pelo navegador. Use o ID `dpl_…` dessa revisão e um relato sintético público `[DEMO-MVP:…]` que exista no Supabase Production. Retire essa fixture de leitura após o ensaio pelo procedimento do ensaio integrado.

Configure o processo que vai executar o script.

| Variável | Valor |
| --- | --- |
| `MVP_TARGET` | `https://observatorio-go.vercel.app` |
| `MVP_PROJECT_REF` | `acxcqtknxjiwopdtjxoc` |
| `MVP_DEPLOYMENT_ID` | ID Production verificado pelo E2E |
| `MVP_DETAIL_ID` | UUID exato da fixture pública de leitura |
| `MVP_MUNICIPIO`, `MVP_CATEGORIA` | Slugs reais correspondentes à fixture |
| `MVP_PUBLISHABLE_KEY` | Chave publishable do Supabase Production, disponível no processo e omitida do relatório |
| `MVP_RAMP_MINUTES` | Minutos em 20 e 40 sessões, padrão 3 |
| `MVP_SOAK_MINUTES` | Minutos em cada patamar de 50 e 60 sessões, padrão 30 |
| `MVP_WRITE_COUNT` | Número de cadastros sintéticos durante o patamar 60, padrão 0 e máximo 3 |

Rode uma vez por janela de hora e verifique o saldo do limite de 10 cadastros/hora no IP de origem antes de habilitar escritas. O runner respeita o limite do aplicativo, spacing entre cadastros e mantém os tokens apenas em memória. A limpeza usa o token desta execução, o título de execução único, o protocolo e o UUID exatos.

```powershell
node scripts/load-mvp.mjs --execute
```

Para medir somente navegação pública sem depender de relato ativo nem criar fixtures, use o perfil estritamente GET-only:

```powershell
node scripts/load-mvp.mjs --execute-read-only
```

Esse perfil requer apenas `MVP_TARGET`, `MVP_PROJECT_REF`, `MVP_DEPLOYMENT_ID` e os limites de duração; usa `goiania`/`vias` como filtro limitado por padrão, substituíveis por `MVP_MUNICIPIO` e `MVP_CATEGORIA`. Ele percorre home, lista, municípios, detalhe municipal, dados e exportação filtrada; não consulta o PostgREST diretamente, não envia POST e não precisa de chave ou token. Se o runtime responder com Challenge, o runner encerra antes da rampa; não tente contornar a proteção. O perfil mede navegação no alias, mas não substitui as jornadas de cadastro, acompanhamento, participação ou moderação.

O cliente mantém até uma requisição em andamento por sessão e alterna entre home, lista, detalhe, página municipal e exportação filtrada. O relatório JSON registra o deployment, o ID da execução, vazão, p50/p95/p99 e contagens por classe e rota. Challenge e 429 interrompem a campanha sem reduzir as proteções. O relatório também acusa abortos por erro acumulado e eventual fixture cujo desaparecimento não pôde ser comprovado. Nesse caso, confira o ID/protocolo exato pelo console; mantenha a auditoria. O script evita seguir redirecionamentos.

O perfil concentra leituras e inclui até três cadastros com acompanhamento opcional. Cada cadastro exige que o protocolo e o título retornados pelo acompanhamento coincidam com a fixture. Um patamar de leitura aprovado demonstra capacidade para esse perfil. Valide participação e administração em uma jornada E2E separada e registre a concorrência desses fluxos como pendente de medição enquanto não houver carga representativa.

### Checklist do relatório

- Identificar deployment, horário, duração efetiva, número de sessões e se a fase foi interrompida. O mínimo do Plano 17 é 50 sessões por 30 minutos, com 60 como alvo preferido.
- Comparar o p95 de cada leitura pública com 2 s, o p95 dos envios, participação e ações administrativas com 3 s e o p99 com 5 s. Mostrar os valores medidos e as divergências por rota. Declarar quais fluxos ficaram fora da carga. Até três amostras de cadastro e acompanhamento só dão evidência pontual.
- Informar vazão, taxa de erro inesperado frente à meta de menos de 1%, timeouts, desafios, 429 e validações esperadas. Se a proteção impedir o cliente HTTP, apresentar o resultado de capacidade do alias como inconclusivo para este ensaio.
- Cruzar a jornada com a telemetria Vercel/Supabase e documentar a limpeza das fixtures. Registrar no Plano 17 o aceite funcional e de carga separadamente.
