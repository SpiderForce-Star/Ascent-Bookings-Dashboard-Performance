/**
 * US Steel Cost 2-Year Forecast — pure TypeScript port of
 * SpiderForce-Star/ascent-steel-forecast (forecast_engine.py + sample data).
 *
 * PEMB / CSI Division 13 material categories · offline-first · risk engine faithful to Python.
 */

import sampleJson from "./steel-sample.json";

// ── Categories (exact match to Streamlit app) ───────────────────────────────

export const STEEL_CATEGORIES = [
  "Overall",
  "Hot Rolled Plates",
  "HR I-Beams/Channels",
  "Sub Framing",
  "Sheet/Trim Painted",
  "HSS Round Pipes",
  "HSS Square/Rect Tubes",
  "TNFAB",
  "TNFAB2nd",
] as const;

export type SteelCategory = (typeof STEEL_CATEGORIES)[number];

/** All categories are PEMB / Division 13 production-mix materials. */
export const PEMB_DIV13_TAG = "PEMB / CSI Division 13";

export const CATEGORY_ALIASES: Record<string, SteelCategory> = {
  overall: "Overall",
  "overall($/ton)": "Overall",
  "hot rolled plates": "Hot Rolled Plates",
  "hr-plates": "Hot Rolled Plates",
  "hotrolledplates($/ton)": "Hot Rolled Plates",
  "plates/bars($/ton)": "Hot Rolled Plates",
  "plates ($/ton)": "Hot Rolled Plates",
  "hr i-beams/channels": "HR I-Beams/Channels",
  "hr-beams": "HR I-Beams/Channels",
  "hri-beams/channels($/ton)": "HR I-Beams/Channels",
  "beams($/ton)": "HR I-Beams/Channels",
  "i-beams ($/ton)": "HR I-Beams/Channels",
  "sub framing": "Sub Framing",
  subframing: "Sub Framing",
  "subframing($/ton)": "Sub Framing",
  "zee's($/ton)": "Sub Framing",
  "zees($/ton)": "Sub Framing",
  "sheet/trim painted": "Sheet/Trim Painted",
  "sheet/trim": "Sheet/Trim Painted",
  "sheet/trim($/ton)": "Sheet/Trim Painted",
  "sheet/trimpainted($/ton)": "Sheet/Trim Painted",
  "hss round pipes": "HSS Round Pipes",
  "hss pipe": "HSS Round Pipes",
  "hss pipes($/ton)": "HSS Round Pipes",
  "hssroundpipes($/ton)": "HSS Round Pipes",
  "hss square/rect tubes": "HSS Square/Rect Tubes",
  "hss tubes": "HSS Square/Rect Tubes",
  "hss tubes($/ton)": "HSS Square/Rect Tubes",
  "hsssquare/recttubes($/ton)": "HSS Square/Rect Tubes",
  tnfab: "TNFAB",
  tnfab2nd: "TNFAB2nd",
  "tnfab 2nd": "TNFAB2nd",
  "tnfab second": "TNFAB2nd",
  "bars ($/ton)": "Sub Framing",
};

// ── Risk factors (exact defaults from Python) ───────────────────────────────

export interface RiskFactors {
  tariff_change_pct: number;
  china_dumping_risk_pct: number;
  geo_risk_premium_pct: number;
  social_demand_vol_pct: number;
}

export const BASELINE: RiskFactors = {
  tariff_change_pct: 0.0,
  china_dumping_risk_pct: 25.0,
  geo_risk_premium_pct: 9.5,
  social_demand_vol_pct: 10.0,
};

export const TARIFF_PASSTHROUGH = 0.38;
export const DUMPING_PRICE_PRESSURE = -0.12;
export const DUMPING_VOL_PREMIUM = 0.08;
export const GEO_BASELINE = 9.5;
export const GEO_SENSITIVITY = 0.55;
export const VOL_MEAN_PREMIUM = 0.1;
export const VOL_OSC_AMPLITUDE = 0.06;
export const DEFAULT_GEO_IN_BASE = 9.0;
export const ALERT_THRESHOLD = 0.03; // ±3% Base vs Adjusted

