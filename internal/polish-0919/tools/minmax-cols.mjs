/* Single-column grid tracks: '1fr' -> 'minmax(0, 1fr)' in the page logic of the
 * production artboards. A '1fr' track is minmax(auto, 1fr): it never gets
 * narrower than its widest unbreakable content (a <pre white-space:pre>, a row
 * of nowrap tabs), so on a phone the column grows past the screen and
 * content-visibility / the page wrapper clip it silently. Only values of a
 * *cols key are touched - the `rows` keys animate 0fr <-> 1fr (accordions) and
 * must keep a plain fr so the transition interpolates.
 *   node minmax-cols.mjs           dry run: tally per key
 *   node minmax-cols.mjs --write   apply
 */
import fs from "node:fs";
import path from "node:path";
import { PAGES } from "file:///C:/Users/Christian/Documents/GitHub/mccain-digital/tools/pages.mjs";
const DIR = "C:/Users/Christian/Documents/GitHub/mccain-digital/mccain-design-system";
const write = process.argv.includes("--write");
const tally = {}; let total = 0;
for (const src of [...new Set(PAGES.map((p) => p.src))]) {
  const file = path.join(DIR, src);
  const text = fs.readFileSync(file, "utf8");
  const scriptAt = text.indexOf('<script type="text/x-dc" data-dc-script');
  if (scriptAt < 0) throw new Error(src + ": no page script found");
  let n = 0;
  const out = text.slice(0, scriptAt) + text.slice(scriptAt).replace(/'1fr'/g, (m, off, all) => {
    const before = all.slice(Math.max(0, off - 220), off);
    const keys = [...before.matchAll(/([A-Za-z]+):\s/g)];
    const key = keys.length ? keys[keys.length - 1][1] : "?";
    tally[key] = (tally[key] || 0) + 1;
    if (!/cols$/i.test(key)) return m;
    n++; return "'minmax(0, 1fr)'";
  });
  total += n;
  if (write && n) fs.writeFileSync(file, out, "utf8");
  console.log(String(n).padStart(3), src);
}
console.log("keys:", JSON.stringify(tally)); console.log(write ? "written" : "dry run", total);
