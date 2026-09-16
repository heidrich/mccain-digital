/* Does the workshop (v5/dev/) keep its promise: nothing about it exists before
 * the visitor has done something real, and everything about it works once
 * they ask for it.
 *
 *   python3 prodserve.py 8897           # the built page, production headers
 *   node tools/v5dev-check.mjs          # http://127.0.0.1:8897/v5/
 *   node tools/v5dev-check.mjs --url http://127.0.0.1:8897/v5/ --out <dir> --quick
 *
 * WHY IT EXISTS
 * The protection rule ("no DOM node, no request to /v5/dev/, until ten seconds
 * after the visitor's first click, key, wheel or touch" - owner, 16.9.2026) is
 * a promise to PageSpeed that no Lighthouse run ever checks - Lighthouse never
 * clicks, types, scrolls with a wheel or touches anything, so a page that
 * breaks this rule still scores 100 in the lab and only costs real visitors.
 * `window.scrollTo` (used by v5heights.mjs and friends to force rendering)
 * does not count as an interaction either, and this script deliberately
 * relies on that: phase 1 scrolls the page and must still see nothing.
 * Moving the mouse does not count either: a visitor who only moves the
 * pointer has not yet decided to stay.
 *
 * Options:
 *   --url   <page>    default http://127.0.0.1:8897/v5/
 *   --out   <dir>     default <tmpdir>/v5dev-check  (screenshots land here)
 *   --quick           shortens phase 1's no-interaction wait (16 s -> 12 s)
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright-core";
import { findChrome } from "./browser.mjs";

const argv = process.argv.slice(2);
function flag(name, fallback) {
  const i = argv.indexOf(name);
  return i !== -1 && argv[i + 1] !== undefined ? argv[i + 1] : fallback;
}
const URL = flag("--url", "http://127.0.0.1:8897/v5/");
const OUT = flag("--out", path.join(os.tmpdir(), "v5dev-check"));
const QUICK = argv.includes("--quick");
const WERKSTATT_URL = URL + (URL.includes("?") ? "&werkstatt" : "?werkstatt");

fs.mkdirSync(OUT, { recursive: true });

let failures = 0;
function check(pass, msg) {
  console.log((pass ? "ok  " : "FAIL") + " " + msg);
  if (!pass) failures++;
  return pass;
}

/* One record shape for every diagnostic channel, timestamped relative to the
 * moment this page started being watched (goto is called right after). */
const consoleIssues = []; // { label, t, type, text }
const pageErrors = []; // { label, t, text }
const requestFailures = []; // { label, t, url, error }
const devRequests = []; // { label, t, url, method }

/* The phase currently running, for labelling diagnostics. A listener is wired
 * once per page and then outlives the phase it was wired in (page1 carries
 * its listeners from phase 1 through phase 4), so the label has to be read at
 * event time from this shared, mutable value - not captured once at wiring
 * time - or a request phase 3 makes on page1 would be reported as "phase 1"
 * because that is where page1's listeners happened to be attached. */
let currentPhase = "startup";

function watch(page) {
  const t0 = Date.now();
  page.on("console", (m) => {
    const type = m.type();
    if (type === "error" || type === "warning") {
      consoleIssues.push({ label: currentPhase, t: Date.now() - t0, type, text: m.text() });
    }
  });
  page.on("pageerror", (e) => pageErrors.push({ label: currentPhase, t: Date.now() - t0, text: e.message }));
  page.on("requestfailed", (r) =>
    requestFailures.push({ label: currentPhase, t: Date.now() - t0, url: r.url(), error: r.failure()?.errorText || "?" })
  );
  page.on("request", (r) => {
    const u = r.url();
    if (u.includes("/v5/dev/")) devRequests.push({ label: currentPhase, t: Date.now() - t0, url: u, method: r.method() });
  });
}

async function runPhase(title, fn) {
  currentPhase = title;
  console.log(`\n=== ${title} ===`);
  try {
    await fn();
  } catch (e) {
    check(false, `${title} threw before finishing its checks: ${(e && e.message ? e.message : String(e)).slice(0, 300)}`);
  }
}

