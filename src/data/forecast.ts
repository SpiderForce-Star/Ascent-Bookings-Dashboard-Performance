/**
 * Sales forecast engine + commercial construction market signals.
 * Offline sample model for executive review — not a live econometric feed.
 * Plant: Portland, TN · Primary radius: ~600 miles.
 */

import { monthlyRecords, MONTHS, type MonthKey } from "./bookings";

export type ForecastScenario = "conservative" | "base" | "optimistic";

export interface ForecastMonth {
  key: string;
  year: number;
  month: MonthKey;
  monthIndex: number;
  /** Projected contract revenue */
  revenue: number;
  /** Projected gross margin $ */
  gm: number;
  gmPct: number;
  /** Seasonality index (1.0 = average month) */
  seasonality: number;
  /** Commercial building activity index (100 = baseline) */
  marketIndex: number;
  isActual: boolean;
}

export interface ForecastSummary {
  scenario: ForecastScenario;
  label: string;
  description: string;
  h2_2026: number;
  fullYear_2026: number;
  fullYear_2027: number;
  ytdActual: number;
  growthVs2025: number;
  impliedGmPct: number;
  months: ForecastMonth[];
}

/** Average monthly seasonality from 2023–2025 actuals (share of annual / 1/12). */
function computeSeasonality(): number[] {
  const byMonth = Array.from({ length: 12 }, () => ({ sum: 0, n: 0 }));
  for (const r of monthlyRecords) {
    if (r.year >= 2023 && r.year <= 2025 && r.sales > 0) {
      byMonth[r.monthIndex].sum += r.sales;
      byMonth[r.monthIndex].n += 1;
    }
  }
  const avgs = byMonth.map((m) => (m.n > 0 ? m.sum / m.n : 0));
  const mean = avgs.reduce((a, b) => a + b, 0) / 12;
  return avgs.map((a) => (mean > 0 ? a / mean : 1));
}

/** Trailing 12-month average revenue (through Jun 2026). */
function trailing12Avg(): number {
  const rows = monthlyRecords.filter((r) => r.sales > 0).slice(-12);
  if (rows.length === 0) return 7_000_000;
  return rows.reduce((s, r) => s + r.sales, 0) / rows.length;
}

/** YoY growth trend from recent complete years. */
function trendGrowth(): number {
  const sum = (y: number) =>
    monthlyRecords.filter((r) => r.year === y && r.sales > 0).reduce((s, r) => s + r.sales, 0);
  const y23 = sum(2023);
  const y24 = sum(2024);
  const y25 = sum(2025);
  const g1 = y23 > 0 ? (y24 - y23) / y23 : 0;
  const g2 = y24 > 0 ? (y25 - y24) / y24 : 0;
  // Weight recent year more
  return g1 * 0.35 + g2 * 0.65;
}

/** Blended GM % from 2026 YTD. */
function recentGmPct(): number {
  const rows = monthlyRecords.filter((r) => r.year === 2026 && r.sales > 0);
  const sales = rows.reduce((s, r) => s + r.sales, 0);
  const gm = rows.reduce((s, r) => s + r.gm, 0);
  return sales > 0 ? gm / sales : 0.26;
}

/**
 * Commercial construction activity index by month (sample).
 * Reflects typical SE US non-res construction seasonality + mild expansion 2026–27.
 * 100 = neutral; >100 supports higher bookings.
 */
const MARKET_INDEX: Record<string, number> = {
  "2026-6": 104,
  "2026-7": 102,
  "2026-8": 103,
  "2026-9": 106,
  "2026-10": 108,
  "2026-11": 105,
  "2026-12": 101,
  "2027-0": 103,
  "2027-1": 105,
  "2027-2": 107,
  "2027-3": 109,
  "2027-4": 111,
  "2027-5": 110,
  "2027-6": 108,
  "2027-7": 107,
  "2027-8": 109,
  "2027-9": 112,
  "2027-10": 110,
  "2027-11": 106,
};

const SCENARIO_MULTIPLIER: Record<ForecastScenario, number> = {
  conservative: 0.92,
  base: 1.0,
  optimistic: 1.1,
};

const SCENARIO_META: Record<
  ForecastScenario,
  { label: string; description: string }
