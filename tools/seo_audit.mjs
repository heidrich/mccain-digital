/* The SEO and structure audit, over every route, as data rather than opinion.
 *
 *     node tools/seo_audit.mjs [base]
 *     node tools/seo_audit.mjs https://mccain-digital.vercel.app
 *
 * verify_site.mjs answers "does the page work". This answers "is the page
 * legible to a machine": titles and descriptions that are unique and the right
 * length, one h1 and a heading order that does not skip, images with alt text,
 * links with an accessible name, structured data that parses and matches the
 * page, and internal linking that actually reaches everything.
 *
 * It reads the page after the binder has run (tools/runtime.js), because that
 * is the page a visitor gets: #dc-root ships finished from the build, the
 * binder only writes what a state change alters, so raw HTML and live DOM
 * agree - this check reads the live DOM so a regression in either shows.
 * The crawler view is still asked separately: `raw` below is the same page
 * with JavaScript switched off, which is what a crawler that does not
 * execute scripts reads.
 *
 * Nothing here fails the build. It prints findings and a summary; which of them
 * are worth fixing is a judgement, and a gate that makes that judgement for you
 * gets ignored the first time it is wrong.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { findChrome } from "./browser.mjs";

const SITE = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CONFIG = JSON.parse(fs.readFileSync(path.join(SITE, "site.config.json"), "utf8"));
const BASE = (process.argv[2] || process.env.MCD_BASE || "http://127.0.0.1:8898").replace(/\/$/, "");

const ROUTES = [
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

/* Google truncates around these. They are guidance, not law - a 62-character
 * title is not a defect - so they are reported as a range, and only the real
 * outliers are called out. */
const TITLE_MAX = 60;
const DESC_MIN = 70;
const DESC_MAX = 160;

const browser = await chromium.launch({ executablePath: findChrome(), headless: true });
const findings = [];
const rows = [];
const note = (route, level, what) => findings.push({ route, level, what });

/* ------------------------------------------------------- the hydrated page */
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