/* The browser's own clock (performance.now), not this script's - the two drift
 * apart under load, and a 10.0-12.5 s window is tight enough that the
 * difference matters. Self-contained on purpose: page.evaluate ships the
 * function's source to the browser and runs it there, so it cannot close over
 * anything defined on the Node side. */
const NOW = () => performance.now();

/* Interact at `act`, then watch the switch: it must stay away for 8.5 s and
 * arrive between 10 s and 12.5 s after the action, measured on the page's clock. */
async function expectSwitchTenSecondsAfter(page, label, act) {
  const t0 = await page.evaluate(NOW);
  await act();
  await page.waitForTimeout(8500);
  const early = await page.locator("[data-v5-dev-switch]").count();
  check(early === 0, `${label}: no switch 8.5 s after the action (found ${early})`);
  let appearedAt = null;
  const deadline = Date.now() + 6000;
  for (;;) {
    const n = await page.locator("[data-v5-dev-switch]").count();
    if (n > 0) { appearedAt = (await page.evaluate(NOW)) - t0; break; }
    if (Date.now() > deadline) break;
    await page.waitForTimeout(100);
  }
  check(appearedAt !== null, `${label}: switch appears at all after the action`);
  if (appearedAt !== null) check(appearedAt >= 10000 && appearedAt <= 12500, `${label}: switch appears 10.0-12.5 s after the action (got ${appearedAt.toFixed(0)} ms)`);
  return appearedAt !== null;
}

console.error(`v5dev-check: checking ${URL}${QUICK ? " (quick)" : ""}, output in ${OUT}`);

const executablePath = findChrome();
if (!executablePath) {
  console.error("no chromium under the ms-playwright cache - npx playwright install chromium, or MCD_CHROME=<binary>");
  process.exit(2);
}
try {
  const r = await fetch(URL);
  if (!r.ok) throw new Error("HTTP " + r.status);
} catch (e) {
  console.error(`v5dev-check: ${URL} does not answer (${e.message}) - start: python3 prodserve.py 8897`);
  process.exit(2);
}

const browser = await chromium.launch({ executablePath, headless: true });
let devOpened = false;

