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
 * the forms are held so none of them pretends to send. The closed mega menu
 * panel is not rendered at all (content-visibility:hidden until it carries
 * data-v5-open) - stage 2 sets that attribute before it fades the panel in.
 */
(function () {
  "use strict";
  var Logic = window.V5Logic;
  var dataEl = document.getElementById("v5-data");
  if (!Logic || !dataEl) return;
  var DATA = JSON.parse(dataEl.textContent);
  var html = document.documentElement;

  /* WHAT THE BROWSER RENDERS DECIDES WHAT RUNS.
   *
   * The sections below the first screen carry content-visibility (data-cv): the
   * browser skips them until they come near and says so with
   * contentvisibilityautostatechange - once for every deferred block after the
   * first layout, then on every change. That costs no observer target and no
   * measuring. Work that reads layout inside a skipped block (sampling a button
   * for its pixel face, the process rail, the notes' avoid list) would force the
   * browser to lay the block out anyway, so it waits for this signal instead.
   *
   * The listener sits here, at the top of a deferred script, and the first
   * layout can still come first on a slow connection. So mount() also asks
   * checkVisibility() for every block that has not reported yet. Where either
   * API is missing, nothing counts as skipped and everything runs as it did. */
  var cvLive = typeof CSS !== "undefined" && CSS.supports && CSS.supports("content-visibility", "auto") &&
    "oncontentvisibilityautostatechange" in html && typeof html.checkVisibility === "function";
  var shown = new WeakMap(); // [data-cv] block -> true while rendered, false while skipped
  var waiting = []; // [element, fn]: run fn once the element's blocks are rendered
  var watchers = []; // { io, el, on, away }: observer targets inside deferred blocks
  var page = null;

  function isSkipped(el) {
    if (!cvLive) return false;
    for (var n = el.closest("[data-cv]"); n; n = n.parentElement && n.parentElement.closest("[data-cv]")) {
      if (shown.get(n) !== true) return true;
    }
    return false;
  }
  function whenShown(el, fn) {
    if (isSkipped(el)) waiting.push([el, fn]);
    else fn();
  }
  function region(block, isShown) {
    shown.set(block, isShown);
    if (isShown) {
      for (var i = waiting.length - 1; i >= 0; i--) {
        var w = waiting[i];
        if (block.contains(w[0]) && !isSkipped(w[0])) { waiting.splice(i, 1); w[1](); }
      }
    }
    for (var j = 0; j < watchers.length; j++) {
      var o = watchers[j];
      if (!block.contains(o.el)) continue;
      var want = isShown && !isSkipped(o.el);
      if (want === o.on) continue;
      o.on = want;
      if (want) o.io.observe(o.el);
      else {
        o.io.unobserve(o.el);
        if (o.away) o.away();
      }
    }
    if (page) page.onRegion(block, isShown);
  }
  if (cvLive) document.addEventListener("contentvisibilityautostatechange", function (e) { region(e.target, !e.skipped); }, true);

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
    isSkipped(el) { return isSkipped(el); }

    /* An IntersectionObserver target inside a skipped block makes the browser
     * compute that block's style anyway (measured: the stack diagram's 14 logo
     * masks loaded at 125 ms for no other reason). So such a target is handed
     * to its observer while its block is rendered and taken back when not.
     * Leaving an observer's range always reports "not intersecting" before the
     * block is skipped: Chrome renders a block from 150 % of the viewport
     * height away and skips it from there (measured 16.9.2026 at 420, 900 and
     * 915 px tall), and no page observer reaches further than 160 px.
     * `away` answers for the observer while it is not observing: a target in
     * a skipped block is certainly out of view. */
    watchShown(io, el, away) {
      if (!cvLive || !el.closest("[data-cv]")) { io.observe(el); return; }
      var o = { io: io, el: el, on: !isSkipped(el), away: away };
      watchers.push(o);
      if (o.on) io.observe(el);
      else if (away) away();
    }
    unwatch(io, el) {
      io.unobserve(el);
      for (var i = watchers.length - 1; i >= 0; i--) if (watchers[i].io === io && watchers[i].el === el) watchers.splice(i, 1);
    }

    /* A deferred block was rendered or skipped (see the top of this file). */
    onRegion(block, isShown) {
      if (isShown) {
        this.ptStale = true; // the notes' avoid list holds rendered blocks only
        if (block.querySelector("[data-process-steps]")) this.updateProcess();
        if (this.dgStale && this.dgRedo && this.dgEl && block.contains(this.dgEl)) this.dgRedo();
      }
      var q = block.querySelector("[data-demo-q]");
      if (!q) return;
      if (!isShown) {
        clearTimeout(this.demoT);
        this.demoWait = true;
      } else if (this.demoWait && !isSkipped(q)) this.startDemo();
    }

    /* The rail reads the layout of a section far down the page on every scroll
     * frame. While that section is skipped there is nothing to show, and the
     * read would lay it out anyway. */
    updateProcess() {
      var wrap = this.rootEl && this.rootEl.querySelector("[data-process-steps]");
      if (wrap && isSkipped(wrap)) return;
      super.updateProcess();
    }

    /* The typing demo writes two characters every 16 ms. Out of sight that is
     * only cost, so it runs while its block is rendered and stops when not.
     * The copied logic polls every 800 ms until its elements exist - a React
     * render could add them later. This markup is static: no element now means
     * none ever, and the start page has none. */
    startDemo() {
      var q = this.rootEl && this.rootEl.querySelector("[data-demo-q]");
      if (!q) return;
      this.demoWait = isSkipped(q);
      if (this.demoWait) { clearTimeout(this.demoT); return; }
      super.startDemo();
    }

    /* PIXEL HOVER EFFECTS LOAD WHEN SOMEBODY CAN USE THEM.
     *
     * pixel-engine.js is 42 KB to parse (16 KB on the wire) for effects that
     * exist only under a mouse - on a touch screen it returns before doing
     * anything. So it is not in the page head. It loads on the first real mouse
     * movement (a visitor who moves the mouse is about to hover something) or
     * ten seconds after load on a hover device, whichever comes first, and never
     * on touch or with reduced motion. Each button and image is then wired once
     * its block is rendered: sampling a face measures the element, and
     * measuring inside a skipped block lays that block out for nobody. */
    armPixels() {
      if (this.reduced() || !window.matchMedia || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
      var onMove = (e) => {
        if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
        window.removeEventListener("pointermove", onMove);
        this.loadPixels();
      };
      window.addEventListener("pointermove", onMove, { passive: true });
      var later = () => setTimeout(() => {
        if (window.requestIdleCallback) window.requestIdleCallback(() => this.loadPixels(), { timeout: 2000 });
        else this.loadPixels();
      }, 10000);
      if (document.readyState === "complete") later();
      else window.addEventListener("load", later, { once: true });
    }

    /* THE STREAM NOTES EXIST ON A WIDE SCREEN WITH A MOUSE, FROM SECOND TEN.
     * Owner: no notes on phones, at any size. The 112 labels ship inside an
     * inert <template> (see v5build), so a phone never styles, lays out or
     * counts them. Where the page logic's own gate holds - the same media
     * query - they are put in place ten seconds after load, when the notes
     * start, or later if the window grows into the gate. */
    armNotes() {
      var layer = this.rootEl.querySelector("[data-pt-layer]");
      var tpl = layer && layer.querySelector("template[data-v5-pt]");
      if (!tpl || this.reduced() || !window.matchMedia) return;
      var gate = matchMedia("(min-width:1280px) and (pointer:fine)");
      var put = () => {
        if (!gate.matches || !tpl.isConnected) return;
        gate.removeEventListener("change", put);
        layer.appendChild(tpl.content);
        tpl.remove();
        this.ptStale = true;
      };
      var later = () => setTimeout(() => {
        gate.addEventListener("change", put);
        put();
      }, 10000);
      if (document.readyState === "complete") later();
      else window.addEventListener("load", later, { once: true });
    }

    loadPixels() {
      if (this.pxState) return;
      this.pxState = "loading";
      var s = document.createElement("script");
      s.src = "/pixel-engine.js";
      s.async = true;
      s.onload = () => { this.pxState = "ready"; this.wirePixels(); };
      s.onerror = () => { this.pxState = "failed"; };
      document.head.appendChild(s);
    }

    /* THE WORKSHOP COMES LATE, AND ONLY FOR SOMEONE WHO IS HERE.
     *
     * The workshop (v5/dev/) shows the page from the inside: DOM, code, the
     * CSS that applies, the numbers of this very visit. Before it is asked for
     * it costs nothing: no node, no request, no style. Its switch appears ten
     * seconds after the visitor's first real action - a pointer press, a key,
     * the wheel, a touch (owner, 16.9.2026). Moving the mouse is not an action.
     * Lighthouse never does any of these, and the measuring scripts scroll
     * with scrollTo, which fires none of them, so nothing here is ever
     * measured. `?werkstatt` in the URL opens it at once, for showing it. */
    armDevMode() {
      var EVENTS = ["pointerdown", "keydown", "wheel", "touchstart"];
      var onAct = () => {
        for (var i = 0; i < EVENTS.length; i++) window.removeEventListener(EVENTS[i], onAct, true);
        setTimeout(() => this.showDevSwitch(), 10000);
      };
      for (var i = 0; i < EVENTS.length; i++) window.addEventListener(EVENTS[i], onAct, { capture: true, passive: true });
      if (/[?&]werkstatt(=|&|$)/.test(location.search)) {
        for (var j = 0; j < EVENTS.length; j++) window.removeEventListener(EVENTS[j], onAct, true);
        this.showDevSwitch();
        this.loadDev();
      }
    }

    /* The switch and its few rules arrive together, so the page's stylesheet
     * carries nothing for a control most visits never see. The module takes
     * the button over once it runs (open, close, aria-expanded). */
    showDevSwitch() {
      if (document.querySelector("[data-v5-dev-switch]")) return;
      var css = document.createElement("style");
      css.id = "v5-dev-switch-css";
      css.textContent =
        ".v5-dev-switch{position:fixed;right:16px;bottom:calc(16px + env(safe-area-inset-bottom));z-index:70;display:inline-flex;align-items:center;gap:8px;height:36px;padding:0 14px 0 12px;border-radius:999px;background:#0A2540;color:#fff;font:500 11px/1 'JetBrains Mono',monospace;letter-spacing:.08em;text-transform:uppercase;box-shadow:0 0 0 1px rgba(10,37,64,.08),0 10px 30px -12px rgba(10,37,64,.5);cursor:pointer;animation:v5DevIn .5s cubic-bezier(.2,.8,.2,1) both;transition:background .2s,transform .2s}" +
        ".v5-dev-switch::before{content:'';width:8px;height:8px;border-radius:50%;background:linear-gradient(135deg,#FFB46B,#FF5A8C,#C05CFF,#5FC3FF)}" +
        ".v5-dev-switch:hover{background:#0A1F44;transform:translateY(-1px)}" +
        ".v5-dev-switch:focus-visible{outline:2px solid #635BFF;outline-offset:3px}" +
        ".v5-dev-switch[data-state=loading]{opacity:.7;cursor:progress}" +
        ".v5-dev-switch[data-state=failed]{background:#425466}" +
        "@keyframes v5DevIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}" +
        "@media (prefers-reduced-motion:reduce){.v5-dev-switch{animation:none;transition:none}}";
      document.head.appendChild(css);
      var b = document.createElement("button");
      b.type = "button";
      b.className = "v5-dev-switch";
      b.setAttribute("data-v5-dev-switch", "");
      b.setAttribute("data-state", "idle");
      b.setAttribute("aria-haspopup", "dialog");
      b.setAttribute("aria-expanded", "false");
      b.textContent = "Werkstatt";
      b.addEventListener("click", () => this.loadDev());
      document.body.appendChild(b);
    }

    loadDev() {
      if (this.devState) return;
      this.devState = "loading";
      var b = document.querySelector("[data-v5-dev-switch]");
      if (b) b.setAttribute("data-state", "loading");
      var s = document.createElement("script");
      s.type = "module";
      s.src = "/v5/dev/index.js";
      s.onload = () => { this.devState = "ready"; };
      s.onerror = () => {
        /* A dropped connection must not cost the workshop for the rest of the visit: the next click tries again. */
        this.devState = null;
        s.remove();
        if (b) { b.setAttribute("data-state", "failed"); b.textContent = "Werkstatt · erneut versuchen"; }
      };
      document.head.appendChild(s);
    }

    wirePixels() {
      var els = this.rootEl.querySelectorAll("[data-px], [data-px-img]");
      for (var i = 0; i < els.length; i++) {
        let el = els[i];
        /* initPixels() takes a root and asks it for matches. This root answers
         * with the one element, so the page's own wiring stays in charge. */
        whenShown(el, () => this.initPixels({ querySelectorAll: (sel) => (el.matches(sel) ? [el] : []) }));
      }
    }

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
      page = this;
      /* Blocks that reported before this script ran are known; ask the rest. */
      if (cvLive) {
        var blocks = document.querySelectorAll("[data-cv]");
        for (var b = 0; b < blocks.length; b++) {
          if (shown.has(blocks[b])) continue;
          shown.set(blocks[b], Array.prototype.some.call(blocks[b].children, (c) => c.checkVisibility({ contentVisibilityAuto: true })));
        }
      }
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
      this.armPixels();
      this.armNotes();
      this.armDevMode();
    }
  }

  new Page().mount();
})();
