/* The deferred blocks of every v5 page (data-cv) and how they are named.
 *
 * WHY A KEY. content-visibility:auto skips a block until it comes near, and
 * until then the browser lays out a placeholder of `contain-intrinsic-size`.
 * One value for all fifteen blocks (900px) was wrong by thousands of pixels:
 * measured 16.9.2026 with the skill's cv-audit.mjs, the page grew by 3.402 px
 * on a phone and shrank by 3.095 px on a desktop during the first scroll, so
 * anchors landed beside their section and the scrollbar jumped. The fix is a
 * measured height per block and per viewport width, written into the build.
 *
 * The measured numbers need a name that survives a rebuild. The export's class
 * names (s249, s449w04 ...) are renumbered whenever the design changes, so the
 * key is, in this order: the block's id, its data-screen-label, or its position
 * among the deferred blocks. The last one shifts when a block is added or
 * removed - v5build.mjs then reports the key it cannot find and falls back to
 * the old 900px for it, and `node tools/v5heights.mjs` measures again.
 *
 * Shared by v5build.mjs (stamps the key into data-cv and emits the CSS) and
 * v5heights.mjs (measures the built page and writes v5-heights.json).
 */
import path from "node:path";

export const HEIGHTS_FILE = path.join(import.meta.dirname, "v5-heights.json");

/* Where the heights are sampled. The page's own breakpoints are 520, 620, 760,
 * 960, 1080 and 1280 CSS px; a height rules from the width it was measured at
 * up to the next sample. 1350 is Lighthouse's desktop viewport and the width
 * the skill's cv-audit.mjs checks at, so it is sampled exactly. Below
 * MOBILE_BELOW the browser is emulated as a phone (touch, isMobile, DPR 1.75),
 * because `(pointer:coarse)` changes the layout. */
export const WIDTHS = [412, 620, 760, 960, 1280, 1350];
export const MOBILE_BELOW = 760;

export function slug(s) {
  return String(s)
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* `index` is the block's position among all data-cv blocks in document order, 1-based. */
export function cvKey({ id, label }, index) {
  if (id) return id;
  if (label) return slug(label);
  return "cv-" + index;
}
