# MinusOne

A working rooftop-solar MVP for SMEs in **Thailand / THB**. One persistent project connects qualification, evidence, estimates, supplier offers, financing, installation, and operating results.

The interface includes a seeded Thai business and clearly labelled sample suppliers, financing products, and partner responses. It can also create a new project, accept your documents and proposals, and preserve your progress across server restarts.

## Run

Requires **Node.js 24+** and npm. The native SQLite module avoids a separate database service. No API keys are required.

```bash
cd /workspace/MinusOne
npm ci
npm run dev
```

The frontend uses port **5173**; Vite proxies `/api` to the API on **3001**. Both bind to `127.0.0.1` by default. Stop the development command before starting the production server on the same API port.

To run the production build:

```bash
npm run build
npm start
```

The API and built frontend are then served together on port **3001**. `GET /api/health` checks the server and SQLite connection. `GET /api/projects` returns available projects. Live processes must be restarted when a cloud environment is restored.

To publish an HTTPS demo site, use the checked-in **Render Blueprint** (`render.yaml`). See [docs/deployment.md](docs/deployment.md) for the account connection, paid persistent-disk plan, generated access password, and live verification steps. Publishing this development environment alone does not create a website.

Optional server variables:

| Variable               | Default                        | Purpose                                                                                      |
| ---------------------- | ------------------------------ | -------------------------------------------------------------------------------------------- |
| `PORT`                 | `3001`                         | HTTP server port                                                                             |
| `HOST`                 | `127.0.0.1`                    | Bind address; keep the demo local                                                            |
| `DATA_DIR`             | `data`                         | SQLite database and uploads directory                                                        |
| `DB_PATH`              | `<DATA_DIR>/minusone.sqlite`   | Override the database location                                                               |
| `CHROMIUM_PATH`        | System Chromium when available | Browser test executable                                                                      |
| `DEMO_ACCESS_PASSWORD` | Unset locally                  | Shared demo access password; required with at least 16 characters when `NODE_ENV=production` |
| `TRUST_PROXY_HOPS`     | `0`                            | Use `1` behind Render's trusted HTTPS reverse proxy                                          |

Files in `data/`, dependencies, generated builds, and test artifacts are ignored by Git. **Do not delete `data/` to refresh dependencies.** For a fresh demo without losing existing data, start with a different `DATA_DIR`. Back up the database consistently with SQLite's backup tooling and copy the uploads directory; copying a live database without its WAL can lose writes.

Each cloud task is already isolated. Use this existing checkout; do not create a Git worktree unless explicitly requested.

## Complete the demonstration

1. Open the seeded **Siam Craft Foods** project. On **Business & documents**, review its sample electricity bill. Correct either extracted number if needed and explicitly confirm the review.
2. Add a sample **Property rights** document and review it. Add and review **Business registration** and **Financial statement** samples too. All remain visibly marked as samples.
3. Open **Operator workspace**, switch to the demo operator role, and record a simulated technical assessment with an evidence note of at least 10 characters. This is not engineer verification.
4. Switch back to **Customer view**. In **Solar & suppliers**, inspect the calculation assumptions and normalized proposals. Select Sunward Energy or another complete, roof-compatible offer. The original proposal and calculation inputs are saved as the performance baseline.
5. In **Financing**, prepare an application. Download its JSON package, inspect the document checklist, and choose **Review & authorize demo submission**. Check the explicit consent box and run the simulation. Prepared, submitted, and lender-decided states are distinct.
6. In the operator role, record a sample lender approval with a reason. Switch to the customer role and authorize the simulated contract under **Installation & impact**.
7. In the operator role, complete installation, commissioning, and handover in order, recording a note for each.
8. Record monthly generation, any additional costs, and service issues. Results compare against the saved proposal; service issues become operator tasks. Resolve them in the operator workspace.

You can create additional projects, upload your own documents, paste supplier proposal text, and correct extracted information. A customer can clear a supplier selection before contracting to revise inputs; this resets financing progress and pending authorizations. An own-funds path is available when the stated upfront budget covers the proposal price. It does not move money.

## Evidence and calculations

