import { ItemNavegacao } from "./Cabecalho";

export function NavegacaoInferior({ pathname }: { pathname: string }) {
  if (/^\/(registrar|acompanhar)(\/|$)/.test(pathname)) return null;
  return <nav aria-label="Navegação móvel" className="shell-nav-mobile">
    <ItemNavegacao nome="Início" href="/" pathname={pathname} />
    <ItemNavegacao nome="Problemas" href="/problemas" pathname={pathname} />
    <ItemNavegacao nome="Registrar" href="/registrar" pathname={pathname} destaque />
    <ItemNavegacao nome="Dados" href="/dados" pathname={pathname} />
  </nav>;
}
