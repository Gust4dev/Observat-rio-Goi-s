export function mensagemConsulta(status: number): string {
  if (status === 429) return "Muitas consultas em pouco tempo. Aguarde e tente novamente.";
  if (status === 503) return "Acompanhamento indisponível no momento. Tente novamente mais tarde.";
  if (status === 0 || status >= 500) return "Não foi possível carregar agora. Confira sua conexão e tente novamente.";
  return "Não foi possível acessar um acompanhamento com este link. Confira o link privado que você guardou.";
}
