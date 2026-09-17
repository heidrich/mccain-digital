/* Drive a built page through what every page can do, and report what broke.
 *
 *   python prodserve.py 8898 --dev
 *   node tools/v5probe.mjs /kontakt/            # one route
 *   node tools/v5probe.mjs --all                # every route that is built
 *   node tools/v5probe.mjs /preise/ --headed    # watch it
 *
 * WHAT IT CHECKS, PER PAGE
 * - no console errors or page errors, at 1280 px and at 390 px (phone)
 * - the binder wrote nothing at start: a MutationObserver installed before any
 *   script runs counts what changed under #dc-root during the first 1.5 s,
 *   grouped by attribute; the page's own reveal work is listed, anything else
 *   is suspicious
 * - the mega menu opens on hover and closes when the pointer leaves
 * - the search opens on Cmd/Ctrl+K, finds something for "preise", closes on Escape
 * - EN switches the language (html[lang], the h1 text) and DE switches back
 * - the FAQ opens and closes where the page has one
 * - the contact form sends (the request to Web3Forms is intercepted and answered
 *   with success, so nothing leaves the machine) and the page shows its success state
 * - on the phone the mobile menu opens and closes
 * - the cost of one state change (setState → DOM), measured
 */
import { chromium } from "playwright-core";
import { PAGES } from "./pages.mjs";
import { findChrome } from "./browser.mjs";

const argv = process.argv.slice(2);
const BASE = process.env.MCD_BASE || "http://127.0.0.1:8898";
const routes = argv.includes("--all") ? PAGES.map((p) => p.route) : argv.filter((a) => a.startsWith("/"));
if (!routes.length) { console.error("usage: node tools/v5probe.mjs </route/> | --all [--headed]"); process.exit(2); }

const INIT = `(() => {
  window.__muts = {};
  const rec = (k) => { window.__muts[k] = (window.__muts[k] || 0) + 1; };
  const start = () => {
    const root = document.getElementById("dc-root"); if (!root) return;
    new MutationObserver((list) => { for (const m of list) rec(m.type === "attributes" ? "attr:" + m.attributeName + "@" + m.target.tagName.toLowerCase() + "#" + (m.target.getAttribute("data-dc-tpl") || "-") : m.type === "childList" ? "childList(+" + m.addedNodes.length + "/-" + m.removedNodes.length + ")@" + m.target.tagName.toLowerCase() : m.type); })
      .observe(root, { attributes: true, childList: true, characterData: true, subtree: true });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();`;

