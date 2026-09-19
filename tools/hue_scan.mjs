/* Where does the RENDERED page still show indigo? (19.9.2026)
 *
 *   node tools/hue_scan.mjs [route-part]        W=400 for the phone width
 *   OUT=report.json node tools/hue_scan.mjs
 *
 * A search over the source finds literal colours; it does not find the ones
 * that only exist on screen: violet at 22 % over navy is indigo, a violet to
 * sky gradient passes through periwinkle, even pink at 12 % over navy lands on
 * hue 242. This scrolls every page, screenshots it, and counts 8 px cells whose
 * pixels sit in the indigo band (hue 226-258) or the violet band (258-285) with
 * visible chroma - then names the element under each region and what paints it.
 *
 * Expected on every page: the logo in the header (~20-30 cells) and, where
 * shown, the Pixelstrom - both keep violet into sky by the owner's decision.
 * Anything else in the indigo band is a finding: violet must not mix with navy
 * or sky (tokens/colors.css). Run it after every colour change; it is a report,
 * not a gate, because the logo and the stream are allowed to be in the band.
 */
import fs from "node:fs";
import { BASE, launch, open, settle } from "./browser.mjs";
import { PAGES } from "./pages.mjs";
const width = Number(process.env.W || 1280), height = width < 600 ? 844 : 900;
const only = process.argv[2];
const { browser, context } = await launch(width, height);
await context.route("**/*", (r) => (r.request().method() === "POST" ? r.abort() : r.continue()));
const report = [];
for (const p of PAGES.filter((q) => !only || q.route.includes(only))) {
  const page = await open(context, BASE + p.route);
  await page.addStyleTag({ content: "html{scroll-behavior:auto!important} *{animation-play-state:paused!important}" });
  await settle(page);
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  const regions = [];
  for (let y = 0; y < h; y += height - 100) {
    await page.evaluate((yy) => scrollTo(0, yy), y); await page.waitForTimeout(450);
    const png = (await page.screenshot()).toString("base64");
    const found = await page.evaluate(async ({ png, y }) => {
      const img = new Image(); img.src = "data:image/png;base64," + png; await img.decode();
      const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
      const g = c.getContext("2d"); g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data, W = c.width, H = c.height, S = 8;
      const gw = Math.ceil(W / S), gh = Math.ceil(H / S), cell = new Uint8Array(gw * gh);
      const band = (r, gg, b) => { const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), ch = mx - mn; if (ch < 20 || mx < 60) return 0; let hh; if (mx === r) hh = ((gg - b) / ch) % 6; else if (mx === gg) hh = (b - r) / ch + 2; else hh = (r - gg) / ch + 4; hh *= 60; if (hh < 0) hh += 360; return hh >= 226 && hh < 258 ? 1 : hh >= 258 && hh < 285 ? 2 : 0; };
      for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
        let n1 = 0, n2 = 0, n = 0;
        for (let yy = gy * S; yy < Math.min(H, gy * S + S); yy += 2) for (let xx = gx * S; xx < Math.min(W, gx * S + S); xx += 2) { const i = (yy * W + xx) * 4, k = band(d[i], d[i + 1], d[i + 2]); n++; if (k === 1) n1++; else if (k === 2) n2++; }
        cell[gy * gw + gx] = n1 / n >= 0.3 ? 1 : n2 / n >= 0.3 ? 2 : 0;
      }
      const seen = new Uint8Array(gw * gh), out = [];
      for (let s = 0; s < cell.length; s++) {
        if (!cell[s] || seen[s]) continue;
        const kind = cell[s], q = [s]; seen[s] = 1; let x0 = 1e9, y0 = 1e9, x1 = 0, y1 = 0, cnt = 0;
        while (q.length) { const v = q.pop(), vx = v % gw, vy = (v / gw) | 0; cnt++; x0 = Math.min(x0, vx); y0 = Math.min(y0, vy); x1 = Math.max(x1, vx); y1 = Math.max(y1, vy);
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = vx + dx, ny = vy + dy; if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue; const w = ny * gw + nx; if (cell[w] === kind && !seen[w]) { seen[w] = 1; q.push(w); } } }
        if (cnt < 3) continue;
        const cx = ((x0 + x1 + 1) / 2) * S, cy = ((y0 + y1 + 1) / 2) * S;
        const el = document.elementFromPoint(Math.min(W - 1, cx), Math.min(H - 1, cy));
        const chain = []; let e = el;
        for (let k = 0; e && k < 6; k++, e = e.parentElement) {
          const cs = getComputedStyle(e);
          const paint = [cs.backgroundImage !== "none" ? cs.backgroundImage.slice(0, 160) : "", cs.backgroundColor !== "rgba(0, 0, 0, 0)" ? "bg " + cs.backgroundColor : "", e.tagName === "CANVAS" ? "CANVAS" : "", cs.boxShadow !== "none" ? "shadow " + cs.boxShadow.slice(0, 80) : ""].filter(Boolean).join(" · ");
          chain.push((e.getAttribute("data-dc-tpl") ? "#" + e.getAttribute("data-dc-tpl") : e.tagName.toLowerCase()) + (paint ? " [" + paint + "]" : ""));
        }
        out.push({ kind: kind === 1 ? "INDIGO" : "violet", cells: cnt, box: [x0 * S, y0 * S + y, (x1 + 1) * S, (y1 + 1) * S + y], section: el?.closest("section,header,footer,[id]")?.id || el?.closest("section,header,footer")?.tagName || "", text: (el?.textContent || "").trim().slice(0, 40), chain });
      }
      return out;
    }, { png, y });
    regions.push(...found);
  }
  /* The fixed header and the chat button are in every shot: count them once. */
  const key = (r) => r.kind + r.chain[0] + r.text;
  const uniq = []; const seen = new Map();
  for (const r of regions) { const k = key(r); if (seen.has(k)) { seen.get(k).rep++; seen.get(k).cells += r.cells; } else { const o = { ...r, rep: 1 }; seen.set(k, o); uniq.push(o); } }
  report.push({ route: p.route, regions: uniq });
  const ind = uniq.filter((r) => r.kind === "INDIGO"), vio = uniq.filter((r) => r.kind === "violet");
  console.log(p.route.padEnd(44), "indigo", ind.length, "(" + ind.reduce((a, r) => a + r.cells, 0) + " cells)", " violet", vio.length, "(" + vio.reduce((a, r) => a + r.cells, 0) + " cells)");
  await page.close();
}
if (process.env.OUT) fs.writeFileSync(process.env.OUT, JSON.stringify(report, null, 1));
await browser.close();
