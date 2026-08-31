(() => {
  const d = document, de = d.documentElement;
  const q = (s) => d.querySelectorAll(s).length;
  const over = [...d.querySelectorAll("body *")]
    .filter((e) => e.getBoundingClientRect().right > de.clientWidth + 1)
    .filter((e) => !e.closest(".vmq") && !e.closest(".cm"))
    .map((e) => e.tagName + "." + (e.className || "").toString().split(" ")[0]);
  const missingAlt = [...d.querySelectorAll("img")].filter((i) => !i.hasAttribute("alt")).length;
  const emptyLinks = [...d.querySelectorAll("a")]
    .filter((a) => !a.textContent.trim() && !a.getAttribute("aria-label") && !a.querySelector("img[alt]:not([alt=''])"))
    .length;
  const btnNoName = [...d.querySelectorAll("button")]
    .filter((b) => !b.textContent.trim() && !b.getAttribute("aria-label")).length;
  const tabs = [...d.querySelectorAll('[role="tab"]')];
  const badTabParent = tabs.filter((t) => !t.closest('[role="tablist"]')).length;
  return JSON.stringify({
    title: d.title,
    boot: { MCD: !!window.MCD, MCDUI: !!window.MCDUI, PixelFX: !!window.PixelFX, menu: !!d.getElementById("cmenu") },
    pixel: { hosts: q("[data-pixel]"), canvases: q(".ph canvas") },
    faq: tabs.length ? { tabs: tabs.length, panel: (d.querySelector(".faq-panel .a") || {}).textContent ? "filled" : "EMPTY", badTabParent } : "none",
    overflowX: de.scrollWidth > de.clientWidth ? de.scrollWidth + " > " + de.clientWidth : "none",
    overflowing: [...new Set(over)].slice(0, 6),
    a11y: { missingAlt, emptyLinks, btnNoName },
    h1: q("h1")
  });
})()
