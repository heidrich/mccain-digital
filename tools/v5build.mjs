/* Every page of the site as plain HTML + CSS + its own logic - no React at runtime.
 *
 *   python prodserve.py 8898 --dev      # must be running
 *   node tools/v5build.mjs              # every page of tools/pages.mjs, to the site root
 *   node tools/v5build.mjs --route /kontakt/ --route /preise/     # some pages
 *
 * INPUT: the React pages tools/prerender.mjs writes to _dcbuild/react/ (run it
 * first). OUTPUT: <route>/index.html, logic.gen.js and index.md at the site
 * root for every route, plus - after a full build - sitemap.xml, llms.txt and
 * the CSP hashes in vercel.json, all derived from what was written. Until
 * 17.9.2026 the pages went to v5/<route>/ as a preview beside the React site;
 * the React site is gone, this is the site.
 *
 * WHY
 * The built pages are React class components with ~40 state fields on their
 * root: every state change re-renders all ~1,000-2,400 nodes (measured
 * 16.9.2026 with React's profiling build, 4x CPU: 15 full re-renders in 30 s,
 * 64-84 ms each; the profiling tool left with React). Nothing there can be
 * memoised or split, because there are no subtrees. So the pages are not
 * tuned, they are taken apart: the markup React would write becomes the HTML,
 * its inline styles become classes, and the behaviour is the page's own class,
 * copied whole, driving the DOM through a small binder (tools/runtime.js) that
 * understands the export's template language instead of React.
 *
 * HOW - and why React still runs, but only here
 * The markup is not rewritten by hand. Each export component is rendered with
 * react-dom/server, like tools/prerender.mjs does, but 8 times: the logic lays
 * out by `vw` in JS (breakpoints 520, 600, 620, 760, 960, 1080, 1180), and the
 * built pages only carry the vw=1280 render - phones got theirs from a client
 * re-render. The renders are merged node by node. Identity is the template node
 * id (data-dc-tpl, kept in the output so the runtime can find every node
 * again), plus occurrence among siblings for loops. What differs by width
 * becomes a media query. Hover and focus styles, which the runtime applied
 * from JS, become real :hover/:focus rules - for every template node, so a
 * node the runtime creates later (an opened menu, a search hit) has its rule.
 *
 * Until 17.9.2026 the build also rendered three state variants (consent,
 * consent details, mobile menu) and marked their nodes; the runtime now
 * creates those from the template like everything else, so the build renders
 * the base state only. State that the export loads after mount (`deep`, the
 * services' long copy from /content.json) is loaded here and rendered in, so
 * a crawler reads the full page; the runtime only writes what differs from its
 * own first evaluation, so the arrival of the same content changes nothing.
 *
 * Specificity: inline styles beat every author rule, classes do not. Every
 * generated rule is scoped `#dc-root .x` (1,1,0) so it outranks the page's own
 * global rules the way the inline style did; hover is (1,2,0) so it wins over
 * the base. Nothing is !important except the display:none of absent nodes.
 *
 * The media queries measure the viewport, the runtime measured the root
 * element (viewport minus a desktop scrollbar). Within ~17 px of a breakpoint
 * on a desktop with a classic scrollbar the two can disagree.
 *
 * See docs/plans/2026-09-17-v5-alle-seiten-design.md.
 */
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import * as esbuild from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { BASE, launch, open, requireServer } from "./browser.mjs";
import { ORIGIN, PAGES } from "./pages.mjs";
import { HEIGHTS_FILE, cvKey } from "./v5cv.mjs";
import { HTML_TO_MARKDOWN } from "./markdown.mjs";

const SITE = path.join(import.meta.dirname, "..");
const STAGE_DIR = path.join(SITE, "_dcbuild");
/* Stage one of the build: React's first render of every artboard, written by
 * tools/prerender.mjs. Never deployed (_dcbuild/ is in .vercelignore). */
const REACT_DIR = path.join(STAGE_DIR, "react");
const EXPORT_DIR = path.join(SITE, "mccain-design-system");
const argv = process.argv.slice(2);
const ONLY = argv.flatMap((a, i) => (a === "--route" ? [argv[i + 1]] : []));
for (const r of ONLY) if (!PAGES.some((p) => p.route === r)) throw new Error(`v5build: --route ${r} is not in tools/pages.mjs`);
const unknown = argv.filter((a, i) => a !== "--route" && argv[i - 1] !== "--route");
if (unknown.length) throw new Error(`v5build: unknown option ${unknown.join(" ")} - the build writes to the site root; --route /x/ builds single pages`);
/* One switch for the whole site, see site.config.json: every page carries it
 * as <meta name=robots>, vercel.json as a header for everything else, and
 * tools/verify_site.mjs fails if the two disagree. */
const CONFIG = JSON.parse(fs.readFileSync(path.join(SITE, "site.config.json"), "utf8"));
const ROBOTS = CONFIG.noindex ? "noindex, follow" : "index, follow, max-image-preview:large, max-snippet:-1";

/* One minifier for everything this build ships as JavaScript. No syntax is
 * lowered (esnext), only whitespace, names and comments go; a one-line
 * banner says where the source is. */
function minify(code, banner) {
  const out = esbuild.transformSync(code, { loader: "js", minify: true, legalComments: "none", target: "esnext" });
  return `/* ${banner} */\n${out.code}`;
}
/* Title and description come out of the head as HTML text; llms.txt and the
 * twin's front matter are plain text ("Marke & Downloads", not "&amp;"). */
const unesc = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const cut = (s, a, b, from = 0) => {
  const i = s.indexOf(a, from);
  const j = s.indexOf(b, i + a.length);
  if (i < 0 || j < 0) throw new Error(`v5build: cannot find ${a} ... ${b}`);
  return { i, j, inner: s.slice(i + a.length, j) };
};
const count = (s, find) => s.split(find).length - 1;
const once = (s, find, repl) => {
  const n = count(s, find);
  if (n !== 1) throw new Error(`v5build: expected "${find.slice(0, 80)}" once, found ${n}`);
  return s.replace(find, () => repl); // a function, so "$" in repl stays literal
};
const VOID_TAGS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
/* Where the element opening at `at` ends. The markup is this build's own
 * output, so tags are balanced; attribute values are read whole, quotes and all. */
