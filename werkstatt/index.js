/* The workshop: any page shown from the inside.
 *
 * Loaded by runtime.js (loadDev) when the visitor presses the switch, never
 * before. This module builds the console and the layer, mounts the views and
 * takes the switch over. Closing removes every node, listener, observer and
 * style the workshop added and puts the page back the way it was; the module
 * itself stays cached, so opening again costs no request.
 *
 * Since 17.9.2026 the workshop is a console (owner: the drawer hid the code
 * and the switch went under): docked to the bottom by default, full width,
 * sized by its grip up to the whole viewport, or docked to the right; below
 * 960 px always the bottom sheet. Three views: Röntgen (element, tree, code,
 * measures, knobs), Google & KI (how crawlers and language models read the
 * page) and Fragen (Claude, with the workshop's facts). A lead line says
 * what the current tab shows, the status line in the foot says what just
 * happened or what the hovered button does. See
 * docs/plans/2026-09-16-dev-modus-design.md. */
import { T } from "./texte.js";
import { h, bus, isOwn, tabs, panel, btn, clear, rich, closeTerm, placeTerm, shortLabel } from "./ui.js";
import { mountLayer } from "./highlight.js";
import { createPicker } from "./pick.js";
import { mountTree } from "./tree.js";
import { mountElement } from "./element.js";
import { mountCode } from "./code.js";
import { mountPerf } from "./perf.js";
import { mountKnobs } from "./knobs.js";
import { mountCrawler } from "./crawler.js";
import { mountAsk } from "./ask.js";
import { edits, editBus } from "./edits.js";

const BREAK = 960;                 /* below: always the bottom sheet, no dock choice */
const MIN_H = 220, MIN_W = 360, DEFAULT_W = 480, RIGHT_GUTTER = 80;  /* 220: head, lead and foot take ~120, the body keeps ~100 */
const FLOAT_W = 760, FLOAT_H = 520, FLOAT_MIN_H = 240, FLOAT_MARGIN = 8;
/* 42 % of the viewport on a desktop, 55 % on a phone, where the head wraps onto two rows. */
const defaultH = () => Math.round(innerHeight * (innerWidth < BREAK ? 0.55 : 0.42));

/* The console's shape for this page visit: module state, so it survives
 * close and reopen but never a reload. The workshop promises to store
 * nothing, and localStorage would be storing. `?tools=rechts` (the older `?werkstatt=` still works) starts
 * docked right, `?tools=fragen` / `=google` on that view (for showing). */
