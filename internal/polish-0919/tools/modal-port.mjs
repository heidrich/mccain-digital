/* Ports the start page's (v2) compact, per-service Pixelstrom modal onto the
 * subpage artboards, which still carry the old ~110-line modal (owner point
 * 10, 19.9.2026 "Polish Runde 2"). Only the modal: template body (the block
 * between the shared header and the shared hasPage/closing tags) + the
 * script pieces it needs (T.common.moreOn/toPage, the MODALX static data,
 * the two modal-building branches, and the mx render value). Nothing else
 * -- header/nav/footer/PAGES/etc are nav-patch.mjs's job, run after this.
 *
 *   node modal-port.mjs --file <artboard>              dry run, prints ok
 *   node modal-port.mjs --file <artboard> --write       writes the file
 *   node modal-port.mjs --all --write                   every eligible artboard
 *
 * Every replacement asserts its exact match count (see once()), so an
 * artboard that already differs fails loudly instead of being half patched.
 * All literal strings below were extracted verbatim from v2 by
 * gen-modal-port.mjs (scratchpad), not retyped, to rule out transcription
 * drift from the source of truth. */
import fs from "node:fs";
import path from "node:path";

const DIR = "C:/Users/Christian/Documents/GitHub/mccain-digital/mccain-design-system";

/* Never touch these: DEV is a scratch artboard, and v2 already has the new
 * modal (it's the source we ported everything else from). md-cms/md-portal
 * are in scope -- they are clones of md-recall (owner, 19.9. "Polish Runde
 * 2" follow-up), the other agent building them is done. */
const SKIP = new Set([
  "McCain Digital Websites DEV.dc.html",
  "McCain Digital v2.dc.html",
]);

const argv = process.argv.slice(2);
const arg = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };

function once(text, from, to, what, n = 1) {
  const c = text.split(from).length - 1;
  if (c !== n) throw new Error(`${what}: expected ${n}, found ${c}`);
  return text.split(from).join(to);
}

/* ------------------------------------------------------------------ template
 * The old modal's per-target body starts right after the shared icon/title/
 * lead/cta/stats column (identical in both versions) and ends right before
 * the shared hasPage/closing tags (also identical in both versions, in v2's
 * case -- the old file's tail differs only in that it closes a "hasDeep"
 * sc-if instead of "hasPage", which is exactly what this swaps in). */
const MID_START = "<ul style=\"list-style:none; padding:0; margin-top: clamp(0px,2vw,44px); display:grid; gap:14px; align-content:start; opacity: {{ modalOp }}; transform: {{ modalRise }}; transition: opacity .5s cubic-bezier(.2,.8,.2,1) 0.20s, transform .6s cubic-bezier(.2,.8,.2,1) 0.20s\">";
const END_MARK = "<use href=\"brand/mccain-icons.svg#chevron-right\"></use></svg></button>\n        </div>\n      </sc-if>\n    </div>\n  </div>\n</div>\n</sc-if>";

