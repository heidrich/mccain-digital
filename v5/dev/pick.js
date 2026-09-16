/* Picking an element on the page, the way an inspector does it.
 *
 * While picking, the workshop listens on `window` in the capture phase, so it
 * sees every pointer event before the page's own handlers (runtime.js hangs
 * each one directly on its element, see wire() there) and stops them there: a
 * link does not navigate, a button does not act, the text does not get
 * selected. The page is not made inert - an inert subtree disappears from
 * hit testing (measured 16.9.2026: elementsFromPoint returned only <html>),
 * which is exactly what a picker needs to keep. */
import { isOwn, isTouch } from "./ui.js";

export function createPicker(W, layer) {
  let active = false, raf = 0, last = null;
  const touch = isTouch();

  function targetOf(e) {
    let t = e.target;
    if (!t || t.nodeType !== 1) t = t && t.parentElement;
    if (t && !isOwn(t)) return t;
    /* The layer is pointer-transparent, but be safe: look through it. */
    const list = document.elementsFromPoint(e.clientX, e.clientY);
    for (const el of list) if (!isOwn(el) && el !== document.documentElement) return el;
    return null;
  }

  function update() {
    raf = 0;
    if (!active || !last) return;
    const el = targetOf(last);
    if (!el || el === document.body || el === document.documentElement) {
      layer.setHover(null);
      layer.hideLens();
      return;
    }
    layer.setHover(el);
    if (!touch && last.pointerType !== "touch") layer.showLens(last.clientX, last.clientY, el);
    W.bus.emit("hover", el);
  }

  const onMove = (e) => {
    if (!active) return;
    if (isOwn(e.target)) { layer.setHover(null); layer.hideLens(); return; }
    last = e;
    if (!raf) raf = requestAnimationFrame(update);
  };
  const swallow = (e) => {
    if (!active || isOwn(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
  };
  const onClick = (e) => {
    if (!active || isOwn(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    const el = targetOf(e);
    stop();
    if (el && el !== document.body && el !== document.documentElement) W.select(el);
  };
  const onKey = (e) => {
    if (!active) return;
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); stop(); }
  };
  const onLeave = () => { if (active) { layer.setHover(null); layer.hideLens(); } };

  function start() {
    if (active) return;
    active = true;
    document.documentElement.classList.add("v5-dev-pick");
    window.addEventListener("pointermove", onMove, { capture: true, passive: true });
    window.addEventListener("pointerdown", swallow, true);
    window.addEventListener("pointerup", swallow, true);
    window.addEventListener("mousedown", swallow, true);
    window.addEventListener("mouseup", swallow, true);
    window.addEventListener("click", onClick, true);
    window.addEventListener("keydown", onKey, true);
    document.addEventListener("pointerleave", onLeave, true);
    W.bus.emit("pick", true);
  }
  function stop() {
    if (!active) return;
    active = false;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    document.documentElement.classList.remove("v5-dev-pick");
    window.removeEventListener("pointermove", onMove, { capture: true });
    window.removeEventListener("pointerdown", swallow, true);
    window.removeEventListener("pointerup", swallow, true);
    window.removeEventListener("mousedown", swallow, true);
    window.removeEventListener("mouseup", swallow, true);
    window.removeEventListener("click", onClick, true);
    window.removeEventListener("keydown", onKey, true);
    document.removeEventListener("pointerleave", onLeave, true);
    layer.setHover(null);
    layer.hideLens();
    W.bus.emit("pick", false);
  }

  return {
    start, stop,
    toggle() { if (active) stop(); else start(); },
    get active() { return active; },
    dispose: stop,
  };
}
