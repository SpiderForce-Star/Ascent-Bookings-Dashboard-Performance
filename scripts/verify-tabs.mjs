#!/usr/bin/env node
/**
 * Click through all dashboard tabs and report console errors.
 */
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:8080/";
const outDir = "screenshots";
mkdirSync(outDir, { recursive: true });

const tabs = [
  "Performance",
  "MBSD",
  "Shipments",
  "Market feeds",
  "MBMA",
  "Dodge pipeline",
  "Sales forecast",
  "Territory",
  "Sales sheets",
  "Steel cost",
];

const consoleErrors = [];
const pageErrors = [];
const results = [];

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

try {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(`[console] ${msg.text()}`);
  });
  page.on("pageerror", (err) => pageErrors.push(`[page] ${String(err?.message || err)}`));

  const resp = await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  const status = resp?.status() ?? 0;
  if (status >= 400 || status === 0) {
    console.error(JSON.stringify({ ok: false, status, error: "navigation failed" }, null, 2));
    process.exit(1);
  }

  await page.waitForTimeout(1500);

  for (const label of tabs) {
    const beforeErr = consoleErrors.length + pageErrors.length;
    const btn = page.getByRole("button", { name: label, exact: true });
    await btn.click();
    await page.waitForTimeout(1200);
    const body = (await page.locator("body").innerText()).trim();
    const afterErr = consoleErrors.length + pageErrors.length;
    const shot = `${outDir}/tab-${label.toLowerCase().replace(/\s+/g, "-")}.png`;
    await page.screenshot({ path: shot, fullPage: false });
    results.push({
      tab: label,
      bodyLen: body.length,
      newErrors: afterErr - beforeErr,
      hasHeading: body.length > 100,
      screenshot: shot,
    });
  }

  // Open a state sheet
  await page.getByRole("button", { name: "Sales sheets", exact: true }).click();
  await page.waitForTimeout(800);
  const stateCard = page.getByRole("button", { name: /Tennessee/i }).first();
  if (await stateCard.count()) {
    await stateCard.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${outDir}/sales-sheet-tn.png`, fullPage: false });
    results.push({ tab: "Sales sheets · TN detail", bodyLen: (await page.locator("body").innerText()).length });
  }

  // Forecast toggles
  await page.getByRole("button", { name: "Forecast", exact: true }).click();
  await page.waitForTimeout(600);
  const pembBtn = page.getByRole("button", { name: /PEMB-only forecast/i });
  if (await pembBtn.count()) {
    await pembBtn.click();
    await page.waitForTimeout(500);
  }
  const regionBtn = page.getByRole("button", { name: "region", exact: true });
  if (await regionBtn.count()) {
    await regionBtn.click();
    await page.waitForTimeout(800);
  }
  await page.screenshot({ path: `${outDir}/forecast-options.png`, fullPage: false });

  const out = {
    ok: pageErrors.length === 0 && consoleErrors.length === 0,
    status,
    title: await page.title(),
    results,
    consoleErrors,
    pageErrors,
  };
  console.log(JSON.stringify(out, null, 2));
  process.exit(out.ok ? 0 : 2);
} catch (err) {
  console.error(JSON.stringify({ ok: false, error: String(err?.message || err) }, null, 2));
  process.exit(1);
} finally {
  await browser.close();
}
