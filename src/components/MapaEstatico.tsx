import { MUNICIPIOS_GEO, VIEWBOX } from "@/lib/mapa/projecao";
import type { PontoSemana } from "@/lib/dados/semana";

const RAIO_MIN = 9;
const RAIO_MAX = 38;
const TOTAL_REF = 30;

const POR_SLUG = new Map(MUNICIPIOS_GEO.map((m) => [m.slug, m]));

function raioDoPonto(total: number): number {
  const t = Math.min(1, Math.sqrt(Math.max(total, 0)) / Math.sqrt(TOTAL_REF));
  return Number((RAIO_MIN + t * (RAIO_MAX - RAIO_MIN)).toFixed(1));
}

export function MapaEstatico({ pontos, descricao }: { pontos: readonly PontoSemana[]; descricao: string }) {
  return (
    <svg
      viewBox={`0 0 ${VIEWBOX.w} ${VIEWBOX.h}`}
      role="img"
      aria-label={descricao}
      className="aspect-[1000/968] w-full max-w-[510px]"
    >
      {MUNICIPIOS_GEO.map((m) => (
        <path
          key={m.id}
          d={m.d}
          fillRule="evenodd"
          fill="var(--color-acao-suave)"
          stroke="var(--color-territorio)"
          strokeOpacity={0.38}
          strokeWidth={0.65}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {pontos.map((p) => {
        const m = POR_SLUG.get(p.slug);
        if (!m) return null;
        return (
          <circle
            key={p.slug}
            cx={m.x}
            cy={m.y}
            r={raioDoPonto(p.total)}
            fill="var(--color-destaque)"
            fillOpacity={0.55}
            stroke="var(--color-destaque)"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
    </svg>
  );
}
