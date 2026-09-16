/* Wer beobachtet wie viele Elemente, wer liest Layout, wer pollt?
 *
 * Frage: Welche IntersectionObserver/ResizeObserver laufen auf der Seite, wie
 * viele Ziele beobachten sie tatsächlich (nicht: wie viele Observer-Instanzen
 * es gibt), wie oft wird das Layout zwangsweise neu gelesen
 * (getBoundingClientRect), und läuft irgendwo ein verstecktes Poll-Timer-
 * oder Dauer-rAF-Loop?
 *
 * Methode: Alle fünf APIs werden per context.addInitScript() ERSETZT, bevor
 * das erste Seiten-Skript läuft. Ohne addInitScript hält die Seite zum
 * Patch-Zeitpunkt schon eine Referenz auf die native Funktion (z. B.
 * `const IO = window.IntersectionObserver` im allerersten <script>) - der
 * Patch käme zu spät, die Messung wäre leer oder unvollständig.
 *
 * Fallstricke:
 *  - IntersectionObserver-Kosten skalieren mit der Zahl der BEOBACHTETEN
 *    ZIELE, nicht mit der Zahl der Observer-Instanzen. Ein Observer mit 400
 *    Zielen kostet wie 400 Observer mit je einem Ziel.
 *  - ResizeObserver auf document.body feuert NIE, wenn html,body{height:100%}
 *    gesetzt ist - body ändert dann seine Höhe nie, egal wie viel Inhalt sich
 *    ändert. Beobachte die tatsächliche Komponentenwurzel, nicht body.
 *  - Ein für immer laufender requestAnimationFrame-Loop zeigt sich nicht als
 *    Fehler, sondern schlicht als konstant ~60 Aufrufe/s (Bildwiederholrate
 *    des Displays, auf ProMotion-/120-Hz-Geräten entsprechend ~120) -
 *    unauffällig im Profiler, aber Dauerlast auf dem Main Thread.
 *
 * Nutzung:
 *   node observers.mjs <url> [--for 15] [--cpu 1] [--mobile] [--sweep] [--json]
 */
import { launch, parseArgs, requireUrl, DESCRIBE_ELEMENT_SRC, table } from "./lib/browser.mjs";

const HELP = `Nutzung: node observers.mjs <url> [Optionen]
Wer beobachtet wie viele Elemente, wer liest Layout, wer pollt?

Optionen:
  --for <s>   Sekunden Messdauer nach load (Default 15)
  --cpu <n>   CPU-Drosselung, z. B. 4 für 4x (Default 1 = aus)
  --mobile    Mobil-Emulation (Touch + isMobile) statt Desktop-Viewport
  --sweep     nach load einmal in Viewport-Schritten zum Seitenende und zurück
              scrollen, damit scroll-getriggerte Observer feuern; IO/RO-
              Aktivität während des Sweeps wird separat ausgewiesen
  --json      maschinenlesbare Ausgabe statt Text
  --help      diese Hilfe

Beispiel:
  node observers.mjs http://localhost:8897/ --sweep --mobile`;

const argv = process.argv.slice(2);
const args = parseArgs(argv);
if (args.help || argv.includes("-h")) { console.log(HELP); process.exit(0); }
const url = args._[0];
if (!url) { console.error(`Fehler: URL fehlt.\n\n${HELP}`); process.exit(1); }
const forSecs = Number(args.for ?? 15);
const cpu = Number(args.cpu ?? 1);
const mobile = !!args.mobile;
const doSweep = !!args.sweep;
const json = !!args.json;

