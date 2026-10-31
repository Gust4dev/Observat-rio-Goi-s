import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { resolveSupabaseKeys, supabaseApiHeaders } from '../../src/lib/supabase-keys.mjs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ROLE = new Set(['moderador', 'gestor', 'superadmin']);
const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function configuracao() {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const { publicKey: anon, secretKey: service } = resolveSupabaseKeys(process.env);
  const url = new URL(raw);
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash || !anon || !service) {
    throw new Error('Configuração Supabase ausente ou inválida.');
  }
  if (url.hostname !== 'hvekgzxuciyewtybwads.supabase.co') throw new Error('O auxiliar aceita somente o staging fictício autorizado.');
  return { base: url.origin, anon, service };
}

function decodificarBase32(secret) {
  const normalizada = secret.replace(/=+$/u, '').replace(/\s+/gu, '').toUpperCase();
  if (!normalizada || [...normalizada].some((c) => !BASE32.includes(c))) throw new Error('Segredo TOTP inválido.');
  let bits = '';
  for (const char of normalizada) bits += BASE32.indexOf(char).toString(2).padStart(5, '0');
  const bytes = [];
  for (let offset = 0; offset + 8 <= bits.length; offset += 8) bytes.push(Number.parseInt(bits.slice(offset, offset + 8), 2));
  return Buffer.from(bytes);
}

/** RFC 6238: TOTP SHA-1, 30 seconds, six digits. `atMs` exists for deterministic tests. */
export function codigoTotp(secret, atMs = Date.now()) {
  if (!Number.isFinite(atMs) || atMs < 0) throw new Error('Instante TOTP inválido.');
  const counter = BigInt(Math.floor(atMs / 30_000));
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(counter);
  const digest = createHmac('sha1', decodificarBase32(secret)).update(message).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = digest.readUInt32BE(offset) & 0x7fffffff;
  return String(binary % 1_000_000).padStart(6, '0');
}