const CAT_TARIFF: Record<string, number> = {
  Overall: 1.0,
  "Hot Rolled Plates": 1.15,
  "HR I-Beams/Channels": 1.05,
  "Sub Framing": 0.95,
  "Sheet/Trim Painted": 0.9,
  "HSS Round Pipes": 1.1,
  "HSS Square/Rect Tubes": 1.1,
  TNFAB: 1.0,
  TNFAB2nd: 1.05,
};

const CAT_DUMP: Record<string, number> = {
  Overall: 1.0,
  "Hot Rolled Plates": 1.2,
  "HR I-Beams/Channels": 0.9,
  "Sub Framing": 1.1,
  "Sheet/Trim Painted": 1.15,
  "HSS Round Pipes": 1.25,
  "HSS Square/Rect Tubes": 1.25,
  TNFAB: 1.0,
  TNFAB2nd: 1.1,
};

const BEAM_LIKE = new Set([
  "HR I-Beams/Channels",
  "HSS Round Pipes",
  "HSS Square/Rect Tubes",
  "Sheet/Trim Painted",
]);

// ── Row types ───────────────────────────────────────────────────────────────

export interface SteelBaseRow {
  Month: string;
  Date: string; // ISO YYYY-MM-DD
  Category: string;
  Base_Price_per_Ton: number;
  MoM_Pct: number;
  GeoRiskPremium_Pct: number;
  Model_Source: string;
}

export interface SteelAdjustedRow extends SteelBaseRow {
  Adjustment_Factor: number;
  Risk_Uplift_Pct: number;
  Adjusted_Price_per_Ton: number;
  Applied_GeoRisk_Pct: number;
  Applied_Tariff_Pct: number;
  Applied_Dumping_Pct: number;
  Applied_Volatility_Pct: number;
  Adj_MoM_Pct: number;
  Tariff_Impact: number;
  Dump_Impact: number;
  Geo_Impact: number;
  Vol_Impact: number;
}

export interface TornadoRow {
  Factor: string;
  Low: number;
  High: number;
  Base: number;
  Downside: number;
  Upside: number;
  Range: number;
}

export interface SensitivityPoint {
  Factor_Value: number;
  Avg_Adjusted_Price: number;
  End_Adjusted_Price: number;
  Avg_Uplift_Pct: number;
}

export interface SteelSummaryMetrics {
  start_price: number;
  end_price: number;
  avg_price: number;
  min_price: number;
  max_price: number;
  start_adj: number;
  end_adj: number;
  avg_adj: number;
  n_months: number;
  avg_mom: number;
  avg_geo: number;
  avg_uplift: number;
}

export interface PembCostImpact {
  passThroughPct: number;
  tonsPerProject: number;
  baseMaterialCost: number;
  adjustedMaterialCost: number;
  deltaCost: number;
  marginDragPctPoints: number;
  /** Illustrative GM $ drag on a typical commercial PEMB job */
  marginDragDollars: number;
  typicalContractValue: number;
}

export type RiskFactorKey = keyof RiskFactors;

// ── Sample data ─────────────────────────────────────────────────────────────

export const SAMPLE_STEEL_ROWS: SteelBaseRow[] = (sampleJson as SteelBaseRow[]).map((r) => ({
  ...r,
  Base_Price_per_Ton: Number(r.Base_Price_per_Ton),
  MoM_Pct: Number(r.MoM_Pct),
  GeoRiskPremium_Pct: Number(r.GeoRiskPremium_Pct),
}));

export function cloneRisks(r: RiskFactors = BASELINE): RiskFactors {
  return { ...r };
}

export function availableCategories(rows: SteelBaseRow[]): string[] {
  const present = new Set(rows.map((r) => r.Category));
  const ordered = STEEL_CATEGORIES.filter((c) => present.has(c));
  const extra = [...present].filter((c) => !STEEL_CATEGORIES.includes(c as SteelCategory)).sort();
  return [...ordered, ...extra];
}

