/* The breadcrumb pill as the owner drew it (19.9.2026): navy pill, white ring
 * (2 px - the only thing that separates it from the navy sections), "Start"
 * at 600 and everything after at 400 (the owner asked for 300; Instrument Sans
 * starts at 400, so 300 would render as 400 anyway), progress line on a light
 * track. It also steps aside while a mega menu is open. Count-checked. */
import fs from "node:fs";
import path from "node:path";
const DIR = "C:/Users/Christian/Documents/GitHub/mccain-digital/mccain-design-system";
const once = (t, a, b, what) => { const c = t.split(a).length - 1; if (c !== 1) throw new Error(`${what}: expected 1, found ${c}`); return t.replace(a, () => b); };
function patch(t) {
  t = once(t,
    "display:inline-flex; flex-direction:column; gap:7px; max-width:100%; padding:8px 14px 9px; border-radius:12px; background:color-mix(in srgb, var(--mc-white) 94%, transparent); backdrop-filter: blur(14px) saturate(1.4); -webkit-backdrop-filter: blur(14px) saturate(1.4); box-shadow: 0 0 0 1px color-mix(in srgb, var(--mc-navy) 8%, transparent), 0 14px 32px -20px color-mix(in srgb, var(--mc-navy) 40%, transparent);",
    "display:inline-flex; flex-direction:column; gap:8px; max-width:100%; padding:9px 16px 10px; border-radius:13px; background:var(--mc-navy); box-shadow: 0 0 0 2px var(--mc-white), 0 0 0 3px color-mix(in srgb, var(--mc-navy) 8%, transparent), 0 16px 34px -18px color-mix(in srgb, var(--mc-navy) 55%, transparent);",
    "pill");
  t = once(t,
    '<span style="display:flex; align-items:center; gap:7px; font-size:12.5px; font-weight:500; line-height:1.2; color:var(--mc-slate); white-space:nowrap">',
    '<span style="display:flex; align-items:center; gap:8px; font-size:13px; font-weight:400; line-height:1.2; color:var(--mc-white); white-space:nowrap">',
    "text row");
  t = once(t,
    '<a href="{{ c.href }}" tabIndex="-1" style="color:var(--mc-slate); text-decoration:none" style-hover="color:var(--mc-navy)">{{ c.label }}</a><span style="opacity:.45">›</span>',
    '<a href="{{ c.href }}" tabIndex="-1" style="color:var(--mc-white); font-weight: {{ c.fw }}; text-decoration:none" style-hover="color:var(--mc-dark-accent)">{{ c.label }}</a><span style="color:var(--mc-dark-muted)">›</span>',
    "crumb links");
  t = once(t, '<span style="font-weight:600; color:var(--mc-navy)">{{ crumbHere }}</span>', "<span>{{ crumbHere }}</span>", "current page");
  t = once(t,
    '<span data-crumb-sec-wrap style="display:none"><span style="opacity:.45; margin-right:7px">·</span><span data-crumb-sec style="font-weight:600; color:var(--mc-action-text)"></span></span>',
    '<span data-crumb-sec-wrap style="display:none"><span style="color:var(--mc-dark-muted); margin-right:8px">·</span><span data-crumb-sec></span></span>',
    "section label");
  t = once(t,
    '<span style="display:block; height:2px; border-radius:2px; background:var(--mc-line); overflow:hidden"><span data-crumb-bar',
    '<span style="display:block; height:2px; border-radius:2px; background:color-mix(in srgb, var(--mc-white) 85%, transparent); overflow:hidden"><span data-crumb-bar',
    "progress track");
  t = once(t,
    "const crumbs = trail ? [{ label: S.lang === 'de' ? 'Start' : 'Home', href: 'McCain Digital v2.dc.html' }].concat(trail.up.map((k) => ({ label: this.loc(Component.CRUMB_UP[k][0]), href: Component.CRUMB_UP[k][1] }))) : [];",
    "const crumbs = trail ? [{ label: S.lang === 'de' ? 'Start' : 'Home', href: 'McCain Digital v2.dc.html', fw: '600' }].concat(trail.up.map((k) => ({ label: this.loc(Component.CRUMB_UP[k][0]), href: Component.CRUMB_UP[k][1], fw: '400' }))) : [];",
    "crumbs weight");
  t = once(t,
    "crumbOp: S.crumbShow ? 1 : 0, crumbTf: S.crumbShow ? 'translateY(0)' : 'translateY(-6px)', crumbPe: S.crumbShow ? 'auto' : 'none',",
    "crumbOp: S.crumbShow && !menuOpen ? 1 : 0, crumbTf: S.crumbShow && !menuOpen ? 'translateY(0)' : 'translateY(-6px)', crumbPe: S.crumbShow && !menuOpen ? 'auto' : 'none',",
    "hide under an open menu");
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
