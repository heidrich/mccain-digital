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
 * HOW IT WORKS - and why it is not just "save the rendered DOM"
 * That was the first attempt, back in the v3 round, and it shipped a page that
 * looked perfect and was completely dead: no mega menu, no modals, no pixel
 * stream. support.js mounts like this:
 *
 *     const dc = doc.querySelector("x-dc");
 *     if (!dc) return null;              // <- a settled snapshot dies here
 *     dc.replaceWith(hostEl);            // x-dc becomes <div id="dc-root">
 *
 * A snapshot of the settled DOM is taken AFTER that replacement, so <x-dc> is
 * gone from it and on the next load support.js finds nothing to render. React
 * loads, PixelFX loads, no error is printed, and every button is inert.
 *
 * So every built page carries BOTH:
 *   <div id="dc-prerender">  the settled markup - what a crawler reads and what
 *                            paints first
 *   <x-dc>                   the empty mount point support.js replaces
 *   <template id="dc-template">  the component template, INERT
 * and a watcher removes the prerendered copy the moment React has put something
 * in its own #dc-root. If React never arrives, the readable copy simply stays.
 *
 * It also removes the three third-party origins the export depends on: React
 * through support.js's own window.__resources hook (no patching, and the SRI
 * hashes still match because the bytes are identical) and both typefaces from
 * fonts/. See tools/vendor_assets.py for the legal reason that is not optional.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";
import { launch, open, settle } from "./browser.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.dirname(HERE);
const BASE = "http://127.0.0.1:8898";
const EXPORT_DIR = path.join(SITE, "mccain-design-system");
const EXPORT_URL = `${BASE}/mccain-design-system`;
const ORIGIN = "https://mccain-digital.com";

/* ------------------------------------------------------------- route table */
/* src    the artboard in the export
 * out    where the built file goes, relative to the repository root
 * route  the URL it answers on - canonical, og:url and the sitemap come from it
 * h1     pinned ONLY where the headline rotates. The start page cycles through
 *        heroWords.de, so whichever variant is on screen at snapshot time
 *        becomes the indexed h1 - a different promise on every build. Pinning
 *        it makes the build fail rather than quietly index something else:
 *        which sentence Google shows is a decision, not a race. Measured
 *        12.9.2026: the start page is the only artboard that rotates.
 * prio/freq  sitemap hints, kept next to the route they describe.
 */