export function filterCategory(rows: SteelBaseRow[], category: string): SteelBaseRow[] {
  return rows
    .filter((r) => r.Category === category)
    .slice()
    .sort((a, b) => a.Date.localeCompare(b.Date));
}

// ── Engine helpers ──────────────────────────────────────────────────────────

function monthPhase(dateIso: string): number {
  const month = new Date(dateIso + (dateIso.length === 10 ? "T12:00:00" : "")).getMonth() + 1;
  return Math.sin((2 * Math.PI * (month - 3)) / 12.0);
}

function calendarMom(month: number, beamLike: boolean): number {
  const table: Record<number, number> = {
    1: 0.0,
    2: 0.005,
    3: 0.005,
    4: 0.005,
    5: 0.005,
    6: 0.005,
    7: 0.0,
    8: -0.005,
    9: -0.005,
    10: -0.005,
    11: -0.005,
    12: -0.005,
  };
  let rate = table[month] ?? 0.0;
  if (beamLike) rate = Math.round(rate * 0.8 * 1e5) / 1e5;
  return rate;
}

function addOneMonth(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  const y = d.getFullYear();
  const m = d.getMonth(); // 0-based
  const next = new Date(y, m + 1, 1);
  const yy = next.getFullYear();
  const mm = String(next.getMonth() + 1).padStart(2, "0");
  return `${yy}-${mm}-01`;
}

function ensure24Months(df: SteelBaseRow[]): SteelBaseRow[] {
  const byCat = new Map<string, SteelBaseRow[]>();
  for (const r of df) {
    const list = byCat.get(r.Category) ?? [];
    list.push(r);
    byCat.set(r.Category, list);
  }
  const pieces: SteelBaseRow[] = [];
  for (const [cat, subIn] of byCat) {
    const sub = subIn.slice().sort((a, b) => a.Date.localeCompare(b.Date));
    if (sub.length >= 24) {
      pieces.push(...sub.slice(0, 24));
      continue;
    }
    const rows = sub.map((r) => ({ ...r }));
    let last = rows[rows.length - 1]!;
    let price = last.Base_Price_per_Ton;
    let dt = last.Date.slice(0, 10);
    let geo = last.GeoRiskPremium_Pct ?? DEFAULT_GEO_IN_BASE;
    while (rows.length < 24) {
      dt = addOneMonth(dt);
      const monthNum = new Date(dt + "T12:00:00").getMonth() + 1;
      const rate = calendarMom(monthNum, BEAM_LIKE.has(cat));
      price = Math.round(price * (1 + rate) * 100) / 100;
      if (monthNum <= 6) geo = Math.min(11.0, Math.max(8.0, geo + 0.1));
      else geo = Math.min(11.0, Math.max(8.0, geo - 0.05));
      const monthKey = dt.slice(0, 7);
      last = {
        Month: monthKey,
        Date: dt,
        Category: cat,
        Base_Price_per_Ton: price,
        MoM_Pct: Math.round(rate * 10000) / 100,
        GeoRiskPremium_Pct: Math.round(geo * 100) / 100,
        Model_Source: String(last.Model_Source ?? "Extended") + " + hybrid extend",
      };
      rows.push(last);
    }
    pieces.push(...rows);
  }
  return pieces;
}

/**
 * Compute Base vs Adjusted 24-month prices — faithful port of compute_adjustment_multipliers.
 */
