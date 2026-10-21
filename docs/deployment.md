# Publish the hosted demo on Render

The recommended host is **Render**, using its Node web service and a persistent disk. It serves the React build and API from one HTTPS origin, supports Node 24/native SQLite, and preserves the database and original uploads across restarts and redeployments. The Blueprint uses the Singapore region for the Thailand pilot.

This is a **paid** deployment: a Starter web service plus a 1 GB persistent disk. Review Render's current total price before creating it. A free ephemeral service would lose project records and uploads on replacement, so it is not configured for this persistent MVP.

## Deploy

1. Sign in at Render and connect the GitHub account with access to `Teetuch-Sakarin/MinusOne`.
2. Create a **Blueprint** from that repository's `main` branch. Render reads the checked-in `render.yaml`. You can also use the [Render deployment entry](https://render.com/deploy?repo=https://github.com/Teetuch-Sakarin/MinusOne).
3. Review the Starter service and 1 GB disk, then approve creation in Render. The selected service/disk are billable. Render creates the actual site address; a custom domain is optional.
4. The Blueprint prompts you to enter `DEMO_ACCESS_PASSWORD` privately. Use a password manager to create a random password of **exactly 16 characters**. For an existing service, update the value in its Environment settings and deploy the latest commit. The HTTP Basic sign-in username is **`minusone`**. Share the password only with intended demo participants, through a secure channel.
5. Open the HTTPS address assigned by Render, authenticate, and check the sample dashboard. Validate `/api/health` returns `status: ok` and `database: true`. The health endpoint is intentionally public and does not include project or document data.
6. Make a test project with sample data, restart the service from Render, and confirm the project remains. Check a reviewed sample document and download an application package to verify persistence and routing.

Automatic deployments are disabled in the Blueprint. Deploy subsequent reviewed commits manually from Render. The single-service SQLite design requires **one running instance** with its own disk; do not horizontally scale it or attach a second writer. Disk-backed services may have deployment downtime. Take a consistent SQLite backup and copy the uploads before data migrations or deleting the service/disk.

The deployment starts with fresh sample data. Existing local `data/` and uploaded documents are excluded from Git and are not published. Deploying this repository does not upload your local working database.

## Runtime contract

| Setting                | Hosted value                | Purpose                                                  |
| ---------------------- | --------------------------- | -------------------------------------------------------- |
| `NODE_VERSION`         | `24`                        | Native SQLite and the pinned dependency runtime          |
| `NODE_ENV`             | `production`                | Enforces the shared access password at startup           |
| `HOST`                 | `0.0.0.0`                   | Listens on the provider network interface                |
| `PORT`                 | `10000`                     | Web-service port                                         |
| `DATA_DIR`             | `/var/data/minusone`        | Database and uploads on the persistent disk              |
| `TRUST_PROXY_HOPS`     | `1`                         | Trusts Render's nearest reverse proxy for secure cookies |
| `DEMO_ACCESS_PASSWORD` | Entered privately in Render | Shared demo access; exactly 16 characters                |

The build runs `npm ci --include=dev`, `npm run build`, and `npm prune --omit=dev`. The service runs `npm start`. Database creation and sample seeding happen on first startup **after** the persistent disk is mounted, not during the build.

Only use `TRUST_PROXY_HOPS=1` behind a host that routes requests through its trusted proxy. For direct local access, leave it at `0`. Production traffic must use HTTPS. Passwords never belong in source code, URLs, scripts, commits, or chat.

## Scope of the hosted demo

The password protects the shared workspace, including project reads, uploads, downloads, and the customer/operator role switch. It is not a customer account system: all authenticated demo participants can see and change the same sample projects. Keep live sensitive business documents out of this shared evaluation. Real multi-user operation still requires identity, tenant authorization, secure storage/retention, and the production work listed in the README.

Technical approvals, supplier offers, financing responses, contracts, and external actions remain labelled simulations. Publishing does not enable any real lender submission, installer message, payment, or legal commitment.

The cloud environment's **Publish** action saves a development environment snapshot; it does not deploy this website. A successful Git push likewise does not mean the Render site is live. Confirm deployment success, HTTPS routing, password protection, and restart persistence on the actual hosting service before sharing its address.
