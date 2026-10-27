# Design

Fonte única de **tokens, componentes e wireframes**. Contexto e decisões que o originaram: [`plano-m2.md`](plano-m2.md)
(M2-11, M2-12). Mapa do que falta construir: [`estrutura-do-sistema.md`](estrutura-do-sistema.md) §3.

> Estado: tokens e componentes descrevem o que **já existe** em `src/app/globals.css` e `src/components/`.
> Wireframes das rotas ainda não construídas são **[PROPOSTO]**. Se este arquivo divergir do código, vale o código.
> Hipótese não validada: as escolhas partem de suposições sobre o cidadão médio (ver `plano-m2.md` §8). Testar com poucas pessoas.

## 1. Princípios

1. **Celular simples, 4G fraco.** Página < 100 KB, sem webfont, sem JavaScript obrigatório para ler.
2. **Uma ação principal por tela.** Uma única cor de ação; um único botão primário visível.
3. **Linguagem do cidadão.** Nada de "moderação", "ocorrência", "protocolo interno" na interface. Ver §8.
4. **Nunca só cor.** Estado = texto + ícone + cor.
5. **Honestidade metodológica.** Vazio diz que está vazio; número não vira gravidade.
6. **Conteúdo de terceiros é texto.** Nunca HTML; nunca imagem de host fora do bucket público.

## 2. Tokens

Definidos em `@theme` de `src/app/globals.css`. Tailwind 4 expõe cada um como utilitário (`bg-acao`, `text-texto-suave`…).

### 2.1 Cores (só tema claro; texto ≥ 4,5:1)

| Token | Valor | Uso |
|---|---|---|
| `fundo` | `#ffffff` | Fundo da página |
| `superficie` | `#f5f6f8` | Rodapé, avisos, estado vazio |
| `texto` | `#14161a` | Texto principal |
| `texto-suave` | `#4a5058` | Metadados (município, data) |
| `borda` | `#c9ced6` | Cartões, divisores, linha do tempo |
| `acao` / `acao-escura` / `sobre-acao` | `#0b4f9c` / `#083a73` / `#ffffff` | Links, botão primário, foco, filtro ativo |
| `tom-neutro` | `#eceef1` / `#2b3038` | Recebido, Em análise |
| `tom-andamento` | `#e3eefb` / `#0a3d7a` | Encaminhado, Aguardando, Sendo resolvido |
| `tom-sucesso` | `#e2f3e6` / `#0f5a24` | Resolvido |
| `tom-encerrado` | `#f6e9dc` / `#6b3a0c` | Encerrado sem solução |
| `aviso` | `#fff4c2` / `#3d3000` | Faixa de ambiente de teste |

Regras: nenhuma cor nova sem passar AA e ter par texto+ícone; vermelho fica **reservado a erro** (hoje sem token — criar `erro` quando o formulário existir);
verde só para "Resolvido".

### 2.2 Tipografia

| Token | Valor |
|---|---|
| Família | `system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif` |
| Base | `html { font-size: 18px }`, linha 1,6 |
| h1 | 1,75 rem (≈ 31 px) → 2 rem a partir de 40 rem de largura; peso 700; linha 1,25 |
| h2 | 1,35 rem → 1,5 rem; peso 700; linha 1,3 |
| Título de cartão | `text-lg` (h3), peso 700, `leading-snug` |
| Metadado | `text-sm` (≈ 16 px) em `texto-suave` |

Largura de linha do texto: coluna única `max-w-3xl` (48 rem), aceitável para leitura.

### 2.3 Espaço, forma e interação

| Item | Valor atual | Observação |
|---|---|---|
| Gutter lateral | `px-4` (16 px) | Constante em todas as telas |
| Espaço vertical entre blocos | `mt-3` a `mt-6`, `gap-4` entre cartões | Escala informal; manter 4 · 8 · 12 · 16 · 24 |
| Raio | `rounded-lg` (cartões, botões); `rounded-full` (selos, filtros) | |
| Borda | 1 px `borda` | Sem sombra |
| Alvo de toque | `min-block-size: 48px` em `a, button, input, select, summary` | Links dentro de `<p>` são exceção (corridos) |
| Foco | `outline: 3px solid acao`, offset 3 px | Nunca remover |
| Links | Sublinhados, cor `acao` | |
| Breakpoint | 40 rem (640 px) só para títulos | Layout não muda além da coluna |
| Movimento | Nenhuma animação | Se surgir, respeitar `prefers-reduced-motion` |
| Tema escuro | **Fora do MVP** (`color-scheme: light`) | |

