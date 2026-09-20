# AGENTS.MD — Development & Deployment Workflow

This document guides AI agents and developers working on `bibit-web`. It documents the system architecture, local development workflows, production topology, and operational runbooks discovered from the codebase and live Oracle Cloud deployment.

---

## 1. System Architecture & Live Topology

`bibit-web` is a containerized mutual fund analytics dashboard and NAV tracking engine.

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                            Live Production Topology                              │
│                                                                                  │
│   Public Client                                                                  │
│         │                                                                        │
│         ▼                                                                        │
│   https://bibit.edho.dev (Cloudflare DNS & Edge)                                 │
│         │                                                                        │
│         ▼ (Encrypted Cloudflare Tunnel)                                          │
│   [cloudflared-gateway] container on Oracle Cloud VM                             │
│   (Host path: /home/ubuntu/gateway, network: gateway_net)                        │
│         │                                                                        │
│         ▼ (Docker internal routing: http://bibit-web:80)                         │
│   [bibit-web] container (Nginx 1.31.6 Alpine)                                    │
│         ├── Serves compiled SPA assets (/usr/share/nginx/html)                   │
│         └── Serves static API (/api/*) from mounted volume:                      │
│                   │                                                              │
│                   └── ./data/public/ <──────────────────┐ (Daily JSON Export)    │
│                                                         │                        │
│   [api.bibit.id] ──(AES Decryption)──> [bibit-worker] ──┴─> ./data/bibit.sqlite  │
│                                        (Python 3.12 daemon) (43MB+ time series)  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Components & Responsibilities

| Service | Container Name | Technology | Role |
| :--- | :--- | :--- | :--- |
| **`web`** | `bibit-web` | React 18, Vite 5, Tailwind CSS, Nginx (Alpine) | Serves the user dashboard and exposes static JSON endpoints at `/api/*`. Read-only mount of `./data/public`. |
| **`worker`** | `bibit-worker` | Python 3.12, `cryptography`, SQLite | Scheduled background daemon running `scheduler.py` at **22:30 WIB (UTC+7)** daily. Pulls NAV deltas from Bibit, calculates analytics, and dumps static JSON caches. |
| **`gateway`** | `cloudflared-gateway` | Cloudflare Tunnel | Handles ingress for `bibit.edho.dev` and forwards traffic directly to `bibit-web:80` across the shared `gateway_net` Docker bridge. |

---

## 2. Shared Data Contracts (`./data/`)

The application avoids database network latency by having the Python backend pre-render analytics into static JSON files that Nginx serves directly.

- **`data/bibit.sqlite`** (~43MB):
  - Primary persistent data store.
  - Tables: `funds` (metadata), `nav_history` (daily historical NAV points since 2000), `switching_destinations` (permissible switching routes).
- **`data/public/`**:
  - `summary.json`: High-level metrics for all 177+ active funds, totals, AUM, and last updated timestamp (served with `no-cache, must-revalidate`).
  - `switching_graph.json`: Nodes and directed edges representing mutual fund switching routes within identical investment managers and custodian banks.
  - `funds/{symbol}.json`: Detailed historical NAV time series, performance metrics, and individual switching destinations per fund.

---

## 3. Local Development Workflow

### Prerequisites
- Node.js 20+ or **Bun 1.0+**
- Python 3.12+
- Docker & Docker Compose

### Frontend Development (`frontend/`)

```bash
cd frontend
bun install          # or npm install
bun run dev          # Starts local Vite dev server on http://localhost:3000
```

- **Serving API data locally without Docker**:
  Vite expects JSON data at `/api/*.json`. Create a temporary symlink:
  ```bash
  mkdir -p frontend/public
  ln -s ../../data/public frontend/public/api
  ```
  *(Remember to delete `frontend/public` before running Docker builds).*

- **Type Check & Build Validation**:
  Always verify TypeScript and Vite compilation before committing:
  ```bash
  cd frontend
  bun run build      # Executes `tsc && vite build`
  ```

### Backend Development (`backend/`)

```bash
# Setup virtual environment
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt

# Run one-off sync and export immediately (bypasses daily cron schedule)
python3 backend/scheduler.py --now

# Run full historical crawl across all Bibit funds (uses 5 concurrent worker threads)
python3 crawl_bibit.py --db data/bibit.sqlite --workers 5

# Synchronize switching matrix (requires valid Bibit JWT token)
export BIBIT_ACCESS_TOKEN="<jwt_token>"
python3 backend/sync_switches.py
```

---

## 4. Docker Compose & Container Lifecycle

Both services are orchestrated locally and in production using `docker-compose.yml`.

### Network Prerequisite
The containers attach to an external Docker network named `gateway_net`. Create it if it does not already exist:
```bash
docker network create gateway_net
```

### Rebuild Decision Matrix

| What Changed | Action Required | Rebuild `worker`? | Rebuild `web`? |
| :--- | :--- | :---: | :---: |
| **`frontend/src/**`** | `docker compose build web && docker compose up -d web` | ❌ No | ✅ **Yes** |
| **`backend/**`** | `docker compose build worker && docker compose up -d worker` | ✅ **Yes** | ❌ No |
| **`nginx.conf`** | `docker compose build web && docker compose up -d web` | ❌ No | ✅ **Yes** |
| **`docker-compose.yml`** | `docker compose up -d` | ❌ No | ❌ No |
| **Data Sync / Manual Export** | `docker exec bibit-worker python backend/scheduler.py --now` | ❌ No | ❌ No |

---

## 5. Production Environment & Deployment Workflow

### Host & Access Information
- **SSH Target**: `ssh oracle` (connects to `ubuntu@main` on Oracle Cloud Infrastructure).
- **Project Directory**: `/home/ubuntu/bibit-web`.
- **Ingress Gateway**: Managed in `/home/ubuntu/gateway` (`cloudflared-gateway`).
- **Live Production URL**: `https://bibit.edho.dev`.

### Automated Continuous Deployment (GitHub Actions)
Pushes to the `main` branch trigger `.github/workflows/deploy.yml`:
1. GitHub Action authenticates to `ssh oracle` using repository secrets (`SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY`).
2. Navigates to `/home/ubuntu/bibit-web`.
3. Runs the redeployment sequence:
   ```bash
   git fetch origin main
   git reset --hard origin/main
   docker compose build
   docker compose up -d --remove-orphans
   docker compose exec -T worker python exporter.py
   docker image prune -f
   ```
### Manual Production Operations via SSH

Connect directly:
```bash
ssh oracle
```

Common production tasks:
```bash
# Check container status
ssh oracle "cd bibit-web && docker compose ps"

# Stream production logs
ssh oracle "cd bibit-web && docker compose logs -f web"
ssh oracle "cd bibit-web && docker compose logs -f worker"

# Trigger an immediate manual data sync on production
ssh oracle "cd bibit-web && docker compose exec bibit-worker python scheduler.py --now"

# Trigger an immediate static cache export on production
ssh oracle "cd bibit-web && docker compose exec bibit-worker python exporter.py"
# Inspect data file freshness and SQLite size
ssh oracle "cd bibit-web && ls -lh data/ data/public/"
```

---

## 6. Critical Invariants for AI Agents

1. **Never Destroy `data/bibit.sqlite`**:
   The SQLite database holds NAV history dating back to January 2000 across 177+ mutual funds. Never delete, truncate, or overwrite this file during updates.
2. **Synchronize Export & Frontend Schemas**:
   Any schema addition, modification, or deletion in `backend/exporter.py` must be reflected in `frontend/src/types/fund.ts` and verified against consuming React components.
3. **Always Rebuild Containers After Code Changes**:
   When testing changes in Docker environments, editing source files alone is insufficient because containers use pre-built images. Always run `docker compose build web && docker compose up -d web` to verify changes in the running application.
