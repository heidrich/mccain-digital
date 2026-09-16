/* The code tab: the page's files, readable, with a way to jump to a function.
 *
 * Sources are fetched on demand and kept for the session. Line numbers for a
 * jump are found at that moment by searching the text for the function's
 * declaration, so the map (map.json) never carries a line that goes stale. */
import { T } from "./texte.js";
import { h, clear, card, btn, note, fmtBytes, isOwn, whyBox } from "./ui.js";
import { renderCode } from "./tokens.js";

const DEV_FILES = ["index.js", "ui.js", "texte.js", "dev.css", "highlight.js", "pick.js", "tree.js", "cssrules.js", "element.js", "tokens.js", "code.js", "perf.js", "knobs.js", "crawler.js", "edits.js", "map.json"];

function formatCss(css) {
  let out = "", depth = 0, paren = 0, quote = null;
  const nl = () => { out = out.replace(/[ \t]+$/, "") + "\n" + "  ".repeat(depth); };
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (quote) { out += c; if (c === quote && css[i - 1] !== "\\") quote = null; continue; }
    if (c === '"' || c === "'") { quote = c; out += c; continue; }
    if (c === "(") paren++;
    if (c === ")") paren--;
    if (c === "{" && !paren) { depth++; out += " {"; nl(); continue; }
    if (c === "}" && !paren) { depth = Math.max(0, depth - 1); out = out.replace(/\s+$/, ""); nl(); out += "}"; nl(); if (depth === 0) out += "\n"; continue; }
    if (c === ";" && !paren) { out += ";"; if (css[i + 1] !== "}") nl(); continue; }
    if (c === "\n") continue;
    out += c;
  }
  return out.replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

function formatGlsl(src) {
  let out = "", depth = 0;
  const nl = () => { out = out.replace(/[ \t]+$/, "") + "\n" + "  ".repeat(depth); };
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === "{") { depth++; out += " {"; nl(); continue; }
    if (c === "}") { depth = Math.max(0, depth - 1); out = out.replace(/\s+$/, ""); nl(); out += "}"; nl(); if (depth === 0) out += "\n"; continue; }
    if (c === ";") { out += ";"; nl(); continue; }
    out += c;
  }
  return out.replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

