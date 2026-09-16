/* Was macht content-visibility auf dieser Seite wirklich, und wo lauern
 * seine Fallen?
 *
 * Methode: per addInitScript - also VOR jedem Seitenscript - Feature-
 * Detection (CSS.supports, Event-Support, checkVisibility) und ein
 * Capture-Phase-Listener auf contentvisibilityautostatechange installieren,
 * der jedes Feuern mit Zeitstempel, Elementbeschreibung und e.skipped
 * mitschreibt. Nach dem Load wird jedes Element mit berechnetem
 * content-visibility auto/hidden einzeln vermessen (Box, contain-intrinsic-
 * size, Anfangszustand, Nachfahren mit negativem z-index/position:fixed,
 * laufende Animationen, Nachfahren-Zahl). Danach - sofern nicht --no-sweep -
 * ein Scroll-Sweep in 0,5-Viewport-Schritten von oben nach unten und
 * zurück; aus dem Event-Log ergibt sich die tatsächliche Render-Margin pro
 * Block plus ein Vorher/Nachher-Vergleich der Seitenhöhe.
 *
 * Eingebaute Fallen:
 *  - STACKING CONTEXT: content-visibility:auto erzwingt Paint-Containment,
 *    das Element wird dadurch zum Stacking Context. Ein Nachfahre mit
 *    negativem z-index zeichnet darum über einer pageweiten fixed/absoluten
 *    Ebene dahinter statt darunter - unabhängig vom z-index der Ebene.
 *  - CONTAINING BLOCK: dieselbe Containment-Regel macht das Element zum
 *    containing block für fixed-Nachfahren; "fixed" wirkt dann wie
 *    "absolute" relativ zum Container statt zum Viewport.
 *  - Die ~150%-Viewport-Vorab-Rendermarge, mit der Chrome rechnet, ist kein
 *    fixer Spec-Wert - dieses Skript MISST sie im Sweep, statt sie
 *    anzunehmen.
 *  - contentvisibilityautostatechange feuert einmal initial pro Block (der
 *    Anfangszustand) und danach nur bei einem ECHTEN Wechsel, kein Polling.
 *  - Übersprungener Inhalt wird nicht gemalt: ein Vollseiten-Screenshot
 *    lügt für jeden noch skipped-Block. IntersectionObserver-Targets
 *    darin lösen ebenfalls nicht aus - solche Targets daher erst
 *    beobachten, nachdem der Block gerendert hat, nicht vorher.
 *
 * Nutzung: node cv-audit.mjs <url> [--mobile] [--width W --height H]
 *          [--no-sweep] [--json] [--help]
 */
import { launch, parseArgs, requireUrl, DESCRIBE_ELEMENT_SRC, table } from "./lib/browser.mjs";

const HELP = `Nutzung: node cv-audit.mjs <url> [Optionen]
Was macht content-visibility auf dieser Seite wirklich, und wo lauern seine Fallen?

Optionen:
  --mobile          412x915 @1.75x (Moto G Power, wie Lighthouse mobile)
  --width/--height  eigene Viewport-Größe (überschreibt --mobile-Preset)
  --no-sweep        Scroll-Sweep überspringen (nur statische Analyse)
  --json            Ergebnis als JSON auf stdout statt Textbericht
  --help            diese Hilfe

Beispiel:
  node cv-audit.mjs http://localhost:8897/v5/ --mobile`;

const argv = process.argv.slice(2);
const args = parseArgs(argv);
if (args.help || argv.includes("-h")) { console.log(HELP); process.exit(0); }
const url = args._[0];
if (!url) { console.error(`Fehler: URL fehlt.\n\n${HELP}`); process.exit(1); }

/* window.describeElement statt einer bloßen function-Deklaration: eine per
 * addInitScript deklarierte Top-Level-function ist in SPÄTEREN, separaten
 * page.evaluate()-Aufrufen nicht sichtbar (empirisch geprüft) - nur eine
 * explizite Zuweisung auf window übersteht das. */
const INIT_SCRIPT = `window.describeElement = ${DESCRIBE_ELEMENT_SRC};
window.__hp = { t0: performance.now(), events: [], descById: {}, features: {
  cvSupported: CSS.supports("content-visibility", "auto"),
  eventSupported: "oncontentvisibilityautostatechange" in HTMLElement.prototype,
  checkVisibilitySupported: typeof Element.prototype.checkVisibility === "function",
} };
document.addEventListener("contentvisibilityautostatechange", function (e) {
  var hid = e.target.getAttribute ? e.target.getAttribute("data-hp-id") : null;
  var d = (hid !== null && window.__hp.descById[hid]) || window.describeElement(e.target);
  var r = e.target.getBoundingClientRect();
  window.__hp.events.push({ t: Math.round(performance.now() - window.__hp.t0), id: hid, desc: d, skipped: e.skipped, top: Math.round(r.top), bottom: Math.round(r.bottom) });
}, true);`;