let dockPref = null, sizeBottom = null, sizeRight = DEFAULT_W;
let floatX = null, floatY = null, floatW = FLOAT_W, floatH = FLOAT_H;
let firstView = "roentgen";
{
  const m = /[?&](?:tools|werkstatt)=([^&#]*)/.exec(location.search);
  const arg = m ? decodeURIComponent(m[1]).toLowerCase() : "";
  if (/rechts|right/.test(arg)) dockPref = "right";
  else if (/unten|bottom/.test(arg)) dockPref = "bottom";
  else if (/fenster|float/.test(arg)) dockPref = "float";
  if (/fragen|ask/.test(arg)) firstView = "ask";
  else if (/google|crawler/.test(arg)) firstView = "crawler";
}

const W = {
  bus: bus(),
  selected: null,
  root: null,
  layer: null,
  picker: null,
  view: "roentgen",
  isOwn,
  select(el) {
    if (!el || isOwn(el) || el.nodeType !== 1) return;
    W.selected = el;
    W.layer.setSelected(el);
    W.setView("roentgen");
    W.setTab("element");
    W.status(`${shortLabel(el, 2)} gewählt`);
    W.bus.emit("select", el);
  },
  hover(el) { W.layer.setHover(el && !isOwn(el) ? el : null); },
  setTab(id) { if (roentgenTabs) roentgenTabs.select(id); },
  setView(id) { setView(id); },
  /* "Im Code" from the element panel. The Code part mounts when its tab is
   * first shown (setTab → mountPart), so this works before the tab was ever
   * visited and again after close and reopen - until 17.9.2026 the method
   * only existed once the tab had been opened, and the button threw. */
  showCode(fileId, symbol, section) { W.setTab("code"); if (parts.code) parts.code.showCode(fileId, symbol, section); },
  /* The status line: the last thing that happened. A hovered or focused
   * [data-hint] shows its hint instead, and the text comes back after. */
  status(text) { statusText = String(text || ""); if (statusEl && !statusEl.hasAttribute("data-hint")) statusEl.textContent = statusText; },
  close,
};

let switchBtn = null, roentgenTabs = null, parts = {}, viewEls = {}, mounted = {}, cssReady = null;
let onKeyDown = null, onResize = null;
let statusEl = null, statusText = T.status.ready, leadEl = null, tabsbar = null, grip = null, dockBtns = {}, keysEl = null, titleEl = null;

function loadCss() {
  if (cssReady) return cssReady;
  cssReady = new Promise((resolve) => {
    let link = document.getElementById("v5-dev-css");
    if (link && link.sheet) { resolve(); return; }
    if (!link) {
      link = h("link", { id: "v5-dev-css", rel: "stylesheet", href: "/werkstatt/dev.css" });
      document.head.appendChild(link);
    }
    link.addEventListener("load", () => resolve(), { once: true });
    link.addEventListener("error", () => resolve(), { once: true });
  });
  return cssReady;
}

/* ---- dock and size ------------------------------------------------------ */
/* float (the default since the owner's 17.9. evening call), bottom or right;
 * a phone (below 960 px) is always the bottom sheet. */
function currentDock() { return innerWidth < BREAK ? "bottom" : dockPref || "float"; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function maxH() { return innerHeight; }
function maxW() { return Math.max(MIN_W, innerWidth - RIGHT_GUTTER); }

/* Writes dock, size and the scroll padding that keeps "Auf der Seite zeigen"
 * from landing under the console. Called on open, on every grip move, on a
 * dock change and on window resize. */
function applyShape() {
  const root = W.root;
  if (!root) return;
  const dock = currentDock();
  root.dataset.dock = dock;
  const de = document.documentElement;
  if (dock === "float") {
    /* A free window: position and size clamped into the viewport and written
     * back, so a drag past the edge or a smaller window after resize never
     * leaves the console out of reach. */
    const w = clamp(floatW, MIN_W, innerWidth - 2 * FLOAT_MARGIN);
    const hh = clamp(floatH, FLOAT_MIN_H, innerHeight - 2 * FLOAT_MARGIN);
    const x = clamp(floatX === null ? innerWidth - w - 24 : floatX, FLOAT_MARGIN, innerWidth - w - FLOAT_MARGIN);
    const y = clamp(floatY === null ? innerHeight - hh - 24 : floatY, FLOAT_MARGIN, innerHeight - hh - FLOAT_MARGIN);
    floatW = w; floatH = hh; floatX = x; floatY = y;
    root.style.setProperty("--wk-w", `${w}px`);
    root.style.setProperty("--wk-h", `${hh}px`);
    root.style.setProperty("--wk-x", `${x}px`);
    root.style.setProperty("--wk-y", `${y}px`);
    de.style.scrollPaddingBottom = "";
    de.style.scrollPaddingRight = "";
    grip.setAttribute("aria-orientation", "horizontal");
    grip.setAttribute("aria-valuemin", String(FLOAT_MIN_H));
    grip.setAttribute("aria-valuemax", String(innerHeight - 2 * FLOAT_MARGIN));
    grip.setAttribute("aria-valuenow", String(hh));
  } else if (dock === "bottom") {
    const hh = clamp(sizeBottom === null ? defaultH() : sizeBottom, MIN_H, maxH());
    root.style.setProperty("--wk-h", `${hh}px`);
    root.style.removeProperty("--wk-w");
    de.style.scrollPaddingBottom = `${hh}px`;
    de.style.scrollPaddingRight = "";
    grip.setAttribute("aria-orientation", "horizontal");
    grip.setAttribute("aria-valuemin", String(MIN_H));
    grip.setAttribute("aria-valuemax", String(maxH()));
    grip.setAttribute("aria-valuenow", String(hh));
  } else {
    const ww = clamp(sizeRight, MIN_W, maxW());
    root.style.setProperty("--wk-w", `${ww}px`);
    root.style.removeProperty("--wk-h");
    de.style.scrollPaddingRight = `${ww}px`;
    de.style.scrollPaddingBottom = "";
    grip.setAttribute("aria-orientation", "vertical");
    grip.setAttribute("aria-valuemin", String(MIN_W));
    grip.setAttribute("aria-valuemax", String(maxW()));
    grip.setAttribute("aria-valuenow", String(ww));
  }
  if (dock !== "float") { root.style.removeProperty("--wk-x"); root.style.removeProperty("--wk-y"); }
  for (const k of Object.keys(dockBtns)) dockBtns[k].setAttribute("aria-pressed", k === dock ? "true" : "false");
  if (keysEl) keysEl.textContent = dock === "float" ? T.keysFloat : T.keys;
  placeTerm();  /* an open glossary card follows the console through resize, grip and window handles */
  if (titleEl) {
    /* In the window the title is the keyboard handle and says so; docked, it is only where focus lands on open. */
    titleEl.tabIndex = dock === "float" ? 0 : -1;
    if (dock === "float") { titleEl.setAttribute("data-hint", T.dock.moveHint); titleEl.setAttribute("title", T.dock.moveHint); }
    else { titleEl.removeAttribute("data-hint"); titleEl.removeAttribute("title"); }
  }
}
function floatStatus() { return T.status.moved(floatX, floatY, floatW, floatH); }
function sizeStatus() {
  const dock = currentDock();
  if (dock === "float") return floatStatus();
  if (dock === "bottom") { const v = Number(grip.getAttribute("aria-valuenow")); return T.status.size(v, v >= maxH() - 1, "h"); }
  const v = Number(grip.getAttribute("aria-valuenow"));
  return T.status.size(v, v >= maxW() - 1, "w");
}
function setDock(which) {
  if (innerWidth < BREAK) return;
  dockPref = which;
  applyShape();
  W.status(T.status.docked(which));
}
function toggleFull() {
  if (currentDock() === "float") { const full = floatW >= innerWidth - 2 * FLOAT_MARGIN - 1 && floatH >= innerHeight - 2 * FLOAT_MARGIN - 1; floatW = full ? FLOAT_W : innerWidth; floatH = full ? FLOAT_H : innerHeight; if (full) { floatX = null; floatY = null; } applyShape(); W.status(floatStatus()); return; }
  if (currentDock() === "bottom") sizeBottom = Number(grip.getAttribute("aria-valuenow")) >= maxH() - 1 ? defaultH() : maxH();
  else sizeRight = Number(grip.getAttribute("aria-valuenow")) >= maxW() - 1 ? DEFAULT_W : maxW();
  applyShape();
  W.status(sizeStatus());
}
function makeGrip() {
  const g = h("div.wk-grip", { role: "separator", tabindex: "0", aria: { label: T.dock.grip }, hint: T.dock.gripHint }, h("i"));
  /* A second press within 400 ms is the double-tap for full size and back.
   * Done by hand: the drag cancels pointerdown, which keeps the browser's
   * own dblclick from ever firing here. */
  let lastDown = 0;
  g.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || !W.root) return;
    e.preventDefault();
    const now = Date.now();
    if (now - lastDown < 400) { lastDown = 0; toggleFull(); return; }
    lastDown = now;
    const dock = currentDock();
    g.setPointerCapture(e.pointerId);
    W.root.setAttribute("data-resizing", "");
    document.documentElement.setAttribute("data-wk-resizing", dock);
    const move = (ev) => {
      if (dock === "bottom") sizeBottom = innerHeight - ev.clientY;
      else if (dock === "right") sizeRight = innerWidth - ev.clientX;
      else floatH = ev.clientY - floatY;
      applyShape();
    };
    const up = () => {
      g.removeEventListener("pointermove", move);
      g.removeEventListener("pointerup", up);
      g.removeEventListener("pointercancel", up);
      if (W.root) W.root.removeAttribute("data-resizing");
      document.documentElement.removeAttribute("data-wk-resizing");
      W.status(sizeStatus());
    };
    g.addEventListener("pointermove", move);
    g.addEventListener("pointerup", up);
    g.addEventListener("pointercancel", up);
  });
  g.addEventListener("keydown", (e) => {
    const dock = currentDock(), step = e.shiftKey ? 120 : 40;
    if (dock === "float") return;   /* the window has its own handles; the grip is hidden there */
    let handled = true;
    if (dock === "bottom") {
      const cur = Number(g.getAttribute("aria-valuenow"));
      if (e.key === "ArrowUp") sizeBottom = cur + step;
      else if (e.key === "ArrowDown") sizeBottom = cur - step;
      else if (e.key === "Home") sizeBottom = maxH();
      else if (e.key === "End") sizeBottom = MIN_H;
      else handled = false;
    } else {
      const cur = Number(g.getAttribute("aria-valuenow"));
      if (e.key === "ArrowLeft") sizeRight = cur + step;
      else if (e.key === "ArrowRight") sizeRight = cur - step;
      else if (e.key === "Home") sizeRight = maxW();
      else if (e.key === "End") sizeRight = MIN_W;
      else handled = false;
    }
    if (e.key === "Enter" || e.key === " ") { toggleFull(); e.preventDefault(); return; }
    if (!handled) return;
    e.preventDefault();
    applyShape();
    W.status(sizeStatus());
  });
  return g;
}

