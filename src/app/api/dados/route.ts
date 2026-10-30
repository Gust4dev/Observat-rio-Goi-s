import { obterExportacaoDados } from "@/lib/dados/consultas";
import { exportarCSV, lerParametrosExportacao, LimiteExportacao } from "@/lib/dados/exportacao";

export async function GET(request: Request) {
  let parametros: ReturnType<typeof lerParametrosExportacao>;
  try {
    parametros = lerParametrosExportacao(new URL(request.url).searchParams);
  } catch {
    return Response.json({ erro: "Parâmetros inválidos. Use municipio, categoria e formato (json ou csv)." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  const { formato, ...filtros } = parametros;
  try {
    const itens = await obterExportacaoDados(filtros);
    const headers = { "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=60", "X-Content-Type-Options": "nosniff" };
    return formato === "csv"
      ? new Response(exportarCSV(itens), { headers: { ...headers, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="dados-observatorio.csv"' } })
      : Response.json({ dados: itens, total_linhas: itens.length }, { headers });
  } catch (erro) {
    const limite = erro instanceof LimiteExportacao;
    return Response.json({ erro: limite ? "Exportação excede 5000 linhas. Restrinja município ou categoria." : "Dados temporariamente indisponíveis." }, { status: limite ? 422 : 503, headers: { "Cache-Control": "no-store" } });
  }
}
