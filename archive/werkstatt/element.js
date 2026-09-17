/* The element panel: one node, everything the browser knows about it.
 *
 * Path, its HTML as it stands in memory, the rules that apply, the computed
 * values, the box, what a screen reader gets, which function moves it, and a
 * way to change it and change it back. */
import { T } from "./texte.js";
import { h, clear, card, kv, pill, btn, mono, note, shortLabel, textPreview, revealOnPage, parseColor, contrast, isOwn, whyBox } from "./ui.js";
import { matchedRules, isColorValue } from "./cssrules.js";
import { renderCode } from "./tokens.js";
import { edits, editBus, replaceOuterHtml } from "./edits.js";

const COMPUTED = ["display", "position", "z-index", "width", "height", "font-family", "font-size", "font-weight", "line-height", "letter-spacing", "color", "background-color", "background-image", "border-radius", "box-shadow", "opacity", "transform", "transition", "animation-name", "content-visibility", "contain", "contain-intrinsic-size", "will-change", "overflow", "gap", "grid-template-columns", "flex", "text-wrap"];
const IMPLICIT_ROLE = { a: (el) => (el.hasAttribute("href") ? "link" : null), button: "button", h1: "heading", h2: "heading", h3: "heading", h4: "heading", h5: "heading", h6: "heading", nav: "navigation", main: "main", header: "banner", footer: "contentinfo", aside: "complementary", img: "img", ul: "list", ol: "list", li: "listitem", form: "form", table: "table", tr: "row", td: "cell", th: "columnheader", input: (el) => ({ checkbox: "checkbox", radio: "radio", range: "slider", submit: "button", button: "button" }[el.type] || "textbox"), textarea: "textbox", select: "combobox", section: (el) => (el.hasAttribute("aria-label") || el.hasAttribute("aria-labelledby") ? "region" : null), dialog: "dialog", details: "group", summary: "button", blockquote: "blockquote", figure: "figure", hr: "separator", p: "paragraph", code: "code", em: "emphasis", strong: "strong", canvas: null, svg: (el) => (el.hasAttribute("role") ? el.getAttribute("role") : "graphics-document") };