/* Läuft im Browser via page.evaluate: findet jedes Element mit berechnetem
 * content-visibility auto/hidden, tags es (data-hp-id) fürs Sweep-Matching
 * und vermisst Box, intrinsic size, Anfangszustand, die beiden Fallen sowie
 * laufende Animationen. */
function collectElements() {
  const els = [...document.querySelectorAll("*")].filter((e) => {
    const cv = getComputedStyle(e).contentVisibility;
    return cv === "auto" || cv === "hidden";
  });
  window.__hp.descById = {};
  return els.map((el, i) => {
    el.setAttribute("data-hp-id", String(i));
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const desc = window.describeElement(el);
    window.__hp.descById[i] = desc;
    const descendants = el.querySelectorAll("*");
    let negZ = 0, fixed = 0;
    for (const d of descendants) {
      const dcs = getComputedStyle(d);
      if (parseInt(dcs.zIndex, 10) < 0) negZ++;
      if (dcs.position === "fixed") fixed++;
    }
    let anims = [];
    try { anims = el.getAnimations({ subtree: true }); } catch { /* nicht unterstützt */ }
    const running = anims.filter((a) => a.playState === "running").length;
    let initial = "hidden";
    if (cs.contentVisibility === "auto") {
      const probe = el.firstElementChild;
      if (!probe) initial = "unbekannt";
      else {
        try { initial = probe.checkVisibility({ contentVisibilityAuto: true }) ? "rendered" : "skipped"; }
        catch { initial = "unbekannt"; }
      }
    }
    return {
      id: i, desc, cv: cs.contentVisibility, initial,
      w: Math.round(r.width), h: Math.round(r.height), cis: cs.containIntrinsicSize,
      descendants: descendants.length, negZ, fixed, animTotal: anims.length, animRunning: running,
    };
  });
}

async function scrollToY(page, y) {
  await page.evaluate((v) => scrollTo({ top: v, left: 0, behavior: "instant" }), y);
  await page.waitForTimeout(350);
}

/* Scrollt in 0,5-Viewport-Schritten bis zum Boden und wieder zurück zu 0.
 * Das Event-Log während dieser Bewegung verrät, bei welchem Abstand zum
 * Viewport Chrome tatsächlich rendert bzw. wieder überspringt. */
async function sweep(page, step) {
  const before = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < before; y += step) await scrollToY(page, y);
  await scrollToY(page, before);
  for (let y = before - step; y > 0; y -= step) await scrollToY(page, y);
  await scrollToY(page, 0);
  await page.waitForTimeout(200);
  const after = await page.evaluate(() => document.documentElement.scrollHeight);
  const events = await page.evaluate(() => window.__hp.events.splice(0));
  return { before, after, events };
}

/* dist>0: Element noch unterhalb des Viewports (Abstand zur Unterkante).
 * dist<0: Element schon oberhalb des Viewports (Abstand zur Oberkante).
 * Betrag = die gemessene Rendermarge, Richtung war nur fürs Debugging. */
function computeMargins(events, viewportH) {
  const byId = new Map();
  for (const e of events) {
    if (e.id === null || e.id === undefined) continue;
    const dist = e.top > viewportH ? e.top - viewportH : e.bottom < 0 ? e.bottom : 0;
    if (!byId.has(e.id)) byId.set(e.id, { desc: e.desc, show: [], skip: [] });
    byId.get(e.id)[e.skipped ? "skip" : "show"].push(Math.abs(dist));
  }
  const avg = (a) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null);
  return [...byId.values()].map((v) => ({ desc: v.desc, showPx: avg(v.show), skipPx: avg(v.skip), n: v.show.length + v.skip.length }));
}

/* Ein paar Pixel Drift sind Messrauschen (Scrollbalken, Subpixel, ein spät geladenes Bild);
 * erst darüber stimmt die Platzhalterhöhe wirklich nicht. */
const DRIFT_TOLERANCE_PX = 24;

