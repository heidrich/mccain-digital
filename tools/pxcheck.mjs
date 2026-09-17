/* initPixels bails on `if (!PX) return` without a word. Prove it did not.
 *
 * v5/runtime.js loads pixel-engine.js on demand (armPixels/loadPixels in
 * v5/runtime.js): only once a real mouse moves, or ten seconds after load on
 * a hover-capable, non-touch device otherwise. A page that never sees a mouse
 * move must still not load it eagerly - the promise this check proves is the
 * first one, the one a real desktop visitor triggers immediately: move the
 * mouse like a visitor would, then wait for PixelFX and every effect element
 * to finish initialising. */
import { launch } from "./browser.mjs";
const base = process.argv[2] || "http://127.0.0.1:8897";
const { browser, context } = await launch(1350, 940);
const tab = await context.newPage();
const errs = [];
tab.on("pageerror", (e) => errs.push("pageerror: " + e.message));
tab.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text()); });
let bad = 0;
for (const p of ["/", "/leistungen/", "/studio/", "/marke/", "/kontakt/"]) {
  await tab.goto(base + p, { waitUntil: "load", timeout: 60000 });
  /* Before any interaction: pixel-engine.js must not have loaded yet - that is
   * the whole point of armPixels(), and a regression there would ship 42 KB
   * nobody asked for on every page load. */
  const early = await tab.evaluate(() => typeof window.PixelFX);
  if (early !== "undefined") { errs.push(p + ": PixelFX already defined before any mouse movement (" + early + ")"); }
  /* A real pointer move, with pointerType "mouse" - what armPixels listens
   * for - triggers loadPixels() immediately, without waiting for the
   * ten-second hover-device fallback. */
  await tab.mouse.move(200, 200);
  await tab.mouse.move(260, 240);
  await tab.waitForFunction(() => typeof window.PixelFX === "object", null, { timeout: 8000 }).catch(() => {});
  await tab.waitForTimeout(600); // wirePixels() runs from the script's onload; give initPixels a moment on top
  /* wirePixels() only wires a [data-px]/[data-px-img] once whenShown() sees it
   * (its nearest [data-cv] ancestor has rendered) - same content-visibility
   * deferral as everywhere else on the page. Sweep to the bottom so every
   * block has rendered at least once before counting who got wired. */
  await tab.evaluate(async () => {
    const step = Math.max(400, Math.round(innerHeight * 0.8));
    for (let y = 0; y <= document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await tab.waitForTimeout(300);
  const r = await tab.evaluate(() => ({
    fx: typeof window.PixelFX,
    api: window.PixelFX ? Object.keys(window.PixelFX).length : 0,
    px: document.querySelectorAll("[data-px]").length,
    pxImg: document.querySelectorAll("[data-px-img]").length,
    done: document.querySelectorAll("[data-pxd]").length,
    canvas: document.querySelectorAll("[data-px] canvas, [data-px-img] canvas").length,
  }));
  const want = r.px + r.pxImg;
  const ok = r.fx === "object" && (want === 0 || r.done >= want);
  if (!ok) bad++;
  console.log("  " + (ok ? "ok  " : "FAIL") + "  " + p.padEnd(16) +
    "PixelFX=" + r.fx + " (" + r.api + " Eingaenge)  [data-px]=" + r.px +
    " [data-px-img]=" + r.pxImg + " initialisiert=" + r.done + " canvas=" + r.canvas);
}
await browser.close();
if (errs.length) { console.log("\n  Fehler:"); errs.slice(0, 8).forEach((e) => console.log("    " + e)); }
console.log(bad || errs.length ? "\n  NICHT OK" : "\n  alle Pixel-Effekte initialisiert, 0 Fehler");
process.exit(bad || errs.length ? 1 : 0);