const PAGES = [
  {
    src: "McCain Digital v2.dc.html",
    out: "index.html",
    route: "/",
    h1: "KI-Tools, die auf Ihren Daten laufen.",
    prio: "1.0",
    freq: "weekly",
  },
  { src: "McCain Digital Uebersicht.dc.html", out: "leistungen/index.html", route: "/leistungen/", prio: "0.9", freq: "monthly" },
  { src: "McCain Digital KI.dc.html", out: "leistungen/ki-automatisierung/index.html", route: "/leistungen/ki-automatisierung/", prio: "0.9", freq: "monthly" },
  { src: "McCain Digital Web-Apps.dc.html", out: "leistungen/web-apps/index.html", route: "/leistungen/web-apps/", prio: "0.9", freq: "monthly" },
  { src: "McCain Digital Websites.dc.html", out: "leistungen/websites/index.html", route: "/leistungen/websites/", prio: "0.9", freq: "monthly" },
  { src: "McCain Digital Software.dc.html", out: "leistungen/individualsoftware/index.html", route: "/leistungen/individualsoftware/", prio: "0.9", freq: "monthly" },
  { src: "McCain Digital Tech Next.dc.html", out: "leistungen/nextjs-entwicklung/index.html", route: "/leistungen/nextjs-entwicklung/", prio: "0.8", freq: "monthly" },
  { src: "McCain Digital Tech MCP.dc.html", out: "leistungen/mcp-server-entwickeln/index.html", route: "/leistungen/mcp-server-entwickeln/", prio: "0.8", freq: "monthly" },
  { src: "McCain Digital Tech RAG.dc.html", out: "leistungen/rag-beratung/index.html", route: "/leistungen/rag-beratung/", prio: "0.8", freq: "monthly" },
  { src: "McCain Digital Tech ERP.dc.html", out: "leistungen/erp-integration/index.html", route: "/leistungen/erp-integration/", prio: "0.8", freq: "monthly" },
  { src: "McCain Digital Vergleich WordPress.dc.html", out: "vergleich/wordpress-oder-handgeschrieben/index.html", route: "/vergleich/wordpress-oder-handgeschrieben/", prio: "0.7", freq: "monthly" },
  { src: "McCain Digital Vergleich RAG.dc.html", out: "vergleich/chatgpt-oder-eigenes-rag/index.html", route: "/vergleich/chatgpt-oder-eigenes-rag/", prio: "0.7", freq: "monthly" },
  { src: "McCain Digital md-recall.dc.html", out: "md-recall/index.html", route: "/md-recall/", prio: "0.8", freq: "monthly" },
  { src: "McCain Digital Preise.dc.html", out: "preise/index.html", route: "/preise/", prio: "0.6", freq: "monthly" },
  { src: "McCain Digital Studio.dc.html", out: "studio/index.html", route: "/studio/", prio: "0.6", freq: "monthly" },
  { src: "McCain Digital Kontakt.dc.html", out: "kontakt/index.html", route: "/kontakt/", prio: "0.6", freq: "monthly" },
  { src: "McCain Digital Recht.dc.html", out: "rechtliches/index.html", route: "/rechtliches/", prio: "0.6", freq: "monthly" },
  { src: "McCain Digital Styleguide.dc.html", out: "styleguide/index.html", route: "/styleguide/", prio: "0.5", freq: "monthly" },

  /* THESE THREE SHIP THE LEGAL PAGE'S <helmet>, VERBATIM.
   *
   * They are not in the export's own sitemap.xml, and their head was copied
   * from McCain Digital Recht and never edited: the same canonical
   * (/rechtliches/), the same description ("Rechtliche Angaben von McCain
   * Digital: Impressum, Datenschutzerklaerung, ..."), the same og:image, and in
   * the brand page's case the same <title> as well. Shipped as they are, that
   * tells Google three different pages are the legal page.
   *
   * The route decides the canonical (see headOf). `meta` below overrides the
   * rest - the wording is taken from each page's own hero copy, not invented,
   * so it says what the page actually says. It is still copy on a marketing
   * site: worth a look in the text pass that is already planned.
   *
   * The routes are read off the design rather than chosen: the brand page's own
   * og:image is brand/mccain-og-marke.png, so /marke/ is what it was drawn for,
   * and the article's headline is "recall heisst jetzt md-recall". */
  {
    src: "McCain Digital News.dc.html",
    out: "news/index.html",
    route: "/news/",
    prio: "0.6",
    freq: "weekly",
    meta: {
      desc:
        "Produkt-Updates zu md-recall, Notizen aus der Technik und Nachrichten " +
        "aus dem Studio. Kurz gehalten, ohne Ankündigungs-Prosa.",
      ogImage: `${ORIGIN}/og-image.png`,
    },
  },
  {
    src: "McCain Digital News md-recall.dc.html",
    out: "news/md-recall/index.html",
    route: "/news/md-recall/",
    prio: "0.5",
    freq: "monthly",
    meta: {
      desc:
        "Der Name ist kürzer, die Lizenz einfacher: md-recall läuft ab sofort " +
        "ohne Seat-Grenze und ist direkt von mccain-digital.com aus erreichbar.",
      ogImage: `${ORIGIN}/brand/mccain-og-md-recall.png`,
    },
  },
  {
    src: "McCain Digital Brand Guide v2.dc.html",
    out: "marke/index.html",
    route: "/marke/",
    prio: "0.5",
    freq: "monthly",
    meta: {
      title: "Marke & Downloads · McCain Digital",
      desc:
        "Das Zeichen von McCain Digital: Konstruktion, Fassungen, Farbe, " +
        "Typografie, Icons und Bewegung – mit jeder Markendatei zum Herunterladen.",
      ogImage: `${ORIGIN}/brand/mccain-og-marke.png`,
    },
  },
];

/* Artboards in the export that are NOT pages of this site: design studies and
 * the old start page. They are listed so a link to one fails the build loudly
 * instead of shipping a 404 - except the two the brand guide links by name,
 * which keep their words and lose the link (see unwrapDeadLinks). */
const NOT_PUBLISHED = [
  "McCain Digital.dc.html",
  "McCain Digital Logo.dc.html",
  "McCain Digital Marke.dc.html",
  "McCain Digital Deck.dc.html",
  "McCain Digital Styleguide copy.dc.html",
  "Bento Varianten.dc.html",
];

/* An internal and an external edition of the same file.
 *
 * pixel-engine.js is 137 KB of which a third is comments - it is written to be
 * read, and that is worth keeping. But every visitor downloads and tokenises
 * all of it, and Lighthouse names it. So the commented source stays the source
 * of record in mccain-design-system/, and what ships at the site root is the
 * minified edition built from it.
 *
 * support.js is third-party runtime, minified through the same step rather than
 * edited. Nothing here rewrites its logic; if minification ever broke it the
 * gate would catch it, because the gate clicks.
 *
 * Both are re-derived on every build, so the two editions cannot drift. */
