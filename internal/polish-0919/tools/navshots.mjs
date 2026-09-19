import { launch, open, settle, BASE } from "file:///C:/Users/Christian/Documents/GitHub/mccain-digital/tools/browser.mjs";
const OUT = "C:/Users/Christian/AppData/Local/Temp/claude/c--Users-Christian-Documents-GitHub/408e4ee3-e3c0-47f8-a788-f7e615f12b43/scratchpad/nav/";
const url = process.argv[2], tag = process.argv[3] || "dev";
for (const w of [1440, 1280, 1180]) {
  const { browser, context } = await launch(w, 860);
  const page = await open(context, BASE + url); await settle(page);
  const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}${tag}-${w}-top.png`, clip: { x: 0, y: 0, width: w, height: 90 } });
  if (w >= 1280) {
    for (const id of ["services", "software", "login"]) {
      const el = await page.$(`[data-nav-item="${id}"]`);
      if (!el) { console.log(w, id, "MISSING"); continue; }
      await el.hover(); await page.waitForTimeout(700);
      await page.screenshot({ path: `${OUT}${tag}-${w}-menu-${id}.png`, clip: { x: 0, y: 0, width: w, height: 520 } });
    }
    await page.mouse.move(w / 2, 700); await page.waitForTimeout(500);
    await page.evaluate(() => { document.documentElement.style.scrollBehavior = "auto"; scrollTo(0, 2600); });
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${OUT}${tag}-${w}-scrolled.png`, clip: { x: 0, y: 0, width: w, height: 200 } });
    await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${OUT}${tag}-${w}-footer.png`, fullPage: false });
  }
  const fit = await page.evaluate(() => { const i = document.querySelector("[data-nav-inner]"); if (!i) return "no inner"; const r = i.getBoundingClientRect(), pr = parseFloat(getComputedStyle(i).paddingRight); const kids = [...i.querySelectorAll(":scope > *")].filter((k) => getComputedStyle(k).position !== "absolute" && k.getBoundingClientRect().width); const right = Math.max(...kids.map((k) => k.getBoundingClientRect().right)); return { overflow: Math.round(right - (r.right - pr)) }; });
  console.log(w, JSON.stringify(fit), errs.slice(0, 2));
  await browser.close();
}
