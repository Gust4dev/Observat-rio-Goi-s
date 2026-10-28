"use client";

import type { SyntheticEvent } from "react";
import { SeloDemonstracao } from "./SeloDemonstracao";

export type FotoPublica = {
  id: string | number;
  url?: string | null;
  descricao: string;
};

function urlPermitida(valor: string | null | undefined, origens: readonly string[]) {
  if (!valor || /[\s\\]/.test(valor)) return false;
  // Caminhos locais e origens explicitamente aprovadas; nunca URLs arbitrárias do relato.
  if (valor.startsWith("/") && !valor.startsWith("//")) return true;
  try {
    const url = new URL(valor);
    return url.protocol === "https:" && !url.username && !url.password && origens.includes(url.origin);
  } catch { return false; }
}

function ocultarFotoFalha(evento: SyntheticEvent<HTMLImageElement>) {
  evento.currentTarget.hidden = true;
}

export function GaleriaFotos({ fotos, origensPermitidas = [], demonstracao = false }: {
  fotos: readonly FotoPublica[];
  origensPermitidas?: readonly string[];
  demonstracao?: boolean;
}) {
  if (!fotos.length) return <p className="text-texto-suave">Nenhuma foto publicada.</p>;
  return (
    <section aria-label="Fotos do relato">
      {demonstracao && <SeloDemonstracao />}
      <div className={`grid gap-4 ${fotos.length > 1 ? "md:grid-cols-2" : ""}`}>
        {fotos.slice(0, 3).map(foto => {
          const descricao = foto.descricao.trim();
          const disponivel = descricao && urlPermitida(foto.url, origensPermitidas);
          return (
            <figure key={foto.id} className="min-w-0">
              {disponivel ? <a href={foto.url!} className="block" rel="noopener noreferrer">
                {/* O host é validado acima; não há otimizador de imagens configurado para o storage ainda. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={foto.url!} alt={descricao} width="960" height="640" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={ocultarFotoFalha} className="aspect-[3/2] w-full rounded-lg object-contain" />
              </a> : <p className="rounded-lg border border-borda-suave p-4">Imagem indisponível.</p>}
              <figcaption className="mt-2 break-words text-sm text-texto-suave">{descricao || "Descrição da imagem não informada."}{disponivel && <span className="block">Se a imagem não carregar, você pode continuar lendo o relato.</span>}</figcaption>
            </figure>
          );
        })}
      </div>
    </section>
  );
}
