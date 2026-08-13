/**
 * Types + offline snapshot for construction market feeds.
 * Live values come from FRED (St. Louis Fed) and BLS public APIs.
 */

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
  employmentMomentum: number;
  materialsPressure: number;
  permitMomentum: number;
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

/** Offline fallback snapshot (updated when live fetch succeeds in deploy; static seed for preview). */
export const CACHED_FEEDS: ConstructionFeedsResponse = {
  fetchedAt: "2026-06-15T12:00:00.000Z",
  status: "cached",
  live: false,
  sources: [
    { name: "FRED", ok: false, detail: "Using cached snapshot" },
    { name: "BLS", ok: false, detail: "Using cached snapshot" },
  ],
  series: [
    {
      id: "TLNRESCONS",
      source: "fred",
      label: "Private nonresidential construction",
      unit: "$ millions SAAR",
      description: "Total private nonresidential construction put in place (FRED TLNRESCONS)",
      relevance: "high",
      latest: { date: "2026-06-01", value: 1277174 },
      prior: { date: "2026-05-01", value: 1276048 },
      momPct: 0.0882,
      yoyPct: -2.09,
      history: [
        { date: "2021-07-01", value: 844641 },
        { date: "2021-08-01", value: 844011 },
        { date: "2021-09-01", value: 841975 },
        { date: "2021-10-01", value: 845579 },
        { date: "2021-11-01", value: 864658 },
        { date: "2021-12-01", value: 867490 },
        { date: "2022-01-01", value: 884644 },
        { date: "2022-02-01", value: 898071 },
        { date: "2022-03-01", value: 910759 },
        { date: "2022-04-01", value: 935283 },
        { date: "2022-05-01", value: 937509 },
        { date: "2022-06-01", value: 955197 },
        { date: "2022-07-01", value: 982443 },
        { date: "2022-08-01", value: 992061 },
        { date: "2022-09-01", value: 1011933 },
        { date: "2022-10-01", value: 1017812 },
        { date: "2022-11-01", value: 1036064 },
        { date: "2022-12-01", value: 1057267 },
        { date: "2023-01-01", value: 1093560 },
        { date: "2023-02-01", value: 1113923 },
        { date: "2023-03-01", value: 1140495 },
        { date: "2023-04-01", value: 1166719 },
        { date: "2023-05-01", value: 1183442 },
        { date: "2023-06-01", value: 1195977 },
        { date: "2023-07-01", value: 1193798 },
        { date: "2023-08-01", value: 1216346 },
        { date: "2023-09-01", value: 1228075 },
        { date: "2023-10-01", value: 1245564 },
        { date: "2023-11-01", value: 1264984 },
        { date: "2023-12-01", value: 1271409 },
        { date: "2024-01-01", value: 1265159 },
        { date: "2024-02-01", value: 1277879 },
        { date: "2024-03-01", value: 1276535 },
        { date: "2024-04-01", value: 1276453 },
        { date: "2024-05-01", value: 1280362 },
        { date: "2024-06-01", value: 1286300 },
        { date: "2024-07-01", value: 1295377 },
        { date: "2024-08-01", value: 1307471 },
        { date: "2024-09-01", value: 1309166 },
        { date: "2024-10-01", value: 1315972 },
        { date: "2024-11-01", value: 1326268 },
        { date: "2024-12-01", value: 1318434 },
        { date: "2025-01-01", value: 1321746 },
        { date: "2025-02-01", value: 1325441 },
        { date: "2025-03-01", value: 1323286 },
        { date: "2025-04-01", value: 1337809 },
        { date: "2025-05-01", value: 1318010 },
        { date: "2025-06-01", value: 1304452 },
        { date: "2025-07-01", value: 1302674 },
        { date: "2025-08-01", value: 1301989 },
        { date: "2025-09-01", value: 1301557 },
        { date: "2025-10-01", value: 1306332 },
        { date: "2025-11-01", value: 1291762 },
        { date: "2025-12-01", value: 1273524 },
        { date: "2026-01-01", value: 1271078 },
        { date: "2026-02-01", value: 1269938 },
        { date: "2026-03-01", value: 1269153 },
        { date: "2026-04-01", value: 1273990 },
        { date: "2026-05-01", value: 1276048 },
        { date: "2026-06-01", value: 1277174 },
      ],
      status: "cached",
    },
    {
      id: "PNRESCONS",
      source: "fred",
      label: "Private nonres. (ex. structures detail)",
      unit: "$ millions SAAR",
      description: "Private nonresidential construction spending (FRED PNRESCONS)",
      relevance: "high",
      latest: { date: "2026-05-01", value: 738734 },
      prior: { date: "2026-04-01", value: 741325 },
      momPct: -0.3495,
      yoyPct: null,
      history: [
        { date: "2026-02-01", value: 747319 },
        { date: "2026-03-01", value: 745125 },
        { date: "2026-04-01", value: 741325 },
        { date: "2026-05-01", value: 738734 },
      ],
      status: "cached",
    },
    {
      id: "TTLCONS",
      source: "fred",
      label: "Total construction spending",
      unit: "$ millions SAAR",
      description: "Total construction put in place (FRED TTLCONS)",
      relevance: "medium",
      latest: { date: "2026-05-01", value: 2210214 },
      prior: { date: "2026-04-01", value: 2207051 },
      momPct: 0.1433,
      yoyPct: null,
      history: [
        { date: "2026-01-01", value: 2195636 },
        { date: "2026-02-01", value: 2189683 },
        { date: "2026-03-01", value: 2199399 },
        { date: "2026-04-01", value: 2207051 },
        { date: "2026-05-01", value: 2210214 },
      ],
      status: "cached",
    },
    {
      id: "PERMIT",
      source: "fred",
      label: "Building permits",
      unit: "thousands SAAR",
      description: "New private housing units authorized (FRED PERMIT) — residential context",
      relevance: "context",
      latest: { date: "2026-06-01", value: 1374 },
      prior: { date: "2026-05-01", value: 1410 },
      momPct: -2.553,
      yoyPct: null,
      history: [
        { date: "2026-03-01", value: 1363 },
        { date: "2026-04-01", value: 1423 },
        { date: "2026-05-01", value: 1410 },
        { date: "2026-06-01", value: 1374 },
      ],
      status: "cached",
    },
    {
      id: "CES2000000001",
      source: "bls",
      label: "Construction employment",
      unit: "thousands",
      description: "All employees, construction (BLS CES2000000001, SA)",
      relevance: "high",
      latest: { date: "2026-06", value: 8331 },
      prior: { date: "2026-05", value: 8320 },
      momPct: 0.1322,
      yoyPct: null,
      history: [],
      status: "cached",
    },
    {
      id: "PCU236211236211",
      source: "bls",
      label: "Industrial building PPI",
      unit: "index",
      description: "Producer price index — industrial building construction (BLS PCU236211236211)",
      relevance: "medium",
      latest: { date: "2026-06", value: 200.869 },
      prior: { date: "2026-05", value: 200.0 },
      momPct: 0.43,
      yoyPct: null,
      history: [],
      status: "cached",
    },
    {
      id: "WPU081",
      source: "bls",
      label: "Lumber & wood PPI",
      unit: "index",
      description: "Producer price index — lumber and wood products (BLS WPU081)",
      relevance: "medium",
      latest: { date: "2026-06", value: 280.114 },
      prior: { date: "2026-05", value: 278.0 },
      momPct: 0.76,
      yoyPct: null,
      history: [],
      status: "cached",
    },
  ],
  signal: {
    compositeIndex: 99.2,
    nonresMomentum: -0.02,
    employmentMomentum: 0.13,
    materialsPressure: 0.6,
    permitMomentum: -2.55,
    narrative:
      "Nonresidential construction is roughly flat to slightly soft nationally; construction employment holds steady. Materials PPI edge higher — watch buy-out costs. Residential permits softer (context only for commercial metal buildings).",
    asOf: "2026-06",
  },
};

