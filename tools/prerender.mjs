/* Build the production index.html from the design component.
 *
 *   node tools/prerender.mjs            (dev server must be on :8898)
 *
 * WHY THIS EXISTS
 * The page shipped by Claude Design is a client-rendered component: 838
 * template placeholders, and every word of copy lives in content.json. Measured
 * on the export, a crawler that does not run JavaScript reads 145 words of
 * decoration - no headline, no title, no prose. Rendered, the same page carries
 * 1,893. Google executes JS and would eventually see the second number; social
 * previews, Bing's non-rendering pass and every AI crawler see the first.
 *
 * So this renders the page once, in a real browser, and writes the settled DOM
 * out as static HTML. support.js still ships and still takes over on load, so
 * the modals, the DE/EN switch, the console and the pixel stream keep working -
 * the snapshot is what everything else reads, and what paints first.
 *
 * It also removes the two third-party origins the export depends on. React
 * comes from vendor/ via support.js's own window.__resources hook (no patching
 * of support.js needed, and the SRI hashes still match because the bytes are
 * the same), and the fonts come from fonts/. See tools/vendor_assets.py for the
 * legal reason that is not optional here.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launch, open, settle } from "./browser.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.dirname(HERE);
const SRC = "http://127.0.0.1:8898/mccain-design-system/reference/index.html";
const BRAND_SRC =
  "http://127.0.0.1:8898/mccain-design-system/reference/McCain%20Digital%20Brand%20Guide.dc.html";
const ORIGIN = "https://mccain-digital.com";

const TITLE = "McCain Digital — KI-Tools, Web-Apps und Websites aus Bayern";
const DESC =
  "Digital-Produktstudio in Bayern: KI-Werkzeuge auf Ihren eigenen Daten, " +
  "Web-Apps, Websites und Unternehmenssoftware. Antwort in 24 Stunden, " +
  "Festpreis in 48.";
const OG_ALT =
  "mccain digital — das Pixelstrom-Zeichen auf dunklem Grund";

/* The hero headline ROTATES through heroWords.de, so whichever variant happens
 * to be on screen when the snapshot is taken becomes the indexed h1 - a
 * different one on every build. Wait for the first line instead. If the copy
 * ever changes this throws rather than quietly indexing a different promise,
 * which is the right failure: which sentence Google shows is a decision, not a
 * race. Source: heroWords.de[0] in the design component. */
const HERO_H1 = "KI-Tools, die auf Ihren Daten laufen.";

/* Everything the built page loads at runtime, copied from the export so the
 * site root is self-contained and nothing reaches into mccain-design-system/
 * (which is .vercelignore'd and must not be part of a deploy). */
const ASSETS = {
  "mccain-design-system/reference/support.js": "support.js",
  "mccain-design-system/reference/content.json": "content.json",
  "mccain-design-system/reference/pixel-engine.js": "pixel-engine.js",
  "mccain-design-system/reference/img": "img",
  "mccain-design-system/reference/team": "team",
  "mccain-design-system/brand": "brand",
};

/* The two CDN urls support.js asks for, mapped onto the copies in vendor/.
 * cdnScriptFor() consults window.__resources before falling back to the CDN,
 * so this is the supported override rather than a patch of a vendored file. */
const RESOURCE_MAP = {
  "https://unpkg.com/react@18.3.1/umd/react.production.min.js":
    "vendor/react-18.3.1.production.min.js",
  "https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js":
    "vendor/react-dom-18.3.1.production.min.js",
};

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* ---------------------------------------------------------------- render */

const { browser, context } = await launch(1440, 900);
const page = await open(context, SRC);
await page.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
await settle(page);

/* Sections reveal on scroll. Anything never scrolled past is snapshotted in
 * its pre-reveal state, so walk the whole page before taking the picture. */
await page.evaluate(async () => {
  const step = window.innerHeight;
  for (let y = 0; y < document.body.scrollHeight; y += step) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 230));
  }
  window.scrollTo(0, 0);
});
await page.waitForTimeout(1400);

