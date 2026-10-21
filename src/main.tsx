import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Building2,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  Clock3,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Leaf,
  MapPin,
  Menu,
  Plus,
  SearchCheck,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  TrendingUp,
  Upload,
  Wallet,
  Wrench,
  X,
  Zap,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import type { Project, ProjectSummary, Screen, Role, Document, OfferValues } from './types';
import './styles.css';

const screens: { id: Screen; label: string; icon: typeof Sun; short: string }[] = [
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard, short: 'Overview' },
  { id: 'onboarding', label: 'Business & documents', icon: FolderOpen, short: 'Your business' },
  { id: 'assessment', label: 'Solar & suppliers', icon: Sun, short: 'Solar assessment' },
  { id: 'financing', label: 'Financing', icon: Wallet, short: 'Financing' },
  {
    id: 'execution',
    label: 'Installation & impact',
    icon: TrendingUp,
    short: 'Installation & impact',
  },
  {
    id: 'operator',
    label: 'Operator workspace',
    icon: SlidersHorizontal,
    short: 'Operator workspace',
  },
];
const documentNames: Record<string, string> = {
  electricity_bill: 'Electricity bill',
  property_rights: 'Property rights',
  business_registration: 'Business registration',
  financial_statement: 'Financial statement',
  technical_report: 'Technical report',
  other: 'Other document',
};
const number = (n: number, digits = 0) =>
  new Intl.NumberFormat('en', { maximumFractionDigits: digits }).format(n);
const money = (n: number, currency = 'THB') =>
  new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    maximumFractionDigits: 0,
  }).format(n);
const date = (s: string) =>
  new Date(s).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Bangkok',
  });
