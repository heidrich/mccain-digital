/* ============================================================
   McCain Digital — shared pixel engine.
   One physics core, three consumers:
     PixelFX.headline(host)  text assembles from pixels, stays as
                             pixels, cursor punches a black hole
     PixelFX.button(el)      hover disintegrates the button face,
                             click vacuums the pixels back in and
                             then fires the action
     PixelFX.morph(tile)     tile content dissolves into pixels and
                             reassembles as the other face
   No build step — classic script, exposes window.PixelFX.
   Real text/DOM always stays in the document (SEO / a11y); the
   canvas is presentation only. Reduced motion and touch devices
   get the native, effect-free behaviour.
   ============================================================ */
(function () {
  "use strict";

  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var noHover = matchMedia("(hover: none)").matches;
  var DPR = Math.min(window.devicePixelRatio || 1, 3);
  var ACC = "#f5c518", PAPER = "#ece7dd";

  // only ONE autonomous black-hole pass at a time, page-wide — several
  // headlines roaming at once would feel overloaded (owner call)
  var roamLock = false;

  function rgbStr(c) { return "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")"; }

  /* ---------- DOM-node rasterizer (for tiles) ----------
     Serializes a node with inlined computed styles into an SVG
     foreignObject, draws it to a canvas and returns the ImageData.
     Only system fonts are used on this site, so no font embedding
     is needed. visibility is forced to visible so hidden back
     faces rasterize correctly. */
  function inlineStyles(src, dst) {
    var cs = getComputedStyle(src);
    var css = "";
    for (var i = 0; i < cs.length; i++) {
      var prop = cs[i];
      css += prop + ":" + cs.getPropertyValue(prop) + ";";
    }
    dst.setAttribute("style", css + "visibility:visible;");
    for (var c = 0; c < src.children.length; c++) {
      if (dst.children[c]) inlineStyles(src.children[c], dst.children[c]);
    }
  }

  function rasterizeNode(el, w, h, cb) {
    var clone = el.cloneNode(true);
    inlineStyles(el, clone);
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '">' +
      '<foreignObject width="100%" height="100%">' +
      '<div xmlns="http://www.w3.org/1999/xhtml">' + new XMLSerializer().serializeToString(clone) + "</div>" +
      "</foreignObject></svg>";
    var img = new Image();
    img.onload = function () {
      try {
        var off = document.createElement("canvas");
        off.width = Math.ceil(w * DPR); off.height = Math.ceil(h * DPR);
        var octx = off.getContext("2d");
        octx.scale(DPR, DPR);
        octx.drawImage(img, 0, 0, w, h);
        cb(octx.getImageData(0, 0, off.width, off.height), off.width);
      } catch (err) { cb(null, 0); }
    };
    img.onerror = function () { cb(null, 0); };
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  /* sample an ImageData into colored particles */
  function sampleField(img, imgW, w, h, gap, alphaMin) {
    var parts = [];
    for (var y = 0; y < h; y += gap) {
      for (var x = 0; x < w; x += gap) {
        var px = Math.floor(x * DPR), py = Math.floor(y * DPR);
        var idx = (py * imgW + px) * 4;
        var a = img.data[idx + 3];
        if (a > alphaMin) {
          parts.push({
            hx: x, hy: y, x: x, y: y, vx: 0, vy: 0,
            color: [img.data[idx], img.data[idx + 1], img.data[idx + 2]],
            alpha: a / 255
          });
        }
      }
    }
    return parts;
  }

  /* ============================================================
     1) PIXEL HEADLINES — port of the proven engine, finer pixels.
        Tunable per host via data-gap / data-size.
     ============================================================ */
  function headline(host) {
    var GAP = parseFloat(host.dataset.gap) || 2.4;
    var SIZE = parseFloat(host.dataset.size) || 1.7;

    var txt = document.createElement("span");
    txt.className = "ph-txt";
    while (host.firstChild) txt.appendChild(host.firstChild);
    host.appendChild(txt);
    var cv = document.createElement("canvas"), ctx = cv.getContext("2d");
    cv.setAttribute("aria-hidden", "true");
    host.appendChild(cv);

    var parts = [], raf = null, iraf = null, start = null;
    var W = 0, H = 0, played = false, interactive = false;
    var mouseX = -9999, mouseY = -9999;

    function initPart(x, y, col) {
      return {
        tx: x, ty: y,
        x: x + (Math.random() - .5) * W * 0.7,
        y: y + (Math.random() - .5) * H * 4 - H,
        cx: x, cy: y, vx: 0, vy: 0,
        d: Math.random() * 0.75,
        col: col, flash: Math.random() < 0.16
      };
    }

    /* primary path: rasterize the real DOM text (foreignObject) — exact
       letter-spacing, wrapping and per-span colors, so the pixel field
       can never run wider than the text box (the old fillText sampler
       ignored letter-spacing and clipped on mobile) */
    function build(done) {
      var r = txt.getBoundingClientRect();
      W = Math.ceil(r.width); H = Math.ceil(r.height);
      if (W < 2 || H < 2) { done(false); return; }
      cv.style.width = W + "px"; cv.style.height = H + "px";
      cv.width = W * DPR; cv.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.clearRect(0, 0, W, H);
      rasterizeNode(txt, W, H, function (img, imgW) {
        if (img) {
          var sampled = sampleField(img, imgW, W, H, GAP, 120);
          if (sampled.length) {
            parts = sampled.map(function (s) { return initPart(s.hx, s.hy, rgbStr(s.color)); });
            done(true);
            return;
          }
        }
        done(legacyBuild());
      });
    }

    /* fallback: draw the text onto the canvas ourselves (no wrap support) */
    function legacyBuild() {
      var cs = getComputedStyle(txt);
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#fff"; ctx.textBaseline = "alphabetic";
      if ("letterSpacing" in ctx) ctx.letterSpacing = cs.letterSpacing;
      var fontPx = parseFloat(cs.fontSize);
      var penX = 0, baseline = H - (H - fontPx) / 2 - fontPx * 0.21;
      var segs = [];
      txt.childNodes.forEach(function (n) {
        var t = n.textContent;
        var isAcc = n.nodeType === 1 && n.classList && n.classList.contains("accent");
        ctx.font = cs.fontWeight + " " + cs.fontSize + " " + cs.fontFamily;
        var wd = ctx.measureText(t).width;
        ctx.fillText(t, penX, baseline);
        segs.push({ x0: penX, x1: penX + wd, accent: isAcc });
        penX += wd;
      });
      var img = ctx.getImageData(0, 0, cv.width, cv.height).data;
      ctx.clearRect(0, 0, W, H);
      parts = [];
      for (var y = 0; y < H; y += GAP) {
        for (var x = 0; x < W; x += GAP) {
          var px = Math.floor(x * DPR), py = Math.floor(y * DPR);
          if (img[(py * cv.width + px) * 4 + 3] > 128) {
            // snap pixels just past a measured edge to the nearest segment —
            // fixes stray paper pixels at the end of an accent word
            var seg = segs.find(function (s) { return x >= s.x0 && x < s.x1; });
            if (!seg && segs.length) {
              seg = segs.reduce(function (best, s) {
                var dc = x < s.x0 ? s.x0 - x : x - s.x1;
                return (!best || dc < best.dc) ? { s: s, dc: dc } : best;
              }, null).s;
            }
            parts.push(initPart(x, y, (seg && seg.accent) ? ACC : PAPER));
          }
        }
      }
      return parts.length > 0;
    }

    function frame(t) {
      if (!start) start = t;
      var el = (t - start) / 1000, done = true;
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        var local = Math.max(0, Math.min(1, (el - p.d) / 1.0));
        var e = 1 - Math.pow(1 - local, 3);
        var x = p.x + (p.tx - p.x) * e, y = p.y + (p.ty - p.y) * e;
        if (local < 1) done = false;
        // steep alpha ramp so the canvas never shows as a dim haze
        ctx.globalAlpha = local * local * local;
        ctx.fillStyle = (p.flash && local < .82) ? ACC : p.col;
        ctx.fillRect(x, y, SIZE, SIZE);
      }
      ctx.globalAlpha = 1;
      if (!done) raf = requestAnimationFrame(frame); else settle();
    }

    function drawStatic() {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        ctx.fillStyle = p.col;
        ctx.fillRect(p.cx, p.cy, SIZE, SIZE);
      }
    }

    function settle() {
      for (var i = 0; i < parts.length; i++) { var p = parts[i]; p.cx = p.tx; p.cy = p.ty; p.vx = 0; p.vy = 0; }
      drawStatic();
      interactive = true;
      cv.style.pointerEvents = "auto";
    }

    var R = 46, FORCE = 2.4, SPRING = 0.10, DAMP = 0.86;
    var hVel = 0, onScreen = false;

    /* autonomous pass: 5s after the headline is in view, the black hole
       drifts once through the text on its own — random entry side, random
       lane, gentle pace — then rests ~30s before the next pass. A real
       pointer always wins: the hole zooms over to the mouse and behaves
       as usual. Desktop only (no hover, no show). */
    var roam = null, roamTimer = null, hadPass = false, zoomIn = false;
    var holeX = -9999, holeY = -9999;
    function schedulePass(delay) {
      if (reduced || noHover) return;
      clearTimeout(roamTimer);
      roamTimer = setTimeout(beginPass, delay);
    }
    function nextPassDelay() { return 26000 + Math.random() * 12000; }
    function killPass() { if (roam) { roam = null; roamLock = false; } }
    function beginPass() {
      if (!onScreen) return;                              // re-armed when visible again
      if (!interactive) { schedulePass(3000); return; }   // still assembling
      if (mouseX > -9000) { schedulePass(9000); return; } // user is playing — yield
      if (roamLock) { schedulePass(6000 + Math.random() * 6000); return; }
      roamLock = true;
      var ltr = Math.random() < 0.5;
      roam = {
        dir: ltr ? 1 : -1,
        x: ltr ? -R * 0.6 : W + R * 0.6,
        yc: H * (0.25 + Math.random() * 0.5),
        spd: Math.max(1.0, W / 260) * (0.8 + Math.random() * 0.4),
        ph: Math.random() * Math.PI * 2,
        amp: H * (0.08 + Math.random() * 0.22),
        t: 0
      };
      hadPass = true;
      kick();
    }

    function physics() {
      var moving = false;
      // resolve the hole: live pointer wins, otherwise the roaming pass
      if (mouseX > -9000) {
        if (zoomIn) {
          holeX += (mouseX - holeX) * 0.22; holeY += (mouseY - holeY) * 0.22;
          if (Math.abs(mouseX - holeX) + Math.abs(mouseY - holeY) < 3) zoomIn = false;
        } else { holeX = mouseX; holeY = mouseY; }
      } else if (roam) {
        roam.t++;
        roam.x += roam.dir * roam.spd;
        holeX = roam.x;
        holeY = roam.yc + Math.sin(roam.t * 0.025 + roam.ph) * roam.amp;
        if (roam.x < -R || roam.x > W + R) {
          killPass();
          schedulePass(nextPassDelay());
        }
      } else { holeX = -9999; holeY = -9999; }

      ctx.clearRect(0, 0, W, H);
      var shear = Math.abs(hVel) > 0.4 ? hVel * 0.012 : 0;
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        var dx = p.cx - holeX, dy = p.cy - holeY, dist2 = dx * dx + dy * dy;
        if (dist2 < R * R) {
          var dist = Math.sqrt(dist2) || 0.001, fr = (1 - dist / R) * FORCE;
          p.vx += (dx / dist) * fr; p.vy += (dy / dist) * fr;
        }
        // scroll-velocity smear: rows shear like a CRT tear, spring pulls back
        if (shear) p.vx += shear * (p.ty / H);
        p.vx += (p.tx - p.cx) * SPRING; p.vy += (p.ty - p.cy) * SPRING;
        p.vx *= DAMP; p.vy *= DAMP; p.cx += p.vx; p.cy += p.vy;
        if (Math.abs(p.vx) + Math.abs(p.vy) > 0.05 ||
            Math.abs(p.tx - p.cx) + Math.abs(p.ty - p.cy) > 0.5) moving = true;
        ctx.fillStyle = p.col;
        ctx.fillRect(p.cx, p.cy, SIZE, SIZE);
      }
      if (moving || mouseX > -9000 || roam || Math.abs(hVel) > 0.4) iraf = requestAnimationFrame(physics);
      else { iraf = null; drawStatic(); }
    }
    function kick() { if (interactive && !iraf && !reduced) iraf = requestAnimationFrame(physics); }

    cv.addEventListener("pointermove", function (e) {
      var r = cv.getBoundingClientRect(); mouseX = e.clientX - r.left; mouseY = e.clientY - r.top;
      if (roam) {
        // mid-pass takeover: the hole zooms from its pass position to the mouse
        holeX = roam.x; holeY = roam.yc; zoomIn = true;
        killPass();
        schedulePass(nextPassDelay());
      }
      kick();
    });
    cv.addEventListener("pointerleave", function () { mouseX = -9999; mouseY = -9999; zoomIn = false; kick(); });

    // visibility gate so off-screen headlines never wake for scroll smear;
    // it also arms/disarms the autonomous pass
    new IntersectionObserver(function (es) {
      onScreen = es[0].isIntersecting;
      if (onScreen) {
        schedulePass(hadPass ? nextPassDelay() : 5000 + Math.random() * 2000);
      } else {
        clearTimeout(roamTimer);
        killPass();
      }
    }, { threshold: 0 }).observe(host);
    velSubs.push(function (v) {
      hVel = v;
      if (onScreen && Math.abs(v) > 2) kick();
    });

    var buildSeq = 0;
    function play() {
      cancelAnimationFrame(raf); cancelAnimationFrame(iraf); iraf = null;
      interactive = false; start = null; killPass(); zoomIn = false;
      cv.style.pointerEvents = "none"; cv.style.display = "block";
      host.classList.add("assembling");
      var seq = ++buildSeq;
      build(function (ok) {
        if (seq !== buildSeq) return;          // superseded by a newer play
        if (!ok) { host.classList.remove("assembling"); return; }
        played = true;
        if (reduced) { settle(); return; }
        raf = requestAnimationFrame(frame);
      });
    }
    function redraw() {
      if (!played) return;
      cancelAnimationFrame(raf); cancelAnimationFrame(iraf); iraf = null;
      interactive = false; killPass(); zoomIn = false; host.classList.add("assembling");
      var seq = ++buildSeq;
      build(function (ok) { if (seq === buildSeq && ok) settle(); });
    }
    return { play: play, redraw: redraw, host: host };
  }

  /* ============================================================
     2) PIXEL BUTTONS — hover: the black hole tears the whole face
        into pixels that scatter and float; click: a vacuum drags
        every pixel into the cursor, then the action fires.
        Keyboard, touch and reduced-motion use the native button.
     ============================================================ */
  function button(btn) {
    if (noHover || reduced) return null;
    var GAP = 3.0, SIZE = 2.2, M = 64;   // M: flight room around the face

    var cv = document.createElement("canvas");
    cv.className = "pxc";
    cv.setAttribute("aria-hidden", "true");
    var ctx = cv.getContext("2d");
    btn.appendChild(cv);
    btn.classList.add("pxbtn");

    var parts = [], raf = null;
    var W = 0, H = 0, CW = 0, CH = 0;
    var mouseX = -9999, mouseY = -9999;
    var state = "idle";                   // idle | chaos | vacuum | reform
    var vac = null;                       // { x, y, t0, fired }
    var reformT0 = 0;                     // reform start, for the snap cap

    function build() {
      var r = btn.getBoundingClientRect();
      W = Math.ceil(r.width); H = Math.ceil(r.height);
      if (W < 4 || H < 4) return false;
      CW = W + M * 2; CH = H + M * 2;
      cv.style.width = CW + "px"; cv.style.height = CH + "px";
      cv.style.left = -M + "px"; cv.style.top = -M + "px";
      cv.width = CW * DPR; cv.height = CH * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

      // offscreen face render: pill background + border + label
      var off = document.createElement("canvas");
      off.width = W * DPR; off.height = H * DPR;
      var octx = off.getContext("2d");
      octx.setTransform(DPR, 0, 0, DPR, 0, 0);
      var cs = getComputedStyle(btn);
      var bg = cs.backgroundColor;
      var hasBg = bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent";
      var rad = parseFloat(cs.borderTopLeftRadius) || H / 2;
      var bw = parseFloat(cs.borderTopWidth) || 0;

      function rr(x, y, ww, hh, rd) {
        rd = Math.min(rd, hh / 2, ww / 2);
        octx.beginPath();
        octx.moveTo(x + rd, y);
        octx.arcTo(x + ww, y, x + ww, y + hh, rd);
        octx.arcTo(x + ww, y + hh, x, y + hh, rd);
        octx.arcTo(x, y + hh, x, y, rd);
        octx.arcTo(x, y, x + ww, y, rd);
        octx.closePath();
      }
      if (hasBg) { rr(0, 0, W, H, rad); octx.fillStyle = bg; octx.fill(); }
      if (bw > 0) { rr(bw / 2, bw / 2, W - bw, H - bw, rad); octx.lineWidth = bw; octx.strokeStyle = cs.borderTopColor; octx.stroke(); }
      octx.fillStyle = cs.color;
      octx.font = cs.fontWeight + " " + cs.fontSize + " " + cs.fontFamily;
      octx.textBaseline = "middle"; octx.textAlign = "center";
      octx.fillText(btn.textContent.replace(/\s+/g, " ").trim(), W / 2, H / 2 + 1);

      var img = octx.getImageData(0, 0, off.width, off.height);
      parts = sampleField(img, off.width, W, H, GAP, 40);
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.hx += M; p.hy += M; p.x = p.hx; p.y = p.hy;
        p.sx = p.hx; p.sy = p.hy;        // scatter anchor, set on enter
      }
      // scale the destruction to the face — a small nav pill must not
      // blast its debris across half the navbar (looked like two swarms)
      var diag = Math.sqrt(W * W + H * H);
      HOLE_R = Math.max(28, Math.min(60, diag * 0.28));
      PUSH = Math.max(10, Math.min(36, diag * 0.15));
      return parts.length > 0;
    }

    /* scatter anchors: every pixel gets a resting spot away from the
       cursor — the face visibly breaks apart instead of denting */
    function scatter(cx, cy) {
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        var dx = p.hx - cx, dy = p.hy - cy;
        var d = Math.sqrt(dx * dx + dy * dy) || 1;
        var push = PUSH * (0.5 + Math.random());
        p.sx = p.hx + (dx / d) * push + (Math.random() - .5) * PUSH * 0.6;
        p.sy = p.hy + (dy / d) * push + (Math.random() - .5) * PUSH * 0.6;
        // keep the cloud inside the canvas
        p.sx = Math.max(2, Math.min(CW - 3, p.sx));
        p.sy = Math.max(2, Math.min(CH - 3, p.sy));
      }
    }

    var HOLE_R = 60, FORCE = 3.0, PUSH = 36;

    function loop(t) {
      ctx.clearRect(0, 0, CW, CH);
      var moving = false, gathered = 0, reformMax = 0;

      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        if (state === "chaos") {
          // weak spring to the scatter anchor + live black hole + jitter
          var dx = p.x - mouseX, dy = p.y - mouseY;
          var d2 = dx * dx + dy * dy;
          if (d2 < HOLE_R * HOLE_R) {
            var dist = Math.sqrt(d2) || 0.001;
            var f = (1 - dist / HOLE_R) * FORCE;
            p.vx += (dx / dist) * f; p.vy += (dy / dist) * f;
          }
          p.vx += (p.sx - p.x) * 0.02 + (Math.random() - .5) * 0.3;
          p.vy += (p.sy - p.y) * 0.02 + (Math.random() - .5) * 0.3;
          p.vx *= 0.90; p.vy *= 0.90;
        } else if (state === "vacuum") {
          // accelerating pull into the click point
          var k = Math.min(0.42, 0.06 + (t - vac.t0) / 1000 * 0.9);
          p.vx += (vac.x - p.x) * k; p.vy += (vac.y - p.y) * k;
          p.vx *= 0.82; p.vy *= 0.82;
          var gdx = vac.x - p.x, gdy = vac.y - p.y;
          if (gdx * gdx + gdy * gdy < 49) gathered++;
        } else { // reform — the original spring feel (owner: flight was perfect)
          p.vx += (p.hx - p.x) * 0.14; p.vy += (p.hy - p.y) * 0.14;
          p.vx *= 0.80; p.vy *= 0.80;
        }
        p.x += p.vx; p.y += p.vy;
        if (state === "reform") {
          var dd = Math.abs(p.hx - p.x) + Math.abs(p.hy - p.y);
          if (dd > reformMax) reformMax = dd;
        }
        if (Math.abs(p.vx) + Math.abs(p.vy) > 0.05 ||
            (state === "reform" && Math.abs(p.hx - p.x) + Math.abs(p.hy - p.y) > 0.5)) moving = true;

        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = rgbStr(p.color);
        ctx.fillRect(p.x, p.y, SIZE, SIZE);
      }
      ctx.globalAlpha = 1;

      if (state === "vacuum") {
        if (gathered > parts.length * 0.92 || t - vac.t0 > 600) { burst(); return; }
        raf = requestAnimationFrame(loop);
      } else if (state === "reform" && (reformMax < 2 || (reformT0 && t - reformT0 > 700))) {
        // pixels are visually home — hand over to the crisp button NOW
        // instead of waiting out the spring tail (700ms safety cap)
        exitPixelMode();
      } else if (state === "chaos" || moving) {
        raf = requestAnimationFrame(loop);
      } else if (state === "reform") {
        exitPixelMode();
      }
    }

    /* short mustard flash at the gather point, then fire */
    function burst() {
      var t0 = performance.now();
      (function flash(t) {
        var pr = Math.min(1, (t - t0) / 160);
        ctx.clearRect(0, 0, CW, CH);
        ctx.globalAlpha = 1 - pr;
        ctx.fillStyle = ACC;
        ctx.beginPath();
        ctx.arc(vac.x, vac.y, 4 + pr * 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        if (pr < 1) { raf = requestAnimationFrame(flash); return; }
        exitPixelMode();
        fire();
      })(t0);
    }

    function fire() {
      if (vac && vac.fired) return;
      if (vac) vac.fired = true;
      if (btn.tagName === "A") {
        // _blank was already opened natively in the click gesture
        if (btn.target !== "_blank") location.href = btn.getAttribute("href");
      } else if (btn.type === "submit" && btn.form) {
        btn.form.requestSubmit(btn);
      } else {
        btn.dispatchEvent(new CustomEvent("pixelfire", { bubbles: true }));
      }
    }

    function enterPixelMode(e) {
      if (state !== "idle") return;
      // the face is pre-sampled while idle: hover styles (ghost buttons
      // jump to accent instantly) must not leak into the pixel colors,
      // and the getImageData cost must not hitch the effect start
      if (!parts.length && !build()) return;
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.x = p.hx; p.y = p.hy; p.vx = 0; p.vy = 0;
      }
      var r = btn.getBoundingClientRect();
      mouseX = e.clientX - r.left + M; mouseY = e.clientY - r.top + M;
      scatter(mouseX, mouseY);
      cv.style.display = "block";
      btn.classList.add("px-active");
      state = "chaos";
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(loop);
    }

    function exitPixelMode() {
      cancelAnimationFrame(raf); raf = null;
      cv.style.display = "none";
      btn.classList.remove("px-active");
      state = "idle";
    }

    btn.addEventListener("pointerenter", function (e) {
      if (e.pointerType !== "mouse") return;
      enterPixelMode(e);
    });
    btn.addEventListener("pointermove", function (e) {
      var r = btn.getBoundingClientRect();
      mouseX = e.clientX - r.left + M; mouseY = e.clientY - r.top + M;
    });
    btn.addEventListener("pointerleave", function () {
      mouseX = -9999; mouseY = -9999;
      if (state === "chaos") { state = "reform"; reformT0 = performance.now(); }
    });

    btn.addEventListener("click", function (e) {
      // keyboard / touch / effect off → native behaviour
      if (state !== "chaos" && state !== "reform") return;
      // keyboard activation during reform (or any click without valid
      // pointer coords) gathers at the face centre, not at -9999
      var gx = mouseX > -9000 ? mouseX : M + W / 2;
      var gy = mouseY > -9000 ? mouseY : M + H / 2;
      if (btn.tagName === "A" && btn.target === "_blank") {
        // let the browser open the tab inside the gesture (no popup
        // blocker); the vacuum plays as a send-off on this page
        vac = { x: gx, y: gy, t0: performance.now(), fired: true };
      } else {
        e.preventDefault();
        vac = { x: gx, y: gy, t0: performance.now(), fired: false };
      }
      state = "vacuum";
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(loop);
    });

    var brt = null;
    addEventListener("resize", function () {
      if (state !== "idle") exitPixelMode();
      parts = [];
      clearTimeout(brt);
      brt = setTimeout(function () { if (state === "idle") build(); }, 220);
    });

    // pre-sample the idle face so the first hover starts instantly
    var bIdle = window.requestIdleCallback || function (fn) { setTimeout(fn, 400); };
    bIdle(function () { if (state === "idle" && !parts.length) build(); });
    return { el: btn };
  }

  /* ============================================================
     3) TILE MORPH — the tile's content dissolves into pixels under
        the black hole and reassembles as the other face.
        Markup contract:
          .tile [data-pixel-morph]
            .svc-face.svc-front   (visible)
            .svc-face.svc-back    (visibility:hidden)
        Faces are stacked (grid-area 1/1); the engine only toggles
        visibility and draws the transition.
     ============================================================ */
  function morph(tile) {
    var front = tile.querySelector(".svc-front");
    var back = tile.querySelector(".svc-back");
    if (!front || !back) return null;

    // reduced motion: plain crossfade via class, no particles
    if (reduced) {
      tile.addEventListener("pointerenter", function () { tile.classList.add("flipped"); });
      tile.addEventListener("pointerleave", function () { tile.classList.remove("flipped"); });
      return { el: tile };
    }

    var GAP = 2.4, SIZE = 1.8;
    var cv = document.createElement("canvas"), ctx = cv.getContext("2d");
    cv.className = "pxm";
    cv.setAttribute("aria-hidden", "true");
    tile.appendChild(cv);

    var fields = { front: null, back: null };   // {parts, ox, oy}
    var W = 0, H = 0;
    var showing = "front", want = "front", busy = false;
    var entry = { x: 0, y: 0 };
    var raf = null, rebuildQueued = false;

    function faceEl(side) { return side === "front" ? front : back; }

    function buildCanvas() {
      var r = tile.getBoundingClientRect();
      W = Math.ceil(r.width); H = Math.ceil(r.height);
      cv.style.width = W + "px"; cv.style.height = H + "px";
      cv.width = W * DPR; cv.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    function rasterizeFace(side, done) {
      var el = faceEl(side);
      var fr = el.getBoundingClientRect(), tr = tile.getBoundingClientRect();
      var fw = Math.ceil(fr.width), fh = Math.ceil(fr.height);
      if (fw < 2 || fh < 2) { done(false); return; }
      rasterizeNode(el, fw, fh, function (img, imgW) {
        if (!img) { done(false); return; }
        var parts = sampleField(img, imgW, fw, fh, GAP, 50);
        var ox = fr.left - tr.left, oy = fr.top - tr.top;
        for (var i = 0; i < parts.length; i++) {
          parts[i].hx += ox; parts[i].hy += oy;
          parts[i].x = parts[i].hx; parts[i].y = parts[i].hy;
        }
        fields[side] = { parts: parts };
        done(true);
      });
    }

    function ensureFields(done) {
      buildCanvas();
      var todo = [];
      if (!fields.front) todo.push("front");
      if (!fields.back) todo.push("back");
      if (!todo.length) { done(true); return; }
      var ok = true, left = todo.length;
      todo.forEach(function (side) {
        rasterizeFace(side, function (good) {
          ok = ok && good;
          if (--left === 0) done(ok);
        });
      });
    }

    /* phase A: blast the current face apart from the entry point;
       phase B: assemble the other face out of the debris field */
    function animate(from, to) {
      var fp = fields[from].parts, tp = fields[to].parts;
      faceEl(from).style.visibility = "hidden";
      faceEl(to).style.visibility = "hidden";
      cv.style.display = "block";

      // blast impulses away from the cursor entry point
      for (var i = 0; i < fp.length; i++) {
        var p = fp[i];
        p.x = p.hx; p.y = p.hy;
        var dx = p.hx - entry.x, dy = p.hy - entry.y;
        var d = Math.sqrt(dx * dx + dy * dy) || 1;
        var f = 3.4 + Math.random() * 3 + 90 / (d * 0.5 + 8);
        p.vx = (dx / d) * f + (Math.random() - .5) * 2.4;
        p.vy = (dy / d) * f + (Math.random() - .5) * 2.4;
      }
      // assembly start: debris ring around each home position
      for (var j = 0; j < tp.length; j++) {
        var q = tp[j];
        var ang = Math.random() * Math.PI * 2, rad = 30 + Math.random() * 70;
        q.x = q.hx + Math.cos(ang) * rad;
        q.y = q.hy + Math.sin(ang) * rad;
        q.d = Math.random() * 0.08;
      }

      var t0 = null, BLAST = 0.20, ASM = 0.32;
      function step(t) {
        if (!t0) t0 = t;
        var el = (t - t0) / 1000;
        ctx.clearRect(0, 0, W, H);

        // dissolving face
        if (el < BLAST) {
          var fade = 1 - (el / BLAST);
          for (var i = 0; i < fp.length; i++) {
            var p = fp[i];
            p.x += p.vx; p.y += p.vy;
            p.vx *= 0.92; p.vy *= 0.92;
            ctx.globalAlpha = p.alpha * fade;
            ctx.fillStyle = rgbStr(p.color);
            ctx.fillRect(p.x, p.y, SIZE, SIZE);
          }
        }
        // assembling face (starts while the old one still flies)
        var asmEl = el - BLAST * 0.35;
        var done = asmEl >= 0;
        if (asmEl >= 0) {
          for (var j = 0; j < tp.length; j++) {
            var q = tp[j];
            var local = Math.max(0, Math.min(1, (asmEl - q.d) / ASM));
            // ease-out means 0.85 is visually arrived (99.7% of the way) —
            // hand over to the real face then, don't wait out the tail
            if (local < 0.85) done = false;
            var e = 1 - Math.pow(1 - local, 3);
            var x = q.x + (q.hx - q.x) * e, y = q.y + (q.hy - q.y) * e;
            var a = Math.min(1, local / 0.8);
            ctx.globalAlpha = q.alpha * a * a;
            ctx.fillStyle = rgbStr(q.color);
            ctx.fillRect(x, y, SIZE, SIZE);
          }
        } else done = false;
        ctx.globalAlpha = 1;

        if (!done) { raf = requestAnimationFrame(step); return; }
        cv.style.display = "none";
        faceEl(to).style.visibility = "visible";
        showing = to; busy = false;
        if (rebuildQueued) { rebuildQueued = false; fields.front = fields.back = null; }
        if (want !== showing) step2();
      }
      raf = requestAnimationFrame(step);
    }

    function step2() {
      if (busy || want === showing) return;
      busy = true;
      ensureFields(function (ok) {
        if (!ok) {
          // rasterizer failed (exotic browser) — fall back to a plain flip
          busy = false;
          faceEl(showing).style.visibility = "hidden";
          showing = (showing === "front") ? "back" : "front";
          faceEl(showing).style.visibility = "visible";
          if (want !== showing) step2();
          return;
        }
        animate(showing, want);
      });
    }

    function point(e) {
      var r = tile.getBoundingClientRect();
      entry.x = e.clientX - r.left; entry.y = e.clientY - r.top;
    }

    if (noHover) {
      tile.addEventListener("click", function (e) {
        point(e);
        want = (want === "front") ? "back" : "front";
        step2();
      });
    } else {
      tile.addEventListener("pointerenter", function (e) { point(e); want = "back"; step2(); });
      tile.addEventListener("pointerleave", function (e) { point(e); want = "front"; step2(); });
    }

    // pre-rasterize both faces while idle so the first hover is instant
    var idle = window.requestIdleCallback || function (fn) { setTimeout(fn, 600); };
    idle(function () { ensureFields(function () { }); });

    var rt = null;
    addEventListener("resize", function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        if (busy) { rebuildQueued = true; return; }
        fields.front = fields.back = null;
      }, 180);
    });

    return { el: tile };
  }

  /* ============================================================
     4) SCROLL VELOCITY BUS — one lerped velocity value, consumers
        subscribe. The loop only runs while velocity is decaying;
        idle pages burn zero frames.
     ============================================================ */
  var velSubs = [], vel = 0, velTarget = 0, velRaf = null, velLastY = null, velLastT = 0;

  function velLoop() {
    vel += (velTarget - vel) * 0.18;
    velTarget *= 0.86;
    for (var i = 0; i < velSubs.length; i++) velSubs[i](vel);
    if (Math.abs(vel) > 0.05 || Math.abs(velTarget) > 0.05) {
      velRaf = requestAnimationFrame(velLoop);
    } else {
      vel = 0; velTarget = 0; velRaf = null;
      for (var k = 0; k < velSubs.length; k++) velSubs[k](0);
    }
  }

  if (!reduced) {
    addEventListener("scroll", function () {
      var y = scrollY, t = performance.now();
      if (velLastY !== null && t > velLastT) {
        var v = (y - velLastY) / Math.max(8, t - velLastT) * 16;   // px per frame
        velTarget = Math.max(-60, Math.min(60, v));
      }
      velLastY = y; velLastT = t;
      if (!velRaf) velRaf = requestAnimationFrame(velLoop);
    }, { passive: true });
  }

  /* ============================================================
     5) FALLING SAND — click breaks the content into grains that
        obey a cellular automaton (fall, slide diagonally, pile up).
        The cursor stirs the pile; after 5s idle the vacuum pulls
        every grain back to its sampled home position.
     ============================================================ */
  function sand(container, contentEl, opts) {
    if (reduced || !container || !contentEl) return null;
    opts = opts || {};
    var CELL = opts.cell || 3;
    var collectMode = !!opts.collect;     // 404 game: the cursor hoovers grains
    var collected = 0, total = 0;
    var cv = document.createElement("canvas"), ctx = cv.getContext("2d");
    cv.className = "pxsand";
    cv.setAttribute("aria-hidden", "true");
    container.appendChild(cv);

    var W = 0, H = 0, cols = 0, rows = 0;
    var grid = null, grains = [];
    var state = "idle";                  // idle | falling | reassemble
    var raf = null, idleTimer = null, calm = 0;

    function build(cb) {
      var r = container.getBoundingClientRect();
      W = Math.ceil(r.width); H = Math.ceil(r.height);
      if (W < 8 || H < 8) { cb(false); return; }
      cv.style.width = W + "px"; cv.style.height = H + "px";
      cv.width = W * DPR; cv.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      rasterizeNode(contentEl, W, H, function (img, imgW) {
        if (!img) { cb(false); return; }
        var parts = sampleField(img, imgW, W, H, CELL, 60);
        if (parts.length < 20) { cb(false); return; }
        cols = Math.ceil(W / CELL); rows = Math.ceil(H / CELL);
        grid = new Int32Array(cols * rows); grid.fill(-1);
        grains = [];
        for (var i = 0; i < parts.length; i++) {
          var p = parts[i];
          var gx = (p.hx / CELL) | 0, gy = (p.hy / CELL) | 0;
          if (gx >= cols || gy >= rows || grid[gy * cols + gx] !== -1) continue;
          grid[gy * cols + gx] = grains.length;
          grains.push({
            gx: gx, gy: gy, hx: p.hx, hy: p.hy,
            x: 0, y: 0, vx: 0, vy: 0,
            col: Math.random() < 0.08 ? ACC : rgbStr(p.color)
          });
        }
        cb(grains.length > 0);
      });
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < grains.length; i++) {
        var g = grains[i];
        if (g.dead) continue;
        ctx.fillStyle = g.col;
        if (state === "reassemble") ctx.fillRect(g.x, g.y, CELL - 0.4, CELL - 0.4);
        else ctx.fillRect(g.gx * CELL, g.gy * CELL, CELL - 0.4, CELL - 0.4);
      }
    }

    function collect(cx, cy) {
      if (state !== "falling" || !grid) return;
      var R = 7;
      var cgx = (cx / CELL) | 0, cgy = (cy / CELL) | 0;
      var got = 0;
      for (var gy = Math.max(0, cgy - R); gy < Math.min(rows, cgy + R); gy++) {
        for (var gx = Math.max(0, cgx - R); gx < Math.min(cols, cgx + R); gx++) {
          var dx = gx - cgx, dy = gy - cgy;
          if (dx * dx + dy * dy > R * R) continue;
          var idx = gy * cols + gx, id = grid[idx];
          if (id === -1) continue;
          grid[idx] = -1;
          grains[id].dead = true;
          collected++; got++;
        }
      }
      if (got) {
        calm = 0; wake(); draw();
        if (opts.onProgress) opts.onProgress(collected / total);
        // 99%: chasing the last lone grains would strand the game
        if (collected >= total * 0.99) {
          collected = total;
          if (opts.onComplete) opts.onComplete();
          // hero destruct egg: the page "comes back" as the reward;
          // the 404 opts out (restore:false) — stays cleaned
          if (opts.restore !== false) setTimeout(finish, opts.restoreDelay || 600);
        }
      }
    }

    function fallStep() {
      var moved = 0;
      for (var gy = rows - 2; gy >= 0; gy--) {
        var leftFirst = Math.random() < 0.5;
        for (var gx = 0; gx < cols; gx++) {
          var idx = gy * cols + gx, id = grid[idx];
          if (id === -1) continue;
          var below = (gy + 1) * cols + gx;
          if (grid[below] === -1) {
            grid[idx] = -1; grid[below] = id;
            grains[id].gy = gy + 1; moved++;
            continue;
          }
          var d1 = leftFirst ? -1 : 1, d2 = -d1;
          var n1 = gx + d1, n2 = gx + d2;
          if (n1 >= 0 && n1 < cols && grid[(gy + 1) * cols + n1] === -1 && grid[gy * cols + n1] === -1) {
            grid[idx] = -1; grid[(gy + 1) * cols + n1] = id;
            grains[id].gx = n1; grains[id].gy = gy + 1; moved++;
          } else if (n2 >= 0 && n2 < cols && grid[(gy + 1) * cols + n2] === -1 && grid[gy * cols + n2] === -1) {
            grid[idx] = -1; grid[(gy + 1) * cols + n2] = id;
            grains[id].gx = n2; grains[id].gy = gy + 1; moved++;
          }
        }
      }
      return moved;
    }

    function loop() {
      if (state === "falling") {
        var moved = fallStep();
        draw();
        calm = moved === 0 ? calm + 1 : 0;
        if (calm < 12) { raf = requestAnimationFrame(loop); return; }
        raf = null;                       // pile settled — wait for idle timer
      } else if (state === "reassemble") {
        var settled = true;
        for (var i = 0; i < grains.length; i++) {
          var g = grains[i];
          g.vx += (g.hx - g.x) * 0.16; g.vy += (g.hy - g.y) * 0.16;
          g.vx *= 0.74; g.vy *= 0.74;
          g.x += g.vx; g.y += g.vy;
          if (Math.abs(g.hx - g.x) + Math.abs(g.hy - g.y) > 1.2) settled = false;
        }
        draw();
        if (!settled) { raf = requestAnimationFrame(loop); return; }
        raf = null; finish();
      }
    }
    function wake() { if (!raf) raf = requestAnimationFrame(loop); }

    function resetIdle() {
      if (collectMode) return;            // the game never reassembles
      clearTimeout(idleTimer);
      idleTimer = setTimeout(reassemble, 5000);
    }

    function disturb(cx, cy) {
      if (state !== "falling" || !grid) return;
      resetIdle();
      var R = 6;                          // radius in cells
      var cgx = (cx / CELL) | 0, cgy = (cy / CELL) | 0;
      for (var gy = Math.max(0, cgy - R); gy < Math.min(rows, cgy + R); gy++) {
        for (var gx = Math.max(0, cgx - R); gx < Math.min(cols, cgx + R); gx++) {
          var dx = gx - cgx, dy = gy - cgy;
          if (dx * dx + dy * dy > R * R) continue;
          var idx = gy * cols + gx, id = grid[idx];
          if (id === -1) continue;
          // toss the grain up and sideways; it falls again
          var nx = gx + ((Math.random() * 14 - 7) | 0);
          var ny = gy - (2 + (Math.random() * 7 | 0));
          if (nx < 0 || nx >= cols || ny < 0) continue;
          var nidx = ny * cols + nx;
          if (grid[nidx] !== -1) continue;
          grid[idx] = -1; grid[nidx] = id;
          grains[id].gx = nx; grains[id].gy = ny;
        }
      }
      calm = 0; wake();
    }

    function reassemble() {
      if (state !== "falling") return;
      state = "reassemble";
      for (var i = 0; i < grains.length; i++) {
        var g = grains[i];
        g.x = g.gx * CELL; g.y = g.gy * CELL; g.vx = 0; g.vy = 0;
      }
      calm = 0; wake();
    }

    function finish() {
      cv.style.display = "none";
      contentEl.style.visibility = "";
      container.classList.remove("sand-active");
      grid = null; grains = []; state = "idle";
    }

    function trigger(e) {
      if (state === "falling") {
        if (e && e.clientX !== undefined) {
          var r0 = container.getBoundingClientRect();
          var tx = e.clientX - r0.left, ty = e.clientY - r0.top;
          if (collectMode) collect(tx, ty); else disturb(tx, ty);
        }
        return;
      }
      if (state !== "idle") return;
      container.classList.add("sand-active");   // pauses the ticker via CSS
      build(function (ok) {
        if (!ok) { container.classList.remove("sand-active"); return; }
        total = grains.length; collected = 0;
        contentEl.style.visibility = "hidden";
        // explicit visible: contentEl may be an ancestor of the canvas
        // (hero destruct egg) and visibility inherits
        cv.style.visibility = "visible";
        cv.style.display = "block";
        state = "falling"; calm = 0;
        draw(); wake(); resetIdle();
        if (opts.onStart) opts.onStart(total);
      });
    }

    if (!opts.manual) container.addEventListener("click", trigger);
    // document-level: the hero destruct egg hides the container itself
    // (visibility:hidden eats pointer events), the canvas stays visible
    document.addEventListener("pointermove", function (e) {
      if (state !== "falling") return;
      var r = container.getBoundingClientRect();
      var px = e.clientX - r.left, py = e.clientY - r.top;
      if (px < -24 || py < -24 || px > r.width + 24 || py > r.height + 24) return;
      if (collectMode) collect(px, py); else disturb(px, py);
    });
    addEventListener("resize", function () {
      if (state === "idle") return;
      clearTimeout(idleTimer);
      cancelAnimationFrame(raf); raf = null;
      finish();
    });

    return { el: container, trigger: trigger };
  }

  window.PixelFX = {
    headline: headline,
    button: button,
    morph: morph,
    sand: sand,
    onVelocity: function (fn) { velSubs.push(fn); },
    velocity: function () { return vel; },
    reduced: reduced,
    noHover: noHover
  };
})();
