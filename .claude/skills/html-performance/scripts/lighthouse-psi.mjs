/* lighthouse-psi.mjs — Lighthouse so laufen lassen, wie PageSpeed Insights es tut, und das Ergebnis lesbar machen.
 *
 * PSI vs. "npx lighthouse <url>" ohne eigene Config:
 *  - PSI/Lightrider nutzt core/config/lr-mobile-config.js bzw. lr-desktop-config.js (extends: 'lighthouse:default').
 *    Mobil: NUR throttling.cpuSlowdownMultiplier auf 1.2 (CLI-Default fürs simulierte Mobilprofil ist 4x!) -
 *    kalibriert auf den Median der PSI-Server-Hardware, kein Stresstest-Wert. Desktop ersetzt throttling komplett
 *    durch "desktopDense4G" (rttMs 40, throughputKbps 10240, cpuSlowdownMultiplier 1 - KEIN CPU-Throttling auf
 *    Desktop, anders als bei Mobil, leicht zu übersehen).
 *  - maxWaitForFcp 15000 / maxWaitForLoad 35000 (CLI-Default 30000 / 45000) - PSI wartet KÜRZER, nicht länger.
 *    maxWaitForFcp hat keinen eigenen CLI-Flag, nur über --config-path erreichbar - deshalb dieser Weg statt Flags.
 *  - skipAudits modern-http-insight (lügt sonst über HTTP/2) und bf-cache (schlägt in Headless immer fehl).
 *  - Die "1 s Ruhefenster" (pauseAfterFcpMs/pauseAfterLoadMs/networkQuietThresholdMs/cpuQuietThresholdMs) sind
 *    NICHT PSI-exklusiv, sondern der normale Default für throttlingMethod=simulate (das PSI nutzt). Erst
 *    --method devtools schaltet auf throttlingMethod=devtools um und zieht diese Fenster automatisch auf 5250 ms
 *    hoch - ein STRENGERES, ANDERES Fenster; die Zahlen sind dann nicht mehr 1:1 mit PSI/simulate vergleichbar.
 *
 * Warum lokal != PSI, selbst mit denselben Settings: Simulate rechnet aus einem einmal beobachteten lokalen Trace
 * (Lantern-Modell) - die Eingangswerte (CPU-Zeit/Task, Serverantwortzeit) hängen weiter von der echten lokalen
 * Maschine ab, zwei Rechner mit denselben PSI-Settings liefern unterschiedliche Zahlen. Ob Lightrider-Worker GPU-
 * Beschleunigung haben, ist NICHT verifiziert (öffentlich nicht dokumentiert) - falls nicht, rendert PSI
 * durchgehend Software, ein Unterschied zu jedem lokalen Rechner mit echter GPU.
 *
 * NIE unter Maschinen-Last messen: Chrome-Tab-Gewitter, ein Build, ein zweiter Lighthouse-Lauf parallel - Chrome
 * liefert dann innerhalb von maxWaitForFcp kein "first contentful paint"-Traceereignis, obwohl die Seite sichtbar
 * rendert. Ergebnis: runtimeError NO_FCP, kein Report. Beim Bau dieses Skripts auf einem normal genutzten Mac
 * (Browser mit vielen Tabs offen) mehrfach reproduziert - kein Einzelfall, kein Bug hier.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseArgs, findChrome, requireUrl, table, ms } from "./lib/browser.mjs";

const HELP = `Nutzung: node lighthouse-psi.mjs <url> [Optionen]
Lighthouse so laufen lassen, wie PageSpeed Insights es tut, und das Ergebnis lesbar machen.

Optionen:
  --desktop        Desktop-Profil (lr-desktop-config) statt Mobil (lr-mobile-config, Default)
  --method <m>     simulate (Default, wie PSI) oder devtools (echtes Throttling, andere Ruhefenster)
  --runs <n>       Anzahl Wiederholungen, Median + Min-Max (Default 1)
  --out <dir>      Report/Assets hier ablegen (Default: temp-Verzeichnis)
  --keep           Verzeichnis behalten + --save-assets (Trace/DevtoolsLog) einsammeln
  --json           kompakte JSON-Zusammenfassung statt Textausgabe
  --help           diese Hilfe

Beispiele:
  node lighthouse-psi.mjs http://localhost:8897/v5/
  node lighthouse-psi.mjs http://localhost:8897/v5/ --desktop --keep --out ./lh-psi
  node lighthouse-psi.mjs http://localhost:8897/v5/ --method devtools --runs 3
`;

const DESKTOP_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36";

/* Settings 1:1 aus lighthouse@13.4.1 core/config/lr-mobile-config.js /
 * lr-desktop-config.js abgeschrieben (heute im npx-Cache verifiziert), nur als
 * Objekt statt als import von constants.js. extends:'lighthouse:default' liefert
 * den Rest (Mobil-Viewport/UA, throttlingMethod:'simulate', 1s-Ruhefenster). */