/* The shader sources live in logic.gen.js as concatenated string literals. */
function shaderFrom(logic, name) {
  const at = logic.indexOf(`const ${name} = `);
  if (at < 0) return null;
  const end = logic.indexOf(";\n", at);
  const expr = logic.slice(at, end);
  const parts = expr.match(/'((?:[^'\\]|\\.)*)'/g);
  if (!parts) return null;
  return formatGlsl(parts.map((p) => p.slice(1, -1).replace(/\\'/g, "'").replace(/\\n/g, "\n")).join(""));
}

function liveHtml() {
  const clone = document.documentElement.cloneNode(true);
  clone.querySelectorAll("#v5-dev, #v5-dev-layer, [data-v5-dev-switch], #v5-dev-css, #v5-dev-switch-css, [data-v5-dev-style], script[src='/v5/dev/index.js']").forEach((n) => n.remove());
  clone.classList.remove("v5-dev-pick");
  return "<!DOCTYPE html>\n" + clone.outerHTML;
}

export function mountCode(W) {
  const el = h("div");
  const cache = new Map();
  const sources = new Map();
  let logicPromise = null;
  let currentId = null, view = null, pending = null;

  const files = [
    { id: "html-live", lang: "html", load: () => Promise.resolve(liveHtml()) },
    { id: "html", lang: "html", url: location.pathname },
    { id: "css", lang: "css", load: () => Promise.resolve(formatCss((document.getElementById("v5-css") || {}).textContent || "")) },
    { id: "home", lang: "js", url: "/v5/home.js" },
    { id: "logic", lang: "js", url: "/v5/logic.gen.js" },
    { id: "motion", lang: "js", url: "/v5/dev/motion-budget.src.js" },
    { id: "shader-frag", lang: "glsl", load: () => logic().then((s) => shaderFrom(s, "fs") || "// Fragment-Shader nicht gefunden") },
    { id: "shader-vert", lang: "glsl", load: () => logic().then((s) => shaderFrom(s, "vs") || "// Vertex-Shader nicht gefunden") },
    { id: "heights", lang: "css", load: () => Promise.resolve(formatCss((document.getElementById("v5-cv-heights") || {}).textContent || "/* keine gemessenen Höhen */")) },
    { id: "map", lang: "json", url: "/v5/dev/map.json" },
  ].concat(DEV_FILES.map((f) => ({ id: "dev:" + f, lang: f.endsWith(".css") ? "css" : f.endsWith(".json") ? "json" : "js", url: "/v5/dev/" + f, group: "dev", name: "werkstatt/" + f })));

  function logic() {
    if (!logicPromise) logicPromise = fetch("/v5/logic.gen.js").then((r) => r.text());
    return logicPromise;
  }
  function textOf(file) {
    if (!sources.has(file.id)) {
      const p = (file.load ? file.load() : fetch(file.url).then((r) => (r.ok ? r.text() : Promise.reject(new Error("HTTP " + r.status)))))
        .then((t) => (file.id === "map" ? JSON.stringify(JSON.parse(t), null, 2) : t));
      sources.set(file.id, p);
      p.catch(() => sources.delete(file.id));
    }
    return sources.get(file.id);
  }
  function meta(file) {
    const t = T.code.files[file.id] || T.code.files.dev;
    return { name: file.name || t.name, what: t.what, why: t.why };
  }

  /* ---- chooser + viewer */
  const select = h("select.wk-input", { aria: { label: "Datei" }, style: { height: "34px", font: "500 12px/1.4 var(--wk-mono)" } });
  for (const f of files) {
    if (f.group === "dev" && !select.querySelector("optgroup")) select.appendChild(h("optgroup", { label: T.code.files.dev.name }));
    const opt = h("option", { value: f.id }, meta(f).name);
    (f.group === "dev" ? select.lastChild : select).appendChild(opt);
  }
  select.addEventListener("change", () => open(select.value));
  const title = h("h3.wk-card-title");
  const desc = h("p.wk-note");
  const why = h("div");
  const sizeEl = h("span.wk-count");
  const search = h("input.wk-input", { type: "search", placeholder: T.code.search, aria: { label: T.code.search } });
  const hits = h("span.wk-count");
  const nextBtn = btn("↓", () => nextHit(), { "data-tone": "small", aria: { label: "nächster Treffer" } });
  const viewer = h("div");
  const infoCard = card({ eyebrow: T.code.title, body: [select, title, desc, why, h("div.wk-search", search, hits, nextBtn), viewer, h("div", { style: { textAlign: "right", marginTop: "6px" } }, sizeEl)], why: T.code.why });
  el.appendChild(infoCard);

  /* ---- the list with what/why for every file */
  const list = h("div.wk-files");
  for (const f of files) {
    if (f.group === "dev") continue;
    const m = meta(f);
    const row = h("button.wk-file", { type: "button", "data-file": f.id, onclick: () => open(f.id) }, h("span.wk-file-name", m.name), h("span.wk-file-meta", f.lang), h("span.wk-file-what", m.what));
    list.appendChild(row);
    textOf(f).then((t) => { row.querySelector(".wk-file-meta").textContent = `${f.lang} · ${fmtBytes(t.length)}`; }).catch(() => {});
  }
  el.appendChild(card({ eyebrow: "Alle Dateien", body: list }));

  let hitLines = [], hitAt = -1, searchTimer = 0;
  search.addEventListener("input", () => { clearTimeout(searchTimer); searchTimer = setTimeout(runSearch, 160); });
  search.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); nextHit(); } });
  function runSearch() {
    if (!view) return;
    const q = search.value.trim().toLowerCase();
    for (const li of view.ol.children) li.removeAttribute("data-mark");
    hitLines = []; hitAt = -1;
    if (!q) { hits.textContent = ""; return; }
    Array.from(view.ol.children).forEach((li, i) => { if (li.textContent.toLowerCase().includes(q)) { li.setAttribute("data-mark", ""); hitLines.push(i + 1); } });
    hits.textContent = `${hitLines.length} ×`;
    if (hitLines.length) nextHit();
  }
  function nextHit() {
    if (!hitLines.length || !view) return;
    hitAt = (hitAt + 1) % hitLines.length;
    scrollToLine(hitLines[hitAt], false);
  }
  function scrollToLine(n, mark) {
    const li = view && view.lineEl(n);
    if (!li) return;
    if (mark) { for (const x of view.ol.querySelectorAll("[data-hit]")) x.removeAttribute("data-hit"); li.setAttribute("data-hit", ""); }
    const pre = view.el;
    pre.scrollTop = Math.max(0, li.offsetTop - pre.clientHeight / 3);
  }

  function findLine(text, lang, symbol) {
    if (!symbol) return null;
    const lines = text.split("\n");
    const esc = symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const patterns = lang === "css"
      ? [new RegExp("^\\s*" + esc + "\\s*[,{]"), new RegExp("^\\s*" + esc + "\\b")]
      : [new RegExp("^\\s*(async\\s+)?(static\\s+)?" + esc + "\\s*\\("), new RegExp("\\bfunction\\s+" + esc + "\\s*\\("), new RegExp("\\b(const|let|var)\\s+" + esc + "\\s*="), new RegExp("\\b" + esc + "\\s*[:=]\\s*(async\\s*)?(\\(|function)")];
    for (const re of patterns) { const i = lines.findIndex((l) => re.test(l)); if (i >= 0) return i + 1; }
    const i = lines.findIndex((l) => l.includes(symbol));
    return i >= 0 ? i + 1 : null;
  }

  function open(id, symbol) {
    const file = files.find((f) => f.id === id);
    if (!file) return;
    currentId = id;
    select.value = id;
    const m = meta(file);
    title.textContent = m.name;
    desc.textContent = m.what;
    clear(why); if (m.why) why.appendChild(whyBox(m.why));
    clear(viewer); viewer.appendChild(note(T.code.loading));
    for (const b of list.querySelectorAll(".wk-file")) b.setAttribute("aria-current", b.dataset.file === id ? "true" : "false");
    const token = pending = {};
    textOf(file).then((text) => {
      if (pending !== token) return;
      clear(viewer);
      view = renderCode(text, file.lang);
      viewer.appendChild(view.el);
      sizeEl.textContent = `${view.count.toLocaleString("de-DE")} ${T.code.lines} · ${fmtBytes(text.length)}`;
      hitLines = []; hits.textContent = ""; search.value = "";
      if (symbol) {
        const n = findLine(text, file.lang, symbol);
        if (n) requestAnimationFrame(() => scrollToLine(n, true));
        else { search.value = symbol; runSearch(); }
      }
    }).catch((err) => { if (pending === token) { clear(viewer); viewer.appendChild(note(`${T.code.failed}: ${err.message}`)); } });
  }

  W.showCode = (fileId, symbol) => { W.setTab("code"); open(fileId, symbol); };

  return {
    el,
    show() { if (!currentId) open("home"); },
    dispose() { cache.clear(); sources.clear(); },
  };
}

export { isOwn };
