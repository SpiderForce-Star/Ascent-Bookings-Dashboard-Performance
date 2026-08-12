#!/usr/bin/env node
/**
 * Generate PWA icon set from the official Ascent Money Icon.
 * Source (first found):
 *   public/ascent-money-icon-source.jpg
 *   public/ascent-money-icon.png
 *
 * Outputs under public/icons/ + public/favicon.ico + public/ascent-money-icon.png
 */
import sharp from "sharp";
import pngToIco from "png-to-ico";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const candidates = ["public/ascent-money-icon-source.jpg", "public/ascent-money-icon.png"];
const src = candidates.find((p) => existsSync(p));
if (!src) {
  console.error("No source icon found. Place Ascent Money Icon at public/ascent-money-icon-source.jpg");
  process.exit(1);
}

const outDir = "public/icons";
mkdirSync(outDir, { recursive: true });
const BG = { r: 244, g: 242, b: 239, alpha: 1 };

async function squareContain(size, padRatio = 0) {
  const pad = Math.round(size * padRatio);
  const inner = size - pad * 2;
  const resized = await sharp(src)
    .rotate()
    .resize(inner, inner, { fit: "contain", background: BG })
    .png()
    .toBuffer();
  return sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .composite([{ input: resized, left: pad, top: pad }])
    .png()
    .toBuffer();
}

const masterPng = await sharp(src)
  .rotate()
  .resize(1024, 1024, { fit: "contain", background: BG })
  .png({ compressionLevel: 9 })
  .toBuffer();
writeFileSync("public/ascent-money-icon.png", masterPng);

const icon192 = await squareContain(192, 0.04);
const icon512 = await squareContain(512, 0.04);
const icon512m = await squareContain(512, 0.12);
const apple = await squareContain(180, 0.05);
const fav32 = await squareContain(32, 0.02);
const fav16 = await squareContain(16, 0.02);
const fav48 = await squareContain(48, 0.02);

writeFileSync(join(outDir, "icon-192.png"), icon192);
writeFileSync(join(outDir, "icon-512.png"), icon512);
writeFileSync(join(outDir, "icon-512-maskable.png"), icon512m);
writeFileSync(join(outDir, "apple-touch-icon.png"), apple);
writeFileSync(join(outDir, "favicon-32.png"), fav32);
writeFileSync(join(outDir, "favicon-16.png"), fav16);

const ico = await pngToIco([fav16, fav32, fav48]);
writeFileSync("public/favicon.ico", ico);
writeFileSync(join(outDir, "favicon.ico"), ico);

console.log("PWA icons generated from", src);
