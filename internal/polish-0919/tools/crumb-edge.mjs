/* The breadcrumb pill "on the edge" (owner 19.9.2026, variant 2 of
 * internal/polish-0919/crumb/): it sits half on the header's bottom edge, and
 * instead of a progress line or ring its border fills with the stream
 * gradient all the way round as the page is read. The white 2 px ring is the
 * track; an SVG stadium traces it. The pill has a fixed height (36 px), so
 * the stadium's radius is known (19 on the 38 px rect); its length is
 * 2 (w - h) + pi h and is recomputed on every update, because the section
 * label changes the pill's width. Count-checked per file. */
import fs from "node:fs";
import path from "node:path";
const DIR = "C:/Users/Christian/Documents/GitHub/mccain-digital/mccain-design-system";
const once = (t, a, b, what) => { const c = t.split(a).length - 1; if (c !== 1) throw new Error(`${what}: expected 1, found ${c}`); return t.replace(a, () => b); };
const RING = `<svg aria-hidden="true" style="position:absolute; left:-1px; top:-1px; width:calc(100% + 2px); height:38px; overflow:visible; pointer-events:none"><defs><linearGradient id="crumbStream" x1="0" y1="0" x2="1" y2="0"><stop offset="0" style="stop-color:var(--mc-orange)"></stop><stop offset=".32" style="stop-color:var(--mc-pink)"></stop><stop offset=".62" style="stop-color:var(--mc-violet)"></stop><stop offset="1" style="stop-color:var(--mc-sky)"></stop></linearGradient></defs><rect data-crumb-bar x="0" y="0" width="100%" height="38" rx="19" ry="19" fill="none" stroke="url(#crumbStream)" stroke-width="2" style="stroke-dasharray:0 1000"></rect></svg>`;
function patch(t) {
  t = once(t,
    '<div data-crumb aria-hidden="true" style="position:fixed; top:84px; left:0; right:0; z-index:79; pointer-events:none">',
    '<div data-crumb aria-hidden="true" style="position:fixed; top:54px; left:0; right:0; z-index:81; pointer-events:none">',
    "wrapper on the edge");
  t = once(t,
    "display:inline-flex; flex-direction:column; gap:8px; max-width:100%; padding:9px 16px 10px; border-radius:13px; background:var(--mc-navy); box-shadow: 0 0 0 2px var(--mc-white), 0 0 0 3px color-mix(in srgb, var(--mc-navy) 8%, transparent), 0 16px 34px -18px color-mix(in srgb, var(--mc-navy) 55%, transparent);",
    "position:relative; display:inline-flex; align-items:center; height:36px; max-width:100%; padding:0 16px; border-radius:18px; background:var(--mc-navy); box-shadow: 0 0 0 2px var(--mc-white), 0 12px 28px -16px color-mix(in srgb, var(--mc-navy) 60%, transparent);",
    "pill");
  t = once(t,
    '<span style="display:block; height:2px; border-radius:2px; background:color-mix(in srgb, var(--mc-white) 85%, transparent); overflow:hidden"><span data-crumb-bar style="display:block; height:100%; background:var(--mc-stream); transform-origin:0 50%; transform: scaleX(0)"></span></span>',
    RING, "progress border");
  t = once(t,
    "    const bar = pill.querySelector('[data-crumb-bar]');\n    if (bar) { const d = document.documentElement, max = Math.max(1, d.scrollHeight - window.innerHeight); bar.style.transform = 'scaleX(' + Math.min(1, window.scrollY / max).toFixed(4) + ')'; }",
    "    const bar = pill.querySelector('[data-crumb-bar]');\n    if (bar) { const d = document.documentElement, max = Math.max(1, d.scrollHeight - window.innerHeight), p = Math.min(1, window.scrollY / max), b = bar.getBoundingClientRect(), L = 2 * Math.max(0, b.width - b.height) + Math.PI * b.height; bar.style.strokeDasharray = (L * p).toFixed(1) + ' ' + (L + 1).toFixed(1); }",
    "progress script");
  t = once(t, "   * breadcrumb has scrolled under the header. The current section and the\n   * progress line are written",
    "   * breadcrumb has scrolled under the header. The current section and the\n   * progress border are written", "comment");
  return t;
}
const write = process.argv.includes("--write");
let n = 0;
for (const f of fs.readdirSync(DIR).filter((f) => /^McCain Digital .*\.dc\.html$/.test(f))) {
  const t = fs.readFileSync(path.join(DIR, f), "utf8");
  if (!t.includes("static SELF = ")) continue;
  try { const out = patch(t); if (write) fs.writeFileSync(path.join(DIR, f), out, "utf8"); } catch (e) { throw new Error(f + ": " + e.message); }
  n++;
}
console.log(write ? "patched" : "dry run ok for", n, "artboards");
