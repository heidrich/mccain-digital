/* Exactly which bytes of CSS and JS never ran.
 *
 * Not an estimate: Chrome records every executed range. Two things that make a
 * naive reading of this wrong, both learned the hard way:
 *   - V8 nests its ranges. A function's outermost range covers the whole body
 *     with count>0, and the branches that never ran are INNER ranges with
 *     count 0. Marking "anything with count>0 is used" therefore reports 0 %
 *     dead for every file. Apply them in order and let inner ranges overwrite.
 *   - This page is revealed on scroll, so CSS is walked end to end first.
 * Inline style="" attributes are invisible to coverage entirely - on this site
 * that is the majority of the styling, so the CSS number below is only about
 * the stylesheets.
 */
import { launch } from "./browser.mjs";

const url = process.argv[2] || "http://127.0.0.1:8897/";
const { browser, context } = await launch(1350, 940);
const tab = await context.newPage();
await Promise.all([tab.coverage.startJSCoverage(), tab.coverage.startCSSCoverage()]);
await tab.goto(url, { waitUntil: "load", timeout: 60000 });
await tab.waitForTimeout(2500);
const h = await tab.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < h; y += 700) { await tab.evaluate((v) => scrollTo(0, v), y); await tab.waitForTimeout(90); }
await tab.evaluate(() => scrollTo(0, 0));
await tab.waitForTimeout(1500);
const [js, css] = await Promise.all([tab.coverage.stopJSCoverage(), tab.coverage.stopCSSCoverage()]);
await browser.close();

const kb = (b) => (b / 1024).toFixed(1).padStart(8) + " KB";
let inlineN = 0;
const name = (u, tag) => {
  const s = (u || "").replace(/^https?:\/\/[^/]+/, "").split("?")[0];
  return !s || s === "/" ? tag + " inline #" + ++inlineN : s;
};

function report(title, rows, note) {
  rows.sort((a, b) => b.dead - a.dead);
  let T = 0, D = 0;
  for (const r of rows) { T += r.total; D += r.dead; }
  console.log("\n  " + title + "   " + (T / 1024).toFixed(1) + " KB geliefert, " +
    (D / 1024).toFixed(1) + " KB nie ausgefuehrt = " + (100 * D / (T || 1)).toFixed(0) + " %");
  if (note) console.log("  " + note);
  console.log("\n  " + "geliefert".padStart(11) + "  " + "tot".padStart(11) + "  " + "tot".padStart(5) + "   Datei");
  for (const r of rows.slice(0, 14))
    console.log("  " + kb(r.total) + "  " + kb(r.dead) + "  " +
      ((100 * r.dead / (r.total || 1)).toFixed(0) + "%").padStart(5) + "   " + r.name);
}

report("JS ", js.map((e) => {
  const total = e.source ? e.source.length : 0;
  const marks = new Uint8Array(total);
  for (const f of e.functions || []) {
    const rs = (f.ranges || []).slice().sort((a, b) => (a.startOffset - b.startOffset) || (b.endOffset - a.endOffset));
    for (const r of rs) {
      const v = r.count > 0 ? 1 : 0;
      for (let i = r.startOffset; i < r.endOffset && i < total; i++) marks[i] = v;
    }
  }
  let u = 0; for (let i = 0; i < total; i++) if (marks[i]) u++;
  return { name: name(e.url, "script"), total, dead: total - u };
}));

report("CSS", css.map((e) => {
  const total = e.text ? e.text.length : 0;
  const marks = new Uint8Array(total);
  for (const r of e.ranges || []) for (let i = r.start; i < r.end && i < total; i++) marks[i] = 1;
  let u = 0; for (let i = 0; i < total; i++) if (marks[i]) u++;
  return { name: name(e.url, "style"), total, dead: total - u };
}), "(style=\"\"-Attribute sieht kein Abdeckungswerkzeug - hier stehen nur die Stylesheets)");
