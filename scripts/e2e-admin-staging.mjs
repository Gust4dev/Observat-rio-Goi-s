import { createHash, randomBytes, randomInt, randomUUID } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { Agent as HttpAgent, request as httpRequest } from 'node:http';
import { createServer } from 'node:net';
import { mkdtempSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { criarAdminFicticio, codigoTotp } from './lib/admin-ficticio.mjs';
import { executarCicloFotos, verificarStagingFotos } from './lib/fotos-staging.mjs';
import { resolveSupabaseKeys, supabaseApiHeaders } from '../src/lib/supabase-keys.mjs';

const REF = 'hvekgzxuciyewtybwads';
const somenteModeracaoMvp = process.argv.includes('--moderacao-mvp');
const somenteFotosMvp = process.argv.includes('--fotos-mvp');
const somenteConsoleMvp = process.argv.includes('--console-mvp');
const denunciaMvp = 'Denúncia sintética para o E2E de moderação.';
const respostaMvp = 'Resposta sintética para validar revisão e publicação antes da retirada pelo titular.';
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const falhas = [];
const eventosOperacionais = [];
const ocorrencias = [];
const atualizacoesConsole = [];
const excluidas = new Set();
let faseAtual = 'preparação';
let servidor;
let admin;
let membroId;
let limpezaAdmin;
let limpezaParticipacao;
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
  const apiKey = key ?? resolveSupabaseKeys(process.env).publicKey;
  const init = {
    method, cache: 'no-store', signal: AbortSignal.timeout(20_000),
    headers: { ...supabaseApiHeaders(apiKey), Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(prefer ? { Prefer: prefer } : {}) },
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
  const rows = await rest(`ocorrencias?select=id,protocolo&protocolo=eq.${encodeURIComponent(dados.protocolo)}`, { key: resolveSupabaseKeys(process.env).secretKey });
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

function consultarVisibilidadeDireta({ role, aal, userId, fixtureId, publico = false }) {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
  if (!uuid.test(fixtureId) || (userId && !uuid.test(userId)) || !['anon', 'authenticated'].includes(role)) {
    throw new Error('Parâmetros da prova RLS inválidos.');
  }
  const claims = JSON.stringify({ role, aal, sub: userId ?? '' }).replaceAll("'", "''");
  const query = [
    'BEGIN READ ONLY;',
    `SELECT set_config('request.jwt.claims','${claims}',true);`,
    `SELECT set_config('request.jwt.claim.sub','${userId ?? ''}',true);`,
    `SET LOCAL ROLE ${role};`,
    `SELECT count(*)::int AS visible_rows FROM public.${publico ? 'v_ocorrencias_publicas' : 'ocorrencias'} WHERE id='${fixtureId}';`,
    'ROLLBACK;',
  ].join('\n');
  const tempDir = mkdtempSync(path.join(tmpdir(), 'og-e2e-sec-'));
  const queryFile = path.join(tempDir, 'rls.sql');
  try {
    writeFileSync(queryFile, query, { encoding: 'utf8', flag: 'wx' });
    const bin = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const result = spawnSync(bin, ['--yes', 'supabase', 'db', 'query', `--remote=${REF}`, '--yes', '--output-format', 'json', '--file', queryFile], {
      cwd: raiz, env: process.env, encoding: 'utf8', windowsHide: true, shell: process.platform === 'win32',
    });
    if (result.error || result.status !== 0) throw new Error('Consulta de isolamento RLS falhou.');
    const start = result.stdout.indexOf('{\n  "boundary":');
    const end = result.stdout.lastIndexOf('\n}');
    if (start < 0 || end <= start) throw new Error('Consulta de isolamento RLS sem resultado estruturado.');
    const parsed = JSON.parse(result.stdout.slice(start, end + 2));
    const count = parsed.rows?.[0]?.visible_rows;
    if (!Number.isInteger(count)) throw new Error('Consulta de isolamento RLS sem contagem.');
    return count;
  } finally {
    unlinkSync(queryFile);
    rmdirSync(tempDir);
  }
}

function verificarIsolamentoDireto(fixtureId, adminId) {
  const publico = consultarVisibilidadeDireta({ role: 'anon', aal: 'aal0', fixtureId, publico: true });
  const semPapel = consultarVisibilidadeDireta({ role: 'authenticated', aal: 'aal2', userId: randomUUID(), fixtureId });
  const adminAal1 = consultarVisibilidadeDireta({ role: 'authenticated', aal: 'aal1', userId: adminId, fixtureId });
  const adminAal2 = consultarVisibilidadeDireta({ role: 'authenticated', aal: 'aal2', userId: adminId, fixtureId });
  exigir(publico === 0 && semPapel === 0 && adminAal1 === 0 && adminAal2 === 1,
    'RLS não isolou anon, usuário sem papel, admin AAL1 e admin AAL2 como esperado.');
  return { anon: publico, sem_papel: semPapel, admin_aal1: adminAal1, admin_aal2: adminAal2 };
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
  const { secretKey } = resolveSupabaseKeys(process.env);
  await rest(`administradores?${q}`, { method: 'DELETE', key: secretKey });
  const restantes = await rest(`administradores?${new URLSearchParams({ select: 'user_id', user_id: `eq.${membroId}`, limit: '1' })}`, { key: secretKey });
  if (!Array.isArray(restantes) || restantes.length !== 0) throw new Error('Linha de equipe de teste ainda existe.');
  const authUrl = new URL(`/auth/v1/admin/users/${membroId}`, process.env.NEXT_PUBLIC_SUPABASE_URL);
  const headers = supabaseApiHeaders(secretKey);
  const deletion = await fetch(authUrl, { method: 'DELETE', cache: 'no-store', signal: AbortSignal.timeout(12000), headers });
  if (!deletion.ok && deletion.status !== 404) throw new Error(`Auth cleanup HTTP ${deletion.status}`);
  const authCheck = await fetch(authUrl, { method: 'GET', cache: 'no-store', signal: AbortSignal.timeout(12000), headers });
  if (authCheck.status !== 404) throw new Error('Conta de equipe de teste ainda existe.');
}

async function moderacaoMvp(principal, keys) {
  const endpoint = `/api/admin/ocorrencias/${principal.id}`;
  const detalhe = () => appAdmin(endpoint).then(resultado => ok(resultado, 200, 'detalhe administrativo'));
  const alterar = (acao, versao, extra = {}) => moderar(principal.id, acao, { versao_esperada: versao, ...extra });
  faseAtual = 'publicação e fila de relatos publicados';
  const inicial = await detalhe();
  await alterar('aprovar', inicial.ocorrencia.versao_admin);
  const fila = ok(await appAdmin('/api/admin/fila?ordem=recentes&moderacao=publicado'), 200, 'fila de publicados');
  exigir(fila.itens.some(i => i.id === principal.id), 'Fixture publicada sem pendências ausente da fila.');

  faseAtual = 'denúncia pública e decisão AAL2';
  ok(await app('/api/denunciar', { method: 'POST', cookie: false, body: {
    ocorrencia_id: principal.id, motivo: 'outro', texto: denunciaMvp, turnstile: turnstileTestToken,
  } }), 202, 'denúncia pública');
  const denuncias = ok(await appAdmin(`/api/admin/denuncias?ocorrencia_id=${principal.id}&status=aberta`), 200, 'fila de denúncias');
  exigir(denuncias.itens?.length === 1, 'Esperada uma denúncia da fixture.');
  const denuncia = denuncias.itens[0];
  ok(await appAdmin(`/api/admin/denuncias/${denuncia.id}/resolver`, { method: 'POST',
    body: { status: 'procedente', versao_esperada: denuncia.versao_admin },
  }), 200, 'resolução da denúncia');

  faseAtual = 'direito de resposta e decisão AAL2';
  ok(await app('/api/resposta', { method: 'POST', cookie: false, body: {
    ocorrencia_id: principal.id, vinculo: 'Representante fictício E2E', contato: 'moderacao@example.invalid',
    texto: respostaMvp, turnstile: turnstileTestToken,
  } }), 202, 'envio de resposta');
  const respostas = ok(await appAdmin(`/api/admin/respostas?ocorrencia_id=${principal.id}&status=pendente`), 200, 'fila de respostas');
  exigir(respostas.itens?.length === 1, 'Esperada uma resposta da fixture.');
  const resposta = respostas.itens[0];
  const visibilidade = () => rest(`v_respostas_publicas?ocorrencia_id=eq.${principal.id}&select=id`, { key: keys.publicKey });
  exigir((await visibilidade()).length === 0, 'Resposta pendente apareceu publicamente.');
  ok(await appAdmin(`/api/admin/respostas/${resposta.id}/revisar`, { method: 'POST',
    body: { acao: 'publicar', versao_esperada: resposta.versao_admin },
  }), 200, 'revisão da resposta');
  exigir((await visibilidade()).some(linha => String(linha.id) === String(resposta.id)), 'Resposta revisada ausente na superfície pública.');

  faseAtual = 'retirada administrativa e auditoria';
  const atual = await detalhe();
  await alterar('remover', atual.ocorrencia.versao_admin, { motivo_codigo: 'outro', motivo: 'Retirada da fixture sintética da jornada.' });
  exigir((await visibilidade()).length === 0, 'Resposta permaneceu pública após remoção do relato.');
  const auditoria = ok(await appAdmin(`/api/admin/auditoria?ocorrencia_id=${principal.id}&limite=30`), 200, 'auditoria');
  const acoes = new Set(auditoria.map(evento => evento.acao));
  exigir(['aprovar', 'resolver_denuncia', 'resposta_publicar', 'remover'].every(acao => acoes.has(acao)), 'Evento esperado ausente da auditoria.');
  faseAtual = 'retirada definitiva e revogação do token';
  const excluidas = await excluirFixtures();
  exigir(excluidas === 1, 'Não foi possível comprovar a retirada pelo titular.');
  const visivel = await rest(`v_ocorrencias_publicas?id=eq.${principal.id}&select=id`, { key: keys.publicKey });
  exigir(visivel.length === 0, 'Fixture permaneceu pública após limpeza.');
  const token = await app('/api/acompanhar', { method: 'POST', cookie: false, body: { token: principal.token } });
  exigir(token.response.status === 404, 'Token de acompanhamento ainda funciona após retirada definitiva.');
}

async function limparParticipacaoMvp(fixtures, key) {
  const apagadas = { denuncias: 0, respostas: 0 };
  for (const fixture of fixtures) {
    exigir(excluidas.has(fixture.id), 'Participação só é limpa depois de retirar a fixture.');
    for (const [tabela, marcador, contato] of [
      ['denuncias', denunciaMvp],
      ['respostas', respostaMvp, 'moderacao@example.invalid'],
    ]) {
      const filtro = new URLSearchParams({ ocorrencia_id: `eq.${fixture.id}`, texto: `eq.${marcador}`,
        ...(contato ? { contato: `eq.${contato}` } : {}) });
      const localizar = () => rest(`${tabela}?${filtro}&select=id::text&limit=2`, { key });
      const linhas = await localizar();
      exigir(Array.isArray(linhas) && linhas.length <= 1, 'Identidade da participação sintética inconclusiva.');
      if (!linhas.length) continue;
      exigir(/^[1-9][0-9]*$/.test(linhas[0].id), 'Identificador da participação sintética inválido.');
      filtro.set('id', `eq.${linhas[0].id}`);
      await rest(`${tabela}?${filtro}`, { method: 'DELETE', key });
      exigir((await localizar()).length === 0, 'Participação sintética permanece após a limpeza.');
      apagadas[tabela]++;
    }
  }
  return apagadas;
}

async function consoleMvp(municipio, categoria) {
  const marcador = `[E2E-CONSOLE:${randomUUID()}]`;
  faseAtual = 'cadastros sintéticos do console';
  const destino = await criarOcorrencia(marcador, municipio, categoria);
  const origem = await criarOcorrencia(marcador, municipio, categoria);
  const lerDetalhe = async item => ok(await appAdmin(`/api/admin/ocorrencias/${item.id}`), 200, 'detalhe da fixture');
  const [d1, o1] = await Promise.all([lerDetalhe(destino), lerDetalhe(origem)]);
  faseAtual = 'atomicidade e versão do lote';
  const lote = versoes => appAdmin('/api/admin/ocorrencias/lote', { method: 'POST', body: {
    ids: [destino.id, origem.id], versoes_esperadas: versoes, acao: 'aprovar',
  } });
  const versoes = [d1.ocorrencia.versao_admin, o1.ocorrencia.versao_admin];
  ok(await lote([versoes[0], versoes[1] + 1]), 409, 'lote com versão obsoleta');
  const aposConflito = await Promise.all([lerDetalhe(destino), lerDetalhe(origem)]);
  exigir(aposConflito.every((objeto, i) => objeto.ocorrencia.moderacao === 'pendente'
    && objeto.ocorrencia.versao_admin === versoes[i]), 'Lote obsoleto aplicou moderação parcial.');
  const aprovadas = ok(await lote(versoes), 200, 'aprovação em lote');
  exigir(Array.isArray(aprovadas) && aprovadas.length === 2, 'Lote não confirmou os dois relatos.');

  faseAtual = 'situação, atualização pública e nota interna';
  const caminhoDestino = `/api/admin/ocorrencias/${destino.id}`;
  const detalheDestino = await lerDetalhe(destino);
  const publicar = (subrota, body) => appAdmin(`${caminhoDestino}/${subrota}`, { method: 'POST', body });
  const textoSituacao = `${marcador} Situação sintética em atendimento.`;
  const textoAtualizacao = `${marcador} Atualização sintética pública.`;
  const textoNota = `${marcador} Nota sintética interna.`;
  atualizacoesConsole.push(...[textoSituacao, textoAtualizacao, textoNota].map(texto => ({ id: destino.id, texto })));
  ok(await publicar('situacao', { situacao: 'em_atendimento', texto: textoSituacao, publica: true,
    versao_esperada: detalheDestino.ocorrencia.versao_admin }), 200, 'mudança de situação');
  ok(await publicar('atualizacoes', { tipo: 'providencia', texto: textoAtualizacao, publica: true }), 200, 'atualização pública');
  ok(await publicar('atualizacoes', { tipo: 'nota', texto: textoNota, publica: true }), 200, 'nota interna');
  const linhas = await rest(`v_atualizacoes_publicas?select=texto&ocorrencia_id=eq.${destino.id}`);
  const textosPublicos = new Set(linhas.map(linha => linha.texto));
  exigir(textosPublicos.size === 2 && textosPublicos.has(textoSituacao) && textosPublicos.has(textoAtualizacao)
    && !textosPublicos.has(textoNota), 'Projeção pública misturou visibilidades de atualização.');
  const titular = ok(await app('/api/acompanhar', { method: 'POST', cookie: false, body: { token: destino.token } }), 200, 'acompanhamento da situação');
  exigir(titular.situacao === 'em_atendimento' && titular.atualizacoes.length === 2
    && !titular.atualizacoes.some(atualizacao => atualizacao.texto === textoNota), 'Acompanhamento divergiu da situação ou expôs nota interna.');
  ok(await appAdmin(`${caminhoDestino}/contato`), 200, 'leitura auditada de contato da fixture anônima');

  faseAtual = 'mesclagem de duplicidade';
  const [d2, o2] = await Promise.all([lerDetalhe(destino), lerDetalhe(origem)]);
  ok(await appAdmin(`/api/admin/ocorrencias/${origem.id}/mesclar`, { method: 'POST', body: {
    destino: destino.id, motivo: `${marcador} Mescla de relatos estritamente sintéticos.`,
    versao_esperada: o2.ocorrencia.versao_admin, versao_destino_esperada: d2.ocorrencia.versao_admin,
  } }), 200, 'mescla de duplicidade');
  const [publicoDestino, publicaOrigem] = await Promise.all([destino, origem].map(item => rest(`v_ocorrencias_publicas?select=id&id=eq.${item.id}`)));
  exigir(publicoDestino.length === 1 && publicaOrigem.length === 0, 'Mescla divergiu da projeção pública.');

  faseAtual = 'gestão de equipe com SMTP desativado';
  const convite = ok(await appAdmin('/api/admin/equipe/convidar', { method: 'POST', body: {
    email: `e2e-console-${randomUUID()}@example.invalid`, papel: 'moderador', motivo: `${marcador} Convite fictício.`,
  } }), 200, 'convite sem email');
  membroId = convite.user_id;
  exigir(typeof membroId === 'string' && typeof convite.link_convite === 'string' && convite.convite_enviado !== true,
    'Convite não retornou link manual ou indicou envio de email.');
  ok(await appAdmin(`/api/admin/equipe/${membroId}/papel`, { method: 'POST', body: {
    papel: 'gestor', motivo: `${marcador} Alteração fictícia de papel.`,
  } }), 200, 'alteração de papel');
  const equipe = ok(await appAdmin('/api/admin/equipe'), 200, 'lista da equipe');
  exigir(equipe.some(item => item.user_id === membroId && item.papel === 'gestor' && item.ativo), 'Papel alterado ausente da equipe.');
  ok(await appAdmin(`/api/admin/equipe/${membroId}/desativar`, { method: 'POST', body: {
    motivo: `${marcador} Desativação fictícia.`,
  } }), 200, 'desativação de membro');
  const equipeDepois = ok(await appAdmin('/api/admin/equipe'), 200, 'equipe após desativação');
  exigir(equipeDepois.some(item => item.user_id === membroId && item.ativo === false), 'Desativação não persistiu.');

  faseAtual = 'auditoria das ações do console';
  const [historicoDestino, historicoOrigem, historicoEquipe] = await Promise.all([
    appAdmin(`/api/admin/auditoria?ocorrencia_id=${destino.id}&limite=30`).then(r => ok(r, 200, 'auditoria de destino')),
    appAdmin(`/api/admin/auditoria?ocorrencia_id=${origem.id}&limite=30`).then(r => ok(r, 200, 'auditoria de origem')),
    appAdmin(`/api/admin/auditoria?admin_id=${admin.userId}&limite=30`).then(r => ok(r, 200, 'auditoria de equipe')),
  ]);
  for (const [eventos, esperados] of [
    [historicoDestino, ['aprovar', 'atualizar_situacao', 'adicionar_atualizacao', 'ver_contato']],
    [historicoOrigem, ['aprovar', 'mesclar_duplicata']],
    [historicoEquipe, ['equipe_convidar', 'equipe_papel', 'equipe_desativar']],
  ]) exigir(esperados.every(acao => eventos.some(evento => evento.acao === acao)), 'Auditoria não contém todas as ações esperadas.');
  return { relatos: [destino.id, origem.id], conflito_lote: 409, publicas: textosPublicos.size, nota_publica: false, smtp: 'link manual' };
}

async function conferirResiduosConsole(key) {
  let total = 0;
  for (const { id } of ocorrencias) {
    exigir(excluidas.has(id), 'Não foi possível confirmar a retirada do relato sintético.');
    const [publicos, atualizacoes] = await Promise.all([
      rest(`v_ocorrencias_publicas?select=id&id=eq.${id}`),
      rest(`v_atualizacoes_publicas?select=id&ocorrencia_id=eq.${id}`),
    ]);
    exigir(publicos.length === 0 && atualizacoes.length === 0, 'Relato ou atualização da fixture ainda público.');
    exigir((await app(`/problema/${id}`, { cookie: false })).response.status === 404, 'Detalhe da fixture retirada ainda não retorna 404.');
  }
  for (const { id, texto } of atualizacoesConsole) {
    const filtro = new URLSearchParams({ ocorrencia_id: `eq.${id}`, texto: `eq.${texto}` });
    const linhas = await rest(`atualizacoes?${filtro}&select=id::text&limit=2`, { key });
    exigir(Array.isArray(linhas) && linhas.length <= 1, 'Identidade da atualização sintética inconclusiva.');
    total += linhas.length;
  }
  return total;
}

async function main() {
  let feito = false;
  let isolamentoDb;
  try { process.loadEnvFile(path.join(raiz, '.env.local')); } catch { /* environment may be injected */ }
  const supabase = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '');
  exigir(supabase.protocol === 'https:' && supabase.hostname === `${REF}.supabase.co` && supabase.pathname === '/' && !supabase.search && !supabase.hash,
    'E2E bloqueado: alvo não corresponde ao projeto staging fictício confirmado.');
  const keys = resolveSupabaseKeys(process.env);
  exigir(Boolean(keys.publicKey && keys.secretKey), 'E2E bloqueado: credenciais Supabase necessárias não foram fornecidas no ambiente.');
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
    AMBIENTE_REGISTRO: 'staging_ficticio', MODO_PUBLICACAO: 'moderar_tudo', FOTOS_HABILITADAS: String(somenteFotosMvp), E2E_SUPPRESS_SMTP: 'true',
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

  let fotos;
  let consoleValidado;
  let atualizacoesRetidas;
  try {
    exigir([somenteFotosMvp, somenteModeracaoMvp, somenteConsoleMvp].filter(Boolean).length <= 1, 'Escolha somente um perfil E2E.');
    if (somenteFotosMvp) {
      exigir(!somenteModeracaoMvp, 'Escolha somente um perfil E2E.');
      faseAtual = 'preflight de foto no staging';
      await verificarStagingFotos({ base: supabase.origin, anon: keys.publicKey, service: keys.secretKey });
    }
    faseAtual = 'admin fictício e MFA';
    admin = await criarAdminFicticio({ papel: 'superadmin' });
    faseAtual = 'build de produção';
    await executarBuild(env);
    servidor = iniciarApp(port, env);
    await esperarApp(servidor, baseApp);
    if (somenteFotosMvp) {
      faseAtual = 'ciclo de fotos';
      fotos = await executarCicloFotos({ base: supabase.origin, anon: keys.publicKey, service: keys.secretKey,
        app: baseApp, adminToken: admin.accessToken, hmac, basic: accessBasic });
      feito = true;
      return;
    }
    await autenticarMfa();

    faseAtual = 'referências públicas de teste';
    const municipios = await rest('municipios?select=id,slug&order=id.asc&limit=1', { key: keys.publicKey });
    const categorias = await rest('categorias?select=id,slug&order=id.asc&limit=1', { key: keys.publicKey });
    exigir(municipios?.[0]?.slug && categorias?.[0]?.slug, 'Staging sem município/categoria pública para fixture.');
    const municipio = municipios[0]; const categoria = categorias[0];

    if (somenteConsoleMvp) {
      consoleValidado = await consoleMvp(municipio, categoria);
      feito = true;
      return;
    }
    faseAtual = 'registro fictício';
    const principal = await criarOcorrencia('[E2E-SEC]', municipio, categoria);
    if (somenteModeracaoMvp) {
      await moderacaoMvp(principal, keys);
      feito = true;
      return;
    }
    faseAtual = 'RLS direto no banco';
    isolamentoDb = verificarIsolamentoDireto(principal.id, admin.userId);
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
    const destino = await criarOcorrencia('[E2E-SEC-DUPLICATA-DESTINO]', municipio, categoria);
    const duplicata = await criarOcorrencia('[E2E-SEC-DUPLICATA-ORIGEM]', municipio, categoria);
    await moderar(destino.id, 'aprovar'); await moderar(duplicata.id, 'aprovar');
    ok(await appAdmin(`/api/admin/ocorrencias/${duplicata.id}/mesclar`, { method: 'POST', body: { destino: destino.id, motivo: 'Duplicidade criada pelo teste fictício E2E.' } }), 200, 'mesclagem de duplicidade');
    const fontePublica = await rest(`v_ocorrencias_publicas?select=id&id=eq.${duplicata.id}`, { key: keys.publicKey });
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

    faseAtual = 'gate de fotos fechado';
    const afeta = await app('/api/afeta', { method: 'POST', cookie: false, body: {} });
    exigir(afeta.response.status === 503, 'ADR-0004 exige endpoint de confirmação desligado.');
    exigir(env.FOTOS_HABILITADAS === 'false', 'Perfil textual de segurança não pode habilitar fotos.');

    faseAtual = 'indicadores e supressão';
    const dados = ok(await app('/api/dados?formato=json', { cookie: false }), 200, 'indicadores públicos');
    exigir(Array.isArray(dados?.dados), 'Exportação JSON não retornou linhas.');
    exigir(dados.dados.every((row) => row.total >= 5
      && (row.com_resposta_oficial === 0 || row.com_resposta_oficial >= 5)
      && (row.total - row.com_resposta_oficial === 0 || row.total - row.com_resposta_oficial >= 5)
      && (row.resolvidas_documentadas === 0 || row.resolvidas_documentadas >= 5)
      && (row.total - row.resolvidas_documentadas === 0 || row.total - row.resolvidas_documentadas >= 5)), 'Exportação contém célula/subcontagem abaixo do limiar k=5.');
    const cellView = await rest('v_dados_painel?select=id,municipio_slug,total,com_resposta_oficial,resolvidas_documentadas&limit=5000', { key: keys.publicKey });
    exigir(Array.isArray(cellView) && cellView.length === dados.dados.length && cellView.every((row) => row.total >= 5), 'View do banco não aplicou supressão antes da exportação.');
    const globals = await rest('v_indicadores_gerais?select=total_ocorrencias,municipios_com_registros,com_resposta_oficial,resolvidas_documentadas&limit=1', { key: keys.publicKey });
    const cohortTotals = await rest('v_indicadores_municipio_categoria?select=total&limit=5000', { key: keys.publicKey });
    const monthlyTotals = await rest('v_indicadores_mensal?select=total&limit=5000', { key: keys.publicKey });
    const statusTotals = await rest('v_indicadores_situacao?select=total&limit=5000', { key: keys.publicKey });
    const sum = (rows, key = 'total') => rows.reduce((total, row) => total + row[key], 0);
    const indicatorsMatch = Array.isArray(globals) && globals.length === 1
      && globals[0].total_ocorrencias === sum(cellView)
      && globals[0].municipios_com_registros === new Set(cellView.map((row) => row.municipio_slug)).size
      && globals[0].com_resposta_oficial === sum(cellView, 'com_resposta_oficial')
      && globals[0].resolvidas_documentadas === sum(cellView, 'resolvidas_documentadas')
      && sum(cohortTotals) === sum(cellView) && sum(monthlyTotals) === sum(cellView) && sum(statusTotals) === sum(cellView);
    exigir(indicatorsMatch, 'Totais globais/coortes permitem recuperar contagens suprimidas.');

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
    if (somenteConsoleMvp) {
      if (excluidas !== ocorrencias.length) falhas.push('Limpeza incompleta das fixtures do console.');
      try {
        atualizacoesRetidas = await conferirResiduosConsole(keys.secretKey);
        if (feito && atualizacoesRetidas !== 3) falhas.push('Retenção das três atualizações de histórico não comprovada.');
      } catch { falhas.push('Visibilidade e retenção das atualizações sintéticas não comprovadas.'); }
    }
    if (somenteModeracaoMvp) {
      try { limpezaParticipacao = await limparParticipacaoMvp(ocorrencias, keys.secretKey); }
      catch { falhas.push('Limpeza das participações sintéticas não comprovada.'); }
    }
    try { await limparMembroConvidado(); } catch { falhas.push('Limpeza de convite fictício não comprovada.'); }
    if (admin) try {
      limpezaAdmin = await admin.cleanup();
      if (limpezaAdmin?.equipe_removida !== true || limpezaAdmin?.conta_auth !== 'removida') falhas.push('Limpeza do administrador fictício não comprovada.');
    } catch { falhas.push('Limpeza do administrador fictício não comprovada.'); }
    await removerProcesso(servidor);
    agenteApp.destroy();
    if (falhas.length) {
      console.error(JSON.stringify({ e2e: 'pendente', falhas, diagnosticos: eventosOperacionais, limpeza_admin: limpezaAdmin, relatos_excluidos: excluidas, relatos_criados: ocorrencias.length, residuo_esperado: 'linhas anonimizadas e eventos em historico_moderacao permanecem por auditoria somente-inserção' }));
      process.exitCode = 1;
    } else if (feito && somenteFotosMvp) console.log(JSON.stringify({ e2e: 'aprovado', perfil: 'fotos-mvp', fotos, limpeza_admin: limpezaAdmin }));
    else if (feito && somenteConsoleMvp) console.log(JSON.stringify({ e2e: 'aprovado', perfil: 'console-mvp', console: consoleValidado, exclusoes_confirmadas: excluidas, atualizacoes_append_only: atualizacoesRetidas, limpeza_admin: limpezaAdmin }));
    else if (feito && somenteModeracaoMvp) console.log(JSON.stringify({ e2e: 'aprovado', perfil: 'moderacao-mvp', registros_ficticios: ocorrencias.length, exclusoes_confirmadas: excluidas, fase_final: faseAtual, limpeza_admin: limpezaAdmin, limpeza_participacao: limpezaParticipacao, auditoria: 'aprovar, resolver_denuncia, resposta_publicar, remover; histórico preservado' }));
    else if (feito) console.log(JSON.stringify({ e2e: 'aprovado', registros_ficticios: ocorrencias.length, exclusoes_confirmadas: excluidas, rls_direto: isolamentoDb, smtp: 'convite gerado sem chamada de envio', fotos: 'desligadas; ciclo jurídico omitido', supressao: 'k=5 e diferença global verificada', limpeza_admin: limpezaAdmin, auditoria: 'resíduo somente-inserção preservado' }));
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ e2e: 'pendente', falhas: [error instanceof Error ? error.message : 'E2E não concluído.'], relatos_excluidos: 0, relatos_criados: ocorrencias.length, residuo_esperado: 'linhas anonimizadas e eventos em historico_moderacao permanecem por auditoria somente-inserção' }));
  process.exitCode = 1;
});