const MINIFY = new Set(["pixel-engine.js", "support.js", "image-slot.js"]);

/* Copied so the site root is self-contained and a deploy never has to reach
 * into mccain-design-system/, which is .vercelignore'd. */
const ASSETS = {
  "support.js": "support.js",
  "pixel-engine.js": "pixel-engine.js",
  "image-slot.js": "image-slot.js",
  "content.json": "content.json",
  img: "img",
  team: "team",
  brand: "brand",
};

const RESOURCE_MAP = {
  "https://unpkg.com/react@18.3.1/umd/react.production.min.js":
    "/vendor/react-18.3.1.production.min.js",
  "https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js":
    "/vendor/react-dom-18.3.1.production.min.js",
};

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
  return (
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
  const ids = new Set();
  for (const s of [parts.prerendered, parts.template]) {
    for (const m of s.matchAll(/\sid="([A-Za-z][\w-]*)"/g)) ids.add(m[1]);
  }
  let fixed = 0;
  const fix = (s) =>
    s
      .replace(/href="#([A-Za-z][\w-]*)"/g, (full, id) =>
        ids.has(id) ? full : (fixed++, `href="/#${id}"`)
      )
      .replace(/href: '#([A-Za-z][\w-]*)'/g, (full, id) =>
        ids.has(id) ? full : (fixed++, `href: '/#${id}'`)
      );
  return {
    prerendered: fix(parts.prerendered),
    template: fix(parts.template),
    script: fix(parts.script),
    fixed,
  };
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

/* Hands the page over from the prerendered copy to the live render. Deliberately
 * one-way and fail-safe: if React never mounts, the readable copy stays.
 *
 * The floor of 40 elements is the point of it. "#dc-root has a first child" is
 * also true when React mounts an empty shell - which is exactly what happened
 * when two runtimes raced each other - and removing the readable copy on that
 * signal turns a degraded page into a blank one. The real pages render between
 * ~700 and ~2,100 elements, so 40 separates "rendered" from "mounted but
 * produced nothing" without being anywhere near the real value. */
const SWAP = `<script>(function(){var p=document.getElementById("dc-prerender");if(!p)return;
function ready(){var r=document.getElementById("dc-root");
return !!(r&&r.firstElementChild&&r.getElementsByTagName("*").length>40);}
function go(){if(!ready())return false;p.remove();return true;}
if(go())return;var mo=new MutationObserver(function(){if(go())mo.disconnect();});
mo.observe(document.documentElement,{childList:true,subtree:true});
setTimeout(function(){mo.disconnect();},20000);})();</script>`;

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
box.style.cssText='margin:12px 0 0;padding:12px 14px;border-radius:10px;border:1px solid #FECACA;background:#FEF2F2;color:#991B1B;font-size:14px;line-height:1.5';
form.appendChild(box);}
box.innerHTML='Das Formular konnte nicht gesendet werden. Bitte schreiben Sie uns direkt an <a href="mailto:info@mccain-digital.com" style="color:inherit;text-decoration:underline">info@mccain-digital.com</a>.';});};})();</script>`;

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
  return {
    title: over.title || title,
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
<link rel="stylesheet" href="/fonts/fonts.css">
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

const { browser, context } = await launch(1440, 900);

async function snapshot(page) {
  await page.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
  await settle(page);
  /* Sections reveal on scroll; anything never scrolled past is snapshotted in
   * its pre-reveal state. */
  await page.evaluate(async () => {
    const step = window.innerHeight;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 220));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(1300);

  /* The snapshot is taken from the UNPATCHED export, so the icon-gallery bug
   * above is still in the markup being captured even though the script that
   * ships is fixed. Left alone, the built page renders correctly and still
   * prints nine console errors, because the browser parses the prerendered
   * copy too - the same "a gate that watches one channel" shape as before.
   *
   * Commas and spaces are interchangeable separators in SVG path data, so
   * swapping them is a no-op for every valid path and repairs exactly the ones
   * that arrived as a joined array. */
  await page.evaluate(() => {
    for (const p of document.querySelectorAll('path[d*=","]')) {
      p.setAttribute("d", p.getAttribute("d").split(",").join(" "));
    }
  });
}

async function grab(page, pinned, name) {
  if (!pinned) {
    const snap = await page.evaluate(() => {
      const root = document.getElementById("dc-root");
      if (!root) return { missingRoot: true };
      return {
        head: document.head.innerHTML,
        body: root.innerHTML,
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
        body: root.innerHTML,
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

for (const page of PAGES) {
  const srcFile = path.join(EXPORT_DIR, page.src);
  if (!fs.existsSync(srcFile)) throw new Error(`prerender: ${page.src} is not in the export`);

  const tab = await open(context, `${EXPORT_URL}/${encodeURIComponent(page.src)}`);
  await snapshot(tab);
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
  const icons = fixIconGallery(wired.script);
  const anchors = fixAnchors({
    prerendered: localise(snap.body),
    template: localise(template),
    script: icons.script,
  });
  const prerendered = anchors.prerendered;
  const templateLocal = anchors.template;
  const script = anchors.script;
  const head = headOf(meta, page, stylesOf(snap.head));

  if (prerendered.includes("{{")) throw new Error(`prerender: unresolved {{ }} in the snapshot of ${page.src}`);
  assertClean(head + prerendered + templateLocal + script, page.out);
  assertNoExportLinks(head + prerendered + templateLocal + script, page.out);

  const html = `<!DOCTYPE html>
