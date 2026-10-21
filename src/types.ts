export type Screen =
  'dashboard' | 'onboarding' | 'assessment' | 'financing' | 'execution' | 'operator';
export type Role = 'customer' | 'operator';
export type Business = {
  name: string;
  sector: string;
  location: string;
  contact: string;
  propertyRights: string;
  roofArea: number;
  monthlyKwh: number;
  billAmount: number;
  daytimeShare: number;
  budget: number;
  financePreference: string;
};
export type Assumptions = {
  market: string;
  currency: string;
  tariff: number;
  exportTariff: number;
  yieldKwh: number;
  costPerKw: number;
  annualMaintenance: number;
  roofM2PerKw: number;
  uncertainty: number;
};
export type Evidence = {
  source: string;
  verified: boolean;
  verification?: string;
  sample?: boolean;
  documentId?: string;
};
export type Document = {
  id: string;
  name: string;
  kind: string;
  mime: string;
  size: number;
  status: string;
  sample: boolean;
  uploadedAt: string;
  sourceText: string;
  extractionNote?: string;
  extracted: { monthlyKwh?: number; billAmount?: number };
  verified: { monthlyKwh?: number; billAmount?: number } | null;
};
export type OfferValues = {
  supplier: string;
  capacityKw: number;
  price: number;
  annualGeneration: number;
  equipment: string;
  scope: string;
  exclusions: string;
  paymentSchedule: string;
  warranty: string;
  maintenance: string;
};
export type Offer = OfferValues & {
  id: string;
  sample: boolean;
  source: string;
  relationship: string;
  analysis: {
    pricePerKw: number;
    generation: number;
    savings: number;
    missing: string[];
    generationEstimated: boolean;
  };
};
export type FinanceProduct = {
  id: string;
  name: string;
  provider: string;
  apr: number;
  months: number;
  deposit: number;
  sample: boolean;
  minKwh: number;
  principal: number;
  depositAmount: number;
  monthlyPayment: number;
  estimatedEligible: boolean;
  checklist: { kind: string; ready: boolean; sample: boolean }[];
};
export type Milestone = {
  id: string;
  title: string;
  owner: string;
  status: string;
  note?: string;
  completedAt?: string;
  nextAction: string;
  simulated?: boolean;
};
export type Task = {
  id: string;
  title: string;
  owner: string;
  status: string;
  nextAction: string;
  resolution?: string;
  kind: string;
  stalled: boolean;
  createdAt: string;
};
export type ProjectSummary = { id: string; name: string; location: string; sample: boolean };
export type Project = {
  id: string;
  version: number;
  sample: boolean;
  business: Business;
  assumptions: Assumptions;
  documents: Document[];
  offers: Offer[];
  selectedOfferId: string | null;
  evidence: Record<string, Evidence>;
  assessment: {
    capacityKw: number;
    generation: number;
    cost: number;
    maintenance: number;
    annualSavings: number;
    paybackYears: number | null;
    lowSavings: number;
    highSavings: number;
    annualBill: number;
    formula: string;
    selfConsumed: number;
    exported: number;
  };
  proposalBaseline: {
    offer: OfferValues;
    analysis: Offer['analysis'];
    assumptions: Assumptions;
    selectedAt: string;
  } | null;
  application: {
    id: string;
    productId: string;
    status: string;
    simulated: boolean;
    decisionNote?: string;
  } | null;
  permissions: { id: string; action: string; status: string }[];
  financeProducts: FinanceProduct[];
  milestones: Milestone[];
  gaps: string[];
  nextAction: { title: string; description: string; owner: string; screen: Screen };
  tasks: Task[];
  activity: { id: string; at: string; action: string; actor: string; detail: string }[];
  performance: {
    id: string;
    month: string;
    generation: number;
    actualCost: number;
    issue: string;
    expectedGeneration: number;
  }[];
};
