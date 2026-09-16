/* Measure the real height of every deferred block (data-cv) on the built v5
 * page, at each sample width, and write tools/v5-heights.json for v5build.mjs.
 *
 *   python prodserve.py 8897            # the built page, production headers
 *   node tools/v5heights.mjs            # writes tools/v5-heights.json
 *   node tools/v5build.mjs              # bakes the heights into v5/index.html
 *
 * Options: --url <page>  (default http://127.0.0.1:8897/v5/)
 *
 * HOW. The page is scrolled to the bottom in steps so that every block is
 * rendered once; a block keeps its last rendered height afterwards (that is
 * what the `auto` in contain-intrinsic-size:auto does), so the heights read
 * back at the top are the real ones. A block that never rendered - the sweep
 * did not reach it - is reported and left out rather than written down at its
 * placeholder size.
 *
 * The heights depend on the content, so this runs again after any change to
 * the copy or the layout. The skill's cv-audit.mjs reports drift ("Seitenhöhe
 * ändert sich beim Scrollen") when the numbers have gone stale; the generic
 * variant of this measurement is the skill's cv-heights.mjs.
 */
import fs from "node:fs";
import { chromium } from "playwright-core";
import { findChrome } from "./browser.mjs";
import { HEIGHTS_FILE, MOBILE_BELOW, WIDTHS, cvKey } from "./v5cv.mjs";

const argv = process.argv.slice(2);
const urlAt = argv.indexOf("--url");
const URL = urlAt >= 0 ? argv[urlAt + 1] : process.env.MCD_V5_URL || "http://127.0.0.1:8897/v5/";

/* Runs before any page script: remembers which blocks the browser rendered. */
const INIT = `document.addEventListener("contentvisibilityautostatechange", function (e) {
  if (!e.skipped && e.target && e.target.nodeType === 1) e.target.__cvSeen = true;
}, true);`;

/* CONTENT height, not the border box: contain-intrinsic-size describes the size
 * of the content box, and the block's own padding is added on top of it by the
 * layout. Measured with the border box, every padded section started exactly
 * its vertical padding too tall (72 px each on the phone, 16.9.2026). */
const READ = `() => Array.from(document.querySelectorAll("[data-cv]")).map((el, i) => {
  const cs = getComputedStyle(el);
  const pad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
  return {
    index: i + 1,
    id: el.id || "",
    label: el.getAttribute("data-screen-label") || "",
    height: Math.round(el.clientHeight - pad),
    seen: !!el.__cvSeen,
  };
})`;

async function measure(browser, width) {
  const mobile = width < MOBILE_BELOW;
  const height = mobile ? Math.round(width * 2.22) : Math.min(940, Math.round(width * 0.7));
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: mobile ? 1.75 : 1,
    isMobile: mobile,
    hasTouch: mobile,
  });
  const page = await context.newPage();
  await page.addInitScript(INIT);
  await page.goto(URL, { waitUntil: "load" });
  await page.waitForTimeout(500);
  const start = await page.evaluate(`(${READ})()`);
  const step = Math.max(200, Math.round(height * 0.6));
  for (let y = 0; ; y += step) {
    await page.evaluate((py) => window.scrollTo(0, py), y);
    await page.waitForTimeout(160);
    const max = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
    if (y >= max) break;
  }
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(500);
  /* The sweep can miss a block whose top never crossed the render margin - the
   * last one at some widths. Bring each unseen block into view on its own. */
  for (let round = 0; round < 3; round++) {
    const missing = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll("[data-cv]").forEach((el, i) => { if (!el.__cvSeen) out.push(i); });
      return out;
    });
    if (!missing.length) break;
    for (const i of missing) {
      await page.evaluate((idx) => document.querySelectorAll("[data-cv]")[idx].scrollIntoView({ block: "center" }), i);
      await page.waitForTimeout(300);
    }
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  const end = await page.evaluate(`(${READ})()`);
  await context.close();
  return end.map((b, i) => ({ key: cvKey(b, b.index), placeholder: start[i] ? start[i].height : null, height: b.height, seen: b.seen, width, mobile }));
}

const executablePath = findChrome();
if (!executablePath) {
  console.error("no chromium under the ms-playwright cache - npx playwright install chromium, or MCD_CHROME=<binary>");
  process.exit(2);
}
try {
  const r = await fetch(URL);
  if (!r.ok) throw new Error("HTTP " + r.status);
} catch (e) {
  console.error(`v5heights: ${URL} does not answer (${e.message}) - start: python prodserve.py 8897`);
  process.exit(2);
}

const browser = await chromium.launch({ executablePath, headless: true });
const blocks = {};
const unseen = [];
for (const width of WIDTHS) {
  const rows = await measure(browser, width);
  console.log(`\n=== ${width}px (${rows[0] && rows[0].mobile ? "phone" : "desktop"})`);
  console.log(`${"key".padEnd(22)} ${"placeholder".padStart(11)} ${"real".padStart(6)} ${"delta".padStart(6)}`);
  for (const b of rows) {
    if (!b.seen) {
      unseen.push(`${b.key}@${width}`);
      console.log(`${b.key.padEnd(22)} ${String(b.placeholder).padStart(11)} ${"-".padStart(6)} ${"-".padStart(6)}  never rendered in the sweep - not written`);
      continue;
    }
    blocks[b.key] = blocks[b.key] || {};
    blocks[b.key][String(width)] = b.height;
    console.log(`${b.key.padEnd(22)} ${String(b.placeholder).padStart(11)} ${String(b.height).padStart(6)} ${String(b.height - b.placeholder).padStart(6)}`);
  }
}
await browser.close();

const out = { generated: new Date().toISOString(), url: URL, widths: WIDTHS, mobileBelow: MOBILE_BELOW, blocks };
fs.writeFileSync(HEIGHTS_FILE, JSON.stringify(out, null, 2) + "\n", "utf8");
console.log(`\nwrote ${HEIGHTS_FILE}: ${Object.keys(blocks).length} blocks x ${WIDTHS.length} widths`);
if (unseen.length) { console.log(`not rendered even after scrollIntoView (kept out; the build uses the next smaller width there): ${unseen.join(", ")}`); process.exitCode = 1; }
console.log("next: node tools/v5build.mjs");
