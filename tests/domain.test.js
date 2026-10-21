import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculate,
  payment,
  seedProject,
  newProject,
  extractBill,
  extractOffer,
  gaps,
  offerAnalysis,
  completeMilestone,
  businessSchema,
  assumptionSchema,
  viewProject,
} from '../server/domain.js';

test('solar estimate is reproducible, roof/demand constrained, and subtracts maintenance', () => {
  const p = seedProject();
  const a = calculate(p);
  assert.equal(a.capacityKw, 80.2);
  assert.equal(a.generation, 112280);
  assert.equal(a.cost, 2566400);
  assert.equal(a.maintenance, 25664);
  assert.equal(a.annualSavings, 479596);
  assert.equal(a.exported, 0);
  assert.equal(a.lowSavings, 479596 * 0.8);
  assert.equal(a.paybackYears, 2566400 / 479596);
  p.business.roofArea = 70;
  assert.equal(calculate(p).capacityKw, 10);
  p.business.daytimeShare = 0;
  assert.equal(calculate(p).capacityKw, 0);
  assert.equal(calculate(p).paybackYears, null);
});
test('loan amortization handles zero and nonzero interest', () => {
  assert.equal(payment(120000, 0, 60), 2000);
  assert.ok(Math.abs(payment(100000, 0.12, 12) - 8884.878867834168) < 0.000001);
  assert.throws(() => payment(100, 0.1, 0));
});
test('offer savings cap consumption and disclose missing information', () => {
  const p = seedProject();
  const o = p.offers[0];
  assert.equal(offerAnalysis(o, p).savings, 478400);
  assert.equal(offerAnalysis(o, p).pricePerKw, 32000);
  assert.deepEqual(offerAnalysis(p.offers[2], p).missing, ['exclusions', 'maintenance']);
  p.business.monthlyKwh = 1;
  assert.ok(offerAnalysis(o, p).savings < 0);
});
test('bill and quote extraction retain unknown fields instead of inventing data', () => {
  assert.deepEqual(extractBill('Consumption: 12,000 kWh\nTotal due: THB 54,000.50'), {
    monthlyKwh: 12000,
    billAmount: 54000.5,
  });
  assert.deepEqual(extractBill('A scanned image with no readable figures'), {});
  const o = extractOffer(
    'Supplier: Solar Partner\nCapacity: 80 kWp\nPrice: THB 2,560,000\nGeneration: 112,000 kWh\nWarranty: 12 years',
  );
  assert.equal(o.supplier, 'Solar Partner');
  assert.equal(o.capacityKw, 80);
  assert.equal(o.price, 2560000);
  assert.equal(o.annualGeneration, 112000);
  assert.equal(o.exclusions, '');
});
test('new projects have missing evidence; reviewed samples remain labelled', () => {
  const p = newProject({ name: 'Test SME' });
  assert.equal(gaps(p).length, 5);
  const s = seedProject();
  assert.equal(gaps(s).length, 2);
  assert.equal(s.documents[0].sample, true);
  assert.equal(s.evidence.monthlyKwh.verified, false);
});
test('milestones cannot skip steps or be completed twice', () => {
  const p = seedProject();
  assert.throws(() => completeMilestone(p, 'installation', 'test'), /earlier/);
  completeMilestone(p, 'technical', 'Simulated');
  assert.equal(p.milestones[0].simulated, true);
  assert.throws(() => completeMilestone(p, 'technical', 'again'), /already/);
  completeMilestone(p, 'selection', 'test');
  assert.equal(p.milestones[1].status, 'complete');
});
test('invalid calculation inputs cannot enter stored project data', () => {
  const p = seedProject();
  assert.equal(businessSchema.safeParse({ ...p.business, daytimeShare: 2 }).success, false);
  assert.equal(assumptionSchema.safeParse({ ...p.assumptions, roofM2PerKw: 0 }).success, false);
  assert.equal(assumptionSchema.safeParse({ ...p.assumptions, tariff: -1 }).success, false);
});
test('a manual change that conflicts with reviewed bill evidence becomes a new gap', () => {
  const p = seedProject();
  p.documents[0].status = 'reviewed';
  p.documents[0].verified = { monthlyKwh: 12000, billAmount: 54000 };
  assert.ok(!gaps(p).includes('Electricity inputs differ from reviewed bill evidence'));
  p.business.monthlyKwh = 10000;
  assert.ok(gaps(p).includes('Electricity inputs differ from reviewed bill evidence'));
});
test('stalled tasks are exposed without changing technical verification', () => {
  const p = seedProject();
  p.tasks[0].createdAt = new Date(Date.now() - 8 * 86400000).toISOString();
  assert.equal(viewProject(p).tasks[0].stalled, true);
  assert.equal(p.milestones[0].status, 'pending');
});
