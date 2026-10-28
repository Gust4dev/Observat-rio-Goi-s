// Teste de contrato + sonda negativa contra o Supabase de staging, usando SÓ a chave pública (anon).
//   npm run contrato:staging
// Lê NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY de .env.local. Node puro, sem dependências.
// Sai com código 1 em qualquer falha.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
try {
  process.loadEnvFile(path.join(raiz, '.env.local'));
} catch {
  console.error('Sem .env.local: preencha NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY (veja .env.example).');
  process.exit(2);
}

const URL_BASE = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/+$/, '');
const CHAVE = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
if (!URL_BASE || !CHAVE) {
  console.error('NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY ausentes em .env.local');
  process.exit(2);
}
// Trava: este script só fala com o staging conhecido.
const REF_STAGING = 'hvekgzxuciyewtybwads';
if (!URL_BASE.includes(REF_STAGING) && process.env.CONTRATO_ALVO !== new URL(URL_BASE).hostname.split('.')[0]) {
  console.error(`URL não é o staging (${REF_STAGING}). Para outro alvo, defina CONTRATO_ALVO=<ref> conscientemente.`);
  process.exit(2);
}

const permitidas = JSON.parse(readFileSync(path.join(raiz, 'db', 'colunas-publicas.json'), 'utf8'));
const cabecalhos = { apikey: CHAVE, Authorization: `Bearer ${CHAVE}`, Accept: 'application/json' };
const falhas = [];
const ok = (m) => console.log('ok   ', m);
const falha = (m) => { falhas.push(m); console.error('FALHA', m); };

