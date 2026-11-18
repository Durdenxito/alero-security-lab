import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile, access } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

test('el build elimina archivos residuales y publica solo la aplicación', async () => {
  await mkdir('dist/.git', { recursive: true });
  await writeFile('dist/.git/config', 'fixture');
  execFileSync(process.execPath, ['scripts/build.mjs']);
  await access('dist/index.html');
  await access('dist/src/main.js');
  await assert.rejects(access('dist/.git/config'));
  await assert.rejects(access('dist/package.json'));
});
