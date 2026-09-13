/* What React itself does while a page loads and sits there - per commit, with
 * the reason for it.
 *
 * The live page runs react-dom's production build, where <Profiler> and the
 * per-fiber timers are compiled out. This tool swaps in the profiling build of
 * the SAME version inside the browser it drives (tools/vendor-diag/), wraps the
 * root in <Profiler>, and records every commit together with the state keys
 * that changed on the one class component the export renders. The profiling
 * build keeps its timers, so absolute numbers run slightly high; proportions
 * hold.
 *
 * --scan additionally loads React Scan (render counts, "unnecessary" flags) and
 * saves a screenshot with its outlines. It adds its own main-thread cost, so its
 * run is for counting, not for timing.
 *
 *   node tools/reactprof.mjs [url] [--cpu 4] [--desktop] [--idle 22] [--scan]
 */
import fs from "node:fs";
import path from "node:path";
import { launch } from "./browser.mjs";

const a = process.argv;
const num = (f, d) => (a.indexOf(f) > -1 ? Number(a[a.indexOf(f) + 1]) : d);
const url = a[2] && !a[2].startsWith("--") ? a[2] : "http://127.0.0.1:8897/";
const cpu = num("--cpu", 4);
const idle = num("--idle", 22);
const desktop = a.includes("--desktop");
const scan = a.includes("--scan");
const origin = new URL(url).origin;
const vd = path.join(import.meta.dirname, "vendor-diag");
const profiling = fs.readFileSync(path.join(vd, "react-dom-18.3.1.profiling.min.js"), "utf8");
const scanSrc = scan ? fs.readFileSync(path.join(vd, "react-scan-0.5.7.auto.global.js"), "utf8") : "";

/* Runs before any page script. The UMD build assigns `ReactDOM = {}` first and
 * fills it afterwards, so the wrap sits on the property, not on the object. */
const probe = (withScan) => {
  const D = (window.__prof = { t0: performance.now(), commits: [], profiler: [], scan: {}, sections: null });
  if (!withScan) {
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      supportsFiber: true, isDisabled: false, renderers: new Map(),
      inject(r) { this.renderers.set(1, r); return 1; },
      checkDCE() {}, onCommitFiberUnmount() {}, onPostCommitFiberRoot() {},
      onCommitFiberRoot(id, root) { window.__profCommit && window.__profCommit(root); },
    };
  }
  const findClass = (f) => {
    const stack = [f];
    while (stack.length) {
      const n = stack.pop();
      if (!n) continue;
      if (n.tag === 1 && n.stateNode && n.stateNode.setState) return n;
      if (n.sibling) stack.push(n.sibling);
      if (n.child) stack.push(n.child);
    }
    return null;
  };
  /* Diffing a fiber against its alternate lies when the fiber bailed out (the
   * alternate is two commits old), so triggers are recorded at the source. */
  D.pending = [];
  const note = (who, what) => D.pending.push(who + ": " + what);
  /* The page's `this.setState` is not React's: DCLogic merges its own state and
   * then bumps the host wrapper's `__v`. So the real trigger is recorded here. */
  let logicStore;
  Object.defineProperty(window, "DCLogic", {
    configurable: true,
    get: () => logicStore,
    set(v) {
      logicStore = v;
      const P = v && v.prototype;
      if (!P || !P.setState || P.__profWrapped) return;
      P.__profWrapped = true;
      const ss = P.setState;
      P.setState = function (s, cb) {
        note("page", typeof s === "function" ? "(fn)" : Object.keys(s || {}).join("+"));
        return ss.call(this, s, cb);
      };
    },
  });
  let reactStore;
  Object.defineProperty(window, "React", {
    configurable: true,
    get: () => reactStore,
    set(v) {
      reactStore = v;
      const P = v && v.Component && v.Component.prototype;
      if (!P || P.__profWrapped) return;
      P.__profWrapped = true;
      const ss = P.setState, fu = P.forceUpdate;
      P.setState = function (s, cb) {
        note(this.constructor.name || "?", typeof s === "function" ? "(fn)" : Object.keys(s || {}).join("+"));
        return ss.call(this, s, cb);
      };
      P.forceUpdate = function (cb) { note(this.constructor.name || "?", "forceUpdate"); return fu.call(this, cb); };
    },
  });
  window.__profCommit = (root) => {
    if (D.sections) return;
    const c = findClass(root.current);
    if (!c) return;
    {
      const classes = [];
      const walk = [root.current];
      while (walk.length) {
        const n = walk.pop();
        if (!n) continue;
        if (n.sibling) walk.push(n.sibling);
        if (n.child) walk.push(n.child);
        if (n.tag === 1) classes.push({ class: (n.type && n.type.name) || "?", keys: Object.keys(n.memoizedState || {}).length, "self ms": +(n.selfBaseDuration || 0).toFixed(1), "tree ms": +(n.treeBaseDuration || 0).toFixed(1) });
      }
      D.classes = classes;
      /* Where the mount time went: the heaviest labelled subtrees. */
      const out = [];
      const stack = [c.child];
      while (stack.length) {
        const n = stack.pop();
        if (!n) continue;
        if (n.sibling) stack.push(n.sibling);
        const el = n.tag === 5 && n.stateNode;
        const label = el && el.getAttribute && (el.getAttribute("data-screen-label") || (el.tagName === "SECTION" && (el.id || "section")) || (["HEADER", "FOOTER", "NAV"].includes(el.tagName) && el.tagName.toLowerCase()));
        if (label) out.push({ label, ms: +(n.treeBaseDuration || 0).toFixed(1) });
        else if (n.child) stack.push(n.child);
      }
      D.sections = out.sort((x, y) => y.ms - x.ms).slice(0, 12);
    }
  };
  let store;
  Object.defineProperty(window, "ReactDOM", {
    configurable: true,
    get: () => store,
    set(v) {
      store = v;
      let h;
      Object.defineProperty(v, "hydrateRoot", {
        configurable: true, enumerable: true,
        get: () => h,
        set(fn) {
          h = (container, el, opts) =>
            fn(container, window.React.createElement(window.React.Profiler, {
              id: "root",
              onRender: (id, phase, actual, base, start, commit) =>
                D.profiler.push({ phase, actual: +actual.toFixed(1), base: +base.toFixed(1), at: Math.round(commit - D.t0), why: D.pending.splice(0) }),
            }, el), opts);
        },
      });
    },
  });
};

