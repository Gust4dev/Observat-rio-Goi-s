import { handleAuth } from '@/lib/admin/auth/http';
export async function POST(request: Request) { return handleAuth(request, 'logout'); }
