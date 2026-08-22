import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const counties = JSON.parse(readFileSync(join(dir, "mbma/counties.json"), "utf8")).counties;

function flags(c, stateYtd) {
  const qs = [c.q1, c.q2, c.q3, c.q4];
  const active = qs.filter((q) => q > 0).length;
  const peak = c.ytd > 0 ? Math.max(...qs) / c.ytd : 0;
  const out = [];
  if (c.ytd <= 0) out.push("empty");
  else if (active === 1 || peak >= 0.55) out.push("spike");
  else if (active >= 3) out.push("repeatable");
  if ((stateYtd > 0 && c.ytd / stateYtd >= 0.2) || c.fips === "51117" || c.fips === "54053") {
    out.push("concentrated");
  }
  return out;
}

describe("Target-Attack hunt seeds", () => {
  const vaYtd = counties.filter((c) => c.state === "VA").reduce((s, c) => s + c.ytd, 0);
  const wvYtd = counties.filter((c) => c.state === "WV").reduce((s, c) => s + c.ytd, 0);

  it("concentrates Mecklenburg VA and Mason WV", () => {
    const meck = counties.find((c) => c.fips === "51117");
    const mason = counties.find((c) => c.fips === "54053");
    assert.ok(flags(meck, vaYtd).includes("concentrated"));
    assert.ok(flags(mason, wvYtd).includes("concentrated"));
  });

  it("keeps Davidson TN and Allen IN as repeatable hunts", () => {
    const tn = counties.find((c) => c.fips === "47037");
    const allen = counties.find((c) => c.fips === "18003");
    const sumner = counties.find((c) => c.fips === "47165");
    const tnYtd = counties.filter((c) => c.state === "TN").reduce((s, c) => s + c.ytd, 0);
    const inYtd = counties.filter((c) => c.state === "IN").reduce((s, c) => s + c.ytd, 0);
    assert.equal(tn.ytd, 11778);
    assert.ok(flags(tn, tnYtd).includes("repeatable"));
    assert.equal(allen.ytd, 25517);
    assert.ok(flags(allen, inYtd).includes("repeatable"));
    assert.ok(sumner.ytd < tn.ytd);
  });

  it("does not treat Hanover as Repeatable (spike)", () => {
    const han = counties.find((c) => c.fips === "51085");
    assert.ok(flags(han, vaYtd).includes("spike"));
  });
});