export function mountElement(W) {
  const el = h("div");
  let mapPromise = null;
  let current = null;

  const revealBtn = btn(T.element.reveal, () => current && (revealOnPage(current), W.layer.flash(current)), { "data-tone": "ghost", disabled: true });
  const upBtn = btn("↑ Eltern", () => current && current.parentElement && !current.parentElement.matches("html") && W.select(current.parentElement), { "data-tone": "ghost", disabled: true });
  const toolbar = h("div.wk-toolbar", revealBtn, upBtn);
  const hint = h("p.wk-hint", { style: { margin: "-4px 0 10px" } }, matchMedia("(pointer: coarse)").matches ? T.pick.touchHint : T.pick.hint);
  const body = h("div");
  el.append(toolbar, hint, body);
  empty();

  /* The pick button lives in the tab bar (index.js); this panel only explains it. */
  const offPick = W.bus.on("pick", (on) => {
    hint.textContent = on ? (matchMedia("(pointer: coarse)").matches ? T.pick.touchHint : T.pick.hint) : "";
    hint.hidden = !on && !!current;
  });
  const offSelect = W.bus.on("select", (target) => render(target));
  const offEdits = editBus.on("change", () => { if (current) renderEdit(); });

  function empty() {
    clear(body);
    body.appendChild(h("div.wk-empty", h("strong", T.pick.none), T.pick.noneHint));
    revealBtn.disabled = true; upBtn.disabled = true;
  }

  function render(target) {
    current = target;
    if (!target || !target.isConnected) { empty(); return; }
    revealBtn.disabled = false;
    upBtn.disabled = !target.parentElement || target.parentElement === document.documentElement;
    hint.hidden = true;
    clear(body);
    body.append(pathBar(target), htmlCard(target), templateCard(target), cssCard(target), computedCard(target), boxCard(target), a11yCard(target), codeCard(target), editCard(target));
  }

  /* ---- path */
  function pathBar(target) {
    const bar = h("div.wk-path", { "data-selected-path": "" });
    const chain = [];
    for (let n = target; n && n !== document.documentElement; n = n.parentElement) chain.unshift(n);
    chain.forEach((n, i) => {
      if (i) bar.appendChild(h("span.wk-sep", "›"));
      bar.appendChild(h("button", { type: "button", aria: { current: n === target ? "true" : null }, onclick: () => W.select(n), onmouseenter: () => W.hover(n), onmouseleave: () => W.hover(null) }, shortLabel(n, 1)));
    });
    return bar;
  }

  /* ---- html */
  function openTag(node, indent) {
    const attrs = Array.from(node.attributes);
    const one = `<${node.tagName.toLowerCase()}${attrs.map((a) => ` ${a.name}${a.value === "" ? "" : `="${a.value.replace(/"/g, "&quot;")}"`}`).join("")}>`;
    if (one.length <= 90 || attrs.length < 3) return indent + one;
    return indent + `<${node.tagName.toLowerCase()}\n` + attrs.map((a) => `${indent}  ${a.name}${a.value === "" ? "" : `="${a.value.replace(/"/g, "&quot;")}"`}`).join("\n") + `\n${indent}>`;
  }
  function prettyHtml(node) {
    const lines = [openTag(node, "")];
    const kids = Array.from(node.childNodes).filter((c) => (c.nodeType === 1 && !isOwn(c)) || (c.nodeType === 3 && c.nodeValue.trim()));
    for (const c of kids.slice(0, 40)) {
      if (c.nodeType === 3) { lines.push(`  ${textPreview(c, 90)}`); continue; }
      const inner = c.children.length ? "…" : textPreview(c, 60);
      lines.push(openTag(c, "  ") + inner + `</${c.tagName.toLowerCase()}>`);
    }
    if (kids.length > 40) lines.push(`  <!-- ${kids.length - 40} weitere Kinder -->`);
    lines.push(`</${node.tagName.toLowerCase()}>`);
    return lines.join("\n");
  }
  function htmlCard(target) {
    const code = renderCode(prettyHtml(target), "html", { small: "inline" });
    const size = target.outerHTML.length;
    return card({ eyebrow: T.element.html, title: shortLabel(target, 3), body: [code.el, h("p.wk-hint", `${size.toLocaleString("de-DE")} Zeichen HTML · ${target.getElementsByTagName("*").length.toLocaleString("de-DE")} Nachfahren`)], why: T.element.htmlWhy, attrs: { "data-section": "html" } });
  }

  /* ---- template: the binder's own record for this node (window.__v5.describe) */
  function bindingList(pairs) {
    const decl = h("div.wk-decl");
    for (const [name, expr] of pairs) { decl.appendChild(h("span.p", name + ":")); decl.appendChild(h("span.v", mono(expr))); }
    return decl;
  }
  function templateCard(target) {
    const api = window.__v5;
    const d = api && typeof api.describe === "function" ? api.describe(target) : null;
    if (!d) return card({ eyebrow: T.element.template, body: note(T.element.templateNone), why: T.element.templateWhy, attrs: { "data-section": "template" } });
    const rows = [
      [T.element.templateTid, mono(d.tid)],
      [T.element.templateAttrs, d.dyn.length ? bindingList(d.dyn.map((a) => [a.name, a.expr])) : note(T.element.templateNoDyn)],
      [T.element.templateStyle, d.style.length ? bindingList(d.style.map((s) => [s.prop, s.expr])) : note(T.element.templateNoStyle)],
      [T.element.templateEvents, d.events.length ? bindingList(d.events.map((e) => [e.type, e.expr])) : note(T.element.templateNoEvents)],
      [T.element.templateRef, d.ref ? mono(d.ref) : null],
    ];
    return card({ eyebrow: T.element.template, body: kv(rows), why: T.element.templateWhy, attrs: { "data-section": "template" } });
  }

  /* ---- css */
  function cssCard(target) {
    const rules = matchedRules(target);
    const list = h("div");
    if (!rules.length) list.appendChild(note(T.element.cssNone));
    for (const r of rules) {
      const off = r.conditions.some((c) => c.active === false);
      const head = h("div.wk-rule-head", h("span.wk-rule-sel", r.selector), r.pseudo ? pill("Pseudo-Element", "info") : null, h("span.wk-rule-src", r.source));
      const conds = r.conditions.map((c) => h("div.wk-rule-cond", `${c.kind} ${c.text}`, " ", c.active === false ? pill("gilt gerade nicht", "warn") : c.active === true ? pill("gilt", "good") : null));
      const decl = h("div.wk-decl");
      for (const d of r.decls) {
        decl.appendChild(h("span.p", { "data-over": d.overridden ? "" : null }, d.prop + ":"));
        const v = h("span.v", { "data-over": d.overridden ? "" : null });
        if (isColorValue(d.value)) { const sw = h("span.wk-swatch"); sw.style.background = d.value; v.appendChild(sw); }
        v.appendChild(document.createTextNode(d.value));
        if (d.important) v.appendChild(h("span.imp", " !important"));
        decl.appendChild(v);
      }
      list.appendChild(h("div.wk-rule", { "data-off": off ? "" : null }, head, conds, decl));
    }
    return card({ eyebrow: T.element.css, title: `${rules.length} ${rules.length === 1 ? "Regel" : "Regeln"}`, body: list, why: T.element.cssWhy, attrs: { "data-section": "css" } });
  }

  /* ---- computed */
  function computedCard(target) {
    const cs = getComputedStyle(target);
    const rows = [];
    for (const p of COMPUTED) {
      let v = cs.getPropertyValue(p);
      if (!v || v === "none" && /^(transform|box-shadow|animation-name|background-image|will-change|contain|content-visibility|text-wrap)$/.test(p) && p !== "content-visibility") continue;
      if (p === "transition" && /^all 0s ease 0s$/.test(v)) continue;
      if (p === "font-family") v = v.split(",")[0].replace(/"/g, "");
      if (v.length > 90) v = v.slice(0, 89) + "…";
      const val = h("span");
      if (isColorValue(v)) { const sw = h("span.wk-swatch"); sw.style.background = v; val.appendChild(sw); }
      val.appendChild(mono(v));
      rows.push([p, val]);
    }
    return card({ eyebrow: T.element.computed, body: kv(rows), why: T.element.computedWhy, attrs: { "data-section": "computed" } });
  }

  /* ---- box */
  function boxCard(target) {
    const cs = getComputedStyle(target);
    const r = target.getBoundingClientRect();
    const n = (v) => Math.round(parseFloat(v) || 0);
    const m = [n(cs.marginTop), n(cs.marginRight), n(cs.marginBottom), n(cs.marginLeft)];
    const b = [n(cs.borderTopWidth), n(cs.borderRightWidth), n(cs.borderBottomWidth), n(cs.borderLeftWidth)];
    const p = [n(cs.paddingTop), n(cs.paddingRight), n(cs.paddingBottom), n(cs.paddingLeft)];
    const cw = Math.round(r.width - b[1] - b[3] - p[1] - p[3]), ch = Math.round(r.height - b[0] - b[2] - p[0] - p[2]);
    const ring = (cls, label, vals, inner) => h("div." + cls, h("span", label), h("i.v.t", String(vals[0])), h("i.v.r", String(vals[1])), h("i.v.bt", String(vals[2])), h("i.v.l", String(vals[3])), inner);
    const diagram = h("div.wk-boxm", ring("m", "margin", m, ring("b", "border", b, ring("p", "padding", p, h("div.c", `${cw} × ${ch}`)))));
    return card({ eyebrow: T.element.box, title: `${Math.round(r.width)} × ${Math.round(r.height)} px`, body: [diagram, kv([["box-sizing", mono(cs.boxSizing)], ["Position im Fenster", mono(`${Math.round(r.left)}, ${Math.round(r.top)}`)], ["Position im Dokument", mono(`${Math.round(r.left + scrollX)}, ${Math.round(r.top + scrollY)}`)]])], why: T.element.boxWhy, attrs: { "data-section": "box" } });
  }

  /* ---- accessibility */
  function accName(target) {
    if (target.hasAttribute("aria-label")) return { name: target.getAttribute("aria-label"), from: "aria-label" };
    if (target.hasAttribute("aria-labelledby")) {
      const ids = target.getAttribute("aria-labelledby").split(/\s+/);
      const t = ids.map((id) => { const e = document.getElementById(id); return e ? e.textContent.trim() : ""; }).join(" ").trim();
      if (t) return { name: t, from: "aria-labelledby" };
    }
    if (target.tagName === "IMG") return { name: target.getAttribute("alt") || "", from: target.hasAttribute("alt") ? "alt" : "kein alt" };
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) && target.id) {
      const l = document.querySelector(`label[for="${target.id}"]`);
      if (l) return { name: l.textContent.trim(), from: "label" };
    }
    if (/^(A|BUTTON|H[1-6]|SUMMARY|LI|TH|TD|LABEL|OPTION|LEGEND|CAPTION|P)$/.test(target.tagName) || target.hasAttribute("role")) {
      const t = textPreview(target, 90);
      if (t) return { name: t, from: "Inhalt" };
    }
    if (target.hasAttribute("title")) return { name: target.getAttribute("title"), from: "title" };
    return { name: "", from: "–" };
  }
  function bgOf(target) {
    for (let n = target; n && n !== document.documentElement; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage && cs.backgroundImage !== "none") return { image: true };
      const c = parseColor(cs.backgroundColor);
      if (c && c.a > 0.99) return { color: c };
    }
    return { color: { r: 255, g: 255, b: 255, a: 1 } };
  }
  function a11yCard(target) {
    const rows = [];
    const impl = IMPLICIT_ROLE[target.tagName.toLowerCase()];
    const role = target.getAttribute("role") || (typeof impl === "function" ? impl(target) : impl) || "generic";
    rows.push(["Rolle", h("span", mono(role), target.hasAttribute("role") ? " " : "", target.hasAttribute("role") ? pill("explizit", "info") : null)]);
    const nm = accName(target);
    rows.push(["Name", nm.name ? h("span", `“${nm.name}”`, " ", pill(nm.from)) : pill(role === "generic" || role === "paragraph" ? "nicht nötig" : "fehlt", role === "generic" || role === "paragraph" ? "neutral" : "bad")]);
    const focusable = target.tabIndex >= 0 && !target.hasAttribute("disabled");
    rows.push(["Fokussierbar", pill(focusable ? `ja (tabindex ${target.tabIndex})` : "nein", focusable ? "good" : "neutral")]);
    const hidden = target.closest("[aria-hidden='true']");
    if (hidden) rows.push(["Screenreader", pill("verborgen (aria-hidden)", "warn")]);
    const cs = getComputedStyle(target);
    const hasText = Array.from(target.childNodes).some((c) => c.nodeType === 3 && c.nodeValue.trim());
    if (hasText) {
      const fg = parseColor(cs.color);
      const bg = bgOf(target);
      if (fg && bg.color) {
        const ratio = contrast(fg, bg.color);
        const size = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight, 10) >= 700;
        const large = size >= 24 || (size >= 18.66 && bold);
        const aa = ratio >= (large ? 3 : 4.5), aaa = ratio >= (large ? 4.5 : 7);
        const sw = (c) => { const s = h("span.wk-swatch"); s.style.background = `rgb(${c.r},${c.g},${c.b})`; return s; };
        rows.push(["Kontrast", h("span", sw(fg), sw(bg.color), mono(`${ratio.toFixed(2).replace(".", ",")}:1`), " ", pill(aaa ? "AAA" : aa ? "AA" : "unter AA", aaa || aa ? "good" : "bad"), large ? " " : "", large ? pill("großer Text") : null)]);
      } else if (bg.image) {
        rows.push(["Kontrast", pill("Hintergrund ist ein Bild oder Verlauf, nicht bestimmbar", "neutral")]);
      }
    }
    const lang = target.closest("[lang]");
    rows.push(["Sprache", mono(lang ? lang.getAttribute("lang") : "–")]);
    return card({ eyebrow: T.element.a11y, body: kv(rows), why: T.element.a11yWhy, attrs: { "data-section": "a11y" } });
  }

  /* ---- in the code */
  function loadMap() {
    if (!mapPromise) mapPromise = fetch("/v5/dev/map.json").then((r) => (r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status)))).catch(() => null);
    return mapPromise;
  }
  function codeCard(target) {
    const box = h("div", note(T.code.loading));
    const c = card({ eyebrow: T.element.code, body: box, why: T.element.codeWhy, attrs: { "data-section": "code" } });
    loadMap().then((map) => {
      if (current !== target) return;
      clear(box);
      if (!map) { box.appendChild(note(T.code.failed)); return; }
      const hits = map.entries.filter((e) => { try { return !!target.closest(e.match); } catch (err) { return false; } });
      if (!hits.length) { box.appendChild(note(T.element.codeNone)); return; }
      for (const e of hits) {
        const links = [];
        const refs = [{ file: e.file, symbol: e.symbol, section: e.section, selector: e.selector }].concat(e.also || []);
        for (const ref of refs) {
          const f = map.files[ref.file];
          if (!f) continue;
          const label = ref.symbol ? `${f.name} · ${ref.symbol}()` : ref.section ? `${f.name} · „${ref.section}“` : ref.selector ? `${f.name} · ${ref.selector}` : f.name;
          /* Every file in map.json's "files" is browsable in the Code tab
           * except "build" (tools/v5build.mjs, build-time only - never
           * shipped, so code.js has no source to fetch for it). Neither
           * "logic" (one file per route, resolved through V5_DATA.route in
           * code.js, not a fixed url here) nor "css" (inline <style>, no url
           * either) carry a "url" in map.json, so the gate checks the file id
           * itself rather than the presence of "url". */
          if (ref.file !== "build") links.push(btn(label, () => W.showCode(ref.file, ref.symbol || ref.selector, ref.section), { "data-tone": "small" }));
          else links.push(pill(label));
        }
        const hitEl = target.closest(e.match);
        box.appendChild(h("div", { style: { padding: "8px 0", borderTop: box.children.length ? "1px solid var(--wk-line)" : "0" } },
          h("div", { style: { display: "flex", gap: "8px", alignItems: "baseline", flexWrap: "wrap" } }, h("strong", e.title), hitEl !== target ? pill(`über ${shortLabel(hitEl, 1)}`) : null),
          h("p.wk-note", e.what), e.why ? h("p.wk-hint", e.why) : null,
          h("div.wk-toolbar", { style: { marginTop: "6px", marginBottom: "0" } }, links)));
      }
    });
    return c;
  }

  /* ---- edit */
  let editCardEl = null;
  function editCard(target) {
    editCardEl = card({ eyebrow: T.element.edit, body: h("div"), why: T.element.editWhy, attrs: { "data-section": "edit" } });
    renderEdit();
    return editCardEl;
  }
  function renderEdit() {
    if (!editCardEl || !current) return;
    const target = current;
    const body = editCardEl.querySelector(".wk-card-body");
    clear(body);
    const textOnly = !target.children.length;
    let mode = textOnly ? "text" : "html";
    const modes = h("div.wk-toolbar", { role: "radiogroup" });
    const ta = h("textarea.wk-textarea", { spellcheck: "false", aria: { label: T.element.edit } });
    const setMode = (m) => {
      mode = m;
      ta.value = m === "text" ? target.textContent : target.outerHTML;
      for (const b of modes.children) b.setAttribute("aria-pressed", b.dataset.mode === m ? "true" : "false");
    };
    if (textOnly) modes.appendChild(btn(T.element.editText, () => setMode("text"), { "data-tone": "ghost", "data-mode": "text" }));
    modes.appendChild(btn(T.element.editHtml, () => setMode("html"), { "data-tone": "ghost", "data-mode": "html" }));
    const mine = edits.forNode(target);
    const apply = btn(T.element.apply, () => {
      try {
        if (mode === "text") {
          const before = target.textContent;
          if (before === ta.value) return;
          target.textContent = ta.value;
          edits.record({ kind: "text", label: shortLabel(target, 1), node: target, undo: () => { target.textContent = before; } });
          W.select(target);
        } else {
          const before = target.outerHTML;
          if (before === ta.value) return;
          const next = replaceOuterHtml(target, ta.value);
          edits.rebind(target, next); /* older text edits of this node now belong to its successor */
          const entry = edits.record({ kind: "html", label: shortLabel(next, 1), node: next, undo: () => replaceOuterHtml(entry.node, before) });
          W.select(next);
        }
      } catch (err) {
        body.appendChild(note("Das ging nicht: " + err.message));
      }
    });
    const reset = btn(T.element.reset, () => { const restored = edits.undoNode(target); W.select(restored); }, { "data-tone": "ghost", disabled: !mine.length });
    setMode(mode);
    body.append(modes, ta, h("div.wk-toolbar", { style: { marginTop: "8px", marginBottom: "0" } }, apply, reset, mine.length ? pill(`${mine.length}× ${T.element.edited}`, "warn") : null));
  }

  return {
    el,
    show() { if (current && !current.isConnected) empty(); },
    dispose() { offPick(); offSelect(); offEdits(); },
  };
}

export { whyBox };
