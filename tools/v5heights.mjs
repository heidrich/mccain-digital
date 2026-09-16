/* Measure the real height of every deferred block (data-cv) on every built v5
 * page, at each sample width, and write tools/v5-heights.json for v5build.mjs.
 *
 *   python3 prodserve.py 8897           # the built pages, production headers
 *   node tools/v5heights.mjs            # measures every route that is built, merges into tools/v5-heights.json
 *   node tools/v5heights.mjs --route /kontakt/ --route /preise/   # only these routes
 *   node tools/v5build.mjs              # bakes the heights into v5/<route>/index.html
 *
 * Options:
 *   --base <url>     where the v5 build is served, default http://127.0.0.1:8897
 *                     (env MCD_V5_BASE). The page measured is <base>/v5<route>.
 *   --route <route>  repeatable; measure only these routes (must be a route in
 *                     tools/pages.mjs) instead of every route in that table.
 * The old --url flag (one page, always the start page) is gone now that this
 * measures every route from tools/pages.mjs - pass --base and/or --route.
 *
 * WHICH ROUTES GET MEASURED. tools/v5build.mjs is being generalised from the
 * start page to all 21 routes, one at a time
 * (docs/plans/2026-09-17-v5-alle-seiten-design.md) - so at any point during
 * that work most routes do not exist under <base>/v5<route> yet. A route whose
 * page does not answer HTTP 200 is not a failure, it is simply not built yet:
 * it is left out of the measurement and named once at the end ("not built
 * yet: ..."), same as every other route that was not asked for via --route.
 *
 * HOW. The page is scrolled to the bottom in steps so that every block is
 * rendered once; a block keeps its last rendered height afterwards (that is
 * what the `auto` in contain-intrinsic-size:auto does), so the heights read
 * back at the top are the real ones. A block that never rendered - the sweep
 * did not reach it - is reported and left out rather than written down at its
 * placeholder size. One browser drives every route; each width still gets its
 * own context (viewport and, below MOBILE_BELOW, the phone emulation cannot
 * change on a live context).
 *
 * MERGE. tools/v5-heights.json holds one entry per route
 * (pages[route][key][width]), not just whatever this run measured: the
 * existing file is read first, the routes measured this run replace their own
 * entry, every other route's entry is kept exactly as it was, and `generated`
 * moves to now regardless. WIDTHS (from v5cv.mjs) is the source of truth for
 * which widths a fresh measurement samples; a route measured this run always
 * gets the current WIDTHS. If the existing file was written at different
 * widths, the routes this run did NOT measure still carry those old widths -
 * reported as a warning (stale, not silently treated as comparable), so the
 * next full run is the thing that actually fixes them.
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
import { PAGES } from "./pages.mjs";

const argv = process.argv.slice(2);
function flag(name) {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : undefined;
}
function flagAll(name) {
  const out = [];
  for (let i = 0; i < argv.length; i++) if (argv[i] === name) out.push(argv[i + 1]);
  return out;
}
const BASE = (flag("--base") || process.env.MCD_V5_BASE || "http://127.0.0.1:8897").replace(/\/+$/, "");
const requestedRoutes = flagAll("--route");

const allRoutes = PAGES.map((p) => p.route);
const badRoutes = requestedRoutes.filter((r) => !allRoutes.includes(r));
if (badRoutes.length) {
  console.error(`v5heights: not a route in tools/pages.mjs: ${badRoutes.join(", ")}`);
  process.exit(2);
}
const candidateRoutes = requestedRoutes.length ? requestedRoutes : allRoutes;

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

async function measure(browser, url, width) {
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
  await page.goto(url, { waitUntil: "load" });
  /* The fonts first: a block measured in the fallback face is a few pixels off
   * in the real one (seen 17.9.2026 as 95 px of drift on the phone after a run
   * on a busy machine, where the swap came late). */
  await page.evaluate(() => (document.fonts && document.fonts.ready) || null);
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
/* A route 404ing while the build is only partway through docs/plans/2026-09-17
 * is expected (see header). The server itself not answering at all is not -
 * that is checked once, against the repository root rather than any one v5
 * route, so it does not depend on which routes happen to be built yet. */