async function probe(browser, route) {
  const out = { route, errors: [], notes: [] };
  const url = `${BASE}${route}`;
  const head = await fetch(url).then((r) => r.status).catch(() => 0);
  if (head !== 200) { out.notes.push(`not built (${head})`); return out; }

  /* ------------------------------------------------------------ desktop */
  let ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  let page = await ctx.newPage();
  const hook = (p, tag) => {
    p.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") out.errors.push(`${tag} console.${m.type()}: ${m.text().slice(0, 200)}`); });
    p.on("pageerror", (e) => out.errors.push(`${tag} pageerror: ${String(e.message || e).slice(0, 200)}`));
    p.on("requestfailed", (r) => { if (!/web3forms/.test(r.url())) out.errors.push(`${tag} request failed: ${r.url()}`); });
  };
  hook(page, "desktop");
  await page.addInitScript(INIT);
  await page.route("https://api.web3forms.com/submit", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, message: "probe" }) }));
  await page.goto(url, { waitUntil: "load" });
  await page.waitForTimeout(1500);
  const boot = await page.evaluate(() => ({
    v5: !!window.__v5, logic: !!(window.__v5 && window.__v5.logic && window.__v5.logic.mounted), muts: window.__muts,
    interps: document.querySelectorAll("#dc-root .sc-interp").length, tids: document.querySelectorAll("#dc-root [data-dc-tpl]").length,
    tpl: !!document.getElementById("dc-template"), lang: document.documentElement.lang, h1: (document.querySelector("h1") || {}).textContent,
  }));
  if (!boot.v5 || !boot.logic) out.errors.push("desktop: runtime did not mount (window.__v5 / logic.mounted)");
  out.notes.push(`nodes with template id ${boot.tids}, text slots ${boot.interps}`);
  const muts = Object.entries(boot.muts || {}).sort((a, b) => b[1] - a[1]);
  out.notes.push("mutations in the first 1.5 s: " + (muts.length ? muts.map(([k, v]) => `${k}×${v}`).join(", ") : "none"));

  /* one state change, measured */
  const cost = await page.evaluate(async () => {
    const L = window.__v5.logic; const t0 = performance.now();
    L.setState({ scrolled: !L.state.scrolled });
    await new Promise((r) => queueMicrotask(r));
    const t1 = performance.now();
    L.setState({ scrolled: !L.state.scrolled });
    await new Promise((r) => queueMicrotask(r));
    return { first: +(t1 - t0).toFixed(2), second: +(performance.now() - t1).toFixed(2) };
  });
  out.notes.push(`setState pass: ${cost.first} ms, again ${cost.second} ms`);

  /* mega menu on hover */
  const nav = await page.$('#dc-root header [data-nav-item="services"], #dc-root header [data-nav-item]');
  if (nav) {
    await nav.hover();
    await page.waitForTimeout(500);
    const open = await page.evaluate(() => { const p = document.querySelector("[data-v5-panel]"); return p ? { open: p.hasAttribute("data-v5-open"), h: p.getBoundingClientRect().height, op: getComputedStyle(p).opacity, menu: window.__v5.logic.state.menu } : null; });
    if (!open) out.errors.push("desktop: no [data-v5-panel]");
    else if (!open.open || open.h < 100 || open.op === "0") out.errors.push(`desktop: mega menu did not open on hover (${JSON.stringify(open)})`);
    else out.notes.push(`mega menu opens (${open.menu}, ${Math.round(open.h)} px)`);
    await page.mouse.move(640, 700);
    await page.waitForTimeout(500);
    const closed = await page.evaluate(() => window.__v5.logic.state.menu == null);
    if (!closed) out.errors.push("desktop: mega menu did not close after the pointer left");
  } else out.notes.push("no nav items with data-nav-item");

  /* search */
  await page.keyboard.press(process.platform === "darwin" ? "Meta+k" : "Control+k");
  await page.waitForTimeout(400);
  const s1 = await page.evaluate(() => ({ on: window.__v5.logic.state.searchOn, focused: document.activeElement && document.activeElement.tagName === "INPUT" }));
  if (!s1.on) out.errors.push("desktop: Cmd/Ctrl+K did not open the search");
  else {
    if (!s1.focused) out.errors.push("desktop: search opened but the input has no focus");
    await page.keyboard.type("preise");
    await page.waitForTimeout(400);
    const hits = await page.evaluate(() => (window.__v5.logic.searchHits ? window.__v5.logic.searchHits().length : -1));
    const shown = await page.evaluate(() => document.querySelectorAll('[role="dialog"] a, [role="dialog"] button').length);
    if (hits <= 0) out.errors.push(`desktop: search for "preise" found ${hits} hits`);
    out.notes.push(`search: ${hits} hits, ${shown} controls in the overlay`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    if (await page.evaluate(() => window.__v5.logic.state.searchOn)) out.errors.push("desktop: Escape did not close the search");
  }

  /* language */
  /* Elements by what the template binds to them, not by their text - :has-text is a case-insensitive substring match. */
  const byEvent = (expr) => page.evaluateHandle((x) => [...document.querySelectorAll("#dc-root [data-dc-tpl]")].find((el) => { const d = window.__v5.describe(el); return d && d.events.some((e) => e.expr.indexOf(x) >= 0) && el.getClientRects().length > 0; }) || null, expr);
  /* The header only: several pages cycle their tabs on a timer, so the body text changes on its own. */
  const headText = () => page.evaluate(() => (document.querySelector("#dc-root header") || document.body).innerText);
  const textBefore = await page.evaluate(() => document.body.innerText), headBefore = await headText();
  const en = (await byEvent("setEn")).asElement();
  if (en) {
    await en.click();
    await page.waitForTimeout(400);
    const l = await page.evaluate(() => ({ lang: document.documentElement.lang, h1: (document.querySelector("h1") || {}).textContent, state: window.__v5.logic.state.lang, text: document.body.innerText }));
    if (l.state !== "en" || l.lang !== "en") out.errors.push(`desktop: EN did not switch (${JSON.stringify(l).slice(0, 200)})`);
    else if (l.text === textBefore) out.errors.push("desktop: EN switched the state but no text on the page changed");
    else out.notes.push(`EN: h1 "${(l.h1 || "").trim().slice(0, 50)}"${l.h1 === boot.h1 ? " (h1 same in both languages)" : ""}`);
    const de = (await byEvent("setDe")).asElement();
    if (de) { await de.click(); await page.waitForTimeout(300); }
    const back = await page.evaluate(() => ({ lang: document.documentElement.lang, h1: (document.querySelector("h1") || {}).textContent }));
    if (back.lang !== "de" || back.h1 !== boot.h1) out.errors.push(`desktop: DE did not restore the page (${JSON.stringify(back).slice(0, 160)})`);
    if ((await headText()) !== headBefore) out.errors.push("desktop: after EN and DE the header text differs from the start");
    await page.evaluate(() => { try { localStorage.removeItem("mcd.lang"); } catch (e) { /* no storage */ } });
  } else out.notes.push("no EN switch in the header at 1280 px");

  /* FAQ */
  const faqBtn = await page.$("#dc-root #faq [aria-expanded], #dc-root [data-screen-label*='FAQ'] [aria-expanded]");
  if (faqBtn) {
    const before = await faqBtn.getAttribute("aria-expanded");
    await faqBtn.scrollIntoViewIfNeeded();
    await faqBtn.click();
    await page.waitForTimeout(300);
    const after = await faqBtn.getAttribute("aria-expanded");
    if (before === after) out.errors.push(`desktop: FAQ click did not toggle aria-expanded (${before})`);
    else out.notes.push(`FAQ toggles (${before} → ${after})`);
    await page.evaluate(() => window.scrollTo(0, 0));
  }

  /* contact form: fill what it has, submit, expect the success state */
  const form = await page.$('#dc-root form:has(input[name="company"])');
  if (form) {
    await form.scrollIntoViewIfNeeded();
    const fields = await form.$$("input:not([type=hidden]):not([name=company]):not([type=submit]), textarea");
    for (const f of fields) {
      const type = (await f.getAttribute("type")) || "text", name = (await f.getAttribute("name")) || "";
      const val = type === "email" || /mail/.test(name) ? "probe@example.com" : type === "tel" || /tel|phone/.test(name) ? "+49 89 123456" : /name/.test(name) ? "Probe Person" : "Probe " + name;
      try { await f.fill(val); } catch (e) { /* a field the page fills itself */ }
    }
    const req = page.waitForRequest((r) => /web3forms/.test(r.url()), { timeout: 4000 }).catch(() => null);
    const submit = await form.$('[type="submit"]');
    if (submit) await submit.click(); else await form.evaluate((f) => f.requestSubmit());
    const sent = await req;
    await page.waitForTimeout(600);
    const st = await page.evaluate(() => ({ formSent: window.__v5.logic.state.formSent, text: document.body.innerText.slice(0, 20000) }));
    if (!sent) out.errors.push("desktop: submitting the form sent no request to Web3Forms");
    else if (!st.formSent) out.errors.push("desktop: Web3Forms answered success but formSent stayed false");
    else out.notes.push("form: request sent (intercepted), success state shown");
    if (sent) {
      const post = sent.postData() || "";
      if (!/access_key/.test(post)) out.errors.push("desktop: the form request carries no access_key");
    }
  } else out.notes.push("no contact form with honeypot");

  /* consent note after 7 s */
  await page.evaluate(() => { try { localStorage.removeItem("mcd.consent"); } catch (e) { /* no storage */ } });
  await page.waitForTimeout(6000);
  const consent = await page.evaluate(() => ({ state: window.__v5.logic.state.consent, created: window.__v5.stats.created }));
  out.notes.push(`consent state after ~7.5 s: ${consent.state}; nodes created by the runtime so far: ${consent.created}`);
  if (consent.state !== "ask") out.errors.push(`desktop: consent note did not appear (state ${consent.state})`);
  await ctx.close();

  /* -------------------------------------------------------------- phone */
  ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  page = await ctx.newPage();
  hook(page, "phone");
  await page.addInitScript(INIT);
  await page.goto(url, { waitUntil: "load" });
  await page.waitForTimeout(1200);
  const pm = await page.evaluate(() => Object.entries(window.__muts || {}).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}×${v}`).join(", "));
  out.notes.push("phone mutations in the first 1.2 s: " + (pm || "none"));
  const toggle = (await byEvent("toggleMobile")).asElement();
  if (toggle) {
    await toggle.tap();
    await page.waitForTimeout(500);
    const m = await page.evaluate(() => ({ open: window.__v5.logic.state.mobileOpen, menu: document.querySelector('#dc-root [data-screen-label="Mobiles Menü"], #dc-root [data-screen-label*="Men"]') }));
    const vis = await page.evaluate(() => { const el = document.querySelector('#dc-root [data-screen-label="Mobiles Menü"]'); return el ? el.getBoundingClientRect().height : 0; });
    if (!m.open) out.errors.push("phone: the menu button did not open the mobile menu");
    else if (vis < 100) out.errors.push(`phone: mobileOpen is true but the menu is ${vis} px tall`);
    else out.notes.push(`mobile menu opens (${Math.round(vis)} px)`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    if (await page.evaluate(() => window.__v5.logic.state.mobileOpen)) out.errors.push("phone: Escape did not close the mobile menu");
  } else out.notes.push("phone: no menu button found");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 1) out.errors.push(`phone: horizontal overflow ${overflow} px`);
  await ctx.close();
  return out;
}

const browser = await chromium.launch({ executablePath: findChrome(), headless: !argv.includes("--headed") });
let bad = 0;
try {
  for (const route of routes) {
    const r = await probe(browser, route);
    const ok = r.errors.length === 0;
    if (!ok) bad++;
    console.log(`\n${ok ? "OK  " : "FAIL"} ${route}`);
    for (const n of r.notes) console.log(`     ${n}`);
    for (const e of r.errors) console.log(`  !! ${e}`);
  }
} finally {
  await browser.close();
}
console.log(`\n${routes.length - bad}/${routes.length} pages clean`);
process.exit(bad ? 1 : 0);
