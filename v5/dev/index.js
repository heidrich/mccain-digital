/* The workshop: any v5 page shown from the inside.
 *
 * Loaded by runtime.js (loadDev) when the visitor presses the switch, never
 * before. This module builds the drawer and the layer, mounts the views and
 * takes the switch over. Closing removes every node, listener, observer and
 * style the workshop added and puts the page back the way it was; the module
 * itself stays cached, so opening again costs no request.
 *
 * Two views: Röntgen (element, tree, code, measures, knobs) and Google & KI
 * (how crawlers and language models read the page). See
 * docs/plans/2026-09-16-dev-modus-design.md. */
import { T } from "./texte.js";
import { h, bus, isOwn, tabs, panel, btn, clear } from "./ui.js";
import { mountLayer } from "./highlight.js";
import { createPicker } from "./pick.js";
import { mountTree } from "./tree.js";
import { mountElement } from "./element.js";
import { mountCode } from "./code.js";
import { mountPerf } from "./perf.js";
import { mountKnobs } from "./knobs.js";
import { mountCrawler } from "./crawler.js";
import { edits, editBus } from "./edits.js";

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
  close,
};

let switchBtn = null, roentgenTabs = null, parts = {}, viewEls = {}, mounted = {}, cssReady = null;
let onKeyDown = null;

function loadCss() {
  if (cssReady) return cssReady;
  cssReady = new Promise((resolve) => {
    let link = document.getElementById("v5-dev-css");
    if (link && link.sheet) { resolve(); return; }
    if (!link) {
      link = h("link", { id: "v5-dev-css", rel: "stylesheet", href: "/v5/dev/dev.css" });
      document.head.appendChild(link);
    }
    link.addEventListener("load", () => resolve(), { once: true });
    link.addEventListener("error", () => resolve(), { once: true });
  });
  return cssReady;
}

function open() {
  if (W.root) return;
  W.layer = mountLayer();
  W.picker = createPicker(W, W.layer);

  const title = h("h2.wk-title", { tabindex: "-1" }, T.title);
  const closeBtn = h("button.wk-close", { type: "button", "data-action": "close", aria: { label: T.close }, title: T.close, onclick: close }, "×");
  const views = h("div.wk-views", { role: "tablist", aria: { label: "Sicht" } },
    h("button.wk-view-btn", { type: "button", role: "tab", "data-view-switch": "roentgen", aria: { selected: "true" }, onclick: () => setView("roentgen") }, T.views.roentgen),
    h("button.wk-view-btn", { type: "button", role: "tab", "data-view-switch": "crawler", aria: { selected: "false" }, onclick: () => setView("crawler") }, T.views.crawler));
  const head = h("header.wk-head", h("div.wk-eyebrow", T.brand), title, closeBtn, h("p.wk-intro", T.intro), views);

  /* Röntgen: tabs + panels, each part mounted when its tab is first shown. */
  const roentgen = h("section.wk-view", { "data-view": "roentgen" });
  const panels = {};
  const items = Object.keys(T.tabs).map((id) => ({ id, label: T.tabs[id] }));
  roentgenTabs = tabs(items, (id) => {
    for (const k of Object.keys(panels)) {
      const on = k === id;
      if (on && !mounted[k]) mountPart(k, panels[k]);
      if (panels[k].hidden === on) { panels[k].hidden = !on; if (parts[k]) { if (on && parts[k].show) parts[k].show(); if (!on && parts[k].hide) parts[k].hide(); } }
      else if (on && parts[k] && parts[k].show) parts[k].show();
    }
    body.scrollTop = 0;
  }, { "data-tabs": "roentgen" });
  const body = h("div.wk-body");
  for (const it of items) { panels[it.id] = panel(it.id, []); panels[it.id].hidden = true; }
  /* Picking is possible from every Röntgen tab, so its button sits beside the tabs. */
  const pickBtn = btn(T.pick.start, () => W.picker.toggle(), { "data-action": "pick", aria: { pressed: "false" } });
  W.bus.on("pick", (on) => { pickBtn.setAttribute("aria-pressed", on ? "true" : "false"); pickBtn.textContent = on ? T.pick.stop : T.pick.start; });
  roentgen.append(h("div.wk-tabsbar", roentgenTabs.el, pickBtn), body);
  for (const it of items) body.appendChild(panels[it.id]);

  const crawler = h("section.wk-view", { "data-view": "crawler", hidden: true });
  const crawlerBody = h("div.wk-body");
  crawler.appendChild(crawlerBody);
  viewEls = { roentgen, crawler, crawlerBody };

  const resetBtn = btn(T.resetAll, () => { edits.undoAll(); if (W.selected && !W.selected.isConnected) { W.selected = null; W.layer.setSelected(null); W.bus.emit("select", null); } else if (W.selected) W.bus.emit("select", W.selected); }, { "data-action": "reset-all", "data-tone": "ghost", title: T.resetAllHint, disabled: true });
  const foot = h("footer.wk-foot", h("span", T.nothingStored), resetBtn);
  editBus.on("change", (n) => { resetBtn.disabled = n === 0; resetBtn.textContent = n ? `${T.resetAll} (${n})` : T.resetAll; });

  W.root = h("aside", { id: "v5-dev", role: "dialog", "data-view": "roentgen", aria: { label: T.brand } }, head, roentgen, crawler, foot);
  document.body.appendChild(W.root);
  roentgenTabs.select("element");

  onKeyDown = (e) => {
    if (e.key !== "Escape") return;
    if (W.picker.active) return; /* the picker handles its own Escape first */
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
  }
  if (!part) return;
  parts[id] = part;
  clear(host);
  host.appendChild(part.el);
}