export function computeAdjustmentMultipliers(
  df: SteelBaseRow[],
  risks: RiskFactors,
): SteelAdjustedRow[] {
  if (df.length === 0) return [];

  const sorted = df.slice().sort((a, b) => {
    const c = a.Category.localeCompare(b.Category);
    return c !== 0 ? c : a.Date.localeCompare(b.Date);
  });

  const tariff_delta = risks.tariff_change_pct - BASELINE.tariff_change_pct;
  const dump_delta = risks.china_dumping_risk_pct - BASELINE.china_dumping_risk_pct;
  const geo_delta = risks.geo_risk_premium_pct - BASELINE.geo_risk_premium_pct;
  const vol_delta = risks.social_demand_vol_pct - BASELINE.social_demand_vol_pct;

  // cumcount per category + max horizon
  const catCounts = new Map<string, number>();
  let maxH = 0;
  for (const r of sorted) {
    const n = (catCounts.get(r.Category) ?? 0) + 1;
    catCounts.set(r.Category, n);
    maxH = Math.max(maxH, n - 1);
  }
  maxH = Math.max(maxH, 1);

  const catIndex = new Map<string, number>();
  const out: SteelAdjustedRow[] = [];

  for (const r of sorted) {
    const idx = catIndex.get(r.Category) ?? 0;
    catIndex.set(r.Category, idx + 1);
    const horizon_w = 0.65 + 0.35 * (idx / maxH);
    const t_sens = CAT_TARIFF[r.Category] ?? 1.0;
    const d_sens = CAT_DUMP[r.Category] ?? 1.0;
    const phase = monthPhase(r.Date);

    const tariff_imp = (tariff_delta / 100.0) * TARIFF_PASSTHROUGH * t_sens * horizon_w;
    const dump_imp =
      ((dump_delta / 100.0) * DUMPING_PRICE_PRESSURE * d_sens +
        (risks.china_dumping_risk_pct / 100.0) * DUMPING_VOL_PREMIUM * 0.15 * d_sens) *
      horizon_w;
    const base_geo = Number.isFinite(r.GeoRiskPremium_Pct) ? r.GeoRiskPremium_Pct : DEFAULT_GEO_IN_BASE;
    const geo_imp =
      ((risks.geo_risk_premium_pct - base_geo) / 100.0) * GEO_SENSITIVITY + (geo_delta / 100.0) * 0.25;
    let vol_mean = (risks.social_demand_vol_pct / 100.0) * VOL_MEAN_PREMIUM * 0.5;
    vol_mean += (vol_delta / 100.0) * VOL_MEAN_PREMIUM;
    const vol_osc = (risks.social_demand_vol_pct / 100.0) * VOL_OSC_AMPLITUDE * phase * horizon_w;
    const vol_imp = vol_mean + vol_osc;

    let total_imp = tariff_imp + dump_imp + geo_imp + vol_imp;
    total_imp = Math.min(0.28, Math.max(-0.18, total_imp));
    const factor = 1.0 + total_imp;

    out.push({
      ...r,
      Adjustment_Factor: Math.round(factor * 1e5) / 1e5,
      Risk_Uplift_Pct: Math.round(total_imp * 1000 * 10) / 10 / 10, // 3 decimals like Python
      Adjusted_Price_per_Ton: Math.round(r.Base_Price_per_Ton * factor * 100) / 100,
      Applied_GeoRisk_Pct: risks.geo_risk_premium_pct,
      Applied_Tariff_Pct: risks.tariff_change_pct,
      Applied_Dumping_Pct: risks.china_dumping_risk_pct,
      Applied_Volatility_Pct: risks.social_demand_vol_pct,
      Adj_MoM_Pct: 0,
      Tariff_Impact: Math.round(tariff_imp * 10000) / 100, // pct points-ish display
      Dump_Impact: Math.round(dump_imp * 10000) / 100,
      Geo_Impact: Math.round(geo_imp * 10000) / 100,
      Vol_Impact: Math.round(vol_imp * 10000) / 100,
    });
  }

  // Fix Risk_Uplift to 3 decimals properly
  for (const row of out) {
    const total = row.Adjustment_Factor - 1;
    row.Risk_Uplift_Pct = Math.round(total * 100 * 1000) / 1000;
  }

  // Adj MoM per category
  const lastByCat = new Map<string, number>();
  for (const row of out) {
    const prev = lastByCat.get(row.Category);
    if (prev == null || prev === 0) {
      row.Adj_MoM_Pct = 0;
    } else {
      row.Adj_MoM_Pct = Math.round(((row.Adjusted_Price_per_Ton / prev - 1) * 100) * 1000) / 1000;
    }
    lastByCat.set(row.Category, row.Adjusted_Price_per_Ton);
  }

  return out;
}

