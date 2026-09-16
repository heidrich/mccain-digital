/* Gemeinsamer Starter für alle Messskripte in diesem Ordner.
 *
 * playwright-core statt playwright: kein Browser-Download. Gesucht wird ein
 * bereits installiertes Chromium - erst über HP_CHROME / CHROME_PATH, dann im
 * ms-playwright-Cache (höchster chromium-NNN-Build, mehrere Binärnamen, weil
 * neuere Builds "Google Chrome for Testing.app" statt "Chromium.app" heißen),
 * zuletzt die normalen System-Installationen von Google Chrome.
 *
 * Regeln, die hier eingebaut sind (Herkunft: mccain-digital, HANDOFF 9/2026):
 *  - CPU-Drosselung per CDP (Emulation.setCPUThrottlingRate), Default 1.
 *    4x ist ein Stresstest, KEIN PageSpeed-Abbild: PSI rechnet mit 1,2x auf
 *    seinen eigenen Maschinen (lr-mobile-config.js).
 *  - "mobile" heißt Touch + isMobile, sonst greifen (hover:hover)/(pointer:fine)-
 *    Gates der Seite wie am Desktop und die Messung misst die falsche Variante.
 *  - Software-GL (--use-angle=swiftshader) ist der einzige Weg, WebGL-Last zu
 *    erzeugen; CPU-Drosselung erreicht den GPU-Prozess nicht.
 *  - Ein toter Server liefert Fehlerseiten, gegen die jede Messung "sauber"
 *    aussieht: requireUrl() vor jeder Messreihe.
 */
import { chromium } from "playwright-core";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const DESKTOP = { width: 1350, height: 940, dpr: 1, mobile: false };
/* Lighthouse-Mobilgerät (Moto G Power): 412x823 CSS-px, DSF 1.75. Die 915
 * entsprechen dem Playwright-Preset für dasselbe Gerät ohne Browser-Leiste. */
export const MOBILE = { width: 412, height: 915, dpr: 1.75, mobile: true };

export const SOFTWARE_GL_ARGS = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"];

function chromeCache() {
  if (process.platform === "win32") {
    return path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local"), "ms-playwright");
  }
  if (process.platform === "darwin") return path.join(os.homedir(), "Library", "Caches", "ms-playwright");
  return path.join(os.homedir(), ".cache", "ms-playwright");
}

const CACHE_BINARIES = [
  ["chrome-win64", "chrome.exe"],
  ["chrome-win", "chrome.exe"],
  ["chrome-mac-arm64", "Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"],
  ["chrome-mac", "Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"],
  ["chrome-mac", "Chromium.app/Contents/MacOS/Chromium"],
  ["chrome-mac-arm64", "Chromium.app/Contents/MacOS/Chromium"],
  ["chrome-linux", "chrome"],
];

const SYSTEM_BINARIES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];

export function findChrome() {
  const env = process.env.HP_CHROME || process.env.CHROME_PATH;
  if (env) return env;
  const cache = chromeCache();
  if (fs.existsSync(cache)) {
    const builds = fs
      .readdirSync(cache)
      .filter((d) => /^chromium-\d+$/.test(d))
      .sort((a, b) => Number(b.slice(9)) - Number(a.slice(9)));
    for (const b of builds) {
      for (const [dir, exe] of CACHE_BINARIES) {
        const p = path.join(cache, b, dir, ...exe.split("/"));
        if (fs.existsSync(p)) return p;
      }
    }
  }
  return SYSTEM_BINARIES.find((p) => fs.existsSync(p)) || null;
}

/* Positionsargumente und --flags. `--cpu 4` und `--cpu=4` sind gleich, ein
 * Flag ohne Wert ist true. Zahlen werden zu Zahlen. */
export function parseArgs(argv = process.argv.slice(2)) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-h") {
      args.help = true;
      continue;
    }
    if (!a.startsWith("--")) {
      args._.push(a);
      continue;
    }
    let [key, val] = a.slice(2).split(/=(.*)/s);
    if (val === undefined && argv[i + 1] !== undefined && !argv[i + 1].startsWith("--")) val = argv[++i];
    if (val === undefined) val = true;
    else if (/^-?\d+(\.\d+)?$/.test(val)) val = Number(val);
    args[key] = val;
  }
  return args;
}

