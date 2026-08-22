/**
 * City/state → county FIPS for joining Dodge rows to the MBMA radar.
 * Lookup only — never invent projects or contacts.
 */
import { COUNTIES } from "@/data/mbma";
import type { RadarStateCode } from "@/data/mbma";
import type { DodgeProject } from "@/data/dodge";

const RADAR = new Set(COUNTIES.map((c) => c.state));

/** Known cities in the demo pipeline + hunt seats. Key: "city|ST" lowercase. */
const CITY_FIPS: Record<string, string> = {
  "portland|tn": "47165",
  "nashville|tn": "47037",
  "clarksville|tn": "47125",
  "chattanooga|tn": "47065",
  "knoxville|tn": "47093",
  "bowling green|ky": "21031",
  "lexington|ky": "21067",
  "louisville|ky": "21111",
  "florence|ky": "21015",
  "huntsville|al": "01089",
  "bessemer|al": "01073",
  "birmingham|al": "01073",
  "mobile|al": "01097",
  "austell|ga": "13067",
  "marietta|ga": "13067",
  "atlanta|ga": "13121",
  "evansville|in": "18163",
  "fort wayne|in": "18003",
  "indianapolis|in": "18097",
  "columbus|oh": "39049",
  "batavia|oh": "39025",
  "cincinnati|oh": "39061",
  "dayton|oh": "39113",
  "concord|nc": "37025",
  "charlotte|nc": "37119",
  "kinston|nc": "37107",
  "raleigh|nc": "37183",
  "greer|sc": "45045",
  "greenville|sc": "45045",
  "jonesboro|ar": "05031",
  "little rock|ar": "05119",
  "roanoke|va": "51770",
  "richmond|va": "51760",
  "spotsylvania|va": "51177",
  "marion|il": "17199",
  "chicago|il": "17031",
  "springfield|mo": "29077",
  "cape girardeau|mo": "29031",
  "st louis|mo": "29510",
  "tupelo|ms": "28081",
  "southaven|ms": "28033",
  "huntington|wv": "54011",
  "martinsburg|wv": "54003",
  "point pleasant|wv": "54053",
  "greensburg|pa": "42129",
  "wilkes-barre|pa": "42079",
  "scranton|pa": "42069",
  "pensacola|fl": "12033",
  "jacksonville|fl": "12031",
  "tallahassee|fl": "12073",
  "lake charles|la": "22019",
};

const COUNTY_INDEX = new Map<string, string>();
for (const c of COUNTIES) {
  COUNTY_INDEX.set(norm(c.name) + "|" + c.state, c.fips);
  COUNTY_INDEX.set(norm(c.name.replace(/\s+city$/i, "")) + "|" + c.state, c.fips);
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .replace(/ county$/i, "")
    .trim();
}

export function lookupFips(city: string, state: string): string | null {
  const st = state.toUpperCase().slice(0, 2);
  if (!RADAR.has(st as RadarStateCode)) return null;
  const key = `${norm(city)}|${st}`;
  if (CITY_FIPS[key]) return CITY_FIPS[key];
  const byCounty = COUNTY_INDEX.get(`${norm(city)}|${st}`);
  return byCounty ?? null;
}

export function attachProjectFips<T extends DodgeProject>(p: T): T & { fips: string | null } {
  const existing = "fips" in p && typeof (p as { fips?: unknown }).fips === "string"
    ? String((p as { fips?: string }).fips)
    : null;
  const fips = existing && existing.length === 5 ? existing : lookupFips(p.city, p.state);
  return { ...p, fips };
}

export function radarProjectHasFips(p: DodgeProject & { fips: string | null }): boolean {
  return Boolean(p.fips && COUNTIES.some((c) => c.fips === p.fips));
}
