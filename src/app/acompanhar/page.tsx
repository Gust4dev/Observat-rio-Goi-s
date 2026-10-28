import type { Metadata } from "next";
import Link from "next/link";
import { AcompanharClient } from "@/components/registro/AcompanharClient";

export const metadata: Metadata = {
  title: "Acompanhar relato",
  robots: { index: false, follow: false },
};

export default function AcompanharPage() {
  return <article className="mx-auto max-w-[var(--width-reading)] space-y-5">
    <Link href="/" className="inline-flex min-h-12 items-center font-semibold underline">Voltar ao início</Link>
    <header>
      <h1>Acompanhar meu relato</h1>
      <p className="mt-2 text-texto-suave">Este acompanhamento é privado. O link guardado no seu aparelho é a única forma de consultar o relato e pedir a exclusão.</p>
    </header>
    <noscript><p className="rounded-controle border border-borda bg-aviso-fundo p-4">Para consultar o acompanhamento com segurança, ative o JavaScript. O código privado é lido somente no navegador.</p></noscript>
    <AcompanharClient />
  </article>;
}
