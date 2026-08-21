/**
 * Data-integrity tests for the static 2025 MBMA focus-territory dataset.
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

const ALLOWED = new Set(["TX", "FL", "OH", "IN", "MO", "IL"]);
const STATE_YTD = {
  TX: 512691,
  FL: 235554,
  OH: 211442,
  IN: 178702,
  MO: 113687,
  IL: 90615,
};
const CHECKPOINTS = [
  ["48201", "Harris", "TX", 74739],
  ["18003", "Allen", "IN", 25517],
  ["29077", "Greene", "MO", 22806],
  ["39049", "Franklin", "OH", 20297],
  ["39113", "Montgomery", "OH", 17971],
  ["18097", "Marion", "IN", 17451],
  ["18039", "Elkhart", "IN", 15418],
  ["17031", "Cook", "IL", 15290],
  ["48291", "Liberty", "TX", 14883],
  ["48473", "Waller", "TX", 13601],
  ["48339", "Montgomery", "TX", 13358],
  ["12031", "Duval", "FL", 7395],
];

describe("MBMA 2025 focus-territory dataset", () => {
  const counties = countiesBundle.counties;

  it("is scoped to the six leadership states only", () => {
    const states = new Set(counties.map((c) => c.state));
    assert.deepEqual([...states].sort(), [...ALLOWED].sort());
    for (const c of counties) {
      assert.ok(ALLOWED.has(c.state), `unexpected state ${c.state}`);
      assert.equal(c.q1 + c.q2 + c.q3 + c.q4, c.ytd, `${c.fips} quarters != YTD`);
    }
  });

  it("has a county for every FIPS in the choropleth", () => {
    assert.equal(counties.length, 718);
    assert.equal(geo.features.length, 718);
    const cf = new Set(counties.map((c) => c.fips));
    const gf = new Set(geo.features.map((f) => f.fips));
    assert.equal(cf.size, 718);
    assert.deepEqual([...cf].sort(), [...gf].sort());
  });

  it("matches official 2025 state YTD totals", () => {
    const sums = Object.fromEntries([...ALLOWED].map((s) => [s, 0]));
    for (const c of counties) sums[c.state] += c.ytd;
    assert.deepEqual(sums, STATE_YTD);
    const focus = Object.values(STATE_YTD).reduce((a, b) => a + b, 0);
    assert.equal(focus, 1_342_691);
  });

  it("includes the specified high-value counties at exact YTD", () => {
    const byFips = Object.fromEntries(counties.map((c) => [c.fips, c]));
    for (const [fips, name, state, ytd] of CHECKPOINTS) {
      const row = byFips[fips];
      assert.ok(row, `missing ${name} ${state} (${fips})`);
      assert.equal(row.name, name);
      assert.equal(row.state, state);
      assert.equal(row.ytd, ytd);
    }
  });

  it("keeps Harris as the top county by YTD", () => {
    const top = [...counties].sort((a, b) => b.ytd - a.ytd)[0];
    assert.equal(top.fips, "48201");
    assert.equal(top.ytd, 74739);
  });
});
