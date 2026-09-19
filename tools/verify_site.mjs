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
 * So this clicks. A page passes only if the runtime actually took over the
 * built markup and the interface responds.
 *
 * SECOND ROUND, 11.9.2026: this gate then reported "0 page errors" while the
 * owner was looking at a console holding seventy SVG complaints. `pageerror`
 * carries uncaught exceptions and nothing else - console.error and the
 * browser's own parse warnings never touch it. One channel says nothing about
 * the other, so both are watched now, and so is the pixel engine the owner had
 * to point out was missing.
 *
 * THIRD ROUND, 17.9.2026: React is gone. tools/v5build.mjs now renders every
 * page of tools/pages.mjs's PAGES ONCE, at build time, straight into the site
 * root (<route>/index.html, logic.gen.js, index.md); the page ships plain HTML
 * and CSS plus its own logic class, and tools/runtime.js binds that markup to the
 * class instead of a framework re-rendering it. There is no hydrateRoot to
 * watch any more, no <x-dc> live template, no window.ReactDOM, no
 * /support.js or /vendor/ at the root. So this gate now watches what replaced
 * all of it: that #dc-root already carries real markup in the server's own
 * response (checked with a plain fetch, before any browser runs a line of JS),
 * that <template id="dc-template"> stays inert (its nodes sit in
 * `.content`, a document fragment, never as live children), that
 * window.__v5 exists after boot with performance.mark("v5:mount") set, and
 * that nothing anywhere still asks for the retired paths. The old checks for
 * a second, duplicate hydration pass are gone with hydrateRoot; the duplicate
 * still worth catching is the build or the server serving the same route
 * twice into one page.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { findChrome } from "./browser.mjs";
import { PAGES } from "./pages.mjs";
import { checkOutputs, checkSources } from "./color_guard.mjs";

const SITE = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CONFIG = JSON.parse(fs.readFileSync(path.join(SITE, "site.config.json"), "utf8"));
const BASE = (process.argv[2] || process.env.MCD_BASE || "http://127.0.0.1:8898").replace(/\/$/, "");

/* All 21 routes of tools/pages.mjs's PAGES. Every one of them is built the
 * same way (tools/v5build.mjs) and bound by the same runtime
 * (tools/runtime.js), so there is no page here that only has to load - each one
 * gets the full page check below.
 *
 * Kept as a second, hand-written list rather than an import from PAGES: this
 * gate asking the same table the builder used would only ever confirm the
 * builder agrees with itself. A route that exists in one and not the other is
 * a finding. */
const LIVE_PAGES = [
  "/",
  "/leistungen/",
  "/leistungen/ki-automatisierung/",
  "/leistungen/web-apps/",
  "/leistungen/websites/",
  "/leistungen/individualsoftware/",
  "/leistungen/nextjs-entwicklung/",
  "/leistungen/mcp-server-entwickeln/",
  "/leistungen/rag-beratung/",
  "/leistungen/erp-integration/",
  "/vergleich/wordpress-oder-handgeschrieben/",
  "/vergleich/chatgpt-oder-eigenes-rag/",
  "/md-recall/",
  "/preise/",
  "/studio/",
  "/kontakt/",
  "/rechtliches/",
  "/styleguide/",
  "/news/",
  "/news/md-recall/",
  "/marke/",
];

/* The 404 is a hand-written page (its source is mccain-design-system/static/
 * since 19.9.2026, the build writes it), and the only one that must work
 * when the runtime does not. `indexable: false` exempts it from the
 * description/canonical checks: it is not a page that can be canonical to
 * anything, and demanding that of it would be a failing test asking for the
 * wrong thing. */
/* /coming-soon/ (18.9.2026) is what mccain-digital.com shows until the site
 * goes live - vercel.json redirects every page request on that host to it. It
 * is the one page that is indexable while the rest is not, so it is exempt from
 * the noindex switch: `robots: "index"` asserts the opposite of the switch. On
 * the vercel.app host the X-Robots-Tag header still keeps it out. */
const FLAT_PAGES = [
  { path: "/404.html", indexable: false },
  { path: "/coming-soon/", robots: "index" },
];

