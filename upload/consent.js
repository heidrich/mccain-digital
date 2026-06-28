/* ============================================================================
 * Cookie consent manager — vanilla port of whatever-recall's ConsentManager.
 * GDPR + TDDDG (ex-TTDSG) compliant, hand-built (no lib, house rule).
 *
 * Legal load-bearing points (do NOT "simplify" away):
 *  - PRIOR opt-in: NOTHING non-essential loads before an explicit choice
 *    (§25 Abs.1 TDDDG, EuGH Planet49). GA self-gates on consent.
 *  - EQUAL prominence: "Reject all" and "Accept all" are visually identical
 *    (VG Hannover 10 A 5385/22) — same class, no faint ghost reject.
 *  - GRANULAR + default OFF: analytics toggle starts off; no pre-ticked boxes.
 *  - WITHDRAW as easy as grant: the footer "Cookie settings" link reopens the
 *    settings view; turning analytics off clears GA cookies + signals gtag.
 *  - Necessary cookies (the consent record itself) always run.
 *  - The consent record is first-party, versioned + timestamped (Art.7 Nachweis);
 *    a version bump or a >12-month-old record re-asks.
 *
 * GA wiring: set window.MCD_GA_ID = "G-XXXX" (e.g. in a small inline <script>
 * before this file) and GA loads ONLY after the user grants analytics consent.
 * No GA_ID → the banner still works, just nothing to load.
 * ========================================================================== */
