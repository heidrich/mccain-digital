/* Pause the motion nobody is looking at.
 *
 * WHY THIS EXISTS
 * Measured 13.9.2026 on the start page, mobile: 25 CSS animations running at
 * the top of the document and only FIVE of them on screen. Scrolled to the
 * bottom: 31 running, 2 on screen. Every one of the other 29 kept the
 * compositor and the style engine busy for something outside the viewport.
 *
 * Turning ALL CSS animations off - the ceiling of this idea - was worth, on the
 * same page and the same run:
 *
 *     LCP  3.650 -> 2.759 ms      TBT   793 -> 530 ms
 *     main 4.641 -> 3.730 ms      S&L 1.175 -> 941 ms
 *
 * The site's LCP problem is almost entirely "element render delay": the browser
 * knows about the element early and paints it late because the main thread is
 * busy. This is what it is busy with.
 *
 * WHAT IT DOES NOT TOUCH
 * The pixel stream (owner, 13.9.: "der pixel strom muss laufen, alles andere
 * muss pausieren, wenn nicht in sicht"). It is driven by requestAnimationFrame
 * inside pixel-engine.js, not by CSS, so restricting this to CSS animations
 * exempts it by construction rather than by a name check that could go stale.
 *
 * And it never pauses anything a reader can see: an element counts as visible
 * with a generous margin around the viewport, so a section is already moving
 * before it comes into view. Nothing pops in mid-animation.
 *
 * The whole file is inert when the visitor asked for less motion - the site
 * already honours that itself, and a pauser fighting a reduced-motion sheet
 * would only add work.
 */
(function () {
  "use strict";

  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reduced && reduced.matches) return;
  if (!("IntersectionObserver" in window) || !document.getAnimations) return;

  /* Far enough out that motion has started well before it is looked at, small
   * enough that a phone screen's worth of off-screen sections still pauses. */
  var MARGIN = "300px 0px 300px 0px";

  var watched = new WeakSet();
  var visible = new WeakSet();

  var io = new IntersectionObserver(
    function (entries) {
      for (var i = 0; i < entries.length; i++) {
        var el = entries[i].target;
        if (entries[i].isIntersecting) {
          visible.add(el);
          play(el);
        } else {
          visible.delete(el);
          pause(el);
        }
      }
    },
    { rootMargin: MARGIN }
  );

  /* CSS animations only. A Web Animations instance created by script - which is
   * what a component would use for a deliberate, one-off move - has no
   * animationName, and stopping those could strand an element mid-transition. */
  function cssAnimations(el) {
    var out = [];
    var list = el.getAnimations ? el.getAnimations() : [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].animationName && !list[i].__mbDone) out.push(list[i]);
    }
    return out;
  }

  function pause(el) {
    var a = cssAnimations(el);
    for (var i = 0; i < a.length; i++) {
      /* A finite animation that has already ended must not be resumed later as
       * if it were new - remember it and leave it alone from here on. */
      if (a[i].playState === "finished") a[i].__mbDone = true;
      else if (a[i].playState === "running") a[i].pause();
    }
  }

  function play(el) {
    var a = cssAnimations(el);
    for (var i = 0; i < a.length; i++) if (a[i].playState === "paused") a[i].play();
  }

  function scan() {
    var list = document.getAnimations();
    for (var i = 0; i < list.length; i++) {
      var an = list[i];
      if (!an.animationName) continue;
      var el = an.effect && an.effect.target;
      if (!el || el.nodeType !== 1 || el.closest("[data-motion-keep]")) continue;
      if (!watched.has(el)) {
        watched.add(el);
        io.observe(el);
      } else if (!visible.has(el) && an.playState === "running") {
        /* A re-render restarted the animation on an element that is still out
         * of view; the observer will not fire again for it. */
        an.pause();
      }
    }
  }

  /* A tab nobody is looking at is the same case, one level up. */
  document.addEventListener("visibilitychange", function () {
    var list = document.getAnimations();
    for (var i = 0; i < list.length; i++) {
      var an = list[i];
      if (!an.animationName) continue;
      if (document.hidden) {
        if (an.playState === "running") an.pause();
      } else {
        var el = an.effect && an.effect.target;
        if (an.playState === "paused" && el && visible.has(el)) an.play();
      }
    }
  });

  /* React replaces this whole tree when it hydrates and again on every state
   * change, so a single scan at load would cover almost nothing. Debounced,
   * because the mega menu alone rewrites hundreds of nodes at a time. */
  var t = 0;
  function soon() {
    clearTimeout(t);
    t = setTimeout(scan, 250);
  }
  new MutationObserver(soon).observe(document.documentElement, { childList: true, subtree: true });

  scan();
  window.addEventListener("load", soon);
  window.__motionBudget = { scan: scan, watching: function () { return document.getAnimations().length; } };
})();
