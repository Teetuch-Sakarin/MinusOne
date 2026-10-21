import { randomUUID } from 'node:crypto';
import { z } from 'zod';

export class DomainError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
export const assert = (condition, message, status) => {
  if (!condition) throw new DomainError(message, status);
};
const num = (min, max) => z.coerce.number().finite().min(min).max(max);
export const businessSchema = z.object({
  name: z.string().trim().min(2).max(120),
  sector: z.string().max(80),
  location: z.string().trim().min(2).max(150),
  contact: z.string().max(150),
  propertyRights: z.enum(['owner', 'lease', 'unknown']),
  roofArea: num(0, 100000),
  monthlyKwh: num(0, 10000000),
  billAmount: num(0, 100000000),
  daytimeShare: num(0, 1),
  budget: num(0, 100000000),
  financePreference: z.enum(['loan', 'cash', 'explore']),
});
export const assumptionSchema = z.object({
  market: z.string().trim().min(2).max(80),
  currency: z.enum(['THB', 'USD', 'EUR', 'GBP']),
  tariff: num(0.01, 100),
  exportTariff: num(0, 100),
  yieldKwh: num(500, 2500),
  costPerKw: num(1000, 200000),
  annualMaintenance: num(0, 0.2),
  roofM2PerKw: num(4, 20),
  uncertainty: num(0, 0.5),
});
export const offerSchema = z.object({
  supplier: z.string().trim().min(2).max(120),
  capacityKw: num(1, 10000),
  price: num(1, 1000000000),
  annualGeneration: num(0, 50000000),
  equipment: z.string().max(500),
  scope: z.string().max(1000),
  exclusions: z.string().max(1000),
  paymentSchedule: z.string().max(500),
  warranty: z.string().max(500),
  maintenance: z.string().max(500),
});
export const performanceSchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  generation: num(0, 50000000),
  actualCost: num(0, 1000000000),
  issue: z.string().max(2000),
});
export const financeProducts = [
  {
    id: 'green',
    name: 'Green growth loan',
    provider: 'Sample Green Finance',
    apr: 0.065,
    months: 60,
    deposit: 0.15,
    minKwh: 3000,
    documents: [
      'electricity_bill',
      'property_rights',
      'business_registration',
      'financial_statement',
    ],
    sample: true,
  },
  {
    id: 'flex',
    name: 'Solar flex loan',
    provider: 'Sample SME Capital',
    apr: 0.079,
    months: 84,
    deposit: 0.1,
    minKwh: 1500,
    documents: [
      'electricity_bill',
      'property_rights',
      'business_registration',
      'financial_statement',
    ],
    sample: true,
  },
];
export const milestoneDefs = [
  ['technical', 'Technical assessment', 'Partner engineer'],
  ['selection', 'Supplier selection', 'You'],
  ['financing', 'Financing decision', 'Financing partner'],
  ['contract', 'Contracting', 'You'],
  ['installation', 'Installation', 'Installer'],
  ['commissioning', 'Commissioning', 'Partner engineer'],
  ['handover', 'Handover', 'Operator'],
];
export function payment(principal, annualRate, months) {
  assert(principal >= 0 && annualRate >= 0 && months > 0, 'Invalid loan inputs.');
  const r = annualRate / 12;
  return r === 0 ? principal / months : (principal * r) / (1 - (1 + r) ** -months);
}
export function calculate(p) {
  const b = p.business,
    a = p.assumptions;
  const roofLimit = b.roofArea / a.roofM2PerKw;
  const demandLimit = (b.monthlyKwh * 12 * b.daytimeShare) / a.yieldKwh;
  const capacityKw = Math.floor(Math.min(roofLimit, demandLimit) * 10) / 10;
  const generation = capacityKw * a.yieldKwh;
  // This simplified model assumes production within daytime demand is self-consumed.
  const selfConsumed = Math.min(generation, b.monthlyKwh * 12 * b.daytimeShare);
  const exported = Math.max(0, generation - selfConsumed);
  const cost = capacityKw * a.costPerKw;
  const maintenance = cost * a.annualMaintenance;
  const annualSavings = selfConsumed * a.tariff + exported * a.exportTariff - maintenance;
  return {
    capacityKw,
    generation,
    selfConsumed,
    exported,
    cost,
    maintenance,
    annualSavings,
    paybackYears: annualSavings > 0 ? cost / annualSavings : null,
    lowSavings: annualSavings * (1 - a.uncertainty),
    highSavings: annualSavings * (1 + a.uncertainty),
    annualBill: b.billAmount * 12,
    sources: p.evidence,
    formula:
      'kWp = floor(min(roof m² / m² per kWp, monthly kWh × 12 × daytime share / yield) × 10) / 10; generation = kWp × yield; savings = self-consumed kWh × tariff + exported kWh × export tariff − capital cost × annual maintenance rate.',
  };
}
export function gaps(p) {
  const items = [];
  if (!p.business.monthlyKwh) items.push('Monthly electricity consumption');
  if (!p.business.roofArea) items.push('Usable roof area');
  if (p.business.propertyRights === 'unknown') items.push('Property ownership or lease rights');
  if (!p.documents.some((d) => d.kind === 'electricity_bill' && d.status === 'reviewed'))
    items.push('Reviewed electricity bill');
  else if (
    !p.documents.some(
      (d) =>
        d.kind === 'electricity_bill' &&
        d.status === 'reviewed' &&
        d.verified?.monthlyKwh === p.business.monthlyKwh &&
        d.verified?.billAmount === p.business.billAmount,
    )
  )
    items.push('Electricity inputs differ from reviewed bill evidence');
  if (!p.documents.some((d) => d.kind === 'property_rights' && d.status === 'reviewed'))
    items.push('Property-rights evidence');
  return items;
}
export function offerMissing(o) {
  return ['equipment', 'scope', 'exclusions', 'paymentSchedule', 'warranty', 'maintenance']
    .filter((k) => !o[k])
    .concat(o.annualGeneration ? [] : ['annualGeneration']);
}
export function offerAnalysis(o, p) {
  const generation = o.annualGeneration || o.capacityKw * p.assumptions.yieldKwh;
  const consumed = Math.min(generation, p.business.monthlyKwh * 12 * p.business.daytimeShare);
  const savings =
    consumed * p.assumptions.tariff +
    Math.max(0, generation - consumed) * p.assumptions.exportTariff -
    o.price * p.assumptions.annualMaintenance;
  return {
    pricePerKw: o.price / o.capacityKw,
    generation,
    savings,
    missing: offerMissing(o),
    generationEstimated: !o.annualGeneration,
  };
}
export function checklist(p, product) {
  return product.documents.map((kind) => ({
    kind,
    ready: p.documents.some((d) => d.kind === kind && d.status === 'reviewed'),
    sample: p.documents.some((d) => d.kind === kind && d.status === 'reviewed' && d.sample),
  }));
}
export function nextAction(p) {
  if (gaps(p).length)
    return {
      title: 'Let’s fill in the gaps',
      description: `${gaps(p).length} items need your attention before we can move forward.`,
      screen: 'onboarding',
      owner: 'You',
    };
  const escalated = p.tasks.find(
    (t) =>
      t.status === 'open' &&
      (t.kind === 'service' ||
        Date.now() - new Date(t.createdAt || p.createdAt).getTime() > 7 * 86400000),
  );
  if (escalated)
    return {
      title: 'Your operator has a next step',
      description: `${escalated.title}. ${escalated.nextAction}`,
      screen: 'operator',
      owner: 'Operator',
    };
  if (p.milestones[0].status !== 'complete')
    return {
      title: 'Arrange a technical review',
      description:
        'An engineer needs to check roof structure, shading, and the grid connection. The demo operator can record a simulated review.',
      screen: 'operator',
      owner: 'Operator',
    };
  if (!p.selectedOfferId)
    return {
      title: 'Find the right solar partner',
      description: 'Compare the offers side by side, then choose one to take forward.',
      screen: 'assessment',
      owner: 'You',
    };
  if (p.milestones[2].status !== 'complete')
    return {
      title: 'Prepare your financing',
      description: 'Review your document checklist and prepare a reusable application package.',
      screen: 'financing',
      owner: 'You',
    };
  if (p.milestones[3].status !== 'complete')
    return {
      title: 'Review the commitment',
      description: 'Your explicit authorization is needed before the simulated contract step.',
      screen: 'execution',
      owner: 'You',
    };
  const next = p.milestones.find((m) => m.status !== 'complete');
  if (next)
    return {
      title: `Next up: ${next.title.toLowerCase()}`,
      description: 'Your operator can record the partner update and supporting evidence.',
      screen: 'execution',
      owner: next.owner,
    };
  return {
    title: 'See your solar in action',
    description: 'Record monthly generation and compare the outcome with the selected proposal.',
    screen: 'execution',
    owner: 'You',
  };
}
export function activity(p, action, actor, detail = '') {
  p.activity.unshift({ id: randomUUID(), at: new Date().toISOString(), action, actor, detail });
  p.updatedAt = new Date().toISOString();
}
export function completeMilestone(p, id, note) {
  const index = p.milestones.findIndex((m) => m.id === id);
  assert(index >= 0, 'Unknown milestone.');
  assert(
    p.milestones.slice(0, index).every((m) => m.status === 'complete'),
    'Complete the earlier milestones first.',
    409,
  );
  assert(p.milestones[index].status !== 'complete', 'This milestone is already complete.', 409);
  Object.assign(p.milestones[index], {
    status: 'complete',
    completedAt: new Date().toISOString(),
    note,
    simulated: true,
  });
}
export function extractBill(text) {
  const read = (patterns) => {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return Number(match[1].replace(/,/g, ''));
    }
    return null;
  };
  const monthlyKwh = read([
    /(?:consumption|energy used|units used|electricity usage|การใช้ไฟฟ้า)\s*[:=]?\s*([\d,]+(?:\.\d+)?)\s*(?:kwh|units|หน่วย)?/i,
    /([\d,]+(?:\.\d+)?)\s*kwh/i,
  ]);
  const billAmount = read([
    /(?:total due|total amount|amount due|bill amount|ยอดรวม)\s*[:=]?\s*(?:THB|฿)?\s*([\d,]+(?:\.\d+)?)/i,
  ]);
  return {
    ...(monthlyKwh != null ? { monthlyKwh } : {}),
    ...(billAmount != null ? { billAmount } : {}),
  };
}
export function extractOffer(text) {
  const read = (re) => {
    const m = text.match(re);
    return m ? Number(m[1].replace(/,/g, '')) : 0;
  };
  const line = (label) =>
    text.match(new RegExp(`^${label}\\s*:\\s*(.+)$`, 'im'))?.[1]?.trim() || '';
  return {
    supplier: line('Supplier'),
    capacityKw: read(/([\d,.]+)\s*kWp/i),
    price: read(/(?:price|total)\s*:\s*(?:THB|฿)?\s*([\d,.]+)/i),
    annualGeneration: read(/([\d,.]+)\s*kWh/i),
    equipment: line('Equipment'),
    scope: line('Scope'),
    exclusions: line('Exclusions'),
    paymentSchedule: line('Payment'),
    warranty: line('Warranty'),
    maintenance: line('Maintenance'),
  };
}
export function newProject(input, sample = false) {
  const now = new Date().toISOString();
  const p = {
    id: randomUUID(),
    sample,
    createdAt: now,
    updatedAt: now,
    version: 1,
    business: businessSchema.parse({
      name: input.name,
      sector: input.sector || 'Manufacturing',
      location: input.location || 'Bangkok, Thailand',
      contact: '',
      propertyRights: 'unknown',
      roofArea: 0,
      monthlyKwh: 0,
      billAmount: 0,
      daytimeShare: 0.75,
      budget: 0,
      financePreference: 'explore',
    }),
    assumptions: {
      market: 'Thailand',
      currency: 'THB',
      tariff: 4.5,
      exportTariff: 0,
      yieldKwh: 1400,
      costPerKw: 32000,
      annualMaintenance: 0.01,
      roofM2PerKw: 7,
      uncertainty: 0.2,
    },
    evidence: {},
    documents: [],
    offers: [],
    selectedOfferId: null,
    proposalBaseline: null,
    application: null,
    permissions: [],
    milestones: milestoneDefs.map(([id, title, owner]) => ({
      id,
      title,
      owner,
      status: 'pending',
      nextAction: `Arrange ${title.toLowerCase()} and record evidence.`,
    })),
    tasks: [],
    performance: [],
    activity: [],
  };
  activity(
    p,
    'Project created',
    'customer',
    sample ? 'Sample business and illustrative data.' : 'New solar project.',
  );
  return p;
}
export function seedProject() {
  const p = newProject(
    { name: 'Siam Craft Foods', sector: 'Food & beverage', location: 'Samut Prakan, Thailand' },
    true,
  );
  Object.assign(p.business, {
    contact: 'Narin · Business owner',
    propertyRights: 'owner',
    roofArea: 620,
    monthlyKwh: 12000,
    billAmount: 54000,
    daytimeShare: 0.78,
    budget: 500000,
    financePreference: 'loan',
  });
  const doc = {
    id: randomUUID(),
    name: 'Sample electricity bill.txt',
    kind: 'electricity_bill',
    mime: 'text/plain',
    size: 160,
    status: 'needs_review',
    sample: true,
    uploadedAt: p.createdAt,
    sourceText:
      'SAMPLE — NOT A REAL UTILITY BILL\nBusiness: Siam Craft Foods\nConsumption: 12,000 kWh\nTotal due: THB 54,000.00\nBilling period: September 2026',
    extracted: { monthlyKwh: 12000, billAmount: 54000 },
    verified: null,
  };
  p.documents.push(doc);
  p.evidence.monthlyKwh = {
    source: 'Sample onboarding entry; bill review pending',
    verified: false,
  };
  p.evidence.billAmount = {
    source: 'Sample onboarding entry; bill review pending',
    verified: false,
  };
  p.offers = [
    {
      id: randomUUID(),
      supplier: 'Sunward Energy',
      capacityKw: 80,
      price: 2560000,
      annualGeneration: 112000,
      equipment: 'Tier 1 mono panels · 580 W / string inverter',
      scope: 'Design, equipment, roof mounting, installation, commissioning',
      exclusions: 'Roof reinforcement and utility connection fees',
      paymentSchedule: '20% deposit · 60% delivery · 20% commissioning',
      warranty: '12-year product · 25-year panel performance · 5-year workmanship',
      maintenance: '2 visits per year included for 2 years',
      sample: true,
      source: 'Seeded sample proposal',
      relationship: 'Sample supplier; no commercial relationship',
    },
    {
      id: randomUUID(),
      supplier: 'Brightfield Solar',
      capacityKw: 85,
      price: 2805000,
      annualGeneration: 119000,
      equipment: 'N-type panels · 600 W / hybrid-ready inverter',
      scope: 'Design, equipment, installation, monitoring, commissioning',
      exclusions: 'Roof works and battery storage',
      paymentSchedule: '30% deposit · 50% delivery · 20% commissioning',
      warranty: '15-year product · 30-year panel performance · 5-year workmanship',
      maintenance: '3 years of annual inspections',
      sample: true,
      source: 'Seeded sample proposal',
      relationship: 'Sample supplier; no commercial relationship',
    },
    {
      id: randomUUID(),
      supplier: 'Roofline Renewables',
      capacityKw: 75,
      price: 2250000,
      annualGeneration: 105000,
      equipment: 'Mono panels · 550 W / string inverter',
      scope: 'Equipment and installation',
      exclusions: '',
      paymentSchedule: '40% deposit · 60% on completion',
      warranty: '12-year product · 25-year panel performance',
      maintenance: '',
      sample: true,
      source: 'Seeded sample proposal',
      relationship: 'Sample supplier; no commercial relationship',
    },
  ];
  p.tasks.push({
    id: randomUUID(),
    title: 'Confirm roof condition and shading',
    owner: 'Operator',
    status: 'open',
    nextAction: 'Arrange an engineer review; no technical evidence is available.',
    kind: 'technical',
  });
  return p;
}
export function viewProject(p) {
  return {
    ...p,
    tasks: p.tasks.map((t) => ({
      ...t,
      createdAt: t.createdAt || p.createdAt,
      stalled:
        t.status === 'open' &&
        Date.now() - new Date(t.createdAt || p.createdAt).getTime() > 7 * 86400000,
    })),
    assessment: calculate(p),
    gaps: gaps(p),
    nextAction: nextAction(p),
    offers: p.offers.map((o) => ({ ...o, analysis: offerAnalysis(o, p) })),
    financeProducts: financeProducts.map((f) => {
      const offer = p.offers.find((o) => o.id === p.selectedOfferId);
      const price = offer?.price || calculate(p).cost;
      return {
        ...f,
        principal: price * (1 - f.deposit),
        depositAmount: price * f.deposit,
        monthlyPayment: payment(price * (1 - f.deposit), f.apr, f.months),
        estimatedEligible:
          p.business.monthlyKwh >= f.minKwh && p.business.propertyRights !== 'unknown',
        checklist: checklist(p, f),
      };
    }),
  };
}
