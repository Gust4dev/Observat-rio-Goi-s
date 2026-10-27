import Link from "next/link";

export function EstadoVazio({
  titulo,
  texto,
  acaoHref,
  acaoRotulo,
}: {
  titulo: string;
  texto: string;
  acaoHref?: string;
  acaoRotulo?: string;
}) {
  return (
    <section className="rounded-lg border border-borda bg-superficie p-6 text-center">
      <h2>{titulo}</h2>
      <p className="mt-2 text-texto-suave">{texto}</p>
      {acaoHref && acaoRotulo ? (
        <p className="mt-4">
          <Link
            href={acaoHref}
            className="rounded-lg bg-acao px-5 font-semibold text-sobre-acao no-underline hover:bg-acao-escura hover:text-sobre-acao"
          >
            {acaoRotulo}
          </Link>
        </p>
      ) : null}
    </section>
  );
}
