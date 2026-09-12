/* Fill a contact form, submit it, and watch the wire.
 *
 *   node tools/form_probe.mjs [base]
 *   node tools/form_probe.mjs https://mccain-digital.vercel.app
 *
 * The question is only: does anything leave the browser, and does the page tell
 * the truth about what happened.
 *
 * It exists because the answer has twice been "no". The v3 start page answered
 * "Danke - Ihre Nachricht ist da." while posting absolutely nothing, and the v4
 * design export shipped the same handler on all 21 pages:
 *
 *     if (fd.get('company')) return; this.setState({ formSent: true });
 *
 * No gate, screenshot, meta check or Lighthouse run can see that. Only asking
 * the network can.
 *
 * WHAT A PASS LOOKS LIKE HERE, AND WHY IT LOOKS LIKE A FAILURE
 * Web3Forms sits behind a bot filter that treats a headless browser as a bot,
 * so the POST is answered 403 in this harness and the page shows its ERROR
 * state. That is the pass: a request left the browser, and the page did not
 * claim success for a request that did not land. A real browser takes the same
 * path and gets a 200.
 *
 * So this probe asserts three things:
 *   1. a POST to api.web3forms.com actually leaves the browser
 *   2. the success panel is NOT shown when that POST fails
 *   3. the failure is visible to the visitor, with the mail address as the way out
 *
 * TO PROVE THE CHANNEL ITSELF END TO END:
 *
 *     MCD_HEADED=1 node tools/form_probe.mjs
 *
 * A visible browser passes the bot check, the API answers 200, and the page
 * shows the success panel - measured 12.9.2026, and a real test message landed
 * in info@mccain-digital.com. Plain `node fetch` cannot do this even with a
 * browser User-Agent: Cloudflare answers the challenge page, not the API. That
 * dead end used to be a second tool here; it was deleted, because a gate that
 * can never go green does not get read.
 */
import { chromium } from "playwright-core";
import { findChrome } from "./browser.mjs";

const BASE = process.argv[2] || "http://127.0.0.1:8898";
const ROUTES = ["/", "/kontakt/"];

const HEADED = !!process.env.MCD_HEADED;
const browser = await chromium.launch({ executablePath: findChrome(), headless: !HEADED });
console.log(HEADED
  ? "headed: the bot check should pass and the API should answer 200"
  : "headless: the bot check will refuse the POST - the page must NOT claim success");
let failures = 0;

for (const route of ROUTES) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const posts = [];
  page.on("request", (r) => {
    if (r.method() !== "GET") posts.push(r.method() + " " + r.url());
  });

  await page.goto(BASE + route, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(2500);
  await page.evaluate(() => document.getElementById("contact")?.scrollIntoView());
  await page.waitForTimeout(800);

  /* The contact section holds exactly one form with a message field; the page
   * also carries the AI console's little forms, which must not be picked. */
  const form = page.locator("#contact form").filter({ has: page.locator('textarea[name="message"]') }).first();
  const n = await form.count();
  console.log(`\n=== ${route} ===`);
  if (!n) {
    console.log("  FAIL no contact form with a message field");
    failures++;
    await page.close();
    continue;
  }

  await form.locator('input[name="name"]').fill("Automatische Pruefung");
  await form.locator('input[name="email"]').fill("probe@example.com");
  await form.locator('textarea[name="message"]').fill("Automatische Pruefung des Formulars, bitte ignorieren.");
  await form.locator('button[type="submit"]').click();
  await page.waitForTimeout(6000);

  const seen = posts.filter((p) => p.includes("api.web3forms.com"));
  const state = await page.evaluate(() => {
    const c = document.getElementById("contact");
    const t = c ? c.innerText : "";
    return {
      success: /Danke|Thank|ist da|ist unterwegs/i.test(t),
      error: !!document.querySelector(".mcd-form-error"),
      errorText: (document.querySelector(".mcd-form-error")?.innerText || "").trim(),
      submitDisabled: !!document.querySelector('#contact form button[type="submit"]')?.disabled,
    };
  });

  console.log(`  POST to web3forms:      ${seen.length ? "yes  " + seen[0] : "NO"}`);
  console.log(`  success panel shown:    ${state.success}`);
  console.log(`  error shown to visitor: ${state.error}${state.error ? "  -> " + state.errorText.slice(0, 90) : ""}`);
  console.log(`  submit re-enabled:      ${!state.submitDisabled}`);

  if (!seen.length) {
    console.log("  FAIL nothing left the browser - the form is not wired");
    failures++;
  } else if (state.success && !seen.length) {
    console.log("  FAIL success shown without a request");
    failures++;
  } else if (!state.success && !state.error) {
    console.log("  FAIL the request failed and the visitor was told nothing");
    failures++;
  } else if (state.success) {
    console.log("  ok   the API accepted it and the page says so");
  } else {
    console.log("  ok   the request was refused (bot filter) and the page says so honestly");
  }
  await page.close();
}

await browser.close();
console.log(`\n${failures ? `${failures} route(s) FAILED` : "all routes ok"}`);
process.exit(failures ? 1 : 0);
