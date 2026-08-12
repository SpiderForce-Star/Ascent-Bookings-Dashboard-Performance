/**
 * State sales summary sheets — VP Sales / Marketing handoff packs.
 * PEMB/Division 13 metrics and sample opportunities.
 * Regional rep assignment is intentionally blank — VP assigns offline or in the UI.
 * Pipeline $ and project counts are illustrative planning data (not booked revenue).
 */

import { territoryStates, type TerritoryState } from "./territory";
import type { DodgeBuildingType, DodgeProjectStage } from "./dodge";

export type ProductLine = "PEMB" | "Component" | "Other";

export interface StateOpportunity {
  id: string;
  title: string;
  city: string;
  buildingType: DodgeBuildingType;
  productLine: ProductLine;
  stage: DodgeProjectStage;
  valuation: number;
  bidDate: string | null;
  architect: string | null;
  gc: string | null;
  notes: string;
}

export interface CallContact {
  name: string;
  role: "Architect" | "GC" | "Developer" | "Owner";
  firm: string;
  city: string;
}

export interface StateSalesSheet {
  code: string;
  /** Regional salesperson — blank until VP assigns (no seeded demo names) */
  salesperson: string;
  /** Short market narrative for the rep */
  marketNotes: string;
  /** VP of Sales notes box (editable in UI, seeded here) */
  vpNotes: string;
  /** Annual quota / target $ (illustrative planning) */
  quotaTarget: number;
  /** Estimated active PEMB / Div 13 projects in footprint */
  activeProjects: number;
  /** $ in design + bidding stages (illustrative pipeline) */
  designBiddingValue: number;
  topBuildingTypes: string[];
  /** # of bids due in next 30 / 60 / 90 days */
  bidsDue30: number;
  bidsDue60: number;
  bidsDue90: number;
  /** Total pipeline $ for the state (illustrative) */
  pipelineDollars: number;
  /** Share of state pipeline that is PEMB / metal building systems */
  pembShare: number;
  opportunities: StateOpportunity[];
  callList: CallContact[];
}

/** Default PEMB share of commercial shell work Ascent pursues. */
export const DEFAULT_PEMB_SHARE = 0.72;

/** Intentionally empty — VP assigns reps offline or via the Sales Sheets UI. */
const SALESPEOPLE: Record<string, string> = {
  TN: "",
  KY: "",
  AL: "",
  GA: "",
  MS: "",
  AR: "",
  MO: "",
  IL: "",
  IN: "",
  OH: "",
  WV: "",
  PA: "",
  VA: "",
  NC: "",
  SC: "",
  FL: "",
  TX: "",
};

type SeedOpp = Omit<StateOpportunity, "id">;

