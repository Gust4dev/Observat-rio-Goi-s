import { LIMITE_DESCRICAO, LIMITE_TITULO } from "@/lib/registro/schemas";
export const ETAPAS = ["Local", "Categoria", "Relato", "Fotos", "Identificação e revisão"] as const;
export type CamposRegistro = { municipio: string; categoria: string; titulo: string; descricao: string };
export function validarEtapa(campos: CamposRegistro, etapa: number): Partial<Record<keyof CamposRegistro, string>> {
 const erros: Partial<Record<keyof CamposRegistro, string>> = {};
 if (etapa === 0 && !campos.municipio) erros.municipio = "Escolha um município.";
 if (etapa === 1 && !campos.categoria) erros.categoria = "Escolha uma categoria.";
 if (etapa === 2) {
  if (campos.titulo.trim().length < 5 || campos.titulo.length > LIMITE_TITULO) erros.titulo = `Escreva um título de 5 a ${LIMITE_TITULO} caracteres.`;
  if (campos.descricao.trim().length < 20 || campos.descricao.length > LIMITE_DESCRICAO) erros.descricao = `Conte o que está acontecendo em 20 a ${LIMITE_DESCRICAO} caracteres.`;
 }
 return erros;
}
export function lerRascunho(valor: string | null): CamposRegistro | null {
 try {
  const v = JSON.parse(valor ?? "null");
  if (!v || ["municipio", "categoria", "titulo", "descricao"].some(k => typeof v[k] !== "string") || v.titulo.length > LIMITE_TITULO || v.descricao.length > LIMITE_DESCRICAO) return null;
  return { municipio:v.municipio, categoria:v.categoria, titulo:v.titulo, descricao:v.descricao };
 } catch { return null; }
}
export function protocoloConfirmado(status: number, payload: Record<string, unknown>): string | null {
 return status === 201 && typeof payload.protocolo === "string" && payload.protocolo.trim() ? payload.protocolo : null;
}

export async function enviarRegistro(corpo: object, rede: typeof fetch = fetch): Promise<string> {
 const resposta = await rede("/api/registrar", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(corpo), cache:"no-store" });
 const dados: unknown = await resposta.json().catch(() => null);
 const payload = dados && typeof dados === "object" ? dados as Record<string, unknown> : {};
 const detalhe = payload.erro && typeof payload.erro === "object" ? payload.erro as Record<string, unknown> : {};
 if (!resposta.ok) throw Object.assign(new Error("envio recusado"), {status:resposta.status, codigo:detalhe.codigo});
 const protocolo = protocoloConfirmado(resposta.status, payload);
 if (!protocolo) throw new Error("Não foi possível confirmar o envio.");
 return protocolo;
}