function buildFindings(elements, sweepResult, features) {
  const out = [];
  if (!features.eventSupported) out.push("contentvisibilityautostatechange wird nicht unterstützt: Sweep-Messwerte fehlen, nur der statische Zustand ist verlässlich.");
  for (const r of elements) {
    if (r.cv !== "auto") continue;
    if (r.negZ > 0) out.push(`${r.desc}: ${r.negZ} Nachfahre(n) mit negativem z-index (STACKING TRAP) - content-visibility erzwingt Paint-Containment, das Element wird zum Stacking Context; das Kind zeichnet über einer pageweiten fixed/absoluten Ebene dahinter statt darunter. Fix: data-cv auf den Inhalts-Wrapper NACH dem Hintergrund-Layer setzen, oder den negativen z-index entfernen.`);
    if (r.fixed > 0) out.push(`${r.desc}: ${r.fixed} fixed-positionierte(s) Kind (CONTAINING-BLOCK TRAP) - dieselbe Containment-Regel macht das Element zum containing block; "fixed" wirkt wie "absolute" relativ zum Container statt zum Viewport. Fix: das fixed-Element als Geschwister außerhalb des cv-Blocks platzieren.`);
    if (r.cis.includes("none")) out.push(`${r.desc}: contain-intrinsic-size ohne Fallback-Größe (berechnet: "${r.cis}") - der Platzhalter hat auf mindestens einer Achse keine reservierte Größe, das erste Rendern verschiebt den Rest der Seite. Fix: contain-intrinsic-size: auto <geschätzte Höhe>px setzen.`);
  }
  if (sweepResult && Math.abs(sweepResult.after - sweepResult.before) > DRIFT_TOLERANCE_PX) {
    out.push(`Seitenhöhe ändert sich beim Scrollen um ${sweepResult.after - sweepResult.before}px (${sweepResult.before}px → ${sweepResult.after}px) - contain-intrinsic-size passt nicht zur echten Höhe. Fix: reale Sektionshöhe messen (z. B. einmalig per ResizeObserver) und als contain-intrinsic-size persistieren.`);
  }
  return out;
}

function printReport({ url, config, features, elements, initialEvents, sweep, findings }) {
  console.log(`content-visibility-Audit: ${url}`);
  console.log(`Viewport ${config.width}x${config.height}${config.mobile ? " (mobile)" : ""}\n`);
  console.log(`Feature-Support: content-visibility:auto=${features.cvSupported} - contentvisibilityautostatechange=${features.eventSupported} - checkVisibility()=${features.checkVisibilitySupported}\n`);

  const rows = elements.map((e) => [
    e.desc, `${e.cv}/${e.initial}`, `${e.w}x${e.h}`, e.cis, String(e.descendants),
    e.negZ > 0 ? `${e.negZ} ⚠` : "0", e.fixed > 0 ? `${e.fixed} ⚠` : "0",
    e.animTotal ? `${e.animTotal} (${e.animRunning} laufend, ${e.animTotal - e.animRunning} pausiert)` : "0",
  ]);
  console.log(elements.length ? table(rows, ["Element", "cv/Zustand", "Größe", "intrinsic-size", "Nachf.", "neg-z", "fixed", "Animationen"]) : "(keine Elemente mit content-visibility auto/hidden gefunden)");
  console.log(`\n${elements.length} Element(e) mit content-visibility auto/hidden.\n`);

  console.log(`Event-Timeline (erste ${Math.min(8, initialEvents.length)} von ${initialEvents.length} Events beim Laden):`);
  for (const e of initialEvents.slice(0, 8)) console.log(`  ${String(e.t).padStart(4)}ms  ${e.skipped ? "skip" : "show"}  ${e.desc}`);

  if (sweep) {
    console.log(`\nSweep: Seitenhöhe vorher ${sweep.before}px, nachher ${sweep.after}px (Delta ${sweep.after - sweep.before}px)`);
    if (sweep.margins.length) {
      const mrows = sweep.margins.map((m) => [
        m.desc,
        m.showPx === null ? "-" : `${m.showPx}px (${Math.round((m.showPx / config.height) * 100)}% vh)`,
        m.skipPx === null ? "-" : `${m.skipPx}px (${Math.round((m.skipPx / config.height) * 100)}% vh)`,
        String(m.n),
      ]);
      console.log(`\n${table(mrows, ["Element", "Render-Abstand", "Skip-Abstand", "Messungen"])}`);
    } else console.log("Keine Zustandswechsel während des Sweeps beobachtet.");
  } else console.log("\nSweep übersprungen (--no-sweep).");

  console.log(`\nBefund (${findings.length}):`);
  if (!findings.length) console.log("  keine Auffälligkeiten.");
  else for (const f of findings) console.log(`  - ${f}`);
}

async function main() {
  await requireUrl(url);
  const { page, context, close, config } = await launch({ mobile: !!args.mobile, width: args.width, height: args.height });
  await context.addInitScript(INIT_SCRIPT);
  await page.goto(url, { waitUntil: "load" });
  await page.waitForTimeout(500);

  const features = await page.evaluate(() => window.__hp.features);
  const initialEvents = await page.evaluate(() => window.__hp.events.splice(0));
  const elements = await page.evaluate(collectElements);

  let sweepResult = null;
  if (args["no-sweep"] !== true) {
    const step = Math.max(1, Math.round(config.height * 0.5));
    const raw = await sweep(page, step);
    sweepResult = { before: raw.before, after: raw.after, margins: computeMargins(raw.events, config.height) };
  }
  await close();

  const findings = buildFindings(elements, sweepResult, features);
  if (args.json) {
    console.log(JSON.stringify({ url, config, features, elements, initialEvents, sweep: sweepResult, findings }, null, 2));
  } else {
    printReport({ url, config, features, elements, initialEvents, sweep: sweepResult, findings });
  }
  process.exit(0);
}

main().catch((e) => {
  console.error("Fehler:", e.message);
  process.exit(1);
});
