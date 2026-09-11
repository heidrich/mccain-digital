/* Every request the page makes, counted - duplicates are the finding.
 *
 *   node tools/requests_audit.mjs [base] [path]
 *
 * A resource fetched twice is either a cache miss or a second runtime, and the
 * second runtime is what shipped a dead page once already.
 */
import { chromium } from "playwright-core";
import { findChrome } from "./browser.mjs";

const BASE = (process.argv[2] || "http://127.0.0.1:8898").replace(/\/$/, "");
const PATHNAME = process.argv[3] || "/index.html";

const browser = await chromium.launch({ executablePath: findChrome(), headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const reqs = [];
page.on("request", (r) => reqs.push(r.url()));
const sizes = new Map();
page.on("response", async (r) => {
  try {
    const len = Number(r.headers()["content-length"] || 0);
    sizes.set(r.url(), len);
  } catch {}
});

await page.goto(BASE + PATHNAME, { waitUntil: "domcontentloaded" });
await page.waitForLoadState("networkidle").catch(() => {});
await page.waitForTimeout(2500);

const counts = new Map();
for (const u of reqs) counts.set(u, (counts.get(u) || 0) + 1);

const dom = await page.evaluate(() => ({
  total: document.getElementsByTagName("*").length,
  root: document.getElementById("dc-root")?.getElementsByTagName("*").length ?? 0,
  pre: document.getElementById("dc-prerender")?.getElementsByTagName("*").length ?? 0,
  xdc: document.querySelector("x-dc")?.getElementsByTagName("*").length ?? null,
  tpl: document.getElementById("dc-template")
    ? document.getElementById("dc-template").content
      ? document.getElementById("dc-template").content.querySelectorAll("*").length
      : "text"
    : null,
  pixelCanvas: !!document.querySelector("canvas"),
  scripts: [...document.querySelectorAll("script[src]")].map((s) => s.getAttribute("src")),
}));

console.log(`\n${BASE}${PATHNAME}`);
console.log(`  ${reqs.length} requests, ${counts.size} distinct\n`);
for (const [u, n] of [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))) {
  const flag = n > 1 ? ` <-- ${n}x` : "";
  const kb = sizes.get(u) ? ` ${(sizes.get(u) / 1024).toFixed(1)}kb` : "";
  console.log(`  ${String(n).padStart(2)}  ${u.replace(BASE, "")}${kb}${flag}`);
}
console.log("\n  DOM");
console.log(`    elements total        ${dom.total}`);
console.log(`    in #dc-root (live)    ${dom.root}`);
console.log(`    in #dc-prerender      ${dom.pre}`);
console.log(`    inside <x-dc>         ${dom.xdc}`);
console.log(`    inside #dc-template   ${dom.tpl}`);
console.log(`    canvas present        ${dom.pixelCanvas}`);
console.log(`    script[src]           ${dom.scripts.join(", ")}`);

await browser.close();
