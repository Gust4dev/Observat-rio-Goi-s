import { handleAuth } from '@/lib/admin/auth/http';
export async function GET(request: Request) { return handleAuth(request, 'session'); }
