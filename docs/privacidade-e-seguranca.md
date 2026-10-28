# Privacidade e segurança (princípios técnicos)

> Documento técnico. Não substitui a Política de Privacidade nem parecer jurídico.
> A adequação à LGPD e a definição do controlador dos dados são **[PENDENTES]**.

## Minimização
- No M3, todo registro é anônimo e não coleta nome, WhatsApp ou fotos. Coleta opcional de contato depende de decisão de finalidade e retenção própria.
- Dados pessoais de contato ficam em tabela separada e nunca aparecem em respostas públicas.
- Prazo de retenção definido e aplicado por rotina automática **[PENDENTE: prazo]**.

## Consentimento
- Consentimento para receber atualizações é separado do envio do relato e fica registrado (data/versão do texto).
- Dados de contato não são usados para outra finalidade além do acompanhamento da ocorrência.

## Controle de acesso
- Acesso administrativo por papéis, com autenticação forte (MFA recomendado).
- Leitura de `contatos_privados` restrita e registrada.
- Auditoria de alterações em tabela *append-only*.

## Conteúdo enviado por usuários
- Imagens: validação de tipo e tamanho, remoção de metadados (EXIF/GPS), armazenamento privado
  e publicação após revisão **[PROPOSTO]**.
- Texto: escape/sanitização na renderização; nenhum HTML de usuário.
- Mecanismo de denúncia em toda página pública e procedimento para remoção de conteúdo ilegal.

## Abuso e spam
- Turnstile no registro, limite de taxa e validação no servidor. A verificação do desafio é server-side; as chaves de teste publicadas pela Cloudflare são exclusivas de teste/staging.
- Origem é pseudonimizada por HMAC, sem guardar IP puro. O header de origem só é confiado quando fornecido pela plataforma de hospedagem; parâmetros de cliente não definem privilégio ou publicação.
- Os parâmetros não são documentados publicamente.

## Direitos do titular
- M3 usa código privado gerado no navegador. O registro envia só SHA-256; acompanhamento/exclusão enviam o segredo apenas no corpo POST, com `no-store`, nunca em query, path, metadata ou log. O link usa fragmento `/acompanhar#<código>`.
- Quem detém o link pode acompanhar e solicitar exclusão; não há recuperação por protocolo. A tela explica a guarda e pede confirmação antes da ação. O registro de auditoria permanece.
- Canal alternativo de acesso/correção e política de retenção para produção continuam pendentes.

## O que ainda precisa de definição
Controlador e encarregado (DPO), prazo de retenção, política de resposta a incidentes, local de
armazenamento (região) e eventuais transferências internacionais.

## CSP no M3

A CSP permite os scripts e frames de `https://challenges.cloudflare.com` somente em `/registrar`, conforme [orientação da Cloudflare](https://developers.cloudflare.com/turnstile/reference/content-security-policy/). Acompanhamento usa `Referrer-Policy: no-referrer` e não carrega o widget.

Nonce global foi rejeitado porque o guia instalado do Next 16 informa incompatibilidade com PPR e exigência de renderização dinâmica. O experimento SRI preservou o build estático, mas não autorizou os scripts inline de bootstrap/RSC. A política mantém `unsafe-inline` como risco residual do shell atual; texto de cidadão continua renderizado como texto, sem HTML interpretado. Não se afirma CSP estrita.

## Gate de escrita da Task 4.1

O registro fica fechado por padrão. O opt-in servidor `AMBIENTE_REGISTRO=staging_ficticio` permite somente revisão (`moderar_tudo`, gravação `pendente`): preview Vercel com credenciais do staging, ou loopback local. Deploy Vercel de produção permanece bloqueado. Sem política aprovada, `texto_automatico` não autoriza publicação. Usar banco separado e conteúdo fictício; o gate técnico não substitui aprovação jurídica e operacional. O DTO M3 rejeita contato e consentimento adicionais; os parâmetros legados de contato no RPC continuam nulos e consentimento falso.