/** 2–5 PEMB-focused opportunities per state (demo / planning). */
const STATE_OPPS: Record<string, SeedOpp[]> = {
  TN: [
    {
      title: "Portland Logistics Expansion — Building C",
      city: "Portland",
      buildingType: "warehouse",
      productLine: "PEMB",
      stage: "bidding",
      valuation: 12_400_000,
      bidDate: "2026-08-22",
      architect: "Southeast Industrial Architects",
      gc: null,
      notes: "CSI Div 13 metal building shell + docks.",
    },
    {
      title: "Clarksville Ag Equipment Dealership",
      city: "Clarksville",
      buildingType: "agricultural",
      productLine: "PEMB",
      stage: "design",
      valuation: 4_200_000,
      bidDate: "2026-09-15",
      architect: "Mid-South Ag Design",
      gc: null,
      notes: "Clear-span showroom + shop.",
    },
    {
      title: "Nashville North Spec Warehouse Phase 2",
      city: "Goodlettsville",
      buildingType: "warehouse",
      productLine: "PEMB",
      stage: "planning",
      valuation: 18_600_000,
      bidDate: null,
      architect: null,
      gc: null,
      notes: "Developer RFI for PEMB package.",
    },
    {
      title: "Murfreesboro Self-Storage Expansion",
      city: "Murfreesboro",
      buildingType: "self_storage",
      productLine: "PEMB",
      stage: "bidding",
      valuation: 5_100_000,
      bidDate: "2026-08-30",
      architect: "Storage Design SE",
      gc: null,
      notes: "Multi-building campus phase.",
    },
  ],
  KY: [
    {
      title: "Bowling Green Component Plant",
      city: "Bowling Green",
      buildingType: "manufacturing",
      productLine: "PEMB",
      stage: "design",
      valuation: 28_750_000,
      bidDate: "2026-09-30",
      architect: "Industrial Design Collaborative",
      gc: null,
      notes: "Clear-span industrial with crane support.",
    },
    {
      title: "Cincinnati South Cross-Dock Facility",
      city: "Florence",
      buildingType: "warehouse",
      productLine: "PEMB",
      stage: "bidding",
      valuation: 26_300_000,
      bidDate: "2026-09-08",
      architect: "Ohio Valley Design",
      gc: null,
      notes: "Cross-dock PEB; strong product match.",
    },
    {
      title: "Lexington Equine Support Arena",
      city: "Lexington",
      buildingType: "agricultural",
      productLine: "PEMB",
      stage: "planning",
      valuation: 6_800_000,
      bidDate: null,
      architect: "Bluegrass Structures",
      gc: null,
      notes: "Ag / equestrian metal building.",
    },
  ],
  AL: [
    {
      title: "Huntsville Aerospace Supplier Warehouse",
      city: "Huntsville",
      buildingType: "warehouse",
      productLine: "PEMB",
      stage: "preconstruction",
      valuation: 19_200_000,
      bidDate: "2026-07-18",
      architect: "Gulf Coast AEC",
      gc: "Southern Builders Inc.",
      notes: "GC selected; PEB buy-out window.",
    },
    {
      title: "Decatur Auto Supplier Shell",
      city: "Decatur",
      buildingType: "industrial",
      productLine: "PEMB",
      stage: "bidding",
      valuation: 14_500_000,
      bidDate: "2026-09-12",
      architect: "Tennessee Valley Industrial",
      gc: null,
      notes: "Div 13 metal building system.",
    },
    {
      title: "Birmingham North Light Manufacturing",
      city: "Fultondale",
      buildingType: "manufacturing",
      productLine: "PEMB",
      stage: "design",
      valuation: 11_200_000,
      bidDate: "2026-10-20",
      architect: null,
      gc: null,
      notes: "Early design — PEMB package preferred.",
    },
  ],
  GA: [
    {
      title: "Northwest Atlanta Spec Industrial",
      city: "Austell",
      buildingType: "industrial",
      productLine: "PEMB",
      stage: "bidding",
      valuation: 34_500_000,
      bidDate: "2026-08-05",
      architect: "Metro Industrial Design",
      gc: null,
      notes: "Multi-building campus phase 1.",
    },
    {
      title: "Savannah Port-Adjacent Warehouse",
      city: "Pooler",
      buildingType: "warehouse",
      productLine: "PEMB",
      stage: "design",
      valuation: 22_800_000,
      bidDate: "2026-10-01",
      architect: "Coastal Industrial A/E",
      gc: null,
      notes: "Logistics shell — freight-sensitive.",
    },
    {
      title: "Macon Self-Storage Campus",
      city: "Macon",
      buildingType: "self_storage",
      productLine: "PEMB",
      stage: "bidding",
      valuation: 7_400_000,
      bidDate: "2026-08-25",
      architect: "Southeast Storage Design",
      gc: null,
      notes: "Repeat developer product type.",
    },
    {
      title: "Rome Ag Processing Support",
      city: "Rome",
      buildingType: "agricultural",
      productLine: "PEMB",
      stage: "planning",
      valuation: 5_600_000,
      bidDate: null,
      architect: null,
      gc: null,
      notes: "Poultry support building.",
    },
  ],
  MS: [
    {
      title: "Tupelo Distribution Shell",
      city: "Tupelo",
      buildingType: "warehouse",
      productLine: "PEMB",
      stage: "bidding",
      valuation: 9_800_000,
      bidDate: "2026-09-05",
      architect: "North MS Design",
      gc: null,
      notes: "PEMB warehouse package.",
    },
    {
      title: "Starkville Ag Equipment Center",
      city: "Starkville",
      buildingType: "agricultural",
      productLine: "PEMB",
      stage: "design",
      valuation: 3_900_000,
      bidDate: "2026-10-15",
      architect: "Ag Structures Studio",
      gc: null,
      notes: "Clear-span ag building.",
    },
    {
      title: "Jackson South Light Industrial",
      city: "Pearl",
      buildingType: "industrial",
      productLine: "PEMB",
      stage: "planning",
      valuation: 8_200_000,
      bidDate: null,
      architect: null,
      gc: null,
      notes: "Spec industrial shell.",
    },
  ],
  AR: [
    {
      title: "Northeast AR Poultry Processing Support",
      city: "Jonesboro",
      buildingType: "agricultural",
      productLine: "PEMB",
      stage: "construction",
      valuation: 8_650_000,
      bidDate: "2026-03-01",
      architect: "Ag Structures Studio",
      gc: "Mid-South GC",
      notes: "Under construction — change-order path.",
    },
    {
      title: "West Memphis Logistics Building",
      city: "West Memphis",
      buildingType: "warehouse",
      productLine: "PEMB",
      stage: "bidding",
      valuation: 15_200_000,
      bidDate: "2026-08-18",
      architect: "Delta Industrial Design",
      gc: null,
      notes: "Cross-dock PEMB.",
    },
    {
      title: "Springdale Manufacturing Expansion",
      city: "Springdale",
      buildingType: "manufacturing",
      productLine: "PEMB",
      stage: "design",
      valuation: 12_100_000,
      bidDate: "2026-11-01",
      architect: null,
      gc: null,
      notes: "Food processing support building.",
    },
  ],
  MO: [
    {
      title: "Cape Girardeau Spec Warehouse",
      city: "Cape Girardeau",
      buildingType: "warehouse",
      productLine: "PEMB",
      stage: "bidding",
      valuation: 11_400_000,
      bidDate: "2026-09-20",
      architect: "Ozark Industrial A/E",
      gc: null,
      notes: "Div 13 metal building system.",
    },
    {
      title: "Springfield Ag Center Expansion",
      city: "Springfield",
      buildingType: "agricultural",
      productLine: "PEMB",
      stage: "design",
      valuation: 4_800_000,
      bidDate: "2026-10-08",
      architect: "Midwest Ag Design",
      gc: null,
      notes: "Equipment dealership + shop.",
    },
    {
      title: "St. Louis South Light Manufacturing",
      city: "Arnold",
      buildingType: "manufacturing",
      productLine: "PEMB",
      stage: "planning",
      valuation: 16_500_000,
      bidDate: null,
      architect: null,
      gc: null,
      notes: "Edge of radius — selective pursuit.",
    },
  ],
  IL: [
    {
      title: "Southern IL Self-Storage Campus",
      city: "Marion",
      buildingType: "self_storage",
      productLine: "PEMB",
      stage: "bidding",
      valuation: 6_800_000,
      bidDate: "2026-08-14",
      architect: "Midwest Storage Design",
      gc: null,
      notes: "Repeat product; fast estimate cycle.",
    },
    {
      title: "Carbondale Industrial Park Building B",
      city: "Carbondale",
      buildingType: "industrial",
      productLine: "PEMB",
      stage: "design",
      valuation: 10_200_000,
      bidDate: "2026-09-28",
      architect: "Southern IL Design Group",
      gc: null,
      notes: "PEMB industrial shell.",
    },
    {
      title: "Mt. Vernon Cross-Dock",
      city: "Mt. Vernon",
      buildingType: "warehouse",
      productLine: "PEMB",
      stage: "bidding",
      valuation: 13_600_000,
      bidDate: "2026-08-29",
      architect: null,
      gc: null,
      notes: "I-57 corridor logistics.",
    },
  ],
  IN: [
    {
      title: "Evansville Fabrication Expansion",
      city: "Evansville",
      buildingType: "manufacturing",
      productLine: "PEMB",
      stage: "planning",
      valuation: 15_800_000,
      bidDate: null,
      architect: null,
      gc: null,
      notes: "Early planning — TN fab capacity play.",
    },
    {
      title: "Terre Haute Spec Industrial",
      city: "Terre Haute",
      buildingType: "industrial",
      productLine: "PEMB",
      stage: "bidding",
      valuation: 17_200_000,
      bidDate: "2026-09-10",
      architect: "Wabash Valley A/E",
      gc: null,
      notes: "Clear-span industrial.",
    },
    {
      title: "Bloomington Self-Storage",
      city: "Bloomington",
      buildingType: "self_storage",
      productLine: "PEMB",
      stage: "design",
      valuation: 5_400_000,
      bidDate: "2026-10-22",
      architect: "Hoosier Storage Design",
      gc: null,
      notes: "Climate-controlled + standard buildings.",
    },
  ],
  OH: [
    {
      title: "Cincinnati East Distribution",
      city: "Batavia",
      buildingType: "warehouse",
      productLine: "PEMB",
      stage: "bidding",
      valuation: 21_500_000,
      bidDate: "2026-09-02",
      architect: "Ohio Valley Design",
      gc: null,
      notes: "Large clear-span warehouse.",
    },
    {
      title: "Dayton Industrial Rehab Shell",
      city: "Miamisburg",
      buildingType: "industrial",
      productLine: "PEMB",
      stage: "design",
      valuation: 9_100_000,
      bidDate: "2026-11-12",
      architect: "Miami Valley Industrial",
      gc: null,
      notes: "Replacement PEMB over existing pad.",
    },
    {
      title: "Columbus South Ag Equipment",
      city: "Grove City",
      buildingType: "agricultural",
      productLine: "PEMB",
      stage: "planning",
      valuation: 4_500_000,
      bidDate: null,
      architect: null,
      gc: null,
      notes: "Selective — edge of radius.",
    },
  ],
  WV: [
    {
      title: "Huntington Regional Maintenance Shop",
      city: "Huntington",
      buildingType: "institutional",
      productLine: "PEMB",
      stage: "design",
      valuation: 7_200_000,
      bidDate: "2026-10-30",
      architect: "Appalachian Public Works A/E",
      gc: null,
      notes: "Public PEMB maintenance facility.",
    },
    {
      title: "Charleston Light Industrial",
      city: "South Charleston",
      buildingType: "industrial",
      productLine: "PEMB",
      stage: "bidding",
      valuation: 6_400_000,
      bidDate: "2026-09-18",
      architect: null,
      gc: null,
      notes: "Select public/industrial pursuit.",
    },
  ],
  PA: [
    {
      title: "Pittsburgh South Spec Warehouse",
      city: "Washington",
      buildingType: "warehouse",
      productLine: "PEMB",
      stage: "design",
      valuation: 14_800_000,
      bidDate: "2026-11-05",
      architect: "Allegheny Industrial Design",
      gc: null,
      notes: "Western PA edge of radius.",
    },
    {
      title: "Erie Industrial Shop Building",
      city: "Erie",
      buildingType: "industrial",
      productLine: "PEMB",
      stage: "planning",
      valuation: 8_900_000,
      bidDate: null,
      architect: null,
      gc: null,
      notes: "Selective freight vs margin.",
    },
    {
      title: "Greensburg Self-Storage",
      city: "Greensburg",
      buildingType: "self_storage",
      productLine: "PEMB",
      stage: "bidding",
      valuation: 5_200_000,
      bidDate: "2026-08-27",
      architect: "PA Storage Partners Design",
      gc: null,
      notes: "Standard PEMB storage product.",
    },
  ],
  VA: [
    {
      title: "Southwest VA Regional Maintenance Facility",
      city: "Roanoke",
      buildingType: "institutional",
      productLine: "PEMB",
      stage: "design",
      valuation: 11_200_000,
      bidDate: "2026-11-01",
      architect: "Public Works Architects",
      gc: null,
      notes: "Public bid; Div 13 metal building.",
    },
    {
      title: "Lynchburg Spec Industrial",
      city: "Lynchburg",
      buildingType: "industrial",
      productLine: "PEMB",
      stage: "bidding",
      valuation: 13_900_000,
      bidDate: "2026-09-14",
      architect: "Blue Ridge Industrial A/E",
      gc: null,
      notes: "PEMB industrial shell.",
    },
    {
      title: "Danville Warehouse Expansion",
      city: "Danville",
      buildingType: "warehouse",
      productLine: "PEMB",
      stage: "planning",
      valuation: 10_500_000,
      bidDate: null,
      architect: null,
      gc: null,
      notes: "Logistics corridor growth.",
    },
  ],
  NC: [
    {
      title: "Charlotte Metro Fulfillment Center",
      city: "Concord",
      buildingType: "warehouse",
      productLine: "PEMB",
      stage: "design",
      valuation: 42_000_000,
      bidDate: "2026-10-12",
      architect: "Triangle Design Group",
      gc: null,
      notes: "Large footprint; freight sensitive.",
    },
    {
      title: "Greensboro Manufacturing Support",
      city: "Greensboro",
      buildingType: "manufacturing",
      productLine: "PEMB",
      stage: "bidding",
      valuation: 18_400_000,
      bidDate: "2026-08-20",
      architect: "Piedmont Industrial Design",
      gc: null,
      notes: "Crane-ready PEMB.",
    },
    {
      title: "Asheville Self-Storage",
      city: "Asheville",
      buildingType: "self_storage",
      productLine: "PEMB",
      stage: "bidding",
      valuation: 6_100_000,
      bidDate: "2026-09-25",
      architect: "Mountain Storage Design",
      gc: null,
      notes: "Mountain market product.",
    },
    {
      title: "Fayetteville Ag Center",
      city: "Fayetteville",
      buildingType: "agricultural",
      productLine: "PEMB",
      stage: "planning",
      valuation: 3_800_000,
      bidDate: null,
      architect: null,
      gc: null,
      notes: "Ag dealership building.",
    },
  ],
  SC: [
    {
      title: "Upstate SC Auto Supplier Building",
      city: "Greer",
      buildingType: "industrial",
      productLine: "PEMB",
      stage: "bidding",
      valuation: 22_100_000,
      bidDate: "2026-08-28",
      architect: "Carolinas Industrial A/E",
      gc: null,
      notes: "OEM-adjacent; high structural content.",
    },
    {
      title: "Columbia Spec Warehouse",
      city: "West Columbia",
      buildingType: "warehouse",
      productLine: "PEMB",
      stage: "design",
      valuation: 16_700_000,
      bidDate: "2026-10-18",
      architect: "Midlands Design Collaborative",
      gc: null,
      notes: "I-26 logistics corridor.",
    },
    {
      title: "Spartanburg Self-Storage",
      city: "Spartanburg",
      buildingType: "self_storage",
      productLine: "PEMB",
      stage: "bidding",
      valuation: 5_900_000,
      bidDate: "2026-09-03",
      architect: null,
      gc: null,
      notes: "PEMB multi-building campus.",
    },
  ],
  FL: [
    {
      title: "Pensacola North Spec Industrial",
      city: "Pensacola",
      buildingType: "industrial",
      productLine: "PEMB",
      stage: "bidding",
      valuation: 12_600_000,
      bidDate: "2026-09-16",
      architect: "Gulf Coast Industrial",
      gc: null,
      notes: "Upper FL selective pursuit.",
    },
    {
      title: "Tallahassee Self-Storage Phase 2",
      city: "Tallahassee",
      buildingType: "self_storage",
      productLine: "PEMB",
      stage: "design",
      valuation: 7_800_000,
      bidDate: "2026-11-08",
      architect: "Florida Storage Design",
      gc: null,
      notes: "Panhandle market.",
    },
    {
      title: "Panama City Warehouse",
      city: "Panama City",
      buildingType: "warehouse",
      productLine: "PEMB",
      stage: "planning",
      valuation: 9_300_000,
      bidDate: null,
      architect: null,
      gc: null,
      notes: "Selective — freight & hurricane detailing.",
    },
  ],
  TX: [
    {
      title: "East TX Energy Services Shop",
      city: "Longview",
      buildingType: "industrial",
      productLine: "PEMB",
      stage: "planning",
      valuation: 9_400_000,
      bidDate: null,
      architect: null,
      gc: null,
      notes: "Extended territory — margin check.",
    },
    {
      title: "Tyler Spec Warehouse",
      city: "Tyler",
      buildingType: "warehouse",
      productLine: "PEMB",
      stage: "bidding",
      valuation: 14_200_000,
      bidDate: "2026-09-22",
      architect: "East Texas Industrial Design",
      gc: null,
      notes: "PEMB logistics shell.",
    },
    {
      title: "Texarkana Ag Processing Support",
      city: "Texarkana",
      buildingType: "agricultural",
      productLine: "PEMB",
      stage: "design",
      valuation: 6_700_000,
      bidDate: "2026-10-28",
      architect: "Ark-La-Tex Ag Design",
      gc: null,
      notes: "Border market ag building.",
    },
    {
      title: "Marshall Manufacturing Shop",
      city: "Marshall",
      buildingType: "manufacturing",
      productLine: "PEMB",
      stage: "bidding",
      valuation: 8_100_000,
      bidDate: "2026-08-31",
      architect: null,
      gc: null,
      notes: "Light manufacturing PEMB.",
    },
  ],
};

