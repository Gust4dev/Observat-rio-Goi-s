import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

async function arquivosRecursivos(dir) {
  const encontrados = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const alvo = path.join(dir, entry.name);
    if (entry.isDirectory()) encontrados.push(...await arquivosRecursivos(alvo));
    else if (entry.isFile()) encontrados.push(alvo);
  }
  return encontrados;
}

export async function assertNoSecretInPublicBundle(buildDir, markers) {
  const validos = markers.filter((marker) => typeof marker === 'string' && marker.length > 0);
  if (validos.length === 0) throw new Error('Public bundle guard requires a dummy privileged-key marker.');
  const publicDir = path.join(buildDir, 'static');
  const files = await arquivosRecursivos(publicDir);
  for (const file of files) {
    const contents = await readFile(file);
    if (validos.some((marker) => contents.includes(Buffer.from(marker)))) {
      throw new Error('Privileged key marker found in a public bundle.');
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const markers = [process.env.SUPABASE_SECRET_KEY, process.env.SUPABASE_SERVICE_ROLE_KEY];
  try {
    await assertNoSecretInPublicBundle(path.resolve(process.env.NEXT_BUILD_DIR ?? '.next'), markers);
    console.log('ok public bundle excludes privileged key markers');
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Public bundle guard failed.');
    process.exitCode = 1;
  }
}
