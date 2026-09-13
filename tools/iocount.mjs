/* Who observes how much, and what it costs.
 *
 * IntersectionObserverController::computeIntersections runs on the main thread
 * and its cost scales with the number of OBSERVED TARGETS, not with the number
 * of observers - one observer watching 400 elements is as expensive as 400
 * watching one. It never appears in a CPU profile under a function name of
 * ours, because the work happens in the browser between frames; in Lighthouse
 * it lands in "Other", which is why it can sit there for months unnoticed.
 *
 * This wraps the constructor and observe() before the page boots and records a
 * stack for each, so every observer can be named by the code that created it.
 *   node tools/iocount.mjs <url>
 */
import { launch } from "./browser.mjs";

const url = process.argv[2] || "http://127.0.0.1:8897/";
const secs = Number(process.argv[3] || 8);

const INIT = `
window.__io = [];
(function () {
  const Real = window.IntersectionObserver;
  if (!Real) return;
  function Wrapped(cb, opts) {
    const rec = {
      made: Math.round(performance.now()),
      where: (new Error().stack || "").split("\\n").slice(1, 4).join(" | "),
      opts: JSON.stringify(opts || {}),
      n: 0, tags: {},
    };
    window.__io.push(rec);
    const inst = new Real(cb, opts);
    const obs = inst.observe.bind(inst), unobs = inst.unobserve.bind(inst);
    inst.observe = function (el) {
      rec.n++;
      const k = (el.tagName || "?").toLowerCase() + (el.getAttribute && el.getAttribute("data-pt") !== null ? "[data-pt]" : "");
      rec.tags[k] = (rec.tags[k] || 0) + 1;
      return obs(el);
    };
    inst.unobserve = function (el) { rec.n--; return unobs(el); };
    return inst;
  }
  Wrapped.prototype = Real.prototype;
  window.IntersectionObserver = Wrapped;
})();
`;

const { browser, context } = await launch(1350, 940);
await context.addInitScript(INIT);
const tab = await context.newPage();
await tab.goto(url, { waitUntil: "load", timeout: 60000 });
await tab.waitForTimeout(2000);
/* scroll once - reveal-on-scroll code registers more targets as it goes */
const h = await tab.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < h; y += 900) { await tab.evaluate((v) => scrollTo(0, v), y); await tab.waitForTimeout(80); }
await tab.evaluate(() => scrollTo(0, 0));
await tab.waitForTimeout(secs * 250);

const r = await tab.evaluate(() => ({
  io: window.__io.map((x) => ({ made: x.made, where: x.where, opts: x.opts, n: x.n, tags: x.tags })),
  anim: document.getAnimations ? document.getAnimations().length : -1,
  nodes: document.getElementsByTagName("*").length,
  ptKids: (document.querySelector("[data-pt-layer]") || { children: [] }).children.length,
}));
await browser.close();

const total = r.io.reduce((s, x) => s + x.n, 0);
console.log("\n  " + url);
console.log("  " + r.nodes.toLocaleString("de-DE") + " Knoten, " + r.anim + " laufende Animationen, " +
  r.ptKids + " Kinder in [data-pt-layer]");
console.log("\n  " + r.io.length + " IntersectionObserver, " + total + " beobachtete Elemente insgesamt\n");
r.io.sort((a, b) => b.n - a.n);
for (const o of r.io) {
  const tags = Object.entries(o.tags).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + "×" + v).join(" ");
  console.log("  " + String(o.n).padStart(5) + " Elemente   bei " + String(o.made).padStart(5) + " ms   " + o.opts);
  if (tags) console.log("                     " + tags);
  console.log("                     " + o.where.replace(/https?:\/\/[^/]+/g, "").slice(0, 150));
}
