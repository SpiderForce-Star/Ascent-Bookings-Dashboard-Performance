/**
 * Target-Attack hunt engine — MBMA flags + PEMB-filtered Dodge join on FIPS.
 * Does not invent contacts, competitor hold, or Ascent share-of-market.
 */
import { plant } from "@/data/territory";
import {
  COUNTIES,
  RADAR_STATE_ORDER,
  STATE_BY_CODE,
  type County,
  type RadarStateCode,
} from "@/data/mbma";
import type { DodgeCompany, DodgeProject, DodgeProjectStage } from "@/data/dodge";
import { attachProjectFips } from "@/data/dodge-fips";

export type HuntFlag = "repeatable" | "spike" | "empty" | "concentrated";
export type DistBand = "0-150" | "150-300" | "300-600" | "600+";

export interface HuntCounty extends County {
  flags: HuntFlag[];
  activeQuarters: number;
  peakShare: number;
  pctOfState: number;
  distBand: DistBand;
  miles: number;
}

export interface HuntProject extends DodgeProject {
  fips: string | null;
  typeUnconfirmed: boolean;
  contacts: { owner: boolean; architect: boolean; gc: boolean };
  coverage: number;
}

export interface StateHunt {
  state: RadarStateCode;
  primary: HuntCounty;
  runnersUp: HuntCounty[];
  territoryPrimary: boolean;
}

const HUNT_STAGES = new Set<DodgeProjectStage>([
  "planning",
  "design",
  "bidding",
  "preconstruction",
]);

const PEMB_TYPES = new Set([
  "warehouse",
  "industrial",
  "manufacturing",
  "self_storage",
]);

/** Seed primaries (MBMA 2025). VA skips Mecklenburg; WV skips Mason as territory primary. */
export const SEED_PRIMARY: Record<RadarStateCode, string | null> = {
  IN: "18003",
  OH: "39049",
  NC: "37107",
  AL: "01003",
  MO: "29077",
  PA: "42079",
  TN: "47037",
  SC: "45045",
  FL: "12031",
  GA: "13121",
  IL: "17031",
  KY: "21111",
  AR: "05119",
  MS: "28033",
  LA: "22019",
  VA: "51177", // Spotsylvania — Repeatable, not concentrated
  WV: "54003", // Berkeley — Mason is project-chase only
};

export const STATE_Q_RANKS: Record<RadarStateCode, { q1: number; q2: number; q3: number; q4: number; ytd: number }> =
  {
    AL: { q1: 7, q2: 10, q3: 12, q4: 10, ytd: 11 },
    AR: { q1: 17, q2: 25, q3: 22, q4: 26, ytd: 21 },
    FL: { q1: 2, q2: 2, q3: 3, q4: 2, ytd: 2 },
    GA: { q1: 3, q2: 5, q3: 8, q4: 8, ytd: 6 },
    IL: { q1: 16, q2: 16, q3: 24, q4: 23, ytd: 19 },
    IN: { q1: 11, q2: 6, q3: 4, q4: 4, ytd: 5 },
    KY: { q1: 20, q2: 13, q3: 13, q4: 21, ytd: 15 },
    LA: { q1: 29, q2: 24, q3: 32, q4: 27, ytd: 31 },
    MS: { q1: 23, q2: 22, q3: 34, q4: 20, ytd: 25 },
    MO: { q1: 15, q2: 14, q3: 10, q4: 16, ytd: 12 },
    NC: { q1: 4, q2: 4, q3: 6, q4: 6, ytd: 4 },
    OH: { q1: 5, q2: 3, q3: 2, q4: 5, ytd: 3 },
    PA: { q1: 18, q2: 9, q3: 11, q4: 3, ytd: 9 },
    SC: { q1: 12, q2: 19, q3: 17, q4: 18, ytd: 17 },
    TN: { q1: 8, q2: 11, q3: 9, q4: 12, ytd: 10 },
    VA: { q1: 14, q2: 12, q3: 23, q4: 14, ytd: 13 },
    WV: { q1: 36, q2: 40, q3: 38, q4: 38, ytd: 39 },
  };

