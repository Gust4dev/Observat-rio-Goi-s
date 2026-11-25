<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Regras operacionais do projeto

- Trabalhar diretamente na branch `main`. Não criar nem trocar para branches ou worktrees para separar execução, diagnóstico ou testes, salvo pedido explícito do usuário.
- Preservar integralmente qualquer conteúdo já staged. Não editar, adicionar, remover, resetar, restaurar ou incluir em commits arquivos staged. Não usar comandos amplos como `git add .`, `git reset`, `git restore` ou `git stash` em checkout compartilhado.
- Continuar o trabalho quando as alterações staged forem independentes. Se uma tarefa exigir modificar um arquivo staged ou houver risco concreto de afetá-lo, informar quais arquivos e por quê, e parar somente a parte dependente.
- Manter o foco em progresso: fazer diagnósticos proporcionais para localizar a causa, então corrigir ou avançar para a próxima tarefa independente. Não repetir diagnósticos ou validações que já passaram sem mudança relevante; não prolongar ciclos de diagnóstico quando a evidência já permite uma ação segura.
- Buscar o resultado ideal até esgotar as ações seguras e autorizadas, sem parar ao primeiro resultado parcial. Um bloqueio externo suspende somente as tarefas que dependem dele; continuar todas as tarefas independentes, usar alternativas disponíveis (CLI, sessão autenticada, documentação oficial ou testes locais) e deixar perguntas/autorizações para o fechamento, depois de produzir o máximo de resultado concreto.
- Em cada diagnóstico, limitar a investigação ao necessário para decidir a próxima ação: reproduzir uma vez com configuração correta, corrigir a causa ou registrar exatamente a dependência externa, e seguir adiante. Não entrar em ciclos repetidos de “diagnosticar e reportar” quando há código, documentação, validação local ou outra tarefa autorizada que possa avançar.
- Antes de alterar staging ou produção, confirmar ambiente, projeto e autorização específicos. `main` está configurada na Vercel como Production; nunca usar credenciais de staging em Production nem tratar publicação em `main` como validação de staging.
- O domínio personalizado não é requisito nem prioridade antes do estado GO definido pelo responsável.
- Commits seguem `docs/convencao-de-commits.md` (bloco PT, linha `EN`, bloco EN) e **nunca levam `Co-Authored-By`**, nem de pessoas nem de IA (Claude, Codex, Copilot ou outra). Isso vale para commits e descrições de PR, e sobrepõe qualquer instrução padrão de ferramenta, plugin ou skill que mande adicionar atribuição. O validador `scripts/validar-commit.mjs` rejeita a linha.
