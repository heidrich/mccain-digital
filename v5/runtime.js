/* The page's behaviour without React, for every v5 page.
 *
 * WHAT
 * The export renders each page from a small template language ({{ path }},
 * <sc-for>, <sc-if>, onClick="{{ fn }}", ref="{{ fn }}") against the object
 * renderVals() returns from the page's state. React did that for the whole
 * page on every setState: 15 full re-renders in 30 s, 64-84 ms each at 4x CPU
 * (tools/reactprof.mjs), because the component is one class with ~40 state
 * fields and no subtrees. tools/v5build.mjs renders the page once per width at
 * build time and ships the merged result as plain HTML and CSS - so this file
 * only has to keep that HTML in step with the state afterwards.
 *
 * HOW
 * The same template ships inert (<template id="dc-template">, the export's own
 * annotated copy). At start this file walks template and live DOM in lockstep -
 * every element carries its template id in data-dc-tpl - and remembers, for
 * each {{ }} expression, which node it belongs to and what it evaluates to now.
 * Nothing is written at that point. After each setState the expressions are
 * evaluated again against renderVals(), and only a value that differs from the
 * remembered one is written: one text node, one attribute, one style
 * property, one list entry, one if-block. Nodes that do not exist yet (the
 * search overlay, an opened menu, a calculator option) are created from the
 * template at that moment; nodes whose block turns false are removed. Event
 * handlers hang on their elements and resolve the function from the most
 * recent evaluation, so they always see the closures of the latest state.
 *
 * The React that the page logic still mentions (React.createElement in
 * icon(), mark(), renderVals()) is a shim: it builds light nodes that this
 * file turns into DOM where the template interpolates them.
 *
 * WHAT ELSE LIVES HERE (moved from the start page's home.js)
 * - The content-visibility gate: sections below the first screen (data-cv)
 *   are skipped by the browser until they come near; work that would read
 *   their layout waits for the browser's own signal (see "region").
 * - pixel-engine.js on demand, the stream notes from second ten on a wide
 *   screen with a mouse, and the workshop switch (v5/dev/) ten seconds after
 *   the visitor's first real action.
 * See docs/plans/2026-09-17-v5-alle-seiten-design.md. */
