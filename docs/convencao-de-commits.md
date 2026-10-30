# Convenção de commits

Todo commit segue o mesmo padrão: bloco em português, uma linha `EN` sozinha, bloco em inglês espelhando o português.

```
<tipo>: <título curto em português>
- <bullet 1 em português>
- <bullet N em português>

EN
<tipo>: <título curto em inglês>
- <bullet 1 em inglês>
- <bullet N em inglês>
```

## Validação local

Para ativar o hook neste checkout, execute `git config core.hooksPath scripts/hooks`.
Em sistemas Unix, torne o launcher executável com `chmod +x scripts/hooks/commit-msg`.
O hook verifica a estrutura dos dois blocos; a tradução e a redação continuam sendo conferidas por quem escreve o commit.
Para validar um arquivo manualmente, execute `node scripts/validar-commit.mjs <arquivo>`.

## Tipo (prefixo)
Conventional commits, minúsculo, sem escopo entre parênteses:
- `feat:` nova funcionalidade ou capacidade
- `fix:` correção de bug
- `revert:` reversão de uma mudança anterior
- `refactor:` estrutura interna sem alterar comportamento externo
- `chore:` manutenção, config, dependências, sem impacto funcional direto
- `docs:` documentação

Se o commit mistura tipos, usar o da intenção principal. Não criar tipos compostos (`fix/feat:`).

## Título
- Uma linha, sem ponto final.
- Verbo no particípio passado, concordando com o que foi feito: "Adicionados", "Corrigida", "Removida".
- Resume a mudança mais importante, não lista tudo. Os bullets detalham o resto.
- O título em inglês é a tradução direta e literal (mesmo verbo, mesma estrutura).

## Bullets
- Começam com `-` e espaço, e com verbo no particípio passado (Adicionado, Corrigido, Removido, Ampliado, Integrado, Atualizado).
- Um bullet = uma mudança atômica e específica. Não agrupar mudanças não relacionadas.
- Técnicos e específicos: citar tabelas, rotas, arquivos, funções, variáveis de ambiente, comportamentos exatos.
- Em correção de bug, explicar a causa raiz em poucas palavras, não só o sintoma.
- Ordem: da mudança mais impactante para a mais secundária.
- Sem ponto final.
- O inglês segue a mesma ordem, quantidade e granularidade: tradução técnica, não resumo.

## Não fazer
- Emoji.
- Linguagem vaga ("melhorias diversas", "ajustes gerais").
- Inventar mudanças que não estão no diff.
- Misturar português e inglês no mesmo bloco.
- Rodapé, assinatura ou referência a issue/ticket, a menos que seja pedido explicitamente.
- Gerúndio ("Adicionando"): sempre particípio passado.
- Esconder mudanças não relacionadas ao tema principal: entram como bullets separados.

## Exemplo
```
fix: corrigido cálculo do protocolo duplicado em registros repetidos
- Corrigida a função registrar_ocorrencia: a chave de idempotência era comparada antes de validar o token, devolvendo a ocorrência de outro cidadão
- Adicionado teste em db/tests/migracao_007_test.sql cobrindo repetição com token diferente

EN
fix: fixed duplicate protocol calculation on repeated submissions
- Fixed the registrar_ocorrencia function: the idempotency key was compared before validating the token, returning another citizen's report
- Added a test in db/tests/migracao_007_test.sql covering repetition with a different token
```
