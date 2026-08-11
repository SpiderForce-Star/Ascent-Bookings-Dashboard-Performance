/**
 * Dodge Construction Network — types + demo pipeline for Ascent territory.
 * Live data requires enterprise OAuth credentials (see README).
 * https://www.construction.com/apis/
 */

export type DodgeProjectStage =
  | "planning"
  | "design"
  | "bidding"
  | "preconstruction"
  | "construction"
  | "completed"
  | "on_hold"
  | "unknown";

export type DodgeBuildingType =
  | "warehouse"
  | "industrial"
  | "manufacturing"
  | "agricultural"
  | "commercial"
  | "office"
  | "retail"
  | "institutional"
  | "self_storage"
  | "other";

/** Ascent product line focus for commercial packages. */
export type ProductLine = "PEMB" | "Component" | "Other";

/** Building types that default toward PEMB / CSI Division 13 metal building systems. */
export const PEMB_BUILDING_TYPES: DodgeBuildingType[] = [
  "warehouse",
  "industrial",
  "manufacturing",
  "agricultural",
  "self_storage",
];

export interface DodgeProject {
  id: string;
  title: string;
  stage: DodgeProjectStage;
  buildingType: DodgeBuildingType;
  /** Product line: PEMB (Div 13 metal building systems), Component, or Other */
  productLine: ProductLine;
  valuation: number;
  city: string;
  state: string;
  /** Miles from Portland, TN plant (approx) */
  milesFromPlant: number;
  bidDate: string | null;
  startDate: string | null;
  owner: string | null;
  architect: string | null;
  gc: string | null;
  trades: string[];
  source: "dodge_live" | "demo";
  /** Spec / notes snippet */
  notes: string;
}

export interface DodgeCompany {
  id: string;
  name: string;
  role: string;
  city: string;
  state: string;
  phone: string | null;
  source: "dodge_live" | "demo";
}

export interface DodgeConnectionStatus {
  configured: boolean;
  mode: "live" | "demo";
  message: string;
  baseUrl: string | null;
  hasClientId: boolean;
  hasClientSecret: boolean;
  hasAccessToken: boolean;
}

export interface DodgeProjectsResponse {
  fetchedAt: string;
  status: DodgeConnectionStatus;
  projects: DodgeProject[];
  companies: DodgeCompany[];
  summary: {
    projectCount: number;
    totalValuation: number;
    biddingCount: number;
    inTerritoryCount: number;
    avgMiles: number;
  };
  filters: {
    states: string[];
    maxMiles: number;
    minValuation: number;
  };
}

/** Ascent primary states for Dodge geo filter. */
export const DODGE_TERRITORY_STATES = [
  "TN",
  "KY",
  "AL",
  "GA",
  "MS",
  "AR",
  "MO",
  "IL",
  "IN",
  "OH",
  "WV",
  "PA",
  "VA",
  "NC",
  "SC",
  "FL",
  "TX",
] as const;

/**
 * Demo projects — illustrative SE commercial pipeline near Portland, TN.
 * Replaced automatically when live Dodge credentials succeed.
 */
