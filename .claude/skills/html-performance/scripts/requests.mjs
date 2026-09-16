#!/usr/bin/env node
/* requests.mjs - Was lädt die Seite wann, wie groß, doppelt, und sieht man es
 * überhaupt?
 *
 *   node requests.mjs <url> [--for 12] [--mobile] [--cpu 1]
 *                      [--width W --height H] [--interact 8] [--json]
 *
 * Regeln, die hier eingebaut sind:
 *  - Nur mit produktionsnahen Cache-Headern messen. Ein Dev-Server mit
 *    "Cache-Control: no-store" (oder ganz ohne Cache-Header) lässt eine
 *    zweite Anfrage wie ein "Duplikat" aussehen, das in Produktion (ETag/
 *    max-age) nie passieren würde. Duplikate aus dieser Messung sind ein
 *    Hinweis, kein Urteil - gegen einen produktionsnahen Server erneut prüfen.
 *  - Größe kommt aus request.sizes() (responseBodySize/-HeadersSize), nicht
 *    aus dem content-length-Header: der fehlt bei chunked/komprimierten oder
 *    opaken Antworten regelmäßig. content-length ist nur der Notnagel.
 *  - Sichtbar ≠ im Viewport. Ein Element kann im sichtbaren Bereich liegen
 *    und trotzdem unsichtbar sein (opacity:0, visibility:hidden, display:none
 *    an einem Vorfahren, oder eine übersprungene content-visibility:auto-
 *    Subtree). Umgekehrt ist "geladen, aber unterhalb des Viewports" harmlos,
 *    wenn es loading="lazy" trägt - aber Verschwendung, wenn es eager (ohne
 *    lazy, ggf. mit fetchpriority=high) geladen wurde.
 *  - loading=lazy verzögert den Request bis kurz vor dem Sichtbarwerden;
 *    fetchpriority ist nur ein Hinweis an den Scheduler, keine Garantie -
 *    beides sagt nichts darüber aus, ob das Ergebnis am Ende zu sehen ist.
 */
import { launch, parseArgs, requireUrl, DESCRIBE_ELEMENT_SRC, ms, kb, table } from "./lib/browser.mjs";

const HELP = `Nutzung: node requests.mjs <url> [Optionen]
Was lädt die Seite wann, wie groß, doppelt, und sieht man es überhaupt?

Optionen:
  --for <s>             Messfenster in Sekunden ab Navigationsstart (Default 12)
  --mobile              Moto-G-Power-Preset (412x915, DPR 1.75, Touch)
  --cpu <n>             CPU-Drosselung wie DevTools, 1 = aus (Default 1)
  --width/--height <n>  Viewport überschreiben
  --interact <s>        bei Sekunde s echte Mausbewegung + Tab auslösen (zeigt,
                         was erst bei Interaktion nachlädt); Zeitleiste markiert es
  --json                Rohdaten statt Tabellen
  --help                diese Hilfe

Beispiel:
  node requests.mjs http://localhost:8897/ --for 12 --mobile`;

const argv = process.argv.slice(2);
const args = parseArgs(argv);
if (args.help || argv.includes("-h")) { console.log(HELP); process.exit(0); }
const url = args._[0];
if (!url) { console.error(`Fehler: URL fehlt.\n\n${HELP}`); process.exit(1); }
await requireUrl(url);

const forMs = Number(args.for ?? 12) * 1000;
const interactMs = args.interact != null ? Number(args.interact) * 1000 : null;
const origin = new URL(url).origin;
const short = (u) => (u.startsWith(origin) ? u.slice(origin.length) || "/" : u);

const { page, close, config } = await launch({ mobile: !!args.mobile, cpu: args.cpu, width: args.width, height: args.height });

const t0 = Date.now(), t0m = performance.now();
// timing().startTime ist Unix-ms, requestStart relativ dazu (-1 wenn unbekannt).
// Ohne brauchbare Werte (z. B. bei manchen fehlgeschlagenen Requests) bleibt nur
// der monotone Node-Zeitpunkt des Events als Näherung.
const relTime = (t) => (t && Number.isFinite(t.startTime) && t.startTime > 0 ? t.startTime - t0 + (t.requestStart > 0 ? t.requestStart : 0) : performance.now() - t0m);

const reqs = [], pending = [];
let dclAt = null, loadAt = null, interactAt = null;

async function onFinished(r) {
  const t = Math.round(relTime(r.timing()));
  const resp = await r.response().catch(() => null);
  let bodySize = 0, headersSize = 0;
  try { ({ responseBodySize: bodySize, responseHeadersSize: headersSize } = await r.sizes()); } catch {}
  if (!bodySize && !headersSize && resp) {
    // Notnagel, z. B. bei Cache-Revalidierung ohne Body: content-length kann selbst fehlen.
    try { bodySize = Number((await resp.allHeaders())["content-length"] || 0); } catch {}
  }
  let priority = "-";
  try { priority = r.headers()["priority"] || "-"; } catch {}
  reqs.push({ t, url: r.url(), short: short(r.url()), type: r.resourceType(), method: r.method(), status: resp ? resp.status() : 0, bodySize, transferSize: bodySize + headersSize, priority, failed: false });
}
page.on("requestfinished", (r) => pending.push(onFinished(r).catch(() => {})));
page.on("requestfailed", (r) => {
  reqs.push({ t: Math.round(relTime(r.timing())), url: r.url(), short: short(r.url()), type: r.resourceType(), method: r.method(), status: 0, bodySize: 0, transferSize: 0, priority: "-", failed: true, error: r.failure()?.errorText || "?" });
});
page.once("domcontentloaded", () => { dclAt = Date.now() - t0; });
page.once("load", () => { loadAt = Date.now() - t0; });

