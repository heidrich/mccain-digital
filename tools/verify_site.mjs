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
 */
import { chromium } from "playwright-core";
import { findChrome } from "./browser.mjs";

const BASE = (process.argv[2] || process.env.MCD_BASE || "http://127.0.0.1:8898").replace(/\/$/, "");

/* Pages that carry the design component, and therefore have to hydrate.
 * `interactive` marks the ones with a nav that must respond - the brand
 * guide's header is a logo and a back-link, so demanding a reaction from it
 * would be a failing test that is asking for the wrong thing. */
const LIVE_PAGES = [
  { path: "/index.html", interactive: true },
  { path: "/brand-guide.html", interactive: false },
];
/* Pages that are plain static HTML - they only have to load cleanly. */
const FLAT_PAGES = [
  "/404.html",
  "/legal/imprint.html",
  "/legal/privacy.html",
  "/legal/terms.html",
  "/legal/withdrawal.html",
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

async function load(url) {
  const page = await context.newPage();
  const errs = [];
  const hosts = new Map();
  const bad = [];
  page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
  page.on("request", (r) => {
    const h = new URL(r.url()).host;
    hosts.set(h, (hosts.get(h) || 0) + 1);
  });
  page.on("response", (r) => {
    if (r.status() >= 400) bad.push(`${r.status()} ${r.url()}`);
  });
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.addStyleTag({ content: "html{scroll-behavior:auto!important}" }).catch(() => {});
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(1800);
  return { page, errs, hosts, bad };
}

/* Every host except the one the page itself came from. Written this way rather
 * than "not localhost", because that version reported the production domain as
 * a third party and hid the answer it was asked for. */
function foreign(hosts, url) {
  const self = new URL(url).host;
  return [...hosts.keys()].filter((h) => h !== self);
}

console.log(`\nverify_site  ${BASE}\n`);

for (const { path: p, interactive } of LIVE_PAGES) {
  const url = BASE + p;
  const { page, errs, hosts, bad } = await load(url);

  const mount = await page.evaluate(() => {
    const pre = document.getElementById("dc-prerender");
    const root = document.getElementById("dc-root");
    return {
      preGone: !pre,
      rootFilled: !!(root && root.children.length),
      h1: document.querySelectorAll("h1").length,
      words: (document.body.innerText || "").trim().split(/\s+/).length,
    };
  });

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

  const ext = foreign(hosts, url);
  /* The browser fetches src="{{ f.href }}" before support.js interpolates it.
   * These 404s exist in the untouched export as well, so they are inherited
   * noise rather than something this build broke - surfaced, not failed on. */
  const moustache = bad.filter((b) => b.includes("%7B%7B"));
  const realBad = bad.filter((b) => !b.includes("%7B%7B"));
  console.log(`  ${p}`);
  console.log(`    ${ok(mount.preGone)} #dc-prerender handed over`);
  console.log(`    ${ok(mount.rootFilled)} #dc-root populated by React`);
  console.log(`    ${ok(mount.h1 === 1)} exactly one h1 (${mount.h1})`);
  console.log(`    ${ok(mount.words > 400)} ${mount.words} words of visible text`);
  if (interactive) console.log(`    ${ok(menuReacts)} nav responds to interaction`);
  if (modalOpens !== null) console.log(`    ${ok(modalOpens)} service tile opens a dialog`);
  console.log(`    ${ok(!errs.length)} ${errs.length} page errors`);
  console.log(`    ${ok(!ext.length)} ${ext.length} third-party hosts${ext.length ? ": " + ext.join(", ") : ""}`);
  console.log(`    ${ok(!realBad.length)} ${realBad.length} failed requests` +
    (moustache.length ? `   (+${moustache.length} inherited {{ }} placeholder fetches)` : ""));

  if (!mount.preGone) fail(`${p}: the prerendered copy is still in the DOM - React never mounted`);
  if (!mount.rootFilled) fail(`${p}: #dc-root is empty - the page is inert HTML`);
  if (mount.h1 !== 1) fail(`${p}: ${mount.h1} h1 elements`);
  if (interactive && !menuReacts) fail(`${p}: nothing happens when the nav is used`);
  if (modalOpens === false) fail(`${p}: a service tile opens nothing`);
  if (errs.length) fail(`${p}: ${errs[0].slice(0, 150)}`);
  for (const h of ext) fail(`${p}: contacts ${h}`);
  for (const b of realBad.slice(0, 5)) fail(`${p}: ${b}`);
  await page.close();
}

for (const p of FLAT_PAGES) {
  const url = BASE + p;
  const { page, errs, hosts, bad } = await load(url);
  const info = await page.evaluate(() => ({
    title: document.title,
    h1: document.querySelectorAll("h1").length,
    overflow: document.documentElement.scrollWidth > window.innerWidth,
  }));
  const ext = foreign(hosts, url);
  const good = info.title && info.h1 === 1 && !ext.length && !bad.length && !errs.length && !info.overflow;
  console.log(`  ${p.padEnd(28)} ${ok(good)}  "${info.title}"`);
  if (!info.title) fail(`${p}: no title`);
  if (info.h1 !== 1) fail(`${p}: ${info.h1} h1 elements`);
  if (info.overflow) fail(`${p}: scrolls horizontally`);
  for (const h of ext) fail(`${p}: contacts ${h}`);
  for (const b of bad.slice(0, 3)) fail(`${p}: ${b}`);
  await page.close();
}

await browser.close();
console.log();
if (failures) {
  console.log(`${failures} problem(s) - do not push`);
  process.exit(1);
}
console.log("all checks passed");
