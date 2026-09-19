/* Page themes for Web-Apps (blue) and KI (the heading gradient in ink steps),
 * mirroring what Websites (orange-ink) and Individualsoftware (violet-700)
 * already do: section eyebrows, card numbers, tags, step chips, hero line. */
import fs from "node:fs";
const DIR = "C:/Users/Christian/Documents/GitHub/mccain-digital/mccain-design-system/";
const INK = "width:fit-content; background: var(--mc-heading-gradient-ink); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; color:var(--mc-violet-700)";
const jobs = {
  "McCain Digital Web-Apps.dc.html": [
    ...["pg.hero.eyebrow", "pg.vitals.eyebrow", "pg.caps.eyebrow", "pg.uc.eyebrow", "pg.steps.eyebrow", "pg.faq.eyebrow", "s.mono", "u.tag"].map((k) => [`color:var(--acc-text)">{{ ${k} }}`, `color:var(--mc-link-blue)">{{ ${k} }}`]),
    ["border-radius:50%; background:var(--acc-soft); color:var(--acc-text); font-family:'JetBrains Mono',monospace; font-size:12px;", "border-radius:50%; background:var(--mc-wash-blue-2); color:var(--mc-link-blue); font-family:'JetBrains Mono',monospace; font-size:12px;"],
    [`<span style="background: var(--mc-heading-gradient); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent">{{ pg.hero.t2 }}</span>`, `<span style="background: var(--mc-heading-gradient-blue); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent">{{ pg.hero.t2 }}</span>`],
  ],
  "McCain Digital KI.dc.html": [
    ...["ki.pipe.eyebrow", "ki.caps.eyebrow", "ki.agent.eyebrow", "ki.uc.eyebrow", "ki.faq.eyebrow"].map((k) => [`<div style="font-size:15px; font-weight:600; color:var(--acc-text)">{{ ${k} }}`, `<div style="font-size:15px; font-weight:600; ${INK}">{{ ${k} }}`]),
    [`margin-top:26px; font-size:15px; font-weight:600; color:var(--acc-text)"><span aria-hidden="true" style="width:8px; height:8px; border-radius:50%; background:var(--mc-success)`, `margin-top:26px; font-size:15px; font-weight:600; ${INK}"><span aria-hidden="true" style="width:8px; height:8px; border-radius:50%; background:var(--mc-success)`],
    [`letter-spacing:.1em; text-transform:uppercase; color:var(--acc-text)">{{ u.tag }}`, `letter-spacing:.1em; text-transform:uppercase; ${INK}">{{ u.tag }}`],
  ],
};
for (const [file, reps] of Object.entries(jobs)) {
  let t = fs.readFileSync(DIR + file, "utf8");
  for (const [from, to] of reps) {
    const n = t.split(from).length - 1;
    if (n !== 1) throw new Error(`${file}: expected exactly 1 of\n  ${from}\nfound ${n}`);
    t = t.replace(from, () => to);
  }
  fs.writeFileSync(DIR + file, t, "utf8");
  console.log("ok", reps.length, file);
}
