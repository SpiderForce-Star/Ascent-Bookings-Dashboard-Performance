import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e.message)));

await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle", timeout: 60000 });
try {
  await page.getByRole("button", { name: /Maybe later/i }).click({ timeout: 5000 });
} catch {
  /* ignore */
}

const labels = await page.locator("nav button").allTextContents();
const idx = (name) => labels.findIndex((t) => t.trim() === name);
if (idx("MBMA") < 0 || idx("Target-Attack") < 0 || idx("Dodge pipeline") < 0) {
  throw new Error("missing nav items: " + JSON.stringify(labels));
}
if (!(idx("MBMA") < idx("Target-Attack") && idx("Target-Attack") < idx("Dodge pipeline"))) {
  throw new Error("nav order wrong: " + JSON.stringify(labels));
}

await page.getByRole("button", { name: "Target-Attack", exact: true }).click();
await page.waitForTimeout(1500);
let body = await page.locator("body").innerText();
if (!/^Target-Attack$/m.test(body) && !body.includes("Target-Attack")) throw new Error("missing header");
if (!/600-mile radar · county hunts · Dodge access/.test(body)) throw new Error("missing subtitle");
if (!/MBMA = 2025 industry dollars/.test(body)) throw new Error("missing disclaimer");
if (!/Davidson/.test(body)) throw new Error("TN primary not Davidson");
if (!/Allen/.test(body)) throw new Error("missing Allen IN");
if (/Mecklenburg/.test(body.split("Hunting list")[0] ?? body) === false) {
  /* Mecklenburg may appear in rank table? not as VA hunt card */
}
const preList = body.split("Hunting list")[0] ?? body;
if (/VA[\s\S]{0,80}Mecklenburg/.test(preList)) throw new Error("VA hunt card is Mecklenburg");
if (!/Spotsylvania/.test(body)) throw new Error("VA primary should be Spotsylvania");

await page.screenshot({ path: "screenshots/tab-target-attack.png", fullPage: false });

await page.goto("http://127.0.0.1:8080/target-attack?fips=18003", { waitUntil: "networkidle", timeout: 60000 });
try {
  await page.getByRole("button", { name: /Maybe later/i }).click({ timeout: 4000 });
} catch {
  /* ignore */
}
await page.waitForTimeout(1200);
body = await page.locator("body").innerText();
if (!/Allen County, IN/.test(body) && !/Allen County/.test(body)) throw new Error("Allen workbench missing");
if (!/\$25\.5M/.test(body)) throw new Error("Allen MBMA $25.5M missing");
await page.screenshot({ path: "screenshots/tab-target-attack-allen.png", fullPage: false });

await page.getByRole("button", { name: "MBMA", exact: true }).click();
await page.waitForTimeout(800);
body = await page.locator("body").innerText();
if (!/Non-Agriculture Shipments — 600-mile radar/.test(body)) throw new Error("MBMA header/page broken");
if (!/Attack this county/.test(body)) throw new Error("MBMA missing Attack link");

await page.getByRole("button", { name: "Dodge pipeline", exact: true }).click();
await page.waitForTimeout(800);
body = await page.locator("body").innerText();
if (body.length < 80) throw new Error("Dodge empty");

if (errors.length) throw new Error(errors.join("; "));
console.log("ok");
await browser.close();
