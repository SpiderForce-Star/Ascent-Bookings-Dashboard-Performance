# Ascent Buildings — Bookings Performance Dashboard

**Corporate review build** for [Ascent Buildings LLC](https://github.com/SpiderForce-Star/Ascent-Bookings-Dashboard-Performance).

Interactive executive dashboard for **bookings, margin, live construction market feeds, sales forecast, and market territory**, seeded with data from the **2nd Quarterly 2026 Bookings / Margin Report**.

| | |
| --- | --- |
| **Plant** | Portland, Tennessee |
| **Service area** | ~600-mile radius — AR, MO, IL, IN, OH, WV, PA, VA, NC, SC, Upper FL, Southeast into East TX |
| **Data period** | Actuals 2023 – June 2026; forecast Jul 2026 – Dec 2027 |
| **Live feeds** | FRED (construction put-in-place, permits) + BLS (employment, industrial building PPI) |
| **Stack** | React 19 · TypeScript · Vite · TanStack Start · Tailwind · Recharts |

---

## Executive summary

Five review tabs:

1. **Performance** — KPI cards (revenue, YoY growth, volume churn, gross margin), date-range filters, trend charts, monthly + segment breakdown tables.
2. **Market feeds** — **Live** national construction indicators from FRED and BLS, composite commercial index, MoM/YoY moves, history charts. Offline cache fallback if APIs are unreachable.
3. **Dodge pipeline** — Project-level commercial opportunities via the **Dodge Construction Network REST API** (OAuth 2.0). Demo SE pipeline when credentials are not configured.
4. **Forecast** — H2 2026 / FY 2027 planning model with Conservative / Base / Optimistic scenarios. **Automatically biased by live feed composite** (nonres spending, employment, materials PPI).
5. **Territory** — Portland, TN footprint schematic, state demand scores, pipeline indices.

> Forecast and territory demand scores are **planning models**. FRED/BLS are national public statistics. **Dodge project data requires an enterprise license** ([request API access](https://www.construction.com/apis/)).

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


---

## Dodge Construction Network API

Dodge is **enterprise-only** (REST + OAuth 2.0). Public docs: [construction.com/apis](https://www.construction.com/apis/).

| Capability | Detail |
| --- | --- |
| Protocol | REST over HTTPS, JSON |
| Auth | OAuth 2.0 client credentials **or** bearer token / API key |
| Data | Projects, companies/contacts, project documents |
| Filters | Geography, stage, valuation, building type, bid date, trade |

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

Without Dodge credentials, `/api/dodge/projects` returns a **demo** pipeline sized to the Portland, TN ~600-mile commercial footprint (labeled demo — not licensed Dodge content).


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

**Environment variables (optional):**

| Variable | Recommended |
| --- | --- |
| `VITE_AUTH_ENABLED` | `false` for public executive review (no login wall) |
| `DODGE_API_BASE_URL` / `DODGE_CLIENT_ID` / `DODGE_CLIENT_SECRET` | Live Dodge pipeline |
| `DATABASE_URL` | Neon Postgres if you want shared server DB |

### CLI

```bash
npm i -g vercel
vercel login
vercel --prod
```

## Quick start

```bash
npm install
npm run dev      # http://localhost:8080
npm run build    # production build (Vercel-ready)
npm run typecheck
```

Requires **Node 22+**.

---

## Repository layout

```
src/
  components/dashboard/   # Performance, feeds, Dodge, forecast, territory UI
  data/                   # Bookings, forecast, territory, feeds, Dodge types/demo
  hooks/                  # useConstructionFeeds, useDodgeProjects
  lib/construction-feeds.server.ts  # FRED + BLS fetchers
  lib/dodge.server.ts               # Dodge OAuth + project client
  routes/api/construction-feeds.ts
  routes/api/dodge/projects.ts
public/logo.jpg
.env.example              # Dodge + DB env template
```

---

## Corporate review checklist

- [ ] Confirm KPI definitions (revenue = total contract; GM = report gross margin)  
- [ ] Review live feed composite vs sales leadership gut-check  
- [ ] Validate H2 2026 base-case forecast  
- [ ] Align territory demand scores with regional managers  
- [ ] Obtain Dodge API credentials and set `DODGE_*` env vars for live pipeline  
- [ ] Optional: private Vercel deploy for always-on executive URL  

---

## License / confidentiality

Internal business performance materials. Restrict distribution per company policy.
