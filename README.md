# Ascent Buildings — Bookings Performance Dashboard

**Corporate review build** for [Ascent Buildings LLC](https://github.com/SpiderForce-Star/Ascent-Bookings-Dashboard-Performance).

Interactive executive dashboard for **bookings, margin, live construction market feeds, sales forecast, market territory, and state sales handoff sheets**, seeded with data from the **2nd Quarterly 2026 Bookings / Margin Report**.

| | |
| --- | --- |
| **Plant** | Portland, Tennessee |
| **Service area** | ~600-mile radius — AR, MO, IL, IN, OH, WV, PA, VA, NC, SC, Upper FL, Southeast into East TX, plus core TN/KY/AL/GA/MS |
| **Product focus** | Pre-Engineered Metal Buildings (**PEMB**) / **CSI Division 13** Special Construction — metal building systems, structural steel packages, industrial / warehouse / ag / self-storage shells |
| **Data period** | Actuals 2023 – June 2026; forecast Jul 2026 – Dec 2027 |
| **Live feeds** | FRED (construction put-in-place, permits) + BLS (employment, industrial building PPI) |
| **Stack** | React 19 · TypeScript · Vite · TanStack Start · Tailwind · Recharts |

---

## Executive summary

Seven review tabs:

1. **Performance** — KPI cards (revenue, YoY growth, volume churn, gross margin), date-range filters, trend charts, monthly + segment breakdown tables. **Real bookings history only** (from the quarterly workbook).
2. **Market feeds** — **Live** national construction indicators from FRED and BLS, composite commercial index, MoM/YoY moves, history charts. Offline cache fallback if APIs are unreachable.
3. **Dodge pipeline** — Project-level commercial opportunities via the **Dodge Construction Network REST API** (OAuth 2.0). Defaults to **PEMB focus** (industrial / warehouse / manufacturing / self-storage / ag metal building work) with **CSI Division 13** labeling. Demo SE pipeline when credentials are not configured.
4. **Sales forecast** — H2 2026 / FY 2027 planning model with Conservative / Base / Optimistic scenarios, plus:
   - Forecast by **region** (core / primary / extended) and optionally by **state** (allocated with demand × pipeline weights — **illustrative**, not booked revenue by state)
   - **PEMB-only** vs total commercial
   - **Capacity-aware** monthly fab $ cap
   - **Materials stress** toggle (steel/lumber PPI drag on GM, −200 bps)
   - **Bid-conversion** slider (15–35% of design/bid pipeline converts over ~6 months)
   - Live FRED/BLS bias remains on the national case
5. **Steel cost** — Full port of the Ascent steel 2-year forecast (formerly Streamlit): PEMB/Div 13 material categories, risk engine (tariff / dumping / geo / demand vol), Base vs Risk-Adjusted $/ton paths, MoM, tornado + one-way sensitivity, Excel upload, Excel/PDF/CSV export, **PEMB cost impact** card, and **state steel sheets** for VP → rep handoff. Offline sample data always works.
6. **Territory** — Portland, TN footprint schematic, state demand scores, pipeline indices, **PEMB share** by state.
7. **Sales sheets** — VP Sales / Marketing handoff packs: one independent summary sheet per territory state (salesperson, demand, PEMB pipeline, bids due, call list, VP notes, quota placeholder). Print-friendly detail + **Download CSV pack**.

> Forecast, territory scores, and state sales-sheet pipeline $ are **planning models**. FRED/BLS are national public statistics. **Dodge project data requires an enterprise license** ([request API access](https://www.construction.com/apis/)). Do **not** treat allocated state forecast $ as booked revenue.

---

## Steel cost forecast (PEMB / Division 13 materials)

Ported from [ascent-steel-forecast](https://github.com/SpiderForce-Star/ascent-steel-forecast) into a first-class dashboard module (TypeScript only — no Streamlit/Python).

| Capability | Detail |
| --- | --- |
| Categories | Overall, Hot Rolled Plates, HR I-Beams/Channels, Sub Framing, Sheet/Trim Painted, HSS Round Pipes, HSS Square/Rect Tubes, TNFAB, TNFAB2nd |
| Risk engine | Tariff pass-through 0.38, dumping pressure −0.12, geo sensitivity 0.55, vol mean/osc, category multipliers, horizon weighting, clamp [−18%, +28%] |
| Views | Overview · Category deep dive · Sensitivity (tornado + tariff one-way) · State steel sheets · Export |
| Upload | Client-side Excel parse of Month \| Price \| MoM blocks (same layouts as the original models) |
| Export | Excel workbook, PDF executive brief, CSV, multi-sheet **state pack** for the field |
| Live bias | Optional FRED/BLS composite nudge on geo premium / demand vol |

### VP use of steel state sheets

1. Open **Steel cost** → set risk sliders → **Apply risk case**.
2. Open **State steel sheets** sub-view.
3. Each card shows demand score, PEMB share, risk-adjusted Overall $/ton, focus categories, talking points, and recommended action.
4. Click **Export all state sheets** for an Excel pack (cover + all-states summary + one sheet per state) to email regional reps.

Pair with the **Sales sheets** tab (pipeline / call list / quota) for a full handoff: opportunity context + steel cost narrative.

---

## Sales sheets (VP Sales handoff)

**Who uses them:** VP of Sales assigns / reviews each state pack with regional reps and marketing.

**How to use:**

1. Open the **Sales sheets** tab.
2. Filter by region tier (core / primary / extended) and sort by demand, pipeline, miles, or name.
3. Click a state card for the full sheet:
   - Region tier, miles from Portland plant, demand & pipeline scores
   - Editable **salesperson** and **quota / target $** (placeholders in local state)
   - PEMB / Division 13 metrics: active projects, $ in design/bidding, top building types, PEMB share %
   - KPI strip: pipeline $, bids due 30 / 60 / 90 days
   - Suggested call list (architect / GC / developer placeholders)
   - **VP of Sales notes** box
4. **Print / PDF** uses the browser print dialog (print-friendly layout).
5. **Download CSV pack** exports all states for offline handoff.

Pipeline opportunities on sales sheets are **demo / illustrative** for handoff — keep real booked performance on the **Performance** tab.

---

## Live construction feeds

| Series | Source | Use |
| --- | --- | --- |
| `TLNRESCONS` / `PNRESCONS` | FRED | Private nonresidential construction put-in-place |
| `TTLCONS` | FRED | Total construction spending |
| `PERMIT` | FRED | Building permits (residential context) |
| `CES2000000001` | BLS | Construction employment (SA) |
| `PCU236211236211` | BLS | Industrial building construction PPI |
| `WPU081` | BLS | Lumber & wood products PPI |

**API endpoint (app):** `GET /api/construction-feeds`  
Refreshes on load and via the **Refresh** control. Results cached ~5 minutes at the edge when deployed.

No API keys required for FRED CSV export or BLS public API (rate limits apply).

---

## Dodge Construction Network API

Dodge is **enterprise-only** (REST + OAuth 2.0). Public docs: [construction.com/apis](https://www.construction.com/apis/).

| Capability | Detail |
| --- | --- |
| Protocol | REST over HTTPS, JSON |
| Auth | OAuth 2.0 client credentials **or** bearer token / API key |
| Data | Projects, companies/contacts, project documents |
| Filters | Geography, stage, valuation, building type, bid date, trade |
| Product lines | **PEMB / Div 13**, Component, Other (demo + inferred live) |

### Configure live Dodge

1. Talk to Dodge for API credentials ([Talk to an expert](https://www.construction.com/apis/)).
2. Copy `.env.example` → `.env` and set:

```bash
DODGE_API_BASE_URL=https://api.construction.com/v1   # use URL Dodge issues
DODGE_CLIENT_ID=...
DODGE_CLIENT_SECRET=...
# optional:
# DODGE_TOKEN_URL=...
# DODGE_ACCESS_TOKEN=...
# DODGE_API_KEY=...
```

3. Restart the server. Open **Dodge pipeline** — status badge should switch from **Demo pipeline** to **Dodge live**.

### App endpoints

| Route | Purpose |
| --- | --- |
| `GET /api/dodge/projects` | Territory-filtered projects (maxMiles, minValuation query params) |
| `GET /api/construction-feeds` | FRED + BLS national market series |

Without Dodge credentials, `/api/dodge/projects` returns a **demo** pipeline sized to the Portland, TN ~600-mile commercial footprint (labeled demo — not licensed Dodge content), with **2–5 PEMB opportunities per state** available on Sales sheets.

---

## Deploy (Vercel)

Production build is Nitro → Vercel Build Output API (already verified with `npm run build`).

### One-click (recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FSpiderForce-Star%2FAscent-Bookings-Dashboard-Performance&project-name=ascent-bookings-dashboard&repository-name=Ascent-Bookings-Dashboard-Performance&env=VITE_AUTH_ENABLED&envDescription=Set%20VITE_AUTH_ENABLED%3Dfalse%20for%20public%20executive%20access%20without%20login.&envLink=https%3A%2F%2Fgithub.com%2FSpiderForce-Star%2FAscent-Bookings-Dashboard-Performance%23deploy-vercel)

Or import the repo: **[vercel.com/new](https://vercel.com/new)** → Import `SpiderForce-Star/Ascent-Bookings-Dashboard-Performance`.

**Build settings** (auto-detected from `vercel.json`):

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Install command | `npm install` |
| Output | Nitro writes `.vercel/output` (Build Output API) |
| Region | `iad1` (US East) |

### Environment variables

Full guide: **[docs/VERCEL_ENV.md](./docs/VERCEL_ENV.md)** · template: [`.env.vercel.example`](./.env.vercel.example)

| Variable | Value | Required? |
| --- | --- | --- |
| `VITE_AUTH_ENABLED` | `false` | **Yes** for public exec review |
| `SITE_URL` | `https://dashboard.ascentbuildings.com` | Recommended |
| `DODGE_*` | from Dodge | Optional (demo pipeline if unset) |
| `DATABASE_URL` | Neon Postgres URL | Optional (PGLite if unset) |

In Vercel: **Settings → Environment Variables** → add → **Redeploy**.

### CLI

```bash
npm i -g vercel
vercel login
vercel --prod
```

---

## Custom domain

**Target URL:** `https://dashboard.ascentbuildings.com`

DNS for `ascentbuildings.com` is on **GoDaddy**. Full walkthrough (Vercel + GoDaddy CNAME + SSL):

→ **[docs/CUSTOM_DOMAIN.md](./docs/CUSTOM_DOMAIN.md)**

| Record | Name | Points to |
| --- | --- | --- |
| CNAME | `dashboard` | `cname.vercel-dns.com` (or the target Vercel shows) |

Leave apex/`www` alone so the marketing site at [ascentbuildings.com](https://ascentbuildings.com) is unchanged.

## Quick start

```bash
npm install
npm run dev      # http://localhost:8080 (0.0.0.0:8080)
npm run build    # production build (Vercel-ready)
npm run typecheck
```

Requires **Node 22+**. Dev server binds **0.0.0.0:8080** (see `package.json` and `startup.sh`).

---

## Repository layout

```
src/
  components/dashboard/   # Performance, feeds, Dodge, forecast, territory, sales sheets
  data/
    bookings.ts           # Real monthly bookings / segment history (do not invent state booked $)
    territory.ts          # States, demand, pipeline, PEMB share
    sales-sheets.ts       # Per-state salesperson, PEMB opps, call lists, quotas
    forecast.ts           # National + region/state allocation, PEMB, capacity, materials, bid conversion
    steel-forecast.ts     # Steel categories, sample data, risk engine (TS port of forecast_engine.py)
    steel-sample.json     # Embedded 24-month sample_forecast.csv
    steel-state-sheets.ts # VP steel talking points by territory state
    dodge.ts              # Project types, product lines, demo pipeline
    construction-feeds.ts # FRED/BLS offline cache + signal
  components/dashboard/steel-forecast-panel.tsx
  lib/steel-export.ts     # Excel / PDF / CSV / state pack exports
  hooks/                  # useConstructionFeeds, useDodgeProjects
  lib/construction-feeds.server.ts
  lib/dodge.server.ts
  routes/api/construction-feeds.ts
  routes/api/dodge/projects.ts
public/logo.jpg
.env.example
startup.sh                # Ensures dev on :8080
```

---

## Corporate review checklist

- [ ] Confirm KPI definitions (revenue = total contract; GM = report gross margin)  
- [ ] Review live feed composite vs sales leadership gut-check  
- [ ] Validate H2 2026 base-case forecast (+ PEMB-only and capacity scenarios)  
- [ ] Align territory demand scores with regional managers  
- [ ] Walk **Sales sheets** with VP Sales — assign reps, edit notes, export CSV  
- [ ] Obtain Dodge API credentials and set `DODGE_*` env vars for live pipeline  
- [ ] Optional: private Vercel deploy for always-on executive URL  

---

## License / confidentiality

Internal business performance materials. Restrict distribution per company policy.
