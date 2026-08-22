/**
 * MBMA Non-Agriculture Shipment types — 2025 full year.
 * ~600-mile radar from Portland, TN. Values in thousands of USD as published.
 *
 * TODO: Once internal bookings are tagged by state/county, overlay Ascent
 * volume vs MBMA industry volume.
 */

export type RadarStateCode =
  | "TN"
  | "KY"
  | "VA"
  | "NC"
  | "SC"
  | "GA"
  | "AL"
  | "MS"
  | "LA"
  | "AR"
  | "MO"
  | "IL"
  | "IN"
  | "OH"
  | "WV"
  | "PA"
  | "FL";

export type QuarterKey = "ytd" | "q1" | "q2" | "q3" | "q4";

export type RadarRegion = "radar" | "northFl";

export interface StateRecord {
  code: RadarStateCode;
  name: string;
  postal: RadarStateCode;
  shortLabel: string;
  /** Radar-adjusted YTD $000s (FL = north/panhandle only). */
  ytd: number;
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  /** Share of national MBMA non-ag YTD (percent points). FL uses north-only $. */
  pctOfNational: number;
  /** National rank by full-state YTD (FL rank 2 is full-state context). */
  rank: number;
  northOnly?: boolean;
}

export interface County {
  name: string;
  fips: string;
  state: RadarStateCode;
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  ytd: number;
  northFl?: boolean;
}

export interface CountyRow extends County {
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
