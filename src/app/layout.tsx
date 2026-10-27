import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { AvisoAmbiente } from "@/components/AvisoAmbiente";

export const metadata: Metadata = {
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL
    ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
    : undefined,
  title: {
    default: "Observatório Goiás",
    template: "%s | Observatório Goiás",
  },
  description: "Acompanhe problemas públicos relatados em Goiás.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="min-h-full flex flex-col">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:bg-acao focus:px-4 focus:text-sobre-acao"
        >
          Pular para o conteúdo
        </a>
        <AvisoAmbiente />
        <header className="border-b border-borda">
          <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-x-6 px-4">
            <Link
              href="/"
              className="text-xl font-bold text-texto no-underline"
            >
              Observatório Goiás
            </Link>
            <nav aria-label="Principal">
              <Link href="/problemas" className="font-semibold">
                Problemas
              </Link>
            </nav>
          </div>
        </header>
        <main
          id="conteudo"
          className="mx-auto w-full max-w-3xl flex-1 px-4 py-6"
        >
          {children}
        </main>
        <footer className="border-t border-borda bg-superficie">
          <div className="mx-auto w-full max-w-3xl px-4 py-6 text-sm text-texto-suave">
            <p>
              Projeto de acompanhamento de problemas públicos em Goiás. A
              organização responsável será divulgada em /transparencia antes do
              lançamento.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