/* The free window's own handles: the head moves it, the right edge, the
 * bottom edge and the corner resize it. Pointer capture keeps a fast drag
 * from losing the handle; the html attribute carries the cursor meanwhile. */
function dragOn(el, edge, onStart, onMove) {
  el.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || !W.root || currentDock() !== "float") return;
    if (edge === "move" && e.target.closest && e.target.closest("button, [role=tab], input, select, textarea, a")) return;
    e.preventDefault();
    const start = onStart(e);
    el.setPointerCapture(e.pointerId);
    W.root.setAttribute("data-resizing", "");
    document.documentElement.setAttribute("data-wk-resizing", edge);
    const move = (ev) => { onMove(ev, start); applyShape(); };
    const up = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      if (W.root) W.root.removeAttribute("data-resizing");
      document.documentElement.removeAttribute("data-wk-resizing");
      W.status(floatStatus());
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  });
}
function makeFloatHandles(head, title, lead) {
  /* The head and the lead line both move the window: the head is dense with
   * controls, the lead is a whole free row. */
  const moveStart = (e) => ({ dx: e.clientX - floatX, dy: e.clientY - floatY });
  const moveTo = (ev, s) => { floatX = ev.clientX - s.dx; floatY = ev.clientY - s.dy; };
  dragOn(head, "move", moveStart, moveTo);
  dragOn(lead, "move", moveStart, moveTo);
  const handle = (edge) => {
    const el = h("div.wk-rs", { "data-edge": edge, aria: { hidden: "true" } });
    dragOn(el, edge, (e) => ({ x: e.clientX, y: e.clientY, w: floatW, h: floatH }), (ev, s) => {
      if (edge !== "s") floatW = s.w + ev.clientX - s.x;
      if (edge !== "e") floatH = s.h + ev.clientY - s.y;
    });
    return el;
  };
  /* Keyboard on the title: arrows move by 24 px, Shift + arrows resize, Home resets, Enter full and back. */
  title.addEventListener("keydown", (e) => {
    if (currentDock() !== "float") return;
    const step = 24;
    let handled = true;
    if (e.key === "ArrowLeft") { if (e.shiftKey) floatW -= step; else floatX -= step; }
    else if (e.key === "ArrowRight") { if (e.shiftKey) floatW += step; else floatX += step; }
    else if (e.key === "ArrowUp") { if (e.shiftKey) floatH -= step; else floatY -= step; }
    else if (e.key === "ArrowDown") { if (e.shiftKey) floatH += step; else floatY += step; }
    else if (e.key === "Home") { floatX = null; floatY = null; floatW = FLOAT_W; floatH = FLOAT_H; }
    else if (e.key === "Enter") { toggleFull(); return; }
    else handled = false;
    if (!handled) return;
    e.preventDefault();
    applyShape();
    W.status(floatStatus());
  });
  return [handle("e"), handle("s"), handle("se")];
}