const CALL_LISTS: Record<string, CallContact[]> = {
  TN: [
    { name: "Elena Vasquez", role: "Architect", firm: "Southeast Industrial Architects", city: "Nashville" },
    { name: "Tom Bridger", role: "GC", firm: "Cumberland Builders", city: "Portland" },
    { name: "Priya Shah", role: "Developer", firm: "Music City Spec Partners", city: "Nashville" },
  ],
  KY: [
    { name: "James O'Neil", role: "Architect", firm: "Industrial Design Collaborative", city: "Louisville" },
    { name: "Karen Lutz", role: "GC", firm: "Bluegrass Construction", city: "Bowling Green" },
    { name: "Derek Holt", role: "Developer", firm: "Tri-State Logistics", city: "Florence" },
  ],
  AL: [
    { name: "Maria Santos", role: "Architect", firm: "Gulf Coast AEC", city: "Huntsville" },
    { name: "Chris Barlow", role: "GC", firm: "Southern Builders Inc.", city: "Huntsville" },
    { name: "Nina Ford", role: "Owner", firm: "Redstone Supply Partners", city: "Huntsville" },
  ],
  GA: [
    { name: "Alex Rivera", role: "Architect", firm: "Metro Industrial Design", city: "Atlanta" },
    { name: "Pat Coleman", role: "Developer", firm: "Piedmont Spec Developers", city: "Atlanta" },
    { name: "Lee Morgan", role: "GC", firm: "Peach State GC", city: "Marietta" },
  ],
  MS: [
    { name: "Dana Reeves", role: "Architect", firm: "North MS Design", city: "Tupelo" },
    { name: "Bill Harper", role: "GC", firm: "Magnolia Construction", city: "Jackson" },
  ],
  AR: [
    { name: "Grace Kim", role: "Architect", firm: "Ag Structures Studio", city: "Jonesboro" },
    { name: "Ray Tilley", role: "GC", firm: "Mid-South GC", city: "Jonesboro" },
    { name: "Hope Sanders", role: "Developer", firm: "Delta Logistics REIT", city: "West Memphis" },
  ],
  MO: [
    { name: "Nick Palmer", role: "Architect", firm: "Ozark Industrial A/E", city: "Cape Girardeau" },
    { name: "Susan Wu", role: "GC", firm: "Gateway Metal Builders", city: "St. Louis" },
  ],
  IL: [
    { name: "Olivia Chen", role: "Architect", firm: "Midwest Storage Design", city: "Marion" },
    { name: "Frank Dietrich", role: "Developer", firm: "Heartland Storage Partners", city: "Marion" },
    { name: "Amy Gross", role: "GC", firm: "Southern IL Builders", city: "Carbondale" },
  ],
  IN: [
    { name: "Mark Jensen", role: "Owner", firm: "Ohio Valley Metals", city: "Evansville" },
    { name: "Tina Patel", role: "Architect", firm: "Wabash Valley A/E", city: "Terre Haute" },
    { name: "Rob Yates", role: "GC", firm: "Hoosier Industrial GC", city: "Evansville" },
  ],
  OH: [
    { name: "Laura Metz", role: "Architect", firm: "Ohio Valley Design", city: "Cincinnati" },
    { name: "Steve Brandt", role: "Developer", firm: "Buckeye Spec Partners", city: "Dayton" },
  ],
  WV: [
    { name: "Paul Greene", role: "Architect", firm: "Appalachian Public Works A/E", city: "Charleston" },
    { name: "Jill Marsh", role: "GC", firm: "Mountain State Builders", city: "Huntington" },
  ],
  PA: [
    { name: "Kevin Orth", role: "Architect", firm: "Allegheny Industrial Design", city: "Pittsburgh" },
    { name: "Rachel Dunn", role: "Developer", firm: "Western PA Spec", city: "Washington" },
  ],
  VA: [
    { name: "Heather Cole", role: "Architect", firm: "Public Works Architects", city: "Roanoke" },
    { name: "Ian Brooks", role: "GC", firm: "Blue Ridge GC", city: "Lynchburg" },
    { name: "Maya Torres", role: "Developer", firm: "Commonwealth Industrial", city: "Roanoke" },
  ],
  NC: [
    { name: "Chris Lang", role: "Architect", firm: "Triangle Design Group", city: "Raleigh" },
    { name: "Angela Wu", role: "Developer", firm: "Carolina Logistics REIT", city: "Charlotte" },
    { name: "Ben Foster", role: "GC", firm: "Piedmont Builders", city: "Greensboro" },
  ],
  SC: [
    { name: "Donna Price", role: "Architect", firm: "Carolinas Industrial A/E", city: "Greenville" },
    { name: "Tyler Nash", role: "Owner", firm: "Upstate Auto Tier-2", city: "Greer" },
    { name: "Kim Rhodes", role: "GC", firm: "Palmetto Industrial GC", city: "Columbia" },
  ],
  FL: [
    { name: "Carlos Mendez", role: "Architect", firm: "Gulf Coast Industrial", city: "Pensacola" },
    { name: "Sara Knight", role: "Developer", firm: "Panhandle Spec LLC", city: "Tallahassee" },
  ],
  TX: [
    { name: "Brett Holloway", role: "Owner", firm: "East Texas Energy Services", city: "Longview" },
    { name: "Lila Monroe", role: "Architect", firm: "East Texas Industrial Design", city: "Tyler" },
    { name: "Jose Alvarez", role: "GC", firm: "Piney Woods Builders", city: "Longview" },
  ],
};

