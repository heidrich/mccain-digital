/* Where the main-thread milliseconds actually go - and what "Other" is made of.
 *
 * Lighthouse's "Main-thread work breakdown" sorts every trace event into six
 * named groups and puts everything it does not recognise into `Other`. That
 * makes Other the one bar nobody can act on: it is defined by what it is NOT.
 * This tool computes the same breakdown AND prints the raw event names behind
 * it, which is the only form the number can be fixed in.
 *
 * Method, matching Lighthouse: take the renderer's main thread only, build the
 * nesting from ts/dur, and give every event its SELF time (own duration minus
 * the duration of its children) so nothing is counted twice. Group membership
 * follows lighthouse/core/lib/tracehouse/task-groups.js.
 *
 *   node tools/mainthread.mjs <url> [--cpu 4] [--mobile] [--for 12]
 */
import { launch } from "./browser.mjs";

const a = process.argv;
const num = (f, d) => (a.indexOf(f) > -1 ? Number(a[a.indexOf(f) + 1]) : d);
const url = a[2] && !a[2].startsWith("--") ? a[2] : "http://127.0.0.1:8897/";
const cpu = num("--cpu", 4);
const secs = num("--for", 12);
const mobile = a.includes("--mobile");

/* Lighthouse's own categories. 'toplevel' is what carries RunTask, and without
 * disabled-by-default-devtools.timeline there are no durations to nest. */
const CATEGORIES = [
  "-*",
  "devtools.timeline",
  "disabled-by-default-devtools.timeline",
  "disabled-by-default-devtools.timeline.frame",
  "toplevel",
  "blink.user_timing",
  "loading",
  "latencyInfo",
  "v8.execute",
].join(",");

const GROUPS = [
  ["Parse HTML & CSS", ["ParseHTML", "ParseAuthorStyleSheet"]],
  ["Style & Layout", ["ScheduleStyleRecalculation", "UpdateLayoutTree", "RecalculateStyles",
    "Layout", "UpdateLayerTree", "InvalidateLayout", "LayoutInvalidationTracking",
    "ScheduleStyleInvalidationTracking", "StyleRecalcInvalidationTracking", "Layerize",
    "LayoutShift", "UpdateLayoutTree"]],
  ["Rendering", ["Animation", "RequestMainThreadFrame", "ActivateLayerTree", "DrawFrame",
    "HitTest", "PaintSetup", "Paint", "PaintImage", "Rasterize", "RasterTask",
    "CompositeLayers", "ImageDecodeTask", "ImageResizeTask", "GPUTask", "Decode Image",
    "Resize Image", "DecodeLazyPixelRef", "Draw LazyPixelRef", "PrePaint", "Commit",
    "BeginMainThreadFrame", "NeedsBeginFrameChanged"]],
  ["Script Parsing & Compilation", ["v8.compile", "v8.compileModule", "v8.parseOnBackground",
    "V8.CompileCode", "V8.CompileScript", "v8.produceCache", "V8.OptimizeCode"]],
  ["Script Evaluation", ["EventDispatch", "EvaluateScript", "v8.evaluateModule", "FunctionCall",
    "TimerFire", "TimerInstall", "TimerRemove", "FireIdleCallback", "FireAnimationFrame",
    "RunMicrotasks", "V8.Execute", "XHRReadyStateChange", "XHRLoad"]],
  ["Garbage Collection", ["GCEvent", "MajorGC", "MinorGC", "V8.GCCompactor",
    "BlinkGC.AtomicPhase", "ThreadState::performIdleLazySweep", "ThreadState::completeSweep"]],
];
const groupOf = new Map();
for (const [g, names] of GROUPS) for (const n of names) groupOf.set(n, g);
/* The task wrappers themselves. Their self time IS "Other" in Lighthouse. */
const WRAPPERS = new Set(["RunTask", "MessageLoop::RunTask",
  "TaskQueueManager::ProcessTaskFromWorkQueue", "ThreadControllerImpl::RunTask"]);