const NEW_MID = "<div style=\"margin-top: clamp(0px,2vw,40px); display:flex; flex-direction:column; gap:20px; align-content:start; opacity: {{ modalOp }}; transform: {{ modalRise }}; transition: opacity .5s cubic-bezier(.2,.8,.2,1) .2s, transform .6s cubic-bezier(.2,.8,.2,1) .2s\">\n          <sc-if value=\"{{ modal.isAi }}\" hint-placeholder-val=\"{{ false }}\">\n            <div style=\"border-radius:16px; background:var(--mc-plate); padding:18px; display:flex; flex-direction:column; gap:12px; box-shadow: 0 30px 70px -44px color-mix(in srgb, var(--mc-navy) 90%, transparent)\">\n              <div style=\"align-self:flex-end; max-width:82%; background:color-mix(in srgb, var(--mc-white) 10%, transparent); color:var(--mc-white); border-radius:13px 13px 4px 13px; padding:11px 14px; font-size:14px; line-height:1.5\">{{ t.mock.aiQ }}</div>\n              <div style=\"align-self:flex-start; max-width:88%; background:var(--mc-white); color:var(--mc-navy); border-radius:13px 13px 13px 4px; padding:11px 14px; font-size:14px; line-height:1.5\">{{ t.mock.aiA }}<span style=\"display:inline-flex; align-items:center; gap:6px; margin-top:9px; font-size:11px; font-weight:600; color:var(--acc-text); background:var(--mc-action-tint); padding:4px 9px; border-radius:999px\">{{ t.mock.aiSrc }}</span></div>\n              <div style=\"display:flex; align-items:center; gap:8px; font-size:12.5px; color:var(--mc-dark-text-2)\"><span style=\"width:8px; height:8px; border-radius:50%; background:var(--mc-success)\"></span>{{ mx.ai.grounded }}</div>\n              <div style=\"display:flex; flex-wrap:wrap; gap:7px; padding-top:4px; border-top:1px solid color-mix(in srgb, var(--mc-white) 10%, transparent)\"><sc-for list=\"{{ mx.ai.chips }}\" as=\"c\" hint-placeholder-count=\"3\"><span style=\"font-family:'JetBrains Mono',monospace; font-size:10.5px; letter-spacing:.06em; color:var(--mc-dark-muted); background:color-mix(in srgb, var(--mc-white) 7%, transparent); padding:5px 9px; border-radius:6px\">{{ c }}</span></sc-for></div>\n            </div>\n            <ul style=\"list-style:none; padding:0; margin:0; display:grid; gap:11px\"><sc-for list=\"{{ modal.items }}\" as=\"i\" hint-placeholder-count=\"4\"><li style=\"display:flex; gap:11px; font-size:14.5px; line-height:1.5; color:var(--mc-slate)\"><span style=\"flex:none; width:18px; height:18px; border-radius:50%; background:var(--mc-action-tint); color:var(--acc-text); display:grid; place-items:center; margin-top:1px\"><svg width=\"10\" height=\"10\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"3.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><use href=\"brand/mccain-icons.svg#check\"></use></svg></span>{{ i }}</li></sc-for></ul>\n          </sc-if>\n          <sc-if value=\"{{ modal.isApps }}\" hint-placeholder-val=\"{{ false }}\">\n            <div style=\"display:flex; flex-direction:column\">\n              <sc-for list=\"{{ mx.apps.steps }}\" as=\"st\" hint-placeholder-count=\"3\">\n                <div style=\"display:flex; align-items:center; gap:14px\"><span style=\"flex:none; width:11px; height:11px; border-radius:3px; background: linear-gradient(135deg,var(--mc-action),var(--mc-sky))\"></span><span style=\"font-size:15.5px; font-weight:600; color:var(--mc-navy)\">{{ st }}</span></div>\n                <span aria-hidden=\"true\" style=\"width:1px; height:22px; margin-left:5px; background: repeating-linear-gradient(180deg, color-mix(in srgb, var(--mc-action) 50%, transparent) 0 3px, transparent 3px 6px)\"></span>\n              </sc-for>\n              <div style=\"font-size:13.5px; line-height:1.55; color:var(--mc-text-grey); margin-top:2px\">{{ mx.apps.note }}</div>\n            </div>\n            <ul style=\"list-style:none; padding:0; margin:0; display:grid; gap:11px; padding-top:16px; border-top:1px solid var(--mc-line)\"><sc-for list=\"{{ modal.items }}\" as=\"i\" hint-placeholder-count=\"4\"><li style=\"display:flex; gap:11px; font-size:14.5px; line-height:1.5; color:var(--mc-slate)\"><span style=\"flex:none; width:18px; height:18px; border-radius:50%; background:var(--mc-action-tint); color:var(--acc-text); display:grid; place-items:center; margin-top:1px\"><svg width=\"10\" height=\"10\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"3.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><use href=\"brand/mccain-icons.svg#check\"></use></svg></span>{{ i }}</li></sc-for></ul>\n          </sc-if>\n          <sc-if value=\"{{ modal.isWeb }}\" hint-placeholder-val=\"{{ false }}\">\n            <div style=\"display:grid; grid-template-columns: repeat(4, 1fr); gap:10px\">\n              <sc-for list=\"{{ mx.web.scores }}\" as=\"sc\" hint-placeholder-count=\"4\">\n                <div style=\"display:flex; flex-direction:column; align-items:center; gap:8px; padding:14px 6px; border-radius:12px; background:var(--mc-success-tint-6); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--mc-success) 22%, transparent)\"><span style=\"font-size:21px; font-weight:700; letter-spacing:-.03em; color:var(--mc-success)\">{{ sc.v }}</span><span style=\"font-size:10.5px; line-height:1.3; text-align:center; color:var(--mc-text-grey)\">{{ sc.l }}</span></div>\n              </sc-for>\n            </div>\n            <div style=\"font-size:13.5px; line-height:1.55; color:var(--mc-text-grey); margin-top:-8px\">{{ mx.web.note }}</div>\n            <ul style=\"list-style:none; padding:0; margin:0; display:grid; gap:11px; padding-top:16px; border-top:1px solid var(--mc-line)\"><sc-for list=\"{{ modal.items }}\" as=\"i\" hint-placeholder-count=\"4\"><li style=\"display:flex; gap:11px; font-size:14.5px; line-height:1.5; color:var(--mc-slate)\"><span style=\"flex:none; width:18px; height:18px; border-radius:50%; background:var(--mc-action-tint); color:var(--acc-text); display:grid; place-items:center; margin-top:1px\"><svg width=\"10\" height=\"10\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"3.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><use href=\"brand/mccain-icons.svg#check\"></use></svg></span>{{ i }}</li></sc-for></ul>\n          </sc-if>\n          <sc-if value=\"{{ modal.isSoftware }}\" hint-placeholder-val=\"{{ false }}\">\n            <div style=\"display:grid; grid-template-columns: 1fr auto; gap:14px; align-items:center; padding:18px; border-radius:16px; background:var(--mc-surface); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--mc-navy) 7%, transparent)\">\n              <div style=\"display:flex; flex-wrap:wrap; gap:7px\"><sc-for list=\"{{ mx.software.systems }}\" as=\"sy\" hint-placeholder-count=\"6\"><span style=\"font-family:'JetBrains Mono',monospace; font-size:11px; color:var(--mc-slate); background:var(--mc-white); box-shadow: inset 0 0 0 1px var(--mc-line); padding:6px 10px; border-radius:6px\">{{ sy }}</span></sc-for></div>\n              <div style=\"display:flex; align-items:center; gap:10px\"><span aria-hidden=\"true\" style=\"width:26px; height:1px; background: repeating-linear-gradient(90deg, color-mix(in srgb, var(--mc-action) 60%, transparent) 0 3px, transparent 3px 6px)\"></span><span style=\"display:inline-flex; align-items:center; height:40px; padding:0 14px; border-radius:9px; background:var(--mc-plate); color:var(--mc-white); font-size:13.5px; font-weight:600; white-space:nowrap\">{{ mx.software.app }}</span></div>\n            </div>\n            <div style=\"font-size:13.5px; line-height:1.55; color:var(--mc-text-grey); margin-top:-8px\">{{ mx.software.note }}</div>\n            <ul style=\"list-style:none; padding:0; margin:0; display:grid; gap:11px; padding-top:16px; border-top:1px solid var(--mc-line)\"><sc-for list=\"{{ modal.items }}\" as=\"i\" hint-placeholder-count=\"4\"><li style=\"display:flex; gap:11px; font-size:14.5px; line-height:1.5; color:var(--mc-slate)\"><span style=\"flex:none; width:18px; height:18px; border-radius:50%; background:var(--mc-action-tint); color:var(--acc-text); display:grid; place-items:center; margin-top:1px\"><svg width=\"10\" height=\"10\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"3.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><use href=\"brand/mccain-icons.svg#check\"></use></svg></span>{{ i }}</li></sc-for></ul>\n          </sc-if>\n          <sc-if value=\"{{ modal.isCaseLike }}\" hint-placeholder-val=\"{{ true }}\">\n            <ul style=\"list-style:none; padding:0; margin:0; display:grid; gap:11px\"><sc-for list=\"{{ modal.items }}\" as=\"i\" hint-placeholder-count=\"4\"><li style=\"display:flex; gap:11px; font-size:14.5px; line-height:1.5; color:var(--mc-slate)\"><span style=\"flex:none; width:18px; height:18px; border-radius:50%; background:var(--mc-action-tint); color:var(--acc-text); display:grid; place-items:center; margin-top:1px\"><svg width=\"10\" height=\"10\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"3.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><use href=\"brand/mccain-icons.svg#check\"></use></svg></span>{{ i }}</li></sc-for></ul>\n          </sc-if>\n        </div>\n      </div>\n      <sc-if value=\"{{ modal.hasPage }}\" hint-placeholder-val=\"{{ false }}\">\n        <a href=\"{{ modal.page }}\" style=\"display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:16px 24px; margin-top: clamp(26px,3.2vw,40px); padding: clamp(18px,2vw,24px); border-radius:14px; background:var(--mc-surface); color:var(--mc-navy); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--mc-navy) 7%, transparent); transition: box-shadow .25s, background .25s\" style-hover=\"box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--mc-action) 40%, transparent); background:var(--mc-action-tint-hover)\">\n          <span style=\"min-width:0; display:flex; flex-direction:column; gap:5px\">\n            <span style=\"font-size: clamp(16px,1.05vw,18px); font-weight:600\">{{ modal.pageTitle }}</span>\n            <span style=\"font-size:14px; line-height:1.55; color:var(--mc-slate); max-width:58ch\">{{ modal.pageText }}</span>\n          </span>\n          <span style=\"flex:none; display:inline-flex; align-items:center; gap:7px; height:44px; padding:0 20px; border-radius:8px; background:var(--acc); color:var(--mc-white); font-size:15px; font-weight:600\">{{ modal.pageCta }}<svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><use href=\"brand/mccain-icons.svg#arrow-right\"></use></svg></span>\n        </a>\n      </sc-if>\n    </div>\n  </div>\n</div>\n</sc-if>";

