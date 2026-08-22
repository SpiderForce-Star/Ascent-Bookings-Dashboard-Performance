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
  const perf = await page.locator("body").innerText();
  if (!/Bookings performance/i.test(perf)) fail("Performance tab missing heading");

  try {
    await page.getByRole("button", { name: /Maybe later/i }).click({ timeout: 5000 });
  } catch {
    /* dialog not shown */
  }

  const mbmaBtn = page.getByRole("button", { name: "MBMA", exact: true });
  await mbmaBtn.click({ timeout: 15000 });
  await page.waitForTimeout(1500);

  const body = await page.locator("body").innerText();
  const checks = [
    ["h1", /(?:^|\n)MBMA(?:\n|$)/],
    ["subtitle", /Non-Agriculture Shipments — 600-mile radar \(2025\)/],
    ["disclaimer", /Industry-wide MBMA data\. Not Ascent bookings\. Internal use only\./],
    ["radar total", /\$1\.96B/],
    ["us share", /45\.37%/],
    ["tn", /Tennessee/],
    ["n fl", /N\. FL/],
    ["davidson", /Davidson/],
    ["footer", /Data as of: Compiled 02\/18\/2026 \(MBMA 2025 full year\)/],
  ];
  const missing = checks.filter(([, re]) => !re.test(body)).map(([name]) => name);
  if (missing.length) fail("MBMA tab missing copy", { missing, snippet: body.slice(0, 1500) });
  await page.waitForSelector("svg[aria-label*='choropleth']", { timeout: 15000 });
  const paths = await page.locator("svg[aria-label*='choropleth'] path").count();
  if (paths < 200) fail("choropleth has too few counties", { paths });

  await page.screenshot({ path: `${outDir}/tab-mbma.png`, fullPage: false });

  await page.getByRole("button", { name: /Tennessee/i }).first().click();
  await page.waitForTimeout(400);
  const tnBody = await page.locator("body").innerText();
  if (!/\$136\.4M/.test(tnBody)) fail("isolating Tennessee did not show $136.4M", { snippet: tnBody.slice(0, 800) });

  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "N. Florida / panhandle", exact: true }).click();
  await page.waitForTimeout(500);
  const flBody = await page.locator("body").innerText();
  if (!/\$55\.6M/.test(flBody)) fail("N. Florida filter missing $55.6M");
  if (!/Duval/.test(flBody)) fail("N. Florida filter missing Duval");
  if (/Miami/.test(flBody)) fail("South Florida leaked");

  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await page.waitForTimeout(200);

  const routeResp = await page.goto("http://127.0.0.1:8080/mbma", { waitUntil: "networkidle", timeout: 60000 });
  if ((routeResp?.status() ?? 0) >= 400) fail("/mbma navigation failed", { status: routeResp?.status() });
  try {
    await page.getByRole("button", { name: /Maybe later/i }).click({ timeout: 4000 });
  } catch {
    /* ignore */
  }
  await page.waitForTimeout(800);
  const routeBody = await page.locator("body").innerText();
  if (!/600-mile radar/.test(routeBody)) fail("/mbma did not render MBMA panel");

  await page.getByRole("button", { name: "Dodge pipeline", exact: true }).click();
  await page.waitForTimeout(600);
  const dodge = await page.locator("body").innerText();
  if (dodge.length < 80) fail("Dodge tab empty after MBMA");

  await page.getByRole("button", { name: "Territory", exact: true }).click();
  await page.waitForTimeout(600);
  const terr = await page.locator("body").innerText();
  if (!/Portland, TN service footprint/i.test(terr)) fail("Territory tab broken after MBMA");

  if (pageErrors.length || consoleErrors.length) fail("console/page errors");

  console.log(JSON.stringify({ ok: true, paths }, null, 2));
} catch (err) {
  fail(String(err?.message || err));
} finally {
  await browser.close();
}
