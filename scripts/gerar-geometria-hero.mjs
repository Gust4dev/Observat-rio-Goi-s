// Gera src/lib/mapa/goias-estatico.generated.ts a partir de public/mapas/goias-municipios.svg.
//   npm run gerar:hero
// Reusa lerGeometria/pontoInterior de src/lib/mapa/geometria.ts (type stripping do Node).
import { readFile, writeFile } from 'node:fs/promises';
import { registerHooks } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

// geometria.ts importa './municipios.json' sem import attribute; o bundler aceita, o Node puro não.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.endsWith('.json')) {
      const r = nextResolve(specifier, context);
      return { ...r, importAttributes: { type: 'json' } };
    }
    return nextResolve(specifier, context);
  },
});

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { lerGeometria, pontoInterior } = await import(
  pathToFileURL(path.join(raiz, 'src/lib/mapa/geometria.ts')).href
);
const catalogo = JSON.parse(await readFile(path.join(raiz, 'src/lib/mapa/municipios.json'), 'utf8'));
const svg = await readFile(path.join(raiz, 'public/mapas/goias-municipios.svg'), 'utf8');

const ESPERADO = 246;
const porId = new Map(catalogo.map((m) => [m.id, m]));
const paths = [...svg.matchAll(/<path id="(\d+)" d="([^"]+)"/g)];
if (paths.length !== ESPERADO || porId.size !== ESPERADO) {
  throw new Error(`Esperados ${ESPERADO} municípios; SVG=${paths.length}, catálogo=${porId.size}`);
}

const r1 = (n) => Math.round(n * 10) / 10;
const itens = paths.map(([, id, d]) => {
  const m = porId.get(id);
  if (!m) throw new Error(`id ${id} do SVG ausente do catálogo`);
  const p = pontoInterior(lerGeometria(d));
  return { id, slug: m.slug, nome: m.nome, d, x: r1(p.x), y: r1(p.y), raio: r1(p.raio) };
});

const corpo = `// ARQUIVO GERADO por scripts/gerar-geometria-hero.mjs (npm run gerar:hero). Não editar.
export type MunicipioGeo = {
  readonly id: string;
  readonly slug: string;
  readonly nome: string;
  readonly d: string;
  readonly x: number;
  readonly y: number;
  readonly raio: number;
};

export const MUNICIPIOS_GEO: readonly MunicipioGeo[] = ${JSON.stringify(itens, null, 1)};
`;
await writeFile(path.join(raiz, 'src/lib/mapa/goias-estatico.generated.ts'), corpo);
console.log(`Gerados ${itens.length} municípios.`);
