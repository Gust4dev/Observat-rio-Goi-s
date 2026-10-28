# Mapa de design — Observatório Goiás

**Estado:** especificação proposta para produto cívico mobile first. Não representa confirmação de implementação, operação, parceria institucional ou dado real. Nome e wordmark são provisórios. Texto jurídico precisa de revisão antes da publicação.

**Escopo:** experiência pública nas rotas `/`, `/problemas`, `/problema/[id]`, `/municipios`, `/municipios/[slug]`, `/registrar`, `/acompanhar`, `/dados` e páginas institucionais. Administração não faz parte desta entrega.

**Base consultada:** briefing do produto, documentação local (`visao-geral.md`, `fluxos.md`, `design.md` anterior e documentos relacionados), inspeção de `src/app/globals.css` e [página-base](https://observatoriogo.com.br/). O CSS atual ainda usa branco, azul e fonte de sistema; os tokens deste mapa são uma direção proposta e não descrevem a interface já implementada. As páginas internas da referência não estavam acessíveis nesta consulta; seus comportamentos foram especificados a partir do briefing.

## A. Diagnóstico e conceito

### Diagnóstico da base do chefe

**Manter:** verde e creme transmitem seriedade sem aparência de portal estatal; linguagem direta (“Qual é a sua cidade?”), registro sem conta, protocolo privado, conteúdo demonstrativo identificado, formulário curto por etapas, contorno territorial como sinal regional e hierarquia entre ação primária, secundária e terciária. A home da referência confirma essas escolhas e oferece um bom ponto de partida para a promessa do serviço.

**Melhorar:** a base usa o mapa como centro visual e repete cartões com o mesmo peso; nesta proposta, a tarefa e a situação vêm primeiro, e o território vira assinatura discreta. Os sete estados ganham nome e ícone próprio, sem depender da cor. “Também me afeta” recebe ressalva explícita para não parecer medida de gravidade. O detalhe separa situação, revisão editorial, resposta oficial e evidência; a lista varia a hierarquia com categoria e metadados, sem criar ranking. Estados vazios, rede fraca e envio parcial recebem conteúdo próprio. A barra inferior não cobre conteúdo e a leitura dos painéis não depende do gráfico.

**Conceito — “Caderno público do território”:** uma interface de serviço que lembra uma ficha de acompanhamento legível, não um portal nem uma campanha. Sua assinatura visual é a **linha de registro**: uma linha fina contínua, interrompida por marcadores quadrados, que conecta os metadados do relato à sua linha do tempo e reaparece no progresso do formulário. Ela sugere sequência e rastreabilidade sem usar mapa decorativo, brasão ou ilustração genérica. Fundo claro, Manrope nos títulos e Source Sans 3 no conteúdo foram escolhidos por hierarquia e leitura rápida; o verde fica reservado às ações e o ouro a pequenas ênfases informativas. Três princípios: **1. Primeiro a situação:** em poucos segundos, a pessoa entende o que foi relatado e o andamento. **2. Evidência separada de promessa:** conferência, resposta oficial e resolução documentada têm rótulos distintos. **3. Ação sem cadastro e sem surpresa:** cada passo explica o que será publicado, o que fica privado e o que acontece depois.

### Direção de interface aplicada

| Escolha | Direção fechada | Efeito esperado |
|---|---|---|
| Referência | Caderno público de acompanhamento, com linguagem de serviço e estrutura de ficha editorial. | A pessoa que chega por link cai dentro da informação do relato, em vez de uma apresentação institucional genérica. |
| Cor | Creme e verde-floresta preservados com intenção; ouro só em notas/demonstração; azul petróleo reservado a dados geográficos e informação. Sem faixa tricolor. | Mantém calor regional sem evocar bandeira ou sinal partidário; a cor de ação continua previsível. |
| Tipografia | Manrope para títulos e números; Source Sans 3 para leitura e campos; fallback de sistema quando a fonte não carrega. | Separa orientação de conteúdo sem sacrificar leitura em tela pequena ou conexão lenta. |
| Layout | Conteúdo centrado no trabalho: detalhe como ficha, lista como sequência de relatos, registro como formulário progressivo. Uma coluna até o tablet; desktop usa espaço lateral só para contexto secundário. | Evita o hero centralizado com três benefícios e mantém a ação principal perto do começo. |

Motivos visuais permitidos: (1) a linha de registro e seus marcadores para cronologia/progresso; (2) coordenadas tipográficas — município, categoria, protocolo e data alinhados como metadados. Não adicionar ruído/grão, textura, gradiente, mapa abstrato decorativo ou sombra macia. Cartões são usados quando agrupam ações ou conteúdo relacionado; listas podem ser separadas por divisores e variação tipográfica para não parecerem uma pilha uniforme de caixas.

### Decisões do debate de design

Seis lentes foram usadas: serviço cívico, pesquisa de campo, acessibilidade, jornalismo de dados, privacidade e ceticismo do cidadão. O debate atacou a proposta de “hero com mapa + contadores” e o uso de selos coloridos como síntese do estado.

| Decisão | Por quê | Alternativa rejeitada e ataque | Risco aberto / dissidência |
|---|---|---|---|
| Detalhe começa com título, situação, local e datas; mapa não é o herói. | A pessoa que chega de um link quer reconhecer o problema antes de explorar o território. | Mapa grande no topo: usa espaço e banda antes de responder “o que aconteceu?”. | Jornalismo de dados pode querer mapa cedo; a fase 2 pode testar mapa depois do resumo e da tabela. |
| Situação, “conferido pela equipe” e resposta oficial são três sinais independentes. | Um relato conferido não é uma solução; uma resposta não comprova resolução. | Um selo verde “verificado/resolvido”: pode sugerir chancela institucional ou certeza maior que a evidência. | Definir operacionalmente o que a equipe consegue chamar de “conferido”. |
| Números são apresentados com aviso metodológico ao lado, sem destaque competitivo. | Participação voluntária não mede prevalência, gravidade nem desempenho de município. | Ranking/top 10 proeminente: incentiva comparação injusta e leitura política de volume. | Imprensa pode pedir comparação; oferecer recorte por filtro com denominador e nota persistente, sem classificação. |
| Município sem acompanhamento recebe explicação e opção útil para continuar. | “Sem relatos” não significa “sem problemas” nem abandono do cidadão. | Estado vazio neutro ou página sem conteúdo: pode parecer falha ou desinteresse. | A plataforma precisa confirmar quando a cobertura começa; não sugerir promessa de prazo. |
| Faixa tricolor é removida; identidade vem de uma linha cartográfica e do wordmark. | Verde-amarelo-azul pode parecer bandeira ou sinal partidário/governamental. | Manter a faixa por continuidade: a referência não é forte o bastante para justificar ambiguidade. | A marca final precisa de pesquisa de neutralidade e busca de conflito visual. |

**Alternativas avaliadas:** (a) mapa como elemento dominante; (b) portal editorial de lista e ficha pública; (c) painel de indicadores como entrada. Recomenda-se (b): atende ao link compartilhado e à conexão fraca; mapa e gráficos ficam em segundo plano e só aparecem quando agregam entendimento.

## B. Identidade visual e conteúdo

### Wordmark provisório

Texto em duas linhas ou em uma linha conforme largura: **Observatório** em peso 650 e **Goiás** em peso 750, ambos em tinta-floresta; pequeno traço de coordenada/meridiano aberto ao lado do nome, sem estrela, brasão ou contorno literal no logotipo. Versão curta “Observatório GO” só em contextos estreitos; nome acessível sempre “Observatório Goiás”. O “GO” não recebe amarelo vivo nem caixa verde que possa lembrar marca oficial.

### Paleta

Valores OKLCH abaixo foram convertidos de sRGB e arredondados. Contrastes WCAG calculados sobre os hex indicados, fórmula WCAG 2.x; não interpolar cores com transparência. O par de texto indicado é normativo. Estados que não aparecem na tabela não podem ser combinados sem nova medição.

| Token | HEX | OKLCH aproximado | Função e pares permitidos |
|---|---|---|---|
| `fundo` | `#F8F7F1` | `oklch(97.5% 0.008 99)` | Fundo principal; texto `texto` 13,04:1 e `texto-suave` 7,08:1. |
| `superficie` | `#FFFFFF` | `oklch(100% 0 0)` | Cartões e campos; texto `texto` 14,00:1 e `texto-suave` 7,60:1. |
| `texto` | `#1B3028` | `oklch(28.9% 0.031 168)` | Títulos, texto e texto sobre tons claros; contraste ≥12:1 nos fundos claros listados. |
| `texto-suave` | `#45584F` | `oklch(44.1% 0.028 165)` | Metadados e explicações; 7,08:1 no fundo. Não usar para texto com opacidade. |
| `acao` | `#17623C` | `oklch(44.1% 0.095 156)` | Botão/link principal; texto branco 7,37:1; no fundo creme 6,87:1. |
| `acao-pressionada` | `#154A31` | `oklch(34.6% 0.076 157)` | Estado ativo de ação; texto branco 10,22:1. |
| `destaque` | `#8A5A00` | `oklch(50.8% 0.108 73)` | Ênfase, ícone ou texto em âmbar; texto sobre creme 5,52:1 e sobre `destaque-suave` 5,11:1. Nunca texto branco. |
| `destaque-suave` | `#F6EED5` | `oklch(94.9% 0.034 92)` | Fundo de nota de demonstração e atenção; usar `texto` ou `destaque` para texto. |
| `territorio` | `#234C66` | `oklch(39.9% 0.064 239)` | Azul petróleo reservado a informação geográfica e série de dados; branco 9,14:1. Não usar como indicador de governo. |
| `terra` | `#8A492F` | `oklch(47.9% 0.096 42)` | Acento editorial raro e fotografia; branco 6,83:1. Não codifica risco. |
| `sucesso-fundo` | `#E8F0E8` | `oklch(94.7% 0.014 145)` | Fundo de estado resolvido; texto `texto` ≥12,04:1. |
| `info-fundo` | `#EAF0F4` | `oklch(95.2% 0.008 237)` | Fundo de informação; texto `texto` ≥12,18:1. |
| `erro` | `#8C2F28` | `oklch(44.2% 0.128 28)` | Erros e ação destrutiva; em `erro-fundo` 6,99:1. Reservado a erro, nunca a estado de relato. |
| `erro-fundo` | `#F9E9E7` | `oklch(94.6% 0.018 26)` | Fundo de erro; texto `texto` ou `erro`. |
| `neutro-fundo` | `#EEF0EC` | `oklch(95.2% 0.006 129)` | Fundo de rótulo neutro; `texto-suave` 5,78:1. |
| `borda` | `#7F8D83` | `oklch(62.9% 0.022 155)` | Contorno de controles e foco secundário; 3,24:1 no creme e 3,48:1 no branco. Separadores decorativos podem usar `borda-suave`. |
| `borda-suave` | `#D8DED7` | `oklch(89.5% 0.010 151)` | Divisores não essenciais; não usar como único limite de input. |

**Razões de contraste de texto/fundo da paleta:** `texto`/`fundo` 13,04:1; `texto`/`superficie` 14,00:1; `texto-suave`/`fundo` 7,08:1; `texto-suave`/`superficie` 7,60:1; `acao`/`superficie` 7,37:1; `acao`/`fundo` 6,87:1; branco/`acao` 7,37:1; branco/`territorio` 9,14:1; branco/`terra` 6,83:1; `destaque`/`fundo` 5,52:1; `destaque`/`destaque-suave` 5,11:1; `erro`/`erro-fundo` 6,99:1; `texto-suave`/`neutro-fundo` 5,78:1. Texto principal em fundos semânticos usa `texto`: ≥12:1. Limite de componentes: `borda` contra fundo ≥3:1. Foco usa `acao`, com contraste superior a 3:1 nos fundos claros.

**Não permitidos:** branco sobre ouro; texto sobre fotografia sem superfície opaca; estados apenas com fundo colorido; texto cinza sobre ouro claro; opacidade em texto; gradientes. Em gráficos, cada série usa também rótulo, padrão ou marcador, nunca apenas cor.

### Tipografia

- **Manrope variável**, subtipo latino, títulos e números; **Source Sans 3 variável**, subtipo latino, corpo, formulários e dados. No máximo dois arquivos WOFF2 locais; `font-display: swap`.
- Fallback: `Arial, sans-serif` ajustado via `size-adjust` para aproximar x-height; `system-ui` se métricas não estiverem disponíveis. Se a equipe não puder hospedar as fontes dentro do orçamento, sistema primeiro é aceitável e preferível a fonte remota bloqueante.
- Corpo: 16 px / 1,5 (mínimo); ajuda e metadado: 14 px / 1,45; título de cartão: 18 px / 1,3; H2: 24 px / 1,25; H1: 32 px / 1,15 no celular, 44 px em 768, até 52 px em 1280. Evitar caixa-alta em parágrafos e rótulos longos.
- Números tabulares (`font-variant-numeric: tabular-nums`) para contagens, protocolo e gráficos.

### Espaço, forma, grade e sombra

| Token | Valor |
|---|---:|
| `space-1` a `space-8` | 4, 8, 12, 16, 24, 32, 48, 64 px |
| `raio-controle` | 8 px |
| `raio-cartao` | 16 px |
| `raio-painel` | 24 px, só para destaque de página |
| `borda-padrao` | 1 px sólida `borda` |
| `sombra-cartao` | nenhuma em repouso; foco/elevação usa contorno e deslocamento, não sombra difusa |
| `alvo-toque` | mínimo 48 × 48 px |
| `gutter-mobile` | 16 px em 360 e 375 |
| `largura-leitura` | 680 px |
| `largura-pagina` | 1120 px |

Grade: 360/375 = uma coluna; 768 = duas colunas só para módulos independentes (números, atalhos); 1280 = conteúdo central 1120 px, 12 colunas com gutters de 24 px. O formulário, detalhe e páginas legais permanecem em uma coluna de leitura. Espaços amplos criam hierarquia sem depender de ilustração.

### Ícones e território

Ícones próprios em SVG inline/de sprite: contorno de 1,75 px, terminais arredondados, área 24 × 24 px, forma simples, sem preenchimento decorativo. Categorias usam o mesmo estilo e uma placa de 40 × 40 px; ícones de interface têm 20 ou 24 px. Ícone decorativo fica oculto a leitores de tela; ícone que informa estado acompanha nome textual. Não misturar emoji, ícones de bibliotecas diferentes ou metáforas de perigo para categorias.

| Categoria | Ícone semântico |
|---|---|
| Saúde | Cruz de primeiros cuidados, sem serpente ou símbolo de hospital específico |
| Educação | Livro aberto |
| Infraestrutura | Rua com faixa e reparo |
| Segurança | Escudo simples |
| Transporte e mobilidade | Ônibus frontal |
| Iluminação pública | Poste com luminária |
| Saneamento | Gota sobre linha de tubulação |
| Meio ambiente | Folha com nervura |
| Emprego e desenvolvimento | Ferramenta/engrenagem simples |
| Serviços públicos | Prédio cívico abstrato, sem brasão |
| Outros | Quatro quadrados organizados |

Ícones de interface: seta voltar/avançar, lupa, filtro, localização, calendário, informação, alerta, fechar, copiar, compartilhar, câmera, remover, recarregar, check, relógio/espera e link. O nome acessível pertence ao controle, não ao SVG.

O contorno real de Goiás aparece somente em `/dados` (fase 2) e, como elemento de até 72 px, na assinatura institucional da home desktop. SVG estático com menos de 30 KB, sem pontos falsos nem preenchimento por município antes de haver dado territorial válido. Em mobile não concorre com a busca de cidade. Texto alternativo: “Contorno do estado de Goiás, usado como referência territorial”; quando decorativo, `alt=""`.

### Tom de voz

Frases curtas, voz ativa, sem culpa, promessa ou jargão. Preferir “relato”, “problema”, “equipe”, “resposta oficial” e “link de acompanhamento”. Evitar “ocorrência”, “moderação”, “token”, “denúncia” em mensagens comuns, “impacto” sem explicação e “resolvido” quando falta justificativa e evidência.

| Situação | Exemplo |
|---|---|
| O que é | “Relatos de problemas públicos em Goiás, com atualizações visíveis para todos.” |
| Limite do serviço | “O Observatório não é um canal oficial de atendimento e não substitui a prefeitura ou outros órgãos.” |
| Pré-publicação | “Sua mensagem será analisada pela equipe antes de aparecer no site.” |
| Acompanhamento | “Guarde este link. Ele permite consultar e pedir a exclusão do seu relato.” |
| Sem cobertura | “Ainda não acompanhamos relatos neste município. Você pode registrar um problema e guardar o protocolo.” |
| Sem resposta | “Ainda não há resposta oficial publicada.” |

## C. Sistema de componentes

### Regra compartilhada de estados

Componentes interativos suportam: padrão, foco visível, pressionado/selecionado, desabilitado, erro e carregando quando a operação realmente demora. Controles desabilitados explicam por quê quando isso não for óbvio. Foco: contorno de 3 px `acao`, offset 3 px, nunca removido. Estado de relato e erro sempre exibem palavra + ícone; cor é redundante. Em leitura sem JavaScript, rotas e links essenciais continuam utilizáveis. Movimento apenas em feedback de até 150 ms e respeita `prefers-reduced-motion`; nenhum skeleton animado decorativo.

| Componente | Variações e comportamento | Não fazer |
|---|---|---|
| Cabeçalho | Mobile: wordmark, botão menu rotulado “Abrir navegação” se necessário; desktop: Início, Problemas, Dados, Municípios e ação “Registrar problema”. Link “Pular para o conteúdo” aparece no foco. Estado ativo com texto e sublinhado/indicador. | Não usar menu que exige JS para descobrir as rotas; não ocultar Registrar em desktop. |
| Barra inferior mobile | 4 itens: Início, Problemas, botão central “Registrar”, Dados. Mínimo 48 px, área segura `env(safe-area-inset-bottom)`, fundo sólido, divisória superior. No fluxo de formulário e acompanhamento privado, não aparece para preservar foco e altura. | Não sobrepor conteúdo: `padding-bottom` ≥ altura total + safe area; não cobrir teclado ou botão de envio. |
| Rodapé | Sobre, Transparência, Privacidade, Termos, Regras, Contato; limite do serviço em frase curta; link de acompanhamento. Mobile em lista vertical, desktop em 3 grupos. | Não colocar aviso metodológico só no rodapé nem usar texto legal como única explicação do serviço. |
| Selo de situação | Sete variações descritas em seguida; ícone + rótulo completo, fundos suaves, contorno opcional. Sempre conserva o rótulo em texto. | Não abreviar, usar apenas ponto, associar verde a gravidade ou fundir situação com verificação. |
| Cartão de relato | Editorial compacto: categoria e selo demonstrativo no topo; título como link principal; local; status e data; resposta oficial como linha independente. A área clicável do título é ampla. Versão “resumo” para home e “linha” para município. | Não colocar contador de afetados como escala, não fazer cartão inteiro competir com múltiplos botões. |
| Linha do tempo | Lista ordenada `<ol>` cronológica no layout visual; cada item traz data, tipo, texto, situação nova e evidência quando houver. No detalhe, mais recente primeiro visualmente, mas ordem DOM cronológica reversa apenas se anunciada como “Mais recente”. Recomenda-se mais antigo primeiro para leitura linear. | Não inserir eventos privados nem omitir a data; não chamar mensagem do cidadão de resposta do órgão. |
| Resposta oficial | Painel azul-petróleo claro com título “Resposta oficial”, vínculo declarado (ex.: “Vínculo informado: órgão público”), data, texto e link para histórico. Se vínculo não puder ser confirmado, declarar “Vínculo não confirmado pela equipe”. | Não inventar órgão, assinatura, selo de autenticidade ou contato. |
| Galeria de fotos | 1 foto em largura total; 2–3 em grade que empilha no celular. Toque abre imagem em nova rota/página acessível, sem lightbox obrigatório. `alt` descreve conteúdo visual, não “foto”. | Não exibir metadados EXIF/localização; não bloquear leitura se foto falhar; máximo 3. |
| Filtros | Município com busca/autocomplete e lista filtrada; categoria em chips que quebram linha ou `<select>` compacto; filtro aplicado por botão “Aplicar filtros” quando houver mais de um. Chips têm seleção anunciada. | Não depender de cor; não filtrar enquanto digita sem botão em rede instável; busca por palavra-chave só na fase 2. |
| Paginação | “Página X” e botão “Próxima página”; mantém filtros e foco volta ao título da lista após navegação. URL reflete filtros/página. | Não usar scroll infinito como única forma de chegar a mais relatos. |
| Aviso metodológico | Caixa com ícone de informação, título “Como ler estes números” e duas frases. Repetida perto de todo painel. | Não colapsar por padrão, não esconder no rodapé, não usar texto minúsculo. |
| Estado vazio | Título honesto, explicação concreta e uma única ação útil. Tem variações para lista sem resultados, município sem acompanhamento, sem resposta e sem dados. | Não ilustrar deserto/abandono nem culpar a pessoa por filtros. |
| Campos | Rótulo persistente acima, indicação obrigatório/opcional, ajuda associada, erro com texto e ícone, limite de caracteres quando aplicável. Município usa `<select>` nativo ou combobox acessível com teclado completo. | Não usar placeholder como rótulo; não limpar valores quando a validação falhar. |
| Stepper (5 etapas) | “Etapa 2 de 5 — Categoria” com progresso textual e visual; etapas anteriores são links apenas se o dado já estiver salvo. A etapa atual é anunciada; progresso não depende só de cor. | Não usar cinco colunas/minúsculos números no 360 px; não permitir avanço com validação silenciosa. |
| Botões | Primário preenchido para a ação principal; secundário contornado; terciário link sublinhado. Altura 48–52 px. Carregando mantém largura e nome “Enviando relato…”. | Uma ação primária por tela; não usar dois botões verdes de mesmo peso. |
| Upload | Botão “Adicionar foto”, formatos e tamanho máximo apresentados ao escolher; prévia, remover, processando, falha individual e retentar. Até três fotos. Texto alternativo da prévia “Prévia da foto selecionada”. | Não exigir foto; não perder formulário por erro da imagem; não chamar foto falha de falha do relato inteiro. |
| Alertas | Info (azul), atenção (âmbar), erro (vermelho), sucesso (verde suave); ícone e título verbal. Erros urgentes ficam no início do formulário e ligados ao campo. | Não usar alerta temporário que desaparece; não usar vermelho para status “Encerrado sem solução”. |
| Cartão de indicador | Número, nome completo, período/fonte quando conhecido, nota de interpretação. “Em acompanhamento” identifica quais situações entram no cálculo. | Não mostrar seta de crescimento, medalha, ranking ou cor que sugira qualidade. |
| Tabela | Cabeçalho identificável, legenda, linhas em ordem estável, versão responsiva com rolagem horizontal anunciada ou blocos rotulados. Totais sem arredondamento enganoso. | Não ocultar a tabela equivalente ao gráfico nem tornar a primeira coluna ilegível. |
| Gráficos | Barras para categorias/municípios; linha para mês; rosca apenas para distribuição simples de situação. Sempre com tabela equivalente visível e texto-resumo. | Não usar efeito 3D, eixo cortado, paleta de arco-íris ou rosca com muitas fatias. |
| Selo “Dados de demonstração” | Cápsula tracejada com ícone de amostra e texto integral; acompanha cada relato fictício e grupos de métricas com dados demonstrativos. | Não usar como tooltip nem esconder em telas pequenas. |
| Banner de ambiente | Faixa no topo: “Ambiente de teste — os relatos e números podem ser fictícios.” Foco inicial não é roubado; link “Saiba mais” opcional. | Não confundir com aviso metodológico; em produção some só quando o ambiente é comprovadamente real. |

### Uso da linha de registro

| Contexto | Regra visual | Limite |
|---|---|---|
| Ficha do detalhe | Uma linha fina acompanha a borda esquerda dos metadados e continua até o início do histórico; um marcador quadrado ancora a ficha. A lateral de ações permanece separada. | Não contorna o artigo, não vira moldura e não atravessa conteúdo sem relação. |
| Linha do tempo | Uma linha vertical de 1 px liga os eventos públicos em `<ol>`; cada evento tem um marcador quadrado alinhado ao texto e à data. A ordem do DOM permanece cronológica, mais antigo primeiro. | Sem evento, não desenhar trilho vazio; evento privado nunca recebe marcador. O texto/data comunicam o estado mesmo sem a linha. |
| Stepper | A progressão textual “Etapa X de 5” acompanha trilho com marcadores quadrados; concluídas e atual usam forma/contorno distintos, sempre com rótulo. Em desktop pode ser horizontal; em 360 px deve empilhar verticalmente, sem cinco colunas comprimidas. | Não depender de cor nem de trilho para anunciar etapa; não usar em filtros, indicadores, alertas, navegação ou cada cartão da lista. |

A linha é um sinal de sequência, não decoração: aparece somente nesses três contextos e nunca se repete como textura de fundo.

As pranchas internas da Task 0.2 mostram home e detalhe em 360 × 640 e 1280 × 900, com conteúdo fictício. São protótipos vetoriais, não capturas da aplicação; a revisão de capturas reais fica para a Task 8.1.

### Sete situações

| Situação | Ícone | Fundo e texto | Leitura acessível |
|---|---|---|---|
| Recebido | bandeja com seta para dentro | neutro | “Recebido” |
| Em análise | lupa sobre documento | azul claro | “Em análise” |
| Encaminhado ao órgão | seta para fora | azul claro | “Encaminhado ao órgão” |
| Aguardando resposta do órgão | relógio + balão vazio | âmbar suave, texto `texto` | “Aguardando resposta do órgão” |
| Sendo resolvido | ferramenta simples | azul claro | “Sendo resolvido” |
| Resolvido | check dentro de círculo | verde suave | “Resolvido — justificativa e evidência publicadas” em detalhe; selo curto “Resolvido” |
| Encerrado sem solução | círculo com traço | neutro/terra suave | “Encerrado sem solução” |

“Verificado” não é situação: selo separado “Conferido pela equipe”. Resposta oficial também é sinal separado. Cada status sempre tem texto, ícone reconhecível e tom compatível; não usar vermelho como tom para status sem solução.

## D. Mapa de telas

### Navegação

```mermaid
flowchart TD
  Home[/ Início] --> Registrar[/registrar — formulário M3]
  Home --> Lista[/problemas]
  Home --> Dados[/dados]
  Home --> Municipios[/municipios]
  Lista --> Detalhe[/problema/id]
  Municipios --> Municipio[/municipios/slug]
  Municipio --> Detalhe
  Detalhe --> Acompanhar[/acompanhar#código — privado]
  Registrar --> Sucesso[Protocolo + link privado]
  Sucesso --> Acompanhar
  Detalhe --> Denunciar[Formulário curto de denúncia]
  Home --> Institucional[/sobre, /transparencia, /privacidade, /termos, /regras, /contato]
  Lista -. fase 2 .-> Busca[Busca textual]
  Dados -. fase 2 .-> Mapa[Mapa tocável]
```

### Dados de exemplo usados nos wireframes

Todo nome, número, texto de relato e cronologia nesta especificação são **dados de demonstração fictícios**, usados somente para mostrar composição. Localidade sintética: **Vale Sereno (município fictício)**; bairro **Vila do Ipê (fictício)**. Exemplo de título: “Luz apagada em trecho da praça do bairro”. Protocolo: `OGO-DEMO-000123`. Não publicar como dado real nem associar a órgão ou pessoa identificável. Fase 2 e indicadores sem backend devem exibir essa condição explicitamente.

### `/problema/[id]` — prioridade 1

Hierarquia: navegação → retorno para lista → categoria e demonstração → título/local/data → situação e verificação → resumo da resposta oficial → descrição/fotos → linha do tempo → ações → metodologia/protocolo.

**Wireframe 360 × 640 — primeira dobra e continuação por rolagem**

```text
┌──────────────────────────────────┐
│ Observatório Goiás          ☰    │  56 px
├──────────────────────────────────┤
│ ‹ Todos os relatos                │
│ INFRAESTRUTURA · DEMONSTRAÇÃO     │
│ Luz apagada em trecho da praça   │
│ Vila do Ipê · Vale Sereno         │
│ Publicado 21 out · Atualizado 24  │
│ [◷ Sendo resolvido]               │
│ [✓ Conferido pela equipe]         │
│                                  │
│ RESPOSTA OFICIAL · 24 OUT         │
│ “A equipe responsável informou…”  │
│ Ver resposta completa             │
│                                  │
│ O relato descreve que…            │
│                                  │
│ [foto 1/2]                        │
│                                  │
│ ANDAMENTO                         │
│ 21 out  Relato publicado          │
│ 22 out  Em análise                │
│ 23 out  Encaminhado ao órgão      │
│ …                                │
│ ──────────────────────────────── │
│ [Também me afeta]                 │
│ 4 pessoas marcaram este relato.  │
│ Isso não mede gravidade.          │
│ [Compartilhar no WhatsApp]        │
│ Denunciar este relato             │
│ Como ler este relato e os dados  │
└──────────────────────────────────┘
```

**768 px:** coluna de leitura 680 px à esquerda; fotos em grade 2; caixa “situação + datas” e resposta oficial em coluna lateral somente se houver espaço sem alterar ordem de leitura. **1280 px:** conteúdo central 1120 px; coluna principal 720 px e lateral 320 px com ações, protocolo e aviso metodológico; em telas menores que 900 px a lateral volta ao fluxo principal. A situação não é sticky.

**Prévia Open Graph — 1200 × 630:** fundo `fundo`; barra superior wordmark pequeno; coluna esquerda com selo “RELATO DE CIDADÃO · NÃO VERIFICADO” ou “CONFERIDO PELA EQUIPE”, título em até 3 linhas, local fictício e situação em cápsula textual com ícone; filete cartográfico abstrato no canto inferior, sem mapa municipal; rodapé “Observatório Goiás · Não é canal oficial de atendimento”. Ficha OG nunca mostra nome, protocolo privado, fotos identificáveis nem contador de “também me afeta”. Em link real, título/local/status vêm do dado publicado; sem imagem disponível, usa-se a peça neutra. Texto alternativo/descrição OG descreve a peça sem alegar endosso.

### `/` — home

Hierarquia: promessa e ação → escolha de município → limite do serviço → números e aviso → relatos recentes → três passos → links de confiança.

```text
360 × 640
┌──────────────────────────────────┐
│ Observatório Goiás          ☰    │
│                                  │
│ RELATOS PÚBLICOS EM GOIÁS        │
│ Veja o que precisa melhorar      │
│ na sua cidade.                   │
│ Registre um problema e acompanhe │
│ as atualizações com um protocolo.│
│ Qual é o seu município?          │
│ [Digite o nome do município   ▾] │
│ [Registrar um problema]          │
│ Ver relatos por município        │
│ Não é canal oficial de atendimento│
│                                  │
│ NÚMEROS DA PLATAFORMA            │
│ 28 relatos · 6 municípios        │
│ [Como ler estes números]         │
│ Dados demonstrativos identificados│
│                                  │
│ Relatos recentes                 │
│ [cartão compacto]                │
│ [cartão compacto]                │
│ Como funciona · 3 passos         │
└──────────────────────────────────┘
```

Os valores `28` e `6` são exemplos e devem estar cobertos por “Dados de demonstração” em cada bloco; se não houver dados reais/demonstrativos carregados, esconder os números e mostrar estado vazio. **768:** promessa e seletor na primeira coluna, faixa numérica (com nota junto) na segunda; relatos em 2 colunas. **1280:** grid editorial 7/5 colunas com promessa/seletor à esquerda; à direita, cartão de atividade recente, não mapa decorativo. Contadores em linha horizontal. Passos na faixa inferior.

### `/problemas`

Hierarquia: H1 e resumo → filtros → quantidade → aviso metodológico visível → lista → paginação.

```text
360 × 640
┌──────────────────────────────────┐
│ Relatos de problemas             │
│ Veja o andamento por município.  │
│ Município [Todos os municípios ▾]│
│ Categoria [Todas as categorias ▾]│
│ [Aplicar filtros]  Limpar         │
│ 28 relatos · exemplo demonstrativo│
│ ⓘ Participação voluntária; volume│
│ não mede gravidade nem prevalência.│
│ ┌──────────────────────────────┐ │
│ │ INFRAESTRUTURA · DEMONSTRAÇÃO│ │
│ │ Luz apagada em trecho…       │ │
│ │ Vale Sereno · Vila do Ipê    │ │
│ │ [◷ Sendo resolvido]          │ │
│ │ Atualizado em 24 out         │ │
│ │ Resposta oficial publicada  │ │
│ └──────────────────────────────┘ │
│ …                                │
│ [Próxima página]                 │
└──────────────────────────────────┘
```

**768:** filtros em linha, lista em uma coluna até 900 px. **1280:** filtros numa barra superior e lista (760 px) com painel explicativo de método (300 px); sem ranking. Busca textual aparece apenas rotulada “Fase 2 — ainda sem backend”, não como campo ativo.

### `/municipios` e `/municipios/[slug]`

**Índice:** H1 “Municípios de Goiás”; campo “Filtrar municípios” funcional sobre 246 nomes; cada linha tem nome e contagem de relatos ou “Sem relatos publicados”; botão/linha de 48 px. Contagem zero não equivale a acompanhamento ativo. Em 360, lista alfabética simples e paginação/agrupamento por letra; em 768/1280, grade de duas/três colunas sem transformar maior volume em destaque. Filtro local é essencial para localizar município; preservar opção com leitor de tela, sem depender de autocomplete JS.

**Página de município acompanhada:** breadcrumb, nome, badge “Acompanhamento ativo” apenas se há estado de operação confiável, cartões de indicadores com aviso metodológico, filtros de categoria e lista de relatos. **Sem acompanhamento:** “Ainda não acompanhamos relatos neste município.” Complemento: “Isso não quer dizer que não existam problemas. Você pode registrar um relato e guardar o protocolo; a equipe analisará antes de publicar.” Ação principal “Registrar um problema neste município”; alternativa “Ver todos os municípios”. Não exibir contador inventado ou prazo. Em 768 e 1280, mesmos dados; os cartões podem formar faixa e lista passa a 2 colunas em 1280.

### `/registrar`

**M3 — sem fotos e sem contato.** Um formulário em uma coluna, organizado em Local, Categoria e Relato. Campos: Município obrigatório (seletor nativo com os 246 municípios), Categoria obrigatória, Título e Descrição. Não pedir bairro, endereço, nome, telefone ou consentimento para contato neste marco. O registro é anônimo: nenhum contato é guardado. Fotos ficam para M4.

Rótulos persistentes e ajuda “Não inclua nomes, telefones, documentos ou endereço residencial no texto”. Exibir limite/contagem de caracteres; erros ligados ao campo e resumo que recebe foco. Validar no cliente como ajuda e novamente no servidor. O rascunho, o código privado e a chave de tentativa ficam no aparelho durante retries; explicar uso de aparelho compartilhado. O texto só segue ao servidor após “Enviar relato”.

```text
375 px · M3
┌──────────────────────────────────┐
│ Registrar um problema             │
│ Sem conta e sem contato           │
│ Município (obrigatório)           │
│ [Escolha um município          ▾] │
│ Categoria (obrigatória)           │
│ [Escolha uma categoria         ▾] │
│ Título (obrigatório)              │
│ [Descreva em poucas palavras]     │
│ Descrição (obrigatória)           │
│ [Conte o que está acontecendo]    │
│ Não inclua dados pessoais.        │
│ Seu relato será analisado antes   │
│ de aparecer no site.              │
│ [Verificação de segurança]        │
│ [Enviar relato]                   │
└──────────────────────────────────┘
```

**Estados:** validação, “Enviando relato…”, erro com retry, limite de envios e indisponível. Preservar campos e credenciais da tentativa após erro ou resposta não confirmada. Se a configuração do serviço faltar, mostrar “Registro indisponível no momento. Tente novamente mais tarde”, sem erro técnico. Sem JavaScript, mostrar mensagem explícita: “Para registrar e gerar seu link privado com segurança, ative o JavaScript”; envio fica indisponível, leitura pública permanece acessível.

**Sucesso:** “Relato enviado para análise”, protocolo e ações “Copiar protocolo”, “Copiar link privado” e “Compartilhar link privado”. Explicar: “Este link é a única forma de acompanhar e pedir a exclusão. Quem tiver o link poderá fazer isso. Guarde-o em local seguro”. O compartilhamento privado só ocorre por ação explícita; não abrir WhatsApp automaticamente. URL usa `/acompanhar#<código>`, nunca query/path/metadata. **768/1280:** mesma coluna de leitura, sem painel lateral necessário.

### `/acompanhar`

O link privado traz o código no fragmento `#`, lido somente no navegador. Não pedir protocolo como credencial adicional nem permitir consulta por protocolo isolado. Se o link estiver ausente/inválido, mostrar a mesma orientação neutra para abrir o link guardado; não revelar existência de relato. Consulta usa POST; segredo nunca aparece em HTML do servidor, query, metadata ou logs.

Resultado: aviso “Este acompanhamento é privado”, protocolo, título, situação, revisão, datas, atualizações visíveis ao autor e respostas publicadas. Não exibir notas internas nem dados de contato. Consulta inválida, expirada ou inexistente usa uma única mensagem; erro do serviço oferece retry. Foco vai ao título do resultado e mudanças são anunciadas. Sem JavaScript, explicar que o código privado precisa ser lido no navegador.

**Exclusão no M3:** ação “Pedir exclusão do relato” abre confirmação explícita. Explicar que o texto é retirado de exibição e substituído por um marcador, enquanto o registro de auditoria permanece. O M3 não coleta contato, por isso não oferece “Apagar meu contato”. Confirmar chama `/api/excluir`; só mostrar estado final após resposta confirmada, sem fingir fila de análise humana que não existe no RPC. 375/768/1280 mantêm uma coluna; controles com 48 px e confirmação no fluxo, acessível por teclado.

### `/dados`

No topo, antes dos cartões: “Os dados vêm de relatos voluntários publicados nesta plataforma. Não representam todos os problemas e não medem gravidade, qualidade de gestão ou desempenho dos municípios.” Mostrar ainda se há números de demonstração.

Filtros: Município, Categoria, período (todo o período/30/90 dias/12 meses) — **período e mapa são fase 2, ainda sem backend** e não aparentam funcionais. MVP mostra indicadores disponíveis: total de relatos, municípios com relatos, relatos com resposta oficial, resolvidos com documentação, em acompanhamento (com definição do cálculo explícita). Blocos: situações, mês, município × categoria. Cada gráfico tem resumo em texto e tabela equivalente visível. Nenhum dado oficial até integração ativa; bloco “Indicadores oficiais — fase 2” explica que ainda não são exibidos. 360: filtros empilhados, cartões em 1 coluna, tabelas com rótulos; 768: cartões 2 colunas, gráficos em 2 colunas; 1280: cartões em 4 colunas, gráficos em 2 colunas. Mapa tocável só depois da fase 2, SVG leve e lista tabular equivalente.

### Páginas institucionais e estados globais

`/sobre`, `/transparencia`, `/privacidade`, `/termos`, `/regras`, `/contato`: título, resumo em linguagem simples, sumário se houver mais de 3 seções, coluna de leitura (680 px), data de revisão e contato. Cada bloco jurídico usa placeholder visível **[A REVISAR PELO JURÍDICO]** em ambiente de design; não publicar como compromisso institucional. Em 360, sem sidebar; 768/1280 pode ter índice sticky somente se preserva ordem de foco.

| Estado global | Conteúdo e ação |
|---|---|
| Carregando | “Carregando relatos…” com `role="status"`; manter cabeçalho e mensagem de contexto. Sem spinner obrigatório. |
| Vazio | “Ainda não há relatos publicados aqui.” Explicar se o filtro pode ser removido. |
| Erro de leitura | “Não foi possível carregar agora. Tente novamente.” Botão “Tentar novamente”; preservar filtros. |
| 404 | “Não encontramos esta página.” Ações “Ver relatos” e “Ir para o início”. Para relato não publicado, mesma resposta sem revelar existência. |
| Sem conexão | “Você está sem conexão. Seu rascunho continua salvo neste aparelho.” Ação “Tentar enviar novamente”. |
| Limite de envios | “Muitos envios em pouco tempo. Tente de novo mais tarde.” Sem contagem regressiva inventada. |
| Ambiente de teste | Banner em todas as páginas de staging: “Ambiente de teste — os relatos e números podem ser fictícios.” |
| Manutenção | “Estamos atualizando a plataforma. Tente novamente mais tarde.” Link para contato só se disponível. |
| Município sem cobertura | Mensagem digna e neutra definida acima; nunca “cidade não atendida”. |

## E. Fluxos de interação e mensagens

### Registrar um relato

1. **Entrada:** “Conte o que precisa melhorar”; sem conta, fotos ou contato no M3.
2. **Local e categoria:** escolher município e uma das onze categorias. Erros associados aos respectivos campos.
3. **Relato:** título e descrição com limite; aviso para não incluir dados pessoais.
4. **Revisão e envio:** explicar que a equipe analisará antes de publicar; verificação de segurança; botão “Enviar relato”. O navegador gera o código privado e conserva código/chave idempotente enquanto o resultado não for confirmado.
5. **Rede falha:** preservar rascunho e credenciais da tentativa. “Não foi possível confirmar o envio. Tente novamente.” Não afirmar que não foi recebido quando a resposta pode ter se perdido.
6. **Sucesso:** protocolo e link privado, com cópia e compartilhamento por ação explícita. Explicar que o link é a única forma de acompanhar e pedir exclusão. Limpar o rascunho após confirmação; não perder o link antes de oferecê-lo ao cidadão.

Rascunho: armazenamento local com aviso para aparelho compartilhado; não há autosave no servidor. Sem JavaScript, explicar a necessidade e não enviar sem código privado.

### Acompanhar

1. Abrir `/acompanhar#<código>` pelo link privado guardado.
2. Ler o fragmento no cliente e enviar o código somente no corpo do POST; não consultar por protocolo isolado.
3. Falha de serviço: “Não foi possível consultar agora. Tente novamente.”
4. Credencial inválida, expirada ou inexistente: mensagem única “Não encontramos um acompanhamento com este link. Confira o link privado que você guardou.”
5. Resultado mostra situação, datas, atualizações e respostas permitidas ao autor; acesso a exclusão com confirmação. Nenhuma notificação ou assinatura é criada.

### Compartilhar

Nas páginas públicas, botão “Compartilhar”. No celular, usar folha de compartilhamento nativa como melhoria; sempre manter link direto “Compartilhar no WhatsApp”. Texto prévio: “Relato sobre [título] em [município]. Veja o andamento: [link público]”. Nessas páginas, só URL pública. A ação explícita “Compartilhar link privado” da tela de sucesso M3 é distinta e explica seu poder de acesso. Sucesso do sistema: não alegar que a pessoa enviou; fallback se não houver API abre WhatsApp via link codificado. O link OG usa imagem neutra e não contém contador ou dados privados.

### “Também me afeta”

Botão inicial “Também me afeta”. Ao ativar, texto de confirmação: “Você marcou que este problema também afeta você.” Contagem atualiza depois de resposta confirmada; evitar clique duplicado e permitir remover a marcação com texto “Desfazer”. Nota persistente: “Participação voluntária; não mede quantas pessoas foram afetadas nem a gravidade.” **[ASSUNÇÃO]** O briefing define quantidade, mas não define identificação/prevenção de duplicidade; desenho não deve prometer anonimato ou unicidade até regra de backend aprovada. Se não houver mecanismo legítimo para registrar sem conta, o botão fica indisponível com explicação, não simula sucesso.

### Denunciar um relato

Link “Sinalizar este relato” abre formulário compacto com motivo (conteúdo pessoal, informação possivelmente falsa, linguagem ofensiva, outro) e explicação. Nenhuma conta; campo de detalhe opcional e aviso para não incluir dado pessoal. Botão “Enviar sinalização”. Sucesso: “Sinalização recebida. A equipe vai analisar.” Não remover/publicar automaticamente nem revelar identidade de quem sinalizou. Erro: “Não foi possível enviar. Tente novamente.” **[ASSUNÇÃO]** Confirmar se denúncia anônima e retenção de detalhes são suportadas pela política.

### Pedir para apagar dados

No acompanhamento autenticado pelo link privado, “Pedir exclusão do relato” apresenta consequência e confirmação: o texto é retirado de exibição e substituído por marcador; o registro de auditoria é mantido. O M3 não coleta contato nem oferece opções fictícias de escopo. O botão “Confirmar exclusão” envia a ação; erro preserva o acompanhamento para retry; sucesso só aparece após confirmação do servidor. Não prometer apagamento de auditoria ou uma fila humana não implementada. Política e prazos para produção continuam sujeitos à revisão jurídica.

### Escolher município sem acompanhamento

1. Digitar nome; resultados mostram nomes oficiais dos 246 municípios.
2. Selecionar um município sem cobertura ativa; evitar badge “0” que aparente falta de importância. Mostrar “Ainda não acompanhamos relatos neste município.”
3. Explicar que isso não indica ausência de problema nem prazo de atendimento.
4. Ação principal “Registrar um problema neste município”, município já preenchido; seleção editável no passo Local. Alternativa “Ver outro município”.

## F. Acessibilidade e desempenho por tela

### Regras globais WCAG 2.2 AA

- Contraste de texto normal ≥4,5:1; texto grande ≥3:1; bordas e estados gráficos essenciais ≥3:1. Combinações aprovadas estão em B; não usar cores fora dos pares testados.
- Alvos de toque ≥48 × 48 CSS px; espaço de 8 px entre controles próximos; teclado e foco visível em toda ação.
- Uma região `<main>`, cabeçalho, navegação e rodapé semânticos; link “Pular para o conteúdo”; um H1 e títulos em ordem.
- Idioma `pt-BR`; datas com `<time datetime>` e rótulo legível; tabela com `<caption>`, `<th scope>` e cabeçalhos.
- Formulário: rótulos persistentes, obrigatório e opcional escritos; erros em texto, ícone não decorativo, `aria-describedby`; após envio inválido, resumo recebe foco e linka aos campos. Mudança de etapa anuncia “Etapa X de 5”.
- Gráfico: resumo em texto e tabela equivalente; não anunciar SVG complexo sem representação textual.
- Imagem: descrição do conteúdo relevante; foto decorativa vazia; nenhuma imagem como único modo de comunicar estado.
- Zoom 200% e reflow sem rolagem horizontal em 320 CSS px; confirmar com navegador e leitor de tela. Suportar JavaScript desligado para conteúdo público essencial.
- Barra inferior respeita `safe-area-inset-bottom`, tem rótulo e indicação de aba atual (`aria-current="page"`); foco não fica atrás dela.
- Movimento reduzido elimina transição; controles mantêm feedback textual.

### Ordem de foco e landmarks por tela

| Tela | Ordem de foco/leitura | O que carrega primeiro |
|---|---|---|
| Home | Pular conteúdo → logo/início → navegação → H1/promessa → município → Registrar → outros links → indicadores/aviso → relatos → passos → rodapé. | HTML, título, seletor e CTA; números depois do texto introdutório. |
| Lista | Pular conteúdo → H1 → filtros Município/Categoria → Aplicar/Limpar → aviso e contagem → títulos de relato em ordem → próxima página. | Texto, filtros GET e primeira página da lista. |
| Detalhe | Pular conteúdo → voltar → categoria/demonstração → H1/local → situação/verificação → resposta → descrição/fotos → histórico → afetados/nota → compartilhar/denunciar → método. | H1, situação, resposta e descrição; fotos abaixo da dobra lazy. |
| Município | Breadcrumb → H1 → estado da cobertura → aviso/indicadores → filtros → lista/paginação. | Município e aviso de cobertura antes de contagens. |
| Registro | Voltar → H1 → progresso textual → campos na ordem → explicação pré-publicação → Continuar/Enviar. Erro move foco ao resumo. | Shell, etapa atual e rascunho local; foto somente ao selecionar. |
| Acompanhar | H1 → explicação de privacidade → campos → Consultar; resultado move foco para o título “Acompanhamento do relato”. | Formulário e ajuda; consulta somente após ação. |
| Dados | H1 → aviso metodológico → filtros → indicadores → resumo gráfico e tabela → fontes/limites. | Aviso e dados em texto/tabela; SVG/mapa fase 2 carrega depois. |
| Institucionais | Pular → H1 → sumário, se houver → seções → data de revisão → rodapé. | HTML textual; sem dependência de fonte/imagem. |

### Orçamento de desempenho

| Tipo de página | Limite alvo de HTML+CSS+JS inicial | Carga priorizada | Adiada/condicional |
|---|---:|---|---|
| Leitura pública (home, lista, município, detalhe, legal) | <100 KB de HTML+CSS+JS no primeiro carregamento, sem fontes/imagens | HTML renderizado no servidor, CSS crítico, primeira página de conteúdo | fotos abaixo da dobra, compartilhamento nativo, qualquer JS não essencial |
| Formulário | <100 KB inicial; medir dependência de upload separada | etapa atual e validação básica | compressão de foto após escolha; não carregar SDK externo |
| Dados | <100 KB de base; módulos visuais devem respeitar limite em conjunto | aviso + tabela/resumo | gráficos interativos e mapa da fase 2 não carregam no MVP |
| Fontes | 2 arquivos WOFF2 no máximo | subconjunto latino; `font-display: swap` | carregar só pesos variáveis necessários |
| Imagens | sem imagem decorativa hero; fotos otimizadas e até 3 por relato | dimensões/reserva de espaço e primeira foto se essencial | demais fotos `loading="lazy"`; max 1600 px, compressão |

Meta LCP <2,5 s em 4G; sem mapa JS na leitura; sem autoplay; sem bibliotecas de gráficos no conteúdo principal. Quando o orçamento estourar, remover decoração e dependência antes de remover ajuda ou dados semânticos.

## G. Mapa de conteúdo — textos fixos

### Navegação e ações

- Logo/atalho: “Observatório Goiás”; link: “Ir para o início”.
- Navegação: “Início”, “Problemas”, “Registrar problema”, “Dados”, “Municípios”.
- Menu mobile: “Abrir navegação”, “Fechar navegação”.
- Rodapé: “Sobre”, “Transparência”, “Acompanhar meu relato”, “Privacidade”, “Termos de uso”, “Regras de publicação”, “Contato”.
- Botões: “Registrar um problema”, “Ver relatos”, “Ver detalhes”, “Voltar”, “Continuar”, “Enviar relato”, “Tentar novamente”, “Aplicar filtros”, “Limpar filtros”, “Próxima página”, “Compartilhar”, “Compartilhar no WhatsApp”, “Copiar protocolo”, “Copiar link privado”, “Adicionar foto”, “Remover foto”, “Consultar”, “Pedir para apagar dados”, “Sinalizar este relato”.

### Avisos permanentes

- Limite do serviço: “O Observatório Goiás não é um canal oficial de atendimento e não substitui os órgãos públicos. Se houver risco imediato, procure o serviço de emergência adequado.” (A adequação e os contatos de emergência dependem de revisão jurídica/editorial.)
- Método: “Estes números vêm de relatos voluntários publicados na plataforma. Eles não representam todos os problemas, não medem gravidade e não permitem comparar a qualidade dos municípios ou órgãos.”
- Afetados: “Pessoas marcaram que também são afetadas. A participação é voluntária e não mede quantas pessoas foram afetadas nem a gravidade.”
- Demonstração: “Dados de demonstração — este conteúdo é fictício e serve para mostrar como a plataforma funciona.”
- Pré-publicação: “Seu relato será analisado pela equipe antes de aparecer no site.”
- Privacidade do link: “Quem tiver o link privado pode ver o andamento e pedir a exclusão. Guarde-o em local seguro.”
- Resposta: “Ainda não há resposta oficial publicada.”
- Conferência: “Conferido pela equipe” (somente quando o indicador verdadeiro está ativo; adicionar explicação sobre o alcance da conferência, pendente de política).

### Home e listas

- Home H1: “Veja o que precisa melhorar na sua cidade.”
- Home apoio: “Registre um problema público e acompanhe as atualizações com um protocolo.”
- Município: “Qual é o seu município?” / placeholder “Digite o nome do município”.
- Sem resultados: “Não encontramos relatos com esses filtros.” / “Tente escolher outro município ou categoria.”
- Sem relatos: “Ainda não há relatos publicados aqui.”
- Município sem acompanhamento: “Ainda não acompanhamos relatos neste município.” / “Isso não quer dizer que não existam problemas. Você pode registrar um relato e guardar o protocolo.”
- Busca indisponível: “Busca por palavra-chave — fase 2, ainda sem backend.” Não renderizar como caixa ativa.

### Situações e formulários

- Rótulos canônicos: “Recebido”, “Em análise”, “Encaminhado ao órgão”, “Aguardando resposta do órgão”, “Sendo resolvido”, “Resolvido”, “Encerrado sem solução”.
- Categorias exatamente como definidas no briefing.
- M3: blocos Local, Categoria e Relato no mesmo formulário; fotos e identificação não são oferecidas.
- Erros: “Escolha um município para continuar.”; “Escolha uma categoria para continuar.”; “Escreva um título.”; “Conte o que está acontecendo.”; “Confira o formato deste campo.”; “A descrição ultrapassou o limite de caracteres.”; “Selecione até 3 fotos.”; “Esta foto não foi enviada. Tente novamente ou remova a foto.”
- Campo foto: “Fotos são opcionais. Não inclua rostos, placas ou documentos.”
- Campo local: “Não informe número de casa nem endereço residencial.”
- Sem conexão: “Não conseguimos enviar agora. Seu rascunho continua salvo neste aparelho.”
- Limite: “Muitos envios em pouco tempo. Tente de novo mais tarde.”
- Revisão: “Seu relato será analisado pela equipe antes de aparecer no site.”
- Sucesso: “Relato enviado para análise.” / “Guarde o protocolo e o link privado para acompanhar o andamento.”
- Privacidade M3: “Você não precisa informar nome ou telefone. Guarde o link privado: ele é a única forma de acompanhar e pedir a exclusão.” Contato opcional fica fora deste marco.

### Erros e vazios globais

- Carregando: “Carregando relatos…”
- Erro: “Não foi possível carregar agora. Tente novamente.”
- Acompanhamento inválido: “Não encontramos um acompanhamento com este link. Confira o link privado que você guardou.”
- 404: “Não encontramos esta página.”
- Manutenção: “Estamos atualizando a plataforma. Tente novamente mais tarde.”
- Denúncia enviada: “Sinalização recebida. A equipe vai analisar.”
- Exclusão M3, após confirmação do servidor: “Exclusão concluída. O texto do relato foi retirado da exibição. O registro de auditoria permanece.” Política de produção **[A REVISAR PELO JURÍDICO]**.

### Páginas institucionais

Cada rota usa conteúdo-modelo com cabeçalho **[A REVISAR PELO JURÍDICO]**. Não afirmar independência, vínculo com governos/partidos, prazos de resposta, compartilhamento com órgãos, retenção, direito de remoção ou identidade de organização responsável sem confirmação documental. `Contato` só mostra endereço/canal real quando aprovado; nunca preencher com dados de exemplo em produção.

## H. Handoff

### Tokens com nomes aplicáveis

Mapeamento para CSS variables e Tailwind: nomes semânticos estáveis; pode-se expor variáveis `--color-*`, `--radius-*`, `--spacing-*` na configuração. Os valores definitivos são os da tabela B.

```text
--color-fundo: #F8F7F1
--color-superficie: #FFFFFF
--color-texto: #1B3028
--color-texto-suave: #45584F
--color-acao: #17623C
--color-acao-pressionada: #154A31
--color-destaque: #8A5A00
--color-destaque-suave: #F6EED5
--color-territorio: #234C66
--color-terra: #8A492F
--color-sucesso-fundo: #E8F0E8
--color-info-fundo: #EAF0F4
--color-erro: #8C2F28
--color-erro-fundo: #F9E9E7
--color-neutro-fundo: #EEF0EC
--color-borda: #7F8D83
--color-borda-suave: #D8DED7
--font-titulo: Manrope, Arial, sans-serif
--font-corpo: "Source Sans 3", Arial, sans-serif
--radius-controle: 8px
--radius-cartao: 16px
--radius-painel: 24px
--space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px
--space-5: 24px; --space-6: 32px; --space-7: 48px; --space-8: 64px
--target-touch: 48px
--width-reading: 680px
--width-page: 1120px
```

### Ordem recomendada de construção

1. Tokens, tipografia, foco, landmarks, header/footer e navegação adaptativa.
2. Selos de estado, cartão de relato, aviso metodológico, vazio/erro e tabela.
3. Detalhe do relato e prévia OG (rota principal compartilhada).
4. Município e lista de relatos com filtros simples e paginação.
5. Fluxo de registro (etapas, rascunho, upload resiliente, sucesso e link privado).
6. Acompanhamento, exclusão e sinalização; fechar decisões de privacidade antes de expor.
7. Home e conteúdo institucional, reutilizando componentes anteriores.
8. Dados agregados com tabelas; gráficos depois de equivalência acessível.
9. Fase 2: busca, período, mapa interativo, indicadores oficiais após integração e fontes aprovadas.

### Backlog de fase 2 — limite do MVP (Task 6.2)

Na `/dados` atual, Município e Categoria são filtros GET ativos. Período aparece desabilitado, com “Fase 2 — ainda sem backend” e explicação de que está inativo. Busca textual, mapa tocável/choropleth e fontes oficiais não são funcionalidades ativas do MVP. Marcadores de fase 2 devem ser texto informativo ou controle realmente desabilitado com motivo visível; não podem aceitar entrada, simular carregamento ou produzir resultados sem backend. A página declara que não há conexão ativa com IBGE, INEP ou DataSUS.

Cada item abaixo depende de aprovação posterior; responsável nominal, fonte final e cadência continuam pendentes. Nenhuma linha promete integração ou prazo.

| Backlog | Contrato de fonte e atualização a definir | Privacidade de células pequenas | Peso e equivalente textual | Responsável |
|---|---|---|---|---|
| Busca textual | Definir campos públicos pesquisáveis, consulta/paginação, ordenação e estados vazio/erro; excluir conteúdo privado. Cadência do índice e invalidação pendentes. | Avaliar contagens e combinações de busca que revelem grupos pequenos; regra de supressão pendente antes de habilitar. | Orçamento incremental a medir/aprovar; resultados em lista de links e texto, sem dependência de mapa. | A definir; validação técnica e de privacidade pendente. |
| Período | Definir data de referência, fuso, limites inclusivos/exclusivos, recortes e consulta agregada real; cadência de atualização/invalidação pendente. | Definir limiar e supressão complementar para evitar inferência por diferença entre períodos e filtros. | Orçamento incremental a medir/aprovar; indicadores com período explícito e tabelas equivalentes. | A definir; validação metodológica e de privacidade pendente. |
| Mapa | Fonte, licença, versão e códigos da geometria e vínculo com dados territoriais pendentes; definir cadências da geometria e dos dados separadamente. | Agregar por município; não expor pontos de relatos nem células suprimidas por cor, tooltip ou legenda; limiar pendente. | Se autorizado, primeiro incremento independente: SVG estático <30 KB; tabela/lista permanece equivalente. Sem biblioteca de mapa nas páginas de leitura. Interação/choropleth exige novo aceite. | A definir; validação de licença, acessibilidade e privacidade pendente. |
| Indicadores oficiais | Selecionar fonte/dataset/URL, licença, versão, campos, unidade, cobertura, metodologia e limites; IBGE/INEP/DataSUS são candidatos, sem integração ativa. Cadência e tratamento de atraso/indisponibilidade pendentes. | Avaliar risco por recorte e cruzamento; definir supressão de células pequenas e diferenças antes de publicar. | Orçamento de carga a medir/aprovar; fonte, data de referência e atualização em texto, resumo e tabela acessível; não misturar com relatos voluntários. | A definir; aprovação de fonte, metodologia e licença pendente. |

Supressão de células pequenas é requisito a definir e implementar, não proteção já comprovada no MVP. A liberação de cada incremento requer contrato aprovado, implementação real e validação de seus estados; rótulo “fase 2” sozinho não autoriza controle ativo.

### Decisões e pessoas necessárias

| Lacuna | Responsável/decisão |
|---|---|
| Nome, wordmark, busca de marcas e neutralidade política | Design/brand + validação com cidadãos; nome é provisório. |
| Definição de “conferido pela equipe” e evidência mínima | Operação/editorial; precisa ser pública e não sugerir auditoria oficial. |
| Campo contato, consentimento e existência de retorno | Produto + privacidade; o briefing não estabelece quando a equipe pode contatar. |
| Regra para “também me afeta”, deduplicação e anonimato | Produto + engenharia + privacidade; não prometer unicidade antes da decisão. |
| Exclusão/retensão, prazos e dados que ficam no histórico | Jurídico + privacidade; texto de pedido é modelo, não política. |
| Política de denúncia, critérios e recurso | Editorial + jurídico; mensagens não devem prometer remoção automática. |
| Fotos: limites de tamanho/formato, compressão e análise | Engenharia + operação; máximo visual é três fotos. |
| Logo OG final e fallback de foto | Marca + conteúdo; OG demonstração não contém protocolo privado. |
| Fontes variáveis e licença, subconjunto latino e orçamento | Engenharia/design; até dois arquivos auto-hospedados. |
| Valores reais de indicadores, definição de “em acompanhamento” e disponibilidade por município | Dados/operação; dados de demonstração permanecem marcados. |
| Fontes oficiais (IBGE/INEP/DataSUS), licença, atualização e metodologia | Dados + jurídico; fase 2, nada funcional nesta especificação. |
| Conteúdo de `/sobre`, `/transparencia`, `/privacidade`, `/termos`, `/regras`, `/contato` | Jurídico e responsável institucional; cada texto recebe [A REVISAR PELO JURÍDICO]. |
| Contorno geográfico e licença do SVG | Design/dados; conferir geometria e direito de uso antes de publicar. |

### Assunções explícitas

1. **[ASSUNÇÃO]** Palavra “cidade” pode aparecer em conversa, mas município é o termo dos campos e dados. Isso reduz ambiguidade administrativa.
2. **[ASSUNÇÃO]** O nome e o protocolo do exemplo são fictícios; nunca representam publicação real.
3. **[ASSUNÇÃO]** “Conferido pela equipe” significa apenas revisão editorial definida pela operação; não significa confirmação do fato por órgão público.
4. **[ASSUNÇÃO]** O rascunho é local ao dispositivo, podendo ser perdido se o armazenamento do navegador for apagado; explicar isso perto do envio em aparelho compartilhado.
5. **[ASSUNÇÃO]** A plataforma tem poucos municípios com acompanhamento ativo; os demais usam estado explícito “ainda não acompanhamos”.
6. **[ASSUNÇÃO]** Campos bairro e referência são opcionais; referência não exige geolocalização automática.
7. **M3:** a ação usa o RPC de exclusão existente após confirmação explícita; retira o texto e preserva auditoria. Uma fila de pedido analisado exigiria outro contrato e não é prometida.

### Critérios de aceite do design

- Em 360 × 640, a pessoa vê em até 3 segundos a proposta e uma única ação principal; em 375 × 812, nenhum componente tapa conteúdo.
- A barra inferior não cobre o último controle; safe area respeitada; formulário não recebe barra fixa sobre o teclado.
- Cada combinação de texto/fundo listada atinge WCAG AA; combinações novas exigem cálculo.
- Todos os sete estados têm nome e ícone; “conferido” e “resposta oficial” não são confundidos com situação.
- Todo contador e “também me afeta” têm ressalva próxima; nenhum ranking/gravidade/nota é apresentado.
- Estados carregando, vazio, erro, falta de conexão, manutenção e município sem acompanhamento estão desenhados.
- O usuário pode ler rotas públicas com JavaScript desligado; dados principais aparecem antes de fotos/gráficos/mapa.
- OG não vaza código privado, não usa imagem de pessoa e deixa claro que é um relato de cidadão.
- Textos jurídicos, fontes oficiais e cobertura operacional continuam marcados como dependências até aprovação das pessoas responsáveis.
- A “linha de registro” aparece apenas onde comunica sequência ou progresso (ficha, histórico, stepper); não vira textura de fundo nem moldura repetida em todos os cartões.
- A home não usa composição centralizada com três cartões de benefício; prioriza município, ação e relatos recentes.
- O mapa de conteúdo não usa componentes visuais transplantados de bibliotecas sem justificativa; qualquer referência externa futura precisa ser adaptada aos tokens e à linguagem deste produto.

\n

## Validação visual e técnica do mapa — 2026-10-28

As capturas de home, detalhe, lista, registro e acompanhamento foram revisadas em 360, 375, 768 e 1280 px; também foi conferido reflow em 320 px. Nas medições DOM anteriores, essas rotas não apresentaram rolagem horizontal; a barra móvel reservou espaço e não cobriu o footer. A página `/dados` foi capturada no estado indisponível, mas seu estado final com dados não pode ser aceito até `v_dados_painel` existir no PostgREST conectado. O fluxo de registro local permanece fechado quando não recebe a configuração válida do gate.

A checklist visual encontrou sobreposição do link de foco com o aviso de ambiente. A correção no shell coloca o link no fluxo do documento quando recebe foco; captura posterior em 360 px mostra o link focado acima do aviso sem encobri-lo. `prefers-reduced-motion` desativa animações, transições e rolagem suave no CSS global.

A verificação de produção local encontrou HTML inicial SSR nas rotas públicas e 10 tags Open Graph no detalhe do relato. `robots` permanece `noindex` enquanto os gates de piloto não forem aprovados. A meta de carregamento de 100 KB não foi atingida: as amostras de HTML+JS+CSS variaram de aproximadamente 618 a 756 KB sem compressão e 190 a 231 KB com gzip; medidas preliminares, ainda sem Lighthouse ou LCP. Deve haver uma tarefa de otimização antes de considerar esta meta aceita. O `metadataBase` ausente no ambiente local gerou aviso de build e resultou em base localhost; definir o domínio final somente quando aprovado.

Leitura SSR do shell/conteúdo público está presente no HTML sem depender do navegador para a leitura. Ainda não foi feito ensaio dedicado com JavaScript completamente desabilitado, leitor de tela, zoom real de 200%, medição de LCP, nem aceitação visual final do painel com dados.
