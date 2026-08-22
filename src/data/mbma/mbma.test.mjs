/**
 * Data-integrity tests for the static 2025 MBMA 600-mile radar dataset.
 * Run: npm test
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const countiesBundle = JSON.parse(readFileSync(join(dir, "counties.json"), "utf8"));
const geo = JSON.parse(readFileSync(join(dir, "geo.json"), "utf8"));

const ALLOWED = new Set([
  "TN",
  "KY",
  "VA",
  "NC",
  "SC",
  "GA",
  "AL",
  "MS",
  "LA",
  "AR",
  "MO",
  "IL",
  "IN",
  "OH",
  "WV",
  "PA",
  "FL",
]);
const STATE_YTD = {
  TN: 136425,
  KY: 100133,
  VA: 105144,
  NC: 188698,
  SC: 96410,
  GA: 175220,
  AL: 134606,
  MS: 70850,
  LA: 61099,
  AR: 80255,
  MO: 113687,
  IL: 90615,
  IN: 178702,
  OH: 211442,
  WV: 26468,
  PA: 139464,
  FL: 55629,
};
const CHECKPOINTS = [
  ["51117", "Mecklenburg", "VA", 30659],
  ["18003", "Allen", "IN", 25517],
  ["29077", "Greene", "MO", 22806],
  ["42079", "Luzerne", "PA", 22381],
  ["37107", "Lenoir", "NC", 21965],
  ["01003", "Baldwin", "AL", 20546],
  ["39049", "Franklin", "OH", 20297],
  ["39113", "Montgomery", "OH", 17971],
  ["18097", "Marion", "IN", 17451],
  ["18039", "Elkhart", "IN", 15418],
  ["17031", "Cook", "IL", 15290],
  ["47037", "Davidson", "TN", 11778],
  ["12031", "Duval", "FL", 7395],
];
const BANNED_FL = new Set(["12086", "12011", "12099", "12057"]);
const NATIONAL = 4_330_829;

describe("MBMA 2025 600-mile radar dataset", () => {
  const counties = countiesBundle.counties;

  it("is scoped to the 17-state radar and never includes Texas or South Florida", () => {
    const states = new Set(counties.map((c) => c.state));
    assert.deepEqual([...states].sort(), [...ALLOWED].sort());
    assert.equal(states.has("TX"), false);
    for (const c of counties) {
      assert.ok(ALLOWED.has(c.state), `unexpected state ${c.state}`);
      assert.equal(c.q1 + c.q2 + c.q3 + c.q4, c.ytd, `${c.fips} quarters != YTD`);
      assert.equal(BANNED_FL.has(c.fips), false, `south FL leaked ${c.fips}`);
    }
  });

  it("keeps Florida to 36 north/panhandle counties totaling $55,629", () => {
    const fl = counties.filter((c) => c.state === "FL");
    assert.equal(fl.length, 36);
    assert.equal(
      fl.every((c) => c.northFl === true),
      true,
    );
    assert.equal(
      fl.reduce((s, c) => s + c.ytd, 0),
      55629,
    );
    assert.ok(fl.some((c) => c.name === "Duval" && c.ytd === 7395));
    assert.equal(
      fl.some((c) => /Miami|Broward|Palm Beach|Hillsborough/i.test(c.name)),
      false,
    );
  });

  it("matches official radar state YTD totals and $1.96B combined", () => {
    const sums = Object.fromEntries([...ALLOWED].map((s) => [s, 0]));
    for (const c of counties) sums[c.state] += c.ytd;
    assert.deepEqual(sums, STATE_YTD);
    const radar = Object.values(STATE_YTD).reduce((a, b) => a + b, 0);
    assert.equal(radar, 1_964_847);
    const pct = Math.round((radar / NATIONAL) * 10000) / 100;
    assert.equal(pct, 45.37);
  });

  it("includes specified high-volume counties at exact YTD", () => {
    const byFips = Object.fromEntries(counties.map((c) => [c.fips, c]));
    for (const [fips, name, state, ytd] of CHECKPOINTS) {
      const row = byFips[fips];
      assert.ok(row, `missing ${name} ${state} (${fips})`);
      assert.equal(row.name, name);
      assert.equal(row.state, state);
      assert.equal(row.ytd, ytd);
    }
  });

  it("pins Davidson County, TN as the default FIPS and keeps geo coverage", () => {
    const d = counties.find((c) => c.fips === "47037");
    assert.ok(d);
    assert.equal(d.name, "Davidson");
    assert.equal(d.state, "TN");
    const cf = new Set(counties.map((c) => c.fips));
    const gf = new Set(geo.features.map((f) => f.fips));
    assert.ok(gf.has("47037"));
    assert.ok(gf.size >= cf.size - 2);
    assert.equal(cf.has("48201"), false);
  });
});