/* Which routes must carry a contact form that is actually wired. The build
 * puts one on every page; these are the two a visitor is sent to. */
const FORM_PAGES = ["/", "/kontakt/"];

const ok = (b) => (b ? "ok  " : "FAIL");
let failures = 0;
const fail = (msg) => {
  failures++;
  console.log("      " + msg);
};

/* A colour is written in ONE place (19.9.2026). The build refuses a literal
 * already; this repeats it before a push, for a hand edit after the build. */
{
  const found = [...checkSources(), ...checkOutputs()];
  console.log(`${ok(!found.length)} colours: every source writes tokens, every shipped file carries resolved values`);
  for (const f of found.slice(0, 12)) fail(f);
}

const executablePath = findChrome();
if (!executablePath) {
  console.error("no chromium under the ms-playwright cache - npx playwright install chromium");
  process.exit(2);
}
const browser = await chromium.launch({ executablePath, headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

/* DID THE RUNTIME BOOT?
 *
 * tools/runtime.js splits its start into three tasks (compile the template, bind
 * the live DOM, mount) so that no single one blocks the main thread for long -
 * see "THE START IS THREE TASKS, NOT ONE" in runtime.js. That means
 * window.__v5 is not there the instant the page loads; this polls for it and
 * for the performance mark the runtime sets right after mount, instead of a
 * fixed sleep that would either race a slow machine or waste time on a fast
 * one. */
async function waitForV5(page, timeout = 8000) {
  return page
    .waitForFunction(() => window.__v5 && performance.getEntriesByName("v5:mount").length > 0, null, { timeout })
    .then(() => true)
    .catch(() => false);
}

async function load(url, { scroll = false } = {}) {
  const page = await context.newPage();
  const errs = [];
  const noise = [];
  const hosts = new Map();
  const urls = [];
  const bad = [];
  let headers = {};
  page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
  /* The channel this gate used to be deaf to. */
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") noise.push(`${m.type()}: ${m.text()}`);
  });
  page.on("request", (r) => {
    urls.push(r.url());
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
  await page.waitForTimeout(400);
  if (scroll) {
    /* Anything only reached by scrolling complains only once it is asked to
     * paint, so the sweep is part of the measurement, not a nicety. It is
     * also the reason the pixel-engine check below is safe to run before this:
     * window.scrollTo fires no pointer event, so it cannot arm the engine by
     * accident (see armPixels in tools/runtime.js). */
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
  return { page, errs, noise, hosts, urls, bad, headers };
}

/* Every host except the one the page itself came from. Written this way rather
 * than "not localhost", because that version reported the production domain as
 * a third party and hid the answer it was asked for. */
function foreign(hosts, url) {
  const self = new URL(url).host;
  return [...hosts.keys()].filter((h) => h !== self);
}

/* Same-origin, but retired: the paths a leftover reference to the old
 * React build would still ask for. A request here does not need a foreign
 * host to be wrong - /support.js and /vendor/ 404 on this server on purpose. */
const FORBIDDEN_PATH = /^\/(support\.js$|vendor\/|_dcbuild\/)/;
function forbiddenRequests(urls, url) {
  const self = new URL(url).origin;
  return urls.filter((u) => {
    try {
      const uu = new URL(u);
      return uu.origin === self && FORBIDDEN_PATH.test(uu.pathname);
    } catch {
      return false;
    }
  });
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
for (const p of LIVE_PAGES) {
  const url = BASE + p;

  /* THE SERVER HTML, WITH NO BROWSER AT ALL. A plain fetch is what a crawler
   * or a language model gets: if #dc-root is empty here, the page is inert
   * until a script runs, no matter what a browser later shows. The closing
   * </div> of #dc-root is found by walking backwards from <template
   * id="dc-template">, which always follows it directly in the markup
   * tools/v5build.mjs writes (the form-delivery script and any body scripts in
   * between are plain <script> tags, never a </div>) - simpler and just as
   * exact as balancing every tag by hand. */
  let raw = "";
  try {
    raw = await (await fetch(url)).text();
  } catch (e) {
    fail(`${p}: could not be fetched (${e.message})`);
    continue;
  }
  const ROOT_OPEN = '<div id="dc-root">';
  const rootIdx = raw.indexOf(ROOT_OPEN);
  const tplIdx = raw.indexOf('<template id="dc-template">');
  const rootCloseIdx = tplIdx > rootIdx ? raw.lastIndexOf("</div>", tplIdx) : -1;
  const rawInner = rootIdx >= 0 && rootCloseIdx > rootIdx ? raw.slice(rootIdx + ROOT_OPEN.length, rootCloseIdx) : "";
  const rawEls = (rawInner.match(/<[a-zA-Z][\w-]*[ >]/g) || []).length;
  const rawHasXdc = /<x-dc[ >]/.test(raw);

  const { page, errs, noise, hosts, urls, bad, headers } = await load(url, { scroll: true });
  const booted = await waitForV5(page);

  const boot = await page.evaluate(() => {
    const root = document.getElementById("dc-root");
    const tpl = document.getElementById("dc-template");
    const v5 = window.__v5;
    return {
      /* One copy of the page, not two: the build or the server serving the
       * same route's markup twice into one document. */
      scHosts: root ? root.querySelectorAll(":scope > .sc-host").length : 0,
      rootEls: root ? root.getElementsByTagName("*").length : 0,
      xdc: !!document.querySelector("x-dc"),
      hasTemplate: !!tpl,
      /* Inert means the template's nodes live in .content, a DocumentFragment
       * the parser never renders or executes - not as children of the
       * element itself. */
      templateInert: !!tpl && tpl.childNodes.length === 0 && !!tpl.content && tpl.content.childNodes.length > 0,
      h1: document.querySelectorAll("h1").length,
      words: (document.body.innerText || "").trim().split(/\s+/).length,
      hasReact: typeof window.React !== "undefined",
      mounted: !!(v5 && v5.logic),
      adopted: v5 ? v5.stats.adopted : 0,
      missing: v5 ? v5.stats.missing.length : -1,
      missingSample: v5 ? v5.stats.missing.slice(0, 3) : [],
      mark: performance.getEntriesByName("v5:mount").length,
      alternate: document.querySelector('link[rel="alternate"][type="text/markdown"]')?.getAttribute("href") || "",
      /* The same icon twice, side by side: the runtime inserted element
       * content next to the build's copy instead of replacing it - every icon
       * tile of /leistungen/ki-automatisierung/ showed this, live, until
       * 19.9.2026 (bindText adopted nothing for a list still empty at bind). */
      doubled: [...document.querySelectorAll("#dc-root *")].filter((el) => {
        const k = el.children;
        for (let i = 1; i < k.length; i++) {
          const a = k[i - 1];
          if ((a.tagName === "svg" || a.tagName === "IMG") && !a.hasAttribute("data-dc-tpl") && a.outerHTML === k[i].outerHTML) return true;
        }
        return false;
      }).length,
    };
  });

  /* PIXEL HOVER EFFECTS LOAD ON A REAL MOUSE MOVE, AND NOT BEFORE. armPixels()
   * in tools/runtime.js arms a pointermove listener and only then appends
   * <script src="/pixel-engine.js"> - 42 KB nobody on a touch screen or with
   * reduced motion ever needs to parse. Checked before AND after a real move,
   * so a page that loads it eagerly and one that never loads it are both
   * caught. */
  const pixelsBefore = urls.some((u) => u.includes("/pixel-engine.js"));
  await page.mouse.move(300, 320);
  await page.mouse.move(340, 300);
  await page.waitForTimeout(600);
  const pixelsAfter = urls.some((u) => u.includes("/pixel-engine.js"));

  /* SETTLE THE ENTRANCE ANIMATIONS BEFORE COUNTING THEM. A content-visibility
   * block's reveal is a real, finite, staggered CSS animation (zf-deep-in and
   * friends, ~1.1s with up to ~1.2s of delay per element) - not the infinite
   * per-cell loop the brand-mark check below exists to catch. Measuring right
   * after the scroll sweep caught two dozen of these mid-flight on /marke/,
   * which shows many mark instances at once and so many staggered reveals - a
   * false failure from this gate's own timing, not the page. Waiting for
   * every animation on the page to leave "running" (capped, so a genuinely
   * infinite one still gets caught below instead of hanging this gate) settles
   * that before the brand mark is asked whether it is STILL animating. */
  await page
    .waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running"), null, { timeout: 3000 })
    .catch(() => {});

  const robots = await robotsOf(page);
  const rb = checkRobots(p, robots, headers);
  if (headerSeen === null) headerSeen = rb.headerSaysNo;

  const ext = foreign(hosts, url);
  const forbidden = forbiddenRequests(urls, url);
  console.log(`  ${p}`);
  console.log(`    ${ok(rawEls > 20)} #dc-root already has markup in the server's own HTML (${rawEls} elements, no browser)`);
  console.log(`    ${ok(!rawHasXdc)} no <x-dc> in the server HTML`);
  console.log(`    ${ok(booted && boot.mounted)} window.__v5 mounted, v5:mount seen (${boot.mark} mark(s))`);
  console.log(`    ${ok(boot.adopted > 0 && boot.missing === 0)} the binder adopted ${boot.adopted} template node(s), ${boot.missing} missing`);
  console.log(`    ${ok(boot.scHosts === 1)} one copy of the page (${boot.scHosts})`);
  console.log(`    ${ok(!boot.doubled)} no icon rendered twice (${boot.doubled})`);
  console.log(`    ${ok(boot.hasTemplate && boot.templateInert)} template delivered inert`);
  console.log(`    ${ok(!boot.xdc)} no live <x-dc> subtree in the DOM`);
  console.log(`    ${ok(!boot.hasReact)} no window.React`);
  console.log(`    ${ok(boot.h1 === 1)} exactly one h1 (${boot.h1})`);
  /* A page is prose, not decoration: the smallest page (/news/) carries ~150
   * words. Until 17.9.2026 this line said FAIL under 400 words without ever
   * failing the run - eight pages wore a badge that meant nothing. */
  console.log(`    ${ok(boot.words > 100)} ${boot.words} words of visible text`);
  if (boot.words <= 100) fail(`${p}: only ${boot.words} words of visible text - the page is decoration, not prose`);
  console.log(`    ${ok(!pixelsBefore && pixelsAfter)} pixel engine loads on the first mouse move, not before`);
  console.log(`    ${ok(boot.alternate === p + "index.md")} markdown twin announced ("${boot.alternate}")`);
  console.log(`    ${ok(!errs.length)} ${errs.length} page errors`);
  console.log(`    ${ok(!noise.length)} ${noise.length} console errors/warnings`);
  console.log(`    ${ok(!ext.length)} ${ext.length} third-party hosts${ext.length ? ": " + ext.join(", ") : ""}`);
  console.log(`    ${ok(!forbidden.length)} ${forbidden.length} request(s) for a retired path${forbidden.length ? ": " + forbidden.join(", ") : ""}`);
  console.log(`    ${ok(!bad.length)} ${bad.length} failed requests`);

  /* ONE OF EACH. Nothing writes to <head> after the build any more - there is
   * no client-side helmet, no runtime that re-renders the page - so this
   * checks a static invariant of what tools/v5build.mjs wrote, on the page as
   * a browser actually receives it. Still worth asking after boot rather than
   * trusting the build: a future change that runs script during boot could
   * still touch the head, and this would be the only thing to notice. */
  const dupes = await page.evaluate(() => ({
    title: document.querySelectorAll("title").length,
    canonical: document.querySelectorAll('link[rel="canonical"]').length,
    description: document.querySelectorAll('meta[name="description"]').length,
    ogUrl: document.querySelectorAll('meta[property="og:url"]').length,
  }));
  const dupeList = Object.entries(dupes).filter(([, n]) => n > 1);
  console.log(`    ${ok(!dupeList.length)} one title/canonical/description/og:url${dupeList.length ? ": " + dupeList.map(([k, n]) => `${n}× ${k}`).join(", ") : ""}`);

  /* THE LANDMARKS.
   *
   * No page had a <main> before 12.9.2026 - the sections sat as siblings
   * between <header> and <footer>, so "skip to main content" had nothing to
   * skip to. The build wraps both copies now, and this is the half that
   * matters: the prerendered copy is thrown away a moment after load, so a
   * <main> that only exists there is a <main> that vanishes.
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
  console.log(`    ${ok(marks.mains === 1 && !marks.hasFooterInside && marks.hasSkipTarget && marks.banner === 1)} one <main> around the content, one banner (${marks.mains} main, ${marks.banner} banner)`);
  console.log(`    ${ok(marks.logoAnim === 0)} brand mark static (${marks.logos} marks, ${marks.logoAnim} running animations)`);
  console.log(`    ${ok(!marks.underStream.length)} no background layer over the stream${marks.underStream.length ? ": " + marks.underStream.join(", ") : ""}`);
  console.log(`    ${ok(true)} robots: "${robots}"${rb.headerSaysNo ? " + X-Robots-Tag" : ""}`);
  /* A CSP violation is a console error, and console errors already fail this
   * gate - so the policy being WRONG is caught above. This asks the other
   * question: whether it is there at all, and whether it still needs
   * 'unsafe-eval'. It does not, since 17.9.2026: support.js used to compile the
   * page's class through new Function(); logic.gen.js ships it as a plain
   * script instead, so an 'unsafe-eval' back in the policy means something
   * started evaluating code again. Both prodserve.py and Vercel read the
   * policy out of vercel.json, so the answer is the same locally and in
   * production. */
  const csp = headers["content-security-policy"] || "";
  const cspHashes = (csp.match(/'sha256-/g) || []).length;
  console.log(`    ${ok(!!csp && !/unsafe-eval/.test(csp))} CSP present, no 'unsafe-eval' (${cspHashes} script hash(es))`);

  /* The same threshold the line above prints: the smallest page carries a
   * few hundred elements, so 20 or fewer means the build wrote a stub. */
  if (rawEls <= 20) fail(`${p}: #dc-root has ${rawEls} element(s) in the server's own HTML - the build did not write the page, or it is not being served`);
  if (rawHasXdc) fail(`${p}: the server HTML still contains <x-dc> - the old React stage shipped instead of the build`);
  if (!booted || !boot.mounted) fail(`${p}: window.__v5 never appeared - the runtime did not boot`);
  if (boot.mark === 0) fail(`${p}: no performance mark "v5:mount" - see boot()/mount() in tools/runtime.js`);
  if (boot.mounted && !boot.adopted) fail(`${p}: window.__v5.stats.adopted is 0 - the binder found nothing to bind to`);
  if (boot.missing > 0) fail(`${p}: ${boot.missing} template node(s) the binder expected but did not find in the DOM (e.g. ${boot.missingSample.join(", ")})`);
  if (boot.scHosts !== 1) fail(`${p}: ${boot.scHosts} copies of the page's root in #dc-root, expected 1`);
  if (boot.doubled) fail(`${p}: ${boot.doubled} element(s) show the same icon twice side by side - see bindText() in tools/runtime.js`);
  if (!boot.hasTemplate) fail(`${p}: no #dc-template - the build stopped shipping the template`);
  if (boot.hasTemplate && !boot.templateInert) fail(`${p}: #dc-template is not inert - its content is not sitting in .content the way a <template> should`);
  if (boot.xdc) fail(`${p}: a live <x-dc> element exists in the DOM - the template is being parsed as markup`);
  if (boot.hasReact) fail(`${p}: window.React is defined - something is loading React again`);
  if (boot.h1 !== 1) fail(`${p}: ${boot.h1} h1 elements`);
  if (pixelsBefore) fail(`${p}: /pixel-engine.js was requested before any mouse movement`);
  if (!pixelsAfter) fail(`${p}: /pixel-engine.js was never requested after a real mouse move - see armPixels in tools/runtime.js`);
  if (boot.alternate !== p + "index.md") fail(`${p}: the markdown alternate link points at "${boot.alternate}", expected "${p}index.md"`);
  if (!csp) fail(`${p}: no Content-Security-Policy header`);
  if (/unsafe-eval/.test(csp)) fail(`${p}: the CSP still allows 'unsafe-eval' - nothing in the v5 build should need it any more`);
  if (marks.mains !== 1) fail(`${p}: ${marks.mains} <main> - the landmark did not survive the build`);
  if (marks.hasFooterInside) fail(`${p}: the <footer> is inside <main>`);
  if (!marks.hasSkipTarget) fail(`${p}: the skip link's target is not inside <main>`);
  if (marks.banner !== 1) fail(`${p}: ${marks.banner} banner landmarks - a <header> outside <main> that is not the masthead`);
  if (marks.logoAnim) fail(`${p}: the brand mark is running ${marks.logoAnim} animations - the static patch missed (see MARK_FROM in prerender.mjs)`);
  for (const band of marks.underStream) {
    fail(`${p}: "${band}" is deferred with a background layer inside - its ground paints over the pixel stream (see deferSections in prerender.mjs)`);
  }
  for (const [k, n] of dupeList)
    fail(`${p}: ${n} <${k}> on the page`);
  if (errs.length) fail(`${p}: ${errs[0].slice(0, 150)}`);
  for (const n of noise.slice(0, 6)) fail(`${p}: console ${n.slice(0, 140)}`);
  if (noise.length > 6) fail(`${p}: ...and ${noise.length - 6} more console messages`);
  for (const h of ext) fail(`${p}: contacts ${h}`);
  for (const u of forbidden) fail(`${p}: requested a retired path: ${u}`);
  for (const b of bad.slice(0, 5)) fail(`${p}: ${b}`);
  await page.close();
}

/* THE INTERACTIVE CORE, ONCE. Every route shares the same header, search
 * overlay and binder (tools/runtime.js); tools/v5probe.mjs re-proves all of it
 * per route - mega menu, search, language, FAQ, consent, mobile menu - as its
 * own, more thorough pass. This gate only needs one belastbaren Kern before a
 * push: that hovering the nav opens the mega menu, that Cmd/Ctrl+K opens the
 * search, and that a tile still opens a dialog - the three things a visitor
 * notices first if the binder silently failed to wire an event. */
{
  console.log("\n  the interactive core (start page)");
  const url = BASE + "/";
  const { page, errs, noise } = await load(url);
  const booted = await waitForV5(page);
  if (!booted) fail("/: window.__v5 never appeared - cannot test the interactive core");

  const nav = page.locator('#dc-root header [data-nav-item="services"], #dc-root header [data-nav-item]').first();
  let menuOk = false;
  let menuInfo = null;
  if (await nav.count()) {
    await nav.hover();
    await page.waitForTimeout(500);
    menuInfo = await page.evaluate(() => {
      const panel = document.querySelector("[data-v5-panel]");
      return panel ? { open: panel.hasAttribute("data-v5-open"), h: panel.getBoundingClientRect().height, op: getComputedStyle(panel).opacity } : null;
    });
    menuOk = !!menuInfo && menuInfo.open && menuInfo.h > 100 && menuInfo.op !== "0";
  }
  console.log(`    ${ok(menuOk)} mega menu opens on hover${menuInfo ? ` (${Math.round(menuInfo.h)}px, opacity ${menuInfo.op})` : " (no [data-v5-panel] found)"}`);
  if (!menuOk) fail("/: hovering the nav did not open the mega menu");

  await page.keyboard.press(process.platform === "darwin" ? "Meta+k" : "Control+k");
  await page.waitForTimeout(400);
  const search = await page.evaluate(() => ({
    on: !!(window.__v5 && window.__v5.logic.state.searchOn),
    focused: document.activeElement && document.activeElement.tagName === "INPUT",
  }));
  console.log(`    ${ok(search.on && search.focused)} Cmd/Ctrl+K opens the search and focuses it`);
  if (!search.on) fail("/: Cmd/Ctrl+K did not open the search");
  else if (!search.focused) fail("/: the search opened but the input has no focus");
  if (search.on) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    const closed = await page.evaluate(() => !(window.__v5 && window.__v5.logic.state.searchOn));
    console.log(`    ${ok(closed)} Escape closes the search`);
    if (!closed) fail("/: Escape did not close the search");
  }

  /* a tile must open a dialog */
  const tile = page.locator("#services button, #services [role='button']").first();
  let modalOk = false;
  if (await tile.count()) {
    await tile.click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(800);
    modalOk = await page.evaluate(() => document.querySelectorAll('[role="dialog"],[aria-modal="true"]').length > 0);
  }
  console.log(`    ${ok(modalOk)} a service tile opens a dialog`);
  if (!modalOk) fail("/: a service tile opens nothing");

  console.log(`    ${ok(!errs.length)} ${errs.length} page errors`);
  console.log(`    ${ok(!noise.length)} ${noise.length} console errors/warnings`);
  if (errs.length) fail(`/: ${errs[0].slice(0, 150)}`);
  for (const n of noise.slice(0, 6)) fail(`/: console ${n.slice(0, 140)}`);
  await page.close();
}

/* THE FORMS ACTUALLY SEND.
 *
 * The contact sender is no longer a React handler - it is the inline
 * `<script>/* contact delivery ...` tools/prerender.mjs injects in the body,
 * allowed by its own CSP hash, posting to https://api.web3forms.com. So this
 * drives a real submit: the request to Web3Forms is intercepted and answered
 * with success (nothing leaves this machine), and the page must show it
 * arrived. A page that only claims success without a request - or one where
 * the delivery script is missing entirely - fails here rather than in front
 * of a visitor. Whether a message really leaves the browser in production,
 * past Web3Forms' own bot check, is tools/form_probe.mjs. */
{
  console.log("\n  contact forms actually deliver");
  for (const p of FORM_PAGES) {
    const url = BASE + p;
    const page = await context.newPage();
    const errs = [];
    page.on("pageerror", (e) => errs.push(e.message));
    await page.route("https://api.web3forms.com/submit", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, message: "verify_site" }) })
    );
    await page.goto(url, { waitUntil: "load" });
    await waitForV5(page);

    const has = await page.evaluate(() => ({
      script: document.body.innerHTML.includes("/* contact delivery"),
      form: !!document.querySelector('#dc-root form:has(input[name="company"])'),
    }));
    console.log(`    ${ok(has.script)} ${p} carries the contact-delivery script`);
    console.log(`    ${ok(has.form)} ${p} has a form with the honeypot field`);
    if (!has.script) fail(`${p}: no contact-delivery script - the form cannot send anything`);
    if (!has.form) {
      fail(`${p}: no <form> with a "company" honeypot field`);
      await page.close();
      continue;
    }

    const form = page.locator('#dc-root form:has(input[name="company"])').first();
    await form.scrollIntoViewIfNeeded();
    const fields = await form.locator("input:not([type=hidden]):not([name=company]):not([type=submit]), textarea").all();
    for (const f of fields) {
      const type = (await f.getAttribute("type")) || "text";
      const name = (await f.getAttribute("name")) || "";
      const val =
        type === "email" || /mail/.test(name) ? "verify@example.com" :
        type === "tel" || /tel|phone/.test(name) ? "+49 89 123456" :
        /name/.test(name) ? "Verify Site" : "verify_site";
      await f.fill(val).catch(() => {});
    }
    const req = page.waitForRequest((r) => /web3forms/.test(r.url()), { timeout: 4000 }).catch(() => null);
    const submit = form.locator('[type="submit"]');
    if (await submit.count()) await submit.first().click();
    else await form.evaluate((f) => f.requestSubmit());
    const sent = await req;
    await page.waitForTimeout(600);
    const sentOk = await page.evaluate(() => !!(window.__v5 && window.__v5.logic.state.formSent));
    console.log(`    ${ok(!!sent)} ${p} submitting sends a request to Web3Forms`);
    console.log(`    ${ok(sentOk)} ${p} shows the success state once Web3Forms answers`);
    if (!sent) fail(`${p}: submitting the form sent no request to Web3Forms`);
    else {
      if (!/access_key/.test(sent.postData() || "")) fail(`${p}: the request to Web3Forms carries no access_key`);
      if (!sentOk) fail(`${p}: Web3Forms answered success but the page never showed it`);
    }
    if (errs.length) fail(`${p}: ${errs[0].slice(0, 150)}`);
    await page.close();
  }
}

for (const { path: p, indexable = true, form = false, robots: robotsWant } of FLAT_PAGES) {
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
  if (robotsWant === "index") {
    if (/noindex/i.test(robots)) fail(`${p}: must stay indexable, the page says "${robots}"`);
  } else checkRobots(p, robots, headers);
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
 * written by tools/v5build.mjs next to every route in tools/pages.mjs's PAGES
 * - at <route>index.md, a sibling of <route>index.html, not under /v5/ any
 * more - and must come back as text/markdown: a twin that 404s, or arrives as
 * text/plain because a host rule is missing, is invisible to the model and to
 * the workshop's crawler view alike, and nothing on the page would look
 * different. Checked for all 21 routes, not just the start page - v5build.mjs
 * writes one twin per route, and a single route regressing would look exactly
 * like this section passing if only "/" were asked. */
console.log("\n  markdown twins");
for (const { route } of PAGES) {
  const p = `${route}index.md`;
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
 * start page, in the markup the server sends - not just present in the
 * sitemap. A page can answer 200 and still be an orphan that no reader ever
 * arrives at. The four service pages and the contact page were exactly that
 * until the footer stopped opening modals and started linking. */
{
  const url = BASE + "/";
  const { page } = await load(url);
  await waitForV5(page);
  const hrefs = await page.evaluate(() => {
    const root = document.getElementById("dc-root") || document.body;
    return [...root.querySelectorAll("a[href]")].map((a) => a.getAttribute("href"));
  });
  const norm = (h) =>
    h.replace(/^https?:\/\/[^/]+/, "").replace(/[#?].*$/, "").replace(/\/?$/, "/");
  const linked = new Set(hrefs.map(norm));
  /* Every route except the start page itself has to be arrivable from it -
   * directly or through the mega menu, which is in the markup either way. */
  const want = LIVE_PAGES.filter((x) => x !== "/");
  console.log("\n  linked from the start page");
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
 * path, some cache or rewrite is still serving it.
 *
 * The v5 migration (17.9.2026) added six more. Only files, deliberately, never
 * a bare directory: prodserve.py answers a directory with no index.html with a
 * DIRECTORY LISTING (200, checked by hand against /v5/ - it lists dev/ and
 * runtime.js), which Vercel would not do, so a bare "/v5/" would pass locally
 * and fail nowhere real, or the reverse - neither is a check worth having.
 * Every path below is a file that plainly does not exist anywhere any more
 * (/support.js, both /vendor/react*.js, /v5/index.html, /v5/index.md,
 * /v5/logic.gen.js - the whole point of the migration) or one that only
 * exists as build-stage output under _dcbuild/, on disk locally but excluded
 * from the deploy by .vercelignore - which is exactly why this whole section,
 * new entries included, only ever runs against a real deployed base. */
const MUST_404 = [
  "/archive/old3/index.html",
  "/archive/old3/kontakt.html",
  "/archive/old3/services/ai-tools.html",
  "/archive/site-apache/upload/index.html",
  "/archive/site-v3/index.html",
  "/archive/site-react/index.html",
  "/archive/site-react/support.js",
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
  /* The retired React build: nothing here should ever be fetched again. */
  "/support.js",
  "/vendor/react-18.3.1.production.min.js",
  "/vendor/react-dom-18.3.1.production.min.js",
  "/_dcbuild/support.js",
  "/_dcbuild/react/index.html",
  "/v5/index.html",
  "/v5/index.md",
  "/v5/logic.gen.js",
  "/v5/runtime.js",
  "/tools/runtime.js",
  "/v5/dev/index.js",
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
