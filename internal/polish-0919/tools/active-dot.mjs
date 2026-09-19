/* Owner 19.9.2026 on the live preview: "den grauen BG braucht es da nicht"
 * (active header item) and, for the footer, "nur den blauen Punkt davor".
 * Header: the tinted pill goes, the sky dot after the label stays.
 * Footer: stripe, tint and the shifted padding go; a sky dot hangs 14 px left
 * of the label, so the column's text stays aligned. Count-checked per file. */
import fs from "node:fs";
import path from "node:path";
const DIR = "C:/Users/Christian/Documents/GitHub/mccain-digital/mccain-design-system";
const once = (t, a, b, what) => { const c = t.split(a).length - 1; if (c !== 1) throw new Error(`${what}: expected 1, found ${c}`); return t.replace(a, () => b); };
const DOT = `<span aria-hidden="true" style="position:absolute; left:-14px; top:50%; width:6px; height:6px; margin-top:-3px; border-radius:50%; background:var(--mc-dark-accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--mc-dark-accent) 25%, transparent)"></span>`;
function patch(t) {
  t = once(t, "color: {{ m.fg }}; background: {{ m.curBg }}; opacity: {{ m.opacity }}; transition: opacity .2s, color .2s, background .2s\">",
    "color: {{ m.fg }}; opacity: {{ m.opacity }}; transition: opacity .2s, color .2s\">", "header item style");
  t = once(t, "fw: cur ? '600' : '500', curBg: cur ? (onGradient ? 'color-mix(in srgb, var(--mc-white) 16%, transparent)' : 'var(--mc-action-tint)') : 'transparent',",
    "fw: cur ? '600' : '500',", "header item curBg");
  t = once(t, "font-weight: {{ l.fw }}; padding:5px {{ l.padX }}; margin-left: {{ l.ml }}; border-radius:6px; background: {{ l.bg }}; transition: color .2s\" style-hover=\"color:var(--mc-white)\"><sc-if value=\"{{ l.on }}\" hint-placeholder-val=\"{{ false }}\"><span aria-hidden=\"true\" style=\"position:absolute; left:-2px; top:5px; bottom:5px; width:3px; border-radius:3px; background:var(--mc-stream)\"></span></sc-if>",
    `font-weight: {{ l.fw }}; padding:5px 0; transition: color .2s" style-hover="color:var(--mc-white)"><sc-if value="{{ l.on }}" hint-placeholder-val="{{ false }}">${DOT}</sc-if>`, "footer link");
  t = once(t, "l.on = on; l.bg = on ? 'color-mix(in srgb, var(--mc-white) 7%, transparent)' : 'transparent'; l.ml = on ? '-8px' : '0px'; l.padX = on ? '8px' : '0px'; }));",
    "l.on = on; }));", "footer script");
  return t;
}
const write = process.argv.includes("--write");
let n = 0;
for (const f of fs.readdirSync(DIR).filter((f) => /^McCain Digital .*\.dc\.html$/.test(f))) {
  const t = fs.readFileSync(path.join(DIR, f), "utf8");
  if (!t.includes("static SELF = ")) continue;
  const out = patch(t);
  if (write) fs.writeFileSync(path.join(DIR, f), out, "utf8");
  n++;
}
console.log(write ? "patched" : "dry run ok for", n, "artboards");
