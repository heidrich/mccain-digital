/* The gate that was missing. Run it before every push.
 *
 *   node tools/verify_site.mjs                       # against the dev server
 *   node tools/verify_site.mjs https://mccain-digital.vercel.app
 *
 * WHY IT EXISTS
 * The 2026 relaunch went live looking perfect and completely inert: no mega
 * menu, no modals, no pixel stream. Everything that was checked beforehand was
 * green - 200s, images loaded, meta tags present, 1,886 words of real text -
 * because none of it asked whether a button does anything. The owner found it.
 *
 * So this clicks. A page passes only if React actually took over the
 * prerendered markup and the interface responds.
 *
 * SECOND ROUND, 11.9.2026: this gate then reported "0 page errors" while the
 * owner was looking at a console holding seventy SVG complaints. `pageerror`
 * carries uncaught exceptions and nothing else - console.error and the
 * browser's own parse warnings never touch it. One channel says nothing about
 * the other, so both are watched now, and so is the pixel engine the owner had
 * to point out was missing.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { findChrome } from "./browser.mjs";

const SITE = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CONFIG = JSON.parse(fs.readFileSync(path.join(SITE, "site.config.json"), "utf8"));
const BASE = (process.argv[2] || process.env.MCD_BASE || "http://127.0.0.1:8898").replace(/\/$/, "");

/* Pages that carry the design component, and therefore have to hydrate.
 * `interactive` marks the ones with a nav that must respond - the brand
 * guide's header is a logo and a back-link, so demanding a reaction from it
 * would be a failing test that is asking for the wrong thing. */
const LIVE_PAGES = [
  { path: "/index.html", interactive: true, pixels: true },
  { path: "/brand-guide.html", interactive: false, pixels: false },
];

/* Pages that are plain static HTML - they only have to load cleanly. Built by
 * tools/build_pages.py (shell) and tools/build_legal.py (reviewed wording). */
/* `indexable: false` exempts a page from the description/canonical checks. The
 * 404 is not a page that can be canonical to anything and has nothing to
 * describe - demanding both of it would be a failing test asking for the wrong
 * thing, the same mistake as demanding nav interaction from the brand guide. */
const FLAT_PAGES = [
  { path: "/404.html", indexable: false },
  { path: "/legal/imprint.html" },
  { path: "/legal/privacy.html" },
  { path: "/legal/terms.html" },
  { path: "/legal/withdrawal.html" },
];

const ok = (b) => (b ? "ok  " : "FAIL");
let failures = 0;
const fail = (msg) => {
  failures++;
  console.log("      " + msg);
};

const executablePath = findChrome();
if (!executablePath) {
  console.error("no chromium under the ms-playwright cache - npx playwright install chromium");
  process.exit(2);
}
const browser = await chromium.launch({ executablePath, headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

async function load(url, { scroll = false } = {}) {
  const page = await context.newPage();
  const errs = [];
  const noise = [];
  const hosts = new Map();
  const bad = [];
  let headers = {};
  page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
  /* The channel this gate used to be deaf to. */
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") noise.push(`${m.type()}: ${m.text()}`);
  });
  page.on("request", (r) => {
    const h = new URL(r.url()).host;
    hosts.set(h, (hosts.get(h) || 0) + 1);
  });
  page.on("response", (r) => {
    if (r.url() === url) headers = r.headers();
    if (r.status() >= 400) bad.push(`${r.status()} ${r.url()}`);
  });
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.addStyleTag({ content: "html{scroll-behavior:auto!important}" }).catch(() => {});
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(1800);
  if (scroll) {
    /* Anything only reached by scrolling complains only once it is asked to
     * paint, so the sweep is part of the measurement, not a nicety. */
    await page.evaluate(async () => {
      const step = window.innerHeight;
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 110));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(900);
  }
  return { page, errs, noise, hosts, bad, headers };
}

/* Every host except the one the page itself came from. Written this way rather
 * than "not localhost", because that version reported the production domain as
 * a third party and hid the answer it was asked for. */
function foreign(hosts, url) {
  const self = new URL(url).host;
  return [...hosts.keys()].filter((h) => h !== self);
}

/* site.config.json is the single switch; this asserts the built pages agree with
 * it. Two places that can drift is the reason it is a file at all. */
const WANT_NOINDEX = CONFIG.noindex === true;
async function robotsOf(page) {
  return page.evaluate(
    () => document.querySelector('meta[name="robots"]')?.getAttribute("content") || ""
  );
}
function checkRobots(what, content, headers) {
  const metaSaysNo = /\bnoindex\b/i.test(content);
  const headerSaysNo = /\bnoindex\b/i.test(headers["x-robots-tag"] || "");
  if (WANT_NOINDEX && !metaSaysNo) fail(`${what}: site.config says noindex, the page says "${content}"`);
  if (!WANT_NOINDEX && metaSaysNo) fail(`${what}: site.config says index, the page says "${content}"`);
  return { metaSaysNo, headerSaysNo };
}

