/*
 * lcp-window.mjs — Welches Element ist wann LCP-Kandidat, und wird die Seite je ruhig?
 *
 * Beobachtet eine Seite über ein Zeitfenster (Default 30 s) und protokolliert
 * JEDEN "largest-contentful-paint"-Kandidaten mit Zeit, Größe und Element -
 * nicht nur den letzten. Danach wird wie in Lighthouse berechnet, ob und wann
 * der Main Thread zur Ruhe kommt (TTI/TBT) und wie stark das Layout während
 * der Ladephase springt (CLS).
 *
 * Stolperfallen, die dieses Skript kennt:
 *  - Späte LCP-Kandidaten: Chrome feuert "largest-contentful-paint" für jedes
 *    neue größte Element, nicht nur einmal. Ein Kandidat, der erst Sekunden
 *    nach FCP auftaucht (nachladende Bilder, JS-Rotation von Headlines), wird
 *    in Lighthouse trotzdem zum gemessenen LCP - solange der Performance-Trace
 *    läuft, zählt der zuletzt gemeldete Kandidat.
 *  - Das LCP-Reporting endet mit der ersten echten Nutzereingabe (Klick, Tap,
 *    Tastendruck, Scroll) - das ist Browser-Spezifikation, kein Bug. Mausbe-
 *    wegungen (mousemove) beenden es dagegen NICHT. --interact N löst das
 *    hier absichtlich per Tab-Taste aus, um die Grenze sichtbar zu machen.
 *  - Eine Seite mit endloser Animations-/Rotationsschleife erzeugt dauerhaft
 *    Long Tasks. Der Main Thread wird nie 5 s am Stück ruhig, TTI wird nie
 *    erreicht, und das TBT-Fenster läuft bis zum Ende der Messung durch - es
 *    wächst mit jeder weiteren Beobachtungssekunde.
 *
 * Usage:
 *   node lcp-window.mjs <url> [--for 30] [--cpu 1] [--mobile]
 *                        [--width W --height H] [--interact 15] [--json]
 *   node lcp-window.mjs --help
 */
import { launch, parseArgs, requireUrl, DESCRIBE_ELEMENT_SRC, ms, table } from "./lib/browser.mjs";

const HELP = `Nutzung: node lcp-window.mjs <url> [Optionen]
Welches Element ist wann LCP-Kandidat, und wird die Seite je ruhig (TTI/TBT/CLS)?

Optionen:
  --for <s>             Sekunden Beobachtungsfenster (Default 30)
  --cpu <n>             CPU-Drosselung wie DevTools, 1 = aus (Default 1)
  --mobile              Mobil-Preset (Touch, 412x915, DPR 1.75) statt Desktop
  --width/--height <n>  Viewport-Preset überschreiben
  --interact <s>        bei Sekunde s per Tab-Taste eine Nutzereingabe auslösen
                         (beendet LCP-Reporting, wie in echten Browsern)
  --software-gl         Chromium mit SwiftShader (Software-GL) starten: zeigt, ob der
                         erste Paint auf getContext()/WebGL wartet
  --json                maschinenlesbare Ausgabe
  --help                diese Hilfe

Beispiel:
  node lcp-window.mjs http://localhost:8897/ --for 30 --mobile`;

const argv = process.argv.slice(2);
const args = parseArgs(argv);
if (args.help || argv.includes("-h")) { console.log(HELP); process.exit(0); }
const url = args._[0];
if (!url) { console.error(`Fehler: URL fehlt.\n\n${HELP}`); process.exit(1); }

const num = (v, def) => (v === undefined ? def : Number(v));
const forSec = num(args.for, 30);
const interactSec = args.interact === undefined ? null : Number(args.interact);
const asJson = !!args.json;
const launchOpts = {
  mobile: !!args.mobile,
  cpu: num(args.cpu, 1),
  softwareGl: !!args["software-gl"],
  width: args.width === undefined ? undefined : Number(args.width),
  height: args.height === undefined ? undefined : Number(args.height),
};