/* Wirft mit einer verständlichen Meldung, statt dass jede Messung gegen eine
 * Fehlerseite "besteht". */
export async function requireUrl(url) {
  let r;
  try {
    r = await fetch(url, { method: "GET", redirect: "manual" });
  } catch (e) {
    throw new Error(`${url} antwortet nicht (${e.message}). Läuft der Messserver? Für lokale Messungen: python3 scripts/prodserve.py <ordner> 8897`);
  }
  if (r.status >= 400) throw new Error(`${url} liefert HTTP ${r.status}`);
  return r;
}

/* Startet Browser + Kontext + Seite mit einer festen Messkonfiguration.
 *   launch({ mobile: true, cpu: 4, softwareGl: false, headed: false,
 *            width, height, dpr, reducedMotion: false, args: [] })
 * Gibt { browser, context, page, cdp, close } zurück. cdp ist eine CDP-Session
 * auf der Seite (für Tracing, Profiler, weitere Emulation). */
export async function launch(opts = {}) {
  const executablePath = findChrome();
  if (!executablePath) {
    throw new Error(
      "kein Chromium gefunden.\n  Installieren: npx playwright-core install chromium  (oder npx playwright install chromium)\n  oder HP_CHROME auf eine vorhandene Binary zeigen lassen."
    );
  }
  const preset = opts.mobile ? MOBILE : DESKTOP;
  const width = opts.width || preset.width;
  const height = opts.height || preset.height;
  const dpr = opts.dpr || preset.dpr;
  const args = [...(opts.args || [])];
  if (opts.softwareGl) args.push(...SOFTWARE_GL_ARGS);
  const browser = await chromium.launch({ executablePath, headless: !opts.headed, args });
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: dpr,
    isMobile: !!opts.mobile,
    hasTouch: !!opts.mobile,
    reducedMotion: opts.reducedMotion ? "reduce" : "no-preference",
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  if (opts.cpu && opts.cpu > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: Number(opts.cpu) });
  const close = () => browser.close();
  return { browser, context, page, cdp, close, config: { width, height, dpr, mobile: !!opts.mobile, cpu: Number(opts.cpu || 1), softwareGl: !!opts.softwareGl } };
}

/* Kurzbeschreibung eines Elements, für Ausgaben. Läuft IM Browser (als
 * String an page.evaluate übergeben oder in addInitScript eingebettet).
 * Die Zuweisung an window am Ende ist nötig: eine Funktionsdeklaration in
 * einem addInitScript landet NICHT auf window und wäre in einem späteren
 * page.evaluate unsichtbar. */
export const DESCRIBE_ELEMENT_SRC = `
window.describeElement = describeElement;
function describeElement(el) {
  if (!el || !el.tagName) return "(entfernt)";
  let s = el.tagName.toLowerCase();
  if (el.id) s += "#" + el.id;
  if (el.className && typeof el.className === "string") s += "." + el.className.trim().split(/\\s+/).slice(0, 3).join(".");
  for (const a of el.attributes || []) if (a.name.startsWith("data-") && a.value.length < 40) { s += "[" + a.name + (a.value ? '="' + a.value + '"' : "") + "]"; break; }
  const t = (el.currentSrc || el.src || el.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 40);
  return t ? s + ' "' + t + '"' : s;
}`;

export function ms(n) {
  return `${Math.round(n)} ms`;
}

export function kb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function table(rows, headers) {
  const all = headers ? [headers, ...rows] : rows;
  const w = [];
  for (const r of all) r.forEach((c, i) => (w[i] = Math.max(w[i] || 0, String(c).length)));
  const line = (r) => r.map((c, i) => String(c).padEnd(w[i])).join("  ").trimEnd();
  const out = all.map(line);
  if (headers) out.splice(1, 0, w.map((n) => "-".repeat(n)).join("  "));
  return out.join("\n");
}