export const DEMO_DODGE_PROJECTS: DodgeProject[] = [
  {
    id: "demo-tn-ind-01",
    title: "Portland Logistics Expansion — Building C",
    stage: "bidding",
    buildingType: "warehouse",
    productLine: "PEMB",
    valuation: 12_400_000,
    city: "Portland",
    state: "TN",
    milesFromPlant: 8,
    bidDate: "2026-08-22",
    startDate: "2026-10-15",
    owner: "Cumberland Distribution LLC",
    architect: "Southeast Industrial Architects",
    gc: null,
    trades: ["structural steel", "metal building", "MEP"],
    source: "demo",
    notes: "CSI Division 13 PEMB shell + docks; ideal fab fit.",
  },
  {
    id: "demo-ky-mfg-02",
    title: "Bowling Green Component Plant",
    stage: "design",
    buildingType: "manufacturing",
    productLine: "PEMB",
    valuation: 28_750_000,
    city: "Bowling Green",
    state: "KY",
    milesFromPlant: 65,
    bidDate: "2026-09-30",
    startDate: "2027-01-12",
    owner: "Bluegrass Manufacturing Co.",
    architect: "Industrial Design Collaborative",
    gc: null,
    trades: ["structural steel", "crane runway", "insulation"],
    source: "demo",
    notes: "Clear-span industrial with bridge crane support — Div 13 system.",
  },
  {
    id: "demo-al-wh-03",
    title: "Huntsville Aerospace Supplier Warehouse",
    stage: "preconstruction",
    buildingType: "warehouse",
    productLine: "PEMB",
    valuation: 19_200_000,
    city: "Huntsville",
    state: "AL",
    milesFromPlant: 120,
    bidDate: "2026-07-18",
    startDate: "2026-09-01",
    owner: "Redstone Supply Partners",
    architect: "Gulf Coast AEC",
    gc: "Southern Builders Inc.",
    trades: ["metal building", "panels", "insulation"],
    source: "demo",
    notes: "GC selected; package buy-out window open for PEB.",
  },
  {
    id: "demo-ga-ind-04",
    title: "Northwest Atlanta Spec Industrial",
    stage: "bidding",
    buildingType: "industrial",
    productLine: "PEMB",
    valuation: 34_500_000,
    city: "Austell",
    state: "GA",
    milesFromPlant: 245,
    bidDate: "2026-08-05",
    startDate: "2026-11-01",
    owner: "Piedmont Spec Developers",
    architect: "Metro Industrial Design",
    gc: null,
    trades: ["structural steel", "metal building", "IMPs"],
    source: "demo",
    notes: "Multi-building campus phase 1; competitive SE bidders.",
  },
  {
    id: "demo-in-mfg-05",
    title: "Evansville Fabrication Expansion",
    stage: "planning",
    buildingType: "manufacturing",
    productLine: "PEMB",
    valuation: 15_800_000,
    city: "Evansville",
    state: "IN",
    milesFromPlant: 155,
    bidDate: null,
    startDate: "2027-03-01",
    owner: "Ohio Valley Metals",
    architect: null,
    gc: null,
    trades: ["structural steel", "hot rolled", "crane"],
    source: "demo",
    notes: "Early planning — relationship sell for TN fab capacity.",
  },
  {
    id: "demo-nc-wh-06",
    title: "Charlotte Metro Fulfillment Center",
    stage: "design",
    buildingType: "warehouse",
    productLine: "PEMB",
    valuation: 42_000_000,
    city: "Concord",
    state: "NC",
    milesFromPlant: 390,
    bidDate: "2026-10-12",
    startDate: "2027-02-01",
    owner: "Carolina Logistics REIT",
    architect: "Triangle Design Group",
    gc: null,
    trades: ["metal building", "insulation", "buy-outs"],
    source: "demo",
    notes: "Large footprint PEMB; freight sensitive.",
  },
  {
    id: "demo-sc-ind-07",
    title: "Upstate SC Auto Supplier Building",
    stage: "bidding",
    buildingType: "industrial",
    productLine: "PEMB",
    valuation: 22_100_000,
    city: "Greer",
    state: "SC",
    milesFromPlant: 310,
    bidDate: "2026-08-28",
    startDate: "2026-11-15",
    owner: "Upstate Auto Tier-2",
    architect: "Carolinas Industrial A/E",
    gc: null,
    trades: ["structural steel", "primary", "clips"],
    source: "demo",
    notes: "OEM-adjacent; high structural content Div 13 package.",
  },
  {
    id: "demo-ar-ag-08",
    title: "Northeast AR Poultry Processing Support",
    stage: "construction",
    buildingType: "agricultural",
    productLine: "PEMB",
    valuation: 8_650_000,
    city: "Jonesboro",
    state: "AR",
    milesFromPlant: 280,
    bidDate: "2026-03-01",
    startDate: "2026-05-20",
    owner: "Delta Ag Processors",
    architect: "Ag Structures Studio",
    gc: "Mid-South GC",
    trades: ["metal building", "insulation"],
    source: "demo",
    notes: "Under construction — change-order opportunity only.",
  },
  {
    id: "demo-ky-wh-09",
    title: "Cincinnati South Cross-Dock Facility",
    stage: "bidding",
    buildingType: "warehouse",
    productLine: "PEMB",
    valuation: 26_300_000,
    city: "Florence",
    state: "KY",
    milesFromPlant: 250,
    bidDate: "2026-09-08",
    startDate: "2026-12-01",
    owner: "Tri-State Logistics",
    architect: "Ohio Valley Design",
    gc: null,
    trades: ["metal building", "dock equipment", "buy-outs"],
    source: "demo",
    notes: "Cross-dock PEB; strong Ascent product match.",
  },
  {
    id: "demo-va-inst-10",
    title: "Southwest VA Regional Maintenance Facility",
    stage: "design",
    buildingType: "institutional",
    productLine: "PEMB",
    valuation: 11_200_000,
    city: "Roanoke",
    state: "VA",
    milesFromPlant: 380,
    bidDate: "2026-11-01",
    startDate: "2027-04-01",
    owner: "Commonwealth Facilities Board",
    architect: "Public Works Architects",
    gc: null,
    trades: ["metal building", "public bid"],
    source: "demo",
    notes: "Public bid path; CSI Div 13 metal building system.",
  },
  {
    id: "demo-tx-ind-11",
    title: "East TX Energy Services Shop",
    stage: "planning",
    buildingType: "industrial",
    productLine: "PEMB",
    valuation: 9_400_000,
    city: "Longview",
    state: "TX",
    milesFromPlant: 560,
    bidDate: null,
    startDate: "2027-06-01",
    owner: "East Texas Energy Services",
    architect: null,
    gc: null,
    trades: ["metal building", "hot rolled"],
    source: "demo",
    notes: "Extended territory — selective; freight vs margin check.",
  },
  {
    id: "demo-il-ss-12",
    title: "Southern IL Self-Storage Campus",
    stage: "bidding",
    buildingType: "self_storage",
    productLine: "PEMB",
    valuation: 6_800_000,
    city: "Marion",
    state: "IL",
    milesFromPlant: 175,
    bidDate: "2026-08-14",
    startDate: "2026-10-01",
    owner: "Heartland Storage Partners",
    architect: "Midwest Storage Design",
    gc: null,
    trades: ["metal building", "panels"],
    source: "demo",
    notes: "Repeat PEMB product type; fast estimate cycle.",
  },
  {
    id: "demo-ms-wh-13",
    title: "Tupelo Distribution Shell",
    stage: "bidding",
    buildingType: "warehouse",
    productLine: "PEMB",
    valuation: 9_800_000,
    city: "Tupelo",
    state: "MS",
    milesFromPlant: 220,
    bidDate: "2026-09-05",
    startDate: "2026-11-20",
    owner: "Magnolia Logistics",
    architect: "North MS Design",
    gc: null,
    trades: ["metal building", "panels"],
    source: "demo",
    notes: "PEMB warehouse package — CSI Division 13.",
  },
  {
    id: "demo-mo-ind-14",
    title: "Cape Girardeau Spec Warehouse",
    stage: "bidding",
    buildingType: "warehouse",
    productLine: "PEMB",
    valuation: 11_400_000,
    city: "Cape Girardeau",
    state: "MO",
    milesFromPlant: 290,
    bidDate: "2026-09-20",
    startDate: "2026-12-10",
    owner: "Ozark Spec Partners",
    architect: "Ozark Industrial A/E",
    gc: null,
    trades: ["metal building", "structural steel"],
    source: "demo",
    notes: "Div 13 metal building system.",
  },
  {
    id: "demo-oh-wh-15",
    title: "Cincinnati East Distribution",
    stage: "bidding",
    buildingType: "warehouse",
    productLine: "PEMB",
    valuation: 21_500_000,
    city: "Batavia",
    state: "OH",
    milesFromPlant: 310,
    bidDate: "2026-09-02",
    startDate: "2026-12-01",
    owner: "Buckeye Spec Partners",
    architect: "Ohio Valley Design",
    gc: null,
    trades: ["metal building", "dock equipment"],
    source: "demo",
    notes: "Large clear-span warehouse PEMB.",
  },
  {
    id: "demo-wv-ind-16",
    title: "Huntington Regional Maintenance Shop",
    stage: "design",
    buildingType: "institutional",
    productLine: "PEMB",
    valuation: 7_200_000,
    city: "Huntington",
    state: "WV",
    milesFromPlant: 360,
    bidDate: "2026-10-30",
    startDate: "2027-03-01",
    owner: "WV Regional Facilities",
    architect: "Appalachian Public Works A/E",
    gc: null,
    trades: ["metal building", "public bid"],
    source: "demo",
    notes: "Public PEMB maintenance facility.",
  },
  {
    id: "demo-pa-ss-17",
    title: "Greensburg Self-Storage",
    stage: "bidding",
    buildingType: "self_storage",
    productLine: "PEMB",
    valuation: 5_200_000,
    city: "Greensburg",
    state: "PA",
    milesFromPlant: 480,
    bidDate: "2026-08-27",
    startDate: "2026-11-01",
    owner: "Western PA Storage",
    architect: "PA Storage Partners Design",
    gc: null,
    trades: ["metal building", "panels"],
    source: "demo",
    notes: "Standard PEMB storage product — edge of radius.",
  },
  {
    id: "demo-fl-ind-18",
    title: "Pensacola North Spec Industrial",
    stage: "bidding",
    buildingType: "industrial",
    productLine: "PEMB",
    valuation: 12_600_000,
    city: "Pensacola",
    state: "FL",
    milesFromPlant: 480,
    bidDate: "2026-09-16",
    startDate: "2026-12-15",
    owner: "Panhandle Spec LLC",
    architect: "Gulf Coast Industrial",
    gc: null,
    trades: ["metal building", "hurricane detailing"],
    source: "demo",
    notes: "Upper FL selective PEMB pursuit.",
  },
  {
    id: "demo-tn-comp-19",
    title: "Nashville Component Buy-Out Package",
    stage: "bidding",
    buildingType: "commercial",
    productLine: "Component",
    valuation: 3_400_000,
    city: "Nashville",
    state: "TN",
    milesFromPlant: 35,
    bidDate: "2026-08-19",
    startDate: "2026-10-01",
    owner: "Metro Tenant Fit Partners",
    architect: null,
    gc: "Music City GC",
    trades: ["secondary", "panels", "trim"],
    source: "demo",
    notes: "Component / secondary package — not full PEMB shell.",
  },
  {
    id: "demo-ga-retail-20",
    title: "Marietta Strip Retail Shell",
    stage: "design",
    buildingType: "retail",
    productLine: "Other",
    valuation: 4_800_000,
    city: "Marietta",
    state: "GA",
    milesFromPlant: 255,
    bidDate: "2026-10-05",
    startDate: "2027-01-15",
    owner: "Piedmont Retail LLC",
    architect: "Metro Retail Design",
    gc: null,
    trades: ["misc steel"],
    source: "demo",
    notes: "Conventional retail shell — not primary PEMB focus.",
  },
];

