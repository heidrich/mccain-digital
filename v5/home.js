/* The start page's behaviour without React - stage 1.
 *
 * The methods themselves (reveal, counters, process rail, pixel stream, demo
 * graph, scrolling to a section) are the page's own, copied verbatim into
 * logic.gen.js by tools/v5build.mjs. This file only supplies what React used
 * to: a `state` object, a `setState` that touches exactly the nodes a change
 * affects instead of re-rendering the page, and the event wiring the markup
 * declares in data-on / data-ref.
 *
 * data-dyn on an element lists the style properties the template computed
 * from state ("box-shadow:navShadow;opacity:progOp"); bind() writes one of
 * them. data-v5-when / data-v5-unless mark nodes that exist only in one state;
 * a flag on <html> switches them (see the stateCss in the build).
 *
 * NOT YET HERE (stage 2): the mega menu, modal, search, AI console and dock,
 * the language switch, the contact and ask forms. Their controls do nothing;
 * the forms are held so none of them pretends to send.
 */
(function () {
  "use strict";
  var Logic = window.V5Logic;
  var dataEl = document.getElementById("v5-data");
  if (!Logic || !dataEl) return;
  var DATA = JSON.parse(dataEl.textContent);
  var html = document.documentElement;

  function bind(scope, key, value) {
    var els = scope.querySelectorAll('[data-dyn*="' + key + '"]');
    for (var i = 0; i < els.length; i++) {
      var pairs = els[i].getAttribute("data-dyn").split(";");
      for (var j = 0; j < pairs.length; j++) {
        var c = pairs[j].indexOf(":");
        if (pairs[j].slice(c + 1) === key) els[i].style.setProperty(pairs[j].slice(0, c), value);
      }
    }
  }
  function handlerName(el, type) {
    var list = (el.getAttribute("data-on") || "").split(" ");
    for (var i = 0; i < list.length; i++) if (list[i].indexOf(type + ":") === 0) return list[i].slice(type.length + 1);
    return null;
  }

  class Page extends Logic {
    constructor() {
      super();
      this.props = {};
      this.state = {
        lang: "de", scrolled: false, consent: "idle", consentOpen: false, consentGo: false, mobileOpen: false,
        faqOpen: 0, heroVisible: true, aiVisible: true, hover: null, tip: null, modal: null, menu: null, dgPick: null, dgHover: null,
      };
      this.rootEl = document.querySelector('[data-ref="rootRef"]') || document.getElementById("dc-root");
      this.mounted = true;
    }

    loc(v) {
      if (Array.isArray(v)) return v.map((x) => this.loc(x));
      if (v && typeof v === "object") {
        if ("de" in v && "en" in v) return v.de;
        var o = {};
        for (var k in v) o[k] = this.loc(v[k]);
        return o;
      }
      return v;
    }
    closeModal() {}
    setHover(id) { this.state.hover = id; }

    setState(patch, cb) {
      if (typeof patch === "function") patch = patch(this.state);
      var changed = {};
      for (var k in patch) {
        if (this.state[k] !== patch[k]) { changed[k] = true; this.state[k] = patch[k]; }
      }
      this.apply(changed);
      if (cb) cb();
    }

    apply(ch) {
      var S = this.state, doc = document;
      if (ch.scrolled) {
        bind(doc, "navShadow", S.scrolled ? "0 1px 0 #E3E8EE, 0 10px 30px -18px rgba(10,37,64,.18)" : "0 1px 0 #E3E8EE");
        bind(doc, "progOp", S.scrolled ? "1" : "0");
      }
      if (ch.faqOpen) {
        var btns = doc.querySelectorAll('[data-on~="click:f.toggle"]');
        for (var i = 0; i < btns.length; i++) {
          var open = S.faqOpen === i, item = btns[i].parentElement;
          btns[i].setAttribute("aria-expanded", open ? "true" : "false");
          bind(item, "f.rows", open ? "1fr" : "0fr");
          bind(item, "f.rot", open ? "rotate(45deg)" : "rotate(0deg)");
          bind(item, "f.iconBg", open ? "#0A2540" : "#F0F3FA");
          bind(item, "f.iconFg", open ? "#fff" : "#0A2540");
        }
      }
      if (ch.consent) html.toggleAttribute("data-v5-consent", S.consent === "ask");
      if (ch.consentOpen) {
        html.toggleAttribute("data-v5-consentopen", S.consentOpen);
        var more = doc.querySelector('[data-on~="click:cs.toggle"]');
        if (more) more.textContent = S.consentOpen ? "Weniger" : "Was genau?";
      }
      if (ch.consentGo) {
        bind(doc, "cs.op", S.consentGo ? "0" : "1");
        bind(doc, "cs.tf", S.consentGo ? "translateY(14px) scale(.97)" : "none");
      }
      if (ch.mobileOpen) html.toggleAttribute("data-v5-mobile", S.mobileOpen);
    }

    /* The mobile menu's actions, in the order renderVals built mobileGroups. */
    mobileAction(el) {
      var P = DATA.pages, groups = Array.prototype.slice.call(this.rootEl.querySelectorAll('[data-screen-label="Mobiles Menü"] [data-on~="click:l.onClick"]'));
      var box = el.parentElement, g = 0, n = 0, cur = null;
      for (var i = 0; i < groups.length; i++) {
        if (groups[i].parentElement !== cur) { if (cur) g++; cur = groups[i].parentElement; n = 0; }
        if (groups[i] === el) break;
        n++;
      }
      var nav = (href) => () => { window.location.href = href; };
      var res = [nav(P.pricing + "#rechner"), () => window.open("https://mccain-digital.com/llms.txt", "_blank", "noopener"),
        () => window.open(P.styleguide, "_blank", "noopener"), this.goHandler("stack"), () => window.open(P.recall, "_blank", "noopener"),
        () => window.open(P.pricing, "_blank", "noopener"), () => window.open(P.cmpWp, "_blank", "noopener"),
        () => window.open(P.cmpRag, "_blank", "noopener"), () => window.open("/marke/", "_blank", "noopener"), () => window.open(P.techMcp, "_blank", "noopener")];
      var table = [
        [nav(P.hub)].concat(DATA.services.map((id) => nav(P[id]))),
        null, // cases open the modal - stage 2; scroll to the work section meanwhile
        [nav(P.studio), this.goHandler("faq"), nav(P.contact), nav(P.legal)],
        null,
        res,
        [nav(P.pricing + "#rechner"), nav(P.pricing), nav(P.contact)],
      ];
      void box;
      if (g === 1) return this.go("work");
      if (g === 3) return this.go("process");
      var fn = table[g] && table[g][n];
      if (fn) fn();
    }

    handlers() {
      var go = (id) => (el, e) => this.goHandler(id)(e);
      return {
        goContact: go("contact"), goAi: go("ai"), goWork: go("work"), goProcess: go("process"), goFaq: go("faq"), goTop: go("top"),
        goStudio: (el, e) => { e.preventDefault(); window.location.href = DATA.pages.studio; },
        toggleMobile: () => this.setState({ mobileOpen: !this.state.mobileOpen, menu: null }),
        "cs.toggle": () => this.setState({ consentOpen: !this.state.consentOpen }),
        "cs.accept": () => {
          this.setState({ consentGo: true });
          try { localStorage.setItem("mcd.consent", "1"); } catch (err) { /* storage blocked: the note simply returns next visit */ }
          clearTimeout(this.consentT);
          this.consentT = setTimeout(() => this.setState({ consent: "done" }), 480);
        },
        "f.toggle": (el) => {
          var all = Array.prototype.slice.call(document.querySelectorAll('[data-on~="click:f.toggle"]'));
          var i = all.indexOf(el);
          this.setState({ faqOpen: this.state.faqOpen === i ? -1 : i });
        },
        "l.onClick": (el, e) => {
          if (el.closest('[data-screen-label="Mobiles Menü"]')) return this.mobileAction(el);
          var href = el.getAttribute("href") || "";
          if (href.charAt(0) === "#") { e.preventDefault(); this.go(href.slice(1) === "work" ? "work" : href.slice(1)); }
        },
      };
    }

    mount() {
      var H = this.handlers();
      document.addEventListener("click", (e) => {
        var el = e.target.closest && e.target.closest("[data-on]");
        while (el && !handlerName(el, "click")) el = el.parentElement && el.parentElement.closest("[data-on]");
        if (!el) return;
        var fn = H[handlerName(el, "click")];
        if (fn) fn(el, e);
      });
      document.addEventListener("keydown", (e) => {
        var el = e.target.closest && e.target.closest('[data-on~="keydown:keyActivate"]');
        if (el && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); el.click(); }
      });
      /* Stage 2 wires these; until then no form may look as if it sent. */
      document.addEventListener("submit", (e) => { if (e.target.closest("[data-on]")) e.preventDefault(); });

      setTimeout(() => this.initFx(), 60);
      try { if (!localStorage.getItem("mcd.consent")) setTimeout(() => this.setState({ consent: "ask" }), 7000); } catch (err) { /* no storage: no note */ }
      try {
        var h = location.hash ? location.hash.slice(1) : "";
        if (h) setTimeout(() => { if (this.rootEl.querySelector("#" + CSS.escape(h))) this.go(h); }, 420);
      } catch (err) { /* malformed hash */ }
      window.addEventListener("scroll", this.onScroll, { passive: true });
      window.addEventListener("pointermove", this.onPointer, { passive: true });
      window.addEventListener("keydown", this.onKey);
      this.initReveal();
      this.startDemo();
      this.onScroll();
      var refs = document.querySelectorAll("[data-ref]");
      for (var i = 0; i < refs.length; i++) {
        var r = refs[i].getAttribute("data-ref");
        if (r === "gradRef") this.gradRef(refs[i]);
        else if (r === "dg.ref") this.dgRef(refs[i]);
      }
    }
  }

  new Page().mount();
})();
