#!/usr/bin/env node
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:8080/";
const outDir = "screenshots";
mkdirSync(outDir, { recursive: true });

const consoleErrors = [];
const pageErrors = [];

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

function fail(msg, extra = {}) {
  console.error(JSON.stringify({ ok: false, error: msg, consoleErrors, pageErrors, ...extra }, null, 2));
  process.exit(1);
}

try {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(`[console] ${msg.text()}`);
  });
  page.on("pageerror", (err) => pageErrors.push(`[page] ${String(err?.message || err)}`));

  const resp = await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  const status = resp?.status() ?? 0;
  if (status >= 400 || status === 0) fail("navigation failed", { status });

  await page.waitForTimeout(800);

  // Existing Performance tab still renders
  const perf = await page.locator("body").innerText();
  if (!/Bookings performance/i.test(perf)) fail("Performance tab missing heading");

  const later = page.getByRole("button", { name: /Maybe later/i });
  try {
    await later.click({ timeout: 5000 });
  } catch {
    /* dialog not shown */
  }

  const mbmaBtn = page.getByRole("button", { name: "MBMA", exact: true });
  await mbmaBtn.click({ timeout: 15000 });
  await page.waitForTimeout(1500);

  const body = await page.locator("body").innerText();
  const checks = [
    ["h1 MBMA", /(?:^|\n)MBMA(?:\n|$)/],
    ["subtitle", /Non-Agriculture Shipments — Target Territory \(2025\)/],
    ["disclaimer", /Industry-wide MBMA data\. Not Ascent bookings\. Internal use only\./],
    ["texas", /Texas/],
    ["texas ytd", /\$512,691/],
    ["florida", /\$235,554/],
    ["ohio", /\$211,442/],
    ["indiana", /\$178,702/],
    ["missouri", /\$113,687/],
    ["illinois", /\$90,615/],
    ["harris", /Harris/],
    ["footer", /Data as of: Compiled 02\/18\/2026 \(MBMA 2025 full year\)/],
    ["internal", /Internal use only/],
  ];
  const missing = checks.filter(([, re]) => !re.test(body)).map(([name]) => name);
  if (missing.length) fail("MBMA tab missing copy", { missing, snippet: body.slice(0, 1200) });

  // Map SVG should appear (or skeleton then map)
  await page.waitForSelector("svg[aria-label*='choropleth']", { timeout: 15000 });
  const paths = await page.locator("svg[aria-label*='choropleth'] path").count();
  if (paths < 100) fail("choropleth has too few counties", { paths });

  await page.screenshot({ path: `${outDir}/tab-mbma.png`, fullPage: false });

  // East Texas filter
  await page.getByRole("button", { name: "East Texas (Houston cluster)", exact: true }).click();
  await page.waitForTimeout(500);
  const eastBody = await page.locator("body").innerText();
  if (!/Harris/.test(eastBody)) fail("East Texas filter hid Harris");
  await page.screenshot({ path: `${outDir}/tab-mbma-east-texas.png`, fullPage: false });

  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await page.waitForTimeout(400);

  // Empty-ish: deselecting last state is blocked; turn on both cluster filters with Illinois only
  await page.getByRole("button", { name: "Illinois", exact: true }).click();
  await page.getByRole("button", { name: "Northern Florida", exact: true }).click();
  await page.waitForTimeout(400);
  // With IL + Northern FL, no counties should match (FL not selected? Wait, default all states still on except we only toggled IL off)
  // Toggle IL off means 5 states remain. Northern FL still has FL selected.
  // Need Illinois-only + Northern Florida for empty.
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await page.waitForTimeout(200);
  for (const name of ["Texas", "Florida", "Ohio", "Indiana", "Missouri"]) {
    await page.getByRole("button", { name, exact: true }).click();
  }
  await page.getByRole("button", { name: "Northern Florida", exact: true }).click();
  await page.waitForTimeout(500);
  const emptyBody = await page.locator("body").innerText();
  if (!/No counties match the current filters/i.test(emptyBody)) {
    fail("expected empty state for IL-only + Northern Florida", { snippet: emptyBody.slice(-800) });
  }

  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await page.waitForTimeout(300);

  // Dedicated route
  const routeResp = await page.goto("http://127.0.0.1:8080/mbma", { waitUntil: "networkidle", timeout: 60000 });
  if ((routeResp?.status() ?? 0) >= 400) fail("/mbma navigation failed", { status: routeResp?.status() });
  try {
    await page.getByRole("button", { name: /Maybe later/i }).click({ timeout: 5000 });
  } catch {
    /* dialog not shown */
  }
  await page.waitForTimeout(1200);
  const routeBody = await page.locator("body").innerText();
  if (!/Non-Agriculture Shipments — Target Territory \(2025\)/.test(routeBody)) {
    fail("/mbma did not render MBMA panel");
  }
  await page.screenshot({ path: `${outDir}/route-mbma.png`, fullPage: false });

  // Existing Territory tab still present
  await page.getByRole("button", { name: "Territory", exact: true }).click();
  await page.waitForTimeout(600);
  const terr = await page.locator("body").innerText();
  if (!/Portland, TN service footprint/i.test(terr)) fail("Territory tab broken after MBMA");

  if (pageErrors.length || consoleErrors.length) {
    fail("console/page errors", {});
  }

  console.log(
    JSON.stringify(
      { ok: true, paths, screenshots: [`${outDir}/tab-mbma.png`, `${outDir}/tab-mbma-east-texas.png`, `${outDir}/route-mbma.png`] },
      null,
      2,
    ),
  );
} catch (err) {
  fail(String(err?.message || err));
} finally {
  await browser.close();
}
