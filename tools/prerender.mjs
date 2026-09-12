/* Build the production index.html (and brand-guide.html) from the design
 * component.
 *
 *   python prodserve.py 8898 --dev      # must be running
 *   node tools/prerender.mjs
 *
 * WHY THIS EXISTS
 * The page Claude Design exports is a client-rendered component: 838 template
 * placeholders, every word of copy in content.json. Measured on the export, a
 * crawler that does not run JavaScript reads 145 words of decoration - no
 * headline, no title, no prose. Rendered, the same page carries 1,886.
 *
 * HOW IT WORKS - and why it is not just "save the rendered DOM"
 * That was the first attempt and it shipped a page that looked perfect and was
 * completely dead: no mega menu, no modals, no pixel stream. support.js mounts
 * like this:
 *
 *     const dc = doc.querySelector("x-dc");
 *     if (!dc) return null;              // <- a settled snapshot dies here
 *     dc.replaceWith(hostEl);            // x-dc becomes <div id="dc-root">
 *
 * A snapshot of the settled DOM is taken AFTER that replacement, so <x-dc> is
 * gone from it and on the next load support.js finds nothing to render. React
 * loads, PixelFX loads, no error is printed, and every button is inert.
 *
 * So the built page carries BOTH:
 *   <div id="dc-prerender">  the settled markup - what a crawler reads and what
 *                            paints first
 *   <x-dc>                   the original template, untouched, hidden - what
 *                            support.js mounts on
 * and a small watcher removes the prerendered copy the moment React has put
 * something in its own #dc-root. If React never arrives, the readable copy
 * simply stays.
 *
 * It also removes the two third-party origins the export depends on: React via
 * support.js's own window.__resources hook (no patching, and the SRI hashes
 * still match because the bytes are identical), fonts from fonts/. See
 * tools/vendor_assets.py for the legal reason that is not optional here.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";
import { launch, open, settle } from "./browser.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.dirname(HERE);
const BASE = "http://127.0.0.1:8898";
const EXPORT_DIR = path.join(SITE, "mccain-design-system", "reference");
const SRC_URL = `${BASE}/mccain-design-system/reference/index.html`;
const SRC_FILE = path.join(EXPORT_DIR, "index.html");
const BRAND_URL = `${BASE}/mccain-design-system/reference/McCain%20Digital%20Brand%20Guide.dc.html`;
const BRAND_FILE = path.join(EXPORT_DIR, "McCain Digital Brand Guide.dc.html");
const ORIGIN = "https://mccain-digital.com";

const TITLE = "McCain Digital — KI-Tools, Web-Apps und Websites aus Bayern";
const DESC =
  "Digital-Produktstudio in Bayern: KI-Werkzeuge auf Ihren eigenen Daten, " +
  "Web-Apps, Websites und Unternehmenssoftware. Antwort in 24 Stunden, " +
  "Festpreis in 48.";
const OG_ALT = "mccain digital — das Pixelstrom-Zeichen auf dunklem Grund";

/* The hero headline ROTATES through heroWords.de, so whichever variant is on
 * screen at snapshot time becomes the indexed h1 - a different promise on every
 * build. Wait for the first line. If the copy changes this throws rather than
 * quietly indexing something else: which sentence Google shows is a decision. */
const HERO_H1 = "KI-Tools, die auf Ihren Daten laufen.";

/* An internal and an external edition of the same file.
 *
 * pixel-engine.js is 137 KB of which 55 KB is comments - it is written to be
 * read, and that is worth keeping. But every visitor downloads and tokenises
 * all of it, and Lighthouse names it: "unminified JavaScript, est. savings
 * 33 KiB". So the commented source stays the source of record in
 * mccain-design-system/reference/, and what ships at the site root is the
 * minified edition built from it.
 *
 * support.js is third-party runtime, minified through the same step rather than
 * edited. Nothing here rewrites its logic; if minification ever broke it the
 * gate would catch it, because the gate clicks.
 *
 * Both are re-derived on every build, so the two editions cannot drift. */
const MINIFY = new Set(["pixel-engine.js", "support.js", "stream.js", "reveal.js", "chrome.js"]);

/* Copied so the site root is self-contained and a deploy never has to reach
 * into mccain-design-system/, which is .vercelignore'd. */
