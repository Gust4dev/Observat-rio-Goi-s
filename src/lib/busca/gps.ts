import type { resolverGps } from "@/lib/mapa/projecao";

export type CodigoErroGps = 1 | 2 | 3 | "indisponivel";

export function mensagemErroGps(codigo: CodigoErroGps): string {
  switch (codigo) {
    case 1:
      return "Permissão de localização negada. Você pode buscar o município pelo nome.";
    case 2:
      return "Não foi possível determinar sua localização agora. Busque o município pelo nome.";
    case 3:
      return "A localização demorou demais para responder. Tente de novo ou busque pelo nome.";
    default:
      return "Este navegador não oferece localização. Busque o município pelo nome.";
  }
}

export type AcaoGps =
  | { tipo: "ir"; slug: string }
  | { tipo: "confirmar"; slug: string; nome: string }
  | { tipo: "fora" };

export function descreverResolucao(r: ReturnType<typeof resolverGps>): AcaoGps {
  if ("foraDeGoias" in r) return { tipo: "fora" };
  return r.exato ? { tipo: "ir", slug: r.slug } : { tipo: "confirmar", slug: r.slug, nome: r.nome };
}
