/* ============================================================================
 * reveal.js - scroll reveal, count-up and off-screen animation gate for the
 * static McCain Digital subpages.
 *
 * WHY THIS FILE EXISTS
 * The start page is a React component; its motion lives in
 * Component.initReveal() / runCounters() / initFlow(). The subpages are plain
 * HTML on purpose (two shipped outages were hydration defects, and the
 * subpages score 100/100/100 against the start page's 68). This module is
 * those three methods, ported, with nothing added that the start page does not
 * already do.
 *
 * PROVENANCE - every constant below is read off the reference export
 * mccain-design-system/reference/McCain Digital v2.dc.html, the
 * <script type="text/x-dc" data-dc-script> block:
 *
 *   initReveal()   threshold .08, rootMargin '0px 0px -10% 0px',
 *                  dist 18 / 26 / 34, dur .7 / .9,
 *                  opacity  cubic-bezier(.2,.8,.2,1) over dur * 0.8
 *                  transform cubic-bezier(.16,1,.3,1) over dur
 *   runCounters()  1400 ms, easeOutCubic 1-(1-p)^3, prefix/from/to/suffix
 *   initFlow()     animationPlayState on [data-anim], rootMargin '160px 0px'
 *   stagger        services/pricing/voices (i * 0.08), cases (i * 0.10)
 *
 * Two deliberate improvements over the start page, both taken from the
 * PREVIOUS site's archive/site-apache/upload/svc-page.js, which got them right:
 *
 *   1. counters get their OWN observer at a higher threshold (.6 on the number
 *      itself). The start page fires the count off the same .08 reveal
 *      observer, so a tall stat row starts counting while still mostly below
 *      the fold.
 *   2. font-variant-numeric: tabular-nums on every counting element. Without
 *      it the number reflows on every frame while it counts - the start page
 *      has this bug today.
 *
 * And one correction the start page needs but cannot express: an explicit
 * reduced-motion branch in the counter. On the start page that path is
 * unreachable by accident (the reveal observer is never armed, so the counter
 * is never called). Here the counter is independent, so it says so out loud.
 *
 * ---------------------------------------------------------------------------
 * WIRING - three pieces, all required.
 *
 * (1) In <head>, BEFORE the stylesheet. 195 bytes, inline, no dependency.
 *     It hides the reveal targets before first paint so a deferred script
 *     cannot cause a visible -> hidden -> visible flash, and it un-hides them
 *     after 2.5 s so a missing or broken reveal.js can never leave the page
 *     blank. That failure mode is exactly what the old site shipped.
 *
 *     <script>(function(d){if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 *     var c=d.documentElement.classList;c.add('mcd-pre');
 *     setTimeout(function(){c.remove('mcd-pre')},2500)})(document)</script>
 *
 * (2) In the page CSS, one rule:
 *
 *     .mcd-pre [data-reveal]{opacity:0}
 *
 *     Only opacity. The transform is per-element and JS owns it; with opacity
 *     already 0 the transform snapping in is invisible.
 *
 * (3) <script src="reveal.js" defer></script> before </body>.
 *
 * NO-JS AND REDUCED MOTION
 * Without JS the .mcd-pre class is never added, so every element is visible
 * and the page is complete. Under prefers-reduced-motion the class is never
 * added either, nothing is hidden, nothing is observed, and counters print
 * their final value immediately. The markup must therefore always ship the
 * FINAL text inside a [data-count] span - the start page does this
 * (display = prefix + to + suffix) and so must the generator.
 *
 * MARKUP
 *   <div data-reveal>                       default: 26px / .7s
 *   <div data-reveal><h2>...</h2></div>     head:    18px / .7s
 *   <div data-reveal><article>...</article> tile:    34px / .9s
 *   <div data-reveal="0.16">                explicit delay in SECONDS
 *   <div data-reveal-group>                 auto-stagger direct [data-reveal]
 *   <div data-reveal-group data-reveal-step="0.10">
 *
 *   <span data-count="100" data-from="0" data-prefix="4 x " data-suffix="">100</span>
 *   <span data-count="4" data-prefix="2-" data-suffix=" Wo.">4</span>
 *   <span data-count="4.8" data-dec="1" data-suffix=" s">4,8 s</span>
 *
 *   <div data-flow><div data-anim style="animation: flowA 26s ..."></div></div>
 * ========================================================================== */
