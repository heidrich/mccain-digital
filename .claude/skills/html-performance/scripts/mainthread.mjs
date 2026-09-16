#!/usr/bin/env node
/* Wohin gehen die Hauptthread-Millisekunden, und was steckt in Lighthouses
 * "Other"? Lighthouses "Main-thread work breakdown" sortiert jedes Trace-
 * Ereignis in sechs benannte Gruppen und wirft den Rest in "Other" - die eine
 * Zeile, die niemand reparieren kann, weil sie nur ueber das definiert ist,
 * was sie NICHT ist. Dieses Skript rechnet dieselbe Aufteilung nach UND druckt
 * die rohen Ereignisnamen dahinter, denn nur so laesst sich die Zahl beheben.
 *
 * Methode, wie Lighthouse selbst (core/lib/tracehouse/main-thread-tasks.js,
 * _computeRecursiveSelfTime): aus ts/dur jedes Ereignisses eine Verschachtelung
 * bauen und jedem Ereignis seine EIGENZEIT geben (eigene Dauer minus die Dauer
 * seiner direkten Kinder), damit nichts doppelt zaehlt. Die Gruppen-Zuordnung
 * folgt 1:1 core/lib/tracehouse/task-groups.js; "Other" ist explizit die drei
 * Task-Huellen (MessageLoop::RunTask, TaskQueueManager::ProcessTaskFromWork-
 * Queue, ThreadControllerImpl::DoWork) plus alles, was in keiner Gruppe vor-
 * kommt - typischerweise Arbeit, die der Browser zwischen den Frames erledigt
 * und deshalb in KEINEM JS-/CPU-Profil auftaucht. Haeufigstes Beispiel:
 * IntersectionObserverController::computeIntersections, dessen Kosten mit der
 * Zahl der BEOBACHTETEN ZIELE skalieren, nicht mit der Zahl der Observer -
 * wird unten deshalb immer separat ausgewiesen statt in "Other" zu verschwinden.
 *
 * Fallstricke:
 *  - Ohne die Kategorie disabled-by-default-devtools.timeline gibt es keine
 *    Dauern (`dur`), nur Momentmarken - dann keine Verschachtelung, keine Eigenzeit.
 *  - Emulation.setCPUThrottlingRate bremst nur den Hauptthread-Prozess der Seite,
 *    NICHT den GPU-Prozess. Dieses Skript sieht ohnehin nur den Hauptthread -
 *    Compositor-/GPU-Arbeit ist hier unsichtbar, throttled oder nicht.
 *  - 4x CPU ist ein Stresstest, kein PageSpeed-Abbild: PSI selbst rechnet mit
 *    1,2x auf seiner eigenen Hardware. Absolute ms bei 4x sind NICHT direkt mit
 *    einem PSI-Bericht vergleichbar, die PROPORTIONEN zwischen den Gruppen
 *    bleiben trotzdem aussagekraeftig.
 *
 * Usage:
 *   node mainthread.mjs <url> [--for 12] [--cpu 1] [--mobile]
 *                       [--width W --height H] [--top 15] [--slices] [--json]
 *   --for     Sekunden Messfenster NACH dem load-Event (Default 12)
 *   --cpu     CDP-CPU-Drosselung, 1 = aus (Default 1)
 *   --mobile  Mobil-Praeset (Touch, 412x915, DPR 1.75) statt Desktop
 *   --width/--height  Viewport-Preset ueberschreiben
 *   --top     Anzahl der teuersten Einzelereignisse (Default 15)
 *   --slices  zusaetzlich: Zeitachse in 250-ms-Scheiben statt nur der Summe
 *   --json    Ausgabe als JSON statt Text
 */
import { launch, parseArgs, requireUrl, ms, table } from "./lib/browser.mjs";

const HELP = `Nutzung: node mainthread.mjs <url> [Optionen]
Wohin gehen die Hauptthread-Millisekunden, und was steckt in Lighthouses "Other"?

Optionen:
  --for <s>             Sekunden Messfenster nach dem load-Event (Default 12)
  --cpu <n>             CDP-CPU-Drosselung, 1 = aus (Default 1)
  --mobile              Mobil-Preset (Touch, 412x915, DPR 1.75) statt Desktop
  --width/--height <n>  Viewport-Preset überschreiben
  --top <n>             Anzahl der teuersten Einzelereignisse (Default 15)
  --slices              zusätzlich Zeitachse in 250-ms-Scheiben statt nur der Summe
  --json                maschinenlesbare Ausgabe
  --help                diese Hilfe

Beispiel:
  node mainthread.mjs http://localhost:8897/ --for 12 --mobile`;

