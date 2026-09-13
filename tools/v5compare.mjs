/* Does the plain-HTML rebuild look like the page it replaces? Pixel for pixel.
 *
 *   node tools/v5compare.mjs [width ...]        default: 1280 412
 *
 * Both pages are shot full-length with prefers-reduced-motion, so reveals,
 * counters and the hero rotation hold still; the WebGL stream and its notes are
 * random by design and are hidden in both; the consent note is pre-accepted.
 * What is left should be identical. The diff runs in the browser (canvas), so
 * no image library is needed, and is reported per 200 px band so a difference
 * can be found, not just counted. Shots and a diff image land in _dcbuild/.
 */
import fs from "node:fs";
import path from "node:path";
import { BASE, launch, requireServer } from "./browser.mjs";

const widths = process.argv.slice(2).map(Number).filter(Boolean);
const OUT = path.join(import.meta.dirname, "..", "_dcbuild");
fs.mkdirSync(OUT, { recursive: true });
await requireServer();

const HIDE = "canvas,[data-pt-layer]{visibility:hidden!important}html{scroll-behavior:auto!important}";

async function shoot(context, url, file) {
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(url, { waitUntil: "load" });
  await page.addStyleTag({ content: HIDE });
  await page.waitForTimeout(2500);
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 700) { await page.evaluate((v) => scrollTo(0, v), y); await page.waitForTimeout(60); }
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(800);
  const buf = await page.screenshot({ fullPage: true, path: file });
  await page.close();
  return { buf, errors, h };
}

for (const width of widths.length ? widths : [1280, 412]) {
  const { browser } = await launch(width, 900);
  const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1, reducedMotion: "reduce" });
  await context.addInitScript(() => { try { localStorage.setItem("mcd.consent", "1"); } catch (e) { /* ignore */ } });
  const a = await shoot(context, BASE + "/", path.join(OUT, `cmp-old-${width}.png`));
  const b = await shoot(context, BASE + "/v5/", path.join(OUT, `cmp-new-${width}.png`));

  const page = await context.newPage();
  await page.goto(BASE + "/robots.txt");
  const r = await page.evaluate(async ([A, B]) => {
    const load = (b64) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = "data:image/png;base64," + b64; });
    const [ia, ib] = await Promise.all([load(A), load(B)]);
    const w = Math.min(ia.width, ib.width), h = Math.min(ia.height, ib.height);
    const get = (img) => { const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d"); x.drawImage(img, 0, 0); return x.getImageData(0, 0, w, h).data; };
    const da = get(ia), db = get(ib);
    const diff = document.createElement("canvas"); diff.width = w; diff.height = h;
    const dx = diff.getContext("2d"); dx.drawImage(ib, 0, 0); dx.fillStyle = "rgba(255,255,255,.75)"; dx.fillRect(0, 0, w, h);
    const out = dx.getImageData(0, 0, w, h);
    const bands = new Map();
    let total = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const k = (y * w + x) * 4;
        if (Math.abs(da[k] - db[k]) + Math.abs(da[k + 1] - db[k + 1]) + Math.abs(da[k + 2] - db[k + 2]) > 48) {
          total++;
          const band = Math.floor(y / 200) * 200;
          bands.set(band, (bands.get(band) || 0) + 1);
          out.data[k] = 255; out.data[k + 1] = 0; out.data[k + 2] = 60; out.data[k + 3] = 255;
        }
      }
    }
    dx.putImageData(out, 0, 0);
    return { w, h, ha: ia.height, hb: ib.height, total, bands: [...bands].sort((p, q) => q[1] - p[1]).slice(0, 10), png: diff.toDataURL("image/png").split(",")[1] };
  }, [a.buf.toString("base64"), b.buf.toString("base64")]);
  fs.writeFileSync(path.join(OUT, `cmp-diff-${width}.png`), Buffer.from(r.png, "base64"));
  await browser.close();

  console.log(`\n${width}px  old ${r.ha}px tall, new ${r.hb}px tall  ->  ${r.total} differing px (${((r.total / (r.w * r.h)) * 100).toFixed(3)} %)`);
  for (const [y, n] of r.bands) console.log(`  y ${String(y).padStart(5)}-${y + 200}: ${n}`);
  if (a.errors.length) console.log("  old page errors:", a.errors.slice(0, 3));
  if (b.errors.length) console.log("  NEW page errors:", b.errors.slice(0, 5));
}
