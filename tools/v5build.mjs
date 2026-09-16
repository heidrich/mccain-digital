/* The start page as plain HTML + CSS + a little JS - no React at runtime.
 *
 *   python prodserve.py 8898 --dev      # must be running
 *   node tools/v5build.mjs              # writes v5/ , open http://127.0.0.1:8898/v5/
 *
 * WHY
 * The built page is one React class component with ~40 state fields on its
 * root: every state change re-renders all ~2,400 nodes (tools/reactprof.mjs:
 * 15 full re-renders in 30 s, 64-84 ms each at 4x CPU). Nothing there can be
 * memoised or split, because there are no subtrees. So the page is not tuned,
 * it is taken apart: the markup React would write becomes the HTML, its inline
 * styles become classes, and the behaviour is the page's own methods, copied
 * verbatim, driving the DOM directly.
 *
 * HOW - and why React still runs, but only here
 * The markup is not rewritten by hand. The export's own component is rendered
 * with react-dom/server, like tools/prerender.mjs does, but 32 times:
 *
 *   8 widths   the logic lays out by `vw` in JS (breakpoints 520, 600, 620,
 *              760, 960, 1080, 1180). The built index.html only carries the
 *              vw=1280 render; phones got theirs from a client re-render.
 *   4 states   base, consent shown, consent details open, mobile menu open -
 *              the overlays exist only while their state is on.
 *
 * The renders are merged node by node. Identity is the template node id
 * (data-dc-tpl, verified 1605/1605 against the template's tag order), plus
 * occurrence among siblings for loops and React-created nodes. What differs by
 * width becomes a media query; what exists only in a state is marked
 * data-v5-when / data-v5-unless and toggled by a flag on <html>. Hover and
 * focus styles, which the runtime applied from JS, become real :hover/:focus.
 *
 * Specificity: inline styles beat every author rule, classes do not. Every
 * generated rule is scoped `#dc-root .x` (1,1,0) so it outranks the page's own
 * global rules the way the inline style did; hover is (1,2,0) so it wins over
 * the base. Nothing is !important except the display:none of absent nodes.
 *
 * The media queries measure the viewport, the runtime measured the root
 * element (viewport minus a desktop scrollbar). Within ~17 px of a breakpoint
 * on a desktop with a classic scrollbar the two can disagree.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { BASE, launch, open, requireServer } from "./browser.mjs";

import { HEIGHTS_FILE, cvKey } from "./v5cv.mjs";

const SITE = path.join(import.meta.dirname, "..");
const OUT = path.join(SITE, "v5");
const STAGE_DIR = path.join(SITE, "_dcbuild");
const src = fs.readFileSync(path.join(SITE, "index.html"), "utf8");

const cut = (s, a, b, from = 0) => {
  const i = s.indexOf(a, from);
  const j = s.indexOf(b, i + a.length);
  if (i < 0 || j < 0) throw new Error(`v5build: cannot find ${a} ... ${b}`);
  return { i, j, inner: s.slice(i + a.length, j) };
};
const once = (s, find, repl) => {
  const n = s.split(find).length - 1;
  if (n !== 1) throw new Error(`v5build: expected "${find}" once, found ${n}`);
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

const head = cut(src, "<head>", "</head>").inner;
const TPL = cut(src, '<template id="dc-template">', "</template>").inner;
if (TPL.includes("<template")) throw new Error("v5build: nested <template> in the page template");
const xdc = src.match(/<script type="text\/x-dc"[\s\S]*?<\/script>/);
if (!xdc) throw new Error("v5build: no text/x-dc script");
const logicSrc = xdc[0].replace(/^<script[^>]*>/, "").replace(/<\/script>$/, "");

/* The component reads its initial state from a class field. Two globals let
 * one staging document render every width and state without reloading. */
let stageScript = once(xdc[0], "vw: 1280", "vw: (window.__v5vw || 1280)");
stageScript = once(stageScript, "formSent: false }", "formSent: false, ...(window.__v5state || {}) }");

const SHIM =
  `<script>(function(){var t=document.getElementById("dc-template"),` +
  `x=document.querySelector("x-dc");if(!t||!x)return;` +
  `Object.defineProperty(x,"innerHTML",{configurable:true,get:function(){return t.innerHTML}});})();</script>`;
const stageHead = head
  .replace(/<script src="\/pixel-engine\.js" defer><\/script>/, "")
  .replace(/<script src="\/motion-budget\.js" defer><\/script>/, "");
fs.mkdirSync(STAGE_DIR, { recursive: true });
fs.copyFileSync(path.join(import.meta.dirname, "vendor-build", "react-dom-server-legacy-18.3.1.js"), path.join(STAGE_DIR, "rds.js"));
fs.writeFileSync(
  path.join(STAGE_DIR, "v5stage.html"),
  `<!DOCTYPE html><html lang="de"><head>${stageHead}</head><body><x-dc></x-dc><template id="dc-template">${TPL}</template>${SHIM}${stageScript}</body></html>`,
  "utf8"
);