const ASSETS = {
  "mccain-design-system/reference/support.js": "support.js",
  "mccain-design-system/reference/content.json": "content.json",
  "mccain-design-system/reference/pixel-engine.js": "pixel-engine.js",
  "mccain-design-system/reference/img": "img",
  "mccain-design-system/reference/team": "team",
  "mccain-design-system/brand": "brand",
  /* The two subpage effect modules. They are not part of the Claude Design
   * export - they were lifted OUT of it - so their commented sources live in
   * internal/fx/ (never served) and the minified editions are copied here,
   * exactly like support.js and pixel-engine.js. One source, two editions,
   * re-derived on every build so they cannot drift. */
  "internal/fx/stream.js": "stream.js",
  "internal/fx/reveal.js": "reveal.js",
  "internal/fx/chrome.js": "chrome.js",
};

const RESOURCE_MAP = {
  "https://unpkg.com/react@18.3.1/umd/react.production.min.js":
    "vendor/react-18.3.1.production.min.js",
  "https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js":
    "vendor/react-dom-18.3.1.production.min.js",
};

/* One switch for the whole site - see site.config.json for why it is a file and
 * not a constant in here. */
const CONFIG = JSON.parse(fs.readFileSync(path.join(SITE, "site.config.json"), "utf8"));
const ROBOTS = CONFIG.noindex
  ? "noindex, follow"
  : "index, follow, max-image-preview:large, max-snippet:-1";

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* Every rewrite the export needs to become a page of this site. Applied to the
 * template, the prerendered markup and the head alike - the same strings occur
 * in all three, and a rewrite that covers only one of them is the bug that
 * re-introduces a CDN through the back door. */
