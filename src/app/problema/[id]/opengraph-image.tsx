import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { obterProblema } from "@/lib/dados/consultas";
import { situacaoPublica } from "./publico";
const simbolo = `data:image/png;base64,${await readFile(join(process.cwd(), "public/brand/favicon.png"), "base64")}`;
export const alt = "Observatório Goiás — relato público de demonstração";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default async function Imagem({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dados = await obterProblema(id);
  if (!dados) notFound();
  const p = dados.problema;
  return new ImageResponse(<div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64, background: "#F7F5EF", color: "#24392D", fontFamily: "sans-serif", borderLeft: "16px solid #24553B" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 28 }}><img src={simbolo} width={64} height={64} alt="" />Observatório Goiás · Dados de demonstração</div>
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}><div style={{ display: "flex", fontSize: 28 }}>{p.categoria_nome.slice(0, 80)} · {p.municipio_nome.slice(0, 80)}</div><div style={{ display: "flex", fontSize: 54, lineHeight: 1.15 }}>{p.titulo.slice(0, 150)}</div></div>
    <div style={{ display: "flex", fontSize: 30 }}>Situação: {situacaoPublica(dados)}</div>
  </div>, size);
}
