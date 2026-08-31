/* ============================================================
   PixelFX.image — the photo counterpart to the pixel headlines.
   A photo assembles from coloured pixels on first view, then the
   crisp <img> takes over. On fine pointers, hovering re-pixelates
   the photo and the cursor punches a black hole through it (same
   spring physics as the headlines); on leave it settles and hands
   back to the crisp image.
   Classic script, extends window.PixelFX. Reduced motion: inert.
   Touch: assemble only, no hole. The real <img> always stays in
   the DOM (SEO/a11y) — the canvas is presentation only.
   Usage: PixelFX.image(band, { gap, size, zoom })
     band : positioned container with an <img> (object-fit: cover)
     zoom : must match any CSS scale the crisp img carries
   ============================================================ */
(function () {
  "use strict";
  if (!window.PixelFX) window.PixelFX = {};
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var noHover = matchMedia("(hover: none)").matches;
  var DPR = Math.min(window.devicePixelRatio || 1, 2);

  window.PixelFX.image = function (band, opts) {
    if (reduced || !band) return null;
    opts = opts || {};
    var img = band.querySelector("img");
    if (!img) return null;
    var GAP = opts.gap || 6;
    var SIZE = opts.size || GAP - 1.2;
    var ZOOM = opts.zoom || 1;

    var cv = document.createElement("canvas");
    cv.className = "pxi";
    cv.setAttribute("aria-hidden", "true");
    var ctx = cv.getContext("2d");
    band.appendChild(cv);

    var parts = [], W = 0, H = 0, raf = null, t0 = null;
    var state = "wait";            // wait | assemble | crisp | hole | settle
    var mx = -9999, my = -9999;

    function build() {
      var r = band.getBoundingClientRect();
      W = Math.ceil(r.width); H = Math.ceil(r.height);
      if (W < 8 || H < 8 || !img.naturalWidth) return false;
      cv.width = W * DPR; cv.height = H * DPR;
      cv.style.width = W + "px"; cv.style.height = H + "px";
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      // sample at grid resolution: draw the cover-cropped image onto a
      // tiny offscreen (1 texel per grid cell) — cheap and exact
      var ow = Math.max(1, Math.round(W / GAP)), oh = Math.max(1, Math.round(H / GAP));
      var off = document.createElement("canvas");
      off.width = ow; off.height = oh;
      var octx = off.getContext("2d", { willReadFrequently: true });
      var s = Math.max(W / img.naturalWidth, H / img.naturalHeight) * ZOOM;
      var dw = img.naturalWidth * s / GAP, dh = img.naturalHeight * s / GAP;
      octx.drawImage(img, (ow - dw) / 2, (oh - dh) / 2, dw, dh);
      var data;
      try { data = octx.getImageData(0, 0, ow, oh).data; } catch (e) { return false; }
      parts = [];
      for (var y = 0; y < oh; y++) {
        for (var x = 0; x < ow; x++) {
          var i = (y * ow + x) * 4;
          if (data[i + 3] < 8) continue;
          var hx = x * GAP, hy = y * GAP;
          parts.push({
            hx: hx, hy: hy, cx: hx, cy: hy, vx: 0, vy: 0,
            sx: hx + (Math.random() - .5) * W * .5,
            sy: hy + (Math.random() - .5) * H * 2 - H * .5,
            d: Math.random() * .5,
            col: "rgb(" + data[i] + "," + data[i + 1] + "," + data[i + 2] + ")"
          });
        }
      }
      return parts.length > 0;
    }

    function showCanvas() { cv.style.opacity = "1"; img.style.opacity = "0"; }
    function showImg() { cv.style.opacity = "0"; img.style.opacity = "1"; }

    function assembleFrame(t) {
      if (!t0) t0 = t;
      var el = (t - t0) / 1000, done = true;
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        var local = Math.max(0, Math.min(1, (el - p.d) / .9));
        if (local < 1) done = false;
        var e = 1 - Math.pow(1 - local, 3);
        ctx.globalAlpha = Math.min(1, local * 1.6);
        ctx.fillStyle = p.col;
        ctx.fillRect(p.sx + (p.hx - p.sx) * e, p.sy + (p.hy - p.sy) * e, SIZE, SIZE);
      }
      ctx.globalAlpha = 1;
      if (!done) { raf = requestAnimationFrame(assembleFrame); return; }
      for (var j = 0; j < parts.length; j++) { parts[j].cx = parts[j].hx; parts[j].cy = parts[j].hy; }
      raf = null;
      state = "crisp";
      showImg();
    }

    var R = 64, FORCE = 2.6, SPRING = .1, DAMP = .86;
    function holeFrame() {
      ctx.clearRect(0, 0, W, H);
      var moving = false;
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        if (state === "hole") {
          var dx = p.cx - mx, dy = p.cy - my, d2 = dx * dx + dy * dy;
          if (d2 < R * R) {
            var dd = Math.sqrt(d2) || .001, f = (1 - dd / R) * FORCE;
            p.vx += dx / dd * f; p.vy += dy / dd * f;
          }
        }
        p.vx += (p.hx - p.cx) * SPRING; p.vy += (p.hy - p.cy) * SPRING;
        p.vx *= DAMP; p.vy *= DAMP;
        p.cx += p.vx; p.cy += p.vy;
        if (Math.abs(p.vx) + Math.abs(p.vy) > .06) moving = true;
        ctx.fillStyle = p.col;
        ctx.fillRect(p.cx, p.cy, SIZE, SIZE);
      }
      if (state === "hole" || moving) { raf = requestAnimationFrame(holeFrame); return; }
      raf = null;
      if (state === "settle") { state = "crisp"; showImg(); }
    }

    function enterHole(e) {
      if (state !== "crisp" && state !== "settle") return;
      var r = cv.getBoundingClientRect();
      mx = e.clientX - r.left; my = e.clientY - r.top;
      state = "hole";
      showCanvas();
      if (!raf) raf = requestAnimationFrame(holeFrame);
    }

    if (!noHover) {
      band.addEventListener("pointerenter", function (e) {
        if (e.pointerType === "mouse") enterHole(e);
      });
      band.addEventListener("pointermove", function (e) {
        var r = cv.getBoundingClientRect();
        mx = e.clientX - r.left; my = e.clientY - r.top;
        if (state === "hole" && !raf) raf = requestAnimationFrame(holeFrame);
      });
      band.addEventListener("pointerleave", function () {
        mx = -9999; my = -9999;
        if (state === "hole") {
          state = "settle";
          if (!raf) raf = requestAnimationFrame(holeFrame);
        }
      });
    }

    function start() {
      if (state !== "wait") return;
      if (!build()) { state = "crisp"; showImg(); return; }
      state = "assemble";
      showCanvas();
      t0 = null;
      raf = requestAnimationFrame(assembleFrame);
    }

    // hidden until first view, then assemble
    img.style.opacity = "0";
    img.style.transition = "opacity .35s ease";
    img.addEventListener("error", function () { state = "crisp"; showImg(); }, { once: true });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.disconnect();
        if (img.complete && img.naturalWidth) start();
        else img.addEventListener("load", start, { once: true });
      });
    }, { threshold: .3 });
    io.observe(band);

    var rt = null;
    addEventListener("resize", function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        if (state === "wait") return;
        cancelAnimationFrame(raf); raf = null;
        if (build()) { state = "crisp"; showImg(); }
      }, 220);
    });

    function replay() {
      // slider hook: re-run the assemble choreography on demand
      if (state === "assemble") return;
      cancelAnimationFrame(raf); raf = null;
      state = "wait"; t0 = null;
      if (img.complete && img.naturalWidth) start();
      else img.addEventListener("load", start, { once: true });
    }

    return { band: band, cv: cv, replay: replay };
  };
})();