(function () {
  "use strict";

  var KEY = "mcd-consent";
  var OPEN_EVENT = "mcd-consent-open";
  var VERSION = 1; // bump when the set of purposes/services changes → re-ask
  var MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000; // 12 months
  var GA_ID = window.MCD_GA_ID || null;

  // base path to /legal from the current page (root vs /services/ subfolder)
  var INLEGAL = /\/legal\//.test(location.pathname);
  var INSUB = /\/services\//.test(location.pathname);
  var LEGAL = INLEGAL ? "" : INSUB ? "../legal/" : "legal/";

  function readRecord() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      if (raw === "granted" || raw === "denied") return null; // legacy bare strings → re-ask
      var rec = JSON.parse(raw);
      if (!rec || rec.v !== VERSION || typeof rec.ts !== "string" || !rec.categories) return null;
      if (Date.now() - new Date(rec.ts).getTime() > MAX_AGE_MS) return null; // stale → re-ask
      return { v: VERSION, ts: rec.ts, categories: { analytics: rec.categories.analytics === true } };
    } catch (e) {
      return null; // corrupt / unavailable → re-ask, never throw
    }
  }

  function writeRecord(categories) {
    try {
      localStorage.setItem(KEY, JSON.stringify({ v: VERSION, ts: new Date().toISOString(), categories: categories }));
    } catch (e) { /* private mode / quota — keep in-memory for this session */ }
  }

  // best-effort delete of GA's first-party cookies on withdrawal
  function clearAnalyticsCookies() {
    try {
      var host = location.hostname;
      var domains = ["", host, "." + host];
      document.cookie.split(";").forEach(function (c) {
        var name = (c.split("=")[0] || "").trim();
        if (!name) return;
        if (name === "_ga" || name.indexOf("_ga_") === 0 || name === "_gid" || name.indexOf("_gat") === 0) {
          domains.forEach(function (d) {
            document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/" + (d ? "; domain=" + d : "");
          });
        }
      });
    } catch (e) { /* ignore */ }
  }

  var gaLoaded = false;
  function loadGA() {
    if (gaLoaded || !GA_ID) return;
    gaLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("consent", "default", { analytics_storage: "denied" });
    window.gtag("consent", "update", { analytics_storage: "granted" });
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
    document.head.appendChild(s);
    window.gtag("js", new Date());
    window.gtag("config", GA_ID, { anonymize_ip: true });
  }

  var cats = { analytics: false };
  var hadConsent = false;

  function applyConsent() {
    if (cats.analytics) loadGA();
  }

  function commit(next) {
    if (hadConsent && !next.analytics) {
      try { if (window.gtag) window.gtag("consent", "update", { analytics_storage: "denied" }); } catch (e) {}
      clearAnalyticsCookies();
    }
    writeRecord(next);
    cats = next;
    hadConsent = next.analytics;
    closeBanner();
    applyConsent();
  }

  /* ---------- DOM ---------- */
  var root = null; // the live dialog element

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function closeBanner() {
    if (root) { root.remove(); root = null; }
    document.removeEventListener("keydown", onKey);
  }

  function onKey(e) {
    if (e.key === "Escape") closeBanner(); // Esc closes WITHOUT persisting (never counts as accept)
  }

  function build(view, draft) {
    closeBanner();
    root = el("div", "consent" + (view === "settings" ? " consent--settings" : ""));
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-label", view === "settings" ? "Privacy settings" : "Cookie settings");
    root.setAttribute("aria-modal", "false");

    var links =
      '<div class="consent__links">' +
      '<a href="' + LEGAL + 'privacy.html">Privacy notice</a>' +
      '<a href="' + LEGAL + 'imprint.html">Imprint</a>' +
      "</div>";

    if (view === "ask") {
      root.appendChild(el("h2", "consent__title", "Cookies &amp; similar technologies"));
      root.appendChild(el("p", "consent__text",
        "We only run analytics with your consent, to understand how the site is used — via " +
        "<strong>Google Analytics 4</strong>. Google Analytics <strong>sends data to Google LLC in the USA</strong> " +
        "(EU-US Data Privacy Framework). Strictly necessary storage (your choice here) always runs. " +
        "Declining doesn&rsquo;t affect normal use of the site."));
      root.appendChild(el("div", null, links));
      var actions = el("div", "consent__actions");
      var bSettings = el("button", "consent__settings-btn", "Settings");
      bSettings.type = "button";
      bSettings.onclick = function () { build("settings", { analytics: cats.analytics }); };
      var bReject = el("button", "consent__btn", "Reject all"); bReject.type = "button";
      bReject.onclick = function () { commit({ analytics: false }); };
      var bAccept = el("button", "consent__btn", "Accept all"); bAccept.type = "button";
      bAccept.onclick = function () { commit({ analytics: true }); };
      actions.appendChild(bSettings); actions.appendChild(bReject); actions.appendChild(bAccept);
      root.appendChild(actions);
    } else {
      // settings view
      root.appendChild(el("h2", "consent__title", "Privacy settings"));
      root.appendChild(el("p", "consent__text",
        "Choose which optional services may run. You can change or withdraw this any time via " +
        "&bdquo;Cookie settings&ldquo; in the footer."));

      // Necessary (locked on)
      var rowN = el("div", "consent__row");
      rowN.innerHTML =
        '<div class="consent__cat">' +
        '<div class="consent__cat-head"><span class="consent__cat-name">Necessary</span>' +
        '<span class="consent__cat-state">always on</span></div>' +
        '<p class="consent__cat-desc">Required to run the site and remember your cookie choice. ' +
        "No tracking — these never leave your browser.</p>" +
        "</div>" +
        '<span class="consent__toggle consent__toggle--locked" role="switch" aria-checked="true" aria-disabled="true" title="always on"></span>';
      root.appendChild(rowN);

      // Analytics (toggle)
      var rowA = el("div", "consent__row");
      var catA = el("div", "consent__cat");
      catA.innerHTML =
        '<div class="consent__cat-head"><span class="consent__cat-name">Analytics</span></div>' +
        '<p class="consent__cat-desc">Site-usage statistics via <b>Google Analytics 4</b> ' +
        "(data to Google LLC, USA — EU-US DPF). Helps us improve the site.</p>";
      var tog = el("button", "consent__toggle" + (draft.analytics ? " consent__toggle--on" : ""));
      tog.type = "button"; tog.setAttribute("role", "switch");
      tog.setAttribute("aria-checked", draft.analytics ? "true" : "false");
      tog.setAttribute("aria-label", "Analytics");
      tog.appendChild(el("span", "consent__toggle-knob"));
      tog.onclick = function () {
        draft.analytics = !draft.analytics;
        tog.classList.toggle("consent__toggle--on", draft.analytics);
        tog.setAttribute("aria-checked", draft.analytics ? "true" : "false");
      };
      rowA.appendChild(catA); rowA.appendChild(tog);
      root.appendChild(rowA);

      root.appendChild(el("div", null, links));

      var act = el("div", "consent__actions consent__actions--settings");
      var bBack = el("button", "consent__settings-btn", "&larr; Back"); bBack.type = "button";
      bBack.onclick = function () { build("ask", draft); };
      var bRej = el("button", "consent__btn", "Reject all"); bRej.type = "button";
      bRej.onclick = function () { commit({ analytics: false }); };
      var bSave = el("button", "consent__btn", "Save selection"); bSave.type = "button";
      bSave.onclick = function () { commit({ analytics: draft.analytics }); };
      var bAcc = el("button", "consent__btn", "Accept all"); bAcc.type = "button";
      bAcc.onclick = function () { commit({ analytics: true }); };
      act.appendChild(bBack); act.appendChild(bRej); act.appendChild(bSave); act.appendChild(bAcc);
      root.appendChild(act);
    }

    document.body.appendChild(root);
    document.addEventListener("keydown", onKey);
  }

  // public: footer "Cookie settings" link dispatches this to reopen
  window.addEventListener(OPEN_EVENT, function () {
    var rec = readRecord();
    build("settings", { analytics: rec ? rec.categories.analytics : false });
  });
  window.MCD_openConsent = function () { window.dispatchEvent(new Event(OPEN_EVENT)); };

  // boot
  function init() {
    var rec = readRecord();
    if (rec) {
      cats = rec.categories;
      hadConsent = rec.categories.analytics;
      applyConsent(); // a valid record → no banner, honour the stored choice
    } else {
      build("ask", { analytics: false }); // first visit / stale / legacy → ask
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
