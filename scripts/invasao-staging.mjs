// Sonda sem escrita, Node puro. GETs e sondas RPC com corpo vazio, sem argumentos.
// Nunca envia INSERT/PATCH/PUT/DELETE, cadastro Auth ou uma assinatura RPC válida.
// Uso: node scripts/invasao-staging.mjs (env do processo ou .env.local).
// OpenAPI é evidência de privilégios; não substitui testes transacionais de escrita no banco.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveSupabaseKeys, supabaseApiHeaders } from '../src/lib/supabase-keys.mjs';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
try { process.loadEnvFile(path.join(raiz, '.env.local')); }
catch (erro) {
  if (erro.code !== 'ENOENT') {
    console.error('FALHA: não foi possível carregar o ambiente.');
    process.exit(2);
  }
}
const REF_STAGING = 'hvekgzxuciyewtybwads';
let base;
try { base = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''); } catch { /* validado abaixo */ }
const { publicKey: chave } = resolveSupabaseKeys(process.env);
if (!base || base.origin !== `https://${REF_STAGING}.supabase.co` || base.pathname !== '/' ||
    base.username || base.password || base.search || base.hash || !chave) {
  console.error('FALHA: configure a URL exata do staging conhecido e a chave pública anon.');
  process.exit(2);
}
// Recusa service_role e chaves secretas antes de qualquer tráfego.
let chavePublica = chave.startsWith('sb_publishable_');
if (!chavePublica) {
  try {
    const partes = chave.split('.');
    chavePublica = partes.length === 3 && JSON.parse(Buffer.from(partes[1], 'base64url')).role === 'anon';
  } catch { /* segredo/formato desconhecido: falhar fechado */ }
}
if (!chavePublica) {
  console.error('FALHA: a credencial não é uma chave pública anon reconhecida.');
  process.exit(2);
}

let falhas = 0;
let inconclusivas = 0;
const inconclusivo = (descricao) => {
  inconclusivas++;
  console.log(`INCONCLUSIVO ${descricao}`);
};
const verificar = (condicao, descricao) => {
  console.log(`${condicao ? 'ok' : 'FALHA'} ${descricao}`);
  if (!condicao) falhas++;
};
const headers = { ...supabaseApiHeaders(chave), Accept: 'application/json' };
async function ler(caminho, extras = {}, rpcSemArgumentos = false) {
  try {
    const resposta = await fetch(new URL(caminho, base), {
      method: rpcSemArgumentos ? 'POST' : 'GET',
      ...(rpcSemArgumentos ? { body: '{}' } : {}),
      headers: { ...headers, ...extras }, redirect: 'error',
      signal: AbortSignal.timeout(15000),
    });
    const corpo = await resposta.json().catch(() => null);
    return { status: resposta.status, corpo };
  } catch {
    // Nunca imprimir erros brutos: podem conter URL ou credencial.
    return { status: 0, corpo: null };
  }
}
const negado = (r) => ([401, 403].includes(r.status) && r.corpo?.code === '42501') ||
  (r.status === 404 && r.corpo?.code === 'PGRST205');

console.log('Sonda de segurança sem escrita: alvo staging validado.');
const esquema = await ler('/rest/v1/', { Accept: 'application/openapi+json' });
const paths = esquema.corpo?.paths;
const openapiValido = esquema.status === 200 && paths && typeof paths === 'object' &&
  paths['/v_ocorrencias_publicas']?.get && paths['/municipios']?.get;
if (openapiValido) verificar(true, 'OpenAPI acessível e coerente com o contrato público');
else inconclusivo('OpenAPI indisponível: privilégios de escrita não comprovados por leitura.');

const tabelas = ['ocorrencias', 'contatos_privados', 'tokens_gestao', 'historico_moderacao',
  'confirmacoes', 'denuncias', 'administradores', 'imagens', 'atualizacoes', 'respostas',
  'v_fila_moderacao'];
for (const tabela of tabelas) {
  const resposta = await ler(`/rest/v1/${tabela}?select=*&limit=0`);
  verificar(negado(resposta), `tabela sensível ${tabela}: acesso negado comprovado`);
}

// Todas as funções abaixo exigem argumentos nas migrações versionadas do projeto.
// {} não resolve uma assinatura válida: PostgREST rejeita antes da execução.
// PGRST202 prova somente assinatura não resolvida; não prova revogação de EXECUTE.
const funcoes = ['registrar_ocorrencia', 'acompanhar_por_token', 'solicitar_exclusao_por_token',
  'registrar_denuncia', 'registrar_confirmacao', 'consumir_limite', 'triagem_sinais',
  'registrar_imagem', 'registrar_resposta', 'consultar_slot_imagem', 'admin_moderar_ocorrencia',
  'admin_atualizar_situacao', 'admin_adicionar_atualizacao', 'admin_moderar_imagem',
  'admin_ver_contato', 'admin_resolver_denuncia', 'admin_revisar_resposta',
  'admin_preparar_imagem', 'admin_abandonar_imagem'];
