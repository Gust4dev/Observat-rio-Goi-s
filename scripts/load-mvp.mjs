import { createHash, randomBytes, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { setTimeout as wait } from "node:timers/promises";
import { pathToFileURL } from "node:url";

const HOST = "observatorio-go.vercel.app";
const TARGET = `https://${HOST}`;
const REF = "acxcqtknxjiwopdtjxoc";
const SCOPE = "mercurygestoria-9113s-projects";
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const STAGES = [20, 40, 50, 60];
const TIMEOUT_MS = 8000;

function exigencia(condicao, motivo) {
  if (!condicao) throw new Error(motivo);
}

function inteiro(valor, minimo, maximo) {
  const numero = Number(valor);
  exigencia(Number.isInteger(numero) && numero >= minimo && numero <= maximo, "limite inválido");
  return numero;
}

export function configurar(env) {
  const { MVP_TARGET: alvo, MVP_PROJECT_REF: ref, MVP_DEPLOYMENT_ID: deployment, MVP_DETAIL_ID: id,
    MVP_MUNICIPIO: municipio, MVP_CATEGORIA: categoria, MVP_PUBLISHABLE_KEY: chave } = env;
  exigencia(alvo === TARGET && ref === REF, "alvo ou ref divergente");
  exigencia(/^dpl_[A-Za-z0-9]+$/.test(deployment ?? ""), "informe o ID do deployment aprovado no E2E");
  exigencia(UUID.test(id ?? "") && SLUG.test(municipio ?? "") && SLUG.test(categoria ?? ""), "fixture e filtros inválidos");
  exigencia(/^sb_publishable_[A-Za-z0-9_-]+$/.test(chave ?? ""), "a chave publishable do ref confirmado é obrigatória");
  return {
    deployment, id, municipio, categoria, chave,
    rampa: inteiro(env.MVP_RAMP_MINUTES ?? "3", 1, 10),
    soak: inteiro(env.MVP_SOAK_MINUTES ?? "30", 1, 60),
    escritas: inteiro(env.MVP_WRITE_COUNT ?? "0", 0, 3),
  };
}

export function confirmarDeployment(d, aprovado) {
  exigencia(d.id === aprovado && d.name === "observatorio-go" && d.target === "production"
    && d.readyState === "READY" && d.aliases?.includes(HOST), "alias não aponta para o deployment Production READY aprovado");
}

function inspecionar() {
  // Todos os argumentos são constantes. A saída autenticada nunca é impressa.
  const args = ["--no-install", "vercel", "inspect", TARGET, "--scope", SCOPE, "--json"];
  const cmd = process.platform === "win32" ? "cmd.exe" : "npx";
  const argv = process.platform === "win32" ? ["/d", "/c", "npx", ...args] : args;
  try {
    return JSON.parse(execFileSync(cmd, argv, { encoding: "utf8", timeout: 15000, stdio: ["ignore", "pipe", "pipe"] }));
  } catch {
    throw new Error("não foi possível conferir o deployment via Vercel CLI");
  }
}

export function classificar(status, mitigado, corpo, escrita = false) {
  if (mitigado === "challenge" || corpo.includes("Vercel Security Checkpoint")) return "challenge";
  if (status === 429) return "limite";
  if (status >= 500) return "5xx";
  if (escrita && [400, 409, 413, 415, 422].includes(status)) return "validacao";
  if (escrita ? status === 200 || status === 201 : status === 200) return "ok";
  return "status_inesperado";
}

export function resumir(amostras, segundos) {
  const tempos = amostras.map(({ ms }) => ms).sort((a, b) => a - b);
  const p = q => tempos.length ? Math.round(tempos[Math.ceil(tempos.length * q) - 1]) : null;
  const contagens = {};
  for (const { classe } of amostras) contagens[classe] = (contagens[classe] ?? 0) + 1;
  return { requests: amostras.length, requests_por_segundo: +(amostras.length / segundos).toFixed(2),
    p50_ms: p(.50), p95_ms: p(.95), p99_ms: p(.99), contagens };
}

async function app(caminho, json) {
  const inicio = performance.now();
  const escrita = json !== undefined;
  try {
    const resposta = await fetch(TARGET + caminho, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      ...(escrita && { method: "POST", headers: { "Content-Type": "application/json", Origin: TARGET }, body: JSON.stringify(json) }),
    });
    const corpo = await resposta.text();
    return { classe: classificar(resposta.status, resposta.headers.get("x-vercel-mitigated"), corpo, escrita),
      ms: performance.now() - inicio, status: resposta.status, corpo };
  } catch (erro) {
    return { classe: erro.name === "TimeoutError" || erro.name === "AbortError" ? "timeout" : "infra",
      ms: performance.now() - inicio };
  }
}