const MARKET_NOTES: Record<string, string> = {
  TN: "Home plant market. Highest density of fab + service; prioritize speed-to-package on warehouse/ag.",
  KY: "Industrial corridors + ag buildings. Florence/BG logistics competitive — lead with clear-span expertise.",
  AL: "Huntsville aerospace suppliers and auto shell work. Strong PEB buy-out windows with selected GCs.",
  GA: "Atlanta industrial + SE logistics. Competitive SE bidders; win on fab capacity and response time.",
  MS: "Agricultural and light industrial. Relationship-driven; keep estimate cycles short.",
  AR: "Westward expansion. Poultry processing support and Memphis corridor logistics.",
  MO: "SE MO / mid-MO industrial and ag. St. Louis edge pursuits are selective on freight.",
  IL: "Southern IL industrial parks + self-storage. Fast-turn product fits plant capacity.",
  IN: "Manufacturing belt metal building demand. Evansville relationship sell for TN fab.",
  OH: "Industrial rehab and distribution. Cincinnati south is strongest fit inside radius.",
  WV: "Select public and industrial. Longer public cycles; sticky GC relationships matter.",
  PA: "Western PA edge of radius. Industrial focus only — freight vs margin gate.",
  VA: "SW VA growth and public facilities. Data-center-adjacent commercial selective.",
  NC: "Charlotte / Triangle industrial corridors. Large warehouse packages; freight-sensitive.",
  SC: "Port-related and advanced manufacturing. Auto supplier buildings high structural content.",
  FL: "Panhandle & north FL only. Hurricane detailing and selective freight economics.",
  TX: "East TX industrial / energy-adjacent. Extended territory — margin and freight discipline.",
};

