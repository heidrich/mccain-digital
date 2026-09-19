/* Probe: why does an element stick out of its content-visibility section?
 * node internal/polish-0919/tools/cvprobe.mjs <route> <width> <tpl>
 * Prints the element's and section's boxes plus the transforms on the way up. */
import { launch, BASE } from "../../../tools/browser.mjs";

const [route, width, tpl] = process.argv.slice(2);
const { browser, context } = await launch(Number(width), Number(width) < 600 ? 844 : 900);
const page = await context.newPage();
await page.goto(BASE + route, { waitUntil: "load" });
await page.waitForTimeout(1500);
const info = await page.evaluate(async (tpl) => {
  document.documentElement.style.scrollBehavior = "auto";
  const el = document.querySelector(`[data-dc-tpl="${tpl}"]`);
  if (!el) return "no element";
  const s = el.closest("[data-cv]");
  s.scrollIntoView();
  await new Promise((r) => setTimeout(r, 600));
  const box = (e) => { const r = e.getBoundingClientRect(); return `top ${r.top.toFixed(1)} bottom ${r.bottom.toFixed(1)} left ${r.left.toFixed(1)} right ${r.right.toFixed(1)}`; };
  const out = [`section ${box(s)} cv=${getComputedStyle(s).contentVisibility} cis=${getComputedStyle(s).containIntrinsicSize}`];
  for (const e of document.querySelectorAll(`[data-dc-tpl="${tpl}"]`)) {
    out.push(`el ${box(e)} op=${getComputedStyle(e).opacity} tf=${getComputedStyle(e).transform}`);
    for (let p = e.parentElement; p && p !== s; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (cs.transform !== "none" || cs.opacity !== "1") out.push(`  up <${p.tagName.toLowerCase()} tpl=${p.getAttribute("data-dc-tpl")}> tf=${cs.transform} op=${cs.opacity}`);
    }
  }
  return out.join("\n");
}, tpl);
console.log(info);
await browser.close();
