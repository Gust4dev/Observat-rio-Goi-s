"use client";

import { usePathname } from "next/navigation";
import { Cabecalho } from "./Cabecalho";
import { NavegacaoInferior } from "./NavegacaoInferior";

// Pathname is rendered by Next on the initial request too: navigation is usable before hydration.
export function ShellPublico({ children, rodape }: { children: React.ReactNode; rodape: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const semBarra = /^\/(registrar|acompanhar)(\/|$)/.test(pathname);
  return <div className="shell-publico" data-barra-movel={semBarra ? "nao" : "sim"}>
    <Cabecalho pathname={pathname} />
    <main id="conteudo" tabIndex={-1} className="shell-largura flex-1 py-6">{children}</main>
    {rodape}
    <NavegacaoInferior pathname={pathname} />
  </div>;
}
