import { handleAdmin } from "@/lib/admin/handlers/http";
export async function GET(req: Request) { return handleAdmin(req, "fila"); }
