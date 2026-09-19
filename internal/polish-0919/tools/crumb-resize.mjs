/* Code review 19.9.2026: resizing across 1180 px without scrolling left the
 * breadcrumb pill hidden (or stale) until the next scroll, because only the
 * scroll handler called updateCrumb(). The resize handler now does too, one
 * frame after the width change has re-rendered the header. Count-checked. */
import fs from "node:fs";
import path from "node:path";
const DIR = "C:/Users/Christian/Documents/GitHub/mccain-digital/mccain-design-system";
const from = "if (vw && vw !== this.state.vw) this.setState({ vw });";
const to = "if (vw && vw !== this.state.vw) { this.setState({ vw }); requestAnimationFrame(() => this.updateCrumb()); }";
let n = 0;
for (const f of fs.readdirSync(DIR).filter((f) => /^McCain Digital .*\.dc\.html$/.test(f))) {
  const t = fs.readFileSync(path.join(DIR, f), "utf8");
  if (!t.includes("static SELF = ")) continue;
  const c = t.split(from).length - 1;
  if (c !== 1) throw new Error(`${f}: expected 1, found ${c}`);
  if (!t.includes("  updateCrumb() {")) throw new Error(`${f}: no updateCrumb()`);
  fs.writeFileSync(path.join(DIR, f), t.replace(from, () => to), "utf8");
  n++;
}
console.log("resize calls updateCrumb in", n, "artboards");
