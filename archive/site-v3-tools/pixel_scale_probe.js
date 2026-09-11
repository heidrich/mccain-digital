/* Does the pixel mosaic sit ON the photo, at the same scale?

   This exists because a translation-only comparison cannot catch the bug it
   was written for. build() used to derive its cover-crop from
   naturalWidth/naturalHeight and hand it to drawImage as a SOURCE rectangle —
   but naturalWidth is density-corrected CSS px while drawImage reads raw
   bitmap px, so with srcset the mosaic came out zoomed and anchored top-left.
   A pure scale error has its best TRANSLATION at (0,0), so a dx/dy search
   reports "perfect". This searches over SCALE.

   Expects: bestScale === 1.00 for every card, and a clear margin to 1.5/2.0.
   Run through tools/pixel_scale.sh. */
(async () => {
  const out = [];
  const boxes = [
    [".case", ".case-img"],
    [".pcard", ".px-img"],
    [".shot", ".shot-img"],
    /* The hero, which is now the largest mosaic on the site and was outside
       this guard entirely: its figure is `.stage-shot`, not `.shot`, so the
       row above never matched it. It is also the one that builds its resting
       picture by upscaling the sample grid instead of laying 51,510 blocks -
       exactly the kind of shortcut this tool exists to catch. */
    [".stage-shot", ".shot-img"]
  ];
  for (const [cardSel, boxSel] of boxes) {
    for (const card of document.querySelectorAll(cardSel)) {
      const box = card.querySelector(boxSel);
      if (!box) continue;
      const img = box.querySelector("img");
      const cv = box.querySelector(".px-canvas");
      if (!img || !cv) continue;
      const vis = box.getBoundingClientRect();
      if (vis.width < 10 || vis.right < 0 || vis.left > innerWidth) continue;
      /* Measure in the LAYOUT box, not the client rect. The portraits are
         rotated, so the client rect is their axis-aligned hull — up to 13%
         wider than the box the canvas is actually pinned to. Comparing hull
         against hull is how this guard stayed green through the bug where
         build() sized the field off the hull and the mosaic came out squashed
         (a picture that changed height the moment hover took over). */
      const bcs = getComputedStyle(box);
      const r = { width: parseFloat(bcs.width), height: parseFloat(bcs.height) };

      // wake the engine so the mosaic is on screen, then read it back
      card.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true, pointerType: "mouse" }));
      await new Promise((f) => requestAnimationFrame(f));
      await new Promise((f) => requestAnimationFrame(f));
      const W = Math.round(r.width), H = Math.round(r.height);
      /* Direct check for the same defect, independent of the scale search:
         the backing store must cover the layout box 1:1 in CSS px. Any other
         ratio is displayed stretched, because the canvas element is sized by
         CSS and the browser scales the backing into it. */
      const bw = cv.width / devicePixelRatio, bh = cv.height / devicePixelRatio;
      const boxOk = Math.abs(bw - r.width) <= 1 && Math.abs(bh - r.height) <= 1;
      const m = document.createElement("canvas");
      m.width = W; m.height = H;
      m.getContext("2d").drawImage(cv, 0, 0, W, H);
      const B = m.getContext("2d", { willReadFrequently: true })
        .getImageData(0, 0, W, H).data;

      // reference: the photo cover-fitted the way object-fit:cover does it,
      // then scaled by s about the top-left — the shape the bug produced
      const ref = document.createElement("canvas");
      ref.width = W; ref.height = H;
      const rc = ref.getContext("2d", { willReadFrequently: true });
      const ir = img.naturalWidth / img.naturalHeight, cr = W / H;
      let dw, dh;
      if (ir > cr) { dh = H; dw = H * ir; } else { dw = W; dh = W / ir; }
      const diffAt = (s) => {
        rc.clearRect(0, 0, W, H);
        rc.save(); rc.scale(s, s);
        rc.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
        rc.restore();
        const A = rc.getImageData(0, 0, W, H).data;
        let sum = 0, n = 0;
        for (let y = 30; y < H - 30; y += 5) {
          for (let x = 30; x < W - 30; x += 5) {
            const i = (y * W + x) * 4;
            if (B[i + 3] < 200) continue;      // crater: nothing to compare
            sum += Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) +
              Math.abs(A[i + 2] - B[i + 2]);
            n++;
          }
        }
        return n ? sum / n / 3 : 999;
      };
      let best = null;
      for (let s = 0.9; s <= 2.5; s += 0.05) {
        const d = diffAt(s);
        if (!best || d < best.d) best = { s: +s.toFixed(2), d: +d.toFixed(1) };
      }
      card.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true, pointerType: "mouse" }));
      out.push({
        sel: cardSel,
        file: img.currentSrc.split("/").pop(),
        naturalCss: img.naturalWidth + "x" + img.naturalHeight,
        bestScale: best.s,
        diff: best.d,
        layoutBox: r.width.toFixed(1) + "x" + r.height.toFixed(1),
        backingCss: bw.toFixed(1) + "x" + bh.toFixed(1),
        boxOk,
        ok: best.s === 1 && boxOk
      });
    }
  }
  const bad = out.filter((o) => !o.ok);
  return JSON.stringify({
    checked: out.length,
    FAIL: bad.length,
    cards: out
  }, null, 1);
})()
