import Link from "next/link";
const destinos = [
  { nome: "Início", href: "/" },
  { nome: "Problemas", href: "/problemas" },
  { nome: "Dados", href: "/dados" },
  { nome: "Municípios", href: "/municipios" },
  { nome: "Registrar problema", href: "/registrar" },
] as const;

export function ItemNavegacao({ nome, href, pathname, destaque = false }: {
  nome: string; href?: string; pathname: string; destaque?: boolean;
}) {
  const classe = `shell-nav-item${destaque ? " shell-nav-destaque" : ""}`;
  if (!href) return <span className={classe} aria-disabled="true" title="Ainda indisponível"><span>{nome}<small className="block">Em breve</small></span></span>;
  const ativo = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`) || (href === "/problemas" && pathname.startsWith("/problema/"));
  return <Link className={classe} href={href} aria-current={ativo ? "page" : undefined}>{nome}</Link>;
}

export function Cabecalho({ pathname }: { pathname: string }) {
  return <header className="shell-cabecalho">
    <div className="shell-largura flex flex-wrap items-center justify-between gap-x-6 py-3">
      <Link href="/" className="shell-wordmark">Observatório <span>Goiás</span></Link>
      <nav aria-label="Principal" className="shell-nav-desktop">
        {destinos.map((destino) => <ItemNavegacao key={destino.nome} {...destino} pathname={pathname} destaque={destino.nome === "Registrar problema"} />)}
      </nav>
    </div>
  </header>;
}
