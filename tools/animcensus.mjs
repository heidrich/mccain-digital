/* What is actually animating, and could any of it wait?
 *
 * Owner 13.9.2026: "niemand schaut in 5 sec 130 animationen. niemand. das sagt
 * doch schon das alles gleichzeitig geladen wird." Right - so the question is
 * not how many animations there are, it is how many are LOOPS (decoration that
 * could start whenever) versus ONE-SHOT entrances (which must run, because they
 * begin at opacity:0 and holding them leaves a blank page).
 *
 * Answering that needs the iteration count, which is only readable from a live
 * Animation object - no amount of grepping the CSS finds it, because most of
 * these are declared in inline style attributes.
 *
 *   node tools/animcensus.mjs <url> [--at 1500]
 */
import { launch } from "./browser.mjs";

const a = process.argv;
const url = a[2] && !a[2].startsWith("--") ? a[2] : "http://127.0.0.1:8897/";
const at = a.indexOf("--at") > -1 ? Number(a[a.indexOf("--at") + 1]) : 2500;
const mobile = a.includes("--mobile");

const { browser, context } = await launch(mobile ? 412 : 1350, mobile ? 915 : 940);
const tab = await context.newPage();
await tab.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
await tab.waitForTimeout(at);

const r = await tab.evaluate(() => {
  const out = { total: 0, infinite: 0, finite: 0, onScreen: 0, infiniteOnScreen: 0, byName: {}, running: 0 };
  const vh = innerHeight, vw = innerWidth;
  for (const an of document.getAnimations()) {
    if (!an.animationName) continue;
    out.total++;
    if (an.playState === "running") out.running++;
    let iter = 1;
    try { iter = an.effect.getTiming().iterations; } catch (e) {}
    const inf = iter === Infinity || iter === null;
    const el = an.effect && an.effect.target;
    let vis = false;
    if (el && el.getBoundingClientRect) {
      const c = el.getBoundingClientRect();
      vis = c.bottom > 0 && c.top < vh && c.right > 0 && c.left < vw && c.width > 0 && c.height > 0;
    }
    if (vis) out.onScreen++;
    if (inf) { out.infinite++; if (vis) out.infiniteOnScreen++; } else out.finite++;
    const k = an.animationName + (inf ? "  ∞" : "  1×");
    out.byName[k] = out.byName[k] || { n: 0, vis: 0 };
    out.byName[k].n++;
    if (vis) out.byName[k].vis++;
  }
  return out;
});
await browser.close();

console.log("\n  " + url + (mobile ? "   mobil" : "   desktop") + ",  " + at + " ms nach DOMContentLoaded\n");
console.log("  " + String(r.total).padStart(5) + "   CSS-Animationen insgesamt   (" + r.running + " laufen)");
console.log("  " + String(r.infinite).padStart(5) + "   davon ENDLOS  — Dekoration, darf warten");
console.log("  " + String(r.finite).padStart(5) + "   davon einmalig — Einblender, MUSS laufen");
console.log("  " + String(r.onScreen).padStart(5) + "   im Bild");
console.log("  " + String(r.infiniteOnScreen).padStart(5) + "   endlos UND im Bild  ← nur die braucht der Besucher jetzt");
console.log("\n  nach Keyframe-Name (Anzahl / davon im Bild)\n");
const rows = Object.entries(r.byName).sort((x, y) => y[1].n - x[1].n);
for (const [k, v] of rows.slice(0, 26))
  console.log("  " + String(v.n).padStart(5) + " ×   " + String(v.vis).padStart(3) + " im Bild   " + k);
