/* The numbers of this visit, from this browser.
 *
 * PerformanceObserver with buffered:true hands over what the browser recorded
 * since navigation - LCP, layout shifts, long tasks - even when asked for a
 * minute later (measured 16.9.2026). Live values (frame rate, animations,
 * skipped blocks) are sampled only while this tab is visible, one timer, and
 * stopped when it is not. */
import { T } from "./texte.js";
import { h, clear, card, kv, pill, btn, mono, note, fmtBytes, fmtMs, fmtNum, shortLabel, revealOnPage, isOwn } from "./ui.js";

const TYPES = { navigation: "html", script: "script", link: "css", css: "css", img: "img", font: "font", fetch: "fetch", xmlhttprequest: "fetch", other: "other" };
function typeOf(r) {
  if (r.initiatorType === "link" && /\.woff2?($|\?)/.test(r.name)) return "font";
  if (/\.(woff2?|ttf|otf)($|\?)/.test(r.name)) return "font";
  if (/\.(svg|png|jpe?g|webp|avif|gif)($|\?)/.test(r.name)) return "img";
  if (/\.css($|\?)/.test(r.name)) return "css";
  if (/\.m?js($|\?)/.test(r.name)) return "script";
  return TYPES[r.initiatorType] || "other";
}
function shortName(url) {
  try { const u = new URL(url); return (u.pathname.replace(/\/$/, "") || "/").split("/").pop() || u.pathname; } catch (e) { return url; }
}
function tone(v, good, bad) { return v <= good ? "good" : v <= bad ? "warn" : "bad"; }

