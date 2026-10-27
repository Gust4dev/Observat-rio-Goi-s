import { EstadoVazio } from "@/components/EstadoVazio";

export default function NaoEncontrado() {
  return (
    <div className="flex flex-col gap-4">
      <h1>Página não encontrada</h1>
      <EstadoVazio
        titulo="Não encontramos o que você procurava"
        texto="O endereço pode estar errado ou o relato pode ter sido removido."
        acaoHref="/problemas"
        acaoRotulo="Ver relatos"
      />
    </div>
  );
}