const elementEnd = (s, at) => {
  const re = /<(\/?)([a-zA-Z][\w-]*)(?:[^>"']|"[^"]*"|'[^']*')*>/g;
  re.lastIndex = at;
  let depth = 0;
  for (let m; (m = re.exec(s)); ) {
    if (VOID_TAGS.has(m[2].toLowerCase())) continue;
    depth += m[1] ? -1 : 1;
    if (depth === 0) return re.lastIndex;
  }
  throw new Error(`v5build: no end for the element at ${at}`);
};
const escT = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const json = (o) => JSON.stringify(o).replace(/</g, "\\u003c");

/* ------------------------------------------------ v5 changes to the page logic */
/* Anchored and counted: if an export rewrites one of these lines, the build
 * stops instead of shipping the old behaviour. `all` must match exactly once
 * on every page; `some` only where the feature exists (the stack diagram is on
 * two pages, the hero rotation on one). What the runtime adds (isSkipped,
 * watchShown, ptStale, view) is on the DCLogic base in tools/runtime.js. */
const V5_PATCHES = [
  /* The stack diagram measured its nodes 120 ms and 900 ms after start and on
   * its first ResizeObserver callback - inside a section that is skipped at
   * that point, so the browser had to lay it out. The paths are now built when
   * the diagram's block is rendered (runtime.js calls dgRedo when the block
   * comes in; the visibility callback below is the fallback). */
  {
    on: "some",
    find: "const redo = () => { cancelAnimationFrame(this.dgRaf); this.dgRaf = requestAnimationFrame(() => this.dgPaths()); };",
    repl: "const redo = () => { if (this.isSkipped(el)) { this.dgStale = true; return; } this.dgStale = false; cancelAnimationFrame(this.dgRaf); this.dgRaf = requestAnimationFrame(() => this.dgPaths()); }; this.dgRedo = redo; this.dgEl = el;",
  },
  {
    on: "some",
    find: "if (vis) { this.dgAutoStart(); this.dgPulseStart(); setP(false); }",
    repl: "if (vis) { if (this.dgStale) redo(); this.dgAutoStart(); this.dgPulseStart(); setP(false); }",
  },
  /* AN OBSERVED ELEMENT IS A RENDERED ELEMENT. An IntersectionObserver target
   * inside a skipped content-visibility block makes the browser compute that
   * block's style anyway - measured: with only these observe() calls held
   * back, the 14 stack logo masks stopped loading at 125 ms. Reveal, fx, flow,
   * console and diagram targets go through watchShown() (runtime.js), which
   * observes them while their block is rendered and lets go when it is not.
   * The hero observer stays direct: the hero is never deferred.
   * The third argument is what the observer would report for a target that is
   * far away. Only the console needs it: its state starts as "visible", and an
   * observer that is not yet observing never says otherwise. */
  { on: "all", find: "this.io.observe(el)", repl: "this.watchShown(this.io, el)" },
  { on: "all", find: "this.io.unobserve(el)", repl: "this.unwatch(this.io, el)" },
  { on: "some", find: "this.fxIo.observe(el)", repl: "this.watchShown(this.fxIo, el)" },
  { on: "all", find: "this.flowIo.observe(el)", repl: "this.watchShown(this.flowIo, el)" },
  {
    on: "all",
    find: "this.consoleIo.observe(el)",
    repl: "this.watchShown(this.consoleIo, el, () => { if (this.state.aiVisible) this.setState({ aiVisible: false }); })",
  },
  { on: "some", find: "this.dgIo.observe(el)", repl: "this.watchShown(this.dgIo, el)" },
  /* The notes' avoid list measured every heading, paragraph and link on the
   * page when the notes started (load + 10 s): a 53-61 ms task at 4x CPU, the
   * only long task after five seconds, because it laid out every skipped
   * section. It now skips what is not rendered and is rebuilt when a block
   * comes in (runtime.js sets ptStale). */
  {
    on: "all",
    find: "if (!canvas._pool || canvas._ptDirty || (tm - (canvas._ptT || 0)) > 30) {",
    repl: "if (!canvas._pool || canvas._ptDirty || this.ptStale || (tm - (canvas._ptT || 0)) > 30) {\n      this.ptStale = false;",
  },
  { on: "all", find: "const sy0 = window.scrollY || 0, avoid = [];", repl: "const sy0 = this.view.sy, avoid = [];" },
  { on: "all", find: "const W = window.innerWidth, VH = window.innerHeight, sy = window.scrollY || 0,", repl: "const W = this.view.w, VH = this.view.h, sy = this.view.sy," },
  {
    on: "all",
    find: `.forEach((a) => { if (a.closest('header, [data-pt-layer], [role="dialog"]')) return;`,
    repl: `.forEach((a) => { if (a.closest('header, [data-pt-layer], [role="dialog"]') || this.isSkipped(a)) return;`,
  },
  /* THE STREAM LOOP.
   * 1. No layout reads per frame. resize() called getBoundingClientRect(), the
   *    draw read clientWidth/clientHeight and window.scrollY, and the notes
   *    read scrollY, innerWidth and innerHeight - every frame, and each read
   *    forces style and layout when anything has changed since the last one
   *    (PageSpeed: 52 ms "forced reflow" at the scrollY line). The canvas size
   *    now comes from the ResizeObserver the loop already had, the viewport
   *    (this.view) from scroll and resize events. The loop starts on the
   *    observer's first report, which arrives after the first layout - reading
   *    the size at mount forced that whole layout synchronously.
   * 2. Adaptive frame rate. 60 fps where the machine keeps up; where more than
   *    a fifth of 90 frames arrive late (> 25 ms), it draws at 30 fps. Whether
   *    60 would hold again cannot be read from 30 fps frames - they are all on
   *    time by construction - so it is tried: after 5 s at 30 the loop probes
   *    60 for 90 frames, and every failed probe doubles the wait (10, 20, 40,
   *    then every 60 s). Throttled frames are scheduled with a timer, not
   *    skipped inside requestAnimationFrame, so the browser is not woken for
   *    frames nobody draws. data-v5-fps says which mode is on.
   * 3. No IntersectionObserver on the global canvas: it is position:fixed and
   *    fills the viewport, so it is always "intersecting", and a hidden tab
   *    already stops requestAnimationFrame. */
  {
    on: "all", in: "startGradient",
    find: "const reduced = this.reduced(); let visible = true, raf = 0, cleanup = null; const t0 = performance.now();",
    repl:
      "const reduced = this.reduced(); let visible = true, raf = 0, timer = 0, cleanup = null, cssW = 0, cssH = 0, started = false; const t0 = performance.now();\n" +
      "    const view = this.view || (this.view = { sy: 0, w: 0, h: 0 });\n" +
      "    if (!this.viewOn) { this.viewOn = true; addEventListener('scroll', () => { view.sy = window.scrollY || 0; }, { passive: true }); addEventListener('resize', () => { view.w = window.innerWidth; view.h = window.innerHeight; }); }\n" +
      "    let low = false, lastT = 0, frames = 0, late = 0, wait = 5000, probeAt = 0;\n" +
      "    const mode = (l, t) => { low = l; frames = 0; late = 0; lastT = 0; if (l) { probeAt = t + wait; wait = Math.min(wait * 2, 60000); } canvas.setAttribute('data-v5-fps', l ? '30' : '60'); };\n" +
      "    const pace = (t) => { if (low) { if (t >= probeAt) mode(false, t); return; } const d = lastT ? t - lastT : 0; lastT = t; if (!d || d > 250) return; frames++; if (d > 25) late++; if (frames < 90) return; if (late > 18) mode(true, t); else { frames = 0; late = 0; } };\n" +
      "    const schedule = () => { if (low) timer = setTimeout(() => { timer = 0; raf = requestAnimationFrame(loop); }, 26); else raf = requestAnimationFrame(loop); };",
  },
  {
    on: "all", in: "startGradient",
    find: "const resize = () => { const r = canvas.getBoundingClientRect(); const k = 3 / 3.5; const W = Math.max(2, Math.round(r.width * k)), H = Math.max(2, Math.round(r.height * k));",
    repl: "const resize = () => { const k = 3 / 3.5; const W = Math.max(2, Math.round(cssW * k)), H = Math.max(2, Math.round(cssH * k));",
  },
  { on: "all", in: "startGradient", find: "gl.uniform1f(uScroll, window.scrollY || 0);", repl: "gl.uniform1f(uScroll, view.sy);" },
  { on: "all", in: "startGradient", find: "gl.uniform1f(uVh, canvas.clientHeight || 1);", repl: "gl.uniform1f(uVh, cssH || 1);" },
  { on: "all", in: "startGradient", find: "kk = canvas.width / Math.max(1, canvas.clientWidth);", repl: "kk = canvas.width / Math.max(1, cssW);" },
  { on: "all", in: "startGradient", find: "(canvas.clientHeight - smy) * kk", repl: "(cssH - smy) * kk" },
  {
    on: "all", in: "startGradient",
    find: "const loop = () => { raf = 0; if (!canvas.isConnected) { if (cleanup) cleanup(); if (this.streams) this.streams.delete(canvas); return; } if (!visible) return; draw(); if (!reduced) raf = requestAnimationFrame(loop); };",
    repl: "const loop = (t) => { raf = 0; if (!canvas.isConnected) { if (cleanup) cleanup(); if (this.streams) this.streams.delete(canvas); return; } if (!visible) return; if (t) pace(t); draw(); if (!reduced) schedule(); };",
  },
  { on: "all", in: "startGradient", find: "resize(); loop();", repl: "/* the loop starts on the observer's first report, after layout */" },
  {
    on: "all", in: "startGradient",
    find: "const ro = new ResizeObserver(() => { resize(); draw(); }); ro.observe(canvas);",
    repl: "const ro = new ResizeObserver((en) => { const b = en[0].contentRect; cssW = b.width; cssH = b.height; if (!started) { started = true; view.sy = window.scrollY || 0; view.w = window.innerWidth; view.h = window.innerHeight; resize(); loop(); } else { resize(); draw(); } }); ro.observe(canvas);",
  },
  { on: "all", in: "startGradient", find: "if (visible && !raf) loop(); }); io.observe(canvas);", repl: "if (visible && !raf && !timer) loop(); }); if (!isGlobal) io.observe(canvas);" },
  { on: "all", in: "startGradient", find: "cleanup = () => { cancelAnimationFrame(raf); raf = 0; ro.disconnect();", repl: "cleanup = () => { cancelAnimationFrame(raf); raf = 0; clearTimeout(timer); timer = 0; ro.disconnect();" },
  /* The start page's search hits draw their icon with ONE <path> whose d is the
   * icon's whole entry in ICONS - an array for every multi-path icon, which the
   * browser reads as "M…z,M19 17v4" and rejects (six console errors per search,
   * measured 17.9.2026). The same bug prerender.mjs fixes for the brand gallery;
   * SVG path data concatenates with spaces. The subpages use <use href> here. */
  {
    on: "some",
    find: "React.createElement('path', { d: (Component.ICONS && Component.ICONS[h.icon]) || 'M4 12h16' })",
    repl: "React.createElement('path', { d: [].concat((Component.ICONS && Component.ICONS[h.icon]) || 'M4 12h16').join(' ') })",
  },
  /* ONE HEADLINE. Owner, 16.9.2026: "wir nutzen nur noch einen headline". The
   * export rotated four variants from second seven; each was a new, larger LCP
   * candidate (PageSpeed: LCP 20,5 s). The first variant is baked into the h1
   * by assemble() and the h1 is static for the runtime; the interval goes, and
   * so does the probe that measured the rotating headline's height. */
  {
    on: "some",
    find: "this.heroT = null; setTimeout(() => { if (!this.mounted) return; this.heroT = setInterval(() => { if (this.mounted && !this.reduced() && !document.hidden && !this.state.modal && this.state.heroVisible) this.setState({ heroIdx: (this.state.heroIdx + 1) % 4 }); }, 6500); }, 7000);",
    repl: "this.heroT = null; /* v5: one headline, baked into the h1 by the build */",
  },
  {
    on: "some",
    find: "measureHero() {\n    const root = this.rootEl; if (!root) return;",
    repl: "measureHero() {\n    return; /* v5: the headline is static and exactly as tall as its text (build) */\n    const root = this.rootEl; if (!root) return;",
  },
];

/* Where a method's body begins and ends in the class source: from its own
 * line to the next member. The stream loop's lines exist twice on every page
 * (startWave has a sibling loop), so those patches name their method. */
const MEMBER_RE = /\n  (?:static )?([A-Za-z_]\w*)\s*(?:=\s*(?:\([^)]*\)|\w+)\s*=>|\([^)]*\)\s*\{)/g;
function memberSpan(src, name) {
  MEMBER_RE.lastIndex = 0;
  let start = -1;
  for (let m; (m = MEMBER_RE.exec(src)); ) {
    if (start >= 0) return [start, m.index];
    if (m[1] === name) start = m.index;
  }
  if (start < 0) throw new Error(`v5build: method ${name} not found`);
  return [start, src.length];
}
function patchLogic(src, name) {
  let out = src;
  for (const p of V5_PATCHES) {
    const [from, to] = p.in ? memberSpan(out, p.in) : [0, out.length];
    const region = out.slice(from, to);
    const n = count(region, p.find);
    if (n > 1) throw new Error(`v5build: ${name}: patch anchor found ${n} times${p.in ? " in " + p.in : ""}: ${p.find.slice(0, 80)}`);
    if (n === 0 && p.on === "all") throw new Error(`v5build: ${name}: patch anchor missing${p.in ? " in " + p.in : ""}: ${p.find.slice(0, 80)}`);
    if (n === 1) out = out.slice(0, from) + region.replace(p.find, () => p.repl) + out.slice(to);
  }
  return out;
}

/* ------------------------------------------------------------- staging */
fs.mkdirSync(STAGE_DIR, { recursive: true });
fs.copyFileSync(path.join(import.meta.dirname, "vendor-build", "react-dom-server-legacy-18.3.1.js"), path.join(STAGE_DIR, "rds.js"));
const SHIM =
  `<script>(function(){var t=document.getElementById("dc-template"),` +
  `x=document.querySelector("x-dc");if(!t||!x)return;` +
  `Object.defineProperty(x,"innerHTML",{configurable:true,get:function(){return t.innerHTML}});})();</script>`;
/* The long copy of the four services, loaded by the export after mount. */
const DEEP = JSON.parse(fs.readFileSync(path.join(SITE, "content.json"), "utf8"));

function readPage(page) {
  const file = path.join(REACT_DIR, page.out);
  if (!fs.existsSync(file)) throw new Error(`v5build: ${path.relative(SITE, file)} is missing - run: node tools/prerender.mjs`);
  const src = fs.readFileSync(file, "utf8");
  const head = cut(src, "<head>", "</head>").inner;
  const TPL = cut(src, '<template id="dc-template">', "</template>").inner;
  if (TPL.includes("<template")) throw new Error(`v5build: ${page.route}: nested <template> in the page template`);
  const xdc = src.match(/<script type="text\/x-dc"[\s\S]*?<\/script>/);
  if (!xdc) throw new Error(`v5build: ${page.route}: no text/x-dc script`);
  const logicSrc = xdc[0].replace(/^<script[^>]*>/, "").replace(/<\/script>$/, "");
  const propsMeta = JSON.parse((xdc[0].match(/ data-props="([^"]*)"/) || [, "{}"])[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&"));
  const props = {};
  for (const k in propsMeta) if (propsMeta[k] && propsMeta[k].default !== undefined) props[k] = propsMeta[k].default;
  /* The component reads its initial state from a class field. Two globals let
   * one staging document render every width, and the deep copy, without reloading. */
  let stageScript = once(xdc[0], "vw: 1280", "vw: (window.__v5vw || 1280)");
  stageScript = once(stageScript, "formSent: false };", "formSent: false, ...(window.__v5state || {}) };");
  const body = src.slice(src.indexOf("</head>"));
  /* Delivered by prerender.mjs with the form handlers that call it; its bytes
   * are hashed in the CSP, so it travels verbatim. */
  const formRuntime = (body.match(/<script>\/\* contact delivery[\s\S]*?<\/script>/) || [])[0] || "";
  if (/onSubmit="\{\{/.test(TPL) && !formRuntime) throw new Error(`v5build: ${page.route}: the page has forms but no contact-delivery script`);
  /* Other scripts the built page loads from its body (image-slot.js on md-recall). */
  const bodyScripts = [...body.matchAll(/<script src="([^"]+)"[^>]*><\/script>/g)].map((m) => m[0]).filter((t) => !/support\.js|pixel-engine\.js/.test(t));
  const stageHead = head
    .replace(/<script src="\/pixel-engine\.js" defer><\/script>/, "")
    .replace(/<script src="\/motion-budget\.js" defer><\/script>/, "");
  const stage = `<!DOCTYPE html><html lang="de"><head>${stageHead}</head><body><x-dc></x-dc><template id="dc-template">${TPL}</template>${SHIM}${stageScript}</body></html>`;
  return { page, src, head, TPL, logicSrc, props, formRuntime, bodyScripts, stage };
}

/* ---------------------------------------------------------------- render + merge */
/* Runs in the staging tab. Renders the component at every sample width and
 * merges the renders into one markup with media queries. */
function mergeInTab([deep]) {
  const W = [400, 560, 610, 700, 860, 1000, 1120, 1280];
  const L = [0, 520, 600, 620, 760, 960, 1080, 1180];
  const NW = W.length;
  const warns = [];
  const warn = (m) => warns.length < 60 && !warns.includes(m) && warns.push(m);

  const Root = window.getDC(window.__dcRootName());
  const meta = JSON.parse(document.querySelector('script[type="text/x-dc"][data-props]').getAttribute("data-props"));
  const props = {};
  for (const k in meta) if (meta[k] && meta[k].default !== undefined) props[k] = meta[k].default;

  /* template node id -> its template attributes (hover, focus, style).
   * Taken from the template AS THE RUNTIME ANNOTATED IT, not by counting tags
   * in the raw template: that count agreed with the shipped desktop render
   * (1605 of 1605) and still drifted from id ~55 on in the other widths. */
  const rootName = window.__dcRootName();
  let ann = window.__dcAnnotatedTemplate;
  const annKind = typeof ann + (ann && ann.nodeType ? ":node" : "");
  if (typeof ann === "function") ann = ann(rootName);
  if (ann && typeof ann === "object" && !ann.nodeType) ann = (ann.get && ann.get(rootName)) || ann[rootName] || ann.html || ann.template;
  const annStr = typeof ann === "string" ? ann : ann && ann.nodeType ? ann.innerHTML || ann.outerHTML : null;
  if (!annStr || !annStr.includes("data-dc-tpl")) return { fatal: "no annotated template on window.__dcAnnotatedTemplate (" + annKind + ")" };
  const tplById = new Map();
  const tagRe = /<([a-zA-Z][\w-]*)\b([^>]*?)>/g;
  let tm;
  while ((tm = tagRe.exec(annStr))) {
    const a = { __tag: tm[1].toLowerCase() };
    tm[2].replace(/([\w:@.-]+)="([^"]*)"/g, (_, k, v) => { a[k] = v; return ""; });
    if (a["data-dc-tpl"] !== undefined) tplById.set(a["data-dc-tpl"], a);
  }
  const unesc = (s) => s.replace(/&quot;/g, '"').replace(/&amp;/g, "&");
  /* Nodes the build treats specially, found in the template, not in the render. */
  const extra = new Map();
  for (const [tid, ta] of tplById) {
    const st = ta.style || "";
    /* The panel is the one with a computed height (height: {{ panelH }}px); the caret above it shares only its opacity. */
    if (/\{\{\s*panelH\s*\}\}/.test(st)) extra.set(tid, "data-v5-panel");
    if (ta["data-hero-h1"] !== undefined || ta["data-pt-layer"] !== undefined) extra.set(tid, "data-v5-static");
  }

  const root = { kids: [], el: true };
  const renders = [];
  window.__v5state = { deep };
  for (let b = 0; b < NW; b++) {
    window.__v5vw = W[b];
    renders.push(window.ReactDOMServer.renderToString(window.React.createElement(Root, props)));
  }
  if (renders[0] === renders[NW - 1]) warn("render at 400 equals render at 1280 - the vw patch did not take");

  const keyed = (dom) => {
    const out = [], occ = new Map();
    let prev = "^";
    for (const c of dom.childNodes) {
      let base;
      if (c.nodeType === 1) base = c.getAttribute("data-dc-tpl") ? "d" + c.getAttribute("data-dc-tpl") : "t:" + c.localName;
      else if (c.nodeType === 3) base = "T@" + prev;
      else continue;
      const n = occ.get(base) || 0;
      occ.set(base, n + 1);
      const key = base + "#" + n;
      if (c.nodeType === 1) prev = key;
      out.push({ key, node: c });
    }
    return out;
  };
  /* A node new to the merge goes before the next sibling this render shares
   * with it, not straight after the last shared one: between 960 and 1079 px
   * the nav has no language switch, and "right after the search" put the
   * contact button in front of the switch for every wider screen. Inside that
   * gap the template id decides, since ids follow document order. */
  const tplNum = (key) => (key[0] === "d" ? Number(key.slice(1, key.indexOf("#"))) : NaN);
  const merge = (m, dom, r) => {
    let last = -1;
    const list = keyed(dom);
    for (let p = 0; p < list.length; p++) {
      const { key, node } = list[p];
      let i = m.kids.findIndex((k) => k.key === key);
      if (i < 0) {
        let stop = m.kids.length;
        for (let q = p + 1; q < list.length; q++) {
          const j = m.kids.findIndex((k) => k.key === list[q].key);
          if (j > last) { stop = j; break; }
        }
        i = stop;
        const mine = tplNum(key);
        if (!Number.isNaN(mine)) {
          for (let j = last + 1; j < stop; j++) if (tplNum(m.kids[j].key) > mine) { i = j; break; }
        }
        m.kids.splice(i, 0, node.nodeType === 1
          ? { key, el: true, tag: node.localName, attrs: {}, pres: new Set(), kids: [] }
          : { key, el: false, text: {}, pres: new Set() });
      } else if (i <= last) warn("sibling order differs at " + key + " in render " + r);
      last = Math.max(last, i);
      const k = m.kids[i];
      k.pres.add(r);
      if (k.el) {
        const a = {};
        for (const at of node.attributes) a[at.name] = at.value;
        k.attrs[r] = a;
        merge(k, node, r);
      } else k.text[r] = node.data;
    }
  };
  const holder = document.createElement("template");
  renders.forEach((html, r) => { holder.innerHTML = html; merge(root, holder.content, r); });

  /* ------------------------------------------------------------ emit */
  const styleIds = new Map();
  const sid = (s) => { if (!styleIds.has(s)) styleIds.set(s, styleIds.size); return styleIds.get(s); };
  const rules = new Map(); // "media|selector" -> decl
  const rule = (media, sel, decl) => rules.set(media + "|" + sel, decl);
  const range = (b1, b2) => {
    const q = [];
    if (b1 > 0) q.push(`(min-width:${L[b1]}px)`);
    if (b2 < NW - 1) q.push(`(max-width:${L[b2 + 1] - 0.02}px)`);
    return q.length ? "@media " + q.join(" and ") : "";
  };
  const runs = (arr) => {
    const out = [];
    arr.forEach((v, b) => { if (out.length && out[out.length - 1].v === v) out[out.length - 1].b2 = b; else out.push({ v, b1: b, b2: b }); });
    return out;
  };
  const escA = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  const escT = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);

  const emit = (m, ctx) => {
    let out = "";
    for (const n of m.kids) {
      const presW = W.map((_, b) => n.pres.has(b));
      const rep = (() => { for (let b = NW - 1; b >= 0; b--) if (presW[b]) return b; return -1; })();
      if (!n.el) {
        const t = n.text[rep];
        const base = W.map((_, b) => n.text[b]).filter((x) => x !== undefined);
        if (new Set(base.map((x) => x.trim())).size > 1) warn("text differs by width: " + JSON.stringify([...new Set(base)]).slice(0, 160));
        out += ctx.raw ? t : escT(t);
        continue;
      }
      const a = n.attrs[rep];
      const cls = a.class ? [a.class] : [];
      /* styles per width */
      const st = W.map((_, b) => (presW[b] ? n.attrs[b].style || "" : undefined));
      for (let b = 0; b < NW; b++) {
        if (st[b] !== undefined) continue;
        let c = b; while (c < NW && st[c] === undefined) c++;
        let d = b; while (d >= 0 && st[d] === undefined) d--;
        st[b] = c < NW ? st[c] : st[d];
      }
      for (const rn of runs(st)) {
        if (!rn.v) continue;
        const id = sid(rn.v);
        const whole = rn.b1 === 0 && rn.b2 === NW - 1;
        const c = whole ? "s" + id : `s${id}w${rn.b1}${rn.b2}`;
        rule(whole ? "" : range(rn.b1, rn.b2), "#dc-root ." + c, rn.v);
        cls.push(c);
      }
      /* absent at some widths */
      const hid = presW.map((p, b) => !p && !ctx.hid[b]);
      for (const rn of runs(hid)) {
        if (!rn.v) continue;
        const c = `hw${rn.b1}${rn.b2}`;
        rule(range(rn.b1, rn.b2), "#dc-root ." + c, "display:none!important");
        cls.push(c);
      }
      const extraAttrs = [];
      const tid = a["data-dc-tpl"];
      if (tid !== undefined) {
        const ta = tplById.get(tid) || {};
        /* Checked on every node that reaches the output. <a> -> <span> is the
         * build's own unwrapDeadLinks and expected. */
        const tplTag = ta.__tag && ta.__tag.indexOf("sc-raw-") === 0 ? ta.__tag.slice(7) : ta.__tag; /* the runtime encodes table tags to keep the parser off them */
        if (tplTag !== n.tag && !(tplTag === "a" && n.tag === "span")) warn(`template id ${tid} is <${ta.__tag}> in the template but <${n.tag}> in the render`);
        if (ta["style-hover"]) cls.push("h" + tid);
        if (ta["style-focus"]) cls.push("f" + tid);
        if (extra.has(tid)) extraAttrs.push(extra.get(tid));
      }
      let attrs = "";
      for (const k in a) if (k !== "style" && k !== "class") attrs += a[k] === "" ? ` ${k}` : ` ${k}="${escA(a[k])}"`;
      if (cls.length) attrs += ` class="${escA(cls.join(" "))}"`;
      if (extraAttrs.length) attrs += " " + extraAttrs.join(" ");
      out += `<${n.tag}${attrs}>`;
      if (VOID.has(n.tag)) continue;
      out += emit(n, { hid: presW.map((p, b) => !p || ctx.hid[b]), raw: n.tag === "style" || n.tag === "script" }) + `</${n.tag}>`;
    }
    return out;
  };
  const html = emit(root, { hid: W.map(() => false), raw: false });

  /* Hover and focus for EVERY template node, rendered now or created later by
   * the runtime (the runtime adds the class h<tid>/f<tid> to nodes it creates). */
  const hover = [], focus = [];
  for (const [tid, ta] of tplById) {
    if (ta["style-hover"]) { hover.push(tid); rule("", `#dc-root .h${tid}:hover`, unesc(ta["style-hover"])); }
    if (ta["style-focus"]) { focus.push(tid); rule("", `#dc-root .f${tid}:focus`, unesc(ta["style-focus"])); }
  }

  /* CSS, global rules first, then by media in ascending breakpoint order */
  const groups = new Map();
  for (const [k, decl] of rules) {
    const [media, sel] = [k.slice(0, k.indexOf("|")), k.slice(k.indexOf("|") + 1)];
    if (!groups.has(media)) groups.set(media, []);
    groups.get(media).push(`${sel}{${decl}}`);
  }
  const css = [...groups.keys()].sort((x, y) => (x === "" ? -1 : y === "" ? 1 : 0)).map((m) => (m ? `${m}{${groups.get(m).join("")}}` : groups.get(m).join(""))).join("\n");

  /* FAQ structured data from the widest render - a crawler reads it without JS */
  holder.innerHTML = renders[NW - 1];
  const faq = [];
  holder.content.querySelectorAll("#faq [aria-expanded]").forEach((btn) => {
    const q = (btn.textContent || "").trim();
    const p = btn.parentElement && btn.parentElement.querySelector("p");
    const ans = p ? (p.textContent || "").trim() : "";
    if (q && ans) faq.push({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: ans } });
  });

  /* The template the runtime binds against: the annotated copy without the
   * head block and without what only the design tool or the build needs. */
  let tpl = annStr;
  const helm = tpl.match(/<sc-helmet[\s\S]*?<\/sc-helmet>/g);
  if (!helm || helm.length !== 1) return { fatal: `expected one <sc-helmet> in the annotated template, found ${helm ? helm.length : 0}` };
  tpl = tpl.replace(helm[0], "");
  tpl = tpl.replace(/\s(hint-[\w-]+|style-hover|style-focus|sc-name)="[^"]*"/g, "");
  return { html, css, warns, faq, styles: styleIds.size, rules: rules.size, bytes: renders.map((r) => r.length), tpl, hover, focus };
}