function patchTemplate(t, file) {
  const startCount = t.split(MID_START).length - 1;
  if (startCount !== 1) throw new Error(file + ": old modal body start (MID_START) expected once, found " + startCount);
  const s = t.indexOf(MID_START);
  const endCount = t.split(END_MARK).length - 1;
  if (endCount !== 1) throw new Error(file + ": old modal body end (END_MARK) expected once, found " + endCount);
  const e = t.indexOf(END_MARK, s);
  if (e < s) throw new Error(file + ": END_MARK found before MID_START");
  return t.slice(0, s) + NEW_MID + t.slice(e + END_MARK.length);
}

/* --------------------------------------------------------------------- script */
const MODALX_BLOCK = "  static MODALX = {\n    web: { scores: [{ v: '100', l: 'Performance' }, { v: '100', l: { de: 'Barrierefreiheit', en: 'Accessibility' } }, { v: '100', l: 'Best Practices' }, { v: '100', l: 'SEO' }], note: { de: 'Gemessen an unserer eigenen Seite – dieselbe Messlatte gilt für Ihre.', en: 'Measured on our own site — the same bar applies to yours.' } },\n    apps: { steps: [{ de: 'Daten und Systeme', en: 'Data and systems' }, { de: 'Anwendung', en: 'Application' }, { de: 'Betrieb und Übergabe', en: 'Operations and handover' }], note: { de: 'Ein Strang: von der Quelle bis in den Betrieb, ohne Bruch.', en: 'One line: from source to production, without a break.' } },\n    software: { systems: ['SAP', 'REST', 'CSV', 'SOAP', 'Excel', 'Wiki'], app: { de: 'Ihre Anwendung', en: 'Your application' }, note: { de: 'Wir hängen uns an das an, was schon läuft – kein Rundumschlag.', en: 'We attach to what already runs — no big-bang replacement.' } },\n    ai: { grounded: { de: 'Aus Ihrer Wissensbasis beantwortet – mit Quelle', en: 'Answered from your knowledge base — with the source' }, chips: ['pgvector', 'MCP', 'Claude · Llama'] }\n  };\n";

