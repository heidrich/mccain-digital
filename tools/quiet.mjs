/* Does the main thread ever go quiet?
 *
 * Lighthouse's TBT is the blocking time between FCP and TTI, and TTI is the
 * first instant after which the main thread stays free of long tasks for five
 * seconds. A page whose animation loop never stops never reaches that instant:
 * TTI slides to the end of the trace and every long task of the whole session
 * lands in TBT. That is how a page painting in 0,8 s reports a 13 s TBT.
 *
 *   node quiet.mjs <url> [seconds] [--cpu N]
 */
import { launch } from "./browser.mjs";

const url = process.argv[2] || "https://mccain-digital.vercel.app/";
const secs = Number(process.argv[3] || 25);
const ci = process.argv.indexOf("--cpu");
const cpu = ci > -1 ? Number(process.argv[ci + 1]) : 1;

const INIT = `
window.__lt = []; window.__fcp = null;
try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lt.push([e.startTime, e.duration]); })
  .observe({ type: "longtask", buffered: true }); } catch (e) { window.__ltErr = String(e); }
try { new PerformanceObserver((l) => { for (const e of l.getEntries())
  if (e.name === "first-contentful-paint") window.__fcp = e.startTime; })
  .observe({ type: "paint", buffered: true }); } catch (e) {}
`;

const { browser, context } = await launch(1350, 940);
await context.addInitScript(INIT);
const tab = await context.newPage();
if (cpu > 1) {
  const cdp = await context.newCDPSession(tab);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpu });
}
await tab.goto(url, { waitUntil: "load", timeout: 60000 });
await tab.waitForTimeout(secs * 1000);
const r = await tab.evaluate(() => ({ lt: window.__lt, fcp: window.__fcp, err: window.__ltErr, now: performance.now() }));
await browser.close();

const { lt, now } = r;
const fcp = r.fcp || 0;
if (r.err) console.log("longtask observer:", r.err);

const QUIET = 5000;
let cursor = fcp;
for (const [s, d] of lt) { if (s + d <= cursor) continue; if (s - cursor >= QUIET) break; cursor = s + d; }
const tti = now - cursor >= QUIET ? cursor : null;
const end = tti == null ? now : tti;

let tbt = 0;
for (const [s, d] of lt) if (s + d > fcp && s < end && d > 50) tbt += d - 50;

let gapBest = 0, gapAt = 0, prev = fcp;
for (const [s, d] of lt) { if (s - prev > gapBest) { gapBest = s - prev; gapAt = prev; } prev = Math.max(prev, s + d); }
if (now - prev > gapBest) { gapBest = now - prev; gapAt = prev; }

const ms = (v) => (v == null ? "-" : Math.round(v) + " ms");
console.log("\n  " + url + (cpu > 1 ? "   (CPU x" + cpu + ")" : ""));
console.log("  observed          " + ms(now));
console.log("  FCP               " + ms(fcp));
console.log("  long tasks        " + lt.length + "   total " + ms(lt.reduce((a, [, d]) => a + d, 0)));
console.log("  longest task      " + ms(lt.reduce((a, [, d]) => Math.max(a, d), 0)));
console.log("  longest quiet gap " + ms(gapBest) + "   from " + ms(gapAt));
console.log("  TTI (5 s quiet)   " + (tti == null ? "NIE ERREICHT in " + Math.round(now / 1000) + " s" : ms(tti)));
console.log("  TBT (FCP..TTI)    " + ms(tbt) + (tti == null ? "   <- und waechst weiter" : ""));

const late = lt.filter(([s]) => s > 5000);
if (late.length) {
  console.log("\n  lange Aufgaben NACH der 5-s-Marke - die halten die Seite wach:");
  for (const [s, d] of late.slice(0, 16)) console.log("    bei " + ms(s) + "   " + ms(d));
  if (late.length > 16) console.log("    ... " + (late.length - 16) + " weitere");
}
