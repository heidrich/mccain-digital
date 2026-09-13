/* What would it be worth to stop laying out the whole page at once?
 *
 * Owner 13.9.2026: "die INHALTE der seite. die muessen gedefert werden. das ist
 * doch irre, so eine riesen seite direkt zu rendern. vor allem sind das alles
 * sectionen, die kann man MIT den dazugehoerigen animationen defern."
 *
 * The measurement that made him say it: between 1,0 s and 1,9 s the main thread
 * is 100 % busy and Script Evaluation is ONE millisecond. Nothing is running -
 * the browser is simply laying out 2.408 nodes, all of them, for a visitor who
 * can see one screenful.
 *
 * `content-visibility: auto` is the platform's answer and needs no JavaScript:
 * a section outside the viewport is skipped for style, layout and paint, and
 * its animations do not tick. It pairs with contain-intrinsic-size so the
 * scrollbar still knows how tall the page is - without that, every skipped
 * section collapses to nothing and the page jumps as you scroll.
 *
 * This runs the page twice - once as it is, once with the rule injected before
 * the first paint - and prints both. Nothing is written; it measures a ceiling
 * so the real build is worth doing or is not.
 *
 *   node tools/cvtest.mjs <url> [--cpu 4] [--mobile]
 */
import { launch } from "./browser.mjs";

const a = process.argv;
const num = (f, d) => (a.indexOf(f) > -1 ? Number(a[a.indexOf(f) + 1]) : d);
const url = a[2] && !a[2].startsWith("--") ? a[2] : "http://127.0.0.1:8897/";
const cpu = num("--cpu", 4);
const mobile = a.includes("--mobile");
const W = mobile ? 412 : 1350, H = mobile ? 915 : 940;

const PROBE = `
window.__lt = []; window.__lcp = 0; window.__fcp = 0;
try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lt.push([e.startTime, e.duration]); })
  .observe({ type: "longtask", buffered: true }); } catch (e) {}
try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = e.startTime; })
  .observe({ type: "largest-contentful-paint", buffered: true }); } catch (e) {}
try { new PerformanceObserver((l) => { for (const e of l.getEntries())
  if (e.name === "first-contentful-paint") window.__fcp = e.startTime; })
  .observe({ type: "paint", buffered: true }); } catch (e) {}
`;

/* Applied from a stylesheet inserted into <head> before anything renders, which
 * is where the build would put it too. Overlays are excluded by name: a fixed
 * dock or modal is not in the flow, and containing it would break it. */
const OVERLAYS = ["Navigation", "Hero A", "Chat-Dock", "Mobiles Menü", "Modal", "Hinweis Datenschutz"];
const CV = `
(function () {
  var skip = ${JSON.stringify(OVERLAYS)};
  var css = document.createElement("style");
  css.textContent = skip.map(function (s) { return '[data-screen-label="' + s + '"]'; }).join(",") +
    "{content-visibility:visible!important}" +
    "[data-screen-label]{content-visibility:auto;contain-intrinsic-size:auto 900px}";
  (document.head || document.documentElement).appendChild(css);
})();
`;

async function run(withCV) {
  const { browser, context } = await launch(W, H);
  await context.addInitScript(PROBE);
  if (withCV) await context.addInitScript(CV);
  const tab = await context.newPage();
  const cdp = await context.newCDPSession(tab);
  if (cpu > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpu });
  if (mobile) await cdp.send("Emulation.setDeviceMetricsOverride",
    { width: W, height: H, deviceScaleFactor: 2.625, mobile: true });
  await tab.goto(url, { waitUntil: "load", timeout: 60000 });
  await tab.waitForTimeout(6000);
  const r = await tab.evaluate(() => {
    const lt = window.__lt;
    let tbt = 0;
    for (const [, d] of lt) if (d > 50) tbt += d - 50;
    return {
      fcp: window.__fcp, lcp: window.__lcp, tbt,
      tasks: lt.length,
      longest: lt.reduce((m, [, d]) => Math.max(m, d), 0),
      nodes: document.getElementsByTagName("*").length,
      height: document.documentElement.scrollHeight,
      anims: document.getAnimations ? document.getAnimations().filter((x) => x.animationName).length : -1,
      running: document.getAnimations ? document.getAnimations().filter((x) => x.animationName && x.playState === "running").length : -1,
    };
  });
  /* Scrolling through afterwards is the honest half: content-visibility moves
   * work, and if it only moved it into a stutter that has to show up here. */
  const t0 = Date.now();
  for (let y = 0; y < r.height; y += 800) { await tab.evaluate((v) => scrollTo(0, v), y); await tab.waitForTimeout(60); }
  r.scrollMs = Date.now() - t0;
  const after = await tab.evaluate(() => {
    const lt = window.__lt; let tbt = 0;
    for (const [, d] of lt) if (d > 50) tbt += d - 50;
    return { tasks: lt.length, tbt, height: document.documentElement.scrollHeight };
  });
  r.tasksAfterScroll = after.tasks;
  r.tbtAfterScroll = after.tbt;
  r.heightAfterScroll = after.height;
  await browser.close();
  return r;
}

const off = await run(false);
const on = await run(true);

const row = (label, f, unit = " ms") => {
  const A = off[f], B = on[f];
  const d = typeof A === "number" && typeof B === "number" && A ? Math.round(100 * (B - A) / A) : null;
  console.log("  " + label.padEnd(30) +
    String(Math.round(A)).padStart(9) + unit.padEnd(4) +
    String(Math.round(B)).padStart(9) + unit.padEnd(4) +
    (d === null ? "" : (d > 0 ? "+" : "") + d + " %").padStart(8));
};

console.log("\n  " + url + "   CPU x" + cpu + (mobile ? ", mobil" : ", desktop"));
console.log("\n  " + "".padEnd(30) + "     wie jetzt".padEnd(13) + "   content-vis".padEnd(13) + "\n");
row("FCP", "fcp");
row("LCP", "lcp");
row("TBT (bis 6 s)", "tbt");
row("laengste Aufgabe", "longest");
row("lange Aufgaben", "tasks", "");
row("Knoten im DOM", "nodes", "");
row("CSS-Animationen", "anims", "");
row("davon laufend", "running", "");
console.log("");
row("Seitenhoehe", "height", "px");
row("Hoehe nach Durchscrollen", "heightAfterScroll", "px");
row("lange Aufgaben nach Scroll", "tasksAfterScroll", "");
row("TBT nach Scroll", "tbtAfterScroll");
console.log("\n  Hoehe vorher/nachher muss GLEICH sein - weicht sie ab, springt die Seite\n" +
  "  beim Scrollen und contain-intrinsic-size ist falsch geraten.");
