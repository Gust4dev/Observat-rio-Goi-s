"use client";

import { useEffect, useRef } from "react";
import { AvisoConexao } from "@/components/AvisoConexao";

export default function Erro({ retry }: { error: unknown; retry: () => void }) {
  const titulo = useRef<HTMLHeadingElement>(null);
  useEffect(() => { titulo.current?.focus(); }, []);
  return <section className="space-y-4" aria-labelledby="erro-leitura-titulo">
    <h1 id="erro-leitura-titulo" ref={titulo} tabIndex={-1}>Não conseguimos carregar esta página</h1>
    <p role="alert">Tente de novo em instantes. Seus filtros no endereço serão mantidos.</p>
    <AvisoConexao />
    <button type="button" onClick={() => retry()} className="min-h-12 rounded-controle bg-acao px-5 font-semibold text-sobre-acao">Tentar de novo</button>
  </section>;
}