function parse(resultado) {
  try { return JSON.parse(resultado.corpo ?? "null"); } catch { return null; }
}

async function consultarFixture(config, filtro) {
  const query = new URLSearchParams({ ...filtro, select: "id,titulo,protocolo,municipio_slug,categoria_slug", limit: "2" });
  const url = `https://${REF}.supabase.co/rest/v1/v_ocorrencias_publicas?${query}`;
  const resposta = await fetch(url, { headers: { apikey: config.chave, "Cache-Control": "no-store" },
    redirect: "error", signal: AbortSignal.timeout(TIMEOUT_MS) });
  const linhas = resposta.ok ? await resposta.json() : null;
  exigencia(Array.isArray(linhas) && linhas.length <= 1, "consulta exata da fixture inconclusiva");
  return linhas[0] ?? null;
}

function amostra(rota, resultado) {
  return { rota, classe: resultado.classe, ms: resultado.ms };
}

async function registrar(config, runId, fixtures, medicao) {
  const titulo = `[CARGA-MVP:${runId}] Relato sintético ${fixtures.length + 1}`;
  const token = randomBytes(32).toString("base64url");
  const fixture = { titulo, token, protocolo: null, id: null };
  fixtures.push(fixture);
  const registro = await app("/api/registrar", {
    municipio: config.municipio, categoria: config.categoria, titulo,
    descricao: "Registro sintético de ensaio de capacidade. Nenhum dado pessoal foi fornecido.",
    token_hash: createHash("sha256").update(token).digest("hex"),
    chave_idempotencia: randomUUID(), aceite_publicacao_imediata: true,
  });
  medicao.push(amostra("registrar", registro));
  if (registro.classe === "ok" && registro.status === 201) fixture.protocolo = parse(registro)?.protocolo ?? null;
  exigencia(/^OG-[0-9]{2}-[A-F0-9]{8}$/.test(fixture.protocolo ?? ""), "envio sintético inconclusivo");
  const linha = await consultarFixture(config, { protocolo: `eq.${fixture.protocolo}` });
  exigencia(linha?.titulo === titulo && UUID.test(linha.id), "fixture recém-criada não corresponde ao protocolo");
  fixture.id = linha.id;
  const acompanhamento = await app("/api/acompanhar", { token });
  const titular = parse(acompanhamento);
  if (acompanhamento.classe === "ok" && !acompanharCompat(acompanhamento, titular, linha, fixture)) {
    acompanhamento.classe = "identidade_divergente";
  }
  medicao.push(amostra("acompanhar", acompanhamento));
  exigencia(acompanhamento.classe === "ok", "acompanhamento da fixture recém-criada inconclusivo");
}

async function limpar(config, fixtures) {
  const pendentes = [];
  for (const fixture of fixtures) {
    try {
      // O titular precisa provar a identidade exata antes de acionar a retirada.
      const acompanhar = await app("/api/acompanhar", { token: fixture.token });
      const titular = parse(acompanhar);
      const linha = await consultarFixture(config, { titulo: `eq.${fixture.titulo}` });
      if (!linha && !fixture.protocolo && acompanhar.status === 404) continue;
      exigencia(linha && acompanharCompat(acompanhar, titular, linha, fixture), "identidade da fixture não comprovada");
      fixture.id = linha.id;
      fixture.protocolo = linha.protocolo;
      const excluir = await app("/api/excluir", { token: fixture.token, confirmacao: true });
      exigencia(excluir.classe === "ok" && !await consultarFixture(config, { id: `eq.${linha.id}` }), "retirada não comprovada");
    } catch {
      pendentes.push({ id: fixture.id, protocolo: fixture.protocolo });
    }
  }
  return pendentes;
}

export function acompanharCompat(acompanhar, titular, linha, fixture) {
  return UUID.test(linha.id) && (!fixture.id || linha.id === fixture.id)
    && acompanhar.classe === "ok" && titular?.protocolo === linha.protocolo
    && titular.titulo === fixture.titulo && linha.titulo === fixture.titulo
    && (!fixture.protocolo || fixture.protocolo === linha.protocolo);
}

