/* The driver every browser tool in here runs on.
 *
 * They used to drive `agent-browser`. On this PC that CLI hangs on `set
 * viewport` — no output, no exit — and it has now done so on two separate
 * days, surviving a full cleanup (10 orphaned Chrome processes killed, 7 stale
 * daemon pid files removed, fresh session name). A gate that cannot be run is
 * not a gate, so the orchestration moved to playwright-core.
 *
 * `probeSource()` below loads a measuring probe from disk and is currently
 * unused: the four tools that needed it measured v3 classes and moved to
 * archive/site-v3-tools/ on 11.9.2026. It is kept because the pattern — keep
 * the measuring logic in a file, evaluate it verbatim — is the right one, and
 * the next probe should use it rather than inlining a page function.
 *
 * playwright-core, not playwright: no browser download. The browsers are
 * already on both machines under the ms-playwright cache, and this file finds
 * them rather than being told where they are.
 */
import { chromium } from "playwright-core";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const BASE = process.env.MCD_BASE || "http://127.0.0.1:8898";

/* The cache directory differs per platform, and the folder inside it carries a
 * build number that changes with every playwright release — so pick the
 * highest one present instead of pinning a number that goes stale. */
function chromeCache() {
  if (process.platform === "win32") {
    return path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local"), "ms-playwright");
  }
  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Caches", "ms-playwright");
  }
  return path.join(os.homedir(), ".cache", "ms-playwright");
}

/* chrome-win64, not chrome-win. The short name is the folder playwright used
 * to ship and costs a "executable doesn't exist" that reads like a missing
 * install rather than a wrong path. */
const BINARIES = [
  ["chrome-win64", "chrome.exe"],
  ["chrome-win", "chrome.exe"],
  ["chrome-mac", "Chromium.app/Contents/MacOS/Chromium"],
  ["chrome-mac-arm64", "Chromium.app/Contents/MacOS/Chromium"],
  ["chrome-linux", "chrome"],
];

export function findChrome() {
  if (process.env.MCD_CHROME) return process.env.MCD_CHROME;
  const cache = chromeCache();
  if (!fs.existsSync(cache)) return null;
  const builds = fs
    .readdirSync(cache)
    .filter((d) => /^chromium-\d+$/.test(d))
    .sort((a, b) => Number(b.slice(9)) - Number(a.slice(9)));
  for (const b of builds) {
    for (const [dir, exe] of BINARIES) {
      const p = path.join(cache, b, dir, ...exe.split("/"));
      if (fs.existsSync(p)) return p;
    }
  }
  return null;
}

/* A dead server answers every question with an error page, and an error page
 * has no accent text, no mosaics and no console errors — so a gate run against
 * one reports a clean pass on nothing at all. It has already done that once. */
export async function requireServer() {
  try {
    const r = await fetch(BASE + "/index.html");
    if (!r.ok) throw new Error("HTTP " + r.status);
  } catch (e) {
    console.error(
      `the dev server is not answering on ${BASE} - start it with: python prodserve.py 8898 --dev\n  (${e.message})`
    );
    process.exit(2);
  }
}

export function probeSource(name) {
  return fs.readFileSync(path.join(import.meta.dirname, name), "utf8");
}

export async function launch(width, height) {
  const executablePath = findChrome();
  if (!executablePath) {
    console.error(
      "no chromium found under the ms-playwright cache.\n" +
        "  install one with:  npx playwright install chromium\n" +
        "  or point MCD_CHROME at an existing binary."
    );
    process.exit(2);
  }
  /* MCD_HEADED=1 runs a visible browser. Not a debugging nicety: Web3Forms sits
   * behind a Cloudflare bot check that answers a headless Chromium - and plain
   * node fetch, browser User-Agent or not - with a 403 challenge page. The only
   * way to prove the contact channel actually carries a message is to send it
   * from a real browser. See tools/form_probe.mjs. */
  const browser = await chromium.launch({
    executablePath,
    headless: !process.env.MCD_HEADED,
  });
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  return { browser, context };
}

/* Walk the page the way the shell gate did: the sections are revealed on
 * scroll, so anything measured without scrolling is measured before it exists.
 * Back to the top afterwards, because the accent probe reads the nav against
 * the hero and the nav's own bar is transparent until the page has scrolled. */
export async function settle(page, { deep = true } = {}) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(deep ? 1500 : 700);
  if (!deep) return;
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1600);
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(700);
}

/* This used to take a theme and write it to localStorage before the page
 * booted, because a stored preference read back at boot would otherwise leak
 * the previous page's theme into the next run. There is one theme now (owner,
 * 10.9.) and nothing to set — but the site still has a tonal plan inside it,
 * so what a probe measures still depends on which BAND an element sits on,
 * not on a global switch. */
export async function open(context, url) {
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") errors.push(m.type() + ": " + m.text());
  });
  await page.goto(url, { waitUntil: "domcontentloaded" });
  page.mcdErrors = errors;
  return page;
}
