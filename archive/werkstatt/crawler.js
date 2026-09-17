/* How Google and language models read this page.
 *
 * Every station shows what a crawler actually gets - from the live document
 * and from same-origin fetches of the server's answer, the Markdown twin,
 * llms.txt, robots.txt and the sitemap - and says why it is good. Statements
 * about Google follow Search Central (title links, special tags, structured
 * data); nothing here is asserted that the page does not demonstrate. */
import { T } from "./texte.js";
import { h, clear, card, kv, pill, btn, mono, note, fmtBytes, isOwn, shortLabel, revealOnPage } from "./ui.js";
import { renderCode } from "./tokens.js";

const FETCH_TIMEOUT = 6000;
async function get(url, opts) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
  try {
    const r = await fetch(url, Object.assign({ signal: ctrl.signal, cache: "no-store" }, opts || {}));
    const text = opts && opts.method === "HEAD" ? "" : await r.text();
    return { ok: r.ok, status: r.status, headers: r.headers, text };
  } finally { clearTimeout(t); }
}

function meta(name) { const m = document.querySelector(`meta[name="${name}"]`); return m ? m.getAttribute("content") : null; }
function prop(name) { const m = document.querySelector(`meta[property="${name}"]`); return m ? m.getAttribute("content") : null; }
function lengthPill(n, lo, hi) { return pill(`${n} ${T.crawler.chars} · ${n < lo ? T.crawler.tooShort : n > hi ? T.crawler.tooLong : T.crawler.lengthOk}`, n < lo || n > hi ? "warn" : "good"); }
function pageEls(sel) { return Array.from(document.querySelectorAll(sel)).filter((e) => !isOwn(e)); }