## 3. Estrutura da página

```
┌────────────────────────────────────┐ 360 px
│ Pular para o conteúdo (oculto)     │  link de teclado
├────────────────────────────────────┤
│ ⚠ Ambiente de teste — dados fict.  │  AvisoAmbiente (só staging)
├────────────────────────────────────┤
│ Observatório Goiás      Problemas  │  cabeçalho + nav
├────────────────────────────────────┤
│                                    │
│            <main id="conteudo">    │  conteúdo da rota
│                                    │
├────────────────────────────────────┤
│ Rodapé: o que é, aviso, links      │
└────────────────────────────────────┘
```

Pendências do esqueleto: rodapé definitivo (links para `/sobre`, `/transparencia`, `/privacidade`, `/termos`); navegação com
"Registrar um problema" assim que `/registrar` existir (hoje só "Problemas").

## 4. Componentes

Todos em `src/components/`, sem estado, renderizáveis no servidor, sem dependência de JS.

| Componente | Props | Comportamento e regras | Estado |
|---|---|---|---|
| `AvisoAmbiente` | — | `role="status"`; faixa amarela fixa no topo. **Remover em produção** (condicionar por variável) | ✅ |
| `SeloSituacao` | `situacao` | Pílula com ícone (relógio, seta, círculo-traço, check) + rótulo + tom. Mapeamento em `situacao.ts` | ✅ |
| `CartaoProblema` | `id, titulo, municipioNome, categoriaNome, situacao, publicadoEm, temRespostaOficial` | `<article>`; título é o único link (alvo grande); selo + data + "Tem resposta oficial" | ✅ |
| `LinhaDoTempo` | `itens[]` (`tipo, situacaoNova, texto, evidencia, criadoEm`) | `<ol>` com marcador; mostra "Situação: …", texto (`whitespace-pre-line`) e "Evidência:" | ✅ |
| `AvisoMetodologico` | — | Caixa cinza: "Os números mostram quantos relatos foram publicados, não a gravidade" | ✅ |
| `EstadoVazio` | `titulo, texto, acaoHref?, acaoRotulo?` | Cartão centralizado; botão primário opcional | ✅ |
| `ListaProblemas` | `searchParams, base, municipioFixo?, comSeletorDeMunicipio?` | Filtros + lista + "Próxima página". Lê `searchParams`: usar dentro de `<Suspense>` com `CarregandoLista` | ✅ |
| `CarregandoLista` | — | `role="status"` "Carregando relatos…" | ✅ |
| Galeria de fotos | `imagens[]` | `next/image`, host fechado, `alt` obrigatório ("Foto 1 de 3 do relato") | ⬜ M2 (detalhe) |
| Botão compartilhar | `titulo, url` | WhatsApp via `https://wa.me/?text=` (link, sem SDK); `navigator.share` como melhoria | ⬜ M2 |
| Resposta oficial | `autor_vinculo, texto, publicada_em` | Bloco com borda `acao`; rótulo "Resposta enviada por …" | ⬜ M2 |
| Campos de formulário | rótulo, ajuda, erro | Rótulo sempre visível acima; erro em texto + ícone, ligado por `aria-describedby` | ⬜ M3 |
| Seletor de município | — | `<select>` nativo (246 itens); sem biblioteca | 🟡 dentro de `ListaProblemas` |
| Indicador (número + legenda) | `valor, legenda` | Número grande, legenda curta, **sempre** com `AvisoMetodologico` na página | ⬜ M6 |
| Página de erro / 404 | — | `EstadoVazio` com ação "Voltar ao início" | ⬜ M2 |

Regra para novos componentes: precisa de uso em ≥ 2 telas **ou** ser reutilizado do formulário; senão fica dentro da página.