> = {
  conservative: {
    label: "Conservative",
    description: "Softer SE non-res pipeline (−8% vs base); slower private industrial starts.",
  },
  base: {
    label: "Base case",
    description: "Seasonality + recent growth trend, tempered by commercial building activity index.",
  },
  optimistic: {
    label: "Optimistic",
    description: "Stronger warehouse/industrial and public work within the 600-mile radius (+10%).",
  },
};

export function buildForecast(scenario: ForecastScenario = "base"): ForecastSummary {
  const seasonality = computeSeasonality();
  const t12 = trailing12Avg();
  const growth = trendGrowth();
  const gmPct = recentGmPct();
  const mult = SCENARIO_MULTIPLIER[scenario];

  // Anchor annualized run-rate
  const annualized = t12 * 12 * (1 + Math.max(growth, -0.05) * 0.5);

  const actual2026 = monthlyRecords.filter((r) => r.year === 2026 && r.sales > 0);
  const ytdActual = actual2026.reduce((s, r) => s + r.sales, 0);
  const ytdGm = actual2026.reduce((s, r) => s + r.gm, 0);

  const months: ForecastMonth[] = [];

  // Actuals first
  for (const r of actual2026) {
    months.push({
      key: `${r.month.slice(0, 3)} ${r.year}`,
      year: r.year,
      month: r.month,
      monthIndex: r.monthIndex,
      revenue: r.sales,
      gm: r.gm,
      gmPct: r.gmPct,
      seasonality: seasonality[r.monthIndex],
      marketIndex: MARKET_INDEX[`${r.year}-${r.monthIndex}`] ?? 100,
      isActual: true,
    });
  }

  // Forecast Jul 2026 – Dec 2027
  for (const year of [2026, 2027]) {
    for (let mi = 0; mi < 12; mi++) {
      if (year === 2026 && mi <= 5) continue;
      const seas = seasonality[mi];
      const mkt = MARKET_INDEX[`${year}-${mi}`] ?? 100;
      const yearLift = year === 2027 ? 1 + Math.max(growth, 0.02) * 0.6 : 1;
      const baseMonth = (annualized / 12) * seas * (mkt / 100) * yearLift * mult;
      const rev = Math.round(baseMonth * 100) / 100;
      const gm = rev * gmPct;
      months.push({
        key: `${MONTHS[mi].slice(0, 3)} ${year}`,
        year,
        month: MONTHS[mi],
        monthIndex: mi,
        revenue: rev,
        gm,
        gmPct,
        seasonality: seas,
        marketIndex: mkt,
        isActual: false,
      });
    }
  }

  const h2 = months.filter((m) => m.year === 2026 && m.monthIndex >= 6 && !m.isActual);
  const h2_2026 = h2.reduce((s, m) => s + m.revenue, 0);
  const fullYear_2026 = ytdActual + h2_2026;
  const fullYear_2027 = months.filter((m) => m.year === 2027).reduce((s, m) => s + m.revenue, 0);
  const y25 = monthlyRecords.filter((r) => r.year === 2025).reduce((s, r) => s + r.sales, 0);

  return {
    scenario,
    ...SCENARIO_META[scenario],
    h2_2026,
    fullYear_2026,
    fullYear_2027,
    ytdActual,
    growthVs2025: y25 > 0 ? (fullYear_2026 - y25) / y25 : 0,
    impliedGmPct: fullYear_2026 > 0 ? (ytdGm + h2.reduce((s, m) => s + m.gm, 0)) / fullYear_2026 : gmPct,
    months,
  };
}

/** Commercial segment demand mix (sample) for territory narrative. */
export const commercialSegments = [
  { name: "Warehouse / distribution", share: 0.28, outlook: "Strong", note: "E-commerce + nearshoring logistics" },
  { name: "Light industrial / mfg", share: 0.22, outlook: "Solid", note: "Plant expansions within 600 mi" },
  { name: "Agricultural / equestrian", share: 0.14, outlook: "Stable", note: "Core Ascent strength" },
  { name: "Commercial retail / strip", share: 0.12, outlook: "Mixed", note: "Selective suburban sites" },
  { name: "Public / institutional", share: 0.1, outlook: "Improving", note: "Schools, munis, first response" },
  { name: "Self-storage / specialty", share: 0.08, outlook: "Solid", note: "Repeat developers" },
  { name: "Other commercial", share: 0.06, outlook: "Stable", note: "Misc. commercial shells" },
];
