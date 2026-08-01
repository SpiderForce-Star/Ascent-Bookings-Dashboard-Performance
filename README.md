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

Four review tabs:

1. **Performance** — KPI cards (revenue, YoY growth, volume churn, gross margin), date-range filters, trend charts, monthly + segment breakdown tables.
2. **Market feeds** — **Live** national construction indicators from FRED and BLS, composite commercial index, MoM/YoY moves, history charts. Offline cache fallback if APIs are unreachable.
3. **Forecast** — H2 2026 / FY 2027 planning model with Conservative / Base / Optimistic scenarios. **Automatically biased by live feed composite** (nonres spending, employment, materials PPI).
4. **Territory** — Portland, TN footprint schematic, state demand scores, pipeline indices.

> Forecast and territory demand scores are **planning models**. Live feeds are national public statistics — not a substitute for project-level Dodge/ConstructConnect bid lists.

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
  components/dashboard/   # Performance, feeds, forecast, territory UI
  data/                   # Bookings, forecast model, territory, feed types/cache
  hooks/                  # useConstructionFeeds
  lib/construction-feeds.server.ts  # FRED + BLS fetchers
  routes/api/construction-feeds.ts  # Live API route
public/logo.jpg
```

---

## Corporate review checklist

- [ ] Confirm KPI definitions (revenue = total contract; GM = report gross margin)  
- [ ] Review live feed composite vs sales leadership gut-check  
- [ ] Validate H2 2026 base-case forecast  
- [ ] Align territory demand scores with regional managers  
- [ ] Optional next: Dodge/ConstructConnect project feeds (requires commercial license)  
- [ ] Optional: private Vercel deploy for always-on executive URL  

---

## License / confidentiality

Internal business performance materials. Restrict distribution per company policy.
