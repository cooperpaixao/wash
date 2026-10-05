// Regenerates assets/img/og.jpg, the link preview image people see when the
// site is shared in a text, on Facebook and so on. The design lives in
// tools/share-card.html (hero photo, tint, logo, address and hours).
// Pass --icon to also redo apple-touch-icon.png from tools/icon.html.
//
// Usage, from the project folder:
//   npx http-server -p 8080 . &      (or any static server on port 8080)
//   npx -y playwright@1 install chromium
//   node tools/render-share-images.mjs
//   python3 tools/stamp-assets.py    (so apps fetch the new image, not a cached one)
import { chromium } from "playwright";

const base = process.env.BASE_URL || "http://127.0.0.1:8080";
const browser = await chromium.launch();

const card = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await card.goto(`${base}/tools/share-card.html`, { waitUntil: "networkidle" });
await card.evaluate(() => document.fonts.ready);
await card.screenshot({ path: "assets/img/og.jpg", type: "jpeg", quality: 85 });
console.log("Wrote assets/img/og.jpg");

if (process.argv.includes("--icon")) {
  const icon = await browser.newPage({ viewport: { width: 180, height: 180 } });
  await icon.goto(`${base}/tools/icon.html`, { waitUntil: "networkidle" });
  await icon.screenshot({ path: "apple-touch-icon.png" });
  console.log("Wrote apple-touch-icon.png");
}

await browser.close();
