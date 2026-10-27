# UK Wind Forecast Analytics

A full-stack operational analytics platform built for UK electricity procurement and trading desks to evaluate national wind generation forecasts against actuals from Elexon BMRS before executing day-ahead electricity purchasing decisions.

---

## 1. Problem & Objective

Electricity trading desks must make forward commitments during day-ahead auctions (such as EPEX SPOT and Nord Pool, closing at 11:00 or 12:00 GMT on Day D-1). Over-forecasting wind generation risks costly short-imbalance settlement penalties; under-forecasting risks missed revenue or procuring expensive peaking thermal capacity.

This application provides:
- Historical inspection of **January 2026** national wind generation in half-hourly (HH / 30-minute) settlement intervals.
- Strict **decision cutoff filtering**: prevents lookahead bias by selecting only forecasts published at or before the trading decision gate (e.g., 11:00 or 12:00 UTC D-1).
- Time-series visualization comparing forecast curves, actual curves, and error deltas.
- Accuracy metrics: **MAE**, **RMSE**, **Mean Bias Error (MBE)**, and **MAPE** with rigorous handling of zero/missing actuals.
- Interactive ledger with column sorting, timestamp search, and CSV export.

---

## 2. Architecture & Data Flow

```
┌─────────────────────────────────┐
│     Elexon BMRS Datasets        │
│  • FUELHH (Actuals stream)      │
│  • WINDFOR (Forecast stream)    │
└────────────────┬────────────────┘
                 │ HTTP (httpx)
┌────────────────▼──────────────────────────────────────────────┐
│  FastAPI Backend (Python 3.12)                                │
│                                                               │
│  1. ElexonClient (windowing & local caching in data_cache/)   │
│  2. filter_wind_actuals: isolates fuelType='WIND'             │
│  3. select_latest_forecasts: applies decision cutoff & dedup  │
│  4. align_forecasts_and_actuals: inner-join on startTime (HH) │
│  5. calculate_accuracy_metrics: computes MAE, RMSE, MBE, MAPE │
└────────────────┬──────────────────────────────────────────────┘
                 │ JSON REST API (/api/accuracy, /api/health)
┌────────────────▼──────────────────────────────────────────────┐
│  React + Vite Frontend (TypeScript + TailwindCSS + Recharts) │
│                                                               │
│  • Metric summary cards with popover formulas & limitations   │
│  • Composed time-series chart (Forecast vs Actuals vs Delta)  │
│  • Error frequency distribution histogram                     │
│  • Settlement interval ledger with CSV export                 │
└───────────────────────────────────────────────────────────────┘
```

---

## 3. Data Processing & Trading Decision Logic

### A. Elexon Data Sources
- **Actual Generation**: [`FUELHH/stream`](https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/FUELHH/stream)
  - Records filtered to `fuelType == "WIND"`.
  - Half-hour delivery interval identified by `startTime`.
  - Deduplicated by `startTime` (retaining latest publication timestamp).
- **Forecast Generation**: [`WINDFOR/stream`](https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/WINDFOR/stream)
  - `startTime`: Target half-hour delivery interval.
  - `publishTime`: Timestamp when forecast model run was published.
  - `generation`: Forecasted national wind power in MW.

### B. Decision Cutoff Resolution
In the UK power market, day-ahead market participants must lock positions before auction gate closure (typically 11:00 or 12:00 UTC on day D-1).
- When a user selects a day-ahead cutoff (e.g. `11:00` or `12:00`), for each delivery date $D$, the system resolves the cutoff to $D - 1$ at that time.
- Any forecast published after that cutoff is strictly excluded.
- Among remaining candidates for each 30-min delivery interval, the latest publication is selected.

### C. Metric Definitions & Caveats

| Metric | Formula | Definition & Operational Impact | Caveat / Limitation |
|---|---|---|---|
| **MAE** | $\frac{1}{n}\sum \|F_i - A_i\|$ | Mean Absolute Error in MW. Measures average magnitude of error regardless of direction. | Treats 1,000 MW errors equally whether from a sudden ramp or steady miss. |
| **RMSE** | $\sqrt{\frac{1}{n}\sum (F_i - A_i)^2}$ | Root Mean Squared Error in MW. Penalizes large forecast misses quadratically. | Highly sensitive to extreme single-interval ramp deviations. |
| **MBE** | $\frac{1}{n}\sum (F_i - A_i)$ | Mean Bias Error in MW. Positive value indicates systematic over-forecasting; negative indicates under-forecasting. | Offsetting positive and negative errors can mask large underlying misses. |
| **MAPE** | $\frac{100\%}{k}\sum_{A_i > 0} \frac{\|F_i - A_i\|}{A_i}$ | Mean Absolute Percentage Error. Relative error scale. | **Undefined when actual generation is zero.** Zero actual intervals are safely excluded, with valid sample count reported in UI. |

---

## 4. API Specification

- `GET /api/health`: Service health and version status.
- `GET /api/actuals?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`: Returns filtered, deduplicated wind generation actuals.
- `GET /api/forecasts?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&decision_time=12:00`: Returns latest forecasts available at the specified cutoff.
- `GET /api/accuracy?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&decision_time=12:00`: Returns aligned interval time series, MAE, RMSE, MBE, MAPE, and metadata.

---

## 5. Local Setup & Running

### Prerequisites
- Python 3.12+ (or `uv` / `pip`)
- Bun 1.1+ (or Node 20+)
- Docker & Docker Compose (optional)

### A. Run with Docker Compose (Recommended)
```bash
docker compose up --build
```
- Frontend UI: `http://localhost:3000`
- Backend API: `http://localhost:8000/api/health`

### B. Run Manually

**Backend:**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Frontend:**
```bash
cd frontend
bun install
bun run dev
```

---

## 6. Testing

### Backend Tests (pytest)
18 unit and integration tests covering:
- Metric calculations (perfect forecast, known errors, zero actuals, empty lists).
- Forecast cutoff selection (day-ahead D-1 cutoff, ISO timestamp cutoff, deduplication).
- Interval alignment (wind fuel filtering, missing interval counting, error calculations).
- Upstream error handling and API routes.

```bash
cd backend
PYTHONPATH=backend pytest tests/ -v
```

### Frontend Tests (vitest + Testing Library)
4 component tests covering:
- Loading skeleton state.
- Error banner and retry handling.
- Empty interval state guidance.
- Populated state with metric cards, sample counts, and chart elements.

```bash
cd frontend
bun run test
```

---

## 7. Deployment Configuration

- **Frontend (Vercel)**:
  - Configuration in `frontend/vercel.json`.
  - Rewrites `/api/:path*` to the Render backend service URL.
- **Backend (Render)**:
  - Blueprint in `render.yaml`.
  - Runs FastAPI on Uvicorn with auto-healthcheck at `/api/health`.

---

## 8. AI Tools Disclosure

In accordance with transparency requirements:
- Code generation, API contract verification, and test scaffolding were assisted by Google DeepMind Antigravity using Claude / Gemini models under human direction and automated test verification.