/* ------------------------------------------------------------ assemble a page */
function assemble(P, merged, heights) {
  const { page, head, logicSrc } = P;
  const route = page.route;
  const warns = merged.warns.slice();
  let html = merged.html;
  const notes = [];

  /* ONE HEADLINE (start page): the first of the export's rotating variants,
   * with its entrance; the rest of the words are no longer shipped. Both
   * languages are in the h1, the one that html[lang] names is shown - the h1 is
   * a static island for the runtime, so the language switch works through CSS. */
  let heroCss = "";
  if (/<h1 [^>]*data-hero-h1/.test(html)) {
    const m = logicSrc.match(/heroWords:\s*\{\s*de:\s*(\[[^\]]*\]),\s*en:\s*(\[[^\]]*\])/);
    if (!m) throw new Error(`v5build: ${route}: heroWords (de and en) not found`);
    const heroHtml = ["de", "en"].map((lang, i) => {
      const words = Function(`return ${m[i + 1]}`)();
      if (!words.length || !words[0].w || !words[0].r) throw new Error(`v5build: ${route}: the first ${lang} hero headline is missing`);
      return `<span class="v5-hero" lang="${lang}"><span class="v5-w">${escT(words[0].w)}</span><span class="v5-r">${escT(words[0].r)}</span></span>`;
    }).join("");
    const h1Open = html.search(/<h1 [^>]*data-hero-h1/);
    const h1Inner = html.indexOf(">", h1Open) + 1;
    const h1Close = html.indexOf("</h1>", h1Inner);
    html = html.slice(0, h1Inner) + heroHtml + html.slice(h1Close);
    /* min-height: the render carries the logic's fallback 2.2em, which the page
     * shrank to the measured headline after first paint - a small layout shift.
     * The headline is exactly as tall as its text on its own. */
    heroCss =
      `#dc-root h1[data-hero-h1]{min-height:0}` +
      `.v5-w{display:inline-block;color:#635BFF;background-image:linear-gradient(90deg,#635BFF,#9B7BFF);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;padding-right:.04em;animation:wordIn .7s cubic-bezier(.2,.8,.2,1) both}` +
      `.v5-r{animation:restIn 1s ease both}` +
      `html:not([lang="en"]) .v5-hero[lang="en"],html[lang="en"] .v5-hero[lang="de"]{display:none}` +
      `@media (prefers-reduced-motion:reduce){.v5-hero *{animation:none!important}}`;
    notes.push("one headline");
  }

  /* ONE MARK LOADS FIRST. The export gives every brand mark fetchpriority="high":
   * the header's, which is the LCP candidate and preloaded in the head, and
   * the ones nobody sees at load (console, stack, footer, consent). Those load
   * lazily, when their block is rendered. */
  const preloadMark = (head.match(/<link rel="preload" as="image" href="([^"]+)"/) || [])[1];
  let marks = 0;
  html = html.replace(/<img src="(\/brand\/mark-[^"]+\.svg)"[^>]*>/g, (tag, src) => {
    if (!tag.includes(' fetchpriority="high"')) return tag;
    if (marks++ === 0) {
      if (preloadMark && src !== preloadMark) throw new Error(`v5build: ${route}: the first mark is ${src}, the head preloads ${preloadMark}`);
      return tag;
    }
    return tag.replace(' fetchpriority="high"', ' loading="lazy" decoding="async"');
  });
  if (marks < 1) throw new Error(`v5build: ${route}: no brand mark with fetchpriority found`);

  /* THE CLOSED MEGA MENU IS NOT RENDERED. It is one panel of ~320 nodes at
   * opacity 0 that the browser styled and laid out on every load, and its
   * images loaded although no one can see them (they sit inside the viewport,
   * so loading="lazy" alone would not hold them). content-visibility:hidden
   * skips the panel's content until the runtime sets data-v5-open; with that,
   * lazy images inside it wait too. */
  const panels = [...html.matchAll(/<div [^>]*data-v5-panel[^>]*>/g)];
  if (panels.length !== 1) throw new Error(`v5build: ${route}: expected one mega menu panel (data-v5-panel), found ${panels.length}`);
  const panelAt = panels[0].index;
  const panelEnd = elementEnd(html, panelAt);
  let panelImgs = 0;
  const panelHtml = html.slice(panelAt, panelEnd).replace(/<img (?![^>]*\bloading=)/g, () => (panelImgs++, '<img loading="lazy" decoding="async" '));
  if (!panelImgs) throw new Error(`v5build: ${route}: the mega menu panel holds no image - check the lazy step`);
  html = html.slice(0, panelAt) + panelHtml + html.slice(panelEnd);
  const panelCss = `#dc-root [data-v5-panel]:not([data-v5-open]){content-visibility:hidden}`;

  /* THE STREAM NOTES SHIP INERT. Owner: no notes on phones, at any size - they
   * cannot be hovered and are not looked at. The 112 labels are 336 elements,
   * 13 % of the start page's DOM, that every device parsed, styled and counted
   * and a phone then hid with display:none. Inside a <template> they are a
   * fragment nobody renders; runtime.js (armNotes) puts them in place on a
   * wide screen with a mouse, ten seconds after load, when the notes move. */
  const layers = [...html.matchAll(/<div [^>]*data-pt-layer[^>]*>/g)];
  if (layers.length > 1) throw new Error(`v5build: ${route}: expected at most one stream notes layer, found ${layers.length}`);
  if (layers.length === 1) {
    const layerOpenEnd = layers[0].index + layers[0][0].length;
    const layerEnd = elementEnd(html, layers[0].index);
    const layerInner = html.slice(layerOpenEnd, layerEnd - "</div>".length);
    if (!html.slice(0, layerEnd).endsWith("</div>")) throw new Error(`v5build: ${route}: the stream notes layer does not end where expected`);
    const labels = (layerInner.match(/<span [^>]*\bdata-pt[ >]/g) || []).length; /* the template id comes first in the tag */
    /* The subpages render the layer empty (their logic fills it live); only a
     * layer that carries labels is worth a template. */
    if (labels) {
      html = html.slice(0, layerOpenEnd) + `<template data-v5-pt>${layerInner}</template>` + html.slice(layerEnd - "</div>".length);
      notes.push(`${labels} notes inert`);
    }
  }

  /* THE INVITATION TO THE WORKSHOP (start page). Owner, 16.9. nachts: a switch
   * alone invites nobody, and the bottom-right corner belongs to the AI dock of
   * stage 2. So the page gets a small band right after "Arbeiten" (whose last
   * card is this very site): the Konfigurator band's own markup, cloned, so it
   * wears the same classes whatever number the export gives them, with a button
   * that opens the workshop at once (runtime.js listens for data-v5-dev-open).
   * The clone is static for the runtime and carries no template ids, or the
   * binder would take it for the band it was cloned from. The texts are
   * provisional; the text pass at the end edits WERKSTATT_BAND. */
  const WERKSTATT_BAND = {
    id: "werkstatt-band",
    label: "Tools-Hinweis",
    eyebrow: "Tools",
    /* Both languages, shown by html[lang] through LANG_CSS (tools/prerender.mjs):
     * the band is a static island, the binder never touches it. */
    title: { de: "Sehen Sie selbst, wie diese Seite gebaut ist.", en: "See for yourself how this page is built." },
    text: {
      de: "Ein Klick öffnet die Tools: der echte Aufbau der Seite, der Code, der sie bewegt, die Zeiten, die Ihr Browser gerade gemessen hat, und wie Google und Sprachmodelle sie lesen. Nichts wird gespeichert; gesendet wird nur, was Sie im Tab „Fragen“ fragen.",
      en: "One click opens the Tools: how this page is really built, the code that moves it, the timings your browser has just measured, and how Google and language models read it. Nothing is stored; the only thing sent is what you ask in the “Ask” tab.",
    },
    cta: { de: "Tools öffnen", en: "Open the Tools" },
  };
  const both = (v) => typeof v === "string" ? v : `<span data-lang="de">${v.de}</span><span data-lang="en">${v.en}</span>`;
  const work = html.match(/<section [^>]*id="work"[^>]*>/);
  if (work) {
    const open = html.match(/<section [^>]*id="konfig-band"[^>]*>/);
    if (!open) throw new Error(`v5build: ${route}: no section#konfig-band to clone for the workshop band`);
    const end = elementEnd(html, open.index);
    let band = html.slice(open.index, end);
    const spans = [...band.matchAll(/<span class="sc-interp">[^<]*<\/span>/g)];
    if (spans.length !== 4) throw new Error(`v5build: ${route}: the Konfigurator band has ${spans.length} text spans, expected 4 (eyebrow, title, text, cta)`);
    const texts = [WERKSTATT_BAND.eyebrow, WERKSTATT_BAND.title, WERKSTATT_BAND.text, WERKSTATT_BAND.cta].map(both);
    let k = 0;
    band = band.replace(/<span class="sc-interp">[^<]*<\/span>/g, () => `<span class="sc-interp">${texts[k++]}</span>`);
    band = once(band, 'id="konfig-band"', `id="${WERKSTATT_BAND.id}" data-v5-static`);
    band = once(band, 'data-screen-label="Konfigurator-Hinweis"', `data-screen-label="${WERKSTATT_BAND.label}"`);
    band = band.replace(/ data-dc-tpl="\d+"/g, "");
    const cta = band.match(/<a href="[^"]*" data-px class="([^"]*)">/);
    if (!cta) throw new Error(`v5build: ${route}: the Konfigurator band's CTA link is not where it was`);
    band = once(band, cta[0], `<button type="button" data-v5-dev-open data-px class="${cta[1]}">`);
    if (band.split("</a>").length !== 2) throw new Error(`v5build: ${route}: expected exactly one </a> in the Konfigurator band`);
    band = band.replace("</a>", "</button>");
    const workEnd = elementEnd(html, work.index);
    html = html.slice(0, workEnd) + "\n" + band + html.slice(workEnd);
    notes.push("workshop band");
  }

  /* THE DEFERRED BLOCKS GET A NAME AND THEIR MEASURED HEIGHT.
   * prerender.mjs marks the blocks below the first screen with data-cv="" and
   * one placeholder for all of them (contain-intrinsic-size:auto 900px). One
   * number for fifteen blocks was off by thousands of pixels either way
   * (16.9.2026, cv-audit.mjs: +3.402 px on a phone, -3.095 px on a desktop
   * during the first scroll). Here every block gets a stable key (v5cv.mjs)
   * and, from tools/v5-heights.json, the height it really has at each sample
   * width - measured on the built page by `node tools/v5heights.mjs`. Keys the
   * file does not know keep the 900px and are reported, so a renamed or added
   * block cannot silently inherit a wrong number. */
  const cvKeys = [];
  html = html.replace(/<(section|div)((?:[^>"]|"[^"]*")*?) data-cv(="[^"]*")?((?:[^>"]|"[^"]*")*)>/g, (tag, name, before, value, after) => {
    if (value && value !== '=""') throw new Error(`v5build: ${route}: data-cv already carries a value in the export: ${tag.slice(0, 80)}`);
    const attrs = before + after;
    const id = (attrs.match(/ id="([^"]*)"/) || [])[1];
    const label = (attrs.match(/ data-screen-label="([^"]*)"/) || [])[1];
    const key = cvKey({ id, label }, cvKeys.length + 1);
    if (cvKeys.includes(key)) throw new Error(`v5build: ${route}: duplicate data-cv key ${key}`);
    cvKeys.push(key);
    return `<${name}${before} data-cv="${key}"${after}>`;
  });
  const CV_STYLE = "<style>[data-cv]{content-visibility:auto;contain-intrinsic-size:auto 900px}</style>";
  if (head.split(CV_STYLE).length !== 2) throw new Error(`v5build: ${route}: the content-visibility style from prerender.mjs is not in the head exactly once`);
  let cvHeightsCss = "";
  let cvNote = "no measured heights - all blocks start at 900px; run: node tools/v5heights.mjs";
  const blocks = heights && heights.pages && heights.pages[route];
  if (blocks) {
    const widths = [...heights.widths].sort((a, b) => a - b);
    const rulesAt = (w) => cvKeys.filter((k) => blocks[k] && blocks[k][String(w)]).map((k) => `[data-cv="${k}"]{contain-intrinsic-size:auto ${blocks[k][String(w)]}px}`).join("");
    cvHeightsCss = widths.map((w, i) => (i === 0 ? rulesAt(w) : `@media (min-width:${w}px){${rulesAt(w)}}`)).join("\n");
    const unknown = cvKeys.filter((k) => !blocks[k]);
    const stale = Object.keys(blocks).filter((k) => !cvKeys.includes(k));
    cvNote = `heights (${heights.generated.slice(0, 10)}) for ${cvKeys.length - unknown.length}/${cvKeys.length} blocks at ${widths.join("/")}px`;
    if (unknown.length) { warns.push(`deferred blocks WITHOUT measured height, 900px placeholder: ${unknown.join(", ")} - run: node tools/v5heights.mjs --route ${route}`); process.exitCode = 1; }
    if (stale.length) warns.push(`v5-heights.json names blocks that are not on the page: ${stale.join(", ")} - run: node tools/v5heights.mjs --route ${route}`);
  } else if (cvKeys.length) { warns.push(`no measured heights for ${route}, 900px placeholders - run: node tools/v5heights.mjs --route ${route}`); process.exitCode = 1; }

  /* The head: the export's, minus React's runtime and its resources. The
   * robots meta follows site.config.json and is said once. The Markdown twin
   * is announced the way feeds are: a typed alternate. */
  const outHead = head
    .replace(/<script>window\.__resources=[^<]*<\/script>/, "")
    .replace(/<script src="\/_dcbuild\/support\.js" defer><\/script>/, "")
    .replace(/<script src="\/pixel-engine\.js" defer><\/script>/, "")
    .replace(/<style>x-dc\{display:none!important\}<\/style>/g, "")
    .replace(/\s*<meta name="robots"[^>]*>/g, "")
    .replace("</title>", `</title>\n  <meta name="robots" content="${ROBOTS}">\n  <link rel="alternate" type="text/markdown" href="${route}index.md">${route.startsWith("/news/") ? `\n  <link rel="alternate" type="application/atom+xml" href="/news/feed.xml" title="McCain Digital · News">` : ""}`)
    .replace(CV_STYLE, CV_STYLE + (cvHeightsCss ? `\n<style id="v5-cv-heights">${cvHeightsCss}</style>` : ""));
  if (/<(?:script|link)[^>]*(?:src|href)="[^"]*(?:_dcbuild\/|\/vendor\/|support\.js|pixel-engine\.js)/.test(outHead)) throw new Error(`v5build: ${route}: the head still loads React's runtime`);
  const headOut = outHead;

  /* The page's class, whole, with the v5 patches, as a function the runtime
   * calls with its base class and the React shim - no eval at runtime. */
  const logic = patchLogic(logicSrc, route);
  if (!/class Component extends DCLogic \{/.test(logic)) throw new Error(`v5build: ${route}: the logic is not "class Component extends DCLogic"`);
  const gen =
    `/* GENERATED by tools/v5build.mjs from the page logic in ${page.out} - do not edit.\n` +
    ` * The export's component class, whole, with the v5 patches (see V5_PATCHES in the build). */\n` +
    `window.__v5Logic = function (DCLogic, StreamableLogic, React) {\n${logic}\n;return Component;\n};\n`;

  const data = { route, props: P.props, hover: merged.hover, focus: merged.focus };
  const ld = merged.faq.length ? `<script type="application/ld+json">${json({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: merged.faq })}</script>\n` : "";
  const pageHtml = `<!DOCTYPE html>
<html lang="de">
<head>${headOut}
<style id="v5-css">${merged.css}\n${heroCss}\n${panelCss}</style>
<script src="${route}logic.gen.js" defer></script>
<script src="/runtime.js" defer></script>
</head>
<body>
<div id="dc-root">${html}</div>
${P.formRuntime}
${P.bodyScripts.join("\n")}
${ld}<template id="dc-template">${merged.tpl}</template>
<script type="application/json" id="v5-data">${json(data)}</script>
</body>
</html>
`;
  return { pageHtml, gen, html, headOut, cvKeys, cvNote, warns, notes };
}

