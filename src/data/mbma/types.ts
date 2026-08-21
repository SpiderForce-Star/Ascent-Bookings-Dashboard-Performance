/**
 * MBMA Non-Agriculture Shipment types — 2025 full year, focus territory only.
 * Values are industry shipment dollars in thousands (000s USD).
 *
 * TODO: Once internal bookings are tagged by state/county, add a comparison
 * layer (Ascent volume vs MBMA industry volume).
 */

export type FocusStateCode = "TX" | "FL" | "OH" | "IN" | "MO" | "IL";

export type QuarterKey = "ytd" | "q1" | "q2" | "q3" | "q4";

export interface StateSummary {
  code: FocusStateCode;
  name: string;
  /** YTD shipment $ in thousands */
  ytd: number;
  /** Share of national MBMA non-ag YTD (percent points, e.g. 11.84) */
  pctOfNational: number;
  /** National rank by YTD $ */
  rank: number;
  q1: number;
  q2: number;
  q3: number;
  q4: number;
}

export interface CountyShipment {
  fips: string;
  name: string;
  state: FocusStateCode;
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  ytd: number;
}

export interface CountyRow extends CountyShipment {
  rank: number;
  pctOfState: number;
  metricValue: number;
}

export interface MbmaGeoFeature {
  fips: string;
  d: string;
}

export interface MbmaGeo {
  viewBox: string;
  width: number;
  height: number;
  features: MbmaGeoFeature[];
}