function buildSettings(desktop) {
  const base = { maxWaitForFcp: 15000, maxWaitForLoad: 35000, skipAudits: ["modern-http-insight", "bf-cache"] };
  if (!desktop) return { ...base, throttling: { cpuSlowdownMultiplier: 1.2 } };
  return {
    ...base,
    formFactor: "desktop",
    throttling: { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1, requestLatencyMs: 0, downloadThroughputKbps: 0, uploadThroughputKbps: 0 },
    screenEmulation: { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false },
    emulatedUserAgent: DESKTOP_UA,
  };
}

function writeConfig(dir, desktop) {
  const config = { extends: "lighthouse:default", settings: buildSettings(desktop) };
  const file = path.join(dir, "lr-config.mjs");
  fs.writeFileSync(file, `// Lightrider-Settings, generiert von lighthouse-psi.mjs\nexport default ${JSON.stringify(config, null, 2)};\n`);
  return file;
}

/* Unter Windows sind lighthouse und npx .cmd-Shims: spawnSync ohne Shell findet
 * sie nicht (ENOENT, gemessen 18.9.2026), und Node startet .cmd seit
 * CVE-2024-27980 nur noch mit shell:true. Dann müssen Argumente mit Leerzeichen
 * selbst gequotet werden - die Shell trennt sonst an ihnen. */
