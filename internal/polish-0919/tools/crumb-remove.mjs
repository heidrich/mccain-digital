/* Owner 19.9.2026, after seeing it built: "auch wenn es sau cool ist, der
 * Breadcrumb ist too much da oben – der nimmt den ganzen Fokus von der Seite
 * weg. Fürs Design nehmen wir den raus." Removes the pill's markup, its
 * scroll/resize logic, state and render values from every artboard. TRAIL
 * stays (it drives the active header item); its up/here fields and CRUMB_UP
 * are kept for the pill's possible return - the variants live in
 * internal/polish-0919/crumb/. Count-checked per file. */
import fs from "node:fs";
import path from "node:path";
const DIR = "C:/Users/Christian/Documents/GitHub/mccain-digital/mccain-design-system";
const once = (t, a, b, what) => { const c = t.split(a).length - 1; if (c !== 1) throw new Error(`${what}: expected 1, found ${c}`); return t.replace(a, () => b); };
function patch(t) {
  const start = '<sc-if value="{{ crumbOn }}" hint-placeholder-val="{{ false }}">\n<div data-crumb aria-hidden="true"';
  const s = t.indexOf(start);
  if (s < 0 || t.indexOf(start, s + 1) >= 0) throw new Error("pill block not found once");
  const e = t.indexOf("\n</sc-if>\n", s);
  const block = t.slice(s, e + "\n</sc-if>\n".length);
  if (!block.includes("data-crumb-bar") || block.split("<sc-if").length !== 2) throw new Error("pill block has an unexpected shape");
  t = t.slice(0, s) + t.slice(s + block.length);
  t = once(t, "this.updateProcess(); this.updateCrumb(); const bar", "this.updateProcess(); const bar", "onScroll");
  t = once(t, "if (vw && vw !== this.state.vw) { this.setState({ vw }); requestAnimationFrame(() => this.updateCrumb()); }", "if (vw && vw !== this.state.vw) this.setState({ vw });", "onResize");
  const ms = t.indexOf("  /* The breadcrumb pill (desktop, >= 1180 px): shown once"), me = t.indexOf("  updateProcess() {", ms);
  if (ms < 0 || me < 0 || !t.slice(ms, me).includes("  updateCrumb() {")) throw new Error("updateCrumb not found");
  t = t.slice(0, ms) + t.slice(me);
  t = once(t, "  state = { crumbShow: false, ", "  state = { ", "state");
  t = once(t, "      crumbOn: navFull && !!trail, crumbs, crumbHere: trail ? this.loc(trail.here) : '', crumbOp: S.crumbShow && !menuOpen ? 1 : 0, crumbTf: S.crumbShow && !menuOpen ? 'translateY(0)' : 'translateY(-6px)', crumbPe: S.crumbShow && !menuOpen ? 'auto' : 'none',\n", "", "render values");
  const lines = t.match(/^[ \t]*const crumbs = trail \? .*\n/gm) || [];
  if (lines.length !== 1) throw new Error(`crumbs line: expected 1, found ${lines.length}`);
  t = t.replace(lines[0], "");
  t = once(t, "  /* Where a page sits: which header item is active and the trail the breadcrumb\n   * pill shows. Keyed by artboard file name, like SELF and PAGES. */",
    "  /* Where a page sits: which header item is active (nav). up/here and CRUMB_UP\n   * fed the breadcrumb pill, taken out on 19.9.2026 (owner: too much focus);\n   * kept for its return, the variants are in internal/polish-0919/crumb/.\n   * Keyed by artboard file name, like SELF and PAGES. */", "TRAIL comment");
  if (/updateCrumb|crumbShow|crumbOn|crumbHere|data-crumb/.test(t)) throw new Error("pill leftovers remain");
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
console.log(write ? "removed from" : "dry run ok for", n, "artboards");