/* ---------------------------------------------------------------- render + merge */
await requireServer();
const { browser, context } = await launch(1280, 900);
const tab = await open(context, `${BASE}/_dcbuild/v5stage.html`);
await tab.waitForFunction(() => typeof window.getDC === "function" && !!window.React, null, { timeout: 30000 });
await tab.addScriptTag({ url: "/_dcbuild/rds.js" });

const merged = await tab.evaluate((TPL) => {
  const W = [400, 560, 610, 700, 860, 1000, 1120, 1280];
  const L = [0, 520, 600, 620, 760, 960, 1080, 1180];
  const VARS = [
    { name: "base", st: {} },
    { name: "consent", st: { consent: "ask" } },
    { name: "consentOpen", st: { consent: "ask", consentOpen: true } },
    { name: "mobile", st: { mobileOpen: true } },
  ];
  const NW = W.length;
  const warns = [];
  const warn = (m) => warns.length < 60 && !warns.includes(m) && warns.push(m);

  const Root = window.getDC(window.__dcRootName());
  const meta = JSON.parse(document.querySelector('script[type="text/x-dc"][data-props]').getAttribute("data-props"));
  const props = {};
  for (const k in meta) if (meta[k] && meta[k].default !== undefined) props[k] = meta[k].default;

  /* template node id -> its template attributes (hover, focus, events, dynamic styles).
   * Taken from the template AS THE RUNTIME ANNOTATED IT, not by counting tags in
   * the raw template: that count agreed with the shipped desktop render (1605 of
   * 1605) and still drifted from id ~55 on in the other widths, which would have
   * put hover rules and click handlers on the wrong nodes. */
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
  void TPL;

  const root = { kids: [], el: true };
  const renders = [];
  for (let v = 0; v < VARS.length; v++) {
    for (let b = 0; b < NW; b++) {
      window.__v5vw = W[b];
      window.__v5state = VARS[v].st;
      renders.push(window.ReactDOMServer.renderToString(window.React.createElement(Root, props)));
    }
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
  const presIn = (n, v, b) => n.pres.has(v * NW + b);
  let stateStyleDiffs = 0;

  const emit = (m, ctx) => {
    let out = "";
    for (const n of m.kids) {
      const presW = W.map((_, b) => VARS.some((_, v) => presIn(n, v, b)));
      /* state gating, marked on the top-most node only */
      let when = null, unless = null;
      if (!W.some((_, b) => presIn(n, 0, b))) {
        const v = VARS.findIndex((_, v) => v > 0 && W.some((_, b) => presIn(n, v, b)));
        if (ctx.when !== VARS[v].name) when = VARS[v].name;
      } else {
        for (let v = 1; v < VARS.length; v++) {
          const dropped = W.some((_, b) => presIn(n, 0, b) && (m.pres ? presIn(m, v, b) : true) && !presIn(n, v, b));
          if (dropped && !(ctx.unless || []).includes(VARS[v].name)) unless = (unless ? unless + " " : "") + VARS[v].name;
        }
      }
      const pick = (b) => { for (const v of [0, 1, 2, 3]) if (presIn(n, v, b)) return v * NW + b; return -1; };
      const rep = (() => { for (let b = NW - 1; b >= 0; b--) { const r = pick(b); if (r >= 0) return r; } return -1; })();

      if (!n.el) {
        const t = n.text[rep];
        const base = W.map((_, b) => n.text[b]).filter((x) => x !== undefined);
        if (new Set(base).size > 1) warn("text differs by width: " + JSON.stringify([...new Set(base)]).slice(0, 160));
        out += ctx.raw ? t : escT(t);
        continue;
      }
      const a = n.attrs[rep];
      const cls = a.class ? [a.class] : [];
      /* styles per width */
      const st = W.map((_, b) => { const r = pick(b); return r >= 0 ? n.attrs[r].style || "" : undefined; });
      for (let b = 0; b < NW; b++) {
        if (st[b] !== undefined) continue;
        let c = b; while (c < NW && st[c] === undefined) c++;
        let d = b; while (d >= 0 && st[d] === undefined) d--;
        st[b] = c < NW ? st[c] : st[d];
      }
      for (let b = 0; b < NW; b++) {
        for (let v = 1; v < VARS.length; v++) {
          if (presIn(n, 0, b) && presIn(n, v, b) && (n.attrs[b].style || "") !== (n.attrs[v * NW + b].style || "")) { stateStyleDiffs++; if (stateStyleDiffs < 12) warn(`style differs in state ${VARS[v].name}: ${a["data-dc-tpl"] || n.key} ${(n.attrs[v * NW + b].style || "").slice(0, 120)}`); }
        }
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
      const extra = [];
      const tid = a["data-dc-tpl"];
      if (tid !== undefined) {
        const ta = tplById.get(tid) || {};
        /* Checked on every node that reaches the output. <a> -> <span> is the
         * build's own unwrapDeadLinks and expected. */
        if (ta.__tag !== n.tag && !(ta.__tag === "a" && n.tag === "span")) warn(`template id ${tid} is <${ta.__tag}> in the template but <${n.tag}> in the render`);
        if (ta["style-hover"]) { cls.push("h" + tid); rule("", `#dc-root .h${tid}:hover`, ta["style-hover"]); }
        if (ta["style-focus"]) { cls.push("f" + tid); rule("", `#dc-root .f${tid}:focus`, ta["style-focus"]); }
        /* The annotated template is serialised through the DOM, which lower-cases
         * attribute names: onClick arrives as onclick. */
        const on = Object.keys(ta).filter((k) => /^on[a-z]+$/i.test(k) && ta[k].includes("{{")).map((k) => k.slice(2).toLowerCase() + ":" + ta[k].replace(/[{}\s]/g, ""));
        if (on.length) extra.push(`data-on="${escA(on.join(" "))}"`);
        if (ta.ref) extra.push(`data-ref="${escA(ta.ref.replace(/[{}\s]/g, ""))}"`);
        const dyn = (ta.style || "").split(";").filter((d) => d.includes("{{")).map((d) => d.trim().replace(/\s*:\s*/, ":").replace(/[{}\s]/g, ""));
        if (dyn.length) extra.push(`data-dyn="${escA(dyn.join(";"))}"`);
      }
      if (when) extra.push(`data-v5-when="${when}"`);
      if (unless) extra.push(`data-v5-unless="${unless}"`);
      let attrs = "";
      for (const k in a) if (k !== "style" && k !== "class" && k !== "data-dc-tpl") attrs += a[k] === "" ? ` ${k}` : ` ${k}="${escA(a[k])}"`;
      if (cls.length) attrs += ` class="${escA(cls.join(" "))}"`;
      if (extra.length) attrs += " " + extra.join(" ");
      out += `<${n.tag}${attrs}>`;
      if (VOID.has(n.tag)) continue;
      out += emit(n, {
        hid: presW.map((p, b) => !p || ctx.hid[b]),
        when: when || ctx.when,
        unless: unless ? (ctx.unless || []).concat(unless.split(" ")) : ctx.unless,
        raw: n.tag === "style" || n.tag === "script",
      }) + `</${n.tag}>`;
    }
    return out;
  };
  const html = emit(root, { hid: W.map(() => false), when: null, unless: null, raw: false });

  /* CSS, global rules first, then by media in ascending breakpoint order */
  const groups = new Map();
  for (const [k, decl] of rules) {
    const [media, sel] = [k.slice(0, k.indexOf("|")), k.slice(k.indexOf("|") + 1)];
    if (!groups.has(media)) groups.set(media, []);
    groups.get(media).push(`${sel}{${decl}}`);
  }
  const css = [...groups.keys()].sort((x, y) => (x === "" ? -1 : y === "" ? 1 : 0)).map((m) => (m ? `${m}{${groups.get(m).join("")}}` : groups.get(m).join(""))).join("\n");

  /* FAQ structured data from the widest base render - a crawler reads it without JS */
  holder.innerHTML = renders[NW - 1];
  const faq = [];
  holder.content.querySelectorAll("#faq [aria-expanded]").forEach((btn) => {
    const q = (btn.textContent || "").trim();
    const p = btn.parentElement && btn.parentElement.querySelector("p");
    const ans = p ? (p.textContent || "").trim() : "";
    if (q && ans) faq.push({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: ans } });
  });
  return { html, css, warns, faq, styles: styleIds.size, rules: rules.size, stateStyleDiffs, bytes: renders.map((r) => r.length) };
}, TPL);
await browser.close();
if (merged.fatal) throw new Error("v5build: " + merged.fatal);

/* --------------------------------------------------------- one headline */
/* Owner, 16.9.2026: "wir nutzen nur noch einen headline". Stage 1 rebuilt the
 * export's rotation in CSS and showed variants two to four as generated text at
 * 13.5, 20 and 26.5 s. Each was a new, larger LCP candidate, and PageSpeed,
 * which measures until the page has been quiet for five seconds, reported
 * LCP 20,5 s (local run: 88.228 px2 at 19.876 ms against 34.450 px2 at 252 ms).
 * The first variant stays, with its entrance; the rest of the export's words
 * are no longer shipped. */
const heroWords = (() => {
  const m = logicSrc.match(/heroWords:\s*\{\s*de:\s*(\[[^\]]*\])/);
  if (!m) throw new Error("v5build: heroWords not found");
  return Function(`return ${m[1]}`)();
})();
if (!heroWords.length || !heroWords[0].w || !heroWords[0].r) throw new Error("v5build: the first hero headline is missing");
const h1Open = merged.html.search(/<h1 [^>]*data-hero-h1/);
if (h1Open < 0) throw new Error("v5build: hero h1 not found");
const h1Inner = merged.html.indexOf(">", h1Open) + 1;
const h1Close = merged.html.indexOf("</h1>", h1Inner);
const escT = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const heroHtml = `<span class="v5-hero"><span class="v5-w">${escT(heroWords[0].w)}</span><span class="v5-r">${escT(heroWords[0].r)}</span></span>`;
let html = merged.html.slice(0, h1Inner) + heroHtml + merged.html.slice(h1Close);

/* ONE MARK LOADS FIRST. The export gives every brand mark fetchpriority="high",
 * and there are five: the header's, which is the LCP candidate and preloaded in
 * the head, and four that nobody sees at load - the AI console, the stack
 * diagram, the footer and the consent note (shown at 7 s). Those four load
 * lazily, when their block is rendered. */
const preloadMark = (head.match(/<link rel="preload" as="image" href="([^"]+)"/) || [])[1];
let marks = 0;
html = html.replace(/<img src="(\/brand\/mark-[^"]+\.svg)"[^>]*>/g, (tag, src) => {
  if (!tag.includes(' fetchpriority="high"')) return tag;
  if (marks++ === 0) {
    if (src !== preloadMark) throw new Error(`v5build: the first mark is ${src}, the head preloads ${preloadMark}`);
    return tag;
  }
  return tag.replace(' fetchpriority="high"', ' loading="lazy" decoding="async"');
});
if (marks < 2) throw new Error(`v5build: expected the header mark and further marks, found ${marks}`);

