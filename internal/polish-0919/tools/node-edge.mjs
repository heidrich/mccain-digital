/* Diagram nodes sit centred on POS (x 11/89 %). On a phone the diagram is
 * ~350 px wide and a centred label at 89 % reaches past the edge ("Altsystem",
 * "Warteschlange"), clipped by the section. Clamp the centre to half a label
 * width from either edge: an upper estimate of 8 px per character at 13.5 px /
 * 600, plus 46 px of padding and dot, at the active scale (1.06). Where the
 * diagram is wide enough the percentage wins, so desktop does not move. */
import fs from "node:fs";
const DIR = "C:/Users/Christian/Documents/GitHub/mccain-digital/mccain-design-system/";
const EDGE = ", edge = Math.ceil((String(n.label).length * 8 + 46) * 1.06 / 2)";
const LEFT_OLD = "left: p[0] + '%', top: p[1] + '%'";
const LEFT_NEW = "left: 'clamp(' + edge + 'px, ' + p[0] + '%, calc(100% - ' + edge + 'px))', top: p[1] + '%'";
const jobs = [
  ...["Tech Next", "Tech MCP", "Tech RAG", "Tech ERP"].map((n) => ["McCain Digital " + n + ".dc.html", "const on = i === j, p = POS[j] || [50, 50], dx = p[0] - 50, dy = p[1] - 50;", "const on = i === j, p = POS[j] || [50, 50], dx = p[0] - 50, dy = p[1] - 50" + EDGE + ";"]),
  ["McCain Digital Software.dc.html", "const on = ii === i, p = POS[i] || [50, 50]; const dx", "const on = ii === i, p = POS[i] || [50, 50]" + EDGE + "; const dx"],
];
for (const [file, a, b] of jobs) {
  let t = fs.readFileSync(DIR + file, "utf8");
  for (const [from, to] of [[a, b], [LEFT_OLD, LEFT_NEW]]) {
    const n = t.split(from).length - 1;
    if (n !== 1) throw new Error(`${file}: expected 1 of ${from}, found ${n}`);
    t = t.replace(from, () => to);
  }
  fs.writeFileSync(DIR + file, t, "utf8");
  console.log("ok", file);
}
