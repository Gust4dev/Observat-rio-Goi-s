import { modoAtual } from "@/lib/modo/servidor";

/** Controles da sessão de demonstração, renderizados sob Suspense. */
export async function BarraModoAdmin() {
  const modo = await modoAtual();
  if (!modo.alternavel) return null;
  return (
    <div role="status" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-b border-borda bg-neutro-fundo px-4 py-2 text-center text-sm">
      <strong>{modo.gerados ? "Dados fictícios: LIGADOS (aparecem junto com os reais)" : "Dados fictícios: DESLIGADOS (só relatos de pessoas)"}</strong>
      <form action="/api/demonstracao" method="post" className="flex flex-wrap items-center justify-center gap-4">
        <button name="acao" value={modo.gerados ? "desligar" : "ligar"} className="font-semibold underline">
          {modo.gerados ? "Desligar dados fictícios" : "Ligar dados fictícios"}
        </button>
        <button name="acao" value="sair" className="underline">Encerrar demonstração</button>
      </form>
    </div>
  );
}
