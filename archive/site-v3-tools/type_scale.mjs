/* Reports the type scale AS PAINTED, per page and per viewport.
 *
 * Not a gate - a measuring instrument. It answers one question the token table
 * cannot: at which size is most of the text on this site actually set, and how
 * long are the lines that carry it.
 *
 *   node tools/type_scale.mjs [width ...]
 */
import { BASE, launch, open, probeSource, requireServer, settle } from "./browser.mjs";

const PAGES = process.env.MCD_PAGES
  ? process.env.MCD_PAGES.split(",")
  : ["index.html", "services/websites.html", "work.html", "about.html"];

/* "1920" takes the default height, "1920x1080" states one - and it has to be
 * statable, because --t-display is min(vw, vh): the same width on a taller
 * window paints a bigger headline, and 1920x1080 is the exact window the
 * owner has complained about twice. */
const SIZES = (process.argv.slice(2).length ? process.argv.slice(2) : ["1440", "1920x1080", "390"]).map((a) => {
  const [w, h] = a.split("x").map(Number);
  return { width: w, height: h || (w < 600 ? 844 : 900) };
});

const src = probeSource("type_scale_probe.js");

await requireServer();

for (const { width, height } of SIZES) {
  const { browser, context } = await launch(width, height);
  console.log("\n================ " + width + "x" + height + " ================");

  for (const p of PAGES) {
    const page = await open(context, BASE + "/" + p);
    await settle(page);
    const r = await page.evaluate(src);

    const byPx = new Map();
    for (const row of r.rows) {
      const e = byPx.get(row.px) || { px: row.px, chars: 0, nodes: 0, where: new Map() };
      e.chars += row.chars;
      e.nodes += 1;
      const key = row.cls ? row.tag + "." + row.cls.split(" ")[0] : row.tag;
      e.where.set(key, (e.where.get(key) || 0) + row.chars);
      byPx.set(row.px, e);
    }
    const total = r.rows.reduce((a, b) => a + b.chars, 0) || 1;
    const scale = [...byPx.values()].sort((a, b) => b.chars - a.chars);

    console.log("\n--- " + p + "   root " + r.root + "px, body " + r.body + "px, " + total + " chars painted");
    for (const s of scale.slice(0, 9)) {
      const top = [...s.where.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map((x) => x[0]);
      console.log(
        "  " + String(s.px).padStart(6) + "px  " +
          String(Math.round((s.chars / total) * 100)).padStart(3) + "%  " +
          String(s.nodes).padStart(4) + " nodes   " + top.join("  ")
      );
    }
    const H = r.heads.filter((h) => h.tag !== "h4");
    console.log("  headings: " + H.map((h) => h.tag + " " + h.px + "/" + h.lh).join("  ") || "  none");
    if (r.paras.length) {
      const sorted = [...r.paras].sort((a, b) => b.cpl - a.cpl);
      const avg = Math.round(r.paras.reduce((a, b) => a + b.cpl, 0) / r.paras.length);
      console.log(
        "  running text: " + r.paras.length + " blocks, avg " + avg + " cpl; " +
          "widest " + sorted[0].cpl + " cpl (" + sorted[0].px + "px in " + sorted[0].inner + "px, " + sorted[0].cls + "); " +
          "narrowest " + sorted[sorted.length - 1].cpl + " cpl (" + sorted[sorted.length - 1].cls + ")"
      );
    }
    await page.close();
  }
  await browser.close();
}
