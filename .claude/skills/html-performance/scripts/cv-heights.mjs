#!/usr/bin/env node
/**
 * cv-heights.mjs - misst die echte Höhe jeder content-visibility:auto-Sektion
 * nach einem vollständigen Scroll-Durchlauf, bei mehreren Viewport-Breiten, und
 * gibt daraus fertige `contain-intrinsic-size`-Regeln aus.
 *
 * Warum: Ein pauschaler Platzhalter wie `contain-intrinsic-size: auto 900px`
 * lässt die Seite beim ersten Scrollen um tausende Pixel wachsen oder
 * schrumpfen (Sprungmarken landen daneben, Scrollbalken springt). Die
 * `auto`-Form merkt sich die Höhe erst, wenn der Block einmal gerendert war;
 * für den Erstzustand braucht der Browser eine gemessene Zahl pro Sektion und
 * Breite. Dieses Skript liefert diese Zahlen (siehe rendern-hauptthread.md,
 * Regel 2, und cv-audit.mjs, Befund "Seitenhöhe ändert sich beim Scrollen").
 *
 * Aufruf:
 *   node cv-heights.mjs <url> [--widths 412,768,1024,1350] [--mobile-below 768]
 *                            [--selector "[data-cv]"] [--json]
 *
 *   --widths <liste>     Viewport-Breiten in CSS-px (Default 412,768,1024,1350)
 *   --mobile-below <px>  Breiten darunter laufen als Mobil-Preset (Touch, isMobile,
 *                        DPR 1,75); Default 768
 *   --selector <css>     welche Elemente vermessen werden (Default "[data-cv]")
 *   --json               maschinenlesbare Ausgabe
 *
 * Ausgabe: pro Breite eine Tabelle (Element, Platzhalter beim Start, echte Höhe,
 * Abweichung) und ein CSS-Block mit `@media`-Gruppen, den man in den Build
 * übernimmt. Elemente werden über id (`#id`) angesprochen, sonst über Tag plus
 * Klassen; bei generierten Klassennamen die Zuordnung im Build über einen
 * stabilen Schlüssel (id oder data-Attribut) lösen, nicht über die Klasse.
 *
 * Gemessen wird die INHALTSHÖHE (clientHeight ohne vertikales Padding), weil
 * contain-intrinsic-size die Inhaltsbox beschreibt; Padding und Rahmen kommen
 * im Layout obendrauf. Mit der Rahmenbox gemessen starten gepolsterte Sektionen
 * exakt um ihr Padding zu groß (mccain-digital v5, 16.9.2026: +72 px je Sektion).
 *
 * Grenzen: Die Höhe hängt stetig von der Breite ab (Textumbruch). Zwischen den
 * gemessenen Breiten bleibt eine Restabweichung; sie ist um Größenordnungen
 * kleiner als ein Einheitswert. Nach jeder Inhaltsänderung neu messen -
 * cv-audit.mjs meldet Drift als Befund.
 */
import { DESCRIBE_ELEMENT_SRC, launch, parseArgs, requireUrl } from "./lib/browser.mjs";

const HELP = `cv-heights.mjs - echte Höhen von content-visibility-Sektionen je Breite

  node cv-heights.mjs <url> [--widths 412,768,1024,1350] [--mobile-below 768]
                           [--selector "[data-cv]"] [--json]`;

const argv = process.argv.slice(2);
const args = parseArgs(argv);
if (args.help || argv.includes("-h")) { console.log(HELP); process.exit(0); }
const url = args._[0];
if (!url) { console.error(`Fehler: URL fehlt.\n\n${HELP}`); process.exit(1); }

const widths = String(args.widths || "412,768,1024,1350").split(",").map((w) => Number(w.trim())).filter(Boolean);
const mobileBelow = Number(args["mobile-below"] || 768);
const selector = args.selector || "[data-cv]";
const asJson = !!args.json;

/* Läuft im Browser: Elemente beschreiben, Platzhalter lesen. */
const READ_SRC = `(sel) => {
  const out = [];
  for (const el of document.querySelectorAll(sel)) {
    const cs = getComputedStyle(el);
    if (cs.contentVisibility !== "auto") continue;
    const key = el.id ? "#" + el.id : el.tagName.toLowerCase() + Array.from(el.classList).map((c) => "." + c).join("");
    // Inhaltsbox: contain-intrinsic-size beschreibt die Inhaltsgröße, Padding und Rahmen legt das Layout obendrauf.
    const pad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    out.push({ key, desc: describeElement(el), cis: cs.containIntrinsicSize, h: Math.round(el.clientHeight - pad), w: Math.round(el.clientWidth) });
  }
  return out;
}`;