export function computeMarketSignal(series: FeedSeries[]): MarketSignal {
  const get = (id: string) => series.find((s) => s.id === id);
  const nonres = get("TLNRESCONS")?.momPct ?? get("PNRESCONS")?.momPct ?? 0;
  const emp = get("CES2000000001")?.momPct ?? 0;
  const ppi = get("PCU236211236211")?.momPct ?? get("WPU081")?.momPct ?? 0;
  const permit = get("PERMIT")?.momPct ?? 0;

  // Composite: weight nonres heavily for metal building commercial outlook
  // Positive nonres + employment lifts index; rising materials slightly dampens margin outlook
  const composite =
    100 +
    nonres * 8 + // ±0.5% MoM → ±4 pts
    emp * 4 +
    permit * 0.15 + // residential is weak weight
    Math.min(Math.max(-ppi * 1.5, -3), 1); // material inflation mild drag

  const clamped = Math.round(Math.min(118, Math.max(88, composite)) * 10) / 10;

  let narrative: string;
  if (nonres > 0.3 && emp >= 0) {
    narrative =
      "Live feeds show expanding private nonresidential put-in-place and stable construction jobs — supportive for commercial metal building bookings in the SE footprint.";
  } else if (nonres < -0.3) {
    narrative =
      "Live feeds show cooling private nonresidential construction spending. Lean toward conservative scenario for H2 pipeline until nonres stabilizes.";
  } else {
    narrative =
      "Live feeds show roughly flat nonresidential construction with steady employment. Base-case forecast remains appropriate; monitor industrial PPI for buy-out cost pressure.";
  }
  if (ppi > 0.5) {
    narrative += " Materials/industrial building PPI rising — protect GM on buy-outs.";
  }

  const latestDates = series.map((s) => s.latest?.date).filter(Boolean) as string[];
  const asOf = latestDates.sort().at(-1) ?? new Date().toISOString().slice(0, 7);

  return {
    compositeIndex: clamped,
    nonresMomentum: nonres,
    employmentMomentum: emp,
    materialsPressure: ppi,
    permitMomentum: permit,
    narrative,
    asOf,
  };
}

/** Map composite index → scenario bias for forecast (-0.05 to +0.08). */
export function signalToForecastBias(signal: MarketSignal): number {
  // 100 = 0 bias; 110 = +5%; 90 = -5%
  return Math.min(0.08, Math.max(-0.06, (signal.compositeIndex - 100) / 200));
}