const argv = process.argv.slice(2);
const args = parseArgs(argv);
if (args.help || argv.includes("-h")) { console.log(HELP); process.exit(0); }
const url = args._[0];
if (!url) { console.error(`Fehler: URL fehlt.\n\n${HELP}`); process.exit(1); }
const secs = Number(args.for || 12), cpu = Number(args.cpu || 1), top = Number(args.top || 15);

/* Lighthouses eigene Trace-Kategorien fuer diese Messung. "toplevel" traegt
 * die Task-Huellen (RunTask & Co.); ohne disabled-by-default-devtools.
 * timeline gibt es keine Dauern zum Verschachteln. */
const CATEGORIES = [
  "-*", "devtools.timeline", "disabled-by-default-devtools.timeline",
  "disabled-by-default-devtools.timeline.frame", "toplevel",
  "blink.user_timing", "loading", "latencyInfo", "v8.execute",
].join(",");

/* 1:1 aus lighthouse/core/lib/tracehouse/task-groups.js - nicht nach Gefuehl
 * erweitern, sonst weicht "Other" von Lighthouses eigenem Bericht ab. */
const GROUPS = [
  { id: "parseHTML", label: "Parse HTML & CSS", short: "Parsen", names: ["ParseHTML", "ParseAuthorStyleSheet"] },
  { id: "styleLayout", label: "Style & Layout", short: "Stil+Layout", names: ["ScheduleStyleRecalculation", "UpdateLayoutTree", "InvalidateLayout", "Layout"] },
  { id: "paintCompositeRender", label: "Rendering", short: "Rendern", names: ["Animation", "HitTest", "PaintSetup", "Paint", "PaintImage", "RasterTask", "ScrollLayer", "UpdateLayer", "UpdateLayerTree", "CompositeLayers", "PrePaint"] },
  { id: "scriptParseCompile", label: "Script Parsing & Compilation", short: "Kompil.", names: ["v8.compile", "v8.compileModule", "v8.parseOnBackground"] },
  { id: "scriptEvaluation", label: "Script Evaluation", short: "Skript", names: ["EventDispatch", "EvaluateScript", "v8.evaluateModule", "FunctionCall", "TimerFire", "FireIdleCallback", "FireAnimationFrame", "RunMicrotasks", "V8.Execute"] },
  { id: "garbageCollection", label: "Garbage Collection", short: "GC", names: ["MinorGC", "MajorGC", "BlinkGC.AtomicPhase", "ThreadState::performIdleLazySweep", "ThreadState::completeSweep", "BlinkGCMarking"] },
  { id: "other", label: "Other", short: "Other", names: ["MessageLoop::RunTask", "TaskQueueManager::ProcessTaskFromWorkQueue", "ThreadControllerImpl::DoWork"] },
];
const OTHER_GROUP = GROUPS[GROUPS.length - 1];
const NAME_TO_GROUP = new Map();
for (const g of GROUPS) for (const n of g.names) NAME_TO_GROUP.set(n, g);
const groupOf = (name) => NAME_TO_GROUP.get(name) || OTHER_GROUP; // unmapped -> Other

const pct = (v, total) => (total > 0 ? Math.round((v / total) * 100) : 0);
const trim = (s, n) => (!s || s.length <= n ? s || "" : "…" + s.slice(-(n - 1)));