/* ---- open ---------------------------------------------------------------- */
function setLead(text) { if (leadEl) { clear(leadEl); if (text) leadEl.appendChild(rich(text)); } }

function open() {
  if (W.root) return;
  W.layer = mountLayer();
  W.picker = createPicker(W, W.layer);

  /* Head: brand, the three views, the Röntgen tabs with the pick button, the tools. */
  const title = h("h2.wk-title", { tabindex: "-1" }, T.brand);
  titleEl = title;
  const viewBtn = (id, label, hint) => h("button.wk-view-btn", { type: "button", role: "tab", "data-view-switch": id, aria: { selected: id === "roentgen" ? "true" : "false" }, hint, onclick: () => setView(id) }, label);
  const views = h("div.wk-views", { role: "tablist", aria: { label: "Sicht" } },
    viewBtn("roentgen", T.views.roentgen, T.hints.viewRoentgen),
    viewBtn("crawler", T.views.crawler, T.hints.viewCrawler),
    viewBtn("ask", T.ask.view, T.hints.viewAsk));

  const panels = {};
  const items = Object.keys(T.tabs).map((id) => ({ id, label: T.tabs[id] }));  /* the lead line explains the tab; a hint would only repeat it */
  roentgenTabs = tabs(items, (id) => {
    for (const k of Object.keys(panels)) {
      const on = k === id;
      if (on && !mounted[k]) mountPart(k, panels[k]);
      if (panels[k].hidden === on) { panels[k].hidden = !on; if (parts[k]) { if (on && parts[k].show) parts[k].show(); if (!on && parts[k].hide) parts[k].hide(); } }
      else if (on && parts[k] && parts[k].show) parts[k].show();
    }
    body.scrollTop = 0;
    closeTerm();
    if (W.view === "roentgen") setLead(T.leads[id]);
  }, { "data-tabs": "roentgen" });
  const body = h("div.wk-body");
  for (const it of items) { panels[it.id] = panel(it.id, []); panels[it.id].hidden = true; }
  /* Picking is possible from every Röntgen tab, so its button sits beside the tabs. */
  /* On opening, the button beats four times in the brand gradient like the tab
   * did (owner 17.9.); the ring goes at animationend or as soon as picking starts. */
  const pickBtn = btn(T.pick.start, () => W.picker.toggle(), { "data-action": "pick", aria: { pressed: "false" }, hint: T.hints.pick });
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) pickBtn.setAttribute("data-pulse", "");
  pickBtn.addEventListener("animationend", (e) => { if (e.pseudoElement === "::after") pickBtn.removeAttribute("data-pulse"); });
  W.bus.on("pick", (on) => {
    pickBtn.setAttribute("aria-pressed", on ? "true" : "false");
    if (on) pickBtn.removeAttribute("data-pulse");
    pickBtn.textContent = on ? T.pick.stop : T.pick.start;
    W.status(on ? T.status.picking : T.status.pickStopped);
  });
  /* "Wählen" leads the tab row (owner 17.9.: pushed to the far right it looked detached). */
  tabsbar = h("div.wk-tabsbar", pickBtn, roentgenTabs.el);

  const dockBtn = (which, label, hint) => h("button.wk-tool", { type: "button", "data-dock-to": which, aria: { pressed: "false" }, hint, onclick: () => setDock(which) }, label);
  dockBtns = { bottom: dockBtn("bottom", T.dock.bottom, T.dock.bottomHint), right: dockBtn("right", T.dock.right, T.dock.rightHint), float: dockBtn("float", T.dock.float, T.dock.floatHint) };
  const closeBtn = h("button.wk-close", { type: "button", "data-action": "close", aria: { label: T.close }, hint: T.dock.closeHint, onclick: close }, "×");
  const tools = h("div.wk-tools", dockBtns.bottom, dockBtns.right, dockBtns.float, closeBtn);
  const head = h("header.wk-head", title, views, tabsbar, tools);
  leadEl = h("p.wk-lead");
  const floatHandles = makeFloatHandles(head, title, leadEl);

  const roentgen = h("section.wk-view", { "data-view": "roentgen" }, body);
  for (const it of items) body.appendChild(panels[it.id]);
  const crawlerBody = h("div.wk-body");
  const crawler = h("section.wk-view", { "data-view": "crawler", hidden: true }, crawlerBody);
  const askBody = h("div.wk-body");
  const ask = h("section.wk-view", { "data-view": "ask", hidden: true }, askBody);
  viewEls = { roentgen, crawler, crawlerBody, ask, askBody };

  /* Foot: the status line, the key hints, the reset. */
  statusEl = h("span.wk-status", { role: "status", "aria-live": "polite" }, statusText);
  const resetBtn = btn(T.resetAll, () => { edits.undoAll(); if (W.selected && !W.selected.isConnected) { W.selected = null; W.layer.setSelected(null); W.bus.emit("select", null); } else if (W.selected) W.bus.emit("select", W.selected); }, { "data-action": "reset-all", "data-tone": "ghost", hint: T.hints.resetAll, disabled: true });
  keysEl = h("span.wk-keys", T.keys);
  /* The promise stays in sight, not only as the idle status (review 17.9.). */
  const foot = h("footer.wk-foot", statusEl, h("span.wk-promise", T.nothingStored), keysEl, resetBtn);
  editBus.on("change", (n) => { resetBtn.disabled = n === 0; resetBtn.textContent = n ? `${T.resetAll} (${n})` : T.resetAll; W.status(T.status.edits(n)); });

  grip = makeGrip();
  /* data-motion-keep: the page's motion budget (motion-budget.js) pauses loops it
   * has not seen on screen; the console is opened by hand and always on screen. */
  W.root = h("aside", { id: "v5-dev", role: "dialog", "data-view": "roentgen", "data-motion-keep": "", aria: { label: T.brand } }, grip, head, leadEl, roentgen, crawler, ask, foot, floatHandles);
  document.body.appendChild(W.root);
  applyShape();
  onResize = () => applyShape();
  window.addEventListener("resize", onResize);

  /* Hints: whatever [data-hint] is under the pointer or has focus speaks in the status line. */
  const hintIn = (e) => {
    const t = e.target && e.target.closest ? e.target.closest("[data-hint]") : null;
    if (!t || !W.root || !W.root.contains(t)) return;
    statusEl.setAttribute("data-hint", "");
    statusEl.textContent = t.getAttribute("data-hint");
  };
  const hintOut = (e) => {
    const t = e.target && e.target.closest ? e.target.closest("[data-hint]") : null;
    if (!t) return;
    if (e.relatedTarget && t.contains(e.relatedTarget)) return;
    statusEl.removeAttribute("data-hint");
    statusEl.textContent = statusText;
  };
  W.root.addEventListener("mouseover", hintIn);
  W.root.addEventListener("mouseout", hintOut);
  W.root.addEventListener("focusin", hintIn);
  W.root.addEventListener("focusout", hintOut);
  W.root.addEventListener("scroll", () => placeTerm(), true);  /* the glossary card follows its term, see placeTerm() */
  /* Code boxes scroll only once clicked into (owner 17.9.): until then a
   * wheel over a box moves the console body, so a long file never traps the
   * scroll. A click anywhere else hands the wheel back to the body. */
  const activateBox = (t) => {
    const box = t && t.closest ? t.closest(".wk-code, .wk-pre") : null;
    for (const b of W.root.querySelectorAll(".wk-code[data-active], .wk-pre[data-active]")) if (b !== box) b.removeAttribute("data-active");
    if (box) box.setAttribute("data-active", "");
  };
  W.root.addEventListener("pointerdown", (e) => activateBox(e.target));
  W.root.addEventListener("focusin", (e) => { if (e.target.closest && e.target.closest(".wk-code, .wk-pre")) activateBox(e.target); });

  roentgenTabs.select("element");
  if (firstView !== "roentgen") { setView(firstView); firstView = "roentgen"; }
  else W.status(T.status.ready);

  onKeyDown = (e) => {
    if (e.key !== "Escape") return;
    if (closeTerm()) { e.preventDefault(); return; }   /* a glossary card closes first */
    if (W.picker.active) return;                      /* the picker handles its own Escape */
    const t = e.target;
    if (t && W.root.contains(t) && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) { t.blur(); return; }
    e.preventDefault();
    close();
  };
  document.addEventListener("keydown", onKeyDown);

  if (switchBtn) { switchBtn.setAttribute("aria-expanded", "true"); switchBtn.setAttribute("data-state", "ready"); }
  requestAnimationFrame(() => title.focus({ preventScroll: true }));
}

