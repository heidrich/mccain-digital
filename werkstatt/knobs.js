/* Knobs that turn something real on the page.
 *
 * Only four custom properties exist in the page's CSS (--acc and three
 * derivatives), so the accent is the one design token that can be turned
 * live. The other knobs switch behaviour the page really has: the
 * reduced-motion rule, the font fallback, the placeholders of skipped blocks.
 * Every knob is undone through edits.js and on close. */
import { T } from "./texte.js";
import { h, card, kv, pill, btn, hslToRgb, toHex, mono } from "./ui.js";
import { edits, editBus } from "./edits.js";

const REDUCED_RULE = "*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}html{scroll-behavior:auto}[data-px-veil]{display:none!important}";
const FONT_RULE = "#dc-root,#dc-root *{font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif!important}#dc-root code,#dc-root pre,#dc-root [style*='JetBrains'],#dc-root .mono{font-family:ui-monospace,Menlo,Consolas,monospace!important}";
const BASE_HUE = 243;

export function mountKnobs(W) {
  const el = h("div.wk-cols");
  const styles = new Map(); // id -> <style>
  const entries = new Map(); // id -> history entry

  function setStyle(id, css) {
    let s = styles.get(id);
    if (!s) { s = h("style", { id: "v5-dev-knob-" + id, "data-v5-dev-style": "" }); styles.set(id, s); document.head.appendChild(s); }
    s.textContent = css;
  }
  function dropStyle(id) { const s = styles.get(id); if (s) s.remove(); styles.delete(id); }

  function toggleKnob(id, on, apply, undo, label) {
    if (on && !entries.has(id)) {
      apply();
      entries.set(id, edits.record({ kind: "knob", label, undo: () => { undo(); entries.delete(id); sync(); } }));
    } else if (!on && entries.has(id)) {
      const entry = entries.get(id);
      entry.undo(); /* takes the style away and forgets the id */
      edits.remove(entry); /* and leaves the history: nothing is left to undo */
    }
    sync();
  }

  /* ---- accent hue */
  const hue = h("input", { type: "range", min: "0", max: "360", value: String(BASE_HUE), step: "1", aria: { label: T.knobs.accentHue } });
  const hueVal = h("span.wk-count", `${BASE_HUE}°`);
  const swatches = h("div", { style: { display: "flex", gap: "6px", marginTop: "6px" } });
  function accentFor(hh) {
    const acc = hslToRgb(hh, 100, 68), text = hslToRgb(hh, 52, 53);
    return { "--acc": toHex(acc), "--acc-text": toHex(text), "--acc-soft": `rgba(${acc.r},${acc.g},${acc.b},.10)`, "--acc-ring": `rgba(${acc.r},${acc.g},${acc.b},.28)` };
  }
  function paintSwatches(vars) {
    swatches.replaceChildren(...Object.keys(vars).map((k) => { const s = h("span", { title: `${k}: ${vars[k]}`, style: { width: "22px", height: "22px", borderRadius: "6px", background: vars[k], boxShadow: "inset 0 0 0 1px rgba(10,37,64,.15)" } }); return s; }));
  }
  paintSwatches(accentFor(BASE_HUE));
  /* The page sets these four variables itself as inline style on <html>
   * (applyAccent in the page logic). The knob remembers what it found on
   * the first move and puts exactly that back - until 17.9.2026 the undo
   * removed the properties, which left <html> without the page's own values
   * (the gate tools/v5dev-check.mjs now compares before and after). */
  let before = null;
  const restore = () => {
    const root = document.documentElement.style;
    for (const k of Object.keys(before || {})) { if (before[k]) root.setProperty(k, before[k]); else root.removeProperty(k); }
  };
  hue.addEventListener("input", () => {
    const hh = Number(hue.value);
    hueVal.textContent = `${hh}°`;
    const vars = accentFor(hh);
    paintSwatches(vars);
    const root = document.documentElement.style;
    if (!before) { before = {}; for (const k of Object.keys(vars)) before[k] = root.getPropertyValue(k); }
    if (hh === BASE_HUE) restore();
    else for (const k of Object.keys(vars)) root.setProperty(k, vars[k]);
    if (!entries.has("accent") && hh !== BASE_HUE) {
      entries.set("accent", edits.record({ kind: "knob", label: T.knobs.accent, undo: () => { restore(); before = null; hue.value = String(BASE_HUE); hueVal.textContent = `${BASE_HUE}°`; paintSwatches(accentFor(BASE_HUE)); entries.delete("accent"); } }));
    }
  });
  const accentReset = btn(T.knobs.reset, () => { const e = entries.get("accent"); if (e) { e.undo(); edits.remove(e); } sync(); }, { "data-tone": "small", hint: T.hints.accentReset });
  el.appendChild(card({ eyebrow: T.knobs.title, title: T.knobs.accent, body: [
    h("div.wk-knob", h("label", { for: "v5-dev-hue" }, T.knobs.accentHue), hueVal, h("div.wk-hue", { aria: { hidden: "true" } }), hue),
    swatches,
    kv([["Variablen", mono("--acc --acc-text --acc-soft --acc-ring")]]),
    h("div.wk-toolbar", { style: { margin: "8px 0 0" } }, accentReset),
  ], why: T.knobs.accentWhy }));
  hue.id = "v5-dev-hue";

  /* ---- switches */
  function switchRow(id, label, why, apply, undo, extraSync) {
    const sw = h("button.wk-switch", { type: "button", role: "switch", id: "v5-dev-knob-" + id + "-sw", aria: { checked: "false", labelledby: "v5-dev-knob-" + id + "-l" } });
    sw.addEventListener("click", () => toggleKnob(id, sw.getAttribute("aria-checked") !== "true", apply, undo, label));
    const row = h("div.wk-knob", h("label", { id: "v5-dev-knob-" + id + "-l" }, label), sw, h("p.wk-hint", why));
    syncers.push(() => { sw.setAttribute("aria-checked", entries.has(id) ? "true" : "false"); if (extraSync) extraSync(entries.has(id)); });
    return row;
  }
  const syncers = [];
  function sync() { for (const f of syncers) f(); }

  const list = h("div");
  list.appendChild(switchRow("motion", T.knobs.motion, T.knobs.motionWhy, () => setStyle("motion", REDUCED_RULE), () => dropStyle("motion")));
  list.appendChild(switchRow("font", T.knobs.font, T.knobs.fontWhy, () => setStyle("font", FONT_RULE), () => dropStyle("font")));
  list.appendChild(switchRow("placeholders", T.knobs.placeholders, T.knobs.placeholdersWhy, () => W.layer.setPlaceholders(true), () => W.layer.setPlaceholders(false)));
  el.appendChild(card({ title: "Verhalten der Seite", body: list, why: T.knobs.why }));

  const offEdits = editBus.on("change", (n) => { if (n === 0) { entries.clear(); hue.value = String(BASE_HUE); hueVal.textContent = `${BASE_HUE}°`; paintSwatches(accentFor(BASE_HUE)); } sync(); });
  sync();

  return {
    el,
    dispose() {
      offEdits();
      /* Undo through the registry, so index.js's undoAll() afterwards finds nothing of ours to fire twice. */
      for (const e of Array.from(entries.values())) { try { e.undo(); } catch (err) { /* the rest still restores */ } edits.remove(e); }
      for (const id of Array.from(styles.keys())) dropStyle(id);
      restore(); before = null;   /* the page's own accent values come back, nothing is wiped */
      W.layer.setPlaceholders(false);
      entries.clear();
    },
  };
}

export { pill };