async function chamar(caminho, init = {}) {
  const r = await fetch(`${URL_BASE}/rest/v1/${caminho}`, {
    ...init,
    headers: { ...cabecalhos, ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(15000),
  });
  const texto = await r.text();
  let corpo; try { corpo = JSON.parse(texto); } catch { corpo = texto; }
  return { status: r.status, corpo };
}

// ---- 1) contrato: views públicas devolvem só colunas listadas
// select=* é PROPOSITAL aqui (é o teste que detecta coluna nova); o site nunca usa *.
for (const [view, cols] of Object.entries(permitidas)) {
  const { status, corpo } = await chamar(`${view}?select=*&limit=1`);
  if (status !== 200 || !Array.isArray(corpo)) { falha(`${view}: esperado 200 com array, veio ${status}`); continue; }
  if (corpo.length === 0) { ok(`${view}: 200, vazia (nada a comparar; rode o seed para checar colunas)`); continue; }
  const extras = Object.keys(corpo[0]).filter((k) => !cols.includes(k));
  const faltam = cols.filter((k) => !(k in corpo[0]));
  if (extras.length) falha(`${view}: colunas fora da lista: ${extras.join(', ')}`);
  else if (faltam.length) falha(`${view}: colunas da lista ausentes: ${faltam.join(', ')}`);
  else ok(`${view}: ${Object.keys(corpo[0]).length} colunas, todas permitidas`);
}

// Empty views still have a schema: these probes must reject the old quarantine path.
{
  const esperado = await chamar('v_imagens_publicas?select=id,ocorrencia_id,ordem,descricao_publica&limit=0');
  if (esperado.status !== 200 || !Array.isArray(esperado.corpo)) falha('v_imagens_publicas: contrato M4 ausente (descricao_publica)');
  else ok('v_imagens_publicas: colunas M4 consultáveis mesmo vazia');
  const privado = await chamar('v_imagens_publicas?select=caminho_storage&limit=0');
  if (privado.status !== 400 || !['42703', 'PGRST204'].includes(privado.corpo?.code)) falha('v_imagens_publicas: não comprovou remoção de caminho_storage');
  else ok('v_imagens_publicas: caminho_storage inexistente');
}

// ---- 2) sonda negativa: tabelas e funções internas NÃO podem responder 2xx para a chave pública
const negadas = [200, 201, 204, 206];
for (const t of ['ocorrencias', 'contatos_privados', 'tokens_gestao', 'historico_moderacao', 'confirmacoes',
                 'denuncias', 'administradores', 'imagens', 'atualizacoes', 'respostas', 'v_fila_moderacao']) {
  const { status } = await chamar(`${t}?select=*&limit=1`);
  if (negadas.includes(status)) falha(`tabela ${t} respondeu ${status} para a chave pública`);
  else ok(`tabela ${t}: negada (${status})`);
}
const ZERO = '00000000-0000-0000-0000-000000000000';
for (const [fn, corpo] of [
  ['admin_ver_contato', { p_ocorrencia_id: ZERO }],
  ['admin_moderar_ocorrencia', {}],
  ['registrar_ocorrencia', {}],
  ['acompanhar_por_token', { p_token_hash: `\\x${'00'.repeat(32)}` }],
  ['solicitar_exclusao_por_token', { p_token_hash: `\\x${'00'.repeat(32)}`, p_apagar_conteudo: true }],
  ['triagem_sinais', { p_titulo: 'Contrato sintético', p_descricao: 'Texto fictício para sonda sem escrita de relato.', p_origem_hash: null }],
]) {
  const r = await chamar(`rpc/${fn}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
  if (negadas.includes(r.status)) falha(`rpc ${fn} respondeu ${r.status} para a chave pública`);
  else if (['acompanhar_por_token', 'solicitar_exclusao_por_token', 'triagem_sinais'].includes(fn) &&
           !['42501', 'PGRST202'].includes(r.corpo?.code)) falha(`rpc ${fn}: erro não comprova negação de EXECUTE (${r.status})`);
  else ok(`rpc ${fn}: negada (${r.status})`);
}

// ---- 3) escrita direta em view/tabela pública também deve falhar
{
  const r = await chamar('municipios', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: 'x' }) });
  if (negadas.includes(r.status)) falha(`INSERT em municipios respondeu ${r.status}`);
  else ok(`INSERT em municipios: negado (${r.status})`);
}

// ---- 4) superfície HTTP do app, opcional: configurar URL e acesso do staging só no ambiente do comando.
// Não envia relato nem segredo real. Ex.: CONTRATO_APP_URL=http://localhost:3000.
const APP = process.env.CONTRATO_APP_URL?.replace(/\/+$/, '');
if (APP) {
  const origem = new URL(APP).origin;
  const usuario = process.env.ACESSO_STAGING_USUARIO;
  const senha = process.env.ACESSO_STAGING_SENHA;
  const acesso = usuario && senha ? { Authorization: `Basic ${Buffer.from(`${usuario}:${senha}`).toString('base64')}` } : {};
  for (const api of ['registrar', 'acompanhar', 'excluir']) {
    const url = `${APP}/api/${api}`;
    const metodo = await fetch(url, { headers: acesso, signal: AbortSignal.timeout(15000) });
    if (metodo.status !== 405) falha(`/api/${api}: GET deve responder 405, veio ${metodo.status}`);
    else ok(`/api/${api}: GET negado (405)`);

    const resposta = await fetch(url, {
      method: 'POST', headers: { ...acesso, Origin: `${origem}.invalid`, 'Content-Type': 'application/json' },
      body: '{}', signal: AbortSignal.timeout(15000),
    });
    const corpo = await resposta.json().catch(() => null);
    if (![403, 503].includes(resposta.status) || !corpo?.erro?.codigo || !corpo?.erro?.mensagem) {
      falha(`/api/${api}: origem inválida não recebeu erro genérico fechado (${resposta.status})`);
    } else if (!resposta.headers.get('cache-control')?.includes('no-store')) {
      falha(`/api/${api}: resposta privada sem no-store`);
    } else ok(`/api/${api}: origem inválida fechada (${resposta.status}), genérica e no-store`);
  }
} else {
  console.log('PENDENTE superfície HTTP do app: defina CONTRATO_APP_URL e credenciais de acesso no ambiente do comando.');
}

if (falhas.length) {
  console.error(`\n${falhas.length} falha(s)`);
  process.exit(1);
}
console.log('\nCONTRATO OK');
