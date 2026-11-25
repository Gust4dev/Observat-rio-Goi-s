import { createHash, randomBytes, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { setTimeout as esperar } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { criarAdminFicticio, codigoTotp } from "./lib/admin-ficticio.mjs";
import { resolveSupabaseKeys, supabaseApiHeaders } from "../src/lib/supabase-keys.mjs";
import { resumir } from "./load-mvp.mjs";
import { createInterface } from "node:readline";

const ref = "hvekgzxuciyewtybwads";
const staging = `https://${ref}.supabase.co`;
const cli = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));
const instrumentar = new URL("./lib/load-staging-timing.mjs", import.meta.url).href;
const amostras = new Map();
let maiorAfetaServidor = null;
const fixtures = [];
const admins = [];
const marcador = `[CARGA-STAGING:${randomUUID()}]`;
const tokenTeste = "XXXX.DUMMY.TOKEN.XXXX";
const publico = ["/", "/problemas", "/municipios", "/municipios/goiania", "/dados", "/api/dados?municipio=goiania&categoria=infraestrutura"];
const leiturasPublicas = new Set([...publico, "detalhe_publico_fixture"]);
const participacao = ["afeta", "denunciar", "resposta", "detalhe", "leitura"];
const denunciaTexto = `${marcador} Sinalização sintética sem dados pessoais.`;
const respostaTexto = `${marcador} Resposta inteiramente sintética, destinada à revisão no staging.`;
const respostaContato = "carga-staging@example.invalid";
const uuid = /^[0-9a-f-]{36}$/i;
let servidor, origem, basic, chaves;
let fase = "configuração";
let parar = false;
process.on("SIGINT", () => { parar = true; });
process.on("SIGTERM", () => { parar = true; });

