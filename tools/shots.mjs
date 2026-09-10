/* Screenshots for the owner to judge by eye.
 *
 *   node tools/shots.mjs <outdir> <width> <page#anchor-or-selector> ...
 *
 * A selector argument scrolls that element to the top of the viewport and
 * shoots the viewport, not the element: what is being judged is how big the
 * type is AGAINST the window, and an element-only shot throws exactly that
 * away.
 */
import fs from "node:fs";
import path from "node:path";
import { BASE, launch, open, requireServer, settle } from "./browser.mjs";

const [outdir, widthArg, ...targets] = process.argv.slice(2);
const width = Number(widthArg) || 1440;
const height = width < 600 ? 844 : 900;

fs.mkdirSync(outdir, { recursive: true });
await requireServer();
const { browser, context } = await launch(width, height);

for (const t of targets) {
  const [file, sel] = t.split("##");
  const page = await open(context, BASE + "/" + file);
  /* html has scroll-behavior:smooth, so every programmatic scroll is an
   * ANIMATION. settle() sends the page to the bottom and back, and on a page
   * this long the trip back does not finish inside its wait - the first shot
   * taken this way was of the middle of the page, believed to be the hero. */
  await page.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
  await settle(page);
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForFunction(() => scrollY === 0, null, { timeout: 5000 }).catch(() => {});
  if (sel) {
    const ok = await page.evaluate((s) => {
      const el = document.querySelector(s);
      if (!el) return false;
      el.scrollIntoView({ block: "start", behavior: "instant" });
      return true;
    }, sel);
    if (!ok) {
      console.error("  MISSING selector " + sel + " on " + file);
      await page.close();
      continue;
    }
    await page.waitForTimeout(1200);
  }
  const name =
    file.replace(/[/.]/g, "-") + (sel ? "--" + sel.replace(/[^a-z0-9]+/gi, "") : "") + "-" + width + ".png";
  const out = path.join(outdir, name);
  await page.screenshot({ path: out });
  console.log("  " + out);
  await page.close();
}

await browser.close();
