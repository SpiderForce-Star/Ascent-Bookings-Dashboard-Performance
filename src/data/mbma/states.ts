import type { FocusStateCode, StateSummary } from "./types";

/** National MBMA non-agriculture YTD 2025 ($000s) from ShipByState4Q25. */
export const NATIONAL_YTD = 4_330_829;

export const FOCUS_STATES: StateSummary[] = [
  {
    code: "TX",
    name: "Texas",
    ytd: 512_691,
    pctOfNational: 11.84,
    rank: 1,
    q1: 120_208,
    q2: 139_146,
    q3: 103_082,
    q4: 150_255,
  },
  {
    code: "FL",
    name: "Florida",
    ytd: 235_554,
    pctOfNational: 5.44,
    rank: 2,
    q1: 52_164,
    q2: 72_349,
    q3: 59_854,
    q4: 51_187,
  },
  {
    code: "OH",
    name: "Ohio",
    ytd: 211_442,
    pctOfNational: 4.88,
    rank: 3,
    q1: 39_781,
    q2: 58_054,
    q3: 65_567,
    q4: 48_040,
  },
  {
    code: "IN",
    name: "Indiana",
    ytd: 178_702,
    pctOfNational: 4.13,
    rank: 5,
    q1: 26_341,
    q2: 44_048,
    q3: 59_492,
    q4: 48_821,
  },
  {
    code: "MO",
    name: "Missouri",
    ytd: 113_687,
    pctOfNational: 2.63,
    rank: 12,
    q1: 24_290,
    q2: 27_177,
    q3: 34_688,
    q4: 27_532,
  },
  {
    code: "IL",
    name: "Illinois",
    ytd: 90_615,
    pctOfNational: 2.09,
    rank: 19,
    q1: 23_474,
    q2: 26_265,
    q3: 19_781,
    q4: 21_095,
  },
];

export const FOCUS_STATE_CODES: FocusStateCode[] = FOCUS_STATES.map((s) => s.code);

export const FOCUS_YTD = FOCUS_STATES.reduce((sum, s) => sum + s.ytd, 0);

/** 31.00% of national — 1,342,691 / 4,330,829. */
export const FOCUS_PCT_OF_NATIONAL = Math.round((FOCUS_YTD / NATIONAL_YTD) * 10000) / 100;

export const STATE_BY_CODE: Record<FocusStateCode, StateSummary> = Object.fromEntries(
  FOCUS_STATES.map((s) => [s.code, s]),
) as Record<FocusStateCode, StateSummary>;

export const DATA_AS_OF = "Compiled 02/18/2026 (MBMA 2025 full year)";
