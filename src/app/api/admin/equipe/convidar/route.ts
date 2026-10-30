import { handleAdmin } from "@/lib/admin/handlers/http";
export async function POST(req: Request) { return handleAdmin(req, "equipe-convidar"); }
