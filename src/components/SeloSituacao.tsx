import { rotuloSituacao, tomSituacao, type Situacao } from "@/lib/situacao";

const CLASSES = {
  neutro: "bg-tom-neutro-fundo text-tom-neutro-texto border-tom-neutro-texto",
  andamento:
    "bg-tom-andamento-fundo text-tom-andamento-texto border-tom-andamento-texto",
  sucesso:
    "bg-tom-sucesso-fundo text-tom-sucesso-texto border-tom-sucesso-texto",
  encerrado:
    "bg-tom-encerrado-fundo text-tom-encerrado-texto border-tom-encerrado-texto",
} as const;

function Icone({ tom }: { tom: keyof typeof CLASSES }) {
  const props = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    focusable: false,
  };
  switch (tom) {
    case "sucesso": // marca de verificação
      return (
        <svg {...props}>
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      );
    case "andamento": // seta
      return (
        <svg {...props}>
          <path d="M4 12h15M13 6l6 6-6 6" />
        </svg>
      );
    case "encerrado": // traço em círculo
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M8 12h8" />
        </svg>
      );
    default: // relógio
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5V12l3 2" />
        </svg>
      );
  }
}

export function SeloSituacao({ situacao }: { situacao: Situacao }) {
  const tom = tomSituacao(situacao);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold ${CLASSES[tom]}`}
    >
      <Icone tom={tom} />
      {rotuloSituacao(situacao)}
    </span>
  );
}
