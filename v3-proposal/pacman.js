/* ============================================================
   McCain Digital — Pac-Man scroll progress.
   Lifted verbatim from the live homepage (upload-v2/index.html)
   into its own module for v3. Needs: <canvas id="pacbar">, an
   optional .scroll-progress fallback bar, and .nav-links .nav-cta
   as the thing he teases. Reduced motion: does not run at all.
   ============================================================ */
(function () {
  "use strict";
  var d = document, w = window;
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      (function () {
        if (reduced) return;                 // CSS fallback bar stays
        var cv = d.getElementById("pacbar");
        if (!cv || !cv.getContext) return;
        var ctx = cv.getContext("2d");
        var cssBar = d.querySelector(".prog");   // v3: the CSS fallback bar
        if (cssBar) cssBar.style.display = "none";
        cv.style.display = "block";
        setTimeout(function () { cv.style.opacity = "1"; }, 2000);

        var DPR2 = Math.min(w.devicePixelRatio || 1, 2);
        // LY = the line's y inside the canvas. Anything inside the header
        // collides with something — at 19 it cut through the wordmark, at 10 it
        // ran across the top of the CTA button. So he rides ON the header's
        // bottom edge instead: his own lane, nothing to hit, and the line reads
        // as the progress bar it is. Measured live so it follows the nav.
        var navEl = d.querySelector(".nav");
        var W = 0, H = 190, LY = 68, R = 6.5, PADX = 48;
        var cta = d.querySelector(".nav .btn");   // v3: the CTA he teases
        var COLORS = ["#a8a294", "#f5c518", "#9FD98A", "#d9a800"];
        var colorIdx = 0;                    // the line currently being eaten
        var dir = 1;                         // 1 eats rightward, -1 leftward
        var armed = false;                   // gag re-arms after leaving the edge
        var gag = null;                      // { t0 }
        var parts = [];                      // puked / spat pixels
        var chomp = 0, lastProg = -1, lastMoveT = -1e9, raf = null;
        var mx = -9999, my = -9999, pokeT = -1e9;   // cursor teasing
        var antic = null, anticTimer = null;        // idle silliness

        /* Everything that touches LAYOUT is read here and only here — never
           inside tick(). getBoundingClientRect(), scrollHeight and clientWidth
           each force a synchronous re-layout, and with the marquee writing a
           transform on every frame the layout is always dirty. Reading them
           per frame meant a forced reflow 60 times a second: 722 ms of
           main-thread time on throttled mobile for 15 ms of actual script. */
        var maxScroll = 0, ctaBox = null;
        function measure() {
          if (navEl) LY = Math.round(navEl.getBoundingClientRect().height);
          // the nav is position:fixed, so its viewport box is constant
          ctaBox = cta ? cta.getBoundingClientRect() : null;
          maxScroll = d.documentElement.scrollHeight - w.innerHeight;
          var vw = d.documentElement.clientWidth;
          if (vw === W) return;
          W = vw;
          // the line stops well before the edges â€” Pac-Man never runs the
          // full width, so the puke has room to fly and trickle in view
          PADX = Math.max(34, Math.min(64, Math.round(vw * 0.05)));
          cv.width = W * DPR2;
          cv.height = H * DPR2;
          ctx.setTransform(DPR2, 0, 0, DPR2, 0, 0);
        }
        function progress() {
          return maxScroll > 0 ? Math.max(0, Math.min(1, w.scrollY / maxScroll)) : 0;
        }
        function pacX(p) { return PADX + p * (W - PADX * 2); }
        /* he eats himself fat over a pass â€” and pukes it all out at the
           end (shrinks back during the vomit, then the direction flips) */
        function fatR(p, t) {
          var frac = dir === 1 ? p : 1 - p;
          var r = R + frac * 5;
          if (gag) r = Math.max(R, r - (r - R) * Math.min(1, (t - gag.t0) / 420));
          return r;
        }
        function blocks(x0, x1, color) {
          x0 = Math.max(x0, PADX); x1 = Math.min(x1, W - PADX);
          if (x1 - x0 < 2) return;
          ctx.fillStyle = color;
          for (var x = Math.floor(x0 / 7) * 7; x < x1; x += 7) {
            if (x + 4 <= x0) continue;
            ctx.fillRect(Math.max(x, x0), LY - 1, Math.min(4, x1 - Math.max(x, x0)), 2);
          }
        }
        /* the pile: a visible burst that arcs forward, then trickles down
           the canvas and dissolves grain by grain */
        function vomit(px, faceDir, col, n, r) {
          for (var i = 0; i < n; i++) {
            parts.push({
              x: px + faceDir * (r + 2), y: LY,
              vx: faceDir * (0.6 + Math.random() * 2.8) + (Math.random() - .5) * 0.8,
              vy: -(0.4 + Math.random() * 2.2),
              col: col, life: (70 + Math.random() * 70) | 0
            });
          }
        }
        /* nobody scrolled for a while? he gets bored â€” looks around, hops,
           snaps, dozes off, wanders a few pixels, spits one out. A nudge
           to keep exploring the page. */
        var ANTICS = ["look", "bounce", "chomp", "zz", "wander", "spit"];
        function startAntic() {
          var t = performance.now();
          var type = ANTICS[(Math.random() * ANTICS.length) | 0];
          antic = {
            type: type, t0: t,
            dur: type === "zz" ? 2200 : type === "wander" ? 1800 : type === "spit" ? 700 : 1400
          };
          if (type === "spit") {
            var p0 = lastProg < 0 ? 0 : lastProg;
            vomit(pacX(p0), dir, COLORS[colorIdx], 4, fatR(p0, t));
          }
          wake();
        }
        function scheduleAntics() {
          clearTimeout(anticTimer);
          anticTimer = setTimeout(function () {
            if (!d.hidden && !gag && !antic && !(my > -9000 && my < LY + 34) &&
              performance.now() - lastMoveT > 2800) startAntic();
            scheduleAntics();
          }, 1600 + Math.random() * 2400);
        }

        function draw(p, t, r) {
          ctx.clearRect(0, 0, W, H);
          var px = pacX(p);
          // idle antics resolve first â€” a wander moves the bite gap too
          var aFace = 0, aMouth = -1, aLabel = null, yOff = 0;
          if (antic) {
            var ae = (t - antic.t0) / antic.dur;
            if (ae >= 1) antic = null;
            else if (antic.type === "look") aFace = Math.sin(ae * Math.PI * 2.5) > 0 ? -dir : dir;
            else if (antic.type === "bounce") yOff = -Math.abs(Math.sin(ae * Math.PI * 3)) * 5;
            else if (antic.type === "chomp") aMouth = 0.1 + Math.abs(Math.sin(t * 0.03)) * 0.6;
            else if (antic.type === "zz") { aMouth = 0.04; aLabel = "zZ"; }
            else if (antic.type === "wander") {
              px += Math.sin(ae * Math.PI) * 26 * dir;
              aMouth = 0.1 + Math.abs(Math.sin(t * 0.025)) * 0.5;
            }
          }
          var eaten = COLORS[colorIdx];
          var rebuilt = COLORS[(colorIdx + 1) % COLORS.length];
          if (dir === 1) {
            blocks(0, px - r - 3, rebuilt);   // rebuilt behind his back
            blocks(px + r + 3, W, eaten);     // still on the menu
          } else {
            blocks(0, px - r - 3, eaten);
            blocks(px + r + 3, W, rebuilt);
          }
          // Fat pac reaches up and gnaws a scallop out of the CTA's BOTTOM
          // edge — ONE clean pixel-stepped semicircle (the jittered fringe
          // version read as frizz, not as a bite). Driven by how fat he is,
          // not by raw overlap: he now rides below the header, so "does the
          // circle touch the button" would be true the whole time.
          if (ctaBox) {
            var br = ctaBox;                  // cached in measure(), see above
            var bite = (r - R) * 2.2;         // 0 when thin, ~11px at his fattest
            if (bite > 2 && br.bottom > 0 && br.bottom < LY + 6 &&
              px > br.left - bite && px < br.right + bite) {
              // the notch has to be painted in the CURRENT page background —
              // the hard-coded ink left a dark blob on the button in light mode
              ctx.fillStyle = getComputedStyle(d.documentElement)
                .getPropertyValue("--bg").trim() || "#0f0e0c";
              var bx0 = Math.max(br.left, Math.floor((px - bite) / 3) * 3);
              var bx1 = Math.min(br.right, px + bite);
              for (var bx = bx0; bx < bx1; bx += 3) {
                var dxc = bx + 1.5 - px;
                var h2 = bite * bite - dxc * dxc;
                if (h2 <= 0) continue;
                var depth = Math.ceil(Math.sqrt(h2) / 3) * 3;
                ctx.fillRect(bx, br.bottom - depth, 3, depth + 1);
              }
            }
          }
          for (var i = parts.length - 1; i >= 0; i--) {
            var q = parts[i];
            q.x += q.vx; q.y += q.vy;
            q.vy += 0.07;                     // gentle gravity â€” a trickle
            q.vx *= 0.985;
            q.life--;
            if (q.life <= 0 || q.y > H - 3) { parts.splice(i, 1); continue; }
            ctx.globalAlpha = Math.min(1, q.life / 45);
            ctx.fillStyle = q.col;
            ctx.fillRect(q.x, q.y, 2.4, 2.4);
          }
          ctx.globalAlpha = 1;
          // pac-man: chomping while moving, turned + red + "!?" in the gag,
          // glaring at a cursor that comes too close
          var face = aFace || dir, shocked = false, poked = t - pokeT < 380;
          var near = !gag && my > -9000 && my < LY + 34 && Math.abs(mx - px) < 90;
          if (near) { antic = null; aMouth = -1; aLabel = null; yOff = 0; }
          if (gag) {
            var el = t - gag.t0;
            if (el > 420) { face = -dir; shocked = el < 1400; }
          } else if (near) {
            face = mx >= px ? 1 : -1;         // turns and glares at the cursor
          }
          var mouth = gag ? (shocked ? 0.55 : 0.16)
            : near ? 0.16 + Math.abs(Math.sin(t * 0.022)) * 0.55   // angry snapping
              : aMouth >= 0 ? aMouth
                : 0.12 + Math.abs(Math.sin(chomp)) * 0.5;
          var cy = LY + yOff;
          ctx.fillStyle = (shocked || poked) ? "#C4554D" : "#f5c518";
          ctx.beginPath();
          ctx.moveTo(px, cy);
          if (face === 1) ctx.arc(px, cy, r, mouth, Math.PI * 2 - mouth, false);
          else ctx.arc(px, cy, r, Math.PI + mouth, Math.PI - mouth, false);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = "#0f0e0c";
          ctx.beginPath();
          ctx.arc(px + (face === 1 ? 1 : -1) * (r * 0.15 + 0.4), cy - r * 0.5, 1.1 + r * 0.04, 0, Math.PI * 2);
          ctx.fill();
          if (shocked || poked || aLabel) {
            ctx.fillStyle = "#ece7dd";
            ctx.font = "700 11px ui-monospace, Consolas, monospace";
            ctx.textAlign = "center";
            ctx.fillText(aLabel || (shocked ? "!?" : "!!"), px, Math.max(8, cy - r - 4));
          }
          return near;
        }
        function tick(t) {
          var p = progress();
          if (Math.abs(p - lastProg) > 0.0004) {
            chomp += Math.abs(p - lastProg) * 260;
            lastMoveT = t;
            lastProg = p;
          }
          var px = pacX(p);
          var r = fatR(p, t);
          if (!gag && armed && ((dir === 1 && p > 0.995) || (dir === -1 && p < 0.005))) {
            gag = { t0: t };
            armed = false;
            vomit(px, dir, COLORS[colorIdx], 64, r);
          }
          if (!armed && !gag && ((dir === 1 && p < 0.9) || (dir === -1 && p > 0.1))) armed = true;
          if (gag && t - gag.t0 > 1500) {
            gag = null;
            dir = -dir;
            colorIdx = (colorIdx + 1) % COLORS.length;
          }
          // poke: touching him costs you a faceful of spat pixels
          if (!gag && my > -9000 && my < LY + 30 && Math.abs(mx - px) < r + 8 && t - pokeT > 800) {
            pokeT = t;
            vomit(px, mx >= px ? 1 : -1, COLORS[colorIdx], 10, r);
          }
          var near = draw(p, t, r);
          if (gag || parts.length || near || antic || t - lastMoveT < 240 || t - pokeT < 420) {
            raf = w.requestAnimationFrame(tick);
          } else raf = null;
        }
        function wake() { if (!raf) raf = w.requestAnimationFrame(tick); }
        w.addEventListener("scroll", wake, { passive: true });
        w.addEventListener("resize", function () { W = 0; measure(); wake(); }, { passive: true });
        // the page grows as images and revealed sections land, which moves the
        // end of the scroll range he is walking along
        if (w.ResizeObserver) {
          var mt = null;
          new ResizeObserver(function () {
            clearTimeout(mt);
            mt = setTimeout(function () { measure(); wake(); }, 150);
          }).observe(d.body);
        }
        w.addEventListener("pointermove", function (e) {
          if (e.clientY < LY + 92) { mx = e.clientX; my = e.clientY; if (my < LY + 34) wake(); }
          else { mx = -9999; my = -9999; }
        }, { passive: true });
        // The first measure waits for a frame. Called inline it read
        // getBoundingClientRect + scrollHeight while the boot script was still
        // running, forcing a 25 ms layout before anything had been painted.
        // One frame later the layout exists and the read is free — and the bar
        // has nothing to draw until then anyway.
        w.requestAnimationFrame(function () {
          measure();
          armed = progress() < 0.9;
          wake();
        });
        scheduleAntics();
      })();
})();