const { browser, context } = await launch(mobile ? 412 : 1350, mobile ? 915 : 940);
const tab = await context.newPage();
const cdp = await context.newCDPSession(tab);
if (cpu > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpu });
if (mobile) await cdp.send("Emulation.setDeviceMetricsOverride",
  { width: 412, height: 915, deviceScaleFactor: 2.625, mobile: true });

const chunks = [];
cdp.on("Tracing.dataCollected", (e) => chunks.push(...e.value));
await cdp.send("Tracing.start", { categories: CATEGORIES, transferMode: "ReportEvents" });
await tab.goto(url, { waitUntil: "load", timeout: 60000 });
await tab.waitForTimeout(secs * 1000);
const done = new Promise((r) => cdp.once("Tracing.tracingComplete", r));
await cdp.send("Tracing.end");
await done;
await browser.close();

/* The renderer's main thread, named by a metadata event. */
let pid = null, tid = null;
for (const e of chunks) {
  if (e.ph === "M" && e.name === "thread_name" && e.args?.name === "CrRendererMain") { pid = e.pid; tid = e.tid; break; }
}
const ev = chunks
  .filter((e) => e.pid === pid && e.tid === tid && (e.ph === "X" || e.ph === "B" || e.ph === "E"))
  .sort((x, y) => x.ts - y.ts || (y.dur || 0) - (x.dur || 0));

/* Complete (X) events already carry a duration; B/E pairs are matched by depth. */
const spans = [];
const open = [];
for (const e of ev) {
  if (e.ph === "X") spans.push({ name: e.name, ts: e.ts, dur: e.dur || 0, args: e.args });
  else if (e.ph === "B") open.push(e);
  else if (e.ph === "E") {
    for (let i = open.length - 1; i >= 0; i--) {
      if (open[i].name === e.name) { const b = open.splice(i, 1)[0]; spans.push({ name: b.name, ts: b.ts, dur: e.ts - b.ts, args: b.args }); break; }
    }
  }
}
spans.sort((x, y) => x.ts - y.ts || y.dur - x.dur);

/* Self time: a span's duration minus the duration of the spans nested inside
 * it. Walking with a stack is enough because the list is sorted outermost
 * first at each start time. */
const self = new Map();
const byGroup = new Map();
const stack = [];
let wall = 0, first = Infinity, last = 0;
for (const s of spans) {
  const end = s.ts + s.dur;
  while (stack.length && stack[stack.length - 1].end <= s.ts) stack.pop();
  const parent = stack[stack.length - 1];
  if (parent) parent.childDur += s.dur;
  stack.push({ ...s, end, childDur: 0, ref: s });
  s._node = stack[stack.length - 1];
  if (s.ts < first) first = s.ts;
  if (end > last) last = end;
}
for (const s of spans) {
  const n = s._node;
  const selfMs = Math.max(0, n.dur - n.childDur) / 1000;
  if (selfMs <= 0) continue;
  self.set(s.name, (self.get(s.name) || 0) + selfMs);
  const g = WRAPPERS.has(s.name) ? "Other" : (groupOf.get(s.name) || "Other");
  byGroup.set(g, (byGroup.get(g) || 0) + selfMs);
  wall += selfMs;
}

const ms = (v) => Math.round(v).toLocaleString("de-DE").padStart(8) + " ms";
console.log("\n  " + url + "   CPU x" + cpu + (mobile ? ", mobil" : ", desktop") +
  ",  " + Math.round((last - first) / 1000).toLocaleString("de-DE") + " ms aufgezeichnet");
console.log("\n  Hauptthread nach Gruppen (wie Lighthouse)\n");
for (const [g, v] of [...byGroup.entries()].sort((x, y) => y[1] - x[1]))
  console.log("  " + ms(v) + "   " + g);