for (const fn of funcoes) {
  const resposta = await ler(`/rest/v1/rpc/${fn}`, { 'Content-Type': 'application/json' }, true);
  verificar(([401, 403].includes(resposta.status) && resposta.corpo?.code === '42501') ||
    (resposta.status === 404 && resposta.corpo?.code === 'PGRST202'),
    `RPC ${fn}: sonda sem argumentos rejeitada (${resposta.status}, ${['42501', 'PGRST202'].includes(resposta.corpo?.code) ? resposta.corpo.code : 'erro não comprovado'})`);
  if (openapiValido) verificar(!Object.hasOwn(paths, `/rpc/${fn}`), `RPC ${fn}: não exposta no OpenAPI público`);
}
const interno = await ler('/rest/v1/limites_taxa?select=*&limit=0', { 'Accept-Profile': 'interno' });
verificar(interno.status === 406 && interno.corpo?.code === 'PGRST106',
  'schema de funções internas não exposto');

const views = ['v_ocorrencias_publicas', 'v_imagens_publicas', 'v_atualizacoes_publicas',
  'v_respostas_publicas', 'v_indicadores_gerais', 'v_indicadores_municipio_categoria',
  'v_indicadores_mensal', 'v_indicadores_situacao', 'v_dados_painel'];
for (const view of [...views, 'municipios', 'categorias']) {
  const resposta = await ler(`/rest/v1/${view}?select=*&limit=0`);
  verificar(resposta.status === 200 && Array.isArray(resposta.corpo) && resposta.corpo.length === 0,
    `superfície pública ${view}: consulta sem linhas permitida`);
  const metodos = paths?.[`/${view}`];
  if (!openapiValido) continue;
  verificar(Boolean(metodos?.get) &&
    !['post', 'patch', 'put', 'delete'].some((m) => Object.hasOwn(metodos, m)),
    `escrita ${view}: ausência de privilégios de mutação no OpenAPI (sem tentativa de escrita)`);
}

const auth = await ler('/auth/v1/settings');
verificar(auth.status === 200 && auth.corpo?.disable_signup === true,
  'Auth: cadastro público desativado nas configurações (sem tentar cadastro)');

// IDs públicos são mantidos apenas em memória, nunca registrados.
const publicos = await ler('/rest/v1/v_ocorrencias_publicas?select=id&limit=1');
const id = publicos.corpo?.[0]?.id;
verificar(publicos.status === 200 && Array.isArray(publicos.corpo), 'consulta mínima de IDs públicos');
if (typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id)) {
  for (const [tabela, coluna] of [['ocorrencias', 'id'], ['contatos_privados', 'ocorrencia_id'],
    ['tokens_gestao', 'ocorrencia_id'], ['imagens', 'ocorrencia_id']]) {
    const resposta = await ler(`/rest/v1/${tabela}?select=*&${coluna}=eq.${encodeURIComponent(id)}&limit=0`);
    verificar(negado(resposta), `enumeração ${tabela} por ID público: acesso negado`);
  }
} else {
  verificar(false, 'enumeração por ID público inconclusiva: requer ao menos uma ocorrência pública');
}

// O bucket deve permanecer invisível ao anon. Não listar objetos, criar URLs assinadas ou baixar arquivos.
const bucket = await ler('/storage/v1/bucket/imagens-quarentena');
const bucketNegado = [400, 401, 403, 404].includes(bucket.status) &&
  ['400', '401', '403', '404'].includes(String(bucket.corpo?.statusCode)) &&
  /not found|unauthorized|permission|row.level|not allowed/i.test(String(bucket.corpo?.message ?? ''));
verificar(bucketNegado, 'Storage privado: metadados do bucket inacessíveis ao anon');
// Caminho sintético inexistente: verifica somente a barreira do bucket público.
// Objeto ausente isoladamente não comprova privacidade: exigir erro explícito de bucket/permissão.
const objeto = await ler('/storage/v1/object/public/imagens-quarentena/__sonda_somente_leitura__');
verificar([400, 401, 403, 404].includes(objeto.status) &&
  /bucket not found|unauthorized|permission|not allowed/i.test(String(objeto.corpo?.message ?? '')),
  'Storage privado: rota pública não disponibiliza o bucket');

console.log(`Resultado: ${falhas} falha(s), ${inconclusivas} verificação(ões) inconclusiva(s).`);
console.log(falhas || inconclusivas ? 'SONDA REPROVADA OU INCOMPLETA.' : 'SONDA OK (sem escrita).');
process.exitCode = falhas || inconclusivas ? 1 : 0;