export const RANK_CALLOUTS = [
  "IN surged 2H (Q1 #11 → Q3/Q4 #4)",
  "OH peaked Q3 at #2",
  "PA Q4 explosion (#18 → #3)",
  "TN/KY faded Q4",
];

const MUST_CONCENTRATED = new Set(["51117", "54053"]); // Mecklenburg VA, Mason WV

const STATE_MILES: Record<string, number> = {
  TN: 40,
  KY: 120,
  AL: 180,
  GA: 250,
  MS: 280,
  AR: 320,
  MO: 340,
  IL: 360,
  IN: 300,
  OH: 380,
  WV: 360,
  PA: 480,
  VA: 380,
  NC: 390,
  SC: 310,
  FL: 480,
  LA: 520,
};

export function countyFlags(c: County, stateYtd: number): HuntFlag[] {
  const qs = [c.q1, c.q2, c.q3, c.q4];
  const active = qs.filter((q) => q > 0).length;
  const peak = c.ytd > 0 ? Math.max(...qs) / c.ytd : 0;
  const flags: HuntFlag[] = [];
  if (c.ytd <= 0) flags.push("empty");
  else if (active === 1 || peak >= 0.55) flags.push("spike");
  else if (active >= 3) flags.push("repeatable");
  const concentrated = stateYtd > 0 && c.ytd / stateYtd >= 0.2;
  if (concentrated || MUST_CONCENTRATED.has(c.fips)) flags.push("concentrated");
  return flags;
}

export function distBand(miles: number): DistBand {
  if (miles <= 150) return "0-150";
  if (miles <= 300) return "150-300";
  if (miles <= 600) return "300-600";
  return "600+";
}

export function annotateCounties(): HuntCounty[] {
  return COUNTIES.map((c) => {
    const stateYtd = STATE_BY_CODE[c.state]?.ytd ?? 0;
    const qs = [c.q1, c.q2, c.q3, c.q4];
    const miles = STATE_MILES[c.state] ?? 400;
    return {
      ...c,
      flags: countyFlags(c, stateYtd),
      activeQuarters: qs.filter((q) => q > 0).length,
      peakShare: c.ytd > 0 ? Math.max(...qs) / c.ytd : 0,
      pctOfState: stateYtd > 0 ? c.ytd / stateYtd : 0,
      miles,
      distBand: distBand(miles),
    };
  });
}

export const HUNT_COUNTIES: HuntCounty[] = annotateCounties();
const BY_FIPS = new Map(HUNT_COUNTIES.map((c) => [c.fips, c]));

export function huntByFips(fips: string): HuntCounty | undefined {
  return BY_FIPS.get(fips);
}