export function regenerateForecast(
  baseRows: SteelBaseRow[],
  risks: RiskFactors,
  extendTo24 = true,
): SteelAdjustedRow[] {
  const df = extendTo24 ? ensure24Months(baseRows) : baseRows.slice();
  return computeAdjustmentMultipliers(df, risks);
}

export function sensitivityGrid(
  baseRows: SteelBaseRow[],
  category: string,
  baseRisks: RiskFactors,
  factorName: RiskFactorKey,
  values: number[],
): SensitivityPoint[] {
  let sub = filterCategory(baseRows, category);
  if (sub.length === 0) sub = filterCategory(baseRows, "Overall");
  return values.map((v) => {
    const r = cloneRisks(baseRisks);
    r[factorName] = v;
    const adj = computeAdjustmentMultipliers(sub, r);
    const prices = adj.map((a) => a.Adjusted_Price_per_Ton);
    const avg = prices.reduce((s, p) => s + p, 0) / Math.max(prices.length, 1);
    const end = prices[prices.length - 1] ?? 0;
    const uplift = adj.reduce((s, a) => s + a.Risk_Uplift_Pct, 0) / Math.max(adj.length, 1);
    return {
      Factor_Value: v,
      Avg_Adjusted_Price: avg,
      End_Adjusted_Price: end,
      Avg_Uplift_Pct: uplift,
    };
  });
}

export function tornadoImpacts(
  baseRows: SteelBaseRow[],
  category: string,
  baseRisks: RiskFactors,
): TornadoRow[] {
  const specs: [RiskFactorKey, string, number, number][] = [
    ["tariff_change_pct", "Tariff Change (%)", -10.0, 25.0],
    ["china_dumping_risk_pct", "China Dumping Risk (%)", 0.0, 80.0],
    ["geo_risk_premium_pct", "Geo Risk Premium (%)", 8.0, 11.0],
    ["social_demand_vol_pct", "Social/Demand Volatility (%)", 0.0, 40.0],
  ];
  let sub = filterCategory(baseRows, category);
  if (sub.length === 0) sub = filterCategory(baseRows, "Overall");
  const baseAdj = computeAdjustmentMultipliers(sub, baseRisks);
  const baseAvg =
    baseAdj.reduce((s, a) => s + a.Adjusted_Price_per_Ton, 0) / Math.max(baseAdj.length, 1);

  const rows: TornadoRow[] = specs.map(([attr, label, lo, hi]) => {
    const rLo = cloneRisks(baseRisks);
    const rHi = cloneRisks(baseRisks);
    rLo[attr] = lo;
    rHi[attr] = hi;
    const avgLo =
      computeAdjustmentMultipliers(sub, rLo).reduce((s, a) => s + a.Adjusted_Price_per_Ton, 0) /
      Math.max(sub.length, 1);
    const avgHi =
      computeAdjustmentMultipliers(sub, rHi).reduce((s, a) => s + a.Adjusted_Price_per_Ton, 0) /
      Math.max(sub.length, 1);
    return {
      Factor: label,
      Low: avgLo,
      High: avgHi,
      Base: baseAvg,
      Downside: avgLo - baseAvg,
      Upside: avgHi - baseAvg,
      Range: Math.abs(avgHi - avgLo),
    };
  });
  return rows.sort((a, b) => a.Range - b.Range);
}

export function summaryMetrics(rows: SteelAdjustedRow[], category: string): SteelSummaryMetrics | null {
  const sub = rows.filter((r) => r.Category === category).sort((a, b) => a.Date.localeCompare(b.Date));
  if (sub.length === 0) return null;
  const prices = sub.map((r) => r.Base_Price_per_Ton);
  const adj = sub.map((r) => r.Adjusted_Price_per_Ton);
  return {
    start_price: prices[0]!,
    end_price: prices[prices.length - 1]!,
    avg_price: prices.reduce((s, p) => s + p, 0) / prices.length,
    min_price: Math.min(...prices),
    max_price: Math.max(...prices),
    start_adj: adj[0]!,
    end_adj: adj[adj.length - 1]!,
    avg_adj: adj.reduce((s, p) => s + p, 0) / adj.length,
    n_months: sub.length,
    avg_mom: sub.reduce((s, r) => s + r.MoM_Pct, 0) / sub.length,
    avg_geo: sub.reduce((s, r) => s + r.GeoRiskPremium_Pct, 0) / sub.length,
    avg_uplift: sub.reduce((s, r) => s + r.Risk_Uplift_Pct, 0) / sub.length,
  };
}

