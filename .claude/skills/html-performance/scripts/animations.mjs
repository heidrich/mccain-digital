#!/usr/bin/env node
/* Was animiert gerade, wie lange noch, sieht man es, und läuft es auf dem
 * Compositor?
 *
 * METHODE: zwei Zensus-Zeitpunkte (--at, --at2) nach load, je einmal
 * document.getAnimations() auswerten. --at2 trennt einmalige Einblender (bei
 * --at2 fertig oder ganz aus der Liste verschwunden) von echter Dauer-
 * Dekoration (läuft bei --at UND --at2 noch). Default --at2 8000 liegt
 * bewusst über HOLD_MS (6000 ms) aus motion-budget.js: auf Seiten mit diesem
 * Pauser zeigt der zweite Zensus die freigegebene Dekoration wieder
 * "running", nicht mehr "paused".
 *
 * FALLSTRICKE:
 *  - Iterationszahl ist NUR am lebenden Animation-Objekt ablesbar (meist
 *    Inline-Styles, nicht aus CSS grep-bar). Infinity = endlos = Dekoration,
 *    darf warten; jede endliche Zahl ist ein Einblender, der laufen MUSS
 *    (startet oft bei opacity:0 - anhalten hieße eine leere Seite zeigen).
 *  - content-visibility-übersprungene Teilbäume liefern ihre Animationen
 *    erst, wenn der Browser sie rendert - "nicht gefunden" ≠ "existiert
 *    nicht". --sweep rendert die ganze Seite einmal an.
 *  - playState "paused" kann bedeuten: die Seite pausiert bewusst (z. B. ein
 *    Motion-Budget-Pauser für Off-Screen-Loops) - kein Fehler dieses Skripts.
 *  - Ein Einblender mit fill:both/forwards bleibt nach Ende als "finished"
 *    in der Liste; ohne forwards/both verschwindet er ganz. Beides ist
 *    "fertig" - deshalb zählt playState, nie "steht noch in der Liste".
 *  - prefers-reduced-motion muss das CSS der Seite selbst durchsetzen.
 *    --reduced-motion startet den Browser entsprechend und meldet, was
 *    trotzdem noch läuft.
 *
 * Usage:
 *   node animations.mjs <url> [--at 1500] [--at2 8000] [--mobile] [--sweep]
 *                        [--reduced-motion] [--json] [--help]
 */
import { launch, parseArgs, requireUrl, DESCRIBE_ELEMENT_SRC, table, ms } from "./lib/browser.mjs";

const SAFE_PROPS = ["transform", "opacity", "filter", "backdrop-filter", "translate", "rotate", "scale"];
const AMBIGUOUS_PROPS = ["background-color", "clip-path"];
const RUNNING_THRESHOLD = 20;
const SWEEP_STEP_PAUSE_MS = 60;

function printHelp() {
  console.log(`Nutzung: node animations.mjs <url> [Optionen]
Was animiert gerade, wie lange noch, sieht man es, und läuft es auf dem Compositor?

Optionen:
  --at <ms>          erster Zensus, ms nach load (Default 1500)
  --at2 <ms>         zweiter Zensus, ms nach load (Default 8000)
  --mobile           Mobil-Viewport statt Desktop
  --sweep            vor dem zweiten Zensus einmal instant durch die ganze
                     Seite scrollen (löst scroll-getriggerte Reveals aus)
                     und zurück nach oben - zweiter Zensus wieder oben
  --reduced-motion   Browser mit prefers-reduced-motion: reduce starten
  --json             maschinenlesbare Ausgabe
  --help             diese Hilfe

Beispiel:
  node animations.mjs http://localhost:8897/v5/ --sweep --at2 8000`);
}

/* Läuft im Browser über page.evaluate. Braucht das globale describeElement()
 * aus DESCRIBE_ELEMENT_SRC, vorher per addInitScript im Dokument registriert.
 * Verdikt wird bewusst NICHT hier berechnet: page.evaluate serialisiert die
 * Funktion isoliert, ein Closure über die SAFE_PROPS/AMBIGUOUS_PROPS-Module-
 * Konstanten stünde im Browser nicht zur Verfügung. */
