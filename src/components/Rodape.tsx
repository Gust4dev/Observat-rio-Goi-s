import Image from "next/image";
import Link from "next/link";

export function Rodape() {
  return <footer className="shell-rodape">
    <div className="shell-largura shell-rodape-conteudo text-sm text-texto-suave">
      <div className="shell-rodape-grade">
        <div className="shell-rodape-identidade">
          <Link href="/" className="shell-marca-rodape"><Image src="/brand/observatorio-completa.webp" alt="Observatório Goiás" width={1551} height={564} sizes="(max-width: 320px) 90vw, 280px" /></Link>
          <p>Acompanhamento de problemas públicos em Goiás. Este espaço não substitui os canais oficiais de atendimento ou de emergência.</p>
        </div>
        <nav aria-label="Informações institucionais" className="shell-rodape-links">
          <Link href="/sobre">Sobre</Link>
          <Link href="/transparencia">Transparência e metodologia</Link>
          <Link href="/privacidade">Privacidade</Link>
          <Link href="/termos">Termos de uso</Link>
          <Link href="/regras">Regras de publicação</Link>
          <Link href="/contato">Contato</Link>
        </nav>
      </div>
      <p className="shell-rodape-nota">Conteúdo institucional provisório, com revisão jurídica pendente.</p>
    </div>
  </footer>;
}