/* --------------------------------------------------------------------- main */
await requireServer();
const heights = fs.existsSync(HEIGHTS_FILE) ? JSON.parse(fs.readFileSync(HEIGHTS_FILE, "utf8")) : null;
if (heights && !heights.pages) throw new Error("v5build: tools/v5-heights.json has the old layout - run: node tools/v5heights.mjs");
const { browser, context } = await launch(1280, 900);
const summary = [];
let failed = 0;
try {
  for (const page of PAGES) {
    if (ONLY.length && !ONLY.includes(page.route)) continue;
    const P = readPage(page);
    fs.writeFileSync(path.join(STAGE_DIR, "v5stage.html"), P.stage, "utf8");
    const tab = await open(context, `${BASE}/_dcbuild/v5stage.html`);
    try {
      await tab.waitForFunction(() => typeof window.getDC === "function" && !!window.React, null, { timeout: 30000 });
      await tab.addScriptTag({ url: "/_dcbuild/rds.js" });
      const merged = await tab.evaluate(mergeInTab, [DEEP]);
      if (merged.fatal) throw new Error(`v5build: ${page.route}: ${merged.fatal}`);
      const out = assemble(P, merged, heights);
      /* THE MARKDOWN TWIN. A language model or a crawler that asks for the .md
       * gets the page's words with their structure and none of the layout
       * markup. It is made from the finished body in the still-open tab, inside
       * an inert <template> so no script runs, with the head's title, description
       * and canonical as its front matter (tools/markdown.mjs; checked by
       * tools/markdown-check.mjs). */
      const headMeta = {
        title: unesc((out.headOut.match(/<title>([^<]*)<\/title>/) || [])[1] || ""),
        description: unesc((out.headOut.match(/<meta name="description" content="([^"]*)"/) || [])[1] || ""),
        canonical: (out.headOut.match(/<link rel="canonical" href="([^"]*)"/) || [])[1] || "",
        lang: "de",
      };
      const twin = await tab.evaluate(([src, body, meta]) => {
        const t = document.createElement("template");
        t.innerHTML = body;
        return new Function("return " + src)()(t.content, meta);
      }, [HTML_TO_MARKDOWN, out.html, headMeta]);
      if (!twin || twin.words < 120 || twin.headings < 1) {
        out.warns.push(`index.md looks thin: ${twin ? `${twin.words} words, ${twin.headings} headings` : "no result"} - check tools/markdown.mjs against the page`);
        process.exitCode = 1;
      }
      const dir = path.join(SITE, page.route.slice(1));
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "index.html"), out.pageHtml, "utf8");
      /* Minified for the wire (release 17.9.2026): the class is 150-190 KB
       * as the export wrote it, most of it names and comments nobody reads
       * on a phone. No syntax lowering (target esnext) - the code runs in
       * browsers as written, and lowering class fields would change what
       * `this.state` means in the constructor. */
      const genFile = path.join(dir, "logic.gen.js");
      fs.writeFileSync(genFile, minify(out.gen, `GENERATED by tools/v5build.mjs from the page logic in ${page.out} - do not edit`), "utf8");
      /* The readable edition beside it, for the workshop's Code tab (loaded
       * only when somebody opens the workshop, never by the page). */
      fs.writeFileSync(path.join(dir, "logic.src.js"), out.gen, "utf8");
      /* A generated file that does not parse fails the whole page silently in the browser. */
      const check = spawnSync(process.execPath, ["--check", genFile], { encoding: "utf8" });
      if (check.status !== 0) throw new Error(`v5build: ${page.route}: logic.gen.js does not parse\n` + check.stderr.split("\n").slice(0, 4).join("\n"));
      fs.writeFileSync(path.join(dir, "index.md"), twin.markdown, "utf8");
      /* For the sitemap, llms.txt and the CSP below. Only <script> with NO
       * attributes is hashed: #v5-data is application/json and the FAQ is
       * ld+json, the browser executes neither. */
      const hashes = [...out.pageHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
        (m) => `'sha256-${crypto.createHash("sha256").update(m[1], "utf8").digest("base64")}'`
      );
      summary.push({ route: page.route, src: page.src, date: page.date || null, prio: page.prio, freq: page.freq, title: headMeta.title, description: headMeta.description, hashes, warns: out.warns });
      console.log(`${page.route}  html ${(out.pageHtml.length / 1024).toFixed(0)} KB (css ${(merged.css.length / 1024).toFixed(0)}, template ${(merged.tpl.length / 1024).toFixed(0)}), logic ${(out.gen.length / 1024).toFixed(0)} KB, ${merged.styles} styles / ${merged.rules} rules, ${out.cvKeys.length} deferred blocks (${out.cvNote}), md ${twin.words} words / ${twin.headings} headings${out.notes.length ? "; " + out.notes.join(", ") : ""}`);
      if (out.warns.length) console.log("  warnings:\n    " + out.warns.join("\n    "));
    } catch (e) {
      failed++;
      process.exitCode = 1;
      console.error(`FAILED ${page.route}: ${e.message}`);
    } finally {
      await tab.close();
    }
  }
} finally {
  await browser.close();
}
/* THE BINDER SHIPS MINIFIED. tools/runtime.js is the commented source of
 * record; /runtime.js at the site root is its build, the same arrangement
 * as tools/motion-budget.js → /motion-budget.js in prerender.mjs. The
 * workshop shows both sources readable, so they are copied next to it. */
