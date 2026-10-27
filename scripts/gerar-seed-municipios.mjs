// Gera db/008_seed_municipios.sql a partir da API de localidades do IBGE (Goiás, UF 52).
//   node scripts/gerar-seed-municipios.mjs
// Node 18+ (usa fetch nativo). Sem dependências. Falha se a contagem não for 246.
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const FONTE = 'https://servicodados.ibge.gov.br/api/v1/localidades/estados/52/municipios';
const ESPERADO = 246;
const saida = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'db', '008_seed_municipios.sql');

const slugify = (nome) =>
  nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const resp = await fetch(FONTE);
if (!resp.ok) throw new Error(`IBGE respondeu HTTP ${resp.status}`);
const dados = await resp.json();

if (!Array.isArray(dados) || dados.length !== ESPERADO) {
  throw new Error(`Esperados ${ESPERADO} municípios, recebidos ${Array.isArray(dados) ? dados.length : 'resposta inválida'}`);
}

const linhas = dados
  .map((m) => ({ ibge: Number(m.id), nome: String(m.nome).trim(), slug: slugify(m.nome) }))
  .sort((a, b) => a.ibge - b.ibge);

const slugs = new Set(linhas.map((l) => l.slug));
const codigos = new Set(linhas.map((l) => l.ibge));
if (slugs.size !== ESPERADO) throw new Error(`Slugs não únicos: ${slugs.size} distintos de ${ESPERADO}`);
if (codigos.size !== ESPERADO) throw new Error('Códigos IBGE duplicados');
for (const l of linhas) {
  if (!Number.isInteger(l.ibge) || l.ibge < 5200000 || l.ibge > 5299999) throw new Error(`Código IBGE fora da faixa: ${l.ibge}`);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(l.slug)) throw new Error(`Slug inválido: ${l.slug}`);
}

const q = (s) => `'${s.replace(/'/g, "''")}'`;
const sql = `-- Observatório Goiás — 008: municípios de Goiás (${ESPERADO})
-- Gerado por scripts/gerar-seed-municipios.mjs em ${new Date().toISOString().slice(0, 10)}. NÃO editar à mão.
-- Fonte: IBGE, API de localidades — ${FONTE}
-- Idempotente: reexecutar não duplica (on conflict do nothing).

insert into public.municipios (ibge_codigo, nome, slug) values
${linhas.map((l) => `  (${l.ibge}, ${q(l.nome)}, ${q(l.slug)})`).join(',\n')}
on conflict (ibge_codigo) do nothing;
`;
await writeFile(saida, sql, 'utf8');
console.log(`Gerado ${path.relative(process.cwd(), saida)} com ${linhas.length} municípios.`);
