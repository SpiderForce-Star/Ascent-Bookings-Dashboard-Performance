/**
 * Ascent Buildings market territory — Portland, TN plant + ~600-mile service area.
 */

export interface TerritoryState {
  code: string;
  name: string;
  region: "core" | "primary" | "extended";
  /** Relative commercial demand score 0–100 (sample) */
  demand: number;
  /** Approximate road miles from Portland, TN */
  milesFromPlant: number;
  /** Sample pipeline weight for next 12 months (index) */
  pipeline: number;
  notes: string;
}

export const plant = {
  name: "Portland, Tennessee",
  label: "Production facility",
  lat: 36.5817,
  lng: -86.5164,
  radiusMiles: 600,
};

/** States in the primary targeting footprint. */
export const territoryStates: TerritoryState[] = [
  {
    code: "TN",
    name: "Tennessee",
    region: "core",
    demand: 96,
    milesFromPlant: 0,
    pipeline: 100,
    notes: "Home plant market; highest density of fab + service work.",
  },
  {
    code: "KY",
    name: "Kentucky",
    region: "core",
    demand: 88,
    milesFromPlant: 90,
    pipeline: 92,
    notes: "Industrial corridors and agricultural buildings.",
  },
  {
    code: "AL",
    name: "Alabama",
    region: "core",
    demand: 84,
    milesFromPlant: 180,
    pipeline: 86,
    notes: "Auto/industrial suppliers and commercial shells.",
  },
  {
    code: "GA",
    name: "Georgia",
    region: "primary",
    demand: 90,
    milesFromPlant: 250,
    pipeline: 94,
    notes: "Atlanta metro industrial + SE logistics.",
  },
  {
    code: "MS",
    name: "Mississippi",
    region: "primary",
    demand: 72,
    milesFromPlant: 280,
    pipeline: 70,
    notes: "Agricultural and light industrial.",
  },
  {
    code: "AR",
    name: "Arkansas",
    region: "primary",
    demand: 74,
    milesFromPlant: 320,
    pipeline: 76,
    notes: "Westward expansion; poultry & manufacturing.",
  },
  {
    code: "MO",
    name: "Missouri",
    region: "primary",
    demand: 78,
    milesFromPlant: 340,
    pipeline: 80,
    notes: "St. Louis / mid-MO commercial and industrial.",
  },
  {
    code: "IL",
    name: "Illinois",
    region: "primary",
    demand: 80,
    milesFromPlant: 360,
    pipeline: 82,
    notes: "Southern IL + metro industrial parks.",
  },
  {
    code: "IN",
    name: "Indiana",
    region: "primary",
    demand: 82,
    milesFromPlant: 300,
    pipeline: 85,
    notes: "Manufacturing belt; strong metal building demand.",
  },
  {
    code: "OH",
    name: "Ohio",
    region: "primary",
    demand: 79,
    milesFromPlant: 380,
    pipeline: 81,
    notes: "Industrial rehab and distribution.",
  },
  {
    code: "WV",
    name: "West Virginia",
    region: "extended",
    demand: 62,
    milesFromPlant: 420,
    pipeline: 58,
    notes: "Select public and industrial projects.",
  },
  {
    code: "PA",
    name: "Pennsylvania",
    region: "extended",
    demand: 70,
    milesFromPlant: 520,
    pipeline: 68,
    notes: "Western PA edge of radius; industrial focus.",
  },
  {
    code: "VA",
    name: "Virginia",
    region: "primary",
    demand: 81,
    milesFromPlant: 450,
    pipeline: 83,
    notes: "Data-center-adjacent and commercial growth.",
  },
  {
    code: "NC",
    name: "North Carolina",
    region: "primary",
    demand: 87,
    milesFromPlant: 400,
    pipeline: 90,
    notes: "Triangle / Charlotte industrial corridors.",
  },
  {
    code: "SC",
    name: "South Carolina",
    region: "primary",
    demand: 83,
    milesFromPlant: 380,
    pipeline: 86,
    notes: "Port-related and advanced manufacturing.",
  },
  {
    code: "FL",
    name: "Florida (Upper)",
    region: "extended",
    demand: 76,
    milesFromPlant: 550,
    pipeline: 74,
    notes: "Panhandle & north FL commercial; selective.",
  },
  {
    code: "TX",
    name: "Texas (East)",
    region: "extended",
    demand: 85,
    milesFromPlant: 580,
    pipeline: 88,
    notes: "East TX industrial / energy-adjacent buildings.",
  },
];

export const regionLabels: Record<TerritoryState["region"], string> = {
  core: "Core (plant region)",
  primary: "Primary (~600 mi)",
  extended: "Extended / selective",
};

export function territoryTotals() {
  const avgDemand =
    territoryStates.reduce((s, t) => s + t.demand, 0) / territoryStates.length;
  const core = territoryStates.filter((t) => t.region === "core");
  const primary = territoryStates.filter((t) => t.region === "primary");
  const extended = territoryStates.filter((t) => t.region === "extended");
  return {
    stateCount: territoryStates.length,
    avgDemand,
    coreCount: core.length,
    primaryCount: primary.length,
    extendedCount: extended.length,
    topMarkets: [...territoryStates].sort((a, b) => b.demand - a.demand).slice(0, 5),
  };
}
