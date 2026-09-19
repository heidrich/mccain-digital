/* Undo the Lighthouse data change of nav-patch (19.9.2026): the data was
 * already objects ({ k, d } via .map), only the template printed {{ l }}.
 * Every artboard must carry exactly one of the two patched arrays. */
import fs from "node:fs";
import path from "node:path";
const DIR = "C:/Users/Christian/Documents/GitHub/mccain-digital/mccain-design-system";
const pairs = [
  ["lhScores: [{ k: 'Performance' }, { k: 'Accessibility' }, { k: 'Best Practices' }, { k: 'SEO' }]", "lhScores: ['Performance', 'Accessibility', 'Best Practices', 'SEO']"],
  ["lhScores: [{ k: 'PERF' }, { k: 'A11Y' }, { k: 'BP' }, { k: 'SEO' }]", "lhScores: ['PERF', 'A11Y', 'BP', 'SEO']"],
];
let n = 0;
for (const f of fs.readdirSync(DIR).filter((f) => /^McCain Digital .*\.dc\.html$/.test(f))) {
  let t = fs.readFileSync(path.join(DIR, f), "utf8");
  const hits = pairs.map(([a]) => t.split(a).length - 1);
  const total = hits[0] + hits[1];
  if (total === 0) continue;
  if (total !== 1) throw new Error(f + ": " + hits);
  const [a, b] = pairs[hits[0] ? 0 : 1];
  fs.writeFileSync(path.join(DIR, f), t.replace(a, () => b), "utf8");
  n++;
}
console.log("reverted", n, "artboards");