const { browser, context: ctx0 } = await launch(desktop ? 1350 : 412, desktop ? 900 : 915);
await ctx0.close();
const context = await browser.newContext({
  viewport: { width: desktop ? 1350 : 412, height: desktop ? 900 : 915 },
  deviceScaleFactor: 1, bypassCSP: true,
});
await context.route("**/*", (route) => {
  const u = route.request().url();
  if (!u.startsWith(origin) && !u.startsWith("data:") && !u.startsWith("blob:")) return route.abort();
  if (u.includes("/vendor/react-dom-18.3.1.production.min.js"))
    return route.fulfill({ status: 200, contentType: "application/javascript", body: profiling });
  return route.continue();
});
await context.addInitScript(`(${probe.toString()})(${scan});`);
if (scan) {
  await context.addInitScript(scanSrc);
  await context.addInitScript(`window.reactScan && window.reactScan({
    dangerouslyForceRunInProduction: true, showToolbar: true, log: false,
    onRender: (fiber, renders) => { const S = window.__prof.scan; for (const r of renders) {
      const k = r.componentName || "?"; const e = S[k] || (S[k] = { renders: 0, unnecessary: 0 });
      e.renders += r.count || 1; if (r.unnecessary) e.unnecessary++; } } });`);
}

const page = await context.newPage();
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(e.message));
const cdp = await context.newCDPSession(page);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpu });
await page.goto(url, { waitUntil: "load" });
await page.waitForTimeout(idle * 1000);
const idleEnd = await page.evaluate(() => Math.round(performance.now() - window.__prof.t0));
const H = await page.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y <= H; y += 400) {
  await page.evaluate((v) => scrollTo(0, v), y);
  await page.waitForTimeout(120);
}
await page.evaluate(() => scrollTo(0, 0));
await page.waitForTimeout(2000);
if (scan) await page.screenshot({ path: path.join(import.meta.dirname, "..", "_reactscan.png") });
const D = await page.evaluate(() => window.__prof);
await browser.close();

const mount = D.profiler.find((p) => p.phase === "mount");
console.log(`\n${url}  ${desktop ? "desktop" : "mobile 412"}  cpu ${cpu}x  idle ${idle}s then scroll ${H}px\n`);
console.log(`hydration (Profiler mount): ${mount ? mount.actual + " ms at " + mount.at + " ms" : "not seen"}`);
const upd = D.profiler.filter((p) => p.phase !== "mount");
const sum = (xs) => xs.reduce((s, x) => s + x, 0);
console.log(`re-renders of the whole root: ${upd.length}, ${sum(upd.map((p) => p.actual)).toFixed(0)} ms total, max ${Math.max(0, ...upd.map((p) => p.actual))} ms`);
console.log(`  while idle (0-${idleEnd} ms): ${upd.filter((p) => p.at <= idleEnd).length}   while scrolling: ${upd.filter((p) => p.at > idleEnd).length}`);

const byKey = {};
for (const c of upd) {
  const k = c.why.length ? [...new Set(c.why)].join(" | ") : "(no recorded setState)";
  const e = byKey[k] || (byKey[k] = { n: 0, ms: 0, max: 0, first: c.at });
  e.n++; e.ms += c.actual; e.max = Math.max(e.max, c.actual);
}
console.log("\nwhat triggered them (setState/forceUpdate recorded before each commit):");
console.table(Object.fromEntries(Object.entries(byKey).sort((x, y) => y[1].ms - x[1].ms)
  .map(([k, v]) => [k, { commits: v.n, "total ms": +v.ms.toFixed(0), "max ms": v.max, "first at": v.first }])));
if (D.classes) { console.log("class components at mount:"); console.table(D.classes); }
if (D.sections) { console.log("mount cost by labelled subtree (treeBaseDuration):"); console.table(D.sections); }
if (scan) { console.log("React Scan:"); console.table(D.scan); console.log("screenshot: _reactscan.png"); }
if (errors.length) console.log(`console errors (${errors.length}):`, errors.slice(0, 5));
