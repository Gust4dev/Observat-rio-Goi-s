import { notFound } from "next/navigation";
import { segredoAdmin } from "@/lib/modo/modo";

export default function Demonstracao() {
  if (!segredoAdmin()) notFound();

  return (
    <section className="mx-auto flex w-full max-w-lg flex-col gap-4">
      <h1>Dados de demonstração</h1>
      <p>Ative nesta sessão a exibição de relatos de exemplo identificados como fictícios.</p>
      <form action="/api/demonstracao" method="post" className="flex flex-col gap-4">
        <input type="hidden" name="acao" value="entrar" />
        <label className="flex flex-col gap-2">
          Código de acesso
          <input type="password" name="segredo" required autoComplete="off" className="rounded border border-borda px-3 py-2" />
        </label>
        <button type="submit" className="min-h-12 rounded bg-acao px-4 py-2 text-sobre-acao">Iniciar demonstração</button>
      </form>
    </section>
  );
}
