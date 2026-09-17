/* Build the whole site out of the Claude Design export.
 *
 *   python prodserve.py 8898 --dev      # must be running
 *   node tools/prerender.mjs
 *
 * WHAT CHANGED ON 12.9.2026
 * The export used to be ONE artboard (the start page) plus a brand guide, and
 * the nine subpages were generated from hand-written Python templates. The v3
 * export designs the whole site: 21 interlinked artboards, each with its own
 * <helmet>, its own canonical and its own JSON-LD. So the generators are gone
 * and this file became a loop over a route table instead of a straight line
 * through two pages. PAGES below is the single source of truth for what exists
 * and at which URL - the sitemap is written from it, not maintained beside it.
 *
 * WHY THERE IS A BUILD AT ALL
 * Each artboard is a client-rendered React component: every word of copy is a
 * {{ }} placeholder resolved at runtime. Measured on the untouched export, a
 * crawler that does not run JavaScript reads a few dozen words of decoration -
 * no headline, no title, no prose. Rendered, the start page carries ~2,600.
 * Meta tags alone would have been cosmetic.
 *
 * HOW IT WORKS - and why it is no longer "save the rendered DOM"
 * WHAT CHANGED ON 13.9.2026: the markup is RENDERED by react-dom/server at build
 * time instead of scraped out of a settled browser, and the runtime hydrates it
 * instead of building the whole page a second time.
 *
 * The scrape worked and shipped for months, but it produced the page AFTER
 * seconds of life - counters at their end value, sections revealed, nodes that
 * componentDidMount created imperatively. React's first render is the page at
 * zero, so the two could never be reconciled: hydrateRoot against that snapshot
 * was measured twice and failed both times, 1,193 of ~3,000 node positions
 * apart. Without hydration React rebuilt all ~2,900 nodes on every load, and
 * measured on mobile that rebuild is 21 of the 30 points the page was missing -
 * downloading React itself costs one.
 *
 * So ssrRender() writes the patched template and the patched script into a
 * staging document, lets support.js compile them exactly as a browser would,
 * and renders the component it produced. The result IS React's first render.
 *
 * Every built page therefore carries ONE copy, not two:
 *   <div id="dc-root">          React's first render - what a crawler reads,
 *                               what paints first, and what React adopts
 *   <x-dc>                      empty; how support.js finds the template
 *   <template id="dc-template">  the component template, INERT
 * patchRuntime() teaches support.js to notice the filled #dc-root, drop the
 * <x-dc> and call hydrateRoot. If React never arrives, the markup simply stays
 * and the page is still readable - the old watcher that removed a second copy
 * is gone with the second copy.
 *
 * It also removes the three third-party origins the export depends on: React
 * through support.js's own window.__resources hook (no patching, and the SRI
 * hashes still match because the bytes are identical) and both typefaces from
 * fonts/. See tools/vendor_assets.py for the legal reason that is not optional.
 *
 * WHAT CHANGED ON 17.9.2026
 * The pages this file renders are no longer the site. They are the FIRST STAGE
 * of the build: React's first render of every artboard, written to
 * _dcbuild/react/<route>/index.html and read from there by tools/v5build.mjs,
 * which turns them into the pages that ship - plain HTML, one binder
 * (tools/runtime.js, shipped minified as /runtime.js), no React at runtime. Everything that describes the deployed
 * site (sitemap.xml, llms.txt, the CSP hashes in vercel.json) is written by
 * v5build.mjs from what it writes, so this file no longer touches any of it.
 * React's runtime (support.js and the two UMD builds) lives in _dcbuild/ as
 * well: the staging documents load it from there, and nothing ships it.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";
import { launch, open, settle } from "./browser.mjs";
import { NOT_PUBLISHED, ORIGIN, PAGES } from "./pages.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.dirname(HERE);
/* Build scratch, in .gitignore and .vercelignore. The React pages this file
 * writes go to react/ in here; tools/v5build.mjs reads them from there. */
const SSR_DIR = path.join(SITE, "_dcbuild");
const REACT_DIR = path.join(SSR_DIR, "react");
const BASE = "http://127.0.0.1:8898";
const EXPORT_DIR = path.join(SITE, "mccain-design-system");
const EXPORT_URL = `${BASE}/mccain-design-system`;


/* An internal and an external edition of the same file.
 *
 * pixel-engine.js is 137 KB of which a third is comments - it is written to be
 * read, and that is worth keeping. But every visitor downloads and tokenises
 * all of it, and Lighthouse names it. So the commented source stays the source
 * of record in mccain-design-system/, and what ships at the site root is the
 * minified edition built from it.
 *
 * support.js is third-party runtime, minified through the same step. It carries
 * exactly ONE logic change, patchRuntime() below: the mount adopts the markup
 * this build rendered instead of throwing it away and building it again. That
 * patch asserts its own count, so a re-exported runtime cannot absorb it
 * silently. If minification ever broke either, the gate would catch it, because
 * the gate clicks.
 *
 * Both are re-derived on every build, so the two editions cannot drift. */
const MINIFY = new Set(["pixel-engine.js", "support.js", "image-slot.js"]);

/* Copied so the site root is self-contained and a deploy never has to reach
 * into mccain-design-system/, which is .vercelignore'd. support.js is the one
 * exception: it is React's runtime, needed only by the staging documents of
 * this build and of v5build.mjs, so it goes to _dcbuild/ and never ships. */
const ASSETS = {
  "support.js": "_dcbuild/support.js",
  "pixel-engine.js": "pixel-engine.js",
  "image-slot.js": "image-slot.js",
  "content.json": "content.json",
  img: "img",
  team: "team",
  brand: "brand",
};

/* The two UMD builds support.js asks unpkg for, served from the build scratch
 * instead (copied there from tools/vendor-build/ below). Build-time only: the
 * pages that ship load neither. */
const VENDOR_REACT = ["react-18.3.1.production.min.js", "react-dom-18.3.1.production.min.js"];
const RESOURCE_MAP = {
  "https://unpkg.com/react@18.3.1/umd/react.production.min.js":
    "/_dcbuild/vendor/react-18.3.1.production.min.js",
  "https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js":
    "/_dcbuild/vendor/react-dom-18.3.1.production.min.js",
};

/* IMAGES THE PAGES SHOW SMALLER, OR AT A DIFFERENT SHAPE, THAN THEY ARE.
 *
 * Measured 12.9.2026 by comparing every <img>'s naturalWidth and naturalHeight
 * against the box it actually renders in, at 390 / 768 / 1440 px. Three files
 * carry real bytes and all three are wasteful, none of it on purpose:
 *
 *   brand/mccain-recall-logo-128.png  9.8 KB PNG in a 20-24 px box, all 21 pages
 *   team/portrait-*-840.webp          840x1050, 67.6 KB each, in a 96x120 box
 *   img/studio-wide-1200.webp         1200x800 in a box whose ratio is 2.625,
 *                                     so `object-fit: cover` throws away 43 %
 *                                     of the rows AFTER downloading them
 *
 * Each target is derived at 2-2.5x its CSS box, because a phone screen asks for
 * two to three device pixels per CSS pixel, and cropped to the box's own aspect
 * ratio. The ratio is constant across all three widths - it comes from the
 * layout, not the viewport - so cropping here shows exactly what the browser
 * was going to show anyway, minus the bytes.
 *
 * Quality: 0.82 for the photographs, where WebP at that setting is not
 * distinguishable from 0.92 at a fraction of the size, and 0.90 for the badge,
 * which is flat colour and a hard edge and does show it.
 *
 * The badge is derived at 128 rather than at 2x its smallest box, because it is
 * not one box: 20-24 px on twenty pages and 58 px on /md-recall/. Measured, the
 * whole ladder costs almost nothing - 48 px is 1.587 B and 128 px is 2.925 B -
 * so the version that is sharp everywhere is 1,3 KB dearer than the version
 * that is soft on one page, against 9.822 B for the PNG it replaces. Sizing it
 * for the smallest box and letting the biggest one blur would be a saving
 * nobody asked for.
 *
 * The originals stay in the export untouched. These are build products, like
 * the minified support.js, re-derived on every build so the two editions
 * cannot drift, and localise() points the pages at them - derived from this
 * table, so a new entry cannot be half-wired.
 *
 * Owner 12.9.2026: "die bilder sind alles placeholder, mach die alle kleiner" /
 * "optimiere die bilder und schneide die richtig zu". The real photographs come
 * after the text pass; this is about the placeholders not costing 200 KB.
 *
 * The brand SVGs on /marke/ are deliberately NOT in here: they are vector, and
 * they are also the download the page offers. Re-rasterising a download to save
 * preview bytes would ship a worse file than the one being advertised. */
const DERIVED = [
  { src: "brand/mccain-recall-logo-128.png", out: "brand/mccain-recall-logo-128.webp", w: 128, h: 128, q: 0.9 },
  { src: "team/portrait-christian-840.webp", out: "team/portrait-christian-240.webp", w: 240, h: 300, q: 0.82 },
  { src: "team/portrait-kathi-840.webp", out: "team/portrait-kathi-240.webp", w: 240, h: 300, q: 0.82 },
  { src: "img/studio-wide-1200.webp", out: "img/studio-wide-1200x457.webp", w: 1200, h: 457, q: 0.82 },
];

/* One switch for the whole site - see site.config.json for why it is a file and
 * not a constant in here. */
const CONFIG = JSON.parse(fs.readFileSync(path.join(SITE, "site.config.json"), "utf8"));
const ROBOTS = CONFIG.noindex
  ? "noindex, follow"
  : "index, follow, max-image-preview:large, max-snippet:-1";

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const rx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* ------------------------------------------------------------- link rewrite */
/* The artboards link to each other by FILENAME - href="McCain Digital KI.dc.html"
 * - both in markup and inside the component's own data, and in both the raw and
 * the %20-encoded spelling. Every one of them has to become the route it now
 * answers on, or the whole navigation 404s. */
const LINK_MAP = new Map();
for (const p of PAGES) {
  LINK_MAP.set(p.src, p.route);
  LINK_MAP.set(encodeURI(p.src), p.route);
  LINK_MAP.set(p.src.replace(/ /g, "%20"), p.route);
}

function rewriteLinks(s) {
  let out = s;
  /* Longest first: "McCain Digital News md-recall.dc.html" contains no other
   * key, but "McCain Digital v2.dc.html" and "McCain Digital Vergleich
   * RAG.dc.html" share a prefix, and a short key replaced first would cut a
   * long one in half. */
  for (const [from, to] of [...LINK_MAP].sort((a, b) => b[0].length - a[0].length)) {
    out = out.split(from).join(to);
  }
  return out;
}

/* The two artboards the brand guide links by name are design studies, not
 * pages. They keep their words and lose the link that would 404. */
function unwrapDeadLinks(s) {
  let out = s;
  for (const f of NOT_PUBLISHED) {
    out = out.replace(
      new RegExp(`<a\\b[^>]*href="${rx(f)}"[^>]*>(.*?)<\\/a>`, "gs"),
      "<span>$1</span>"
    );
    out = out.replace(
      new RegExp(`<a\\b[^>]*href="${rx(f.replace(/ /g, "%20"))}"[^>]*>(.*?)<\\/a>`, "gs"),
      "<span>$1</span>"
    );
  }
  return out;
}

/* Every rewrite the export needs to become a page of this site. Applied to the
 * template, the prerendered markup and the head alike - the same strings occur
 * in all three, and a rewrite that covers only one of them is the bug that
 * re-introduces a CDN through the back door. */