/* THE CLOSED MEGA MENU IS NOT RENDERED. It is one panel of ~320 nodes at
 * opacity 0 that the browser styled and laid out on every load, and its two
 * images loaded although no one can see them (they sit inside the viewport,
 * so loading="lazy" alone would not hold them). content-visibility:hidden
 * skips the panel's content until stage 2 sets data-v5-open; with that, lazy
 * images inside it wait too. */
/* The panel is the one with a computed height; the caret above it shares its opacity. */
const PANEL = /<div [^>]*data-dyn="[^"]*height:panelHpx[^"]*opacity:panelOp/g;
const panels = [...html.matchAll(PANEL)];
if (panels.length !== 1) throw new Error(`v5build: expected one mega menu panel (data-dyn height:panelHpx...opacity:panelOp), found ${panels.length}`);
const panelAt = panels[0].index;
const panelEnd = elementEnd(html, panelAt);
let panelImgs = 0;
const panelHtml = html.slice(panelAt, panelEnd).replace(/<img (?![^>]*\bloading=)/g, () => (panelImgs++, '<img loading="lazy" decoding="async" '));
if (!panelImgs) throw new Error("v5build: the mega menu panel holds no image - check the lazy step");
html = html.slice(0, panelAt) + panelHtml + html.slice(panelEnd);
const panelCss = `#dc-root [data-dyn*="height:panelHpx"]:not([data-v5-open]){content-visibility:hidden}`;

/* THE STREAM NOTES SHIP INERT. Owner: no notes on phones, at any size - they
 * cannot be hovered and are not looked at. The 112 labels are 336 elements,
 * 13 % of the page's DOM, that every device parsed, styled and counted and a
 * phone then hid with display:none. Inside a <template> they are a fragment
 * nobody renders; home.js (armNotes) puts them in place on a wide screen with
 * a mouse, ten seconds after load, when the notes start moving. */
const layerTag = /<div [^>]*data-pt-layer[^>]*>/g;
const layers = [...html.matchAll(layerTag)];
if (layers.length !== 1) throw new Error(`v5build: expected one stream notes layer, found ${layers.length}`);
const layerOpenEnd = layers[0].index + layers[0][0].length;
const layerEnd = elementEnd(html, layers[0].index);
const layerInner = html.slice(layerOpenEnd, layerEnd - "</div>".length);
if (!html.slice(0, layerEnd).endsWith("</div>") || (layerInner.match(/<span data-pt[ >]/g) || []).length < 20) {
  throw new Error("v5build: the stream notes layer does not look like 112 labels any more");
}
html = html.slice(0, layerOpenEnd) + `<template data-v5-pt>${layerInner}</template>` + html.slice(layerEnd - "</div>".length);

/* min-height: the render carries the logic's fallback 2.2em, which the page
 * shrank to the measured headline after first paint - a small layout shift.
 * The headline is exactly as tall as its text on its own. (1,1,1) outranks
 * the class. */
const heroCss =
  `#dc-root h1[data-hero-h1]{min-height:0}` +
  `.v5-w{display:inline-block;color:#635BFF;background-image:linear-gradient(90deg,#635BFF,#9B7BFF);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;padding-right:.04em;animation:wordIn .7s cubic-bezier(.2,.8,.2,1) both}` +
  `.v5-r{animation:restIn 1s ease both}` +
  `@media (prefers-reduced-motion:reduce){.v5-hero *{animation:none!important}}`;

/* State flags on <html> switch the overlays that exist only in one state. */
const stateCss = ["consent", "consentOpen", "mobile"]
  .map((s) => `html:not([data-v5-${s.toLowerCase()}]) [data-v5-when="${s}"]{display:none!important}html[data-v5-${s.toLowerCase()}] [data-v5-unless~="${s}"]{display:none!important}`)
  .join("");

/* --------------------------------------------------------- the page's own methods */
const KEEP = ["reduced", "accent", "hexRgb", "watchConsole", "initReveal", "initFlow", "initPixels", "runCounters", "initFx", "countTo", "onScroll", "updateProcess",
  "startDemo", "gradRef", "startGradient", "stopGradient", "movePointsGlobal", "movePoints", "onPointer",
  "dgRef", "dgPaths", "dgPulse", "dgPulseStart", "dgPulseStop", "dgAutoStart", "dgAutoStop", "dgTouch", "go", "goHandler", "onKey", "keyActivate"];
const methodRe = /\n  (?:static )?([A-Za-z_]\w*)\s*(?:=\s*(?:\([^)]*\)|\w+)\s*=>|\([^)]*\)\s*\{)/g;
const pos = [];
for (let m; (m = methodRe.exec(logicSrc)); ) pos.push([m.index, m[1]]);
const bodies = new Map();
pos.forEach(([p, name], k) => {
  if (!KEEP.includes(name)) return;
  const isLast = k + 1 === pos.length;
  let body = logicSrc.slice(p, isLast ? logicSrc.length : pos[k + 1][0]);
  /* The last method runs to the end of the script, and so carries the class's own closing brace. */
  if (isLast) body = body.replace(/\n\}\s*$/, "");
  const st = body.search(/\n\s*static [A-Z]/);
  if (st > 0) body = body.slice(0, st);
  bodies.set(name, body.trim()); // a later definition wins, as in a class body
});
const missing = KEEP.filter((k) => !bodies.has(k));
if (missing.length) throw new Error("v5build: methods not found: " + missing.join(", "));
const copied = [...bodies.values()].join("\n\n  ");
if (/\bReact\./.test(copied)) throw new Error("v5build: a copied method still uses React");