/** Categories where |avg(adj/base - 1)| ≥ ALERT_THRESHOLD */
export function alertCategories(rows: SteelAdjustedRow[]): string[] {
  const byCat = new Map<string, { base: number; adj: number; n: number }>();
  for (const r of rows) {
    const cur = byCat.get(r.Category) ?? { base: 0, adj: 0, n: 0 };
    cur.base += r.Base_Price_per_Ton;
    cur.adj += r.Adjusted_Price_per_Ton;
    cur.n += 1;
    byCat.set(r.Category, cur);
  }
  const alerts: string[] = [];
  for (const [cat, v] of byCat) {
    if (v.n === 0) continue;
    const ratio = v.adj / v.base - 1;
    if (Math.abs(ratio) >= ALERT_THRESHOLD) alerts.push(cat);
  }
  return alerts;
}

export function maxRiskCategory(rows: SteelAdjustedRow[]): { category: string; uplift: number } {
  const byCat = new Map<string, number[]>();
  for (const r of rows) {
    const list = byCat.get(r.Category) ?? [];
    list.push(r.Risk_Uplift_Pct);
    byCat.set(r.Category, list);
  }
  let best = { category: "Overall", uplift: 0 };
  for (const [cat, ups] of byCat) {
    if (cat === "Overall") continue;
    const avg = ups.reduce((s, u) => s + u, 0) / ups.length;
    if (Math.abs(avg) > Math.abs(best.uplift)) best = { category: cat, uplift: avg };
  }
  return best;
}

/**
 * PEMB cost impact: steel $/ton → material $ and margin drag on a typical job.
 * Pass-through and tonnage are configurable planning defaults (not ERP).
 */
export function pembCostImpact(
  overallAvgBase: number,
  overallAvgAdj: number,
  options?: {
    passThroughPct?: number;
    tonsPerProject?: number;
    typicalContractValue?: number;
  },
): PembCostImpact {
  const passThroughPct = options?.passThroughPct ?? 0.72;
  const tonsPerProject = options?.tonsPerProject ?? 85;
  const typicalContractValue = options?.typicalContractValue ?? 2_400_000;
  const baseMaterialCost = overallAvgBase * tonsPerProject;
  const adjustedMaterialCost = overallAvgAdj * tonsPerProject;
  const deltaCost = (adjustedMaterialCost - baseMaterialCost) * passThroughPct;
  const marginDragDollars = deltaCost;
  const marginDragPctPoints =
    typicalContractValue > 0 ? (marginDragDollars / typicalContractValue) * 100 : 0;
  return {
    passThroughPct,
    tonsPerProject,
    baseMaterialCost,
    adjustedMaterialCost,
    deltaCost,
    marginDragPctPoints,
    marginDragDollars,
    typicalContractValue,
  };
}

/**
 * Optional live-feed bias: nudge geo premium and demand vol slightly from composite index.
 * composite ~100 neutral; +2 pts composite → slight lower geo risk, etc.
 */
export function applyLiveFeedBias(
  risks: RiskFactors,
  compositeIndex: number | null | undefined,
  enabled: boolean,
): RiskFactors {
  if (!enabled || compositeIndex == null || !Number.isFinite(compositeIndex)) {
    return cloneRisks(risks);
  }
  const delta = (compositeIndex - 100) / 100; // e.g. +0.04
  const out = cloneRisks(risks);
  // Stronger construction → slightly lower geo stress, higher demand vol
  out.geo_risk_premium_pct = Math.min(11, Math.max(8, out.geo_risk_premium_pct - delta * 2));
  out.social_demand_vol_pct = Math.min(50, Math.max(0, out.social_demand_vol_pct + Math.abs(delta) * 15));
  return out;
}

