/* Header items below 1400 px: one padding (8 px) instead of 9 px at 1280-1399
 * and 8 px at 1180-1279. With a classic 17 px scrollbar the built page's media
 * queries (viewport) and the runtime (root width) disagree near a breakpoint;
 * 8 px keeps ~27 px of slack at 1280 instead of ~13 px. Count-checked. */
import fs from "node:fs";
import path from "node:path";
const DIR = "C:/Users/Christian/Documents/GitHub/mccain-digital/mccain-design-system";
const from = "navItemPad: navWide ? '8px 12px' : S.vw >= 1280 ? '8px 9px' : '8px 8px'";
const to = "navItemPad: navWide ? '8px 12px' : '8px 8px'";
let n = 0;
for (const f of fs.readdirSync(DIR).filter((f) => /^McCain Digital .*\.dc\.html$/.test(f))) {
  const t = fs.readFileSync(path.join(DIR, f), "utf8");
  const c = t.split(from).length - 1;
  if (!c && !t.includes("static SELF = ")) continue;
  if (c !== 1) throw new Error(`${f}: expected 1, found ${c}`);
  fs.writeFileSync(path.join(DIR, f), t.replace(from, () => to), "utf8");
  n++;
}
console.log("navItemPad simplified in", n, "artboards");