export function mountPerf(W) {
  const el = h("div.wk-cols");
  const observers = [];
  let lcp = null, shifts = [], longTasks = [];
  let timer = 0, raf = 0, frames = 0, lastTick = 0, fpsHist = [];
  let visible = false;

  function observe(type, fn) {
    try {
      const po = new PerformanceObserver((list) => fn(list.getEntries()));
      po.observe({ type, buffered: true });
      observers.push(po);
    } catch (e) { /* type not supported here */ }
  }
  observe("largest-contentful-paint", (es) => { lcp = es[es.length - 1] || lcp; schedule(renderTimeline); });
  /* Shifts the workshop itself causes (its own nodes as the only sources) are not the page's. */
  const ownShift = (s) => s.sources && s.sources.length && s.sources.every((x) => x.node && isOwn(x.node));
  observe("layout-shift", (es) => { for (const s of es) if (!s.hadRecentInput && !ownShift(s)) shifts.push(s); schedule(renderShifts); });
  observe("longtask", (es) => { longTasks.push(...es); schedule(renderLongTasks); });

  const pendingRenders = new Set();
  let renderRaf = 0;
  function schedule(fn) { pendingRenders.add(fn); if (!renderRaf) renderRaf = requestAnimationFrame(() => { renderRaf = 0; for (const f of pendingRenders) f(); pendingRenders.clear(); }); }

  const nav = performance.getEntriesByType("navigation")[0];
  const paint = Object.fromEntries(performance.getEntriesByType("paint").map((p) => [p.name, p.startTime]));

  /* ---- timeline */
  const timelineBody = h("div");
  el.appendChild(card({ eyebrow: T.perf.title, title: T.perf.timeline, body: timelineBody, why: T.perf.timelineWhy }));
  function renderTimeline() {
    clear(timelineBody);
    const marks = [
      { key: "ttfb", label: T.perf.ttfb, t: nav ? nav.responseStart : null },
      { key: "fcp", label: T.perf.fcp, t: paint["first-contentful-paint"] },
      { key: "lcp", label: T.perf.lcp, t: lcp ? lcp.startTime : null },
      { key: "dcl", label: T.perf.dcl, t: nav ? nav.domContentLoadedEventEnd : null },
      { key: "load", label: T.perf.load, t: nav ? nav.loadEventEnd : null },
    ].filter((m) => m.t);
    const max = Math.max(100, ...marks.map((m) => m.t)) * 1.04;
    const tl = h("div.wk-timeline");
    for (const m of marks.sort((a, b) => a.t - b.t)) {
      const row = h("div", { "data-key": m.key, style: { display: "contents" } });
      const bar = h("div.bar");
      bar.style.width = `${(m.t / max) * 100}%`;
      row.append(h("div.n", m.label), h("div.track", bar), h("div.s", fmtMs(m.t)));
      tl.appendChild(row);
    }
    const stat = h("div.wk-stat");
    const fcp = paint["first-contentful-paint"];
    if (fcp) stat.appendChild(h("div", { "data-tone": tone(fcp, 1800, 3000) }, h("b", fmtMs(fcp)), h("small", "FCP")));
    if (lcp) stat.appendChild(h("div", { "data-tone": tone(lcp.startTime, 2500, 4000) }, h("b", fmtMs(lcp.startTime)), h("small", "LCP")));
    if (nav) stat.appendChild(h("div", { "data-tone": tone(nav.responseStart, 800, 1800) }, h("b", fmtMs(nav.responseStart)), h("small", "TTFB")));
    timelineBody.append(tl, stat);
    if (lcp) {
      const target = lcp.element && lcp.element.isConnected && !isOwn(lcp.element) ? lcp.element : null;
      timelineBody.appendChild(card({ eyebrow: T.perf.lcpEl, body: [
        kv([["Element", target ? mono(shortLabel(target, 2)) : mono("nicht mehr im Dokument")], ["Fläche", mono(`${fmtNum(lcp.size)} px²`)], ["Zeit", mono(fmtMs(lcp.startTime))], lcp.url ? ["Bild", mono(shortName(lcp.url))] : ["Art", "Text, kein Bild"]]),
        target ? h("div.wk-toolbar", { style: { margin: "8px 0 0" } }, btn(T.element.reveal, () => { revealOnPage(target); W.layer.flash(target); }, { "data-tone": "small", hint: T.hints.reveal }), btn("Als Element öffnen", () => W.select(target), { "data-tone": "small", hint: T.hints.lcpOpen })) : null,
      ], why: T.perf.lcpWhy, attrs: { style: { margin: "8px 0 0", boxShadow: "inset 0 0 0 1px var(--wk-line)" } } }));
    }
  }

  /* ---- layout shifts (CLS after the session-window rule Lighthouse uses) */
  const shiftBody = h("div");
  el.appendChild(card({ eyebrow: T.perf.cls, body: shiftBody, why: T.perf.clsWhy }));
  function cls() {
    let best = 0, cur = 0, first = 0, prev = 0;
    for (const s of shifts) {
      if (cur && (s.startTime - prev > 1000 || s.startTime - first > 5000)) cur = 0;
      if (!cur) first = s.startTime;
      cur += s.value; prev = s.startTime;
      if (cur > best) best = cur;
    }
    return best;
  }
  function renderShifts() {
    clear(shiftBody);
    const v = cls();
    shiftBody.appendChild(h("div.wk-stat", h("div", { "data-tone": tone(v, 0.1, 0.25) }, h("b", v.toFixed(3).replace(".", ",")), h("small", "CLS")), h("div", h("b", String(shifts.length)), h("small", "Verschiebungen"))));
    if (!shifts.length) { shiftBody.appendChild(note(T.perf.clsNone)); return; }
    const ul = h("ul.wk-list");
    for (const s of shifts.slice(-12).reverse()) {
      const nodes = (s.sources || []).map((x) => x.node).filter((n) => n && n.nodeType === 1 && n.isConnected && !isOwn(n));
      const li = h("li", { "data-hover": nodes.length ? "" : null }, h("span.wk-num", fmtMs(s.startTime)), h("span.wk-grow", nodes.length ? nodes.slice(0, 3).map((n) => shortLabel(n, 1)).join(", ") : "Quelle unbekannt"), h("span.wk-num", s.value.toFixed(4)));
      if (nodes.length) { li.addEventListener("mouseenter", () => W.hover(nodes[0])); li.addEventListener("mouseleave", () => W.hover(null)); li.addEventListener("click", () => W.select(nodes[0])); }
      ul.appendChild(li);
    }
    shiftBody.appendChild(ul);
  }

  /* ---- long tasks */
  const ltBody = h("div");
  el.appendChild(card({ eyebrow: T.perf.longtasks, body: ltBody, why: T.perf.longtasksWhy }));
  function renderLongTasks() {
    clear(ltBody);
    const fcp = paint["first-contentful-paint"] || 0;
    const tbt = longTasks.filter((t) => t.startTime + t.duration > fcp).reduce((a, t) => a + Math.max(0, t.duration - 50), 0);
    const total = longTasks.reduce((a, t) => a + t.duration, 0);
    ltBody.appendChild(h("div.wk-stat",
      h("div", h("b", String(longTasks.length)), h("small", "über 50 ms")),
      h("div", { "data-tone": tone(tbt, 200, 600) }, h("b", fmtMs(tbt)), h("small", "blockiert (TBT)")),
      h("div", h("b", fmtMs(total)), h("small", "gesamt"))));
    if (!longTasks.length) { ltBody.appendChild(note(T.perf.longtasksNone)); return; }
    const ul = h("ul.wk-list");
    for (const t of longTasks.slice(-10).reverse()) {
      const who = (t.attribution || []).map((a) => a.name && a.name !== "unknown" ? a.name : a.containerType).filter(Boolean).join(", ");
      ul.appendChild(h("li", h("span.wk-num", fmtMs(t.startTime)), h("span.wk-grow", who || "Hauptthread"), h("span.wk-num", fmtMs(t.duration))));
    }
    ltBody.appendChild(ul);
  }

  /* ---- transfer + resources */
  const resBody = h("div");
  el.appendChild(card({ eyebrow: T.perf.transfer, body: resBody, why: T.perf.transferWhy }));
  function renderResources() {
    clear(resBody);
    const res = performance.getEntriesByType("resource").filter((r) => !/\/v5\/dev\//.test(r.name));
    if (nav) {
      const ratio = nav.decodedBodySize && nav.encodedBodySize ? nav.decodedBodySize / nav.encodedBodySize : null;
      resBody.appendChild(h("div.wk-stat",
        h("div", h("b", fmtBytes(nav.transferSize)), h("small", "HTML übertragen")),
        h("div", h("b", fmtBytes(nav.decodedBodySize)), h("small", "HTML entpackt")),
        ratio ? h("div", { "data-tone": "good" }, h("b", `${ratio.toFixed(1).replace(".", ",")}×`), h("small", "Kompression")) : null,
        h("div", h("b", nav.nextHopProtocol || "–"), h("small", "Protokoll"))));
    }
    const byType = {};
    for (const r of res) { const t = typeOf(r); byType[t] = byType[t] || { n: 0, bytes: 0, cached: 0 }; byType[t].n++; byType[t].bytes += r.transferSize || 0; if (!r.transferSize && r.decodedBodySize) byType[t].cached++; }
    const rows = Object.keys(byType).map((t) => [t, h("span", `${byType[t].n} Datei${byType[t].n === 1 ? "" : "en"} · ${fmtBytes(byType[t].bytes)}`, byType[t].cached ? " " : "", byType[t].cached ? pill(`${byType[t].cached} ${T.perf.fromCache}`, "info") : null)]);
    resBody.appendChild(h("div", { style: { marginTop: "10px" } }, h("div.wk-eyebrow", T.perf.resources), kv(rows)));
    const all = (nav ? [nav] : []).concat(res).sort((a, b) => a.startTime - b.startTime);
    const end = Math.max(...all.map((r) => r.responseEnd || r.startTime)) * 1.02 || 1;
    const fall = h("div.wk-fall");
    for (const r of all.slice(0, 40)) {
      const t = r === nav ? "html" : typeOf(r);
      const row = h("div", { "data-type": t, style: { display: "contents" } });
      const track = h("div.track");
      const bar = h("div.bar");
      bar.style.left = `${(r.startTime / end) * 100}%`;
      bar.style.width = `${Math.max(0.5, ((r.responseEnd - r.startTime) / end) * 100)}%`;
      track.appendChild(bar);
      const name = h("div.n", { title: r.name }, r === nav ? "index.html" : shortName(r.name));
      row.append(name, track, h("div.s", `${fmtMs(r.responseEnd)} · ${r.transferSize ? fmtBytes(r.transferSize) : T.perf.fromCache}`));
      fall.appendChild(row);
    }
    resBody.appendChild(h("div", { style: { marginTop: "10px" } }, fall, h("div.wk-legend", ...["html", "script", "css", "font", "img", "fetch", "other"].filter((t) => t === "html" || byType[t]).map((t) => h("span", h("i", { "data-type": t }), t)))));
    resBody.appendChild(whyLine(T.perf.resourcesWhy));
  }
  function whyLine(text) { return h("p.wk-hint", { style: { marginTop: "8px" } }, text); }

  /* ---- frame rate + stream */
  const fpsBody = h("div");
  el.appendChild(card({ eyebrow: T.perf.fps, body: fpsBody, why: T.perf.fpsWhy }));
  const spark = h("canvas.wk-spark", { width: "400", height: "44", aria: { hidden: "true" } });
  const fpsStat = h("div.wk-stat");
  const streamKv = h("div");
  fpsBody.append(h("div.wk-live", "live"), fpsStat, spark, streamKv);
  function tickFps(now) {
    frames++;
    if (now - lastTick >= 1000) {
      const fps = Math.round((frames * 1000) / (now - lastTick));
      fpsHist.push(fps); if (fpsHist.length > 40) fpsHist.shift();
      frames = 0; lastTick = now;
      renderFps();
    }
    raf = requestAnimationFrame(tickFps);
  }
  function renderFps() {
    clear(fpsStat);
    const cur = fpsHist[fpsHist.length - 1] || 0;
    const min = fpsHist.length ? Math.min(...fpsHist) : 0;
    fpsStat.append(h("div", { "data-tone": cur >= 55 ? "good" : cur >= 28 ? "warn" : "bad" }, h("b", String(cur)), h("small", "Bilder/s jetzt")), h("div", h("b", String(min)), h("small", "Minimum")));
    const ctx = spark.getContext("2d");
    ctx.clearRect(0, 0, spark.width, spark.height);
    ctx.strokeStyle = "#635BFF"; ctx.lineWidth = 2; ctx.beginPath();
    fpsHist.forEach((v, i) => { const x = (i / 39) * spark.width, y = spark.height - 4 - (Math.min(v, 120) / 120) * (spark.height - 8); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
    ctx.stroke();
    const canvas = document.querySelector("canvas[data-global]");
    clear(streamKv);
    if (canvas) {
      const mode = canvas.getAttribute("data-v5-fps");
      streamKv.appendChild(kv([[T.perf.fpsStream, h("span", pill(T.perf.fpsMode(mode), mode === "30" ? "warn" : "good"))], ["Auflösung", mono(`${canvas.width} × ${canvas.height} px für ${canvas.clientWidth} × ${canvas.clientHeight} px`)]]));
    }
  }

  /* ---- skipped blocks */
  const cvBody = h("div");
  el.appendChild(card({ eyebrow: T.perf.cv, body: cvBody, why: T.perf.cvWhy }));
  function renderCv() {
    clear(cvBody);
    const blocks = Array.from(document.querySelectorAll("[data-cv]"));
    let skipped = 0;
    const ul = h("ul.wk-list");
    for (const b of blocks) {
      let sk = false;
      try { sk = !Array.prototype.some.call(b.children, (c) => c.checkVisibility({ contentVisibilityAuto: true })); } catch (e) { sk = false; }
      if (sk) skipped++;
      const cis = (getComputedStyle(b).containIntrinsicSize || "").replace("auto ", "");
      const li = h("li", { "data-hover": "" }, h("span.wk-grow", mono(b.dataset.cv), " ", b.getAttribute("data-screen-label") || ""), h("span.wk-num", `${T.perf.cvPlaceholder} ${cis}`), pill(sk ? T.perf.cvSkipped : T.perf.cvRendered, sk ? "warn" : "good"));
      li.addEventListener("mouseenter", () => W.hover(b)); li.addEventListener("mouseleave", () => W.hover(null)); li.addEventListener("click", () => W.select(b));
      ul.appendChild(li);
    }
    cvBody.append(h("div.wk-stat", h("div", h("b", String(skipped)), h("small", `von ${blocks.length} übersprungen`))), ul);
  }
  const onCv = () => { if (visible) schedule(renderCv); };
  document.addEventListener("contentvisibilityautostatechange", onCv, true);

  /* ---- animations + dom + device (sampled each second while visible) */
  const animBody = h("div");
  el.appendChild(card({ eyebrow: T.perf.animations, body: animBody, why: T.perf.animationsWhy }));
  function renderAnim() {
    clear(animBody);
    const all = document.getAnimations().filter((a) => !(a.effect && a.effect.target && isOwn(a.effect.target)));
    const running = all.filter((a) => a.playState === "running").length;
    const mb = window.__motionBudget;
    animBody.appendChild(h("div.wk-stat",
      h("div", h("b", String(all.length)), h("small", "Animationen")),
      h("div", { "data-tone": running > 40 ? "warn" : "good" }, h("b", String(running)), h("small", T.perf.running)),
      h("div", h("b", String(all.length - running)), h("small", T.perf.paused)),
      mb && typeof mb.held === "function" ? h("div", h("b", mb.held() ? T.perf.yes : T.perf.no), h("small", T.perf.held)) : null));
  }

  const domBody = h("div");
  el.appendChild(card({ eyebrow: T.perf.dom, body: domBody, why: T.perf.domWhy }));
  function renderDom() {
    clear(domBody);
    const all = document.body.getElementsByTagName("*").length;
    const own = document.querySelectorAll("#v5-dev *, #v5-dev-layer *").length;
    const tpl = Array.from(document.querySelectorAll("template")).reduce((a, t) => a + t.content.querySelectorAll("*").length, 0);
    let depth = 0; (function walk(n, d) { if (d > depth) depth = d; for (const c of n.children) if (!isOwn(c)) walk(c, d + 1); })(document.body, 0);
    domBody.appendChild(h("div.wk-stat",
      h("div", { "data-tone": all - own > 1500 ? "warn" : "good" }, h("b", fmtNum(all - own)), h("small", "Elemente der Seite")),
      h("div", h("b", String(depth)), h("small", "Ebenen tief")),
      h("div", h("b", fmtNum(tpl)), h("small", "in Vorlagen (inert)")),
      h("div", h("b", fmtNum(own)), h("small", "Tools"))));
  }

  const devBody = h("div");
  el.appendChild(card({ eyebrow: T.perf.device, body: devBody, why: T.perf.deviceWhy }));
  function gpuName() {
    try {
      const c = document.createElement("canvas");
      const gl = c.getContext("webgl");
      if (!gl) return T.perf.unknown;
      const dbg = gl.getExtension("WEBGL_debug_renderer_info");
      const name = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
      const lose = gl.getExtension("WEBGL_lose_context"); if (lose) lose.loseContext();
      return String(name).replace(/^ANGLE \((.*)\)$/, "$1");
    } catch (e) { return T.perf.unknown; }
  }
  const gpu = gpuName();
  function renderDevice() {
    clear(devBody);
    const c = navigator.connection;
    const mem = performance.memory;
    devBody.appendChild(kv([
      [T.perf.cores, mono(navigator.hardwareConcurrency ? String(navigator.hardwareConcurrency) : T.perf.unknown)],
      [T.perf.memory, mono(navigator.deviceMemory ? `≥ ${navigator.deviceMemory} GB` : T.perf.unknown)],
      [T.perf.connection, mono(c ? `${c.effectiveType || "?"} · RTT ${c.rtt} ms · ${c.downlink} Mbit/s${c.saveData ? " · Datensparmodus" : ""}` : T.perf.unknown)],
      [T.perf.viewport, mono(`${innerWidth} × ${innerHeight} px`)],
      [T.perf.dpr, mono(`${devicePixelRatio}×`)],
      [T.perf.gpu, mono(gpu)],
      [T.perf.pointer, mono(matchMedia("(pointer: coarse)").matches ? T.perf.coarse : T.perf.fine)],
      [T.perf.reduced, mono(matchMedia("(prefers-reduced-motion: reduce)").matches ? T.perf.yes : T.perf.no)],
      mem ? [T.perf.heap, mono(`${fmtBytes(mem.usedJSHeapSize)} von ${fmtBytes(mem.jsHeapSizeLimit)}`)] : null,
    ].filter(Boolean)));
  }

  function renderAll() { renderTimeline(); renderShifts(); renderLongTasks(); renderResources(); renderFps(); renderCv(); renderAnim(); renderDom(); renderDevice(); }

  /* rAF pauses in a background tab while the clock runs on; the first second back would read as a stall. */
  const onVisibility = () => { if (!document.hidden) { lastTick = performance.now(); frames = 0; } };
  function show() {
    visible = true;
    renderAll();
    lastTick = performance.now(); frames = 0;
    if (!raf) raf = requestAnimationFrame(tickFps);
    if (!timer) timer = setInterval(() => { if (document.hidden) return; renderAnim(); renderDom(); renderDevice(); }, 1000);
    document.addEventListener("visibilitychange", onVisibility);
  }
  function hide() {
    visible = false;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    if (timer) { clearInterval(timer); timer = 0; }
    document.removeEventListener("visibilitychange", onVisibility);
  }

  return {
    el,
    show,
    hide,
    dispose() {
      hide();
      for (const po of observers) po.disconnect();
      document.removeEventListener("contentvisibilityautostatechange", onCv, true);
    },
  };
}