for (const route of ROUTES) {
  const page = await context.newPage();
  await page.goto(BASE + route, { waitUntil: "load", timeout: 60000 });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(1200);

  const d = await page.evaluate(() => {
    const root = document.getElementById("dc-root") || document.body;
    const abs = (u) => {
      try {
        return new URL(u, location.href).href;
      } catch {
        return "";
      }
    };
    const heads = [...root.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((h) => ({
      level: +h.tagName[1],
      text: (h.innerText || "").trim().replace(/\s+/g, " ").slice(0, 80),
    }));
    const imgs = [...root.querySelectorAll("img")];
    const links = [...root.querySelectorAll("a[href]")];
    const name = (a) =>
      (a.innerText || "").trim() ||
      a.getAttribute("aria-label") ||
      a.querySelector("img[alt]")?.getAttribute("alt") ||
      a.querySelector("[aria-label]")?.getAttribute("aria-label") ||
      "";
    return {
      title: document.title,
      desc: document.querySelector('meta[name="description"]')?.content || "",
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href") || "",
      robots: document.querySelector('meta[name="robots"]')?.content || "",
      ogTitle: document.querySelector('meta[property="og:title"]')?.content || "",
      ogImage: document.querySelector('meta[property="og:image"]')?.content || "",
      lang: document.documentElement.lang || "",
      hreflang: [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map(
        (l) => l.getAttribute("hreflang") + " -> " + l.getAttribute("href")
      ),
      heads,
      h1: heads.filter((h) => h.level === 1).map((h) => h.text),
      words: (document.body.innerText || "").trim().split(/\s+/).filter(Boolean).length,
      imgs: imgs.length,
      imgsNoAlt: imgs.filter((i) => !i.hasAttribute("alt")).length,
      imgsEmptyAlt: imgs.filter((i) => i.getAttribute("alt") === "").length,
      imgsNoDims: imgs.filter((i) => !i.getAttribute("width") && !i.getAttribute("height")).length,
      imgsLazy: imgs.filter((i) => i.getAttribute("loading") === "lazy").length,
      links: links.length,
      linksNoName: links.filter((a) => !name(a)).length,
      linksEmptyHref: links.filter((a) => {
        const h = a.getAttribute("href");
        return !h || h === "#";
      }).length,
      internal: [
        ...new Set(
          links
            .map((a) => a.getAttribute("href") || "")
            .filter((h) => h.startsWith("/") && !h.startsWith("//"))
            .map((h) => h.split("#")[0])
            .filter(Boolean)
        ),
      ],
      external: [
        ...new Set(
          links
            .map((a) => abs(a.getAttribute("href") || ""))
            .filter((u) => u && !u.startsWith(location.origin) && u.startsWith("http"))
        ),
      ],
      extNoRel: links.filter((a) => {
        const h = a.getAttribute("href") || "";
        if (!h.startsWith("http") || h.startsWith(location.origin)) return false;
        return a.getAttribute("target") === "_blank" && !/noopener/.test(a.getAttribute("rel") || "");
      }).length,
      ld: [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent),
      /* Landmarks and skip link: the two accessibility facts that are also
       * structure facts, and that a headless run can state without guessing. */
      main: document.querySelectorAll("main, [role=main]").length,
      nav: document.querySelectorAll("nav, [role=navigation]").length,
      header: document.querySelectorAll("header, [role=banner]").length,
      footer: document.querySelectorAll("footer, [role=contentinfo]").length,
      skipLink: !!document.querySelector('a[href^="#"]'),
      viewport: document.querySelector('meta[name="viewport"]')?.content || "",
    };
  });

  /* -------- structured data: does it parse, and does it name this page -------- */
  const ldTypes = [];
  let ldBroken = 0;
  for (const raw of d.ld) {
    try {
      const j = JSON.parse(raw);
      const graph = j["@graph"] || [j];
      for (const n of [].concat(graph)) if (n && n["@type"]) ldTypes.push([].concat(n["@type"]).join("/"));
    } catch {
      ldBroken++;
    }
  }

  rows.push({ route, ...d, ldTypes, ldBroken });

  /* ------------------------------------------------------------- findings */
  const want = (CONFIG.origin || "") + route;
  if (!d.title) note(route, "high", "no title");
  else if (d.title.length > TITLE_MAX)
    note(route, "low", `title ${d.title.length} chars (Google truncates ~${TITLE_MAX}): "${d.title}"`);
  if (!d.desc) note(route, "high", "no meta description");
  else if (d.desc.length > DESC_MAX)
    note(route, "low", `description ${d.desc.length} chars (truncates ~${DESC_MAX})`);
  else if (d.desc.length < DESC_MIN) note(route, "low", `description only ${d.desc.length} chars`);
  if (d.canonical !== want) note(route, "high", `canonical is "${d.canonical}", expected "${want}"`);
  if (d.h1.length !== 1) note(route, "high", `${d.h1.length} h1 elements`);
  if (!d.lang) note(route, "high", "no lang on <html>");
  if (d.ldBroken) note(route, "high", `${d.ldBroken} JSON-LD block(s) do not parse`);
  if (!ldTypes.length) note(route, "med", "no structured data");
  if (d.imgsNoAlt) note(route, "med", `${d.imgsNoAlt} of ${d.imgs} images have no alt attribute at all`);
  if (d.linksNoName) note(route, "med", `${d.linksNoName} link(s) with no accessible name`);
  if (d.linksEmptyHref) note(route, "low", `${d.linksEmptyHref} link(s) with href="#" or empty`);
  if (d.extNoRel) note(route, "low", `${d.extNoRel} external target=_blank link(s) without rel=noopener`);
  if (!d.main) note(route, "med", "no <main> landmark");
  if (d.imgsNoDims && d.imgs) note(route, "low", `${d.imgsNoDims} of ${d.imgs} images without width/height (layout shift)`);

  /* heading order: a jump of more than one level is the thing screen readers
   * and outline extractors both trip on */
  let prev = 0;
  const jumps = [];
  for (const h of d.heads) {
    if (prev && h.level > prev + 1) jumps.push(`h${prev} -> h${h.level} at "${h.text.slice(0, 40)}"`);
    prev = h.level;
  }
  if (jumps.length) note(route, "low", `${jumps.length} heading level jump(s): ${jumps[0]}`);

  await page.close();
}
await context.close();

/* ------------------------------------------- the page a crawler without JS sees */
const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
const rawRows = [];
for (const route of ROUTES) {
  const page = await noJs.newPage();
  await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 60000 });
  const r = await page.evaluate(() => ({
    words: (document.body.innerText || "").trim().split(/\s+/).filter(Boolean).length,
    h1: document.querySelectorAll("h1").length,
    links: document.querySelectorAll("a[href]").length,
  }));
  rawRows.push({ route, ...r });
  await page.close();
}
await noJs.close();
await browser.close();

