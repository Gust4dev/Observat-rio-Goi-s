import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { assertNoSecretInPublicBundle } from './check-public-bundle.mjs';

let dir;
afterEach(async () => { if (dir) await rm(dir, { recursive: true, force: true }); dir = undefined; });

it('accepts a public bundle without privileged key markers', async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), 'og-public-bundle-'));
  await mkdir(path.join(dir, 'static'));
  await writeFile(path.join(dir, 'static', 'app.js'), 'console.log("public")');
  await expect(assertNoSecretInPublicBundle(dir, ['sb_secret_ci_dummy_marker'])).resolves.toBeUndefined();
});

it('rejects a privileged key marker without echoing it', async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), 'og-public-bundle-'));
  await mkdir(path.join(dir, 'static'));
  const marker = 'sb_secret_ci_dummy_marker';
  await writeFile(path.join(dir, 'static', 'app.js'), `const key="${marker}"`);
  await expect(assertNoSecretInPublicBundle(dir, [marker])).rejects.toThrow(/privileged key marker/i);
  await expect(assertNoSecretInPublicBundle(dir, [marker])).rejects.not.toThrow(marker);
});