try {
  const r = await fetch(BASE + "/");
  if (!r.ok) throw new Error("HTTP " + r.status);
} catch (e) {
  console.error(`v5heights: ${BASE} does not answer (${e.message}) - start: python3 prodserve.py 8897`);
  process.exit(2);
}

async function isBuilt(route) {
  try {
    const r = await fetch(`${BASE}/v5${route}`, { method: "HEAD" });
    return r.status === 200;
  } catch {
    return false;
  }
}

const browser = await chromium.launch({ executablePath, headless: true });
const notBuilt = [];
const measuredRoutes = [];
for (const route of candidateRoutes) {
  const url = `${BASE}/v5${route}`;
  if (!(await isBuilt(route))) { notBuilt.push(route); continue; }
  console.log(`\n## ${route}  (${url})`);
  const blocks = {};
  const unseen = [];
  for (const width of WIDTHS) {
    const rows = await measure(browser, url, width);
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
  measuredRoutes.push({ route, blocks, unseen });
}
await browser.close();

/* Read what is already on disk before overwriting it. The old flat layout
 * (one page, keyed straight by block - what this file wrote before this
 * script learned about more than one route) only ever described the start
 * page, so it folds into pages["/"] rather than being discarded outright. */
let existingWidths = WIDTHS;
let existingPages = {};
if (fs.existsSync(HEIGHTS_FILE)) {
  try {
    const prev = JSON.parse(fs.readFileSync(HEIGHTS_FILE, "utf8"));
    if (Array.isArray(prev.widths)) existingWidths = prev.widths;
    if (prev.pages && typeof prev.pages === "object") existingPages = prev.pages;
    else if (prev.blocks && typeof prev.blocks === "object") existingPages = { "/": prev.blocks };
  } catch (e) {
    console.error(`v5heights: tools/v5-heights.json unreadable (${e.message}) - starting fresh`);
  }
}
const widthsChanged = existingWidths.length !== WIDTHS.length || existingWidths.some((w, i) => w !== WIDTHS[i]);
const pages = { ...existingPages };
for (const { route, blocks } of measuredRoutes) pages[route] = blocks;

if (widthsChanged) {
  const keptStale = Object.keys(existingPages).filter((r) => !measuredRoutes.some((m) => m.route === r));
  if (keptStale.length) {
    console.log(
      `\nwarning: tools/v5-heights.json was last written at widths [${existingWidths.join(", ")}], ` +
        `current WIDTHS (tools/v5cv.mjs) are [${WIDTHS.join(", ")}]. Not remeasured this run, still at the ` +
        `old widths: ${keptStale.join(" ")} - run again with --route to update them.`
    );
  }
}

const out = { generated: new Date().toISOString(), widths: WIDTHS, pages };
fs.writeFileSync(HEIGHTS_FILE, JSON.stringify(out, null, 2) + "\n", "utf8");

console.log(`\nwrote ${HEIGHTS_FILE}`);
console.log(`\n${"route".padEnd(30)} ${"blocks".padStart(6)} ${"unseen".padStart(6)}`);
for (const { route, blocks, unseen } of measuredRoutes) {
  console.log(`${route.padEnd(30)} ${String(Object.keys(blocks).length).padStart(6)} ${String(unseen.length).padStart(6)}`);
}
if (!measuredRoutes.length) console.log("(nothing measured this run)");

const allUnseen = measuredRoutes.flatMap((m) => m.unseen.map((u) => `${m.route}${u}`));
if (allUnseen.length) {
  console.log(`\nnot rendered even after scrollIntoView (kept out; the build uses the next smaller width there): ${allUnseen.join(", ")}`);
  process.exitCode = 1;
}
if (notBuilt.length) console.log(`\nnot built yet: ${notBuilt.join(" ")}`);
console.log("\nnext: node tools/v5build.mjs");