function censusInPage() {
  const META = new Set(["offset", "computedOffset", "easing", "composite"]);
  const vw = innerWidth, vh = innerHeight;
  const out = [];
  for (const an of document.getAnimations()) {
    let type = "WAAPI", name = an.id || "(kein id)";
    if ("animationName" in an) { type = "CSSAnimation"; name = an.animationName; }
    else if ("transitionProperty" in an) { type = "CSSTransition"; name = an.transitionProperty; }
    let timing = { iterations: 1, duration: 0 };
    try { timing = an.effect.getTiming(); } catch (e) { /* kein Effect */ }
    const endless = timing.iterations === Infinity || timing.iterations == null;
    const props = new Set();
    try {
      for (const frame of an.effect.getKeyframes())
        for (const k of Object.keys(frame)) if (!META.has(k)) props.add(k.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase()));
    } catch (e) { /* kein Effect / keine Keyframes */ }
    const el = an.effect && an.effect.target;
    let boxVisible = false, checkVis = null;
    if (el && el.getBoundingClientRect) {
      const r = el.getBoundingClientRect();
      boxVisible = r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw && r.width > 0 && r.height > 0;
      if (typeof el.checkVisibility === "function") {
        try { checkVis = el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true, contentVisibilityAuto: true }); } catch (e) { /* ignore */ }
      }
    }
    out.push({
      target: el ? describeElement(el) : "(kein Ziel)", type, name, endless,
      iterations: endless ? null : (timing.iterations == null ? 1 : timing.iterations),
      duration: typeof timing.duration === "number" ? timing.duration : null,
      playState: an.playState, boxVisible, checkVisibility: checkVis,
      visible: boxVisible && checkVis !== false, properties: [...props],
    });
  }
  return out;
}

function verdictFor(props) {
  if (props.some((p) => !SAFE_PROPS.includes(p) && !AMBIGUOUS_PROPS.includes(p))) return "Hauptthread (Layout/Paint) ⚠";
  if (props.some((p) => AMBIGUOUS_PROPS.includes(p))) return "ggf. Compositor (Chrome-abhängig, prüfen)";
  return props.length ? "compositor-fähig" : "(keine Properties)";
}

const withVerdict = (list) => list.map((a) => ({ ...a, verdict: verdictFor(a.properties) }));

function summarize(list) {
  const s = { total: list.length, endless: 0, finite: 0, visible: 0, offscreen: 0 };
  for (const a of list) {
    a.endless ? s.endless++ : s.finite++;
    a.visible ? s.visible++ : s.offscreen++;
    s[a.playState] = (s[a.playState] || 0) + 1;
  }
  return s;
}

/* Endlos-und-offscreen zuerst, danach endlos-und-sichtbar, dann einmalig-
 * offscreen, zuletzt einmalig-sichtbar: "endlos zuerst, dann offscreen zuerst". */
function sortRunning(list) {
  const rank = (a) => (a.endless ? 0 : 2) + (a.visible ? 1 : 0);
  return list.filter((a) => a.playState === "running").sort((a, b) => rank(a) - rank(b));
}

function findings(list, running, { reducedMotion }) {
  const out = [];
  const eo = running.filter((a) => a.endless && !a.visible);
  if (eo.length) out.push(`${eo.length} endlose Animation(en) laufen offscreen - sollten pausieren (Web Animations API pause() oder animation-play-state): ${eo.slice(0, 5).map((a) => a.target).join(", ")}${eo.length > 5 ? ", …" : ""}`);
  const mt = running.filter((a) => a.verdict.startsWith("Hauptthread"));
  if (mt.length) out.push(`${mt.length} laufende Animation(en) bewegen Hauptthread-Properties (Layout/Paint): ${[...new Set(mt.flatMap((a) => a.properties))].join(", ")}`);
  if (running.length > RUNNING_THRESHOLD) out.push(`${running.length} Animationen laufen gleichzeitig (> ${RUNNING_THRESHOLD}) - vermutlich mehr, als ein Besucher wahrnehmen kann.`);
  if (reducedMotion && running.length) out.push(`prefers-reduced-motion aktiv, trotzdem laufen noch ${running.length} Animation(en) - sollten per @media (prefers-reduced-motion: reduce) reduziert/gestoppt werden.`);
  return out;
}

function buildCensus(list, atMs, opts) {
  const running = sortRunning(list);
  return { atMs, summary: summarize(list), running, findings: findings(list, running, opts), all: list };
}

