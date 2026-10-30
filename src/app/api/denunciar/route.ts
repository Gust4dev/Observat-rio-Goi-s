import { denunciar } from "@/lib/registro/participacao";

export async function POST(request: Request) { return denunciar(request); }
