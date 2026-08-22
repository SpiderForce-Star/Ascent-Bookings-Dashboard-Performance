/**
 * MBMA Non-Agriculture Shipment data — 2025 full year.
 *
 * 600-mile radar from Portland, TN: TN, KY, VA, NC, SC, GA, AL, MS, LA, AR,
 * MO, IL, IN, OH, WV, PA, plus northern/panhandle Florida only.
 * Do not add Texas, South Florida, or a national map on this page.
 *
 * To refresh for a future year, see README.md → "Updating the MBMA dataset".
 *
 * TODO: Once internal bookings are tagged by state/county, overlay Ascent
 * volume vs MBMA industry volume.
 */

import raw from "./counties.json";
import { BLOCKED_FL_FIPS, NORTH_FL_FIPS } from "./regions";
import { NATIONAL_YTD, RADAR_STATE_ORDER, toStateRecord } from "./states";
import type {
  County,
  CountyRow,
  QuarterKey,
  RadarRegion,
  RadarStateCode,
  StateRecord,
} from "./types";

export type {
  County,
  CountyRow,
  MbmaGeo,
  QuarterKey,
  RadarRegion,
  RadarStateCode,
  StateRecord,
} from "./types";
export {
  DATA_AS_OF,
  DEFAULT_PIN_FIPS,
  NATIONAL_YTD,
  RADAR_STATE_ORDER,
  STATE_META,
} from "./states";
export { NORTH_FL_FIPS } from "./regions";

const RADAR_SET = new Set<string>(RADAR_STATE_ORDER);

const bundle = raw as {
  source: string;
  period: string;
  compiled: string;
  unit: string;
  disclaimer: string;
  counties: County[];
};

export const MBMA_META = {
  source: bundle.source,
  period: bundle.period,
  compiled: bundle.compiled,
  unit: bundle.unit,
  disclaimer: bundle.disclaimer,
};

export const COUNTIES: County[] = bundle.counties.filter((c) => {
  if (!RADAR_SET.has(c.state)) return false;
  if (BLOCKED_FL_FIPS.has(c.fips)) return false;
  if (c.state === "FL") return c.northFl === true || NORTH_FL_FIPS.has(c.fips);
  return true;
});

function emptyRollup() {
  return { q1: 0, q2: 0, q3: 0, q4: 0, ytd: 0 };
}

const rollups = new Map<RadarStateCode, ReturnType<typeof emptyRollup>>();
for (const code of RADAR_STATE_ORDER) rollups.set(code, emptyRollup());
for (const c of COUNTIES) {
  const r = rollups.get(c.state);
  if (!r) continue;
  r.q1 += c.q1;
  r.q2 += c.q2;
  r.q3 += c.q3;
  r.q4 += c.q4;
  r.ytd += c.ytd;
}

export const STATE_RECORDS: StateRecord[] = RADAR_STATE_ORDER.map((code) =>
  toStateRecord(code, rollups.get(code) ?? emptyRollup()),
);

export const STATE_BY_CODE: Record<RadarStateCode, StateRecord> = Object.fromEntries(
  STATE_RECORDS.map((s) => [s.code, s]),
) as Record<RadarStateCode, StateRecord>;

export const RADAR_YTD = STATE_RECORDS.reduce((sum, s) => sum + s.ytd, 0);
export const RADAR_PCT_OF_NATIONAL = Math.round((RADAR_YTD / NATIONAL_YTD) * 10000) / 100;

export const QUARTER_LABELS: { id: QuarterKey; label: string }[] = [
  { id: "ytd", label: "YTD" },
  { id: "q1", label: "Q1" },
  { id: "q2", label: "Q2" },
  { id: "q3", label: "Q3" },
  { id: "q4", label: "Q4" },
];

export function metricOf(row: Pick<County, QuarterKey> | StateRecord, metric: QuarterKey): number {
  return row[metric];
}

export interface MbmaFilters {
  metric: QuarterKey;
  region: RadarRegion;
  isolatedState: RadarStateCode | null;
  query: string;
}

export const DEFAULT_MBMA_FILTERS: MbmaFilters = {
  metric: "ytd",
  region: "radar",
  isolatedState: null,
  query: "",
};

export function filterCounties(all: County[], filters: MbmaFilters): County[] {
  const q = filters.query.trim().toLowerCase();
  return all.filter((c) => {
    if (filters.region === "northFl" && c.state !== "FL") return false;
    if (filters.isolatedState && c.state !== filters.isolatedState) return false;
    if (!q) return true;
    const state = STATE_BY_CODE[c.state];
    return (
      c.name.toLowerCase().includes(q) ||
      c.state.toLowerCase().includes(q) ||
      c.fips.includes(q) ||
      (state?.name.toLowerCase().includes(q) ?? false) ||
      (state?.shortLabel.toLowerCase().includes(q) ?? false)
    );
  });
}

export function toCountyRows(counties: County[], metric: QuarterKey): CountyRow[] {
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

/** Published $000s → executive display ($1.96B / $30.7M / $7.4M). */
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
  return lerpHex("#f4ece8", "#c8102e", Math.min(1, Math.max(0, t)));
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
