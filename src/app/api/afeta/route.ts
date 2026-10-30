import { afetaIndisponivel } from "@/lib/registro/participacao";

export async function POST(request: Request) { return afetaIndisponivel(request); }
