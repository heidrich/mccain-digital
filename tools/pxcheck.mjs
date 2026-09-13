/* initPixels bails on `if (!PX) return` without a word. Prove it did not. */
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
  await tab.waitForTimeout(2600);
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
