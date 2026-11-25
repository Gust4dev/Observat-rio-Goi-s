import { obterMunicipio } from "@/lib/dados/consultas";
import { textoPainel } from "@/lib/mapa/geometria";
import { modoAtual } from "@/lib/modo/servidor";

/** Total do município conforme o modo (gerados + reais, ou só reais). Lê cookies: usar sob <Suspense>. */
export async function TextoPainelMunicipio({ slug }: { slug: string }) {
  const modo = await modoAtual();
  const m = await obterMunicipio(slug, modo.gerados);
  if (!m) return null;
  return <p className="mt-2 text-texto-suave">{textoPainel({ estado: "disponivel", total: m.total, ativoAcompanhamento: true })}</p>;
}