/* ------------------------------------------------ v5 changes to the copied logic */
/* Anchored and counted: if an export rewrites one of these lines, the build
 * stops instead of shipping the old behaviour. What the page instance adds
 * (isSkipped, ptStale) comes from v5/home.js; see the top of that file. */
const V5_PATCHES = [
  /* The stack diagram measured its nodes 120 ms and 900 ms after start and on
   * its first ResizeObserver callback - inside a section that is skipped at
   * that point, so the browser had to lay it out. The paths are now built when
   * the diagram's block is rendered: the browser does that 1,5 screens ahead,
   * so the lines are there before the diagram arrives (home.js calls dgRedo
   * when the block comes in; the visibility callback below is the fallback). */
  {
    find: "const redo = () => { cancelAnimationFrame(this.dgRaf); this.dgRaf = requestAnimationFrame(() => this.dgPaths()); };",
    repl: "const redo = () => { if (this.isSkipped(el)) { this.dgStale = true; return; } this.dgStale = false; cancelAnimationFrame(this.dgRaf); this.dgRaf = requestAnimationFrame(() => this.dgPaths()); }; this.dgRedo = redo;",
  },
  {
    find: "if (vis) { this.dgAutoStart(); this.dgPulseStart(); setP(false); }",
    repl: "if (vis) { if (this.dgStale) redo(); this.dgAutoStart(); this.dgPulseStart(); setP(false); }",
  },
  /* AN OBSERVED ELEMENT IS A RENDERED ELEMENT. An IntersectionObserver target
   * inside a skipped content-visibility block makes the browser compute that
   * block's style anyway - measured: with only these observe() calls held
   * back, the 14 stack logo masks stopped loading at 125 ms. Reveal, fx, flow,
   * console and diagram targets now go through watchShown() (home.js), which
   * observes them while their block is rendered and lets go when it is not.
   * The hero observer stays direct: the hero is never deferred.
   * The third argument is what the observer would report for a target that is
   * far away. Only the console needs it: its state starts as "visible", and an
   * observer that is not yet observing never says otherwise (stage 2's dock
   * would stay hidden after the hero until the reader neared the console). */
  { find: "this.io.observe(el)", repl: "this.watchShown(this.io, el)" },
  { find: "this.io.unobserve(el)", repl: "this.unwatch(this.io, el)" },
  { find: "this.fxIo.observe(el)", repl: "this.watchShown(this.fxIo, el)" },
  { find: "this.flowIo.observe(el)", repl: "this.watchShown(this.flowIo, el)" },
  {
    find: "this.consoleIo.observe(el)",
    repl: "this.watchShown(this.consoleIo, el, () => { if (this.state.aiVisible) this.setState({ aiVisible: false }); })",
  },
  { find: "this.dgIo.observe(el)", repl: "this.watchShown(this.dgIo, el)" },
  /* The notes' avoid list measured every heading, paragraph and link on the
   * page when the notes started (load + 10 s): a 53-61 ms task at 4x CPU, the
   * only long task after five seconds, because it laid out every skipped
   * section. It now skips what is not rendered and is rebuilt when a block
   * comes in (home.js sets ptStale). */
  {
    find: "if (!canvas._pool || canvas._ptDirty || (tm - (canvas._ptT || 0)) > 30) {",
    repl: "if (!canvas._pool || canvas._ptDirty || this.ptStale || (tm - (canvas._ptT || 0)) > 30) {\n      this.ptStale = false;",
  },
  { find: "const sy0 = window.scrollY || 0, avoid = [];", repl: "const sy0 = this.view.sy, avoid = [];" },
  { find: "const W = window.innerWidth, VH = window.innerHeight, sy = window.scrollY || 0,", repl: "const W = this.view.w, VH = this.view.h, sy = this.view.sy," },
  {
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
   *    then every 60 s). A fast machine that stuttered while the page loaded
   *    is back at 60 after one probe; a slow one tries less and less often.
   *    Throttled frames are scheduled with a timer, not skipped inside
   *    requestAnimationFrame, so the browser is not woken for frames nobody
   *    draws. data-v5-fps says which mode is on (absent: never switched).
   * 3. No IntersectionObserver on the global canvas: it is position:fixed and
   *    fills the viewport, so it is always "intersecting", and a hidden tab
   *    already stops requestAnimationFrame. */
  {
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
    find: "const resize = () => { const r = canvas.getBoundingClientRect(); const k = 3 / 3.5; const W = Math.max(2, Math.round(r.width * k)), H = Math.max(2, Math.round(r.height * k));",
    repl: "const resize = () => { const k = 3 / 3.5; const W = Math.max(2, Math.round(cssW * k)), H = Math.max(2, Math.round(cssH * k));",
  },
  { find: "gl.uniform1f(uScroll, window.scrollY || 0);", repl: "gl.uniform1f(uScroll, view.sy);" },
  { find: "gl.uniform1f(uVh, canvas.clientHeight || 1);", repl: "gl.uniform1f(uVh, cssH || 1);" },
  { find: "kk = canvas.width / Math.max(1, canvas.clientWidth);", repl: "kk = canvas.width / Math.max(1, cssW);" },
  { find: "(canvas.clientHeight - smy) * kk", repl: "(cssH - smy) * kk" },
  {
    find: "const loop = () => { raf = 0; if (!canvas.isConnected) { if (cleanup) cleanup(); if (this.streams) this.streams.delete(canvas); return; } if (!visible) return; draw(); if (!reduced) raf = requestAnimationFrame(loop); };",
    repl: "const loop = (t) => { raf = 0; if (!canvas.isConnected) { if (cleanup) cleanup(); if (this.streams) this.streams.delete(canvas); return; } if (!visible) return; if (t) pace(t); draw(); if (!reduced) schedule(); };",
  },
  { find: "resize(); loop();", repl: "/* the loop starts on the observer's first report, after layout */" },
  {
    find: "const ro = new ResizeObserver(() => { resize(); draw(); }); ro.observe(canvas);",
    repl: "const ro = new ResizeObserver((en) => { const b = en[0].contentRect; cssW = b.width; cssH = b.height; if (!started) { started = true; view.sy = window.scrollY || 0; view.w = window.innerWidth; view.h = window.innerHeight; resize(); loop(); } else { resize(); draw(); } }); ro.observe(canvas);",
  },
  { find: "if (visible && !raf) loop(); }); io.observe(canvas);", repl: "if (visible && !raf && !timer) loop(); }); if (!isGlobal) io.observe(canvas);" },
  { find: "cleanup = () => { cancelAnimationFrame(raf); raf = 0; ro.disconnect();", repl: "cleanup = () => { cancelAnimationFrame(raf); raf = 0; clearTimeout(timer); timer = 0; ro.disconnect();" },
];
let genCode = copied;
for (const p of V5_PATCHES) genCode = once(genCode, p.find, p.repl);
/* The page instance in home.js answers these; the defaults keep the class usable on its own. */
genCode += "\n\n  isSkipped() { return false; }\n\n  watchShown(io, el) { io.observe(el); }\n\n  unwatch(io, el) { io.unobserve(el); }";
const statics = [...new Set([...genCode.matchAll(/Component\.([A-Z_]+)/g)].map((m) => m[1]))];
const staticSrc = statics.map((name) => {
  const i = logicSrc.indexOf(`static ${name} =`);
  if (i < 0) throw new Error("v5build: static not found: " + name);
  const rest = logicSrc.slice(i);
  const end = rest.search(/;\n\s*(?:static |[A-Za-z_]\w*\s*(?:\(|=))/);
  return rest.slice(0, end + 1).trim();
});
const selfRefs = [...new Set([...genCode.matchAll(/this\.([A-Za-z_]\w*)/g)].map((m) => m[1]))].sort();

/* --------------------------------------------------------- write */
fs.mkdirSync(OUT, { recursive: true });
const gen =
  `/* GENERATED by tools/v5build.mjs from the page logic in index.html - do not edit. */\n` +
  `class V5Logic {\n  ${staticSrc.join("\n  ")}\n\n  ${genCode}\n}\nwindow.V5Logic = V5Logic;\n`;
const genFile = path.join(OUT, "logic.gen.js");
fs.writeFileSync(genFile, gen.replace(/\bComponent\./g, "V5Logic."), "utf8");
/* A generated file that does not parse fails the whole page silently in the browser. */
const check = spawnSync(process.execPath, ["--check", genFile], { encoding: "utf8" });
if (check.status !== 0) throw new Error("v5build: logic.gen.js does not parse\n" + check.stderr.split("\n").slice(0, 4).join("\n"));

const demo = (() => {
  const i = logicSrc.indexOf("static DEMO =");
  const rest = logicSrc.slice(i + "static DEMO =".length);
  return Function(`return ${rest.slice(0, rest.search(/\];\s*\n/) + 1)}`)().map((p) => ({ q: p.q.de, a: p.a.de }));
})();
const pages = Function(`return ${logicSrc.match(/static PAGES = (\{[^}]*\})/)[1]}`)();
/* Service order for the mobile menu's first group - the ids, not the copy. */
const services = (() => {
  const i = logicSrc.indexOf("static SERVICES =");
  if (i < 0) throw new Error("v5build: SERVICES not found");
  const block = logicSrc.slice(i, logicSrc.indexOf("\n  static ", i + 10));
  return [...block.matchAll(/\bid:\s*'(\w+)'/g)].map((m) => m[1]);
})();
if (!services.length || services.some((id) => !pages[id])) throw new Error("v5build: service ids do not match PAGES: " + services);

/* pixel-engine.js is loaded by home.js when a mouse shows up (see armPixels).
 * The preview is noindex whatever the site says, and says it once: the head
 * already carries the site's robots tag, and two of them are two answers. */
const outHead = head
  .replace(/<script>window\.__resources=[^<]*<\/script>/, "")
  .replace(/<script src="\/support\.js" defer><\/script>/, "")
  .replace(/<script src="\/pixel-engine\.js" defer><\/script>/, "")
  .replace(/<style>x-dc\{display:none!important\}<\/style>/g, "")
  .replace(/\s*<meta name="robots"[^>]*>/g, "")
  .replace("</title>", '</title>\n  <meta name="robots" content="noindex">');
if (outHead.includes("pixel-engine.js")) throw new Error("v5build: the head still loads pixel-engine.js - home.js loads it on demand");
/* THE DEFERRED BLOCKS GET A NAME AND THEIR MEASURED HEIGHT.
 *
 * prerender.mjs marks the blocks below the first screen with data-cv="" (which
 * emit() above serialises as a bare data-cv) and one placeholder for all of
 * them (contain-intrinsic-size:auto 900px). The
 * placeholder is what the browser lays out until a block comes near, and one
 * number for fifteen blocks was off by thousands of pixels either way
 * (16.9.2026, cv-audit.mjs: +3.402 px on a phone, -3.095 px on a desktop
 * during the first scroll). Here every block gets a stable key (see v5cv.mjs)
 * and, from tools/v5-heights.json, the height it really has at each sample
 * width - measured on the built page by `node tools/v5heights.mjs`. Keys the
 * file does not know keep the 900px and are reported, so a renamed or added
 * block cannot silently inherit a wrong number. */
const cvKeys = [];
html = html.replace(/<(section|div) data-cv(="[^"]*")?([^>]*)>/g, (tag, name, value, attrs) => {
  /* A value that arrives from the export would be overwritten here without anyone noticing. */
  if (value && value !== '=""') throw new Error("v5build: data-cv already carries a value in the export: " + tag.slice(0, 80));
  const id = (attrs.match(/ id="([^"]*)"/) || [])[1];
  const label = (attrs.match(/ data-screen-label="([^"]*)"/) || [])[1];
  const key = cvKey({ id, label }, cvKeys.length + 1);
  if (cvKeys.includes(key)) throw new Error("v5build: duplicate data-cv key " + key);
  cvKeys.push(key);
  return `<${name} data-cv="${key}"${attrs}>`;
});
const CV_STYLE = "<style>[data-cv]{content-visibility:auto;contain-intrinsic-size:auto 900px}</style>";
if (outHead.split(CV_STYLE).length !== 2) throw new Error("v5build: the content-visibility style from prerender.mjs is not in the head exactly once");
let cvHeightsCss = "";
let cvHeightsNote = "no tools/v5-heights.json - all blocks start at 900px; run: node tools/v5heights.mjs";
if (fs.existsSync(HEIGHTS_FILE)) {
  const measured = JSON.parse(fs.readFileSync(HEIGHTS_FILE, "utf8"));
  const widths = [...measured.widths].sort((a, b) => a - b);
  const rulesAt = (w) =>
    cvKeys
      .filter((k) => measured.blocks[k] && measured.blocks[k][String(w)])
      .map((k) => `[data-cv="${k}"]{contain-intrinsic-size:auto ${measured.blocks[k][String(w)]}px}`)
      .join("");
  cvHeightsCss = widths.map((w, i) => (i === 0 ? rulesAt(w) : `@media (min-width:${w}px){${rulesAt(w)}}`)).join("\n");
  const unknown = cvKeys.filter((k) => !measured.blocks[k]);
  const stale = Object.keys(measured.blocks).filter((k) => !cvKeys.includes(k));
  cvHeightsNote = `heights from v5-heights.json (${measured.generated.slice(0, 10)}) for ${cvKeys.length - unknown.length}/${cvKeys.length} blocks at ${widths.join("/")}px`;
  /* Not just log lines: a block that falls back to 900px is the bug this exists
   * to fix, so it lands in the build's warnings and fails the exit code. */
  if (unknown.length) { merged.warns.push(`deferred blocks WITHOUT measured height, 900px placeholder: ${unknown.join(", ")} - run: node tools/v5heights.mjs`); process.exitCode = 1; }
  if (stale.length) merged.warns.push(`v5-heights.json names blocks that are not on the page: ${stale.join(", ")} - run: node tools/v5heights.mjs`);
  const gaps = cvKeys.flatMap((k) => (measured.blocks[k] ? widths.filter((w) => !measured.blocks[k][String(w)]).map((w) => `${k}@${w}`) : []));
  if (gaps.length) merged.warns.push(`deferred blocks without a sample at some width (the next smaller width applies): ${gaps.join(", ")}`);
}
const headOut = outHead.replace(CV_STYLE, CV_STYLE + (cvHeightsCss ? `\n<style id="v5-cv-heights">${cvHeightsCss}</style>` : ""));

