import type { Metadata } from "next";
import { Suspense } from "react";
import { AvisoMetodologico } from "@/components/AvisoMetodologico";
import { CarregandoLista, ListaProblemas } from "@/components/ListaProblemas";

export const metadata: Metadata = {
  title: "Relatos",
  description: "Relatos de problemas públicos em Goiás, com a situação de cada um.",
};

export default function PaginaProblemas(props: PageProps<"/problemas">) {
  return (
    <div className="flex flex-col gap-5">
      <h1>Relatos de problemas</h1>
      <AvisoMetodologico />
      <Suspense fallback={<CarregandoLista />}>
        <ListaProblemas
          searchParams={props.searchParams}
          base="/problemas"
          comSeletorDeMunicipio
        />
      </Suspense>
    </div>
  );
}
