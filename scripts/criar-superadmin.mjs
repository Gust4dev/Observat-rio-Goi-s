import { codigoTotp } from './lib/admin-ficticio.mjs';

try { process.loadEnvFile(new URL('../.env.local', import.meta.url)); } catch { /* env may be injected by the operator */ }

function config() {
  const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '');
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase() ?? '';
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD ?? '';
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash || !anon || !service
      || !email.includes('@') || !password) throw new Error('Variáveis obrigatórias ausentes ou inválidas.');
  return { base: url.origin, anon, service, email, password };
}

async function api(c, path, { method = 'GET', body, token, admin = false, prefer } = {}) {
  const key = admin ? c.service : c.anon;
  const response = await fetch(c.base + path, {
    method, cache: 'no-store', signal: AbortSignal.timeout(12_000),
    headers: { apikey: key, Authorization: `Bearer ${token ?? key}`, 'Content-Type': 'application/json', Accept: 'application/json', ...(prefer ? { Prefer: prefer } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new Error(`Operação de provisionamento falhou (${response.status}).`);
  return data;
}

async function localizar(c) {
  for (let page = 1; page <= 100; page++) {
    const result = await api(c, `/auth/v1/admin/users?page=${page}&per_page=1000`, { admin: true });
    const users = Array.isArray(result) ? result : result?.users;
    if (!Array.isArray(users)) throw new Error('Consulta de usuários do Auth indisponível.');
    const match = users.find((u) => u?.email?.toLowerCase() === c.email);
    if (match) return match;
    if (users.length < 1000) return null;
  }
  throw new Error('Busca de usuário excedeu o limite operacional.');
}

async function main() {
  const c = config();
  let user = await localizar(c);
  if (!user) {
    user = await api(c, '/auth/v1/admin/users', {
      method: 'POST', admin: true,
      body: { email: c.email, password: c.password, email_confirm: true, app_metadata: { provisionado_por: 'operacao_inicial' } },
    });
  }
  const userId = user?.id ?? user?.user?.id;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId ?? '')) throw new Error('Auth não retornou um usuário válido.');
  await api(c, '/rest/v1/administradores?on_conflict=user_id', {
    method: 'POST', admin: true,
    prefer: 'resolution=merge-duplicates,return=minimal',
    body: { user_id: userId, papel: 'superadmin', ativo: true },
  });

  const login = await api(c, '/auth/v1/token?grant_type=password', { method: 'POST', body: { email: c.email, password: c.password } });
  if (typeof login?.access_token !== 'string') throw new Error('Login inicial falhou.');
  const factors = await api(c, '/auth/v1/factors', { token: login.access_token });
  const totps = Array.isArray(factors?.factors) ? factors.factors.filter((f) => f.factor_type === 'totp') : [];
  if (totps.some((factor) => factor.status === 'verified')) {
    console.log('Superadministrador ativo; fator TOTP já verificado. Nenhuma semente foi exibida.');
    return;
  }
  // Remove only unverified setup attempts so a new seed can be presented once.
  for (const factor of totps) {
    if (factor.status !== 'unverified' || typeof factor.id !== 'string') continue;
    await api(c, `/auth/v1/factors/${encodeURIComponent(factor.id)}`, { method: 'DELETE', token: login.access_token });
  }
  const enrolled = await api(c, '/auth/v1/factors', {
    method: 'POST', token: login.access_token,
    body: { factor_type: 'totp', friendly_name: 'Observatório Goiás' },
  });
  const factorId = enrolled?.id;
  const seed = enrolled?.totp?.secret;
  if (typeof factorId !== 'string' || typeof seed !== 'string') throw new Error('Inscrição TOTP não retornou uma semente válida.');
  const challenge = await api(c, `/auth/v1/factors/${factorId}/challenge`, { method: 'POST', token: login.access_token, body: {} });
  if (typeof challenge?.id !== 'string') throw new Error('Desafio TOTP não foi criado.');
  const verified = await api(c, `/auth/v1/factors/${factorId}/verify`, {
    method: 'POST', token: login.access_token,
    body: { challenge_id: challenge.id, code: codigoTotp(seed) },
  });
  if (typeof verified?.access_token !== 'string') throw new Error('Fator TOTP não foi verificado.');
  const claims = JSON.parse(Buffer.from(verified.access_token.split('.')[1], 'base64url').toString('utf8'));
  if (claims.sub !== userId || claims.aal !== 'aal2') throw new Error('Sessão inicial não atingiu AAL2.');
  console.log('Superadministrador ativo. Armazene esta semente TOTP em um cofre seguro; ela não será exibida novamente:');
  console.log(seed);
}

main().catch((error) => { console.error(error instanceof Error ? error.message : 'Provisionamento não concluído.'); process.exitCode = 1; });
