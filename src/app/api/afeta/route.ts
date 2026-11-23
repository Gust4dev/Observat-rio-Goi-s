import { confirmarAfeta } from "@/lib/registro/participacao";

export async function POST(request: Request) { return confirmarAfeta(request); }
