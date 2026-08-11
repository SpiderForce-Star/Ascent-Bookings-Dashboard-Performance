/**
 * Ascent Buildings market territory — Portland, TN plant + ~600-mile service area.
 * Product focus: Pre-Engineered Metal Buildings (PEMB) / CSI Division 13.
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
  /**
   * Share of commercial opportunity that is PEMB / metal building systems (0–1).
   * Planning estimate for product mix — not booked revenue split.
   */
  pembShare: number;
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
    pembShare: 0.78,
    notes: "Home plant market; highest density of fab + service work. Strong PEMB / Div 13 mix.",
  },
  {
    code: "KY",
    name: "Kentucky",
    region: "core",
    demand: 88,
    milesFromPlant: 90,
    pipeline: 92,
    pembShare: 0.76,
    notes: "Industrial corridors and agricultural buildings — core PEMB product fit.",
  },
  {
    code: "AL",
    name: "Alabama",
    region: "core",
    demand: 84,
    milesFromPlant: 180,
    pipeline: 86,
    pembShare: 0.74,
    notes: "Auto/industrial suppliers and commercial shells (PEMB-heavy).",
  },
  {
    code: "GA",
    name: "Georgia",
    region: "primary",
    demand: 90,
    milesFromPlant: 250,
    pipeline: 94,
    pembShare: 0.72,
    notes: "Atlanta metro industrial + SE logistics PEMB packages.",
  },
  {
    code: "MS",
    name: "Mississippi",
    region: "primary",
    demand: 72,
    milesFromPlant: 280,
    pipeline: 70,
    pembShare: 0.8,
    notes: "Agricultural and light industrial metal buildings.",
  },
  {
    code: "AR",
    name: "Arkansas",
    region: "primary",
    demand: 74,
    milesFromPlant: 320,
    pipeline: 76,
    pembShare: 0.77,
    notes: "Westward expansion; poultry & manufacturing PEMB.",
  },
  {
    code: "MO",
    name: "Missouri",
    region: "primary",
    demand: 78,
    milesFromPlant: 340,
    pipeline: 80,
    pembShare: 0.73,
    notes: "St. Louis / mid-MO commercial and industrial shells.",
  },
  {
    code: "IL",
    name: "Illinois",
    region: "primary",
    demand: 80,
    milesFromPlant: 360,
    pipeline: 82,
    pembShare: 0.75,
    notes: "Southern IL + industrial parks; strong self-storage PEMB.",
  },
  {
    code: "IN",
    name: "Indiana",
    region: "primary",
    demand: 82,
    milesFromPlant: 300,
    pipeline: 85,
    pembShare: 0.79,
    notes: "Manufacturing belt; strong metal building demand.",
  },
  {
    code: "OH",
    name: "Ohio",
    region: "primary",
    demand: 79,
    milesFromPlant: 380,
    pipeline: 81,
    pembShare: 0.71,
    notes: "Industrial rehab and distribution PEMB.",
  },
  {
    code: "WV",
    name: "West Virginia",
    region: "extended",
    demand: 62,
    milesFromPlant: 420,
    pipeline: 58,
    pembShare: 0.7,
    notes: "Select public and industrial PEMB projects.",
  },
  {
    code: "PA",
    name: "Pennsylvania",
    region: "extended",
    demand: 70,
    milesFromPlant: 520,
    pipeline: 68,
    pembShare: 0.68,
    notes: "Western PA edge of radius; industrial PEMB focus.",
  },
  {
    code: "VA",
    name: "Virginia",
    region: "primary",
    demand: 81,
    milesFromPlant: 450,
    pipeline: 83,
    pembShare: 0.7,
    notes: "Public/industrial growth; selective commercial PEMB.",
  },
  {
    code: "NC",
    name: "North Carolina",
    region: "primary",
    demand: 87,
    milesFromPlant: 400,
    pipeline: 90,
    pembShare: 0.74,
    notes: "Triangle / Charlotte industrial corridors — large PEMB packages.",
  },
  {
    code: "SC",
    name: "South Carolina",
    region: "primary",
    demand: 83,
    milesFromPlant: 380,
    pipeline: 86,
    pembShare: 0.76,
    notes: "Port-related and advanced manufacturing metal buildings.",
  },
  {
    code: "FL",
    name: "Florida (Upper)",
    region: "extended",
    demand: 76,
    milesFromPlant: 550,
    pipeline: 74,
    pembShare: 0.69,
    notes: "Panhandle & north FL commercial PEMB; selective.",
  },
  {
    code: "TX",
    name: "Texas (East)",
    region: "extended",
    demand: 85,
    milesFromPlant: 580,
    pipeline: 88,
    pembShare: 0.73,
    notes: "East TX industrial / energy-adjacent PEMB buildings.",
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
  const avgPembShare =
    territoryStates.reduce((s, t) => s + t.pembShare, 0) / territoryStates.length;
  const core = territoryStates.filter((t) => t.region === "core");
  const primary = territoryStates.filter((t) => t.region === "primary");
  const extended = territoryStates.filter((t) => t.region === "extended");
  return {
    stateCount: territoryStates.length,
    avgDemand,
    avgPembShare,
    coreCount: core.length,
    primaryCount: primary.length,
    extendedCount: extended.length,
    topMarkets: [...territoryStates].sort((a, b) => b.demand - a.demand).slice(0, 5),
  };
}
