import type { ReactNode } from "react";

const traco = "fill-none stroke-texto-suave";
const caixa = "fill-superficie stroke-borda";

function CenaMunicipio() {
  return <svg viewBox="0 0 160 96" className="h-24 w-40 max-w-full" aria-hidden="true" focusable="false">
    <rect x="4" y="6" width="96" height="28" rx="6" className={caixa} strokeWidth="1.5" />
    <rect x="14" y="17" width="52" height="6" rx="3" className="fill-borda-suave" />
    <path d="M82 17l6 6 6-6" className={traco} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M112 30l14-12 20 6 6 22-8 24-20 8-16-12-4-20z" className="fill-secundario stroke-borda" strokeWidth="1.5" strokeLinejoin="round" />
    <circle cx="134" cy="52" r="5" className="fill-acao" />
    <circle cx="134" cy="52" r="9" className="fill-none stroke-acao" strokeWidth="1.5" />
  </svg>;
}

function CenaRelato() {
  return <svg viewBox="0 0 160 96" className="h-24 w-40 max-w-full" aria-hidden="true" focusable="false">
    <rect x="4" y="4" width="100" height="10" rx="3" className="fill-borda-suave" />
    <rect x="4" y="20" width="152" height="20" rx="6" className={caixa} strokeWidth="1.5" />
    <rect x="12" y="28" width="60" height="5" rx="2.5" className="fill-borda-suave" />
    <rect x="4" y="46" width="152" height="28" rx="6" className={caixa} strokeWidth="1.5" />
    <rect x="12" y="54" width="120" height="5" rx="2.5" className="fill-borda-suave" />
    <rect x="12" y="63" width="84" height="5" rx="2.5" className="fill-borda-suave" />
    <rect x="4" y="80" width="64" height="14" rx="5" className="fill-acao" />
  </svg>;
}

function CenaProtocolo() {
  return <svg viewBox="0 0 160 96" className="h-24 w-40 max-w-full" aria-hidden="true" focusable="false">
    <rect x="4" y="4" width="152" height="24" rx="6" className={caixa} strokeWidth="1.5" />
    <rect x="12" y="12" width="28" height="5" rx="2.5" className="fill-borda-suave" />
    <rect x="12" y="20" width="76" height="4" rx="2" className="fill-texto-suave" />
    <path d="M16 40v48" className={traco} strokeWidth="1.5" />
    <circle cx="16" cy="44" r="4" className="fill-acao" />
    <circle cx="16" cy="64" r="4" className="fill-superficie stroke-acao" strokeWidth="1.5" />
    <circle cx="16" cy="84" r="4" className="fill-superficie stroke-borda" strokeWidth="1.5" />
    <rect x="30" y="42" width="72" height="5" rx="2.5" className="fill-borda-suave" />
    <rect x="30" y="62" width="96" height="5" rx="2.5" className="fill-borda-suave" />
    <rect x="30" y="82" width="56" height="5" rx="2.5" className="fill-borda-suave" />
  </svg>;
}

const passos: { numero: string; titulo: string; texto: string; cena: ReactNode }[] = [
  { numero: "01", titulo: "Escolha sua cidade", texto: "Escolha pelo nome ou pelo mapa.", cena: <CenaMunicipio /> },
  { numero: "02", titulo: "Conte o que aconteceu", texto: "O relato passa por análise antes de ser publicado.", cena: <CenaRelato /> },
  { numero: "03", titulo: "Acompanhe com o protocolo", texto: "O protocolo ou o link permite acompanhar sem criar conta.", cena: <CenaProtocolo /> },
];

/** Passos visuais de "Como funciona": lista semântica de 3 itens; números e cenas são decorativos. */
export function PassosInicio() {
  return <ol className="mt-6 grid min-w-0 grid-cols-1 md:grid-cols-3">
    {passos.map((p, i) => <li key={p.numero} className="relative min-w-0 border-l border-borda pb-10 pl-8 last:border-l-transparent last:pb-0 md:border-l-0 md:border-t md:border-borda md:px-8 md:pb-0 md:pt-8 md:first:pl-0 md:last:pr-0">
      <span aria-hidden="true" className={`absolute -left-[5px] top-2 size-[9px] rounded-full bg-acao md:-top-[5px] ${i === 0 ? "md:left-0" : "md:left-8"}`} />
      <div className="md:border-l-0">
        <span aria-hidden="true" className="block text-5xl font-bold leading-none tracking-tight text-texto-suave tabular-nums">{p.numero}</span>
        <h3 className="mt-3">{p.titulo}</h3>
        <p className="mt-2 max-w-xs">{p.texto}</p>
        <div aria-hidden="true" className="mt-4">{p.cena}</div>
      </div>
    </li>)}
  </ol>;
}
