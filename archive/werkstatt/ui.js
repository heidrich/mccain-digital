/* The building blocks of the workshop, in the page's own design language.
 *
 * Everything here builds DOM with createElement and textContent. No innerHTML
 * from page content: the workshop shows arbitrary HTML and CSS of the page as
 * text, and a string that came from the page must never become markup again
 * inside the workshop. */
import { T } from "./texte.js";

const OWN = "#v5-dev, #v5-dev-layer, [data-v5-dev-switch], #v5-dev-css, #v5-dev-switch-css, [data-v5-dev-style]";

/* True for every node that belongs to the workshop rather than the page. */
export function isOwn(node) {
  if (!node) return false;
  const el = node.nodeType === 1 ? node : node.parentElement;
  return !!(el && el.closest && el.closest(OWN));
}

/* h("div.wk-card", { "data-x": 1, onclick: fn, aria: { label: "…" } }, child, [children], "text") */
export function h(spec, attrs, ...children) {
  const [tag, ...classes] = spec.split(".");
  const el = document.createElement(tag || "div");
  if (classes.length) el.className = classes.join(" ");
  if (attrs && typeof attrs === "object" && !(attrs instanceof Node) && !Array.isArray(attrs)) {
    for (const k of Object.keys(attrs)) {
      const v = attrs[k];
      if (v === null || v === undefined || v === false) continue;
      if (k === "class") el.className += (el.className ? " " : "") + v;
      else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
      else if (k === "aria" && typeof v === "object") for (const a of Object.keys(v)) el.setAttribute("aria-" + a, v[a]);
      else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
      else if (k === "text") el.textContent = v;
      else el.setAttribute(k, v === true ? "" : v);
    }
  } else if (attrs !== undefined) {
    children.unshift(attrs);
  }
  append(el, children);
  return el;
}

export function append(el, children) {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    if (Array.isArray(c)) append(el, c);
    else if (c instanceof Node) el.appendChild(c);
    else el.appendChild(document.createTextNode(String(c)));
  }
  return el;
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

export function eyebrow(text) {
  return h("div.wk-eyebrow", text);
}

/* A card: eyebrow, title, body, and the collapsible "why" the owner asked for. */
export function card({ eyebrow: eb, title, body, why, attrs }) {
  const el = h("section.wk-card", attrs || {});
  if (eb) el.appendChild(eyebrow(eb));
  if (title) el.appendChild(h("h3.wk-card-title", title));
  const b = h("div.wk-card-body");
  append(b, Array.isArray(body) ? body : [body]);
  el.appendChild(b);
  if (why) el.appendChild(whyBox(why));
  return el;
}

export function whyBox(text, label) {
  return h("details.wk-why", h("summary", label || T.crawler.why), h("p", text));
}

/* rows: [[key, value], …]; value may be a node. */
export function kv(rows) {
  const dl = h("dl.wk-kv");
  for (const [k, v] of rows) {
    if (v === undefined || v === null) continue;
    dl.appendChild(h("dt", k));
    dl.appendChild(h("dd", v));
  }
  return dl;
}

export function pill(text, tone) {
  return h("span.wk-pill", { "data-tone": tone || "neutral" }, text);
}

export function btn(label, onclick, attrs) {
  return h("button.wk-btn", Object.assign({ type: "button", onclick }, attrs || {}), label);
}

export function mono(text) {
  return h("code.wk-mono", text);
}

export function note(text) {
  return h("p.wk-note", text);
}

