/**
 * Types + offline snapshot for construction market feeds.
 * Live values come from FRED (St. Louis Fed) and BLS public APIs.
 *
 * Series are chosen for a PEMB / metal building plant — manufacturing and
 * commercial put-in-place, construction jobs, and steel PPI — not housing.
 */

import cacheBundle from "./construction-feeds-cache.json";

export type FeedSource = "fred" | "bls";
export type FeedStatus = "live" | "cached" | "partial" | "error";

export interface FeedPoint {
  date: string; // YYYY-MM-DD or YYYY-MM
  value: number;
}

export interface FeedSeries {
  id: string;
  source: FeedSource;
  label: string;
  unit: string;
  description: string;
  /** Relevance to Ascent commercial metal buildings */
  relevance: "high" | "medium" | "context";
  latest: FeedPoint | null;
  prior: FeedPoint | null;
  /** Month-over-month % change (latest vs prior) */
  momPct: number | null;
  /** Year-over-year % change when available */
  yoyPct: number | null;
  history: FeedPoint[];
  status: FeedStatus;
  error?: string;
}

export interface MarketSignal {
  /** Composite 0–100+ commercial activity index (100 = neutral) */
  compositeIndex: number;
  nonresMomentum: number;
  manufacturingMomentum: number;
  commercialMomentum: number;
  employmentMomentum: number;
  materialsPressure: number;
  manufacturingYoy: number;
  commercialYoy: number;
  nonresYoy: number;
  steelYoy: number;
  narrative: string;
  asOf: string;
}

export interface ConstructionFeedsResponse {
  fetchedAt: string;
  status: FeedStatus;
  sources: { name: string; ok: boolean; detail: string }[];
  series: FeedSeries[];
  signal: MarketSignal;
  /** True when at least one series was fetched live this request */
  live: boolean;
}

function getSeries(series: FeedSeries[], id: string): FeedSeries | undefined {
  return series.find((s) => s.id === id);
}

export function computeMarketSignal(series: FeedSeries[]): MarketSignal {
  const mfg = getSeries(series, "PRMFGCONS");
  const com = getSeries(series, "TLCOMCONS");
  const nonres = getSeries(series, "TLNRESCONS");
  const emp = getSeries(series, "USCONS") ?? getSeries(series, "CES2000000001");
  const steel = getSeries(series, "WPU101");
  const ibppi = getSeries(series, "PCU236211236211");

  const mfgMom = mfg?.momPct ?? 0;
  const comMom = com?.momPct ?? 0;
  const nonresMom = nonres?.momPct ?? 0;
  const empMom = emp?.momPct ?? 0;
  const steelMom = steel?.momPct ?? ibppi?.momPct ?? 0;

  const manufacturingYoy = mfg?.yoyPct ?? 0;
  const commercialYoy = com?.yoyPct ?? 0;
  const nonresYoy = nonres?.yoyPct ?? 0;
  const steelYoy = steel?.yoyPct ?? ibppi?.yoyPct ?? 0;

  // PEMB tape: manufacturing first, commercial second, steel as a GM drag.
  // Housing permits are not in this index.
  const composite =
    100 +
    mfgMom * 4 +
    comMom * 2.5 +
    nonresMom * 1 +
    empMom * 3 +
    Math.min(Math.max(-steelMom * 0.9, -4), 1);

  const clamped = Math.round(Math.min(118, Math.max(88, composite)) * 10) / 10;

  const parts: string[] = [];
  if (manufacturingYoy <= -10) {
    parts.push(
      `Manufacturing construction is down ${Math.abs(manufacturingYoy).toFixed(0)}% year over year — that is plant and factory work, not the headline nonres number.`,
    );
  } else if (manufacturingYoy >= 5) {
    parts.push(
      `Manufacturing construction is up ${manufacturingYoy.toFixed(0)}% year over year — a supportive tape for plant and factory buildings.`,
    );
  } else {
    parts.push(
      `Manufacturing construction is roughly ${manufacturingYoy >= 0 ? "flat to up" : "soft"} (${manufacturingYoy >= 0 ? "+" : ""}${manufacturingYoy.toFixed(1)}% YoY).`,
    );
  }

  if (Math.abs(nonresYoy - manufacturingYoy) >= 8) {
    parts.push(
      `Private nonres overall is only ${nonresYoy >= 0 ? "+" : ""}${nonresYoy.toFixed(1)}% because other categories are holding. Commercial is ${commercialYoy >= 0 ? "+" : ""}${commercialYoy.toFixed(1)}%.`,
    );
  } else {
    parts.push(
      `Commercial ${commercialYoy >= 0 ? "+" : ""}${commercialYoy.toFixed(1)}% YoY · private nonres ${nonresYoy >= 0 ? "+" : ""}${nonresYoy.toFixed(1)}%.`,
    );
  }

  if (steelYoy >= 8) {
    parts.push(
      `Iron and steel PPI is up ${steelYoy.toFixed(0)}% YoY — protect buy-outs and EGM.`,
    );
  } else if (steelYoy <= -5) {
    parts.push(`Steel PPI is easing (${steelYoy.toFixed(1)}% YoY) — a tailwind on mill buy-outs.`);
  }

  if ((emp?.yoyPct ?? 0) >= 0) {
    parts.push("Construction employment is still holding.");
  }

  const latestDates = series.map((s) => s.latest?.date).filter(Boolean) as string[];
  const asOf = latestDates.sort().at(-1) ?? new Date().toISOString().slice(0, 7);

  return {
    compositeIndex: clamped,
    nonresMomentum: nonresMom,
    manufacturingMomentum: mfgMom,
    commercialMomentum: comMom,
    employmentMomentum: empMom,
    materialsPressure: steelMom,
    manufacturingYoy,
    commercialYoy,
    nonresYoy,
    steelYoy,
    narrative: parts.join(" "),
    asOf,
  };
}

const CACHED_SERIES = cacheBundle.series as FeedSeries[];

/** Offline fallback snapshot (updated when live fetch succeeds in deploy; static seed for preview). */
export const CACHED_FEEDS: ConstructionFeedsResponse = {
  fetchedAt: "2026-08-12T12:00:00.000Z",
  status: "cached",
  live: false,
  sources: [
    { name: "FRED", ok: false, detail: "Using cached snapshot" },
    { name: "BLS", ok: false, detail: "Using cached snapshot" },
  ],
  series: CACHED_SERIES,
  signal: computeMarketSignal(CACHED_SERIES),
};

/** Map composite index → scenario bias for forecast (-0.05 to +0.08). */
export function signalToForecastBias(signal: MarketSignal): number {
  // 100 = 0 bias; 110 = +5%; 90 = -5%
  return Math.min(0.08, Math.max(-0.06, (signal.compositeIndex - 100) / 200));
}