/* Läuft IM BROWSER, vor jedem Seiten-Skript (context.addInitScript wird vor
 * page.goto registriert - siehe unten). Alle Observer sind "buffered", damit
 * auch Entries erfasst werden, die vor dem Observer-Setup gefeuert haben. */
const INIT = `${DESCRIBE_ELEMENT_SRC}
window.__perf = { fcp: null, lcp: [], longtasks: [], shifts: [] };
try {
  new PerformanceObserver((l) => { for (const e of l.getEntries())
    if (e.name === "first-contentful-paint") window.__perf.fcp = e.startTime;
  }).observe({ type: "paint", buffered: true });
} catch (e) { window.__perf.paintErr = String(e); }
try {
  new PerformanceObserver((l) => { for (const e of l.getEntries())
    window.__perf.lcp.push({ t: e.startTime, size: e.size, el: describeElement(e.element), url: e.url || null });
  }).observe({ type: "largest-contentful-paint", buffered: true });
} catch (e) { window.__perf.lcpErr = String(e); }
try {
  new PerformanceObserver((l) => { for (const e of l.getEntries())
    window.__perf.longtasks.push({ t: e.startTime, d: e.duration });
  }).observe({ type: "longtask", buffered: true });
} catch (e) { window.__perf.ltErr = String(e); }
try {
  new PerformanceObserver((l) => { for (const e of l.getEntries())
    window.__perf.shifts.push({
      t: e.startTime, value: e.value, hadRecentInput: e.hadRecentInput,
      sources: (e.sources || []).slice(0, 3).map((s) => describeElement(s.node)),
    });
  }).observe({ type: "layout-shift", buffered: true });
} catch (e) { window.__perf.clsErr = String(e); }
`;

/* TTI/TBT wie in quiet.mjs (mccain-digital/tools): erste Lücke von 5 s ohne
 * startenden Long Task nach FCP ist TTI; ohne diese Lücke bleibt TTI "nicht
 * erreicht" und das TBT-Fenster läuft bis zum Beobachtungsende. CLS ist
 * session-windowed (5 s Fenster, 1 s Lücke) wie im aktuellen Web-Vitals-Spec. */
function analyze(data, meta) {
  const fcp = data.fcp || 0;
  const lt = data.longtasks.slice().sort((a, b) => a.t - b.t);
  const QUIET = 5000;
  let cursor = fcp;
  for (const { t, d: dur } of lt) {
    if (t + dur <= cursor) continue;
    if (t - cursor >= QUIET) break;
    cursor = t + dur;
  }
  const ttiReached = data.now - cursor >= QUIET;
  const tti = ttiReached ? cursor : null;
  const ttiEnd = ttiReached ? tti : data.now;

  let tbt = 0;
  for (const { t, d: dur } of lt) if (t + dur > fcp && t < ttiEnd) tbt += Math.max(0, dur - 50);

  let sessionValue = 0, sessionStart = 0, sessionEnd = 0, curSources = [];
  let cls = 0, clsSources = [];
  for (const s of data.shifts) {
    if (s.hadRecentInput) continue;
    if (sessionValue && s.t - sessionEnd < 1000 && s.t - sessionStart < 5000) {
      sessionValue += s.value;
      curSources = curSources.concat(s.sources);
    } else {
      sessionValue = s.value;
      sessionStart = s.t;
      curSources = s.sources.slice();
    }
    sessionEnd = s.t;
    if (sessionValue > cls) {
      cls = sessionValue;
      clsSources = curSources.slice(0, 3);
    }
  }

  const lcp = data.lcp
    .slice()
    .sort((a, b) => a.t - b.t)
    .map((e) => ({ ...e, deltaFcp: e.t - fcp, late: e.t - fcp > 3000 }));

  return {
    url: meta.url, config: meta.config, for: meta.forSec,
    navigation: { domContentLoaded: data.dcl, load: data.load },
    fcp, lcp, longtasks: lt, longtasksAfter5s: lt.filter((e) => e.t > 5000).length,
    tti, ttiReached, tbt, tbtOpenEnded: !ttiReached,
    cls: Math.round(cls * 10000) / 10000, clsSources,
    interaction: meta.interactAt !== null ? { atMs: Math.round(meta.interactAt) } : null,
  };
}