## 5. Wireframes por rota

Referência: **360 × 640 px**. `[ ]` = alvo de toque (≥ 48 px). `▢` = foto. Texto entre `« »` vem do banco.

### 5.1 `/problema/[id]` — **primeira a construir**

```
┌──────────────────────────────┐
│ Observatório Goiás  Problemas│
├──────────────────────────────┤
│ ← Voltar para problemas      │
│                              │
│ «Buraco na Rua das Flores»   │  h1
│ Anápolis · Infraestrutura    │
│ [✓ Resolvido]   12/10/2026   │  SeloSituacao + data
│                              │
│ ┌ Resposta oficial ────────┐ │  só se houver
│ │ Prefeitura, em 20/10     │ │
│ │ «texto»                  │ │
│ └──────────────────────────┘ │
│                              │
│ «Descrição do relato…»       │
│                              │
│ ▢ ▢ ▢   (fotos publicadas)   │  só se houver
│                              │
│ Andamento                    │  h2
│ │● 20/10  Situação: Resolvido│
│ │   «texto» Evidência: «..»  │  LinhaDoTempo
│ │● 15/10  Encaminhado ao órg.│
│ │● 12/10  Recebido           │
│                              │
│ [ Compartilhar no WhatsApp ] │  primário
│ Esse problema também me afeta│  M6
│ Denunciar conteúdo           │  M6
│                              │
│ ⓘ Aviso metodológico         │
│ Protocolo: «OBS-…»           │
└──────────────────────────────┘
```

- Ordem de leitura: **o que é → situação → o que o órgão respondeu → detalhes → histórico → ações**.
- `resolvido` sempre mostra justificativa e evidência (a view já garante). Sem evidência, a página não mostra "Resolvido".
- `verificado = false` (padrão) **não** gera selo; só relato `verificado = true` ganha o texto "Conferido pela equipe". Regra de uso do selo: pendente (ver `estrutura-do-sistema.md` §2).
- Metadados: `<title>` = título do relato + município; Open Graph: título, "Município · Situação", imagem padrão (a definir).
- Estados: id inexistente, ou id não publicado → mesma tela **404** (não revela existência).

### 5.2 `/problemas`

```
┌──────────────────────────────┐
│ cabeçalho                    │
├──────────────────────────────┤
│ Problemas relatados          │  h1
│ Município                    │
│ [ Todos os municípios ▾ ] [Filtrar]
│ Categoria                    │
│ (Todas) (Saúde) (Educação) → │  chips que quebram linha
│ Limpar filtros               │  só com filtro
│                              │
│ ┌──────────────────────────┐ │
│ │ «Título»                 │ │  CartaoProblema
│ │ Anápolis · Saúde         │ │
│ │ [→ Encaminhado] 10/10    │ │
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │ …                        │ │
│ └──────────────────────────┘ │
│ [ Próxima página ]           │
│ ⓘ Aviso metodológico         │
└──────────────────────────────┘
```

- Filtros viram parâmetros da URL (compartilháveis). Valor inválido volta ao padrão, nunca erro.
- Página de 20 itens (`TAMANHO_PAGINA`), cursor, sem scroll infinito.
- Vazio: `EstadoVazio` "Nenhum relato encontrado" + "Limpar filtros" se houver filtro.
- Fora do M2: busca por texto, ordenação, mapa, filtro por situação.

### 5.3 `/municipios/[slug]`

```
┌──────────────────────────────┐
│ Anápolis                     │  h1
│ 12 relatos publicados        │
│ [Município em acompanhamento]│  ou "Em breve" (ver nota)
│ Categoria (Todas)(Saúde)…    │
│ (lista como em /problemas,   │
│  sem seletor de município)   │
│ [ Próxima página ]           │
│ ⓘ Aviso metodológico         │
└──────────────────────────────┘
```

- Reaproveita `ListaProblemas` com `municipioFixo`.
- Slug inexistente → 404.
- Nota: município sem operação ativa mostra "Ainda não acompanhamos este município" em vez de lista vazia que pareça abandono.
  Texto e selo **[PROPOSTO]**, dependem de `ativo_acompanhamento`.

