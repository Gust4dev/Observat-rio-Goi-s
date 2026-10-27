# Privacidade e segurança (princípios técnicos)

> Documento técnico. Não substitui a Política de Privacidade nem parecer jurídico.
> A adequação à LGPD e a definição do controlador dos dados são **[PENDENTES]**.

## Minimização
- Nome e WhatsApp são opcionais; publicação anônima disponível.
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
- Captcha, limite de taxa e validação no servidor.
- Os parâmetros não são documentados publicamente.

## Direitos do titular
- Pedido de acesso/correção/exclusão via token de gestão ou canal de contato **[PROPOSTO]**.

## O que ainda precisa de definição
Controlador e encarregado (DPO), prazo de retenção, política de resposta a incidentes, local de
armazenamento (região) e eventuais transferências internacionais.