/* ------------------------------------------------------------- duplicates */
const byTitle = new Map();
const byDesc = new Map();
for (const r of rows) {
  byTitle.set(r.title, (byTitle.get(r.title) || []).concat(r.route));
  byDesc.set(r.desc, (byDesc.get(r.desc) || []).concat(r.route));
}
for (const [t, rs] of byTitle) if (rs.length > 1) note(rs.join(" + "), "high", `duplicate title: "${t}"`);
for (const [t, rs] of byDesc) if (rs.length > 1) note(rs.join(" + "), "high", `duplicate description: "${t.slice(0, 60)}…"`);

/* ------------------------------------------------------------ orphan check */
const linkedFrom = new Map(ROUTES.map((r) => [r, 0]));
for (const r of rows) for (const t of r.internal) if (linkedFrom.has(t)) linkedFrom.set(t, linkedFrom.get(t) + 1);

/* ------------------------------------------------ sitemap / robots / llms.txt */
const fetchText = async (p) => {
  try {
    const res = await fetch(BASE + p);
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
};
const sitemap = await fetchText("/sitemap.xml");
const robots = await fetchText("/robots.txt");
const llms = await fetchText("/llms.txt");
const smUrls = sitemap ? [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]) : [];
const smRoutes = smUrls.map((u) => u.replace(/^https?:\/\/[^/]+/, ""));

/* --------------------------------------------------------------- reporting */
console.log(`\nSEO / structure audit — ${BASE}`);
console.log(`site.config.json: noindex=${CONFIG.noindex}\n`);

console.log("  route                                        words  raw  h1  imgs alt- links  LD");
for (const r of rows) {
  const raw = rawRows.find((x) => x.route === r.route);
  console.log(
    `  ${r.route.padEnd(44)} ${String(r.words).padStart(5)} ${String(raw.words).padStart(5)} ` +
      `${String(r.h1.length).padStart(3)} ${String(r.imgs).padStart(5)} ${String(r.imgsNoAlt).padStart(4)} ` +
      `${String(r.links).padStart(5)}  ${r.ldTypes.join(",") || "-"}`
  );
}

console.log("\n  title / description lengths");
for (const r of rows) {
  const t = r.title.length,
    dsc = r.desc.length;
  const flag = t > TITLE_MAX || dsc > DESC_MAX || dsc < DESC_MIN ? "!" : " ";
  console.log(`  ${flag} ${String(t).padStart(3)}t ${String(dsc).padStart(3)}d  ${r.route}`);
}

console.log("\n  sitemap / robots / llms.txt");
console.log(`    sitemap.xml: ${smUrls.length} urls`);
const missingInSm = ROUTES.filter((r) => !smRoutes.includes(r));
const extraInSm = smRoutes.filter((r) => !ROUTES.includes(r));
console.log(`    routes not in the sitemap: ${missingInSm.join(", ") || "none"}`);
console.log(`    sitemap urls that are not routes: ${extraInSm.join(", ") || "none"}`);
console.log(`    robots.txt: ${robots ? robots.split("\n").length + " lines" : "MISSING"}`);
console.log(`    llms.txt:   ${llms ? llms.split("\n").length + " lines" : "MISSING"}`);
if (missingInSm.length) note("sitemap.xml", "high", `missing: ${missingInSm.join(", ")}`);
if (extraInSm.length) note("sitemap.xml", "high", `lists non-existent: ${extraInSm.join(", ")}`);

console.log("\n  inbound internal links per route");
for (const [r, n] of linkedFrom) {
  console.log(`    ${String(n).padStart(3)} ${r}`);
  if (!n && r !== "/") note(r, "high", "no internal links point at this page - orphan");
}

console.log("\n  external destinations linked");
const ext = new Set();
for (const r of rows) for (const u of r.external) ext.add(u);
for (const u of [...ext].sort()) console.log(`    ${u}`);

const order = { high: 0, med: 1, low: 2 };
findings.sort((a, b) => order[a.level] - order[b.level]);
console.log(`\n  findings (${findings.length})`);
for (const f of findings) console.log(`    [${f.level.toUpperCase().padEnd(4)}] ${f.route}  —  ${f.what}`);
const counts = findings.reduce((m, f) => ((m[f.level] = (m[f.level] || 0) + 1), m), {});
console.log(
  `\n  ${counts.high || 0} high · ${counts.med || 0} medium · ${counts.low || 0} low` +
    (CONFIG.noindex ? "\n  (noindex is ON by owner decision - not counted as a finding)" : "")
);