/** Accept query fips as string or number; keep Baldwin AL as 01003. */
export function parseFipsParam(raw: unknown): string | undefined {
  if (raw == null || raw === "") return undefined;
  const s = String(raw).replace(/"/g, "").trim();
  if (!s) return undefined;
  const fips = s.padStart(5, "0");
  return /^\d{5}$/.test(fips) ? fips : undefined;
}

export function isPembHunt(p: DodgeProject): { ok: boolean; typeUnconfirmed: boolean } {
  if (p.buildingType === "agricultural") return { ok: false, typeUnconfirmed: false };
  const stageOk =
    HUNT_STAGES.has(p.stage) ||
    (p.stage === "construction" && Boolean(p.bidDate && Date.parse(p.bidDate) > Date.now()));
  if (!stageOk) return { ok: false, typeUnconfirmed: false };
  const trades = p.trades.join(" ").toLowerCase();
  const metal =
    trades.includes("metal building") ||
    trades.includes("pemb") ||
    trades.includes("pre-engineered") ||
    trades.includes("peb");
  const typed = PEMB_TYPES.has(p.buildingType) || p.productLine === "PEMB" || metal;
  if (!typed && (p.buildingType === "institutional" || p.buildingType === "retail") && metal) {
    return { ok: true, typeUnconfirmed: true };
  }
  if (!typed) {
    if (p.productLine === "PEMB" || metal) return { ok: true, typeUnconfirmed: true };
    return { ok: false, typeUnconfirmed: true };
  }
  const unconfirmed = p.buildingType === "other" || p.buildingType === "commercial" || p.buildingType === "office";
  return { ok: true, typeUnconfirmed: unconfirmed && !metal };
}

export function pembHuntProjects(raw: DodgeProject[]): HuntProject[] {
  return raw
    .map(attachProjectFips)
    .map((p) => {
      const { ok, typeUnconfirmed } = isPembHunt(p);
      if (!ok) return null;
      if (p.state === "TX") return null;
      const county = p.fips ? BY_FIPS.get(p.fips) : undefined;
      if (p.fips && !county) return null;
      const contacts = {
        owner: Boolean(p.owner),
        architect: Boolean(p.architect),
        gc: Boolean(p.gc),
      };
      return {
        ...p,
        typeUnconfirmed,
        contacts,
        coverage: Number(contacts.owner) + Number(contacts.architect) + Number(contacts.gc),
      };
    })
    .filter((p): p is HuntProject => Boolean(p));
}

function bandPenalty(b: DistBand): number {
  if (b === "0-150") return 0;
  if (b === "150-300") return 2_000;
  if (b === "300-600") return 5_000;
  return 12_000;
}

export function scoreCounty(c: HuntCounty, dodge: HuntProject[]): number {
  const here = dodge.filter((p) => p.fips === c.fips);
  const dodge000s = here.reduce((s, p) => s + p.valuation, 0) / 1000;
  const coverage = here.reduce((m, p) => Math.max(m, p.coverage), 0);
  const book = here.length > 1;
  let s = 0;
  if (c.flags.includes("repeatable")) s += c.ytd;
  else s += c.ytd * 0.3;
  s += dodge000s * 1.15;
  s += coverage * 6_000;
  if (c.flags.includes("concentrated") && !book) s -= c.ytd * 0.55;
  s -= bandPenalty(c.distBand);
  return s;
}

export function buildStateHunts(dodge: HuntProject[]): StateHunt[] {
  const byState = new Map<RadarStateCode, HuntCounty[]>();
  for (const c of HUNT_COUNTIES) {
    const list = byState.get(c.state) ?? [];
    list.push(c);
    byState.set(c.state, list);
  }

  return RADAR_STATE_ORDER.map((state) => {
    const list = (byState.get(state) ?? []).slice().sort((a, b) => scoreCounty(b, dodge) - scoreCounty(a, dodge));
    const seed = SEED_PRIMARY[state];
    let primary = (seed && list.find((c) => c.fips === seed)) || list[0];
    if (state === "VA" && primary?.fips === "51117") {
      primary = list.find((c) => c.flags.includes("repeatable") && !c.flags.includes("concentrated")) ?? primary;
    }
    if (state === "WV" && primary?.fips === "54053") {
      primary = list.find((c) => c.fips === "54003") ?? list.find((c) => !c.flags.includes("concentrated")) ?? primary;
    }
    const runnersUp = list.filter((c) => c.fips !== primary.fips).slice(0, 2);
    return {
      state,
      primary,
      runnersUp,
      territoryPrimary: state !== "WV",
    };
  });
}

export function nearestPlantProxy(state: RadarStateCode): { name: string; note: string } {
  if (state === "PA" || state === "WV" || state === "VA") {
    return { name: "Butler · Annville, PA", note: "proxy — not market share" };
  }
  if (state === "IN" || state === "OH") {
    return { name: "Nucor Building Systems · Waterloo, IN", note: "proxy — not market share" };
  }
  if (state === "MS" || state === "LA" || state === "AR") {
    return { name: "Ceco · Columbus, MS", note: "proxy — not market share" };
  }
  if (state === "MO" || state === "IL") {
    return { name: "Butler · Galesburg, IL", note: "proxy — not market share" };
  }
  return { name: `Kirby · 124 Kirby Dr, ${plant.name}`, note: "proxy — not market share" };
}

export function matchCompany(name: string | null, companies: DodgeCompany[]): DodgeCompany | null {
  if (!name) return null;
  const n = name.toLowerCase();
  return companies.find((c) => c.name.toLowerCase() === n || n.includes(c.name.toLowerCase())) ?? null;
}

export const STAGE_SORT: Record<string, number> = {
  bidding: 0,
  design: 1,
  planning: 2,
  preconstruction: 3,
  construction: 4,
  on_hold: 5,
  completed: 6,
  unknown: 7,
};