- PDF text extraction (first 10 pages, at most 50,000 characters), TXT, and CSV are supported. English bill labels and selected Thai labels are recognized by deterministic patterns. Scans/images and unreadable PDFs fall back to manual review; there is no OCR service.
- Uploads accept PDF, TXT, CSV, PNG, and JPEG, up to 5 MB each. Original files remain available for download. Extracted values are suggestions and **do not update the project until reviewed**. The original extraction, correction, reviewer, timestamp, and document ID are retained.
- Supplier proposal text is extracted into an editable form. Required comparison gaps are visible; incomplete offers cannot be selected. Unknown fields are never silently invented. Actual supplier warranties and performance have not been validated.
- All assessment inputs, formulas, uncertainty ranges, and limitations are available in the solar screen. Defaults are **illustrative Thailand assumptions**, not current regulated tariffs, lender offers, permitting advice, or engineering findings.
- Savings are annual estimates with a simplified daytime self-consumption cap, maintenance allowance, and zero export compensation by default. No hourly load matching, shading, degradation, tax, inflation, or financing cost is included in the simple payback figure.
- Loans use fixed-rate amortization. Monthly payments exclude fees and insurance. Indicative screening checks consumption and stated property rights only; it is not credit approval. Deposit shortfalls are disclosed.
- Changing currency relabels values; it does not perform FX conversion. Re-enter monetary values consistently if exploring another market.
- Actual generation is manually entered. Monthly comparison divides the original annual proposal by 12 and does not model seasonal differences. Project cost reporting adds entered additional costs to the proposal, not an independently reconciled accounting ledger.

See [docs/calculations.md](docs/calculations.md) for formulas and the numeric reference example.

## Validation

```bash
npm test
npm run build
npm run test:e2e
```

Unit/API tests use temporary SQLite databases. Browser tests start a separate production-build server on port 3101 with a temporary data directory. They do not modify your working demo database. Build before browser tests.

Browser tests automatically use `/usr/bin/chromium` in this cloud environment. On another machine, install Playwright Chromium with `npx playwright install chromium`, or set `CHROMIUM_PATH` to an existing compatible executable. The cloud's browser download destination may require a network allowlist entry; an existing system Chromium avoids that download.

The tests exercise calculations, extraction and correction, document gates, customer/operator permissions, explicit consent, single-use authorization, ordered milestones, upload validation, stale-write rejection, durable persistence, the complete browser journey, and mobile project creation. Screenshots and failure traces are saved in `test-results/`.

## Structure and integration boundaries

| Location                       | Responsibility                                                                |
| ------------------------------ | ----------------------------------------------------------------------------- |
| `src/main.tsx`, `src/types.ts` | React/TypeScript customer and operator workflows                              |
| `src/styles.css`               | Responsive interface, local fonts, and reduced-motion support                 |
| `server/domain.js`             | Schemas, estimates, loan math, extraction, next-action rules, and sample data |
| `server/app.js`                | HTTP routes, uploads, role gates, authorization, and partner simulations      |
| `server/store.js`              | SQLite transactions, sessions, and versioned project records                  |
| `tests/`                       | Unit, API, persistence, and browser checks                                    |
| `public/samples/`              | Clearly labelled example bill and proposal text                               |

React + TypeScript + Vite keeps the interface conventional and easy to extend. Express, Zod, and native SQLite provide validated, transactional local persistence without requiring a cloud account. Fonts and artwork are served locally; runtime does not require external assets. An explicit JSON project record captures related business/site data, documents, assumptions, offers, applications, permissions, tasks, milestones, results, and audit events.

Replace `extractBill` / `extractOffer` with providers that return the same candidate fields, preserving the human review step. A production lender/installer adapter should replace the simulation in the action/partner routes **after** the existing permission and transition gates. Keep actual provider receipts and independently verified findings separate from sample responses. Next actions and stalled-task escalation are deterministic rules, not an autonomous LLM or background worker.

## Mocked integrations and remaining limitations

- Suppliers, lenders, technical approvals, installation responses, and contracting are simulated. There are no external submissions, messages, payments, or signatures. No credentials are required or used.
- Operator switching is intentionally available for evaluation. Server-side roles prevent customer sessions from invoking operator-only routes. A configured shared demo password protects hosted access, but this is **not per-user authentication, tenant isolation, or a secure multi-user service**. Everyone with demo access can switch roles and see its projects. Add real identity, tenant authorization, retention controls, encryption, backups, rate limiting, and upload malware scanning before using real sensitive documents in a shared service.
- Explicit action consent is stored with the chosen offer/application, expires after 15 minutes, and is consumed once. Clearing a selection invalidates authorizations. This local audit history is not a tamper-proof compliance ledger.
- No OCR, live tariff feed, weather/yield provider, roof survey, grid/permitting integration, real lender decision, smart-meter ingestion, or supplier performance database is connected. Thailand-specific regulations and document acceptance must be confirmed with qualified partners.
- Open tasks older than seven days and reported service issues surface an operator next action. There is no background notification delivery or calendar scheduling.
- Application export is JSON with source text and document metadata. It is not a lender-approved PDF or an attachment archive. English is the current interface language; Thai localization and real utility bill formats need partner validation.
- Project data persists locally. Cloud publication, remote Git pushes, deployment, and restoration in a fresh task are separate operations and are not implied by a passing local build.