(function () {
  'use strict';

  /* ----------------------------------------------------------------- config */
  const CFG = {
    /* initReveal(): IntersectionObserver options, verbatim */
    threshold: 0.08,
    rootMargin: '0px 0px -10% 0px',

    /* initReveal(): the three shapes */
    distHead: 18,
    distBody: 26,
    distTile: 34,
    durBody: 0.7,
    durTile: 0.9,
    opacityRatio: 0.8,              // opacity duration = transform duration * .8
    easeOpacity: 'cubic-bezier(.2,.8,.2,1)',
    easeTransform: 'cubic-bezier(.16,1,.3,1)',

    /* Stagger. The start page authors the delay per item and never has a group
       longer than 4, so it needs no cap. Subpages do: content.json holds
       useCases up to 7, caps up to 7, stack up to 17. Six steps (0.48 s) is
       the longest delay the start page's own rhythm ever reaches. */
    stagger: 0.08,
    staggerCap: 6,

    /* runCounters() */
    countDur: 1400,
    countThreshold: 0.6,            // svc-page.js:75 - the number, not the group

    /* initFlow() */
    flowMargin: '160px 0px',

    /* the pre-paint class set by the head snippet */
    preClass: 'mcd-pre'
  };

  const doc = document;
  const root = doc.documentElement;
  const supported = typeof IntersectionObserver === 'function';
  const reduced = typeof matchMedia === 'function' &&
                  matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* German is the site default; a decimal comma is not optional here. */
  const decimalSep = (root.lang || 'de').slice(0, 2) === 'de' ? ',' : '.';

  let revealIo = null;
  let countIo = null;
  let flowIo = null;

  /* ----------------------------------------------------------------- reveal */

  /* dc_script.js initReveal():
       isHead = :scope > h2, :scope > h3, :scope > div > h2
       isTile = :scope > article                                             */
  function shapeOf(el) {
    if (el.querySelector(':scope > article')) {
      return { dist: CFG.distTile, dur: CFG.durTile };
    }
    if (el.querySelector(':scope > h2, :scope > h3, :scope > div > h2')) {
      return { dist: CFG.distHead, dur: CFG.durBody };
    }
    return { dist: CFG.distBody, dur: CFG.durBody };
  }

  /* An authored delay wins. Otherwise, if the element sits inside a
     [data-reveal-group], its index within that group times the step, capped. */
  function delayOf(el) {
    const own = el.getAttribute('data-reveal');
    if (own !== null && own !== '') {
      const n = parseFloat(own);
      return isFinite(n) ? n : 0;
    }
    const group = el.parentElement ? el.parentElement.closest('[data-reveal-group]') : null;
    if (!group) { return 0; }
    let step = parseFloat(group.getAttribute('data-reveal-step'));
    if (!isFinite(step)) { step = CFG.stagger; }
    const sibs = group.querySelectorAll('[data-reveal]');
    const i = Array.prototype.indexOf.call(sibs, el);
    if (i < 0) { return 0; }
    return Math.min(i, CFG.staggerCap) * step;
  }

  function onReveal(entries) {
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      if (!e.isIntersecting) { continue; }
      const el = e.target;
      el.style.opacity = '1';
      el.style.transform = 'none';
      revealIo.unobserve(el);
    }
  }

  function wireReveal(scope) {
    const els = scope.querySelectorAll('[data-reveal]:not([data-rv])');
    if (!els.length) { return; }

    if (!revealIo && !reduced && supported) {
      revealIo = new IntersectionObserver(onReveal, {
        threshold: CFG.threshold,
        rootMargin: CFG.rootMargin
      });
    }

    for (let i = 0; i < els.length; i++) {
      const el = els[i];
      el.setAttribute('data-rv', '1');
      /* Reduced motion, no IntersectionObserver, or a broken boot: the element
         is left exactly as authored. It is never hidden, so it can never be
         stranded invisible. That inversion is the one thing the start page does
         better than the previous site, and it is the reason it is here. */
      if (reduced || !revealIo) { continue; }

      const s = shapeOf(el);
      const d = delayOf(el);
      el.style.opacity = '0';
      el.style.transform = 'translateY(' + s.dist + 'px)';
      el.style.transition =
        'opacity ' + (s.dur * CFG.opacityRatio).toFixed(2) + 's ' + CFG.easeOpacity + ' ' + d + 's, ' +
        'transform ' + s.dur + 's ' + CFG.easeTransform + ' ' + d + 's';
      revealIo.observe(el);
    }
  }

  /* --------------------------------------------------------------- count-up */

  function format(v, dec, pre, suf) {
    const s = dec > 0 ? v.toFixed(dec).replace('.', decimalSep) : String(Math.round(v));
    return pre + s + suf;
  }

  function runCount(el) {
    const to = parseFloat(el.getAttribute('data-count'));
    let from = parseFloat(el.getAttribute('data-from') || '0');
    let dec = parseInt(el.getAttribute('data-dec') || '0', 10);
    const pre = el.getAttribute('data-prefix') || '';
    const suf = el.getAttribute('data-suffix') || '';
    if (!isFinite(to)) { return; }
    if (!isFinite(from)) { from = 0; }
    if (!isFinite(dec) || dec < 0) { dec = 0; }

    /* Explicit, unlike the start page. Also covers the "0" stats, where there
       is nothing to count and an animation would only be a flicker. */
    if (reduced || from === to) {
      el.textContent = format(to, dec, pre, suf);
      return;
    }

    const t0 = performance.now();
    const step = function (now) {
      const p = Math.min(1, (now - t0) / CFG.countDur);
      const e = 1 - Math.pow(1 - p, 3);               // easeOutCubic
      el.textContent = format(from + (to - from) * e, dec, pre, suf);
      if (p < 1) { requestAnimationFrame(step); }
    };
    requestAnimationFrame(step);
  }

  function onCount(entries) {
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      if (!e.isIntersecting) { continue; }
      countIo.unobserve(e.target);
      runCount(e.target);
    }
  }

  function wireCounts(scope) {
    const els = scope.querySelectorAll('[data-count]:not([data-cv])');
    if (!els.length) { return; }

    if (!countIo && !reduced && supported) {
      countIo = new IntersectionObserver(onCount, { threshold: CFG.countThreshold });
    }

    for (let i = 0; i < els.length; i++) {
      const el = els[i];
      el.setAttribute('data-cv', '1');
      /* The start page omits this, so its numbers reflow on every frame while
         they count. svc-page.js had it (styles.css .svc-metric .sm-v .count). */
      el.style.fontVariantNumeric = 'tabular-nums';
      if (reduced || !countIo) { runCount(el); continue; }
      countIo.observe(el);
    }
  }

  /* -------------------------------------------------------------- flow gate */
  /* initFlow(): a gradient bloom is two infinite keyframe animations per card.
     Off screen they must not run. Ship this with any bloom, not after it. */

  function onFlow(entries) {
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      const anims = e.target.querySelectorAll('[data-anim]');
      for (let k = 0; k < anims.length; k++) {
        anims[k].style.animationPlayState = e.isIntersecting ? 'running' : 'paused';
      }
    }
  }

  function wireFlow(scope) {
    const els = scope.querySelectorAll('[data-flow]:not([data-fl])');
    if (!els.length || !supported) { return; }
    if (!flowIo) {
      flowIo = new IntersectionObserver(onFlow, { rootMargin: CFG.flowMargin });
    }
    for (let i = 0; i < els.length; i++) {
      els[i].setAttribute('data-fl', '1');
      flowIo.observe(els[i]);
    }
  }

  /* ------------------------------------------------------------------- boot */

  /* Call again for anything injected later, exactly as the start page calls
     initReveal() from every componentDidUpdate. Idempotent: the data-rv /
     data-cv / data-fl markers make a second pass a no-op. */
  function scan(scope) {
    const s = scope || doc;
    wireReveal(s);
    wireCounts(s);
    wireFlow(s);
  }

  function boot() {
    scan(doc);
    /* The inline head snippet hid [data-reveal] to stop the pre-paint flash.
       Per-element inline styles now own that state, so hand it back. Done in
       the same task as the wiring, so there is no frame in between. */
    root.classList.remove(CFG.preClass);
  }

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.MCDReveal = { scan: scan, config: CFG, reduced: reduced };
})();
