/**
 * Sales forecast engine + commercial construction market signals.
 * Accepts optional live-feed bias from FRED/BLS construction indicators.
 * Supports region/state allocation, PEMB-only, capacity caps, materials stress,
 * and bid-conversion uplift — all offline-capable with sample data.
 * Plant: Portland, TN · Primary radius: ~600 miles.
 */

import { monthlyRecords, MONTHS, type MonthKey } from "./bookings";
import {
  DEFAULT_PEMB_SHARE,
  regionAllocationWeights,
  stateAllocationWeights,
  stateSalesSheets,
  territoryPembShare,
  totalBiddingPipeline,
} from "./sales-sheets";
import { territoryStates } from "./territory";

export type ForecastScenario = "conservative" | "base" | "optimistic";

export type ForecastAllocation = "national" | "region" | "state";

export type RegionFilter = "all" | "core" | "primary" | "extended";

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
  /** True when monthly fab capacity cap was applied */
  capacityCapped?: boolean;
}

export interface RegionBreakdownRow {
  region: "core" | "primary" | "extended";
  label: string;
  weight: number;
  h2_2026: number;
  fullYear_2026: number;
  fullYear_2027: number;
  pembShare: number;
}

export interface StateBreakdownRow {
  code: string;
  name: string;
  region: "core" | "primary" | "extended";
  weight: number;
  h2_2026: number;
  fullYear_2026: number;
  fullYear_2027: number;
  pembShare: number;
  /** Illustrative allocated outlook — not booked revenue by state */
  illustrative: true;
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
  /** Live feed multiplier applied (1 = none) */
  liveBiasApplied: number;
  /** PEMB share applied (1 = full commercial) */
  pembShareApplied: number;
  /** Bid conversion $ added into H2 (spread) */
  bidConversionUplift: number;
  /** Materials stress GM drag in percentage points (e.g. 0.02 = −200 bps) */
  materialsGmDrag: number;
  capacityCapMonthly: number | null;
  allocation: ForecastAllocation;
  regionFilter: RegionFilter;
  regionBreakdown: RegionBreakdownRow[];
  stateBreakdown: StateBreakdownRow[];
  optionsNote: string;
}

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

function trailing12Avg(): number {
  const rows = monthlyRecords.filter((r) => r.sales > 0).slice(-12);
  if (rows.length === 0) return 7_000_000;
  return rows.reduce((s, r) => s + r.sales, 0) / rows.length;
}

function trendGrowth(): number {
  const sum = (y: number) =>
    monthlyRecords.filter((r) => r.year === y && r.sales > 0).reduce((s, r) => s + r.sales, 0);
  const y23 = sum(2023);
  const y24 = sum(2024);
  const y25 = sum(2025);
  const g1 = y23 > 0 ? (y24 - y23) / y23 : 0;
  const g2 = y24 > 0 ? (y25 - y24) / y24 : 0;
  return g1 * 0.35 + g2 * 0.65;
}

function recentGmPct(): number {
  const rows = monthlyRecords.filter((r) => r.year === 2026 && r.sales > 0);
  const sales = rows.reduce((s, r) => s + r.sales, 0);
  const gm = rows.reduce((s, r) => s + r.gm, 0);
  return sales > 0 ? gm / sales : 0.26;
}

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