const VP_NOTES: Record<string, string> = {
  TN: "Protect plant-market share. Push Q3 bid calendar hard on logistics expansions.",
  KY: "Pair rep with BG component plant opportunity — strategic account.",
  AL: "Leverage Southern Builders relationship for PEB buy-outs.",
  GA: "Austell campus is marquee — VP ride-along recommended on bid day.",
  MS: "Maintain coverage; do not over-invest sales hours vs core.",
  AR: "West Memphis logistics is growth lane for FY27 pipeline.",
  MO: "Cape Girardeau is priority; St. Louis only if GC-introduced.",
  IL: "Self-storage program with Heartland — replicate template pricing.",
  IN: "Evansville fab expansion is long-cycle nurture.",
  OH: "Batavia distribution is top OH pursuit this quarter.",
  WV: "Public maintenance facility only if bid is open competitive.",
  PA: "Cap travel; remote estimate support preferred.",
  VA: "Public works path — coordinate with estimating early.",
  NC: "Charlotte fulfillment is capacity-sensitive; confirm fab slots first.",
  SC: "Greer auto supplier — high structural, strong margin potential.",
  FL: "Upper FL only; no Central/South FL pursuits.",
  TX: "Longview energy shop selective; Tyler warehouse is primary TX focus.",
};

function daysFromToday(iso: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso + "T12:00:00").getTime();
  const now = new Date("2026-08-10T12:00:00").getTime(); // aligned to report review window
  return Math.round((t - now) / (1000 * 60 * 60 * 24));
}