let handle = null;
try {
  await requireUrl(url);
  handle = await launch({ mobile: !!args.mobile, cpu, width: args.width, height: args.height });
  const { page, cdp, config } = handle;

  const chunks = [];
  cdp.on("Tracing.dataCollected", (e) => chunks.push(...e.value));
  await cdp.send("Tracing.start", { categories: CATEGORIES, transferMode: "ReportEvents" });
  await page.goto(url, { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(secs * 1000);
  const tracingDone = new Promise((resolve) => cdp.once("Tracing.tracingComplete", resolve));
  await cdp.send("Tracing.end");
  await tracingDone;

  /* Der Hauptthread des Renderers, benannt ueber ein Metadaten-Ereignis -
   * genau wie Lighthouses eigener trace-processor.js. */
  let pid = null, tid = null;
  for (const e of chunks) {
    if (e.ph === "M" && e.name === "thread_name" && e.args?.name === "CrRendererMain") { pid = e.pid; tid = e.tid; break; }
  }
  if (pid === null) throw new Error("Kein CrRendererMain-Thread im Trace gefunden (Navigation fehlgeschlagen oder Tracing zu kurz).");

  const events = chunks
    .filter((e) => e.pid === pid && e.tid === tid && (e.ph === "X" || e.ph === "B" || e.ph === "E"))
    .sort((a, b) => a.ts - b.ts || (b.dur || 0) - (a.dur || 0));

  /* X-Ereignisse tragen ihre Dauer schon; B/E-Paare werden ueber den Namen
   * auf dem zuletzt geoeffneten Eintrag gematcht (LIFO, wie verschachtelte
   * Aufrufe es verlangen). */
  const spans = [];
  const open = [];
  for (const e of events) {
    if (e.ph === "X") spans.push({ name: e.name, ts: e.ts, dur: e.dur || 0, args: e.args });
    else if (e.ph === "B") open.push(e);
    else if (e.ph === "E") {
      for (let i = open.length - 1; i >= 0; i--) {
        if (open[i].name === e.name) {
          const b = open.splice(i, 1)[0];
          spans.push({ name: b.name, ts: b.ts, dur: e.ts - b.ts, args: b.args });
          break;
        }
      }
    }
  }
  spans.sort((a, b) => a.ts - b.ts || b.dur - a.dur);

  /* Eigenzeit exakt wie Lighthouse: Dauer minus Dauer der direkten Kinder.
   * Ein Stapel reicht, weil sortiert nach Start und je Startzeit die
   * laengste (= aeusserste) Spanne zuerst kommt. */
  let first = Infinity, last = 0;
  const stack = [];
  for (const s of spans) {
    const end = s.ts + s.dur;
    while (stack.length && stack[stack.length - 1].end <= s.ts) stack.pop();
    const parent = stack[stack.length - 1];
    if (parent) parent.childDur += s.dur;
    const node = { end, childDur: 0 };
    stack.push(node);
    s._self = node;
    if (s.ts < first) first = s.ts;
    if (end > last) last = end;
  }

  const byGroup = new Map();
  const byKey = new Map();
  let wall = 0;
  for (const s of spans) {
    const selfMs = Math.max(0, s.dur - s._self.childDur) / 1000;
    s._selfMs = selfMs;
    if (selfMs <= 0) continue;
    const g = groupOf(s.name);
    byGroup.set(g.id, (byGroup.get(g.id) || 0) + selfMs);
    wall += selfMs;

    // FunctionCall/EvaluateScript einzeln nach Skript+Funktion aufschluesseln,
    // statt sie zu einer einzigen anonymen Sammelzeile zu verklumpen.
    let key = s.name, scriptUrl = "", fn = "";
    if (s.name === "FunctionCall" || s.name === "EvaluateScript") {
      const d = { ...(s.args?.beginData || {}), ...(s.args?.data || {}) };
      scriptUrl = d.url || "";
      fn = d.functionName || "";
      key = `${s.name}|${scriptUrl}|${fn}`;
    }
    const row = byKey.get(key) || { name: s.name, group: g, url: scriptUrl, fn, ms: 0 };
    row.ms += selfMs;
    byKey.set(key, row);
  }

  const groupRows = GROUPS
    .map((g) => ({ id: g.id, label: g.label, ms: byGroup.get(g.id) || 0 }))
    .sort((a, b) => b.ms - a.ms);
  const topRows = [...byKey.values()].sort((a, b) => b.ms - a.ms).slice(0, top);
  const ioRows = [...byKey.values()]
    .filter((r) => r.name.includes("IntersectionObserver"))
    .sort((a, b) => b.ms - a.ms);

  let slices = null;
  if (args.slices) {
    const BUCKET = 250;
    const buckets = new Map();
    for (const s of spans) {
      if (!s._selfMs) continue;
      const b = Math.floor((s.ts - first) / 1000 / BUCKET);
      const g = groupOf(s.name);
      const m = buckets.get(b) || new Map();
      m.set(g.id, (m.get(g.id) || 0) + s._selfMs);
      buckets.set(b, m);
    }
    const lastBucket = Math.floor((last - first) / 1000 / BUCKET);
    slices = [];
    for (let b = 0; b <= lastBucket; b++) {
      const m = buckets.get(b) || new Map();
      slices.push({
        atMs: b * BUCKET,
        totalMs: [...m.values()].reduce((a, c) => a + c, 0),
        byGroup: Object.fromEntries(m),
      });
    }
  }

  const data = {
    url, mobile: config.mobile, cpu: config.cpu, width: config.width, height: config.height,
    windowMs: Math.round((last - first) / 1000), busyMs: Math.round(wall),
    groups: groupRows.map((g) => ({ id: g.id, label: g.label, ms: Math.round(g.ms), pct: pct(g.ms, wall) })),
    topEvents: topRows.map((r) => ({
      name: r.name, group: r.group.id, ms: Math.round(r.ms), pct: pct(r.ms, wall),
      url: r.url || undefined, functionName: r.fn || undefined,
    })),
    intersectionObserver: ioRows.map((r) => ({ name: r.name, ms: Math.round(r.ms), pct: pct(r.ms, wall) })),
    ...(slices ? {
      slices: slices.map((s) => ({
        atMs: s.atMs, totalMs: Math.round(s.totalMs),
        byGroup: Object.fromEntries(Object.entries(s.byGroup).map(([k, v]) => [k, Math.round(v)])),
      })),
    } : {}),
  };

  if (args.json) console.log(JSON.stringify(data, null, 2));
  else printHuman(data);
} catch (err) {
  console.error("Fehler: " + err.message);
  process.exitCode = 1;
} finally {
  if (handle) await handle.close();
}

function printHuman(data) {
  const indent = (s) => s.replace(/^/gm, "  ");
  console.log(`\n  ${data.url}   CPU x${data.cpu}, ${data.mobile ? "mobil" : "desktop"} ${data.width}x${data.height}`);
  console.log(`  ${ms(data.windowMs)} Messfenster,  ${ms(data.busyMs)} davon Hauptthread-Eigenzeit (busy)\n`);

  console.log("  Hauptthread nach Gruppen (wie Lighthouses Main-thread work breakdown)\n");
  console.log(indent(table(
    data.groups.map((g) => [String(g.ms).padStart(6), (g.pct + "%").padStart(4), g.label]),
    ["ms", "%", "Gruppe"]
  )));

  if (data.intersectionObserver.length) {
    console.log("\n  IntersectionObserver - unsichtbar in JS-/CPU-Profilen, weil die Arbeit zwischen den Frames im Browser laeuft statt in einer eigenen Funktion:\n");
    for (const r of data.intersectionObserver) {
      console.log(`  ${String(r.ms).padStart(6)} ms  ${(r.pct + "%").padStart(4)}  ${r.name}`);
    }
  }

  console.log(`\n  Die ${data.topEvents.length} teuersten Einzelereignisse nach Eigenzeit\n`);
  console.log(indent(table(
    data.topEvents.map((r) => [
      String(r.ms).padStart(6), (r.pct + "%").padStart(4), r.group, r.name,
      r.functionName ? r.functionName + "()" : "", r.url ? trim(r.url, 56) : "",
    ]),
    ["ms", "%", "Gruppe", "Ereignis", "Funktion", "Skript"]
  )));

  if (data.slices) {
    console.log('\n  Zeitachse in 250-ms-Scheiben ab Navigationsstart (Eigenzeit je Gruppe, ms) - "Zeitachse statt Summe": eine Summe zeigt nur DASS der Hauptthread beschaeftigt war, keine Zeitachse zeigt WANN. Balken: 20 Zeichen = 250 ms, volle Breite = in dieser Scheibe 100% beschaeftigt.\n');
    const BAR_W = 20, BUCKET = 250;
    const order = data.groups.map((g) => g.id); // gleiche Reihenfolge wie die Gruppentabelle oben
    const short = new Map(GROUPS.map((g) => [g.id, g.short]));
    const rows = data.slices.map((sl) => {
      const filled = Math.max(0, Math.min(BAR_W, Math.round((sl.totalMs / BUCKET) * BAR_W)));
      const bar = "#".repeat(filled) + ".".repeat(BAR_W - filled);
      return [
        String(sl.atMs).padStart(6), bar, String(sl.totalMs).padStart(5),
        ...order.map((id) => String(Math.round(sl.byGroup[id] || 0)).padStart(4)),
      ];
    });
    console.log(indent(table(rows, ["ab ms", "Balken (20 = 250ms)", "ms", ...order.map((id) => short.get(id))])));
  }
}
