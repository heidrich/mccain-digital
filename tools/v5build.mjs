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
  return s.replace(find, repl);
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

/* --------------------------------------------------------- hero rotation in CSS */
/* Only the first variant is text. The other three are generated content
 * (attr() in ::before), so the h1 reads as one sentence to a crawler and a
 * screen reader - the reason the export kept only one variant in the DOM. */
const heroWords = (() => {
  const m = logicSrc.match(/heroWords:\s*\{\s*de:\s*(\[[^\]]*\])/);
  if (!m) throw new Error("v5build: heroWords not found");
  return Function(`return ${m[1]}`)();
})();
if (heroWords.length !== 4) throw new Error("v5build: expected 4 hero words");
const h1Open = merged.html.search(/<h1 [^>]*data-hero-h1/);
if (h1Open < 0) throw new Error("v5build: hero h1 not found");
const h1Inner = merged.html.indexOf(">", h1Open) + 1;
const h1Close = merged.html.indexOf("</h1>", h1Inner);
const escT = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escA = (s) => escT(s).replace(/"/g, "&quot;");
const heroHtml =
  `<span class="v5-hero">` +
  heroWords
    .map((v, i) =>
      i === 0
        ? `<span class="v5-hv v5-hv0"><span class="v5-w">${escT(v.w)}</span><span class="v5-r">${escT(v.r)}</span></span>`
        : `<span class="v5-hv v5-hv${i}" aria-hidden="true"><span class="v5-w" data-t="${escA(v.w)}"></span><span class="v5-r" data-t="${escA(v.r)}"></span></span>`
    )
    .join("") +
  `</span>`;
const html = merged.html.slice(0, h1Inner) + heroHtml + merged.html.slice(h1Close);

/* Cycle: the first swap at 13.5 s (7 s wait + one 6.5 s interval, as the
 * logic did), then every 6.5 s: v1, v2, v3, v0. */
const CYCLE = 26, DELAY = 13.5, pct = (s) => +((s / CYCLE) * 100).toFixed(3);
/* min-height: the render carries the logic's fallback 2.2em, which the page
 * then shrank to the measured tallest variant (71 px on a phone) after first
 * paint - itself a small layout shift. The grid holds all four variants in one
 * cell and is exactly that tall on its own. (1,1,1) outranks the class. */
let heroCss =
  `#dc-root h1[data-hero-h1]{min-height:0}.v5-hero{display:grid}.v5-hv{grid-area:1/1}.v5-hv [data-t]::before{content:attr(data-t)}` +
  `.v5-w{display:inline-block;color:#635BFF;background-image:linear-gradient(90deg,#635BFF,#9B7BFF);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;padding-right:.04em}` +
  `.v5-hv1,.v5-hv2,.v5-hv3{visibility:hidden}`;
for (let i = 0; i < 4; i++) {
  const slot = (i + 3) % 4; // v1 -> slot 0 ... v0 -> slot 3
  const a = pct(slot * 6.5), b = pct((slot + 1) * 6.5);
  const vis = slot === 0 ? `0%,${(b - 0.001).toFixed(3)}%{visibility:visible}${b}%,100%{visibility:hidden}`
    : `0%,${(a - 0.001).toFixed(3)}%{visibility:hidden}${a}%,${(b - 0.001).toFixed(3)}%{visibility:visible}${b}%,100%{visibility:hidden}`;
  heroCss += `@keyframes v5s${i}{${vis}}`;
  heroCss += `@keyframes v5w${i}{0%,${a}%{opacity:0;transform:translateY(55%) rotate(2deg);animation-timing-function:cubic-bezier(.2,.8,.2,1)}${pct(slot * 6.5 + 0.7)}%,100%{opacity:1;transform:none}}`;
  heroCss += `@keyframes v5r${i}{0%,${a}%{opacity:0;animation-timing-function:ease}${pct(slot * 6.5 + 1)}%,100%{opacity:1}}`;
  const first = i === 0;
  heroCss += `.v5-hv${i}{animation:v5s${i} ${CYCLE}s linear ${DELAY}s infinite}`;
  heroCss += `.v5-hv${i} .v5-w{animation:${first ? "wordIn .7s cubic-bezier(.2,.8,.2,1) both," : ""}v5w${i} ${CYCLE}s linear ${DELAY}s infinite}`;
  heroCss += `.v5-hv${i} .v5-r{animation:${first ? "restIn 1s ease both," : ""}v5r${i} ${CYCLE}s linear ${DELAY}s infinite}`;
}
heroCss += `@media (prefers-reduced-motion:reduce){.v5-hero,.v5-hero *{animation:none!important}}`;

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
const genCode = [...bodies.values()].join("\n\n  ");
if (/\bReact\./.test(genCode)) throw new Error("v5build: a copied method still uses React");
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

const outHead = head
  .replace(/<script>window\.__resources=[^<]*<\/script>/, "")
  .replace(/<script src="\/support\.js" defer><\/script>/, "")
  .replace(/<style>x-dc\{display:none!important\}<\/style>/g, "")
  .replace("</title>", '</title>\n  <meta name="robots" content="noindex">');
const json = (o) => JSON.stringify(o).replace(/</g, "\\u003c");
const page = `<!DOCTYPE html>
<html lang="de">
<head>${outHead}
<style id="v5-css">${merged.css}\n${heroCss}\n${stateCss}</style>
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
console.log(`this.* used by copied methods: ${selfRefs.join(" ")}`);
if (merged.warns.length) console.log("warnings:\n  " + merged.warns.join("\n  "));
