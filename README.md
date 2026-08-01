# Ascent Buildings — Bookings Performance Dashboard

**Corporate review build** for [Ascent Buildings LLC](https://github.com/SpiderForce-Star/Ascent-Bookings-Dashboard-Performance).

Interactive executive dashboard for **bookings, margin, sales forecast, and market territory**, seeded with data from the **2nd Quarterly 2026 Bookings / Margin Report**.

| | |
| --- | --- |
| **Plant** | Portland, Tennessee |
| **Service area** | ~600-mile radius — AR, MO, IL, IN, OH, WV, PA, VA, NC, SC, Upper FL, Southeast into East TX |
| **Data period** | Actuals 2023 – June 2026; forecast Jul 2026 – Dec 2027 |
| **Stack** | React 19 · TypeScript · Vite · TanStack Start · Tailwind · Recharts |

---

## Executive summary

Three review tabs:

1. **Performance** — KPI cards (revenue, YoY growth, volume churn, gross margin), date-range filters, trend charts, monthly + segment breakdown tables. All figures recompute with the selected window.
2. **Forecast** — Planning model for H2 2026 and FY 2027 with **Conservative / Base / Optimistic** scenarios. Uses historical seasonality, recent growth, and a commercial building activity index. Commercial segment demand mix (warehouse, industrial, ag, public, etc.) supports the narrative.
3. **Territory** — Schematic of the Portland, TN footprint, state demand scores, pipeline indices, and top markets for commercial metal building sales.

> Forecast and territory demand scores are **offline planning models** for discussion. They are not live econometric feeds or contractual commitments.

---

## Quick start

```bash
npm install
npm run dev      # http://localhost:8080
npm run build    # production build (Vercel-ready)
npm run typecheck
```

Requires **Node 22+**. Dependencies are defined in `package.json`.

---

## What’s in the data

- Monthly **sales** and **gross margin** (2023–Jun 2026) from the quarterly workbook graphs  
- 2026 YTD **product / plant segments** (Buildings, TN Fab, Central States, Buy-Outs, IMPs, Engineering, etc.)  
- **Volume churn** = share of prior-year revenue not retained on YoY-declining months  
- **Forecast** anchored on trailing-12 run-rate × seasonality × market index × scenario multiplier  

Source workbooks (also under `attachments/` when present):

- `2026 2nd Quarterly Bookings Report.xlsx`
- `June 2026 Bookings Report.xlsx`

---

## Repository layout

```
src/
  components/dashboard/   # Performance, forecast, territory UI
  data/                   # Bookings, forecast model, territory
  routes/                 # TanStack Start routes
  styles.css              # Design tokens (Ascent brand)
public/logo.jpg           # Ascent Buildings logo
```

---

## Corporate review checklist

- [ ] Confirm KPI definitions (revenue = total contract; GM = report gross margin)  
- [ ] Validate H2 2026 base-case forecast vs sales leadership outlook  
- [ ] Align territory demand scores with regional manager input  
- [ ] Decide whether to wire live CRM / ERP feeds next phase  
- [ ] Optional: private deploy (Vercel) for always-on executive link  

---

## License / confidentiality

Internal business performance materials. Restrict distribution per company policy.
