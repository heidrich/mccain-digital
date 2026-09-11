/* Fill a contact form, submit it, and watch the wire.
 *
 *   node tools/form_probe.mjs [base]
 *
 * The question is only: does anything leave the browser. It exists because the
 * start page's form answered "Danke - Ihre Nachricht ist da." while posting
 * absolutely nothing, and no gate, screenshot or meta check could tell.
 *
 * NOTE: Web3Forms sits behind a bot filter that treats a headless browser as a
 * bot, so the fetch() path fails HERE and the native-submit fallback fires -
 * which is itself the thing worth seeing. A real browser takes the fetch path.
 * To prove the channel end to end, POST to the API with a normal User-Agent.
 */
import { chromium } from "playwright-core";
import { findChrome } from "./browser.mjs";

const BASE = process.argv[2] || "http://127.0.0.1:8898";
const browser = await chromium.launch({ executablePath: findChrome(), headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const posts = [];
page.on("request", (r) => {
  if (r.method() !== "GET") posts.push(r.method() + " " + r.url());
});

await page.goto(BASE + "/index.html", { waitUntil: "domcontentloaded" });
await page.waitForLoadState("networkidle").catch(() => {});
await page.waitForTimeout(2500);
await page.evaluate(() => document.getElementById("contact")?.scrollIntoView());
await page.waitForTimeout(800);

const form = page.locator("#contact form").first();
console.log("forms in #contact:", await page.locator("#contact form").count());

await form.locator('input[name="name"]').fill("Testeingabe Nachtlauf");
await form.locator('input[name="email"]').fill("probe@example.com");
await form.locator('textarea[name="message"]').fill("Automatische Pruefung, bitte ignorieren.");
const before = posts.length;
await form.locator('button[type="submit"]').click();
await page.waitForTimeout(3500);

const after = await page.evaluate(() => {
  const c = document.getElementById("contact");
  const t = c ? c.innerText : "";
  return {
    thanks: /Danke|Thank/i.test(t),
    stillHasForm: !!document.querySelector("#contact form"),
    tail: t.slice(-300),
  };
});

console.log("non-GET requests after submit:", posts.length - before);
for (const p of posts) console.log("   " + p);
console.log("thank-you state shown:", after.thanks);
console.log("form still in the DOM:", after.stillHasForm);
console.log("tail of the section:");
console.log(after.tail);
await browser.close();
