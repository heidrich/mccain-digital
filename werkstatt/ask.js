/* The "Fragen" view: Claude answers questions about this page, with the
 * workshop's own facts as its only knowledge.
 *
 * What goes out with a question (POST /api/ask/, same origin, see
 * api/ask.mjs): the question, the last turns of this conversation, and the
 * facts this module collects right now - the page's head data, the timings
 * this visit measured, the selected element, what crawlers find, the
 * markdown twin as the page's text, and the glossary so terms are explained
 * the same way everywhere. Nothing about the visitor, nothing stored: the
 * conversation lives in this tab and dies with it. When the endpoint is not
 * there (local server, no key on Vercel, offline) the answer comes from the
 * facts alone, marked as such. */
import { T } from "./texte.js";
import { h, card, btn, note, pill, clear, kv, mono, shortLabel, textPreview, fmtMs, fmtBytes, isTouch } from "./ui.js";
import { matchedRules } from "./cssrules.js";
import { editBus } from "./edits.js";

/* With a trailing slash: vercel.json has trailingSlash: true, and Vercel answers
 * /api/ask with a 308 to /api/ask/ - one round trip saved per question. */
const ENDPOINT = "/api/ask/";
const MAX_Q = 600, MAX_MD = 8000, MAX_HTML = 500, TIMEOUT_MS = 30000;