const SCENARIO_META: Record<ForecastScenario, { label: string; description: string }> = {
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

const REGION_LABELS: Record<"core" | "primary" | "extended", string> = {
  core: "Core (TN/KY/AL)",
  primary: "Primary (~600 mi)",
  extended: "Extended / selective",
};

export interface ForecastOptions {
  /** Multiplier from live feeds, e.g. 1.02 = +2% */
  liveBias?: number;
  /** Live composite index (100 = neutral) — blends into near-term marketIndex */
  liveCompositeIndex?: number;
  /** PEMB / Division 13 metal building systems only (vs total commercial) */
  pembOnly?: boolean;
  /** Override PEMB share (default from territory pipeline weights) */
  pembShare?: number;
  /** Materials stress: steel/lumber PPI drag on GM (−200 bps default when true) */
  materialsStress?: boolean;
  /** Bid-conversion rate 0.15–0.35 of bidding/design pipeline converts in ~6 months */
  bidConversionPct?: number;
  /**
   * Optional monthly fab capacity cap ($). When set (esp. optimistic),
   * projected months are capped so plant capacity is not exceeded.
   */
  capacityCapMonthly?: number | null;
  /** How to slice the national forecast for tables */
  allocation?: ForecastAllocation;
  /** Filter region breakdown / scale national when not "all" */
  regionFilter?: RegionFilter;
}

export function buildForecast(
  scenario: ForecastScenario = "base",
  options: ForecastOptions = {},
): ForecastSummary {
  const seasonality = computeSeasonality();
  const t12 = trailing12Avg();
  const growth = trendGrowth();
  let gmPct = recentGmPct();
  const mult = SCENARIO_MULTIPLIER[scenario];
  const liveBias = options.liveBias ?? 1;
  const liveComposite = options.liveCompositeIndex;
  const pembOnly = options.pembOnly ?? false;
  const pembShare = options.pembShare ?? territoryPembShare() ?? DEFAULT_PEMB_SHARE;
  const materialsStress = options.materialsStress ?? false;
  const materialsGmDrag = materialsStress ? 0.02 : 0;
  if (materialsStress) gmPct = Math.max(gmPct - materialsGmDrag, 0.12);
  const bidConversionPct = options.bidConversionPct ?? 0;
  const capacityCapMonthly =
    options.capacityCapMonthly != null && options.capacityCapMonthly > 0
      ? options.capacityCapMonthly
      : null;
  const allocation = options.allocation ?? "national";
  const regionFilter = options.regionFilter ?? "all";

  const annualized = t12 * 12 * (1 + Math.max(growth, -0.05) * 0.5);
  const productScale = pembOnly ? pembShare : 1;

  const regionWeights = regionAllocationWeights();
  const regionScale = regionFilter === "all" ? 1 : regionWeights[regionFilter];

  const biddingPipe = totalBiddingPipeline() * productScale;
  const bidConversionUplift = bidConversionPct > 0 ? biddingPipe * bidConversionPct : 0;
  const bidPerMonth = bidConversionUplift > 0 ? bidConversionUplift / 6 : 0;

  const actual2026 = monthlyRecords.filter((r) => r.year === 2026 && r.sales > 0);
  const months: ForecastMonth[] = [];

  for (const r of actual2026) {
    months.push({
      key: `${r.month.slice(0, 3)} ${r.year}`,
      year: r.year,
      month: r.month,
      monthIndex: r.monthIndex,
      revenue: r.sales * productScale * regionScale,
      gm: r.gm * productScale * regionScale,
      gmPct: r.gmPct - materialsGmDrag,
      seasonality: seasonality[r.monthIndex],
      marketIndex: MARKET_INDEX[`${r.year}-${r.monthIndex}`] ?? 100,
      isActual: true,
    });
  }

  let forecastMonthIdx = 0;
  for (const year of [2026, 2027]) {
    for (let mi = 0; mi < 12; mi++) {
      if (year === 2026 && mi <= 5) continue;
      const seas = seasonality[mi];
      let mkt = MARKET_INDEX[`${year}-${mi}`] ?? 100;
      if (liveComposite != null && year === 2026 && mi >= 6) {
        const w = mi === 6 ? 0.7 : mi <= 8 ? 0.45 : 0.25;
        mkt = mkt * (1 - w) + liveComposite * w;
      } else if (liveComposite != null && year === 2027 && mi <= 2) {
        mkt = mkt * 0.85 + liveComposite * 0.15;
      }
      const yearLift = year === 2027 ? 1 + Math.max(growth, 0.02) * 0.6 : 1;
      let baseMonth =
        (annualized / 12) *
        seas *
        (mkt / 100) *
        yearLift *
        mult *
        liveBias *
        productScale *
        regionScale;

      if (bidPerMonth > 0 && forecastMonthIdx < 6) {
        baseMonth += bidPerMonth * regionScale;
      }

      let capacityCapped = false;
      if (capacityCapMonthly != null && baseMonth > capacityCapMonthly) {
        baseMonth = capacityCapMonthly;
        capacityCapped = true;
      }

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
        marketIndex: Math.round(mkt * 10) / 10,
        isActual: false,
        capacityCapped,
      });
      forecastMonthIdx += 1;
    }
  }

  const ytdFromMonths = months
    .filter((m) => m.year === 2026 && m.isActual)
    .reduce((s, m) => s + m.revenue, 0);
  const ytdGmFromMonths = months
    .filter((m) => m.year === 2026 && m.isActual)
    .reduce((s, m) => s + m.gm, 0);

  const h2 = months.filter((m) => m.year === 2026 && m.monthIndex >= 6 && !m.isActual);
  const h2_2026 = h2.reduce((s, m) => s + m.revenue, 0);
  const fullYear_2026 = ytdFromMonths + h2_2026;
  const fullYear_2027 = months.filter((m) => m.year === 2027).reduce((s, m) => s + m.revenue, 0);
  const y25 =
    monthlyRecords.filter((r) => r.year === 2025).reduce((s, r) => s + r.sales, 0) *
    productScale *
    regionScale;

  const meta = SCENARIO_META[scenario];
  const notes: string[] = [];
  if (liveBias !== 1 || liveComposite != null) notes.push("Live FRED/BLS bias on national case");
  if (pembOnly) notes.push(`PEMB-only @ ${(pembShare * 100).toFixed(0)}% of commercial`);
  if (materialsStress) notes.push("Materials stress (−200 bps GM)");
  if (bidConversionPct > 0) {
    notes.push(`Bid conversion ${(bidConversionPct * 100).toFixed(0)}% of design/bid pipeline`);
  }
  if (capacityCapMonthly != null) {
    notes.push(`Monthly fab capacity cap $${(capacityCapMonthly / 1e6).toFixed(1)}M`);
  }
  if (regionFilter !== "all") notes.push(`Region filter: ${regionFilter}`);

  const liveNote =
    liveBias !== 1 || liveComposite != null
      ? " Adjusted by live FRED/BLS construction feeds."
      : "";

  // Allocation tables use unfiltered national totals (demand × pipeline weights)
  const national = computeNationalTotals(scenario, {
    liveBias,
    liveCompositeIndex: liveComposite,
    productScale,
    bidConversionPct,
    capacityCapMonthly,
    gmPct,
  });

  return {
    scenario,
    label: meta.label,
    description: meta.description + liveNote,
    h2_2026,
    fullYear_2026,
    fullYear_2027,
    ytdActual: ytdFromMonths,
    growthVs2025: y25 > 0 ? (fullYear_2026 - y25) / y25 : 0,
    impliedGmPct:
      fullYear_2026 > 0
        ? (ytdGmFromMonths + h2.reduce((s, m) => s + m.gm, 0)) / fullYear_2026
        : gmPct,
    months,
    liveBiasApplied: liveBias,
    pembShareApplied: productScale,
    bidConversionUplift: bidConversionUplift * regionScale,
    materialsGmDrag,
    capacityCapMonthly,
    allocation,
    regionFilter,
    regionBreakdown: buildRegionBreakdown(national),
    stateBreakdown: buildStateBreakdown(national),
    optionsNote: notes.join(" · ") || "Standard national forecast",
  };
}

