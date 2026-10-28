import { timingSafeEqual } from "node:crypto";
import { limparImagens } from "@/lib/registro/limpeza-imagens.mjs";
export const maxDuration = 60;
const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow", "X-Content-Type-Options": "nosniff" };
export async function GET(request: Request) {
 const segredo = process.env.CRON_SECRET;
 if (!segredo?.trim()) return Response.json({ erro: "Limpeza indisponível" }, { status: 503, headers });
 const esperado = Buffer.from(`Bearer ${segredo}`); const recebido = Buffer.from(request.headers.get("authorization") ?? "");
 if (recebido.length !== esperado.length || !timingSafeEqual(recebido, esperado)) return Response.json({ erro: "Não autorizado" }, { status: 401, headers });
 try { return Response.json(await limparImagens({ base: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", key: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "", apply: true }), { headers }); }
 catch { return Response.json({ erro: "Limpeza não concluída" }, { status: 503, headers }); }
}