export function mountAsk(W) {
  const el = h("div.wk-asklayout");
  const chat = h("div.wk-chat");
  const msgs = h("div.wk-msgs", { role: "log", "aria-live": "polite" });
  const chips = h("div.wk-chips", ...T.ask.suggestions.map((s) => h("button.wk-chip", { type: "button", hint: T.ask.sendHint, onclick: () => send(s) }, s)));
  const input = h("input.wk-input", { type: "text", maxlength: String(MAX_Q), placeholder: T.ask.placeholder, autocomplete: "off", enterkeyhint: "send", aria: { label: T.ask.title } });
  const sendBtn = btn(T.ask.send, () => send(input.value), { hint: T.ask.sendHint, "data-action": "ask-send" });
  const clearBtn = btn(T.ask.clear, () => { history.length = 0; clear(msgs); input.focus(); }, { "data-tone": "small", hint: T.ask.clearHint });
  const form = h("form.wk-askform", { onsubmit: (e) => { e.preventDefault(); send(input.value); } }, h("span.wk-stream", input), sendBtn);
  chat.append(card({ eyebrow: T.ask.view, title: T.ask.title, body: [note(T.ask.privacy), chips] }), msgs, form, h("div.wk-toolbar", { style: { justifyContent: "flex-end", margin: "0" } }, clearBtn));
  const factsBody = h("div");
  const factsCard = card({ eyebrow: T.ask.facts, body: factsBody, why: T.ask.factsWhy, attrs: { "data-section": "facts" } });
  el.append(chat, factsCard);

  const history = [];
  let busy = false, editCount = 0, mapPromise = null, mdPromise = null;

  /* Buffered observers: LCP, layout shifts and long tasks of this visit. */
  const obs = { lcp: null, cls: 0, long: 0, observers: [] };
  const watch = (type, fn) => { try { const o = new PerformanceObserver((l) => fn(l.getEntries())); o.observe({ type, buffered: true }); obs.observers.push(o); } catch (e) { /* not on this browser */ } };
  watch("largest-contentful-paint", (es) => { for (const e of es) obs.lcp = e; });
  watch("layout-shift", (es) => { for (const e of es) if (!e.hadRecentInput) obs.cls += e.value; });
  watch("longtask", (es) => { obs.long += es.length; });

  const offSelect = W.bus.on("select", () => renderFacts());
  const offEdits = editBus.on("change", (n) => { editCount = n; });

  function mdUrl() {
    const link = document.querySelector("link[rel=alternate][type='text/markdown']");
    return link && link.getAttribute("href") ? link.getAttribute("href") : location.pathname.replace(/\/?$/, "/") + "index.md";
  }
  function markdown() {
    if (!mdPromise) mdPromise = fetch(mdUrl()).then((r) => (r.ok ? r.text() : "")).catch(() => "");
    return mdPromise;
  }
  function loadMap() {
    if (!mapPromise) mapPromise = fetch("/werkstatt/map.json").then((r) => (r.ok ? r.json() : null)).catch(() => null);
    return mapPromise;
  }
  const meta = (n) => { const m = document.querySelector(`meta[name="${n}"]`); return m ? m.getAttribute("content") || "" : ""; };
  const linkHref = (rel) => { const l = document.querySelector(`link[rel="${rel}"]`); return l ? l.getAttribute("href") || "" : ""; };

  /* The page as a crawler sees it, in numbers. */
  function pageFacts() {
    const hs = Array.from(document.querySelectorAll("#dc-root h1, #dc-root h2, #dc-root h3, #dc-root h4"));
    const imgs = Array.from(document.querySelectorAll("#dc-root img"));
    const links = Array.from(document.querySelectorAll("#dc-root a[href]"));
    const ld = Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map((s) => { try { const j = JSON.parse(s.textContent); return [].concat(j["@graph"] || j).map((x) => x["@type"]).filter(Boolean).join("/"); } catch (e) { return null; } }).filter(Boolean);
    const route = (() => { try { return JSON.parse((document.getElementById("v5-data") || {}).textContent || "{}").route || location.pathname; } catch (e) { return location.pathname; } })();
    return {
      url: location.origin + location.pathname,
      route,
      title: document.title,
      description: meta("description"),
      lang: document.documentElement.lang || "",
      canonical: linkHref("canonical"),
      robots: meta("robots"),
      h1: hs.filter((x) => x.tagName === "H1").length,
      headings: hs.length,
      outline: hs.slice(0, 40).map((x) => `${x.tagName.toLowerCase()}: ${textPreview(x, 80)}`),
      jsonld: ld,
      images: imgs.length,
      imagesWithoutSize: imgs.filter((i) => !i.getAttribute("width") || !i.getAttribute("height")).length,
      linksInternal: links.filter((a) => a.host === location.host).length,
      linksExternal: links.filter((a) => a.host !== location.host).length,
      landmarks: ["header", "nav", "main", "footer"].filter((t) => document.querySelector(t)),
      markdownTwin: mdUrl(),
    };
  }
  /* What this visit measured, as the strings the answer should quote. */
  function visitFacts() {
    const nav = performance.getEntriesByType("navigation")[0];
    const paint = {};
    for (const p of performance.getEntriesByType("paint")) paint[p.name] = p.startTime;
    const res = performance.getEntriesByType("resource");
    const bytes = res.reduce((a, r) => a + (r.transferSize || 0), nav ? nav.transferSize || 0 : 0);
    const c = navigator.connection;
    return {
      ttfb: nav ? fmtMs(nav.responseStart) : null,
      fcp: paint["first-contentful-paint"] !== undefined ? fmtMs(paint["first-contentful-paint"]) : null,
      lcp: obs.lcp ? fmtMs(obs.lcp.startTime) : null,
      lcpElement: obs.lcp && obs.lcp.element ? shortLabel(obs.lcp.element, 2) : null,
      cls: obs.cls.toFixed(3).replace(".", ","),
      longTasks: obs.long,
      domContentLoaded: nav ? fmtMs(nav.domContentLoadedEventEnd) : null,
      load: nav ? fmtMs(nav.loadEventEnd) : null,
      transfer: fmtBytes(bytes),
      requests: res.length + 1,
      domNodes: document.getElementsByTagName("*").length,
      templateNodes: (() => { const t = document.getElementById("dc-template"); return t ? t.content.querySelectorAll("*").length : 0; })(),
      viewport: `${innerWidth} × ${innerHeight} px`,
      dpr: `${devicePixelRatio}×`,
      pointer: isTouch() ? "Touch" : "Maus oder Stift",
      connection: c ? `${c.effectiveType || "?"} · RTT ${c.rtt} ms` : null,
      reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
      edits: editCount,
    };
  }
  async function selectedFacts() {
    const el = W.selected;
    if (!el || !el.isConnected) return null;
    const rules = matchedRules(el);
    const api = window.__v5;
    const d = api && typeof api.describe === "function" ? api.describe(el) : null;
    const chain = [];
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) chain.unshift(shortLabel(n, 1));
    const map = await loadMap();
    const code = map ? map.entries.filter((e) => { try { return !!el.closest(e.match); } catch (err) { return false; } }).map((e) => ({ title: e.title, what: e.what, file: map.files[e.file] ? map.files[e.file].name : e.file, symbol: e.symbol || null })) : [];
    const r = el.getBoundingClientRect();
    return {
      label: shortLabel(el, 3),
      path: chain.join(" > "),
      text: textPreview(el, 160),
      html: el.outerHTML.slice(0, MAX_HTML),
      size: `${Math.round(r.width)} × ${Math.round(r.height)} px`,
      ruleCount: rules.length,
      rules: rules.slice(0, 8).map((x) => x.selector),
      template: d ? { tid: d.tid, dynamicAttributes: d.dyn.length, styleBindings: d.style.length, events: d.events.map((e) => e.type) } : null,
      code,
    };
  }
  async function facts() {
    const md = await markdown();
    return {
      page: pageFacts(),
      visit: visitFacts(),
      selected: await selectedFacts(),
      console: { view: W.view, tab: W.root ? (W.root.querySelector('[role="tab"][aria-selected="true"][data-tab]') || {}).dataset : null },
      markdown: md.slice(0, MAX_MD),
      glossar: T.glossar,
    };
  }

  /* The facts card: what goes out, in one glance. */
  function renderFacts() {
    clear(factsBody);
    const v = visitFacts();
    const p = pageFacts();
    const sel = W.selected && W.selected.isConnected ? shortLabel(W.selected, 2) : null;
    const rows = [
      [T.ask.factPage, h("span", p.title)],
      [T.ask.factSelected, sel ? mono(sel) : pill(T.ask.noSelection)],
      [T.ask.factPerf, mono(`FCP ${v.fcp || "–"} · LCP ${v.lcp || "–"} · CLS ${v.cls} · ${v.longTasks} ${T.ask.factLongTasks}`)],
      [T.ask.factCrawler, mono(`${p.h1} h1 · ${p.headings} ${T.ask.factHeadings}${p.jsonld.length ? " · " + p.jsonld.join(", ") : ""}`)],
      [T.ask.factText, h("span", T.ask.factTextVal(0))],
      [T.ask.factDevice, mono(`${v.viewport} · ${v.pointer}`)],
    ];
    factsBody.appendChild(kv(rows));
    markdown().then((md) => { const dd = factsBody.querySelectorAll("dd")[4]; if (dd) dd.textContent = T.ask.factTextVal(Math.min(md.length, MAX_MD)); });
  }

  function push(role, text, local) {
    const m = h("div.wk-msg", { "data-role": role }, h("div.wk-msg-meta", role === "user" ? T.ask.you : local ? T.ask.fromLocal : T.ask.fromClaude), h("div.wk-msg-text", text));
    if (local) m.appendChild(h("p.wk-hint", { style: { marginTop: "6px" } }, pill(T.ask.offlinePill, "warn"), " ", T.ask.offline));
    msgs.appendChild(m);
    try { m.scrollIntoView({ block: "nearest" }); } catch (e) { /* fine */ }
    return m;
  }

  async function send(q) {
    q = String(q || "").trim();
    if (!q || busy) return;
    if (q.length > MAX_Q) { W.status(T.ask.tooLong); return; }
    input.value = "";
    busy = true; sendBtn.disabled = true;
    push("user", q);
    const thinking = h("div.wk-thinking", T.ask.thinking);
    msgs.appendChild(thinking);
    W.status(T.ask.thinking);
    const f = await facts();
    let text = "", local = false;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
      const r = await fetch(ENDPOINT, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ q, history: history.slice(-6), facts: f }), signal: ctrl.signal });
      clearTimeout(timer);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      text = String(d && d.text ? d.text : "").trim();
      if (!text) throw new Error("leer");
    } catch (e) {
      text = localAnswer(q, f);
      local = true;
    }
    thinking.remove();
    push("assistant", text, local);
    history.push({ role: "user", content: q }, { role: "assistant", content: text });
    busy = false; sendBtn.disabled = false;
    W.status(local ? T.status.askedLocal : T.status.asked);
    if (!isTouch()) input.focus();
  }

  /* Without a model: the facts still answer the questions the chips ask. */
  function localAnswer(q, f) {
    const s = q.toLowerCase(), L = T.ask.local, v = f.visit;
    /* Keyword sets per page language: "fast" is a German word too ("fast fertig") and
     * "load" sits inside "Download", so the English set only runs on an English page. */
    const en = document.documentElement.lang === "en";
    const K = en
      ? { term: /what is|what does|mean|explain/, fast: /\b(?:fast|loads?|loading|speed|performance|pagespeed|lighthouse)\b/, slow: /\bslow/, elem: /element|selected|picked|node/, crawl: /google|crawler|search engine|index|seo|bot|language model|llm/ }
      : { term: /bedeut|was ist|was heißt|erklär|wofür/, fast: /schnell|lädt|laden|ladezeit|performance|pagespeed|lighthouse/, slow: /langsam/, elem: /element|gewählt|ausgewählt|markiert|knoten/, crawl: /google|crawler|suchmaschine|index|seo|bot|sprachmodell|llm/ };
    const term = Object.keys(T.glossar).find((k) => new RegExp("(^|[^\\p{L}])" + k.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?![\\p{L}])", "u").test(s));
    const measured = { LCP: v.lcp, FCP: v.fcp, TTFB: v.ttfb, CLS: v.cls, TBT: v.longTasks ? L.longSome(v.longTasks) : L.longNone };
    if (term && K.term.test(s)) return L.term(term, T.glossar[term], measured[term] || null);
    if (K.fast.test(s)) return L.fast(v.fcp || "–", v.lcp || "–", v.longTasks ? L.longSome(v.longTasks) : L.longNone);
    if (K.slow.test(s)) return L.slower;
    if (K.elem.test(s)) return f.selected ? L.element(f.selected.label, f.selected.ruleCount, f.selected.code.length ? f.selected.code[0].title : null) : L.noElement;
    if (K.crawl.test(s)) return L.crawler(f.page.title, f.page.h1, f.page.headings, f.page.jsonld.join(", "));
    if (term) return L.term(term, T.glossar[term], measured[term] || null);
    return L.fallback;
  }

  renderFacts();
  return {
    el,
    show() { renderFacts(); if (!isTouch()) requestAnimationFrame(() => input.focus({ preventScroll: true })); },
    dispose() { offSelect(); offEdits(); for (const o of obs.observers) { try { o.disconnect(); } catch (e) { /* fine */ } } },
  };
}