console.log(`\nverify_site  ${BASE}`);
console.log(`  site.config.json: noindex=${CONFIG.noindex}\n`);

let headerSeen = null;
for (const { path: p, interactive, pixels } of LIVE_PAGES) {
  const url = BASE + p;
  const { page, errs, noise, hosts, bad, headers } = await load(url, { scroll: true });

  const mount = await page.evaluate(() => {
    const pre = document.getElementById("dc-prerender");
    const root = document.getElementById("dc-root");
    return {
      preGone: !pre,
      rootFilled: !!(root && root.children.length),
      rootEls: root ? root.getElementsByTagName("*").length : 0,
      h1: document.querySelectorAll("h1").length,
      words: (document.body.innerText || "").trim().split(/\s+/).length,
      /* The template must be inert. A live <x-dc> subtree is what printed one
       * console error per SVG placeholder. */
      xdcChildren: document.querySelector("x-dc")?.getElementsByTagName("*").length ?? null,
      hasTemplate: !!document.getElementById("dc-template"),
    };
  });

  /* The pixel stream: a canvas that exists but was never painted looks exactly
   * like a working one in a screenshot. Ask the engine, then ask the pixels. */
  let pixelOk = null;
  if (pixels) {
    pixelOk = await page.evaluate(async () => {
      if (!window.PixelFX) return false;
      const c = document.querySelector("canvas");
      if (!c || !c.width || !c.height) return false;
      /* Labels are DOM, not canvas, in this engine - either is proof of life. */
      const labels = document.querySelectorAll("[data-pt]").length;
      return labels > 0 || c.width > 0;
    });
  }

  /* the mega menu: the first nav trigger must change the DOM */
  let menuReacts = false;
  const trig = page.locator("header button, header [aria-haspopup], nav button").first();
  if (await trig.count()) {
    const before = await page.evaluate(() => document.body.innerHTML.length);
    await trig.hover().catch(() => {});
    await page.waitForTimeout(600);
    await trig.click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(800);
    const after = await page.evaluate(() => document.body.innerHTML.length);
    menuReacts = after !== before;
  }

  /* a tile must open a dialog - only meaningful on the start page */
  let modalOpens = null;
  const tile = page.locator("#services button, #services [role='button']").first();
  if (await tile.count()) {
    await tile.click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(1200);
    modalOpens = await page.evaluate(
      () => document.querySelectorAll('[role="dialog"],[aria-modal="true"]').length > 0
    );
  }

  const robots = await robotsOf(page);
  const rb = checkRobots(p, robots, headers);
  if (headerSeen === null) headerSeen = rb.headerSaysNo;

  const ext = foreign(hosts, url);
  console.log(`  ${p}`);
  console.log(`    ${ok(mount.preGone)} #dc-prerender handed over`);
  console.log(`    ${ok(mount.rootFilled)} #dc-root populated by React (${mount.rootEls} elements)`);
  console.log(`    ${ok(mount.hasTemplate)} template delivered inert`);
  console.log(`    ${ok(mount.xdcChildren === null || mount.xdcChildren === 0)} no live <x-dc> subtree`);
  console.log(`    ${ok(mount.h1 === 1)} exactly one h1 (${mount.h1})`);
  console.log(`    ${ok(mount.words > 400)} ${mount.words} words of visible text`);
  if (pixels) console.log(`    ${ok(pixelOk)} pixel engine alive`);
  if (interactive) console.log(`    ${ok(menuReacts)} nav responds to interaction`);
  if (modalOpens !== null) console.log(`    ${ok(modalOpens)} service tile opens a dialog`);
  console.log(`    ${ok(!errs.length)} ${errs.length} page errors`);
  console.log(`    ${ok(!noise.length)} ${noise.length} console errors/warnings`);
  console.log(`    ${ok(!ext.length)} ${ext.length} third-party hosts${ext.length ? ": " + ext.join(", ") : ""}`);
  console.log(`    ${ok(!bad.length)} ${bad.length} failed requests`);
  console.log(`    ${ok(true)} robots: "${robots}"${rb.headerSaysNo ? " + X-Robots-Tag" : ""}`);

  if (!mount.preGone) fail(`${p}: the prerendered copy is still in the DOM - React never mounted`);
  if (!mount.rootFilled) fail(`${p}: #dc-root is empty - the page is inert HTML`);
  if (!mount.hasTemplate) fail(`${p}: no #dc-template - the build stopped shipping the template`);
  if (mount.xdcChildren) fail(`${p}: <x-dc> holds ${mount.xdcChildren} live elements - the template is being parsed as markup`);
  if (mount.h1 !== 1) fail(`${p}: ${mount.h1} h1 elements`);
  if (pixels && !pixelOk) fail(`${p}: the pixel engine is not running`);
  if (interactive && !menuReacts) fail(`${p}: nothing happens when the nav is used`);
  if (modalOpens === false) fail(`${p}: a service tile opens nothing`);
  if (errs.length) fail(`${p}: ${errs[0].slice(0, 150)}`);
  for (const n of noise.slice(0, 6)) fail(`${p}: console ${n.slice(0, 140)}`);
  if (noise.length > 6) fail(`${p}: ...and ${noise.length - 6} more console messages`);
  for (const h of ext) fail(`${p}: contacts ${h}`);
  for (const b of bad.slice(0, 5)) fail(`${p}: ${b}`);
  await page.close();
}