async function measure(width) {
  const mobile = width < mobileBelow;
  const height = mobile ? Math.round(width * 2.22) : Math.round(Math.min(940, width * 0.7));
  const { page, close } = await launch({ mobile, width, height });
  try {
    await page.addInitScript(DESCRIBE_ELEMENT_SRC);
    await page.goto(url, { waitUntil: "load" });
    await page.waitForTimeout(500);
    const readExpr = `(${READ_SRC})(${JSON.stringify(selector)})`;
    const start = await page.evaluate(readExpr);
    const docHeightBefore = await page.evaluate(() => document.documentElement.scrollHeight);
    // Vollständiger Durchlauf in Schritten von 80 % Viewport, damit jede Sektion
    // mindestens einmal in den Render-Bereich (Viewport plus Chrome-Marge) kommt.
    const step = Math.max(200, Math.round(height * 0.8));
    let y = 0;
    for (;;) {
      await page.evaluate((py) => window.scrollTo(0, py), y);
      await page.waitForTimeout(140);
      const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      if (y >= max) break;
      y = Math.min(y + step, max);
    }
    await page.waitForTimeout(400);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);
    // Nach dem Durchlauf trägt jeder Block seine zuletzt gerenderte Höhe (auto-Form).
    const end = await page.evaluate(readExpr);
    const docHeightAfter = await page.evaluate(() => document.documentElement.scrollHeight);
    const byKey = new Map(start.map((e) => [e.key + "|" + e.desc, e]));
    const rows = end.map((e) => {
      const s = byKey.get(e.key + "|" + e.desc);
      return { key: e.key, desc: e.desc, width: e.w, placeholder: s ? s.h : null, height: e.h, delta: s ? e.h - s.h : null, cis: s ? s.cis : e.cis };
    });
    return { width, mobile, viewport: { width, height }, docHeightBefore, docHeightAfter, rows };
  } finally {
    await close();
  }
}

function cssFor(results) {
  // Kleinste Breite ohne Media-Query, jede weitere als min-width-Gruppe.
  const sorted = [...results].sort((a, b) => a.width - b.width);
  const lines = [];
  sorted.forEach((r, i) => {
    const rules = r.rows.filter((row) => row.height > 0).map((row) => `${row.key}{contain-intrinsic-size:auto ${row.height}px}`);
    if (i === 0) lines.push(...rules);
    else lines.push(`@media (min-width:${r.width}px){${rules.join("")}}`);
  });
  return lines.join("\n");
}

(async () => {
  await requireUrl(url);
  const results = [];
  for (const w of widths) results.push(await measure(w));
  if (asJson) {
    console.log(JSON.stringify({ url, selector, widths, mobileBelow, results, css: cssFor(results) }, null, 2));
    return;
  }
  for (const r of results) {
    console.log(`\n=== Breite ${r.width}px (${r.mobile ? "mobil" : "desktop"}, Viewport ${r.viewport.width}x${r.viewport.height}) - Seite ${r.docHeightBefore} → ${r.docHeightAfter} px`);
    console.log(`${"Element".padEnd(40)} ${"Start".padStart(6)} ${"Echt".padStart(6)} ${"Delta".padStart(6)}  contain-intrinsic-size beim Start`);
    for (const row of r.rows) {
      console.log(`${row.key.slice(0, 40).padEnd(40)} ${String(row.placeholder ?? "-").padStart(6)} ${String(row.height).padStart(6)} ${String(row.delta ?? "-").padStart(6)}  ${row.cis}`);
    }
  }
  console.log("\n=== CSS-Vorschlag (kleinste Breite als Basis, größere per min-width)\n");
  console.log(cssFor(results));
  console.log("\nHinweis: Nach Inhaltsänderungen neu messen; cv-audit.mjs meldet Drift der Seitenhöhe.");
})().catch((err) => { console.error(err.stack || String(err)); process.exit(1); });
