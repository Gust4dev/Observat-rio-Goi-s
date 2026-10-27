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

// ---- 2) sonda negativa: tabelas e funções internas NÃO podem responder 2xx para a chave pública
const negadas = [200, 201, 204, 206];
for (const t of ['ocorrencias', 'contatos_privados', 'tokens_gestao', 'historico_moderacao', 'confirmacoes',
                 'denuncias', 'administradores', 'imagens', 'atualizacoes', 'respostas', 'v_fila_moderacao']) {
  const { status, corpo } = await chamar(`${t}?select=*&limit=1`);
  if (negadas.includes(status)) falha(`tabela ${t} respondeu ${status} para a chave pública: ${JSON.stringify(corpo).slice(0, 80)}`);
  else ok(`tabela ${t}: negada (${status})`);
}
const ZERO = '00000000-0000-0000-0000-000000000000';
for (const [fn, corpo] of [
  ['admin_ver_contato', { p_ocorrencia_id: ZERO }],
  ['admin_moderar_ocorrencia', {}],
  ['registrar_ocorrencia', {}],
  ['acompanhar_por_token', {}],
]) {
  const r = await chamar(`rpc/${fn}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
  if (negadas.includes(r.status)) falha(`rpc ${fn} respondeu ${r.status} para a chave pública`);
  else ok(`rpc ${fn}: negada (${r.status})`);
}

// ---- 3) escrita direta em view/tabela pública também deve falhar
{
  const r = await chamar('municipios', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: 'x' }) });
  if (negadas.includes(r.status)) falha(`INSERT em municipios respondeu ${r.status}`);
  else ok(`INSERT em municipios: negado (${r.status})`);
}

if (falhas.length) {
  console.error(`\n${falhas.length} falha(s)`);
  process.exit(1);
}
console.log('\nCONTRATO OK');
