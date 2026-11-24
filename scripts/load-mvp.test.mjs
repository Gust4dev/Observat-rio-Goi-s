import { test } from "vitest";
import assert from "node:assert/strict";
import { acompanharCompat, caminhosCarga, classificar, configurar, confirmarDeployment, resumir } from "./load-mvp.mjs";

const env = {
  MVP_TARGET: "https://observatorio-go.vercel.app",
  MVP_PROJECT_REF: "acxcqtknxjiwopdtjxoc",
  MVP_DEPLOYMENT_ID: "dpl_123",
  MVP_DETAIL_ID: "11111111-1111-4111-8111-111111111111",
  MVP_MUNICIPIO: "goiania",
  MVP_CATEGORIA: "vias",
  MVP_PUBLISHABLE_KEY: "sb_publishable_just_a_test",
};

test("limita o ensaio ao alias e ref autorizados, com zero escritas por padrão", () => {
  assert.equal(configurar(env).escritas, 0);
  assert.equal(configurar({ ...env, MVP_WRITE_COUNT: "3" }).escritas, 3);
  for (const alteracao of [
    { MVP_TARGET: "https://observatorio-go.vercel.app.example.com" },
    { MVP_PROJECT_REF: "outro-ref" },
    { MVP_WRITE_COUNT: "4" },
    { MVP_WRITE_COUNT: "1.5" },
    { MVP_PUBLISHABLE_KEY: "sb_secret_just_a_test" },
    { MVP_DETAIL_ID: "../api/cron/limpar-quarentena" },
  ]) assert.throws(() => configurar({ ...env, ...alteracao }));
});

test("perfil GET-only exige deployment aprovado e não depende de fixture, filtros ou chave", () => {
  const readOnly = configurar({
    MVP_TARGET: env.MVP_TARGET,
    MVP_PROJECT_REF: env.MVP_PROJECT_REF,
    MVP_DEPLOYMENT_ID: env.MVP_DEPLOYMENT_ID,
    MVP_SOAK_MINUTES: "1",
  }, { somenteLeitura: true });
  assert.equal(readOnly.somenteLeitura, true);
  assert.equal(readOnly.escritas, 0);
  assert.equal(readOnly.id, null);
  assert.equal(readOnly.chave, null);
  assert.deepEqual(caminhosCarga(readOnly), ["/", "/problemas", "/municipios", "/municipios/goiania", "/dados",
    "/api/dados?municipio=goiania&categoria=vias"]);
  assert.throws(() => configurar({
    MVP_TARGET: env.MVP_TARGET,
    MVP_PROJECT_REF: env.MVP_PROJECT_REF,
    MVP_DEPLOYMENT_ID: env.MVP_DEPLOYMENT_ID,
    MVP_WRITE_COUNT: "1",
  }, { somenteLeitura: true }));
  assert.throws(() => confirmarDeployment({ id: "dpl_other", name: "observatorio-go", target: "production",
    readyState: "READY", aliases: ["observatorio-go.vercel.app"] }, readOnly.deployment));
});

test("perfil misto mantém a fixture e a consulta pública filtrada", () => {
  assert.deepEqual(caminhosCarga(configurar(env)), [
    "/", "/problemas", `/problema/${env.MVP_DETAIL_ID}`, `/municipios/${env.MVP_MUNICIPIO}`,
    `/api/dados?municipio=${env.MVP_MUNICIPIO}&categoria=${env.MVP_CATEGORIA}`,
  ]);
});

test("recusa deployment desatualizado, fora de Production ou com alias divergente", () => {
  const d = { id: "dpl_123", name: "observatorio-go", target: "production",
    readyState: "READY", aliases: ["observatorio-go.vercel.app"] };
  assert.doesNotThrow(() => confirmarDeployment(d, "dpl_123"));
  assert.throws(() => confirmarDeployment(d, "dpl_456"));
  assert.throws(() => confirmarDeployment({ ...d, readyState: "BUILDING" }, "dpl_123"));
  assert.throws(() => confirmarDeployment({ ...d, target: "preview" }, "dpl_123"));
  assert.throws(() => confirmarDeployment({ ...d, aliases: ["example.com"] }, "dpl_123"));
});

test("distingue challenge, limite, validação e erros do runtime", () => {
  assert.equal(classificar(429, "challenge", ""), "challenge");
  assert.equal(classificar(429, null, "Vercel Security Checkpoint"), "challenge");
  assert.equal(classificar(429, null, "{}"), "limite");
  assert.equal(classificar(422, null, "{}", true), "validacao");
  assert.equal(classificar(422, null, "{}"), "status_inesperado");
  assert.equal(classificar(503, null, "{}"), "5xx");
  assert.equal(classificar(302, null, ""), "status_inesperado");
  assert.equal(classificar(201, null, "{}", true), "ok");
});

test("só admite remoção da ocorrência cuja identidade coincide com token e fixture", () => {
  const resultado = { classe: "ok" };
  const identidade = { id: env.MVP_DETAIL_ID, protocolo: "OG-26-ABCD1234", titulo: "[CARGA-MVP:fixture]" };
  assert.equal(acompanharCompat(resultado, identidade, identidade, identidade), true);
  assert.equal(acompanharCompat(resultado, identidade, identidade, { ...identidade, id: "outro" }), false);
  assert.equal(acompanharCompat(resultado, identidade, identidade, { ...identidade, titulo: "outro" }), false);
  assert.equal(acompanharCompat({ classe: "challenge" }, identidade, identidade, identidade), false);
});

test("relata percentis, vazão e classes sem incluir os corpos HTTP", () => {
  assert.deepEqual(resumir([
    { ms: 20, classe: "ok", corpo: "dado omitido" },
    { ms: 10, classe: "ok" },
    { ms: 90, classe: "5xx" },
    { ms: 40, classe: "challenge" },
  ], 2), {
    requests: 4, requests_por_segundo: 2,
    p50_ms: 20, p95_ms: 90, p99_ms: 90,
    contagens: { ok: 2, "5xx": 1, challenge: 1 },
  });
});