// ── Excel upload parsing (client-side, simplified block layout) ─────────────

function normHeader(val: unknown): string {
  if (val == null || val === "") return "";
  return String(val).trim().toLowerCase().replace(/  +/g, " ");
}

function resolveCategory(header: string): SteelCategory | null {
  const h = normHeader(header);
  if (!h) return null;
  if (h in CATEGORY_ALIASES) return CATEGORY_ALIASES[h]!;
  for (const [key, cat] of Object.entries(CATEGORY_ALIASES)) {
    if (key.includes(h) || h.includes(key)) return cat;
  }
  for (const cat of STEEL_CATEGORIES) {
    if (cat.toLowerCase() === h) return cat;
  }
  return null;
}

function parseMonth(val: unknown): string | null {
  if (val == null || val === "") return null;
  if (val instanceof Date && !Number.isNaN(val.getTime())) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}-01`;
  }
  if (typeof val === "number" && val > 20000 && val < 60000) {
    // Excel serial
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(epoch.getTime() + val * 86400000);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    return `${y}-${m}-01`;
  }
  const s = String(val).trim();
  const m1 = s.match(/^(\d{4})-(\d{1,2})/);
  if (m1) return `${m1[1]}-${m1[2]!.padStart(2, "0")}-01`;
  const m2 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m2) return `${m2[3]}-${m2[1]!.padStart(2, "0")}-01`;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  }
  return null;
}

function parseMom(val: unknown): number {
  if (val == null || val === "") return 0;
  if (typeof val === "number" && Number.isFinite(val)) {
    return Math.abs(val) <= 0.05 ? Math.round(val * 1000 * 10) / 10 / 10 : Math.round(val * 1000) / 1000;
  }
  const s = String(val).trim().replace("%", "");
  if (["-", "—", "", "n/a"].includes(s.toLowerCase())) return 0;
  const v = Number(s);
  if (!Number.isFinite(v)) return 0;
  return Math.abs(v) <= 0.05 ? Math.round(v * 100 * 1000) / 1000 : Math.round(v * 1000) / 1000;
}

function parseGeo(val: unknown): number {
  if (val == null || val === "") return 9.0;
  if (typeof val === "number" && Number.isFinite(val)) return val;
  const s = String(val).trim().replace("%", "");
  if (s.includes("-")) {
    const [a, b] = s.split("-").map(Number);
    if (Number.isFinite(a) && Number.isFinite(b)) return Math.round(((a! + b!) / 2) * 100) / 100;
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : 9.0;
}

/**
 * Parse Excel sheet matrix (2D array from SheetJS) into steel base rows.
 * Detects Month | Price | MoM blocks like the original data_loader.
 */
export function parseExcelMatrix(matrix: unknown[][], sourceName = "Uploaded Model"): SteelBaseRow[] {
  if (!matrix.length) return [];
  let headerIdx = -1;
  for (let i = 0; i < Math.min(matrix.length, 80); i++) {
    const texts = (matrix[i] ?? []).map((v) => normHeader(v));
    const hasMonth = texts.some((t) => t === "month" || t === "month-year" || t === "month/year");
    const hasCat = texts.some(
      (t) => t && !["month", "month-year", "mom%", "mo/mo %", "mom %"].includes(t) && resolveCategory(t),
    );
    if (hasMonth && hasCat) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) {
    // Try long-form CSV-like: Month, Category, Price
    return parseLongFormMatrix(matrix, sourceName);
  }

  const header = matrix[headerIdx] ?? [];
  const blocks: { monthCol: number; priceCol: number; momCol: number | null; category: SteelCategory }[] =
    [];
  let geoCol: number | null = null;
  let j = 0;
  while (j < header.length) {
    const cell = normHeader(header[j]);
    if (cell === "month" || cell === "month-year" || cell === "month/year") {
      const catHeader = header[j + 1];
      const cat = resolveCategory(String(catHeader ?? ""));
      if (cat) {
        blocks.push({
          monthCol: j,
          priceCol: j + 1,
          momCol: j + 2 < header.length ? j + 2 : null,
          category: cat,
        });
        j += 3;
        continue;
      }
      if (catHeader && normHeader(catHeader).includes("georisk")) {
        geoCol = j + 1;
        j += 2;
        continue;
      }
    }
    if (cell.includes("georisk")) geoCol = j;
    j += 1;
  }

  if (!blocks.length) return parseLongFormMatrix(matrix, sourceName);

  const rows: SteelBaseRow[] = [];
  for (let i = headerIdx + 1; i < matrix.length; i++) {
    const row = matrix[i] ?? [];
    let dt: string | null = null;
    for (const b of blocks) {
      dt = parseMonth(row[b.monthCol]);
      if (dt) break;
    }
    if (!dt) continue;
    const geo = geoCol != null ? parseGeo(row[geoCol]) : 9.0;
    for (const b of blocks) {
      const price = Number(row[b.priceCol]);
      if (!Number.isFinite(price) || price <= 0) continue;
      const mom = b.momCol != null ? parseMom(row[b.momCol]) : 0;
      rows.push({
        Month: dt.slice(0, 7),
        Date: dt,
        Category: b.category,
        Base_Price_per_Ton: Math.round(price * 100) / 100,
        MoM_Pct: mom,
        GeoRiskPremium_Pct: geo,
        Model_Source: sourceName,
      });
    }
  }

  // Dedupe Month+Category keep last
  const map = new Map<string, SteelBaseRow>();
  for (const r of rows) map.set(`${r.Month}|${r.Category}`, r);
  let out = [...map.values()].sort((a, b) => a.Date.localeCompare(b.Date) || a.Category.localeCompare(b.Category));

  // Derive TNFAB2nd if missing
  const cats = new Set(out.map((r) => r.Category));
  if (cats.has("TNFAB") && !cats.has("TNFAB2nd")) {
    const extra = out
      .filter((r) => r.Category === "TNFAB")
      .map((r) => ({
        ...r,
        Category: "TNFAB2nd",
        Base_Price_per_Ton: Math.round(r.Base_Price_per_Ton * 1.023 * 100) / 100,
        Model_Source: r.Model_Source + " (TNFAB2nd derived)",
      }));
    out = [...out, ...extra];
  }
  return out;
}

function parseLongFormMatrix(matrix: unknown[][], sourceName: string): SteelBaseRow[] {
  if (matrix.length < 2) return [];
  const header = (matrix[0] ?? []).map((h) => normHeader(h));
  const monthIdx = header.findIndex((h) => h.includes("month") || h === "date");
  const catIdx = header.findIndex((h) => h.includes("categor"));
  const priceIdx = header.findIndex(
    (h) => h.includes("price") || h.includes("base") || h.includes("$/ton") || h.includes("ton"),
  );
  const momIdx = header.findIndex((h) => h.includes("mom"));
  const geoIdx = header.findIndex((h) => h.includes("geo"));
  if (monthIdx < 0 || priceIdx < 0) return [];

  const rows: SteelBaseRow[] = [];
  for (let i = 1; i < matrix.length; i++) {
    const row = matrix[i] ?? [];
    const dt = parseMonth(row[monthIdx]);
    if (!dt) continue;
    const price = Number(row[priceIdx]);
    if (!Number.isFinite(price) || price <= 0) continue;
    const resolved = catIdx >= 0 ? resolveCategory(String(row[catIdx] ?? "")) : null;
    const cat: string = resolved ?? String(row[catIdx] ?? "Overall");
    rows.push({
      Month: dt.slice(0, 7),
      Date: dt,
      Category: cat,
      Base_Price_per_Ton: Math.round(price * 100) / 100,
      MoM_Pct: momIdx >= 0 ? parseMom(row[momIdx]) : 0,
      GeoRiskPremium_Pct: geoIdx >= 0 ? parseGeo(row[geoIdx]) : 9.0,
      Model_Source: sourceName,
    });
  }
  return rows;
}