export const DEMO_DODGE_COMPANIES: DodgeCompany[] = [
  {
    id: "demo-co-1",
    name: "Southeast Industrial Architects",
    role: "Architect",
    city: "Nashville",
    state: "TN",
    phone: null,
    source: "demo",
  },
  {
    id: "demo-co-2",
    name: "Southern Builders Inc.",
    role: "General Contractor",
    city: "Huntsville",
    state: "AL",
    phone: null,
    source: "demo",
  },
  {
    id: "demo-co-3",
    name: "Piedmont Spec Developers",
    role: "Owner / Developer",
    city: "Atlanta",
    state: "GA",
    phone: null,
    source: "demo",
  },
  {
    id: "demo-co-4",
    name: "Industrial Design Collaborative",
    role: "Architect",
    city: "Louisville",
    state: "KY",
    phone: null,
    source: "demo",
  },
];

export function summarizeProjects(projects: DodgeProject[], maxMiles: number) {
  const inTerritory = projects.filter((p) => p.milesFromPlant <= maxMiles);
  const totalValuation = projects.reduce((s, p) => s + p.valuation, 0);
  const biddingCount = projects.filter((p) => p.stage === "bidding").length;
  const avgMiles =
    projects.length > 0
      ? projects.reduce((s, p) => s + p.milesFromPlant, 0) / projects.length
      : 0;
  return {
    projectCount: projects.length,
    totalValuation,
    biddingCount,
    inTerritoryCount: inTerritory.length,
    avgMiles: Math.round(avgMiles),
  };
}