### 5.4 `/` — mínima

```
┌──────────────────────────────┐
│ cabeçalho                    │
│ O que precisa melhorar       │  h1
│ na sua cidade?               │
│ Relatos de problemas públicos│
│ em Goiás, com o andamento de │
│ cada um.                     │
│ [ Ver problemas ]            │  primário (M2)
│ [ Registrar um problema ]    │  primário (M3)
│                              │
│ Números                      │  h2
│ 28 relatos · 4 municípios    │  v_indicadores_gerais
│ ⓘ Aviso metodológico         │
│                              │
│ Últimos relatos              │  h2
│ (5 CartaoProblema)           │
│ Ver todos →                  │
└──────────────────────────────┘
```

- No M2 só existe "Ver problemas"; "Registrar" entra no M3. Dois botões primários não coexistem: no M3 o de registrar é o primário e o outro vira link.
- Banco vazio: contagens somem, `EstadoVazio` explica "Ainda não há relatos publicados".

### 5.5 `/registrar` — M3/M4 **[PROPOSTO]**

```
┌──────────────────────────────┐
│ ← Voltar                     │
│ Registrar um problema        │  h1
│ Leva cerca de 3 minutos.     │
│                              │
│ Onde? Município ▾            │  1
│ O quê? Categoria ▾           │  2
│ Título (curto)               │  3
│ [____________________]       │
│ O que está acontecendo?      │  4
│ [____________________]       │
│ [ + Adicionar foto ] (até 3) │  M4
│                              │
│ ( ) Quero ficar anônimo      │  5
│     Não guardamos contato.   │
│ ( ) Posso ser contatado      │
│   Nome (opcional)            │
│   WhatsApp (opcional)        │
│   [ ] Aceito receber         │
│       atualizações           │
│                              │
│ Seu relato será analisado    │
│ antes de aparecer no site.   │  segundo `MODO_PUBLICACAO`
│ [ Enviar relato ]            │  fixo no rodapé da tela
└──────────────────────────────┘
```

- Uma coluna, um campo por linha, rascunho de texto salvo no aparelho. Foto comprimida no cliente (≤ 1600 px).
- Escolha de anonimato **exclui** os campos de contato (o banco recusa as duas coisas juntas).
- Sucesso: tela com **protocolo** e **link para guardar** (contém o token no `#`). Aviso claro: "quem tiver este link vê o andamento; guarde-o".
- Erros: mensagem junto do campo + resumo no topo; nunca limpar o que a pessoa digitou.
- Falha parcial (foto): sucesso com aviso "n foto(s) não foram enviadas".

### 5.6 `/acompanhar` — M3 **[PROPOSTO]**

```
┌──────────────────────────────┐
│ Acompanhar meu relato        │
│ «Título»  Protocolo «…»      │
│ [→ Em análise]               │
│ Estado: Em revisão antes de  │
│ aparecer no site             │  moderacao em linguagem simples
│ Andamento (LinhaDoTempo)     │
│ ───────────────              │
│ Apagar meus dados            │  h2
│ ( ) Só meu contato           │
│ ( ) Contato e o relato       │
│ [ Apagar ]  (confirmação)    │
└──────────────────────────────┘
```

- Sem token válido: tela única "Link inválido ou expirado" (não distingue os dois casos).
- Token lido do fragmento no cliente; nunca em query string.

### 5.7 `/inteligencia` — M6 **[PROPOSTO]**

Blocos: totais gerais → por situação → por mês → município × categoria. Cada bloco: **tabela primeiro**, gráfico opcional.
Todo gráfico tem tabela equivalente, não depende de cor e traz fonte e limitação.
Suprimir células com poucos casos (limiar a definir). `AvisoMetodologico` no topo, não no rodapé.
Metodologia ainda não escrita (`estrutura-do-sistema.md` §10).

### 5.8 Páginas institucionais — Gate jurídico

Texto corrido em coluna única, h1 + h2, índice no topo se > 3 seções. Conteúdo **⛔ depende de decisão externa**.

### 5.9 Admin — M5 **[PROPOSTO]**