await page.goto(url, { waitUntil: "load", timeout: 30000 });
if (loadAt == null) loadAt = Date.now() - t0; // Sicherheitsnetz, sollte das load-Event nie ausbleiben
if (dclAt == null) dclAt = loadAt;

const waitUntilRel = async (targetMs) => { const rest = targetMs - (Date.now() - t0); if (rest > 0) await page.waitForTimeout(rest); };
let windowMs = forMs;
if (interactMs != null) {
  windowMs = Math.max(forMs, interactMs + 2000); // genug Nachlaufzeit, um die Folgen der Interaktion noch zu sehen
  await waitUntilRel(interactMs);
  interactAt = Date.now() - t0;
  await page.mouse.move(10, 10);
  await page.mouse.move(Math.round(config.width / 2), Math.round(config.height / 2), { steps: 8 });
  await page.keyboard.press("Tab");
}
await waitUntilRel(windowMs);
await Promise.allSettled(pending);

// In-Page-Audit: von dem, was bis zum load-Event geladen wurde, war das auch zu sehen?
// describeElement wird per new Function() eingebaut statt via addInitScript. Nicht wegen
// der CSP (addInitScript läuft per CDP und ist von script-src unberührt, geprüft gegen
// diese Seite), sondern weil eine Funktionsdeklaration in einem Init-Skript nicht auf
// window landet; lib/browser.mjs weist sie deshalb inzwischen selbst window zu. Hier
// bleibt der Weg über new Function: page.evaluate braucht eine echte Funktion (nicht
// bloß einen String), sonst ruft Playwright sie nicht mit dem Argument auf.
const loadedBeforeLoad = reqs.filter((r) => !r.failed && r.t <= loadAt).map((r) => r.url);
const auditFn = new Function("loadedUrls", `
  ${DESCRIBE_ELEMENT_SRC}
  const set = new Set(loadedUrls);
  const resolve = (u) => { try { return new URL(u, document.baseURI).href; } catch { return u; } };
  function state(el) {
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === "none") return { visible: false, reason: "display:none" };
      if (cs.visibility === "hidden") return { visible: false, reason: "visibility:hidden" };
      if (parseFloat(cs.opacity) === 0) return { visible: false, reason: "opacity:0" };
    }
    if (typeof el.checkVisibility === "function" && !el.checkVisibility({ contentVisibilityAuto: true, opacityProperty: true, visibilityProperty: true })) {
      return { visible: false, reason: "content-visibility:auto (übersprungen)" };
    }
    const r = el.getBoundingClientRect();
    if (!(r.width > 0 && r.height > 0)) return { visible: false, reason: "0×0 Größe" };
    if (r.bottom <= 0) return { visible: false, reason: "oberhalb Viewport", distance: Math.round(-r.bottom) };
    if (r.top >= innerHeight) return { visible: false, reason: "unterhalb Viewport", distance: Math.round(r.top - innerHeight) };
    if (r.right <= 0 || r.left >= innerWidth) return { visible: false, reason: "seitlich außerhalb Viewport" };
    return { visible: true };
  }
  // Gruppiert nach (Art, angezeigter URL, Grund): ein Sprite wie mccain-icons.svg
  // wird über EINEN Request geladen, aber von vielen <use>-Referenzen benutzt, von
  // denen im aktuellen Zustand die meisten regulär ausgeblendet sind (Hover-State,
  // andere Bildschirmgröße, Akkordeon zu). Ohne Gruppierung wäre das eine Wand aus
  // fast identischen Zeilen statt eines lesbaren Befunds.
  const groups = new Map();
  const consider = (kind, rawUrl, el, label) => {
    if (!rawUrl) return;
    const u = resolve(rawUrl);
    if (!set.has(u)) return;
    const st = state(el);
    if (st.visible) return;
    const key = kind + "|" + (label || u) + "|" + st.reason;
    if (!groups.has(key)) groups.set(key, { kind, url: label || u, reason: st.reason, distance: st.distance ?? null, example: describeElement(el), count: 0 });
    groups.get(key).count++;
  };
  for (const img of document.images) consider("img", img.currentSrc || img.src, img);
  for (const el of document.querySelectorAll("*")) {
    const m1 = getComputedStyle(el).backgroundImage.match(/url\(["']?([^"')]+)["']?\)/);
    if (m1) consider("bg-image", m1[1], el);
    const mask = getComputedStyle(el).maskImage || getComputedStyle(el).webkitMaskImage || "";
    const m2 = mask.match(/url\(["']?([^"')]+)["']?\)/);
    if (m2) consider("mask-image", m2[1], el);
  }
  for (const use of document.querySelectorAll("use")) {
    const href = use.getAttribute("href") || use.getAttribute("xlink:href") || "";
    // Anzeige behält den #fragment (welches Icon?), der Netzwerk-Abgleich braucht die
    // Datei ohne Fragment (das lädt der Browser nie mit).
    if (href && !href.startsWith("#")) consider("use", href.split("#")[0], use, resolve(href));
  }
  return [...groups.values()];
`);
const unsichtbar = await page.evaluate(auditFn, loadedBeforeLoad);

