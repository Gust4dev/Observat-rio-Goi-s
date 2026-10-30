import { handleAdmin } from "@/lib/admin/handlers/http";
export async function POST(req: Request, context: { params: Promise<{ id: string }> }) { return handleAdmin(req, "equipe-desativar", (await context.params).id); }