const fields = (event: FormEvent<HTMLFormElement>) => {
  event.preventDefault();
  return Object.fromEntries(new FormData(event.currentTarget));
};
async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}
function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'green' | 'amber' | 'neutral';
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
function Button({
  children,
  onClick,
  secondary = false,
  disabled = false,
  type = 'button',
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  secondary?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit';
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${secondary ? 'button secondary' : 'button'} ${className}`}
    >
      {children}
    </button>
  );
}
function Field({
  label,
  name,
  value,
  type = 'text',
  step,
  min,
  max,
  required = true,
  hint,
}: {
  label: string;
  name: string;
  value?: string | number;
  type?: string;
  step?: string;
  min?: number;
  max?: number;
  required?: boolean;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        aria-label={label}
        name={name}
        type={type}
        defaultValue={value}
        step={step}
        min={min}
        max={max}
        required={required}
      />
      {hint && <small>{hint}</small>}
    </label>
  );
}
function Select({
  label,
  name,
  value,
  options,
}: {
  label: string;
  name: string;
  value?: string;
  options: Record<string, string>;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select aria-label={label} name={name} defaultValue={value}>
        {Object.entries(options).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
function Note({ children, warning = false }: { children: ReactNode; warning?: boolean }) {
  return (
    <div className={`note ${warning ? 'warning' : ''}`}>
      <AlertCircle size={16} />
      <div>{children}</div>
    </div>
  );
}
function Empty({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="empty">
      <Sun size={28} />
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
const FeedbackContext = createContext<string | null>(null);
function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const errorMessage = useContext(FeedbackContext);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog ref={ref} className="modal" onCancel={close} aria-label={title}>
      <div className="modal-header">
        <h2>{title}</h2>
        <button className="icon-button" aria-label="Close dialog" onClick={close}>
          <X size={20} />
        </button>
      </div>
      {errorMessage && <Note warning>{errorMessage}</Note>}
      {children}
    </dialog>
  );
}
function SolarIllustration() {
  return (
    <svg
      className="solar-illustration"
      viewBox="0 0 500 290"
      role="img"
      aria-label="Illustration of rooftop solar panels in a sunny landscape"
    >
      <defs>
        <linearGradient id="ground" x2="1" y2="1">
          <stop stopColor="#719465" />
          <stop offset="1" stopColor="#466542" />
        </linearGradient>
        <linearGradient id="panel" x2="1" y2="1">
          <stop stopColor="#385647" />
          <stop offset="1" stopColor="#1a342a" />
        </linearGradient>
        <pattern id="cells" width="19" height="24" patternUnits="userSpaceOnUse">
          <rect width="19" height="24" fill="url(#panel)" />
          <path d="M0 0h19v24H0Z" fill="none" stroke="#90b39b" strokeWidth=".7" />
        </pattern>
      </defs>
      <circle cx="374" cy="65" r="37" fill="#e0ec9f" />
      <circle cx="374" cy="65" r="52" fill="none" stroke="#d4e7a1" opacity=".16" />
      <path d="M5 255Q190 121 500 197V290H5Z" fill="#719467" opacity=".6" />
      <path d="M0 287Q130 208 240 239T500 230V290H0Z" fill="url(#ground)" />
      <path d="M100 190l187-70 127 80-184 70Z" fill="#253f31" opacity=".3" />
      <path d="M109 166l171-64 119 73-173 66Z" fill="#e4dfca" />
      <path d="M109 166v50l117 71v-46Z" fill="#a9b59a" />
      <path d="M226 241l173-66v49l-173 63Z" fill="#d7dec7" />
      <path d="M97 163l183-70 130 78-185 72Z" fill="#d2d7bb" />
      <g transform="matrix(.96,-.36,.68,.41,117,158)">
        <rect x="-3" y="-3" width="174" height="168" rx="2" fill="#bacdb4" />
        <rect width="168" height="162" fill="url(#cells)" />
        <path d="M56 0v162M112 0v162M0 81h168" stroke="#c4dbc3" strokeWidth="3" />
      </g>
      <path d="M251 254v22l22-8v-22ZM296 237v23l22-9v-22ZM340 220v23l22-9v-22Z" fill="#758d74" />
      <path d="M133 193v27l35 21v-27Z" fill="#7e947a" />
      <path d="M438 202v48" stroke="#46573b" strokeWidth="5" />
      <ellipse cx="438" cy="186" rx="22" ry="33" fill="#a7be7c" />
      <path d="M63 226v28" stroke="#46573b" strokeWidth="4" />
      <ellipse cx="63" cy="215" rx="16" ry="23" fill="#b3c78e" />
      <path
        d="M315 48h18m-9-9v18M80 108h12m-6-6v12"
        stroke="#d8e9aa"
        strokeWidth="2"
        opacity=".7"
      />
    </svg>
  );
}

function App() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [p, setProject] = useState<Project | null>(null);
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [role, setRole] = useState<Role>('customer');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [modal, setModal] = useState<
    'new' | 'issue' | 'assumptions' | 'offer' | 'authorization' | null
  >(null);
  const [reviewDoc, setReviewDoc] = useState<Document | null>(null);
  const [authorization, setAuthorization] = useState<'submit_application' | 'commit_contract'>(
    'submit_application',
  );
  const [mobileNav, setMobileNav] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 760px)').matches);
  const [offerDraft, setOfferDraft] = useState<OfferValues | null>(null);
  const [offerText, setOfferText] = useState('');
  const [offerEditKey, setOfferEditKey] = useState(0);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function notify(text: string, error = false) {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setMessage({ text, error });
    if (!error) noticeTimer.current = setTimeout(() => setMessage(null), 5500);
  }
  async function load(id?: string) {
    setLoading(true);
    try {
      const [list, session] = await Promise.all([
        api<ProjectSummary[]>('/projects'),
        api<{ role: Role }>('/session'),
      ]);
      setProjects(list);
      setRole(session.role);
      const chosen = id || localStorage.getItem('minusone-project');
      const target = list.find((x) => x.id === chosen) || list[0];
      if (target) {
        setProject(await api<Project>(`/projects/${target.id}`));
        localStorage.setItem('minusone-project', target.id);
      }
    } catch (error) {
      notify((error as Error).message, true);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    return () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, []);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 760px)');
    const resize = () => setIsMobile(query.matches);
    query.addEventListener('change', resize);
    return () => query.removeEventListener('change', resize);
  }, []);
  function go(next: Screen) {
    setScreen(next);
    setMobileNav(false);
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    });
  }
  async function update(
    path: string,
    body: unknown,
    method = 'POST',
    success = 'Changes saved.',
    close = false,
  ) {
    if (!p) return null;
    setBusy(true);
    try {
      const updated = await api<Project>(`/projects/${p.id}${path}`, {
        method,
        headers: { 'x-project-version': String(p.version) },
        body: body instanceof FormData ? body : body == null ? undefined : JSON.stringify(body),
      });
      setProject(updated);
      setProjects((list) =>
        list.map((x) =>
          x.id === updated.id
            ? { ...x, name: updated.business.name, location: updated.business.location }
            : x,
        ),
      );
      notify(success);
      if (close) {
        setModal(null);
        setReviewDoc(null);
      }
      return updated;
    } catch (error) {
      notify((error as Error).message, true);
      return null;
    } finally {
      setBusy(false);
    }
  }
  async function changeRole(next: Role) {
    setBusy(true);
    try {
      await api('/session', { method: 'POST', body: JSON.stringify({ role: next }) });
      setRole(next);
      notify(`Switched to ${next} demo role.`);
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  }
  async function createProject(event: FormEvent<HTMLFormElement>) {
    const input = fields(event);
    setBusy(true);
    try {
      const next = await api<Project>('/projects', { method: 'POST', body: JSON.stringify(input) });
      setModal(null);
      await load(next.id);
      go('onboarding');
      notify('Your project is ready. Let’s add your business details.');
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  }
  async function authorize(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!p) return;
    setBusy(true);
    try {
      const authorized = await api<Project>(`/projects/${p.id}/authorizations`, {
        method: 'POST',
        headers: { 'x-project-version': String(p.version) },
        body: JSON.stringify({ action: authorization, consent: true }),
      });
      setProject(authorized);
      const permission = authorized.permissions
        .filter((x) => x.action === authorization && x.status === 'authorized')
        .at(-1)!;
      const result = await api<Project>(`/projects/${p.id}/actions`, {
        method: 'POST',
        headers: { 'x-project-version': String(authorized.version) },
        body: JSON.stringify({ permissionId: permission.id }),
      });
      setProject(result);
      setModal(null);
      notify(
        authorization === 'submit_application'
          ? 'Simulated application submitted. The operator can record a sample decision.'
          : 'Simulated contract recorded. Installation is next.',
      );
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  }
  function askAuthorization(action: typeof authorization) {
    setAuthorization(action);
    setModal('authorization');
  }
  const b = p?.business;
  const currency = p?.assumptions.currency || 'THB';
  const cash = (value: number) => money(value, currency);
  const completed = p?.milestones.filter((m) => m.status === 'complete').length || 0;
  const selected = p?.offers.find((o) => o.id === p.selectedOfferId);
  const appProduct = p?.financeProducts.find((f) => f.id === p.application?.productId);
  const isCustomer = role === 'customer';
  const canEdit = isCustomer && !p?.selectedOfferId;
  const statusLabel =
    completed === 7
      ? 'Solar in operation'
      : completed >= 4
        ? 'Installation in progress'
        : completed >= 2
          ? 'Financing in progress'
          : 'Planning your upgrade';
  const customerHint = !isCustomer && (
    <Note>Switch to the customer demo role to edit your project or authorize an action.</Note>
  );

  return (
    <FeedbackContext.Provider value={message?.error ? message.text : null}>
      <div className="app-shell">
        <aside className={`sidebar ${mobileNav ? 'open' : ''}`} inert={isMobile && !mobileNav}>
          <a
            className="brand"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              go('dashboard');
            }}
          >
            <span className="brand-symbol">
              <span />1
            </span>
            minusone<span className="brand-dot">.</span>
          </a>
          <div className="workspace-label">YOUR ENERGY WORKSPACE</div>
          <nav aria-label="Main navigation">
            {screens.slice(0, 5).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => go(id)}
                className={`nav-item ${screen === id ? 'active' : ''}`}
                aria-current={screen === id ? 'page' : undefined}
              >
                <Icon size={19} />
                <span>{label}</span>
                {id === 'onboarding' && !!p?.gaps.length && (
                  <span className="nav-count">{p.gaps.length}</span>
                )}
              </button>
            ))}
          </nav>
          <div className="nav-divider" />
          <button
            className={`nav-item ${screen === 'operator' ? 'active' : ''}`}
            onClick={() => go('operator')}
          >
            <SlidersHorizontal size={19} />
            <span>Operator workspace</span>
            {!!p?.tasks.filter((t) => t.status === 'open').length && (
              <span className="operator-dot" />
            )}
          </button>
          <div className="sidebar-bottom">
            <div className="support-card">
              <div className="support-icon">
                <Leaf size={20} />
              </div>
              <h3>A little help, a big step.</h3>
              <p>Questions about your upgrade? Your operator is here.</p>
              <button onClick={() => setModal('issue')}>
                Ask your operator <ArrowUpRight size={16} />
              </button>
            </div>
            <div className="profile">
              <span className="avatar">{role === 'customer' ? 'SC' : 'OP'}</span>
              <div>
                <strong>{role === 'customer' ? 'Business workspace' : 'Demo operator'}</strong>
                <span>Thailand · {currency}</span>
              </div>
              <ShieldCheck size={17} />
            </div>
          </div>
        </aside>
        {isMobile && mobileNav && (
          <button
            className="nav-backdrop"
            aria-label="Close navigation"
            onClick={() => setMobileNav(false)}
          />
        )}
        <div className="main-shell">
          <header className="topbar">
            <div className="breadcrumb">
              <button
                className="icon-button mobile-menu"
                aria-label="Open navigation"
                aria-expanded={mobileNav}
                onClick={() => setMobileNav(!mobileNav)}
              >
                <Menu size={20} />
              </button>
              <span>Workspace</span>
              <ChevronRight size={14} />
              <strong>{screens.find((s) => s.id === screen)?.short}</strong>
            </div>
            <div className="topbar-actions">
              <span className="demo-label">
                <span /> Demo workspace
              </span>
              <label className="role-select">
                <span className="sr-only">Demo role</span>
                <select
                  aria-label="Demo role"
                  value={role}
                  onChange={(e) => void changeRole(e.target.value as Role)}
                  disabled={busy}
                >
                  <option value="customer">Customer view</option>
                  <option value="operator">Operator view</option>
                </select>
              </label>
              <button
                className="icon-button notification"
                aria-label="View open operator tasks"
                onClick={() => go('operator')}
              >
                <Bell size={19} />
                {!!p?.tasks.some((t) => t.status === 'open') && <i />}
              </button>
            </div>
          </header>
          <main>
            {loading ? (
              <div className="loading">
                <span className="loading-sun">
                  <Sun size={32} />
                </span>
                <h2>Bringing your workspace together…</h2>
              </div>
            ) : !p || !b ? (
              <Empty title="Let’s start something brighter">
                <p>Create your first business solar project.</p>
                <Button onClick={() => setModal('new')}>
                  Create project <Plus size={16} />
                </Button>
                <Button secondary onClick={() => void load()}>
                  Retry connection
                </Button>
              </Empty>
            ) : (
              <>
                <div className="page-heading">
                  <div>
                    <div className="eyebrow">
                      {screen === 'dashboard'
                        ? 'SMALLER FOOTPRINT. BIGGER POSSIBILITIES.'
                        : 'YOUR PATH TO SOLAR'}
                    </div>
                    <h1>
                      {screen === 'dashboard'
                        ? 'Your next chapter is brighter.'
                        : screens.find((s) => s.id === screen)?.short}
                    </h1>
                    <p>
                      {screen === 'dashboard'
                        ? 'One clear path from energy bills to a solar-powered business.'
                        : screen === 'onboarding'
                          ? 'A few details today. A more informed decision tomorrow.'
                          : screen === 'assessment'
                            ? 'Understand the possibilities. Choose a partner with confidence.'
                            : screen === 'financing'
                              ? 'Find a way forward that works for your cash flow.'
                              : screen === 'execution'
                                ? 'From the first site visit to the energy you generate.'
                                : 'Keep every project moving, with a human in the loop.'}
                    </p>
                  </div>
                  <Button secondary onClick={() => setModal('new')} disabled={busy || !isCustomer}>
                    <Plus size={16} /> New project
                  </Button>
                </div>
                <div className="project-bar">
                  <div className="project-icon">
                    <Building2 size={19} />
                  </div>
                  <label className="project-picker">
                    <span className="sr-only">Active project</span>
                    <select
                      aria-label="Active project"
                      value={p.id}
                      disabled={busy}
                      onChange={(e) => {
                        setReviewDoc(null);
                        setModal(null);
                        void load(e.target.value);
                      }}
                    >
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                          {project.sample ? ' · Sample project' : ''}
                        </option>
                      ))}
                    </select>
                    <span>
                      <MapPin size={12} />
                      {b.location}
                    </span>
                  </label>
                  <span className="project-bar-spacer" />
                  <Badge tone="green">
                    <span className="tiny-dot" />
                    {statusLabel}
                  </Badge>
                  <span className="project-ref">MO–{p.id.slice(0, 4).toUpperCase()}</span>
                </div>

                {screen === 'dashboard' && (
                  <>
                    <section className="hero">
                      <div className="hero-copy">
                        <span className="hero-tag">
                          <Sun size={14} /> YOUR SOLAR POTENTIAL
                        </span>
                        <h2>
                          Less energy spend.
                          <br />
                          More room to grow.
                        </h2>
                        <p>
                          Your roof could be your next business advantage.
                          <br className="desktop-break" /> Let’s find out what’s possible, together.
                        </p>
                        <button onClick={() => go('assessment')}>
                          Explore your solar potential <ArrowUpRight size={17} />
                        </button>
                        <span className="hero-caption">
                          Preliminary estimates · Built around your business
                        </span>
                      </div>
                      <SolarIllustration />
                      <div className="hero-floating">
                        <span className="floating-sun">
                          <Sun size={18} />
                        </span>
                        <div>
                          <strong>{number(p.assessment.capacityKw, 1)} kWp</strong>
                          <span>Indicative solar capacity</span>
                        </div>
                      </div>
                    </section>
                    <div className="stats-grid">
                      <Stat
                        icon={Wallet}
                        label="Potential annual savings"
                        value={cash(p.assessment.annualSavings)}
                        sub={`${cash(p.assessment.lowSavings)}–${cash(p.assessment.highSavings)} indicative range`}
                        trend="Less spent. More possible."
                      />
                      <Stat
                        icon={Zap}
                        label="Estimated annual generation"
                        value={
                          <>
                            {number(p.assessment.generation)} <small>kWh</small>
                          </>
                        }
                        sub="Based on roof area and daytime demand"
                        trend="Energy from your own roof"
                      />
                      <Stat
                        icon={Clock3}
                        label="Simple payback estimate"
                        value={
                          <>
                            {p.assessment.paybackYears ? number(p.assessment.paybackYears, 1) : '—'}{' '}
                            <small>years</small>
                          </>
                        }
                        sub="Before financing, taxes, and degradation"
                        trend="A longer-term business advantage"
                      />
                    </div>
                    <section className="card journey-card">
                      <div className="section-heading">
                        <div>
                          <h2>Your solar journey</h2>
                          <p>Every step, connected. Every decision, yours.</p>
                        </div>
                        <span className="muted small">{completed} of 7 milestones complete</span>
                      </div>
                      <div className="journey">
                        {p.milestones.map((m, index) => (
                          <button
                            className={`journey-step ${m.status === 'complete' ? 'done' : index === completed ? 'current' : ''}`}
                            key={m.id}
                            onClick={() =>
                              go(
                                index < 1
                                  ? 'onboarding'
                                  : index === 1
                                    ? 'assessment'
                                    : index === 2
                                      ? 'financing'
                                      : 'execution',
                              )
                            }
                          >
                            <span className="step-track">
                              <span className="step-number">
                                {m.status === 'complete' ? (
                                  <Check size={15} />
                                ) : (
                                  String(index + 1).padStart(2, '0')
                                )}
                              </span>
                            </span>
                            <strong>{m.title}</strong>
                            <span>
                              {m.status === 'complete'
                                ? 'Complete · demo'
                                : index === completed
                                  ? 'In progress'
                                  : 'Coming up'}
                            </span>
                          </button>
                        ))}
                      </div>
                    </section>
                    <div className="dashboard-columns">
                      <div className="dashboard-left">
                        <section className="card next-card">
                          <div className="section-heading">
                            <span className="eyebrow green-text">
                              <Sparkles size={14} /> YOUR NEXT BEST STEP
                            </span>
                            <Badge tone="amber">Action needed</Badge>
                          </div>
                          <h2>{p.nextAction.title}</h2>
                          <p>{p.nextAction.description}</p>
                          <div className="next-bottom">
                            <Button onClick={() => go(p.nextAction.screen)}>
                              {p.nextAction.screen === 'onboarding'
                                ? 'Review your documents'
                                : 'Take the next step'}
                              <ArrowRight size={16} />
                            </Button>
                            <span className="owner">
                              <span className="mini-avatar">{p.nextAction.owner.slice(0, 1)}</span>
                              Owner: {p.nextAction.owner}
                            </span>
                          </div>
                        </section>
                        <section className="card activity-card">
                          <div className="section-heading">
                            <h2>Recent activity</h2>
                            <button
                              className="text-button"
                              onClick={() => setShowAllActivity(!showAllActivity)}
                            >
                              {showAllActivity ? 'Show less' : 'View all'} <ArrowRight size={14} />
                            </button>
                          </div>
                          <ActivityList p={p} count={showAllActivity ? 100 : 3} />
                        </section>
                      </div>
                      <section className="card ready-card">
                        <div className="section-heading">
                          <h2>A strong foundation</h2>
                          <ClipboardCheck size={20} />
                        </div>
                        <p className="muted">The right information makes the next steps easier.</p>
                        <div className="readiness-list">
                          {[
                            {
                              title: 'Business profile',
                              ready: !!b.monthlyKwh && !!b.roofArea,
                              text: 'Your business and energy needs',
                            },
                            {
                              title: 'Electricity bill',
                              ready: p.documents.some(
                                (d) => d.kind === 'electricity_bill' && d.status === 'reviewed',
                              ),
                              text: 'Reviewed consumption and costs',
                            },
                            {
                              title: 'Property rights',
                              ready: p.documents.some(
                                (d) => d.kind === 'property_rights' && d.status === 'reviewed',
                              ),
                              text: 'Permission to make an upgrade',
                            },
                          ].map((item) => (
                            <div key={item.title}>
                              <span className={`check-circle ${item.ready ? 'complete' : ''}`}>
                                {item.ready ? <Check size={13} /> : <span />}
                              </span>
                              <div>
                                <strong>{item.title}</strong>
                                <span>{item.text}</span>
                              </div>
                              {item.ready ? (
                                <Badge tone="green">Ready</Badge>
                              ) : (
                                <Badge tone="amber">To do</Badge>
                              )}
                            </div>
                          ))}
                        </div>
                        <button className="text-button" onClick={() => go('onboarding')}>
                          View project details <ArrowRight size={15} />
                        </button>
                        <div className="quiet-disclaimer">
                          <ShieldCheck size={17} />
                          <p>You stay in control. We ask before any submission or commitment.</p>
                        </div>
                      </section>
                    </div>
                    <div className="footer-note">
                      <Leaf size={15} />
                      <span>A better energy future starts with one less thing on your plate.</span>
                      <span>MinusOne · Thailand pilot</span>
                    </div>
                  </>
                )}

                {screen === 'onboarding' && (
                  <div className="stack">
                    {customerHint}
                    {p.selectedOfferId && (
                      <Note>
                        Your estimate inputs are locked to the selected proposal. Clear the supplier
                        selection on the solar screen to revise them before contracting.
                      </Note>
                    )}
                    <div className="two-columns">
                      <section className="card">
                        <div className="section-heading">
                          <div>
                            <h2>Your business, at a glance</h2>
                            <p>Use actual figures when they’re available.</p>
                          </div>
                          <Building2 size={20} />
                        </div>
                        <form
                          key={`business-${p.id}-${p.version}`}
                          onSubmit={(e) =>
                            void update(
                              '/business',
                              fields(e),
                              'PUT',
                              'Business details saved. Technical review must be repeated.',
                            )
                          }
                        >
                          <fieldset disabled={busy || !canEdit}>
                            <div className="form-grid">
                              <Field label="Business name" name="name" value={b.name} />
                              <Field label="Industry" name="sector" value={b.sector} />
                              <Field label="Location" name="location" value={b.location} />
                              <Field
                                label="Contact person"
                                name="contact"
                                value={b.contact}
                                required={false}
                              />
                              <Select
                                label="Property rights"
                                name="propertyRights"
                                value={b.propertyRights}
                                options={{
                                  unknown: 'To be confirmed',
                                  owner: 'Own the premises',
                                  lease: 'Lease with suitable rights',
                                }}
                              />
                              <Field
                                label="Usable roof area (m²)"
                                name="roofArea"
                                value={b.roofArea}
                                type="number"
                                min={0}
                                step="any"
                              />
                              <Field
                                label="Monthly consumption (kWh)"
                                name="monthlyKwh"
                                value={b.monthlyKwh}
                                type="number"
                                min={0}
                                step="any"
                              />
                              <Field
                                label={`Monthly bill (${currency})`}
                                name="billAmount"
                                value={b.billAmount}
                                type="number"
                                min={0}
                                step="any"
                              />
                              <Field
                                label="Daytime consumption share"
                                name="daytimeShare"
                                value={b.daytimeShare}
                                type="number"
                                min={0}
                                max={1}
                                step="0.01"
                                hint="0.78 means 78% of consumption occurs during the day."
                              />
                              <Field
                                label={`Available upfront budget (${currency})`}
                                name="budget"
                                value={b.budget}
                                type="number"
                                min={0}
                                step="any"
                              />
                              <Select
                                label="Financing preference"
                                name="financePreference"
                                value={b.financePreference}
                                options={{
                                  explore: 'Explore my options',
                                  loan: 'Prefer financing',
                                  cash: 'Prefer own funds',
                                }}
                              />
                            </div>
                            <div className="form-footer">
                              <Button type="submit" disabled={busy || !canEdit}>
                                Save business details <Check size={16} />
                              </Button>
                              <small>Customer inputs, pending technical verification.</small>
                            </div>
                          </fieldset>
                        </form>
                      </section>
                      <section className="card evidence-card">
                        <div className="section-heading">
                          <h2>What we know</h2>
                          <SearchCheck size={20} />
                        </div>
                        <p className="muted">Every number should have a story behind it.</p>
                        {Object.entries(p.evidence).length ? (
                          Object.entries(p.evidence).map(([key, evidence]) => (
                            <div className="evidence-item" key={key}>
                              <strong>
                                {(
                                  {
                                    monthlyKwh: 'Monthly consumption',
                                    billAmount: 'Electricity cost',
                                    roofArea: 'Roof area',
                                    daytimeShare: 'Daytime share',
                                    propertyRights: 'Property rights',
                                  } as Record<string, string>
                                )[key] || key}
                              </strong>
                              <span>{evidence.source}</span>
                              <Badge tone={evidence.verified ? 'green' : 'amber'}>
                                {evidence.verified ? 'Customer reviewed' : 'Not verified'}
                                {evidence.sample ? ' · sample' : ''}
                              </Badge>
                            </div>
                          ))
                        ) : (
                          <Empty title="Your evidence starts here">
                            Add a bill or enter your business details.
                          </Empty>
                        )}
                        <Note>
                          Customer review confirms the entered values. It does not replace an
                          engineer’s technical assessment or a partner’s document checks.
                        </Note>
                      </section>
                    </div>
                    <section className="card">
                      <div className="section-heading">
                        <div>
                          <h2>Documents that move you forward</h2>
                          <p>
                            Upload a bill, check the extracted values, and correct anything that
                            needs it.
                          </p>
                        </div>
                        <Badge>
                          {p.documents.filter((d) => d.status === 'reviewed').length} reviewed
                        </Badge>
                      </div>
                      <form
                        className="upload-form"
                        onSubmit={(e) => {
                          e.preventDefault();
                          const form = e.currentTarget;
                          const data = new FormData(form);
                          void update(
                            '/documents',
                            data,
                            'POST',
                            'Document uploaded. Review the extracted information.',
                          ).then((result) => {
                            if (result) {
                              form.reset();
                              setReviewDoc(result.documents.at(-1)!);
                            }
                          });
                        }}
                      >
                        <div className="upload-zone">
                          <Upload size={25} />
                          <strong>Add your project documents</strong>
                          <span>PDF, TXT, CSV, PNG, or JPEG · Up to 5 MB</span>
                          <input
                            aria-label="Upload document"
                            type="file"
                            name="file"
                            required
                            accept=".pdf,.txt,.csv,.png,.jpg,.jpeg"
                            disabled={!isCustomer || busy}
                          />
                        </div>
                        <div className="upload-options">
                          <Select label="Document type" name="kind" options={documentNames} />
                          <Button type="submit" disabled={busy || !isCustomer}>
                            <Upload size={16} /> Upload document
                          </Button>
                        </div>
                      </form>
                      <div className="sample-tools">
                        <span>
                          <Sparkles size={14} /> Exploring the demo?
                        </span>
                        <select id="sample-kind" aria-label="Sample document type">
                          {Object.entries(documentNames)
                            .filter(
                              ([kind]) => !p.documents.some((d) => d.kind === kind && d.sample),
                            )
                            .map(([kind, name]) => (
                              <option key={kind} value={kind}>
                                {name}
                              </option>
                            ))}
                        </select>
                        <button
                          className="text-button"
                          disabled={busy || !isCustomer}
                          onClick={() => {
                            const el = document.getElementById('sample-kind') as HTMLSelectElement;
                            if (el.value)
                              void update(
                                '/documents/sample',
                                { kind: el.value },
                                'POST',
                                'Sample document added. Review it to continue.',
                              );
                          }}
                        >
                          Add sample document <Plus size={14} />
                        </button>
                      </div>
                      <div className="document-list">
                        {p.documents.map((doc) => (
                          <div className="document-row" key={doc.id}>
                            <div className="file-icon">
                              <FileText size={20} />
                            </div>
                            <div className="document-info">
                              <strong>{doc.name}</strong>
                              <span>
                                {documentNames[doc.kind]} · {date(doc.uploadedAt)} ·{' '}
                                {doc.sample
                                  ? 'Sample document'
                                  : `${number(doc.size / 1024, 1)} KB`}
                              </span>
                            </div>
                            <Badge tone={doc.status === 'reviewed' ? 'green' : 'amber'}>
                              {doc.status === 'reviewed' ? 'Reviewed' : 'Needs review'}
                            </Badge>
                            <button className="text-button" onClick={() => setReviewDoc(doc)}>
                              {doc.status === 'reviewed' ? 'View' : 'Review'}
                              <ChevronRight size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                )}

                {screen === 'assessment' && (
                  <div className="stack">
                    <div className="section-heading">
                      <Note>
                        Preliminary estimate · No roof survey, structural analysis, grid approval,
                        or engineering sign-off has been performed. Thailand tariff and yield inputs
                        are illustrative, not official rates.
                      </Note>
                      <Button secondary onClick={() => setModal('assumptions')}>
                        <Settings2 size={16} /> Assumptions
                      </Button>
                    </div>
                    <div className="stats-grid">
                      <Stat
                        icon={Sun}
                        label="Indicative system size"
                        value={
                          <>
                            {number(p.assessment.capacityKw, 1)} <small>kWp</small>
                          </>
                        }
                        sub={`${number(b.roofArea)} m² roof · ${number(b.daytimeShare * 100)}% daytime use`}
                      />
                      <Stat
                        icon={Wallet}
                        label="Indicative capital cost"
                        value={cash(p.assessment.cost)}
                        sub={`${cash(p.assumptions.costPerKw)} per kWp assumed`}
                      />
                      <Stat
                        icon={TrendingUp}
                        label="Potential annual savings"
                        value={cash(p.assessment.annualSavings)}
                        sub={`${cash(p.assessment.lowSavings)}–${cash(p.assessment.highSavings)} uncertainty range`}
                      />
                    </div>
                    <section className="card">
                      <div className="section-heading">
                        <div>
                          <h2>Know what’s behind the estimate</h2>
                          <p>Transparent inputs. Reproducible calculations.</p>
                        </div>
                        <Badge tone="amber">Preliminary</Badge>
                      </div>
                      <div className="calculation-grid">
                        <div>
                          <span>Annual generation</span>
                          <strong>{number(p.assessment.generation)} kWh</strong>
                          <small>
                            {number(p.assessment.capacityKw, 1)} kWp ×{' '}
                            {number(p.assumptions.yieldKwh)} kWh/kWp/year
                          </small>
                        </div>
                        <div>
                          <span>Self-consumed energy</span>
                          <strong>{number(p.assessment.selfConsumed)} kWh</strong>
                          <small>Limited to your estimated daytime demand</small>
                        </div>
                        <div>
                          <span>Annual maintenance allowance</span>
                          <strong>{cash(p.assessment.maintenance)}</strong>
                          <small>
                            {number(p.assumptions.annualMaintenance * 100, 1)}% of indicative
                            capital cost
                          </small>
                        </div>
                      </div>
                      <details className="details">
                        <summary>
                          Calculation method, sources & limitations <ChevronDown size={16} />
                        </summary>
                        <p>{p.assessment.formula}</p>
                        <p>
                          Inputs:{' '}
                          {Object.values(p.evidence)
                            .map((e) => e.source)
                            .filter((v, i, a) => a.indexOf(v) === i)
                            .join('; ') || 'Manual project inputs'}
                          . Yield, cost, maintenance, and tariff are editable demonstration
                          assumptions, not live market data.
                        </p>
                        <p>
                          Annual model only: no hourly load matching, shading, degradation, tax,
                          tariff escalation, export permission, or seasonal production model. Export
                          compensation defaults to zero. The ±
                          {number(p.assumptions.uncertainty * 100)}% range is a scenario range, not
                          a confidence interval. Estimates can overstate self-consumption.
                        </p>
                      </details>
                      {p.gaps.length > 0 && (
                        <Note warning>
                          Missing evidence: {p.gaps.join(' · ')}.{' '}
                          <button className="inline-button" onClick={() => go('onboarding')}>
                            Review project information
                          </button>
                        </Note>
                      )}
                    </section>
                    <div className="section-heading offers-heading">
                      <div>
                        <div className="eyebrow">THE RIGHT PARTNER MAKES A DIFFERENCE</div>
                        <h2>Compare your solar options</h2>
                        <p>Like-for-like details, with the gaps out in the open.</p>
                      </div>
                      <Button
                        secondary
                        onClick={() => {
                          setOfferDraft(null);
                          setOfferText('');
                          setModal('offer');
                        }}
                        disabled={busy || !canEdit}
                      >
                        <Plus size={16} /> Add supplier offer
                      </Button>
                    </div>
                    {p.offers.length ? (
                      <div className="offer-grid">
                        {p.offers.map((o, index) => (
                          <section
                            key={o.id}
                            className={`card offer-card ${p.selectedOfferId === o.id ? 'selected' : ''}`}
                          >
                            <div className="offer-top">
                              <span className={`supplier-logo supplier-${index % 3}`}>
                                <Sun size={24} />
                              </span>
                              <Badge tone={p.selectedOfferId === o.id ? 'green' : 'neutral'}>
                                {p.selectedOfferId === o.id
                                  ? 'Your selection'
                                  : o.sample
                                    ? 'Sample supplier'
                                    : 'Entered offer'}
                              </Badge>
                            </div>
                            <h3>{o.supplier}</h3>
                            <span className="muted small">
                              {number(o.capacityKw)} kWp rooftop system
                            </span>
                            <div className="offer-price">
                              {cash(o.price)}
                              <span>{cash(o.analysis.pricePerKw)} / kWp</span>
                            </div>
                            <dl className="offer-facts">
                              <div>
                                <dt>Annual generation</dt>
                                <dd>
                                  {number(o.analysis.generation)} kWh
                                  {o.analysis.generationEstimated ? ' (estimated)' : ''}
                                </dd>
                              </div>
                              <div>
                                <dt>Indicative annual savings</dt>
                                <dd>{cash(o.analysis.savings)}</dd>
                              </div>
                              <div>
                                <dt>Equipment</dt>
                                <dd>{o.equipment || 'Not provided'}</dd>
                              </div>
                              <div>
                                <dt>Installation scope</dt>
                                <dd>{o.scope || 'Not provided'}</dd>
                              </div>
                              <div>
                                <dt>Exclusions</dt>
                                <dd>
                                  {o.exclusions || (
                                    <span className="amber-text">
                                      Missing — confirm with supplier
                                    </span>
                                  )}
                                </dd>
                              </div>
                              <div>
                                <dt>Payment schedule</dt>
                                <dd>{o.paymentSchedule || 'Not provided'}</dd>
                              </div>
                              <div>
                                <dt>Warranty</dt>
                                <dd>{o.warranty || 'Not provided'}</dd>
                              </div>
                              <div>
                                <dt>Maintenance</dt>
                                <dd>
                                  {o.maintenance || (
                                    <span className="amber-text">Not specified</span>
                                  )}
                                </dd>
                              </div>
                            </dl>
                            <div className="offer-bottom">
                              {o.analysis.missing.length > 0 ? (
                                <div className="offer-warning">
                                  <AlertCircle size={14} />
                                  {o.analysis.missing.length} details need clarification
                                </div>
                              ) : (
                                <div className="offer-complete">
                                  <CheckCheck size={15} /> Comparison details complete
                                </div>
                              )}
                              <Button
                                secondary={p.selectedOfferId !== o.id}
                                disabled={
                                  busy ||
                                  !isCustomer ||
                                  !!p.selectedOfferId ||
                                  !!o.analysis.missing.length
                                }
                                onClick={() =>
                                  void update(
                                    '/selection',
                                    { offerId: o.id },
                                    'POST',
                                    `${o.supplier} selected. Your original proposal is saved for outcome tracking.`,
                                  )
                                }
                              >
                                {p.selectedOfferId === o.id ? (
                                  <>
                                    <Check size={16} /> Selected
                                  </>
                                ) : (
                                  <>
                                    Select this offer <ArrowRight size={15} />
                                  </>
                                )}
                              </Button>
                              <small>
                                {o.relationship}. Source: {o.source}.
                              </small>
                            </div>
                          </section>
                        ))}
                      </div>
                    ) : (
                      <Empty title="Your first offer starts the comparison">
                        Add a supplier’s proposal above. Paste its text to extract common fields,
                        then review and fill the gaps.
                      </Empty>
                    )}
                    {!!p.offers.length && (
                      <section className="card recommendation">
                        <Sparkles size={23} />
                        <div>
                          <h3>A considered recommendation</h3>
                          <p>
                            {(() => {
                              const completeOffers = p.offers
                                .filter(
                                  (o) =>
                                    !o.analysis.missing.length &&
                                    o.capacityKw * p.assumptions.roofM2PerKw <= b.roofArea,
                                )
                                .sort((a, c) => a.analysis.pricePerKw - c.analysis.pricePerKw);
                              return completeOffers.length
                                ? `${completeOffers[0].supplier} has the lowest price per kWp among complete offers that fit your stated roof area. This comparison does not assess installation quality or technical suitability; warranties, exclusions, and a site survey still matter.`
                                : 'There is not enough complete, roof-compatible offer information to recommend a supplier. Ask your operator to resolve the gaps.';
                            })()}
                          </p>
                          <p className="small muted">
                            No supplier payments or commissions are included in this demo. A
                            selection is not a contract. Complete the simulated technical review in
                            the operator workspace before selecting.
                          </p>
                        </div>
                      </section>
                    )}
                    {selected && (
                      <div className="selection-actions">
                        <Button onClick={() => go('financing')}>
                          Continue to financing <ArrowRight size={16} />
                        </Button>
                        <button
                          className="text-button"
                          disabled={busy || !isCustomer || p.milestones[3].status === 'complete'}
                          onClick={() => {
                            if (
                              window.confirm(
                                'Clear the selected supplier? This will reset financing progress and pending authorizations.',
                              )
                            )
                              void update(
                                '/selection',
                                null,
                                'DELETE',
                                'Selection cleared. You can revise project inputs.',
                              );
                          }}
                        >
                          Clear supplier selection
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {screen === 'financing' && (
                  <div className="stack">
                    {customerHint}
                    <Note>
                      Sample financing products · Rates, fees, and eligibility are illustrative.
                      This workspace does not check credit, submit to a lender, or provide approval.
                      Payments use a fixed-rate amortizing loan and exclude fees and insurance.
                    </Note>
                    {!selected && (
                      <section className="card next-card">
                        <h2>A proposal comes first</h2>
                        <p>
                          Select a supplier to prepare a financing package. Until then, payment
                          examples use the preliminary capital estimate.
                        </p>
                        <Button onClick={() => go('assessment')}>
                          Compare solar suppliers <ArrowRight size={16} />
                        </Button>
                      </section>
                    )}
                    <div className="finance-grid">
                      {p.financeProducts.map((f) => (
                        <section
                          className={`card finance-card ${p.application?.productId === f.id ? 'selected' : ''}`}
                          key={f.id}
                        >
                          <div className="section-heading">
                            <span className="finance-icon">
                              <Wallet size={22} />
                            </span>
                            <Badge>Sample product</Badge>
                          </div>
                          <span className="eyebrow">{f.provider}</span>
                          <h2>{f.name}</h2>
                          <div className="finance-payment">
                            {cash(f.monthlyPayment)}
                            <span> / month</span>
                          </div>
                          <div className="finance-terms">
                            <div>
                              <span>Interest rate</span>
                              <strong>{number(f.apr * 100, 2)}% p.a.</strong>
                            </div>
                            <div>
                              <span>Term</span>
                              <strong>{f.months / 12} years</strong>
                            </div>
                            <div>
                              <span>Upfront contribution</span>
                              <strong>{cash(f.depositAmount)}</strong>
                            </div>
                            <div>
                              <span>Amount financed</span>
                              <strong>{cash(f.principal)}</strong>
                            </div>
                          </div>
                          <p className="small">
                            Estimated total repayments: {cash(f.monthlyPayment * f.months)}. Total
                            including deposit: {cash(f.monthlyPayment * f.months + f.depositAmount)}
                            .
                          </p>
                          {b.budget < f.depositAmount && (
                            <Note warning>
                              Your stated upfront budget is {cash(f.depositAmount - b.budget)} below
                              the illustrative deposit.
                            </Note>
                          )}
                          <div className="eligibility">
                            <span
                              className={`check-circle ${f.estimatedEligible ? 'complete' : ''}`}
                            >
                              <Check size={12} />
                            </span>
                            <div>
                              <strong>
                                {f.estimatedEligible
                                  ? 'Meets sample screening criteria'
                                  : 'More information needed'}
                              </strong>
                              <span>
                                At least {number(f.minKwh)} kWh/month and suitable property rights.
                                Not credit approval.
                              </span>
                            </div>
                          </div>
                          <Button
                            secondary={p.application?.productId !== f.id}
                            disabled={
                              busy ||
                              !isCustomer ||
                              !selected ||
                              p.milestones[2].status === 'complete' ||
                              (!!p.application &&
                                !['prepared', 'rejected'].includes(p.application.status))
                            }
                            onClick={() =>
                              void update(
                                '/application/prepare',
                                { productId: f.id },
                                'POST',
                                'Application package prepared. Review the checklist before authorizing submission.',
                              )
                            }
                          >
                            {p.application?.productId === f.id
                              ? 'Refresh prepared package'
                              : 'Prepare application'}{' '}
                            <ArrowRight size={16} />
                          </Button>
                        </section>
                      ))}
                    </div>
                    {selected && (
                      <section className="card self-funded">
                        <div>
                          <h3>Prefer to use your own funds?</h3>
                          <p className="muted small">
                            Your stated upfront budget: {cash(b.budget)}. Proposal price:{' '}
                            {cash(selected.price)}. This records a planning choice; no payment is
                            made.
                          </p>
                        </div>
                        <Button
                          secondary
                          disabled={busy || !isCustomer || p.milestones[2].status === 'complete'}
                          onClick={() =>
                            void update(
                              '/financing/self-funded',
                              { confirmed: true },
                              'POST',
                              'Own-funds preference recorded. Continue to the contracting step.',
                            )
                          }
                        >
                          Confirm own funds <Check size={15} />
                        </Button>
                        {p.milestones[2].status === 'complete' && !p.application && (
                          <button className="text-button" onClick={() => go('execution')}>
                            Continue to installation <ArrowRight size={15} />
                          </button>
                        )}
                      </section>
                    )}
                    {p.application && appProduct && (
                      <section className="card">
                        <div className="section-heading">
                          <div>
                            <h2>Your application workspace</h2>
                            <p>
                              {appProduct.name} · {selected?.supplier}
                            </p>
                          </div>
                          <Badge tone={p.application.status === 'approved' ? 'green' : 'amber'}>
                            {p.application.status} · simulated
                          </Badge>
                        </div>
                        <div className="two-columns application-columns">
                          <div>
                            <h3>Document checklist</h3>
                            {appProduct.checklist.map((item) => (
                              <div className="checklist-row" key={item.kind}>
                                <span className={`check-circle ${item.ready ? 'complete' : ''}`}>
                                  {item.ready ? <Check size={13} /> : <FileText size={12} />}
                                </span>
                                <span>{documentNames[item.kind]}</span>
                                <Badge tone={item.ready ? 'green' : 'amber'}>
                                  {item.ready
                                    ? item.sample
                                      ? 'Reviewed sample'
                                      : 'Reviewed'
                                    : 'Required'}
                                </Badge>
                              </div>
                            ))}
                            <button className="text-button" onClick={() => go('onboarding')}>
                              Manage documents <ArrowRight size={15} />
                            </button>
                          </div>
                          <div className="package-card">
                            <div className="file-icon">
                              <FileText size={24} />
                            </div>
                            <h3>One reusable application package</h3>
                            <p>
                              Business details, the original proposal, calculation inputs, document
                              text, checklist, and activity history in a portable JSON file.
                            </p>
                            <a
                              className="button secondary"
                              href={`/api/projects/${p.id}/application/package`}
                              download
                            >
                              <ArrowDownToLine size={16} /> Download package
                            </a>
                            <small>
                              The package may contain sensitive business information. Original file
                              attachments remain in this workspace.
                            </small>
                          </div>
                        </div>
                        {p.application.decisionNote && (
                          <Note>Sample partner decision: {p.application.decisionNote}</Note>
                        )}
                        <div className="form-footer">
                          <Button
                            disabled={
                              busy ||
                              !isCustomer ||
                              p.application.status !== 'prepared' ||
                              appProduct.checklist.some((x) => !x.ready)
                            }
                            onClick={() => askAuthorization('submit_application')}
                          >
                            <ShieldCheck size={16} /> Review & authorize demo submission
                          </Button>
                          {p.application.status === 'submitted' && (
                            <button className="text-button" onClick={() => go('operator')}>
                              Record a sample lender decision <ArrowRight size={15} />
                            </button>
                          )}
                          {p.application.status === 'approved' && (
                            <button className="text-button" onClick={() => go('execution')}>
                              Continue to installation <ArrowRight size={15} />
                            </button>
                          )}
                        </div>
                      </section>
                    )}
                  </div>
                )}

                {screen === 'execution' && (
                  <div className="stack">
                    <div className="two-columns">
                      <section className="card">
                        <div className="section-heading">
                          <div>
                            <h2>From plan to power</h2>
                            <p>One project. Clear owners. No loose ends.</p>
                          </div>
                          <Badge tone="green">{completed} / 7 complete</Badge>
                        </div>
                        <div className="milestone-list">
                          {p.milestones.map((m, index) => (
                            <div
                              key={m.id}
                              className={`milestone ${m.status === 'complete' ? 'complete' : ''}`}
                            >
                              <span className="milestone-circle">
                                {m.status === 'complete' ? <Check size={17} /> : index + 1}
                              </span>
                              <div className="milestone-content">
                                <div>
                                  <h3>{m.title}</h3>
                                  <Badge tone={m.status === 'complete' ? 'green' : 'neutral'}>
                                    {m.status === 'complete' ? 'Complete · simulated' : 'Pending'}
                                  </Badge>
                                </div>
                                <span className="small muted">Owner: {m.owner}</span>
                                <p>{m.note || m.nextAction}</p>
                                {m.id === 'contract' && m.status !== 'complete' && (
                                  <Button
                                    secondary
                                    disabled={
                                      busy || !isCustomer || p.milestones[2].status !== 'complete'
                                    }
                                    onClick={() => askAuthorization('commit_contract')}
                                  >
                                    Review demo commitment <ArrowRight size={15} />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                      <div className="stack">
                        <section className="card">
                          <div className="section-heading">
                            <h2>The plan we’re measuring against</h2>
                            <Sun size={20} />
                          </div>
                          {p.proposalBaseline ? (
                            <>
                              <h3>{p.proposalBaseline.offer.supplier}</h3>
                              <div className="baseline-grid">
                                <div>
                                  <span>System capacity</span>
                                  <strong>{number(p.proposalBaseline.offer.capacityKw)} kWp</strong>
                                </div>
                                <div>
                                  <span>Proposed cost</span>
                                  <strong>{cash(p.proposalBaseline.offer.price)}</strong>
                                </div>
                                <div>
                                  <span>Annual generation</span>
                                  <strong>
                                    {number(p.proposalBaseline.analysis.generation)} kWh
                                  </strong>
                                </div>
                                <div>
                                  <span>Captured</span>
                                  <strong>{date(p.proposalBaseline.selectedAt)}</strong>
                                </div>
                              </div>
                              <Note>
                                The original proposal and assumptions are preserved when you select
                                a supplier. Results are compared with that saved baseline.
                              </Note>
                            </>
                          ) : (
                            <Empty title="Choose your starting point">
                              Select a supplier to preserve the proposal you’ll measure against.
                            </Empty>
                          )}
                        </section>
                        <section className="card operator-callout">
                          <Wrench size={23} />
                          <h2>Keep the next step moving</h2>
                          <p>
                            Operators can record simulated partner updates, resolve issues, and
                            complete installation milestones in order.
                          </p>
                          <Button secondary onClick={() => go('operator')}>
                            Open operator workspace <ArrowRight size={15} />
                          </Button>
                        </section>
                      </div>
                    </div>
                    <section className="card">
                      <div className="section-heading">
                        <div>
                          <h2>Your solar, in practice</h2>
                          <p>Record actual generation and costs after handover.</p>
                        </div>
                        <TrendingUp size={21} />
                      </div>
                      {p.milestones[6].status !== 'complete' ? (
                        <Note>
                          Performance entry opens after commissioning and handover are complete. You
                          can complete the simulated journey through the operator workspace.
                        </Note>
                      ) : (
                        <form
                          onSubmit={(e) =>
                            void update(
                              '/performance',
                              fields(e),
                              'POST',
                              'Monthly performance saved. Any service issue has been sent to the operator queue.',
                            )
                          }
                        >
                          <fieldset disabled={busy}>
                            <div className="performance-form">
                              <Field label="Month" name="month" type="month" />
                              <Field
                                label="Generation (kWh)"
                                name="generation"
                                type="number"
                                min={0}
                                step="any"
                              />
                              <Field
                                label={`Additional cost this month (${currency})`}
                                name="actualCost"
                                type="number"
                                min={0}
                                step="any"
                                value={0}
                              />
                              <Field label="Service issue / notes" name="issue" required={false} />
                            </div>
                            <Button type="submit" disabled={busy}>
                              Record results <Plus size={16} />
                            </Button>
                          </fieldset>
                        </form>
                      )}
                      {p.performance.length > 0 && (
                        <>
                          <div className="performance-chart">
                            {p.performance.map((r) => (
                              <div className="performance-row" key={r.id}>
                                <strong>{r.month}</strong>
                                <div className="bar-track">
                                  <div
                                    style={{
                                      width: `${Math.min(100, (r.generation / Math.max(r.expectedGeneration * 1.3, r.generation, 1)) * 100)}%`,
                                    }}
                                  />
                                </div>
                                <span>{number(r.generation)} kWh</span>
                                <Badge
                                  tone={r.generation >= r.expectedGeneration ? 'green' : 'amber'}
                                >
                                  {r.expectedGeneration
                                    ? `${number((r.generation / r.expectedGeneration - 1) * 100, 1)}% vs plan`
                                    : 'No baseline'}
                                </Badge>
                              </div>
                            ))}
                          </div>
                          <p className="small muted">
                            Monthly baseline = original annual generation ÷ 12. This flat allocation
                            does not account for Thailand’s seasonal solar patterns. Entered values
                            are not meter-verified.
                          </p>
                          <div className="outcome-costs">
                            <strong>
                              Project cost so far:{' '}
                              {cash(
                                (p.proposalBaseline?.offer.price || 0) +
                                  p.performance.reduce((sum, r) => sum + r.actualCost, 0),
                              )}
                            </strong>
                            <span>
                              Original proposal + manually recorded additional costs; not an
                              accounting ledger.
                            </span>
                          </div>
                        </>
                      )}
                    </section>
                  </div>
                )}

                {screen === 'operator' && (
                  <div className="stack">
                    <Note>
                      Demo operator workspace · Role switching is for evaluating the workflow, not
                      production authentication. All partner updates and approvals are simulated.
                    </Note>
                    {role !== 'operator' ? (
                      <section className="card operator-entry">
                        <div className="operator-entry-icon">
                          <ShieldCheck size={30} />
                        </div>
                        <h2>A human in the loop.</h2>
                        <p>
                          Try the operator role to resolve exceptions, record sample partner
                          responses, and move the demonstration forward.
                        </p>
                        <Button onClick={() => void changeRole('operator')} disabled={busy}>
                          Switch to demo operator <ArrowRight size={16} />
                        </Button>
                      </section>
                    ) : (
                      <>
                        <div className="two-columns">
                          <section className="card">
                            <div className="section-heading">
                              <h2>Exceptions & next actions</h2>
                              <Badge tone="amber">
                                {p.tasks.filter((t) => t.status === 'open').length} open
                              </Badge>
                            </div>
                            {p.tasks.length ? (
                              p.tasks.map((task) => (
                                <div className="task-card" key={task.id}>
                                  <div className="section-heading">
                                    <h3>{task.title}</h3>
                                    <Badge tone={task.status === 'resolved' ? 'green' : 'amber'}>
                                      {task.stalled ? 'Stalled · 7+ days' : task.status}
                                    </Badge>
                                  </div>
                                  <span className="small muted">Owner: {task.owner}</span>
                                  <p>{task.nextAction}</p>
                                  {task.resolution ? (
                                    <div className="resolution">
                                      <CheckCircle2 size={16} />
                                      {task.resolution}
                                    </div>
                                  ) : (
                                    <form
                                      onSubmit={(e) =>
                                        void update(
                                          `/operator/tasks/${task.id}`,
                                          fields(e),
                                          'POST',
                                          'Issue resolved and recorded in the activity history.',
                                        )
                                      }
                                    >
                                      <Field label="Resolution and evidence" name="note" />
                                      <Button secondary type="submit" disabled={busy}>
                                        Resolve issue <Check size={15} />
                                      </Button>
                                    </form>
                                  )}
                                </div>
                              ))
                            ) : (
                              <Empty title="No exceptions waiting">
                                New document, technical, and service issues will appear here.
                              </Empty>
                            )}
                          </section>
                          <section className="card">
                            <div className="section-heading">
                              <h2>Partner updates</h2>
                              <Wrench size={20} />
                            </div>
                            <p className="muted">
                              Record one simulated step at a time. Earlier milestones must be
                              complete.
                            </p>
                            {p.milestones
                              .filter((m) =>
                                ['technical', 'installation', 'commissioning', 'handover'].includes(
                                  m.id,
                                ),
                              )
                              .map((m) => (
                                <div className="partner-update" key={m.id}>
                                  <div className="section-heading">
                                    <h3>{m.title}</h3>
                                    {m.status === 'complete' && (
                                      <Badge tone="green">Complete · demo</Badge>
                                    )}
                                  </div>
                                  {m.status === 'complete' ? (
                                    <p className="small muted">{m.note}</p>
                                  ) : (
                                    <form
                                      onSubmit={(e) =>
                                        void update(
                                          `/operator/milestones/${m.id}`,
                                          fields(e),
                                          'POST',
                                          `Simulated ${m.title.toLowerCase()} completed.`,
                                        )
                                      }
                                    >
                                      <Field
                                        label={`${m.title} evidence / update`}
                                        name="note"
                                        hint="At least 10 characters. Describe the simulated partner check."
                                      />
                                      <Button
                                        secondary
                                        type="submit"
                                        disabled={
                                          busy ||
                                          p.milestones
                                            .slice(
                                              0,
                                              p.milestones.findIndex((x) => x.id === m.id),
                                            )
                                            .some((x) => x.status !== 'complete')
                                        }
                                      >
                                        Record simulated completion <Check size={15} />
                                      </Button>
                                    </form>
                                  )}
                                </div>
                              ))}
                          </section>
                        </div>
                        {p.application?.status === 'submitted' && (
                          <section className="card">
                            <div className="section-heading">
                              <div>
                                <h2>Sample lender response</h2>
                                <p>{appProduct?.name} · Explicit customer authorization recorded</p>
                              </div>
                              <Badge tone="amber">Awaiting decision</Badge>
                            </div>
                            <form
                              onSubmit={(e) =>
                                void update(
                                  '/operator/decision',
                                  fields(e),
                                  'POST',
                                  'Sample lender decision recorded.',
                                )
                              }
                            >
                              <div className="form-grid">
                                <Select
                                  label="Simulated decision"
                                  name="decision"
                                  options={{
                                    approved: 'Approve for demonstration',
                                    rejected: 'Decline for demonstration',
                                  }}
                                />
                                <Field label="Decision reason / conditions" name="note" />
                              </div>
                              <Button type="submit" disabled={busy}>
                                Record sample decision <Check size={16} />
                              </Button>
                            </form>
                          </section>
                        )}
                      </>
                    )}
                    <section className="card">
                      <div className="section-heading">
                        <h2>Project activity & decisions</h2>
                        <Badge>{p.activity.length} events</Badge>
                      </div>
                      <ActivityList p={p} count={100} />
                    </section>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
        {message && (
          <div
            className={`toast ${message.error ? 'error' : ''}`}
            role={message.error ? 'alert' : 'status'}
          >
            {message.error ? <AlertCircle size={19} /> : <CheckCircle2 size={19} />}
            <span>{message.text}</span>
            {message.error && (
              <button
                className="text-button"
                onClick={() => {
                  void load(p?.id);
                  setMessage(null);
                }}
              >
                Refresh
              </button>
            )}
            <button
              className="icon-button"
              onClick={() => setMessage(null)}
              aria-label="Dismiss notification"
            >
              <X size={17} />
            </button>
          </div>
        )}
        {modal === 'new' && (
          <Modal title="Start your solar journey" close={() => setModal(null)}>
            <p className="muted">
              A new project for your business. We’ll take it one step at a time.
            </p>
            <form onSubmit={createProject}>
              <div className="form-grid">
                <Field label="Business name" name="name" />
                <Field label="Industry" name="sector" value="Manufacturing" />
                <Field label="Location" name="location" value="Bangkok, Thailand" />
              </div>
              <Note>
                Thailand / THB · You can edit market and calculation assumptions in the solar
                assessment.
              </Note>
              <div className="form-footer">
                <Button type="submit" disabled={busy || !isCustomer}>
                  Create project <ArrowRight size={16} />
                </Button>
              </div>
            </form>
          </Modal>
        )}
        {modal === 'issue' && (
          <Modal title="Bring your operator into the loop" close={() => setModal(null)}>
            <p className="muted">
              Create an internal task with a clear next action. This does not send an external
              message.
            </p>
            <form
              onSubmit={(e) =>
                void update(
                  '/tasks',
                  fields(e),
                  'POST',
                  'Your issue is in the operator queue.',
                  true,
                )
              }
            >
              <Field label="What do you need help with?" name="title" />
              <label className="field">
                <span>Details and requested next action</span>
                <textarea
                  name="nextAction"
                  required
                  minLength={10}
                  rows={4}
                  placeholder="Describe the issue and what you’d like the operator to check."
                />
              </label>
              <Button type="submit" disabled={busy || !p}>
                Create operator task <ArrowRight size={16} />
              </Button>
            </form>
          </Modal>
        )}
        {modal === 'assumptions' && p && (
          <Modal title="Make the assumptions your own" close={() => setModal(null)}>
            <p className="muted">
              Illustrative Thailand inputs. Confirm tariffs, taxes, permits, and technical
              requirements with qualified local partners.
            </p>
            <form
              key={p.version}
              onSubmit={(e) =>
                void update(
                  '/assumptions',
                  fields(e),
                  'PUT',
                  'Assumptions saved and estimate recalculated.',
                  true,
                )
              }
            >
              <fieldset disabled={busy || !canEdit}>
                <div className="form-grid">
                  <Field label="Market" name="market" value={p.assumptions.market} />
                  <Select
                    label="Currency"
                    name="currency"
                    value={currency}
                    options={{
                      THB: 'THB · Thai baht',
                      USD: 'USD · US dollar',
                      EUR: 'EUR · Euro',
                      GBP: 'GBP · British pound',
                    }}
                  />
                  <Field
                    label="Import tariff / kWh"
                    name="tariff"
                    value={p.assumptions.tariff}
                    type="number"
                    step="any"
                    min={0.01}
                  />
                  <Field
                    label="Export tariff / kWh"
                    name="exportTariff"
                    value={p.assumptions.exportTariff}
                    type="number"
                    step="any"
                    min={0}
                  />
                  <Field
                    label="Annual yield (kWh / kWp)"
                    name="yieldKwh"
                    value={p.assumptions.yieldKwh}
                    type="number"
                    min={500}
                    max={2500}
                  />
                  <Field
                    label="Capital cost / kWp"
                    name="costPerKw"
                    value={p.assumptions.costPerKw}
                    type="number"
                    min={1000}
                  />
                  <Field
                    label="Annual maintenance fraction"
                    name="annualMaintenance"
                    value={p.assumptions.annualMaintenance}
                    type="number"
                    step="0.001"
                    min={0}
                    max={0.2}
                  />
                  <Field
                    label="Roof area per kWp (m²)"
                    name="roofM2PerKw"
                    value={p.assumptions.roofM2PerKw}
                    type="number"
                    step="any"
                    min={4}
                    max={20}
                  />
                  <Field
                    label="Uncertainty fraction (±)"
                    name="uncertainty"
                    value={p.assumptions.uncertainty}
                    type="number"
                    step="0.01"
                    min={0}
                    max={0.5}
                  />
                </div>
                <Note>
                  Changing the currency changes labels only; it does not convert prices. Re-enter
                  all monetary project values and offers consistently when changing currency.
                </Note>
                <div className="form-footer">
                  <Button type="submit" disabled={busy || !canEdit}>
                    Save & recalculate <Check size={16} />
                  </Button>
                </div>
              </fieldset>
            </form>
          </Modal>
        )}
        {reviewDoc && p && (
          <Modal title="Review your document" close={() => setReviewDoc(null)}>
            <div className="section-heading">
              <div>
                <h3>{reviewDoc.name}</h3>
                <span className="small muted">{documentNames[reviewDoc.kind]}</span>
              </div>
              <Badge tone={reviewDoc.sample ? 'amber' : 'neutral'}>
                {reviewDoc.sample ? 'Sample document' : 'Uploaded document'}
              </Badge>
            </div>
            <a
              className="text-button"
              href={`/api/projects/${p.id}/documents/${reviewDoc.id}/download`}
              download
            >
              Download original <ArrowDownToLine size={15} />
            </a>
            <div className="source-text">
              <span className="eyebrow">SOURCE TEXT</span>
              <pre>
                {reviewDoc.sourceText ||
                  'No readable text extracted. Download and review the original file, then enter the values below.'}
              </pre>
            </div>
            {reviewDoc.extractionNote && <Note warning>{reviewDoc.extractionNote}</Note>}
            <form
              onSubmit={(e) => {
                const values = fields(e);
                void update(
                  `/documents/${reviewDoc.id}/review`,
                  { ...values, confirmed: true },
                  'POST',
                  'Document reviewed. Verified customer values are saved with their source.',
                  true,
                );
              }}
            >
              <h3>
                {reviewDoc.kind === 'electricity_bill'
                  ? 'Check and correct the extracted values'
                  : 'Confirm your review'}
              </h3>
              {reviewDoc.kind === 'electricity_bill' && (
                <div className="form-grid">
                  <Field
                    label="Monthly consumption (kWh)"
                    name="monthlyKwh"
                    value={reviewDoc.verified?.monthlyKwh ?? reviewDoc.extracted.monthlyKwh ?? ''}
                    type="number"
                    step="any"
                    min={0.01}
                  />
                  <Field
                    label={`Total bill (${currency})`}
                    name="billAmount"
                    value={reviewDoc.verified?.billAmount ?? reviewDoc.extracted.billAmount ?? ''}
                    type="number"
                    step="any"
                    min={0.01}
                  />
                </div>
              )}
              <label className="checkbox">
                <input type="checkbox" required />
                <span>
                  I reviewed the source and confirm these details.
                  {reviewDoc.sample
                    ? ' I understand this is sample evidence for the demonstration only.'
                    : ' This is my review, not independent verification.'}
                </span>
              </label>
              <Button type="submit" disabled={busy || !isCustomer}>
                Confirm document review <Check size={16} />
              </Button>
            </form>
          </Modal>
        )}
        {modal === 'offer' && (
          <Modal title="Turn an offer into a clear comparison" close={() => setModal(null)}>
            <p className="muted">
              Paste a proposal to extract common fields, or enter the details manually. Review every
              value before saving.
            </p>
            <label className="field">
              <span>Proposal text (optional)</span>
              <textarea
                rows={5}
                value={offerText}
                onChange={(e) => setOfferText(e.target.value)}
                placeholder={
                  'Supplier: Example Solar\nCapacity: 80 kWp\nPrice: THB 2,560,000\nGeneration: 112,000 kWh\nEquipment: …\nScope: …\nExclusions: …\nPayment: …\nWarranty: …\nMaintenance: …'
                }
              />
            </label>
            <Button
              secondary
              disabled={busy || offerText.length < 5}
              onClick={async () => {
                if (!p) return;
                setBusy(true);
                try {
                  const result = await api<{ values: OfferValues; note: string }>(
                    `/projects/${p.id}/offers/extract`,
                    { method: 'POST', body: JSON.stringify({ text: offerText }) },
                  );
                  setOfferDraft(result.values);
                  setOfferEditKey((x) => x + 1);
                  notify(result.note);
                } catch (e) {
                  notify((e as Error).message, true);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Sparkles size={16} /> Extract proposal fields
            </Button>
            <form
              key={offerEditKey}
              className="offer-form"
              onSubmit={(e) =>
                void update(
                  '/offers',
                  { ...fields(e), sourceText: offerText },
                  'POST',
                  'Offer saved with the source proposal text.',
                  true,
                )
              }
            >
              <div className="form-grid">
                <Field label="Supplier name" name="supplier" value={offerDraft?.supplier} />
                <Field
                  label="Capacity (kWp)"
                  name="capacityKw"
                  type="number"
                  min={1}
                  step="any"
                  value={offerDraft?.capacityKw || ''}
                />
                <Field
                  label={`Total price (${currency})`}
                  name="price"
                  type="number"
                  min={1}
                  step="any"
                  value={offerDraft?.price || ''}
                />
                <Field
                  label="Annual generation (kWh; 0 if missing)"
                  name="annualGeneration"
                  type="number"
                  min={0}
                  step="any"
                  value={offerDraft?.annualGeneration || 0}
                />
                {(
                  [
                    'equipment',
                    'scope',
                    'exclusions',
                    'paymentSchedule',
                    'warranty',
                    'maintenance',
                  ] as const
                ).map((key) => (
                  <Field
                    key={key}
                    label={
                      key === 'paymentSchedule'
                        ? 'Payment schedule'
                        : key.charAt(0).toUpperCase() + key.slice(1)
                    }
                    name={key}
                    value={offerDraft?.[key]}
                    required={false}
                  />
                ))}
              </div>
              <label className="checkbox">
                <input type="checkbox" required />
                <span>
                  I have checked these values against the supplier’s proposal. Blank fields will be
                  shown as missing.
                </span>
              </label>
              <Button type="submit" disabled={busy || !canEdit}>
                Save reviewed offer <Check size={16} />
              </Button>
            </form>
          </Modal>
        )}
        {modal === 'authorization' && p && (
          <Modal
            title={
              authorization === 'submit_application'
                ? 'Your permission, before the next step'
                : 'Review your simulated commitment'
            }
            close={() => setModal(null)}
          >
            <Badge tone="amber">Simulation only</Badge>
            <p className="authorization-intro">
              {authorization === 'submit_application'
                ? `You are authorizing a simulated submission of ${p.business.name}’s application to ${appProduct?.provider}.`
                : `You are authorizing the simulated contracting step with ${selected?.supplier} for ${selected ? cash(selected.price) : 'the selected offer'}.`}
            </p>
            <dl className="authorization-details">
              <div>
                <dt>Project</dt>
                <dd>{p.business.name}</dd>
              </div>
              <div>
                <dt>Supplier</dt>
                <dd>{selected?.supplier}</dd>
              </div>
              <div>
                <dt>Project price</dt>
                <dd>{selected ? cash(selected.price) : '—'}</dd>
              </div>
              {appProduct && (
                <div>
                  <dt>Financing</dt>
                  <dd>
                    {appProduct.name} · {cash(appProduct.monthlyPayment)} / month
                  </dd>
                </div>
              )}
            </dl>
            <Note>
              No information will be sent externally. No payment or legal commitment will be made.
              This authorization applies to this action once, expires in 15 minutes, and is recorded
              in the project history.
            </Note>
            <form onSubmit={authorize}>
              <label className="checkbox">
                <input type="checkbox" required />
                <span>
                  I have reviewed the project and explicitly authorize this simulated{' '}
                  {authorization === 'submit_application' ? 'submission' : 'commitment'}.
                </span>
              </label>
              <Button type="submit" disabled={busy || !isCustomer}>
                <ShieldCheck size={16} /> Authorize & run simulation
              </Button>
            </form>
          </Modal>
        )}
        {busy && (
          <div className="busy-indicator" role="status">
            Saving your progress…
          </div>
        )}
      </div>
    </FeedbackContext.Provider>
  );
}
function Stat({
  icon: Icon,
  label,
  value,
  sub,
  trend,
}: {
  icon: typeof Sun;
  label: string;
  value: ReactNode;
  sub: string;
  trend?: string;
}) {
  return (
    <section className="card stat-card">
      <div className="stat-heading">
        <span>{label}</span>
        <Icon size={18} />
      </div>
      <div className="stat-value">{value}</div>
      <p>{sub}</p>
      {trend && (
        <div className="stat-trend">
          <ArrowUpRight size={14} />
          {trend}
        </div>
      )}
    </section>
  );
}
function ActivityList({ p, count }: { p: Project; count: number }) {
  return (
    <div className="activity-list">
      {p.activity.slice(0, count).map((event, index) => (
        <div className="activity-item" key={event.id}>
          <span className={`activity-icon ${index === 0 ? 'latest' : ''}`}>
            <Check size={14} />
          </span>
          <div>
            <strong>{event.action}</strong>
            <p>{event.detail || 'Your project is moving forward.'}</p>
            <span>
              {event.actor} · {date(event.at)} ·{' '}
              {new Date(event.at).toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Asia/Bangkok',
              })}{' '}
              ICT
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