console.log("  " + "-".repeat(11) + "   " + "-".repeat(20));
console.log("  " + ms(wall) + "   gesamt");

const other = [...self.entries()]
  .filter(([n]) => WRAPPERS.has(n) || !groupOf.has(n))
  .sort((x, y) => y[1] - x[1]);
console.log("\n  Woraus \"Other\" besteht - Ereignisname und Eigenzeit\n");
for (const [n, v] of other.slice(0, 22)) console.log("  " + ms(v) + "   " + n);

console.log("\n  Die teuersten Ereignisse insgesamt, egal welche Gruppe\n");
for (const [n, v] of [...self.entries()].sort((x, y) => y[1] - x[1]).slice(0, 18))
  console.log("  " + ms(v) + "   " + (groupOf.get(n) || "Other").padEnd(28) + n);

/* THE FIRST THREE SECONDS, SECOND BY SECOND.
 *
 * An aggregate over ten seconds cannot answer "why did the LCP element wait
 * 2.030 ms to be painted" - that is a question about a WINDOW. Lighthouse's
 * own LCP breakdown calls the wait "element render delay", which reads like
 * the element is slow and is in fact the opposite: the bytes arrived at 330 ms
 * and the main thread had no free moment to paint them until much later. What
 * filled those moments is below. */
const T0 = first;
const bucketMs = 250, buckets = new Map();
for (const s of spans) {
  const n = s._node;
  const selfMs = Math.max(0, n.dur - n.childDur) / 1000;
  if (selfMs <= 0) continue;
  const at = (s.ts - T0) / 1000;
  if (at > 4000) continue;
  const b = Math.floor(at / bucketMs);
  const g = WRAPPERS.has(s.name) ? "Other" : (groupOf.get(s.name) || "Other");
  if (!buckets.has(b)) buckets.set(b, new Map());
  const m = buckets.get(b);
  m.set(g, (m.get(g) || 0) + selfMs);
}
const SHORT = { "Script Evaluation": "Skript", "Style & Layout": "Stil+Layout", "Rendering": "Rendern",
  "Parse HTML & CSS": "Parsen", "Garbage Collection": "GC", "Other": "Other",
  "Script Parsing & Compilation": "Kompil." };
const cols = ["Skript", "Stil+Layout", "Rendern", "Other", "Parsen", "GC", "Kompil."];
console.log("\n  Die ersten 4 Sekunden in 250-ms-Scheiben (Eigenzeit je Gruppe, ms)\n");
console.log("     ab      " + cols.map((c) => c.padStart(11)).join(""));
for (const b of [...buckets.keys()].sort((x, y) => x - y)) {
  const m = buckets.get(b), byShort = new Map();
  for (const [g, v] of m) byShort.set(SHORT[g] || g, (byShort.get(SHORT[g] || g) || 0) + v);
  const sum = [...byShort.values()].reduce((a, c) => a + c, 0);
  if (sum < 5) continue;
  console.log("  " + (b * bucketMs + " ms").padStart(7) + "   " +
    cols.map((c) => String(Math.round(byShort.get(c) || 0)).padStart(11)).join("") +
    "   = " + Math.round(sum) + " von " + bucketMs);
}

/* The individual spans that blocked, not the sums. */
console.log("\n  Einzelne Bloecke > 40 ms Eigenzeit in den ersten 4 s\n");
const big = spans
  .map((s) => ({ n: s.name, at: (s.ts - T0) / 1000, self: Math.max(0, s._node.dur - s._node.childDur) / 1000, dur: s.dur / 1000 }))
  .filter((x) => x.at <= 4000 && x.self > 40)
  .sort((x, y) => x.at - y.at);
for (const x of big.slice(0, 24))
  console.log("  bei " + (Math.round(x.at) + " ms").padStart(8) + "   " + (Math.round(x.self) + " ms").padStart(7) +
    " eigen   " + (groupOf.get(x.n) || "Other").padEnd(20) + x.n);
