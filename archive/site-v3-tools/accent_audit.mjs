/* Every element painting accent-coloured text, measured against the background
 * actually behind it.
 *
 *   node tools/accent_audit.mjs [width] [height]
 *   bash tools/accent_audit.sh  [width] [height]   (same thing, kept for muscle memory)
 *
 * Exists because --acc (the logo yellow) measures 1.48:1 on paper and 11.99:1
 * on ink: the SAME token is fine on one surface and unreadable on the other, so
 * a rule that looks right in the stylesheet can still be wrong on the page.
 * Text uses --acc-text, which resolves to --acc-ink (#806400) on light
 * surfaces; fills and lines keep --acc.
 *
 * It used to run every page twice, once per theme. There is one theme now
 * (owner, 10.9.) — but the tonal plan inside it did NOT go away: .band--ink
 * and .band--paper are still light and dark surfaces on the same page, and
 * --acc-text still resolves to --acc-ink (#806400) on a paper band. So this
 * gate lost half its passes and none of its job.
 *
 * The wordmark is the one deliberate failure: the owner's standing rule is that
 * the logo yellow is never re-tinted, and WCAG 1.4.3 exempts logotypes. It
 * appears twice per page (nav + footer). Any OTHER failure is a real one.
 *
 * It also measures the PIXEL HEADLINES, by reading their canvases. Those are
 * not text by the time anyone sees them, and the colour on them is a travelling
 * gradient no stylesheet declares — this audit passed while the wave's
 * blue-violet sat at 2.64:1 on the near-black band, because everything else
 * here asks getComputedStyle and a canvas answers to nobody.
 *
 * Exits non-zero if anything but the wordmark fails.
 */
import { BASE, launch, open, probeSource, requireServer, settle } from "./browser.mjs";

const W = Number(process.argv[2] || 1440);
const H = Number(process.argv[3] || 900);
const PAGES = [
  "index.html",
  "contact.html",
  "services/ai-tools.html",
  "services/web-apps.html",
  "services/websites.html",
  "services/software.html",
];

await requireServer();
const PROBE = probeSource("accent_audit_probe.js");
const { browser, context } = await launch(W, H);

let fail = 0;
for (const p of PAGES) {
  const page = await open(context, `${BASE}/${p}`);
  await settle(page);

  let d;
  try {
    d = JSON.parse(await page.evaluate(PROBE));
  } catch (e) {
    console.log(`${p} PROBE THREW: ${e.message}`);
    fail = 1;
    await page.close();
    continue;
  }

  const real = d.fails.filter((f) => f.sel !== "i");
  console.log(
    `${p} accent nodes ${d.accentTextNodes}, pixel canvases ${d.canvasesChecked} ` +
      `(${d.canvasesSkipped} not settled), gradient text ${d.gradientTextChecked || 0}, ` +
      `fields ${d.fieldsChecked || 0}, failing ${d.failing}, excluding the wordmark ${real.length}`
  );
  for (const f of real) console.log("   ", f.sel, f.fg, f.ratio, "<", f.need, "|", f.text);

  /* Nothing found is not a pass, it is an absent measurement. Every page on
   * this site has accent text AND at least one pixel headline; a run that
   * sees neither is looking at an error page, a page that never booted, or a
   * probe that threw. */
  const measured =
    d.accentTextNodes || d.canvasesChecked || (d.gradientTextChecked || 0) || (d.fieldsChecked || 0);
  if (!measured) {
    console.log("    NOTHING MEASURED on this page - the probe saw no accent text and no mosaic");
    fail = 1;
  } else if (real.length) {
    fail = 1;
  }
  await page.close();
}

await browser.close();
if (fail) {
  console.log("\nFAIL — accent text below its required contrast somewhere other than the wordmark.");
  process.exit(1);
}
console.log("\naccent text passes on every page, ink bands and paper bands (wordmark exempt by decision)");
