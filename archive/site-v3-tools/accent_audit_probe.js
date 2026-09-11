(() => {
  /* Find every element painting accent-ish text and measure it against the
     background actually behind it. Catches both directions: a pale yellow
     left on paper, and the new dark gold landing on a dark card that happens
     to sit inside a paper band. */
  const lum = (c) => { const v = c.map(x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
  /* Chrome reports some backgrounds as `color(srgb 1 0.99 0.98 / 0.9)`,
     whose channels are 0-1 floats, not 0-255. Reading them as bytes turned a
     near-white card into near-black and invented nine failures. */
  const rgb = (s) => {
    const n = (s.match(/[\d.]+/g) || [0, 0, 0]).map(Number);
    return s.indexOf("color(") === 0 ? n.slice(0, 3).map((v) => v * 255) : n.slice(0, 3);
  };
  const alphaOf = (s) => {
    const n = (s.match(/[\d.]+/g) || []).map(Number);
    return n.length > 3 ? n[3] : 1;
  };
  const ratio = (a, b) => { const l = [lum(a), lum(b)].sort((x, y) => y - x); return (l[0] + .05) / (l[1] + .05); };
  /* A translucent surface shows what is under it. Composite the stack down
     to the first opaque layer instead of treating the top one as solid. */
  const bgOf = (el) => {
    const stack = [];
    for (let n = el; n; n = n.parentElement) {
      const c = getComputedStyle(n).backgroundColor;
      if (!c || /rgba\(0, 0, 0, 0\)|transparent/.test(c)) continue;
      stack.push({ c: rgb(c), a: alphaOf(c) });
      if (alphaOf(c) >= 0.999) break;
    }
    if (!stack.length) return [255, 255, 255];
    let out = stack[stack.length - 1].c;
    for (let i = stack.length - 2; i >= 0; i--) {
      const l = stack[i];
      out = out.map((v, k) => l.c[k] * l.a + v * (1 - l.a));
    }
    return out;
  };
  /* Colours arrive in every notation CSS allows - hex, rgb(), and the
     `hsl(47 92% 53%)` that legibleStops emits. Let the browser parse them. */
  const parseEl = document.createElement("span");
  parseEl.style.display = "none";
  document.body.appendChild(parseEl);
  const asRGB = (c) => {
    parseEl.style.color = "";
    parseEl.style.color = c;
    const v = getComputedStyle(parseEl).color;
    return /^rgba?\(/.test(v) ? rgb(v) : null;
  };

  /* WHICH COLOURS COUNT AS "SIGNAL" — read from the tokens, not guessed from
     the channels. The predicate this replaces described the yellow/gold family
     by hand (`r > 90 && g > 70 && b < 90 && r >= g && g > b`), and every other
     signal the site ships fell straight through it: the green figures in (05)
     run on --sig-text (164,189,0 — fails r >= g), and any per-service colour
     would too. A gate that only sees one family reports "0 failing" about the
     one family it can see.

     So: resolve the signal tokens on the root, and count a colour as a signal
     if it is within a small Manhattan distance of one of them. Same idea as
     markWaveParticles in the engine, same tolerance — 24 covers antialiasing
     and the compositor without swallowing a neighbouring hue. */
  const SIGNAL_TOKENS = [
    "--acc", "--acc-ink", "--acc-text",
    "--sig", "--sig-ink", "--sig-text",
    "--svc", "--svc-ink", "--svc-text"
  ];
  const signals = [];
  {
    const cs = getComputedStyle(document.documentElement);
    SIGNAL_TOKENS.forEach((t) => {
      const v = (cs.getPropertyValue(t) || "").trim();
      if (!v) return;
      const c = asRGB(v);
      if (c) signals.push({ token: t, c });
    });
  }
  const nearToken = (c) => signals.some((s) =>
    Math.abs(s.c[0] - c[0]) + Math.abs(s.c[1] - c[1]) + Math.abs(s.c[2] - c[2]) < 24);
  /* UNION, not replacement. Token proximity alone measured NINE nodes fewer on
     the home page than the old family test did: a blend of the accent - a
     hover state, a color-mix, a composite over a translucent card - is accent
     colour that no longer sits within 24 of any declared token. The family
     test keeps those; the token test adds every signal that is not yellow.
     Dropping either one loses coverage, and a gate that measures less than it
     did is a regression wearing the clothes of a fix. */
  const yellowFamily = (c) => {
    const [r, g, b] = c;
    return r > 90 && g > 70 && b < 90 && r >= g && g > b;
  };
  const isAccent = (c) => yellowFamily(c) || nearToken(c);
  const out = [];
  document.querySelectorAll("body *").forEach((el) => {
    if (!el.offsetParent && getComputedStyle(el).position !== "fixed") return;
    const cs = getComputedStyle(el);
    const hasOwnText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    const stroke = cs.webkitTextStrokeColor && cs.webkitTextStrokeWidth !== "0px" && cs.color === "rgba(0, 0, 0, 0)";
    if (!hasOwnText && !stroke) return;
    const fg = rgb(stroke ? cs.webkitTextStrokeColor : cs.color);
    if (!isAccent(fg)) return;
    const bg = bgOf(el);
    const r = ratio(fg, bg);
    const px = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight, 10) >= 700;
    const large = px >= 24 || (bold && px >= 18.66);
    const need = large ? 3 : 4.5;
    out.push({
      sel: el.tagName.toLowerCase() + (el.className ? "." + String(el.className).split(" ")[0] : ""),
      text: (el.textContent || "").trim().slice(0, 30),
      fg: "rgb(" + fg.join(",") + ")", px: Math.round(px), large,
      ratio: +r.toFixed(2), need, pass: r >= need
    });
  });
  /* The pixel headlines are not text any more by the time anyone reads them -
     they are a canvas, and the colour on it is a travelling gradient the
     stylesheet knows nothing about. This audit passed for a week while the
     wave's deep blue-violet measured 2.64:1 on the near-black band, because
     everything above reads getComputedStyle and the canvas answers to nobody.
     A checker that reads only the declaration checks only the declaration. */
  const canvasFails = [];
  let canvasesChecked = 0, canvasesSkipped = 0;
  document.querySelectorAll(".ph canvas").forEach((cv) => {
    const host = cv.parentElement;
    /* Only a settled field says anything about colour. In flight a sixth of
       the cells carry the mustard flash, which on paper measures 1.5:1 - so an
       audit that does not wait reports the animation and not the page. This
       cost an hour of chasing a hero headline that was innocent. */
    if (host.dataset.pxSettled !== "1") { canvasesSkipped++; return; }
    let d;
    try {
      d = cv.getContext("2d", { willReadFrequently: true })
        .getImageData(0, 0, cv.width, cv.height).data;
    } catch (e) { canvasesSkipped++; return; }        // tainted, nothing to say
    const bg = bgOf(host);
    let worst = 99, wc = null, ink = 0;
    for (let i = 0; i < d.length; i += 8) {
      if (d[i + 3] < 250) continue;                    // only fully painted cells
      ink++;
      const r = ratio([d[i], d[i + 1], d[i + 2]], bg);
      if (r < worst) { worst = r; wc = [d[i], d[i + 1], d[i + 2]]; }
    }
    // A headline that has not assembled yet has nothing to measure, and
    // measuring it anyway is how a lab reports "20px cell, fully translucent".
    if (ink < 200) { canvasesSkipped++; return; }
    canvasesChecked++;
    const cs = getComputedStyle(host);
    const px = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight, 10) >= 700;
    const need = (px >= 24 || (bold && px >= 18.66)) ? 3 : 4.5;
    if (worst < need) {
      canvasFails.push({
        sel: "canvas.ph", text: (host.textContent || "").trim().slice(0, 30),
        fg: "rgb(" + wc.map(Math.round).join(",") + ")", px: Math.round(px),
        large: need === 3, ratio: +worst.toFixed(2), need, pass: false
      });
    }
  });

  /* GRADIENT-FILLED TEXT ANSWERS NO BETTER THAN A CANVAS DID. Anything using
     background-clip: text reports `color: rgba(0, 0, 0, 0)`, so the accent
     sweep above skips it entirely - it was invisible to this audit for as long
     as the studio band has existed, and the "AI" word now puts the same fill
     in headings across the site. The colour that is actually read is a stop in
     --wave-stops-text, and the worst stop is what decides the page.

     Parsed by the browser rather than by hand: legibleStops emits
     `hsl(47 92% 53%)`, space-separated, and a regex written for hex or rgb()
     turns that into a number that is not a colour. */
  /* commas BETWEEN stops only - hsl(...) carries its own */
  const stopList = (str) => {
    const o = []; let d = 0, st = 0;
    for (let i = 0; i < str.length; i++) {
      const c = str[i];
      if (c === "(") d++; else if (c === ")") d--; else if (c === "," && !d) { o.push(str.slice(st, i)); st = i + 1; }
    }
    o.push(str.slice(st));
    return o.map(x => x.trim().replace(/\s+-?[\d.]+(px|%)\s*$/, "")).filter(Boolean);
  };
  const gradFails = [];
  let gradientTextChecked = 0, gradientTextSkipped = 0;
  document.querySelectorAll("*").forEach((el) => {
    const cs = getComputedStyle(el);
    if (cs.webkitTextFillColor !== "rgba(0, 0, 0, 0)") return;
    if (cs.backgroundImage.indexOf("gradient") < 0) return;
    if (!el.offsetParent && cs.position !== "fixed") return;
    const hasOwnText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (!hasOwnText) return;                       // the split word carries it, not its wrapper
    const raw = (cs.getPropertyValue("--wave-stops-text") || cs.getPropertyValue("--wave-stops") || "").trim();
    const cols = stopList(raw).map(asRGB).filter(Boolean);
    if (!cols.length) { gradientTextSkipped++; return; }
    gradientTextChecked++;
    /* THE NAV IS A FLOATING OVERLAY AND NO DOM WALK CAN FIND ITS GROUND. The
       dark bar is .nav::before, which getComputedStyle on the element does not
       report - and at rest it is not even painted (opacity 0 until .stuck), so
       the bar the eye sees there is the HERO, a sibling of the nav and not an
       ancestor of anything in it. Walking parents therefore lands on the body:
       paper in light mode, which reported near-white type at 1.45:1 and a mid
       grey composite of 99,99,98 on another page. Both are artefacts.
       What the design actually guarantees is ink, in both themes and in both
       states, so that is what this measures against. Say it here rather than
       let the number be wrong quietly. */
    const bg = el.closest(".nav") ? rgb(getComputedStyle(document.documentElement)
      .getPropertyValue("--ink").trim() || "#0b0b0c") : bgOf(el);
    let worst = 99, wc = null;
    cols.forEach((c) => { const r = ratio(c, bg); if (r < worst) { worst = r; wc = c; } });
    const px = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight, 10) >= 700;
    const need = (px >= 24 || (bold && px >= 18.66)) ? 3 : 4.5;
    if (worst < need) {
      gradFails.push({
        /* "grad " on purpose: a split word IS an <i>, and the runner exempts
           sel == "i" as the wordmark. Without the prefix every AI word would
           inherit an exemption written for the logo. */
        sel: "grad " + el.tagName.toLowerCase() + (el.className ? "." + String(el.className).split(" ")[0] : ""),
        /* WHERE, not just what. Two spans with the same class and the same
           text are one report line unless the ancestry is in it, and the
           first version of this cost a round of guessing. */
        where: (() => { const a = []; for (let n = el.parentElement; n && a.length < 4; n = n.parentElement)
          a.push(n.tagName.toLowerCase() + (n.className ? "." + String(n.className).split(" ")[0] : "")); return a.join("<"); })(),
        ground: "rgb(" + bg.map(Math.round).join(",") + ")",
        text: (el.textContent || "").trim().slice(0, 30),
        fg: "rgb(" + wc.map(Math.round).join(",") + ")", px: Math.round(px),
        large: need === 3, ratio: +worst.toFixed(2), need, pass: false
      });
    }
  });
  /* THE FIELD BEHIND THE TEXT IS ALSO A COLOUR NOBODY DECLARED. The canvas
     sweep above looks at `.ph canvas` - pixel headlines - and `data-pixel` has
     been 0 repo-wide since the engine left the type, so that half of this
     audit has been reporting "0 checked" on every page for weeks. Green on
     nothing.

     What IS painted behind text is the dither field of every hero. Its ramp
     caps itself against --muted (ditherRamp in pixel-engine.js), but a cap the
     effect applies to itself is not a check - and now that the ramp can climb
     toward a per-service token, its top is no longer the neutral --fg the cap
     was written for. So: measure the brightest cell the field actually paints
     against the dimmest text the band actually shows.

     Photo mosaics are exempt on purpose. A photograph owes no text contrast;
     it is the picture, not the ground under a paragraph. */
  const fieldFails = [];
  let fieldsChecked = 0, fieldsSkipped = 0;
  document.querySelectorAll("canvas.dither-l").forEach((cv) => {
    const host = cv.parentElement;
    if (!host) { fieldsSkipped++; return; }
    let d;
    try {
      d = cv.getContext("2d", { willReadFrequently: true })
        .getImageData(0, 0, cv.width, cv.height).data;
    } catch (e) { fieldsSkipped++; return; }
    let bright = null, bl = -1;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 250) continue;
      const c = [d[i], d[i + 1], d[i + 2]], l = lum(c);
      if (l > bl) { bl = l; bright = c; }
    }
    if (!bright) { fieldsSkipped++; return; }
    /* The dimmest text ON THIS BAND, at the size it is set - a 12px label has
       to clear 4.5 where a 58px headline only needs 3. Both are asked. */
    let worst = 99, wt = null, wsel = "", wneed = 4.5;
    host.querySelectorAll("*").forEach((el) => {
      if (!el.offsetParent) return;
      if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return;
      const cs = getComputedStyle(el);
      if (cs.webkitTextFillColor === "rgba(0, 0, 0, 0)") return;   // gradient text has its own pass
      /* The field is only this text's ground if nothing opaque sits between
         them. The primary CTA is ink type on a yellow button face - measuring
         it against the cell behind the button reported 1.68:1 and meant
         nothing. Walk to the host; any solid surface on the way disqualifies. */
      let ownGround = false;
      for (let n = el; n && n !== host; n = n.parentElement) {
        const c = getComputedStyle(n).backgroundColor;
        if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c) && alphaOf(c) >= 0.5) { ownGround = true; break; }
      }
      if (ownGround) return;
      const fg = rgb(cs.color);
      const px = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight, 10) >= 700;
      const need = (px >= 24 || (bold && px >= 18.66)) ? 3 : 4.5;
      const r = ratio(fg, bright);
      if (r - need < worst - wneed) { worst = r; wt = fg; wneed = need; wsel = el.tagName.toLowerCase() + (el.className ? "." + String(el.className).split(" ")[0] : ""); }
    });
    if (wt === null) { fieldsSkipped++; return; }
    fieldsChecked++;
    if (worst < wneed) {
      fieldFails.push({
        sel: "field " + wsel,
        where: host.tagName.toLowerCase() + (host.className ? "." + String(host.className).split(" ")[0] : ""),
        ground: "rgb(" + bright.map(Math.round).join(",") + ")",
        text: "brightest field cell vs dimmest text on the band",
        fg: "rgb(" + wt.map(Math.round).join(",") + ")", px: 0,
        large: wneed === 3, ratio: +worst.toFixed(2), need: wneed, pass: false
      });
    }
  });

  parseEl.remove();

  const fails = out.filter(o => !o.pass).concat(canvasFails).concat(gradFails).concat(fieldFails);
  return JSON.stringify({
    accentTextNodes: out.length, canvasesChecked, canvasesSkipped,
    gradientTextChecked, gradientTextSkipped, fieldsChecked, fieldsSkipped,
    failing: fails.length, fails: fails.slice(0, 12)
  }, null, 1);
})()