/* ---- Browser-seitiger Patch, läuft VOR jedem Seiten-Skript ------------- */
const INIT = DESCRIBE_ELEMENT_SRC + `
(function () {
  window.__obs = { io: [], ro: [], rect: { perSecond: [], stacks: {} }, timeouts: {}, raf: [], sweep: null };

  function frames(n) {
    const lines = (new Error().stack || "").split(String.fromCharCode(10));
    const out = [];
    for (let i = 3; i < lines.length && out.length < n; i++) {
      let t = lines[i].trim();
      if (t.slice(0, 3) === "at ") t = t.slice(3);
      out.push(t);
    }
    return out.join(" | ");
  }

  const RealIO = window.IntersectionObserver;
  if (RealIO) {
    function IO(cb, opts) {
      const rec = { stack: frames(3), opts: JSON.stringify(opts || {}), targets: new Set(), max: 0, calls: [] };
      window.__obs.io.push(rec);
      const inst = new RealIO((entries, obs) => { rec.calls.push(Math.round(performance.now())); return cb(entries, obs); }, opts);
      const ob = inst.observe.bind(inst), un = inst.unobserve.bind(inst), dc = inst.disconnect.bind(inst);
      inst.observe = (el) => { rec.targets.add(el); if (rec.targets.size > rec.max) rec.max = rec.targets.size; return ob(el); };
      inst.unobserve = (el) => { rec.targets.delete(el); return un(el); };
      inst.disconnect = () => { rec.targets.clear(); return dc(); };
      return inst;
    }
    IO.prototype = RealIO.prototype;
    window.IntersectionObserver = IO;
  }

  const RealRO = window.ResizeObserver;
  if (RealRO) {
    function RO(cb) {
      const rec = { observed: [], calls: [] };
      window.__obs.ro.push(rec);
      const inst = new RealRO((entries, obs) => { rec.calls.push(Math.round(performance.now())); return cb(entries, obs); });
      const ob = inst.observe.bind(inst);
      inst.observe = (el, opt) => { rec.observed.push(describeElement(el)); return ob(el, opt); };
      return inst;
    }
    RO.prototype = RealRO.prototype;
    window.ResizeObserver = RO;
  }

  const realRect = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function () {
    const s = Math.floor(performance.now() / 1000);
    window.__obs.rect.perSecond[s] = (window.__obs.rect.perSecond[s] || 0) + 1;
    const k = frames(3);
    window.__obs.rect.stacks[k] = (window.__obs.rect.stacks[k] || 0) + 1;
    return realRect.call(this);
  };

  const realTimeout = window.setTimeout.bind(window);
  window.setTimeout = (fn, delay, ...rest) => {
    const d = delay || 0;
    (window.__obs.timeouts[d] || (window.__obs.timeouts[d] = [])).push(Math.round(performance.now()));
    return realTimeout(fn, delay, ...rest);
  };

  const realRaf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => {
    const s = Math.floor(performance.now() / 1000);
    window.__obs.raf[s] = (window.__obs.raf[s] || 0) + 1;
    return realRaf(cb);
  };
})();
`;

/* Instant scrollt in Viewport-Schritten mit 400ms Pausen zum Ende und zurück
 * an den Anfang, damit scroll-getriggerte Observer feuern. */
async function sweep(page) {
  await page.evaluate(() => { window.__obs.sweep = { start: Math.round(performance.now()), end: null }; });
  const vh = await page.evaluate(() => innerHeight);
  let last = -1;
  for (let i = 0; i < 200; i++) {
    const { y, max } = await page.evaluate((step) => {
      const bottom = Math.max(0, document.documentElement.scrollHeight - innerHeight);
      const target = Math.min(scrollY + step, bottom);
      scrollTo({ top: target, behavior: "instant" });
      return { y: target, max: bottom };
    }, vh);
    await page.waitForTimeout(400);
    if (y >= max || y === last) break;
    last = y;
  }
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(400);
  await page.evaluate(() => { window.__obs.sweep.end = Math.round(performance.now()); });
}

let context, page, close;
try {
  await requireUrl(url);
  ({ context, page, close } = await launch({ mobile, cpu }));
  await context.addInitScript(INIT);
  await page.goto(url, { waitUntil: "load", timeout: 60000 });
} catch (err) {
  console.error(`Fehler: ${err.message}`);
  process.exit(1);
}

const t0 = Date.now();
if (doSweep) await sweep(page);
const remaining = forSecs * 1000 - (Date.now() - t0);
if (remaining > 0) await page.waitForTimeout(remaining);

const data = await page.evaluate(() => {
  const canCV = typeof Element.prototype.checkVisibility === "function";
  const io = window.__obs.io.map((r) => {
    let skipped = 0;
    if (canCV) for (const el of r.targets) { try { if (!el.checkVisibility({ contentVisibilityAuto: true })) skipped++; } catch { /* Element entfernt */ } }
    return { stack: r.stack, opts: r.opts, now: r.targets.size, max: r.max, skipped, canCV, calls: r.calls };
  });
  const ro = window.__obs.ro.map((r) => ({ observed: r.observed, calls: r.calls }));
  return { io, ro, rect: window.__obs.rect, timeouts: window.__obs.timeouts, raf: window.__obs.raf, sweep: window.__obs.sweep };
});
await close();

/* ---- Auswertung ---------------------------------------------------------- */
const inWindow = (t, w) => !!w && t >= w.start && t <= w.end;
const shortStack = (s) => {
  const clean = s.replace(/https?:\/\/[^/)]+/g, "");
  if (clean.length <= 90) return clean;
  const cut = clean.slice(0, 90);
  const sep = cut.lastIndexOf(" | ");
  return (sep > 20 ? cut.slice(0, sep) : cut) + " …";
};
const BLOCKS = " ▁▂▃▄▅▆▇█";
const sparkline = (arr) => { const max = Math.max(1, ...arr); return arr.map((n) => (n ? BLOCKS[Math.max(1, Math.round((n / max) * 8))] : BLOCKS[0])).join(""); };
const fmtWhen = (times, cap = 6) => (times.length <= cap ? times.join(", ") : times.slice(0, cap).join(", ") + ` … (+${times.length - cap})`);

