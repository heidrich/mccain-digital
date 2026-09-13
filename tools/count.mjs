/* How often does the layout actually get re-read, and who asks for it? */
import { launch } from "./browser.mjs";

const a = process.argv;
const url = a[2] || "http://127.0.0.1:8897/";
const num = (f, d) => (a.indexOf(f) > -1 ? Number(a[a.indexOf(f) + 1]) : d);
const cpu = num("--cpu", 4), secs = num("--for", 25);

const INIT = `
window.__c = { ro: 0, rect: 0, roAt: [], rectAt: [] };
const RO = window.ResizeObserver;
if (RO) window.ResizeObserver = class extends RO {
  constructor(cb) { super((...x) => { window.__c.ro++; if (window.__c.roAt.length < 400) window.__c.roAt.push(Math.round(performance.now())); return cb(...x); }); }
};
const g = Element.prototype.getBoundingClientRect;
Element.prototype.getBoundingClientRect = function () {
  window.__c.rect++;
  const t = Math.round(performance.now() / 1000);
  window.__c.rectAt[t] = (window.__c.rectAt[t] || 0) + 1;
  return g.call(this);
};
`;

const { browser, context } = await launch(1350, 940);
await context.addInitScript(INIT);
const tab = await context.newPage();
if (cpu > 1) { const cdp = await context.newCDPSession(tab); await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpu }); }
await tab.goto(url, { waitUntil: "load", timeout: 60000 });
await tab.waitForTimeout(secs * 1000);
const c = await tab.evaluate(() => window.__c);
await browser.close();

console.log("\n  " + url + "   CPU x" + cpu + ",  " + secs + " s nach load");
console.log("  ResizeObserver-Rueckrufe   " + c.ro);
console.log("  getBoundingClientRect      " + c.rect.toLocaleString("de-DE"));
console.log("\n  rects pro Sekunde (Sekunde: Anzahl)");
let line = "   ";
c.rectAt.forEach((n, s) => { if (n) line += " " + s + ":" + n; });
console.log(line);
if (c.roAt.length) console.log("\n  RO-Rueckrufe bei ms: " + c.roAt.slice(0, 40).join(", ") + (c.roAt.length > 40 ? " ..." : ""));