function localise(s) {
  let out = (
    unwrapDeadLinks(rewriteLinks(s))
      /* ROOT-ABSOLUTE, not relative. This is new in v4 and it is the reason the
       * subpages work at all: /leistungen/ki-automatisierung/ is two folders
       * deep, so a relative "brand/mccain-icons.svg#check" resolves to
       * /leistungen/ki-automatisierung/brand/... and every icon on the page is
       * a 404. The quote in the pattern is what keeps it safe: it matches
       * href="brand/, src="brand/ and the JS strings 'brand/..., and cannot
       * match the ...mccain-digital.com/brand/ absolute URLs (preceded by /)
       * or an already-absolute "/brand/. */
      .replace(/(["'])\.{0,2}\/?(brand|img|team)\//g, "$1/$2/")
      /* The same path inside a CSS url(), where the quote arrives HTML-escaped:
       * the settled snapshot serialises an inline style as
       * background-image: url(&quot;team/portrait-christian-840.webp&quot;).
       * &quot; is not " to the rule above, so the studio portraits and 37 image
       * tiles 404ed from every page one folder deep - found by asking the
       * browser for the response codes, not by reading the markup. */
      .replace(/url\((&quot;|&#0?39;|["']|)\.{0,2}\/?(brand|img|team)\//g, "url($1/$2/")
      .replace(/(["'])\.{0,2}\/?(support|pixel-engine|image-slot)\.js\1/g, "$1/$2.js$1")
      .replace(/(["'])\.{0,2}\/?content\.json\1/g, "$1/content.json$1")
      /* as="fetch" without crossorigin does not match the credentials mode of
       * the fetch support.js makes, so the browser warns and preloads it twice.
       * Measured on every one of the 21 pages before this line existed. */
      .replace(
        /<link rel="preload" href="\/content\.json" as="fetch">/g,
        '<link rel="preload" href="/content.json" as="fetch" crossorigin>'
      )
      .replace(/\s*<link[^>]+fonts\.(?:googleapis|gstatic)\.com[^>]*>/g, "")
      .replace(/\s*<script[^>]+unpkg\.com[^>]*><\/script>/g, "")
      /* The component's <helmet> declares the icons too, and support.js injects
       * them on top of the ones in the head this build writes - measured as
       * three requests for the same favicon. The head is the place that owns
       * them. */
      .replace(/\s*<link[^>]+rel="(?:icon|apple-touch-icon)"[^>]*>/g, "")
      .replace(new RegExp(`(href=")${rx(ORIGIN)}/`, "g"), "$1/")
  );
  /* Point every reference at the cropped, right-sized edition the build
   * derives - read straight off DERIVED, so adding a picture to that table is
   * the whole change and a half-wired one is impossible. */
  for (const job of DERIVED) out = out.replace(new RegExp(rx("/" + job.src), "g"), "/" + job.out);
  return out;
}

/* THE HEAD OWNS THE META TAGS - THE HELMET MUST NOT SHIP A SECOND SET.
 *
 * support.js processes the component's <helmet> at runtime and injects what it
 * finds into document.head, on top of the head this build wrote. Measured on
 * the hydrated page before this existed: TWO <title> elements, two
 * descriptions, two og:url, two JSON-LD graphs - and two <link rel="canonical">.
 *
 * The second canonical is the export's own, which localise() had turned
 * relative, so Lighthouse read `canonical: is not an absolute URL (/)` while
 * the head said the right thing. Worse on the three pages whose helmet was
 * copy-pasted from the legal page: /marke/ served
 *     <link rel="canonical" href="https://mccain-digital.com/marke/">   (head)
 *     <link rel="canonical" href="/rechtliches/">                       (runtime)
 * Correcting the head was not enough, because the wrong one was being put back
 * after hydration. Two rel=canonical on one page is also the case where Google
 * may ignore both.
 *
 * Same reasoning that already removes the icon links: whatever the head owns,
 * the helmet must not repeat. The style block, the pixel-engine script and the
 * content.json preload stay - those are the helmet doing its actual job.
 *
 * hreflang goes for a second reason: the export declares
 * <link rel="alternate" hreflang="en" href="/en/">, and /en/ does not exist.
 * A relative hreflang is invalid anyway (Lighthouse: "Relative href value"),
 * but the real problem is that it points at a page that was never built. */
const HELMET_DROP = [
  /\s*<title>[\s\S]*?<\/title>/gi,
  /\s*<meta[^>]+name="description"[^>]*>/gi,
  /\s*<meta[^>]+name="robots"[^>]*>/gi,
  /\s*<link[^>]+rel="canonical"[^>]*>/gi,
  /\s*<link[^>]+rel="alternate"[^>]*>/gi,
  /\s*<meta[^>]+property="og:[^"]*"[^>]*>/gi,
  /\s*<meta[^>]+name="twitter:[^"]*"[^>]*>/gi,
  /\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/gi,
];

function stripHelmetSeo(template, name) {
  const open = template.indexOf("<helmet>");
  const close = template.indexOf("</helmet>");
  if (open < 0 || close < 0) throw new Error(`prerender: no <helmet> in the template of ${name}`);
  const before = template.slice(0, open + "<helmet>".length);
  const after = template.slice(close);
  let h = template.slice(open + "<helmet>".length, close);
  let stripped = 0;
  for (const re of HELMET_DROP) h = h.replace(re, () => (stripped++, ""));
  return { template: before + h + after, stripped };
}

/* role="button" IS NOT ALLOWED ON <article>.
 *
 * The eight service tiles on the start page are
 * <article role="button" tabindex="0" aria-label="KI-Tools">, and axe flags it:
 * "ARIA role should be appropriate for the element". <article> is a document
 * section with an implicit `article` role; overriding it with `button` gives
 * assistive technology a control that also claims to be a landmark-ish region,
 * and the rich content inside it is not a button label.
 *
 * The tiles contain no interactive children (checked: 0 links or buttons
 * inside), so a plain <div> carries role="button" correctly and nothing else
 * changes: no CSS rule targets the tag - the styling hangs off .scpb and inline
 * styles - and tabindex, aria-label and the click handler are untouched.
 *
 * The close tag has to be matched rather than replaced globally, because the
 * page has other <article> elements that must stay articles. */
function fixTileRoles(s) {
  const open = /<article(?=[^>]*\brole="button")[^>]*>/g;
  let out = "";
  let last = 0;
  let fixed = 0;
  let m;
  while ((m = open.exec(s))) {
    /* walk forward to this element's own </article>, counting nesting */
    let depth = 1;
    let i = m.index + m[0].length;
    const scan = /<article\b[^>]*>|<\/article>/g;
    scan.lastIndex = i;
    let t;
    let closeAt = -1;
    while ((t = scan.exec(s))) {
      depth += t[0][1] === "/" ? -1 : 1;
      if (depth === 0) {
        closeAt = t.index;
        break;
      }
    }
    if (closeAt < 0) continue;
    out +=
      s.slice(last, m.index) +
      m[0].replace(/^<article/, "<div") +
      s.slice(m.index + m[0].length, closeAt) +
      "<div-close>";
    last = closeAt + "</article>".length;
    fixed++;
    open.lastIndex = last;
  }
  out += s.slice(last);
  return { html: out.split("<div-close>").join("</div>"), fixed };
}

/* CROSS-PAGE ANCHORS.
 *
 * The nav and the footer are the same markup on all 21 pages, and four of their
 * entries - Arbeiten, Ablauf, FAQ, Stack - point at bare "#work", "#process",
 * "#faq", "#stack". Those sections exist on the START PAGE only. On the other
 * twenty, clicking them does nothing at all: no navigation, no scroll, no
 * error. tools/check_links.py found 60 of them.
 *
 * So each page is asked which ids it actually has, and only the anchors it
 * cannot resolve are sent to the start page. Conditional on purpose: /kontakt/
 * and /preise/ have their own #faq, and rewriting those would send a visitor
 * away from the answer they are standing on.
 *
 * Both spellings have to be covered - href="#x" in the markup and href: '#x'
 * in the component's own link data. The data is where the footer builds its
 * columns, so patching only the markup fixes the page that is rendered and
 * leaves the page React renders broken. */
function fixAnchors(parts) {
  /* The template is the only place ids can come from now, and it is the right
   * one: it is what React renders, so an id that exists there exists on the
   * page. The delivered markup used to be collected here too, back when it was
   * scraped separately - it is rendered from this very template today, so it
   * cannot contribute an id the template does not have. */
  const ids = new Set();
  for (const m of parts.template.matchAll(/\sid="([A-Za-z][\w-]*)"/g)) ids.add(m[1]);
  let fixed = 0;
  const fix = (s) =>
    s
      .replace(/href="#([A-Za-z][\w-]*)"/g, (full, id) =>
        ids.has(id) ? full : (fixed++, `href="/#${id}"`)
      )
      .replace(/href: '#([A-Za-z][\w-]*)'/g, (full, id) =>
        ids.has(id) ? full : (fixed++, `href: '/#${id}'`)
      );
  return { template: fix(parts.template), script: fix(parts.script), fixed };
}

/* Looks for a third-party origin being LOADED - src=, href=, or a CSS import -
 * not merely mentioned. The bare-substring version of this check failed the
 * build on window.__resources, whose keys are the unpkg URLs precisely so that
 * they are never fetched. A guard that cannot tell a lookup key from a network
 * request costs more than it catches. */
const THIRD_PARTY =
  /(?:src|href)\s*=\s*["']https?:\/\/(?:unpkg\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)|@import[^;]*(?:fonts\.googleapis|unpkg)/i;

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

/* A .dc.html anywhere in a built page is a link into the export, which is not
 * deployed. It would be a 404 in the navigation of a finished site. */
function assertNoExportLinks(s, what) {
  const m = /\.dc\.html/.exec(s);
  if (m) {
    throw new Error(
      `prerender: a .dc.html reference survived in ${what}:\n    ` +
        s.slice(Math.max(0, m.index - 140), m.index + 60).replace(/\s+/g, " ")
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
  .map((f) => `<link rel="preload" href="/fonts/${f}" as="font" type="font/woff2" crossorigin>`)
  .join("\n");

/* fonts.css is INLINED, not linked.
 *
 * It is 1.3 KB, and as a <link> it was a render-blocking request on the
 * critical path: PageSpeed measured it at 380 ms of critical-path latency and
 * put the estimated saving at 450 ms. Worse than its own cost, the LCP element
 * is the wordmark in the nav - text that cannot paint until the @font-face
 * rules have arrived - so a whole extra round trip sat in front of the first
 * thing the visitor sees.
 *
 * Inlining removes the request entirely. Nothing about the typefaces changes:
 * the same two families, the same self-hosted .woff2 files, the same
 * font-display: swap. Only the delivery path of the 1.3 KB of @font-face rules
 * moves - from a second request into the document that already has to arrive.
 *
 * The url()s are rewritten from ../fonts/ to /fonts/ because they no longer
 * resolve relative to fonts/fonts.css but to the page. */
const fontCss = fs
  .readFileSync(path.join(SITE, "fonts", "fonts.css"), "utf8")
  .replace(/url\(\.\.\/fonts\//g, "url(/fonts/")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\n{2,}/g, "\n")
  .trim();
if (!/@font-face/.test(fontCss)) {
  throw new Error("prerender: fonts/fonts.css carries no @font-face - run tools/vendor_assets.py");
}
if (/\.\.\//.test(fontCss)) {
  throw new Error("prerender: a relative url() survived in the inlined fonts.css");
}

/* The raw template must never be seen. support.js hides it itself, but only
 * once it runs. With the template delivered as inert <template> content there is
 * nothing left to flash, but an empty <x-dc> with a display rule costs 40 bytes
 * and keeps the page correct if anything ever puts markup back inside it. */
const HIDE_TEMPLATE = "<style>x-dc{display:none!important}</style>";

/* THE TEMPLATE IS DELIVERED AS INERT <template> CONTENT, NOT AS A LIVE SUBTREE.
 *
 * Shipping it as a real <x-dc> subtree - what the export does - has the browser
 * parse, lay out and paint a second complete copy of the page that nobody ever
 * sees. Measured on the v3 live site, that copy cost:
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
 * Re-measured on the v3 export on 12.9.2026, untouched: the same 404s for
 * literal {{ }} URLs on 6 pages and 37 SVG attribute errors on the brand guide.
 * The mechanism has not changed, so neither has the fix.
 *
 * <template> content is parsed into an inert fragment: no layout, no paint, no
 * requests, no SVG attribute parsing. And its innerHTML serialises to exactly
 * the same string the <x-dc> version produced, so support.js receives
 * byte-for-byte what it received before.
 *
 * support.js reads the template as `dc.innerHTML` (parse.ts, parseDcDocument),
 * so the <x-dc> that stays in the document is empty and forwards that one
 * property to the template element. */
const TEMPLATE_SHIM =
  `<script>(function(){var t=document.getElementById("dc-template"),` +
  `x=document.querySelector("x-dc");if(!t||!x)return;` +
  `Object.defineProperty(x,"innerHTML",{configurable:true,get:function(){return t.innerHTML}});})();</script>`;


/* ------------------------------------------------------- the contact forms */
/* THE EXPORT'S FORMS SAY "SENT" AND SEND NOTHING.
 *
 * Every one of the 21 artboards carries a form - the contact page has two -
 * and every handler is the same shape:
 *
 *     if (fd.get('company')) return; this.setState({ formSent: true });
 *
 * A honeypot, a success state, and no request. Measured on the untouched
 * export: 0 requests leave the browser and the visitor is told "Ihre Nachricht
 * ist da". The v3 site shipped exactly this bug once already; it is the reason
 * tools/form_probe.mjs exists, and it is why this build refuses to copy a
 * submit handler through unchanged.
 *
 * The fix is one shared substring, so the patch is surgical rather than a
 * rewrite of 22 handler bodies - and the count is asserted per page, so a
 * redesigned handler fails the build instead of silently going back to lying.
 *
 * The Web3Forms access key is PUBLIC by design (it identifies the form, it does
 * not authorise anything) - it is the same key the v3 contact page used.
 *
 * The selections for project type, budget and timeline are <button> toggles in
 * React state, not form fields, so FormData does not see them. They are read
 * back off aria-pressed, which is what the design already sets for the screen
 * reader - no coupling to a state variable name that may be renamed. */
const WEB3FORMS_KEY = "d3e1fa0a-cbe1-45cd-b823-c63eff37c66a";

const FORM_PATCH_FROM = "if (fd.get('company')) return; this.setState({ formSent: true });";
const FORM_PATCH_TO =
  "if (fd.get('company')) return; " +
  "window.__mcdSend(e.currentTarget, fd, () => this.setState({ formSent: true }));";

/* Success is shown ONLY after Web3Forms confirms it. On failure the form goes
 * back to editable and says so - the design has no error state, so the message
 * is appended with role="alert" and names the address to write to instead.
 * Nothing here ever shows the success panel for a request that did not land. */
const FORM_RUNTIME = `<script>/* contact delivery - injected by tools/prerender.mjs */
(function(){window.__mcdSend=function(form,fd,onSent){
if(!form||!fd){return;}
fd.delete('company');
try{var picked=[];Array.prototype.forEach.call(form.querySelectorAll('[aria-pressed="true"]'),
function(b){var t=(b.textContent||'').trim();if(t){picked.push(t);}});
if(picked.length){fd.append('Auswahl',picked.join(' \\u00b7 '));}}catch(e){}
fd.append('access_key','${WEB3FORMS_KEY}');
fd.append('subject','Kontaktformular mccain-digital.com');
fd.append('from_name','mccain-digital.com');
var btn=form.querySelector('[type="submit"]');if(btn){btn.disabled=true;}
fetch('https://api.web3forms.com/submit',{method:'POST',body:fd})
.then(function(r){return r.json().catch(function(){return null;});})
.then(function(j){if(!j||j.success!==true){throw new Error((j&&j.message)||'rejected');}
if(btn){btn.disabled=false;}onSent();})
.catch(function(){if(btn){btn.disabled=false;}
var box=form.querySelector('.mcd-form-error');
if(!box){box=document.createElement('p');box.className='mcd-form-error';
box.setAttribute('role','alert');
box.style.cssText='margin:12px 0 0;padding:12px 14px;border-radius:10px;border:1px solid #E3E8EE;border-left:3px solid #E5484D;background:#F6F9FC;color:#0A2540;font-size:14px;line-height:1.5';
form.appendChild(box);}
box.innerHTML='Das Formular konnte nicht gesendet werden. Bitte schreiben Sie uns direkt an <a href="mailto:info@mccain-digital.com" style="color:#4D47C7;text-decoration:underline">info@mccain-digital.com</a>.';});};})();</script>`;

/* The brand guide's icon gallery hands an ARRAY of sub-paths to a single
 * <path d>, so the runtime stringifies it with commas and Blink rejects it:
 *     d="M12 3l1.9 5.1...z,M19 17v4,M17 19h4"
 * Nine of the multi-path icons render as nothing and print one console error
 * each - measured on /marke/, live render only, the prerendered copy is fine.
 * SVG path data concatenates with spaces, so joining is the whole fix, and
 * [].concat() keeps it correct if a future icon is a plain string. */
const ICON_PATCH_FROM = "d: Component.ICONS[n] })";
const ICON_PATCH_TO = "d: [].concat(Component.ICONS[n]).join(' ') })";

function fixIconGallery(script) {
  const n = script.split(ICON_PATCH_FROM).length - 1;
  return { script: n ? script.split(ICON_PATCH_FROM).join(ICON_PATCH_TO) : script, icons: n };
}

function wireForms(script, name) {
  const n = script.split(FORM_PATCH_FROM).length - 1;
  if (n === 0) {
    throw new Error(
      `prerender: no submit handler matched in ${name}. The export changed shape - ` +
        `re-read the handler and update FORM_PATCH_FROM, or the page ships a form that lies.`
    );
  }
  return { script: script.split(FORM_PATCH_FROM).join(FORM_PATCH_TO), forms: n };
}

/* THE BRAND MARK RAN 146 CSS ANIMATIONS, FOREVER, ON EVERY PAGE.
 *
 * mark(size, v, mode) builds the McCain square out of 146 <rect> cells and
 * gives every single cell its own animation. In 'loop' - what the header logo
 * switches to 1.6 s after mount - that is 146 infinite animations inside a
 * 34 px square, and the browser recalculates style for all of them, every
 * frame, for as long as the page is open. It is the most expensive thing on
 * this site by a wide margin.
 *
 * Measured 12.9.2026, two identical mobile Lighthouse runs on the start page,
 * the only difference being a stylesheet that switched those animations off:
 *
 *     animated   score 63   TBT 1026 ms   main thread 8497 ms
 *     static     score 68   TBT  778 ms   main thread 4971 ms
 *
 * 3.5 seconds of main-thread work for one logo. For comparison, the data
 * stream everybody suspected - 112 absolutely positioned chips - measured
 * 63 -> 64 and is left alone.
 *
 * The component documents a third mode itself ("mode: static | in | loop") and
 * its own chat variant already asks for it, so this is the export's switch and
 * not an invention. Static is the animation at rest: same geometry, same
 * colours, same fill-opacity, only `animation: none`.
 *
 * Owner 12.9.2026: "hau das logo raus, wenn wir das nicht gefixt bekommen. und
 * ersetze es durch ein statisches". */
const MARK_FROM = "mark(size, v, mode) {\n    const t = this.tileFree(size, v, mode);";
const MARK_TO = "mark(size, v, mode) {\n    const t = this.tileFree(size, v, 'static');";

/* With the mode ignored, the timer that flips the header logo from 'in' to
 * 'loop' wakes the whole application 1.6 s in to re-render identical markup. */
const NAVLOOP_FROM =
  "this.navLoopT = setTimeout(() => { if (this.mounted) this.setState({ navLoop: true }); }, 1600);";

/* "TECH-NOTIZEN" POINTED AT '#', IN THE MEGA MENU AND IN THE FOOTER, ON ALL 21
 * PAGES.
 *
 * It carried a "Bald" badge and an onClick that swallowed the click, so it was
 * at least honest - but it was still two links per page that go nowhere, and
 * they were 42 of the 46 dead anchors tools/seo_audit.mjs found.
 *
 * Owner 12.9.2026: "tech notizen kann raus, das machen wir eh nicht". So the
 * entries are removed rather than pointed somewhere: a menu with one fewer row
 * is a menu, a link to a page that will never exist is a promise.
 *
 * Removed from the resource list and the footer column the export builds them
 * from, so the row disappears with its icon, its text and its badge - not just
 * its href. There is no second copy to clean up any more: the delivered markup
 * is rendered FROM this patched script, so it never carries the rows either. */
const NOTES_MENU_FROM =
  "{ icon: this.icon('book', 18), title: t.menus.resNotes, text: t.menus.resNotesText, " +
  "soon: true, href: '#', target: '_self', onClick: (e) => e.preventDefault() },";
const NOTES_FOOT_FROM =
  "{ label: t.footer.notes, href: '#', target: '_self', onClick: (e) => e.preventDefault() },";


function dropTechNotes(script, name) {
  for (const [what, lit] of [["menu", NOTES_MENU_FROM], ["footer", NOTES_FOOT_FROM]]) {
    const n = script.split(lit).length - 1;
    if (n !== 1) {
      throw new Error(
        `prerender: expected exactly one Tech-Notizen ${what} entry in ${name}, found ${n}. ` +
          `The export changed shape - re-read it and update NOTES_${what.toUpperCase()}_FROM.`
      );
    }
  }
  return { script: script.split(NOTES_MENU_FROM).join("").split(NOTES_FOOT_FROM).join("") };
}

function stillMark(script, name) {
  const marks = script.split(MARK_FROM).length - 1;
  if (marks !== 1) {
    throw new Error(
      `prerender: expected exactly one mark() in ${name}, found ${marks}. The export changed ` +
        `shape - re-read it and update MARK_FROM, or every page ships 146 animations per logo.`
    );
  }
  const timers = script.split(NAVLOOP_FROM).length - 1;
  if (timers !== 1) {
    throw new Error(
      `prerender: expected exactly one navLoop timer in ${name}, found ${timers}. ` +
        `Re-read componentDidMount and update NAVLOOP_FROM.`
    );
  }
  return { script: script.split(MARK_FROM).join(MARK_TO).split(NAVLOOP_FROM).join("") };
}

/* THE RUNTIME MOUNTS INTO AN EMPTY DIV. IT HAS TO ADOPT WHAT THE BUILD RENDERED.
 *
 * Every other patch in this file rewrites the COMPONENT SCRIPT. This is the one
 * patch on the runtime itself, and it is the point of the whole build-time
 * render: support.js creates a fresh <div id="dc-root">, replaces <x-dc> with it
 * and calls createRoot().render() - so React builds all ~2,900 nodes a second
 * time although the finished markup is already in the document and painted.
 *
 * Measured 12.9.2026, mobile, the same page in four states: as shipped 70,
 * React downloaded and parsed but never booted 91, plain HTML 95. Downloading
 * the library costs ONE point. Rebuilding the page costs 21.
 *
 * With the markup written by react-dom/server at build time (ssrRender below),
 * React's first render and the delivered DOM are the same tree by construction,
 * so the mount can hydrate instead of rebuild. Two edits:
 *
 *   1. if the document already carries a filled #dc-root, adopt it instead of
 *      creating one, and drop the (empty) <x-dc> rather than replacing it
 *   2. hydrateRoot for that case, createRoot for every other
 *
 * BOTH BRANCHES SURVIVE. An artboard opened straight out of mccain-design-system/
 * has no #dc-root and takes exactly the old path - which is what keeps the raw
 * export openable, and what ssrRender itself runs on.
 *
 * Why patching third-party code is acceptable here where the header says it is
 * not: both replacements are asserted to occur exactly once. A re-exported
 * runtime that moved either line fails the build loudly instead of quietly going
 * back to rendering everything twice.
 *
 * Do NOT try this against a settled DOM snapshot. That was measured twice on
 * 12.9.2026: 1,193 of ~3,000 node positions differ, React 418/425/423 on every
 * page, 32 console errors, no gain. The snapshot is the page after seconds of
 * life; React's first render is the page at zero. They are different documents. */
const HYDRATE_FROM = `    const dc = doc.querySelector("x-dc");
    const hostEl = doc.createElement("div");
    hostEl.id = "dc-root";
    dc.replaceWith(hostEl);`;

const HYDRATE_TO = `    const dc = doc.querySelector("x-dc");
    const prerendered = doc.getElementById("dc-root");
    const hydrate = !!(prerendered && prerendered.firstElementChild);
    const hostEl = hydrate ? prerendered : doc.createElement("div");
    hostEl.id = "dc-root";
    if (hydrate) dc.remove();
    else dc.replaceWith(hostEl);`;

const MOUNT_FROM = `    const ReactDOM = getReactDOM();
    if (ReactDOM.createRoot)
      ReactDOM.createRoot(hostEl).render(h(StandaloneRoot));
    else ReactDOM.render(h(StandaloneRoot), hostEl);`;

const MOUNT_TO = `    const ReactDOM = getReactDOM();
    if (hydrate && ReactDOM.hydrateRoot)
      ReactDOM.hydrateRoot(hostEl, h(StandaloneRoot));
    else if (ReactDOM.createRoot)
      ReactDOM.createRoot(hostEl).render(h(StandaloneRoot));
    else ReactDOM.render(h(StandaloneRoot), hostEl);`;

function patchRuntime(code) {
  for (const [from, what] of [
    [HYDRATE_FROM, "the mount point"],
    [MOUNT_FROM, "the mount call"],
  ]) {
    const n = code.split(from).length - 1;
    if (n !== 1) throw new Error(`prerender: support.js - expected ${what} exactly once, found ${n}`);
  }
  return code.split(HYDRATE_FROM).join(HYDRATE_TO).split(MOUNT_FROM).join(MOUNT_TO);
}

/* THE BRAND MARK IS 146 DOM NODES IN A 34-PIXEL BOX, FIVE TIMES PER PAGE.
 *
 * Measured 13.9.2026 on the start page: five marks x 146 cells = 730 elements,
 * 23 % of the whole document, and 138.026 B of the 845.734 B of HTML - for
 * logos between 22 and 34 pixels. PageSpeed named it without being asked: "Die
 * meisten untergeordneten Elemente: header > div > button > svg ... 146".
 *
 * Why that is expensive even standing still: every one of those rects carries
 * an inline style, so each of them is a row in every style recalculation, a box
 * in every layout pass and a paint op in every paint. The owner's own recording
 * put Recalculate style, Layerize, Layout, Paint, Commit and Pre-paint together
 * at 65 % of the profile - the pipeline, not the script. Nothing shrinks that
 * like removing a quarter of the DOM.
 *
 * So the mark becomes ONE <img> pointing at a standalone SVG file. Identical
 * pixels - it is the same geometry, the same fills, written out instead of
 * built as elements - but the browser rasterises it once in an image context
 * and caches it across all 21 pages. Zero nodes, zero style rows, zero layout
 * boxes on the page itself.
 *
 * The files are not hand-written: mark() itself stashes the SVG it WOULD have
 * built into window.__dcMarks while ssrRender() runs, and the build writes
 * whatever it finds there. So the file and the markup cannot drift - they come
 * from the same call.
 *
 * The key is size plus colour variant, which is exactly what tileFree() varies
 * on now that stillMark() has pinned the mode: a 22px mark has 146 cells, the
 * 52px one 152 and the 88px one 151, so the geometry really is per size.
 *
 * Runs AFTER stillMark(), and matches the stilled text on purpose: chaining the
 * assertions means a re-export that changes either one fails loudly instead of
 * silently keeping 730 nodes.
 */
const MARKIMG_FROM =
  "  mark(size, v, mode) {\n" +
  "    const t = this.tileFree(size, v, 'static');\n" +
  "    return React.createElement('svg', { viewBox: '0 0 64 64', width: t.size, height: t.size, 'aria-hidden': 'true', style: { display: 'block', flex: 'none' } },\n" +
  "      t.cells.map((c, i) => React.createElement('rect', { key: i, fillOpacity: c.o, x: c.x, y: c.y, width: c.s, height: c.s, rx: c.r, fill: c.fill, style: { transformBox: 'fill-box', transformOrigin: 'center', animation: c.anim } })));\n" +
  "  }\n";

const MARKIMG_TO =
  "  mark(size, v, mode) {\n" +
  "    const t = this.tileFree(size, v, 'static');\n" +
  "    const key = t.size + '-' + (v === 'white' ? 'w' : 'c');\n" +
  "    if (typeof window !== 'undefined') {\n" +
  "      const reg = (window.__dcMarks = window.__dcMarks || {});\n" +
  "      if (!reg[key]) reg[key] = '<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\" width=\"' + t.size + '\" height=\"' + t.size + '\">' + t.cells.map(function (c) {\n" +
  "        return '<rect x=\"' + c.x + '\" y=\"' + c.y + '\" width=\"' + c.s + '\" height=\"' + c.s + '\" rx=\"' + c.r + '\" fill=\"' + c.fill + '\"' + (c.o == null ? '' : ' fill-opacity=\"' + c.o + '\"') + '/>';\n" +
  "      }).join('') + '</svg>';\n" +
  "    }\n" +
  "    return React.createElement('img', { src: '/brand/mark-' + key + '.svg', width: t.size, height: t.size, alt: '', 'aria-hidden': 'true', fetchPriority: 'high', style: { display: 'block', flex: 'none' } });\n" +
  "  }\n";

function markToFile(script, name) {
  const n = script.split(MARKIMG_FROM).length - 1;
  if (n !== 1) {
    throw new Error(
      `prerender: expected exactly one mark() to turn into an <img> in ${name}, found ${n}. ` +
        `The export redrew the brand mark - re-read it and update MARKIMG_FROM.`
    );
  }
  return { script: script.split(MARKIMG_FROM).join(MARKIMG_TO) };
}

/* THE CONSENT NOTICE HAD A GRADIENT BORDER THAT SCROLLED FOREVER.
 *
 * Owner 13.9.2026, reading Lighthouse's "Nicht zusammengesetzte Animationen":
 * "nimm den mal bei dem cookie banner raus, den brauchen wir da eh nicht".
 *
 * It was the worst placement of the five: `animation: streamBorder 8s linear
 * infinite` on an element that is also `position: fixed`, so it kept a
 * composited layer alive and repainted for the whole life of the page - and
 * `background-position` cannot be composited at all, which is exactly what
 * Lighthouse named it for.
 *
 * The gradient itself STAYS. Only the scrolling stops: the border keeps its
 * colours, the panel keeps its fadeUp entrance. Nothing about the design
 * changes except that a decoration nobody watches stops burning frames.
 *
 * The other four (the three inputs and the pill) are left alone on purpose -
 * they are small, they sit where someone is looking, and the owner asked for
 * this one. */
const CONSENT_ANIM_FROM = "animation: streamBorder 8s linear infinite, fadeUp";
const CONSENT_ANIM_TO = "animation: fadeUp";

function calmConsent(template, name) {
  const n = template.split(CONSENT_ANIM_FROM).length - 1;
  if (n !== 1) {
    throw new Error(
      `prerender: expected exactly one animated consent border in ${name}, found ${n}. ` +
        `The export changed the notice - re-read it and update CONSENT_ANIM_FROM.`
    );
  }
  return { template: template.split(CONSENT_ANIM_FROM).join(CONSENT_ANIM_TO), calmed: n };
}

/* THE DRIFTING STREAM LABELS: A MOUSE THING, A LATE THING, AND NOT A POLLING
 * THING.
 *
 * Three separate defects lived in one function, found by profiling the page
 * eighteen seconds AFTER load - a window in which a finished page should be
 * doing nothing at all. It was doing 1.275 ms of work, and 791 ms of that
 * (62 %) was here:
 *
 *     getBoundingClientRect   553 ms   3,0 %
 *     movePointsGlobal        238 ms   1,3 %
 *
 * WHY THAT NUMBER MATTERS FAR MORE THAN IT LOOKS. Lighthouse does not report
 * "blocking time during load". It reports blocking time from FCP to TTI, and
 * TTI is the first instant after which the main thread stays free of long
 * tasks for FIVE SECONDS. Measured on the live page at 4x CPU: a long task
 * every 6,5 seconds, forever, which leaves a longest quiet gap of 6,4 s. That
 * clears the five-second bar by 1,4 s. On a slower machine it does not clear
 * it at all - and then TTI slides to the END of the trace and every long task
 * of the whole session counts as blocking time. That is the difference between
 * the 210 ms this machine measures and the 13.060 ms Google reports on a page
 * that paints in 0,8 s. It is a cliff, not a slope, and we were standing on
 * the edge of it.
 *
 * The three fixes, in the order they matter:
 *
 * 1. STOP POLLING THE LAYOUT.  Owner 13.9.2026: "muessen die notes alle 2 sec
 *    neue css bekommen, das reicht doch wenn die einmal beim spawnen die
 *    parameter bekommen." Correct. Per FRAME each label gets a transform and
 *    an opacity - that is what drifting means, and both are composited. But
 *    every TWO SECONDS the function also rebuilt its "avoid" list by calling
 *    getBoundingClientRect() on every h1..p, li, button, a, img, svg, form and
 *    footer in the document. A page's layout does not change every two
 *    seconds. It changes when the viewport changes or when the document grows,
 *    and a ResizeObserver on the component root says exactly when that
 *    happened - so the scan is now event-driven instead of timed. The 30 s
 *    fallback is insurance against a layout change that alters no box we
 *    watch; it is 6x Lighthouse's quiet threshold, so it can never cost us TTI.
 *
 *    NOT ON <body> (corrected 16.9.2026). The first version observed <body>,
 *    and the page sets `html,body{height:100%}`: body is always exactly one
 *    viewport tall, so the observer fired once at start and never again.
 *    Since the sections are deferred (content-visibility, below) the page
 *    changes height every time one of them is rendered for the first time -
 *    measured on the start page, 16 changes from 16.523 down to 12.477 px on
 *    one scroll through - and the avoid list kept the positions of the first
 *    scan for up to 30 s. The labels then faded out in the wrong places and
 *    drifted across the contact band's text, which is marked data-avoid as a
 *    whole (owner, 16.9.). The root element (`min-height:100vh`, height from
 *    its content) reported all 16 changes in the same run, <body> one.
 *
 * 2. START LATE.  Owner: "kann man denn die notes defern, das die erst nach 10
 *    sec auftauchen". Nothing about a drifting decoration needs to exist while
 *    the page is still being read for the first time. Ten seconds after `load`,
 *    which scales with a slow connection instead of racing it. The labels ship
 *    with opacity:0, visibility:hidden and a .3s opacity transition, so they
 *    fade in when their turn comes - there is no pop to hide.
 *
 * 3. MOUSE ONLY, NOT JUST "NOT A PHONE".  Owner: "auf mobile wuerde ich die
 *    mitlaufenden notes nicht anzeigen, das sieht man eh nicht und kann sie
 *    nicht usen" and then "auch tablets". The honest test is not a width, it is
 *    whether there is a pointer that can hover one - a label you cannot hover
 *    is a label doing nothing but cost. `(pointer:fine)` catches every touch
 *    device at any size, including an iPad in landscape, which a width alone
 *    misses; the 1280 px floor additionally keeps small laptop windows clear.
 *
 * Two halves for the gate, because one alone is not enough:
 *
 *   CSS   hides the layer, and applies at the FIRST paint before any script -
 *         so a phone or tablet never lays the labels out or paints them.
 *   JS    leaves movePointsGlobal before it touches the DOM, so no frame work
 *         happens even though the elements are still in React's tree.
 *
 * Not removed from the DOM: React owns that subtree, and fighting it over ~30
 * nodes would cost more than it saves. display:none takes them out of layout
 * and paint, which is the expensive part.
 *
 * The ResizeObserver is deliberately never disconnected. It is one observer per
 * page, hung on the canvas, and this root does not unmount for the lifetime of
 * the document - a teardown path would be dead code pretending to be hygiene.
 */
const PT_MOBILE_CSS =
  "<style>@media (max-width:1279px),(pointer:coarse){[data-pt-layer]{display:none!important}}</style>";

/* Anchors are matched against the RAW export, and each one is counted: if a
 * re-export rewrites the label engine the build stops here instead of quietly
 * shipping a page that polls the layout forever again. */
const PT_BAIL_FROM = `  movePointsGlobal(tm, canvas) {
    const root = this.rootEl; if (!root) return;
`;

const PT_BAIL_TO = `  movePointsGlobal(tm, canvas) {
    const root = this.rootEl; if (!root) return;
    if (this.ptGate === undefined) {
      this.ptGate = window.matchMedia ? window.matchMedia('(min-width:1280px) and (pointer:fine)') : null;
      const arm = () => setTimeout(() => { this.ptLate = 1; }, 10000);
      if (document.readyState === 'complete') arm();
      else window.addEventListener('load', arm, { once: true });
    }
    if (!this.ptLate || (this.ptGate && !this.ptGate.matches)) return;
`;

const PT_POLL_FROM = `    if (!canvas._pool || (tm - (canvas._ptT || 0)) > 2) {
`;

const PT_POLL_TO = `    if (!canvas._ptRO && window.ResizeObserver) {
      canvas._ptRO = new ResizeObserver(() => { canvas._ptDirty = 1; });
      canvas._ptRO.observe(root);
    }
    if (!canvas._pool || canvas._ptDirty || (tm - (canvas._ptT || 0)) > 30) {
`;

/* The line that closes the rebuild: clearing the flag has to happen where the
 * work actually happened, not where it was requested. */
const PT_STAMP_FROM =
  "canvas._pool = { els, avoid, span: Math.max(window.innerHeight * 2, " +
  "document.documentElement.scrollHeight) + 240 }; canvas._ptT = tm;";
const PT_STAMP_TO = PT_STAMP_FROM + " canvas._ptDirty = 0;";

function ptDesktopOnly(script, name) {
  for (const [label, from] of [
    ["movePointsGlobal", PT_BAIL_FROM],
    ["the 2 s layout poll", PT_POLL_FROM],
    ["the pool stamp", PT_STAMP_FROM],
  ]) {
    const n = script.split(from).length - 1;
    if (n !== 1) {
      throw new Error(
        `prerender: expected exactly one ${label} in ${name}, found ${n}. ` +
          `The export changed the stream labels - re-read it and update the PT_ anchors.`
      );
    }
  }
  return {
    script: script
      .split(PT_BAIL_FROM).join(PT_BAIL_TO)
      .split(PT_POLL_FROM).join(PT_POLL_TO)
      .split(PT_STAMP_FROM).join(PT_STAMP_TO),
  };
}

/* THE HEADLINE THAT ROTATES ON ONE PAGE AND RE-RENDERS TWENTY-ONE.
 *
 * The export arms this in componentDidMount, on every artboard:
 *
 *     this.heroT = setInterval(() => { ... this.setState({ heroIdx: ... }) }, 6500);
 *
 * Two things are wrong with it, and both were found by measuring rather than
 * reading. Profiling the live page at 4x CPU showed a long task every 6,5
 * seconds, forever. Blocking that one interval and measuring again:
 *
 *                        mit Rotation   ohne
 *     laengste Ruhe          6.432 ms   26.171 ms
 *     lange Aufgaben >5 s           4   0
 *
 * The page goes completely silent. The 26 s is just where the measurement
 * stopped, not where the quiet stopped.
 *
 * 1. IT RUNS ON TWENTY PAGES THAT DO NOT SHOW IT.  `heroLine` appears twice in
 *    the start page - once as the value built in renderVals, once as the
 *    binding that renders it. On the other twenty artboards it appears ONCE:
 *    the value is built and nothing consumes it. So every 6,5 seconds React
 *    reconciles a ~2.400-node tree on the imprint page to produce a screen
 *    that is pixel-for-pixel what it already was. Those pages do not arm the
 *    timer at all now.
 *
 * 2. ON THE ONE PAGE THAT DOES SHOW IT, IT RUNS OUT OF SIGHT.  Owner 13.9.:
 *    "alles andere muss naklar pausieren, wenn nicht in sicht." The component
 *    already knows - `heroVisible` is kept by an IntersectionObserver on
 *    [data-screen-label="Hero A"] and was simply not consulted here. Scrolled
 *    past the hero, the rotation now stops; scrolled back, it resumes. Nothing
 *    anybody can see changes, because nobody can see it.
 *
 * 3. IT STARTS AT THE FIRST FRAME.  Owner 13.9.: "wir koennen die erste
 *    rotation auch spaeter starten im hero, gar kein problem." So the interval
 *    is armed seven seconds in rather than at mount, which takes the first
 *    two re-renders out of the window Lighthouse measures blocking time in.
 *    This only SHIFTS the ticks, it does not end them - see below.
 *
 * WHAT THIS STILL DOES NOT FIX, stated plainly so nobody reads a green number
 * and thinks it is done: on the start page with the hero in view - which is
 * exactly how Lighthouse sees it, since it never scrolls - the tree is still
 * reconciled every 6,5 seconds, forever. The owner named the real answer:
 * "warum ist das js und nicht reines css.. macht keinen sinn das als js
 * rotieren zu lassen." Correct. The obstacle is not difficulty, it is that CSS
 * can only cross-fade words that are all IN the DOM, and the export's own
 * comment says why they are not: "only the active variant stays in the DOM -
 * otherwise the h1 reads as four concatenated sentences." That is an SEO
 * decision sitting on top of a performance one, and it gets its own round.
 *
 * What is deliberately NOT changed: the rotation itself, its 6,5 s cadence,
 * and the remount-by-key that retriggers the word-in animation. That is the
 * design, and the design is not a performance decision.
 */
const HERO_FROM =
  "    this.heroT = setInterval(() => { if (this.mounted && !this.reduced() && " +
  "!document.hidden && !this.state.modal) this.setState({ heroIdx: " +
  "(this.state.heroIdx + 1) % 4 }); }, 6500);";

/* Shown: keep the timer, add the visibility test the component already had an
 * answer for. */
const HERO_SEEN =
  "    this.heroT = null; setTimeout(() => { if (!this.mounted) return; " +
  "this.heroT = setInterval(() => { if (this.mounted && !this.reduced() && " +
  "!document.hidden && !this.state.modal && this.state.heroVisible) this.setState({ heroIdx: " +
  "(this.state.heroIdx + 1) % 4 }); }, 6500); }, 7000);";

/* Not shown: never arm it. Left as an assignment so componentWillUnmount's
 * clearInterval(this.heroT) stays valid. */
const HERO_UNSEEN =
  "    this.heroT = null; /* prerender: no heroLine binding on this page - " +
  "rotating it would re-render the tree to produce the same pixels */";

function heroCalm(script, template, name) {
  const n = script.split(HERO_FROM).length - 1;
  if (n !== 1) {
    throw new Error(
      `prerender: expected exactly one hero rotation in ${name}, found ${n}. ` +
        `The export changed the headline timer - re-read it and update HERO_FROM.`
    );
  }
  const shown = template.includes("heroLine");
  return {
    script: script.split(HERO_FROM).join(shown ? HERO_SEEN : HERO_UNSEEN),
    rotates: shown,
  };
}

/* THE ONE SCRIPT THAT STILL BLOCKED THE PARSER.
 *
 * The export puts <script src="pixel-engine.js"></script> in its helmet, which
 * means it lands in the MIDDLE of the rendered document - line 1.312 of 3.000
 * on the start page. No defer, no async: the parser stops there, fetches 42 KB,
 * parses and executes it, and only then keeps reading the page. support.js and
 * motion-budget.js were both already deferred; this one was missed because it
 * does not come from us, it comes from the artboard.
 *
 * Measured with Chrome's own coverage recorder, walking the whole page:
 *
 *     pixel-engine.js    42,1 KB geliefert    38,7 KB nie ausgefuehrt   92 %
 *
 * That is not dead code, and it must not be treated as such: the library
 * offers headline, button, morph, sand, voidReveal, legibleStops, slides and
 * image, and the site calls exactly TWO of them - PX.button and PX.image,
 * 21 times each, once per page. The other entry points and everything only
 * they reach are simply never entered. Deleting them is a separate decision
 * with a separate risk; moving the parse off the critical path is neither.
 *
 * WHY IT MOVES INTO THE HEAD RATHER THAN JUST GETTING A defer ATTRIBUTE WHERE
 * IT STANDS.  Deferred scripts run in DOCUMENT ORDER, and support.js sits in
 * the head at line 259. Deferring the engine in place would run it AFTER
 * support.js has booted React and called initPixels - which begins
 * `const PX = window.PixelFX; if (!PX) return;` and fails silently. Every
 * pixel effect on the site would disappear without a single console message.
 * So the tag is lifted out of the helmet and re-emitted in the head BEFORE
 * support.js, where defer preserves the order it needs.
 *
 * Both sides are counted: exactly one tag comes out of each template, and the
 * head puts exactly one back.
 */
const PXE_TAG = /<script src="\.{0,2}\/?pixel-engine\.js"><\/script>/g;

/* SLIPS IN THE EXPORT, FIXED AT THE SOURCE OF THE BUILD.
 *
 * The work card "Unsere eigene Seite: 4×100 in Lighthouse" repeats over
 * `lhScores`, whose items are objects ({ k: 'PERF', d: '0.12s' }), and prints
 * `{{ l }}` - the whole object - so every label read "[object Object]" on the
 * page, in the prerendered markup and in the Markdown twin (found 16.9.2026 by
 * tools/markdown-check.mjs). The service tile next to it prints `{{ l.k }}`
 * and is right. The export is Claude Design's output and comes back with the
 * next export, so the correction lives here, counted: every page renders the
 * same component template, so each find must occur exactly once per page, or
 * the export changed and this list needs a look. */
const EXPORT_FIXES = [
  { find: 'line-height:1.3">{{ l }}</div>', repl: 'line-height:1.3">{{ l.k }}</div>' },
];

function fixExportTemplate(template, name) {
  let out = template;
  for (const f of EXPORT_FIXES) {
    const n = out.split(f.find).length - 1;
    if (n !== 1) throw new Error(`prerender: expected "${f.find}" exactly once in ${name}, found ${n} - the export changed, update EXPORT_FIXES`);
    out = out.replace(f.find, () => f.repl);
  }
  return out;
}

function deferPixelEngine(template, name) {
  const n = (template.match(PXE_TAG) || []).length;
  if (n !== 1) {
    throw new Error(
      `prerender: expected exactly one pixel-engine script in ${name}, found ${n}. ` +
        `The export changed how it loads the engine - re-read it and update PXE_TAG.`
    );
  }
  return { template: template.replace(PXE_TAG, ""), moved: n };
}

/* THE COOKIE NOTICE ARRIVED AT 1,4 SECONDS.
 *
 * Owner 13.9.: "der cookie hinweis muss auch gedefert werden man! der kann
 * nicht nach 3 sec kommen, mach den mal 7!" Measured, it was worse than he
 * thought - the export asks at 1.400 ms:
 *
 *     if (!localStorage.getItem('mcd.consent'))
 *       setTimeout(() => this.setState({ consent: 'ask' }), 1400);
 *
 * Two reasons that number is wrong, and only one of them is about speed.
 *
 * It lands ON the first contentful paint. A banner that slides in while the
 * page is still assembling reads as part of the page failing to settle, and it
 * asks for a decision from somebody who has not yet seen what they are
 * deciding about. Seven seconds is enough to read a headline first.
 *
 * And `setState` on this root re-renders the whole ~2.400-node tree. At 1.400
 * ms that lands inside the window Lighthouse measures blocking time in; at
 * 7.000 ms it lands after it. Same work, and it stops counting against a
 * number that decides how the site ranks.
 *
 * Counted per page: exactly one notice, or the build stops.
 */
const CONSENT_T_FROM =
  "if (this.mounted) this.setState({ consent: 'ask' }); }, 1400);";
const CONSENT_T_TO =
  "if (this.mounted) this.setState({ consent: 'ask' }); }, 7000);";

function laterConsent(script, name) {
  const n = script.split(CONSENT_T_FROM).length - 1;
  if (n !== 1) {
    throw new Error(
      `prerender: expected exactly one consent timer in ${name}, found ${n}. ` +
        `The export changed the notice - re-read it and update CONSENT_T_FROM.`
    );
  }
  return { script: script.split(CONSENT_T_FROM).join(CONSENT_T_TO), delayed: n };
}

/* TWENTY SECTIONS LAID OUT FOR A VISITOR WHO CAN SEE ONE.
 *
 * Owner 13.9.2026: "die INHALTE der seite. die muessen gedefert werden. das ist
 * doch irre, so eine riesen seite direkt zu rendern. vor allem sind das alles
 * sectionen, die kann man MIT den dazugehoerigen animationen defern." And:
 * "der hero und die ersten 2 sectionen oder die erste muessen geladen werden,
 * der rest bei scroll."
 *
 * The measurement that made him say it - the start page, mobile, 4x CPU, in
 * 250 ms slices:
 *
 *        ab        Skript  Stil+Layout  Rendern  Other  Parsen
 *      1000 ms          1        168       24      28     20   = 241 von 250
 *      1250 ms          0        190       23      14     30   = 256 von 250
 *      1500 ms          1         94       90      56      1   = 241 von 250
 *      1750 ms         22        142       13      23     57   = 258 von 250
 *
 * From 1,0 s to 1,9 s the main thread is fully occupied and SCRIPT EVALUATION
 * IS ONE MILLISECOND. Nothing is running. The browser is laying out 2.408
 * nodes - all nineteen sections, nineteen thousand pixels of page - for
 * somebody looking at nine hundred of them. That is also the answer to "the
 * logo takes 2.030 ms": it does not. Its bytes were there at 330 ms and there
 * was no free moment to paint them until the layout was done.
 *
 * `content-visibility: auto` is the platform's own answer and needs no
 * JavaScript: a section outside the viewport is skipped for style, layout and
 * paint, its animations do not tick, and Chrome renders it when it is either
 * approached or the main thread is idle. Measured ceiling before building it,
 * same page, same conditions:
 *
 *     LCP  2.980 -> 1.516 ms   (-49 %)      Seitenhoehe 19.611 -> 19.611 px
 *
 * TBT does not move, and that is expected rather than disappointing: TBT here
 * is one 636 ms hydration block, which is script, not layout. This fixes the
 * layout half.
 *
 * WHY AN ATTRIBUTE AND NOT A LIST OF SECTION NAMES. The labels are German and
 * carry umlauts ("Uebergabe" is spelled with the umlaut in the export), they
 * differ per artboard, and a selector list would have to be escaped and
 * regenerated for all 21 pages. A build-time `data-cv` marks exactly the
 * elements that qualify and the stylesheet stays one line.
 *
 * WHAT IS EXCLUDED, AND WHY IT MATTERS MORE THAN WHAT IS INCLUDED:
 *
 *   position:fixed / sticky   The navigation, the cookie notice, the chat
 *                             dock, the mobile menu and the modal. They are
 *                             not in the flow; containing them would clip or
 *                             collapse an overlay - the kind of break that
 *                             shows up only when somebody opens the menu.
 *
 * The first version of this read only the attributes written BEFORE
 * data-screen-label, and on four of the five overlays `style` is written
 * AFTER it. All four were marked; the modal and the mobile menu would have
 * been contained, and nothing would have said so until somebody tapped the
 * menu. The tag is matched whole now, quotes and all, and the build refuses to
 * continue unless it recognises at least four fixed screens - a silent zero
 * there is exactly the shape of that bug.
 *   the first two in flow     Hero and the section under it. They are on
 *                             screen at once, so skipping them would cost a
 *                             re-render and gain nothing.
 *
 * contain-intrinsic-size uses the `auto` keyword, so the browser substitutes
 * the real height once it has measured a section and only falls back to the
 * 900 px guess for one it has never rendered. Measured: total page height is
 * identical with and without, which is the check that matters - a wrong guess
 * shows up as a scrollbar that changes length while you read.
 *
 * A DARK BAND KEEPS ITS GROUND OUTSIDE THE CONTAINMENT (added 16.9.2026).
 *
 * The dark bands - on the start page KI-Konsole, Studio, FAQ, News, Kontakt
 * and the footer - paint their ground as their first child: an empty
 * aria-hidden layer at z-index:-2, one step below the pixel stream's fixed
 * canvas at -1. That order only holds while both sit in the same stacking
 * context. content-visibility applies paint containment, and paint containment
 * makes the marked element a stacking context of its own, so the whole band,
 * ground included, was painted above the canvas: the stream vanished behind
 * every dark band, on the React page and in v5 alike (owner, 16.9.).
 *
 * For those bands the mark moves one level down, onto the content wrapper
 * right after the layer. The ground stays in the page's stacking context and
 * the content - the part that costs layout - is still skipped. Measured on the
 * start page at 1440, 1920 and 412 px, full page with the stream hidden, mark
 * on the band vs. mark on the wrapper: nothing clipped, the only differing
 * pixels are sub-pixel text edges. A negative layer that is NOT empty stops
 * the build instead, because there is no wrapper to move the mark to and
 * marking the band would bring the bug back without a word.
 */
const CV_CSS =
  "<style>[data-cv]{content-visibility:auto;contain-intrinsic-size:auto 900px}</style>";

const CV_EAGER = 2; /* hero + the section under it */
/* The WHOLE opening tag, quoted values included, so the position test sees
 * every attribute rather than only the ones that happen to be written first. */
const SECTION_TAG = /<([a-z]+)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
const CV_MIN_FIXED = 4; /* nav, notice, dock, menu, modal - four is the floor */
/* The first child of a section, read from the text right after its opening tag. */
const FIRST_CHILD = /^\s*<([a-z]+)((?:[^>"']|"[^"]*"|'[^']*')*)>/;
/* ...and the same child when it is empty, followed by the tag of its sibling. */
const EMPTY_THEN_SIBLING = /^\s*<([a-z]+)(?:[^>"']|"[^"]*"|'[^']*')*>\s*<\/\1>\s*<([a-z]+)[\s>]/;
const NEGATIVE_Z = /z-index\s*:\s*-\s*\d/;

function deferSections(template, name) {
  let inFlow = 0, marked = 0, fixed = 0, layered = 0;
  let wrapperAt = -1; /* offset of the content wrapper that takes a band's mark */
  const out = template.replace(SECTION_TAG, (whole, tag, attrs, offset, src) => {
    if (offset === wrapperAt) {
      wrapperAt = -1;
      return `<${tag} data-cv=""${attrs}>`;
    }
    if (!/\sdata-screen-label="/.test(attrs)) return whole;
    if (/position\s*:\s*(fixed|sticky)/.test(attrs)) { fixed++; return whole; }
    inFlow++;
    if (inFlow <= CV_EAGER) return whole;
    marked++;
    const rest = src.slice(offset + whole.length, offset + whole.length + 2000);
    const first = FIRST_CHILD.exec(rest);
    if (!first || !/\saria-hidden="true"/.test(first[2]) || !NEGATIVE_Z.test(first[2])) {
      return `<${tag} data-cv=""${attrs}>`;
    }
    const layer = EMPTY_THEN_SIBLING.exec(rest);
    if (!layer) {
      throw new Error(
        `prerender: a band in ${name} has a background layer below the stream ` +
          `that is not an empty element followed by its content - there is no ` +
          `wrapper to take content-visibility, and marking the band would paint ` +
          `its ground over the pixel stream. Layer: ${first[0].trim().slice(0, 160)}`
      );
    }
    wrapperAt = offset + whole.length + layer[0].length - layer[2].length - 2;
    layered++;
    return whole;
  });
  if (wrapperAt !== -1) {
    throw new Error(`prerender: section deferral in ${name} lost a band's content wrapper at ${wrapperAt}.`);
  }
  if (marked === 0 || fixed < CV_MIN_FIXED) {
    throw new Error(
      `prerender: section deferral looks wrong in ${name} - ${marked} marked, ` +
        `${inFlow} in flow, ${fixed} fixed (expected at least ${CV_MIN_FIXED}). ` +
        `The export changed data-screen-label or how the overlays are positioned.`
    );
  }
  return { template: out, marked, layered, eager: Math.min(inFlow, CV_EAGER), fixed };
}

/* NO PAGE HAD A <main>.
 *
 * The content sections sit as siblings between <header> and <footer>, so a
 * screen reader offers no "skip to main content" landmark and the skip link at
 * the top jumps to a plain <section>. Putting role="main" on one section would
 * be worse than nothing - it would claim the first section IS the content.
 *
 * The wrap is derived from the document, not guessed: everything between the
 * site header and the footer. Measured across all 21 published artboards - one
 * <footer> each, always last, no existing <main>. Anything else throws rather
 * than shipping a landmark in the wrong place. The chat dialog and the
 * ask-the-page widget sit after the footer and stay outside, which is where a
 * dialog belongs, and the skip link sits before the header.
 *
 * Header to footer, rather than first-section to footer, because /marke/ is
 * built differently: its content is one <div id="inhalt"> that opens with a
 * <header> of its own. Starting at the first <section> put <main> INSIDE that
 * wrapper and left the page's title block outside it - where a <header> with
 * no sectioning ancestor counts as a second `banner` landmark. Taking the
 * whole span puts it inside <main>, where it is an ordinary heading group, and
 * the page has one banner again.
 *
 * Applied to BOTH copies. The prerendered markup is what a crawler reads; the
 * template is what React renders over it a moment later. A landmark in only
 * one of them is a landmark that disappears. */
function wrapMain(html, what, which) {
  if (/<main[\s>]/i.test(html)) throw new Error(`prerender: ${what} (${which}) already has a <main>`);

  const headerEnd = html.indexOf("</header>");
  if (headerEnd < 0) throw new Error(`prerender: no </header> in ${what} (${which})`);
  const openAt = headerEnd + "</header>".length;

  const footers = html.split("<footer").length - 1;
  if (footers !== 1) throw new Error(`prerender: expected one <footer> in ${what} (${which}), found ${footers}`);
  const closeAt = html.indexOf("<footer");
  if (closeAt < openAt) throw new Error(`prerender: the <footer> precedes the content in ${what} (${which})`);
  if (!/<section[\s>]/i.test(html.slice(openAt, closeAt)))
    throw new Error(`prerender: no <section> between header and footer in ${what} (${which})`);

  return html.slice(0, openAt) + "<main>" + html.slice(openAt, closeAt) + "</main>" + html.slice(closeAt);
}

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

/* ------------------------------------------------------- meta from the page */
/* Each artboard carries its own <helmet> with title, description, og:image and
 * JSON-LD. Those are the designed values and are taken as they are - retyping
 * them here is how a head and a page start disagreeing.
 *
 * The canonical is the exception. Three artboards carry a copy-pasted
 * canonical pointing at /rechtliches/, which would tell Google that the news
 * page, the article and the brand page are all the legal page. The ROUTE
 * decides it, and every occurrence of the source's own canonical string is
 * rewritten with it - which fixes og:url, twitter and the @id fields in the
 * JSON-LD in the same pass, rather than leaving three of them disagreeing. */
/* SEVEN TITLES WERE LONG ENOUGH TO BE CUT OFF IN THE RESULT.
 *
 * Measured 12.9.2026 with entities decoded, which matters: "ERP &amp; CRM"
 * reads as 12 characters in the file and 8 on the screen, and counting the file
 * puts two titles on the wrong side of the line. Over the ~60-character mark,
 * Google truncates - and it truncates the END, which on this site is the brand.
 *
 * So the brand suffix is what goes, and only where the title would otherwise be
 * cut: the page's own wording, which is the part that has to earn the click, is
 * never touched. Dropping it everywhere for consistency would be a copy
 * decision; dropping the part that was going to be thrown away anyway is not.
 * The seven affected land at 44-51 characters.
 *
 * Not fixed here, because it needs words rather than a rule: /news/ is
 * "News · McCain Digital", 21 characters, which is too thin to say anything. */
const TITLE_MAX = 60;
const TITLE_BRAND = " · McCain Digital";

function shortenTitle(title) {
  /* Rendered length, not source length - see above. Only the entities the
   * export actually produces; an unknown one should stand out, not be guessed. */
  const rendered = (s) =>
    s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

  const len = rendered(title).length;
  if (len <= TITLE_MAX || !title.endsWith(TITLE_BRAND)) return { title, trimmed: false, len };

  const short = title.slice(0, -TITLE_BRAND.length);
  const shortLen = rendered(short).length;
  if (shortLen > TITLE_MAX) {
    throw new Error(
      `prerender: "${short}" is ${shortLen} characters even without the brand. ` +
        `That one needs rewriting, not trimming.`
    );
  }
  return { title: short, trimmed: true, len: shortLen };
}

function metaOf(src, page) {
  const helmet = /<helmet>([\s\S]*?)<\/helmet>/.exec(src);
  if (!helmet) throw new Error(`prerender: no <helmet> in ${page.src}`);
  const h = helmet[1];

  const pick = (re) => {
    const m = re.exec(h);
    return m ? m[1] : null;
  };
  const title = pick(/<title>([\s\S]*?)<\/title>/);
  const desc = pick(/<meta name="description" content="([^"]*)"/);
  const ogImage = pick(/<meta property="og:image" content="([^"]*)"/);
  const themeColor = pick(/<meta name="theme-color" content="([^"]*)"/) || "#635BFF";
  const declared = pick(/<link rel="canonical" href="([^"]*)"/);
  const ld = h.match(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g) || [];

  if (!title) throw new Error(`prerender: no <title> in ${page.src}`);
  if (!desc) throw new Error(`prerender: no description in ${page.src}`);

  const want = ORIGIN + page.route;
  const fix = (s) => (declared && declared !== want ? s.split(declared).join(want) : s);

  const over = page.meta || {};
  const trimmed = shortenTitle(over.title || title);
  return {
    title: trimmed.title,
    titleTrimmed: trimmed.trimmed,
    titleLen: trimmed.len,
    desc: over.desc || desc,
    ogImage: over.ogImage || (ogImage ? fix(ogImage) : `${ORIGIN}/og-image.png`),
    themeColor,
    ld: ld.map(fix),
    canonicalWasWrong: !!declared && declared !== want,
    overridden: Object.keys(over).length,
  };
}

function headOf(meta, page, runtimeHead) {
  const want = ORIGIN + page.route;
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(meta.title)}</title>
<meta name="description" content="${esc(meta.desc)}">
<link rel="canonical" href="${want}">
<meta name="robots" content="${ROBOTS}">
<meta name="theme-color" content="${esc(meta.themeColor)}">
<meta name="author" content="McCain Digital">
<meta property="og:type" content="${page.route === "/" ? "website" : "article"}">
<meta property="og:site_name" content="McCain Digital">
<meta property="og:locale" content="de_DE">
<meta property="og:url" content="${want}">
<meta property="og:title" content="${esc(meta.title)}">
<meta property="og:description" content="${esc(meta.desc)}">
<meta property="og:image" content="${esc(meta.ogImage)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(meta.title)}">
<meta name="twitter:description" content="${esc(meta.desc)}">
<meta name="twitter:image" content="${esc(meta.ogImage)}">
<link rel="icon" href="/brand/mccain-favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/brand/apple-touch-icon-180.png">
${preloads}
<style>${fontCss}</style>
<!-- support.js is deferred: it was blocking the parser in front of several
     hundred KB of document, and on an already-prerendered page there is nothing
     to gain from running the runtime before the readable copy exists.

     React is deliberately NOT preloaded. It looks like it should help -
     support.js only requests it after it runs - but measured over three runs
     each on the v3 build, preloading moved median FCP from 349 ms to 485 ms:
     the two files compete with the document for the same connection, and the
     document is what paints. -->
${meta.ld.join("\n")}
<script>window.__resources=${JSON.stringify(RESOURCE_MAP)};</script>
${HIDE_TEMPLATE}
${runtimeHead}`;
}

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

/* ------------------------------------------------------------------- render */

/* THE ASSETS ARE WRITTEN BEFORE THE BROWSER STARTS, AND THAT ORDER IS LOAD-BEARING.
 *
 * ssrRender() below renders each page in a staging document that pulls
 * /_dcbuild/support.js - so the runtime it renders against has to be
 * THIS build's, patched by patchRuntime(). Copied afterwards, as it was until
 * the build-time render existed, every page would be rendered against the
 * PREVIOUS build's runtime and the mismatch would only show as a hydration
 * error, on a page that still looks fine. */
fs.rmSync(SSR_DIR, { recursive: true, force: true });
fs.mkdirSync(path.join(SSR_DIR, "vendor"), { recursive: true });
for (const [from, to] of Object.entries(ASSETS)) copy(from, to);
for (const f of VENDOR_REACT) {
  const src = path.join(HERE, "vendor-build", f);
  if (!fs.existsSync(src)) throw new Error(`prerender: tools/vendor-build/${f} is missing - see tools/vendor-build/README.md`);
  fs.copyFileSync(src, path.join(SSR_DIR, "vendor", f));
}

/* OUR OWN RUNTIME, NOT THE EXPORT'S - see tools/motion-budget.js for what it
 * does and the numbers that justify it. Minified through the same step as the
 * export's runtimes so the commented source stays the source of record. */
{
  const src = path.join(HERE, "motion-budget.js");
  if (!fs.existsSync(src)) throw new Error("prerender: tools/motion-budget.js is missing");
  const out = esbuild.transformSync(fs.readFileSync(src, "utf8"), {
    loader: "js",
    minify: true,
    legalComments: "none",
    target: "es2019",
  });
  fs.writeFileSync(path.join(SITE, "motion-budget.js"), out.code, "utf8");
}

const { browser, context } = await launch(1440, 900);

/* ------------------------------------------------- the build-time render */
/* THE MARKUP IS RENDERED BY REACT, NOT SCRAPED OUT OF A BROWSER.
 *
 * What this replaces: the build used to let the page run for a few seconds,
 * scroll it end to end and take document.innerHTML. That produced markup a
 * crawler could read - the whole reason a build exists - but it is the page
 * AFTER seconds of life: counters at their end value, sections revealed, the
 * consent panel open, nodes that componentDidMount created imperatively.
 * React's first render is the page at zero. They are different documents, which
 * is why hydration against that snapshot failed twice (see patchRuntime).
 *
 * What happens instead: the patched script and the patched template are written
 * into a staging document, support.js compiles them exactly as a browser would,
 * and react-dom/server renders the component it produced. The result IS React's
 * first render, so hydrateRoot has nothing to reconcile.
 *
 * IT RENDERS THE PATCHED SOURCES, NOT THE RAW EXPORT - that is the other half.
 * Rendering the raw artboard would bake in every bug this build fixes and then
 * hand React a tree that disagrees with the script it ships beside it. Measured
 * on the brand guide: 19 hydration errors, all of them the icon gallery that
 * fixIconGallery() repairs. Twenty of the other twenty pages passed at zero.
 *
 * The staging document deliberately carries no #dc-root, so support.js takes
 * its ordinary createRoot path here and getDC() hands out the same component the
 * shipped page will mount.
 *
 * react-dom/server is a build-time dependency and is never deployed: it is
 * copied into _dcbuild/ for the duration of the run and the directory is removed
 * at the end. It is served rather than injected because the CSP this build
 * writes has no 'unsafe-inline' - addScriptTag({path}) would be blocked, and the
 * failure would read as "renderToString is not a function". */
const SSR_UMD = path.join(HERE, "vendor-build", "react-dom-server-legacy-18.3.1.js");
if (!fs.existsSync(SSR_UMD)) {
  throw new Error(`prerender: ${path.relative(SITE, SSR_UMD)} is missing - see tools/vendor-build/README.md`);
}
fs.copyFileSync(SSR_UMD, path.join(SSR_DIR, "rds.js"));

async function ssrRender({ head, template, script }, name) {
  const stage = `<!DOCTYPE html>
<html lang="de">
<head>
${head}
<script src="/_dcbuild/support.js" defer></script>
</head>
<body>
<x-dc></x-dc>
<template id="dc-template">${template}</template>
${TEMPLATE_SHIM}
${script}
</body>
</html>
`;
  fs.writeFileSync(path.join(SSR_DIR, "stage.html"), stage, "utf8");

  const tab = await open(context, `${BASE}/_dcbuild/stage.html`);
  try {
    await tab
      .waitForFunction(() => typeof window.getDC === "function" && !!window.React, null, { timeout: 30000 })
      .catch(() => {
        throw new Error(`prerender: support.js never booted the staging document for ${name}`);
      });
    /* After React exists, not with the page: the UMD binds window.React at the
     * moment it runs, and support.js loads React itself, asynchronously. */
    await tab.addScriptTag({ url: "/_dcbuild/rds.js" });

    const out = await tab.evaluate(() => {
      const rootName = window.__dcRootName();
      const Root = window.getDC(rootName);
      if (typeof Root !== "function") return { error: `getDC("${rootName}") returned ${typeof Root}` };
      /* The same defaults StandaloneRoot feeds the component on the client:
       * data-props is where support.js reads propsMeta from. propOverrides only
       * exist inside the design tool, never in a built page. */
      let props = {};
      try {
        const el = document.querySelector('script[type="text/x-dc"][data-props]');
        const meta = el ? JSON.parse(el.getAttribute("data-props")) : {};
        for (const k in meta) if (meta[k] && meta[k].default !== undefined) props[k] = meta[k].default;
      } catch (e) {
        return { error: "data-props is not readable: " + e.message };
      }
      try {
        const html = window.ReactDOMServer.renderToString(window.React.createElement(Root, props));
        /* markToFile() stashed the SVG each mark WOULD have built while this
         * render ran, so file and markup come from the same call. */
        return { html, props: Object.keys(props), marks: window.__dcMarks || {} };
      } catch (e) {
        return { error: "renderToString threw: " + (e && e.message) };
      }
    });

    if (out.error) throw new Error(`prerender: ${name} - ${out.error}`);
    if (!out.html || out.html.length < 5000) {
      throw new Error(`prerender: ${name} rendered ${out.html ? out.html.length : 0} bytes - that is not a page`);
    }
    if (out.html.includes("{{")) throw new Error(`prerender: unresolved {{ }} in the render of ${name}`);
    const errs = tab.mcdErrors.filter((e) => e.startsWith("pageerror:"));
    if (errs.length) throw new Error(`prerender: ${name} threw while rendering - ${errs[0].slice(0, 200)}`);

    /* One file per size and colour variant, shared by all 21 pages and cached
     * for a year (/(.*).svg is immutable in vercel.json). Written only when the
     * bytes change, so a rebuild does not churn the working tree. */
    const dir = path.join(SITE, "brand");
    fs.mkdirSync(dir, { recursive: true });
    for (const [key, svg] of Object.entries(out.marks || {})) {
      const file = path.join(dir, `mark-${key}.svg`);
      const cur = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
      if (cur !== svg) fs.writeFileSync(file, svg, "utf8");
      markFiles.set(key, svg.length);
    }
    if (!Object.keys(out.marks || {}).length) {
      throw new Error(`prerender: ${name} rendered no brand mark - markToFile() did not run`);
    }
    /* THE BRAND GUIDE DRAWS THE MARK ITSELF, AND THERE IT IS THE SUBJECT.
     *
     * Everywhere else the mark comes from mark(), so after markToFile() there
     * must be no inline one left - a leftover means the patch missed a call
     * site and that page keeps its 146 nodes. /marke/ is different: seven marks
     * are written straight into the template, because showing the logo in its
     * variants IS that page's content. Those are counted rather than forbidden,
     * so a redesign that adds a twentieth still fails here instead of slipping
     * through. Nineteen, not the seven literals in the template: <sc-for>
     * multiplies them. At 146 cells each that is 2.774 of that page's 3.696
     * elements - which is why /marke/ has the largest DOM of the 21, and why it
     * is the obvious follow-up. */
    const inline = (out.html.match(/viewBox="0 0 64 64"/g) || []).length;
    const allowed = name === "McCain Digital Brand Guide v2.dc.html" ? 19 : 0;
    if (inline !== allowed) {
      throw new Error(
        `prerender: ${name} carries ${inline} inline brand mark(s), expected ${allowed}` +
          (allowed ? " written into the template" : " - markToFile() missed a call site")
      );
    }
    return out.html;
  } finally {
    await tab.close();
  }
}


async function grab(page, pinned, name) {
  if (!pinned) {
    const snap = await page.evaluate(() => {
      const root = document.getElementById("dc-root");
      if (!root) return { missingRoot: true };
      return {
        head: document.head.innerHTML,
        h1: (document.querySelector("h1")?.innerText || "").trim(),
        words: (document.body.innerText || "").trim().split(/\s+/).length,
        els: root.getElementsByTagName("*").length,
      };
    });
    if (snap.missingRoot) throw new Error(`prerender: no #dc-root in ${name} - support.js changed its mount`);
    if (!snap.h1) throw new Error(`prerender: ${name} rendered no <h1>`);
    return snap;
  }
  /* Pinned: the headline rotates, so catch it on the wanted variant. */
  let snap = null;
  for (let attempt = 1; attempt <= 6 && snap === null; attempt++) {
    await page
      .waitForFunction(
        (want) => (document.querySelector("h1")?.innerText || "").trim() === want,
        pinned,
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
        h1,
        words: (document.body.innerText || "").trim().split(/\s+/).length,
        els: root.getElementsByTagName("*").length,
      };
    }, pinned);
    if (snap === null) console.log(`    hero rotated away between check and grab, retry ${attempt}`);
  }
  if (!snap) throw new Error(`prerender: never caught the hero on "${pinned}" in ${name}. Has heroWords.de[0] changed?`);
  if (snap.missingRoot) throw new Error(`prerender: no #dc-root in ${name}`);
  return snap;
}

const built = [];
let fixedCanonicals = 0;
const markFiles = new Map();

for (const page of PAGES) {
  const srcFile = path.join(EXPORT_DIR, page.src);
  if (!fs.existsSync(srcFile)) throw new Error(`prerender: ${page.src} is not in the export`);

  /* The export is still opened once, but only for the two things the SOURCE
   * does not carry: the <style> blocks support.js injects from the component's
   * <helmet>, and the proof that the page renders an <h1> at all. The markup
   * itself no longer comes from here - ssrRender() renders it from the patched
   * sources further down. */
  const tab = await open(context, `${EXPORT_URL}/${encodeURIComponent(page.src)}`);
  await settle(tab);
  const snap = await grab(tab, page.h1, page.src);
  await tab.close();

  const src = fs.readFileSync(srcFile, "utf8");
  const openTag = /<x-dc(?:\s[^>]*)?>/.exec(src);
  const closeAt = src.lastIndexOf("</x-dc>");
  if (!openTag || closeAt < 0) throw new Error(`prerender: no <x-dc> block in ${page.src}`);
  const template = src.slice(openTag.index + openTag[0].length, closeAt);

  const scriptTag = /<script[^>]*data-dc-script[^>]*>[\s\S]*?<\/script>/.exec(src);
  if (!scriptTag) throw new Error(`prerender: no <script data-dc-script> in ${page.src}`);

  const meta = metaOf(src, page);
  if (meta.canonicalWasWrong) fixedCanonicals++;

  const wired = wireForms(localise(scriptTag[0]), page.src);
  const notes = dropTechNotes(wired.script, page.src);
  const still = stillMark(notes.script, page.src);
  const marks = markToFile(still.script, page.src);
  const icons = fixIconGallery(marks.script);
  const ptDesk = ptDesktopOnly(icons.script, page.src);
  const hero = heroCalm(ptDesk.script, template, page.src);
  const cons = laterConsent(hero.script, page.src);
  const helmet = stripHelmetSeo(localise(template), page.src);
  const calm = calmConsent(helmet.template, page.src);
  const pxe = deferPixelEngine(fixExportTemplate(calm.template, page.src), page.src);
  const cv = deferSections(pxe.template, page.src);
  const tplTiles = fixTileRoles(cv.template);
  const anchors = fixAnchors({ template: tplTiles.html, script: cons.script });
  const tiles = tplTiles.fixed;
  const templateLocal = wrapMain(anchors.template, page.src, "template");
  const script = anchors.script;
  const head = headOf(meta, page, stylesOf(snap.head));

  /* Everything above patched the sources; this renders them. The order matters:
   * <main> is wrapped around the TEMPLATE, so React renders it too and the two
   * trees agree. Wrapping the rendered markup instead would insert an element
   * React does not know about, and hydration would reject the whole page. */
  const prerendered = await ssrRender({ head, template: templateLocal, script }, page.src);

  /* THE MARK IN THE HEADER IS AN LCP CANDIDATE, AND IT IS A REQUEST NOW.
   *
   * Turning 146 nodes into one <img> traded DOM for a fetch, and PageSpeed put
   * a number on that trade: 170 ms of "resource load delay" before the browser
   * even starts it, because it cannot see the tag until the parser reaches the
   * header. Preloading the FIRST mark the page renders - the one in the header -
   * removes the delay. Only that one: preloading the marks further down would
   * take priority away from the one above the fold. The file is 15 KB raw and
   * 1.283 B on the wire, so this costs nothing and is shared by all 21 pages. */
  const firstMark = /\/brand\/mark-[\w-]+\.svg/.exec(prerendered);
  const headWithMark = firstMark
    ? head + `
<link rel="preload" as="image" href="${firstMark[0]}" fetchpriority="high">`
    : head;
  const headOut = headWithMark + "\n" + PT_MOBILE_CSS + "\n" + CV_CSS;
  assertClean(head + prerendered + templateLocal + script, page.out);
  assertNoExportLinks(head + prerendered + templateLocal + script, page.out);

  const html = `<!DOCTYPE html>
<!-- GENERATED, BUILD STAGE ONE - never deployed, do not edit by hand.

     Source:  mccain-design-system/${page.src}   (Claude Design export)
     Route:   ${page.route}
     Build:   node tools/prerender.mjs   (needs: python prodserve.py 8898 --dev)
     Next:    node tools/v5build.mjs reads this file and writes the page that ships

     #dc-root holds React's own first render, written by react-dom/server at
     build time. It is what a crawler reads, what paints first, AND what React
     adopts - one copy, not two. The empty <x-dc> beside it MUST stay: it is how
     support.js finds the template, through the shim below. The patched runtime
     sees the filled #dc-root, drops the <x-dc> and calls hydrateRoot instead of
     rebuilding all of this a second time.

     If React never arrives, the markup simply stays and the page is readable. -->
<html lang="de">
<head>
${headOut}
<script src="/pixel-engine.js" defer></script>
<script src="/_dcbuild/support.js" defer></script>
<script src="/motion-budget.js" defer></script>
</head>
<body>
<div id="dc-root">${prerendered}</div>
<x-dc></x-dc>
<template id="dc-template">${templateLocal}</template>
${TEMPLATE_SHIM}
${FORM_RUNTIME}
${script}
</body>
</html>
`;

  assertMoustachesAreInert(html, page.out);

  const outFile = path.join(REACT_DIR, page.out);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, html, "utf8");

  built.push({
    ...page,
    title: meta.title,
    words: snap.words,
    els: snap.els,
    kb: Math.round(html.length / 1024),
    h1: snap.h1,
    forms: wired.forms,
  });
  console.log(
    `  ${page.route.padEnd(44)} ${String(snap.words).padStart(5)} words  ${String(snap.els).padStart(5)} els  ${String(Math.round(html.length / 1024)).padStart(4)} KB` +
      `  ${wired.forms} form${wired.forms === 1 ? " " : "s"} wired` +
      `  ${Math.round(prerendered.length / 1024)} KB rendered` +
      `  ${helmet.stripped} helmet meta dropped` +
      (tiles ? `  ${tiles} tile roles fixed` : "") +
      `  ${cv.marked} deferred` +
      (cv.layered ? ` (${cv.layered} on the content, ground stays under the stream)` : "") +
      (anchors.fixed ? `  ${anchors.fixed} anchors → /` : "") +
      (icons.icons ? "  [icon gallery fixed]" : "") +
      (meta.titleTrimmed ? `  [title → ${meta.titleLen} chars]` : "") +
      (meta.canonicalWasWrong ? "  [canonical corrected]" : "") +
      (meta.overridden ? `  [${meta.overridden} meta overridden]` : "")
  );
}

/* --------------------------------------------------------- the recall badge */
async function deriveImages() {
  const done = [];
  for (const job of DERIVED) {
    const page = await context.newPage();
    await page.goto(`${EXPORT_URL}/${job.src}`, { waitUntil: "networkidle" });
    const shot = await page.evaluate(async ({ w, h, q }) => {
      const img = document.querySelector("img");
      await img.decode();

      /* Reproduce `object-fit: cover; object-position: 50% 50%` here rather
       * than leaving it to the browser at runtime: take the centred slice of
       * the source that has the output's aspect ratio, then scale it. For a
       * source already at the right ratio this is a no-op, so one code path
       * covers both the crops and the plain resizes. */
      let sw = img.naturalWidth;
      let sh = img.naturalHeight;
      if (sw / sh > w / h) sw = Math.round(sh * (w / h));
      else sh = Math.round(sw / (w / h));
      const sx = Math.round((img.naturalWidth - sw) / 2);
      const sy = Math.round((img.naturalHeight - sh) / 2);

      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const g = c.getContext("2d");
      g.imageSmoothingQuality = "high";
      g.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
      return { url: c.toDataURL("image/webp", q), nat: img.naturalWidth + "x" + img.naturalHeight, cropped: sw !== img.naturalWidth || sh !== img.naturalHeight };
    }, job);
    await page.close();
    if (!shot.url.startsWith("data:image/webp")) {
      throw new Error(`prerender: the browser did not produce a WebP for ${job.src}`);
    }
    const bytes = Buffer.from(shot.url.split(",")[1], "base64");
    const out = path.join(SITE, job.out);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, bytes);
    done.push({ ...job, bytes: bytes.length, was: fs.statSync(path.join(EXPORT_DIR, job.src)).size, nat: shot.nat, cropped: shot.cropped });
  }
  return done;
}

/* ----------------------------------------------------------------- og image */
/* Social platforms refuse SVG, and a PNG committed by hand goes stale the
 * moment the mark changes. The per-page og images ship with the export; these
 * two are the ones it does not carry. */
const ogJobs = [
  ["brand/mccain-og-dark.svg", "og-image.png"],
  /* The brand page's helmet asks for brand/mccain-og-marke.png, which the
   * export does not contain - so it is rendered from the light social plate. */
  ["brand/mccain-og-light.svg", "brand/mccain-og-marke.png"],
];
const derived = await deriveImages();
console.log("");
for (const d of derived) {
  console.log(
    `  ${d.out.padEnd(38)} ${String(d.bytes).padStart(7)} B  ${String(d.w) + "x" + d.h}` +
      `   (from ${d.nat}, ${d.was} B${d.cropped ? ", cropped" : ""})`
  );
}
console.log(
  `  ${derived.reduce((a, d) => a + d.was, 0)} B of placeholder became ${derived.reduce((a, d) => a + d.bytes, 0)} B`
);

for (const [svg, out] of ogJobs) {
  const ogPage = await context.newPage();
  await ogPage.setViewportSize({ width: 1200, height: 630 });
  await ogPage.goto(`${EXPORT_URL}/${svg}`, { waitUntil: "networkidle" });
  const outFile = path.join(SITE, out);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  await ogPage.screenshot({ path: outFile });
  await ogPage.close();
}

await browser.close();
/* The staging document goes; the rendered pages, support.js, the UMDs and
 * rds.js stay in _dcbuild/ for tools/v5build.mjs. */
fs.rmSync(path.join(SSR_DIR, "stage.html"), { force: true });

/* ------------------------------------------------------------------- assets */

/* image-slot.js is a Claude Design CANVAS component: a drop-an-image-here slot
 * whose contents persist through a .image-slots.state.json sidecar, written by
 * the canvas runtime (window.omelette.writeFile) and read back with a plain
 * fetch. On a deployed site that runtime does not exist, so nothing can ever
 * have written the sidecar - but the read still fires, 404s, and prints a
 * console error on /md-recall/ for a file that cannot exist.
 *
 * The write side already guards on window.omelette. This makes the read side
 * agree with it. It is the smallest correct fix: not a fake empty file shipped
 * to silence a symptom, and not a rewrite of a third-party component. */
function deCanvas(code) {
  const from = "loadP = fetch(STATE_FILE)";
  const to = "loadP = (window.omelette ? fetch(STATE_FILE) : Promise.resolve({ ok: false }))";
  const n = code.split(from).length - 1;
  if (n !== 1) {
    throw new Error(
      `prerender: expected exactly one sidecar read in image-slot.js, found ${n} - ` +
        `the component changed, re-read it before shipping`
    );
  }
  return code.split(from).join(to);
}

function copy(from, to) {
  const src = path.join(EXPORT_DIR, from);
  const dst = path.join(SITE, to);
  if (!fs.existsSync(src)) throw new Error(`prerender: ${from} is not in the export`);
  if (fs.statSync(src).isDirectory()) {
    fs.mkdirSync(dst, { recursive: true });
    for (const e of fs.readdirSync(src)) copy(path.join(from, e), path.join(to, e));
    return;
  }
  const name = path.basename(to);
  /* The brand page does not read its download list out of the markup - it
   * fetches brand/files.json at runtime and builds every href from it. Those
   * hrefs are relative ("brand/mccain-mark-dark.svg"), so on /marke/ all 45
   * downloads resolved to /marke/brand/... and 404ed. Rewriting the markup was
   * never going to reach them: the data is the other half of the page. */
  if (name === "files.json") {
    const json = fs.readFileSync(src, "utf8").replace(/"href":"\.{0,2}\/?brand\//g, '"href":"/brand/');
    fs.writeFileSync(dst, json, "utf8");
    return;
  }
  if (MINIFY.has(name)) {
    let code = fs.readFileSync(src, "utf8");
    if (name === "image-slot.js") code = deCanvas(code);
    if (name === "support.js") code = patchRuntime(code);
    const out = esbuild.transformSync(code, {
      loader: "js",
      minify: true,
      legalComments: "none",
      target: "es2019",
    });
    fs.writeFileSync(dst, out.code, "utf8");
    return;
  }
  fs.copyFileSync(src, dst);
}


/* ------------------------------------------- sitemap, llms.txt, CSP: not here */
/* Until 17.9.2026 this file wrote sitemap.xml and llms.txt from PAGES and the
 * CSP hashes into vercel.json from the inline scripts of the pages above.
 * Those pages no longer ship, so all three moved to tools/v5build.mjs, which
 * derives them from the pages that do. */

/* --------------------------------------------------------------------- done */

const totalWords = built.reduce((n, p) => n + p.words, 0);
const totalForms = built.reduce((n, p) => n + p.forms, 0);
console.log(
  `\n  ${built.length} pages · ${totalWords.toLocaleString("de-DE")} words of rendered text · ` +
    `${totalForms} forms wired to Web3Forms · ${fixedCanonicals} canonical(s) corrected · robots: ${ROBOTS}`
);
if (CONFIG.noindex) console.log("  site.config.json says noindex - every page carries it.");
