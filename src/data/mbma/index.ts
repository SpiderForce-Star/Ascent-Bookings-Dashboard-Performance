/**
 * MBMA Non-Agriculture Shipment data — 2025 full year.
 *
 * Focus territory only (TX, FL, OH, IN, MO, IL). Do not add national views.
 *
 * To refresh for a future year, see README.md → "Updating the MBMA dataset".
 *
 * TODO: Once internal bookings are tagged by state/county, add a comparison
 * layer (Ascent volume vs MBMA industry volume).
 */

import raw from "./counties.json";
import { EAST_TEXAS_HOUSTON_FIPS, NORTHERN_FLORIDA_FIPS } from "./regions";
import { FOCUS_STATE_CODES, STATE_BY_CODE } from "./states";
import type { CountyRow, CountyShipment, FocusStateCode, QuarterKey } from "./types";

export type { CountyRow, CountyShipment, FocusStateCode, QuarterKey, StateSummary } from "./types";
export {
  DATA_AS_OF,
  FOCUS_PCT_OF_NATIONAL,
  FOCUS_STATE_CODES,
  FOCUS_STATES,
  FOCUS_YTD,
  NATIONAL_YTD,
  STATE_BY_CODE,
} from "./states";
export { EAST_TEXAS_HOUSTON_FIPS, NORTHERN_FLORIDA_FIPS } from "./regions";

const bundle = raw as {
  source: string;
  period: string;
  compiled: string;
  unit: string;
  disclaimer: string;
  counties: CountyShipment[];
};

export const MBMA_META = {
  source: bundle.source,
  period: bundle.period,
  compiled: bundle.compiled,
  unit: bundle.unit,
  disclaimer: bundle.disclaimer,
};

export const COUNTY_SHIPMENTS: CountyShipment[] = bundle.counties.filter((c) =>
  (FOCUS_STATE_CODES as string[]).includes(c.state),
);

export const QUARTER_LABELS: { id: QuarterKey; label: string }[] = [
  { id: "ytd", label: "YTD" },
  { id: "q1", label: "Q1" },
  { id: "q2", label: "Q2" },
  { id: "q3", label: "Q3" },
  { id: "q4", label: "Q4" },
];

export function metricOf(row: CountyShipment, metric: QuarterKey): number {
  return row[metric];
}

export interface MbmaFilters {
  states: FocusStateCode[];
  metric: QuarterKey;
  eastTexas: boolean;
  northernFlorida: boolean;
}

export const DEFAULT_MBMA_FILTERS: MbmaFilters = {
  states: [...FOCUS_STATE_CODES],
  metric: "ytd",
  eastTexas: false,
  northernFlorida: false,
};

export function filterCounties(all: CountyShipment[], filters: MbmaFilters): CountyShipment[] {
  const stateSet = new Set(filters.states);
  const regional = filters.eastTexas || filters.northernFlorida;

  return all.filter((c) => {
    if (!stateSet.has(c.state)) return false;
    if (!regional) return true;
    const inEastTx = filters.eastTexas && EAST_TEXAS_HOUSTON_FIPS.has(c.fips);
    const inNorthFl = filters.northernFlorida && NORTHERN_FLORIDA_FIPS.has(c.fips);
    return inEastTx || inNorthFl;
  });
}

export function toCountyRows(counties: CountyShipment[], metric: QuarterKey): CountyRow[] {
  const ranked = [...counties].sort((a, b) => {
    const dv = metricOf(b, metric) - metricOf(a, metric);
    if (dv !== 0) return dv;
    return a.name.localeCompare(b.name);
  });

  return ranked.map((c, i) => {
    const stateYtd = STATE_BY_CODE[c.state]?.ytd ?? 0;
    return {
      ...c,
      rank: i + 1,
      pctOfState: stateYtd > 0 ? c.ytd / stateYtd : 0,
      metricValue: metricOf(c, metric),
    };
  });
}

export function formatThousands(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

/** Display $000s as a dollar figure (the unit is thousands). */
export function formatMbmaDollars(value000s: number): string {
  return `$${formatThousands(value000s)}`;
}

/** Approximate actual dollars from the $000s unit. */
export function formatMbmaActual(value000s: number): string {
  const actual = value000s * 1000;
  const abs = Math.abs(actual);
  if (abs >= 1_000_000_000) return `$${(actual / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `$${(actual / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(actual / 1_000).toFixed(0)}K`;
  return `$${formatThousands(actual)}`;
}

export function choroplethFill(value: number, max: number): string {
  if (value <= 0 || max <= 0) return "var(--color-bg-muted)";
  const t = Math.sqrt(value / max);
  return lerpHex("#f8e3e6", "#c8102e", Math.min(1, Math.max(0, t)));
}

function lerpHex(a: string, b: string, t: number): string {
  const ar = parseInt(a.slice(1, 3), 16);
  const ag = parseInt(a.slice(3, 5), 16);
  const ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16);
  const bg = parseInt(b.slice(3, 5), 16);
  const bb = parseInt(b.slice(5, 7), 16);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bl.toString(16).padStart(2, "0")}`;
}
