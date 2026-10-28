import type { Metadata } from "next";
import { ShellPublico } from "@/components/ShellPublico";
import { Rodape } from "@/components/Rodape";
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
  twitter: { card: "summary_large_image", title: "Observatório Goiás", description: "Acompanhe problemas públicos relatados em Goiás.", images: [{ url: "/opengraph-image.png", alt: "Observatório Goiás" }] },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="min-h-full flex flex-col">
        <a
          href="#conteudo"
          className="shell-pular"
        >
          Pular para o conteúdo
        </a>
        <AvisoAmbiente />
        <ShellPublico rodape={<Rodape />}>{children}</ShellPublico>
      </body>
    </html>
  );
}
