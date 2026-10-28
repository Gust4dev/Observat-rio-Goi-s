const CATEGORIAS: Record<string, { nome: string; caminho: string }> = {
  saude: { nome: "Saúde", caminho: "M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" },
  educacao: { nome: "Educação", caminho: "M12 5v16M12 5C9 2 5 3 2 4v15c4-2 7-1 10 2 3-3 6-4 10-2V4c-3-1-7-2-10 1" },
  infraestrutura: { nome: "Infraestrutura", caminho: "m7 3-4 18M17 3l4 18M12 3v4m0 4v3m0 4v3M4 14h6v3H4" },
  seguranca: { nome: "Segurança", caminho: "m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z" },
  transporte: { nome: "Transporte e mobilidade", caminho: "M5 18V5q0-2 7-2t7 2v13H5zM5 11h14M8 7h8M8 15h1m6 0h1M7 18v3m10-3v3" },
  "iluminacao-publica": { nome: "Iluminação pública", caminho: "M7 22V7a4 4 0 0 1 4-4h5M12 7h9l-2-4h-4zM4 22h6M16 10v3m5-3 1 2m-10-2-1 2" },
  saneamento: { nome: "Saneamento", caminho: "M12 2s-5 6-5 9a5 5 0 0 0 10 0c0-3-5-9-5-9M2 19h8v3h4v-3h8" },
  "meio-ambiente": { nome: "Meio ambiente", caminho: "M4 20C0 8 10 2 21 3c1 12-4 18-13 15M3 22 17 8M9 16v-5m3 2h5" },
  emprego: { nome: "Emprego e desenvolvimento", caminho: "M14 4a6 6 0 0 0-7 7L3 17a3 3 0 0 0 4 4l6-6a6 6 0 0 0 7-7l-4 3-3-3z" },
  "servicos-publicos": { nome: "Serviços públicos", caminho: "m3 8 9-5 9 5H3zM5 10v9m7-9v9m7-9v9M3 21h18" },
  outros: { nome: "Outros", caminho: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" },
};

/** Inclui o nome visível: o desenho nunca é o único identificador da categoria. */
export function IconeCategoria({ categoria }: { categoria: string }) {
  const { nome, caminho } = CATEGORIAS[categoria] ?? CATEGORIAS.outros;
  return <span className="inline-flex max-w-full items-center gap-2 text-sm text-texto-suave">
    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-controle bg-neutro-fundo">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={caminho} /></svg>
    </span>
    <span className="min-w-0 break-words">{nome}</span>
  </span>;
}
