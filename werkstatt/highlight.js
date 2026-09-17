/* The layer over the page: highlight boxes, the lens, the placeholder outlines.
 *
 * One fixed, pointer-transparent element holds everything the workshop draws
 * on top of the page. Positions are viewport coordinates from
 * getBoundingClientRect, refreshed in one requestAnimationFrame per scroll or
 * resize - never inside the event itself, and never for more than the handful
 * of elements that are actually shown. */
import { h, clear, shortLabel, isOwn } from "./ui.js";

const LENS_R = 150;
const LENS_MAX_DESCENDANTS = 90;

export function mountLayer() {
  const el = h("div", { id: "v5-dev-layer", aria: { hidden: "true" } });
  const lens = h("div.wk-lens", { hidden: true });
  const ring = h("div.wk-lens-ring", { hidden: true });
  const hover = h("div.wk-hl", { "data-kind": "hover" });
  const selected = h("div.wk-hl", { "data-kind": "selected" });
  const flashes = h("div");
  const placeholders = h("div", { hidden: true });
  el.append(lens, placeholders, selected, hover, flashes, ring);
  document.body.appendChild(el);

  let hoverEl = null, selectedEl = null, lensEl = null, phOn = false;
  let raf = 0;

  function boxes(target, kind, container) {
    clear(container);
    if (!target || target.nodeType !== 1 || !target.isConnected) return;
    const r = target.getBoundingClientRect();
    if (kind !== "flash" && r.width === 0 && r.height === 0) return;
    const cs = getComputedStyle(target);
    const num = (v) => parseFloat(v) || 0;
    const m = { t: num(cs.marginTop), r: num(cs.marginRight), b: num(cs.marginBottom), l: num(cs.marginLeft) };
    const b = { t: num(cs.borderTopWidth), r: num(cs.borderRightWidth), b: num(cs.borderBottomWidth), l: num(cs.borderLeftWidth) };
    const p = { t: num(cs.paddingTop), r: num(cs.paddingRight), b: num(cs.paddingBottom), l: num(cs.paddingLeft) };
    const place = (node, x, y, w, ww) => {
      node.style.left = x + "px"; node.style.top = y + "px"; node.style.width = Math.max(0, w) + "px"; node.style.height = Math.max(0, ww) + "px";
      return node;
    };
    /* Negative margins draw nothing: the margin area is only shown where it adds space. */
    const mt = Math.max(0, m.t), mr = Math.max(0, m.r), mb = Math.max(0, m.b), ml = Math.max(0, m.l);
    container.append(
      place(h("div.hl-m"), r.left - ml, r.top - mt, r.width + ml + mr, r.height + mt + mb),
      place(h("div.hl-b"), r.left, r.top, r.width, r.height),
      place(h("div.hl-c"), r.left + b.l + p.l, r.top + b.t + p.t, r.width - b.l - b.r - p.l - p.r, r.height - b.t - b.b - p.t - p.b)
    );
    if (kind === "flash") return;
    const tag = h("div.wk-tag", shortLabel(target, 2), h("b", `${Math.round(r.width)}×${Math.round(r.height)}`));
    const skipped = isSkipped(target);
    if (skipped) tag.appendChild(h("i", " · übersprungen"));
    container.appendChild(tag);
    /* Above the box when there is room, else inside its top-left corner. */
    const tagH = 22;
    const top = r.top - tagH - 4 >= 0 ? r.top - tagH - 4 : Math.max(4, r.top + 4);
    tag.style.top = top + "px";
    tag.style.left = Math.max(4, Math.min(r.left, window.innerWidth - 260)) + "px";
  }

  /* A block is skipped when none of its children is rendered; the block's own
   * box exists either way (it is the placeholder), so the children decide. */
  function isSkipped(target) {
    if (typeof target.checkVisibility !== "function") return false;
    const block = target.closest("[data-cv]");
    if (!block) return false;
    try { return !Array.prototype.some.call(block.children, (c) => c.checkVisibility({ contentVisibilityAuto: true })); } catch (e) { return false; }
  }

  function refresh() {
    raf = 0;
    boxes(hoverEl, "hover", hover);
    boxes(selectedEl, "selected", selected);
    if (lensEl) blueprint(lensEl);
    if (phOn) drawPlaceholders();
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(refresh); }

  /* The blueprint under the lens: the element, its ancestors up to the
   * section, and its first descendants. Built when the element changes, moved
   * with CSS variables when only the pointer moves. */
  function blueprint(target) {
    clear(lens);
    if (!target || !target.isConnected) return;
    const add = (node, lvl) => {
      const r = node.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;
      if (r.bottom < 0 || r.top > window.innerHeight || r.right < 0 || r.left > window.innerWidth) return;
      const bp = h("div.wk-bp", { "data-lvl": lvl });
      bp.style.left = r.left + "px"; bp.style.top = r.top + "px"; bp.style.width = r.width + "px"; bp.style.height = r.height + "px";
      if (r.width > 44 && r.height > 12) bp.appendChild(h("span.wk-bp-tag", shortLabel(node, 1)));
      lens.appendChild(bp);
    };
    const ups = [];
    for (let n = target.parentElement; n && n !== document.body && !n.matches("#dc-root, .sc-host, #top"); n = n.parentElement) ups.push(n);
    ups.reverse().forEach((n) => add(n, "up"));
    add(target, "self");
    const downs = target.querySelectorAll("*");
    for (let i = 0, k = 0; i < downs.length && k < LENS_MAX_DESCENDANTS; i++) {
      if (isOwn(downs[i])) continue;
      add(downs[i], "down");
      k++;
    }
  }

  function drawPlaceholders() {
    clear(placeholders);
    document.querySelectorAll("[data-cv]").forEach((block) => {
      const r = block.getBoundingClientRect();
      if (r.bottom < -20 || r.top > window.innerHeight + 20) return;
      let skipped = false;
      try { skipped = !Array.prototype.some.call(block.children, (c) => c.checkVisibility({ contentVisibilityAuto: true })); } catch (e) { skipped = false; }
      const ph = h("div.wk-ph", { "data-skipped": skipped ? "" : null });
      ph.style.left = r.left + "px"; ph.style.top = r.top + "px"; ph.style.width = r.width + "px"; ph.style.height = r.height + "px";
      const cis = getComputedStyle(block).containIntrinsicSize || "";
      const label = block.getAttribute("data-screen-label") || block.id || block.dataset.cv;
      ph.appendChild(h("div.wk-tag", `${block.dataset.cv} · ${label}`, h("b", skipped ? "übersprungen" : "gerendert"), h("i", cis ? ` · Platzhalter ${cis.replace("auto ", "")}` : "")));
      placeholders.appendChild(ph);
    });
  }

  const onScroll = () => schedule();
  window.addEventListener("scroll", onScroll, { passive: true, capture: true });
  window.addEventListener("resize", onScroll, { passive: true });
  document.addEventListener("contentvisibilityautostatechange", onScroll, true);

  return {
    el,
    setHover(target) { hoverEl = target && !isOwn(target) ? target : null; schedule(); },
    setSelected(target) { selectedEl = target && !isOwn(target) ? target : null; schedule(); },
    showLens(x, y, target) {
      lens.hidden = false; ring.hidden = false;
      el.style.setProperty("--x", x + "px"); el.style.setProperty("--y", y + "px"); el.style.setProperty("--r", LENS_R + "px");
      if (target !== lensEl) { lensEl = target; blueprint(target); }
    },
    hideLens() { lens.hidden = true; ring.hidden = true; lensEl = null; clear(lens); },
    flash(target) {
      const f = h("div.wk-hl", { "data-kind": "flash" });
      flashes.appendChild(f);
      boxes(target, "flash", f);
      setTimeout(() => f.remove(), 1500);
    },
    setPlaceholders(on) { phOn = !!on; placeholders.hidden = !on; if (on) drawPlaceholders(); else clear(placeholders); },
    refresh: schedule,
    dispose() {
      window.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("contentvisibilityautostatechange", onScroll, true);
      if (raf) cancelAnimationFrame(raf);
      el.remove();
    },
  };
}
