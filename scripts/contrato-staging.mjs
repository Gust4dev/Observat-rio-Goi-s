// Contrato de leitura das views públicas no staging conhecido. Nunca envia linhas ou mutações.
// npm run contrato:staging — usa o ambiente do processo ou .env.local, sem dependências.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { resolveSupabaseKeys, supabaseApiHeaders } from '../src/lib/supabase-keys.mjs';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
try { process.loadEnvFile(path.join(raiz, '.env.local')); }
catch (erro) {
  if (erro.code !== 'ENOENT') {
    console.error('FALHA: não foi possível carregar o ambiente.');
    process.exit(2);
  }
}

const ORIGEM_STAGING = 'https://hvekgzxuciyewtybwads.supabase.co';
let base;
try { base = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''); } catch { /* falha fechada abaixo */ }
const { publicKey: chave } = resolveSupabaseKeys(process.env);
if (!base || base.origin !== ORIGEM_STAGING || base.pathname !== '/' ||
    base.username || base.password || base.search || base.hash || !chave) {
  console.error('FALHA: configure a URL HTTPS exata do staging conhecido e a chave pública.');
  process.exit(2);
}

// Uma configuração local equivocada não deve enviar uma credencial privilegiada.
let publica = chave.startsWith('sb_publishable_');
if (!publica) {
  try {
    const partes = chave.split('.');
    publica = partes.length === 3 && JSON.parse(Buffer.from(partes[1], 'base64url')).role === 'anon';
  } catch { /* formato desconhecido: falhar fechado */ }
}
if (!publica) {
  console.error('FALHA: a credencial não é uma chave pública reconhecida.');
  process.exit(2);
}

const permitidas = JSON.parse(readFileSync(path.join(raiz, 'db', 'colunas-publicas.json'), 'utf8'));
const headers = { ...supabaseApiHeaders(chave), Accept: 'application/json' };
let falhas = 0;
let inconclusivas = 0;
const ok = (mensagem) => console.log(`ok ${mensagem}`);
const falha = (mensagem) => { falhas++; console.error(`FALHA ${mensagem}`); };
const inconclusivo = (mensagem) => { inconclusivas++; console.error(`INCONCLUSIVO ${mensagem}`); };
const objeto = (valor) => valor !== null && typeof valor === 'object' && !Array.isArray(valor);

async function ler(caminho, accept = 'application/json') {
  try {
    const resposta = await fetch(new URL(caminho, base), {
      method: 'GET', headers: { ...headers, Accept: accept }, redirect: 'error',
      signal: AbortSignal.timeout(15000),
    });
    return { status: resposta.status, corpo: await resposta.json().catch(() => null) };
  } catch {
    // Não imprimir erros brutos: podem conter URL, cabeçalhos ou dados da resposta.
    return { status: 0, corpo: null };
  }
}

// Apenas referências locais são resolvidas. O documento nunca define um novo alvo de rede.
function resolver(schema, documento, vistos = new Set()) {
  if (!objeto(schema)) return null;
  if (!Object.hasOwn(schema, '$ref')) return schema;
  const ref = schema.$ref;
  if (typeof ref !== 'string' || !/^#\/(definitions|components\/schemas)\//.test(ref) || vistos.has(ref)) return null;
  vistos.add(ref);
  const partes = ref.slice(2).split('/').map((parte) => parte.replace(/~1/g, '/').replace(/~0/g, '~'));
  let atual = documento;
  for (const parte of partes) {
    if (!objeto(atual) || !Object.hasOwn(atual, parte)) return null;
    atual = atual[parte];
  }
  return resolver(atual, documento, vistos);
}

function colunasDoGet(documento, view) {
  if (!objeto(documento) || !objeto(documento.paths)) return null;
  const resposta = documento.paths[`/${view}`]?.get?.responses?.['200'];
  const schema = resolver(resposta?.schema ?? resposta?.content?.['application/json']?.schema, documento);
  if (schema?.type !== 'array') return null;
  const linha = resolver(schema.items, documento);
  if (!objeto(linha?.properties) || !Object.keys(linha.properties).length ||
      !Object.values(linha.properties).every(objeto)) return null;
  return Object.keys(linha.properties);
}

console.log('Contrato GET-only: staging validado; nenhuma linha será solicitada.');
const esquema = await ler('/rest/v1/', 'application/openapi+json');
for (const [view, esperadas] of Object.entries(permitidas)) {
  const observadas = esquema.status === 200 ? colunasDoGet(esquema.corpo, view) : null;
  if (!observadas) inconclusivo(`${view}: metadados GET completos indisponíveis; allowlist não comprovada`);
  else {
    const extras = observadas.filter((coluna) => !esperadas.includes(coluna));
    const ausentes = esperadas.filter((coluna) => !observadas.includes(coluna));
    if (extras.length || ausentes.length) falha(`${view}: allowlist divergente (${extras.length} extra(s), ${ausentes.length} ausente(s))`);
    else ok(`${view}: ${esperadas.length} colunas conferidas nos metadados GET`);
  }
  const consulta = await ler(`/rest/v1/${view}?select=${esperadas.join(',')}&limit=0`);
  if (consulta.status !== 200 || !Array.isArray(consulta.corpo) || consulta.corpo.length !== 0) {
    falha(`${view}: consulta GET sem linhas não comprovada`);
  } else ok(`${view}: consulta GET sem linhas permitida`);
}

const m4 = await ler('/rest/v1/v_imagens_publicas?select=id,ocorrencia_id,ordem,descricao_publica&limit=0');
if (m4.status !== 200 || !Array.isArray(m4.corpo) || m4.corpo.length !== 0) falha('v_imagens_publicas: colunas M4 sem linhas não comprovadas');
else ok('v_imagens_publicas: colunas M4 consultáveis sem linhas');
const privado = await ler('/rest/v1/v_imagens_publicas?select=caminho_storage&limit=0');
if (privado.status !== 400 || !['42703', 'PGRST204'].includes(privado.corpo?.code)) falha('v_imagens_publicas: ausência de caminho_storage não comprovada');
else ok('v_imagens_publicas: caminho_storage inexistente');

console.log(`Resultado: ${falhas} falha(s), ${inconclusivas} verificação(ões) inconclusiva(s).`);
if (!falhas && inconclusivas && esquema.status !== 200) {
  console.log('CONTRATO PÚBLICO PARCIAL: colunas esperadas consultáveis e contrato M4 conferidos por GET sem linhas; colunas extras não foram verificadas.');
} else if (falhas || inconclusivas) {
  console.error('CONTRATO REPROVADO OU INCOMPLETO.');
  process.exitCode = 1;
} else console.log('CONTRATO OK: colunas destas views e contrato M4 conferidos por GET sem linhas.');
