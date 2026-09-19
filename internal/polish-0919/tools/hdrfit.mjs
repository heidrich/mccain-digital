import { launch, open, settle, BASE } from "file:///C:/Users/Christian/Documents/GitHub/mccain-digital/tools/browser.mjs";
for (const w of [960, 1080, 1180, 1280, 1366, 1440]) {
  const { browser, context } = await launch(w, 800);
  const page = await open(context, BASE + "/leistungen/websites/"); await settle(page, { deep: false });
  const r = await page.evaluate(() => {
    const inner = document.querySelector("[data-nav-inner]"), ir = inner.getBoundingClientRect(), cs = getComputedStyle(inner);
    const kids = [...inner.children].filter((k) => k.getBoundingClientRect().width > 0).map((k) => Math.round(k.getBoundingClientRect().width));
    const nav = document.querySelector("[data-nav-list]"), items = nav ? [...nav.querySelectorAll("[data-nav-item]")].map((b) => Math.round(b.getBoundingClientRect().width)) : [];
    const brand = inner.querySelector("a,button").getBoundingClientRect(), last = [...inner.children].filter((k) => k.getBoundingClientRect().width > 0 && getComputedStyle(k).position !== "absolute").pop().getBoundingClientRect();
    const navR = nav ? nav.getBoundingClientRect() : null, util = nav ? nav.nextElementSibling?.getBoundingClientRect?.() : null;
    return { pad: cs.paddingLeft, inner: Math.round(ir.width), brand: Math.round(brand.width), navW: navR ? Math.round(navR.width) : 0, items, utilW: util ? Math.round(util.width) : 0, slack: navR && util ? Math.round(util.left - navR.right) : null };
  });
  console.log(w, JSON.stringify(r));
  await browser.close();
}
