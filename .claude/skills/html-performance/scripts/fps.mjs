/* Frage: Hält die Seite ihre Bildrate, auch auf schwacher Hardware, und
 * drosselt sie sich selbst (z.B. über ein eigenes Qualitäts-Attribut),
 * wenn nicht?
 *
 * Methode: requestAnimationFrame läuft durchgehend IM Browser über das
 * ganze Messfenster (nicht per Node<->Browser-Polling alle paar hundert
 * ms - das würde die Kette selbst stören). Alle Frame-Zeitstempel gehen
 * am Ende gesammelt an Node zurück und werden dort in 1-Sekunden-Buckets
 * sortiert: fps = Anzahl Frames im Bucket, p95 = 95. Perzentil der
 * Frame-zu-Frame-Abstände im Bucket, Jank = Abstände > 33 ms (mehr als
 * ein 30-fps-Frame lang). Ein optionales Qualitäts-Attribut (--attr) und
 * optionales Scrollen (--scroll) laufen aus demselben Grund ebenfalls im
 * Browser-Kontext, parallel zur rAF-Schleife.
 *
 * Fallstricke:
 *  - CPU-Drosselung (--cpu, Emulation.setCPUThrottlingRate) wirkt auf den
 *    Renderer-Prozess, NICHT auf den GPU-Prozess. Eine WebGL-Animation,
 *    die im Compositor/GPU-Prozess läuft, bremst dadurch kaum. Nur
 *    Software-GL (--software-gl, SwiftShader) erzeugt echte GPU-seitige
 *    Last.
 *  - Eine gut gebaute Seite fährt ihre Qualität testweise wieder hoch
 *    ("probed back to 60fps"). Ein einzelner niedriger Wert ist kein
 *    dauerhaftes Drosseln - erst ein Plateau über mehrere Sekunden ist
 *    eins. Deshalb hier immer die ganze Zeitleiste ansehen, nicht nur den
 *    Mittelwert.
 *  - fps aus EINER performance.now()-Differenz zweier Frames ist Rauschen
 *    (ein einzelner GC-Pause-Frame verzerrt das Ergebnis total). Deshalb
 *    hier über 1-Sekunden-Fenster mit vielen Frames aggregiert und p95
 *    statt Maximum verwendet.
 */
import { launch, parseArgs, requireUrl, table } from "./lib/browser.mjs";

const HELP = `Nutzung: node fps.mjs <url> [Optionen]
Hält die Seite ihre Bildrate, auch unter CPU-Last, und drosselt sie sich erkennbar selbst?

Optionen:
  --for <s>        Messdauer je Szenario in Sekunden (Default 10)
  --cpu <liste>    Kommaliste CPU-Throttling-Faktoren, z. B. "1,4" (Default 1)
  --software-gl    jedes CPU-Szenario zusätzlich mit SwiftShader (Software-GL) wiederholen
  --mobile         Mobile-Viewport + Touch statt Desktop
  --attr <name>    Data-Attribut einer seiteneigenen Qualitätsstufe pro Sekunde mitlesen (z. B. data-v5-fps)
  --scroll         während der Messung langsam scrollen (alle 200 ms ein Schritt)
  --json           Ausgabe als JSON statt Textblöcke
  --help           diese Hilfe

Beispiel:
  node fps.mjs http://localhost:8897/v5/ --for 8 --cpu 1,4 --software-gl --attr data-v5-fps
`;

/* Läuft IM Browser (page.evaluate per Funktionsreferenz - kein Zugriff auf
 * äußere Scope-Variablen). Sammelt jeden rAF-Zeitstempel relativ zum ersten
 * Frame, liest optional 1x/Sekunde ein Attribut und scrollt optional in
 * 200ms-Schritten linear bis ans Seitenende - alles ohne die rAF-Kette
 * durch Round-Trips zu unterbrechen. */
function sampleInPage({ durationMs, attrName, scroll }) {
  return new Promise((resolve) => {
    const frames = [];
    const attrSamples = [];
    let startTime = null;
    let nextSampleAt = 1000;
    let scrollTimer = null;

    function readAttr() {
      if (!attrName) return null;
      const el = document.querySelector(`[${attrName}]`);
      return el ? el.getAttribute(attrName) : null;
    }

    function tick(t) {
      if (startTime === null) {
        startTime = t;
        if (scroll) {
          const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
          const steps = Math.max(1, Math.round(durationMs / 200));
          const step = maxScroll / steps;
          let y = 0;
          scrollTimer = setInterval(() => {
            y = Math.min(maxScroll, y + step);
            window.scrollTo({ top: y, behavior: "instant" });
          }, 200);
        }
      }
      const elapsed = t - startTime;
      frames.push(elapsed);
      while (nextSampleAt <= durationMs && elapsed >= nextSampleAt) {
        attrSamples.push(readAttr());
        nextSampleAt += 1000;
      }
      if (elapsed < durationMs) {
        requestAnimationFrame(tick);
        return;
      }
      if (scrollTimer) clearInterval(scrollTimer);
      while (attrSamples.length < Math.round(durationMs / 1000)) attrSamples.push(readAttr());
      resolve({ frames, attrSamples });
    }
    requestAnimationFrame(tick);
  });
}

function percentile95(sortedDeltas) {
  if (sortedDeltas.length === 0) return null;
  const idx = Math.min(sortedDeltas.length - 1, Math.ceil(0.95 * sortedDeltas.length) - 1);
  return sortedDeltas[idx];
}

