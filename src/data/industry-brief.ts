/**
 * Industry desk headlines for the Corporate summary tab.
 * External RSS / optional news API — never claimed as MBMA shipment stats.
 */

export interface IndustryHeadline {
  id: string;
  title: string;
  source: string;
  publishedAt: string;
  url: string;
}

export interface IndustryAssociation {
  name: string;
  url: string;
  note: string;
}

export interface IndustryBriefResponse {
  fetchedAt: string;
  mode: "live" | "rss" | "fallback";
  message: string;
  headlines: IndustryHeadline[];
  associations: IndustryAssociation[];
}

export const INDUSTRY_ASSOCIATIONS: IndustryAssociation[] = [
  {
    name: "MBMA",
    url: "https://www.mbma.com",
    note: "Metal Building Manufacturers Association. Statistics portal is member-only; not connected to this dashboard.",
  },
  {
    name: "Metal Construction News",
    url: "https://www.metalconstructionnews.com",
    note: "Industry trade coverage for metal construction systems.",
  },
];

export function fallbackIndustryBrief(message?: string): IndustryBriefResponse {
  return {
    fetchedAt: new Date().toISOString(),
    mode: "fallback",
    message:
      message ??
      "Public RSS unavailable. Use association links below. MBMA statistics portal is member-only; not connected to this dashboard.",
    headlines: [],
    associations: INDUSTRY_ASSOCIATIONS,
  };
}
