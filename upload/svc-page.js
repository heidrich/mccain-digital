/* ============================================================================
 * Service-page bootstrap (shared by /services/*.html and /contact.html).
 * Lightweight cousin of index.html's inline boot: pixel headlines, reveal on
 * scroll, nav-scrolled state, FAQ accordion, footer year. No hero engine /
 * ticker / pacbar here — those are homepage-only.
 * ========================================================================== */
(function () {
  "use strict";
  function boot() {
    var d = document, w = window;
    var reduced = w.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // footer year
    var y = d.getElementById("year");
    if (y) y.textContent = new Date().getFullYear();

    // nav scrolled bg
    var nav = d.getElementById("nav");
    if (nav) {
      w.addEventListener("scroll", function () {
        nav.classList.toggle("scrolled", w.scrollY > 40);
      }, { passive: true });
    }

    // pixel-assembly headlines (same engine as the homepage)
    if (w.PixelFX && w.PixelFX.headline) {
      var pxInsts = [].map.call(d.querySelectorAll("[data-pixel]"), w.PixelFX.headline);
      var pxIO = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting) {
            var inst = pxInsts.find(function (i) { return i.host === e.target; });
            if (inst) inst.play();
            pxIO.unobserve(e.target);
          }
        });
      }, { threshold: .5, rootMargin: "0px 0px -6% 0px" });
      pxInsts.forEach(function (i) { pxIO.observe(i.host); });

      var pxRT = null;
      w.addEventListener("resize", function () {
        clearTimeout(pxRT);
        pxRT = setTimeout(function () { pxInsts.forEach(function (i) { i.redraw(); }); }, 160);
      });

      // pixel buttons (skip none here — all .btn are safe)
      d.querySelectorAll(".btn").forEach(function (b) { w.PixelFX.button(b); });
    }

    // reveal on scroll
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: .12, rootMargin: "0px 0px -8% 0px" });
    d.querySelectorAll(".reveal").forEach(function (el) { io.observe(el); });

    // FAQ accordion
    d.querySelectorAll(".faq-item").forEach(function (item) {
      var q = item.querySelector(".faq-q");
      var a = item.querySelector(".faq-a");
      if (!q || !a) return;
      q.addEventListener("click", function () {
        var open = item.classList.toggle("open");
        q.setAttribute("aria-expanded", open ? "true" : "false");
        a.style.maxHeight = open ? a.scrollHeight + "px" : "0px";
      });
    });
    // recompute open FAQ heights on resize (content reflow)
    w.addEventListener("resize", function () {
      d.querySelectorAll(".faq-item.open .faq-a").forEach(function (a) {
        a.style.maxHeight = a.scrollHeight + "px";
      });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