fs.copyFileSync(path.join(import.meta.dirname, "runtime.js"), path.join(SITE, "werkstatt", "runtime.src.js"));
fs.copyFileSync(path.join(import.meta.dirname, "motion-budget.js"), path.join(SITE, "werkstatt", "motion-budget.src.js"));
{
  const src = path.join(import.meta.dirname, "runtime.js");
  if (!fs.existsSync(src)) throw new Error("v5build: tools/runtime.js is missing");
  const built = minify(fs.readFileSync(src, "utf8"), "GENERATED by tools/v5build.mjs from tools/runtime.js - edit the source, not this file");
  fs.writeFileSync(path.join(SITE, "runtime.js"), built, "utf8");
  const check = spawnSync(process.execPath, ["--check", path.join(SITE, "runtime.js")], { encoding: "utf8" });
  if (check.status !== 0) throw new Error("v5build: the minified runtime.js does not parse\n" + check.stderr.split("\n").slice(0, 4).join("\n"));
  console.log(`runtime.js  ${(fs.statSync(src).size / 1024).toFixed(0)} KB source → ${(built.length / 1024).toFixed(0)} KB minified`);
}
console.log(`\n${summary.length} page(s) written to the site root${failed ? `, ${failed} FAILED` : ""}`);

/* ------------------------------------------- sitemap, llms.txt, CSP hashes */
/* Written from what was just built, never maintained beside it - and only
 * after a FULL build without failures: a partial run must not shrink the
 * sitemap to the pages it happened to rebuild. Moved here from prerender.mjs
 * on 17.9.2026, when its pages stopped being the site. */
