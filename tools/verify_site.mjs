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
/* All 21 of them since the v4 import: the whole site is the design export now,
 * so there is no such thing here as a page that only has to load. Each one
 * hydrates, carries the shared nav and runs the pixel engine.
 *
 * Keep this list in step with PAGES in tools/prerender.mjs. It is deliberately
 * a second, hand-written list rather than an import: this gate asking the same
 * table the builder used would only ever confirm the builder agrees with
 * itself. A route that exists in one and not the other is a finding. */
const LIVE_PAGES = [
  { path: "/", interactive: true, pixels: true, modals: true },
  { path: "/leistungen/", interactive: true, pixels: true },
  { path: "/leistungen/ki-automatisierung/", interactive: true, pixels: true },
  { path: "/leistungen/web-apps/", interactive: true, pixels: true },
  { path: "/leistungen/websites/", interactive: true, pixels: true },
  { path: "/leistungen/individualsoftware/", interactive: true, pixels: true },
  { path: "/leistungen/nextjs-entwicklung/", interactive: true, pixels: true },
  { path: "/leistungen/mcp-server-entwickeln/", interactive: true, pixels: true },
  { path: "/leistungen/rag-beratung/", interactive: true, pixels: true },
  { path: "/leistungen/erp-integration/", interactive: true, pixels: true },
  { path: "/vergleich/wordpress-oder-handgeschrieben/", interactive: true, pixels: true },
  { path: "/vergleich/chatgpt-oder-eigenes-rag/", interactive: true, pixels: true },
  { path: "/md-recall/", interactive: true, pixels: true },
  { path: "/preise/", interactive: true, pixels: true },
  { path: "/studio/", interactive: true, pixels: true },
  { path: "/kontakt/", interactive: true, pixels: true },
  { path: "/rechtliches/", interactive: true, pixels: true },
  { path: "/styleguide/", interactive: true, pixels: true },
  { path: "/news/", interactive: true, pixels: true },
  { path: "/news/md-recall/", interactive: true, pixels: true },
  { path: "/marke/", interactive: true, pixels: true },
];

/* The 404 is the only hand-written page left, and the only one that must work
 * when the runtime does not. `indexable: false` exempts it from the
 * description/canonical checks: it is not a page that can be canonical to
 * anything, and demanding that of it would be a failing test asking for the
 * wrong thing. */
const FLAT_PAGES = [{ path: "/404.html", indexable: false }];

/* Which routes must carry a contact form that is actually wired. The export
 * puts one on every page; these are the two a visitor is sent to. */
const FORM_PAGES = ["/", "/kontakt/"];

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

/* DID THE PAGE HYDRATE, OR DID IT BUILD ITSELF A SECOND TIME?
 *
 * Since 13.9.2026 the build writes React's own first render into #dc-root and
 * patchRuntime() teaches support.js to hydrate it. Nothing about that is
 * visible from the outside: a page that falls back to createRoot looks
 * identical, scores 20 points worse, and prints nothing. So the gate watches
 * which mount function actually ran.
 *
 * Wrapped on READ, not on write: the React UMD assigns an EMPTY object to
 * window.ReactDOM and its factory fills it afterwards, so a setter sees nothing
 * to wrap and reports "no mount at all". */
