import { Suspense } from "react";
import { HomeConteudo } from "@/components/HomeConteudo";
export default function Home(props: PageProps<"/">) {
  return <Suspense fallback={<p role="status">Carregando municípios e relatos…</p>}><HomeConteudo searchParams={props.searchParams} /></Suspense>;
}