if (ONLY.length || failed || summary.length !== PAGES.length) {
  console.log("  partial build: sitemap.xml, llms.txt and the CSP in vercel.json are left as they are");
} else {
  const today = new Date().toISOString().slice(0, 10);
  /* lastmod is the day the page's SOURCE last changed (git, the artboard),
   * not the build day: a stamp that moves on every build tells a crawler
   * nothing (Squirrelscan "sitemap-lastmod-churn", 17.9.2026). Outside a
   * checkout, or for a file git has never seen, it falls back to today. */
  const lastmodOf = (p) => {
    const r = spawnSync("git", ["log", "-1", "--format=%cs", "--", path.join("mccain-design-system", p.src)], { cwd: SITE, encoding: "utf8" });
    const d = (r.stdout || "").trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : today;
  };
  const sitemap =
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    summary
      .map(
        (p) =>
          `  <url>\n    <loc>${ORIGIN}${p.route}</loc>\n    <lastmod>${lastmodOf(p)}</lastmod>\n` +
          `    <changefreq>${p.freq}</changefreq>\n    <priority>${p.prio}</priority>\n  </url>`
      )
      .join("\n") +
    `\n</urlset>\n`;
  fs.writeFileSync(path.join(SITE, "sitemap.xml"), sitemap, "utf8");

  /* llms.txt: the prose half is authored in the export and copied as it is.
   * The page index underneath links the Markdown twin of every page, which is
   * what a language model should fetch, and names the HTML page beside it. */
  const llmsHead = fs.readFileSync(path.join(EXPORT_DIR, "llms.txt"), "utf8").trimEnd();
  const llmsIndex = summary.map((p) => `- [${p.title}](${ORIGIN}${p.route}index.md): Seite ${ORIGIN}${p.route}`).join("\n");
  fs.writeFileSync(path.join(SITE, "llms.txt"), `${llmsHead}\n\n## Alle Seiten\n\n${llmsIndex}\n`, "utf8");

  /* news/feed.xml: an Atom feed of the dated pages under /news/ (`date` in
   * tools/pages.mjs). Announced by <link rel="alternate"> in the head of the
   * news pages (see outHead above). One entry today; the file is what a
   * reader subscribes to before there are more. */
  const posts = summary.filter((p) => p.date && p.route.startsWith("/news/")).sort((a, b) => b.date.localeCompare(a.date));
  if (posts.length) {
    const feed =
      `<?xml version="1.0" encoding="UTF-8"?>\n<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="de">\n` +
      `  <title>McCain Digital · News</title>\n  <id>${ORIGIN}/news/</id>\n  <link href="${ORIGIN}/news/"/>\n  <link rel="self" href="${ORIGIN}/news/feed.xml"/>\n` +
      `  <updated>${posts[0].date}T00:00:00Z</updated>\n  <author><name>McCain Digital</name></author>\n` +
      posts.map((p) => `  <entry>\n    <title>${escT(p.title)}</title>\n    <id>${ORIGIN}${p.route}</id>\n    <link href="${ORIGIN}${p.route}"/>\n    <published>${p.date}T00:00:00Z</published>\n    <updated>${p.date}T00:00:00Z</updated>\n    <summary>${escT(p.description || "")}</summary>\n  </entry>`).join("\n") +
      `\n</feed>\n`;
    fs.writeFileSync(path.join(SITE, "news", "feed.xml"), feed, "utf8");
  }

  /* THE CSP HASHES ARE READ OFF WHAT WAS ACTUALLY WRITTEN, NOT OFF A LIST. A
   * policy maintained beside the code goes stale the first time somebody adds
   * a script, and the failure is silent in the worst direction: the page loads,
   * looks perfect, and one behaviour is gone. The only inline script today is
   * the contact-delivery runtime on the pages with a form.
   *
   * No 'unsafe-eval' any more: support.js compiled the component through
   * new Function(); the binder does not, the class ships as a plain script
   * (logic.gen.js), and none of runtime.js, logic.gen.js, pixel-engine.js,
   * image-slot.js, motion-budget.js or werkstatt/ evaluates code (grepped
   * 17.9.2026). img-src data: stays for pixel-engine.js and image-slot.js
   * (toDataURL); style-src 'unsafe-inline' for style#v5-css. */
  const hashes = [...new Set(summary.flatMap((p) => p.hashes))].sort();
  const CSP = [
    "default-src 'self'",
    "base-uri 'none'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    "form-action 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    `script-src 'self' ${hashes.join(" ")}`,
    "connect-src 'self' https://api.web3forms.com",
    "upgrade-insecure-requests",
  ].join("; ");
  const vercelPath = path.join(SITE, "vercel.json");
  const vercelJson = JSON.parse(fs.readFileSync(vercelPath, "utf8"));
  const cspHeader = vercelJson.headers.flatMap((h) => h.headers).find((h) => h.key === "Content-Security-Policy");
  if (!cspHeader) throw new Error("v5build: vercel.json has no Content-Security-Policy header to fill in - add one with any placeholder value, the build owns the value");
  const cspChanged = cspHeader.value !== CSP;
  if (cspChanged) {
    cspHeader.value = CSP;
    fs.writeFileSync(vercelPath, JSON.stringify(vercelJson, null, 2) + "\n", "utf8");
  }
  console.log(`  sitemap.xml and llms.txt: ${summary.length} routes · CSP: ${hashes.length} inline script hash(es)${cspChanged ? " - vercel.json updated" : " - vercel.json already current"}`);
}