/* Land on the canonical hero line before taking the picture. The grab happens
 * in the same evaluate as the check, and the result is verified afterwards,
 * because the rotation keeps running between two separate round-trips. */
let html = null;
for (let attempt = 1; attempt <= 6 && html === null; attempt++) {
  await page
    .waitForFunction(
      (want) => (document.querySelector("h1")?.innerText || "").trim() === want,
      HERO_H1,
      { timeout: 20000 }
    )
    .catch(() => {});
  const got = await page.evaluate((want) => {
    const h1 = (document.querySelector("h1")?.innerText || "").trim();
    return h1 === want ? document.documentElement.outerHTML : null;
  }, HERO_H1);
  if (got) html = got;
  else console.log(`  hero rotated away between check and grab, retry ${attempt}`);
}
if (html === null) {
  throw new Error(
    `prerender: never caught the hero on "${HERO_H1}". ` +
      `Has heroWords.de[0] changed? Update HERO_H1 deliberately.`
  );
}

/* Pull the facts for the structured data OUT OF THE RENDERED PAGE rather than
 * retyping them here. Schema.org markup that disagrees with the visible text is
 * a manual action waiting to happen, and a second copy of the copy would drift
 * the first time content.json changes. */
const facts = await page.evaluate(() => {
  const faq = [];
  const faqSection = document.querySelector("#faq");
  if (faqSection) {
    for (const btn of faqSection.querySelectorAll("button[aria-expanded]")) {
      const q = (btn.innerText || "").trim();
      /* the answer is the sibling panel the button controls */
      let panel = btn.nextElementSibling;
      const a = panel ? (panel.innerText || "").trim() : "";
      if (q && a && a.length > 40) faq.push({ q, a });
    }
  }
  const services = [...document.querySelectorAll("#services h3")]
    .map((h) => (h.innerText || "").trim())
    .filter(Boolean);
  return {
    faq,
    services,
    h1: (document.querySelector("h1")?.innerText || "").trim(),
    words: (document.body.innerText || "").trim().split(/\s+/).length,
  };
});

/* ------------------------------------------------------- the og:image ---- */
/* Rendered from the brand SVG rather than kept as a second hand-made file:
 * social platforms will not accept SVG, and a PNG checked in by hand goes
 * stale the moment the mark changes. */
const ogPage = await context.newPage();
await ogPage.setViewportSize({ width: 1200, height: 630 });
await ogPage.goto("http://127.0.0.1:8898/mccain-design-system/brand/mccain-og-dark.svg", {
  waitUntil: "networkidle",
});
await ogPage.screenshot({ path: path.join(SITE, "og-image.png") });
await ogPage.close();
await browser.close();

/* --------------------------------------------------------------- rewrite */

const before = html.length;
const swap = (re, to, label, min = 1) => {
  const n = (html.match(re) || []).length;
  if (n < min) throw new Error(`prerender: expected >=${min} ${label}, found ${n}`);
  html = html.replace(re, to);
  return n;
};

/* the page sits one folder below the brand assets in the export; at the site
 * root it sits beside them */
