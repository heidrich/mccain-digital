/* The header's own contrast, read from the field the visitor actually gets.

   Every text box on the stage is mapped into the dither canvas and the
   BRIGHTEST cell under it is taken - light type on a dark field fails
   against its brightest neighbour, not its average. No percentile here on
   purpose: the canvas is the background layer and contains no glyphs, so
   the maximum is the real worst case rather than a letter.

   The washes over the field are NOT subtracted, so every number this prints
   is at least as bad as what is delivered.

   Call it repeatedly while the void travels: the disc is the whole point,
   and a header that passes only when the disc is off-screen passes nothing.
*/
(function () {
  var cv = document.querySelector(".stage .dither-l");
  if (!cv) return JSON.stringify({ error: "no field canvas" });
  var host = document.querySelector(".stage");
  var hr = host.getBoundingClientRect();
  var ctx = cv.getContext("2d");
  var W = cv.width, H = cv.height;                  // one backing pixel per cell
  var sx = W / hr.width, sy = H / hr.height;
  var px;
  try { px = ctx.getImageData(0, 0, W, H).data; }
  catch (e) { return JSON.stringify({ error: "canvas unreadable: " + e.message }); }

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

    var best = -1, bc = null, x, y, i, l;
    for (y = y0; y < y1; y++) {
      for (x = x0; x < x1; x++) {
        i = (y * W + x) * 4;
        l = lum(px[i], px[i + 1], px[i + 2]);
        if (l > best) { best = l; bc = [px[i], px[i + 1], px[i + 2]]; }
      }
    }
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
  return JSON.stringify(out);
})()