function analisarAmostras(amostras, segundos) {
  const porRota = {};
  for (const valor of amostras) (porRota[valor.rota] ??= []).push(valor);
  return { total: resumir(amostras, segundos),
    rotas: Object.fromEntries(Object.entries(porRota).map(([rota, valores]) => [rota, resumir(valores, segundos)])) };
}

async function executar(config) {
  confirmarDeployment(inspecionar(), config.deployment);
  const saude = await app("/api/saude");
  const estado = parse(saude);
  exigencia(saude.classe === "ok" && estado?.banco === "ok" && estado?.origem_confirmada === true,
    `preflight de runtime falhou (${saude.classe}); nenhuma carga disparada`);
  const detalhe = await consultarFixture(config, { id: `eq.${config.id}` });
  exigencia(detalhe && /^\[DEMO-MVP[:\]]/.test(detalhe.titulo) && detalhe.municipio_slug === config.municipio
    && detalhe.categoria_slug === config.categoria, "fixture de leitura não confere no ref aprovado");
  const caminhos = ["/", "/problemas", `/problema/${config.id}`, `/municipios/${config.municipio}`,
    `/api/dados?municipio=${config.municipio}&categoria=${config.categoria}`];
  for (const caminho of caminhos) exigencia((await app(caminho)).classe === "ok", "uma rota de leitura falhou no preflight");
  const runId = randomUUID();
  const fixtures = [];
  const fases = [];
  let falha = null;
  let encerrando = false;
  const parar = () => { encerrando = true; };
  process.once("SIGINT", parar);
  process.once("SIGTERM", parar);
  try {
    for (const sessoes of STAGES) {
      if (encerrando) break;
      confirmarDeployment(inspecionar(), config.deployment);
      const amostras = [];
      let negativas = 0;
      const tempoInicial = performance.now();
      const fim = tempoInicial + (sessoes - 1) * 100 + 60000 * (sessoes >= 50 ? config.soak : config.rampa);
      const workers = Array.from({ length: sessoes }, async (_, posicao) => {
        await wait(posicao * 100);
        if (sessoes === 60 && posicao === 0) {
          for (let i = 0; i < config.escritas && !encerrando; i++) {
            try { await registrar(config, runId, fixtures, amostras); }
            catch { encerrando = true; falha = "cadastro sintético inconclusivo; iniciando limpeza"; }
            if (i + 1 < config.escritas && !encerrando) await wait(15000);
          }
        }
        let i = posicao;
        while (!encerrando && performance.now() < fim) {
          const rota = caminhos[i++ % caminhos.length];
          const resultado = await app(rota);
          amostras.push(amostra(rota.split("?")[0].replace(config.id, ":id"), resultado));
          if (["5xx", "timeout", "infra", "status_inesperado"].includes(resultado.classe)) negativas++;
          if (resultado.classe === "challenge" || resultado.classe === "limite" ||
              (amostras.length >= 20 && negativas / amostras.length > .05)) {
            encerrando = true;
            falha ??= resultado.classe === "ok" ? "carga interrompida por acúmulo de erros" : `carga interrompida por ${resultado.classe}`;
          }
          if (!encerrando) await wait(5000 + Math.random() * 5000);
        }
      });
      await Promise.all(workers);
      fases.push({ sessoes, segundos: Math.round((performance.now() - tempoInicial) / 1000), interrompida: encerrando,
        ...analisarAmostras(amostras, (performance.now() - tempoInicial) / 1000) });
    }
  } finally {
    const pendentes = await limpar(config, fixtures);
    process.removeListener("SIGINT", parar);
    process.removeListener("SIGTERM", parar);
    console.log(JSON.stringify({ run_id: runId, deployment: config.deployment, fases, falha,
      cadastros_tentados: fixtures.length, limpeza_pendente: pendentes }, null, 2));
    if (encerrando || pendentes.length) process.exitCode = 1;
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try {
    exigencia(process.argv.length === 3 && process.argv[2] === "--execute", "use --execute após aprovar o deployment e a janela de carga");
    await executar(configurar(process.env));
  } catch (erro) {
    console.error(erro instanceof Error ? erro.message : "ensaio interrompido");
    process.exitCode = 1;
  }
}