<!-- GENERATED - do not edit by hand.

     Source:  mccain-design-system/${page.src}   (Claude Design export)
     Route:   ${page.route}
     Build:   node tools/prerender.mjs   (needs: python prodserve.py 8898 --dev)

     #dc-prerender is the settled markup: what a crawler reads and what paints
     first. The empty <x-dc> below it is the mount point support.js replaces - it
     MUST stay, or the page loads looking perfect and every button is dead. The
     template itself lives in the inert template element below and reaches
     support.js through the shim next to it; delivering it as live markup printed
     one console error per SVG placeholder and built a whole second DOM.
     The watcher at the end removes the prerendered copy once React has filled
     its own #dc-root, and leaves it alone if React never arrives. -->
<html lang="de">
<head>
${head}
<script src="/support.js" defer></script>
</head>
<body>
<div id="dc-prerender">${prerendered}</div>
<x-dc></x-dc>
<template id="dc-template">${templateLocal}</template>
${TEMPLATE_SHIM}
${FORM_RUNTIME}
${script}
${SWAP}
</body>
</html>
`;

  assertMoustachesAreInert(html, page.out);

  const outFile = path.join(SITE, page.out);
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
      (anchors.fixed ? `  ${anchors.fixed} anchors → /` : "") +
      (icons.icons ? "  [icon gallery fixed]" : "") +
      (meta.canonicalWasWrong ? "  [canonical corrected]" : "") +
      (meta.overridden ? `  [${meta.overridden} meta overridden]` : "")
  );
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

for (const [from, to] of Object.entries(ASSETS)) copy(from, to);

/* ------------------------------------------------------------------ sitemap */
/* Written from PAGES, never maintained beside it: a sitemap that disagrees with
 * what is on disk is worse than none. */
const today = new Date().toISOString().slice(0, 10);
const sitemap =
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  built
    .map(
      (p) =>
        `  <url>\n    <loc>${ORIGIN}${p.route}</loc>\n    <lastmod>${today}</lastmod>\n` +
        `    <changefreq>${p.freq}</changefreq>\n    <priority>${p.prio}</priority>\n  </url>`
    )
    .join("\n") +
  `\n</urlset>\n`;
fs.writeFileSync(path.join(SITE, "sitemap.xml"), sitemap, "utf8");

/* ----------------------------------------------------------------- llms.txt */
/* The prose half is authored in the export and copied as it is. The page index
 * underneath it is generated from PAGES and the titles the pages actually
 * carry - the old llms.txt still listed /legal/imprint.html months after that
 * page stopped existing, which is exactly what an AI crawler then repeats. */
const llmsHead = fs.readFileSync(path.join(EXPORT_DIR, "llms.txt"), "utf8").trimEnd();
const llmsIndex = built
  .map((p) => `- [${p.title}](${ORIGIN}${p.route})`)
  .join("\n");
fs.writeFileSync(
  path.join(SITE, "llms.txt"),
  `${llmsHead}\n\n## Alle Seiten\n\n${llmsIndex}\n`,
  "utf8"
);

/* --------------------------------------------------------------------- done */

const totalWords = built.reduce((n, p) => n + p.words, 0);
const totalForms = built.reduce((n, p) => n + p.forms, 0);
console.log(
  `\n  ${built.length} pages · ${totalWords.toLocaleString("de-DE")} words of rendered text · ` +
    `${totalForms} forms wired to Web3Forms · ${fixedCanonicals} canonical(s) corrected · robots: ${ROBOTS}`
);
if (CONFIG.noindex) console.log("  site.config.json says noindex - every page carries it.");
