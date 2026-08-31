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
  const isAccent = (c) => {
    const [r, g, b] = c;
    return r > 90 && g > 70 && b < 90 && r >= g && g > b;   // yellow/gold family
  };
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
  const fails = out.filter(o => !o.pass);
  return JSON.stringify({ accentTextNodes: out.length, failing: fails.length, fails: fails.slice(0, 12) }, null, 1);
})()