Fora deste documento até a decisão de autenticação (`estrutura-do-sistema.md` §5). Linhas gerais já decididas no desenho:
fila de moderação como tela inicial, detalhe com ações de moderação e linha do tempo, contato só sob clique registrado.
Prioridade de uso: **celular do moderador**; tabela larga vira lista de cartões.

## 6. Estados globais

| Estado | Comportamento |
|---|---|
| Carregando | Texto "Carregando…" com `role="status"`; sem spinner decorativo; conteúdo estático não espera dados |
| Vazio | `EstadoVazio` com verdade ("ainda não há relatos aqui"), nunca painel falso |
| Erro de leitura | Mensagem "Não foi possível carregar agora. Tente de novo." + link para tentar novamente; sem detalhe técnico |
| 404 | "Não encontramos esta página" + "Ver problemas" + "Início" |
| Sem conexão (formulário) | Rascunho preservado; botão "Tentar novamente"; nunca perder texto |
| Limite de envios (429) | "Muitos envios em pouco tempo. Tente de novo mais tarde." |
| Ambiente de teste | `AvisoAmbiente` em toda página, `noindex` |

Arquivos a criar: `src/app/error.tsx`, `src/app/not-found.tsx`.

## 7. Acessibilidade — checklist por entrega

- [ ] Contraste AA (≥ 4,5:1 texto; ≥ 3:1 componentes) com os tokens da §2.1
- [ ] Teclado: tudo alcançável, ordem lógica, foco visível, "pular para o conteúdo" funciona
- [ ] Um `h1` por página; níveis de título sem salto
- [ ] Imagens com `alt` descritivo ("Foto 1 de 3 do relato"); ícones decorativos `aria-hidden`
- [ ] Estado nunca só por cor (selo, filtro ativo com `aria-current`, erro com ícone+texto)
- [ ] Formulários: rótulo visível, `autocomplete` adequado, `inputmode="tel"` no WhatsApp, erros ligados por `aria-describedby`
- [ ] Idioma `pt-BR` no `<html>`; datas por `<time>`
- [ ] Zoom de 200 % sem rolagem horizontal; testado em 320 px
- [ ] Páginas de conteúdo funcionam com JS desligado
- [ ] Verificação: Lighthouse (acessibilidade ≥ 95) + leitura manual com leitor de tela em uma rota por marco

## 8. Voz e vocabulário

| Interno | Na interface |
|---|---|
| ocorrência | relato · problema |
| `moderacao = pendente` | "Em revisão antes de aparecer no site" |
| `retido` | "Em revisão" (sem acusar o autor) |
| `removido` | "Retirado do site" + motivo, se houver |
| token de gestão | "link de acompanhamento" |
| `registrado` … `encerrado_sem_solucao` | ver `situacao.ts` (7 rótulos + descrição) |
| `verificado` | "Conferido pela equipe" (só quando verdadeiro) |
| `confirmacoes_total` | "pessoas dizem que também são afetadas" — com ressalva, nunca como gravidade |

Tom: frases curtas, voz ativa, sem jargão jurídico ou técnico, sem culpar órgão ou pessoa. Nunca "reclamação" para o relato;
nunca prometer solução ("Encaminhamos" só quando houve encaminhamento).

## 9. Desempenho (orçamento)

| Métrica | Alvo |
|---|---|
| LCP no detalhe (Lighthouse mobile) | < 2,5 s |
| HTML + CSS + JS da página de leitura | < 100 KB |
| Webfonts | 0 |
| Imagens | `next/image`, largura máxima 1600 px, `loading="lazy"` abaixo da dobra |
| JS de cliente nas rotas de leitura | o mínimo do Next; nenhum componente de cliente próprio no M2 |

## 10. Lacunas de design (não resolvidas)

1. Imagem Open Graph padrão e identidade visual (logotipo, nome): depende de marca/domínio (⛔).
2. Regra de uso do selo `verificado`.
3. Texto e UI de "município em breve".
4. Tabela de erros de formulário (mensagem por código da API).
5. Design do admin e do painel de inteligência.
6. Tema escuro e `prefers-reduced-motion` (hoje sem animação nem tema escuro).
7. Validação com usuários reais (rótulos de situação e fluxo do formulário).