/* Bucketet die rohen Frame-Zeitstempel (ms seit erstem Frame) in
 * 1-Sekunden-Fenster und berechnet fps/p95/jank je Fenster. */
function analyze(frames, forSeconds, attrSamples, attrName) {
  const buckets = Array.from({ length: forSeconds }, () => ({ count: 0, deltas: [] }));
  for (let i = 0; i < frames.length; i++) {
    const idx = Math.min(forSeconds - 1, Math.max(0, Math.floor(frames[i] / 1000)));
    buckets[idx].count++;
    if (i > 0) buckets[idx].deltas.push(frames[i] - frames[i - 1]);
  }
  return buckets.map((b, i) => ({
    t: i + 1,
    fps: b.count,
    p95: percentile95([...b.deltas].sort((a, c) => a - c)),
    jank: b.deltas.filter((d) => d > 33).length,
    attr: attrName ? (attrSamples[i] ?? null) : undefined,
  }));
}

function summarize(timeline, attrName) {
  const fpsList = timeline.map((r) => r.fps);
  const meanFps = fpsList.reduce((a, b) => a + b, 0) / fpsList.length;
  const minFps = Math.min(...fpsList);
  const totalJank = timeline.reduce((a, r) => a + r.jank, 0);
  const attrChanges = [];
  if (attrName) {
    let prev;
    for (const row of timeline) {
      if (prev !== undefined && row.attr !== prev) attrChanges.push({ t: row.t, from: prev, to: row.attr });
      prev = row.attr;
    }
  }
  return { meanFps: Math.round(meanFps * 10) / 10, minFps, totalJank, attrChanges };
}

async function runScenario(url, scenario, opts) {
  const { page, close } = await launch({ mobile: opts.mobile, cpu: scenario.cpu, softwareGl: scenario.softwareGl });
  try {
    await page.goto(url, { waitUntil: "load" });
    await page.waitForTimeout(1000);
    const renderer = await page.evaluate(() => {
      const gl = document.createElement("canvas").getContext("webgl");
      if (!gl) return null;
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      return ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER));
    });
    const raw = await page.evaluate(sampleInPage, { durationMs: opts.forSeconds * 1000, attrName: opts.attr || null, scroll: !!opts.scroll });
    const timeline = analyze(raw.frames, opts.forSeconds, raw.attrSamples, opts.attr);
    return { cpu: scenario.cpu, softwareGl: scenario.softwareGl, renderer, timeline, summary: summarize(timeline, opts.attr) };
  } finally {
    await close();
  }
}

function printScenario(index, total, result, attrName) {
  console.log(`--- Szenario ${index + 1}/${total}: CPU x${result.cpu}, Software-GL: ${result.softwareGl ? "ja" : "nein"} ---`);
  console.log(`Renderer: ${result.renderer ?? "null (kein WebGL-Kontext - headless/Software-Umgebungen können das)"}`);
  const headers = ["t(s)", "fps", "p95 ms", "jank", ...(attrName ? ["attr"] : [])];
  const rows = result.timeline.map((r) => [r.t, r.fps, r.p95 == null ? "-" : r.p95.toFixed(1), r.jank, ...(attrName ? [r.attr ?? "-"] : [])]);
  console.log(table(rows, headers));
  const s = result.summary;
  const changes = s.attrChanges.length ? s.attrChanges.map((c) => `t=${c.t}s ${c.from}→${c.to}`).join(", ") : "keine";
  console.log(`Zusammenfassung: mean fps ${s.meanFps} | min fps ${s.minFps} | jank gesamt ${s.totalJank}${attrName ? ` | attr-Wechsel: ${changes}` : ""}`);
  console.log("");
}

async function main() {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);
  if (args.help || argv.includes("-h")) {
    console.log(HELP);
    return;
  }
  const url = args._[0];
  if (!url) {
    console.error(`Fehler: URL fehlt.\n\n${HELP}`);
    process.exitCode = 1;
    return;
  }
  await requireUrl(url);

  const forSeconds = Number(args.for) > 0 ? Math.round(Number(args.for)) : 10;
  const mobile = !!args.mobile;
  const attr = typeof args.attr === "string" ? args.attr : null;
  const scroll = !!args.scroll;
  const json = !!args.json;

  const cpuList = String(args.cpu ?? 1)
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (cpuList.length === 0) cpuList.push(1);

  const scenarios = [];
  for (const cpu of cpuList) {
    scenarios.push({ cpu, softwareGl: false });
    if (args["software-gl"]) scenarios.push({ cpu, softwareGl: true });
  }

  if (!json) {
    console.log(`=== FPS-Check: ${url} ===`);
    console.log(`Viewport: ${mobile ? "Mobile" : "Desktop"} | Dauer: ${forSeconds}s je Szenario${attr ? ` | Attr: ${attr}` : ""}${scroll ? " | Scroll: ja" : ""}\n`);
  }

  const out = { url, mobile, forSeconds, attr, scroll, scenarios: [] };
  for (let i = 0; i < scenarios.length; i++) {
    const result = await runScenario(url, scenarios[i], { mobile, forSeconds, attr, scroll });
    out.scenarios.push(result);
    if (!json) printScenario(i, scenarios.length, result, attr);
  }

  if (json) console.log(JSON.stringify(out, null, 2));
}

main().catch((err) => {
  console.error(`Fehler: ${err.message}`);
  process.exitCode = 1;
});