const WIN = process.platform === "win32";
const quote = (a) => (/[\s"]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a);
function run(cmd, args, opts) {
  return WIN ? spawnSync(cmd, args.map(quote), { ...opts, shell: true }) : spawnSync(cmd, args, opts);
}

/* lighthouse auf PATH bevorzugen; sonst npx mit gepinntem Major (Audit-IDs wie
 * lcp-breakdown-insight sollen sich nicht unter uns wegändern). */
function resolveLighthouseCmd() {
  const probe = run("lighthouse", ["--version"], { stdio: "ignore" });
  return probe.error || probe.status !== 0 ? { cmd: "npx", pre: ["--yes", "lighthouse@13"] } : { cmd: "lighthouse", pre: [] };
}

function runOnce(url, { cmd, pre }, { cfgFile, outFile, desktop, method, keep }, env) {
  const argv = [
    ...pre, url,
    "--only-categories=performance",
    "--output=json",
    `--output-path=${outFile}`,
    "--disable-full-page-screenshot",
    "--chrome-flags=--headless=new",
    `--config-path=${cfgFile}`,
  ];
  if (method === "devtools") argv.push("--throttling-method=devtools");
  if (keep) argv.push("--save-assets");
  const res = run(cmd, argv, { env, encoding: "utf8", timeout: 180000, killSignal: "SIGKILL", maxBuffer: 64 * 1024 * 1024 });
  if (!fs.existsSync(outFile)) {
    const tail = (res.stderr || res.error?.message || "kein Output").trim().split("\n").slice(-5).join("\n");
    return { report: null, error: { code: res.signal === "SIGKILL" ? "TIMEOUT" : "NO_OUTPUT", message: tail } };
  }
  const report = JSON.parse(fs.readFileSync(outFile, "utf8"));
  return { report, error: report.runtimeError || null };
}

function extractMetrics(report) {
  const it = report.audits?.metrics?.details?.items?.[0] || {};
  return {
    score: report.categories?.performance?.score,
    fcp: it.firstContentfulPaint, lcp: it.largestContentfulPaint, tbt: it.totalBlockingTime,
    cls: it.cumulativeLayoutShift, si: it.speedIndex,
    observedFcp: it.observedFirstContentfulPaint, observedLcp: it.observedLargestContentfulPaint,
    observedLoad: it.observedLoad, observedTraceEnd: it.observedTraceEnd, navStartTs: it.observedNavigationStartTs,
  };
}

/* audits['lcp-breakdown-insight'].details.items: GENAU ein type:"table" (die 4
 * Phasen - bei Text-LCP fehlen load delay/duration) + optional ein type:"node". */
function extractLcpBreakdown(report) {
  const items = report.audits?.["lcp-breakdown-insight"]?.details?.items || [];
  const phases = (items.find((i) => i.type === "table")?.items || []).map((r) => ({ label: r.label, ms: r.duration }));
  const node = items.find((i) => i.type === "node");
  return { phases, element: node ? { selector: node.selector, snippet: node.snippet } : null };
}

function savingsStr(audit) {
  if (!audit.metricSavings) return "";
  return Object.entries(audit.metricSavings).filter(([, v]) => v > 0).map(([k, v]) => `${k} -${Math.round(v)}ms`).join(", ");
}
/* "Impact" gibt es in LH13 nicht direkt: die 5 Metrik-Audits tragen ein echtes
 * category-weight (10-30), alle Insights/Diagnostics haben weight 0 und zählen nur
 * über metricSavings - weight*1000+savings sortiert Metrik-Audits zuerst, Rest nach gesparten ms. */
function extractInsights(report) {
  const refs = report.categories?.performance?.auditRefs || [];
  const list = [];
  for (const ref of refs) {
    const a = report.audits?.[ref.id];
    if (!a || a.score === null || a.score >= 1) continue;
    const savings = a.metricSavings ? Object.values(a.metricSavings).reduce((s, v) => s + (v > 0 ? v : 0), 0) : 0;
    list.push({ id: a.id, displayValue: a.displayValue || "-", savings: savingsStr(a), impact: (ref.weight || 0) * 1000 + savings });
  }
  return list.sort((a, b) => b.impact - a.impact);
}

/* Jedes largestContentfulPaint::Candidate-Event im Trace, Zeit relativ zu
 * observedNavigationStartTs (Nullmarke der observedXxx-Metriken; ts ist µs, daher /1000). */
function extractLcpCandidates(traceFile, navStartTs) {
  const raw = JSON.parse(fs.readFileSync(traceFile, "utf8"));
  const events = Array.isArray(raw) ? raw : raw.traceEvents || [];
  return events
    .filter((e) => e.name === "largestContentfulPaint::Candidate")
    .map((e) => ({ index: e.args?.data?.candidateIndex ?? null, t: (e.ts - navStartTs) / 1000, size: e.args?.data?.size ?? null, node: e.args?.data?.nodeName ?? "?" }))
    .sort((a, b) => a.t - b.t);
}

function stats(nums) {
  const s = nums.slice().sort((a, b) => a - b);
  const n = s.length;
  return { median: n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2, min: s[0], max: s[n - 1] };
}
function fmt(stat, digits = 0) {
  const r = (x) => (digits ? Number(x.toFixed(digits)) : Math.round(x));
  return stat.min === stat.max ? `${r(stat.median)}` : `${r(stat.median)} [${r(stat.min)}–${r(stat.max)}]`;
}

function aggregate(successful) {
  const pick = (k) => successful.map((s) => s.metrics[k]);
  return {
    score: stats(pick("score").map((v) => v * 100)), fcp: stats(pick("fcp")), lcp: stats(pick("lcp")), tbt: stats(pick("tbt")),
    cls: stats(pick("cls")), si: stats(pick("si")), observedFcp: stats(pick("observedFcp")), observedLcp: stats(pick("observedLcp")),
    observedLoad: stats(pick("observedLoad")), observedTraceEnd: stats(pick("observedTraceEnd")),
  };
}

function printReport(url, runs, agg, rep, keep, traceFile, runtimeErrors) {
  console.log(`=== Lighthouse PSI-Modus: ${url} ===`);
  const s = rep.report.configSettings || {}, t = s.throttling || {};
  console.log(
    `Form Factor: ${s.formFactor} | Methode: ${s.throttlingMethod} | CPU: ${t.cpuSlowdownMultiplier}x | ` +
    `Ruhefenster: ${s.networkQuietThresholdMs} ms | maxWaitForLoad: ${s.maxWaitForLoad} ms | Lighthouse ${rep.report.lighthouseVersion}`
  );
  if (s.throttlingMethod === "devtools") console.log("Hinweis: devtools-Methode - Ruhefenster real 5250 ms (Default-Override in core/config/config.js), NICHT 1:1 mit PSI/simulate vergleichbar.");
  if (runs > 1) console.log(`Läufe: ${runs}, erfolgreich ausgewertet: ${runs - runtimeErrors.length}`);

  console.log("\n" + table([
    ["Score (0-100)", fmt(agg.score)],
    ["FCP simuliert", fmt(agg.fcp) + " ms"], ["LCP simuliert", fmt(agg.lcp) + " ms"],
    ["TBT", fmt(agg.tbt) + " ms"], ["CLS", fmt(agg.cls, 4)], ["SI simuliert", fmt(agg.si) + " ms"],
    ["observedFCP", fmt(agg.observedFcp) + " ms"], ["observedLCP", fmt(agg.observedLcp) + " ms"],
    ["observedLoad", fmt(agg.observedLoad) + " ms"], ["observedTraceEnd", fmt(agg.observedTraceEnd) + " ms"],
  ], ["Metrik", runs > 1 ? "Median [Min–Max]" : "Wert"]));
  console.log("Hinweis: beobachtet = was Chrome sah, simuliert = was Lantern daraus rechnet.");

  const { phases, element } = extractLcpBreakdown(rep.report);
  console.log(`\nLCP-Element (Lauf ${rep.i}): ${element ? element.selector : "kein Element ermittelt (Text-LCP oder Audit nicht gelaufen)"}`);
  if (element) console.log(`  ${element.snippet}`);
  if (phases.length) console.log(table(phases.map((p) => [p.label, ms(p.ms)]), ["Phase", "Dauer"]));

  if (keep && fs.existsSync(traceFile)) {
    const cands = extractLcpCandidates(traceFile, rep.metrics.navStartTs);
    console.log(`\nLCP-Kandidaten im Trace von Lauf ${rep.i} (${cands.length}):`);
    console.log(table(cands.map((c, i) => [c.index ?? i + 1, ms(c.t), String(c.size ?? "-"), c.node, i === cands.length - 1 ? "(final)" : ""]), ["#", "t", "size", "Node", ""]));
  }

  const insights = extractInsights(rep.report);
  console.log(`\nAudits mit score < 1 (${insights.length}), nach Impact sortiert:`);
  if (!insights.length) console.log("  keine");
  else {
    const CAP = 15;
    console.log(table(insights.slice(0, CAP).map((a) => [a.id, a.displayValue, a.savings || "-"]), ["Audit", "Wert", "Savings"]));
    if (insights.length > CAP) console.log(`  ... ${insights.length - CAP} weitere`);
  }

  const warnings = rep.report.runWarnings || [];
  if (warnings.length) console.log("\nrunWarnings:\n" + warnings.map((w) => "  - " + w).join("\n"));
  if (runtimeErrors.length) console.log("\nruntimeError:\n" + runtimeErrors.map((e) => `  Lauf ${e.run}: ${e.code} - ${e.message}`).join("\n"));

  const m = rep.metrics;
  if (m.observedLcp - m.observedFcp > 3000) console.log(`\nWARNUNG: observedLCP (${ms(m.observedLcp)}) liegt >3000 ms nach observedFCP (${ms(m.observedFcp)}) — Seite wurde nicht ruhig: Dauerlast oder offene Requests.`);
  if (m.observedTraceEnd > 20000) console.log(`\nWARNUNG: Trace-Ende bei ${ms(m.observedTraceEnd)} (>20 s) — Seite wurde nicht ruhig: Dauerlast oder offene Requests.`);
}

async function main() {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);
  if (args.help || argv.includes("-h")) { console.log(HELP); return 0; }
  const url = args._[0];
  if (!url) { console.error(`Fehler: URL fehlt.\n\n${HELP}`); return 1; }
  const method = args.method === undefined ? "simulate" : String(args.method);
  if (method !== "simulate" && method !== "devtools") { console.error(`Ungültig: --method ${method} (erlaubt: simulate, devtools)`); return 1; }
  const desktop = !!args.desktop, keep = !!args.keep, asJson = !!args.json;
  const runs = Math.max(1, Math.round(Number(args.runs) || 1));
  const userOut = typeof args.out === "string" ? path.resolve(args.out) : null;

  await requireUrl(url);

  const env = { ...process.env };
  if (!env.CHROME_PATH) {
    const chrome = findChrome();
    if (!chrome) throw new Error("Kein Chrome/Chromium gefunden (HP_CHROME oder CHROME_PATH setzen).");
    env.CHROME_PATH = chrome;
  }

  const workDir = userOut || fs.mkdtempSync(path.join(os.tmpdir(), "lh-psi-"));
  try {
    fs.mkdirSync(workDir, { recursive: true });
    const cfgFile = writeConfig(workDir, desktop);
    const bin = resolveLighthouseCmd();
    const successful = [];
    const runtimeErrors = [];
    for (let i = 1; i <= runs; i++) {
      if (!asJson) console.log(`Lauf ${i}/${runs}...`);
      const outFile = path.join(workDir, `run${i}.json`);
      const { report, error } = runOnce(url, bin, { cfgFile, outFile, desktop, method, keep }, env);
      if (error) runtimeErrors.push({ run: i, code: error.code, message: error.message });
      if (report && !report.runtimeError) successful.push({ i, outFile, report, metrics: extractMetrics(report) });
    }

    if (!successful.length) {
      console.error("Kein Lauf erfolgreich.");
      for (const e of runtimeErrors) console.error(`  Lauf ${e.run}: ${e.code} - ${e.message}`);
      return 1;
    }

    const agg = aggregate(successful);
    const medLcp = agg.lcp.median;
    const rep = successful.reduce((best, s) => (Math.abs(s.metrics.lcp - medLcp) < Math.abs(best.metrics.lcp - medLcp) ? s : best));
    const traceFile = rep.outFile.replace(/\.json$/, "-0.trace.json");

    if (asJson) {
      const { phases, element } = extractLcpBreakdown(rep.report);
      const cs = rep.report.configSettings;
      console.log(JSON.stringify({
        url, desktop, method, runs, runsOk: successful.length,
        config: { formFactor: cs.formFactor, throttlingMethod: cs.throttlingMethod, cpuSlowdownMultiplier: cs.throttling?.cpuSlowdownMultiplier, quietWindowMs: cs.networkQuietThresholdMs, maxWaitForLoad: cs.maxWaitForLoad, lighthouseVersion: rep.report.lighthouseVersion },
        metrics: agg, lcpElement: element, lcpPhases: phases, insights: extractInsights(rep.report),
        runWarnings: rep.report.runWarnings || [], runtimeErrors,
      }, null, 2));
    } else {
      printReport(url, runs, agg, rep, keep, traceFile, runtimeErrors);
    }
    return runtimeErrors.length ? 1 : 0;
  } finally {
    if (!keep && !userOut) fs.rmSync(workDir, { recursive: true, force: true });
  }
}

main().then((code) => process.exit(code)).catch((err) => {
  console.error(`Fehler: ${err.message}`);
  process.exit(1);
});