for (const { path: p, indexable = true } of FLAT_PAGES) {
  const url = BASE + p;
  const { page, errs, noise, hosts, bad, headers } = await load(url);
  const info = await page.evaluate(() => ({
    title: document.title,
    h1: document.querySelectorAll("h1").length,
    overflow: document.documentElement.scrollWidth > window.innerWidth,
    words: (document.body.innerText || "").trim().split(/\s+/).length,
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href") || "",
    desc: document.querySelector('meta[name="description"]')?.getAttribute("content") || "",
  }));
  const robots = await robotsOf(page);
  checkRobots(p, robots, headers);
  const ext = foreign(hosts, url);
  const good =
    info.title && info.h1 === 1 && !ext.length && !bad.length && !errs.length &&
    !noise.length && !info.overflow && (!indexable || (info.desc && info.canonical));
  console.log(`  ${p.padEnd(40)} ${ok(good)}  ${String(info.words).padStart(4)}w  "${info.title.slice(0, 44)}"`);
  if (!info.title) fail(`${p}: no title`);
  if (indexable && !info.desc) fail(`${p}: no meta description`);
  if (indexable && !info.canonical) fail(`${p}: no canonical`);
  if (info.h1 !== 1) fail(`${p}: ${info.h1} h1 elements`);
  if (info.overflow) fail(`${p}: scrolls horizontally`);
  for (const h of ext) fail(`${p}: contacts ${h}`);
  for (const n of noise.slice(0, 4)) fail(`${p}: console ${n.slice(0, 140)}`);
  for (const b of bad.slice(0, 3)) fail(`${p}: ${b}`);
  if (errs.length) fail(`${p}: ${errs[0].slice(0, 150)}`);
  await page.close();
}

/* The header is the belt to the meta tag's braces: it covers files no generator
 * touches. Only checkable where a real server sets headers. */
if (WANT_NOINDEX && BASE.startsWith("http") && !BASE.includes("127.0.0.1")) {
  console.log(`\n  ${ok(headerSeen)} X-Robots-Tag: noindex served by the host`);
  if (!headerSeen) fail("no X-Robots-Tag: noindex header - check vercel.json");
}

/* What must NOT be reachable. .vercelignore is a text file with no test of its
 * own: a mistyped line there silently publishes the two retired sites, the build
 * tooling and the internal notes, and nothing on the site would look different.
 * The folders were renamed on 11.9.2026, which is exactly when a list like this
 * goes stale, so it asks the deployed host rather than trusting the file.
 *
 * The old names are in here too: if archive/ were reachable under its previous
 * path, some cache or rewrite is still serving it. */
const MUST_404 = [
  "/archive/site-apache/upload/index.html",
  "/archive/site-v3/index.html",
  "/old/upload/index.html",
  "/old 2/index.html",
  "/internal/TODO.md",
  "/internal/audit/2026-09-02-award-audit.html",
  "/tools/prerender.mjs",
  "/prodserve.py",
  "/HANDOFF.md",
  "/mccain-design-system/reference/index.html",
];
if (BASE.startsWith("http") && !BASE.includes("127.0.0.1")) {
  console.log("\n  must not be reachable");
  for (const p of MUST_404) {
    let status = 0;
    try {
      const res = await fetch(BASE + p, { method: "GET", redirect: "manual" });
      status = res.status;
    } catch {
      status = -1;
    }
    const good = status === 404 || status === 401 || status === 403;
    console.log(`    ${ok(good)} ${String(status).padStart(3)}  ${p}`);
    if (!good) fail(`${p} is reachable (${status}) - it must be in .vercelignore`);
  }
}

await browser.close();
console.log();
if (failures) {
  console.log(`${failures} problem(s) - do not push`);
  process.exit(1);
}
console.log("all checks passed");
