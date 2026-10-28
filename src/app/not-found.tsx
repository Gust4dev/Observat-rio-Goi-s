import { EstadoVazio } from "@/components/EstadoVazio";

export default function NaoEncontrado() {
  return (
    <div className="flex flex-col gap-4">
      <h1>Página não encontrada</h1>
      <EstadoVazio
        titulo="Não encontramos o que você procurava"
        texto="Não há conteúdo público disponível neste endereço."
        acaoHref="/problemas"
        acaoRotulo="Ver relatos"
      />
    </div>
  );
}