function mountPart(id, host) {
  mounted[id] = true;
  let part = null;
  switch (id) {
    case "element": part = mountElement(W); break;
    case "tree": part = mountTree(W); break;
    case "code": part = mountCode(W); break;
    case "perf": part = mountPerf(W); break;
    case "knobs": part = mountKnobs(W); break;
    case "crawler": part = mountCrawler(W); break;
    case "ask": part = mountAsk(W); break;
  }
  if (!part) return;
  parts[id] = part;
  clear(host);
  host.appendChild(part.el);
}

function setView(id) {
  if (!W.root) return;
  closeTerm();
  W.view = id;
  W.root.dataset.view = id;
  for (const b of W.root.querySelectorAll("[data-view-switch]")) b.setAttribute("aria-selected", b.dataset.viewSwitch === id ? "true" : "false");
  viewEls.roentgen.hidden = id !== "roentgen";
  viewEls.crawler.hidden = id !== "crawler";
  viewEls.ask.hidden = id !== "ask";
  tabsbar.hidden = id !== "roentgen";
  if (id === "crawler" && !mounted.crawler) mountPart("crawler", viewEls.crawlerBody);
  if (id === "ask" && !mounted.ask) mountPart("ask", viewEls.askBody);
  if (id !== "roentgen" && W.picker.active) W.picker.stop();
  const cur = roentgenTabs && roentgenTabs.current;
  if (id !== "roentgen" && parts[cur] && parts[cur].hide) parts[cur].hide();
  if (id === "roentgen" && parts[cur] && parts[cur].show) parts[cur].show();
  if (id !== "roentgen" && parts[id] && parts[id].show) parts[id].show();
  setLead(id === "roentgen" ? T.leads[cur] : T.leads[id]);
  W.status(T.status.view[id]);
}