function localise(s) {
  return s
    .replace(/\.\.\/brand\//g, "brand/")
    .replace(/(["'])\.\/support\.js\1/g, "$1support.js$1")
    .replace(/\s*<link[^>]+fonts\.(?:googleapis|gstatic)\.com[^>]*>/g, "")
    .replace(/\s*<script[^>]+unpkg\.com[^>]*><\/script>/g, "")
    /* The component's <helmet> declares the icons too, and support.js injects
     * them on top of the ones in the head this build writes - measured as three
     * requests for the same favicon. The head is the place that owns them. */
    .replace(/\s*<link[^>]+rel="(?:icon|apple-touch-icon)"[^>]*>/g, "")
    .replace(new RegExp(`(href=")${ORIGIN}/`, "g"), "$1/")
    .replace(
      /href="McCain%20Digital%20Brand%20Guide\.dc\.html"|href="McCain Digital Brand Guide\.dc\.html"/g,
      'href="/brand-guide.html"'
    );
}

/* Looks for a third-party origin being LOADED - src=, href=, or a CSS import -
 * not merely mentioned. The bare-substring version of this check failed the
 * build on window.__resources, whose keys are the unpkg URLs precisely so that
 * they are never fetched. A guard that cannot tell a lookup key from a network
 * request costs more than it catches. */
const THIRD_PARTY = /(?:src|href)\s*=\s*["']https?:\/\/(?:unpkg\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)|@import[^;]*(?:fonts\.googleapis|unpkg)/i;

function assertClean(s, what) {
  const m = THIRD_PARTY.exec(s);
  if (m) {
    const at = Math.max(0, m.index - 60);
    throw new Error(
      `prerender: a third-party origin is still being loaded in ${what}:\n    ` +
        s.slice(at, m.index + 120).replace(/\s+/g, " ")
    );
  }
}

const fontFiles = fs
  .readdirSync(path.join(SITE, "fonts"))
  .filter((f) => f.endsWith("-normal-latin.woff2"));
if (fontFiles.length !== 2) {
  throw new Error(
    `prerender: expected 2 upright latin faces, found ${fontFiles.length} - run tools/vendor_assets.py`
  );
}
const preloads = fontFiles
  .map((f) => `<link rel="preload" href="fonts/${f}" as="font" type="font/woff2" crossorigin>`)
  .join("\n");

/* The raw template must never be seen. support.js hides it itself, but only
 * once it runs. With the template delivered as inert <template> content there is
 * nothing left to flash, but an empty <x-dc> with a display rule costs 40 bytes
 * and keeps the page correct if anything ever puts markup back inside it. */
const HIDE_TEMPLATE = "<style>x-dc{display:none!important}</style>";

/* THE TEMPLATE IS DELIVERED AS INERT <template> CONTENT, NOT AS A LIVE SUBTREE.
 *
 * Shipping it as a real <x-dc> subtree - what the export does, and what this
 * build did until 11.9.2026 - has the browser parse, lay out and paint a second
 * complete copy of the page that nobody ever sees. Measured on the live site,
 * that copy cost:
 *
 *   - 70 console errors on the start page, one per SVG attribute holding a
 *     moustache: `<rect x="{{ c.x }}">` is not a length, so Blink complains
 *     about every one. This is what the owner was looking at, and it never
 *     reached `pageerror`, which is why the gate reported a clean page.
 *   - every src="{{ ... }}" fetched as a literal URL (/%7B%7B%20s.href%20%7D%7D)
 *   - pixel-engine.js loaded TWICE: once by the parser reaching the <script>
 *     inside the template's <helmet>, once by support.js processing that helmet
 *   - ~2,100 elements of layout and paint work, discarded milliseconds later
 *
 * <template> content is parsed into an inert fragment: no layout, no paint, no
 * requests, no SVG attribute parsing. And its innerHTML serialises to exactly
 * the same string the <x-dc> version produced - measured, 143,641 characters
 * both ways - so support.js receives byte-for-byte what it received before.
 *
 * support.js reads the template as `dc.innerHTML` (parse.ts, parseDcDocument),
 * so the <x-dc> that stays in the document is empty and forwards that one
 * property to the template element. */
const TEMPLATE_SHIM =
  `<script>(function(){var t=document.getElementById("dc-template"),` +
  `x=document.querySelector("x-dc");if(!t||!x)return;` +
  `Object.defineProperty(x,"innerHTML",{configurable:true,get:function(){return t.innerHTML}});})();</script>`;

/* Hands the page over from the prerendered copy to the live render. Deliberately
 * one-way and fail-safe: if React never mounts, the readable copy stays.
 *
 * The floor of 40 elements is the point of it. "#dc-root has a first child" is
 * also true when React mounts an empty shell - which is exactly what happened
 * when two runtimes raced each other - and removing the readable copy on that
 * signal turns a degraded page into a blank one. The real page renders ~2,140
 * elements, so 40 separates "rendered" from "mounted but produced nothing"
 * without being anywhere near the real value. */
const SWAP = `<script>(function(){var p=document.getElementById("dc-prerender");if(!p)return;
function ready(){var r=document.getElementById("dc-root");
return !!(r&&r.firstElementChild&&r.getElementsByTagName("*").length>40);}
function go(){if(!ready())return false;p.remove();return true;}
if(go())return;var mo=new MutationObserver(function(){if(go())mo.disconnect();});
mo.observe(document.documentElement,{childList:true,subtree:true});
setTimeout(function(){mo.disconnect();},20000);})();</script>`;

/* ------------------------------------------------------------------ render */

const { browser, context } = await launch(1440, 900);
const page = await open(context, SRC_URL);
await page.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
await settle(page);

/* Sections reveal on scroll; anything never scrolled past is snapshotted in its
 * pre-reveal state. */
await page.evaluate(async () => {
  const step = window.innerHeight;
  for (let y = 0; y < document.body.scrollHeight; y += step) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 230));
  }
  window.scrollTo(0, 0);
});
await page.waitForTimeout(1400);

let snap = null;
for (let attempt = 1; attempt <= 6 && snap === null; attempt++) {
  await page
    .waitForFunction(
      (want) => (document.querySelector("h1")?.innerText || "").trim() === want,
      HERO_H1,
      { timeout: 20000 }
    )
    .catch(() => {});
  snap = await page.evaluate((want) => {
    const h1 = (document.querySelector("h1")?.innerText || "").trim();
    if (h1 !== want) return null;
    const root = document.getElementById("dc-root");
    if (!root) return { missingRoot: true };
    return {
      head: document.head.innerHTML,
      body: root.innerHTML,
      words: (document.body.innerText || "").trim().split(/\s+/).length,
    };
  }, HERO_H1);
  if (snap === null) console.log(`  hero rotated away between check and grab, retry ${attempt}`);
}
if (!snap) {
  throw new Error(
    `prerender: never caught the hero on "${HERO_H1}". Has heroWords.de[0] changed?`
  );
}
if (snap.missingRoot) {
  throw new Error("prerender: no #dc-root after render - support.js changed its mount");
}

/* Structured data comes OUT OF THE RENDERED PAGE, never retyped: schema that
 * disagrees with the visible text is a manual action waiting to happen. */
const facts = await page.evaluate(() => {
  const faq = [];
  const sec = document.querySelector("#faq");
  if (sec) {
    for (const btn of sec.querySelectorAll("button[aria-expanded]")) {
      const q = (btn.innerText || "").trim();
      const a = btn.nextElementSibling ? (btn.nextElementSibling.innerText || "").trim() : "";
      if (q && a && a.length > 40) faq.push({ q, a });
    }
  }
  return {
    faq,
    services: [...document.querySelectorAll("#services h3")]
      .map((h) => (h.innerText || "").trim())
      .filter(Boolean),
  };
});

/* og:image, rendered from the brand SVG - social platforms refuse SVG, and a
 * PNG committed by hand goes stale the moment the mark changes. */
const ogPage = await context.newPage();
await ogPage.setViewportSize({ width: 1200, height: 630 });
await ogPage.goto(`${BASE}/mccain-design-system/brand/mccain-og-dark.svg`, {
  waitUntil: "networkidle",
});
await ogPage.screenshot({ path: path.join(SITE, "og-image.png") });
await ogPage.close();

/* ---------------------------------------------------- the original template */

const srcHtml = fs.readFileSync(SRC_FILE, "utf8");
const openTag = /<x-dc(?:\s[^>]*)?>/.exec(srcHtml);
const closeAt = srcHtml.lastIndexOf("</x-dc>");
if (!openTag || closeAt < 0) throw new Error("prerender: no <x-dc> block in the export");
const template = srcHtml.slice(openTag.index + openTag[0].length, closeAt);

const scriptTag = /<script[^>]*data-dc-script[^>]*>[\s\S]*?<\/script>/.exec(srcHtml);
if (!scriptTag) throw new Error("prerender: no <script data-dc-script> in the export");

/* ------------------------------------------------------------------ compose */

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

const seoHead = `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(TITLE)}</title>
<meta name="description" content="${esc(DESC)}">
<link rel="canonical" href="${ORIGIN}/">
<meta name="robots" content="${ROBOTS}">
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
${preloads}
<link rel="stylesheet" href="fonts/fonts.css">
<!-- support.js is deferred: it was blocking the parser in front of ~680 KB of
     document, and on an already-prerendered page there is nothing to gain from
     running the runtime before the readable copy exists.

     React is deliberately NOT preloaded here. It looks like it should help -
     support.js only requests it after it runs - but measured over three runs
     each, preloading moved median FCP from 349 ms to 485 ms: the two files
     compete with the document for the same connection, and the document is what
     paints. The score itself did not move either way (68/69/69), because this
     page is bound by main-thread work, not by load order: 1,493 ms of script
     evaluation rendering ~2,140 elements. -->
<script type="application/ld+json">${JSON.stringify(
  { "@context": "https://schema.org", "@graph": graph },
  null,
  1
)}</script>
<script>window.__resources=${JSON.stringify(RESOURCE_MAP)};</script>
${HIDE_TEMPLATE}`;

/* ONLY the <style> blocks out of the head the runtime produced, so the
 * prerendered markup is styled at first paint before support.js has processed
 * <helmet>.
 *
 * Taking the whole head instead shipped support.js and pixel-engine.js TWICE -
 * once from the snapshot, once from our own tag - and two support.js instances
 * race each other: the second runtime reached the component code before React
 * had finished loading and the page died on "Cannot read properties of null
 * (reading 'useState')", leaving #dc-root empty and every button inert. An
 * allow-list of one tag type is the only version of this that cannot regress. */
function stylesOf(head) {
  return (localise(head).match(/<style[^>]*>[\s\S]*?<\/style>/gi) || []).join("\n");
}
const runtimeHead = stylesOf(snap.head);

const prerendered = localise(snap.body);
const templateLocal = localise(template);
assertClean(seoHead + runtimeHead + prerendered + templateLocal, "index.html");
if (prerendered.includes("{{")) throw new Error("prerender: unresolved {{ }} in the snapshot");

/* Every moustache must be inside the inert <template> and nowhere else. A
 * placeholder that escapes into live markup is a console error per SVG attribute
 * and a fetch per src - the thing this build exists to prevent - so it is
 * checked on the finished document rather than trusted. */
function assertMoustachesAreInert(doc, what) {
  /* Comments come out FIRST. The banner at the top of the generated file
   * explains the structure and therefore contains the literal string
   * `<template id="dc-template">`, so a regex looking for that tag matched the
   * COMMENT, ran to the one real </template>, and cut the prerendered markup out
   * of its own check - a guard that could no longer see the thing it exists to
   * catch. Documentation that names a pattern is inside the search space too. */
  const outside = doc
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<template id="dc-template">[\s\S]*?<\/template>/, "");
  const n = (outside.match(/\{\{/g) || []).length;
  if (n) {
    const at = outside.indexOf("{{");
    throw new Error(
      `prerender: ${n} template placeholder(s) outside the inert template in ${what}:\n    ` +
        outside.slice(Math.max(0, at - 100), at + 100).replace(/\s+/g, " ")
    );
  }
}

const html = `<!DOCTYPE html>
<!-- GENERATED - do not edit by hand.

     Source:  mccain-design-system/reference/index.html  (Claude Design export)
     Build:   node tools/prerender.mjs   (needs: python prodserve.py 8898 --dev)

     #dc-prerender is the settled markup: what a crawler reads and what paints
     first. The empty <x-dc> below it is the mount point support.js replaces - it
     MUST stay, or the page loads looking perfect and every button is dead. The
     template itself lives in the inert <template id="dc-template"> and reaches
     support.js through the shim next to it; delivering it as live markup printed
     one console error per SVG placeholder and built a whole second DOM.
     The watcher at the end removes the prerendered copy once React has filled
     its own #dc-root, and leaves it alone if React never arrives. -->
<html lang="de">
<head>
${seoHead}
${runtimeHead}
<script src="support.js" defer></script>
</head>
<body>
<div id="dc-prerender">${prerendered}</div>
<x-dc></x-dc>
<template id="dc-template">${templateLocal}</template>
${TEMPLATE_SHIM}
${localise(scriptTag[0])}
${SWAP}
</body>
</html>
`;

assertMoustachesAreInert(html, "index.html");
fs.writeFileSync(path.join(SITE, "index.html"), html, "utf8");

/* ------------------------------------------------------------ brand guide */
/* The footer links to it ("Marke & Downloads"), so it has to exist at the root.
 * Same two-copy treatment, plain head: a reference page, not a landing page. */

const bgPage = await open(context, BRAND_URL);
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
const bgSnap = await bgPage.evaluate(() => {
  const root = document.getElementById("dc-root");
  return root ? { head: document.head.innerHTML, body: root.innerHTML } : null;
});
await browser.close();
if (!bgSnap) throw new Error("prerender: no #dc-root in the brand guide");

const bgSrc = fs.readFileSync(BRAND_FILE, "utf8");
const bgOpen = /<x-dc(?:\s[^>]*)?>/.exec(bgSrc);
const bgClose = bgSrc.lastIndexOf("</x-dc>");
const bgScript = /<script[^>]*data-dc-script[^>]*>[\s\S]*?<\/script>/.exec(bgSrc);
if (!bgOpen || bgClose < 0 || !bgScript) throw new Error("prerender: brand guide has no <x-dc>");

/* Inside the export it links to its sibling components by filename. Only one of
 * the three is a page of this site: v2 is the start page. The Deck is not
 * published and "Marke" was never in the export at all - both keep their words
 * and lose the link that never resolved. */
const deadLink = (f) =>
  new RegExp(`<a\\b[^>]*href="${f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*>(.*?)<\\/a>`, "gs");
const bgFix = (s) => {
  let out = localise(s).replace(/(<a\b[^>]*)href="McCain Digital v2\.dc\.html"/g, '$1href="/"');
  for (const f of ["McCain Digital Deck.dc.html", "McCain Digital Marke.dc.html"]) {
    out = out.replace(deadLink(f), "<span>$1</span>");
  }
  return out;
};

const bgBody = bgFix(bgSnap.body);
const bgTemplate = bgFix(bgSrc.slice(bgOpen.index + bgOpen[0].length, bgClose));
/* Styles only, same reason as the start page: taking the whole head ships a
 * second support.js and the two runtimes race each other. */
const bgHead = stylesOf(bgSnap.head);
assertClean(bgHead + bgBody + bgTemplate, "brand-guide.html");
if (/href="McCain Digital/.test(bgHead + bgBody + bgTemplate)) {
  throw new Error("prerender: a .dc.html link survived in the brand guide");
}

const BG_TITLE = "Marke & Downloads — McCain Digital";
const BG_DESC =
  "Das Zeichen, die Fassungen, Farbe, Typografie und jede Markendatei von " +
  "McCain Digital zum Herunterladen.";
const bgHtml = `<!DOCTYPE html>
<!-- GENERATED by tools/prerender.mjs from
     mccain-design-system/reference/McCain Digital Brand Guide.dc.html -->
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(BG_TITLE)}</title>
<meta name="description" content="${esc(BG_DESC)}">
<link rel="canonical" href="${ORIGIN}/brand-guide.html">
<meta name="robots" content="${ROBOTS}">
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
${preloads}
<link rel="stylesheet" href="fonts/fonts.css">
<!-- support.js is deferred: it was blocking the parser in front of ~680 KB of
     document, and on an already-prerendered page there is nothing to gain from
     running the runtime before the readable copy exists.

     React is deliberately NOT preloaded here. It looks like it should help -
     support.js only requests it after it runs - but measured over three runs
     each, preloading moved median FCP from 349 ms to 485 ms: the two files
     compete with the document for the same connection, and the document is what
     paints. The score itself did not move either way (68/69/69), because this
     page is bound by main-thread work, not by load order: 1,493 ms of script
     evaluation rendering ~2,140 elements. -->
<script>window.__resources=${JSON.stringify(RESOURCE_MAP)};</script>
${HIDE_TEMPLATE}
${bgHead}
<script src="support.js" defer></script>
</head>
<body>
<div id="dc-prerender">${bgBody}</div>
<x-dc></x-dc>
<template id="dc-template">${bgTemplate}</template>
${TEMPLATE_SHIM}
${bgFix(bgScript[0])}
${SWAP}
</body>
</html>
`;
assertMoustachesAreInert(bgHtml, "brand-guide.html");
fs.writeFileSync(path.join(SITE, "brand-guide.html"), bgHtml, "utf8");

/* ------------------------------------------------------------------ assets */

let copied = 0;
const minified = [];
for (const [from, to] of Object.entries(ASSETS)) {
  const src = path.join(SITE, from);
  const dst = path.join(SITE, to);
  if (!fs.existsSync(src)) throw new Error(`prerender: asset source missing: ${from}`);
  fs.rmSync(dst, { recursive: true, force: true });
  fs.cpSync(src, dst, { recursive: true });
  if (MINIFY.has(to)) {
    const before = fs.readFileSync(dst, "utf8");
    const out = await esbuild.transform(before, {
      loader: "js",
      minify: true,
      /* Identifiers only. Property names are left alone: support.js reaches
       * into objects by name (DCLogic, StreamableLogic, __dcRootName) and
       * pixel-engine reads data-* driven config, so renaming properties would
       * be a silent behaviour change dressed up as a size win. */
      legalComments: "none",
      target: "es2018",
    });
    fs.writeFileSync(dst, out.code, "utf8");
    minified.push([to, before.length, out.code.length]);
  }
  copied += fs.statSync(dst).isDirectory() ? fs.readdirSync(dst, { recursive: true }).length : 1;
}

console.log("built from " + SRC_URL);
console.log(`  hero h1         ${HERO_H1}`);
console.log(`  visible words   ${snap.words}`);
console.log(`  services        ${facts.services.length}   faq ${facts.faq.length} -> FAQPage`);
console.log(`  index.html      ${html.length.toLocaleString()} bytes ` +
  `(prerender ${prerendered.length.toLocaleString()} + template ${templateLocal.length.toLocaleString()})`);
console.log(`  brand-guide     ${bgHtml.length.toLocaleString()} bytes`);
console.log(`  preloads        ${fontFiles.length} upright latin woff2`);
console.log(`  assets          ${copied} files copied to the site root`);
for (const [name, before, after] of minified) {
  const pct = (100 - (after / before) * 100).toFixed(0);
  console.log(
    `  minified        ${name.padEnd(18)} ${(before / 1024).toFixed(1)} KB -> ` +
      `${(after / 1024).toFixed(1)} KB  (-${pct}%)`
  );
}