function printCensus(title, c) {
  const s = c.summary;
  console.log(`\n== ${title}: ${c.atMs} ms nach load ==`);
  console.log(`  ${s.total} Animation(en) insgesamt - laufend ${s.running || 0} · paused ${s.paused || 0} · finished ${s.finished || 0}${s.idle ? " · idle " + s.idle : ""}`);
  console.log(`  ${s.endless} endlos (Dekoration) · ${s.finite} einmalig (Einblender)`);
  console.log(`  ${s.visible} im Bild · ${s.offscreen} offscreen`);
  if (c.running.length) {
    console.log("\n  Laufende Animationen (endlos zuerst, dann offscreen zuerst):");
    const rows = c.running.map((a) => [a.target, a.type + (a.name ? ": " + a.name : ""), a.endless ? "∞" : String(a.iterations), typeof a.duration === "number" ? ms(a.duration) : String(a.duration), a.visible ? "im Bild" : "offscreen", a.properties.join(", ") || "–", a.verdict]);
    console.log(table(rows, ["Element", "Typ", "Iter.", "Dauer", "Sicht", "Properties", "Verdikt"]).replace(/^/gm, "  "));
  } else {
    console.log("\n  Keine laufenden Animationen.");
  }
  if (c.findings.length) {
    console.log("\n  Befund:");
    for (const f of c.findings) console.log("   - " + f);
  }
}

function printComparison(c1, c2) {
  console.log(`\n== Vergleich ${c1.atMs} ms -> ${c2.atMs} ms ==`);
  console.log(`  laufend: ${c1.summary.running || 0} -> ${c2.summary.running || 0}  ·  endlos gesamt: ${c1.summary.endless} -> ${c2.summary.endless}`);
  console.log("  Großer Rückgang bei \"laufend\" = Einblender fertig; \"endlos\" bleibt ähnlich = Dauer-Dekoration bestätigt.");
}

async function sweepPage(page) {
  const t0 = Date.now();
  await page.evaluate(async (pause) => {
    const max = document.documentElement.scrollHeight;
    const step = Math.max(window.innerHeight, 200);
    for (let y = 0; y <= max; y += step) {
      window.scrollTo({ top: Math.min(y, max), left: 0, behavior: "instant" });
      await new Promise((r) => setTimeout(r, pause));
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, SWEEP_STEP_PAUSE_MS);
  return Date.now() - t0;
}

const argv = process.argv.slice(2);
const args = parseArgs(argv);
if (args.help || argv.includes("-h")) { printHelp(); process.exit(0); }
const url = args._[0];
if (!url) { console.error("Fehler: URL fehlt."); printHelp(); process.exit(1); }
const at = typeof args.at === "number" ? args.at : 1500;
const at2 = typeof args.at2 === "number" ? args.at2 : 8000;
const mobile = !!args.mobile, sweep = !!args.sweep, jsonOut = !!args.json, reducedMotion = !!args["reduced-motion"];

try { await requireUrl(url); } catch (e) { console.error(String(e.message || e)); process.exit(1); }

const { page, close } = await launch({ mobile, reducedMotion });
/* addInitScript macht aus einer Top-Level-Funktionsdeklaration KEIN Global -
 * explizit auf window hängen, sonst ReferenceError in censusInPage. */
await page.addInitScript(DESCRIBE_ELEMENT_SRC + "\nwindow.describeElement = describeElement;");

let c1, c2;
try {
  await page.goto(url, { waitUntil: "load", timeout: 60000 }).catch((e) => {
    throw new Error(`Navigation fehlgeschlagen: ${e.message}`);
  });
  await page.waitForTimeout(at);
  const raw1 = withVerdict(await page.evaluate(censusInPage));

  const sweepMs = sweep ? await sweepPage(page) : 0;
  const remaining = Math.max(0, at2 - at - sweepMs);
  if (remaining) await page.waitForTimeout(remaining);
  const raw2 = withVerdict(await page.evaluate(censusInPage));

  c1 = buildCensus(raw1, at, { reducedMotion });
  c2 = buildCensus(raw2, at2, { reducedMotion });
} catch (e) {
  await close();
  console.error(String(e.message || e));
  process.exit(1);
}
await close();

if (jsonOut) {
  console.log(JSON.stringify({ url, mobile, sweep, reducedMotion, census1: c1, census2: c2 }, null, 2));
} else {
  console.log(`\n${url}  ${mobile ? "mobil" : "desktop"}${sweep ? "  +sweep" : ""}${reducedMotion ? "  +reduced-motion" : ""}`);
  printCensus("Census 1", c1);
  printCensus("Census 2", c2);
  printComparison(c1, c2);
}
process.exit(0);
