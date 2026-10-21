import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createApp } from '../server/app.js';

test('hosted demo requires the shared password for frontend, project data, and files', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'minusone-access-'));
  const password = randomBytes(24).toString('hex');
  const { app, store } = createApp({ dataDir: dir, accessPassword: password, trustProxyHops: 1 });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    store.db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const project = store.list()[0];
  for (const path of [
    '/',
    '/api/projects',
    '/api/session',
    `/api/projects/${project.id}/documents/${project.documents[0].id}/download`,
    '/assets/example.js',
  ]) {
    const res = await fetch(base + path);
    assert.equal(res.status, 401, path);
    assert.match(res.headers.get('www-authenticate'), /Basic realm="MinusOne demo"/);
    assert.equal(res.headers.has('set-cookie'), false);
  }
  const invalid = await fetch(base + '/api/projects', {
    headers: {
      authorization: 'Basic ' + Buffer.from('minusone:wrong-password').toString('base64'),
    },
  });
  assert.equal(invalid.status, 401);
  const malformed = await fetch(base + '/api/projects', {
    headers: { authorization: 'Basic !!!!' },
  });
  assert.equal(malformed.status, 401);
  const auth = {
    authorization: 'Basic ' + Buffer.from(`minusone:${password}`).toString('base64'),
    'x-forwarded-proto': 'https',
  };
  const session = await fetch(base + '/api/session', { headers: auth });
  assert.equal(session.status, 200);
  assert.match(session.headers.get('set-cookie'), /; Secure/);
  const authenticated = await fetch(base + '/api/projects', { headers: auth });
  assert.equal(authenticated.status, 200);
  assert.equal((await authenticated.json())[0].name, 'Siam Craft Foods');
  const health = await fetch(base + '/api/health');
  assert.equal(health.status, 200);
  assert.equal((await health.json()).database, true);
  assert.equal(health.headers.has('set-cookie'), false);
});

test('production startup refuses an absent or short access password before opening the database', () => {
  const dir = mkdtempSync(join(tmpdir(), 'minusone-startup-'));
  try {
    for (const password of ['', 'short']) {
      const result = spawnSync(process.execPath, ['server/index.js'], {
        encoding: 'utf8',
        timeout: 5000,
        env: {
          ...process.env,
          NODE_ENV: 'production',
          DEMO_ACCESS_PASSWORD: password,
          DATA_DIR: dir,
          PORT: '0',
        },
      });
      assert.equal(result.status, 1);
      assert.match(result.stderr, /requires DEMO_ACCESS_PASSWORD of at least 16 characters/);
      assert.equal(existsSync(join(dir, 'minusone.sqlite')), false);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
