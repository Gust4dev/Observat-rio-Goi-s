const ERROS = {
  indisponivel: { status: 503, mensagem: "Não foi possível concluir agora. Tente novamente mais tarde." },
  entrada_invalida: { status: 422, mensagem: "Confira os campos e tente novamente." },
  corpo_invalido: { status: 400, mensagem: "Não foi possível ler o envio. Tente novamente." },
  corpo_grande: { status: 413, mensagem: "O envio ultrapassou o tamanho permitido." },
  origem_invalida: { status: 403, mensagem: "Não foi possível autorizar este envio." },
  captcha_invalido: { status: 422, mensagem: "Confirme a verificação de segurança e tente novamente." },
  limite_excedido: { status: 429, mensagem: "Muitos envios em pouco tempo. Tente de novo mais tarde." },
  token_invalido: { status: 404, mensagem: "Não foi possível acessar este acompanhamento. Confira seu link privado." },
  conflito: { status: 409, mensagem: "Não foi possível confirmar este envio. Tente novamente com os mesmos dados." },
} as const;

export type CodigoErroRegistro = keyof typeof ERROS;
export class ErroRegistro extends Error {
  constructor(readonly codigo: CodigoErroRegistro, readonly sqlstate?: string) {
    super(ERROS[codigo].mensagem);
    this.name = "ErroRegistro";
  }
}

/** Nunca serializa mensagem, cause ou dados de um erro externo. */
export function respostaErro(erro: unknown): Response {
  const codigo = erro instanceof ErroRegistro ? erro.codigo : "indisponivel";
  const { status, mensagem } = ERROS[codigo];
  return Response.json({ erro: { codigo, mensagem } }, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, nofollow" },
  });
}