function buildSheet(state: TerritoryState): StateSalesSheet {
  const opps = (STATE_OPPS[state.code] ?? []).map((o, i) => ({
    ...o,
    id: `ss-${state.code.toLowerCase()}-${i + 1}`,
  }));
  const pipelineDollars = opps.reduce((s, o) => s + o.valuation, 0);
  const designBidding = opps
    .filter((o) => o.stage === "design" || o.stage === "bidding" || o.stage === "planning")
    .reduce((s, o) => s + o.valuation, 0);
  const pembOpps = opps.filter((o) => o.productLine === "PEMB");
  const pembShare =
    pipelineDollars > 0
      ? pembOpps.reduce((s, o) => s + o.valuation, 0) / pipelineDollars
      : DEFAULT_PEMB_SHARE;

  const typeCounts = new Map<string, number>();
  for (const o of opps) {
    typeCounts.set(o.buildingType, (typeCounts.get(o.buildingType) ?? 0) + 1);
  }
  const topBuildingTypes = [...typeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([t]) => t.replace(/_/g, " "));

  let bidsDue30 = 0;
  let bidsDue60 = 0;
  let bidsDue90 = 0;
  for (const o of opps) {
    const d = daysFromToday(o.bidDate);
    if (d == null || d < 0) continue;
    if (d <= 30) bidsDue30 += 1;
    if (d <= 60) bidsDue60 += 1;
    if (d <= 90) bidsDue90 += 1;
  }

  // Illustrative annual quota scaled by demand × pipeline (not booked revenue)
  const weight = (state.demand * state.pipeline) / 10000;
  const quotaTarget = Math.round(8_500_000 * weight * (state.region === "core" ? 1.35 : state.region === "primary" ? 1.0 : 0.65));

  return {
    code: state.code,
    salesperson: SALESPEOPLE[state.code] ?? "",
    marketNotes: MARKET_NOTES[state.code] ?? state.notes,
    vpNotes: VP_NOTES[state.code] ?? "",
    quotaTarget,
    activeProjects: opps.length,
    designBiddingValue: designBidding,
    topBuildingTypes,
    bidsDue30,
    bidsDue60,
    bidsDue90,
    pipelineDollars,
    pembShare,
    opportunities: opps,
    callList: CALL_LISTS[state.code] ?? [],
  };
}

