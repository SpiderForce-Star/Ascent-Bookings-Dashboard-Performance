import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });

async function dismiss(page) {
  try {
    await page.getByRole("button", { name: /Maybe later/i }).click({ timeout: 4000 });
  } catch {
    /* ignore */
  }
}

const errors = [];
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on("pageerror", (e) => errors.push(String(e.message)));

await page.goto("http://127.0.0.1:8080/target-attack", { waitUntil: "networkidle", timeout: 60000 });
await dismiss(page);
await page.waitForTimeout(1200);

const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
if (overflow) throw new Error("horizontal overflow on 390");

const body = await page.locator("body").innerText();
if (!/Target-Attack/.test(body)) throw new Error("missing header");
if (!/Davidson/.test(body)) throw new Error("TN primary not visible");
if (!/why this hunt/i.test(body)) throw new Error("workbench not on default view");
if (!/access path/i.test(body)) throw new Error("access path missing");
if (!/owner/i.test(body) || !/architect/i.test(body)) throw new Error("contact cards missing");
const y = await page.locator("text=Rank migration").boundingBox();
const why = await page.getByText(/why this hunt/i).first().boundingBox();
if (y && why && y.y < why.y) throw new Error("rank table is above workbench");

await page.screenshot({ path: "screenshots/ta-mobile-workbench.png", fullPage: false });

await page.getByRole("button", { name: "Map", exact: true }).click();
await page.waitForTimeout(600);
await page.screenshot({ path: "screenshots/ta-mobile-map.png", fullPage: false });

await page.locator("#hunt-chip-18003").click();
await page.waitForTimeout(500);
let t = await page.locator("body").innerText();
if (!/Allen County/.test(t)) throw new Error("chip did not open Allen workbench");
if (!/why this hunt/i.test(t)) throw new Error("chip switched away from workbench");

const desk = await browser.newPage({ viewport: { width: 1400, height: 900 } });
await desk.goto("http://127.0.0.1:8080/target-attack?fips=18003", { waitUntil: "networkidle", timeout: 60000 });
await dismiss(desk);
await desk.waitForTimeout(1000);
t = await desk.locator("body").innerText();
if (!/Allen County, IN/.test(t)) throw new Error("fips=18003 did not open Allen");
if (!/\$25\.5M/.test(t)) throw new Error("Allen $25.5M missing");
if (!/Indiana/.test(t)) throw new Error("Indiana-fitted map kicker missing");

await desk.goto("http://127.0.0.1:8080/target-attack?fips=01003", { waitUntil: "networkidle", timeout: 60000 });
await dismiss(desk);
await desk.waitForTimeout(800);
t = await desk.locator("body").innerText();
if (!/Baldwin County, AL/.test(t) && !/Baldwin County/.test(t)) throw new Error("fips=01003 lost Baldwin");

const labels = await desk.locator("nav[aria-label='Dashboard sections'] button").allTextContents();
const idx = (n) => labels.findIndex((x) => x.trim() === n);
if (!(idx("MBMA") < idx("Target-Attack") && idx("Target-Attack") < idx("Dodge pipeline"))) {
  throw new Error("nav order " + JSON.stringify(labels));
}

if (errors.length) throw new Error(errors.join("; "));
console.log("ok");
await browser.close();
