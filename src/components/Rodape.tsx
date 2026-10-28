import Link from "next/link";

export function Rodape() {
  return <footer className="border-t border-borda bg-superficie">
    <div className="shell-largura py-6 text-sm text-texto-suave">
      <p>Acompanhamento de problemas públicos em Goiás. Este espaço não substitui os canais oficiais de atendimento ou de emergência.</p>
      <nav aria-label="Informações institucionais" className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
        <Link href="/sobre">Sobre</Link>
        <Link href="/transparencia">Transparência e metodologia</Link>
        <Link href="/privacidade">Privacidade</Link>
        <Link href="/termos">Termos de uso</Link>
        <Link href="/regras">Regras de publicação</Link>
        <Link href="/contato">Contato</Link>
      </nav>
      <p className="mt-3">Conteúdo institucional provisório, com revisão jurídica pendente.</p>
    </div>
  </footer>;
}
