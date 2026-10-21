import express from 'express';
import multer from 'multer';
import { randomUUID, randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import { createStore } from './store.js';
import { demoAccess } from './access.js';
import {
  DomainError,
  assert,
  businessSchema,
  assumptionSchema,
  offerSchema,
  performanceSchema,
  newProject,
  viewProject,
  activity,
  gaps,
  completeMilestone,
  financeProducts,
  checklist,
  extractBill,
  extractOffer,
  offerAnalysis,
} from './domain.js';

const documentKind = z.enum([
  'electricity_bill',
  'property_rights',
  'business_registration',
  'financial_statement',
  'technical_report',
  'other',
]);
const noteSchema = z
  .string()
  .trim()
  .min(10, 'Add at least 10 characters of evidence or context.')
  .max(2000);
export function createApp({
  dataDir = resolve('data'),
  dbPath = resolve(dataDir, 'minusone.sqlite'),
  seed = true,
  serveStatic = true,
  accessPassword,
  trustProxyHops = 0,
} = {}) {
  const store = createStore(dbPath, seed);
  mkdirSync(resolve(dataDir, 'uploads'), { recursive: true });
  const app = express();
  app.disable('x-powered-by');
  if (trustProxyHops > 0) app.set('trust proxy', trustProxyHops);
  if (accessPassword) app.use(demoAccess(accessPassword));
  app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Referrer-Policy', 'same-origin');
    if (req.path.startsWith('/api')) res.set('Cache-Control', 'no-store');
    // Mutations are same-origin only. There is deliberately no live external adapter.
    const origin = req.get('origin');
    if (origin && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      try {
        assert(new URL(origin).host === req.get('host'), 'Cross-origin mutation rejected.', 403);
      } catch (e) {
        return next(e);
      }
    }
    next();
  });
  app.use(express.json({ limit: '1mb' }));
  app.get('/api/health', (_req, res) =>
    res.json({
      status: 'ok',
      mode: 'demo',
      integrations: 'simulated',
      database: !!store.db.prepare('SELECT 1').get(),
    }),
  );
  app.use('/api', (req, res, next) => {
    const token = req.headers.cookie
      ?.split(';')
      .map((s) => s.trim())
      .find((s) => s.startsWith('minusone_session='))
      ?.split('=')[1];
    let session =
      token &&
      store.db
        .prepare('SELECT * FROM sessions WHERE id=? AND created_at>?')
        .get(token, Date.now() - 7 * 86400000);
    if (!session) {
      const id = randomBytes(24).toString('hex');
      store.db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(id, 'customer', Date.now());
      session = { id, role: 'customer' };
      res.cookie('minusone_session', id, {
        httpOnly: true,
        sameSite: 'strict',
        maxAge: 7 * 86400000,
        secure: req.secure,
      });
    }
    req.demoSession = session;
    next();
  });
  app.get('/api/session', (req, res) => res.json({ role: req.demoSession.role, mode: 'demo' }));
  app.post('/api/session', (req, res) => {
    const role = z.enum(['customer', 'operator']).parse(req.body.role);
    store.db.prepare('UPDATE sessions SET role=? WHERE id=?').run(role, req.demoSession.id);
    res.json({ role, mode: 'demo' });
  });
  const requireRole = (req, role) =>
    assert(req.demoSession.role === role, `Switch to the ${role} demo role for this action.`, 403);
  const mutate = (req, res, fn) => {
    const p = store.mutate(req.params.id, req.get('x-project-version'), fn);
    res.json(viewProject(p));
  };
  const editable = (p) =>
    assert(
      !p.selectedOfferId,
      'Clear your supplier selection before changing the assessment inputs.',
      409,
    );
  app.get('/api/projects', (_req, res) =>
    res.json(
      store.list().map((p) => ({
        id: p.id,
        name: p.business.name,
        location: p.business.location,
        sample: p.sample,
      })),
    ),
  );
  app.post('/api/projects', (req, res) => {
    requireRole(req, 'customer');
    const input = z
      .object({
        name: z.string().trim().min(2).max(120),
        sector: z.string().max(80).optional(),
        location: z.string().max(150).optional(),
      })
      .parse(req.body);
    const p = newProject(input);
    store.put(p);
    res.status(201).json(viewProject(p));
  });
  app.get('/api/projects/:id', (req, res) => res.json(viewProject(store.get(req.params.id))));
  app.put('/api/projects/:id/business', (req, res) => {
    requireRole(req, 'customer');
    const business = businessSchema.parse(req.body);
    mutate(req, res, (p) => {
      editable(p);
      p.business = business;
      p.milestones[0].status = 'pending';
      for (const key of ['monthlyKwh', 'billAmount', 'roofArea', 'daytimeShare', 'propertyRights'])
        p.evidence[key] = {
          source: 'Manual customer entry',
          verified: false,
          at: new Date().toISOString(),
        };
      activity(p, 'Business details updated', 'customer', 'Manual inputs; technical review reset.');
    });
  });
  app.put('/api/projects/:id/assumptions', (req, res) => {
    requireRole(req, 'customer');
    const assumptions = assumptionSchema.parse(req.body);
    mutate(req, res, (p) => {
      editable(p);
      p.assumptions = assumptions;
      p.milestones[0].status = 'pending';
      activity(
        p,
        'Estimate assumptions updated',
        'customer',
        'User-supplied assumptions, not an official tariff or engineering assessment.',
      );
    });
  });
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 3 },
  });
  app.post('/api/projects/:id/documents', upload.single('file'), async (req, res, next) => {
    let storedFile;
    try {
      requireRole(req, 'customer');
      store.get(req.params.id);
      const kind = documentKind.parse(req.body.kind);
      assert(req.file, 'Choose a file to upload.');
      const file = req.file;
      const extension = file.originalname.split('.').pop().toLowerCase();
      assert(
        ['pdf', 'txt', 'csv', 'png', 'jpg', 'jpeg'].includes(extension),
        'Upload a PDF, text, CSV, PNG, or JPEG file.',
      );
      let sourceText = '',
        extractionNote = '';
      if (['txt', 'csv'].includes(extension))
        sourceText = file.buffer.toString('utf8').slice(0, 50000);
      else if (extension === 'pdf') {
        assert(file.buffer.subarray(0, 5).toString() === '%PDF-', 'This file is not a valid PDF.');
        const { PDFParse } = await import('pdf-parse');
        const parser = new PDFParse({ data: file.buffer });
        try {
          const result = await parser.getText({ first: 10 });
          sourceText = result.text.slice(0, 50000);
        } catch {
          extractionNote =
            'PDF text extraction could not read this document. Review the original and enter values manually.';
        } finally {
          await parser.destroy();
        }
      } else
        extractionNote =
          'Image OCR is not connected. Review the original and enter values manually.';
      const doc = {
        id: randomUUID(),
        name: file.originalname.slice(0, 180),
        kind,
        mime:
          extension === 'pdf'
            ? 'application/pdf'
            : ['txt', 'csv'].includes(extension)
              ? 'text/plain'
              : extension === 'png'
                ? 'image/png'
                : 'image/jpeg',
        size: file.size,
        status: 'needs_review',
        sample: false,
        uploadedAt: new Date().toISOString(),
        sourceText,
        extractionNote,
        extracted: kind === 'electricity_bill' ? extractBill(sourceText) : {},
        verified: null,
      };
      storedFile = resolve(dataDir, 'uploads', doc.id);
      writeFileSync(storedFile, file.buffer, { flag: 'wx', mode: 0o600 });
      mutate(req, res, (p) => {
        p.documents.push(doc);
        activity(
          p,
          'Document uploaded',
          req.demoSession.role,
          `${doc.name}; customer verification required.`,
        );
      });
    } catch (e) {
      if (storedFile && existsSync(storedFile)) unlinkSync(storedFile);
      next(e);
    }
  });
  app.post('/api/projects/:id/documents/sample', (req, res) => {
    requireRole(req, 'customer');
    const kind = documentKind.parse(req.body.kind);
    mutate(req, res, (p) => {
      assert(
        !p.documents.some((d) => d.kind === kind && d.sample),
        'A sample document of this type already exists.',
      );
      const sourceText =
        kind === 'electricity_bill'
          ? `SAMPLE — NOT A REAL BILL\nConsumption: ${p.business.monthlyKwh || 12000} kWh\nTotal due: THB ${p.business.billAmount || 54000}`
          : `SAMPLE ${kind.replaceAll('_', ' ').toUpperCase()}\nBusiness: ${p.business.name}\nIllustrative placeholder for the demonstration journey. This is not legal, financial, or technical evidence.`;
      p.documents.push({
        id: randomUUID(),
        name: `Sample ${kind.replaceAll('_', ' ')}.txt`,
        kind,
        mime: 'text/plain',
        size: Buffer.byteLength(sourceText),
        status: 'needs_review',
        sample: true,
        uploadedAt: new Date().toISOString(),
        sourceText,
        extracted: kind === 'electricity_bill' ? extractBill(sourceText) : {},
        verified: null,
      });
      activity(p, 'Sample document added', 'customer', kind);
    });
  });
  app.get('/api/projects/:id/documents/:documentId/download', (req, res) => {
    const doc = store.get(req.params.id).documents.find((d) => d.id === req.params.documentId);
    assert(doc, 'Document not found.', 404);
    res.attachment(doc.name);
    if (doc.sample) res.type('text/plain').send(doc.sourceText);
    else res.sendFile(resolve(dataDir, 'uploads', doc.id));
  });
  app.post('/api/projects/:id/documents/:documentId/review', (req, res) => {
    requireRole(req, 'customer');
    const input = z
      .object({
        confirmed: z.literal(true),
        monthlyKwh: z.coerce.number().positive().max(10000000).optional(),
        billAmount: z.coerce.number().positive().max(100000000).optional(),
      })
      .parse(req.body);
    mutate(req, res, (p) => {
      const doc = p.documents.find((d) => d.id === req.params.documentId);
      assert(doc, 'Document not found.', 404);
      if (doc.kind === 'electricity_bill') {
        assert(
          input.monthlyKwh && input.billAmount,
          'Confirm consumption and total amount before reviewing the bill.',
        );
        if (
          p.business.monthlyKwh !== input.monthlyKwh ||
          p.business.billAmount !== input.billAmount
        ) {
          editable(p);
          p.milestones[0].status = 'pending';
        }
        for (const key of ['monthlyKwh', 'billAmount']) {
          p.business[key] = input[key];
          p.evidence[key] = {
            documentId: doc.id,
            source: doc.name,
            verified: true,
            verification: 'Customer reviewed; not independently verified',
            sample: doc.sample,
            at: new Date().toISOString(),
          };
        }
      }
      doc.status = 'reviewed';
      doc.verified = { ...input, by: 'customer', at: new Date().toISOString() };
      activity(
        p,
        'Document reviewed',
        'customer',
        `${doc.name}${doc.sample ? ' (sample only)' : ''}`,
      );
    });
  });
  app.post('/api/projects/:id/offers/extract', (req, res) => {
    store.get(req.params.id);
    const text = z.string().min(5).max(30000).parse(req.body.text);
    res.json({
      values: extractOffer(text),
      note: 'Rule-based extraction. Review and correct every field before saving.',
    });
  });
  app.post('/api/projects/:id/offers', (req, res) => {
    requireRole(req, 'customer');
    const offer = offerSchema.parse(req.body);
    const sourceText = z.string().max(30000).optional().parse(req.body.sourceText);
    mutate(req, res, (p) => {
      editable(p);
      p.offers.push({
        ...offer,
        id: randomUUID(),
        sample: false,
        source: sourceText ? 'Customer-reviewed pasted proposal' : 'Manual customer entry',
        sourceText: sourceText || '',
        relationship: 'Commercial relationship not disclosed; confirm with operator',
      });
      activity(p, 'Supplier offer normalized', 'customer', offer.supplier);
    });
  });
  app.post('/api/projects/:id/selection', (req, res) => {
    requireRole(req, 'customer');
    const offerId = z.string().uuid().parse(req.body.offerId);
    mutate(req, res, (p) => {
      assert(
        !p.selectedOfferId,
        'Clear your existing selection before choosing another offer.',
        409,
      );
      assert(!gaps(p).length, 'Review the missing project evidence first.', 409);
      const offer = p.offers.find((o) => o.id === offerId);
      assert(offer, 'Offer not found.', 404);
      assert(
        !offerAnalysis(offer, p).missing.length,
        'This offer has missing fields. Add a complete corrected offer before selecting it.',
        409,
      );
      assert(
        offer.capacityKw * p.assumptions.roofM2PerKw <= p.business.roofArea,
        'This system exceeds the stated usable roof area. Ask the operator to resolve it.',
        409,
      );
      completeMilestone(p, 'selection', `Selected ${offer.supplier}; no contract has been made.`);
      p.selectedOfferId = offer.id;
      p.proposalBaseline = {
        offer: structuredClone(offer),
        assumptions: structuredClone(p.assumptions),
        business: structuredClone(p.business),
        analysis: offerAnalysis(offer, p),
        selectedAt: new Date().toISOString(),
        evidence: structuredClone(p.evidence),
      };
      activity(p, 'Supplier selected', 'customer', offer.supplier);
    });
  });
  app.delete('/api/projects/:id/selection', (req, res) => {
    requireRole(req, 'customer');
    mutate(req, res, (p) => {
      assert(
        p.milestones[3].status !== 'complete',
        'A simulated contract is already recorded. Create a new project to explore a different scenario.',
        409,
      );
      p.selectedOfferId = null;
      p.proposalBaseline = null;
      p.application = null;
      p.permissions = [];
      for (const m of p.milestones.slice(1)) {
        m.status = 'pending';
        delete m.completedAt;
        delete m.note;
      }
      activity(
        p,
        'Supplier selection cleared',
        'customer',
        'Financing and pending authorizations reset.',
      );
    });
  });
  app.post('/api/projects/:id/application/prepare', (req, res) => {
    requireRole(req, 'customer');
    const productId = z.string().parse(req.body.productId);
    mutate(req, res, (p) => {
      assert(p.selectedOfferId, 'Select a supplier first.', 409);
      assert(
        p.milestones[2].status !== 'complete',
        'Financing has already been confirmed for this selection.',
        409,
      );
      assert(
        !p.application || ['prepared', 'rejected'].includes(p.application.status),
        'This application is already with the sample lender.',
        409,
      );
      const product = financeProducts.find((f) => f.id === productId);
      assert(product, 'Financing product not found.', 404);
      p.application = {
        id: randomUUID(),
        productId,
        status: 'prepared',
        simulated: true,
        preparedAt: new Date().toISOString(),
      };
      p.permissions = [];
      activity(p, 'Financing package prepared', 'customer', `${product.name}; not submitted.`);
    });
  });
  app.post('/api/projects/:id/financing/self-funded', (req, res) => {
    requireRole(req, 'customer');
    z.literal(true).parse(req.body.confirmed);
    mutate(req, res, (p) => {
      const offer = p.offers.find((o) => o.id === p.selectedOfferId);
      assert(offer, 'Select a supplier first.', 409);
      assert(
        !p.application || ['prepared', 'rejected'].includes(p.application.status),
        'Resolve the current financing application before choosing own funds.',
        409,
      );
      assert(
        p.business.budget >= offer.price,
        'The stated upfront budget is below the proposal price. Clear the supplier selection to revise your budget, or explore financing.',
        409,
      );
      completeMilestone(
        p,
        'financing',
        'Customer chose own funds for the demonstration. No payment or funds verification.',
      );
      p.application = null;
      p.permissions = [];
      activity(
        p,
        'Own-funds preference confirmed',
        'customer',
        'Internal planning choice only. No payment made.',
      );
    });
  });
  app.get('/api/projects/:id/application/package', (req, res) => {
    const p = store.get(req.params.id);
    assert(p.application, 'Prepare an application first.', 409);
    const product = financeProducts.find((f) => f.id === p.application.productId);
    res.attachment(`minusone-application-${p.id}.json`).json({
      format: 'minusone.application.v1',
      generatedAt: new Date().toISOString(),
      mode: 'DEMONSTRATION — NOT A LENDER APPLICATION',
      business: p.business,
      assumptions: p.assumptions,
      assessment: viewProject(p).assessment,
      proposal: p.proposalBaseline,
      product,
      application: p.application,
      checklist: checklist(p, product),
      evidence: p.evidence,
      documents: p.documents.map(
        ({ id, name, kind, sample, status, extracted, verified, sourceText }) => ({
          id,
          name,
          kind,
          sample,
          status,
          extracted,
          verified,
          sourceText,
        }),
      ),
      limitations: [
        'No lender integration or credit decision.',
        'All calculations are preliminary.',
        'Uploaded files remain in the local workspace; this package contains text and metadata.',
      ],
      activity: p.activity,
    });
  });
  const validateAction = (p, action) => {
    if (action === 'submit_application') {
      assert(
        p.application?.status === 'prepared',
        'Prepare an application before submitting.',
        409,
      );
      const product = financeProducts.find((f) => f.id === p.application.productId);
      assert(
        checklist(p, product).every((item) => item.ready),
        'Review all required documents before submitting.',
        409,
      );
      assert(
        p.business.monthlyKwh >= product.minKwh && p.business.propertyRights !== 'unknown',
        'The project does not meet the sample eligibility rules.',
        409,
      );
    } else
      assert(
        p.milestones[2].status === 'complete' && p.milestones[3].status !== 'complete',
        'Complete financing before the contract step.',
        409,
      );
  };
  app.post('/api/projects/:id/authorizations', (req, res) => {
    requireRole(req, 'customer');
    const input = z
      .object({
        action: z.enum(['submit_application', 'commit_contract']),
        consent: z.literal(true),
      })
      .parse(req.body);
    mutate(req, res, (p) => {
      validateAction(p, input.action);
      p.permissions.push({
        id: randomUUID(),
        action: input.action,
        status: 'authorized',
        actor: 'customer',
        offerId: p.selectedOfferId,
        applicationId: p.application?.id,
        at: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 15 * 60000).toISOString(),
        simulated: true,
      });
      activity(
        p,
        'Explicit authorization recorded',
        'customer',
        `${input.action}; simulation only; expires in 15 minutes.`,
      );
    });
  });
  app.post('/api/projects/:id/actions', (req, res) => {
    requireRole(req, 'customer');
    const permissionId = z.string().uuid().parse(req.body.permissionId);
    mutate(req, res, (p) => {
      const permission = p.permissions.find((a) => a.id === permissionId);
      assert(
        permission?.status === 'authorized' &&
          new Date(permission.expiresAt).getTime() > Date.now(),
        'A valid, unused explicit authorization is required.',
        403,
      );
      assert(
        permission.offerId === p.selectedOfferId && permission.applicationId === p.application?.id,
        'The authorization no longer matches this project.',
        403,
      );
      validateAction(p, permission.action);
      if (permission.action === 'submit_application') {
        p.application.status = 'submitted';
        p.application.submittedAt = new Date().toISOString();
      } else
        completeMilestone(
          p,
          'contract',
          'Customer explicitly authorized a simulated contract. No legal commitment was made.',
        );
      permission.status = 'used';
      permission.usedAt = new Date().toISOString();
      activity(
        p,
        permission.action === 'submit_application'
          ? 'Application submitted to sample lender'
          : 'Simulated contract recorded',
        'customer',
        'SIMULATED. No external submission, message, payment, or legal commitment.',
      );
    });
  });
  app.post('/api/projects/:id/operator/decision', (req, res) => {
    requireRole(req, 'operator');
    const { decision, note } = z
      .object({ decision: z.enum(['approved', 'rejected']), note: noteSchema })
      .parse(req.body);
    mutate(req, res, (p) => {
      assert(
        p.application?.status === 'submitted',
        'Only a submitted sample application can receive a decision.',
        409,
      );
      p.application.status = decision;
      p.application.decisionNote = note;
      p.application.decidedAt = new Date().toISOString();
      if (decision === 'approved')
        completeMilestone(p, 'financing', `SIMULATED lender approval. ${note}`);
      else
        p.tasks.push({
          id: randomUUID(),
          title: 'Resolve financing decline',
          owner: 'Operator',
          status: 'open',
          nextAction: note,
          kind: 'financing',
        });
      activity(p, `Sample lender ${decision}`, 'operator', note);
    });
  });
  app.post('/api/projects/:id/operator/milestones/:milestoneId', (req, res) => {
    requireRole(req, 'operator');
    const note = noteSchema.parse(req.body.note);
    mutate(req, res, (p) => {
      const id = req.params.milestoneId;
      assert(
        ['technical', 'installation', 'commissioning', 'handover'].includes(id),
        'Use the dedicated customer or financing action for this milestone.',
        403,
      );
      if (id === 'technical')
        assert(
          !gaps(p).length,
          'Review the missing project evidence before the technical simulation.',
          409,
        );
      completeMilestone(p, id, `SIMULATED partner update. ${note}`);
      if (id === 'technical')
        p.tasks
          .filter((t) => t.kind === 'technical')
          .forEach((t) => {
            t.status = 'resolved';
            t.resolution = note;
          });
      activity(p, `Simulated ${id} completed`, 'operator', note);
    });
  });
  app.post('/api/projects/:id/tasks', (req, res) => {
    const input = z
      .object({ title: z.string().trim().min(3).max(150), nextAction: noteSchema })
      .parse(req.body);
    mutate(req, res, (p) => {
      p.tasks.push({
        ...input,
        id: randomUUID(),
        owner: 'Operator',
        status: 'open',
        kind: 'exception',
      });
      activity(p, 'Issue escalated to operator', req.demoSession.role, input.title);
    });
  });
  app.post('/api/projects/:id/operator/tasks/:taskId', (req, res) => {
    requireRole(req, 'operator');
    const note = noteSchema.parse(req.body.note);
    mutate(req, res, (p) => {
      const task = p.tasks.find((t) => t.id === req.params.taskId);
      assert(task, 'Task not found.', 404);
      assert(task.status !== 'resolved', 'Task is already resolved.', 409);
      task.status = 'resolved';
      task.resolution = note;
      activity(p, 'Operator issue resolved', 'operator', `${task.title}: ${note}`);
    });
  });
  app.post('/api/projects/:id/performance', (req, res) => {
    const record = performanceSchema.parse(req.body);
    mutate(req, res, (p) => {
      assert(
        p.milestones[6].status === 'complete',
        'Complete handover before recording operating results.',
        409,
      );
      assert(
        !p.performance.some((r) => r.month === record.month),
        'A result for this month already exists.',
        409,
      );
      p.performance.push({
        ...record,
        id: randomUUID(),
        recordedAt: new Date().toISOString(),
        source: 'Manual entry',
        expectedGeneration: p.proposalBaseline.analysis.generation / 12,
      });
      if (record.issue)
        p.tasks.push({
          id: randomUUID(),
          title: `Service issue · ${record.month}`,
          owner: 'Operator',
          status: 'open',
          nextAction: record.issue,
          kind: 'service',
        });
      activity(
        p,
        'Performance recorded',
        req.demoSession.role,
        `${record.month}: ${record.generation} kWh; manual data.`,
      );
    });
  });
  app.use('/api', (_req, _res, next) => next(new DomainError('Endpoint not found.', 404)));
  if (serveStatic) {
    app.use(express.static(resolve('dist')));
    app.get('/{*splat}', (_req, res) => res.sendFile(resolve('dist/index.html')));
  }
  app.use((error, _req, res, _next) => {
    if (error instanceof z.ZodError)
      return res
        .status(400)
        .json({ error: error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') });
    if (error instanceof multer.MulterError)
      return res.status(400).json({
        error:
          error.code === 'LIMIT_FILE_SIZE' ? 'Files must be no larger than 5 MB.' : error.message,
      });
    const status = error.status || 500;
    if (status >= 500) console.error(error);
    res.status(status).json({
      error: status >= 500 ? 'An internal error occurred. Check the server log.' : error.message,
    });
  });
  return { app, store };
}
