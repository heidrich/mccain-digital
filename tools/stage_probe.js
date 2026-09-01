/* The header's own contrast, read from the pixels the visitor actually gets.

   Every text box on the stage is mapped into the header's canvas and the
   BRIGHTEST pixel under it is taken - light type on a dark ground fails
   against its brightest neighbour, not its average. No percentile here on
   purpose: the canvas is the background layer and contains no glyphs, so
   the maximum is the real worst case rather than a letter.

   The canvas may be either of two things and the probe must not care which:
   the ordered-dither field (.dither-l) that the service headers use, or the
   pixel mosaic (.px-canvas) that the home page's black hole lives in. It
   takes whichever is there and maps through THAT canvas's own rectangle -
   the field fills the stage, the mosaic fills .shot-img, and a probe that
   assumes one of them reads a pixel from somewhere else.

   What it does subtract: the host's own brightness()/saturate(), read from
   the computed style so it can never drift from the stylesheet. The canvas
   holds the undimmed picture and the page delivers it through that filter;
   reading raw would report a header three times brighter than the one on
   the screen. What it does NOT subtract: the scrims painted over the top.
   So every number here is still at least as bad as what is delivered.

   Call it repeatedly while the hole travels: the hole is the whole point,
   and a header that passes only when it is off-screen passes nothing.
*/
(function () {
  /* WHAT IS ON THE SCREEN RIGHT NOW. The mosaic is display:none until the
     pointer arrives, so a probe that only reads canvases measures the header
     for the two seconds a year it is being touched. Whichever layer is
     visible is the one that gets read. */
  var cv = null, source = "";
  var hidden = function (el) {
    for (var n = el; n; n = n.parentElement) {
      var c = getComputedStyle(n);
      if (c.display === "none" || c.visibility === "hidden" || +c.opacity === 0) return true;
    }
    return false;
  };
  var cand = document.querySelectorAll(".stage .px-canvas, .stage .dither-l");
  for (var q = 0; q < cand.length; q++) {
    if (!hidden(cand[q])) { cv = cand[q]; source = cand[q].className || "canvas"; break; }
  }

  var hr, W, H, sx, sy, px, ctx;
  if (cv) {
    hr = cv.getBoundingClientRect();                 // map through the CANVAS
    if (hr.width < 2 || hr.height < 2) return JSON.stringify({ error: "canvas has no box" });
    ctx = cv.getContext("2d");
    W = cv.width; H = cv.height;
    try { px = ctx.getImageData(0, 0, W, H).data; }
    catch (e) { return JSON.stringify({ error: "canvas unreadable: " + e.message }); }
  } else {
    /* the resting state: the photograph itself, drawn at the size it is
       delivered at so object-fit: cover is reproduced, not guessed */
    var im = document.querySelector(".stage-shot img, .stage img");
    if (!im || !im.complete || !im.naturalWidth) return JSON.stringify({ error: "no header layer to read" });
    hr = im.getBoundingClientRect();
    if (hr.width < 2 || hr.height < 2) return JSON.stringify({ error: "image has no box" });
    W = Math.max(1, Math.round(hr.width)); H = Math.max(1, Math.round(hr.height));
    var off = document.createElement("canvas");
    off.width = W; off.height = H;
    ctx = off.getContext("2d");
    var s0 = Math.max(W / im.naturalWidth, H / im.naturalHeight);   // object-fit: cover
    var dw = im.naturalWidth * s0, dh = im.naturalHeight * s0;
    ctx.drawImage(im, (W - dw) / 2, (H - dh) / 2, dw, dh);
    try { px = ctx.getImageData(0, 0, W, H).data; }
    catch (e) { return JSON.stringify({ error: "image unreadable: " + e.message }); }
    cv = im;
    source = "photo (resting state)";
  }
  sx = W / hr.width; sy = H / hr.height;

  /* the filter the canvas is seen through, taken from the element it is in */
  var fb = 1, fs = 1;
  for (var node = cv; node && node !== document.body; node = node.parentElement) {
    var f = getComputedStyle(node).filter;
    if (!f || f === "none") continue;
    var mb = f.match(/brightness\(([\d.]+)\)/), ms = f.match(/saturate\(([\d.]+)\)/);
    if (mb) fb *= parseFloat(mb[1]);
    if (ms) fs *= parseFloat(ms[1]);
  }
  /* saturate() is the SVG feColorMatrix saturation, applied before
     brightness; both are linear in the sRGB values the canvas stores. */
  function seen(r, g, b) {
    var l = 0.213 * r + 0.715 * g + 0.072 * b;
    return [
      Math.min(255, (l + fs * (r - l)) * fb),
      Math.min(255, (l + fs * (g - l)) * fb),
      Math.min(255, (l + fs * (b - l)) * fb)
    ];
  }

  function lum(r, g, b) {
    var a = [r, g, b].map(function (v) {
      v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
  }
  function parse(c) {
    var m = c.match(/[\d.]+/g);
    return m ? [+m[0], +m[1], +m[2]] : [255, 255, 255];
  }

  var out = [];
  document.querySelectorAll(
    ".stage-kicker, .stage-intro, .fact b, .fact span, .display, " +
    ".stage-coords, .stage-ctas .btn, .cue"
  ).forEach(function (el) {
    var cs = getComputedStyle(el);
    // an opaque background hides the field entirely: measuring what is behind
    // it invents a failure. The solid button read 1.07:1 that way.
    if (cs.backgroundColor !== "rgba(0, 0, 0, 0)" &&
        !/,\s*0?\.\d+\)\s*$/.test(cs.backgroundColor)) return;
    // and neither is a label the CSS does not paint: the pixel button hands
    // its text to a canvas and leaves color transparent, which this read as
    // black-on-black and reported as 1.05:1
    if (/,\s*0\)\s*$/.test(cs.color)) return;
    var r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    /* Cells whose CENTRE lies inside the box - the rasterisation rule.
       Rounding outwards instead reads a cell that sits ENTIRELY beside the
       element, where no glyph can be, and reports its brightness as a
       failure of text that is nowhere near it. That is how a passing header
       measured 2.44:1: the worst cell was one row above the headline. */
    var x0 = Math.max(0, Math.round((r.left - hr.left) * sx));
    var x1 = Math.min(W, Math.round((r.right - hr.left) * sx));
    var y0 = Math.max(0, Math.round((r.top - hr.top) * sy));
    var y1 = Math.min(H, Math.round((r.bottom - hr.top) * sy));
    if (x1 <= x0 || y1 <= y0) return;

    var best = -1, bc = null, x, y, i, l, c;
    for (y = y0; y < y1; y++) {
      for (x = x0; x < x1; x++) {
        i = (y * W + x) * 4;
        if (px[i + 3] < 8) continue;             // the mosaic's gaps show ink
        c = seen(px[i], px[i + 1], px[i + 2]);
        l = lum(c[0], c[1], c[2]);
        if (l > best) { best = l; bc = [Math.round(c[0]), Math.round(c[1]), Math.round(c[2])]; }
      }
    }
    if (best < 0) return;                        // nothing painted under it
    var fg = parse(cs.color);
    var lf = lum(fg[0], fg[1], fg[2]);
    var cr = (Math.max(lf, best) + 0.05) / (Math.min(lf, best) + 0.05);
    // 105px display type is "large" by WCAG; the rest is body-sized
    var big = parseFloat(cs.fontSize) >= 24;
    out.push({
      el: el.className.toString().split(" ")[0] || el.tagName,
      ratio: Math.round(cr * 100) / 100,
      need: big ? 3 : 4.5,
      pass: cr >= (big ? 3 : 4.5),
      worstCell: bc
    });
  });
  return JSON.stringify({ source: source, boxes: out });
})()