export function mountCrawler(W) {
  const el = h("div");
  el.appendChild(h("p.wk-note", { style: { margin: "2px 4px 12px" } }, T.crawler.intro));

  /* A station: a card with data-station/data-state that renders itself, sync or async. */
  function station(id, title, why, render) {
    const body = h("div", note(T.crawler.loading));
    const c = card({ eyebrow: title, body, why, attrs: { "data-station": id, "data-state": "loading", class: "wk-station" } });
    el.appendChild(c);
    Promise.resolve().then(() => render(body)).then((state) => { c.dataset.state = state || "ready"; }).catch((err) => { clear(body); body.appendChild(note(`${T.crawler.missing}: ${err.message}`)); c.dataset.state = "missing"; });
    return c;
  }

  /* ---- head */
  station("head", T.crawler.head, T.crawler.headWhy, (body) => {
    clear(body);
    const title = document.title;
    const desc = meta("description") || "";
    const canonical = (document.querySelector("link[rel=canonical]") || {}).href || null;
    const robots = meta("robots");
    body.appendChild(h("div.wk-serp", h("div.u", canonical || location.href), h("div.t", title), h("div.d", desc)));
    body.appendChild(kv([
      ["Title", h("span", lengthPill(title.length, 30, 65))],
      ["Description", h("span", lengthPill(desc.length, 70, 160))],
      ["Canonical", canonical ? mono(canonical) : pill(T.crawler.missing, "bad")],
      ["robots", robots ? h("span", mono(robots), " ", robots.includes("noindex") ? pill("Vorschau: nicht im Index", "warn") : pill("indexierbar", "good")) : pill("nicht gesetzt = index, follow", "good")],
      ["lang", mono(document.documentElement.lang || "–")],
      ["charset", mono(document.characterSet)],
      ["viewport", meta("viewport") ? mono(meta("viewport")) : pill(T.crawler.missing, "bad")],
      ["theme-color", meta("theme-color") ? h("span", h("span.wk-swatch", { style: { background: meta("theme-color") } }), mono(meta("theme-color"))) : null],
      ["og:title", prop("og:title") ? mono(prop("og:title")) : pill(T.crawler.missing, "warn")],
      ["og:image", prop("og:image") ? mono(prop("og:image").replace(location.origin, "")) : pill(T.crawler.missing, "warn")],
      ["twitter:card", meta("twitter:card") ? mono(meta("twitter:card")) : null],
      ["Markdown-Zwilling", (document.querySelector("link[rel=alternate][type='text/markdown']") || {}).href ? mono(document.querySelector("link[rel=alternate][type='text/markdown']").getAttribute("href")) : pill("nicht verlinkt", "warn")],
      ["Icons", mono(pageEls("link[rel*=icon]").map((l) => l.getAttribute("href").split("/").pop()).join(", ") || "–")],
    ]));
  });

  /* ---- server headers */
  station("headers", T.crawler.headers, T.crawler.headersWhy, async (body) => {
    /* GET, not HEAD: Chrome reports a HEAD to a gzip-encoded resource as
     * net::ERR_ABORTED although fetch resolves, and the check script counts
     * failed requests. The page is 39 KB compressed; asking for it once more
     * is cheaper than a false alarm. */
    const r = await get(location.pathname + location.search);
    clear(body);
    const show = ["content-type", "content-encoding", "cache-control", "x-robots-tag", "content-security-policy", "strict-transport-security", "x-content-type-options", "referrer-policy", "permissions-policy", "server", "age", "x-vercel-cache"];
    const rows = [];
    for (const k of show) {
      const v = r.headers.get(k);
      if (!v) continue;
      rows.push([k, k === "content-security-policy" ? h("details", h("summary", mono(v.slice(0, 48) + "…")), h("p.wk-mono", { style: { display: "block", marginTop: "4px", whiteSpace: "pre-wrap" } }, v.replace(/; /g, ";\n"))) : mono(v)]);
    }
    rows.push(["Status", mono(String(r.status))]);
    body.appendChild(kv(rows));
    const enc = r.headers.get("content-encoding");
    body.appendChild(h("p.wk-hint", { style: { marginTop: "8px" } }, enc ? `Komprimiert mit ${enc}.` : "Keine Kompression gemeldet (lokal kann das an der Anfrageart liegen)."));
  });

  /* ---- headings */
  station("headings", T.crawler.headings, T.crawler.headingsWhy, (body) => {
    clear(body);
    const hs = pageEls("h1,h2,h3,h4,h5,h6");
    const h1s = hs.filter((x) => x.tagName === "H1");
    const ul = h("ul.wk-outline");
    let prev = 0, skips = 0;
    for (const x of hs) {
      const lvl = Number(x.tagName[1]);
      if (prev && lvl > prev + 1) skips++;
      prev = lvl;
      const li = h("li", { style: { "--lvl": String(lvl) }, "data-hover": "" }, pill(x.tagName.toLowerCase(), lvl === 1 ? "dark" : lvl === 2 ? "info" : "neutral"), h("span", x.textContent.replace(/\s+/g, " ").trim()));
      li.addEventListener("mouseenter", () => W.hover(x)); li.addEventListener("mouseleave", () => W.hover(null));
      li.addEventListener("click", () => { revealOnPage(x); W.layer.flash(x); });
      ul.appendChild(li);
    }
    const sectionsWithout = pageEls("main section").filter((s) => !s.querySelector("h1,h2,h3,h4,h5,h6"));
    body.append(
      h("div.wk-stat", h("div", { "data-tone": h1s.length === 1 ? "good" : "bad" }, h("b", String(h1s.length)), h("small", "h1")), h("div", h("b", String(hs.length)), h("small", "Überschriften")), h("div", { "data-tone": skips ? "warn" : "good" }, h("b", String(skips)), h("small", "Ebenensprünge"))),
      h1s.length === 1 && !skips ? h("p.wk-hint", T.crawler.headingsOk) : null,
      sectionsWithout.length ? h("p.wk-hint", `Sektionen ohne Überschrift: ${sectionsWithout.map((s) => shortLabel(s, 0)).join(", ")}`) : null,
      ul);
  });

  /* ---- landmarks */
  station("landmarks", T.crawler.landmarks, T.crawler.landmarksWhy, (body) => {
    clear(body);
    const marks = pageEls("header,nav,main,footer,aside,[role=banner],[role=navigation],[role=main],[role=contentinfo],[role=complementary],[role=dialog],[role=search],[role=region],form");
    const ul = h("ul.wk-list");
    for (const m of marks) {
      const role = m.getAttribute("role") || { HEADER: "banner", NAV: "navigation", MAIN: "main", FOOTER: "contentinfo", ASIDE: "complementary", FORM: "form" }[m.tagName] || m.tagName.toLowerCase();
      const name = m.getAttribute("aria-label") || (m.getAttribute("aria-labelledby") && (document.getElementById(m.getAttribute("aria-labelledby")) || {}).textContent) || "";
      const li = h("li", { "data-hover": "" }, pill(role, "info"), h("span.wk-grow", mono(shortLabel(m, 0)), name ? ` „${name.trim()}“` : ""), h("span.wk-num", `${m.getElementsByTagName("*").length} Knoten`));
      li.addEventListener("mouseenter", () => W.hover(m)); li.addEventListener("mouseleave", () => W.hover(null)); li.addEventListener("click", () => W.select(m));
      ul.appendChild(li);
    }
    const skip = document.querySelector("a.skip-link, a[href^='#'][class*=skip]");
    const target = skip && document.querySelector(skip.getAttribute("href"));
    body.append(ul, kv([["Skip-Link", skip ? h("span", mono(skip.getAttribute("href")), " ", pill(target ? "Ziel vorhanden" : "Ziel fehlt", target ? "good" : "bad")) : pill(T.crawler.missing, "warn")]]));
  });

  /* ---- images */
  station("images", T.crawler.images, T.crawler.imagesWhy, (body) => {
    clear(body);
    const imgs = pageEls("img");
    const noAlt = imgs.filter((i) => !i.hasAttribute("alt"));
    const decorative = imgs.filter((i) => i.getAttribute("alt") === "");
    const noSize = imgs.filter((i) => !i.hasAttribute("width") || !i.hasAttribute("height"));
    const lazy = imgs.filter((i) => i.loading === "lazy");
    const svgs = pageEls("svg").length;
    body.appendChild(h("div.wk-stat",
      h("div", h("b", String(imgs.length)), h("small", "img")),
      h("div", { "data-tone": noAlt.length ? "bad" : "good" }, h("b", String(noAlt.length)), h("small", "ohne alt")),
      h("div", h("b", String(decorative.length)), h("small", "dekorativ (alt=\"\")")),
      h("div", { "data-tone": noSize.length ? "warn" : "good" }, h("b", String(noSize.length)), h("small", T.crawler.imagesMissingSize)),
      h("div", h("b", String(lazy.length)), h("small", "lazy")),
      h("div", h("b", String(svgs)), h("small", "Inline-SVG"))));
    const table = h("table.wk-table", h("thead", h("tr", h("th", "Datei"), h("th", "alt"), h("th", "Größe"))));
    const tb = h("tbody");
    for (const i of imgs) {
      const tr = h("tr", { "data-hover": "" }, h("td", mono(i.getAttribute("src").split("/").pop())), h("td", i.hasAttribute("alt") ? (i.getAttribute("alt") || h("i", "dekorativ")) : pill("fehlt", "bad")), h("td.wk-num", i.hasAttribute("width") ? `${i.getAttribute("width")}×${i.getAttribute("height")}` : pill("–", "warn")));
      tr.addEventListener("mouseenter", () => W.hover(i)); tr.addEventListener("mouseleave", () => W.hover(null)); tr.addEventListener("click", () => W.select(i));
      tb.appendChild(tr);
    }
    table.appendChild(tb);
    body.appendChild(table);
  });

  /* ---- links */
  station("links", T.crawler.links, T.crawler.linksWhy, (body) => {
    clear(body);
    const links = pageEls("a[href]");
    const internal = [], external = [], anchors = [], empty = [];
    for (const a of links) {
      const href = a.getAttribute("href");
      const text = (a.getAttribute("aria-label") || a.textContent || "").replace(/\s+/g, " ").trim();
      if (!text && !a.querySelector("img[alt]:not([alt=''])")) empty.push(a);
      if (href.startsWith("#")) anchors.push(a);
      else if (/^(https?:)?\/\//.test(href) && !href.startsWith(location.origin) && !href.startsWith("//" + location.host)) external.push(a);
      else internal.push(a);
    }
    body.appendChild(h("div.wk-stat",
      h("div", h("b", String(links.length)), h("small", "Links")),
      h("div", h("b", String(internal.length)), h("small", T.crawler.internal)),
      h("div", h("b", String(external.length)), h("small", T.crawler.external)),
      h("div", h("b", String(anchors.length)), h("small", T.crawler.anchors)),
      h("div", { "data-tone": empty.length ? "bad" : "good" }, h("b", String(empty.length)), h("small", T.crawler.emptyAnchors))));
    const targets = new Map();
    for (const a of internal) { const k = a.getAttribute("href"); if (!targets.has(k)) targets.set(k, []); targets.get(k).push(a); }
    const ul = h("ul.wk-list");
    const rows = Array.from(targets.entries()).sort((x, y) => y[1].length - x[1].length);
    const show = (n) => { clear(ul); for (const [href, as] of rows.slice(0, n)) { const li = h("li", { "data-hover": "" }, h("span.wk-grow", mono(href), " ", h("span.wk-hint", `„${(as[0].getAttribute("aria-label") || as[0].textContent).replace(/\s+/g, " ").trim().slice(0, 50)}“`)), h("span.wk-num", `${as.length}×`)); li.addEventListener("mouseenter", () => W.hover(as[0])); li.addEventListener("mouseleave", () => W.hover(null)); li.addEventListener("click", () => W.select(as[0])); ul.appendChild(li); } };
    show(12);
    body.append(ul, rows.length > 12 ? btn(`${rows.length - 12} ${T.crawler.more}`, () => show(rows.length), { "data-tone": "small" }) : null);
    if (external.length) body.appendChild(kv([[T.crawler.external, mono(Array.from(new Set(external.map((a) => { try { return new URL(a.href).host; } catch (e) { return a.getAttribute("href"); } }))).join(", "))]]));
  });

  /* ---- structured data */
  station("jsonld", T.crawler.jsonld, T.crawler.jsonldWhy, (body) => {
    clear(body);
    const scripts = pageEls("script[type='application/ld+json']");
    if (!scripts.length) { body.appendChild(pill(T.crawler.missing, "warn")); return "missing"; }
    const items = [];
    for (const s of scripts) {
      try {
        const data = JSON.parse(s.textContent);
        const list = Array.isArray(data) ? data : data["@graph"] ? data["@graph"] : [data];
        for (const it of list) items.push(it);
      } catch (e) { body.appendChild(note("Ein JSON-LD-Block ist kein gültiges JSON.")); }
    }
    for (const it of items) {
      const type = it["@type"] || "?";
      const rows = [];
      for (const k of ["name", "url", "description", "email", "telephone", "foundingDate", "areaServed", "inLanguage"]) if (it[k]) rows.push([k, typeof it[k] === "string" ? it[k] : JSON.stringify(it[k])]);
      if (it.address) rows.push(["address", [it.address.streetAddress, it.address.postalCode, it.address.addressLocality, it.address.addressRegion, it.address.addressCountry].filter(Boolean).join(", ")]);
      if (it.founder) rows.push(["founder", (Array.isArray(it.founder) ? it.founder : [it.founder]).map((f) => f.name).join(", ")]);
      if (it.makesOffer) rows.push(["makesOffer", (Array.isArray(it.makesOffer) ? it.makesOffer : [it.makesOffer]).map((o) => (o.itemOffered && o.itemOffered.name) || o.name).filter(Boolean).join(" · ")]);
      if (it.mainEntity) rows.push(["Fragen", h("ul.wk-list", ...it.mainEntity.slice(0, 8).map((q) => h("li", h("span.wk-grow", q.name))))]);
      body.appendChild(h("div", { style: { padding: "8px 0", borderTop: body.children.length ? "1px solid var(--wk-line)" : "0" } }, h("div", { style: { marginBottom: "4px" } }, pill(type, "info")), kv(rows)));
    }
    body.appendChild(h("details.wk-why", { style: { borderTop: "0" } }, h("summary", "Rohdaten"), renderCode(scripts.map((s) => JSON.stringify(JSON.parse(s.textContent), null, 2)).join("\n\n"), "json", { small: true }).el));
  });

  /* ---- text */
  station("text", T.crawler.text, T.crawler.textWhy, (body) => {
    clear(body);
    const main = document.querySelector("main") || document.body;
    const text = (main.innerText || main.textContent || "").replace(/\s+/g, " ").trim();
    const words = text ? text.split(" ").length : 0;
    body.appendChild(h("div.wk-stat", h("div", h("b", words.toLocaleString("de-DE")), h("small", T.crawler.words)), h("div", h("b", String(Math.max(1, Math.round(words / 220)))), h("small", T.crawler.readMin)), h("div", h("b", fmtBytes(text.length)), h("small", "Text")), h("div", h("b", fmtBytes(document.documentElement.outerHTML.length)), h("small", "HTML"))));
    body.appendChild(h("details.wk-why", { style: { borderTop: "0" } }, h("summary", T.crawler.show), h("pre.wk-pre", text.slice(0, 4000) + (text.length > 4000 ? " …" : ""))));
  });

  /* ---- fetched twins */
  function fileStation(id, title, why, url, lang, extra) {
    station(id, title, why, async (body) => {
      const r = await get(url);
      clear(body);
      if (!r.ok) { body.append(pill(`${T.crawler.missing} (HTTP ${r.status})`, "warn"), h("p.wk-hint", { style: { marginTop: "6px" } }, id === "markdown" ? T.crawler.markdownMissing : url)); return "missing"; }
      const ct = r.headers.get("content-type") || "";
      const lines = r.text.split("\n").length;
      body.appendChild(kv([["Adresse", mono(url)], ["Content-Type", mono(ct || "–")], ["Größe", mono(`${fmtBytes(r.text.length)} · ${lines} Zeilen`)]]));
      if (extra) extra(body, r.text);
      const code = renderCode(r.text, lang, { small: true });
      body.appendChild(code.el);
    });
  }
  fileStation("markdown", T.crawler.markdown, T.crawler.markdownWhy, (document.querySelector("link[rel=alternate][type='text/markdown']") || {}).getAttribute ? document.querySelector("link[rel=alternate][type='text/markdown']").getAttribute("href") : location.pathname.replace(/\/$/, "") + "/index.md", "md", (body, text) => {
    const words = text.split(/\s+/).filter(Boolean).length;
    const headings = (text.match(/^#{1,6} /gm) || []).length;
    body.appendChild(h("div.wk-stat", h("div", h("b", words.toLocaleString("de-DE")), h("small", T.crawler.words)), h("div", h("b", String(headings)), h("small", "Überschriften")), h("div", h("b", `${Math.round((text.length / Math.max(1, document.documentElement.outerHTML.length)) * 100)} %`), h("small", "der HTML-Größe"))));
  });
  fileStation("llms", T.crawler.llms, T.crawler.llmsWhy, "/llms.txt", "md");
  fileStation("robots", T.crawler.robots, T.crawler.robotsWhy, "/robots.txt", "txt", (body, text) => {
    const agents = Array.from(new Set((text.match(/^User-agent:\s*(.+)$/gim) || []).map((l) => l.split(":")[1].trim()).filter((a) => a !== "*")));
    if (agents.length) body.appendChild(kv([[T.crawler.robotsAllowed, h("span", ...agents.map((a) => h("span", pill(a, "good"), " ")))]]));
  });
  station("sitemap", T.crawler.sitemap, T.crawler.sitemapWhy, async (body) => {
    const r = await get("/sitemap.xml");
    clear(body);
    if (!r.ok) { body.appendChild(pill(`${T.crawler.missing} (HTTP ${r.status})`, "warn")); return "missing"; }
    const urls = (r.text.match(/<loc>([^<]+)<\/loc>/g) || []).map((m) => m.replace(/<\/?loc>/g, ""));
    const here = urls.some((u) => { try { return new URL(u).pathname === location.pathname; } catch (e) { return false; } });
    body.appendChild(h("div.wk-stat", h("div", h("b", String(urls.length)), h("small", "Seiten")), h("div", { "data-tone": here ? "good" : "warn" }, h("b", here ? "ja" : "nein"), h("small", "diese Seite enthalten"))));
    if (!here) body.appendChild(h("p.wk-hint", T.crawler.sitemapNotIn));
    body.appendChild(h("details.wk-why", { style: { borderTop: "0" } }, h("summary", T.crawler.show), h("ul.wk-list", ...urls.map((u) => h("li", h("span.wk-grow", mono(u.replace(/^https?:\/\/[^/]+/, ""))))))));
  });

  return { el, dispose() {} };
}
