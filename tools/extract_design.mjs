/* Reads the start page as it is actually painted and writes down two things the
 * subpages need: what the service modals say, and what the design measures.
 *
 *   node tools/extract_design.mjs > internal/design-reference.json
 *
 * "Stick to the design" is only checkable if the design is a set of numbers
 * rather than an impression. These are read from getComputedStyle on the live
 * render, so a subpage built from them matches the start page by construction
 * instead of by eye.
 */
import { chromium } from "playwright-core";
import { findChrome } from "./browser.mjs";

const BASE = process.argv[2] || "http://127.0.0.1:8898";

const browser = await chromium.launch({ executablePath: findChrome(), headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(BASE + "/index.html", { waitUntil: "domcontentloaded" });
await page.waitForLoadState("networkidle").catch(() => {});
await page.waitForTimeout(2500);

/* ---------------------------------------------------------------- the design */

const design = await page.evaluate(() => {
  const pick = (el, props) => {
    if (!el) return null;
    const cs = getComputedStyle(el);
    const out = {};
    for (const p of props) out[p] = cs.getPropertyValue(p);
    return out;
  };
  const TYPE = ["font-family", "font-size", "font-weight", "line-height", "letter-spacing", "color"];
  const BOX = ["background-color", "border-radius", "box-shadow", "padding", "border"];

  const first = (sel) => document.querySelector(sel);
  const inSection = (id, sel) => document.querySelector(`#${id} ${sel}`);

  /* The accent and ink values, read off elements that actually use them rather
   * than out of a token file that may not be the one in force. */
  const root = getComputedStyle(document.documentElement);
  const vars = {};
  for (const name of ["--acc", "--acc-text", "--acc-soft", "--acc-ring"]) {
    const v = root.getPropertyValue(name).trim();
    if (v) vars[name] = v;
  }

  return {
    vars,
    body: pick(document.body, [...TYPE, "background-color"]),
    h1: pick(first("h1"), TYPE),
    h2: pick(inSection("services", "h2") || document.querySelectorAll("h2")[0], TYPE),
    h3: pick(inSection("services", "h3") || document.querySelectorAll("h3")[0], TYPE),
    paragraph: pick(inSection("services", "p") || document.querySelector("p"), TYPE),
    /* the mono eyebrow: the design's signature label */
    eyebrow: (() => {
      for (const el of document.querySelectorAll("span,p,div")) {
        const cs = getComputedStyle(el);
        if (/JetBrains/i.test(cs.fontFamily) && parseFloat(cs.fontSize) <= 13 && el.innerText.trim())
          return { ...pick(el, TYPE), sample: el.innerText.trim().slice(0, 40) };
      }
      return null;
    })(),
    card: (() => {
      const tile = inSection("services", "button") || inSection("services", "[role=button]");
      return tile ? pick(tile, BOX) : null;
    })(),
    sectionPadding: (() => {
      const s = document.getElementById("services");
      if (!s) return null;
      const cs = getComputedStyle(s);
      return { padding: cs.padding, maxWidth: cs.maxWidth };
    })(),
    container: (() => {
      /* the widest element that is not full-bleed tells the column width */
      const h2 = document.querySelector("#services h2");
      let el = h2;
      while (el && el.parentElement && el.getBoundingClientRect().width < 1100) el = el.parentElement;
      return el ? Math.round(el.getBoundingClientRect().width) : null;
    })(),
    footerBackground: (() => {
      const f = document.querySelector("footer");
      return f ? getComputedStyle(f).backgroundColor : null;
    })(),
  };
});

/* --------------------------------------------------------------- the modals */

const tiles = await page.$$("#services button, #services [role='button']");
const modals = [];
for (let i = 0; i < tiles.length; i++) {
  const tile = (await page.$$("#services button, #services [role='button']"))[i];
  if (!tile) continue;
  const tileText = (await tile.innerText()).trim();
  await tile.click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(900);
  const content = await page.evaluate(() => {
    const d = document.querySelector('[role="dialog"],[aria-modal="true"]');
    if (!d) return null;
    const grab = (sel) => [...d.querySelectorAll(sel)].map((e) => e.innerText.trim()).filter(Boolean);
    return {
      heading: d.querySelector("h1,h2,h3")?.innerText.trim() || "",
      h3s: grab("h3"),
      h4s: grab("h4"),
      paragraphs: grab("p"),
      listItems: grab("li"),
      text: d.innerText.trim(),
    };
  });
  if (content) modals.push({ tile: tileText.split("\n")[0], ...content });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
}

/* The three lines the subpages need out of each modal, in the wording the start
 * page already uses. Taken from the render rather than retyped, for the same
 * reason the JSON-LD is: copy that disagrees with the page it describes is worse
 * than no copy at all. Asserted, because a silent "" here would build four
 * pages with no lead paragraph and nothing would look broken. */
const services = modals.map((m) => {
  const lines = m.text.split("\n").map((l) => l.trim()).filter(Boolean);
  const [eyebrow, title, lead] = lines;
  for (const [k, v] of Object.entries({ eyebrow, title, lead })) {
    if (!v || v.length < 4) throw new Error(`extract_design: ${k} missing for "${m.tile}"`);
  }
  if (!/^Leistung\s*·/.test(eyebrow))
    throw new Error(`extract_design: unexpected eyebrow "${eyebrow}" - has the modal layout changed?`);
  if (title !== m.heading)
    throw new Error(`extract_design: first line "${title}" is not the heading "${m.heading}"`);
  return { eyebrow, title, lead, kind: eyebrow.replace(/^Leistung\s*·\s*/, "") };
});

/* Section labels are the modal's own, and identical across all four - which is
 * asserted rather than assumed, so a copy change on the start page surfaces here
 * instead of quietly leaving the subpages saying something else. */
const LABELS = [
  ["useCases", "Was wir bauen würden", "Konkrete Projekte, gruppiert nach Aufgabe."],
  ["caps", "Wie tief wir gehen", "Der Motor unter den Anwendungsfällen."],
  ["steps", "So läuft es", "Vier Schritte, jeder mit Ausstieg."],
  ["stack", "Womit wir das bauen", ""],
  ["faqs", "Fragen", "Was Sie wirklich fragen."],
  ["cta", "Bereit für ein Gespräch?", ""],
];
for (const [key, heading, kicker] of LABELS) {
  for (const m of modals) {
    if (!m.text.includes(heading))
      throw new Error(`extract_design: "${heading}" (${key}) missing from the "${m.tile}" modal`);
    if (kicker && !m.text.includes(kicker))
      throw new Error(`extract_design: kicker "${kicker}" (${key}) missing from "${m.tile}"`);
  }
}
const labels = Object.fromEntries(LABELS.map(([k, h, s]) => [k, { heading: h, kicker: s }]));

console.log(JSON.stringify({ design, labels, services, modals }, null, 1));
await browser.close();