const totalNow = data.io.reduce((s, r) => s + r.now, 0);
const totalSkipped = data.io.reduce((s, r) => s + r.skipped, 0);
const cvAvailable = data.io.length === 0 || data.io[0].canCV;

if (json) {
  console.log(JSON.stringify({ url, config: { forSecs, cpu, mobile, sweep: doSweep }, ...data, totals: { observedNow: totalNow, observedSkipped: totalSkipped } }, null, 2));
  process.exit(0);
}

console.log(`\n  ${url}   ${mobile ? "mobil" : "desktop"}, CPU x${cpu}, ${forSecs}s nach load${doSweep ? " + Sweep" : ""}\n`);

console.log("IntersectionObserver-Instanzen:");
console.log(data.io.length
  ? table(data.io.map((r, i) => [`#${i + 1}`, r.now, r.max, cvAvailable ? r.skipped : "n/v", shortStack(r.stack)]), ["#", "jetzt", "max", "in cv-skip", "erstellt von"])
  : "  (keine)");
console.log(`\n  ${totalNow} beobachtete Ziele insgesamt (davon ${cvAvailable ? totalSkipped : "n/v"} in übersprungenen content-visibility-Blöcken).`);
console.log("  Regel: Kosten skalieren mit Zielen, nicht mit Observern; Ziele in übersprungenen");
console.log("  content-visibility-Blöcken erst beobachten, wenn der Block rendert.");

console.log("\nResizeObserver-Instanzen:");
console.log(data.ro.length
  ? table(data.ro.map((r, i) => [`#${i + 1}`, r.observed.length ? r.observed.slice(0, 3).join(", ") + (r.observed.length > 3 ? ` +${r.observed.length - 3}` : "") : "-", r.calls.length, r.calls.length ? fmtWhen(r.calls) : "-"]), ["#", "beobachtet", "callbacks", "wann (ms)"])
  : "  (keine)");

if (doSweep) {
  const sw = data.sweep;
  const ioActive = data.io.filter((r) => r.calls.some((t) => inWindow(t, sw))).length;
  const roActive = data.ro.filter((r) => r.calls.some((t) => inWindow(t, sw))).length;
  const ioCalls = data.io.reduce((s, r) => s + r.calls.filter((t) => inWindow(t, sw)).length, 0);
  const roCalls = data.ro.reduce((s, r) => s + r.calls.filter((t) => inWindow(t, sw)).length, 0);
  console.log(`\nAktivität während des Sweeps (${sw ? Math.round(sw.end - sw.start) : 0} ms):`);
  console.log(`  IntersectionObserver-Callbacks: ${ioCalls} (über ${ioActive} von ${data.io.length} Instanzen)`);
  console.log(`  ResizeObserver-Callbacks:       ${roCalls} (über ${roActive} von ${data.ro.length} Instanzen)`);
}

const rectArr = Array.from({ length: data.rect.perSecond.length }, (_, i) => data.rect.perSecond[i] || 0);
const rectTotal = rectArr.reduce((a, b) => a + b, 0);
const topRect = Object.entries(data.rect.stacks).sort((a, b) => b[1] - a[1]).slice(0, 3);
console.log(`\ngetBoundingClientRect: ${rectTotal.toLocaleString("de-DE")} Aufrufe`);
console.log(rectTotal ? `  ${sparkline(rectArr)}   max ${Math.max(...rectArr)}/s` : "  (keine Aufrufe)");
if (topRect.length) { console.log("  Top-Aufrufer:"); for (const [s, n] of topRect) console.log(`    ${String(n).padStart(5)}×  ${shortStack(s)}`); }

const rows = Object.entries(data.timeouts).map(([d, times]) => {
  const perSec = {};
  for (const t of times) perSec[Math.floor(t / 1000)] = (perSec[Math.floor(t / 1000)] || 0) + 1;
  return { d: Number(d), n: times.length, maxPerSec: Math.max(0, ...Object.values(perSec)) };
}).sort((a, b) => b.n - a.n);
console.log(`\nsetTimeout-Delays (Polling-Verdacht ab 5×/s selbem Delay):`);
console.log(rows.length
  ? table(rows.slice(0, 12).map((r) => [r.d, r.n, r.maxPerSec, r.maxPerSec >= 5 ? "Polling-Verdacht" : ""]), ["delay (ms)", "aufrufe", "max/s", "verdacht"])
  : "  (keine Timer)");
if (rows.length > 12) console.log(`  … und ${rows.length - 12} weitere Delay-Werte`);

const rafArr = Array.from({ length: data.raf.length }, (_, i) => data.raf[i] || 0);
const rafTotal = rafArr.reduce((a, b) => a + b, 0);
console.log(`\nrequestAnimationFrame: ${rafTotal.toLocaleString("de-DE")} Aufrufe`);
console.log(rafTotal ? `  ${sparkline(rafArr)}   Ø ${(rafTotal / rafArr.length).toFixed(1)}/s, max ${Math.max(...rafArr)}/s` : "  (keine Aufrufe)");
