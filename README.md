# Bibit Web & NAV Analytics Dashboard

A mutual fund analytics dashboard and historical daily Net Asset Value (NAV) tracking system for mutual funds listed on [Bibit](https://bibit.id).

This project tracks Indonesian mutual funds (*reksadana*), syncs historical daily NAV time-series data, computes financial return and risk-adjusted metrics (CAGR, Drawdown, Quality Score, Sortino, Ulcer Index), visualizes fund switching relationships, and serves a modern responsive web dashboard.

---

## Features

- **Mutual Fund Catalog & Analytics**:
  - Filter by asset class: Pasar Uang (Money Market), Obligasi (Fixed Income), Saham (Equity), Campuran (Balanced).
  - Sharia (*Syariah*) filter and investment manager/custodian bank tagging.
  - Key financial metrics: AUM, expense ratio, minimum purchase amount, CAGR, simple return, maximum drawdown, annualized volatility, Sortino ratio, Ulcer Index, Martin ratio, and multi-timeframe Quality Scores.
- **Interactive NAV Charts**:
  - Built with TradingView Lightweight Charts for high-performance financial charting.
  - Multi-timeframe views: 1 Month, Year-to-Date (YTD), 1 Year, 3 Years, 5 Years, and All-Time (since inception).
  - Benchmark comparisons against composite indices.
- **Mutual Fund Switching Graph**:
  - Interactive network visualization of fund switching routes.
  - Explore permissible fund switching destinations within the same investment manager and custodian bank.
- **Automated Daily Scraper & Delta Sync**:
  - Scheduled background worker runs daily at 22:30 WIB (UTC+7).
  - Incremental delta syncs directly against Bibit endpoints (`api.bibit.id`) with payload decryption support (AES-128-CBC).
  - Stores all historical NAV series and metadata into SQLite.
- **Static Cache Exporter & Fast Serving**:
  - Pre-renders analytical summaries into static JSON files (`summary.json`, `funds/{symbol}.json`, `switching_graph.json`).
  - Served via Nginx with fine-tuned caching and compression headers.

---

## Project Architecture

```
bibit-web/
├── AGENTS.MD                 # Operational guide, deployment runbooks, and invariants
├── backend/                  # Python scraper, analytics engine, and scheduler
│   ├── analytics.py          # Return & risk calculations (CAGR, Max Drawdown, Quality Score, Ulcer)
│   ├── bibit_api.py          # HTTP client & decryption for api.bibit.id
│   ├── exporter.py           # SQLite to static JSON exporter
│   ├── manager_names.py      # Investment manager name normalization
│   ├── scraper.py            # Daily catalog & NAV scraper worker
│   ├── scheduler.py          # Daily scheduled sync daemon (22:30 WIB)
│   ├── sync_switches.py      # Switching matrix synchronization tool
│   ├── requirements.txt      # Python dependencies (cryptography)
│   └── Dockerfile            # Python worker container
├── frontend/                 # React SPA
│   ├── src/
│   │   ├── components/       # UI components (FundGrid, FundModal, NavChart, SwitchingGraph)
│   │   ├── types/            # TypeScript interfaces
│   │   ├── utils/            # Formatters and metric calculators
│   │   ├── App.tsx           # Main application entry point
│   │   └── main.tsx
│   ├── nginx.conf            # Nginx config with cache headers for static JSON API
│   ├── package.json          # Frontend dependencies (React, Vite, Tailwind, Lightweight Charts)
│   └── Dockerfile            # Multi-stage build (Bun builder + Nginx)
├── crawl_bibit.py            # Standalone CLI tool for full/historical crawls
├── docker-compose.yml        # Multi-container orchestration (web + worker)
└── .gitignore                # Git ignore rules for data, SQLite, and build artifacts
```

---

## Getting Started

### Prerequisites

- **Python**: 3.12+
- **Node.js**: 20+ or **Bun** 1.0+
- **Docker & Docker Compose** (for containerized deployment)

### 1. Frontend Development

```bash
cd frontend
bun install     # or npm install
bun run dev     # or npm run dev
```

The frontend development server starts on `http://localhost:3000`. Ensure `data/public` has exported JSON files or mock API responses available at `/api/`.

### 2. Backend & Data Scraping

Install backend dependencies:

```bash
pip install -r backend/requirements.txt
```

#### Run Full Initial Crawl:
```bash
python3 crawl_bibit.py --db data/bibit.sqlite --workers 5
```

#### Export Public Static Cache (JSON):
```bash
BIBIT_DB_PATH=data/bibit.sqlite BIBIT_PUBLIC_DIR=data/public python3 backend/exporter.py
```

#### Run Immediate Sync & Export Public Cache:
```bash
BIBIT_DB_PATH=data/bibit.sqlite BIBIT_PUBLIC_DIR=data/public python3 backend/scheduler.py --now
```
#### Sync Switching Matrix (Optional):
```bash
export BIBIT_ACCESS_TOKEN="your_bibit_jwt_token"
python3 backend/sync_switches.py
```

### 3. Docker Deployment

Launch both frontend web server and background scraper worker with Docker Compose:

```bash
docker compose up -d --build
```

- **Frontend / Static API**: Exposed via port 80 attached to `gateway_net` (routed in production via Cloudflare Tunnel at `https://bibit.edho.dev`).
- **Worker**: Runs `scheduler.py` in the background with persistent SQLite storage in `./data`.
- **Operational Runbook**: See [`AGENTS.MD`](AGENTS.MD) for CI/CD setup, container rebuild matrices, and production management via `ssh oracle`.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `TZ` | `Asia/Jakarta` | Timezone for scheduler execution |
| `BIBIT_DB_PATH` | `/app/data/bibit.sqlite` | Path to SQLite database |
| `BIBIT_PUBLIC_DIR` | `/app/data/public` | Directory for exported JSON cache |
| `SCHEDULE_HOUR` | `22` | Daily scheduled run hour (WIB) |
| `SCHEDULE_MINUTE` | `30` | Daily scheduled run minute (WIB) |
| `SCRAPER_WORKERS` | `5` | Concurrent worker threads for API requests |
| `BIBIT_ACCESS_TOKEN` | *None* | Optional JWT for switching matrix endpoints |

---

## License

Private / Personal Use.
