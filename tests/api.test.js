import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server/app.js';

async function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'minusone-api-'));
  const { app, store } = createApp({ dataDir: dir, serveStatic: false });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  let cookie = '';
  async function request(path, body, method = body === undefined ? 'GET' : 'POST', headers = {}) {
    const res = await fetch(base + path, {
      method,
      headers: {
        ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(cookie ? { Cookie: cookie } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
    });
    if (res.headers.get('set-cookie')) cookie = res.headers.get('set-cookie').split(';')[0];
    const data = await res.json();
    return { status: res.status, data };
  }
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    store.db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const list = await request('/projects');
  const id = list.data[0].id;
  const project = `/projects/${id}`;
  return { request, project, store, dir, id };
}
async function prepareSelection(f) {
  const { request, project } = f;
  let p = (await request(project)).data;
  let r = await request(`${project}/documents/${p.documents[0].id}/review`, {
    confirmed: true,
    monthlyKwh: 12000,
    billAmount: 54000,
  });
  assert.equal(r.status, 200);
  r = await request(`${project}/documents/sample`, { kind: 'property_rights' });
  assert.equal(r.status, 200);
  r = await request(`${project}/documents/${r.data.documents.at(-1).id}/review`, {
    confirmed: true,
  });
  assert.equal(r.status, 200);
  await request('/session', { role: 'operator' });
  r = await request(`${project}/operator/milestones/technical`, {
    note: 'Simulated roof and electrical review for this demo.',
  });
  assert.equal(r.status, 200);
  await request('/session', { role: 'customer' });
  r = await request(`${project}/selection`, { offerId: p.offers[0].id });
  assert.equal(r.status, 200);
  return r.data;
}

test('complete persistent demonstration journey with permission gates and original baseline', async (t) => {
  const f = await fixture(t);
  const { request, project, store } = f;
  let p = (await request(project)).data;
  assert.equal((await request(`${project}/selection`, { offerId: p.offers[0].id })).status, 409);
  assert.equal(
    (
      await request(`${project}/operator/milestones/technical`, {
        note: 'Unauthorized technical completion',
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request(`${project}/performance`, {
        month: '2026-10',
        generation: 9000,
        actualCost: 0,
        issue: '',
      })
    ).status,
    409,
  );
  p = await prepareSelection(f);
  assert.equal(p.proposalBaseline.offer.price, 2560000);
  assert.equal((await request(`${project}/business`, p.business, 'PUT')).status, 409);
  assert.equal((await request(`${project}/assumptions`, p.assumptions, 'PUT')).status, 409);
  assert.equal(
    (await request(`${project}/application/prepare`, { productId: 'green' })).status,
    200,
  );
  assert.equal(
    (await request(`${project}/authorizations`, { action: 'submit_application', consent: true }))
      .status,
    409,
  );
  for (const kind of ['business_registration', 'financial_statement']) {
    const added = await request(`${project}/documents/sample`, { kind });
    assert.equal(
      (
        await request(`${project}/documents/${added.data.documents.at(-1).id}/review`, {
          confirmed: true,
        })
      ).status,
      200,
    );
  }
  const pkg = await request(`${project}/application/package`);
  assert.equal(pkg.data.format, 'minusone.application.v1');
  assert.equal(
    pkg.data.checklist.every((c) => c.ready),
    true,
  );
  assert.ok(pkg.data.documents.every((d) => d.sample));
  assert.equal(
    (await request(`${project}/authorizations`, { action: 'submit_application', consent: false }))
      .status,
    400,
  );
  assert.equal(
    (await request(`${project}/actions`, { permissionId: crypto.randomUUID() })).status,
    403,
  );
  let authorized = await request(`${project}/authorizations`, {
    action: 'submit_application',
    consent: true,
  });
  const permissionId = authorized.data.permissions.at(-1).id;
  let r = await request(`${project}/actions`, { permissionId });
  assert.equal(r.status, 200);
  assert.equal(r.data.application.status, 'submitted');
  assert.equal((await request(`${project}/actions`, { permissionId })).status, 403);
  assert.equal(
    (
      await request(`${project}/operator/decision`, {
        decision: 'approved',
        note: 'Trying customer approval',
      })
    ).status,
    403,
  );
  await request('/session', { role: 'operator' });
  r = await request(`${project}/operator/decision`, {
    decision: 'approved',
    note: 'Sample lender accepts all illustrative eligibility conditions.',
  });
  assert.equal(r.status, 200);
  assert.equal(
    (
      await request(`${project}/operator/milestones/installation`, {
        note: 'Trying to skip contracting',
      })
    ).status,
    409,
  );
  assert.equal(
    (await request(`${project}/authorizations`, { action: 'commit_contract', consent: true }))
      .status,
    403,
  );
  await request('/session', { role: 'customer' });
  authorized = await request(`${project}/authorizations`, {
    action: 'commit_contract',
    consent: true,
  });
  r = await request(`${project}/actions`, { permissionId: authorized.data.permissions.at(-1).id });
  assert.equal(r.status, 200);
  assert.equal((await request(`${project}/selection`, undefined, 'DELETE')).status, 409);
  await request('/session', { role: 'operator' });
  for (const milestone of ['installation', 'commissioning', 'handover']) {
    r = await request(`${project}/operator/milestones/${milestone}`, {
      note: `Simulated partner ${milestone} complete with example evidence.`,
    });
    assert.equal(r.status, 200);
  }
  await request('/session', { role: 'customer' });
  r = await request(`${project}/performance`, {
    month: '2026-10',
    generation: 9500,
    actualCost: 1500,
    issue: 'Monitoring portal needs a connection check.',
  });
  assert.equal(r.status, 200);
  assert.equal(r.data.performance[0].expectedGeneration, 112000 / 12);
  assert.equal(r.data.tasks.at(-1).kind, 'service');
  assert.equal(r.data.milestones.filter((m) => m.status === 'complete').length, 7);
  assert.equal(
    (
      await request(`${project}/performance`, {
        month: '2026-10',
        generation: 9500,
        actualCost: 0,
        issue: '',
      })
    ).status,
    409,
  );
  const stored = JSON.parse(
    store.db.prepare('SELECT body FROM projects WHERE id=?').get(f.id).body,
  );
  assert.equal(stored.permissions.filter((a) => a.status === 'used').length, 2);
  assert.equal(stored.proposalBaseline.offer.price, 2560000);
  assert.equal(stored.performance.length, 1);
});

test('uploaded bill corrections preserve original extraction and evidence', async (t) => {
  const { request, project } = await fixture(t);
  const form = new FormData();
  form.set('kind', 'electricity_bill');
  form.set(
    'file',
    new Blob(['Consumption: 9,500 kWh\nTotal due: THB 42,750'], { type: 'text/plain' }),
    'bill.txt',
  );
  const uploaded = await request(`${project}/documents`, form);
  assert.equal(uploaded.status, 200);
  const doc = uploaded.data.documents.at(-1);
  assert.equal(doc.extracted.monthlyKwh, 9500);
  assert.equal(doc.status, 'needs_review');
  assert.equal(
    uploaded.data.business.monthlyKwh,
    12000,
    'Unreviewed values must not silently change the project',
  );
  const corrected = await request(`${project}/documents/${doc.id}/review`, {
    monthlyKwh: 9000,
    billAmount: 41000,
    confirmed: true,
  });
  assert.equal(corrected.data.business.monthlyKwh, 9000);
  assert.equal(corrected.data.documents.at(-1).extracted.monthlyKwh, 9500);
  assert.equal(corrected.data.documents.at(-1).verified.monthlyKwh, 9000);
  assert.equal(corrected.data.evidence.monthlyKwh.documentId, doc.id);
  assert.equal(corrected.data.evidence.monthlyKwh.sample, false);
});

test('invalid uploads, cross-origin writes, stale revisions, and invalid input fail cleanly', async (t) => {
  const { request, project } = await fixture(t);
  const p = (await request(project)).data;
  assert.equal(
    (await request(project + '/business', { ...p.business, monthlyKwh: -10 }, 'PUT')).status,
    400,
  );
  assert.equal(
    (await request(project + '/business', p.business, 'PUT', { 'x-project-version': '0' })).status,
    409,
  );
  assert.equal(
    (await request('/session', { role: 'operator' }, 'POST', { Origin: 'https://evil.example' }))
      .status,
    403,
  );
  const form = new FormData();
  form.set('kind', 'electricity_bill');
  form.set('file', new Blob(['<script>alert(1)</script>']), 'test.html');
  assert.equal((await request(project + '/documents', form)).status, 400);
  assert.equal(
    (await request('/projects', { name: 'New Thai SME', location: 'Chiang Mai, Thailand' })).status,
    201,
  );
});

test('clearing a supplier selection invalidates applications and authorizations', async (t) => {
  const f = await fixture(t);
  const p = await prepareSelection(f);
  await f.request(f.project + '/application/prepare', { productId: 'green' });
  const cleared = await f.request(f.project + '/selection', undefined, 'DELETE');
  assert.equal(cleared.data.selectedOfferId, null);
  assert.equal(cleared.data.application, null);
  assert.equal(cleared.data.milestones[1].status, 'pending');
  assert.equal(cleared.data.proposalBaseline, null);
  assert.equal((await f.request(f.project + '/business', p.business, 'PUT')).status, 200);
});

test('database contents survive closing and reopening the application', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'minusone-persistence-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const one = createApp({ dataDir: dir, serveStatic: false });
  const p = one.store.list()[0];
  p.business.name = 'Persisted SME';
  one.store.put(p);
  one.store.db.close();
  const two = createApp({ dataDir: dir, serveStatic: false });
  assert.equal(two.store.get(p.id).business.name, 'Persisted SME');
  assert.equal(two.store.list().length, 1);
  two.store.db.close();
});

function billPdf() {
  const stream =
    'BT /F1 16 Tf 40 700 Td (Consumption: 12,000 kWh) Tj 0 -30 Td (Total due: THB 54,000) Tj ET';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((o) => String(o).padStart(10, '0') + ' 00000 n ')
    .join('\n')}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf);
}
test('real PDF text extraction and image manual fallback are functional', async (t) => {
  const { request, project } = await fixture(t);
  const form = new FormData();
  form.set('kind', 'electricity_bill');
  form.set('file', new Blob([billPdf()], { type: 'application/pdf' }), 'bill.pdf');
  const pdf = await request(project + '/documents', form);
  assert.equal(pdf.status, 200);
  assert.deepEqual(pdf.data.documents.at(-1).extracted, { monthlyKwh: 12000, billAmount: 54000 });
  const image = new FormData();
  image.set('kind', 'electricity_bill');
  image.set(
    'file',
    new Blob(
      [
        Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aSS0AAAAASUVORK5CYII=',
          'base64',
        ),
      ],
      { type: 'image/png' },
    ),
    'scan.png',
  );
  const scan = await request(project + '/documents', image);
  assert.equal(scan.status, 200);
  assert.match(scan.data.documents.at(-1).extractionNote, /OCR is not connected/);
  assert.deepEqual(scan.data.documents.at(-1).extracted, {});
});
test('expired authorization cannot execute; lender decline creates an operator task', async (t) => {
  const f = await fixture(t);
  await prepareSelection(f);
  for (const kind of ['business_registration', 'financial_statement']) {
    const r = await f.request(f.project + '/documents/sample', { kind });
    await f.request(`${f.project}/documents/${r.data.documents.at(-1).id}/review`, {
      confirmed: true,
    });
  }
  await f.request(f.project + '/application/prepare', { productId: 'green' });
  const auth = await f.request(f.project + '/authorizations', {
    action: 'submit_application',
    consent: true,
  });
  const id = auth.data.permissions.at(-1).id;
  const p = f.store.get(f.id);
  p.permissions.at(-1).expiresAt = new Date(Date.now() - 1000).toISOString();
  f.store.put(p);
  assert.equal((await f.request(f.project + '/actions', { permissionId: id })).status, 403);
  const fresh = await f.request(f.project + '/authorizations', {
    action: 'submit_application',
    consent: true,
  });
  await f.request(f.project + '/actions', { permissionId: fresh.data.permissions.at(-1).id });
  await f.request('/session', { role: 'operator' });
  const declined = await f.request(f.project + '/operator/decision', {
    decision: 'rejected',
    note: 'Sample financial evidence needs additional review.',
  });
  assert.equal(declined.status, 200);
  assert.equal(declined.data.milestones[2].status, 'pending');
  assert.equal(declined.data.tasks.at(-1).kind, 'financing');
  const resolved = await f.request(`${f.project}/operator/tasks/${declined.data.tasks.at(-1).id}`, {
    note: 'Customer will prepare revised financial information.',
  });
  assert.equal(resolved.data.tasks.at(-1).status, 'resolved');
});
test('own-funds route checks budget and blocks a later duplicate financing application', async (t) => {
  const f = await fixture(t);
  let p = (await f.request(f.project)).data;
  p.business.budget = 3000000;
  await f.request(f.project + '/business', p.business, 'PUT');
  await prepareSelection(f);
  const funded = await f.request(f.project + '/financing/self-funded', { confirmed: true });
  assert.equal(funded.status, 200);
  assert.equal(funded.data.milestones[2].status, 'complete');
  assert.equal(funded.data.application, null);
  assert.equal(
    (await f.request(f.project + '/application/prepare', { productId: 'green' })).status,
    409,
  );
});
