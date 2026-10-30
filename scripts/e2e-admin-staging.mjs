import { createHash, randomBytes, randomInt, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { Agent as HttpAgent, request as httpRequest } from 'node:http';
import { createServer } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { criarAdminFicticio, codigoTotp } from './lib/admin-ficticio.mjs';
import { executarCicloFotos } from './lib/fotos-staging.mjs';

const REF = 'hvekgzxuciyewtybwads';
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const falhas = [];
const eventosOperacionais = [];
const ocorrencias = [];
const excluidas = new Set();
let faseAtual = 'preparação';
let servidor;
let admin;
let membroId;
let limpezaAdmin;
let baseApp;
let hmac;
let accessBasic;
let turnstileTestToken;
const cookies = new Map();
const agenteApp = new HttpAgent({ keepAlive: true, maxSockets: 1, maxFreeSockets: 1 });

function exigir(condicao, mensagem) { if (!condicao) throw new Error(mensagem); }
function origemApp() { return new URL(baseApp).origin; }
function cabecalhosApp(extra = {}) {
  return { Authorization: `Basic ${accessBasic}`, Origin: origemApp(), ...extra };
}
function cookieHeader() { return [...cookies].map(([name, value]) => `${name}=${value}`).join('; '); }
function guardarCookies(response) {
  const rows = response.headers.getSetCookie?.() ?? (response.headers.get('set-cookie') ? [response.headers.get('set-cookie')] : []);
  for (const raw of rows) {
    const [pair, ...attrs] = raw.split(';');
    const split = pair.indexOf('='); if (split < 1) continue;
    const name = pair.slice(0, split).trim(); const value = pair.slice(split + 1).trim();
    if (attrs.some((a) => /^\s*Max-Age=0\s*$/i.test(a)) || !value) cookies.delete(name);
    else cookies.set(name, value);
  }
}
async function app(pathname, { method = 'GET', body, cookie = true, csrf = false } = {}) {
  const init = {
    method, cache: 'no-store', signal: AbortSignal.timeout(30_000),
    headers: cabecalhosApp({ ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(cookie && cookies.size ? { Cookie: cookieHeader() } : {}), ...(csrf ? { 'X-Observatorio-CSRF': '1' } : {}) }),
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  };
  let response;
  let ultimoErro;
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    try { response = await chamarAppLocal(new URL(pathname, baseApp), init); break; }
    catch (error) {
      ultimoErro = error;
      const causa = error && typeof error === 'object' && 'cause' in error ? error.cause : undefined;
      const erroLocalAntesDeConectar = causa && typeof causa === 'object' && 'code' in causa && ['EADDRINUSE', 'ECONNREFUSED'].includes(String(causa.code));
      if (method !== 'GET' && !erroLocalAntesDeConectar) break;
    }
    if (tentativa < 2) await new Promise((resolve) => setTimeout(resolve, 300 * (tentativa + 1)));
  }
  if (!response) {
    const causa = ultimoErro && typeof ultimoErro === 'object' && 'cause' in ultimoErro && ultimoErro.cause && typeof ultimoErro.cause === 'object' && 'code' in ultimoErro.cause ? String(ultimoErro.cause.code) : 'rede';
    throw new Error(`Aplicação local indisponível (${causa}).`);
  }
  guardarCookies(response);
  const data = await response.json().catch(() => null);
  return { response, data };
}
function chamarAppLocal(url, init) {
  return new Promise((resolve, reject) => {
    const headers = { ...init.headers };
    const bytes = init.body === undefined ? undefined : Buffer.from(String(init.body));
    if (bytes && !Object.keys(headers).some((name) => name.toLowerCase() === 'content-length')) headers['Content-Length'] = String(bytes.length);
    const request = httpRequest(url, { method: init.method, headers, agent: agenteApp, signal: init.signal }, (incoming) => {
      const partes = [];
      incoming.on('data', (parte) => partes.push(Buffer.from(parte)));
      incoming.on('error', reject);
      incoming.on('end', () => {
        const responseHeaders = new Headers();
        for (let indice = 0; indice < incoming.rawHeaders.length; indice += 2) {
          responseHeaders.append(incoming.rawHeaders[indice], incoming.rawHeaders[indice + 1]);
        }
        const status = incoming.statusCode ?? 502;
        const responseBody = status === 204 || status === 304 ? null : Buffer.concat(partes);
        resolve(new Response(responseBody, { status, headers: responseHeaders }));
      });
    });
    request.on('error', reject);
    if (bytes) request.write(bytes);
    request.end();
  });
}
async function appAdmin(pathname, { method = 'GET', body } = {}) {
  return app(pathname, { method, body, cookie: true, csrf: method !== 'GET' });
}
function ok(result, status, label) {
  const codigo = typeof result.data?.erro?.codigo === 'string' ? ` (${result.data.erro.codigo})` : '';
  exigir(result.response.status === status, `${label}: HTTP ${result.response.status}${codigo}, esperado ${status}.`);
  return result.data;
}
async function rest(pathname, { method = 'GET', body, key, prefer } = {}) {
  const c = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const init = {
    method, cache: 'no-store', signal: AbortSignal.timeout(20_000),
    headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(prefer ? { Prefer: prefer } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  };
  let response;
  let ultimoErro;
  const tentativas = method === 'GET' || method === 'DELETE' ? 5 : 1;
  for (let tentativa = 0; tentativa < tentativas; tentativa++) {
    try { response = await fetch(new URL(`/rest/v1/${pathname}`, c), init); if (response.ok || (response.status < 500 && response.status !== 429)) break; }
    catch (error) { ultimoErro = error; }
    if (tentativa + 1 < tentativas) await new Promise((resolve) => setTimeout(resolve, 500 * (tentativa + 1)));
  }
  if (!response) throw ultimoErro ?? new Error('Consulta Supabase de fixture indisponível.');
  if (!response.ok) throw new Error(`Consulta Supabase de fixture falhou (${response.status}).`);
  return response.status === 204 ? null : response.json().catch(() => null);
}
async function portaLivre() {
  const server = createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const address = server.address(); const port = typeof address === 'object' && address ? address.port : 0;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

function iniciarApp(port, env) {
  const cli = path.join(raiz, 'node_modules', 'next', 'dist', 'bin', 'next');
  const child = spawn(process.execPath, [cli, 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
    cwd: raiz, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  });
  for (const stream of [child.stdout, child.stderr]) {
    let buffer = '';
    stream.setEncoding('utf8');
    stream.on('data', (chunk) => {
      buffer += chunk;
      const lines = buffer.split(/\r?\n/u); buffer = lines.pop() ?? '';
      for (const line of lines) {
        try {
          const row = JSON.parse(line);
          if (typeof row.evento !== 'string') continue;
          const safe = Object.fromEntries(Object.entries(row).filter(([key]) => ['timestamp','nivel','requestId','metodo','evento','status','duracaoMs','codigo','codigoExterno','operacao','etapa','requisicao','banco'].includes(key)));
          eventosOperacionais.push(safe);
        } catch { /* Next/Node diagnostics are not forwarded by the E2E harness. */ }
      }
    });
  }
  child.once('exit', (code, signal) => { eventosOperacionais.push({ evento: 'servidor_encerrado', status: code, ...(signal ? { codigo: signal } : {}) }); });
  return child;
}

async function executarBuild(env) {
  const executable = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const child = spawn(executable, ['run', 'build'], { cwd: raiz, env, windowsHide: true, shell: process.platform === 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
    let diagnostico = '';
    for (const stream of [child.stdout, child.stderr]) stream.setEncoding('utf8').on('data', (s) => { diagnostico = (diagnostico + s).slice(-6000); });
    const code = await new Promise((resolve, reject) => { child.once('error', reject); child.once('close', resolve); });
    if (code === 0) return;
    if (!/falha de rede ao consultar|fetch failed|ECONNRESET|ETIMEDOUT/iu.test(diagnostico) || tentativa === 2) throw new Error(`Build de produção com configuração staging falhou (${code}).`);
    await new Promise((resolve) => setTimeout(resolve, 1000 * (tentativa + 1)));
  }
}

async function esperarApp(child, url) {
  const inicio = Date.now();
  while (Date.now() - inicio < 45_000) {
    if (child.exitCode !== null) throw new Error('Servidor local de produção encerrou durante a inicialização.');
    try {
      const r = await fetch(new URL('/api/saude', url), { headers: { Authorization: `Basic ${accessBasic}` }, signal: AbortSignal.timeout(3000), cache: 'no-store' });
      if (r.status === 200) return;
    } catch { /* startup */ }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('Servidor local não ficou saudável no prazo.');
}

function removerProcesso(child) {
  if (!child || child.exitCode !== null) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(() => { child.kill('SIGKILL'); resolve(); }, 5000);
    child.once('exit', () => { clearTimeout(timer); resolve(); });
    child.kill('SIGTERM');
  });
}

async function autenticarMfa() {
  const login = await app('/api/admin/auth/login', { method: 'POST', body: { email: admin.email, password: admin.password }, cookie: false, csrf: true });
  const info = ok(login, 200, 'login administrativo');
  exigir(info?.mfa_required === true && !JSON.stringify(info).includes(admin.accessToken), 'Login expôs credencial ou não exigiu MFA.');
  const accessCookie = login.response.headers.getSetCookie?.().find((line) => line.startsWith('og_admin_access_token=')) ?? '';
  const refreshCookie = login.response.headers.getSetCookie?.().find((line) => line.startsWith('og_admin_refresh_token=')) ?? '';
  exigir(/HttpOnly/i.test(accessCookie) && /Secure/i.test(accessCookie) && /SameSite=Strict/i.test(accessCookie), 'Cookie administrativo sem atributos de segurança exigidos.');
  exigir(/HttpOnly/i.test(refreshCookie) && /Secure/i.test(refreshCookie) && /SameSite=Strict/i.test(refreshCookie), 'Cookie de renovação sem atributos de segurança exigidos.');
  const factorData = ok(await appAdmin('/api/admin/auth/factors'), 200, 'leitura de fator TOTP');
  exigir(factorData?.factors?.some((factor) => factor.id === admin.factorId && factor.status === 'verified'), 'Fator TOTP fictício não apareceu verificado.');
  const challengeData = ok(await appAdmin('/api/admin/auth/challenge', { method: 'POST', body: { factor_id: admin.factorId } }), 200, 'desafio TOTP');
  const verify = await appAdmin('/api/admin/auth/verify', { method: 'POST', body: { factor_id: admin.factorId, challenge_id: challengeData.id, code: codigoTotp(admin.totpSeed) } });
  ok(verify, 200, 'verificação TOTP');
  const session = ok(await appAdmin('/api/admin/auth/session'), 200, 'sessão AAL2');
  exigir(session?.authenticated === true && session?.papel === 'superadmin', 'Sessão AAL2 não autorizou o superadministrador.');
}

async function criarOcorrencia(marcador, municipio, categoria) {
  const token = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const resposta = await app('/api/registrar', { method: 'POST', body: {
    municipio: municipio.slug, categoria: categoria.slug, titulo: `${marcador} ${randomUUID().slice(0, 8)}`,
    descricao: `Relato inteiramente fictício para execução automatizada de staging ${randomUUID()}.`,
    token_hash: tokenHash, chave_idempotencia: randomUUID(), turnstile: turnstileTestToken,
  }, cookie: false });
  const dados = ok(resposta, 201, 'registro fictício');
  const rows = await rest(`ocorrencias?select=id,protocolo&protocolo=eq.${encodeURIComponent(dados.protocolo)}`, { key: process.env.SUPABASE_SERVICE_ROLE_KEY });
  exigir(Array.isArray(rows) && rows.length === 1, 'Não foi possível localizar o relato fictício recém-criado.');
  const registro = { id: rows[0].id, token, protocolo: dados.protocolo, marcador };
  ocorrencias.push(registro);
  return registro;
}

async function moderar(id, acao, extra = {}) {
  const result = await appAdmin(`/api/admin/ocorrencias/${id}/moderar`, { method: 'POST', body: { acao, ...extra } });
  ok(result, 200, `moderação ${acao}`);
}

async function atualizar(id, situacao, evidencia) {
  const result = await appAdmin(`/api/admin/ocorrencias/${id}/situacao`, { method: 'POST', body: {
    situacao, texto: `Atualização fictícia de staging: ${situacao}.`, ...(evidencia ? { evidencia } : {}), publica: true,
  } });
  return result;
}

async function executarFotos(env, appUrl) {
  await executarCicloFotos({
    base: env.NEXT_PUBLIC_SUPABASE_URL,
    anon: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    service: env.SUPABASE_SERVICE_ROLE_KEY,
    app: appUrl,
    adminToken: admin.accessToken,
    hmac,
    basic: Buffer.from(`${env.ACESSO_STAGING_USUARIO}:${env.ACESSO_STAGING_SENHA}`).toString('base64'),
  });
}

async function excluirFixtures() {
  let okCount = 0;
  for (const item of ocorrencias) {
    if (excluidas.has(item.id)) { okCount++; continue; }
    try {
      const result = await app('/api/excluir', { method: 'POST', cookie: false, body: { token: item.token, confirmacao: true } });
      if (result.response.status !== 200) throw new Error(`HTTP ${result.response.status}`);
      excluidas.add(item.id);
      okCount++;
    } catch (error) { falhas.push(`Exclusão titular ${item.marcador}: ${error instanceof Error ? error.message : 'falha'}`); }
  }
  return okCount;
}

async function limparMembroConvidado() {
  if (!membroId) return;
  const q = new URLSearchParams({ user_id: `eq.${membroId}` });
  await rest(`administradores?${q}`, { method: 'DELETE', key: process.env.SUPABASE_SERVICE_ROLE_KEY });
  await fetch(new URL(`/auth/v1/admin/users/${membroId}`, process.env.NEXT_PUBLIC_SUPABASE_URL), {
    method: 'DELETE', cache: 'no-store', signal: AbortSignal.timeout(12000),
    headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
  }).then((r) => { if (!r.ok && r.status !== 404) throw new Error(`Auth cleanup HTTP ${r.status}`); });
}

async function main() {
  let feito = false;
  try { process.loadEnvFile(path.join(raiz, '.env.local')); } catch { /* environment may be injected */ }
  const supabase = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '');
  exigir(supabase.protocol === 'https:' && supabase.hostname === `${REF}.supabase.co` && supabase.pathname === '/' && !supabase.search && !supabase.hash,
    'E2E bloqueado: alvo não corresponde ao projeto staging fictício confirmado.');
  exigir(Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY), 'E2E bloqueado: credenciais Supabase necessárias não foram fornecidas no ambiente.');
  exigir(process.env.VERCEL_ENV !== 'production', 'E2E bloqueado em ambiente de produção.');
  const turnstileTestSecret = process.env.TURNSTILE_TEST_SECRET;
  const turnstileTestSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_TEST_SITE_KEY;
  exigir(Boolean(turnstileTestSecret && turnstileTestSiteKey), 'E2E bloqueado: configure as chaves de teste Turnstile no ambiente do processo.');
  turnstileTestToken = process.env.TURNSTILE_TEST_TOKEN;
  exigir(Boolean(turnstileTestToken), 'E2E bloqueado: configure o token de teste Turnstile no ambiente do processo.');
  hmac = randomBytes(32).toString('base64url');
  const basicUser = `e2e-${randomUUID()}`; const basicPassword = randomBytes(28).toString('base64url');
  accessBasic = Buffer.from(`${basicUser}:${basicPassword}`).toString('base64');
  const port = await portaLivre(); baseApp = `http://127.0.0.1:${port}`;
  const rateValue = () => String(randomInt(10_000, 2 ** 31));
  const windowValue = () => String(randomInt(60, 86_400));
  const env = {
    ...process.env,
    NODE_ENV: 'production', VERCEL: '0', VERCEL_ENV: 'preview',
    AMBIENTE_REGISTRO: 'staging_ficticio', MODO_PUBLICACAO: 'moderar_tudo', FOTOS_HABILITADAS: 'true',
    TURNSTILE_SECRET: turnstileTestSecret, HMAC_SEGREDO: hmac,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: turnstileTestSiteKey,
    LIMITE_REGISTRO_MAXIMO: rateValue(), LIMITE_ACOMPANHAR_MAXIMO: rateValue(), LIMITE_EXCLUIR_MAXIMO: rateValue(),
    LIMITE_DENUNCIA_MAXIMO: rateValue(), LIMITE_RESPOSTA_MAXIMO: rateValue(), LIMITE_FOTO_MAXIMO: rateValue(),
    LIMITE_ADMIN_MAXIMO: rateValue(), LIMITE_ADMIN_JANELA_SEGUNDOS: windowValue(),
    LIMITE_JANELA_SEGUNDOS: windowValue(), TRIAGEM_JANELA_SEGUNDOS: windowValue(), TRIAGEM_LIMITE_ORIGEM: rateValue(),
    AFETA_HABILITADO: 'false',
    ACESSO_STAGING_USUARIO: basicUser, ACESSO_STAGING_SENHA: basicPassword,
    PORT: String(port), HOSTNAME: '127.0.0.1',
  };

  try {
    faseAtual = 'admin fictício e MFA';
    admin = await criarAdminFicticio({ papel: 'superadmin' });
    faseAtual = 'build de produção';
    await executarBuild(env);
    servidor = iniciarApp(port, env);
    await esperarApp(servidor, baseApp);
    await autenticarMfa();

    faseAtual = 'referências públicas de teste';
    const municipios = await rest('municipios?select=id,slug&order=id.asc&limit=1', { key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY });
    const categorias = await rest('categorias?select=id,slug&order=id.asc&limit=1', { key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY });
    exigir(municipios?.[0]?.slug && categorias?.[0]?.slug, 'Staging sem município/categoria pública para fixture.');
    const municipio = municipios[0]; const categoria = categorias[0];

    faseAtual = 'registro fictício';
    const principal = await criarOcorrencia('[E2E]', municipio, categoria);
    faseAtual = 'fila e moderação';
    faseAtual = 'fila administrativa';
    const fila = ok(await appAdmin('/api/admin/fila?limite=100&ordem=recentes'), 200, 'fila administrativa');
    exigir(fila?.itens?.some((i) => i.id === principal.id), 'Relato fictício ausente da fila.');
    faseAtual = 'detalhe administrativo';
    ok(await appAdmin(`/api/admin/ocorrencias/${principal.id}`), 200, 'detalhe administrativo');
    faseAtual = 'moderação da ocorrência';
    await moderar(principal.id, 'aprovar');
    const semEvidencia = await atualizar(principal.id, 'resolvido');
    exigir(semEvidencia.response.status === 400, 'Situação resolvida sem evidência deveria ser recusada.');
    ok(await atualizar(principal.id, 'em_atendimento'), 200, 'atualização pública');
    ok(await atualizar(principal.id, 'resolvido', 'https://exemplo.invalid/evidencia-e2e'), 200, 'resolução com evidência');

    ok(await app('/api/denunciar', { method: 'POST', cookie: false, body: {
      ocorrencia_id: principal.id, motivo: 'outro', texto: 'Denúncia inteiramente fictícia do E2E.', turnstile: turnstileTestToken,
    } }), 202, 'denúncia pública');
    const denuncias = ok(await appAdmin(`/api/admin/denuncias?ocorrencia_id=${principal.id}&status=aberta`), 200, 'fila de denúncias');
    exigir(Array.isArray(denuncias) && denuncias.length > 0, 'Denúncia fictícia ausente da fila administrativa.');
    const denunciaId = denuncias[0].id;
    ok(await appAdmin(`/api/admin/denuncias/${denunciaId}/resolver`, { method: 'POST', body: { status: 'procedente' } }), 200, 'resolução de denúncia');

    ok(await app('/api/resposta', { method: 'POST', cookie: false, body: {
      ocorrencia_id: principal.id, vinculo: 'Representante fictício E2E', contato: 'e2e@example.invalid',
      texto: 'Resposta fictícia enviada para validar o direito de resposta no staging.', turnstile: turnstileTestToken,
    } }), 202, 'resposta pública');
    const respostas = ok(await appAdmin(`/api/admin/respostas?ocorrencia_id=${principal.id}&status=pendente`), 200, 'fila de respostas');
    exigir(Array.isArray(respostas) && respostas.length > 0, 'Resposta fictícia ausente da revisão administrativa.');
    ok(await appAdmin(`/api/admin/respostas/${respostas[0].id}/revisar`, { method: 'POST', body: { acao: 'publicar' } }), 200, 'revisão de resposta');

    faseAtual = 'mesclagem de duplicidade';
    const destino = await criarOcorrencia('[E2E-DUPLICATA-DESTINO]', municipio, categoria);
    const duplicata = await criarOcorrencia('[E2E-DUPLICATA-ORIGEM]', municipio, categoria);
    await moderar(destino.id, 'aprovar'); await moderar(duplicata.id, 'aprovar');
    ok(await appAdmin(`/api/admin/ocorrencias/${duplicata.id}/mesclar`, { method: 'POST', body: { destino: destino.id, motivo: 'Duplicidade criada pelo teste fictício E2E.' } }), 200, 'mesclagem de duplicidade');
    const fontePublica = await rest(`v_ocorrencias_publicas?select=id&id=eq.${duplicata.id}`, { key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY });
    exigir(Array.isArray(fontePublica) && fontePublica.length === 0, 'Origem mesclada ainda está na view pública.');

    faseAtual = 'gestão de equipe e auditoria';
    const inviteEmail = `e2e-${randomUUID()}@example.invalid`;
    const invite = ok(await appAdmin('/api/admin/equipe/convidar', { method: 'POST', body: { email: inviteEmail, papel: 'moderador', motivo: 'Convite fictício do E2E.' } }), 200, 'convite administrativo');
    membroId = invite.user_id;
    exigir(typeof membroId === 'string' && (typeof invite.link_convite === 'string' || invite.convite_enviado === true), 'Convite não retornou o link de uso único nem confirmou o envio por SMTP.');
    ok(await appAdmin(`/api/admin/equipe/${membroId}/papel`, { method: 'POST', body: { papel: 'gestor', motivo: 'Alteração fictícia do E2E.' } }), 200, 'alteração de papel');
    const ultimoSuperadmin = await appAdmin(`/api/admin/equipe/${admin.userId}/desativar`, { method: 'POST', body: { motivo: 'Teste de proteção do último superadministrador.' } });
    exigir(ultimoSuperadmin.response.status === 409, 'O sistema deveria recusar desativar o último superadministrador.');
    ok(await appAdmin(`/api/admin/equipe/${membroId}/desativar`, { method: 'POST', body: { motivo: 'Desativação fictícia do E2E.' } }), 200, 'desativação de membro');
    const auditoria = ok(await appAdmin('/api/admin/auditoria?acao=equipe_desativar&limite=100'), 200, 'leitura de auditoria');
    exigir(Array.isArray(auditoria) && auditoria.some((row) => row.acao === 'equipe_desativar'), 'Ação de equipe ausente da auditoria.');

    faseAtual = 'fotos em quarentena';
    const afeta = await app('/api/afeta', { method: 'POST', cookie: false, body: {} });
    exigir(afeta.response.status === 503, 'ADR-0004 exige endpoint de confirmação desligado.');

    await executarFotos(env, baseApp);

    faseAtual = 'indicadores e supressão';
    const dados = ok(await app('/api/dados?formato=json', { cookie: false }), 200, 'indicadores públicos');
    exigir(Array.isArray(dados?.dados), 'Exportação JSON não retornou linhas.');
    exigir(dados.dados.every((row) => row.total >= 5
      && (row.com_resposta_oficial === 0 || row.com_resposta_oficial >= 5)
      && (row.total - row.com_resposta_oficial === 0 || row.total - row.com_resposta_oficial >= 5)
      && (row.resolvidas_documentadas === 0 || row.resolvidas_documentadas >= 5)
      && (row.total - row.resolvidas_documentadas === 0 || row.total - row.resolvidas_documentadas >= 5)), 'Exportação contém célula/subcontagem abaixo do limiar k=5.');
    const cellView = await rest('v_dados_painel?select=id,total,com_resposta_oficial,resolvidas_documentadas&limit=5000', { key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY });
    exigir(Array.isArray(cellView) && cellView.length === dados.dados.length && cellView.every((row) => row.total >= 5), 'View do banco não aplicou supressão antes da exportação.');

    faseAtual = 'exclusões dos relatos e sessão';
    const excluidas = await excluirFixtures();
    exigir(excluidas === ocorrencias.length, 'Nem todos os relatos fictícios foram encerrados pelo direito de exclusão.');
    const refreshAnterior = cookies.get('og_admin_refresh_token');
    const refresh = ok(await app('/api/admin/auth/refresh', { method: 'POST', csrf: true }), 200, 'rotação da sessão');
    exigir(refresh?.authenticated === true && cookies.get('og_admin_refresh_token') && cookies.get('og_admin_refresh_token') !== refreshAnterior, 'A renovação não rotacionou o token de atualização.');
    ok(await app('/api/admin/auth/logout', { method: 'POST', csrf: true }), 200, 'saída administrativa');
    exigir(!cookies.has('og_admin_access_token') && !cookies.has('og_admin_refresh_token'), 'Logout não limpou os cookies da sessão.');
    const sessaoEncerrada = await app('/api/admin/auth/session');
    exigir(sessaoEncerrada.response.status === 401, 'Logout manteve a sessão administrativa válida.');
    feito = true;
  } catch (error) {
    const detalhe = `${faseAtual}: ${error instanceof Error ? error.message : 'falha inesperada'}`;
    falhas.push(detalhe);
  } finally {
    const excluidas = await excluirFixtures();
    try { await limparMembroConvidado(); } catch { falhas.push('Limpeza de convite fictício não comprovada.'); }
    if (admin) try { limpezaAdmin = await admin.cleanup(); } catch { falhas.push('Limpeza do administrador fictício não comprovada.'); }
    await removerProcesso(servidor);
    agenteApp.destroy();
    if (falhas.length) {
      console.error(JSON.stringify({ e2e: 'pendente', falhas, diagnosticos: eventosOperacionais, limpeza_admin: limpezaAdmin, relatos_excluidos: excluidas, relatos_criados: ocorrencias.length, residuo_esperado: 'linhas anonimizadas e eventos em historico_moderacao permanecem por auditoria somente-inserção' }));
      process.exitCode = 1;
    } else if (feito) console.log(JSON.stringify({ e2e: 'aprovado', registros_ficticios: ocorrencias.length, exclusoes_confirmadas: excluidas, fotos: 'ciclo concluído', supressao: 'k=5 verificada', limpeza_admin: limpezaAdmin, auditoria: 'resíduo somente-inserção preservado' }));
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ e2e: 'pendente', falhas: [error instanceof Error ? error.message : 'E2E não concluído.'], relatos_excluidos: 0, relatos_criados: ocorrencias.length, residuo_esperado: 'linhas anonimizadas e eventos em historico_moderacao permanecem por auditoria somente-inserção' }));
  process.exitCode = 1;
});
