# Privacidade e segurança (princípios técnicos)

> Documento técnico. Não substitui a Política de Privacidade nem parecer jurídico.
> A adequação à LGPD e a definição do controlador dos dados são **[PENDENTES]**.

## Minimização
- O relato público não exige identificação. Contato opcional fica separado e fotos são mantidas em armazenamento privado até revisão.
- Dados pessoais de contato ficam em tabela separada e nunca aparecem em respostas públicas.
- Para fotos retidas/removidas, o padrão técnico provisório é 365 dias. Ao vencer, a referência, o hash de entrada e o contexto são apagados do banco; o objeto órfão é removido pelo limpador Storage após 24 horas e nova consulta de referência. Esse prazo não é definição jurídica e deve ser aprovado antes de produção.
- O prazo de contatos permanece por registro em `expira_em`; a definição institucional continua pendente.

## Consentimento
- Consentimento para receber atualizações é separado do envio do relato e fica registrado (data/versão do texto).
- Dados de contato não são usados para outra finalidade além do acompanhamento da ocorrência.

## Controle de acesso
- Acesso administrativo por papéis e TOTP obrigatório; funções no banco também exigem sessão Supabase AAL2.
- Cookies administrativos são `HttpOnly`, `Secure`, `SameSite=Strict`, limitados ao caminho administrativo e não são devolvidos em JSON. Operações de escrita validam `Origin` e o cabeçalho CSRF próprio.
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

## Provisionamento do primeiro superadministrador

O operador fornece `ADMIN_BOOTSTRAP_EMAIL` e `ADMIN_BOOTSTRAP_PASSWORD` no ambiente do processo, junto das variáveis Supabase. Execute `node --env-file=.env.local scripts/criar-superadmin.mjs` em ambiente controlado. O script cria ou localiza a conta, associa o papel de superadministrador e verifica TOTP; a semente é mostrada somente durante a primeira inscrição sem fator verificado. Guarde-a em cofre de segredos e não a envie por chat, issue ou repositório. O cadastro público do Auth deve permanecer desativado; contas administrativas são provisionadas por convite.

## O que ainda precisa de definição
Controlador e encarregado (DPO), prazo de retenção, política de resposta a incidentes, local de
armazenamento (região) e eventuais transferências internacionais.

## CSP no M3

A CSP permite os scripts e frames de `https://challenges.cloudflare.com` somente em `/registrar`, conforme [orientação da Cloudflare](https://developers.cloudflare.com/turnstile/reference/content-security-policy/). Acompanhamento usa `Referrer-Policy: no-referrer` e não carrega o widget.

Nonce global foi rejeitado porque o guia instalado do Next 16 informa incompatibilidade com PPR e exigência de renderização dinâmica. O experimento SRI preservou o build estático, mas não autorizou os scripts inline de bootstrap/RSC. A política mantém `unsafe-inline` como risco residual do shell atual; texto de cidadão continua renderizado como texto, sem HTML interpretado. Não se afirma CSP estrita.

## Gate de escrita da Task 4.1

O registro fica fechado por padrão. O opt-in servidor `AMBIENTE_REGISTRO=staging_ficticio` permite somente revisão (`moderar_tudo`, gravação `pendente`): preview Vercel com credenciais do staging, ou loopback local. Deploy Vercel de produção permanece bloqueado. Sem política aprovada, `texto_automatico` não autoriza publicação. Usar banco separado e conteúdo fictício; o gate técnico não substitui aprovação jurídica e operacional. O DTO M3 rejeita contato e consentimento adicionais; os parâmetros legados de contato no RPC continuam nulos e consentimento falso.

## Validação de segurança do mapa — 2026-10-28

A varredura local de `.next/static` e `.next/server` procurou o valor da credencial `service_role` existente no ambiente sem imprimi-lo e não encontrou literal nos bundles. Acesso ao app local sem autenticação foi recusado (401); com credenciais fictícias temporárias, apenas locais, as páginas puderam ser verificadas. Nenhuma credencial real foi passada ao navegador. O contrato remoto de staging não foi executado e as migrations/bucket de fotos 011/012 ainda precisam de aplicação/configuração no staging.

Os testes automatizados de registro/acompanhamento, escaping textual, URL/validação de imagem, limites e resposta pública estão cobertos nas suítes direcionadas e na suíte completa. Esta rodada não substitui teste de abuso/rate limit/Turnstile contra ambiente preparado, auditoria de logs/headers no deploy, teste de leitor de tela nem validação operacional de exclusão. A política CSP mantém `unsafe-inline` no bootstrap/RSC do Next atual, risco residual já documentado; não há afirmação de CSP estrita.
