import { handleAdmin } from "@/lib/admin/handlers/http";
export async function GET(req: Request, context: { params: Promise<{ id: string }> }) { return handleAdmin(req, "detalhe", (await context.params).id); }
