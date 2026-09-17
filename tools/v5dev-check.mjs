/* Does the workshop (/werkstatt/) keep its promise: nothing about it exists before
 * the visitor has done something real, and everything about it works once
 * they ask for it. Runs against any of the 21 routes tools/pages.mjs builds
 * under <route>/, not just the start page - the switch, the ten-second
 * rule and the workshop itself all come from v5/runtime.js, which is shared
 * by every route.
 *
 *   python3 prodserve.py 8897                    # the built page, production headers
 *   node tools/v5dev-check.mjs                   # http://127.0.0.1:8897/
 *   node tools/v5dev-check.mjs --route /kontakt/  # http://127.0.0.1:8897/kontakt/
 *   node tools/v5dev-check.mjs --url http://127.0.0.1:8897/ --out <dir> --quick
 *
 * WHY IT EXISTS
 * The protection rule ("no DOM node, no request to /werkstatt/, until ten seconds
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
 *   --route <route>   default "/" - one of tools/pages.mjs's PAGES[i].route;
 *                      the page URL becomes <base><route>
 *   --base  <origin>  default http://127.0.0.1:8897
 *   --url   <page>    overrides --route/--base outright, default <base><route>
 *   --out   <dir>     default <tmpdir>/v5dev-check  (screenshots land here)
 *   --quick           shortens phase 1's no-interaction wait (16 s -> 12 s)
 *
 * Only the start page ("/") carries the workshop's own invitation band
 * (#werkstatt-band, its [data-v5-dev-open] button) - none of the five phases
 * below depend on it, they all drive the switch itself
 * ([data-v5-dev-switch], present on every route once armed) or open
 * ?werkstatt directly, so the same phases run unchanged on any route.
 *
 * KONSOLE (17.9.2026)
 * The workshop stopped being a side drawer and became a console: docked to
 * the bottom or the right (applyShape() in werkstatt/index.js), resized by a
 * pointer- and keyboard-operable grip, with a third view ("Fragen") that
 * asks Claude with the workshop's own facts. Phase 3 now also checks: the
 * default dock and the grip's role/aria-valuenow; ArrowUp/Home/End on the
 * grip (+40 px, the window's full height, 220 px); the two dock-to buttons
 * swapping data-dock and setting --wk-w/scroll-padding-right; the "Fragen"
 * form sending a question and getting a real answer even though this local
 * server has no /api/ask (501/405 - the browser's own "Failed to load
 * resource" console line for exactly that URL is expected and filtered out
 * in watch(), see the comment there, not treated as a failure); and the
 * glossary's .wk-term buttons opening and closing #v5-dev-pop. Phase 4 now
 * also checks that closing drops scroll-padding-* and data-wk-resizing from
 * <html> and restores --acc to whatever it was BEFORE the switch was ever
 * clicked - not to "", because logic.src.js's own applyAccent() sets --acc
 * on <html> on every route, independent of the workshop entirely (see the
 * comment at strayInline below). Since the console now hides its own switch
 * ([data-v5-dev-switch], CSS: [aria-expanded=true]{display:none}) while
 * open and shows it again once closed, phases 3 and 4 check that directly
 * too. Phase 5 checks that the dock-to buttons stay CSS-hidden below the
 * 960 px dock breakpoint on the phone.
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
const BASE = flag("--base", "http://127.0.0.1:8897").replace(/\/$/, "");
const ROUTE = flag("--route", "/");
const URL = flag("--url", `${BASE}${ROUTE}`);
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
    if (type !== "error" && type !== "warning") return;
    const text = m.text();
    /* Chromium logs this line itself whenever a request's response is not ok
     * - including the workshop's own POST /api/ask/, which this local server
     * (prodserve.py, no POST route) always answers with 501/405. ask.js's
     * catch already turns that into an answer from the workshop's own facts
     * (see localAnswer() there), so this browser-generated line is not a
     * failure the workshop caused and must not fail the run. Filtered by the
     * exact failing URL, not by text alone, so a real broken request
     * elsewhere still counts as a console error. */
    const loc = m.location();
    if (type === "error" && text.startsWith("Failed to load resource:") && loc && /\/api\/ask\/?(?:[?#]|$)/.test(loc.url)) return;
    consoleIssues.push({ label: currentPhase, t: Date.now() - t0, type, text });
  });
  page.on("pageerror", (e) => pageErrors.push({ label: currentPhase, t: Date.now() - t0, text: e.message }));
  page.on("requestfailed", (r) =>
    requestFailures.push({ label: currentPhase, t: Date.now() - t0, url: r.url(), error: r.failure()?.errorText || "?" })
  );
  page.on("request", (r) => {
    const u = r.url();
    if (u.includes("/werkstatt/")) devRequests.push({ label: currentPhase, t: Date.now() - t0, url: u, method: r.method() });
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
  /* --acc on <html> before the switch is ever clicked (Phase 3), read back
   * by Phase 4's strayInline check - see the KONSOLE comment at the top and
   * the comment beside strayInline for why this is not simply "". */
  let accBefore = null;

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
    check(devRequests.length === 0, `no request to /werkstatt/ after ${waitMs}ms with zero real interaction (saw ${devRequests.length})`);
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
    accBefore = await page1.evaluate(() => document.documentElement.style.getPropertyValue("--acc"));
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

    /* The switch hides itself (CSS: [aria-expanded=true]{display:none}) the
     * moment the console is open, and comes back once it's closed again
     * (checked in phase 4) - no other check here may click or expect the
     * switch's visibility while #v5-dev is on screen. */
    const switchHiddenOpen = await page1.locator("[data-v5-dev-switch]").isVisible().catch(() => true);
    check(!switchHiddenOpen, "[data-v5-dev-switch] is hidden (display:none) while the console is open");

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

    /* ---- Konsole (17.9.2026): dock/grip baseline, grip keyboard, docking,
     * "Fragen", glossary - see the KONSOLE paragraph at the top of the file. */
    /* The free window is the default on a desktop (owner 17.9. evening);
     * the grip belongs to the bottom and right docks, so dock to the bottom
     * before the grip checks. */
    check((await page1.locator('#v5-dev[data-dock="float"]').count()) > 0, '#v5-dev opens as the free window on a desktop (data-dock="float")');
    check((await page1.locator('#v5-dev .wk-rs[data-edge="se"]').count()) > 0, 'the window has its corner handle (.wk-rs[data-edge="se"])');
    await page1.click('#v5-dev [data-dock-to="bottom"]');
    await page1.waitForTimeout(150);
    check((await page1.locator('#v5-dev[data-dock="bottom"]').count()) > 0, 'clicking [data-dock-to="bottom"] docks #v5-dev to the bottom (data-dock="bottom")');
    check((await page1.locator('#v5-dev .wk-grip[role="separator"]').count()) > 0, '.wk-grip carries role="separator"');
    const leadAfterOpen = ((await page1.locator("#v5-dev .wk-lead").textContent().catch(() => "")) || "").trim();
    check(leadAfterOpen.length > 0, `.wk-lead is not empty (got "${leadAfterOpen.slice(0, 60)}")`);
    const statusAfterOpen = ((await page1.locator("#v5-dev .wk-status").textContent().catch(() => "")) || "").trim();
    check(statusAfterOpen.length > 0, `.wk-status is not empty (got "${statusAfterOpen.slice(0, 60)}")`);

    /* Grip keyboard: ArrowUp grows the bottom dock by 40px, Home is the
     * window's full height, End is MIN_H (220) - see makeGrip() in
     * werkstatt/index.js. */
    const grip = page1.locator("#v5-dev .wk-grip");
    await grip.focus();
    const gripBefore = Number(await grip.getAttribute("aria-valuenow"));
    await grip.press("ArrowUp");
    await page1.waitForTimeout(100);
    const gripAfterUp = Number(await grip.getAttribute("aria-valuenow"));
    check(gripAfterUp === gripBefore + 40, `ArrowUp on the grip grows aria-valuenow by 40 (was ${gripBefore}, now ${gripAfterUp})`);
    const wkH = await page1.evaluate(() => document.getElementById("v5-dev").style.getPropertyValue("--wk-h"));
    check(wkH === `${gripAfterUp}px`, `ArrowUp updates --wk-h to match aria-valuenow (got "${wkH}", expected "${gripAfterUp}px")`);
    await grip.press("Home");
    await page1.waitForTimeout(100);
    const innerH = await page1.evaluate(() => innerHeight);
    const gripAfterHome = Number(await grip.getAttribute("aria-valuenow"));
    check(gripAfterHome === innerH, `Home sets the grip to the window's full height (got ${gripAfterHome}, innerHeight ${innerH})`);
    await grip.press("End");
    await page1.waitForTimeout(100);
    const gripAfterEnd = Number(await grip.getAttribute("aria-valuenow"));
    check(gripAfterEnd === 220, `End sets the grip to MIN_H 220 (got ${gripAfterEnd})`);
    /* Leave the console small: at full height it would cover the <h1> the
     * pick check below clicks, and the picker would hit the console instead
     * (17.9. evening, two failing checks for exactly that). */

    /* Docking: the two dock-to buttons swap #v5-dev between the bottom sheet
     * and the right-docked panel. */
    await page1.click('#v5-dev [data-dock-to="right"]');
    await page1.waitForTimeout(150);
    check((await page1.locator('#v5-dev[data-dock="right"]').count()) > 0, 'clicking [data-dock-to="right"] switches #v5-dev to data-dock="right"');
    const wkW = await page1.evaluate(() => document.getElementById("v5-dev").style.getPropertyValue("--wk-w"));
    check(wkW !== "", `docking right sets --wk-w on #v5-dev (got "${wkW}")`);
    const scrollPadRight = await page1.evaluate(() => document.documentElement.style.scrollPaddingRight);
    check(scrollPadRight !== "", `docking right sets scroll-padding-right on <html> (got "${scrollPadRight}")`);
    const dockToRightPressed = await page1.locator('#v5-dev [data-dock-to="right"]').getAttribute("aria-pressed");
    check(dockToRightPressed === "true", `[data-dock-to="right"] carries aria-pressed="true" while docked right (got "${dockToRightPressed}")`);
    await page1.click('#v5-dev [data-dock-to="bottom"]');
    await page1.waitForTimeout(150);
    check((await page1.locator('#v5-dev[data-dock="bottom"]').count()) > 0, 'clicking [data-dock-to="bottom"] switches #v5-dev back to data-dock="bottom"');

    /* "Fragen": this local server has no /api/ask (501/405, see the
     * console-filter comment in watch()), so the answer comes from the
     * workshop's own facts (ask.js's catch -> localAnswer) - it must still
     * arrive as a real message, not silently fail. */
    await page1.click('[data-view-switch="ask"]');
    await page1.waitForTimeout(150);
    check((await page1.locator('#v5-dev[data-view="ask"]').count()) > 0, '#v5-dev switches to data-view="ask"');
    const askFormVisible = await page1.locator("#v5-dev form.wk-askform").isVisible().catch(() => false);
    check(askFormVisible, 'form.wk-askform is visible in the "Fragen" view');
    await page1.locator("#v5-dev form.wk-askform input").fill("Was bedeutet LCP?");
    await page1.click('#v5-dev [data-action="ask-send"]');
    let askAnswer = "";
    const askDeadline = Date.now() + 8000;
    for (;;) {
      askAnswer = ((await page1.locator('#v5-dev .wk-msg[data-role="assistant"] .wk-msg-text').first().textContent().catch(() => "")) || "").trim();
      if (askAnswer.length > 20 || Date.now() > askDeadline) break;
      await page1.waitForTimeout(200);
    }
    check(askAnswer.length > 20, `.wk-msg[data-role="assistant"] answers within 8s with more than 20 characters (got ${askAnswer.length})`);
    await page1.click('[data-view-switch="roentgen"]');
    await page1.waitForTimeout(150);

    /* Glossary: at least one .wk-term on the element tab; the first click
     * opens #v5-dev-pop, Escape closes only the pop (a second Escape would
     * close #v5-dev itself, per onKeyDown in werkstatt/index.js). */
    await page1.click('#v5-dev [role="tab"][data-tab="element"]');
    await page1.waitForTimeout(150);
    const termCount = await page1.locator('#v5-dev [data-panel="element"] .wk-term').count();
    check(termCount > 0, '[data-panel="element"] has at least one .wk-term button');
    if (termCount > 0) {
      await page1.locator('#v5-dev [data-panel="element"] .wk-term').first().click();
      await page1.waitForTimeout(150);
      check((await page1.locator("#v5-dev-pop").count()) > 0, "clicking a .wk-term opens #v5-dev-pop");
      await page1.keyboard.press("Escape");
      await page1.waitForTimeout(150);
      check((await page1.locator("#v5-dev-pop").count()) === 0, "Escape closes #v5-dev-pop");
      check((await page1.locator("#v5-dev").count()) > 0, "…without closing #v5-dev itself");
    } else {
      check(false, "skipping the pop/Escape check - no .wk-term found on the element tab");
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
    if (!pickOff && h1Box) {
      const under = await page1.evaluate(([x, y]) => { const el = document.elementFromPoint(x, y); return el ? el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + "." + Array.from(el.classList).slice(0, 2).join(".") : "nothing"; }, [h1Box.x + h1Box.width / 2, h1Box.y + h1Box.height / 2]);
      console.log(`    diagnostic: under the pick click at (${Math.round(h1Box.x + h1Box.width / 2)}, ${Math.round(h1Box.y + h1Box.height / 2)}) is ${under}, scrollY ${await page1.evaluate(() => scrollY)}`);
    }
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

    /* The switch was hidden by CSS while #v5-dev was open (checked in phase
     * 3) - it must be visible again now that the console is gone. */
    const switchVisibleClosed = await page1.locator("[data-v5-dev-switch]").isVisible().catch(() => false);
    check(switchVisibleClosed, "[data-v5-dev-switch] is visible again once the console has closed");

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
    /* --acc is not the workshop's to empty: logic.src.js's own applyAccent()
     * sets --acc/--acc-soft/--acc-ring/--acc-text on <html> on EVERY route,
     * from componentDidMount, entirely independent of the workshop. Asserting
     * acc === "" would only ever pass by coincidence - because the accent
     * knob's own undo (werkstatt/knobs.js) calls style.removeProperty() for
     * each var, which wipes whatever was there, rather than restoring
     * whatever was there before the knob touched it. The promise the module
     * actually makes ("puts the page back the way it was") is checked
     * against the value phase 3 captured before the switch was ever clicked. */
    check(strayInline.acc === accBefore, `closing leaves --acc on <html> as it was before opening (was "${accBefore}", now "${strayInline.acc}")`);
    check(strayInline.knobs === 0, `closing undoes the knobs: no [data-v5-dev-style] nodes left (found ${strayInline.knobs})`);

    /* Since 17.9.2026 opening also writes scroll-padding-* and data-wk-resizing
     * (applyShape()/makeGrip() in werkstatt/index.js) - closing must drop
     * both, the same promise the leftover-node and stray-class checks above
     * already make for everything else the workshop touches. */
    const strayShape = await page1.evaluate(() => ({
      scrollPaddingBottom: document.documentElement.style.scrollPaddingBottom,
      scrollPaddingRight: document.documentElement.style.scrollPaddingRight,
      resizing: document.documentElement.getAttribute("data-wk-resizing"),
    }));
    check(strayShape.scrollPaddingBottom === "" && strayShape.scrollPaddingRight === "", `closing leaves no scroll-padding-* inline style on <html> (bottom "${strayShape.scrollPaddingBottom}", right "${strayShape.scrollPaddingRight}")`);
    check(strayShape.resizing === null, `closing leaves no data-wk-resizing on <html> (found "${strayShape.resizing}")`);

    const moduleRequestsBefore = devRequests.filter((r) => r.url.includes("/werkstatt/index.js")).length;
    await page1.click("[data-v5-dev-switch]");
    const reopened = await page1.waitForSelector("#v5-dev", { timeout: 8000 }).then(() => true).catch(() => false);
    check(reopened, "#v5-dev reappears when the switch is clicked again");
    const moduleRequestsAfter = devRequests.filter((r) => r.url.includes("/werkstatt/index.js")).length;
    check(moduleRequestsAfter === moduleRequestsBefore, `reopening does not re-fetch /werkstatt/index.js (module cache) - was ${moduleRequestsBefore} request(s), now ${moduleRequestsAfter}`);

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

      /* Below the 960 px dock breakpoint the console is always the bottom
       * sheet and there is nothing to dock elsewhere, so the CSS
       * (@media (max-width: 959.98px) { [data-dock-to]{display:none} })
       * hides both dock-to buttons on the phone. */
      check((await page3.locator('#v5-dev[data-dock="bottom"]').count()) > 0, '#v5-dev is docked to the bottom on the phone (data-dock="bottom")');
      /* Both buttons must exist (hidden by CSS, not missing from the markup),
       * otherwise isVisible() === false would pass for a button that is gone. */
      const dockBtnCount = await page3.locator('#v5-dev [data-dock-to]').count();
      check(dockBtnCount === 3, `the three [data-dock-to] buttons are in the markup on the phone too (found ${dockBtnCount})`);
      const dockToBottomVisible = await page3.locator('#v5-dev [data-dock-to="bottom"]').isVisible().catch(() => true);
      const dockToRightVisible = await page3.locator('#v5-dev [data-dock-to="right"]').isVisible().catch(() => true);
      check(!dockToBottomVisible && !dockToRightVisible, `[data-dock-to] buttons are hidden below the 960px breakpoint (bottom visible: ${dockToBottomVisible}, right visible: ${dockToRightVisible})`);

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

  console.log(`\n/werkstatt/ requests seen (${devRequests.length}):`);
  if (!devRequests.length) console.log("  (none)");
  for (const d of devRequests) console.log(`  [${d.label} +${d.t}ms] ${d.method} ${d.url}`);

  console.log(`\n=== result: ${failures ? failures + " check(s) FAILED" : "ALL OK"} ===`);
  console.log(`screenshots + output in ${OUT}`);
  process.exitCode = failures ? 1 : 0;
} finally {
  await browser.close();
}
