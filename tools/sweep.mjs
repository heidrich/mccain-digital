/* Loads every page in a fresh browser session, reports console errors, page
 * errors and a widget/overflow summary.
 *
 *   node tools/sweep.mjs [width] [height]
 *   bash tools/sweep.sh  [width] [height]   (same thing, kept for muscle memory)
 *
 * The third argument the shell version took was an agent-browser session name.
 * There are no sessions any more — every run gets its own context — so it is
 * accepted and ignored rather than turned into an error in old muscle memory.
 */
import { BASE, launch, open, probeSource, requireServer, settle } from "./browser.mjs";

const W = Number(process.argv[2] || 1280);
const H = Number(process.argv[3] || 820);
const PAGES = [
  "index.html",
  "404.html",
  "contact.html",
  "services/ai-tools.html",
  "services/web-apps.html",
  "services/websites.html",
  "services/software.html",
  "legal/imprint.html",
  "legal/privacy.html",
  "legal/terms.html",
  "legal/withdrawal.html",
];

await requireServer();
const PROBE = probeSource("probe.js");
const { browser, context } = await launch(W, H);

let bad = 0;
for (const p of PAGES) {
  console.log(`===== ${p} @ ${W}x${H} =====`);
  const page = await open(context, `${BASE}/${p}`);
  await settle(page, { deep: false });

  const errs = page.mcdErrors;
  const hard = errs.filter((e) => e.startsWith("pageerror") || e.startsWith("error"));
  console.log("--- page errors:");
  console.log(hard.length ? hard.slice(0, 12).join("\n") : "  none");
  console.log("--- console (errors/warnings):");
  const noisy = errs.filter((e) => /error|warn|failed|refused|404/i.test(e));
  console.log(noisy.length ? noisy.slice(0, 12).join("\n") : "  none");

  console.log("--- state:");
  try {
    const state = JSON.parse(await page.evaluate(PROBE));
    console.log(JSON.stringify(state, null, 1));
    /* A page that boots but overflows sideways, or ships an image with no alt
     * text, is not a pass just because nothing was logged. */
    if (state.overflowX !== "none") bad++;
    if (state.a11y.missingAlt || state.a11y.emptyLinks || state.a11y.btnNoName) bad++;
    if (state.h1 !== 1) bad++;
  } catch (e) {
    console.log("  PROBE THREW: " + e.message);
    bad++;
  }
  if (hard.length) bad++;
  await page.close();
}

await browser.close();
if (bad) {
  console.log(`\nFAIL — ${bad} page-level problems above (errors, sideways overflow, a11y basics or h1 count).`);
  process.exit(1);
}
console.log("\nevery page boots clean: no page errors, no sideways overflow, one h1, alt/name basics hold");