await context.addInitScript(() => {
  window.__mcdMount = [];
  let real;
  Object.defineProperty(window, "ReactDOM", {
    configurable: true,
    get() {
      if (real && !real.__mcdWrapped) {
        real.__mcdWrapped = true;
        const hr = real.hydrateRoot;
        const cr = real.createRoot;
        if (hr) real.hydrateRoot = function (...a) { window.__mcdMount.push("hydrateRoot"); return hr.apply(this, a); };
        if (cr) real.createRoot = function (...a) { window.__mcdMount.push("createRoot"); return cr.apply(this, a); };
      }
      return real;
    },
    set(v) { real = v; },
  });
});

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
for (const { path: p, interactive, pixels, modals } of LIVE_PAGES) {
  const url = BASE + p;
  const { page, errs, noise, hosts, bad, headers } = await load(url, { scroll: true });

  const mount = await page.evaluate(() => {
    const root = document.getElementById("dc-root");
    return {
      /* One copy of the page, not two. The owner watched the second one arrive
       * on 13.9.2026 - a cached document from before the rebuild met the new
       * runtime, which found no filled #dc-root, created its own and left the
       * old markup lying underneath, offset by the hero. */
      hosts: document.querySelectorAll(".sc-host").length,
      mountPath: window.__mcdMount || [],
      stalePrerender: !!document.getElementById("dc-prerender"),
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
  const tile = modals ? page.locator("#services button, #services [role='button']").first() : null;
  if (tile && (await tile.count())) {
    await tile.click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(1200);
    modalOpens = await page.evaluate(
      () => document.querySelectorAll('[role="dialog"],[aria-modal="true"]').length > 0
    );
  }

  /* ONE OF EACH, AFTER HYDRATION.
   *
   * support.js injects the component's <helmet> into document.head on top of
   * the head the build wrote, so anything the helmet still carries ships twice.
   * Measured 12.9.2026 before tools/prerender.mjs stripped it: two <title>, two
   * descriptions, two og:url, two JSON-LD graphs and TWO <link rel=canonical> -
   * the second one relative, and on /marke/ pointing at /rechtliches/. Two
   * canonicals on one page is the case where Google may ignore both, and the
   * head alone looked perfectly correct the whole time. Only the hydrated page
   * shows it, so it is asked here rather than in the builder. */
  const dupes = await page.evaluate(() => ({
    title: document.querySelectorAll("title").length,
    canonical: document.querySelectorAll('link[rel="canonical"]').length,
    description: document.querySelectorAll('meta[name="description"]').length,
    ogUrl: document.querySelectorAll('meta[property="og:url"]').length,
  }));
  const dupeList = Object.entries(dupes).filter(([, n]) => n > 1);

  /* THE LANDMARKS, AFTER HYDRATION.
   *
   * No page had a <main> before 12.9.2026 - the sections sat as siblings
   * between <header> and <footer>, so "skip to main content" had nothing to
   * skip to. tools/prerender.mjs wraps both copies now (see wrapMain), and this
   * is the half that matters: the prerendered copy is thrown away a moment
   * after load, so a <main> that only exists there is a <main> that vanishes.
   *
   * The banner count is asked too, because the fix has a way of going subtly
   * wrong rather than loudly: on /marke/ the content wrapper opens with a
   * <header> of its own, and a <main> that starts after it leaves that header
   * outside as a SECOND banner landmark. One is correct; two is a page with two
   * mastheads as far as a screen reader is concerned. */
  const marks = await page.evaluate(() => {
    const m = document.querySelector("main");
    const banner = [...document.querySelectorAll("header")].filter(
      (h) => !h.closest("main, article, aside, nav, section")
    ).length;
    /* THE BRAND MARK MUST NOT BE ANIMATING.
     *
     * It is built from 146 <rect> cells and in 'loop' mode every one of them
     * gets its own infinite CSS animation - 3.5 seconds of main-thread work per
     * page load, measured. tools/prerender.mjs forces the component's own
     * 'static' mode; asked here because the patch is against the export, and
     * the next export can move the line it patches. viewBox 0 0 64 64 is the
     * mark and nothing else. */
    let logoAnim = 0;
    for (const svg of document.querySelectorAll('svg[viewBox="0 0 64 64"]')) {
      logoAnim += svg.getAnimations({ subtree: true }).filter((a) => a.playState === "running").length;
    }
    /* NOTHING UNDER THE STREAM MAY SIT INSIDE A DEFERRED ELEMENT.
     *
     * content-visibility makes its element a stacking context, so a layer on a
     * negative z-index inside it is painted above the pixel stream's canvas
     * (z-index:-1) instead of below it - the dark bands hid the stream this way
     * until 16.9.2026. tools/prerender.mjs moves the mark past such a layer;
     * asked here because a new export can add a layer somewhere it does not
     * look. Computed styles, so it holds whatever wrote the z-index. */
    const underStream = [];
    for (const el of document.querySelectorAll("*")) {
      if (getComputedStyle(el).contentVisibility !== "auto") continue;
      for (const d of el.querySelectorAll("*")) {
        if (parseInt(getComputedStyle(d).zIndex, 10) < 0) {
          underStream.push(el.getAttribute("data-screen-label") || el.parentElement.getAttribute("data-screen-label") || el.tagName.toLowerCase());
          break;
        }
      }
    }

    return {
      underStream,
      mains: document.querySelectorAll("main").length,
      hasFooterInside: !!m && !!m.querySelector("footer"),
      hasSkipTarget: !!m && !!document.getElementById("inhalt") && m.contains(document.getElementById("inhalt")),
      banner,
      logoAnim,
      logos: document.querySelectorAll('svg[viewBox="0 0 64 64"]').length,
    };
  });

  const robots = await robotsOf(page);
  const rb = checkRobots(p, robots, headers);
  if (headerSeen === null) headerSeen = rb.headerSaysNo;

  const ext = foreign(hosts, url);
  console.log(`  ${p}`);
  console.log(
    `    ${ok(mount.mountPath.includes("hydrateRoot") && mount.hosts === 1)} React hydrated the delivered markup ` +
      `(${mount.mountPath.join("+") || "no mount seen"}, ${mount.hosts} copy)`
  );
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
  console.log(`    ${ok(!dupeList.length)} one title/canonical/description/og:url after hydration${dupeList.length ? ": " + dupeList.map(([k, n]) => `${n}× ${k}`).join(", ") : ""}`);
  console.log(`    ${ok(marks.mains === 1 && !marks.hasFooterInside && marks.hasSkipTarget && marks.banner === 1)} one <main> around the content, one banner (${marks.mains} main, ${marks.banner} banner)`);
  console.log(`    ${ok(marks.logoAnim === 0)} brand mark static (${marks.logos} marks, ${marks.logoAnim} running animations)`);
  console.log(`    ${ok(!marks.underStream.length)} no background layer over the stream${marks.underStream.length ? ": " + marks.underStream.join(", ") : ""}`);
  console.log(`    ${ok(true)} robots: "${robots}"${rb.headerSaysNo ? " + X-Robots-Tag" : ""}`);
  /* A CSP violation is a console error, and console errors already fail this
   * gate - so the policy being WRONG is caught above. This asks the other
   * question: whether it is there at all. Both prodserve.py and Vercel read it
   * out of vercel.json, so the answer is the same locally and in production. */
  const csp = headers["content-security-policy"] || "";
  const cspHashes = (csp.match(/'sha256-/g) || []).length;
  console.log(`    ${ok(!!csp)} CSP present (${cspHashes} script hash(es))`);

  if (mount.stalePrerender) fail(`${p}: #dc-prerender is in the document - this page was built before 13.9.2026, rebuild it`);
  if (mount.hosts !== 1) {
    fail(`${p}: ${mount.hosts} copies of the page in the DOM, expected 1 - the runtime rendered a second one instead of adopting`);
  }
  if (!mount.mountPath.length) fail(`${p}: React never mounted - no createRoot and no hydrateRoot ran`);
  else if (!mount.mountPath.includes("hydrateRoot")) {
    fail(
      `${p}: React ran ${mount.mountPath.join("+")} instead of hydrateRoot - it rebuilt the whole page. ` +
        `Either #dc-root arrived empty (ssrRender) or support.js lost the patch (patchRuntime).`
    );
  }
  if (!mount.rootFilled) fail(`${p}: #dc-root is empty - the page is inert HTML`);
  if (!mount.hasTemplate) fail(`${p}: no #dc-template - the build stopped shipping the template`);
  if (mount.xdcChildren) fail(`${p}: <x-dc> holds ${mount.xdcChildren} live elements - the template is being parsed as markup`);
  if (mount.h1 !== 1) fail(`${p}: ${mount.h1} h1 elements`);
  if (!csp) fail(`${p}: no Content-Security-Policy header`);
  if (marks.mains !== 1) fail(`${p}: ${marks.mains} <main> after hydration - the landmark did not survive React`);
  if (marks.hasFooterInside) fail(`${p}: the <footer> is inside <main>`);
  if (!marks.hasSkipTarget) fail(`${p}: the skip link's target is not inside <main>`);
  if (marks.banner !== 1) fail(`${p}: ${marks.banner} banner landmarks - a <header> outside <main> that is not the masthead`);
  if (marks.logoAnim) fail(`${p}: the brand mark is running ${marks.logoAnim} animations - the static patch missed (see MARK_FROM in prerender.mjs)`);
  for (const band of marks.underStream) {
    fail(`${p}: "${band}" is deferred with a background layer inside - its ground paints over the pixel stream (see deferSections in prerender.mjs)`);
  }
  for (const [k, n] of dupeList)
    fail(`${p}: ${n} <${k}> after hydration - the helmet is shipping a second set of meta tags`);
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

/* THE FORMS ACTUALLY SEND.
 *
 * The old version of this check asked for action= and method=post, which the
 * design export's forms do not have and never will: they are React handlers.
 * So it asks the two things that are true of a wired page and false of the
 * export as it arrives:
 *
 *   - the delivery runtime is present (window.__mcdSend)
 *   - the handler that sets formSent without sending is GONE
 *
 * The second half is the one that matters. The export ships
 * `if (fd.get('company')) return; this.setState({ formSent: true });` on all 21
 * pages - a form that tells every visitor their message arrived and discards
 * it. If a future export renames something and tools/prerender.mjs stops
 * matching, the build already fails; this is the belt to that brace, measured
 * on the served page rather than on the builder's intentions.
 *
 * Whether a message really leaves the browser is tools/form_probe.mjs - it has
 * to click, and it needs a headed browser to get past the bot check. */
{
  console.log("\n  contact forms wired to a real endpoint");
  const LIE = "this.setState({ formSent: true })";
  for (const p of FORM_PAGES) {
    let html = "";
    try {
      html = await (await fetch(BASE + p)).text();
    } catch (e) {
      fail(`${p}: could not be fetched for the form check (${e.message})`);
      continue;
    }
    const wired = html.includes("window.__mcdSend");
    /* Only outside the inert template: the template is markup, not code. */
    const code = html.replace(/<template id="dc-template">[\s\S]*?<\/template>/, "");
    const lies = code.includes(LIE) && !code.includes("__mcdSend");
    console.log(`    ${ok(wired)} ${p} carries the delivery runtime`);
    console.log(`    ${ok(!lies)} ${p} has no unwired "formSent" handler left`);
    if (!wired) fail(`${p}: no window.__mcdSend - the form cannot send anything`);
    if (lies) fail(`${p}: a submit handler still fakes success without sending`);
  }
}

for (const { path: p, indexable = true, form = false } of FLAT_PAGES) {
  const url = BASE + p;
  const { page, errs, noise, hosts, bad, headers } = await load(url);
  const info = await page.evaluate(() => ({
    title: document.title,
    h1: document.querySelectorAll("h1").length,
    overflow: document.documentElement.scrollWidth > window.innerWidth,
    words: (document.body.innerText || "").trim().split(/\s+/).length,
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href") || "",
    desc: document.querySelector('meta[name="description"]')?.getAttribute("content") || "",
    /* A form has to have somewhere to send to. The start page's contact form
     * showed "Danke - Ihre Nachricht ist da." and posted nothing at all: every
     * enquiry silently discarded while the sender was told it had arrived.
     * Nothing about the page looked wrong, so this is now asked out loud. */
    forms: [...document.querySelectorAll("form")].map((f) => ({
      action: f.getAttribute("action") || "",
      method: (f.getAttribute("method") || "get").toLowerCase(),
      fields: [...f.elements].filter((el) => el.name).map((el) => el.name),
    })),
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
  if (form) {
    const posting = info.forms.filter((f) => f.method === "post" && /^https?:|^\//.test(f.action));
    console.log(
      `    ${ok(posting.length > 0)} ${posting.length} form(s) that actually post` +
        (posting.length ? `  -> ${posting[0].action}` : "")
    );
    if (!posting.length)
      fail(`${p}: the form has no usable action - a form that cannot send must not say it did`);
  }
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

/* The Markdown twin is what a language model reads instead of the HTML. It is
 * written by tools/v5build.mjs next to the page and must come back as
 * text/markdown: a twin that 404s, or arrives as text/plain because a host
 * rule is missing, is invisible to the model and to the workshop's crawler
 * view alike, and nothing on the page would look different. */
console.log("\n  markdown twins");
for (const p of ["/v5/index.md"]) {
  let status = 0, type = "", head = "";
  try {
    const res = await fetch(BASE + p);
    status = res.status;
    type = res.headers.get("content-type") || "";
    head = (await res.text()).slice(0, 200);
  } catch {
    status = -1;
  }
  const good = status === 200 && type.startsWith("text/markdown") && head.startsWith("# ");
  console.log(`    ${ok(good)} ${String(status).padStart(3)}  ${p}  ${type || "no content-type"}`);
  if (!good) fail(`${p}: expected 200 text/markdown starting with "# " (got ${status} ${type || "no content-type"})`);
}

/* Reachability, the other direction: is every page actually linked FROM the
 * start page, in the DOM React renders - not in the prerendered copy that gets
 * thrown away. A page can be in the sitemap, answer 200 and still be an orphan
 * that no reader ever arrives at. The four service pages and the contact page
 * were exactly that until the footer stopped opening modals and started linking. */
{
  const url = BASE + "/";
  const { page } = await load(url);
  const hrefs = await page.evaluate(() => {
    const root = document.getElementById("dc-root") || document.body;
    return [...root.querySelectorAll("a[href]")].map((a) => a.getAttribute("href"));
  });
  const norm = (h) =>
    h.replace(/^https?:\/\/[^/]+/, "").replace(/[#?].*$/, "").replace(/\/?$/, "/");
  const linked = new Set(hrefs.map(norm));
  /* Every route except the start page itself has to be arrivable from it -
   * directly or through the mega menu, which is in the DOM either way. */
  const want = LIVE_PAGES.map((x) => x.path).filter((x) => x !== "/");
  console.log("\n  linked from the start page (after hydration)");
  let orphans = 0;
  for (const p of want) {
    const good = linked.has(p);
    if (!good) orphans++;
    console.log(`    ${ok(good)} ${p}`);
    if (!good) fail(`${p} is not linked from the start page - it is an orphan`);
  }
  if (!orphans) console.log(`    all ${want.length} routes reachable from /`);
  await page.close();
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
  "/archive/old3/index.html",
  "/archive/old3/kontakt.html",
  "/archive/old3/services/ai-tools.html",
  "/archive/site-apache/upload/index.html",
  "/archive/site-v3/index.html",
  "/old/upload/index.html",
  "/old 2/index.html",
  "/internal/TODO.md",
  "/tools/prerender.mjs",
  "/prodserve.py",
  "/HANDOFF.md",
  "/README.md",
  /* The v4 export. Its artboards carry a second copy of every headline on the
   * site, so a leak would put the studio in competition with itself. */
  "/mccain-design-system/McCain Digital v2.dc.html",
  "/mccain-design-system/content.json",
  "/mccain-design-system/readme.md",
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