interface NationalTotals {
  h2_2026: number;
  fullYear_2026: number;
  fullYear_2027: number;
}

function computeNationalTotals(
  scenario: ForecastScenario,
  opts: {
    liveBias: number;
    liveCompositeIndex?: number;
    productScale: number;
    bidConversionPct: number;
    capacityCapMonthly: number | null;
    gmPct: number;
  },
): NationalTotals {
  const seasonality = computeSeasonality();
  const t12 = trailing12Avg();
  const growth = trendGrowth();
  const mult = SCENARIO_MULTIPLIER[scenario];
  const annualized = t12 * 12 * (1 + Math.max(growth, -0.05) * 0.5);
  const ytd =
    monthlyRecords
      .filter((r) => r.year === 2026 && r.sales > 0)
      .reduce((s, r) => s + r.sales, 0) * opts.productScale;

  const biddingPipe = totalBiddingPipeline() * opts.productScale;
  const bidPerMonth =
    opts.bidConversionPct > 0 ? (biddingPipe * opts.bidConversionPct) / 6 : 0;

  let h2 = 0;
  let fy27 = 0;
  let forecastMonthIdx = 0;

  for (const year of [2026, 2027]) {
    for (let mi = 0; mi < 12; mi++) {
      if (year === 2026 && mi <= 5) continue;
      const seas = seasonality[mi];
      let mkt = MARKET_INDEX[`${year}-${mi}`] ?? 100;
      if (opts.liveCompositeIndex != null && year === 2026 && mi >= 6) {
        const w = mi === 6 ? 0.7 : mi <= 8 ? 0.45 : 0.25;
        mkt = mkt * (1 - w) + opts.liveCompositeIndex * w;
      } else if (opts.liveCompositeIndex != null && year === 2027 && mi <= 2) {
        mkt = mkt * 0.85 + opts.liveCompositeIndex * 0.15;
      }
      const yearLift = year === 2027 ? 1 + Math.max(growth, 0.02) * 0.6 : 1;
      let baseMonth =
        (annualized / 12) *
        seas *
        (mkt / 100) *
        yearLift *
        mult *
        opts.liveBias *
        opts.productScale;
      if (bidPerMonth > 0 && forecastMonthIdx < 6) baseMonth += bidPerMonth;
      if (opts.capacityCapMonthly != null && baseMonth > opts.capacityCapMonthly) {
        baseMonth = opts.capacityCapMonthly;
      }
      if (year === 2026) h2 += baseMonth;
      else fy27 += baseMonth;
      forecastMonthIdx += 1;
    }
  }

  return {
    h2_2026: h2,
    fullYear_2026: ytd + h2,
    fullYear_2027: fy27,
  };
}

