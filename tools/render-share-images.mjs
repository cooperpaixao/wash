// Regenerates assets/img/og.jpg (link preview image) and assets/img/apple-touch-icon.png
// after the brand colours change.
//
// Usage, from the project folder:
//   npx http-server -p 8080 . &      (or any static server on port 8080)
//   npx -y playwright@1 install chromium
//   node tools/render-share-images.mjs
import { chromium } from "playwright";

const base = process.env.BASE_URL || "http://127.0.0.1:8080";
const browser = await chromium.launch();

const card = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await card.goto(`${base}/tools/share-card.html`, { waitUntil: "networkidle" });
await card.evaluate(() => document.fonts.ready);
await card.screenshot({ path: "assets/img/og.jpg", type: "jpeg", quality: 85 });

const icon = await browser.newPage({ viewport: { width: 180, height: 180 } });
await icon.goto(`${base}/assets/img/favicon.svg`);
await icon.screenshot({ path: "assets/img/apple-touch-icon.png" });

await browser.close();
console.log("Wrote assets/img/og.jpg and assets/img/apple-touch-icon.png");
