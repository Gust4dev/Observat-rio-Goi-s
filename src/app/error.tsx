"use client";

export default function Erro({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col gap-4" role="alert">
      <h1>Algo deu errado</h1>
      <p>Não conseguimos carregar esta página agora. Tente novamente em instantes.</p>
      <div>
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-lg bg-acao px-5 font-semibold text-sobre-acao hover:bg-acao-escura"
        >
          Tentar de novo
        </button>
      </div>
    </div>
  );
}