const OLD_SVC = "modal = Object.assign({}, s, { kicker: t.common.service + ' · ' + s.title, title: s.tileTitle, cta: t.common.cta, hasLink: false, link: '', linkLabel: '', stats: deep ? deep.stats : [], deep: deep || emptyDeep, hasDeep: !!deep, vAi: s.id === 'ai', vApps: s.id === 'apps', vScores: s.id === 'web', vSoftware: s.id === 'software', vRecall: false });";
const NEW_SVC = "const mp = Component.PAGES[s.id] || ''; modal = Object.assign({}, s, { isCaseLike: false, isAi: s.id === 'ai', isApps: s.id === 'apps', isWeb: s.id === 'web', isSoftware: s.id === 'software', hasPage: !!mp, page: mp, pageTitle: (t.common.moreOn || 'Mehr zu') + ' ' + s.title, pageText: s.short, pageCta: t.common.toPage || (this.state.lang === 'en' ? 'Open the page' : 'Zur Seite'), kicker: t.common.service + ' · ' + s.title, title: s.tileTitle, cta: t.common.cta, hasLink: false, link: '', linkLabel: '', stats: deep ? deep.stats : [], deep: deep || emptyDeep, hasDeep: !!deep, vAi: s.id === 'ai', vApps: s.id === 'apps', vScores: s.id === 'web', vSoftware: s.id === 'software', vRecall: false });";