const nBrand = swap(/\.\.\/brand\//g, "brand/", "../brand/ paths");
/* support.js is referenced ./support.js from the export */
html = html.replace(/(["'])\.\/support\.js\1/g, "$1support.js$1");

/* drop the two google-fonts origins entirely - preconnect included, or the
 * browser still opens a connection to a host we no longer use */
const nFont = swap(
  /\s*<link[^>]+fonts\.(?:googleapis|gstatic)\.com[^>]*>/g,
  "",
  "google-font links"
);

/* the CDN react tags support.js injected during the render: the live page
 * re-injects them from window.__resources, so the snapshot must not ship a
 * second, remote copy */
const nReact = swap(
  /\s*<script[^>]+unpkg\.com[^>]*><\/script>/g,
  "",
  "unpkg script tags",
  0
);

/* The component links to itself with absolute production URLs. On localhost and
 * on a Vercel preview those jump straight to the live domain, so the thing you
 * are trying to test is the one page you can never reach. Root-relative keeps
 * the same target in production and makes previews testable. */
const nAbs = swap(
  new RegExp(`(href=")${ORIGIN}/`, "g"),
  "$1/",
  "absolute self-links"
);

/* "Marke & Downloads" points at the .dc.html filename it has inside the export
 * folder. At the site root that file does not exist under that name - it is
 * built below as brand-guide.html. */
const nBg = swap(
  /href="McCain%20Digital%20Brand%20Guide\.dc\.html"|href="McCain Digital Brand Guide\.dc\.html"/g,
  'href="/brand-guide.html"',
  "brand-guide links"
);

if (/unpkg\.com|fonts\.googleapis\.com|fonts\.gstatic\.com/.test(html)) {
  throw new Error("prerender: a third-party origin survived the rewrite");
}
if (html.includes("{{")) throw new Error("prerender: unresolved {{ }} in the snapshot");

/* ------------------------------------------------------------- seo head */

/* Preload only the two faces the page paints in immediately: upright latin.
 * latin-ext and the italic are unicode-range / style gated and download only if
 * something actually needs them - preloading those would spend 40 KB of the
 * critical path on bytes most visits never use. */
const fontFiles = fs
  .readdirSync(path.join(SITE, "fonts"))
  .filter((f) => f.endsWith("-normal-latin.woff2"));
if (fontFiles.length !== 2) {
  throw new Error(`prerender: expected 2 upright latin faces, found ${fontFiles.length} ` +
    `- run tools/vendor_assets.py`);
}

const graph = [
  {
    "@type": "ProfessionalService",
    "@id": `${ORIGIN}/#studio`,
    name: "McCain Digital",
    url: `${ORIGIN}/`,
    email: "info@mccain-digital.com",
    telephone: "+49 170 59 222 03",
    foundingDate: "2016",
    image: `${ORIGIN}/og-image.png`,
    logo: `${ORIGIN}/brand/mccain-mark-free-color.svg`,
    description: DESC,
    address: {
      "@type": "PostalAddress",
      streetAddress: "Holderweg 1",
      postalCode: "86869",
      addressLocality: "Oberostendorf",
      addressRegion: "Bayern",
      addressCountry: "DE",
    },
    founder: [
      { "@type": "Person", name: "Kathrin Mc Cain" },
      { "@type": "Person", name: "Christian Mc Cain" },
    ],
    areaServed: { "@type": "Country", name: "Deutschland" },
    knowsAbout: ["Künstliche Intelligenz", "RAG", "MCP", "Web-Apps", "Webentwicklung", "Unternehmenssoftware"],
    ...(facts.services.length
      ? {
          hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: "Leistungen",
            itemListElement: facts.services.map((s) => ({
              "@type": "Offer",
              itemOffered: { "@type": "Service", name: s },
            })),
          },
        }
      : {}),
  },
  {
    "@type": "WebSite",
    "@id": `${ORIGIN}/#website`,
    url: `${ORIGIN}/`,
    name: "McCain Digital",
    inLanguage: "de-DE",
    publisher: { "@id": `${ORIGIN}/#studio` },
  },
];
if (facts.faq.length) {
  graph.push({
    "@type": "FAQPage",
    "@id": `${ORIGIN}/#faq`,
    mainEntity: facts.faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  });
}

const head = `
<title>${esc(TITLE)}</title>
<meta name="description" content="${esc(DESC)}">
<link rel="canonical" href="${ORIGIN}/">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<meta name="theme-color" content="#635BFF">
<meta name="author" content="McCain Digital">
<meta property="og:type" content="website">
<meta property="og:site_name" content="McCain Digital">
<meta property="og:locale" content="de_DE">
<meta property="og:url" content="${ORIGIN}/">
<meta property="og:title" content="${esc(TITLE)}">
<meta property="og:description" content="${esc(DESC)}">
<meta property="og:image" content="${ORIGIN}/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(OG_ALT)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(TITLE)}">
<meta name="twitter:description" content="${esc(DESC)}">
<meta name="twitter:image" content="${ORIGIN}/og-image.png">
<link rel="icon" href="brand/mccain-favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="brand/apple-touch-icon-180.png">
${fontFiles
  .map((f) => `<link rel="preload" href="fonts/${f}" as="font" type="font/woff2" crossorigin>`)
  .join("\n")}
<link rel="stylesheet" href="fonts/fonts.css">
<script>window.__resources=${JSON.stringify(RESOURCE_MAP)};</script>
<script type="application/ld+json">${JSON.stringify(
  { "@context": "https://schema.org", "@graph": graph },
  null,
  1
)}</script>
`.trim();

/* <html> carries no lang in the export; a German page that does not say so is
 * read aloud by a screen reader in the user's default language. */
html = html.replace(/^<html(?![^>]*\blang=)/i, '<html lang="de"');
if (!/^<html[^>]*\blang="de"/i.test(html)) throw new Error("prerender: could not set lang");

/* window.__resources must exist BEFORE support.js runs, so the block goes at
 * the top of <head>, not appended to it. */
if (!/<head[^>]*>/i.test(html)) throw new Error("prerender: no <head>");
html = html.replace(/<head([^>]*)>/i, `<head$1>\n${head}\n`);

const banner = `<!DOCTYPE html>
<!-- GENERATED - do not edit by hand.

     Source:  mccain-design-system/reference/index.html  (Claude Design export)
     Build:   node tools/prerender.mjs        (needs: python prodserve.py 8898 --dev)

     This is a settled snapshot of the client-rendered design component, so that
     a crawler, a social preview and a first paint all get the real page instead
     of 145 words of decoration. Editing this file loses the change on the next
     build - edit the source component, then re-run the script. -->
`;
html = banner + html.replace(/^<!DOCTYPE html>\s*/i, "");

const out = path.join(SITE, "index.html");
fs.writeFileSync(out, html, "utf8");

/* ------------------------------------------------------------- assets */

let copied = 0;
for (const [from, to] of Object.entries(ASSETS)) {
  const src = path.join(SITE, from);
  const dst = path.join(SITE, to);
  if (!fs.existsSync(src)) throw new Error(`prerender: asset source missing: ${from}`);
  fs.rmSync(dst, { recursive: true, force: true });
  fs.cpSync(src, dst, { recursive: true });
  copied += fs.statSync(dst).isDirectory()
    ? fs.readdirSync(dst, { recursive: true }).length
    : 1;
}

/* ------------------------------------------------- the brand guide page */
/* The footer links to it ("Marke & Downloads"), so it has to exist at the site
 * root. Same treatment as the start page - settled snapshot, local react, local
 * fonts - but a plain head: it is a reference page, not a landing page. */

const bg = await launch(1440, 900);
const bgPage = await open(bg.context, BRAND_SRC);
await bgPage.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
await settle(bgPage);
await bgPage.evaluate(async () => {
  const step = window.innerHeight;
  for (let y = 0; y < document.body.scrollHeight; y += step) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 200));
  }
  window.scrollTo(0, 0);
});
await bgPage.waitForTimeout(1200);
let bgHtml = await bgPage.evaluate(() => document.documentElement.outerHTML);
await bg.browser.close();

