import { handleAdmin } from "@/lib/admin/handlers/http";
export async function POST(req: Request, context: { params: Promise<{ id: string }> }) { return handleAdmin(req, "situacao", (await context.params).id); }
