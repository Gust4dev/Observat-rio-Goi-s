import Link from "next/link";
import { AvisoMetodologico } from "@/components/AvisoMetodologico";
import { CartaoProblema } from "@/components/CartaoProblema";
import { EstadoVazio } from "@/components/EstadoVazio";
import { indicadoresGerais, ultimosProblemas } from "@/lib/dados/consultas";

export default async function Home() {
  const [indicadores, recentes] = await Promise.all([
    indicadoresGerais(),
    ultimosProblemas(5),
  ]);

  const numeros = indicadores
    ? [
        { valor: indicadores.total_ocorrencias, texto: "relatos publicados" },
        { valor: indicadores.municipios_com_registros, texto: "municípios com registros" },
        { valor: indicadores.com_resposta_oficial, texto: "relatos com resposta oficial" },
        { valor: indicadores.resolvidas_documentadas, texto: "resolvidos com documentação" },
      ]
    : [];

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h1>Observatório Goiás</h1>
        <p className="mt-3">
          Um espaço para acompanhar problemas públicos relatados por moradores
          de Goiás: o que foi relatado, onde, e o que aconteceu depois.
        </p>
      </section>

      <AvisoMetodologico />

      {numeros.length > 0 ? (
        <section aria-labelledby="titulo-numeros">
          <h2 id="titulo-numeros">Em números</h2>
          <ul className="mt-3 grid grid-cols-2 gap-3">
            {numeros.map((n) => (
              <li key={n.texto} className="rounded-lg border border-borda p-4">
                <span className="block text-2xl font-bold">{n.valor}</span>
                <span className="text-texto-suave">{n.texto}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {recentes.length > 0 ? (
        <section aria-labelledby="titulo-recentes">
          <h2 id="titulo-recentes">Relatos recentes</h2>
          <ul className="mt-3 flex flex-col gap-4">
            {recentes.map((p) => (
              <li key={p.id}>
                <CartaoProblema
                  id={p.id}
                  titulo={p.titulo}
                  municipioNome={p.municipio_nome}
                  categoriaNome={p.categoria_nome}
                  situacao={p.situacao}
                  publicadoEm={p.publicado_em}
                  temRespostaOficial={p.tem_resposta_oficial}
                />
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <Link href="/problemas" prefetch={false} className="font-semibold">
              Ver todos os relatos
            </Link>
          </div>
        </section>
      ) : (
        <EstadoVazio
          titulo="Ainda não há relatos publicados"
          texto="Quando houver relatos publicados, os mais recentes aparecem aqui."
        />
      )}
    </div>
  );
}