bgHtml = bgHtml
  .replace(/\.\.\/brand\//g, "brand/")
  .replace(/(["'])\.\/support\.js\1/g, "$1support.js$1")
  .replace(/\s*<link[^>]+fonts\.(?:googleapis|gstatic)\.com[^>]*>/g, "")
  .replace(/\s*<script[^>]+unpkg\.com[^>]*><\/script>/g, "");
if (/unpkg\.com|fonts\.(googleapis|gstatic)\.com/.test(bgHtml)) {
  throw new Error("prerender: third-party origin survived in the brand guide");
}

/* Inside the export the brand guide sits beside its sibling design components
 * and links to them by filename. Only one of the three is a page of this site.
 *   v2    -> is the start page, so point there
 *   Deck  -> a slide deck; not published, so keep the words and drop the link
 *   Marke -> was never in the export at all (see readme.md "Quellen"), so the
 *            link has never resolved anywhere - same treatment
 * Turning a dead <a> into a <span> keeps the sentence and loses only the false
 * promise that there is something to click. */
const deadLink = (file) =>
  new RegExp(`<a\\b[^>]*href="${file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*>(.*?)<\\/a>`, "gs");

const nV2 = (bgHtml.match(deadLink("McCain Digital v2.dc.html")) || []).length;
bgHtml = bgHtml.replace(
  /(<a\b[^>]*)href="McCain Digital v2\.dc\.html"/g,
  '$1href="/"'
);
let nDead = 0;
for (const f of ["McCain Digital Deck.dc.html", "McCain Digital Marke.dc.html"]) {
  const re = deadLink(f);
  nDead += (bgHtml.match(re) || []).length;
  bgHtml = bgHtml.replace(re, "<span>$1</span>");
}
if (/href="McCain Digital/.test(bgHtml)) {
  throw new Error("prerender: a .dc.html link survived in the brand guide");
}

const BG_TITLE = "Marke & Downloads — McCain Digital";
const BG_DESC =
  "Das Zeichen, die Fassungen, Farbe, Typografie und jede Markendatei von " +
  "McCain Digital zum Herunterladen.";
const bgHead = `
<title>${esc(BG_TITLE)}</title>
<meta name="description" content="${esc(BG_DESC)}">
<link rel="canonical" href="${ORIGIN}/brand-guide.html">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="theme-color" content="#635BFF">
<meta property="og:type" content="article">
<meta property="og:site_name" content="McCain Digital">
<meta property="og:locale" content="de_DE">
<meta property="og:url" content="${ORIGIN}/brand-guide.html">
<meta property="og:title" content="${esc(BG_TITLE)}">
<meta property="og:description" content="${esc(BG_DESC)}">
<meta property="og:image" content="${ORIGIN}/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="brand/mccain-favicon.svg" type="image/svg+xml">
${fontFiles
  .map((f) => `<link rel="preload" href="fonts/${f}" as="font" type="font/woff2" crossorigin>`)
  .join("\n")}
<link rel="stylesheet" href="fonts/fonts.css">
<script>window.__resources=${JSON.stringify(RESOURCE_MAP)};</script>
`.trim();

bgHtml = bgHtml.replace(/^<html(?![^>]*\blang=)/i, '<html lang="de"');
bgHtml = bgHtml.replace(/<head([^>]*)>/i, `<head$1>\n${bgHead}\n`);
bgHtml =
  `<!DOCTYPE html>\n<!-- GENERATED by tools/prerender.mjs from\n` +
  `     mccain-design-system/reference/McCain Digital Brand Guide.dc.html -->\n` +
  bgHtml.replace(/^<!DOCTYPE html>\s*/i, "");
fs.writeFileSync(path.join(SITE, "brand-guide.html"), bgHtml, "utf8");

console.log(`prerendered ${SRC}`);
console.log(`  h1              ${facts.h1}`);
console.log(`  visible words   ${facts.words}`);
console.log(`  services        ${facts.services.length}`);
console.log(`  faq entries     ${facts.faq.length}  -> FAQPage schema`);
console.log(`  rewrites        ${nBrand} brand paths, ${nFont} font links, ${nReact} unpkg tags removed`);
console.log(`  preloads        ${fontFiles.length} latin woff2`);
console.log(`  ${before.toLocaleString()} -> ${html.length.toLocaleString()} bytes  ->  index.html`);
console.log(`  og-image.png    1200x630, rendered from the brand SVG`);
console.log(`  assets          ${copied} files copied to the site root (${Object.keys(ASSETS).length} sources)`);