async function requisicao(config, path, { method = 'GET', body, token, service = false } = {}, transportar = globalThis.fetch) {
  const key = service ? config.service : config.anon;
  const init = {
    method, cache: 'no-store', signal: AbortSignal.timeout(12_000),
    headers: { ...supabaseApiHeaders(key, token), 'Content-Type': 'application/json', Accept: 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  };
  let resposta;
  let ultimoErro;
  const tentativas = method === 'GET' || method === 'DELETE' ? 5 : 1;
  for (let tentativa = 0; tentativa < tentativas; tentativa++) {
    try { resposta = await transportar(config.base + path, init); if (resposta.ok || (resposta.status < 500 && resposta.status !== 429)) break; }
    catch (error) { ultimoErro = error; }
    if (tentativa + 1 < tentativas) await new Promise((resolve) => setTimeout(resolve, 500 * (tentativa + 1)));
  }
  if (!resposta) throw ultimoErro ?? new Error('Operação Auth/DB indisponível.');
  let dados;
  try { dados = await resposta.json(); } catch { dados = null; }
  if (!resposta.ok) throw new Error(`Operação Auth/DB falhou (${resposta.status}).`);
  return dados;
}

/** Creates a staging-only administrator, enrolls TOTP and returns an in-memory AAL2 JWT. */
export async function criarAdminFicticio({ papel = 'superadmin', fetch: transportar = globalThis.fetch } = {}) {
  if (!ROLE.has(papel)) throw new Error('Papel de teste inválido.');
  const config = configuracao();
  const idLocal = randomUUID();
  const email = `staging-${idLocal}@example.invalid`;
  const password = `${randomBytes(36).toString('base64url')}Aa1!`;
  let userId;
  let factorId;
  let accessToken;
  let etapa = 'configuração';
  let cleaned = false;
  const api = (path, options) => requisicao(config, path, options, transportar);
  async function cleanup() {
    if (cleaned || !userId) return;
    // Supabase FK is not relied on for deleting the team row.
    let falha;
    try {
      const q = new URLSearchParams({ user_id: `eq.${userId}` });
      await api(`/rest/v1/administradores?${q}`, { method: 'DELETE', service: true });
    } catch (error) { falha = error; }
    if (!falha) {
      try {
        const historico = await api(`/rest/v1/historico_moderacao?${new URLSearchParams({ select: 'id', admin_id: `eq.${userId}`, limit: '1' })}`, { service: true });
        if (Array.isArray(historico) && historico.length > 0) {
          if (accessToken) await api('/auth/v1/logout', { method: 'POST', token: accessToken }).catch(() => {});
          await api(`/auth/v1/admin/users/${userId}`, { method: 'PUT', service: true, body: { ban_duration: '876000h' } });
          cleaned = true;
          return { equipe_removida: true, conta_auth: 'bloqueada; preservada por referência do histórico imutável' };
        }
        await api(`/auth/v1/admin/users/${userId}`, { method: 'DELETE', service: true });
      } catch (error) { falha ??= error; }
    }
    if (falha) throw falha;
    cleaned = true;
    return { equipe_removida: true, conta_auth: 'removida' };
  }
  try {
    etapa = 'criação do usuário Auth';
    const created = await api('/auth/v1/admin/users', {
      method: 'POST', service: true,
      body: { email, password, email_confirm: true, user_metadata: { ambiente: 'staging_ficticio' } },
    });
    userId = created?.id ?? created?.user?.id;
    if (!UUID.test(userId ?? '')) throw new Error('Auth não retornou o usuário de teste.');
    etapa = 'vínculo de equipe';
    await api('/rest/v1/administradores?on_conflict=user_id', {
      method: 'POST', service: true,
      body: { user_id: userId, papel, ativo: true },
    });
    etapa = 'login AAL1';
    const session = await api('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password } });
    if (typeof session?.access_token !== 'string') throw new Error('Login de teste não concluiu.');
    accessToken = session.access_token;
    etapa = 'inscrição TOTP';
    const factor = await api('/auth/v1/factors', {
      method: 'POST', token: accessToken,
      body: { factor_type: 'totp', friendly_name: 'Staging fictício' },
    });
    factorId = factor?.id;
    const secret = factor?.totp?.secret;
    if (!UUID.test(factorId ?? '') || typeof secret !== 'string') throw new Error('Supabase não retornou fator TOTP válido.');
    etapa = 'desafio TOTP';
    const challenge = await api(`/auth/v1/factors/${factorId}/challenge`, { method: 'POST', token: accessToken, body: {} });
    if (!UUID.test(challenge?.id ?? '')) throw new Error('Desafio TOTP não foi criado.');
    etapa = 'verificação TOTP';
    const verified = await api(`/auth/v1/factors/${factorId}/verify`, {
      method: 'POST', token: accessToken,
      body: { challenge_id: challenge.id, code: codigoTotp(secret) },
    });
    const jwt = verified?.access_token;
    if (typeof jwt !== 'string') throw new Error('Verificação TOTP não retornou sessão.');
    let claims;
    try { claims = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString('utf8')); } catch { claims = null; }
    if (claims?.sub !== userId || claims?.aal !== 'aal2') throw new Error('Sessão de teste não atingiu AAL2.');
    return { userId, email, password, papel, factorId, totpSeed: secret, accessToken: jwt, cleanup };
  } catch (error) {
    if (!userId) {
      try {
        const pagina = await api('/auth/v1/admin/users?page=1&per_page=1000');
        userId = pagina?.users?.find((user) => user.email?.toLowerCase() === email.toLowerCase())?.id;
      } catch { /* Reconcile only when Auth is reachable; never guess a user ID. */ }
    }
    let limpezaComprovada = !userId;
    try { if (userId) { await cleanup(); limpezaComprovada = true; } } catch { /* surfaced below without identity or credential */ }
    const causa = error instanceof Error ? error.message : 'falha';
    throw new Error(`Admin fictício na etapa ${etapa}: ${causa}.${limpezaComprovada ? '' : ' Limpeza Auth não comprovada.'}`);
  }
}