function close() {
  if (!W.root) return;
  closeTerm();
  document.removeEventListener("keydown", onKeyDown);
  window.removeEventListener("resize", onResize);
  W.picker.dispose();
  for (const k of Object.keys(parts)) { try { parts[k].dispose(); } catch (e) { /* the rest still closes */ } }
  edits.undoAll();
  W.layer.dispose();
  W.root.remove();
  W.root = null; W.layer = null; W.picker = null; W.selected = null;
  parts = {}; mounted = {}; viewEls = {}; roentgenTabs = null;
  statusEl = null; leadEl = null; tabsbar = null; grip = null; dockBtns = {}; keysEl = null; titleEl = null;
  statusText = T.status.ready;
  W.bus.clear();
  const de = document.documentElement;
  de.classList.remove("v5-dev-pick");
  de.style.scrollPaddingBottom = "";
  de.style.scrollPaddingRight = "";
  de.removeAttribute("data-wk-resizing");
  if (!de.getAttribute("style")) de.removeAttribute("style");
  /* aria-expanded=false brings the tab back (it is display:none while open), then it takes the focus. */
  if (switchBtn) { switchBtn.setAttribute("aria-expanded", "false"); switchBtn.focus({ preventScroll: true }); }
}

function toggle() { if (W.root) close(); else loadCss().then(open); }

/* Boot: take the switch over and open, because the visitor just pressed it.
 * The band's button (data-v5-dev-open) keeps working after the module is here. */
switchBtn = document.querySelector("[data-v5-dev-switch]");
/* The console speaks the page's language (T picks by html[lang], texte.js).
 * When the visitor switches while the console is open it is rebuilt in the
 * new language on the same view and dock; the tab's title follows as well. */
const langWatch = new MutationObserver(() => {
  if (switchBtn) switchBtn.title = `${T.brand}: ${T.title}`;
  if (!W.root) return;
  const view = W.view;
  close();
  open();
  if (view && view !== "roentgen") setView(view);
});
langWatch.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
if (switchBtn) {
  switchBtn.addEventListener("click", toggle);
  switchBtn.setAttribute("data-state", "ready");
}
document.addEventListener("click", (e) => {
  if (e.target.closest && e.target.closest("[data-v5-dev-open]") && !W.root) loadCss().then(open);
});
loadCss().then(open);