export const STAGE_LABEL: Record<DodgeProjectStage, string> = {
  planning: "Planning",
  design: "Design",
  bidding: "Bidding",
  preconstruction: "Preconstruction",
  construction: "Construction",
  completed: "Completed",
  on_hold: "On hold",
  unknown: "Unknown",
};

export const BUILDING_LABEL: Record<DodgeBuildingType, string> = {
  warehouse: "Warehouse",
  industrial: "Industrial",
  manufacturing: "Manufacturing",
  agricultural: "Agricultural",
  commercial: "Commercial",
  office: "Office",
  retail: "Retail",
  institutional: "Institutional",
  self_storage: "Self-storage",
  other: "Other",
};

export const PRODUCT_LINE_LABEL: Record<ProductLine, string> = {
  PEMB: "PEMB / Div 13",
  Component: "Component",
  Other: "Other",
};

/** Infer product line for live API projects missing the field. */
export function inferProductLine(
  buildingType: DodgeBuildingType,
  trades: string[] = [],
): ProductLine {
  const tradeBlob = trades.join(" ").toLowerCase();
  if (
    tradeBlob.includes("metal building") ||
    tradeBlob.includes("peb") ||
    tradeBlob.includes("pemb") ||
    tradeBlob.includes("pre-engineered")
  ) {
    return "PEMB";
  }
  if (PEMB_BUILDING_TYPES.includes(buildingType)) return "PEMB";
  if (tradeBlob.includes("secondary") || tradeBlob.includes("panel") || tradeBlob.includes("trim")) {
    return "Component";
  }
  return "Other";
}

export function isPembFocused(p: Pick<DodgeProject, "productLine" | "buildingType">): boolean {
  return p.productLine === "PEMB" || PEMB_BUILDING_TYPES.includes(p.buildingType);
}