function setView(id) {
  if (!W.root) return;
  W.view = id;
  W.root.dataset.view = id;
  for (const b of W.root.querySelectorAll("[data-view-switch]")) b.setAttribute("aria-selected", b.dataset.viewSwitch === id ? "true" : "false");
  viewEls.roentgen.hidden = id !== "roentgen";
  viewEls.crawler.hidden = id !== "crawler";
  if (id === "crawler" && !mounted.crawler) mountPart("crawler", viewEls.crawlerBody);
  if (id === "crawler" && W.picker.active) W.picker.stop();
  const cur = roentgenTabs && roentgenTabs.current;
  if (id !== "roentgen" && parts[cur] && parts[cur].hide) parts[cur].hide();
  if (id === "roentgen" && parts[cur] && parts[cur].show) parts[cur].show();
}

function close() {
  if (!W.root) return;
  document.removeEventListener("keydown", onKeyDown);
  W.picker.dispose();
  for (const k of Object.keys(parts)) { try { parts[k].dispose(); } catch (e) { /* the rest still closes */ } }
  edits.undoAll();
  W.layer.dispose();
  W.root.remove();
  W.root = null; W.layer = null; W.picker = null; W.selected = null;
  parts = {}; mounted = {}; viewEls = {}; roentgenTabs = null;
  W.bus.clear();
  document.documentElement.classList.remove("v5-dev-pick");
  if (switchBtn) { switchBtn.setAttribute("aria-expanded", "false"); switchBtn.focus({ preventScroll: true }); }
}

function toggle() { if (W.root) close(); else loadCss().then(open); }

/* Boot: take the switch over and open, because the visitor just pressed it.
 * The band's button (data-v5-dev-open) keeps working after the module is here. */
switchBtn = document.querySelector("[data-v5-dev-switch]");
if (switchBtn) {
  switchBtn.addEventListener("click", toggle);
  switchBtn.setAttribute("data-state", "ready");
}
document.addEventListener("click", (e) => {
  if (e.target.closest && e.target.closest("[data-v5-dev-open]") && !W.root) loadCss().then(open);
});
loadCss().then(open);