function buildRegionBreakdown(national: NationalTotals): RegionBreakdownRow[] {
  const weights = regionAllocationWeights();
  const byRegion = {
    core: stateSalesSheets.filter((s) =>
      territoryStates.find((t) => t.code === s.code)?.region === "core",
    ),
    primary: stateSalesSheets.filter((s) =>
      territoryStates.find((t) => t.code === s.code)?.region === "primary",
    ),
    extended: stateSalesSheets.filter((s) =>
      territoryStates.find((t) => t.code === s.code)?.region === "extended",
    ),
  };

  return (["core", "primary", "extended"] as const).map((region) => {
    const sheets = byRegion[region];
    const pipe = sheets.reduce((s, sh) => s + sh.pipelineDollars, 0);
    const pemb =
      pipe > 0
        ? sheets.reduce((s, sh) => s + sh.pipelineDollars * sh.pembShare, 0) / pipe
        : DEFAULT_PEMB_SHARE;
    const w = weights[region];
    return {
      region,
      label: REGION_LABELS[region],
      weight: w,
      h2_2026: national.h2_2026 * w,
      fullYear_2026: national.fullYear_2026 * w,
      fullYear_2027: national.fullYear_2027 * w,
      pembShare: pemb,
    };
  });
}

function buildStateBreakdown(national: NationalTotals): StateBreakdownRow[] {
  const weights = stateAllocationWeights();
  const sheetMap = new Map(stateSalesSheets.map((s) => [s.code, s]));

  return territoryStates.map((st) => {
    const w = weights[st.code] ?? 0;
    const sheet = sheetMap.get(st.code);
    return {
      code: st.code,
      name: st.name,
      region: st.region,
      weight: w,
      h2_2026: national.h2_2026 * w,
      fullYear_2026: national.fullYear_2026 * w,
      fullYear_2027: national.fullYear_2027 * w,
      pembShare: sheet?.pembShare ?? st.pembShare ?? DEFAULT_PEMB_SHARE,
      illustrative: true as const,
    };
  });
}

/** Commercial segment demand mix with product-line tags (sample). */
export const commercialSegments = [
  {
    name: "Warehouse / distribution",
    share: 0.28,
    outlook: "Strong",
    note: "E-commerce + nearshoring logistics",
    productLine: "PEMB" as const,
  },
  {
    name: "Light industrial / mfg",
    share: 0.22,
    outlook: "Solid",
    note: "Plant expansions within 600 mi",
    productLine: "PEMB" as const,
  },
  {
    name: "Agricultural / equestrian",
    share: 0.14,
    outlook: "Stable",
    note: "Core Ascent strength — Div 13 shells",
    productLine: "PEMB" as const,
  },
  {
    name: "Commercial retail / strip",
    share: 0.12,
    outlook: "Mixed",
    note: "Selective suburban sites",
    productLine: "Other" as const,
  },
  {
    name: "Public / institutional",
    share: 0.1,
    outlook: "Improving",
    note: "Schools, munis, first response PEMB",
    productLine: "PEMB" as const,
  },
  {
    name: "Self-storage / specialty",
    share: 0.08,
    outlook: "Solid",
    note: "Repeat developers — metal building systems",
    productLine: "PEMB" as const,
  },
  {
    name: "Components / secondary",
    share: 0.06,
    outlook: "Stable",
    note: "Panels, secondary, trim packages",
    productLine: "Component" as const,
  },
];