export function fmtBytes(n) {
  if (n === null || n === undefined || isNaN(n)) return "–";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export function fmtMs(ms) {
  if (ms === null || ms === undefined || isNaN(ms)) return "–";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2).replace(".", ",")} s`;
}

export function fmtNum(n, digits) {
  if (n === null || n === undefined || isNaN(n)) return "–";
  return Number(n).toLocaleString("de-DE", { maximumFractionDigits: digits === undefined ? 0 : digits, minimumFractionDigits: digits === undefined ? 0 : digits });
}

/* "section#preise.s419" - what the highlight label and the tree row print. */
export function shortLabel(el, maxClasses) {
  if (!el || el.nodeType !== 1) return el && el.nodeType === 3 ? T.tree.text : "";
  let s = el.tagName.toLowerCase();
  if (el.id) s += "#" + el.id;
  const cls = Array.from(el.classList).slice(0, maxClasses === undefined ? 2 : maxClasses);
  if (cls.length) s += "." + cls.join(".");
  if (el.classList.length > cls.length) s += "…";
  return s;
}

export function textPreview(el, n) {
  const t = (el.textContent || "").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
}

/* Read the four page colours once; the workshop paints its highlights with them. */
export const COLORS = {
  navy: "#0A2540",
  slate: "#425466",
  mute: "#8898AA",
  line: "#E3E8EE",
  indigo: "#635BFF",
  orange: "#FFB46B",
  pink: "#FF5A8C",
  violet: "#C05CFF",
  sky: "#5FC3FF",
  green: "#15BE53",
};

export function reducedMotion() {
  return !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
}

export function isTouch() {
  return !!(window.matchMedia && matchMedia("(pointer: coarse)").matches);
}

/* Scroll the page so `el` is in view, without smooth motion for people who asked for none. */
export function revealOnPage(el) {
  try {
    el.scrollIntoView({ block: "center", inline: "nearest", behavior: reducedMotion() ? "auto" : "smooth" });
  } catch (e) {
    el.scrollIntoView();
  }
}

/* A tiny event bus for the modules: select, hover, view, tab, close. */
export function bus() {
  const map = new Map();
  return {
    on(name, fn) {
      if (!map.has(name)) map.set(name, new Set());
      map.get(name).add(fn);
      return () => map.get(name).delete(fn);
    },
    emit(name, payload) {
      const set = map.get(name);
      if (!set) return;
      for (const fn of Array.from(set)) {
        try { fn(payload); } catch (e) { /* one listener must not stop the others */ }
      }
    },
    clear() { map.clear(); },
  };
}

/* Tabs after the WAI-ARIA pattern: arrow keys move, the active tab is the only one in the tab order. */
export function tabs(items, onChange, attrs) {
  const list = h("div.wk-tabs", Object.assign({ role: "tablist" }, attrs || {}));
  const buttons = items.map((it, i) =>
    h("button.wk-tab", {
      type: "button", role: "tab", "data-tab": it.id, id: `v5-dev-tab-${it.id}`,
      aria: { selected: i === 0 ? "true" : "false", controls: `v5-dev-panel-${it.id}` },
      tabindex: i === 0 ? "0" : "-1",
      onclick: () => select(it.id),
    }, it.label)
  );
  append(list, buttons);
  list.addEventListener("keydown", (e) => {
    const i = buttons.findIndex((b) => b === document.activeElement);
    if (i < 0) return;
    let j = null;
    if (e.key === "ArrowRight") j = (i + 1) % buttons.length;
    else if (e.key === "ArrowLeft") j = (i - 1 + buttons.length) % buttons.length;
    else if (e.key === "Home") j = 0;
    else if (e.key === "End") j = buttons.length - 1;
    if (j === null) return;
    e.preventDefault();
    buttons[j].focus();
    select(items[j].id);
  });
  let current = items[0].id;
  function select(id) {
    if (id === current && list.dataset.ready) return;
    current = id;
    list.dataset.ready = "1";
    for (const b of buttons) {
      const on = b.dataset.tab === id;
      b.setAttribute("aria-selected", on ? "true" : "false");
      b.tabIndex = on ? 0 : -1;
    }
    onChange(id);
  }
  return { el: list, select, get current() { return current; } };
}

export function panel(id, children) {
  return h("div.wk-panel", { role: "tabpanel", "data-panel": id, id: `v5-dev-panel-${id}`, aria: { labelledby: `v5-dev-tab-${id}` }, tabindex: "0" }, children);
}

/* Colour helpers for the contrast check and the accent knob. */
export function parseColor(s) {
  if (!s) return null;
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const p = m[1].split(/[\s,\/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  }
  const hex = s.match(/^#([0-9a-f]{3,8})$/i);
  if (hex) {
    let x = hex[1];
    if (x.length === 3 || x.length === 4) x = x.split("").map((c) => c + c).join("");
    return { r: parseInt(x.slice(0, 2), 16), g: parseInt(x.slice(2, 4), 16), b: parseInt(x.slice(4, 6), 16), a: x.length === 8 ? parseInt(x.slice(6, 8), 16) / 255 : 1 };
  }
  return null;
}

export function luminance({ r, g, b }) {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrast(a, b) {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export function hslToRgb(h, s, l) {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return { r: Math.round(255 * f(0)), g: Math.round(255 * f(8)), b: Math.round(255 * f(4)) };
}

export function toHex({ r, g, b }) {
  return "#" + [r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("").toUpperCase();
}