const OLD_CASE = "modal = Object.assign({}, c, { kicker: t.common.caseLabel + ' · ' + c.title, title: c.tileTitle, cta: t.common.cta, hasLink: true, linkLabel: c.id === 'recall' ? t.common.visit : t.common.visitSite, stats: c.stats || [], deep: emptyDeep, hasDeep: false, vAi: false, vApps: false, vScores: c.id === 'site', vSoftware: false, vRecall: c.id === 'recall' });";
const NEW_CASE = "modal = Object.assign({}, c, { isCaseLike: true, isAi: false, isApps: false, isWeb: false, isSoftware: false, hasPage: false, page: '', pageTitle: '', pageText: '', pageCta: '', kicker: t.common.caseLabel + ' · ' + c.title, title: c.tileTitle, cta: t.common.cta, hasLink: true, linkLabel: c.id === 'recall' ? t.common.visit : t.common.visitSite, stats: c.stats || [], deep: emptyDeep, hasDeep: false, vAi: false, vApps: false, vScores: c.id === 'site', vSoftware: false, vRecall: c.id === 'recall' });";

function patchScript(t, file) {
  /* T.common gains the two keys the new "hasPage" link on a service modal
   * reads (v2 falls back to a literal if missing, but every other page's
   * T.common should carry them for real translation + consistency). */
  t = once(t,
    "common: { skip: { de: 'Zum Inhalt springen', en: 'Skip to content' },",
    "common: { moreOn: { de: 'Mehr zu', en: 'More on' }, toPage: { de: 'Zur Seite', en: 'Open the page' }, skip: { de: 'Zum Inhalt springen', en: 'Skip to content' },",
    file + ": T.common moreOn/toPage");

  /* Static per-service modal content (scores/steps/systems/grounded chips),
   * page-independent, ported verbatim from v2. Anchored before static FAQS,
   * which every artboard with a modal also has. */
  t = once(t, "  static FAQS = [", MODALX_BLOCK + "  static FAQS = [", file + ": static MODALX insertion");

  /* The two branches that build the "modal" render value: service and case. */
  t = once(t, OLD_SVC, NEW_SVC, file + ": modal service branch");
  t = once(t, OLD_CASE, NEW_CASE, file + ": modal case branch");

  /* Feed the new per-service data into the template as "mx". */
  t = once(t,
    "closeModal: this.closeModal, stop: this.stop, modalCta: this.modalCta",
    "closeModal: this.closeModal, stop: this.stop, modalCta: this.modalCta, mx: this.loc(Component.MODALX)",
    file + ": render value mx");

  return t;
}

function patchFile(file) {
  const full = path.isAbsolute(file) ? file : path.join(DIR, file);
  const t0 = fs.readFileSync(full, "utf8");
  const t1 = patchTemplate(t0, file);
  const t2 = patchScript(t1, file);
  return t2;
}

if (argv.includes("--all")) {
  const write = argv.includes("--write");
  const files = fs.readdirSync(DIR).filter((f) => /^McCain Digital .*\.dc\.html$/.test(f) && !SKIP.has(f));
  const done = [], skipped = [];
  for (const f of files) {
    const full = path.join(DIR, f);
    const t = fs.readFileSync(full, "utf8");
    if (!t.includes(MID_START)) { skipped.push(f); continue; }
    const out = patchFile(f);
    if (write) fs.writeFileSync(full, out, "utf8");
    done.push(f);
  }
  console.log((write ? "wrote" : "dry-run ok"), done.length, "artboard(s):\n  " + done.join("\n  "));
  if (skipped.length) console.log("skipped (no old-style modal body found):\n  " + skipped.join("\n  "));
} else {
  const file = arg("--file");
  if (!file) throw new Error("usage: --file <artboard> [--write]  |  --all --write");
  const write = argv.includes("--write");
  const out = patchFile(file);
  const full = path.isAbsolute(file) ? file : path.join(DIR, file);
  if (write) { fs.writeFileSync(full, out, "utf8"); console.log("wrote", full); }
  else console.log("ok (dry run)", out.length);
}