const json = (o) => JSON.stringify(o).replace(/</g, "\\u003c");
const page = `<!DOCTYPE html>
<html lang="de">
<head>${headOut}
<style id="v5-css">${merged.css}\n${heroCss}\n${stateCss}\n${panelCss}</style>
<script src="/v5/logic.gen.js" defer></script>
<script src="/v5/home.js" defer></script>
</head>
<body>
<div id="dc-root">${html}</div>
<script type="application/ld+json">${json({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: merged.faq })}</script>
<script type="application/json" id="v5-data">${json({ demo, pages, services })}</script>
</body>
</html>
`;
fs.writeFileSync(path.join(OUT, "index.html"), page, "utf8");

console.log(`renders: ${merged.bytes.length}, ${Math.min(...merged.bytes)}-${Math.max(...merged.bytes)} B`);
console.log(`unique styles ${merged.styles}, CSS rules ${merged.rules}, style diffs between states ${merged.stateStyleDiffs}`);
console.log(`faq entries ${merged.faq.length}, statics copied: ${statics.join(", ") || "-"}`);
console.log(`v5/index.html ${page.length} B (css ${merged.css.length} B), logic.gen.js ${gen.length} B`);
console.log(`deferred blocks: ${cvKeys.join(" ")}\n  ${cvHeightsNote}`);
console.log(`this.* used by copied methods: ${selfRefs.join(" ")}`);
if (merged.warns.length) console.log("warnings:\n  " + merged.warns.join("\n  "));