function exigir(condicao, mensagem) {
  if (!condicao) throw new Error(mensagem);
}
function quantil(tag, ms, classe) {
  if (!amostras.has(tag)) amostras.set(tag, []);
  amostras.get(tag).push({ ms, classe });
}
async function porta() {
  const socket = createServer();
  await new Promise((resolve, reject) => socket.once("error", reject).listen(0, "127.0.0.1", resolve));
  const { port } = socket.address();
  await new Promise((resolve, reject) => socket.close(error => error ? reject(error) : resolve()));
  return port;
}
function executar(args, env, telemetria = false) {
  const child = spawn(process.execPath, [...(telemetria ? ["--import", instrumentar] : []), cli, ...args], {
    env, stdio: telemetria ? ["ignore", "pipe", "ignore"] : "ignore", windowsHide: true,
  });
  if (telemetria) createInterface({ input: child.stdout }).on("line", linha => {
    if (!linha.startsWith("CARGA_BACKEND ")) return;
    const [rota, etapa, ms, status, duracoes] = JSON.parse(linha.slice("CARGA_BACKEND ".length));
    if (etapa === "decomposicao") {
      if (status === 202 && (!maiorAfetaServidor || ms > maiorAfetaServidor.total_ms)) {
        maiorAfetaServidor = { total_ms: Math.round(ms), etapas_ms: duracoes };
      }
      return;
    }
    const internoAfeta = rota === "afeta" && ["servidor", "residual"].includes(etapa);
    quantil(`backend:${rota}:${etapa}`, ms, status === (internoAfeta ? 202 : 200) ? "ok" : `http_${status}`);
  });
  return child;
}
async function terminou(child) {
  return new Promise((resolve, reject) => child.once("error", reject).once("exit", resolve));
}
async function app(caminho, { corpo, sessao, esperado = 200, medir, validar } = {}) {
  const inicio = performance.now();
  const gravar = corpo !== undefined;
  try {
    const resposta = await fetch(origem + caminho, {
      method: gravar ? "POST" : "GET", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(12_000),
      headers: {
        Origin: origem, Authorization: basic,
        ...(gravar && { "Content-Type": "application/json" }),
        ...(sessao && { Cookie: [...sessao].map(([nome, valor]) => `${nome}=${valor}`).join("; "), "X-Observatorio-CSRF": "1" }),
      },
      ...(gravar && { body: JSON.stringify(corpo) }),
    });
    if (sessao) for (const cookie of resposta.headers.getSetCookie()) {
      const par = cookie.split(";", 1)[0];
      const corte = par.indexOf("=");
      if (corte > 0) sessao.set(par.slice(0, corte), par.slice(corte + 1));
    }
    const texto = await resposta.text();
    let json;
    try { json = JSON.parse(texto); } catch { /* páginas HTML */ }
    const classe = resposta.status !== esperado ? `http_${resposta.status}`
      : validar && !validar(json) ? "contrato" : "ok";
    if (medir) {
      quantil(medir, performance.now() - inicio, classe);
      if (resposta.status === 429) parar = true;
    }
    return { status: resposta.status, json };
  } catch (error) {
    if (medir) quantil(medir, performance.now() - inicio, error.name === "TimeoutError" ? "timeout" : "rede");
    return { status: 0 };
  }
}
async function dados(caminho, opcoes) {
  const { status, json } = await app(caminho, opcoes);
  exigir(status === (opcoes?.esperado ?? 200), `${opcoes?.etapa ?? "etapa"} HTTP ${status}`);
  return json;
}
async function rest(recurso, filtros, method = "GET") {
  const url = new URL(`/rest/v1/${recurso}`, staging);
  url.search = new URLSearchParams(filtros);
  const resultado = await fetch(url, { method, redirect: "error", headers: supabaseApiHeaders(chaves.secretKey), signal: AbortSignal.timeout(8000) });
  exigir(resultado.ok, "verificação exata de fixture indisponível");
  return resultado.status === 204 ? null : resultado.json();
}
async function identificar(item) {
  const linhas = await rest("ocorrencias", { select: "id,protocolo", titulo: `eq.${item.titulo}`, limit: "2" });
  exigir(Array.isArray(linhas) && linhas.length <= 1 && (!linhas.length || uuid.test(linhas[0].id)), "identidade da fixture inconclusiva");
  return linhas[0];
}
async function registrar() {
  const token = randomBytes(32).toString("base64url");
  const titulo = `${marcador} relato sintético ${fixtures.length + 1}`;
  const item = { token, titulo };
  fixtures.push(item);
  const registro = await dados("/api/registrar", { esperado: 201, medir: "registrar", corpo: {
    municipio: "goiania", categoria: "infraestrutura", titulo,
    descricao: `Registro inteiramente sintético da campanha local número ${fixtures.length}, sem dados de pessoas.`,
    token_hash: createHash("sha256").update(token).digest("hex"),
    chave_idempotencia: randomUUID(), turnstile: tokenTeste,
  } });
  const linha = await identificar(item);
  exigir(linha?.protocolo === registro?.protocolo && linha?.id, "protocolo não corresponde à fixture");
  Object.assign(item, linha);
}
async function evitarViradaTotp(at = Date.now()) {
  const restante = 30_000 - at % 30_000;
  if (restante < 7_000) await esperar(restante + 300);
}
async function criarSessaoAdmin() {
  let deslocamento = 0;
  let semente;
  let etapaSupabase;
  const admin = await criarAdminFicticio({ papel: "moderador", fetch: async (url, opcoes) => {
    const alvo = new URL(url);
    exigir(alvo.origin === staging, "transporte Auth fora do staging");
    const post = opcoes.method === "POST";
    const desafio = post && /\/auth\/v1\/factors\/[^/]+\/challenge$/.test(alvo.pathname);
    const verificar = post && /\/auth\/v1\/factors\/[^/]+\/verify$/.test(alvo.pathname);
    if (desafio) await evitarViradaTotp(Date.now() + deslocamento);
    const inicio = Date.now();
    const corpo = verificar && semente
      ? JSON.stringify({ ...JSON.parse(opcoes.body), code: codigoTotp(semente, inicio + deslocamento) }) : opcoes.body;
    const resposta = await fetch(url, { ...opcoes, body: corpo, signal: AbortSignal.timeout(12_000) });
    const remoto = Date.parse(resposta.headers.get("date") ?? "");
    if (Number.isFinite(remoto)) deslocamento = remoto + 500 - (inicio + Date.now()) / 2;
    if (post && alvo.pathname === "/auth/v1/factors" && resposta.ok) {
      semente = (await resposta.clone().json())?.totp?.secret;
    }
    if (verificar && !resposta.ok) {
      const erro = await resposta.clone().json().catch(() => null);
      const codigo = erro?.error_code ?? erro?.code;
      if (typeof codigo === "string" && /^mfa_[a-z_]{1,48}$/.test(codigo)) etapaSupabase = codigo;
    }
    return resposta;
  } }).catch(error => {
    throw new Error(`${error.message}${etapaSupabase ? ` (${etapaSupabase})` : ""}`);
  });
  const janelaUsadaAte = Math.ceil((Date.now() + deslocamento) / 30_000) * 30_000 - deslocamento;
  admins.push(admin);
  const sessao = new Map();
  await dados("/api/admin/auth/login", { etapa: "login", sessao, corpo: { email: admin.email, password: admin.password } });
  // A inscrição do fator já usou um código. O login da aplicação precisa de
  // um código da próxima janela para respeitar a proteção contra replay.
  await esperar(Math.max(0, janelaUsadaAte - Date.now() + 350));
  await evitarViradaTotp(Date.now() + deslocamento);
  const desafio = await dados("/api/admin/auth/challenge", { etapa: "desafio", sessao, corpo: { factor_id: admin.factorId } });
  await dados("/api/admin/auth/verify", { etapa: "verificação", sessao, corpo: { factor_id: admin.factorId, challenge_id: desafio.id, code: codigoTotp(admin.totpSeed, Date.now() + deslocamento) } });
  const estado = await dados("/api/admin/auth/session", { etapa: "sessão", sessao });
  exigir(estado?.authenticated && estado?.papel === "moderador", "sessão administrativa AAL2 indisponível");
  return sessao;
}
async function encerrarParticipacao(linha, sessao) {
  if (!sessao) return;
  for (const [tabela, status, acao, texto, corpo] of [
    ["denuncias", "aberta", "resolver", denunciaTexto, { status: "improcedente" }],
    ["respostas", "pendente", "revisar", respostaTexto, { acao: "rejeitar", motivo: "Fixture sintética de carga encerrada." }],
  ]) {
    const itens = await dados(`/api/admin/${tabela}?ocorrencia_id=${linha.id}&status=${status}`, { sessao });
    const item = itens?.itens?.find(i => i.texto === texto && /^[1-9][0-9]*$/.test(String(i.id)));
    if (item) await dados(`/api/admin/${tabela}/${item.id}/${acao}`, {
      sessao, corpo: { ...corpo, versao_esperada: item.versao_admin },
    });
  }
}
async function retirarFilhos(linha) {
  let retirados = 0;
  for (const [tabela, texto, extra] of [
    ["denuncias", denunciaTexto, {}],
    ["respostas", respostaTexto, { contato: `eq.${respostaContato}` }],
  ]) {
    const filtro = { ocorrencia_id: `eq.${linha.id}`, texto: `eq.${texto}`, ...extra };
    const itens = await rest(tabela, { ...filtro, select: "id::text", limit: "2" });
    exigir(Array.isArray(itens) && itens.length <= 1, "identidade da participação inconclusiva");
    if (!itens.length) continue;
    exigir(/^[1-9][0-9]*$/.test(itens[0].id), "identificador da participação inválido");
    await rest(tabela, { ...filtro, id: `eq.${itens[0].id}` }, "DELETE");
    exigir((await rest(tabela, { ...filtro, select: "id", limit: "1" })).length === 0, "participação sintética ainda presente");
    retirados++;
  }
  return retirados;
}
async function limpar(item, sessao) {
  const linha = item.id ? item : await identificar(item);
  if (!linha?.id) return { auditoria: 0, filhos: 0 };
  let erroRevisao = false;
  if (item.participacao) {
    try {
      const publicas = await rest("v_respostas_publicas", { select: "id", ocorrencia_id: `eq.${linha.id}`, limit: "1" });
      const confirmacoesAtivas = await rest("confirmacoes", { select: "ocorrencia_id", ocorrencia_id: `eq.${linha.id}`, limit: "2" });
      erroRevisao = publicas.length !== 0 || confirmacoesAtivas.length !== 1;
      await encerrarParticipacao(linha, sessao);
    } catch { erroRevisao = true; }
  }
  await dados("/api/excluir", { corpo: { token: item.token, confirmacao: true } });
  const [estado, tokens, auditoria, confirmacoes, visibilidade] = await Promise.all([
    rest("ocorrencias", { select: "moderacao", id: `eq.${linha.id}` }),
    rest("tokens_gestao", { select: "ocorrencia_id", ocorrencia_id: `eq.${linha.id}` }),
    rest("historico_moderacao", { select: "id", ocorrencia_id: `eq.${linha.id}`, acao: "eq.exclusao_titular" }),
    rest("confirmacoes", { select: "ocorrencia_id", ocorrencia_id: `eq.${linha.id}` }),
    rest("v_ocorrencias_publicas", { select: "id", id: `eq.${linha.id}` }),
  ]);
  exigir(estado?.[0]?.moderacao === "removido" && tokens.length === 0 && confirmacoes.length === 0
    && visibilidade.length === 0 && auditoria.length === 1, "retirada ou auditoria não comprovada");
  return { auditoria: auditoria.length, filhos: item.participacao ? await retirarFilhos(linha) : 0, erroRevisao };
}
async function acaoPublica(item, volta) {
  const acao = participacao[volta % participacao.length];
  const corpo = { ocorrencia_id: item.id, turnstile: tokenTeste };
  if (acao === "afeta") await app("/api/afeta", {
    corpo, esperado: 202, medir: acao, validar: json => json?.confirmacao === "Confirmação recebida.",
  });
  else if (acao === "denunciar") await app("/api/denunciar", {
    corpo: { ...corpo, motivo: "outro", texto: denunciaTexto }, esperado: 202, medir: acao,
  });
  else if (acao === "resposta") await app("/api/resposta", {
    corpo: { ...corpo, vinculo: "Representante sintético de staging", contato: respostaContato, texto: respostaTexto },
    esperado: 202, medir: acao,
  });
  else if (acao === "detalhe") await app(`/problema/${item.id}`, { medir: "detalhe_publico_fixture" });
  else await app("/problemas", { medir: "/problemas" });
}
async function campanha(sessoes, duracao, apenasAdmin = false, preparar = async () => {}) {
  const inicio = performance.now();
  const inicioUtc = new Date().toISOString();
  const quantidade = apenasAdmin ? sessoes.length : 50;
  console.log(JSON.stringify({ evento: "carga_iniciada", inicioUtc, ref, sessoes: quantidade }));
  const fluxos = Array.from({ length: quantidade }, async (_, i) => {
    await esperar(i * 110);
    let volta = 0;
    let voltaParticipacao = 0;
    let moderou = false;
    let renovadaEm = inicio;
    while (!parar && performance.now() - inicio < duracao) {
      const item = fixtures[i - 38];
      const sessaoAdmin = sessoes[apenasAdmin ? i : i - 47];
      if (sessaoAdmin) {
        if (performance.now() - renovadaEm >= 720_000) {
          await app("/api/admin/auth/refresh", { sessao: sessaoAdmin, corpo: {}, medir: "admin_renovacao" });
          renovadaEm = performance.now();
        }
        const alvo = fixtures[(i + volta) % fixtures.length];
        const detalhe = alvo?.id && volta % 2;
        const itemModeracao = fixtures[i - 44];
        if (!apenasAdmin && !moderou && itemModeracao?.id && performance.now() - inicio >= duracao / 3) {
          moderou = true;
          const resultado = await app(`/api/admin/ocorrencias/${itemModeracao.id}`, { sessao: sessaoAdmin });
          const versao = resultado.json?.ocorrencia?.versao_admin;
          if (!Number.isInteger(versao)) quantil("admin_moderar", 0, "contrato");
          else await app(`/api/admin/ocorrencias/${itemModeracao.id}/moderar`, {
            sessao: sessaoAdmin, corpo: { acao: "aprovar", versao_esperada: versao }, medir: "admin_moderar",
          });
        }
        await app(detalhe ? `/api/admin/ocorrencias/${alvo.id}` : "/api/admin/fila?limite=10", {
          sessao: sessaoAdmin, medir: detalhe ? "admin_detalhe" : "admin_fila",
        });
      } else if (i >= 38 && i < 44 && item?.id) {
        await app("/api/acompanhar", {
          corpo: { token: item.token }, medir: "acompanhar",
          validar: json => json?.protocolo === item.protocolo && json?.titulo === item.titulo,
        });
      } else if (i >= 44 && i < 47 && fixtures[i - 44]?.participacao) {
        await acaoPublica(fixtures[i - 44], voltaParticipacao++);
      } else {
        const itemPublico = fixtures[(i + volta) % 3];
        const detalhe = itemPublico?.participacao && (i + volta) % (publico.length + 1) === publico.length;
        const caminho = publico[(i + volta) % publico.length];
        await app(detalhe ? `/problema/${itemPublico.id}` : caminho, { medir: detalhe ? "detalhe_publico_fixture" : caminho });
      }
      volta++;
      const pausa = apenasAdmin ? 1600 : 12_000 + (i % 8) * 500;
      await esperar(Math.max(0, Math.min(pausa, duracao - (performance.now() - inicio))));
    }
  });
  await Promise.all([...fluxos, preparar()]);
  return { segundos: (performance.now() - inicio) / 1000, inicioUtc, fimUtc: new Date().toISOString() };
}
async function main() {
  exigir(process.argv.includes("--execute"), "use --execute explicitamente");
  process.loadEnvFile(".env.local");
  exigir(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).href === staging + "/", "ref divergente: execução cancelada");
  exigir(process.env.VERCEL_ENV !== "production", "Production não permitido");
  chaves = resolveSupabaseKeys(process.env);
  exigir(chaves.publicKey && chaves.secretKey, "credenciais de staging indisponíveis");
  const minutos = Number(process.env.MVP_STAGING_MINUTES ?? "5");
  exigir(Number.isInteger(minutos) && minutos >= 1 && minutos <= 30, "intervalo 1–30 min");
  const port = await porta();
  const apenasAdmin = process.argv.includes("--admin-only");
  const numeroRegistros = Number(process.env.MVP_STAGING_REGISTROS ?? (apenasAdmin ? "1" : "6"));
  exigir(Number.isInteger(numeroRegistros) && numeroRegistros >= 1 && numeroRegistros <= 6, "intervalo 1–6 registros");
  origem = `http://127.0.0.1:${port}`;
  const senha = randomBytes(24).toString("hex");
  basic = `Basic ${Buffer.from(`carga:${senha}`).toString("base64")}`;
  const env = {
    ...process.env, NODE_ENV: "production", VERCEL: "0", VERCEL_ENV: "preview",
    AMBIENTE_REGISTRO: "staging_ficticio", MODO_PUBLICACAO: "moderar_tudo", FOTOS_HABILITADAS: "false",
    TURNSTILE_SECRET: "1x0000000000000000000000000000000AA", NEXT_PUBLIC_TURNSTILE_SITE_KEY: "1x00000000000000000000AA",
    AFETA_HABILITADO: "true", E2E_SUPPRESS_SMTP: "true",
    HMAC_SEGREDO: randomBytes(32).toString("hex"),
    ACESSO_STAGING_USUARIO: "carga", ACESSO_STAGING_SENHA: senha,
    LIMITE_REGISTRO_MAXIMO: "10", LIMITE_ACOMPANHAR_MAXIMO: "30", LIMITE_EXCLUIR_MAXIMO: "10",
    LIMITE_FOTO_MAXIMO: "5", LIMITE_DENUNCIA_MAXIMO: "5", LIMITE_RESPOSTA_MAXIMO: "5", LIMITE_AFETA_MAXIMO: "5",
    LIMITE_JANELA_SEGUNDOS: "60", TRIAGEM_JANELA_SEGUNDOS: "3600", TRIAGEM_LIMITE_ORIGEM: "10",
    LIMITE_ADMIN_MAXIMO: "60", LIMITE_ADMIN_JANELA_SEGUNDOS: "60",
  };
  const limites = [];
  let janela = { segundos: 0, inicioUtc: null, fimUtc: null };
  let limpeza = [];
  let adminsRemovidos = 0;
  const sessoes = [];
  try {
    fase = "build";
    exigir(await terminou(executar(["build"], env)) === 0, "build local falhou");
    fase = "start";
    servidor = executar(["start", "--hostname", "127.0.0.1", "--port", String(port)], env, true);
    let pronto = false;
    for (let i = 0; i < 35 && !pronto; i++) {
      pronto = (await app("/")).status === 200;
      if (!pronto) await esperar(300);
    }
    exigir(pronto, "runtime local não iniciou");
    fase = "administradores";
    for (let i = 0; i < (apenasAdmin ? 2 : 3) && !parar; i++) {
      try { sessoes.push(await criarSessaoAdmin()); } catch (error) { limites.push(`AAL2: ${error.message}`); break; }
    }
    if (apenasAdmin) exigir(sessoes.length > 0, "faltam sessões do perfil administrativo");
    async function prepararFixtures() {
      for (let i = 0; i < numeroRegistros && !parar; i++) {
        try { await registrar(); } catch (error) { limites.push(`registro: ${error.message}`); break; }
      }
      for (let i = 0; i < 3 && !parar && !apenasAdmin; i++) {
        const item = fixtures[i];
        // A cópia mantém o jar das leituras separado durante a preparação.
        const sessao = sessoes[i] && new Map(sessoes[i]);
        if (!item?.id || !sessao) break;
        try {
          const detalhe = await dados(`/api/admin/ocorrencias/${item.id}`, { sessao });
          await dados(`/api/admin/ocorrencias/${item.id}/moderar`, { sessao, corpo: {
            acao: "aprovar", versao_esperada: detalhe?.ocorrencia?.versao_admin,
          } });
          item.participacao = true;
        } catch (error) { limites.push(`participação: ${error.message}`); break; }
      }
    }
    if (apenasAdmin) await prepararFixtures();
    fase = "carga";
    if (apenasAdmin) exigir(fixtures.some(f => f.id), "falta fixture do perfil administrativo");
    if (!parar) janela = await campanha(sessoes, minutos * 60_000, apenasAdmin, apenasAdmin ? undefined : prepararFixtures);
  } finally {
    fase += " / limpeza";
    limpeza = await Promise.allSettled(fixtures.map((item, i) => limpar(item, sessoes[i % sessoes.length])));
    for (const admin of admins) {
      try { await admin.cleanup(); adminsRemovidos++; } catch { limites.push("limpeza AAL2 inconclusiva"); }
    }
    servidor?.kill();
    const pendentes = limpeza.filter(r => r.status === "rejected").length;
    const { segundos, inicioUtc, fimUtc } = janela;
    const revisoesInconclusivas = limpeza.filter(r => r.status === "fulfilled" && r.value.erroRevisao).length;
    const participacoesRetiradas = limpeza.reduce((n, r) => n + (r.status === "fulfilled" ? r.value.filhos : 0), 0);
    const registros = fixtures.filter(f => f.id).length;
    const rotas = Object.fromEntries([...amostras].map(([rota, amostrasRota]) =>
      [rota, resumir(amostrasRota, Math.max(segundos, 1))]));
    const erros = ([, r]) => r.requests - (r.contagens.ok ?? 0);
    const entradaApp = Object.entries(rotas).filter(([nome]) => !nome.startsWith("backend:"));
    const httpInesperados = entradaApp.reduce((n, r) => n + erros(r), 0);
    const backendInesperados = Object.entries(rotas).filter(([nome]) => nome.startsWith("backend:"))
      .reduce((n, r) => n + erros(r), 0);
    const latenciaForaMeta = entradaApp.flatMap(([nome, r]) => {
      const p95Maximo = leiturasPublicas.has(nome) ? 2000 : 3000;
      return r.p95_ms > p95Maximo || r.p99_ms > 5000
        ? [{ rota: nome, p95_ms: r.p95_ms, p95Maximo, p99_ms: r.p99_ms }] : [];
    });
    const comprovadas = apenasAdmin ? ["admin_fila", "admin_detalhe"]
      : ["registrar", "acompanhar", "afeta", "denunciar", "resposta", "detalhe_publico_fixture", "admin_fila", "admin_detalhe"];
    if (!apenasAdmin && numeroRegistros >= 6) comprovadas.push("admin_moderar");
    const semAmostras = comprovadas.filter(rota => !rotas[rota]?.contagens.ok);
    console.log(JSON.stringify({
      ref, fase, inicioUtc, fimUtc, segundos: +segundos.toFixed(1), sessoes: apenasAdmin ? sessoes.length : 50, limites,
      registros, admins: admins.length, adminsRemovidos,
      retiradasComAuditoria: limpeza.filter(r => r.status === "fulfilled" && r.value.auditoria === 1).length,
      participacoesRetiradas, revisoesInconclusivas, limpezaInconclusiva: pendentes,
      httpInesperados, backendInesperados, latenciaForaMeta, semAmostras, maiorAfetaServidor, rotas,
    }));
    if (parar || !segundos || limites.length || pendentes || revisoesInconclusivas || httpInesperados || semAmostras.length
      || backendInesperados || latenciaForaMeta.length || registros !== numeroRegistros || adminsRemovidos !== admins.length
      || (!apenasAdmin && participacoesRetiradas !== 6)) process.exitCode = 1;
  }
}

main().catch(error => { console.error(`Falha em ${fase}: ${error.message}`); process.exitCode = 1; });