export const stateSalesSheets: StateSalesSheet[] = territoryStates.map(buildSheet);

export function getSheetByCode(code: string): StateSalesSheet | undefined {
  return stateSalesSheets.find((s) => s.code === code);
}

/** Safe blank sheet so a missing code cannot crash the Sales Sheets tab. */
export function emptySalesSheet(code: string): StateSalesSheet {
  return {
    code,
    salesperson: "",
    marketNotes: "",
    vpNotes: "",
    quotaTarget: 0,
    activeProjects: 0,
    designBiddingValue: 0,
    topBuildingTypes: [],
    bidsDue30: 0,
    bidsDue60: 0,
    bidsDue90: 0,
    pipelineDollars: 0,
    pembShare: DEFAULT_PEMB_SHARE,
    opportunities: [],
    callList: [],
  };
}

export function sheetForCode(code: string): StateSalesSheet {
  return getSheetByCode(code) ?? emptySalesSheet(code);
}

export function territoryWeight(state: TerritoryState): number {
  return Math.max(state.demand, 1) * Math.max(state.pipeline, 1);
}

/** Region allocation weights (demand × pipeline). */
export function regionAllocationWeights(): Record<"core" | "primary" | "extended", number> {
  const raw = { core: 0, primary: 0, extended: 0 };
  for (const s of territoryStates) {
    raw[s.region] += territoryWeight(s);
  }
  const total = raw.core + raw.primary + raw.extended || 1;
  return {
    core: raw.core / total,
    primary: raw.primary / total,
    extended: raw.extended / total,
  };
}

