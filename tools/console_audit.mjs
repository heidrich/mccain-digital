/* Every message the browser console prints, grouped by shape.
 *
 *   node tools/console_audit.mjs                                # dev server
 *   node tools/console_audit.mjs https://mccain-digital.vercel.app
 *
 * WHY IT EXISTS
 * verify_site.mjs listened to `pageerror` only - uncaught exceptions. It
 * reported "0 page errors" while the owner was looking at a console holding a
 * hundred SVG complaints. `console` is a different channel: console.error from
 * page code, and the browser's own parse/resource warnings, never reach
 * `pageerror`. A gate that watches one channel says nothing about the other.
 */
import { chromium } from "playwright-core";
import { findChrome } from "./browser.mjs";

const BASE = (process.argv[2] || "http://127.0.0.1:8898").replace(/\/$/, "");
const PAGES = process.argv[3] ? [process.argv[3]] : ["/index.html", "/brand-guide.html"];

const executablePath = findChrome();
const browser = await chromium.launch({ executablePath, headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

/* Collapse the varying part of a message so 100 complaints about 100 different
 * elements group into one finding instead of a hundred. */
function shape(t) {
  return t
    .replace(/https?:\/\/[^\s"')]+/g, "<url>")
    .replace(/\b\d+(\.\d+)?\b/g, "<n>")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

for (const p of PAGES) {
  const url = BASE + p;
  const page = await context.newPage();
  const msgs = [];
  const errs = [];
  const bad = [];

  page.on("console", (m) => {
    msgs.push({ type: m.type(), text: m.text(), loc: m.location() });
  });
  page.on("pageerror", (e) => errs.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400) bad.push(`${r.status()} ${r.url()}`);
  });
  page.on("requestfailed", (r) => bad.push(`FAILED ${r.failure()?.errorText} ${r.url()}`));

  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(2500);

  /* Scroll the whole page: lazy work and IntersectionObserver-driven SVG only
   * complains once it is actually asked to paint. */
  await page.evaluate(async () => {
    const step = window.innerHeight;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(1500);

  console.log(`\n=== ${url}`);
  console.log(`    ${msgs.length} console messages, ${errs.length} pageerrors, ${bad.length} bad responses`);

  const loud = msgs.filter((m) => m.type === "error" || m.type === "warning");
  const groups = new Map();
  for (const m of loud) {
    const k = `${m.type}  ${shape(m.text)}`;
    if (!groups.has(k)) groups.set(k, { n: 0, sample: m });
    groups.get(k).n++;
  }
  const sorted = [...groups.entries()].sort((a, b) => b[1].n - a[1].n);
  for (const [k, v] of sorted) {
    console.log(`\n  [${String(v.n).padStart(3)}x] ${k}`);
    const l = v.sample.loc;
    if (l && l.url) console.log(`        at ${l.url}:${l.lineNumber}:${l.columnNumber}`);
    if (v.sample.text.length > 180) console.log(`        full: ${v.sample.text.slice(0, 400)}`);
  }
  if (!sorted.length) console.log("    no errors or warnings on the console");

  if (errs.length) {
    console.log("\n  pageerrors:");
    for (const e of errs.slice(0, 5)) console.log("    " + e.slice(0, 200));
  }
  if (bad.length) {
    console.log("\n  bad responses:");
    const bg = new Map();
    for (const b of bad) bg.set(shape(b), (bg.get(shape(b)) || 0) + 1);
    for (const [k, n] of [...bg.entries()].sort((a, b) => b[1] - a[1]))
      console.log(`    [${n}x] ${k}`);
    for (const b of bad.slice(0, 8)) console.log(`      e.g. ${b.slice(0, 160)}`);
  }
  await page.close();
}

await browser.close();