try {
  let ctx1, page1;

  await runPhase("Phase 1: no dev bytes before any real interaction (desktop 1350x940)", async () => {
    ctx1 = await browser.newContext({ viewport: { width: 1350, height: 940 } });
    page1 = await ctx1.newPage();
    watch(page1);
    await page1.goto(URL, { waitUntil: "load" });
    /* Programmatic scrolling only - must NOT count as an interaction. */
    await page1.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page1.waitForTimeout(200);
    await page1.evaluate(() => window.scrollTo(0, 0));
    /* Mouse movement alone is not an action either. */
    await page1.mouse.move(300, 300);
    await page1.mouse.move(600, 500);
    const waitMs = QUICK ? 12000 : 16000;
    await page1.waitForTimeout(waitMs);

    const switchCount = await page1.locator("[data-v5-dev-switch]").count();
    check(switchCount === 0, `no [data-v5-dev-switch] node after ${waitMs}ms of load+scrollTo+mouse moves with zero real interaction (found ${switchCount})`);
    const asideCount = await page1.locator("#v5-dev").count();
    check(asideCount === 0, `no #v5-dev node after ${waitMs}ms with zero real interaction (found ${asideCount})`);
    check(devRequests.length === 0, `no request to /v5/dev/ after ${waitMs}ms with zero real interaction (saw ${devRequests.length})`);
  });

  await runPhase("Phase 2a: same tab, a key press starts the ten seconds", async () => {
    const ok = await expectSwitchTenSecondsAfter(page1, "key", () => page1.keyboard.press("Shift"));
    if (ok) {
      const handle = await page1.locator("[data-v5-dev-switch]").first();
      const state = await handle.getAttribute("data-state");
      const expanded = await handle.getAttribute("aria-expanded");
      check(state === "idle", `switch data-state is "idle" right after appearing (got "${state}")`);
      check(expanded === "false", `switch aria-expanded is "false" right after appearing (got "${expanded}")`);
    }
  });

  await runPhase("Phase 2b: second tab, an early pointer press starts the ten seconds", async () => {
    const page2 = await ctx1.newPage();
    watch(page2);
    await page2.goto(URL, { waitUntil: "load" });
    await page2.waitForTimeout(1000);
    await expectSwitchTenSecondsAfter(page2, "pointer", () => page2.mouse.click(5, 5));
    check(page2.url().replace(/#.*$/, "") === URL.replace(/#.*$/, ""), `the early click at (5,5) did not navigate (url ${page2.url()})`);
    await page2.close();
  });

  await runPhase("Phase 3: opening the workshop", async () => {
    await page1.click("[data-v5-dev-switch]");
    const opened = await page1
      .waitForFunction(
        () => {
          const aside = document.getElementById("v5-dev");
          const link = document.getElementById("v5-dev-css");
          return !!aside && !!link && !!link.sheet;
        },
        null,
        { timeout: 8000 }
      )
      .then(() => true)
      .catch(() => false);
    check(opened, "#v5-dev appears and #v5-dev-css has a loaded stylesheet within 8s of clicking the switch");
    devOpened = opened;
    if (!opened) {
      check(false, "skipping the rest of phase 3 (tabs, pick mode, crawler view) - #v5-dev never opened");
      return;
    }

    await page1.screenshot({ path: path.join(OUT, "roentgen-element.png") });

    const TABS = ["element", "tree", "code", "perf", "knobs"];
    for (const tab of TABS) {
      await page1.click(`#v5-dev [role="tab"][data-tab="${tab}"]`);
      await page1.waitForTimeout(400);
      const visible = await page1
        .locator(`#v5-dev [role="tabpanel"][data-panel="${tab}"]`)
        .isVisible()
        .catch(() => false);
      check(visible, `tab "${tab}" shows its [role="tabpanel"][data-panel="${tab}"]`);
      await page1.screenshot({ path: path.join(OUT, `roentgen-${tab}.png`) });
    }

    /* Knobs: one switch on, the hue turned, then the switch off again - the
     * accent must survive that (each knob undoes only itself), and phase 4
     * checks that Escape takes the accent back too. */
    await page1.click('#v5-dev [role="tab"][data-tab="knobs"]');
    await page1.click("#v5-dev-knob-motion-sw");
    await page1.locator("#v5-dev-hue").evaluate((el) => { el.value = "20"; el.dispatchEvent(new Event("input", { bubbles: true })); });
    await page1.waitForTimeout(200);
    const knobsOn = await page1.evaluate(() => !!document.getElementById("v5-dev-knob-motion") && document.documentElement.style.getPropertyValue("--acc") !== "");
    check(knobsOn, "knobs: the motion switch injects its style and the hue knob sets --acc on <html>");
    await page1.click("#v5-dev-knob-motion-sw");
    await page1.waitForTimeout(100);
    const motionOff = await page1.evaluate(() => !document.getElementById("v5-dev-knob-motion") && document.documentElement.style.getPropertyValue("--acc") !== "");
    check(motionOff, "knobs: switching motion off removes only its own style, the accent stays");

    await page1.click('#v5-dev [data-action="pick"]');
    const pickOn = await page1.evaluate(() => document.documentElement.classList.contains("v5-dev-pick"));
    check(pickOn, 'html.v5-dev-pick is set after toggling [data-action="pick"]');

    const urlBeforePick = page1.url();
    const h1Box = await page1.locator("h1").first().boundingBox();
    if (h1Box) {
      await page1.mouse.click(h1Box.x + h1Box.width / 2, h1Box.y + h1Box.height / 2);
    } else {
      check(false, "could not find an <h1> on the page to click for pick mode");
    }
    await page1.waitForTimeout(300);

    const pickOff = await page1.evaluate(() => !document.documentElement.classList.contains("v5-dev-pick"));
    check(pickOff, "html.v5-dev-pick is removed again after picking an element");
    const selected = page1.locator('#v5-dev [data-panel="element"] [data-selected-path]');
    const selectedCount = await selected.count();
    check(selectedCount > 0, '[data-panel="element"] [data-selected-path] exists after picking the h1');
    if (selectedCount > 0) {
      const txt = (await selected.first().textContent()) || "";
      check(/h1/i.test(txt), `the selected-path breadcrumb mentions "h1" (got "${txt.trim().slice(0, 80)}")`);
    }
    check(page1.url() === urlBeforePick, "picking the h1 did not navigate the page");

    await page1.click('[data-view-switch="crawler"]');
    const crawlerOn = await page1.locator('#v5-dev[data-view="crawler"]').count();
    check(crawlerOn > 0, '#v5-dev switches to data-view="crawler"');

    const stationDeadline = Date.now() + 8000;
    let stations = [];
    for (;;) {
      stations = await page1.$$eval("#v5-dev [data-station]", (els) => els.map((el) => el.getAttribute("data-state")));
      if (!stations.some((s) => s === "loading") || Date.now() > stationDeadline) break;
      await page1.waitForTimeout(200);
    }
    const stillLoading = stations.filter((s) => s === "loading").length;
    check(stillLoading === 0, `no [data-station] stuck on "loading" more than 8s (${stillLoading} of ${stations.length} still loading)`);
    const readyCount = stations.filter((s) => s === "ready").length;
    const missingCount = stations.filter((s) => s === "missing").length;
    console.log(`     stations: ${stations.length} total, ${readyCount} ready, ${missingCount} missing, ${stillLoading} loading`);
    await page1.locator("#v5-dev").screenshot({ path: path.join(OUT, "crawler.png") });
  });

  await runPhase("Phase 4: closing, module cache, reopening", async () => {
    if (!devOpened) {
      check(false, "skipping phase 4 - the workshop never opened in phase 3");
      return;
    }
    await page1.keyboard.press("Escape");
    const closed = await page1
      .waitForFunction(() => !document.getElementById("v5-dev") && !document.getElementById("v5-dev-layer"), null, { timeout: 1000 })
      .then(() => true)
      .catch(() => false);
    check(closed, "#v5-dev and #v5-dev-layer are removed within 1s of Escape");

    const expanded = await page1.locator("[data-v5-dev-switch]").getAttribute("aria-expanded").catch(() => null);
    check(expanded === "false", `switch aria-expanded is "false" after closing (got "${expanded}")`);

    const leftover = await page1.evaluate(() =>
      Array.from(document.querySelectorAll('style[id^="v5-dev-"], link[id^="v5-dev-"]'))
        .map((n) => n.id)
        .filter((id) => id !== "v5-dev-switch-css" && id !== "v5-dev-css")
    );
    check(leftover.length === 0, `no leftover <style>/<link> with id prefix "v5-dev-" besides the switch/dev stylesheets (found: ${leftover.join(", ") || "none"})`);

    const strayClass = await page1.evaluate(() => Array.from(document.documentElement.classList).find((c) => c.startsWith("v5-dev-")) || null);
    check(!strayClass, `html carries no class starting with "v5-dev-" after closing (found "${strayClass}")`);
    const strayInline = await page1.evaluate(() => ({ acc: document.documentElement.style.getPropertyValue("--acc"), knobs: document.querySelectorAll("[data-v5-dev-style]").length }));
    check(strayInline.acc === "" && strayInline.knobs === 0, `closing undoes the knobs: no --acc left on <html>, no [data-v5-dev-style] nodes (acc "${strayInline.acc}", nodes ${strayInline.knobs})`);

    const moduleRequestsBefore = devRequests.filter((r) => r.url.includes("/v5/dev/index.js")).length;
    await page1.click("[data-v5-dev-switch]");
    const reopened = await page1.waitForSelector("#v5-dev", { timeout: 8000 }).then(() => true).catch(() => false);
    check(reopened, "#v5-dev reappears when the switch is clicked again");
    const moduleRequestsAfter = devRequests.filter((r) => r.url.includes("/v5/dev/index.js")).length;
    check(moduleRequestsAfter === moduleRequestsBefore, `reopening does not re-fetch /v5/dev/index.js (module cache) - was ${moduleRequestsBefore} request(s), now ${moduleRequestsAfter}`);

    if (reopened) {
      await page1.click('#v5-dev [data-action="close"]');
      const closedAgain = await page1
        .waitForFunction(() => !document.getElementById("v5-dev"), null, { timeout: 1000 })
        .then(() => true)
        .catch(() => false);
      check(closedAgain, '#v5-dev is removed after clicking [data-action="close"]');
    } else {
      check(false, 'skipping the [data-action="close"] check - #v5-dev did not reopen');
    }
  });

  await runPhase("Phase 5: phone, ?werkstatt opens immediately", async () => {
    const ctx3 = await browser.newContext({
      viewport: { width: 412, height: 915 },
      deviceScaleFactor: 1.75,
      isMobile: true,
      hasTouch: true,
    });
    try {
      const page3 = await ctx3.newPage();
      watch(page3);
      await page3.goto(WERKSTATT_URL, { waitUntil: "load" });
      const visible = await page3
        .waitForFunction(
          () => {
            /* Not offsetParent: it is null for every position:fixed element. */
            const el = document.getElementById("v5-dev");
            return !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
          },
          null,
          { timeout: 8000 }
        )
        .then(() => true)
        .catch(() => false);
      check(visible, `#v5-dev is visible within 8s of loading ${WERKSTATT_URL}`);
      if (!visible) {
        check(false, "skipping the rest of phase 5 (crawler tap, escape) - #v5-dev never appeared on ?werkstatt");
        return;
      }
      await page3.screenshot({ path: path.join(OUT, "phone-roentgen.png") });
      await page3.tap('[data-view-switch="crawler"]');
      await page3.waitForTimeout(400);
      await page3.screenshot({ path: path.join(OUT, "phone-crawler.png") });
      await page3.keyboard.press("Escape");
      const closed = await page3
        .waitForFunction(() => !document.getElementById("v5-dev"), null, { timeout: 1000 })
        .then(() => true)
        .catch(() => false);
      check(closed, "#v5-dev is removed after Escape on the phone");
    } finally {
      await ctx3.close();
    }
  });

  if (ctx1) await ctx1.close();

  console.log("\n=== diagnostics (console/page/request errors always count as failures) ===");
  const errorMsgs = consoleIssues.filter((c) => c.type === "error");
  const warnMsgs = consoleIssues.filter((c) => c.type === "warning");
  for (const e of errorMsgs) check(false, `console error [${e.label} +${e.t}ms]: ${e.text.slice(0, 200)}`);
  if (warnMsgs.length) {
    console.log(`  ${warnMsgs.length} console warning(s) (not counted as a failure):`);
    for (const w of warnMsgs) console.log(`    [${w.label} +${w.t}ms] ${w.text.slice(0, 200)}`);
  }
  for (const p of pageErrors) check(false, `page error [${p.label} +${p.t}ms]: ${p.text.slice(0, 200)}`);
  for (const r of requestFailures) check(false, `request failed [${r.label} +${r.t}ms]: ${r.error} ${r.url}`);

  console.log(`\n/v5/dev/ requests seen (${devRequests.length}):`);
  if (!devRequests.length) console.log("  (none)");
  for (const d of devRequests) console.log(`  [${d.label} +${d.t}ms] ${d.method} ${d.url}`);

  console.log(`\n=== result: ${failures ? failures + " check(s) FAILED" : "ALL OK"} ===`);
  console.log(`screenshots + output in ${OUT}`);
  process.exitCode = failures ? 1 : 0;
} finally {
  await browser.close();
}