/** State allocation weights (demand × pipeline), normalized. */
export function stateAllocationWeights(): Record<string, number> {
  const entries = territoryStates.map((s) => [s.code, territoryWeight(s)] as const);
  const total = entries.reduce((sum, [, w]) => sum + w, 0) || 1;
  const out: Record<string, number> = {};
  for (const [code, w] of entries) out[code] = w / total;
  return out;
}

/** Territory-wide PEMB share (valuation-weighted across sales sheets). */
export function territoryPembShare(): number {
  const total = stateSalesSheets.reduce((s, sh) => s + sh.pipelineDollars, 0);
  if (total <= 0) return DEFAULT_PEMB_SHARE;
  const pemb = stateSalesSheets.reduce((s, sh) => s + sh.pipelineDollars * sh.pembShare, 0);
  return pemb / total;
}

/** Bidding-stage pipeline $ across all state sheets (for bid-conversion model). */
export function totalBiddingPipeline(): number {
  return stateSalesSheets.reduce((sum, sh) => {
    return (
      sum +
      sh.opportunities
        .filter((o) => o.stage === "bidding" || o.stage === "design")
        .reduce((s, o) => s + o.valuation, 0)
    );
  }, 0);
}

export const PRODUCT_LINE_LABEL: Record<ProductLine, string> = {
  PEMB: "PEMB / Div 13",
  Component: "Component",
  Other: "Other",
};