function printReport(r) {
  console.log(`\nLCP-Fenster: ${r.url}`);
  console.log(`Konfiguration: ${r.config.width}x${r.config.height} dpr ${r.config.dpr} ${r.config.mobile ? "mobile" : "desktop"}  CPU x${r.config.cpu}  Fenster ${r.for} s`);

  console.log("\n" + table([
    ["DOMContentLoaded", r.navigation.domContentLoaded !== null ? ms(r.navigation.domContentLoaded) : "-"],
    ["Load", r.navigation.load !== null ? ms(r.navigation.load) : "-"],
    ["FCP", ms(r.fcp)],
  ], ["Navigation", "Zeit"]));

  console.log("\nLCP-Timeline");
  if (r.lcp.length) {
    console.log(table(r.lcp.map((e) => [
      ms(e.t), String(e.size), (e.deltaFcp >= 0 ? "+" : "") + ms(e.deltaFcp), e.url ? `${e.el} (${e.url})` : e.el,
    ]), ["t", "size", "Δ FCP", "Element"]));
  } else {
    console.log("  keine LCP-Kandidaten gemeldet");
  }
  for (const e of r.lcp.filter((x) => x.late)) {
    console.log(`WARNUNG: LCP-Kandidat bei ${ms(e.t)} (Δ ${ms(e.deltaFcp)} nach FCP) — später LCP-Kandidat: wird in Lighthouse zum LCP, solange der Trace läuft.`);
  }

  const CAP = 30;
  console.log(`\nLong Tasks (${r.longtasks.length} gesamt, ${r.longtasksAfter5s} nach 5 s)`);
  if (r.longtasks.length) {
    console.log(table(r.longtasks.slice(0, CAP).map((t) => [ms(t.t), ms(t.d)]), ["t", "Dauer"]));
    if (r.longtasks.length > CAP) console.log(`  ... ${r.longtasks.length - CAP} weitere`);
  } else {
    console.log("  keine long tasks");
  }

  if (r.interaction) console.log(`\nInteraktion: Tab-Taste bei ${ms(r.interaction.atMs)} ausgelöst — LCP-Reporting sollte ab hier enden.`);

  console.log("\nKennzahlen");
  console.log(`  TTI   ${r.tti !== null ? ms(r.tti) : `nicht erreicht in ${r.for} s`}`);
  console.log(`  TBT   ${ms(r.tbt)}${r.tbtOpenEnded ? "  (bis Fensterende — TTI nicht erreicht, wächst weiter)" : ""}`);
  console.log(`  CLS   ${r.cls}${r.clsSources.length ? `  Quellen: ${r.clsSources.join(", ")}` : ""}`);
}

let exitCode = 0;
try {
  await requireUrl(url);
  const { context, page, close, config } = await launch(launchOpts);
  await context.addInitScript(INIT);
  await page.goto(url, { waitUntil: "load", timeout: 60000 });

  let interactAt = null;
  if (interactSec !== null) {
    const before = Math.min(interactSec, forSec);
    await page.waitForTimeout(before * 1000);
    await page.keyboard.press("Tab"); // beendet LCP-Reporting (keypress), anders als mousemove
    interactAt = await page.evaluate(() => performance.now());
    const remaining = forSec - before;
    if (remaining > 0) await page.waitForTimeout(remaining * 1000);
  } else {
    await page.waitForTimeout(forSec * 1000);
  }

  const data = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    let dcl = null, load = null;
    if (nav) {
      dcl = nav.domContentLoadedEventEnd;
      load = nav.loadEventEnd;
    } else if (performance.timing) {
      const t = performance.timing;
      dcl = t.domContentLoadedEventEnd - t.navigationStart;
      load = t.loadEventEnd - t.navigationStart;
    }
    return { ...window.__perf, now: performance.now(), dcl, load };
  });
  await close();

  const result = analyze(data, { url, forSec, interactAt, config });
  if (asJson) console.log(JSON.stringify(result, null, 2));
  else printReport(result);
} catch (err) {
  console.error(`Fehler: ${err.message}`);
  exitCode = 1;
}
process.exit(exitCode);