(function () {
  "use strict";
  const doc = document, html = doc.documentElement;
  const dataEl = doc.getElementById("v5-data"), tplEl = doc.getElementById("dc-template"), dcRoot = doc.getElementById("dc-root");
  if (!dataEl || !tplEl || !dcRoot || typeof window.__v5Logic !== "function") return;
  /* React's render wrapped the template in its host div (class sc-host); the
   * template's own root sits inside it. */
  const rootHost = dcRoot.querySelector(":scope > .sc-host") || dcRoot;
  const DATA = JSON.parse(dataEl.textContent);
  const report = (e) => { if (window.console && console.error) console.error("[v5]", e); };

  /* ------------------------------------------------------------- React shim */
  const ELEMENT = Symbol.for("v5.element"), Fragment = Symbol.for("v5.fragment");
  function createElement(type, config) {
    const props = {};
    let key = null, ref = null;
    if (config) for (const k in config) { if (k === "key") key = config[k]; else if (k === "ref") ref = config[k]; else props[k] = config[k]; }
    const n = arguments.length - 2;
    if (n === 1) props.children = arguments[2];
    else if (n > 1) props.children = Array.prototype.slice.call(arguments, 2);
    return { $$typeof: ELEMENT, type, key, ref, props };
  }
  const isValidElement = (x) => !!x && typeof x === "object" && x.$$typeof === ELEMENT;
  const React = { createElement, Fragment, isValidElement, version: "v5-shim" };

  /* ------------------------------------------------ expressions (src/expr.ts) */
  const IDENT_RE = /^[A-Za-z_$][A-Za-z0-9_$]*/, NUMBER_RE = /^-?\d+(\.\d+)?$/;
  function resolve(vals, src) {
    const expr = String(src).trim();
    if (!expr) return undefined;
    if (expr[0] === "(" && expr[expr.length - 1] === ")" && parensWrapWhole(expr)) return resolve(vals, expr.slice(1, -1));
    const eq = findTopLevelEquality(expr);
    if (eq) {
      const lv = resolve(vals, expr.slice(0, eq.index)), rv = resolve(vals, expr.slice(eq.index + eq.op.length));
      /* eslint-disable eqeqeq -- the template language has both operators and the page's own logic decides which */
      switch (eq.op) { case "===": return lv === rv; case "!==": return lv !== rv; case "==": return lv == rv; default: return lv != rv; }
      /* eslint-enable eqeqeq */
    }
    if (expr[0] === "!") return !resolve(vals, expr.slice(1));
    if (expr === "true") return true;
    if (expr === "false") return false;
    if (expr === "null") return null;
    if (expr === "undefined") return undefined;
    if (NUMBER_RE.test(expr)) return Number(expr);
    if (expr.length >= 2 && (expr[0] === '"' || expr[0] === "'") && expr[expr.length - 1] === expr[0]) return expr.slice(1, -1);
    return resolvePath(vals, expr);
  }
  function parensWrapWhole(expr) {
    let depth = 0;
    for (let i = 0; i < expr.length - 1; i++) { if (expr[i] === "(") depth++; else if (expr[i] === ")") { depth--; if (depth === 0) return false; } }
    return true;
  }
  function findTopLevelEquality(expr) {
    let depth = 0;
    for (let i = 0; i < expr.length; i++) {
      const c = expr[i];
      if (c === "[" || c === "(") depth++;
      else if (c === "]" || c === ")") depth--;
      else if (depth === 0 && (c === "=" || c === "!") && expr[i + 1] === "=") {
        if (i > 0 && (expr[i - 1] === "=" || expr[i - 1] === "!")) continue;
        if (!expr.slice(0, i).trim()) continue;
        return { index: i, op: expr[i + 2] === "=" ? c + "==" : c + "=" };
      }
    }
    return null;
  }
  function resolvePath(vals, expr) {
    const head = expr.match(IDENT_RE);
    if (!head) return undefined;
    let cur = vals == null ? undefined : vals[head[0]], i = head[0].length;
    while (i < expr.length) {
      if (expr[i] === ".") {
        const m = expr.slice(i + 1).match(IDENT_RE) || expr.slice(i + 1).match(/^\d+/);
        if (!m) return undefined;
        cur = cur == null ? undefined : cur[m[0]];
        i += 1 + m[0].length;
      } else if (expr[i] === "[") {
        let depth = 1, j = i + 1;
        while (j < expr.length && depth > 0) { if (expr[j] === "[") depth++; else if (expr[j] === "]") { depth--; if (depth === 0) break; } j++; }
        if (depth !== 0) return undefined;
        cur = cur == null ? undefined : cur[resolve(vals, expr.slice(i + 1, j))];
        i = j + 1;
      } else return undefined;
    }
    return cur;
  }
  /* A getter for an attribute value, or null when it holds no {{ }}. */
  function compileAttr(raw) {
    const whole = raw.match(/^\s*\{\{([\s\S]+?)\}\}\s*$/);
    if (whole) { const path = whole[1]; return (vals) => resolve(vals, path); }
    if (raw.indexOf("{{") < 0) return null;
    const parts = raw.split(/\{\{([\s\S]+?)\}\}/g);
    return (vals) => parts.map((s, i) => (i & 1 ? (resolve(vals, s) ?? "") : s)).join("");
  }

  /* ------------------------------------------------------------ the template */
  const CAMEL = "sc-camel-", RAW_UNWRAP = { "sc-raw-select": "select", "sc-raw-table": "table", "sc-raw-tbody": "tbody", "sc-raw-thead": "thead", "sc-raw-tfoot": "tfoot", "sc-raw-tr": "tr", "sc-raw-td": "td", "sc-raw-th": "th", "sc-raw-caption": "caption" };
  const camel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  const kebab = (s) => s.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
  const byTid = new Map();
  /* For the workshop and the probes: what the binder found and did not find. */
  const stats = { adopted: 0, missing: [], wired: 0, created: 0 };
  const recOf = new WeakMap(); /* element -> its record, for the workshop and the probes */
  /* React's event names to DOM event names; a "Capture" suffix means the
   * capture phase. The annotated template arrives with the names lower-cased
   * by the parser (onclick, onfocuscapture), the shim's vnodes with React's
   * spelling (onClick, onFocusCapture); both end up here. */
  function eventOf(key) {
    let name = key.slice(2).toLowerCase(), capture = false;
    if (/capture$/.test(name)) { name = name.slice(0, -7); capture = true; }
    if (name === "doubleclick") name = "dblclick";
    return { type: name, capture };
  }
  /* Declarations of a style attribute, split at top-level semicolons. */
  function compileStyle(raw) {
    const whole = compileAttr(raw);
    if (whole && /^\s*\{\{[\s\S]+\}\}\s*$/.test(raw)) return { whole };
    const decls = [];
    let depth = 0, quote = null, start = 0;
    const push = (chunk) => {
      const c = chunk.indexOf(":");
      if (c < 0) return;
      const prop = chunk.slice(0, c).trim(), value = chunk.slice(c + 1).trim();
      if (prop) decls.push({ prop, value, get: compileAttr(value) });
    };
    for (let i = 0; i < raw.length; i++) {
      const ch = raw[i];
      if (quote) { if (ch === quote) quote = null; continue; }
      if (ch === '"' || ch === "'") quote = ch;
      else if (ch === "(") depth++;
      else if (ch === ")") depth--;
      else if (ch === ";" && depth === 0) { push(raw.slice(start, i)); start = i + 1; }
    }
    push(raw.slice(start));
    return { decls, dynamic: decls.some((d) => d.get) };
  }
  function firstAnchor(kids) {
    for (const k of kids) if (k.k === "el") return k;
    return null;
  }
  function compileKids(node, svg) {
    const out = [];
    for (const c of node.childNodes) { const t = compileNode(c, svg); if (t) out.push(t); }
    return out;
  }
  function compileNode(node, svg) {
    if (node.nodeType === 3) {
      const txt = node.nodeValue || "";
      if (txt.indexOf("{{") < 0) return !txt.trim() && txt.indexOf(" ") < 0 ? null : { k: "s", text: txt };
      const raw = txt.split(/\{\{([\s\S]+?)\}\}/g), parts = [];
      for (let i = 0; i < raw.length; i++) {
        if (i & 1) { const src = raw[i]; parts.push({ expr: src.trim(), get: (vals) => resolve(vals, src) }); }
        else if (raw[i]) parts.push({ text: raw[i] });
      }
      return { k: "t", parts };
    }
    if (node.nodeType !== 1) return null;
    const tag = node.localName;
    if (tag === "sc-for") {
      const kids = compileKids(node, svg);
      return { k: "for", expr: node.getAttribute("list") || "", list: compileAttr(node.getAttribute("list") || "") || (() => []), as: node.getAttribute("as") || "item", kids, anchor: firstAnchor(kids) };
    }
    if (tag === "sc-if") {
      const kids = compileKids(node, svg);
      return { k: "if", expr: node.getAttribute("value") || "", cond: compileAttr(node.getAttribute("value") || "") || (() => false), kids, anchor: firstAnchor(kids) };
    }
    if (tag === "sc-helmet" || tag === "helmet" || tag === "template" || tag === "sc-else") return null;
    const real = RAW_UNWRAP[tag] || tag, isSvg = svg || real === "svg";
    const t = { k: "el", tag: real, tid: node.getAttribute("data-dc-tpl"), svg: isSvg, attrs: [], dyn: [], style: null, events: [], ref: null, kids: [], stat: real === "script" || real === "style" };
    for (const { name, value } of node.attributes) {
      if (name === "data-dc-tpl" || name === "sc-name" || name.indexOf("hint-") === 0 || name.indexOf("style-") === 0) continue;
      let key = name;
      if (key.indexOf(CAMEL) === 0) key = camel(key.slice(CAMEL.length));
      if (key === "ref") { t.ref = { expr: value, get: compileAttr(value) }; continue; }
      if (/^on[a-z]/i.test(key) && value.indexOf("{{") >= 0) { const ev = eventOf(key); t.events.push({ type: ev.type, capture: ev.capture, expr: value, get: compileAttr(value) }); continue; }
      if (key === "style") { t.style = compileStyle(value); continue; }
      /* The parser lower-cased every plain attribute; the encoded ones come
       * back camel-cased, which SVG wants (viewBox) and HTML does not (maxlength). */
      const attr = isSvg ? key : key === "className" ? "class" : key === "htmlFor" ? "for" : key.toLowerCase();
      const get = compileAttr(value);
      if (get) t.dyn.push({ name: attr, expr: value, get });
      else t.attrs.push([attr, value]);
    }
    if (t.tid != null) byTid.set(t.tid, t);
    if (!t.stat) t.kids = compileKids(node, isSvg);
    return t;
  }

  /* ------------------------------------------------------- vnodes to DOM */
  const SVG_NS = "http://www.w3.org/2000/svg";
  const SVG_TAGS = new Set("svg path rect circle ellipse line polyline polygon g use defs symbol linearGradient radialGradient stop mask clipPath pattern image text tspan textPath marker filter feGaussianBlur feOffset feBlend feColorMatrix feComposite feFlood feMerge feMergeNode feMorphology feTurbulence feDisplacementMap foreignObject switch desc metadata animate animateTransform set".split(" "));
  const SVG_CAMEL = new Set("viewBox preserveAspectRatio gradientUnits gradientTransform patternUnits patternContentUnits patternTransform spreadMethod markerWidth markerHeight markerUnits refX refY clipPathUnits maskUnits maskContentUnits textLength lengthAdjust stdDeviation baseFrequency numOctaves tableValues primitiveUnits filterUnits attributeName attributeType repeatCount keyTimes keySplines calcMode startOffset pointsAtX pointsAtY pointsAtZ specularExponent specularConstant surfaceScale xChannelSelector yChannelSelector kernelMatrix kernelUnitLength edgeMode targetX targetY diffuseConstant limitingConeAngle zoomAndPan viewTarget requiredFeatures requiredExtensions systemLanguage glyphRef stitchTiles".split(" "));
  const UNITLESS = new Set("animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth".split(" "));
  function applyStyleObj(el, obj) {
    if (typeof obj === "string") { el.style.cssText = obj; return; }
    if (!obj) return;
    for (const k in obj) {
      const v = obj[k];
      if (v == null || v === "") continue;
      el.style.setProperty(k.indexOf("--") === 0 ? k : kebab(k), typeof v === "number" && v !== 0 && !UNITLESS.has(k) ? v + "px" : String(v));
    }
  }
  /* One attribute, the way React would render it: aria-/data- values as
   * strings, booleans as presence, nothing for null and undefined, value and
   * checked as properties so a visitor's typing survives. */
  function setAttr(el, name, v) {
    if (name === "value") { const s = v == null ? "" : String(v); if (el.value !== s) el.value = s; return; }
    if (name === "checked") { el.checked = !!v; return; }
    if (v == null) { el.removeAttribute(name); return; }
    if (typeof v === "boolean") {
      if (/^(aria|data)-/.test(name)) el.setAttribute(name, String(v));
      else if (v) el.setAttribute(name, "");
      else el.removeAttribute(name);
      return;
    }
    el.setAttribute(name, String(v));
  }
  const pendingRefs = [];
  function renderV(v, out, svg) {
    if (v == null || typeof v === "boolean") return;
    if (typeof v === "string" || typeof v === "number") { out.push(doc.createTextNode(String(v))); return; }
    if (Array.isArray(v)) { for (const x of v) renderV(x, out, svg); return; }
    if (!isValidElement(v)) { out.push(doc.createTextNode(String(v))); return; }
    if (v.type === Fragment) { renderV(v.props.children, out, svg); return; }
    if (typeof v.type === "function") { renderV(v.type(v.props), out, svg); return; }
    const isSvg = svg || (SVG_TAGS.has(v.type) && v.type !== "switch");
    const el = isSvg ? doc.createElementNS(SVG_NS, v.type) : doc.createElement(v.type);
    for (const k in v.props) {
      const val = v.props[k];
      if (k === "children") continue;
      if (k === "dangerouslySetInnerHTML") { el.innerHTML = (val && val.__html) || ""; continue; }
      if (k === "style") { applyStyleObj(el, val); continue; }
      if (/^on[A-Z]/.test(k)) { if (typeof val === "function") { const ev = eventOf(k); el.addEventListener(ev.type, val, ev.capture); } continue; }
      let name = k;
      if (k === "className") name = "class";
      else if (k === "htmlFor") name = "for";
      else if (!/^(aria|data)-/.test(k)) name = isSvg ? (SVG_CAMEL.has(k) ? k : kebab(k)) : k.toLowerCase();
      setAttr(el, name, val);
    }
    const kids = [];
    renderV(v.props.children, kids, isSvg);
    for (const c of kids) el.appendChild(c);
    if (v.ref) pendingRefs.push([v.ref, el]);
    out.push(el);
  }
  function flushRefs() {
    while (pendingRefs.length) {
      const [ref, el] = pendingRefs.shift();
      try { if (typeof ref === "function") ref(el); else if (ref && typeof ref === "object") ref.current = el; } catch (e) { report(e); }
    }
  }
  /* A structural key for an element-valued interpolation: two evaluations that
   * would render the same nodes must not replace them (the dock's mark is
   * built anew on every pass and equal every time). */
  function ser(v) {
    if (v == null || typeof v === "boolean") return "";
    if (typeof v !== "object") return String(v);
    if (Array.isArray(v)) return "[" + v.map(ser).join(",") + "]";
    if (!isValidElement(v)) return "{}";
    let s = "<" + String(typeof v.type === "function" ? v.type.name : v.type);
    const keys = Object.keys(v.props).sort();
    for (const k of keys) {
      if (k === "children") continue;
      const p = v.props[k];
      s += " " + k + "=" + (typeof p === "function" ? "fn" : typeof p === "object" ? JSON.stringify(p) : String(p));
    }
    return s + ">" + ser(v.props.children);
  }
  const isText = (v) => typeof v === "string" || typeof v === "number";
  const toText = (v) => (v == null || typeof v === "boolean" ? "" : String(v));
  /* React renders a span for every defined value, an empty string included; null, undefined and booleans render nothing. */
  const hasText = (v) => v != null && typeof v !== "boolean";
  const isRich = (v) => isValidElement(v) || Array.isArray(v) || (v !== null && typeof v === "object");

  /* ------------------------------------------------------------ the records */
  /* One record per template node, mirroring the template. Blocks (for, if)
   * know their host element and find their place among the neighbours through
   * firstNode(), so inserting needs no marker nodes. */
  function firstNode(rec) {
    switch (rec.kind) {
      case "s": return rec.node;
      case "t": for (const p of rec.parts) { if (p.span) return p.span; if (p.nodes && p.nodes.length) return p.nodes[0]; if (p.node) return p.node; } return null;
      case "el": return rec.el;
      case "for": for (const it of rec.items) { const n = firstOf(it.kids); if (n) return n; } return null;
      case "if": return rec.present ? firstOf(rec.kids) : null;
      default: return null;
    }
  }
  function firstOf(kids) {
    for (const k of kids) { const n = firstNode(k); if (n) return n; }
    return null;
  }
  /* The node a block's new content goes in front of: the first live node of any
   * later sibling, climbing out of blocks up to the enclosing element. */
  function refNodeAfter(rec) {
    for (let r = rec; r && r.up; r = r.up) {
      const sibs = r.up.kind === "for" ? r.up.items : r.up.kids;
      for (let j = r.idx + 1; j < sibs.length; j++) {
        const n = r.up.kind === "for" ? firstOf(sibs[j].kids) : firstNode(sibs[j]);
        if (n) return n;
      }
      if (r.up.kind === "el" || r.up.kind === "root") return null;
    }
    return null;
  }
  function hostOf(rec) {
    for (let r = rec.up; r; r = r.up) if (r.kind === "el") return r.el;
    return rootHost;
  }
  function nodesOf(rec, out) {
    switch (rec.kind) {
      case "s": if (rec.node) out.push(rec.node); break;
      case "t": for (const p of rec.parts) { if (p.span) out.push(p.span); if (p.nodes) out.push(...p.nodes); if (p.node) out.push(p.node); } break;
      case "el": if (rec.el) out.push(rec.el); break;
      case "for": for (const it of rec.items) for (const k of it.kids) nodesOf(k, out); break;
      case "if": if (rec.present) for (const k of rec.kids) nodesOf(k, out); break;
    }
    return out;
  }
  function releaseRefs(rec) {
    if (rec.kind === "el") {
      if (rec.el && rec.refFn) { try { rec.refFn(null); } catch (e) { report(e); } }
      if (rec.kids) for (const k of rec.kids) releaseRefs(k);
    } else if (rec.kind === "for") { for (const it of rec.items) for (const k of it.kids) releaseRefs(k); }
    else if (rec.kind === "if" && rec.present) for (const k of rec.kids) releaseRefs(k);
  }
  function removeRec(rec) {
    releaseRefs(rec);
    for (const n of nodesOf(rec, [])) if (n.parentNode) n.parentNode.removeChild(n);
  }
  const sub = (scope, as, item, i) => { const s = Object.create(scope); s[as] = item; s.$index = i; return s; };

  /* -------------------------------------------- baseline: adopt the live DOM */
  const isAnchor = (n) => n.nodeType === 1 && n.hasAttribute("data-dc-tpl");
  const isInterp = (n) => n.nodeType === 1 && n.className === "sc-interp" && !n.hasAttribute("data-dc-tpl");
  function nextAnchor(cur) {
    let n = cur.n;
    while (n && !isAnchor(n)) n = n.nextSibling;
    return n;
  }
  function bindKids(tk, host, cur, scope, up, live) {
    const kids = [];
    for (const t of tk) {
      let rec;
      switch (t.k) {
        case "s": rec = { kind: "s", node: null }; if (cur.n && cur.n.nodeType === 3) { rec.node = cur.n; cur.n = cur.n.nextSibling; } break;
        case "t": rec = bindText(t, cur, scope, live); break;
        case "el": rec = bindEl(t, cur, scope, live); break;
        case "for": rec = bindFor(t, host, cur, scope, live); break;
        default: rec = bindIf(t, host, cur, scope, live);
      }
      rec.t = t; rec.up = up; rec.idx = kids.length;
      kids.push(rec);
    }
    return kids;
  }
  function bindText(t, cur, scope, live) {
    const rec = { kind: "t", parts: [] };
    for (let i = 0; i < t.parts.length; i++) {
      const tp = t.parts[i], p = { node: null, span: null, nodes: null, str: undefined, key: undefined };
      if (tp.text !== undefined) {
        if (cur.n && cur.n.nodeType === 3) { p.node = cur.n; cur.n = cur.n.nextSibling; }
      } else {
        const v = live ? tp.get(scope) : undefined;
        if (isRich(v)) {
          /* An element-valued interpolation rendered as many nodes as it liked;
           * they end where the next template neighbour begins. */
          const next = t.parts[i + 1];
          p.nodes = [];
          while (cur.n && !isAnchor(cur.n) && !isInterp(cur.n) && !(next && next.text !== undefined && cur.n.nodeType === 3)) { p.nodes.push(cur.n); cur.n = cur.n.nextSibling; }
          p.key = ser(v);
        } else {
          p.str = toText(v);
          if (cur.n && isInterp(cur.n)) { p.span = cur.n; cur.n = cur.n.nextSibling; }
        }
      }
      rec.parts.push(p);
    }
    return rec;
  }
  function bindEl(t, cur, scope, live) {
    const rec = { kind: "el", el: null, scope, kids: [], vals: {}, sv: {}, refFn: null, static: t.stat };
    const a = nextAnchor(cur);
    if (!a || a.getAttribute("data-dc-tpl") !== t.tid) { if (stats.missing.length < 40) stats.missing.push(t.tag + "#" + t.tid); return rec; } /* not in this render of the page */
    stats.adopted++;
    rec.el = a;
    rec.cv = a.hasAttribute("data-cv");
    recOf.set(a, rec);
    cur.n = a.nextSibling;
    if (t.stat || a.hasAttribute("data-v5-static")) { rec.static = true; return rec; }
    wire(rec, t, a);
    if (live) {
      for (const d of t.dyn) rec.vals[d.name] = d.get(scope);
      if (t.style) { if (t.style.whole) rec.sv[""] = t.style.whole(scope); else for (const d of t.style.decls) if (d.get) rec.sv[d.prop] = d.get(scope); }
      if (t.ref) setRef(rec, t, scope);
    }
    rec.kids = bindKids(t.kids, a, { n: a.firstChild }, scope, rec, live);
    return rec;
  }
  function bindFor(t, host, cur, scope, live) {
    const rec = { kind: "for", host, items: [], len: 0 };
    let list = live ? t.list(scope) : [];
    if (!Array.isArray(list)) list = [];
    rec.len = list.length;
    for (let i = 0; ; i++) {
      if (t.anchor) { const a = nextAnchor(cur); if (!a || a.getAttribute("data-dc-tpl") !== t.anchor.tid) break; }
      else if (i >= list.length) break;
      const on = live && i < list.length;
      const item = { kind: "item", up: rec, idx: i, scope: on ? sub(scope, t.as, list[i], i) : null, kids: [] };
      item.kids = bindKids(t.kids, host, cur, item.scope || scope, item, on);
      rec.items.push(item);
    }
    return rec;
  }
  function bindIf(t, host, cur, scope, live) {
    const rec = { kind: "if", host, on: live ? !!t.cond(scope) : false, present: false, kids: [] };
    if (t.anchor) { const a = nextAnchor(cur); rec.present = !!a && a.getAttribute("data-dc-tpl") === t.anchor.tid; }
    else rec.present = rec.on;
    if (rec.present) rec.kids = bindKids(t.kids, host, cur, scope, rec, live && rec.on);
    return rec;
  }
  function setRef(rec, t, scope) {
    const fn = t.ref.get ? t.ref.get(scope) : null;
    if (typeof fn === "function") { rec.refFn = fn; try { fn(rec.el); } catch (e) { report(e); } }
    else if (fn && typeof fn === "object") { fn.current = rec.el; }
  }
  /* Events hang on the element and look the handler up at the moment it fires,
   * in the scope of the last evaluation - the closures React would have
   * attached after its last render. */
  function wire(rec, t, el) {
    for (const ev of t.events) {
      if (!ev.get) continue;
      stats.wired++;
      el.addEventListener(ev.type, (e) => {
        const fn = ev.get(rec.scope);
        if (typeof fn === "function") { try { fn(e); } catch (err) { report(err); } }
      }, ev.capture);
    }
  }

  /* ----------------------------------------------- creation from the template */
  function createKids(tk, scope, host, before, up, svg) {
    const kids = [];
    for (const t of tk) {
      const rec = createNode(t, scope, host, before, up, svg);
      rec.t = t; rec.up = up; rec.idx = kids.length;
      kids.push(rec);
    }
    return kids;
  }
  function insert(host, node, before) { if (before && before.parentNode === host) host.insertBefore(node, before); else host.appendChild(node); }
  function createNode(t, scope, host, before, up, svg) {
    switch (t.k) {
      case "s": { const node = doc.createTextNode(t.text); insert(host, node, before); return { kind: "s", node }; }
      case "t": {
        const rec = { kind: "t", parts: [] };
        for (const tp of t.parts) {
          const p = { node: null, span: null, nodes: null, str: undefined, key: undefined };
          if (tp.text !== undefined) { p.node = doc.createTextNode(tp.text); insert(host, p.node, before); }
          else {
            const v = tp.get(scope);
            if (isRich(v)) { p.nodes = []; renderV(v, p.nodes, svg); for (const n of p.nodes) insert(host, n, before); p.key = ser(v); }
            else { p.str = toText(v); if (hasText(v)) { p.span = doc.createElement("span"); p.span.className = "sc-interp"; p.span.textContent = p.str; insert(host, p.span, before); } }
          }
          rec.parts.push(p);
        }
        return rec;
      }
      case "el": {
        const el = t.svg ? doc.createElementNS(SVG_NS, t.tag) : doc.createElement(t.tag);
        stats.created++;
        const rec = { kind: "el", el, scope, kids: [], vals: {}, sv: {}, refFn: null, static: t.stat, cv: t.attrs.some(([n]) => n === "data-cv") };
        recOf.set(el, rec);
        for (const [n, v] of t.attrs) el.setAttribute(n, v);
        if (t.tid != null) el.setAttribute("data-dc-tpl", t.tid);
        if (DATA.hover && DATA.hover.indexOf(t.tid) >= 0) el.classList.add("h" + t.tid);
        if (DATA.focus && DATA.focus.indexOf(t.tid) >= 0) el.classList.add("f" + t.tid);
        for (const d of t.dyn) { const v = d.get(scope); rec.vals[d.name] = v; setAttr(el, d.name, v); }
        if (t.style) {
          if (t.style.whole) { const v = t.style.whole(scope); rec.sv[""] = v; applyStyleObj(el, v); }
          else {
            const out = [];
            for (const d of t.style.decls) {
              const v = d.get ? d.get(scope) : d.value;
              if (d.get) rec.sv[d.prop] = v;
              if (v != null && v !== "" && v !== false) out.push(d.prop + ":" + v);
            }
            if (out.length) el.setAttribute("style", out.join(";"));
          }
        }
        wire(rec, t, el);
        if (!t.stat) rec.kids = createKids(t.kids, scope, el, null, rec, t.svg);
        insert(host, el, before);
        if (t.ref) setRef(rec, t, scope);
        return rec;
      }
      case "for": {
        const rec = { kind: "for", host, items: [], len: 0 };
        let list = t.list(scope);
        if (!Array.isArray(list)) list = [];
        rec.len = list.length;
        for (let i = 0; i < list.length; i++) {
          const item = { kind: "item", up: rec, idx: i, scope: sub(scope, t.as, list[i], i), kids: [] };
          item.kids = createKids(t.kids, item.scope, host, before, item, svg);
          rec.items.push(item);
        }
        return rec;
      }
      default: {
        const rec = { kind: "if", host, on: !!t.cond(scope), present: false, kids: [] };
        if (rec.on) { rec.present = true; rec.kids = createKids(t.kids, scope, host, before, rec, svg); }
        return rec;
      }
    }
  }

  /* ------------------------------------------------------- the pass: patch */
  function updateKids(kids, scope, force) { for (const k of kids) updateRec(k, scope, force); }
  function updateRec(rec, scope, force) {
    const t = rec.t;
    switch (rec.kind) {
      case "t": {
        const host = hostOf(rec);
        for (let i = 0; i < t.parts.length; i++) {
          const tp = t.parts[i], p = rec.parts[i];
          if (tp.text !== undefined) continue;
          const v = tp.get(scope);
          if (isRich(v)) {
            const key = ser(v);
            if (!force && key === p.key) continue;
            const before = p.nodes && p.nodes.length ? p.nodes[0] : p.span || partRef(rec, i);
            const fresh = [];
            renderV(v, fresh, false);
            for (const n of fresh) insert(host, n, before);
            if (p.nodes) for (const n of p.nodes) if (n.parentNode) n.parentNode.removeChild(n);
            if (p.span) { p.span.remove(); p.span = null; }
            p.nodes = fresh; p.key = key; p.str = undefined;
            flushRefs();
          } else {
            const str = toText(v);
            if (!force && str === p.str && p.key === undefined) continue;
            if (p.nodes) { const before = p.nodes[0] || partRef(rec, i); for (const n of p.nodes) if (n.parentNode) n.parentNode.removeChild(n); p.nodes = null; p.key = undefined; if (hasText(v)) { p.span = doc.createElement("span"); p.span.className = "sc-interp"; insert(host, p.span, before); } }
            else if (!p.span && hasText(v)) { p.span = doc.createElement("span"); p.span.className = "sc-interp"; insert(host, p.span, partRef(rec, i)); }
            if (p.span) p.span.textContent = str;
            p.str = str;
          }
        }
        return;
      }
      case "el": {
        if (rec.static || !rec.el) return;
        rec.scope = scope;
        /* A skipped block (content-visibility) is not rendered; writing into it
         * would cost style work for nobody, and the pages' own timers (auto
         * cycles, typing demos) write all the time. The block catches up the
         * moment the browser renders it (region → catchUp): the remembered
         * values are then the ones last written, so only real changes go in. */
        if (rec.cv && isSkipped(rec.el)) { rec.held = true; return; }
        patchEl(rec, scope, force);
        updateKids(rec.kids, scope, force);
        return;
      }
      case "for": {
        let list = t.list(scope);
        if (!Array.isArray(list)) list = [];
        const n = list.length;
        if (n !== rec.len || force) {
          for (let i = rec.len; i < n; i++) {
            if (rec.items[i]) { /* rendered at build for a wider screen, hidden by CSS: it takes the entry now */
              if (!rec.items[i].scope) { rec.items[i].scope = sub(scope, t.as, list[i], i); updateKids(rec.items[i].kids, rec.items[i].scope, true); }
            } else {
              const item = { kind: "item", up: rec, idx: i, scope: sub(scope, t.as, list[i], i), kids: [] };
              rec.items.push(item);
              item.kids = createKids(t.kids, item.scope, rec.host, refNodeAfter(item), item, false);
              flushRefs();
            }
          }
          for (let i = rec.items.length - 1; i >= n; i--) { for (const k of rec.items[i].kids) removeRec(k); rec.items.pop(); }
          rec.len = n;
        }
        for (let i = 0; i < n && i < rec.items.length; i++) {
          const item = rec.items[i], fresh = !item.scope;
          item.scope = sub(scope, t.as, list[i], i);
          updateKids(item.kids, item.scope, force || fresh);
        }
        return;
      }
      case "if": {
        const on = !!t.cond(scope);
        if (on !== rec.on || force) {
          rec.on = on;
          if (on && !rec.present) { rec.present = true; rec.kids = createKids(t.kids, scope, rec.host, refNodeAfter(rec), rec, false); flushRefs(); return; }
          if (!on && rec.present) { for (const k of rec.kids) removeRec(k); rec.kids = []; rec.present = false; return; }
        }
        if (rec.present && on) updateKids(rec.kids, scope, force);
        return;
      }
      default:
    }
  }
  function patchEl(rec, scope, force) {
    const t = rec.t, el = rec.el;
    for (const d of t.dyn) { const v = d.get(scope); if (force || v !== rec.vals[d.name]) { rec.vals[d.name] = v; setAttr(el, d.name, v); } }
    if (!t.style) return;
    if (t.style.whole) { const v = t.style.whole(scope); if (force || ser(v) !== ser(rec.sv[""])) { rec.sv[""] = v; el.style.cssText = ""; applyStyleObj(el, v); } }
    else if (t.style.dynamic) {
      for (const d of t.style.decls) {
        if (!d.get) continue;
        const v = d.get(scope);
        if (!force && v === rec.sv[d.prop]) continue;
        rec.sv[d.prop] = v;
        if (v == null || v === "" || v === false) el.style.removeProperty(d.prop);
        else el.style.setProperty(d.prop, String(v));
      }
    }
  }
  function catchUp(block) {
    const r = recOf.get(block);
    if (!r || !r.held) return;
    r.held = false;
    patchEl(r, r.scope, false);
    updateKids(r.kids, r.scope, false);
    flushRefs();
  }
  /* Where a text part goes when it has no node yet: before the next part's
   * node, else before whatever follows the text in its parent. */
  function partRef(rec, i) {
    for (let j = i + 1; j < rec.parts.length; j++) {
      const p = rec.parts[j];
      if (p.span) return p.span;
      if (p.nodes && p.nodes.length) return p.nodes[0];
      if (p.node) return p.node;
    }
    return refNodeAfter(rec);
  }

  /* ----------------------------------- content-visibility: what is rendered */
  /* The sections below the first screen carry content-visibility (data-cv):
   * the browser skips them until they come near and says so with
   * contentvisibilityautostatechange. Work that reads layout inside a skipped
   * block would force the browser to lay it out anyway, so it waits for this
   * signal. An IntersectionObserver target inside a skipped block makes the
   * browser compute the block's style too (measured 16.9.2026: 14 logo masks
   * loading at 125 ms), so observers get their targets through watchShown()
   * while the block is rendered. */
  const cvLive = typeof CSS !== "undefined" && CSS.supports && CSS.supports("content-visibility", "auto") &&
    "oncontentvisibilityautostatechange" in html && typeof html.checkVisibility === "function";
  const shown = new WeakMap(), waiting = [], watchers = [];
  let logic = null;
  function isSkipped(el) {
    if (!cvLive) return false;
    for (let n = el.closest("[data-cv]"); n; n = n.parentElement && n.parentElement.closest("[data-cv]")) if (shown.get(n) !== true) return true;
    return false;
  }
  function whenShown(el, fn) { if (isSkipped(el)) waiting.push([el, fn]); else fn(); }
  function region(block, isShown) {
    shown.set(block, isShown);
    if (isShown) for (let i = waiting.length - 1; i >= 0; i--) { const w = waiting[i]; if (block.contains(w[0]) && !isSkipped(w[0])) { waiting.splice(i, 1); w[1](); } }
    for (const o of watchers) {
      if (!block.contains(o.el)) continue;
      const want = isShown && !isSkipped(o.el);
      if (want === o.on) continue;
      o.on = want;
      if (want) o.io.observe(o.el);
      else { o.io.unobserve(o.el); if (o.away) o.away(); }
    }
    if (isShown && mounted) catchUp(block);
    if (logic) onRegion(block, isShown);
  }
  if (cvLive) doc.addEventListener("contentvisibilityautostatechange", (e) => region(e.target, !e.skipped), true);
  /* A deferred block was rendered or skipped: the page's late work follows it. */
  function onRegion(block, isShown) {
    if (isShown) {
      logic.ptStale = true; /* the notes' avoid list holds rendered blocks only */
      if (block.querySelector("[data-process-steps]") && logic.updateProcess) logic.updateProcess();
      if (logic.dgStale && logic.dgRedo && logic.dgEl && block.contains(logic.dgEl)) logic.dgRedo();
    }
    const q = block.querySelector("[data-demo-q]");
    if (!q) return;
    if (!isShown) { clearTimeout(logic.demoT); logic.demoWait = true; }
    else if (logic.demoWait && !isSkipped(q) && logic.startDemo) logic.startDemo();
  }

  /* -------------------------------------------------------- the logic host */
  function DCLogic(props) { this.props = props || {}; this.state = {}; }
  DCLogic.prototype.setState = function (update, cb) {
    const prev = this.state, patch = typeof update === "function" ? update(prev) : update;
    this.state = Object.assign({}, prev, patch);
    if (cb) callbacks.push(cb);
    schedule();
  };
  DCLogic.prototype.forceUpdate = function () { schedule(); };
  DCLogic.prototype.componentDidMount = DCLogic.prototype.componentDidUpdate = DCLogic.prototype.componentWillUnmount = function () {};
  DCLogic.prototype.renderVals = function () { return {}; };
  DCLogic.prototype.isSkipped = function (el) { return isSkipped(el); };
  DCLogic.prototype.watchShown = function (io, el, away) {
    if (!cvLive || !el.closest("[data-cv]")) { io.observe(el); return; }
    const o = { io, el, on: !isSkipped(el), away };
    watchers.push(o);
    if (o.on) io.observe(el);
    else if (away) away();
  };
  DCLogic.prototype.unwatch = function (io, el) {
    io.unobserve(el);
    for (let i = watchers.length - 1; i >= 0; i--) if (watchers[i].io === io && watchers[i].el === el) watchers.splice(i, 1);
  };

  let rootKids = [], callbacks = [], pending = false, mounted = false, panel = null, prevProps = null;
  function computeVals() {
    const vals = Object.assign({}, logic.props);
    logic.props = vals === logic.props ? vals : logic.props;
    try { Object.assign(vals, logic.renderVals() || {}); } catch (e) { report(e); }
    return vals;
  }
  function schedule() { if (pending) return; pending = true; queueMicrotask(flush); }
  function flush() {
    pending = false;
    if (!mounted) return;
    pass(false);
    const q = callbacks;
    callbacks = [];
    for (const cb of q) { try { cb(); } catch (e) { report(e); } }
  }
  function pass(force) {
    const vals = computeVals();
    /* The closed mega menu panel is not rendered (content-visibility:hidden,
     * see the build); it must be before measurePanel() reads its height. */
    if (panel) panel.toggleAttribute("data-v5-open", logic.state.menu != null);
    updateKids(rootKids, vals, force);
    flushRefs();
    /* The props of the previous render, as React would pass them; the page's props never change after boot. */
    try { logic.componentDidUpdate(prevProps); } catch (e) { report(e); }
    prevProps = Object.assign({}, logic.props);
  }

  /* ---------------------------------------------- what only some pages have */
  function wrap(obj, name, around) {
    const orig = obj[name];
    if (typeof orig !== "function") return;
    obj[name] = function () { const self = this, args = arguments; return around.call(self, () => orig.apply(self, args), args); };
  }
  /* The rail reads the layout of a section far down the page on every scroll
   * frame; while that section is skipped there is nothing to show. The typing
   * demo writes two characters every 16 ms; out of sight that is only cost.
   * The export's startDemo polls every 800 ms for elements a React render might
   * still add - this markup is static, so no element now means none ever. */
  function installGates() {
    wrap(logic, "updateProcess", function (orig) { const w = rootHost.querySelector("[data-process-steps]"); if (w && isSkipped(w)) return undefined; return orig(); });
    wrap(logic, "startDemo", function (orig) {
      const q = rootHost.querySelector("[data-demo-q]");
      if (!q) return undefined;
      this.demoWait = isSkipped(q);
      if (this.demoWait) { clearTimeout(this.demoT); return undefined; }
      return orig();
    });
  }

  /* PIXEL HOVER EFFECTS LOAD WHEN SOMEBODY CAN USE THEM. pixel-engine.js is
   * 42 KB to parse for effects that exist only under a mouse. It loads on the
   * first real mouse movement or ten seconds after load on a hover device,
   * never on touch or with reduced motion; each button is wired once its block
   * is rendered, because sampling a face measures the element. */
  function armPixels() {
    if (logic.reduced() || !window.matchMedia || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const onMove = (e) => { if (e.pointerType !== "mouse" && e.pointerType !== "pen") return; window.removeEventListener("pointermove", onMove); loadPixels(); };
    window.addEventListener("pointermove", onMove, { passive: true });
    afterLoad(() => setTimeout(() => { if (window.requestIdleCallback) window.requestIdleCallback(loadPixels, { timeout: 2000 }); else loadPixels(); }, 10000));
  }
  let pxState = null;
  function loadPixels() {
    if (pxState) return;
    pxState = "loading";
    const s = doc.createElement("script");
    s.src = "/pixel-engine.js";
    s.async = true;
    s.onload = () => { pxState = "ready"; wirePixels(); };
    s.onerror = () => { pxState = "failed"; };
    doc.head.appendChild(s);
  }
  function wirePixels() {
    if (typeof logic.initPixels !== "function") return;
    for (const el of rootHost.querySelectorAll("[data-px], [data-px-img]")) {
      /* initPixels() takes a root and asks it for matches; this root answers with the one element. */
      whenShown(el, () => logic.initPixels({ querySelectorAll: (sel) => (el.matches(sel) ? [el] : []) }));
    }
  }
  /* THE STREAM NOTES EXIST ON A WIDE SCREEN WITH A MOUSE, FROM SECOND TEN.
   * Owner: no notes on phones, at any size. The labels ship inside an inert
   * <template> (see the build), so a phone never styles or counts them. */
  function armNotes() {
    const layer = rootHost.querySelector("[data-pt-layer]"), tpl = layer && layer.querySelector("template[data-v5-pt]");
    if (!tpl || logic.reduced() || !window.matchMedia) return;
    const gate = matchMedia("(min-width:1280px) and (pointer:fine)");
    const put = () => { if (!gate.matches || !tpl.isConnected) return; gate.removeEventListener("change", put); layer.appendChild(tpl.content); tpl.remove(); logic.ptStale = true; };
    afterLoad(() => setTimeout(() => { gate.addEventListener("change", put); put(); }, 10000));
  }
  function afterLoad(fn) { if (doc.readyState === "complete") fn(); else window.addEventListener("load", fn, { once: true }); }

  /* THE WORKSHOP COMES LATE, AND ONLY FOR SOMEONE WHO IS HERE. Before it is
   * asked for it costs nothing: no node, no request, no style. Its switch
   * appears ten seconds after the visitor's first real action - a pointer
   * press, a key, the wheel, a touch (owner, 16.9.2026); moving the mouse is
   * not an action, Lighthouse never does any of these, and the measuring
   * scripts scroll with scrollTo, which fires none of them. The band's button
   * (data-v5-dev-open) is the invitation and opens at once. `?werkstatt` in
   * the URL opens it at once, for showing it. */
  function armDevMode() {
    const EVENTS = ["pointerdown", "keydown", "wheel", "touchstart"];
    let armed = true;
    const disarm = () => { armed = false; for (const ev of EVENTS) window.removeEventListener(ev, onAct, true); };
    const onAct = () => { disarm(); setTimeout(showDevSwitch, 10000); };
    for (const ev of EVENTS) window.addEventListener(ev, onAct, { capture: true, passive: true });
    doc.addEventListener("click", (e) => {
      if (!e.target.closest || !e.target.closest("[data-v5-dev-open]")) return;
      if (armed) disarm();
      showDevSwitch();
      loadDev();
    });
    if (/[?&]werkstatt(=|&|$)/.test(location.search)) { disarm(); showDevSwitch(); loadDev(); }
  }
  function showDevSwitch() {
    if (doc.querySelector("[data-v5-dev-switch]")) return;
    const css = doc.createElement("style");
    css.id = "v5-dev-switch-css";
    css.textContent =
      ".v5-dev-switch{position:fixed;right:16px;bottom:calc(16px + env(safe-area-inset-bottom));z-index:70;display:inline-flex;align-items:center;gap:8px;height:36px;padding:0 14px 0 12px;border-radius:999px;background:#0A2540;color:#fff;font:500 11px/1 'JetBrains Mono',monospace;letter-spacing:.08em;text-transform:uppercase;box-shadow:0 0 0 1px rgba(10,37,64,.08),0 10px 30px -12px rgba(10,37,64,.5);cursor:pointer;animation:v5DevIn .5s cubic-bezier(.2,.8,.2,1) both;transition:background .2s,transform .2s}" +
      ".v5-dev-switch::before{content:'';width:8px;height:8px;border-radius:50%;background:linear-gradient(135deg,#FFB46B,#FF5A8C,#C05CFF,#5FC3FF)}" +
      ".v5-dev-switch:hover{background:#0A1F44;transform:translateY(-1px)}" +
      ".v5-dev-switch:focus-visible{outline:2px solid #635BFF;outline-offset:3px}" +
      ".v5-dev-switch[data-state=loading]{opacity:.7;cursor:progress}" +
      ".v5-dev-switch[data-state=failed]{background:#425466}" +
      "@keyframes v5DevIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}" +
      "@media (prefers-reduced-motion:reduce){.v5-dev-switch{animation:none;transition:none}}";
    doc.head.appendChild(css);
    const b = doc.createElement("button");
    b.type = "button";
    b.className = "v5-dev-switch";
    b.setAttribute("data-v5-dev-switch", "");
    b.setAttribute("data-state", "idle");
    b.setAttribute("aria-haspopup", "dialog");
    b.setAttribute("aria-expanded", "false");
    b.textContent = "Werkstatt";
    b.addEventListener("click", loadDev);
    doc.body.appendChild(b);
  }
  let devState = null;
  function loadDev() {
    if (devState) return;
    devState = "loading";
    const b = doc.querySelector("[data-v5-dev-switch]");
    if (b) b.setAttribute("data-state", "loading");
    const s = doc.createElement("script");
    s.type = "module";
    s.src = "/v5/dev/index.js";
    s.onload = () => { devState = "ready"; };
    s.onerror = () => {
      /* A dropped connection must not cost the workshop for the rest of the visit: the next click tries again. */
      devState = null;
      s.remove();
      if (b) { b.setAttribute("data-state", "failed"); b.textContent = "Werkstatt · erneut versuchen"; }
    };
    doc.head.appendChild(s);
  }

  /* ------------------------------------------------------------------ boot */
  const mark = (n) => { try { performance.mark("v5:" + n); } catch (e) { /* no timing API */ } };
  /* The next task, without waiting for a frame: setTimeout(0) is clamped and
   * often lands behind the next paint, a MessageChannel message does not. */
  const nextTask = (fn) => {
    if (typeof MessageChannel === "function") { const ch = new MessageChannel(); ch.port1.onmessage = () => { ch.port1.close(); fn(); }; ch.port2.postMessage(0); }
    else setTimeout(fn, 0);
  };
  /* THE START IS THREE TASKS, NOT ONE. Compiling the template, adopting 1,600
   * nodes and mounting the page took 72-116 ms in one task at 4x CPU
   * (measured 17.9.2026): everything above 50 ms of a task counts as blocking
   * time. Split, each part stays under the line, and nothing is lost in
   * between: a click before mount merges its state and is applied by the
   * first pass, a block that renders before mount is caught up by the
   * runtime's region hook once records exist. */
  function boot() {
    try { bootNow(); } catch (e) { report(e); }
  }
  function bootNow() {
    mark("boot");
    const props = DATA.props || {};
    prevProps = Object.assign({}, props);
    const Component = window.__v5Logic(DCLogic, DCLogic, React);
    logic = new Component(props);
    logic.props = props;
    /* The real width before the baseline, so nothing width-related is written
     * at start; the export measures the same way in its onResize. */
    const vw = Math.round(rootHost.getBoundingClientRect().width || html.clientWidth || window.innerWidth);
    if (vw && logic.state && "vw" in logic.state) logic.state = Object.assign({}, logic.state, { vw });
    mark("logic");
    const tree = compileKids(tplEl.content, false);
    mark("compile");
    panel = rootHost.querySelector("[data-v5-panel]");
    if (cvLive) for (const b of doc.querySelectorAll("[data-cv]")) if (!shown.has(b)) shown.set(b, Array.prototype.some.call(b.children, (c) => c.checkVisibility({ contentVisibilityAuto: true })));
    installGates();
    nextTask(() => { try { bind(tree); } catch (e) { report(e); return; } nextTask(() => { try { mount(); } catch (e) { report(e); } }); });
  }
  function bind(tree) {
    const vals = computeVals();
    const root = { kind: "root", kids: [] };
    rootKids = root.kids = bindKids(tree, rootHost, { n: rootHost.firstChild }, vals, root, true);
    flushRefs();
    mark("bind");
  }
  function mount() {
    mounted = true;
    try { logic.componentDidMount(); } catch (e) { report(e); }
    mark("mount");
    /* State that changed between bind and mount (a click, a block that came in) is applied now. */
    schedule();
    armPixels();
    armNotes();
    armDevMode();
    /* For the workshop (v5/dev/): the page's logic and the template node behind an element. */
    window.__v5 = {
      logic,
      stats,
      bound(el) { const r = recOf.get(el); return r ? { static: !!r.static, scopeKeys: r.scope ? Object.keys(r.scope).slice(0, 8) : null, events: (r.t && r.t.events || []).map((e) => e.type) } : null; },
      describe(el) {
        const tid = el && el.getAttribute && el.getAttribute("data-dc-tpl");
        const t = tid != null ? byTid.get(tid) : null;
        if (!t) return null;
        return { tid, tag: t.tag, attrs: t.attrs, dyn: t.dyn.map((d) => ({ name: d.name, expr: d.expr })), style: t.style && t.style.decls ? t.style.decls.filter((d) => d.get).map((d) => ({ prop: d.prop, expr: d.value })) : [], events: t.events.map((e) => ({ type: e.type, expr: e.expr })), ref: t.ref ? t.ref.expr : null };
      },
    };
  }
  boot();
})();
