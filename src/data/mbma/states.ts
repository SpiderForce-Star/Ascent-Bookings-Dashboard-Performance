import type { RadarStateCode, StateRecord } from "./types";

/** National MBMA non-agriculture YTD 2025 ($000s) from ShipByState4Q25. */
export const NATIONAL_YTD = 4_330_829;

/** Default map/table pin — Davidson County, TN. */
export const DEFAULT_PIN_FIPS = "47037";

export const DATA_AS_OF = "Compiled 02/18/2026 (MBMA 2025 full year)";

export const RADAR_STATE_ORDER: RadarStateCode[] = [
  "TN",
  "KY",
  "VA",
  "NC",
  "SC",
  "GA",
  "AL",
  "MS",
  "LA",
  "AR",
  "MO",
  "IL",
  "IN",
  "OH",
  "WV",
  "PA",
  "FL",
];

/** Display names + national rank. Dollars are rolled up from radar counties. */
export const STATE_META: Record<
  RadarStateCode,
  { name: string; rank: number; northOnly?: boolean; shortLabel?: string }
> = {
  TN: { name: "Tennessee", rank: 10 },
  KY: { name: "Kentucky", rank: 15 },
  VA: { name: "Virginia", rank: 13 },
  NC: { name: "North Carolina", rank: 4 },
  SC: { name: "South Carolina", rank: 17 },
  GA: { name: "Georgia", rank: 6 },
  AL: { name: "Alabama", rank: 11 },
  MS: { name: "Mississippi", rank: 25 },
  LA: { name: "Louisiana", rank: 31 },
  AR: { name: "Arkansas", rank: 21 },
  MO: { name: "Missouri", rank: 12 },
  IL: { name: "Illinois", rank: 19 },
  IN: { name: "Indiana", rank: 5 },
  OH: { name: "Ohio", rank: 3 },
  WV: { name: "West Virginia", rank: 39 },
  PA: { name: "Pennsylvania", rank: 9 },
  FL: { name: "Florida", rank: 2, northOnly: true, shortLabel: "N. FL" },
};

export function pctOfNational(ytd000s: number): number {
  return Math.round((ytd000s / NATIONAL_YTD) * 10000) / 100;
}

export function toStateRecord(
  code: RadarStateCode,
  rollup: { q1: number; q2: number; q3: number; q4: number; ytd: number },
): StateRecord {
  const meta = STATE_META[code];
  return {
    code,
    name: meta.name,
    postal: code,
    shortLabel: meta.shortLabel ?? code,
    ytd: rollup.ytd,
    q1: rollup.q1,
    q2: rollup.q2,
    q3: rollup.q3,
    q4: rollup.q4,
    pctOfNational: pctOfNational(rollup.ytd),
    rank: meta.rank,
    northOnly: meta.northOnly,
  };
}
