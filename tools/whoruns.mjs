/* What runs while the page is supposed to be asleep?
 * Profiles only the LATE window - after load, after every intro has finished -
 * so whatever shows up here is by definition work the page does forever.
 *   node whoruns.mjs <url> [--cpu N] [--from s] [--for s]
 */
import { launch } from "./browser.mjs";

const a = process.argv;
const url = a[2] || "https://mccain-digital.vercel.app/";
const num = (f, d) => (a.indexOf(f) > -1 ? Number(a[a.indexOf(f) + 1]) : d);
const cpu = num("--cpu", 4), from = num("--from", 8), dur = num("--for", 18);

const { browser, context } = await launch(1350, 940);
const tab = await context.newPage();
const cdp = await context.newCDPSession(tab);
if (cpu > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpu });
await tab.goto(url, { waitUntil: "load", timeout: 60000 });
await tab.waitForTimeout(from * 1000);

await cdp.send("Profiler.enable");
await cdp.send("Profiler.setSamplingInterval", { interval: 200 });
await cdp.send("Profiler.start");
await tab.waitForTimeout(dur * 1000);
const { profile } = await cdp.send("Profiler.stop");
await browser.close();

const byId = new Map(profile.nodes.map((n) => [n.id, n]));
const self = new Map();
for (const id of profile.samples || []) {
  const n = byId.get(id); if (!n) continue;
  const f = n.callFrame;
  const key = (f.functionName || "(anonymous)") + "  " +
    (f.url || "").replace(/^https?:\/\/[^/]+/, "") + (f.lineNumber >= 0 ? ":" + (f.lineNumber + 1) : "");
  self.set(key, (self.get(key) || 0) + 1);
}
const total = (profile.samples || []).length;
const wall = (profile.endTime - profile.startTime) / 1000;
const msPer = wall / (total || 1);

console.log("\n  " + url + "   CPU x" + cpu + ",  Fenster " + from + "-" + (from + dur) + " s");
console.log("  " + Math.round(wall) + " ms beobachtet, " + total + " Proben\n");
const rows = [...self.entries()].sort((x, y) => y[1] - x[1]);
let busy = 0;
for (const [k, c] of rows) if (!/^\(idle\)|^\(program\)/.test(k)) busy += c;
console.log("  Hauptthread beschaeftigt: " + Math.round(busy * msPer) + " ms von " + Math.round(wall) +
  " ms  = " + (100 * busy / (total || 1)).toFixed(1) + " %\n");
console.log("  " + "Eigenzeit".padStart(9) + "   " + "Anteil".padStart(6) + "   Funktion");
for (const [k, c] of rows.slice(0, 24)) {
  console.log("  " + (Math.round(c * msPer) + " ms").padStart(9) + "   " +
    ((100 * c / (total || 1)).toFixed(1) + "%").padStart(6) + "   " + k);
}
