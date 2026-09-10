/* Runs inside the page. Returns the painted type scale, not the declared one.
 *
 * A token table says what a size COULD be; this walks every element that
 * actually paints text and reports the size it was painted at, weighted by how
 * much text was painted at it. That is the difference between "the body token
 * is 18.88px" and "18.88px is what 40% of the words on this page are set in".
 */
(() => {
  const CH = "abcdefghijklmnopqrstuvwxyz";

  function ownText(el) {
    let s = "";
    for (const n of el.childNodes) if (n.nodeType === 3) s += n.nodeValue;
    return s.replace(/\s+/g, " ").trim();
  }

  const rows = [];
  const all = document.querySelectorAll("body *");
  for (const el of all) {
    const t = ownText(el);
    if (!t) continue;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    rows.push({
      tag: el.tagName.toLowerCase(),
      cls: (el.className && typeof el.className === "string" ? el.className : "").slice(0, 40),
      px: Math.round(parseFloat(cs.fontSize) * 100) / 100,
      lh: Math.round(parseFloat(cs.lineHeight) * 100) / 100,
      w: Math.round(cs.fontWeight),
      chars: t.length,
      sample: t.slice(0, 46),
    });
  }

  /* Characters per line of the widest running-text blocks: a size only reads
   * "too big" together with the column it sits in. Measured on the text box,
   * not the border box - the border box counts padding as if it were text. */
  function cpl(el) {
    const cs = getComputedStyle(el);
    const inner =
      el.clientWidth - parseFloat(cs.paddingLeft || 0) - parseFloat(cs.paddingRight || 0);
    const probe = document.createElement("span");
    probe.style.font = cs.font;
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    probe.style.whiteSpace = "pre";
    probe.textContent = CH;
    document.body.appendChild(probe);
    const chw = probe.getBoundingClientRect().width / CH.length;
    probe.remove();
    return { inner: Math.round(inner), cpl: Math.round(inner / chw) };
  }

  const paras = [...document.querySelectorAll("p, li")]
    .filter((el) => ownText(el).length > 80)
    .slice(0, 60)
    .map((el) => {
      const c = cpl(el);
      return {
        cls: (el.className && typeof el.className === "string" ? el.className : el.tagName.toLowerCase()).slice(0, 34),
        px: Math.round(parseFloat(getComputedStyle(el).fontSize) * 100) / 100,
        inner: c.inner,
        cpl: c.cpl,
      };
    });

  const heads = [...document.querySelectorAll("h1, h2, h3, h4")].map((el) => ({
    tag: el.tagName.toLowerCase(),
    px: Math.round(parseFloat(getComputedStyle(el).fontSize) * 100) / 100,
    lh: Math.round(parseFloat(getComputedStyle(el).lineHeight) * 100) / 100,
    text: ownText(el).slice(0, 40) || el.textContent.replace(/\s+/g, " ").trim().slice(0, 40),
  }));

  return {
    root: parseFloat(getComputedStyle(document.documentElement).fontSize),
    body: parseFloat(getComputedStyle(document.body).fontSize),
    rows,
    paras,
    heads,
  };
})();
