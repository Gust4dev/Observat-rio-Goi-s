# Mapa de design — Observatório Goiás

**Estado:** especificação proposta para produto cívico mobile first. Não representa confirmação de implementação, operação, parceria institucional ou dado real. A identidade visual aprovada usa os arquivos de `public/brand/`, conforme as regras abaixo. Texto jurídico precisa de revisão antes da publicação.

**Escopo:** experiência pública nas rotas `/`, `/problemas`, `/problema/[id]`, `/municipios`, `/municipios/[slug]`, `/registrar`, `/acompanhar`, `/dados` e páginas institucionais. Administração não faz parte desta entrega.

**Base consultada:** briefing do produto, documentação local (`visao-geral.md`, `fluxos.md`, `design.md` anterior e documentos relacionados), inspeção de `src/app/globals.css` e [página-base](https://observatoriogo.com.br/). A base já implementa creme/verde e fluxos públicos; esta revisão alinha sua direção visual aos tokens OKLCH originais da referência. Especificação não comprova implementação ou validação final. As páginas internas da referência não estavam acessíveis nesta consulta; seus comportamentos foram especificados a partir do briefing.

## A. Diagnóstico e conceito

### Diagnóstico da base do chefe

**Manter:** verde e creme transmitem seriedade sem aparência de portal estatal; linguagem direta (“Qual é a sua cidade?”), registro sem conta, protocolo privado, conteúdo demonstrativo identificado, formulário curto por etapas, contorno territorial como sinal regional e hierarquia entre ação primária, secundária e terciária. A home da referência confirma essas escolhas e oferece um bom ponto de partida para a promessa do serviço.

**Melhorar:** preservar o mapa como entrada territorial funcional da home, com município e ação antes dele no celular e composição lateral no desktop, evitando cartões de mesmo peso. Os sete estados ganham nome e ícone próprio, sem depender da cor. “Também me afeta” recebe ressalva explícita para não parecer medida de gravidade. O detalhe separa situação, revisão editorial, resposta oficial e evidência; a lista varia a hierarquia com categoria e metadados, sem criar ranking. Estados vazios, rede fraca e envio parcial recebem conteúdo próprio. A barra inferior não cobre conteúdo e a leitura dos painéis não depende do gráfico.

**Conceito — “Território público, ação direta”:** interface territorial de serviço cívico alinhada à referência: confiança primeiro, entendimento rápido do relato e ação direta. A home oferece escolha municipal e mapa interativo; o detalhe mantém a ficha de acompanhamento legível. Sua assinatura visual é a **linha de registro**: uma linha fina contínua, interrompida por marcadores quadrados, que conecta os metadados do relato à sua linha do tempo e reaparece no progresso do formulário. Ela sugere sequência e rastreabilidade com mapa funcional na home, sem brasão ou ilustração genérica. Fundo claro, Manrope nos títulos e Source Sans 3 no conteúdo foram escolhidos por hierarquia e leitura rápida; o verde fica reservado às ações e o ouro a pequenas ênfases informativas. Três princípios: **1. Primeiro a situação:** em poucos segundos, a pessoa entende o que foi relatado e o andamento. **2. Evidência separada de promessa:** conferência, resposta oficial e resolução documentada têm rótulos distintos. **3. Ação sem cadastro e sem surpresa:** cada passo explica o que será publicado, o que fica privado e o que acontece depois.

### Direção de interface aplicada

| Escolha | Direção fechada | Efeito esperado |
|---|---|---|
| Referência | Interface territorial de serviço cívico na home, com linguagem direta e ficha editorial no detalhe. | A pessoa que chega por link cai dentro da informação do relato, em vez de uma apresentação institucional genérica. |
| Cor | Creme e verde-floresta preservados com intenção; ouro pontual em notas/demonstração; azul petróleo reservado a dados e informação. Filete cromático estreito sujeito à comparação visual de neutralidade. | Mantém calor regional sem evocar bandeira ou sinal partidário; a cor de ação continua previsível. |
| Tipografia | Manrope para títulos e números; Source Sans 3 para leitura e campos; fallback de sistema quando a fonte não carrega. | Separa orientação de conteúdo sem sacrificar leitura em tela pequena ou conexão lenta. |
| Layout | Conteúdo centrado no trabalho: detalhe como ficha, lista como sequência de relatos, registro como formulário progressivo. Home: ação antes do mapa no celular; a partir de 768 px texto/ação e mapa lado a lado, sem proporção fixa. Detalhe e formulário preservam largura de leitura. | Evita o hero centralizado com três benefícios e mantém a ação principal perto do começo. |

Motivos visuais permitidos: (1) a linha de registro e seus marcadores para cronologia/progresso; (2) coordenadas tipográficas — município, categoria, protocolo e data alinhados como metadados. Não adicionar ruído/grão, textura, gradiente, mapa abstrato decorativo ou sombra macia. Cartões são usados quando agrupam ações ou conteúdo relacionado; listas podem ser separadas por divisores e variação tipográfica para não parecerem uma pilha uniforme de caixas.

### Decisões do debate de design

Seis lentes foram usadas: serviço cívico, pesquisa de campo, acessibilidade, jornalismo de dados, privacidade e ceticismo do cidadão. O debate inicial questionou “hero com mapa + contadores” e selos como síntese do estado. O plano atualizado mantém a interação territorial da referência, com ação prioritária, dados honestos e equivalência textual; as decisões abaixo incorporam essa revisão.

| Decisão | Por quê | Alternativa rejeitada e ataque | Risco aberto / dissidência |
|---|---|---|---|
| Detalhe começa com título, situação, local e datas; mapa não é o herói. | A pessoa que chega de um link quer reconhecer o problema antes de explorar o território. | Mapa grande no topo: usa espaço e banda antes de responder “o que aconteceu?”. | Na home o mapa é prioritário nesta entrega; no detalhe a ficha continua primeiro. Em `/dados`, mapa após aviso e dados principais. |
| Situação, “conferido pela equipe” e resposta oficial são três sinais independentes. | Um relato conferido não é uma solução; uma resposta não comprova resolução. | Um selo verde “verificado/resolvido”: pode sugerir chancela institucional ou certeza maior que a evidência. | Definir operacionalmente o que a equipe consegue chamar de “conferido”. |
| Números são apresentados com aviso metodológico ao lado, sem destaque competitivo. | Participação voluntária não mede prevalência, gravidade nem desempenho de município. | Ranking/top 10 proeminente: incentiva comparação injusta e leitura política de volume. | Imprensa pode pedir comparação; oferecer recorte por filtro com denominador e nota persistente, sem classificação. |
| Município sem acompanhamento recebe explicação e opção útil para continuar. | “Sem relatos” não significa “sem problemas” nem abandono do cidadão. | Estado vazio neutro ou página sem conteúdo: pode parecer falha ou desinteresse. | A plataforma precisa confirmar quando a cobertura começa; não sugerir promessa de prazo. |
| O filete verde–ouro–azul-petróleo da referência foi omitido. | A combinação estreita pode ser lida como bandeira ou assinatura estatal, sem ajudar a escolher município nem entender o relato. | Replicar a faixa para aproximar a referência foi rejeitado por risco de associação oficial ou de campanha. | Marca final ainda exige pesquisa de neutralidade; não há filete institucional nesta versão. |

**Alternativas avaliadas:** (a) mapa como elemento dominante; (b) portal editorial de lista e ficha pública; (c) painel de indicadores como entrada. Adota-se home territorial com ação e mapa funcional, combinada a (b) no detalhe/listas. Rejeitados mapa apenas decorativo/futuro, SDK pesado e preenchimento por volume; mapa permite seleção municipal e gráficos preservam equivalência textual.

## B. Identidade visual e conteúdo

### Identidade aprovada

Usar os arquivos raster aprovados de `public/brand/`, preservando proporções e cores; `public/LogoObservatorio.png` permanece como fonte original inalterada. As variantes PNG/WebP/JPG são imagens raster, não vetores. Não redesenhar o emblema nem substituir a marca pelo antigo wordmark tipográfico provisório.

- **Cabeçalho:** `observatorio-completa.webp` como imagem única maior no link para Início, sem nome digitado ao lado. Usar texto alternativo “Observatório Goiás” e largura responsiva, preservando proporção, foco visível e espaço para a navegação.
- **Rodapé:** `observatorio-completa.webp`, sem nome do site repetido ao lado; texto alternativo “Observatório Goiás”. Preservar os textos de serviço e links institucionais.
- **Prévia padrão do site:** `observatorio-completa.png` em tela clara de 1200 × 630, sem texto adjacente que duplique o nome já presente na arte.
- **Ícones de navegador e instalação:** somente o símbolo de `observatorio-simbolo.png`, incluindo favicon, ícone geral e Apple icon; favicon em formato ICO real, sem renomear bytes PNG. O título do documento continua “Observatório Goiás”.
- **Prévia de relato:** acrescentar o símbolo à composição dinâmica, preservando nome do site, categoria, município, título e situação; manter título e descrição específicos também no Twitter. Não substituir a ficha por uma logo estática.

As artes só estão aprovadas para superfícies claras. Não há versão invertida aprovada: não recolorir para fundos escuros nem inventar uma variante. No cabeçalho, dimensionar a versão completa de modo responsivo; a assinatura pequena é secundária e não deve exigir texto duplicado ao lado da arte.

### Paleta

Valores OKLCH originais do briefing são normativos; HEX é conversão sRGB aproximada (clipping quando fora do gamut), não uma paleta alternativa. Ajustes AA têm nome e motivo explícitos. Contrastes abaixo calculados em sRGB; implementação deve medir os pares finais, inclusive estados.

| Token | HEX aproximado | OKLCH | Função |
|---|---|---|---|
| `fundo` | `#F7F6F0` | `oklch(97.3% 0.008 100)` | Fundo creme principal. |
| `superficie` | `#FFFFFF` | `oklch(100% 0 0)` | Cartões/campos. |
| `texto` | `#163227` | `oklch(29% 0.039 167)` | Texto principal em superfícies claras. |
| `texto-suave` | `#5F718B` | `oklch(54.5% 0.046 257)` | Metadados; ajuste AA descrito abaixo. |
| `acao` | `#126C42` | `oklch(46.9% 0.105 157)` | Botão/link/foco, branco no botão. |
| `acao-pressionada` | `#1A3F35` | `oklch(33.7% 0.047 173)` | Ação pressionada; branco. |
| `secundario` | `#E3EEE5` | `oklch(93.9% 0.017 151)` | Superfície de apoio, texto principal. |
| `neutro-fundo` | `#EEEDE7` | `oklch(94.6% 0.009 100)` | Superfície neutra, texto principal. |
| `destaque` | `#E6C34A` | `oklch(82.6% 0.142 93)` | Ouro pontual, fundo/acento; texto principal, nunca branco. |
| `destaque-suave` | `#F8ECC6` | `oklch(94.3% 0.051 92)` | Fundo de nota; texto principal/territorio. |
| `territorio` | `#1A3F35` | `oklch(33.7% 0.047 173)` | Seleção territorial e texto em fundos claros; sem escala de volume. |
| `acao-suave` | `#DFF2E4` | `oklch(94.3% 0.027 155)` | Apoio da ação, texto principal. |
| `terra` | `#A45F3D` | `oklch(55.7% 0.103 46)` | Acento editorial raro; não codifica risco. |
| `sucesso` | `#0B7643` | `oklch(50% 0.12 155)` | Ícone/gráfico com rótulo; texto principal no fundo suave. |
| `sucesso-fundo` | `#DAF7E3` | `oklch(95% 0.04 155)` | Estado resolvido, texto principal. |
| `info` | `#123A5B` | `oklch(33.9% 0.073 247)` | Informação; branco ou texto em superfícies claras. |
| `info-fundo` | `#E4F0FF` | `oklch(95% 0.025 255)` | Informação, texto principal. |
| `erro` | `#D02C2A` | `oklch(56% 0.2 27)` | Erro/ação destrutiva; texto branco no botão ou sobre fundo claro. |
| `erro-fundo` | `#F9E9E7` | `oklch(94.6% 0.018 26)` | Fundo de erro, texto principal. |
| `aviso` | `#A45E00` | `oklch(55% 0.13 65)` | Ênfase/ícone, usar texto principal no fundo suave. |
| `aviso-fundo` | `#FFF0D0` | `oklch(96% 0.045 85)` | Atenção, texto principal. |
| `borda-suave` | `#D3DCD2` | `oklch(88.5% 0.017 141)` | Divisor decorativo original; não delimita controle sozinho. |
| `input-referencia` | `#BAC9BC` | `oklch(82% 0.024 150)` | Borda original de campo, só apoio decorativo. |
| `borda` | `#7F8D82` | `oklch(63% 0.024 150)` | Contorno essencial ajustado para contraste ≥3:1. |

**Contraste e desvios mínimos:** o `muted-foreground` original `oklch(55.4% .046 257)` oferece 4,41:1 no creme, abaixo de AA para texto normal; `texto-suave` reduz apenas luminosidade a 54,5%. Borda original oferece 1,30:1 e input original 1,60:1 no creme; permanecem decorativos e `borda` reduz luminosidade a 63% para contorno essencial. Ouro original não serve para texto claro/branco; usar `texto` sobre ouro. `warning` sai do gamut sRGB e seu HEX é aproximação com clipping; não usá-lo para texto pequeno sobre fundo suave.

**Pares aprovados (razão calculada, sem opacidade):** `texto`/`fundo` 12.85:1; `texto`/`superficie` 13.88:1; `texto-suave`/`fundo` 4.58:1; `texto-suave`/`superficie` 4.95:1; `acao`/`fundo` 6.02:1; `superficie`/`acao` 6.50:1; `superficie`/`acao-pressionada` 11.62:1; `texto`/`destaque` 8.12:1; `texto`/`destaque-suave` 11.77:1; `texto`/`secundario` 11.68:1; `texto`/`neutro-fundo` 11.86:1; `texto`/`sucesso-fundo` 12.17:1; `texto`/`info-fundo` 12.01:1; `texto`/`erro-fundo` 11.78:1; `texto`/`aviso-fundo` 12.33:1; `superficie`/`erro` 5.15:1; `info`/`fundo` 10.88:1; `terra`/`fundo` 4.54:1; `borda`/`fundo` 3.20:1; `borda`/`superficie` 3.46:1. Contorno/foco essencial ≥3:1; texto normal ≥4,5:1. Outros pares exigem nova medição.

**Não permitidos:** branco sobre ouro; texto sobre fotografia sem superfície opaca; estados só com cor; opacidade em texto; gradientes. Gráficos usam rótulo/padrão/marcador; cores de referência disponíveis: verde, ouro, `oklch(50% .09 230)`, `oklch(72% .1 170)` e azul-cinza. Séries claras exigem contorno contrastante e nunca comunicam gravidade.

### Tipografia

- **Manrope variável**, subtipo latino, títulos e números; **Source Sans 3 variável**, subtipo latino, corpo, formulários e dados. No máximo dois arquivos WOFF2 locais; `font-display: swap`.
- Fallback: `Arial, sans-serif` ajustado via `size-adjust` para aproximar x-height; `system-ui` se métricas não estiverem disponíveis. Decisão desta entrega: só ativar Manrope/Source Sans 3 se WOFF2 e licença redistribuível estiverem no repositório; caso contrário manter sistema e registrar pendência. Não baixar nem chamar fontes remotas em runtime.
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

O mapa interativo de Goiás é prioridade da entrega atual na home; em `/dados`, reutilizar o mesmo módulo se houver acoplamento simples, depois do aviso metodológico e dos dados principais. SVG local estático com polígonos dos 246 municípios, **<30 KB**, sem biblioteca de mapas. A geometria é uma captura da [API de malhas municipais do IBGE](https://servicodados.ibge.gov.br/api/v3/malhas/estados/52?intrarregiao=municipio&formato=image%2Fsvg%2Bxml&qualidade=minima) em 28/10/2026; a resposta da API não declara vintage. O SVG preserva os códigos IBGE e foi simplificado pelo projeto (alteração da fonte) para caber no limite. A [nota técnica do IBGE sobre a Malha Municipal Digital](https://www.ibge.gov.br/biblioteca/visualizacao/livros/liv102268.pdf) permite redistribuição compatível com CC BY 4.0 com atribuição. A geometria é referência territorial, não delimitação legal. Fonte, data, licença e limite devem aparecer perto do mapa.

**Contrato de interação:** seletor HTML é controle principal, sincronizado com os polígonos e o painel municipal. Todo município deve ser selecionável pelo mapa diretamente ou após ampliar uma região; oferecer zoom/ampliação e retorno acessíveis quando áreas pequenas não atingirem 48 × 48 px sem colisão. Provar em 360 px e zoom 200%. Não sobrepor alvos nem criar 246 paradas de Tab. O seletor GET/links SSR oferece os mesmos 246 municípios sem JavaScript. Ordem: seletor → resultado → link municipal; anunciar uma vez o nome selecionado, sem mover foco. Mapa tem título/descrição “Selecione um município”; tooltip/hover nunca contém informação exclusiva.

**Dados honestos:** polígonos neutros; seleção por contorno + nome textual, sem intensidade, ranking, ponto de endereço ou gravidade. Resultado mostra nome, “X relatos publicados na plataforma” e link `/municipios/[slug]`. Total publicado, cobertura operacional e disponibilidade são independentes: só mostrar “Nenhum relato publicado” após consulta bem-sucedida com zero; só “Ainda não acompanhamos este município” quando `ativo_acompanhamento === false`; falha mostra “Dados indisponíveis”, nunca zero. Carregando tem rótulo próprio. Não inferir cobertura pela contagem nem chamar agregado de verificado. Aviso metodológico, fonte, demonstração identificada e lista/tabela equivalente ficam próximos; não expor locais de relatos ou dados privados.

**Responsividade:** celular: promessa, município e CTA antes do mapa de largura integral, resultado curto junto ao controle e visível após escolha. Desktop desde 768 px: ação e mapa lado a lado, proporções conforme espaço útil, painel adjacente sem cobrir polígonos. Testar nomes longos, teclado virtual, zoom, `scroll-margin-bottom` e safe-area para resultado/link nunca ficarem sob navegação fixa. Sem animação obrigatória. Se geometria <30 KB, seleção integral e alvos seguros não forem conciliáveis, registrar evidência e limite; contorno com lista sozinho não constitui entrega integral do mapa interativo.

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
| Cabeçalho | Mobile: logo completa responsiva no link Início, sem nome digitado adjacente, botão menu rotulado “Abrir navegação” se necessário; desktop: Início, Problemas, Dados, Municípios e ação “Registrar problema”. Link “Pular para o conteúdo” aparece no foco. Estado ativo com texto e sublinhado/indicador. | Não usar menu que exige JS para descobrir as rotas; não ocultar Registrar em desktop. |
| Barra inferior mobile | 4 itens: Início, Problemas, botão central “Registrar”, Dados. Mínimo 48 px, área segura `env(safe-area-inset-bottom)`, fundo sólido, divisória superior. No fluxo de formulário e acompanhamento privado, não aparece para preservar foco e altura. | Não sobrepor conteúdo: `padding-bottom` ≥ altura total + safe area; não cobrir teclado ou botão de envio. |
| Rodapé | Logo completa aprovada, sem nome adjacente duplicado, junto à descrição do serviço; Sobre, Transparência, Privacidade, Termos, Regras e Contato em área de links com duas colunas. Desktop em grid assimétrico entre identidade/descrição e links; mobile com os blocos empilhados. Nota legal abaixo de uma divisória. | Não colocar aviso metodológico só no rodapé nem usar texto legal como única explicação do serviço. |
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
| Upload | Botão “Adicionar foto”, formatos e tamanho máximo apresentados ao escolher; prévia, remover, processando, falha individual e retentar. Até três fotos. Antes do seletor, aviso para não incluir rostos, placas ou documentos. “O que a foto mostra” obrigatório, com exemplo e aviso de revisão humana antes da descrição pública. | Não exigir foto; não perder formulário por erro da imagem; não chamar foto falha de falha do relato inteiro. Ao fechar/sair, fotos não enviadas se perdem; só após confirmar o protocolo avisar que o relato permanece salvo. Envio sequencial de todas e individual com resumo “2 de 3 enviadas”; resposta ambígua preserva arquivo/slot para retry e informa que o recebimento não pôde ser confirmado. |
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
  Home --> Mapa[Mapa municipal interativo]
  Dados --> Mapa
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

**Prévia Open Graph — 1200 × 630:** páginas gerais usam a logo completa em fundo claro. No detalhe, preservar a ficha dinâmica com nome do site e símbolo aprovado, categoria, título em até 3 linhas, município e situação em texto; o emblema não substitui o conteúdo do relato. Título e descrição específicos permanecem nos metadados Open Graph/Twitter. A ficha nunca mostra nome de pessoa, protocolo privado, fotos identificáveis nem contador de “também me afeta”. Exemplos deste documento usam local fictício; em link real, categoria/título/local/status vêm do dado publicado. Texto alternativo/descrição OG descreve a peça sem alegar endosso. Não adicionar filete cartográfico decorativo nem recolorir a marca para fundo escuro.

### `/` — home

Hierarquia: promessa → escolha de município e ação → limite do serviço → mapa e resultado municipal → números e aviso → relatos recentes → três passos → links de confiança.

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
│ MAPA: selecione um município     │
│ [polígonos + ampliar/reduzir]     │
│ [resultado e link municipal]     │
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

Os valores `28` e `6` são exemplos e devem estar cobertos por “Dados de demonstração” em cada bloco; se não houver dados reais/demonstrativos carregados, esconder os números e mostrar estado vazio. **768/1280:** promessa, seletor e ação à esquerda; mapa e resumo municipal adjacente à direita, sem proporção fixa 7/5 e sem painel flutuante. Métricas com nota abaixo, relatos recentes com hierarquia variada e passos compactos depois. Ação secundária “Ver relatos deste município” acompanha a seleção. Preservar SSR, links atuais e aviso de canal não oficial.

**Mapa interativo e componentes da home (implementado).**

- **Seleção direta:** um toque ou clique em um polígono seleciona o município no mesmo gesto. Seletor, contorno do polígono, resumo e URL (`?municipio=<slug>#territorio`, navegação client-side) usam um único estado. Durante a navegação o resumo mostra “Carregando relatos de {município}…”; falha mostra indisponibilidade, nunca zero.
- **Câmera independente:** zoom e pan não alteram a seleção, e selecionar não move a câmera. Controles “Ampliar mapa”, “Reduzir mapa” e “Mostrar Goiás inteiro” (48 px). Pan por arrasto com limiar de 8 px (arrasto nunca seleciona), pinça e roda do mouse com ponto focal; `touch-action: none` só no SVG, então a rolagem da página fora dele segue normal.
- **Teclado:** o SVG é uma única parada de Tab; setas escolhem um candidato, Enter seleciona, Esc restaura o enquadramento sem limpar o município, `+`/`−` aproximam. O seletor continua sendo o caminho mais preciso.
- **Sem JavaScript ou SVG indisponível:** o seletor GET com 246 municípios e a ação principal continuam funcionando; o mapa mostra aviso de indisponibilidade.
- **Relatos recentes:** `CartaoProblema` variante `home` (ícone de categoria, demonstração, município, situação, data, resposta oficial se houver, botão “Ver relato”), em grade de 1 coluna (360), 2 (768) e 3 (1280). Sem resumo inventado e sem carrossel.
- **Como funciona:** `PassosInicio`, três passos 01/02/03 ligados por linha fina, com cenas SVG locais esquemáticas que ilustram só controles existentes.

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

Filtros: Município, Categoria, período (todo o período/30/90 dias/12 meses) — **período é fase 2, ainda sem backend**, desabilitado com motivo visível. Município e Categoria permanecem filtros GET ativos. MVP mostra indicadores disponíveis: total de relatos, municípios com relatos, relatos com resposta oficial, resolvidos com documentação, em acompanhamento (com definição do cálculo explícita). Blocos: situações, mês, município × categoria. Cada gráfico tem resumo em texto e tabela equivalente visível. Nenhum dado oficial até integração ativa; bloco “Indicadores oficiais — fase 2” explica que ainda não são exibidos. 360: filtros empilhados, cartões em 1 coluna, tabelas com rótulos; 768: cartões 2 colunas, gráficos em 2 colunas; 1280: cartões em 4 colunas, gráficos em 2 colunas. O mapa de seleção municipal desta entrega fica na home; `/dados` preserva as tabelas/resumos sem repetir o mapa. Mapa territorial com pontos/choropleth e fontes oficiais permanece fase 2.

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

Nas páginas públicas, botão “Compartilhar”. No celular, usar folha de compartilhamento nativa como melhoria; sempre manter link direto “Compartilhar no WhatsApp”. Texto prévio: “Relato sobre [título] em [município]. Veja o andamento: [link público]”. Nessas páginas, só URL pública. A ação explícita “Compartilhar link privado” da tela de sucesso M3 é distinta e explica seu poder de acesso. Sucesso do sistema: não alegar que a pessoa enviou; fallback se não houver API abre WhatsApp via link codificado. O link OG do relato usa a ficha dinâmica com símbolo e contexto público; a prévia geral usa a logo completa. Nenhuma contém contador ou dados privados.

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
| Dados | H1 → aviso metodológico → filtros → indicadores → resumo gráfico e tabela → fontes/limites. | Aviso e dados em texto/tabela; o mapa de seleção não é duplicado nesta rota. |
| Institucionais | Pular → H1 → sumário, se houver → seções → data de revisão → rodapé. | HTML textual; sem dependência de fonte/imagem. |

### Orçamento de desempenho

| Tipo de página | Limite alvo de HTML+CSS+JS inicial | Carga priorizada | Adiada/condicional |
|---|---:|---|---|
| Leitura pública (home, lista, município, detalhe, legal) | <100 KB de HTML+CSS+JS no primeiro carregamento, sem fontes/imagens | HTML renderizado no servidor, CSS crítico, primeira página de conteúdo | fotos abaixo da dobra, compartilhamento nativo, qualquer JS não essencial |
| Formulário | <100 KB inicial; medir dependência de upload separada | etapa atual e validação básica | compressão de foto após escolha; não carregar SDK externo |
| Dados | <100 KB de base; módulos visuais devem respeitar limite em conjunto | aviso + tabela/resumo | não carregar mapa nesta rota; gráficos interativos adicionais ficam para evolução |
| Fontes | 2 arquivos WOFF2 no máximo | subconjunto latino; `font-display: swap` | carregar só pesos variáveis necessários |
| Imagens | sem imagem decorativa hero; fotos otimizadas e até 3 por relato | dimensões/reserva de espaço e primeira foto se essencial | demais fotos `loading="lazy"`; max 1600 px, compressão |

Meta LCP <2,5 s em 4G; sem biblioteca JS de mapas na leitura; sem autoplay; sem bibliotecas de gráficos no conteúdo principal. Quando o orçamento estourar, remover decoração e dependência antes de remover ajuda ou dados semânticos.

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
--color-fundo: oklch(97.3% 0.008 100)
--color-superficie: oklch(100% 0 0)
--color-texto: oklch(29% 0.039 167)
--color-texto-suave: oklch(54.5% 0.046 257)
--color-acao: oklch(46.9% 0.105 157)
--color-acao-pressionada: oklch(33.7% 0.047 173)
--color-destaque: oklch(82.6% 0.142 93)
--color-destaque-suave: oklch(94.3% 0.051 92)
--color-territorio: oklch(33.7% 0.047 173)
--color-terra: oklch(55.7% 0.103 46)
--color-sucesso-fundo: oklch(95% 0.04 155)
--color-info-fundo: oklch(95% 0.025 255)
--color-erro: oklch(56% 0.2 27)
--color-erro-fundo: oklch(94.6% 0.018 26)
--color-neutro-fundo: oklch(94.6% 0.009 100)
--color-borda: oklch(63% 0.024 150)
--color-borda-suave: oklch(88.5% 0.017 141)
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

### Inventário e escopo atualizado — 28/10/2026

Já existentes: shell/navegação, home SSR com métricas/relatos/passos, listas/detalhe, municípios, registro/upload/acompanhamento/exclusão, filtros GET município/categoria e tabela de `/dados`, institucionais e estados globais. Preservar o trabalho local e ajustar só o necessário à identidade. Estado de `/dados` com conexão real ainda depende de validação; falha de consulta não comprova tela final.

Ajustes desta entrega: tokens da referência com AA, tipografia local condicionada à licença, identidade aprovada com logo completa responsiva no cabeçalho, logo completa no rodapé e prévia geral, símbolo nos ícones e na ficha dinâmica de compartilhamento, sempre em fundo claro e sem filete tricolor, nova hierarquia territorial da home, mapa sincronizado e regressão visual/acessível das rotas. Fase 2 real: busca textual, período, indicadores oficiais; choropleth continua fora desta entrega e exige metodologia/privacidade próprias.

### Ordem recomendada de construção

1. Tokens, tipografia, foco, landmarks, header/footer e navegação adaptativa.
2. Selos de estado, cartão de relato, aviso metodológico, vazio/erro e tabela.
3. Detalhe do relato e prévia OG (rota principal compartilhada).
4. Município e lista de relatos com filtros simples e paginação.
5. Fluxo de registro (etapas, rascunho, upload resiliente, sucesso e link privado).
6. Acompanhamento, exclusão e sinalização; fechar decisões de privacidade antes de expor.
7. Home e conteúdo institucional, reutilizando componentes anteriores.
8. Dados agregados com tabelas; gráficos depois de equivalência acessível.
9. Entrega atual: alinhamento de identidade, composição territorial da home e mapa municipal interativo; integração mínima das rotas, sem refazer fluxos existentes.
10. Fase 2: busca textual, período e indicadores oficiais após integração e fontes aprovadas.

### Backlog de fase 2 — limite do MVP (Task 6.2)

Na `/dados` atual, Município e Categoria são filtros GET ativos. Período aparece desabilitado, com “Fase 2 — ainda sem backend” e explicação de que está inativo. Busca textual, choropleth e fontes oficiais não são funcionalidades ativas. O mapa municipal de seleção está ativo na home, sujeito ao contrato de geometria, acessibilidade e dados acima; não deve ser rotulado como fase 2. Não há mapa nesta rota. Marcadores de fase 2 devem ser texto informativo ou controle realmente desabilitado com motivo visível; não podem aceitar entrada, simular carregamento ou produzir resultados sem backend. A página declara que não há conexão ativa com IBGE, INEP ou DataSUS.

Cada item abaixo depende de aprovação posterior; responsável nominal, fonte final e cadência continuam pendentes. Nenhuma linha promete integração ou prazo.

| Backlog | Contrato de fonte e atualização a definir | Privacidade de células pequenas | Peso e equivalente textual | Responsável |
|---|---|---|---|---|
| Busca textual | Definir campos públicos pesquisáveis, consulta/paginação, ordenação e estados vazio/erro; excluir conteúdo privado. Cadência do índice e invalidação pendentes. | Avaliar contagens e combinações de busca que revelem grupos pequenos; regra de supressão pendente antes de habilitar. | Orçamento incremental a medir/aprovar; resultados em lista de links e texto, sem dependência de mapa. | A definir; validação técnica e de privacidade pendente. |
| Período | Definir data de referência, fuso, limites inclusivos/exclusivos, recortes e consulta agregada real; cadência de atualização/invalidação pendente. | Definir limiar e supressão complementar para evitar inferência por diferença entre períodos e filtros. | Orçamento incremental a medir/aprovar; indicadores com período explícito e tabelas equivalentes. | A definir; validação metodológica e de privacidade pendente. |
| Indicadores oficiais | Selecionar fonte/dataset/URL, licença, versão, campos, unidade, cobertura, metodologia e limites; IBGE/INEP/DataSUS são candidatos, sem integração ativa. Cadência e tratamento de atraso/indisponibilidade pendentes. | Avaliar risco por recorte e cruzamento; definir supressão de células pequenas e diferenças antes de publicar. | Orçamento de carga a medir/aprovar; fonte, data de referência e atualização em texto, resumo e tabela acessível; não misturar com relatos voluntários. | A definir; aprovação de fonte, metodologia e licença pendente. |

Supressão de células pequenas é requisito a definir e implementar, não proteção já comprovada no MVP. A liberação de cada incremento requer contrato aprovado, implementação real e validação de seus estados; rótulo “fase 2” sozinho não autoriza controle ativo.

### Decisões e pessoas necessárias

| Lacuna | Responsável/decisão |
|---|---|
| Busca de marcas e neutralidade política | Design/brand + validação com cidadãos; identidade e aplicações aprovadas acima não substituem essa verificação. |
| Definição de “conferido pela equipe” e evidência mínima | Operação/editorial; precisa ser pública e não sugerir auditoria oficial. |
| Campo contato, consentimento e existência de retorno | Produto + privacidade; o briefing não estabelece quando a equipe pode contatar. |
| Regra para “também me afeta”, deduplicação e anonimato | Produto + engenharia + privacidade; não prometer unicidade antes da decisão. |
| Exclusão/retensão, prazos e dados que ficam no histórico | Jurídico + privacidade; texto de pedido é modelo, não política. |
| Política de denúncia, critérios e recurso | Editorial + jurídico; mensagens não devem prometer remoção automática. |
| Fotos: limites de tamanho/formato, compressão e análise | Engenharia + operação; máximo visual é três fotos. |
| Fallback de foto e conteúdo das prévias | Marca + conteúdo; logo completa da prévia geral e símbolo da ficha dinâmica estão aprovados. Preservar contexto do relato e não expor protocolo privado. |
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

## Registro anterior de validação visual e técnica — 2026-10-28

Este registro descreve a versão anterior. A revisão documental de identidade e mapa municipal acima não constitui validação da implementação nova; seleção dos 246 municípios, alvos sem colisão, SVG <30 KB, contraste final e telas com dados continuam sujeitos à passada final do plano atualizado.

As capturas de home, detalhe, lista, registro e acompanhamento foram revisadas em 360, 375, 768 e 1280 px; também foi conferido reflow em 320 px. Nas medições DOM anteriores, essas rotas não apresentaram rolagem horizontal; a barra móvel reservou espaço e não cobriu o footer. A página `/dados` foi capturada no estado indisponível, mas seu estado final com dados não pode ser aceito até `v_dados_painel` existir no PostgREST conectado. O fluxo de registro local permanece fechado quando não recebe a configuração válida do gate.

A checklist visual encontrou sobreposição do link de foco com o aviso de ambiente. A correção no shell coloca o link no fluxo do documento quando recebe foco; captura posterior em 360 px mostra o link focado acima do aviso sem encobri-lo. `prefers-reduced-motion` desativa animações, transições e rolagem suave no CSS global.

A verificação de produção local encontrou HTML inicial SSR nas rotas públicas e 10 tags Open Graph no detalhe do relato. `robots` permanece `noindex` enquanto os gates de piloto não forem aprovados. A meta de carregamento de 100 KB não foi atingida: as amostras de HTML+JS+CSS variaram de aproximadamente 618 a 756 KB sem compressão e 190 a 231 KB com gzip; medidas preliminares, ainda sem Lighthouse ou LCP. Deve haver uma tarefa de otimização antes de considerar esta meta aceita. O `metadataBase` ausente no ambiente local gerou aviso de build e resultou em base localhost; definir o domínio final somente quando aprovado.

Leitura SSR do shell/conteúdo público está presente no HTML sem depender do navegador para a leitura. Ainda não foi feito ensaio dedicado com JavaScript completamente desabilitado, leitor de tela, zoom real de 200%, medição de LCP, nem aceitação visual final do painel com dados.

## Registro da revisão de implementação do mapa — 2026-10-28

- O SVG local contém 246 municípios, mede 27.346 bytes e conserva os códigos IBGE. Captura da API IBGE em 28/10/2026; a API não declara vintage. Geometria simplificada pelo projeto sob atribuição compatível CC BY 4.0, como referência territorial e sem força de limite legal.
- Testes cobrem códigos e alvos interiores de todas as geometrias, catálogo SSR/GET com 246 opções, estados de dados e destinos. Navegação no navegador confirmou seleção GET, ampliação, foco único do mapa e seleção por setas/Enter. Alvo circular medido em 50,1 × 50,1 px no viewport disponível, após ajuste. Seletor continua disponível como alternativa para toda a lista.
- Revisão visual no navegador ocorreu em 1265 × 720 px. O ambiente de navegador desta sessão não ofereceu controle de viewport; portanto, capturas específicas em 360 × 640, 375 × 812, 768 e 1280 px e zoom real a 200% seguem pendentes. A meta de LCP também não foi medida.
- `/`, `/problemas`, `/municipios`, `/municipios/goiania` e `/dados` renderizaram no ambiente de teste. Tabelas equivalentes do painel foram conferidas no DOM acessível. `/problema/[id]` não pôde ser aceito visualmente: a conexão PostgREST da sessão responde HTTP 400 à consulta `v_imagens_publicas`, e a rota apresenta estado de erro; testes de componente continuam passando. Conferir a view/cache do PostgREST e repetir a captura do detalhe depois da sincronização do ambiente.
- Validação final: 36 arquivos de teste/353 testes passaram; `db:test` passou em todas as migrações e verificações; typecheck e build passaram. ESLint terminou sem erros, com aviso preexistente de variável `e` não usada em `db/tests/run-pglite.mjs:86`. O navegador identificou o SVG como LCP no desktop; a imagem de fallback agora carrega com prioridade imediata. LCP em 4G continua sem medição. O build mantém aviso `metadataBase` localhost, pendente de domínio final aprovado.
- Humanize UI: hierarquia parte da ação territorial e do relato, não de um hero decorativo; uma só família de superfícies, paleta creme/verde da referência, sem gradiente, animação gratuita ou pilha de cards repetidos. O mapa usa geometria e dados locais, sem pacote de mapa.
