/* Horizontal overflow and the painted type scale, across four widths.
 *
 *   node tools/responsive_audit.mjs [base]
 *
 * verify_site.mjs checks overflow at 1440 only, which is the width where a
 * layout is least likely to break. A page that scrolls sideways on a phone is
 * invisible to every other gate in here, so this asks all four widths and names
 * the element that sticks out - the answer "something overflows" is not
 * actionable, "this element does" is.
 */
import { chromium } from "playwright-core";
import { findChrome } from "./browser.mjs";

const BASE = process.argv[2] || "http://127.0.0.1:8898";
const PAGES = [
  "/kontakt.html",
  "/services/ai-tools.html",
  "/services/web-apps.html",
  "/services/websites.html",
  "/services/software.html",
];
const WIDTHS = [390, 768, 1024, 1440];

const browser = await chromium.launch({ executablePath: findChrome(), headless: true });
let bad = 0;

for (const w of WIDTHS) {
  const page = await browser.newPage({ viewport: { width: w, height: 900 } });
  for (const p of PAGES) {
    await page.goto(BASE + p, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(350);
    const r = await page.evaluate(() => {
      const de = document.documentElement;
      const over = [];
      if (de.scrollWidth > window.innerWidth) {
        for (const el of document.querySelectorAll("*")) {
          const b = el.getBoundingClientRect();
          if (b.right > window.innerWidth + 1 || b.left < -1) {
            over.push(el.tagName.toLowerCase() + "." + (el.className || "").toString().slice(0, 30));
            if (over.length > 3) break;
          }
        }
      }
      const cs = (sel) => {
        const el = document.querySelector(sel);
        return el ? getComputedStyle(el).color : "-";
      };
      return {
        scrollW: de.scrollWidth,
        inner: window.innerWidth,
        over,
        pColor: cs("main p:not(.lead):not(.eyebrow)"),
        leadColor: cs(".lead"),
        h1Color: cs("h1"),
        h1Size: (() => { const h = document.querySelector("h1"); return h ? getComputedStyle(h).fontSize : "-"; })(),
      };
    });
    const ok = r.scrollW <= r.inner + 1;
    if (!ok) bad++;
    if (w === 390 || !ok) {
      console.log(
        `${String(w).padStart(4)}  ${p.padEnd(30)} ${ok ? "ok  " : "OVERFLOW"} ` +
          `scrollW=${r.scrollW} inner=${r.inner}` + (r.over.length ? "  " + r.over.join(", ") : "")
      );
    }
    if (w === 1440 && p === "/kontakt.html") {
      console.log(`      colours: p=${r.pColor}  lead=${r.leadColor}  h1=${r.h1Color}  h1size=${r.h1Size}`);
    }
  }
}
await browser.close();
console.log(bad ? `\n${bad} overflow problem(s)` : "\nno horizontal overflow at any width");
