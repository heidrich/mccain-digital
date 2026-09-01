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
    // v3 uses a webfont — a foreignObject image cannot reach document fonts,
    // so the face is embedded as a data-URI @font-face (window.PixelFXFontCSS,
    // built at runtime in the bootstrap). Without it every pixel headline
    // rasterizes in the fallback face and the field is the wrong shape.
    var fontCSS = window.PixelFXFontCSS ? "<style>" + window.PixelFXFontCSS + "</style>" : "";
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '">' +
      fontCSS +
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
  /* ---------- the wave palette ----------

     The first version listed two brand colours as stops and let the gradient
     interpolate between them. That is what produced the "ugly green": any two
     hues mixed in sRGB pass through a desaturated middle, so gold-to-green
     spends most of its span as olive mud. Choosing nicer endpoints does not
     help, because the mud is BETWEEN them, not at them.

     So the stops are generated with saturation and lightness held at the
     accent colour and only the hue moving. Nothing between two stops can then
     be duller than the stops themselves — which is precisely what an animated
     gradient border does.

       sheen    one hue, lightness swinging  — a shine, no colour change
       hue      about 32 degrees each way    — still reads as the brand
       rainbow  the whole circle             — the animated-border look

     Exposed as PixelFX.wavePalette so a comparison page can paint the palette
     that actually runs instead of one written out by hand. */
  function rgbToHsl(c) {
    var r = c[0] / 255, g = c[1] / 255, b = c[2] / 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    var h = 0, l = (mx + mn) / 2;
    var sat = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    if (d !== 0) {
      if (mx === r) h = ((g - b) / d) % 6;
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    return [h, sat, l];
  }

  function hslStr(h, sat, l) {
    return "hsl(" + h.toFixed(0) + " " + (sat * 100).toFixed(0) + "% " +
      (l * 100).toFixed(0) + "%)";
  }

  /* Read a custom property AS AN ELEMENT SEES IT and hand back bytes.

     Which element matters: --acc-text resolves differently inside a
     .band--ink section than it does on :root, so a headline has to ask its own
     host while the page-level rim palette asks the root. That is the only
     difference, which is why there is one function and not two - the second
     copy of this was already drifting (it had lost the #abc shorthand).

     Chrome reports some values as `color(srgb 1 .99 .98)`, whose channels are
     0-1 floats and not bytes; reading those as bytes turns a near-white into a
     near-black, which has invented a whole audit's worth of failures before. */
  function tokenRGB(el, name, fallback) {
    var raw = getComputedStyle(el).getPropertyValue(name).trim() || fallback;
    if (raw.charAt(0) === "#") {
      var h = raw.slice(1);
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    }
    var n = (raw.match(/[\d.]+/g) || []).map(Number);
    if (raw.indexOf("color(") === 0) n = n.slice(0, 3).map(function (v) { return v * 255; });
    return n.slice(0, 3);
  }

  function hslToRgb(h, sat, l) {
    var c = (1 - Math.abs(2 * l - 1)) * sat, hp = (h % 360) / 60;
    var x = c * (1 - Math.abs(hp % 2 - 1)), m = l - c / 2, r = 0, g = 0, b = 0;
    if (hp < 1) { r = c; g = x; }
    else if (hp < 2) { r = x; g = c; }
    else if (hp < 3) { g = c; b = x; }
    else if (hp < 4) { g = x; b = c; }
    else if (hp < 5) { r = x; b = c; }
    else { r = c; b = x; }
    return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
  }

  /* WCAG relative luminance. The channels have to be LINEARISED first -
     weighting the gamma-encoded bytes produces a number that looks like
     luminance, ranks colours in roughly the right order, and is wrong by
     enough to reverse a verdict. It told me the light theme was failing and
     the dark one was fine; both were the other way round. */
  function relLum(rgb) {
    var o = 0, i, c;
    var w = [0.2126, 0.7152, 0.0722];
    for (i = 0; i < 3; i++) {
      c = rgb[i] / 255;
      o += w[i] * (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    }
    return o;
  }

  function contrast(a, b) {
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  }

  /* Keep a stop's hue and move only its lightness until it clears the bar
     against the ground it will be painted on.

     A rainbow generated at the accent's own lightness is not uniformly
     readable, because lightness is not luminance: at HSL 53% a yellow is far
     brighter than a blue. On the near-black band the deep blue-violet measured
     2.64:1 where large text needs 3:1 - the one colour in twelve that the eye
     forgives and a contrast checker does not.

     Lightness is the right dial: it keeps the hue, so the palette still reads
     as the same wave, and it moves in the direction the ground demands - up on
     a dark band, down on a light one. */
  function legible(h, sat, l, groundLum, min) {
    var up = groundLum < 0.18, i, rgb;
    for (i = 0; i < 44; i++) {
      rgb = hslToRgb(h, sat, l);
      if (contrast(relLum(rgb), groundLum) >= min) break;
      l += up ? 0.02 : -0.02;
      if (l > 0.97 || l < 0.03) break;
    }
    return Math.min(0.97, Math.max(0.03, l));
  }

  function wavePalette(style, accRGB, groundRGB) {
    var hsl = rgbToHsl(accRGB || [245, 197, 24]);
    var h = hsl[0], sat = Math.max(0.55, hsl[1]), l = hsl[2];
    var out = [], k, hue;
    /* Comfortably over the 3:1 large-text bar rather than exactly on it. The
       painted pixel is a point on a gradient BETWEEN two stops, so stops that
       each just clear the bar can still draw a colour that does not: at 3.2
       the worst drawn cell measured 3.15, which passes and has no room in it
       for a rounding, a blend, or the next edit to this palette. */
    var gl = groundRGB ? relLum(groundRGB) : 0.005, MIN = 3.5;
    var keep = function (hh, ll) { return hslStr(hh, sat, legible(hh, sat, ll, gl, MIN)); };

    if (style === "sheen") {
      var swing = [l, Math.min(0.92, l + 0.28), l, Math.max(0.28, l - 0.16), l];
      for (k = 0; k < swing.length; k++) out.push(keep(h, swing[k]));
      return out;
    }
    if (style === "rainbow") {
      // the full circle, ending back on the accent hue so the cycle has no seam
      for (k = 0; k <= 12; k++) out.push(keep((h + 360 * k / 12) % 360, l));
      return out;
    }
    /* "hue": a sweep that starts and ends on the accent. Kept to +/-32 degrees
       because +/-55 from gold reaches green one way and red the other, which
       is not "near the brand" however the comment describes it. */
    var arc = [0, 18, 32, 18, 0, -18, -32, -18, 0];
    for (k = 0; k < arc.length; k++) {
      hue = (h + arc[k] + 360) % 360;
      out.push(keep(hue, l));
    }
    return out;
  }

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
    /* The grid is measured in DEVICE pixels, not CSS pixels.

       This is the third setting for these headlines and the first one that is
       not a guess. 2.4/1.7 drew a 1.7px block at a fractional position: the
       browser antialiased it across neighbouring pixels and none of them came
       out opaque — mean alpha 140/255, which is why the white read grey and
       the yellow washed out. Making the block fatter on the same grid closed
       the gaps and stopped it reading as pixels. Making the grid four times
       finer (1.1/1.0) fixed the colour and cost 4.8x the particles, which is
       both slow and, again, not a pixel effect: at one whole pixel per cell
       there is no gap left to see.

       So neither number is chosen freely. The cell is a whole number of
       device pixels and the block is a whole number of device pixels strictly
       smaller than the cell — that is what a gap between pixels IS. 3.0/2.0
       gives a 3px cell with a 2px block: 44% of the canvas inked at full
       opacity, against 50% at 55% opacity before (so ~60% more colour), with
       36% FEWER particles than 2.4/1.7 and an eighth of 1.1/1.0. */
    var GAP = parseFloat(host.dataset.gap) || 3.0;
    var SIZE = parseFloat(host.dataset.size) || 2.0;
    /* data-wave: "off" (default) | "accent" | "all" | "shimmer"
       data-wave-colors: comma-separated list, overrides the palette

       OFF by default. The owner took it off the h1 - "wir entfernen den
       gradient von der h1" - and the h1 was the only place on the site with an
       accent span inside a pixel headline, so it was the only place it ever
       showed. Defaulting to off rather than spelling out data-wave="off" on
       two spans means the next headline does not quietly inherit an effect
       nobody asked it to have.

       The mechanism stays, and it is not idle: the travelling gradient the
       owner did like now runs on the console's border instead, out of the same
       palette (see wavePalette and .rim in v3.css). preview/wave-lab.html has
       every variant side by side; switching one back on is one attribute. */
    var WAVE = host.dataset.wave || "off";
    var WAVE_COLS = (host.dataset.waveColors || "").split(",")
      .map(function (c) { return c.trim(); }).filter(Boolean);
    /* "rainbow" by default: the owner asked for the animated-gradient-border
       look and accepted that the gold cycles away with it ("das gelb
       verschwindet dann halt mit der zeit"). data-wave-style="hue" keeps it
       near the brand, "sheen" drops the colour change entirely. */
    var WAVE_STYLE = host.dataset.waveStyle || "rainbow";
    /* The axis the colour travels along, in degrees clockwise from "left to
       right". Straight across reads as a wipe; leaning makes the bands cut
       across the letters the way an animated gradient border does. */
    var WAVE_ANGLE = parseFloat(host.dataset.waveAngle);
    if (!isFinite(WAVE_ANGLE)) WAVE_ANGLE = 34;
    /* How long one full palette is on screen, in CSS pixels, and how long a
       cell takes to travel through all of it. Both are page-wide constants
       rather than fractions of the element, so two headlines of different
       widths show the same wave at the same speed. */
    var WAVE_PERIOD = parseFloat(host.dataset.wavePeriod) || 460;
    var WAVE_CYCLE = parseFloat(host.dataset.waveCycle) || 2;
    var INK = host.dataset.ink || null;

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

    /* Cell and block, both rounded to whole device pixels, once.

       GRID is what everything downstream steps by, so the cells land on exact
       device pixels at any DPR — no rounding per particle, no beating pattern
       where a fractional stride drifts in and out of alignment. BLOCK is at
       most GRID minus one device pixel, so the gap can never close however
       the two are tuned; that clamp is the thing that keeps it a pixel
       effect.

       Both the moving and the resting path draw with these. An earlier
       attempt snapped only the resting state, so the blocks visibly changed
       size the moment the black hole let go of them. */
    var GRID_DEV = Math.max(2, Math.round(GAP * DPR));
    var BLOCK_DEV = Math.min(GRID_DEV - 1, Math.max(1, Math.round(SIZE * DPR)));
    var GRID = GRID_DEV / DPR;
    var BLOCK = BLOCK_DEV / DPR;
    function snap(v) { return Math.round(v * DPR) / DPR; }

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
      // The canvas is sized to the INK box (ascender→descender ≈ 1.23em for
      // Schibsted), but CSS pins it to the host's top-left. With a display
      // line-height below that ratio the host box is shorter than the ink
      // box, so the field was drawn too low and bled into the next line.
      // Offset the canvas onto the text box and any line-height works.
      var hr = host.getBoundingClientRect();
      cv.style.top = (r.top - hr.top) + "px";
      cv.style.left = (r.left - hr.left) + "px";
      cv.style.width = W + "px"; cv.style.height = H + "px";
      cv.width = W * DPR; cv.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.clearRect(0, 0, W, H);
      rasterizeNode(txt, W, H, function (img, imgW) {
        if (img) {
          var sampled = sampleField(img, imgW, W, H, GRID, 120);
          if (sampled.length) {
            parts = sampled.map(function (s) { return initPart(s.hx, s.hy, INK || rgbStr(s.color)); });
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
      for (var y = 0; y < H; y += GRID) {
        for (var x = 0; x < W; x += GRID) {
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
        ctx.fillRect(snap(x), snap(y), BLOCK, BLOCK);
      }
      ctx.globalAlpha = 1;
      if (!done) raf = requestAnimationFrame(frame); else settle();
    }

    function drawStatic() {
      ctx.clearRect(0, 0, W, H);
      var g = (WAVE !== "off" && !reduced && parts.length) ? waveGradient(ctx) : null;
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        ctx.fillStyle = (p.wave && g) ? g : p.col;
        ctx.fillRect(snap(p.cx), snap(p.cy), BLOCK, BLOCK);
      }
    }

    /* ---------- the colour wave over the resting mosaic ----------

       The expensive thing about this headline is the per-particle fillRect:
       7,000 of them for the hero line. Running that every frame forever, on
       every headline, is the load that took the page to 20fps once already.
       So the resting mosaic is rendered ONCE into an offscreen canvas and
       each frame costs two drawImage calls and one gradient fill, whatever
       the cell count.

       It runs only while the headline is on screen, settled, and the black
       hole is idle. The hole is the better animation; the wave gets out of
       its way and comes back when the hole is done. */
    var restCv = null, waveCv = null, scratch = null;
    var waveRaf = null, waveMix = 0;

    /* The palette.

       The first version listed two brand colours and let the gradient
       interpolate between them. That is what produced the "ugly green": any
       two hues mixed in sRGB pass through a desaturated middle, so gold to
       olive-green spends most of its span as mud. Naming nicer endpoints does
       not help — the mud is between them, not at them.

       So the stops are GENERATED with saturation and lightness held at the
       accent colour and only the hue moving. Nothing between two stops can be
       duller than the stops themselves, which is exactly what an animated
       gradient border does. data-wave-style picks how far the hue travels:

         sheen    hue fixed, lightness swings   — a metallic shine, no colour
         hue      +/- 55 degrees                — still reads as the brand
         rainbow  the full circle               — the animated-border look

       data-wave-colors still overrides everything with a literal list. */
    /* Built once, not once per frame. It used to allocate thirteen strings
       every frame for a list that only changes when the theme does - and
       garbage per frame never stops. Cleared in markWaveParticles(), which is
       exactly where a theme switch lands. */
    var palCache = null;
    function paletteFor() {
      if (WAVE_COLS.length) return WAVE_COLS;
      if (!palCache) palCache = wavePalette(WAVE_STYLE, accentRGB(), groundRGB());
      return palCache;
    }

    function offscreen(w, h) {
      var c = document.createElement("canvas");
      c.width = w; c.height = h;
      return c;
    }

    /* One scratch canvas per headline, reused: a canvas allocated per frame
       is garbage per frame, and garbage per frame never stops. */
    function scratchCv() {
      if (!scratch || scratch.width !== cv.width || scratch.height !== cv.height) {
        scratch = offscreen(cv.width, cv.height);
      }
      return scratch;
    }

    /* Which cells are "the accent"?

       Two wrong answers came before this one, and both shipped a visible bug
       on the comparison page:

       - "the ones matching .accent" — that class only carries a colour inside
         .hero-h, so everywhere else it returned the ordinary text colour,
         EVERY cell matched, and the whole line waved.
       - "the ones that are NOT the base text colour" — that also catches the
         dimmed half of a heading like "Things that <span class=dim>actually
         shipped</span>", which would have turned grey words gold.

       The question that survives both is asked of the TOKEN, not of an
       element: a cell is accent if its colour is close to --acc-text, which
       is defined on every host whether or not anything on the page uses it. */
    function accentRGB() { return tokenRGB(host, "--acc-text", ACC); }

    /* The ground this mosaic is actually painted on: the first ancestor with
       an opaque background. A band on paper and a band on ink need different
       stops from the same palette, and asking the token would answer for the
       page rather than for this headline. */
    function groundRGB() {
      var el = host, n;
      while (el) {
        n = (getComputedStyle(el).backgroundColor.match(/[\d.]+/g) || []).map(Number);
        if (n.length >= 3 && (n[3] === undefined || n[3] > 0.99)) return n.slice(0, 3);
        el = el.parentElement;
      }
      return [13, 12, 10];
    }

    /* Decide ONCE which cells carry the wave, and record it on the particle
       so that every draw path asks the same question and gets the same
       answer. In "accent" mode only the non-base-coloured cells move, so a
       two-tone headline keeps its two tones and the wave reads as a
       highlight rather than as a repaint of the whole line. */
    function markWaveParticles() {
      palCache = null;                       // the theme may have changed under us
      if (WAVE === "off") return;
      var acc = accentRGB(), i;
      for (i = 0; i < parts.length; i++) {
        var p = parts[i];
        if (WAVE === "all") { p.wave = true; continue; }
        var n = (p.col.match(/[\d.]+/g) || []).map(Number);
        p.wave = Math.abs(n[0] - acc[0]) + Math.abs(n[1] - acc[1]) +
          Math.abs(n[2] - acc[2]) < 110;
      }
      /* A headline with no accent in it marks nothing and animates nothing,
         which is correct and silent.

         There is deliberately NO guard for "everything matched" any more.
         The two earlier rules asked an ELEMENT which cells were accent, and
         when that element carried no colour they answered "all of them" —
         so a whole-line match really was evidence of a broken rule, and the
         guard was right to refuse it. This rule asks the TOKEN, which is
         defined whether or not anything on the page uses it, so a whole-line
         match now means what it says. Keeping the guard cost real work: the
         hero's second line is entirely accent-coloured, matched completely,
         and was silently switched off by its own safety net.

         The lesson generalises: a guard written against one failure keeps
         firing after that failure is gone, and then it is just a bug with a
         good reason in its comment. */
      /* The bounding box of the marked cells used to be measured here, so
         that the band could be sized to it. The tiled gradient covers the
         whole canvas at every moment, so there is no span to fit any more
         and keeping the measurement would be work whose result nobody
         reads. */
      measurePagePos();
    }

    /* The travelling gradient, as a fill style.

       The first version was a BAND: one pass of the palette, sized to the
       cells it tints, sliding across them. Everything outside the band took
       the clamped end stop - and both end stops are the accent hue. That one
       fact produced all three of the owner's complaints at once:

         "das wird zu schnell wieder reines gelb"  most of the line was sitting
                                                   on a clamped end
         "der uebergang zwischen woertern ist      the edge of the band ran
          komisch angehackt"                       through the middle of a word
         "als ob der gradient neu geladen wird"    the band teleported back when
                                                   its offset wrapped

       So the palette is TILED instead: it repeats end to end, past both edges
       of the canvas. Nothing is ever clamped, because nothing is ever outside
       the gradient - and since the palette starts and ends on the same hue,
       the joins are invisible and a shift of exactly one period leaves an
       identical picture. That is what makes the wrap unseeable: there is no
       longer a moment to see.

       The axis leans ("gradient bitte schraeger machen, nicht gerade"), and
       the phase comes from wall-clock time and PAGE position rather than from
       a frame counter and element position - so the speed is the same on a
       30Hz and a 120Hz screen, and two headlines are two windows onto one
       wave instead of two waves that merely look alike.

       Both the resting path and the physics path paint with this, so the
       colours do not change when the black hole takes the canvas. An earlier
       build tinted only at rest and the line snapped back to its base colours
       the moment the hole touched it: the same defect as two draw paths using
       different grids. */
    var pageP = 0;

    /* Where this canvas sits along the wave axis, measured in PAGE pixels, so
       that the phase below can be shared between headlines. Page coordinates
       do not change when the visitor scrolls, so this is measured on settle
       and on resize, never per frame - getBoundingClientRect forces layout. */
    function measurePagePos() {
      var r = cv.getBoundingClientRect(), a = WAVE_ANGLE * Math.PI / 180;
      pageP = (r.left + (window.scrollX || 0)) * Math.cos(a) +
        (r.top + (window.scrollY || 0)) * Math.sin(a);
    }

    function waveGradient(c2d) {
      var pal = paletteFor(), n = pal.length;
      if (n < 2) return pal[0] || "#fff";
      var a = WAVE_ANGLE * Math.PI / 180, ux = Math.cos(a), uy = Math.sin(a);
      var per = Math.max(80, WAVE_PERIOD);

      /* the canvas projected onto the axis, via its four corners, so that a
         negative angle is covered just as completely as a positive one */
      var c1 = W * ux, c2 = H * uy;
      var base = Math.min(0, c1, c2, c1 + c2);
      var reach = Math.max(0, c1, c2, c1 + c2) - base;

      /* one tile per period plus one, so the repeats reach past both edges
         and no cell is ever outside the gradient */
      var reps = Math.ceil(reach / per) + 1;

      /* The phase is wall-clock time offset by the page position: the colour
         at a point depends on where that point is ON THE PAGE, not on where
         it sits inside its element, so neighbouring headlines are two windows
         onto one wave. */
      var shift = (Date.now() / 1000 / Math.max(0.2, WAVE_CYCLE)) * per - pageP;
      var start = base - per + (((shift - base + per) % per) + per) % per;
      var end = start + reps * per;

      var g = c2d.createLinearGradient(start * ux, start * uy, end * ux, end * uy);
      for (var r = 0; r < reps; r++) {
        for (var k = 0; k < n; k++) {
          // the last stop of one tile IS the first of the next: place it once
          if (r && k === 0) continue;
          g.addColorStop((r + k / (n - 1)) / reps, pal[k]);
        }
      }
      return g;
    }

    function buildWaveLayers() {
      restCv = offscreen(cv.width, cv.height);
      waveCv = offscreen(cv.width, cv.height);
      var rc = restCv.getContext("2d"), wc = waveCv.getContext("2d");
      rc.setTransform(DPR, 0, 0, DPR, 0, 0);
      wc.setTransform(DPR, 0, 0, DPR, 0, 0);
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i], target = p.wave ? wc : rc;
        target.fillStyle = p.col;
        target.fillRect(snap(p.cx), snap(p.cy), BLOCK, BLOCK);
      }
    }

    /* A handful of cells per frame flip to a palette colour on top of the
       finished image. Fixed cost, unrelated to how many cells there are. */
    function sprinkle(pal) {
      var n = Math.min(90, Math.round(parts.length * 0.012));
      for (var i = 0; i < n; i++) {
        var p = parts[(Math.random() * parts.length) | 0];
        ctx.fillStyle = pal[(Math.random() * pal.length) | 0];
        ctx.fillRect(snap(p.cx), snap(p.cy), BLOCK, BLOCK);
      }
    }

    function waveFrame() {
      waveRaf = null;
      if (!waveRunning()) { waveMix = 0; drawStatic(); return; }
      if (!restCv) buildWaveLayers();
      // ease in after a settle, so the colour does not snap on
      waveMix = Math.min(1, waveMix + 0.03);

      /* Tint a COPY of the wave layer, never the layer itself: tinting in
         place compounds every frame until the letters are one flat colour. */
      var tmp = scratchCv(), tc = tmp.getContext("2d");
      tc.setTransform(1, 0, 0, 1, 0, 0);
      tc.clearRect(0, 0, tmp.width, tmp.height);
      tc.drawImage(waveCv, 0, 0);
      tc.setTransform(DPR, 0, 0, DPR, 0, 0);
      var g = waveGradient(tc);
      tc.globalAlpha = waveMix;
      tc.globalCompositeOperation = "source-atop";
      tc.fillStyle = g;
      tc.fillRect(0, 0, W, H);
      tc.globalCompositeOperation = "source-over";
      tc.globalAlpha = 1;

      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(restCv, 0, 0, W, H);
      ctx.drawImage(tmp, 0, 0, W, H);
      if (WAVE === "shimmer") sprinkle(paletteFor());

      waveRaf = requestAnimationFrame(waveFrame);
    }

    function waveRunning() {
      return WAVE !== "off" && !reduced && onScreen && interactive && iraf === null;
    }
    function waveKick() {
      if (waveRunning() && !waveRaf) waveRaf = requestAnimationFrame(waveFrame);
    }
    function waveStop() {
      if (waveRaf) { cancelAnimationFrame(waveRaf); waveRaf = null; }
      waveMix = 0;
    }

    function settle() {
      for (var i = 0; i < parts.length; i++) { var p = parts[i]; p.cx = p.tx; p.cy = p.ty; p.vx = 0; p.vy = 0; }
      drawStatic();
      /* "the field has finished assembling and holds its real colours".
         `assembling` cannot answer that - it stays on for good, because it is
         what keeps the real text hidden behind the canvas. A measuring tool
         needs a settle CONDITION and not a longer wait: mid-flight the field
         carries the mustard flash on a sixth of its cells, which measures 1.5:1
         on paper and turns every audit run into a false alarm. */
      host.dataset.pxSettled = "1";
      interactive = true;
      cv.style.pointerEvents = "auto";
      restCv = null;          // the colours may have changed since the last build
      markWaveParticles();
      waveKick();
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
      // keep the wave travelling while the hole plays, rather than dropping
      // the whole line back to its base colours for the length of the pass
      var waveGrad = null;
      if (WAVE !== "off" && !reduced) waveGrad = waveGradient(ctx);
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
        ctx.fillStyle = (p.wave && waveGrad) ? waveGrad : p.col;
        ctx.fillRect(snap(p.cx), snap(p.cy), BLOCK, BLOCK);
      }
      if (moving || mouseX > -9000 || roam || Math.abs(hVel) > 0.4) iraf = requestAnimationFrame(physics);
      else { iraf = null; drawStatic(); waveKick(); }
    }
    function kick() {
      if (interactive && !iraf && !reduced) {
        waveStop();                                  // the hole owns the canvas
        iraf = requestAnimationFrame(physics);
      }
    }

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
        waveKick();
      } else {
        clearTimeout(roamTimer);
        killPass();
        waveStop();          // nothing animates off screen
      }
    }, { threshold: 0 }).observe(host);
    velSubs.push(function (v) {
      hVel = v;
      if (onScreen && Math.abs(v) > 2) kick();
    });

    var buildSeq = 0;
    function play() {
      cancelAnimationFrame(raf); cancelAnimationFrame(iraf); iraf = null;
      waveStop(); restCv = null;
      interactive = false; start = null; killPass(); zoomIn = false;
      cv.style.pointerEvents = "none"; cv.style.display = "block";
      host.classList.add("assembling");
      delete host.dataset.pxSettled;
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
      waveStop(); restCv = null;
      interactive = false; killPass(); zoomIn = false; host.classList.add("assembling");
      delete host.dataset.pxSettled;
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

  /* ============================================================
     6) VOID REVEAL — the AI-section signature. A dark "black hole"
        disc sweeps across the host; the host's real text is sampled
        into a coloured pixel field that stays HIDDEN ahead of the
        void and MATERIALISES in its wake (scatter -> home, with a
        mustard leading-edge flash, same physics as the headlines).
        Behind the text the disc itself is drawn as a glowing senf
        ring with a black core, so it reads as something punching
        through from the dark page. Real DOM text always stays in the
        document (the canvas is aria-hidden presentation only) — it's
        just transparent until revealed, so SEO/a11y are intact.

        PixelFX.voidReveal(host) -> { play(), redraw(), host }
          host : the element whose textContent is sampled. Tunables:
            data-gap  pixel pitch (default 3)
            data-size pixel draw size (default 2)
            data-dir  sweep direction: "lr" (default) | "rl"
        Plays once per IntersectionObserver hit; re-arms on redraw.
     ============================================================ */
  function voidReveal(host) {
    var GAP = parseFloat(host.dataset.gap) || 3;
    var SIZE = parseFloat(host.dataset.size) || 2;
    var DIR = host.dataset.dir === "rl" ? -1 : 1;
    var DUR = 1500;

    // keep the real text in the flow for SEO/a11y but invisible — the
    // canvas paints the pixel version on top, aligned to the same box
    var txt = document.createElement("span");
    txt.className = "vr-txt";
    while (host.firstChild) txt.appendChild(host.firstChild);
    host.appendChild(txt);
    var cv = document.createElement("canvas"), ctx = cv.getContext("2d");
    cv.className = "vr-canvas";
    cv.setAttribute("aria-hidden", "true");
    host.appendChild(cv);

    var parts = [], raf = null, W = 0, H = 0, built = false, playing = false;

    function build(done) {
      var r = txt.getBoundingClientRect();
      W = Math.ceil(r.width); H = Math.ceil(r.height);
      if (W < 2 || H < 2) { if (done) done(false); return; }
      cv.style.width = W + "px"; cv.style.height = H + "px";
      cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      rasterizeNode(txt, W, H, function (img, imgW) {
        if (!img) { if (done) done(false); return; }
        var s = sampleField(img, imgW, W, H, GAP, 110);
        parts = s.map(function (p) {
          return {
            hx: p.hx, hy: p.hy,
            // scatter origin: pulled toward the incoming void edge
            sx: p.hx - DIR * (40 + Math.random() * 90),
            sy: p.hy + (Math.random() - .5) * H * 0.9,
            col: rgbStr(p.color),
            flash: Math.random() < 0.18
          };
        });
        built = true;
        if (done) done(parts.length > 0);
      });
    }

    function play() {
      if (playing || reduced) { host.classList.add("vr-done"); return; }
      function run() {
        if (!parts.length) { host.classList.add("vr-done"); return; }
        playing = true;
        host.classList.add("vr-playing");
        var t0 = null;
        // the void travels a bit past both edges so every pixel gets swept
        var span = W + H * 1.4;
        function frame(t) {
          if (!t0) t0 = t;
          var g = Math.min(1, (t - t0) / DUR);
          var ease = 1 - Math.pow(1 - g, 2);            // ease-out: decelerates
          // void centre x position (in host space), travelling DIR
          var voidX = DIR > 0 ? (-H * 0.7 + ease * span) : (W + H * 0.7 - ease * span);
          ctx.clearRect(0, 0, W, H);

          // 1) the glowing void disc — black core, senf ring, drawn behind
          var vr = H * 0.62;
          var grad = ctx.createRadialGradient(voidX, H / 2, vr * 0.2, voidX, H / 2, vr * 1.25);
          grad.addColorStop(0, "rgba(8,7,6,0.95)");
          grad.addColorStop(0.62, "rgba(8,7,6,0.55)");
          grad.addColorStop(0.82, "rgba(245,197,24,0.55)");
          grad.addColorStop(1, "rgba(245,197,24,0)");
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(voidX, H / 2, vr * 1.25, 0, Math.PI * 2);
          ctx.fill();

          // 2) pixels: revealed once the void's leading edge has passed them.
          //    each pixel eases from its scatter origin to home over a short
          //    local window after the void front crosses its x.
          var reveal = 70;                                // px of travel from scatter->home
          for (var i = 0; i < parts.length; i++) {
            var p = parts[i];
            // signed distance from the void front to this pixel (negative = already passed)
            var rel = DIR > 0 ? (voidX - p.hx) : (p.hx - voidX);
            if (rel < 0) continue;                        // void hasn't reached it yet
            var local = Math.min(1, rel / reveal);
            var ei = 1 - Math.pow(1 - local, 3);          // ease-out cubic
            ctx.globalAlpha = local;
            // leading edge glows senf, settles to its real colour
            ctx.fillStyle = (local < 0.75 && p.flash) ? ACC : p.col;
            ctx.fillRect(p.sx + (p.hx - p.sx) * ei, p.sy + (p.hy - p.sy) * ei, SIZE, SIZE);
          }
          ctx.globalAlpha = 1;

          if (g < 1) { raf = requestAnimationFrame(frame); }
          else {
            // settle: hand off to the real text (CSS reveals .vr-txt), wipe canvas
            raf = null; playing = false;
            host.classList.remove("vr-playing");
            host.classList.add("vr-done");
            ctx.clearRect(0, 0, W, H);
          }
        }
        raf = requestAnimationFrame(frame);
      }
      if (built && parts.length) run(); else build(function (ok) { if (ok) run(); else host.classList.add("vr-done"); });
    }

    function redraw() {
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      playing = false; built = false; parts = [];
      host.classList.remove("vr-playing", "vr-done");
      build(function () {});
    }

    // pre-sample while idle so the first play is instant
    var vIdle = window.requestIdleCallback || function (fn) { setTimeout(fn, 400); };
    vIdle(function () { if (!built) build(function () {}); });

    return { host: host, play: play, redraw: redraw };
  }

  /* ============================================================
     7) SLIDE BRIDGE — the cinematic project-slider transition.
        Rasterizes the OUTGOING slide into particles that scatter
        + fade, while the INCOMING slide assembles from scattered
        particles to home — same physics language as the headlines.
        Pure overlay on a single canvas sized to the stage; the real
        slide DOM is swapped underneath at the crossover. Parks at 0
        idle frames; reduced-motion never calls this (controller does
        an instant swap instead).

        PixelFX.slides(stage) -> { go(fromEl, toEl, dir, done) }
          stage : the positioned container that holds the slides
          fromEl/toEl : the slide elements (their .pslide-inner is sampled)
          dir   : +1 (next, incoming rises) or -1 (prev, incoming sinks)
          done  : called once the bridge has handed off to the DOM slide
     ============================================================ */
  function slides(stage) {
    if (!stage) return null;
    var cv = document.createElement("canvas");
    cv.className = "slider-bridge";
    cv.setAttribute("aria-hidden", "true");
    var ctx = cv.getContext("2d");
    stage.appendChild(cv);

    var raf = null, W = 0, H = 0;
    var GAP = 6, DUR = 1000, PX = 4;   // coarser + slower + bigger pixels = a transition you can't miss

    function size() {
      var r = stage.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width));
      H = Math.max(1, Math.round(r.height));
      cv.style.width = W + "px"; cv.style.height = H + "px";
      cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    /* rasterize a slide's inner content into a coarse particle field,
       positioned within the stage box (so out + in line up visually) */
    function fieldOf(slideEl, cb) {
      var inner = slideEl.querySelector(".pslide-inner") || slideEl;
      var sr = stage.getBoundingClientRect(), ir = inner.getBoundingClientRect();
      var ox = ir.left - sr.left, oy = ir.top - sr.top;
      var iw = Math.max(1, Math.round(ir.width)), ih = Math.max(1, Math.round(ir.height));
      rasterizeNode(inner, iw, ih, function (img, imgW) {
        if (!img) { cb([]); return; }
        var s = sampleField(img, imgW, iw, ih, GAP, 60), out = [];
        for (var i = 0; i < s.length; i++) {
          out.push({ hx: s[i].hx + ox, hy: s[i].hy + oy, col: rgbStr(s[i].color) });
        }
        cb(out);
      });
    }

    /* ---- transition variants ----
       Each variant decides the SCATTER ORIGIN of every particle: where an
       outgoing pixel flies TO, and where an incoming pixel comes FROM. The
       physics (ease, fade, flash) is shared so they all feel like one
       studio. Pick per slide via data-anim; default 'pixel'. */
    var ANIMS = {
      // signature: vertical drift in scroll direction + horizontal jitter
      pixel: {
        dur: 1000, flash: 0.16,
        out: function (p, i) { p.sx = p.hx + (Math.random() - .5) * W * 0.55; p.sy = p.hy + (-i) * (H * 0.6 + Math.random() * H * 0.7); },
        inn: function (q, i) { q.sx = q.hx + (Math.random() - .5) * W * 0.55; q.sy = q.hy + i * (H * 0.6 + Math.random() * H * 0.7); q.d = Math.random() * 0.4; }
      },
      // falling sand: everything drops down, the new slide rises from below
      shatter: {
        dur: 1150, flash: 0.12,
        out: function (p) { p.sx = p.hx + (Math.random() - .5) * 50; p.sy = p.hy + H * (0.7 + Math.random() * 0.9); },
        inn: function (q) { q.sx = q.hx + (Math.random() - .5) * 50; q.sy = q.hy - H * (0.5 + Math.random() * 0.6); q.d = (q.hy / H) * 0.35 + Math.random() * 0.2; }
      },
      // horizontal push with a pixel smear, follows scroll direction
      swipe: {
        dur: 950, flash: 0.14,
        out: function (p, i) { p.sx = p.hx + (-i) * (W * 0.9 + Math.random() * W * 0.5); p.sy = p.hy + (Math.random() - .5) * 40; },
        inn: function (q, i) { q.sx = q.hx + i * (W * 0.9 + Math.random() * W * 0.5); q.sy = q.hy + (Math.random() - .5) * 40; q.d = Math.random() * 0.28; }
      },
      // zoom-through: out explodes outward from centre, in implodes from edges
      zoom: {
        dur: 1050, flash: 0.18,
        out: function (p) { var cx = W / 2, cy = H / 2, k = 1.9 + Math.random() * 1.0; p.sx = cx + (p.hx - cx) * k; p.sy = cy + (p.hy - cy) * k; },
        inn: function (q) { var cx = W / 2, cy = H / 2, k = 0.15 + Math.random() * 0.25; q.sx = cx + (q.hx - cx) * k; q.sy = cy + (q.hy - cy) * k; q.d = Math.random() * 0.35; }
      }
    };

    function go(fromEl, toEl, dir, anim, done) {
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      size();
      var cfg = ANIMS[anim] || ANIMS.pixel;
      var ready = 0, fOut = [], fIn = [];
      function start() {
        for (var i = 0; i < fOut.length; i++) cfg.out(fOut[i], dir);
        for (var j = 0; j < fIn.length; j++) { cfg.inn(fIn[j], dir); if (typeof fIn[j].d !== "number") fIn[j].d = Math.random() * 0.3; }
        var t0 = null;
        function frame(t) {
          if (!t0) t0 = t;
          var g = Math.min(1, (t - t0) / cfg.dur);
          ctx.clearRect(0, 0, W, H);
          // outgoing fades out over the first ~65%
          var oa = Math.max(0, 1 - g / 0.65);
          if (oa > 0) {
            var eo = g * g;                 // ease-in: accelerates away
            ctx.globalAlpha = oa;
            for (var i = 0; i < fOut.length; i++) {
              var p = fOut[i];
              ctx.fillStyle = p.col;
              ctx.fillRect(p.hx + (p.sx - p.hx) * eo, p.hy + (p.sy - p.hy) * eo, PX, PX);
            }
          }
          // incoming assembles, each particle eased from its delay
          for (var j = 0; j < fIn.length; j++) {
            var q = fIn[j];
            var local = Math.max(0, Math.min(1, (g - q.d) / (1 - q.d)));
            var ei = 1 - Math.pow(1 - local, 3);   // ease-out cubic (matches headlines)
            ctx.globalAlpha = local * local;
            ctx.fillStyle = (local < .8 && q.flash) ? ACC : q.col;
            ctx.fillRect(q.sx + (q.hx - q.sx) * ei, q.sy + (q.hy - q.sy) * ei, PX, PX);
          }
          ctx.globalAlpha = 1;
          if (g < 1) { raf = requestAnimationFrame(frame); }
          else { ctx.clearRect(0, 0, W, H); raf = null; if (done) done(); }
        }
        raf = requestAnimationFrame(frame);
      }
      fieldOf(fromEl, function (a) { fOut = a; for (var i = 0; i < a.length; i++) a[i].flash = false; if (++ready === 2) start(); });
      fieldOf(toEl, function (b) { fIn = b; for (var i = 0; i < b.length; i++) b[i].flash = Math.random() < cfg.flash; if (++ready === 2) start(); });
    }

    function cancel() { if (raf) { cancelAnimationFrame(raf); raf = null; } ctx.clearRect(0, 0, W, H); }

    return { el: cv, go: go, cancel: cancel, resize: size, anims: ANIMS };
  }

  /* ---------- image → particle field with pointer black-hole ----------
     A faithful port of the Claude-Design portrait mechanic: the photo is
     sampled into FINE colour particles on a canvas; on hover the field
     assembles, and the pointer becomes a black hole that pushes nearby
     pixels out (the "wormhole" crater) while a spring pulls each pixel
     back to its home. Same-origin images only (getImageData throws on a
     tainted canvas → silent no-op). Returns { enter, leave, destroy }. */
  function pixelImage(container, opts) {
    opts = opts || {};
    var img = container.querySelector("img");
    if (!img) return null;

    var GAP = opts.gap || 4;        // sample stride in CSS px (fine pixels)
    var SIZE = opts.size || 4;      // drawn pixel size in CSS px
    var R = opts.radius || 46;      // black-hole radius
    var FORCE = opts.force || 2.4;  // push strength
    var SPRING = 0.10, DAMP = 0.86; // return-to-home spring + damping

    var cv = document.createElement("canvas");
    cv.className = "px-canvas";
    cv.setAttribute("aria-hidden", "true");
    // display, NOT opacity: photo and mosaic swap with a hard cut. Two opaque
    // layers cross-dissolving composite to 1-(1-a)^2, a dip to ~75% halfway,
    // which read as a dark pulse on the dark cards — and the two durations
    // (.3s canvas / .35s photo) never lined up anyway. PixelFX.button has
    // always swapped instantly; see showPhoto/showMosaic below.
    cv.style.cssText = "position:absolute;inset:0;width:100%;height:100%;" +
      "display:none;pointer-events:none;z-index:2";
    container.appendChild(cv);
    // NOT willReadFrequently: this canvas is only DRAWN to (GPU path). The
    // pixel READBACK happens on a separate offscreen in build(). Mixing a
    // readback-flagged context with per-frame fills was tinting the output.
    var ctx = cv.getContext("2d");

    var parts = null, W = 0, H = 0, raf = null, active = false, tainted = false;
    var mx = -9999, my = -9999;
    // Particles live on a regular grid, indexed row*COLS+col, so the cells the
    // black hole disturbs can be addressed by arithmetic instead of a scan.
    var COLS = 0, ROWS = 0;
    // The settled mosaic, rendered once. Blitted in a single drawImage per
    // frame so only the DISTURBED pixels are ever drawn individually — see step().
    var home = null;
    // bounding box (grid coords) of everything currently off its home pixel
    var dc0 = 0, dc1 = -1, dr0 = 0, dr1 = -1, dirty = false;

    /* Photo <-> mosaic dissolve, done INSIDE the canvas.

       Fading the two as separate CSS layers cannot look right: source-over
       coverage is a + b(1-a), so two opaque layers passing each other dip to
       ~75% halfway and the dark card shows through as a pulse. Here the sharp
       photo is painted first at alpha 1 and the mosaic laid over it at alpha
       `mix` — the composite is opaque at every step, so the picture simply
       coarsens and resolves again. mix 0 = the photo, pixel for pixel. */
    var photoCv = null;
    // The effect on its own layer: the mosaic with the crater carved out of it,
    // rendered opaque. It is composited over the photo in ONE drawImage, so the
    // whole picture is photo*(1-mix) + effect*mix by construction and the
    // disturbed region cannot be blended differently from its surroundings.
    var fxCv = null, fxCtx = null;
    // What the crater shows. Painted rather than left transparent — leaving a
    // hole means coverage below 1 exactly where the effect is strongest, and
    // that is what made the disturbed rectangle visible against its
    // surroundings mid-dissolve.
    var voidCol = "#0d0c0a";
    /* How far the crater goes toward that colour. 1 is a clean cut-out, which
       is what the hole used to be — and on the light theme that put a hard
       white disc in the middle of a dark photo, the case the owner flagged.
       Below 1 the mosaic stays faintly present inside the hole, so it reads as
       the picture being pulled apart rather than a shape stamped over it. The
       Claude-Design original avoids the same problem differently: its blocks
       are smaller than the grid (`size = gap - 1.2`), so the background shows
       through everywhere and the hole is never a foreign element. That look
       screens every picture toward the page colour, which the owner's solid
       mosaic deliberately does not — hence this knob instead. */
    var VOID = opts.voidStrength || 0.62;
    // The one knob for how soft the change reads. What the eye calls "hard" is
    // the steepest part in the middle, and easeInOutCubic peaks at 3/FADE — so
    // stretching the duration is what softens it, not a different curve.
    var FADE = 640;
    var mix = 0, mixFrom = 0, mixTo = 0, mixT0 = 0, fading = false;

    // Assemble-on-reveal. The crisp photo is hidden for one frame, the mosaic
    // swarms in from a scatter, condenses, and hands the picture back sharp.
    // Deliberately NOT gated on hover support — touch devices get the reveal,
    // they just never get the black hole.
    var ASSEMBLE = 900, STAGGER = 500;
    var revealState = "idle";            // idle | assembling | done
    var aRaf = null, aT0 = 0;

    /* The LAYOUT box of the picture, never getBoundingClientRect().

       getBoundingClientRect returns the axis-aligned HULL of a transformed
       element. The portraits under (05) are rotated, and their scroll drift
       ANIMATES that rotation (-6.5deg to -1.2deg), so the hull runs up to 13%
       wider and 8% taller than the box — by an amount that depends on where
       the page happens to be scrolled. The canvas is pinned to the box
       (`inset:0; width:100%; height:100%`), so a field built at hull size is
       displayed squashed, unevenly in x and y: the picture visibly changed
       height the moment hover handed it to the canvas. Computed width/height
       are used values in the element's own coordinate system — transform-free
       by definition, and stable while the drift runs. */
    function boxSize() {
      var cs = getComputedStyle(container);
      var w = parseFloat(cs.width), h = parseFloat(cs.height);
      if (w > 0 && h > 0) return [w, h];
      var r = container.getBoundingClientRect();   // display:none etc.
      return [r.width, r.height];
    }

    // Build the particle field from the image once (cover-fit, sampled at GAP).
    function build() {
      var sz = boxSize();
      W = Math.max(1, Math.round(sz[0])); H = Math.max(1, Math.round(sz[1]));
      cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
      if (!img.complete || !img.naturalWidth) return false;
      COLS = Math.ceil(W / GAP); ROWS = Math.ceil(H / GAP);
      /* Sample at GRID resolution — one texel per cell, so the browser's
         downscale AVERAGES each cell instead of us point-sampling its top-left
         pixel. The mosaic stops speckling on fine detail (code, circuitry), and
         the readback is COLS*ROWS instead of W*H: 14k pixels on a work card
         rather than 224k. Taken from the Claude-Design original in
         `_v2-preview/assets/5e7a8095-*.js`, which does the same thing.
         It also retires the old fractional-GAP hazard: cells are addressed by
         integer index now, so no coordinate can land between RGBA bytes. */
      var off = document.createElement("canvas");
      off.width = COLS; off.height = ROWS;
      var octx = off.getContext("2d", { willReadFrequently: true });
      /* Cover-fit by DESTINATION rect, never by a source rect.

         The tempting version computes a crop from naturalWidth/naturalHeight
         and passes it as drawImage's 9-argument source rectangle. That is
         wrong for any <img> fed by srcset: naturalWidth reports the
         DENSITY-CORRECTED size in CSS px, while drawImage reads its source
         rectangle in RAW bitmap pixels. code-screen-640.webp is 640x440 on
         disk and reports 559x384 — so the crop grabbed the top-left 87% and
         the mosaic sat zoomed over the photo. On a display that picks the
         1200w candidate at density 2 it grabbed a QUARTER: the picture
         appeared at 200%, anchored top-left. Every card, every picture.

         The 5-argument form scales the WHOLE image into a destination rect,
         so no bitmap-space size is ever named and the ambiguity cannot
         return. Only the ASPECT is read from natural*, and a ratio is
         density-independent. This is exactly `object-fit: cover`. */
      var ir = img.naturalWidth / img.naturalHeight, cr = W / H, dw, dh;
      if (ir > cr) { dh = H; dw = H * ir; }      // wider than the box: crop sides
      else { dw = W; dh = W / ir; }              // taller: crop top and bottom
      // the same rectangle expressed in cells. The aspect still comes from the
      // BOX (W/H), not from COLS/ROWS — those carry a rounding error, and the
      // crop has to keep matching object-fit:cover exactly (tools/pixel_scale.sh)
      octx.drawImage(img, (W - dw) / 2 / GAP, (H - dh) / 2 / GAP, dw / GAP, dh / GAP);
      var data;
      try { data = octx.getImageData(0, 0, COLS, ROWS).data; }
      catch (e) { tainted = true; return false; }   // cross-origin → give up
      parts = new Array(COLS * ROWS);
      for (var row = 0; row < ROWS; row++) {
        for (var col = 0; col < COLS; col++) {
          var k = row * COLS + col, i = k * 4;
          parts[k] = {
            tx: col * GAP, ty: row * GAP, cx: col * GAP, cy: row * GAP, vx: 0, vy: 0,
            col: "rgb(" + data[i] + "," + data[i + 1] + "," + data[i + 2] + ")"
          };
        }
      }
      buildHome();
      // the sharp photo at device resolution — the opaque floor under the
      // dissolve, and what the crater shows through while the mosaic fades in
      photoCv = document.createElement("canvas");
      photoCv.width = cv.width; photoCv.height = cv.height;
      var pc = photoCv.getContext("2d");
      pc.setTransform(DPR, 0, 0, DPR, 0, 0);
      pc.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
      fxCv = document.createElement("canvas");
      fxCv.width = cv.width; fxCv.height = cv.height;
      fxCtx = fxCv.getContext("2d");
      readVoid();
      dirty = false;
      return true;
    }

    // The colour behind the canvas — what the crater used to reveal through a
    // transparent hole and now gets painted with. First ancestor that actually
    // has a background wins; it differs per theme and per host (.case is
    // --card, a .shot sits on the band), so it is read, never assumed.
    function readVoid() {
      var el = container;
      while (el && el !== document.documentElement) {
        var bg = getComputedStyle(el).backgroundColor;
        if (bg && bg !== "transparent" && bg.indexOf("rgba(0, 0, 0, 0)") !== 0) {
          voidCol = bg;
          return;
        }
        el = el.parentElement;
      }
    }

    /* easeInOutCubic — slow at both ends. A linear dissolve reads as a switch
       with a delay in the middle; this one has no moment where it "starts". */
    function ease(t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    // start (or reverse) the dissolve. Reversing mid-fade picks up from where
    // it is, so flicking the pointer on and off never snaps.
    function fadeTo(target) {
      if (mixTo === target && fading) return;
      mixFrom = mix; mixTo = target; mixT0 = performance.now();
      fading = mix !== target;
    }

    function tickMix(now) {
      if (!fading) return;
      var t = (now - mixT0) / (FADE * Math.abs(mixTo - mixFrom) || 1);
      if (t >= 1) { mix = mixTo; fading = false; return; }
      mix = mixFrom + (mixTo - mixFrom) * ease(t);
    }

    // The mosaic at rest is a still picture, so it is drawn ONCE here and
    // blitted per frame. Blocks tile exactly (every caller passes size === gap),
    // so draw order carries no meaning.
    function buildHome() {
      home = document.createElement("canvas");
      home.width = cv.width; home.height = cv.height;
      var hc = home.getContext("2d");
      hc.setTransform(DPR, 0, 0, DPR, 0, 0);
      for (var k = 0; k < parts.length; k++) {
        var p = parts[k];
        hc.fillStyle = p.col;
        hc.fillRect(p.tx, p.ty, SIZE, SIZE);
      }
    }

    // grow the disturbed box to cover a cell range, clamped to the grid
    function markCells(c0, c1, r0, r1) {
      if (c0 < 0) c0 = 0;
      if (r0 < 0) r0 = 0;
      if (c1 > COLS - 1) c1 = COLS - 1;
      if (r1 > ROWS - 1) r1 = ROWS - 1;
      if (c1 < c0 || r1 < r0) return;
      if (!dirty) { dc0 = c0; dc1 = c1; dr0 = r0; dr1 = r1; dirty = true; return; }
      if (c0 < dc0) dc0 = c0;
      if (c1 > dc1) dc1 = c1;
      if (r0 < dr0) dr0 = r0;
      if (r1 > dr1) dr1 = r1;
    }

    function parkHome() {
      for (var k = 0; k < parts.length; k++) {
        var p = parts[k];
        p.cx = p.tx; p.cy = p.ty; p.vx = 0; p.vy = 0;
      }
      dirty = false;
    }

    /* ---- the reveal: scatter → home, then hand back to the real photo ---- */
    function assembleStep(now) {
      var t = now - aT0;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.clearRect(0, 0, W, H);
      var done = true;
      for (var k = 0; k < parts.length; k++) {
        var p = parts[k];
        var local = (t - p.dly) / ASSEMBLE;
        if (local < 0) { done = false; continue; }
        if (local < 1) done = false; else local = 1;
        var e = 1 - Math.pow(1 - local, 3);      // easeOutCubic
        p.cx = p.sx + (p.tx - p.sx) * e;
        p.cy = p.sy + (p.ty - p.sy) * e;
        ctx.globalAlpha = Math.min(1, local * 1.6);
        ctx.fillStyle = p.col;
        ctx.fillRect(p.cx, p.cy, SIZE, SIZE);
      }
      ctx.globalAlpha = 1;
      if (!done) { aRaf = requestAnimationFrame(assembleStep); return; }
      aRaf = null;
      settleHome();
    }

    // every particle parked on its home pixel, then the mosaic resolves back
    // into focus instead of cutting — same dissolve the hover uses
    function settleHome() {
      revealState = "done";
      parkHome();
      mix = 1;
      if (active) { fading = false; mixTo = 1; return; }  // hover took over mid-flight
      fadeTo(0);
      run();
    }

    /* The <img> only ever swaps with the canvas at mix 0 or 1, where the two
       are the same picture — so the swap itself is invisible and all the
       softness lives in the dissolve inside the canvas. */
    function showPhoto() {
      cv.style.display = "none";
      img.style.transition = "none";
      img.style.opacity = "1";
    }

    function showMosaic() {
      img.style.transition = "none";
      img.style.opacity = "0";
      cv.style.display = "block";
    }

    function reveal() {
      if (reduced || tainted || revealState !== "idle") return;
      // lazy-loaded covers are routinely still in flight when they scroll in
      if (!img.complete || !img.naturalWidth) {
        img.addEventListener("load", reveal, { once: true });
        return;
      }
      if (!parts && !build()) return;            // tainted or too small → stay crisp
      for (var k = 0; k < parts.length; k++) {
        var p = parts[k];
        p.sx = p.tx + (Math.random() - 0.5) * W * 0.5;
        p.sy = p.ty + (Math.random() - 0.5) * H * 2 - H * 0.5;
        p.cx = p.sx; p.cy = p.sy;
        p.dly = Math.random() * STAGGER;
      }
      // the photo goes without a transition — a cross-fade here would show the
      // sharp picture dissolving, which is the opposite of assembling one
      showMosaic();
      mix = 1; fading = false; mixTo = 1;   // the swarm IS the mosaic, no floor under it
      revealState = "assembling";
      aT0 = performance.now();
      aRaf = requestAnimationFrame(assembleStep);
    }

    /* One frame of the black hole.

       The cost of this loop is the whole reason images felt laggy where the
       buttons never did: a button samples ~400 particles, a work card 14,157,
       and the old loop cleared the canvas and redrew EVERY one of them —
       measured at 5.15 ms/frame on the work card at DPR 1, two thirds of it
       spent re-parsing an "rgb(...)" string per particle. At DPR 2 that alone
       overruns the frame budget, so it dropped every other frame.

       The hole only ever reaches R around the pointer, so at rest the picture
       is a still image. It is blitted from `home` in one drawImage, and only
       the disturbed box is cleared and repainted particle by particle:
       0.54 ms/frame for the same card. The cost now follows the hole, not the
       size of the picture. */
    function step(now) {
      tickMix(now || performance.now());

      /* --- 1. the effect, on its own layer, at full strength ---
         Everything the black hole does happens here, opaque throughout: the
         settled mosaic, then the disturbed box wiped, filled with the colour
         behind the canvas (the crater) and repainted from the live physics.
         Earlier this was composited straight onto the main canvas with the
         photo at `1-mix` inside the box and `1` outside, which blended the
         disturbed region differently from its surroundings — the faint
         rectangle the owner could see mid-dissolve. Nothing here knows about
         `mix`, so that cannot come back. */
      fxCtx.setTransform(DPR, 0, 0, DPR, 0, 0);
      fxCtx.globalAlpha = 1;
      fxCtx.clearRect(0, 0, W, H);
      fxCtx.drawImage(home, 0, 0, W, H);         // every pixel back at home

      // nothing outside R of the pointer can be pushed this frame
      if (mx > -9000) {
        markCells(Math.floor((mx - R) / GAP), Math.ceil((mx + R) / GAP),
          Math.floor((my - R) / GAP), Math.ceil((my + R) / GAP));
      }

      var live = false, maxOff = 0;
      if (dirty) {
        // Dim the disturbed box toward the page colour, then repaint the pixels
        // opaquely where the physics put them. No clearRect: a cell whose pixel
        // is still home gets covered again anyway, and one whose pixel has left
        // keeps a faded imprint — that faded imprint IS the crater. Pixels
        // flung beyond the box land on top of the blit; that overlap is the
        // pile-up at the rim.
        fxCtx.globalAlpha = VOID;
        fxCtx.fillStyle = voidCol;
        fxCtx.fillRect(dc0 * GAP, dr0 * GAP,
          (dc1 - dc0) * GAP + SIZE, (dr1 - dr0) * GAP + SIZE);
        fxCtx.globalAlpha = 1;
        var nc0 = COLS, nc1 = -1, nr0 = ROWS, nr1 = -1;
        for (var row = dr0; row <= dr1; row++) {
          var base = row * COLS;
          for (var col = dc0; col <= dc1; col++) {
            var p = parts[base + col];
            // black-hole push (only while pointer is inside)
            if (mx > -9000) {
              var dx = p.cx - mx, dy = p.cy - my, d2 = dx * dx + dy * dy;
              if (d2 < R * R) {
                var dist = Math.sqrt(d2) || 0.001, fr = (1 - dist / R) * FORCE;
                p.vx += (dx / dist) * fr; p.vy += (dy / dist) * fr;
              }
            }
            // spring back home + damping
            p.vx += (p.tx - p.cx) * SPRING; p.vy += (p.ty - p.cy) * SPRING;
            p.vx *= DAMP; p.vy *= DAMP; p.cx += p.vx; p.cy += p.vy;
            var off = Math.abs(p.tx - p.cx) + Math.abs(p.ty - p.cy);
            if (off > maxOff) maxOff = off;
            // Off-home counts, not just moving: a pixel parked in the crater
            // under a stationary pointer has no velocity but must stay in the
            // box, or the next blit would paint it back home behind its back.
            if (Math.abs(p.vx) + Math.abs(p.vy) > 0.05 || off > 0.5) {
              live = true;
              if (col < nc0) nc0 = col;
              if (col > nc1) nc1 = col;
              if (row < nr0) nr0 = row;
              if (row > nr1) nr1 = row;
            }
            fxCtx.fillStyle = p.col;
            fxCtx.fillRect(p.cx, p.cy, SIZE, SIZE);
          }
        }
        dirty = nc1 >= nc0;
        if (dirty) { dc0 = nc0; dc1 = nc1; dr0 = nr0; dr1 = nr1; }
      }

      /* --- 2. one dissolve over the whole picture ---
         Sharp photo as an opaque floor, the finished effect laid over it at
         `mix`. Both are opaque and cover the full canvas, so coverage is 1 at
         every step of the fade and every pixel gets the same blend — there is
         no region with its own recipe, and so no edge and no corners. */
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(photoCv, 0, 0, W, H);
      if (mix > 0) {
        ctx.globalAlpha = mix;
        ctx.drawImage(fxCv, 0, 0, W, H);
        ctx.globalAlpha = 1;
      }

      // `live && mix > 0`, not `live`: once the dissolve has run out the pixels
      // are drawn at alpha 0, so simulating the rest of their spring tail would
      // be work nobody can see.
      if (active || fading || (live && mix > 0)) { raf = requestAnimationFrame(step); return; }

      // Pointer gone AND the dissolve has run out: at mix 0 the canvas is the
      // photo pixel for pixel, so handing back to the <img> is invisible. No
      // spring-tail race and no timer any more — the dissolve, not the
      // physics, decides when the picture is sharp again.
      raf = null;
      parkHome();
      showPhoto();
    }
    function run() { if (!raf) raf = requestAnimationFrame(step); }

    // Track the pointer on the WHOLE card (passed as trackEl) so the info box
    // and canvas overlay don't create dead zones. Coords are mapped into the
    // canvas box; outside the box → no hole (mx set out of range).
    var trackEl = opts.track || container;

    /* Client coords -> canvas coords, correct under a rotated ancestor.

       Subtracting getBoundingClientRect().left/top only works for an
       axis-aligned box. On the rotated portraits the hull's corner is not the
       box's corner — at -6.5deg it is off by H*sin(t) ~ 54px, more than the
       black hole's own radius — so the hole drifted away from the cursor
       towards the edges. Rather than reconstruct the matrix from computed
       styles (`translate`/`rotate`/`scale` are separate properties from
       `transform`, and the drift animates them), measure the mapping: a
       zero-sized probe placed at three known LOCAL points reports its
       transformed position, which gives the forward affine matrix directly.
       Invert once, cache, and drop the cache whenever the mapping can move. */
    var mA = null, probe = null;
    function measureMap() {
      // One probe for the life of the card. Creating and dropping a node per
      // pointermove is garbage on a path that runs while scrolling — and the
      // node is 0x0 and aria-hidden, so keeping it costs nothing.
      if (!probe) {
        probe = document.createElement("span");
        probe.setAttribute("aria-hidden", "true");
        probe.style.cssText = "position:absolute;width:0;height:0;pointer-events:none";
        container.appendChild(probe);
      }
      function at(x, y) {
        probe.style.left = x + "px"; probe.style.top = y + "px";
        var r = probe.getBoundingClientRect();   // a point's hull is the point
        return [r.left, r.top];
      }
      var o = at(0, 0), ex = at(100, 0), ey = at(0, 100);
      // columns of the forward matrix, per local px
      var axx = (ex[0] - o[0]) / 100, axy = (ex[1] - o[1]) / 100;
      var ayx = (ey[0] - o[0]) / 100, ayy = (ey[1] - o[1]) / 100;
      var det = axx * ayy - ayx * axy;
      mA = det ? {
        ox: o[0], oy: o[1],
        ixx: ayy / det, ixy: -ayx / det,
        iyx: -axy / det, iyy: axx / det
      } : null;
    }
    // The scroll drift animates the rotation, so the mapping is only valid for
    // the scroll position it was measured at. Listening only while active
    // keeps a dozen idle cards off the scroll path.
    function dropMap() { mA = null; }

    function onMove(e) {
      if (!mA) measureMap();
      var x, y;
      if (mA) {
        var dx = e.clientX - mA.ox, dy = e.clientY - mA.oy;
        x = dx * mA.ixx + dy * mA.ixy;
        y = dx * mA.iyx + dy * mA.iyy;
      } else {
        var r = cv.getBoundingClientRect();
        x = e.clientX - r.left; y = e.clientY - r.top;
      }
      if (x < -R || y < -R || x > W + R || y > H + R) { mx = -9999; my = -9999; }
      else { mx = x; my = y; }
      run();
    }

    // Particle home coords + the cover-fit sampling are cached against the box
    // size at build time. On resize they go stale (mosaic offset/scaled wrong),
    // so drop the field — it rebuilds on the next enter(), or immediately if the
    // card is being hovered right now. Debounced, mirrors the other engines.
    var rzt = null;
    function onResize() {
      clearTimeout(rzt);
      rzt = setTimeout(function () {
        // Cancel BEFORE dropping the field: a frame is routinely already queued
        // against it (a hover or the reveal), and it would run against a null
        // parts/home one tick later.
        if (raf) { cancelAnimationFrame(raf); raf = null; }
        if (aRaf) { cancelAnimationFrame(aRaf); aRaf = null; revealState = "done"; }
        parts = null; home = null; photoCv = null; fxCv = null; fxCtx = null; dirty = false;
        dropMap();
        // Nothing can be drawn until the field is rebuilt, so the picture goes
        // back to the sharp photo rather than to a frozen half-drawn canvas.
        if (active && build()) { showMosaic(); run(); }
        else { mix = 0; fading = false; mixTo = 0; showPhoto(); }
      }, 200);
    }
    addEventListener("resize", onResize);

    // Two independent activation sources — mouse hover and keyboard focus —
    // are ref-counted so a stray pointerleave can't tear down while the card is
    // still focused (and vice versa). Without this, crossing the two (hover in,
    // Tab in, mouse out) removes the pointermove listener mid-interaction, or —
    // worse — leaves the rAF loop + listener orphaned on a hidden card forever.
    var srcHover = false, srcFocus = false;
    function activate() {
      if (reduced || noHover || tainted) return;
      if (active) return;                 // idempotent: never double-add / double-rAF
      // hovering mid-reveal hands the swarm straight over to the black hole
      // instead of restarting it — the pixels never snap. The swarm is
      // scattered across the whole picture at that moment, so the entire grid
      // counts as disturbed; the box shrinks by itself as the pixels arrive.
      if (aRaf) {
        cancelAnimationFrame(aRaf); aRaf = null; revealState = "done";
        if (parts) markCells(0, COLS - 1, 0, ROWS - 1);
      }
      if (!parts && !build()) return;
      active = true;
      readVoid();                         // the theme may have flipped since the build
      showMosaic();                       // canvas takes over at mix 0 — identical picture
      fadeTo(1);                          // ...and coarsens into the mosaic from there
      trackEl.addEventListener("pointermove", onMove);
      dropMap();
      addEventListener("scroll", dropMap, { passive: true });
      run();
    }
    function deactivate() {
      if (!active) return;
      active = false; mx = -9999; my = -9999;
      fadeTo(0);   // resolves back into focus while the pixels spring home
      trackEl.removeEventListener("pointermove", onMove);
      removeEventListener("scroll", dropMap);
      run();
    }
    return {
      // one-shot, called when the picture scrolls into view
      reveal: reveal,
      // src: "hover" | "focus" (default treats a bare call as a full toggle so
      // older call sites still work). Teardown only once BOTH sources are gone.
      enter: function (src) {
        if (src === "hover") srcHover = true;
        else if (src === "focus") srcFocus = true;
        activate();
      },
      leave: function (src) {
        if (src === "hover") srcHover = false;
        else if (src === "focus") srcFocus = false;
        else { srcHover = srcFocus = false; }
        if (!srcHover && !srcFocus) deactivate();
      },
      destroy: function () {
        srcHover = srcFocus = active = false;
        if (raf) { cancelAnimationFrame(raf); raf = null; }
        if (aRaf) { cancelAnimationFrame(aRaf); aRaf = null; }
        showPhoto();
        clearTimeout(rzt);
        removeEventListener("resize", onResize);
        removeEventListener("scroll", dropMap);
        trackEl.removeEventListener("pointermove", onMove);
        if (probe) { probe.remove(); probe = null; }
        cv.remove();
      }
    };
  }

  /* ============================================================
     FIELD - a slow field of cells behind a band

     "Mehr Leben" without noise: the same 3px cell the headlines are built
     from, a few per cent of them lit, drifting. It says the page is made of
     pixels rather than decorating it with something else.

     The cost is the point. One tile is drawn ONCE into a canvas and handed to
     CSS as a repeating background; the drift is a transform on that layer, so
     there is no per-frame JavaScript and nothing to repaint - the compositor
     moves a texture it already has. A canvas the size of a band would have
     been 38MB of pixels per layer; a 256px tile is 260KB whatever the band.

     It loops by travelling exactly one tile: a repeating pattern shifted by
     its own period is the same picture, which is the same reason the headline
     wave and the assistant's rim tile instead of sweeping. Three effects, one
     idea, no visible seam in any of them.
     ============================================================ */
  function fieldTile(cell, cols, density, alphaLo, alphaHi) {
    var N = 64, T = cell * N;                       // tile side in CSS px
    var cv = document.createElement("canvas");
    cv.width = Math.round(T * DPR);
    cv.height = Math.round(T * DPR);
    var c = cv.getContext("2d");
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    // one device pixel of gap, exactly as the headlines do it - a block the
    // size of its cell is a solid sheet, not a pixel
    var block = Math.max(1, Math.round(cell * DPR) - 1) / DPR;
    for (var y = 0; y < N; y++) {
      for (var x = 0; x < N; x++) {
        if (Math.random() > density) continue;
        c.globalAlpha = alphaLo + Math.random() * (alphaHi - alphaLo);
        c.fillStyle = cols[(Math.random() * cols.length) | 0];
        c.fillRect(Math.round(x * cell * DPR) / DPR, Math.round(y * cell * DPR) / DPR,
          block, block);
      }
    }
    return { url: cv.toDataURL("image/png"), size: T };
  }

  /* host: the element the field sits behind (a band, usually). It gets one
     layer per entry in LAYERS, back to front. */
  function field(host, opts) {
    if (!host) return null;
    opts = opts || {};
    var cell = +(host.dataset.fieldCell || opts.cell || 3);
    var accent = opts.accent || "#f5c518";
    var ink = opts.ink || "#ffffff";

    /* Two layers at different speeds and densities read as depth. One layer
       reads as a texture that happens to slide, which is the thing that looks
       cheap. */
    var LAYERS = opts.layers || [
      { density: 0.05, alpha: [0.10, 0.30], secs: 64, cols: [ink] },
      { density: 0.018, alpha: [0.22, 0.55], secs: 38, cols: [ink, ink, accent] }
    ];

    var made = [];
    LAYERS.forEach(function (L) {
      var tile = fieldTile(cell, L.cols, L.density, L.alpha[0], L.alpha[1]);
      var el = document.createElement("div");
      el.className = "field-l";
      el.setAttribute("aria-hidden", "true");
      el.style.backgroundImage = "url(" + tile.url + ")";
      el.style.backgroundSize = tile.size + "px " + tile.size + "px";
      // the layer is one tile larger than the box in both directions, so the
      // travelling edge never enters the frame
      el.style.inset = -tile.size + "px";
      el.style.setProperty("--field-x", -2 * tile.size + "px");
      el.style.setProperty("--field-y", -tile.size + "px");
      if (!reduced) el.style.animationDuration = L.secs + "s";
      host.insertBefore(el, host.firstChild);
      made.push(el);
    });

    /* The layer deliberately overhangs its box by a whole tile, so the class
       that clips it is not decoration: without it every field bleeds a tile
       into its neighbours and four candidates on one page become one mess.
       `clip` rather than `hidden` - hidden would make the band a scroll
       container and break any sticky child inside it. */
    host.classList.add("has-field");
    if (getComputedStyle(host).position === "static") host.style.position = "relative";

    /* Off screen it stops. A composited transform is cheap, and "cheap"
       multiplied by every band on a long page is no longer cheap. */
    if (!reduced && "IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          made.forEach(function (el) {
            el.style.animationPlayState = e.isIntersecting ? "running" : "paused";
          });
        });
      }, { rootMargin: "120px" }).observe(host);
    }
    return { layers: made, destroy: function () { made.forEach(function (el) { el.remove(); }); } };
  }

  /* ============================================================
     DITHER - an ordered-dither field behind a band

     Adapted from the MIT-licensed `dither-background` skill in
     github.com/MengTo/Skills (agent-skills/web-design). The idea is theirs:
     a near-black field of enlarged square pixels thresholded through a 4x4
     Bayer matrix, shaped by fractal noise into broad cloud masses rather than
     grain. It reads as material, not as decoration - which is why it is worth
     borrowing for a page already built out of pixels.

     TWO THINGS ARE OURS, and both matter.

     1. Their loop calls fillRect once per cell per frame: at 1440x900 with a
        7px cell that is ~26,000 fillRects, sixty times a second. That is the
        exact shape of the work that took this page to 20fps once already. So
        the field is written into an ImageData at CELL resolution - one byte
        write per cell, not one draw call - and the canvas is then scaled up by
        CSS with image-rendering: pixelated. The enlarged squares come from the
        scaling, free, instead of from 26,000 rectangles.
     2. A slow cloud does not need 60fps. It renders at ~12fps, which is four
        times less work for a drift nobody can see move.

     The palette is ours too: it climbs from --ink toward --fg and stops well
     short of it, so body text keeps its contrast over the brightest cell.
     ============================================================ */
  var BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
    .map(function (v) { return (v + 0.5) / 16; });

  function dsmooth(a, b, v) {
    var t = Math.max(0, Math.min(1, (v - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }

  function dnoise(x, y) {
    var v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
    return v - Math.floor(v);
  }

  function dvalue(x, y) {
    var ix = Math.floor(x), iy = Math.floor(y);
    var fx = x - ix, fy = y - iy;
    var ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    return dnoise(ix, iy) * (1 - ux) * (1 - uy) +
      dnoise(ix + 1, iy) * ux * (1 - uy) +
      dnoise(ix, iy + 1) * (1 - ux) * uy +
      dnoise(ix + 1, iy + 1) * ux * uy;
  }

  function dfbm(x, y) {
    var v = 0, amp = 0.5, f = 1;
    for (var i = 0; i < 4; i++) { v += dvalue(x * f, y * f) * amp; f *= 2.02; amp *= 0.5; }
    return v;
  }

  /* A ramp from the band's own ink toward its own foreground, stopping at
     `top` of the way there. Derived rather than written out, so the field is
     the same material as the band in either theme.

     And CAPPED so it cannot eat the text. The brightest cell is the worst
     case every word on the band has to survive, and at the value that looked
     right by eye the small print measured 3.58:1 where it needs 4.5. So the
     top of the ramp is walked down until the dimmest text on the band clears
     the bar - the effect is not allowed to decide that for itself. */
  function ditherRamp(host, steps, top) {
    var lo = tokenRGB(host, "--ink", "#0d0c0a");
    var hi = tokenRGB(host, "--fg", "#f3f1e9");
    var txt = relLum(tokenRGB(host, "--muted", "#8a8578"));
    var mix = function (t) {
      return [lo[0] + (hi[0] - lo[0]) * t, lo[1] + (hi[1] - lo[1]) * t, lo[2] + (hi[2] - lo[2]) * t];
    };
    while (top > 0.02 && contrast(relLum(mix(top)), txt) < 4.6) top -= 0.005;
    var out = [], i, t;
    for (i = 0; i < steps; i++) {
      t = (i / (steps - 1)) * top;
      out.push([
        Math.round(lo[0] + (hi[0] - lo[0]) * t),
        Math.round(lo[1] + (hi[1] - lo[1]) * t),
        Math.round(lo[2] + (hi[2] - lo[2]) * t)
      ]);
    }
    return out;
  }

  function dither(host, opts) {
    if (!host) return null;
    /* Twice on one host is never intended, and it does not merely draw the
       cloud twice: the second canvas matches `.dither-l ~ *` in the sheet,
       which takes it OUT of the absolute layer and into the flow at full
       height, pushing everything below it down by a viewport. */
    if (host.classList.contains("has-field")) return null;
    opts = opts || {};
    var CELL = +(host.dataset.ditherCell || opts.cell || 7);
    var TOP = opts.top === undefined ? 0.22 : opts.top;
    var FPS = opts.fps || 12;
    var pal = opts.palette || ditherRamp(host, 6, TOP);

    /* ---------- THE VOID ----------
       A BLACK HOLE in the field, on the pointer - the same mechanic as the
       two this engine already has (pixelImage and headline), because they
       are the ones the owner already likes. In both, the hole DRAWS
       NOTHING: it is a repulsion, every pixel inside the radius is pushed
       outward, and the hole is the absence they leave.

       This is that, on a lattice: a cell at radius r reads the cloud from
       radius r - push(r), so material bunches at the rim on its own and the
       core has nothing left to read. What shows through the gap is an image
       lying BEHIND the cloud - exposed as pixels, on the field's own grid,
       so the picture arrives in the same material the header is made of. It
       lingers where the hand has just been and closes again.

       The image is sampled ONCE per size into one byte triple per cell. Per
       frame this costs a lookup and a lerp, not a decode - the cost follows
       the effect, not the area.

         data-hole       the image to expose (a URL). No URL, no hole.
         data-hole-r     hole radius in CSS px; omit for the images' own
                         rule, max(28, min(60, diag * .28))
         data-hole-wake  how far the exposure trails behind, in radii (2.2)
         data-hole-push  how far the field is shoved, in radii (.95)
         data-hole-quiet a selector for the boxes of type it must not eat

       IDLE IS NOT NOTHING. The images take an occasional pass on their own
       and hand over to the pointer mid-pass; a header that shows the effect
       only after the visitor happens to move the mouse shows it to nobody.
       Same roamLock, so only one thing on the page roams at a time.

       THE CEILING, on the picture: it is allowed to be bright where there
       is no type, and is clamped per cell to what the type over it can
       survive - 3:1 for a 105px display line, 4.5:1 for an 11px mono label.
       Darkening it globally for the worst spot on the header instead is
       what made the first build of this invisible.
       ---------------------------------------------------------------- */
    var HOLE = host.dataset.hole || opts.hole || "";
    var HR = +(host.dataset.holeR || opts.holeR || 0);   // CSS px; 0 = the images' rule
    var HWAKE = +(host.dataset.holeWake || opts.holeWake || 2.2);
    var HPUSH = +(host.dataset.holePush || opts.holePush || 0.95);
    var HQUIET = host.dataset.holeQuiet || opts.holeQuiet || "";

    var cv = document.createElement("canvas");
    cv.className = "dither-l";
    cv.setAttribute("aria-hidden", "true");
    var ctx = cv.getContext("2d", { alpha: false });
    if (!ctx) return null;
    host.classList.add("has-field");
    if (getComputedStyle(host).position === "static") host.style.position = "relative";
    host.insertBefore(cv, host.firstChild);

    /* ---------- why this is a ring of columns ----------

       The first version recomputed the whole field every rendered frame. The
       drawing was cheap by then - one ImageData byte per cell, not a fillRect
       - but that was the wrong half: the cost is the NOISE. Four octaves of
       value noise is sixteen sines per cell, and at a 3px cell that is two
       million sines a frame. Measured: 68 long tasks and 4 seconds of blocked
       main thread over one scroll.

       So the cloud is not recomputed, it SCROLLS. The field lives in a ring of
       columns; each tick computes exactly one new column - rows noise
       evaluations instead of cols x rows - and the read window advances by
       one. The cloud keeps evolving forever and never repeats, because the
       noise coordinate simply keeps going. What is left per frame is one
       array read and four byte writes per cell, which is arithmetic.

       The vignette is a property of the FRAME, not of the cloud, so it is
       computed once at each size and stays put while the cloud drifts
       through it. */
    var cols = 0, rows = 0, img = null, ring = null, vign = null;
    var head = 0, seedX = 0, raf = null, last = -1e9, onScreen = true;
    // the void: the sampled image, its geometry, and where the disc is now
    var back = null, srcImg = null, R = 0, WAKE = 0, hx = -1e9, hy = 0;
    var HTOP = 0.42;                      // what the brightest exposed cell aims at
    // per cell: the brightest luminance the type over it can survive.
    // 1 = nothing to protect here.
    var quiet = null, qt = null;
    var LIN = new Float32Array(256);
    (function () {
      for (var i = 0, v; i < 256; i++) {
        v = i / 255;
        LIN[i] = v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      }
    })();
    function enc(v) {
      v = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
      return v < 0 ? 0 : (v > 1 ? 255 : v * 255);
    }
    var lastPaint = -1e9;
    // the pointer, in cells; hstr fades the whole void in and out so it
    // arrives and leaves instead of blinking
    var mx = -1e9, my = 0, hasPtr = false, hstr = 0, easing = false;
    var vx = 1, vy = 0;                       // travel direction, for the wake
    var pass = null, passTimer = null;

    function column(nx, out, at) {
      var y, ny, wave, cloud;
      for (y = 0; y < rows; y++) {
        ny = (y / rows - 0.5) * 2;
        wave = Math.sin(nx * 1.1 + ny * 1.2) * 0.16 + Math.sin(nx * -0.6 + ny * 3.2) * 0.12;
        cloud = dfbm(nx * 0.55, ny * 0.55);
        out[at + y] = dsmooth(0.52, 1.02, cloud + wave);
      }
    }

    function size() {
      var r = host.getBoundingClientRect();
      cols = Math.max(1, Math.ceil(r.width / CELL));
      rows = Math.max(1, Math.ceil(r.height / CELL));
      // one backing pixel per cell; CSS blows it up by exactly CELL, so the
      // squares land on whole pixels and stay hard-edged
      cv.width = cols; cv.height = rows;
      cv.style.width = (cols * CELL) + "px";
      cv.style.height = (rows * CELL) + "px";
      img = ctx.createImageData(cols, rows);

      var aspect = cols / rows, x, y, nx, ny;
      ring = new Float32Array(cols * rows);
      vign = new Float32Array(cols * rows);
      head = 0; seedX = 0;
      for (x = 0; x < cols; x++) {
        nx = (x / cols - 0.5) * 2 * aspect;
        column(nx, ring, x * rows);
        for (y = 0; y < rows; y++) {
          ny = (y / rows - 0.5) * 2;
          vign[x * rows + y] =
            (1 - dsmooth(0.35, 1.35, Math.sqrt(nx * nx / (aspect * aspect) * 0.9 + ny * ny * 1.2))) * 1.15 +
            dsmooth(1.25, 0.25, Math.hypot((nx + 0.5 * aspect) / aspect, ny - 0.08)) * 0.10;
        }
      }
      seedX = cols;
    }

    /* The image, on the field's grid. Cover-fit is computed over the SOURCE
       rectangle - a drawImage that only scales would squash it, and the cell
       grid has the host's aspect, not the picture's.

       It is NOT darkened globally. That is what the per-cell ceiling is
       for: the picture may be bright where no type sits, and gives way only
       where it does. Darkening the whole picture for the worst spot on the
       header left nothing to see in the gap the field opens - which is the
       entire point of opening one. It is normalised instead, so a dark
       photograph and a bright one arrive at the same weight. */
    function sampleBack() {
      if (!srcImg || !cols || !rows) { back = null; return; }
      var oc = document.createElement("canvas");
      oc.width = cols; oc.height = rows;
      var octx = oc.getContext("2d", { willReadFrequently: true });
      if (!octx) { back = null; return; }
      var sw = srcImg.naturalWidth || srcImg.width, sh = srcImg.naturalHeight || srcImg.height;
      if (!sw || !sh) { back = null; return; }
      var tr = cols / rows, sr = sw / sh, cw, ch;
      if (sr > tr) { ch = sh; cw = sh * tr; } else { cw = sw; ch = sw / tr; }
      octx.drawImage(srcImg, (sw - cw) / 2, (sh - ch) / 2, cw, ch, 0, 0, cols, rows);
      var px;
      try { px = octx.getImageData(0, 0, cols, rows).data; }
      catch (e) { back = null; return; }          // a tainted canvas answers nothing

      // normalise on the brightest cell, so the picture lands at the same
      // weight whether it is a dark macro or a bright one
      var i, bl = -1, l;
      for (i = 0; i < px.length; i += 4) {
        l = relLum([px[i], px[i + 1], px[i + 2]]);
        if (l > bl) bl = l;
      }
      var k = bl > 0.001 ? Math.min(1.6, Math.sqrt(HTOP / bl)) : 1;

      back = new Uint8Array(cols * rows * 3);
      var j = 0, vv;
      for (i = 0; i < px.length; i += 4) {
        vv = px[i] * k; back[j] = vv > 255 ? 255 : vv;
        vv = px[i + 1] * k; back[j + 1] = vv > 255 ? 255 : vv;
        vv = px[i + 2] * k; back[j + 2] = vv > 255 ? 255 : vv;
        j += 3;
      }
      /* THE SAME SIZE THE PIXEL IMAGES USE. Owner: "die schwarze loch
         groesse soll so gross wie bei den bildern sein, nicht groesser."
         So it is not a fraction of this field's height - which made it four
         times the size on a full-bleed header - it is the images' own rule,
         written once here in CSS pixels and divided into cells. Copying the
         number instead of the rule is how two holes drift apart. */
      var diagPx = Math.sqrt(cols * cols + rows * rows) * CELL;
      R = (HR > 0 ? HR : Math.max(28, Math.min(60, diagPx * 0.28))) / CELL;
      WAKE = R * HWAKE;
    }

    /* One multiplier per cell: 0 inside a box of type, 1 well clear of it,
       and a soft ramp of about a third of a disc radius between the two, so
       the void reads as parting around the words rather than being clipped
       by a rectangle. Measured from the live boxes, so it follows the text
       when the layout reflows instead of being written down twice. */
    /* One ceiling per cell: the brightest the field may be delivered where a
       given piece of type sits, derived from that type's own colour and size
       (WCAG's 3:1 for large, 4.5:1 for the rest, with a little margin), and
       ramped back to "no limit" over about a third of a disc radius so the
       void reads as giving way rather than being clipped by a rectangle.

       An element with an opaque background is skipped: nothing behind the
       solid button shows through it, so its contrast is not this effect's
       business - and measuring it against the field is how a probe invents
       a 1.07:1 failure that does not exist. */
    /* Re-measure, coalesced. The boxes have to be read AFTER they have
       stopped moving: the header's entry animation translates the intro, the
       headline and the foot on their way in, so a map built at load time
       protects where the words WERE. Measured 16px out, which is most of a
       line's descender - and every contrast failure left on the stage was
       exactly that strip along the bottom of each box. */
    function remeasure() {
      clearTimeout(qt);
      qt = setTimeout(function () { buildQuiet(); paint(); }, 60);
    }

    function buildQuiet() {
      quiet = null;
      if (!HQUIET || !cols || !rows) return;
      var boxes = host.querySelectorAll(HQUIET);
      if (!boxes.length) return;
      var hr = host.getBoundingClientRect();
      var soft = Math.max(3, R * 0.34), rects = [], k, b, cs, fg, lf, need, ceil;
      for (k = 0; k < boxes.length; k++) {
        cs = getComputedStyle(boxes[k]);
        if (/^rgba?\([^)]*?(,\s*1)?\)$/.test(cs.backgroundColor) &&
            cs.backgroundColor !== "rgba(0, 0, 0, 0)" &&
            !/,\s*0?\.\d+\)$/.test(cs.backgroundColor)) continue;  // opaque: nothing shows through
        b = boxes[k].getBoundingClientRect();
        if (b.width < 2 || b.height < 2) continue;
        /* the element's OWN colour, which is why the selector has to name
           the leaves and not their containers: .stage-copy inherits the
           stage's near-white and would hand its muted children a ceiling
           four times too generous. Measured: 0.154 where 0.038 was needed. */
        fg = (cs.color.match(/[\d.]+/g) || [255, 255, 255]).map(Number);
        lf = relLum(fg);
        /* aimed above the bar on purpose. The clamp reads its luminance
           from a 256-entry table indexed by the truncated byte, which reads
           a shade dark and so scales a shade too little: measured 4.34:1
           against a 4.6 target. The margin is what covers that. */
        need = parseFloat(cs.fontSize) >= 24 ? 3.35 : 4.95;
        ceil = (lf + 0.05) / need - 0.05;
        if (ceil <= 0.002) continue;             // dark type: not this effect's problem
        rects.push([(b.left - hr.left) / CELL, (b.top - hr.top) / CELL,
                    (b.right - hr.left) / CELL, (b.bottom - hr.top) / CELL, ceil]);
      }
      if (!rects.length) return;
      quiet = new Float32Array(cols * rows);
      var x, y, j, r, dxq, dyq, dq, m, t;
      for (y = 0; y < rows; y++) {
        for (x = 0; x < cols; x++) {
          m = 1;
          for (j = 0; j < rects.length; j++) {
            r = rects[j];
            // distance OUTSIDE the rectangle; 0 anywhere inside it
            dxq = r[0] - x > 0 ? r[0] - x : (x - r[2] > 0 ? x - r[2] : 0);
            dyq = r[1] - y > 0 ? r[1] - y : (y - r[3] > 0 ? y - r[3] : 0);
            dq = Math.sqrt(dxq * dxq + dyq * dyq);
            if (dq < soft) {
              t = r[4] + (1 - r[4]) * dsmooth(0, soft, dq);
              if (t < m) m = t;
            }
          }
          quiet[y * cols + x] = m;
        }
      }
    }

    function paint() {
      var d = img.data, n = pal.length, x, y, i = 0, src, v, step, c;
      var dx, dy = 0, ady = 0, dd, push, rr, ux, uy, sxp, syp, open, w, lat, q, bi;
      var cr, cg, cb, rowOn = false, lum, f, lr, lg, lb;
      var reach = R * 1.6, span = R * HPUSH;
      for (y = 0; y < rows; y++) {
        dy = y - hy; ady = dy < 0 ? -dy : dy;
        rowOn = !!back && hstr > 0.004 && ady < reach + WAKE;
        for (x = 0; x < cols; x++) {
          src = ((head + x) % cols) * rows + y;
          v = ring[src] * vign[x * rows + y];
          open = 0;

          if (rowOn) {
            dx = x - hx;
            if (dx < reach + WAKE && dx > -(reach + WAKE)) {
              dd = Math.sqrt(dx * dx + dy * dy);
              if (dd < reach) {
                /* how far the material at this radius was shoved outward -
                   strongest at the centre, nothing at the edge, the same
                   (1 - dist/R) falloff both other holes use */
                push = 1 - dd / reach;
                push = push * push * span * hstr;
                rr = dd - push;
                if (rr < 0.6) {
                  open = 1;                        // evacuated
                } else {
                  ux = dd > 0.001 ? dx / dd : 1;
                  uy = dd > 0.001 ? dy / dd : 0;
                  sxp = (hx + ux * rr) | 0;
                  syp = (hy + uy * rr) | 0;
                  if (sxp < 0) sxp = 0; else if (sxp >= cols) sxp = cols - 1;
                  if (syp < 0) syp = 0; else if (syp >= rows) syp = rows - 1;
                  v = ring[((head + sxp) % cols) * rows + syp] * vign[sxp * rows + syp];
                  open = 1 - dsmooth(0.6, span, rr);
                }
              }
              // and the picture lingers where the hand has just been
              w = -(dx * vx + dy * vy);
              if (w > 0) {
                lat = Math.abs(dx * -vy + dy * vx);
                w = (1 - dsmooth(0, WAKE, w)) * (1 - dsmooth(R * 0.5, R * 1.5, lat)) * hstr * 0.85;
                if (w > open) open = w;
              }
            }
          }

          step = (Math.max(0, Math.min(0.999,
            v + BAYER4[(y % 4) * 4 + (x % 4)] * 0.18)) * n) | 0;
          c = pal[step < n ? step : n - 1];
          cr = c[0]; cg = c[1]; cb = c[2];

          if (open > 0) {
            bi = (y * cols + x) * 3;
            cr += (back[bi] - cr) * open;
            cg += (back[bi + 1] - cg) * open;
            cb += (back[bi + 2] - cb) * open;

            // what the type over this cell can survive, whatever produced it
            q = quiet ? quiet[y * cols + x] : 1;
            if (q < 0.999) {
              lr = LIN[(cr + 0.5) | 0]; lg = LIN[(cg + 0.5) | 0]; lb = LIN[(cb + 0.5) | 0];
              lum = 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
              if (lum > q) {
                // scaling LINEAR light scales luminance by exactly the same
                // factor; scaling the sRGB bytes only approximately does
                f = q / lum;
                cr = enc(lr * f); cg = enc(lg * f); cb = enc(lb * f);
              }
            }
          }

          d[i] = cr; d[i + 1] = cg; d[i + 2] = cb; d[i + 3] = 255;
          i += 4;
        }
      }
      ctx.putImageData(img, 0, 0);
    }

    function advance() {
      // the oldest column becomes the newest one, one cell further along the
      // noise - the cloud never repeats because the coordinate never resets
      var aspect = cols / rows;
      column((seedX / cols - 0.5) * 2 * aspect, ring, head * rows);
      head = (head + 1) % cols;
      seedX++;
    }

    /* The occasional pass, borrowed whole from the images - including the
       shared roamLock, so the header and a mosaic never roam at once. */
    function nextPassDelay() { return 9000 + Math.random() * 9000; }
    function schedulePass(delay) {
      clearTimeout(passTimer);
      passTimer = setTimeout(beginPass, delay);
    }
    function killPassField() { if (pass) { pass = null; roamLock = false; } }
    function beginPass() {
      if (!onScreen || !back) { schedulePass(3000); return; }
      if (hasPtr) { schedulePass(9000); return; }          // the hand has it
      if (roamLock) { schedulePass(4000 + Math.random() * 5000); return; }
      roamLock = true;
      var ltr = Math.random() < 0.5;
      pass = {
        dir: ltr ? 1 : -1,
        x: ltr ? -R * 0.8 : cols + R * 0.8,
        yc: rows * (0.28 + Math.random() * 0.44),
        spd: Math.max(0.22, cols / 620) * (0.85 + Math.random() * 0.3),
        ph: Math.random() * Math.PI * 2,
        amp: rows * (0.06 + Math.random() * 0.16),
        t: 0
      };
      if (!raf && onScreen) raf = requestAnimationFrame(frame);
    }

    /* Resolve the disc. The pointer wins outright once it has been caught
       up with; the ease is only there so a pointer arriving from off the
       header does not teleport the void across the whole width. Same 0.22 as
       the images. */
    function moveHole() {
      var pdx, pdy, len, ox = hx, oy = hy;
      if (hasPtr) {
        if (easing) {
          hx += (mx - hx) * 0.22; hy += (my - hy) * 0.22;
          if (Math.abs(mx - hx) + Math.abs(my - hy) < 0.5) easing = false;
        } else { hx = mx; hy = my; }
        hstr += (1 - hstr) * 0.14;
      } else if (pass) {
        pass.t++;
        pass.x += pass.dir * pass.spd;
        hx = pass.x;
        hy = pass.yc + Math.sin(pass.t * 0.012 + pass.ph) * pass.amp;
        // fade in over the first radius of travel and out over the last
        hstr = Math.min(1,
          dsmooth(-R * 0.8, R * 0.4, pass.dir > 0 ? pass.x : cols - pass.x) *
          dsmooth(R * 0.4, -R * 0.8, pass.dir > 0 ? pass.x - cols : -pass.x));
        if (pass.x < -R * 1.2 || pass.x > cols + R * 1.2) {
          killPassField();
          schedulePass(nextPassDelay());
        }
      } else {
        hstr += (0 - hstr) * 0.10;
        if (hstr < 0.01) hstr = 0;
      }
      // the wake trails opposite to travel, so it follows the hand
      pdx = hx - ox; pdy = hy - oy;
      len = Math.sqrt(pdx * pdx + pdy * pdy);
      if (len > 0.35) { vx = pdx / len; vy = pdy / len; }
    }

    /* The cloud and the disc keep different clocks. Advancing the cloud is
       one column of four-octave noise; moving the disc is arithmetic - and
       a disc under the hand has to keep up with the hand, so it is painted
       every frame while it is out and the noise still only twelve times a
       second. Paying the noise at the pointer's frame rate would be paying
       the expensive half for the cheap half's benefit. */
    function frame(t) {
      raf = null;
      if (!onScreen) return;
      var due = false;
      if (t - last >= 1000 / FPS) { last = t; advance(); due = true; }
      if (back && (hasPtr || pass || hstr > 0)) { lastPaint = t; moveHole(); due = true; }
      if (due) paint();
      raf = requestAnimationFrame(frame);
    }

    size();
    paint();

    if (HOLE && !reduced) {
      var im = new Image();
      im.decoding = "async";
      im.onload = function () {
        srcImg = im; sampleBack(); buildQuiet(); paint();
        schedulePass(2200);
      };
      im.src = HOLE;

      if (HQUIET) {
        // the entry animation, and a font that arrives after first layout
        host.addEventListener("transitionend", remeasure);
        host.addEventListener("animationend", remeasure);
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);
      }

      if (!noHover) {
        host.addEventListener("pointermove", function (e) {
          var r = host.getBoundingClientRect();
          var nx = (e.clientX - r.left) / CELL, ny = (e.clientY - r.top) / CELL;
          if (!hasPtr) {
            // arriving: ease from wherever the hole already is - the edge it
            // came in over, or the position a pass had reached
            hasPtr = true; easing = true;
            if (hx < -1e8) { hx = nx < cols / 2 ? -R : cols + R; hy = ny; }
            if (pass) { killPassField(); schedulePass(nextPassDelay()); }
          }
          mx = nx; my = ny;
          if (!raf && onScreen) raf = requestAnimationFrame(frame);
        }, { passive: true });
        host.addEventListener("pointerleave", function () {
          hasPtr = false; easing = false;
          schedulePass(nextPassDelay());
          if (!raf && onScreen) raf = requestAnimationFrame(frame);
        }, { passive: true });
      }
    }

    if (!reduced) {
      new IntersectionObserver(function (es) {
        onScreen = es[0].isIntersecting;
        if (onScreen && !raf) raf = requestAnimationFrame(frame);
        else if (!onScreen && raf) { cancelAnimationFrame(raf); raf = null; }
      }, { rootMargin: "120px" }).observe(host);
    }
    var rt = null;
    addEventListener("resize", function () {
      clearTimeout(rt);
      rt = setTimeout(function () { size(); sampleBack(); buildQuiet(); paint(); }, 160);
    }, { passive: true });

    return {
      canvas: cv,
      palette: pal,
      destroy: function () { if (raf) cancelAnimationFrame(raf); cv.remove(); }
    };
  }

  window.PixelFX = {
    headline: headline,
    button: button,
    morph: morph,
    sand: sand,
    voidReveal: voidReveal,
    slides: slides,
    image: pixelImage,
    /* the palette a given wave style generates, so a comparison page can show
       what actually runs rather than colours written out by hand */
    wavePalette: function (style, accRGB, groundRGB) { return wavePalette(style, accRGB, groundRGB); },
    /* a drifting field of cells behind a band - see FIELD above */
    field: field,
    /* an ordered-dither cloud behind a band - see DITHER above */
    dither: dither,
    /* a custom property as a given element sees it, in bytes */
    tokenRGB: function (el, name, fallback) { return tokenRGB(el, name, fallback); },
    onVelocity: function (fn) { velSubs.push(fn); },
    velocity: function () { return vel; },
    reduced: reduced,
    noHover: noHover
  };
})();