await close();

// Phase nach Startzeit, nicht nach Fertigstellung: eine Grafik, die vor `load`
// gestartet ist, gehört noch zur Ladephase, egal wann ihr Byte-Strom ankommt.
const phase = (t) => (t < dclAt ? "vor DOMContentLoaded" : t < loadAt ? "vor Load" : interactAt != null && t >= interactAt ? "nach Interaktion" : "nach Load");
for (const r of reqs) r.phase = phase(r.t);
reqs.sort((a, b) => a.t - b.t);

const bucket = (pred) => { const rs = reqs.filter(pred); return { requests: rs.length, transferBytes: rs.reduce((s, r) => s + r.transferSize, 0) }; };
const summary = {
  Gesamt: bucket(() => true),
  "Vor Load": bucket((r) => r.t < loadAt),
  "Nach Load": bucket((r) => r.t >= loadAt && (interactAt == null || r.t < interactAt)),
  ...(interactAt != null ? { "Nach Interaktion": bucket((r) => r.t >= interactAt) } : {}),
};

// Duplikate: derselbe URL mehrfach geladen. Mit Cache-Control: no-store (viele
// Dev-Server) oder ganz ohne Cache-Header erzeugt schon ein zweiter Request
// Fake-Duplikate, die es mit produktionsnahen Headern (ETag/max-age) nicht
// gäbe - erst gegen einen produktionsnahen Server final bewerten.
const byUrl = new Map();
for (const r of reqs) if (!r.failed) byUrl.set(r.url, [...(byUrl.get(r.url) || []), r]);
const duplicates = [...byUrl.entries()].filter(([, rs]) => rs.length > 1).map(([u, rs]) => ({ url: short(u), count: rs.length, transferSize: rs[0].transferSize }));

if (args.json) {
  console.log(JSON.stringify({ url, config, milestones: { domContentLoaded: dclAt, load: loadAt, interact: interactAt }, summary, timeline: reqs, duplicates, unsichtbar }, null, 2));
} else {
  console.log(`${url}  (${config.width}x${config.height}, cpu ${config.cpu}x, ${config.mobile ? "mobile" : "desktop"})`);
  console.log(`DOMContentLoaded ${ms(dclAt)} · Load ${ms(loadAt)}${interactAt != null ? ` · Interaktion ${ms(interactAt)}` : ""}\n`);

  console.log("Zusammenfassung");
  console.log(table(Object.entries(summary).map(([k, v]) => [k, v.requests, kb(v.transferBytes)]), ["Phase", "Requests", "Transfer"]));

  const showPriority = reqs.some((r) => r.priority !== "-");
  const rows = reqs.map((r) => [r.t, r.phase, r.type, r.failed ? "-" : kb(r.transferSize), r.failed ? `FAILED ${r.error}` : r.status, ...(showPriority ? [r.priority] : []), r.short]);
  if (interactAt != null) rows.push([interactAt, "---", "interact", "-", "-", ...(showPriority ? [""] : []), "▶ Mausbewegung + Tab (Interaktion)"]);
  rows.sort((a, b) => a[0] - b[0]);
  console.log("\nZeitleiste");
  console.log(table(rows, ["t (ms)", "Phase", "Typ", "Größe", "Status", ...(showPriority ? ["Priorität"] : []), "URL"]));

  console.log(`\nDuplikate (${duplicates.length}) - Hinweis: no-store/kein Cache auf Dev-Servern erzeugt Fake-Duplikate; gegen produktionsnahe Header erneut prüfen.`);
  console.log(duplicates.length ? table(duplicates.map((d) => [`${d.count}x`, kb(d.transferSize), d.url]), ["n", "Größe", "URL"]) : "keine.");

  const stellen = unsichtbar.reduce((s, u) => s + u.count, 0);
  console.log(`\nGeladen (bis Load), aber unsichtbar (${unsichtbar.length} Befund(e), ${stellen} Stelle(n))`);
  console.log(unsichtbar.length ? table(unsichtbar.sort((a, b) => b.count - a.count).map((u) => [u.kind, short(u.url), u.reason, u.count, u.example, u.distance != null ? `${u.distance} px` : "-"]), ["Typ", "URL", "Grund", "n×", "Beispiel-Element", "Abstand unter Viewport"]) : "alles sichtbar.");
}
