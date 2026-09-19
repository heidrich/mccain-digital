/* Header, menu, breadcrumb pill and footer for every artboard (owner 19.9.2026,
 * "Polish Runde 2": indicator C+D, breadcrumb pill b, footer V2, Software menu
 * with 360 greyed, client login as an icon button; header tiers so it fits).
 *
 *   node nav-patch.mjs --all                        every artboard with a header
 *   node nav-patch.mjs --file <artboard> [--self <artboard name>] [--out <path>]
 *
 * Every replacement asserts its exact count, so an artboard that drifted fails
 * loudly instead of being half patched. The page identity (SELF) is the
 * artboard's own file name: prerender rewrites every artboard file name into
 * its route, so SELF, PAGES and TRAIL compare as file names in the raw view and
 * as routes in the build - the old check read location.pathname against file
 * names and therefore never matched on the built site. */
import fs from "node:fs";
import path from "node:path";

const DIR = "C:/Users/Christian/Documents/GitHub/mccain-digital/mccain-design-system";
const argv = process.argv.slice(2);
const arg = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };

function once(text, from, to, what, n = 1) {
  const c = text.split(from).length - 1;
  if (c !== n) throw new Error(`${what}: expected ${n}, found ${c}`);
  return text.split(from).join(to);
}

/* ------------------------------------------------------------------ header */
const LOGIN_BTN = `      <sc-if value="{{ navFull }}" hint-placeholder-val="{{ true }}">
        <button data-nav-item="login" onMouseEnter="{{ loginOpen }}" onClick="{{ loginToggle }}" aria-label="{{ t.nav.login }}" aria-haspopup="true" style="flex:none; width:36px; height:36px; border-radius:50%; display:grid; place-items:center; color:var(--mc-navy); background: {{ loginBg }}; box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--mc-navy) 16%, transparent); transition: background .2s" style-hover="background:var(--mc-surface)">{{ loginIcon }}</button>
      </sc-if>
`;

const HERE_CHIP = `<sc-if value="{{ HOST.isHere }}" hint-placeholder-val="{{ false }}"><span style="font-size:10.5px; font-weight:600; color:var(--mc-white); background:var(--mc-navy); padding:2px 8px; border-radius:999px; white-space:nowrap">{{ t.menus.here }}</span></sc-if>`;

const PANELS = `        <div data-menu-content="software" style="position:absolute; top:0; left:0; width:600px; opacity: {{ mv.software.op }}; transform: {{ mv.software.tf }}; pointer-events: {{ mv.software.pe }}; transition: opacity .25s, transform .35s cubic-bezier(.2,.8,.2,1)">
          <div style="display:grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap:2px 12px; padding:14px">
            <sc-for list="{{ swItems }}" as="p" hint-placeholder-count="3">
              <a href="{{ p.href }}" aria-current="{{ p.current }}" style="display:flex; gap:14px; align-items:flex-start; padding:12px; border-radius:8px; transition: background .2s; color:var(--mc-navy); background: {{ p.curBg }}" style-hover="background:var(--mc-surface)">
                <span style="flex:none; width:36px; height:36px; border-radius:9px; overflow:hidden; background: {{ p.tileBg }}; color:var(--mc-white); display:grid; place-items:center">{{ p.mark }}</span>
                <span style="display:block; min-width:0"><span style="display:flex; align-items:center; flex-wrap:wrap; gap:6px 8px; font-size:15px; font-weight:600; color:var(--mc-navy)">{{ p.title }}<span style="font-size:11px; font-weight:600; color: {{ p.statusFg }}; background: {{ p.statusBg }}; padding:2px 8px; border-radius:999px; white-space:nowrap">{{ p.status }}</span>${HERE_CHIP.replace("HOST", "p")}</span><span style="display:block; font-size:13px; line-height:1.45; color:var(--mc-text-grey); margin-top:3px">{{ p.menu }}</span></span>
              </a>
            </sc-for>
            <div aria-disabled="true" style="display:flex; gap:14px; align-items:flex-start; padding:12px; border-radius:8px; opacity:.62">
              <span style="flex:none; width:36px; height:36px; border-radius:9px; background:var(--mc-navy); color:var(--mc-white); display:grid; place-items:center">{{ sw360.icon }}</span>
              <span style="display:block; min-width:0"><span style="display:flex; align-items:center; gap:8px; font-size:15px; font-weight:600; color:var(--mc-navy)">{{ sw360.title }}<span style="font-size:11px; font-weight:600; color:var(--mc-text-grey); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--mc-navy) 14%, transparent); padding:1px 7px; border-radius:999px">{{ t.menus.soon }}</span></span><span style="display:block; font-size:13px; line-height:1.45; color:var(--mc-text-grey); margin-top:3px">{{ sw360.menu }}</span></span>
            </div>
          </div>
          <div style="display:flex; align-items:center; justify-content:space-between; gap:16px; padding:13px 22px; background:var(--mc-surface); border-top:1px solid color-mix(in srgb, var(--mc-navy) 6%, transparent); font-size:13px">
            <span style="color:var(--mc-text-grey)">{{ t.menus.swFoot }}</span>
            <a href="McCain Digital Studio.dc.html#produkte" style="font-weight:600; color:var(--mc-navy); white-space:nowrap">{{ t.menus.swFootLink }} ›</a>
          </div>
        </div>

        <div data-menu-content="login" style="position:absolute; top:0; left:0; width:320px; opacity: {{ mv.login.op }}; transform: {{ mv.login.tf }}; pointer-events: {{ mv.login.pe }}; transition: opacity .25s, transform .35s cubic-bezier(.2,.8,.2,1)">
          <div style="display:grid; gap:2px; padding:10px">
            <div style="font-size:12px; font-weight:600; color:var(--mc-text-grey); padding:6px 10px 4px">{{ t.menus.loginTitle }}</div>
            <sc-for list="{{ loginItems }}" as="l" hint-placeholder-count="2">
              <a href="{{ l.href }}" style="display:flex; gap:12px; align-items:flex-start; padding:11px 10px; border-radius:8px; color:var(--mc-navy); text-decoration:none; transition: background .2s" style-hover="background:var(--mc-surface)">
                <span style="flex:none; width:32px; height:32px; border-radius:8px; background:var(--mc-navy); color:var(--mc-white); display:grid; place-items:center">{{ l.icon }}</span>
                <span style="display:block; min-width:0"><span style="display:flex; align-items:center; gap:6px; font-size:14px; font-weight:600; color:var(--mc-navy)">{{ l.name }}<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="opacity:.5"><use href="brand/mccain-icons.svg#external-link"></use></svg></span><span style="display:block; font-size:12.5px; line-height:1.4; color:var(--mc-text-grey); margin-top:2px">{{ l.desc }}</span><span style="display:block; font-family:'JetBrains Mono',monospace; font-size:11px; color:var(--mc-text-grey); margin-top:3px">{{ l.domain }}</span></span>
              </a>
            </sc-for>
          </div>
          <div style="padding:11px 20px; background:var(--mc-surface); border-top:1px solid color-mix(in srgb, var(--mc-navy) 6%, transparent); font-size:12.5px; color:var(--mc-text-grey)">{{ t.menus.loginNote }}</div>
        </div>

`;

const CRUMB = `
<sc-if value="{{ crumbOn }}" hint-placeholder-val="{{ false }}">
<div data-crumb aria-hidden="true" style="position:fixed; top:84px; left:0; right:0; z-index:79; pointer-events:none">
  <div style="max-width:1440px; margin:0 auto; padding:0 clamp(20px,4vw,48px)">
    <div style="display:inline-flex; flex-direction:column; gap:7px; max-width:100%; padding:8px 14px 9px; border-radius:12px; background:color-mix(in srgb, var(--mc-white) 94%, transparent); backdrop-filter: blur(14px) saturate(1.4); -webkit-backdrop-filter: blur(14px) saturate(1.4); box-shadow: 0 0 0 1px color-mix(in srgb, var(--mc-navy) 8%, transparent), 0 14px 32px -20px color-mix(in srgb, var(--mc-navy) 40%, transparent); pointer-events: {{ crumbPe }}; opacity: {{ crumbOp }}; transform: {{ crumbTf }}; transition: opacity .25s, transform .3s cubic-bezier(.2,.8,.2,1)">
      <span style="display:flex; align-items:center; gap:7px; font-size:12.5px; font-weight:500; line-height:1.2; color:var(--mc-slate); white-space:nowrap">
        <sc-for list="{{ crumbs }}" as="c" hint-placeholder-count="2"><a href="{{ c.href }}" tabIndex="-1" style="color:var(--mc-slate); text-decoration:none" style-hover="color:var(--mc-navy)">{{ c.label }}</a><span style="opacity:.45">›</span></sc-for>
        <span style="font-weight:600; color:var(--mc-navy)">{{ crumbHere }}</span>
        <span data-crumb-sec-wrap style="display:none"><span style="opacity:.45; margin-right:7px">·</span><span data-crumb-sec style="font-weight:600; color:var(--mc-action-text)"></span></span>
      </span>
      <span style="display:block; height:2px; border-radius:2px; background:var(--mc-line); overflow:hidden"><span data-crumb-bar style="display:block; height:100%; background:var(--mc-stream); transform-origin:0 50%; transform: scaleX(0)"></span></span>
    </div>
  </div>
</div>
</sc-if>
`;

function patchHeader(h) {
  h = once(h,
    `    <sc-if value="{{ isDesktop }}" hint-placeholder-val="{{ true }}">\n      <nav data-nav-list aria-label="{{ ariaNav }}" style="position:relative; display:flex; align-items:center; gap:4px; margin-left:8px">`,
    `    <sc-if value="{{ navFull }}" hint-placeholder-val="{{ true }}">\n      <nav data-nav-list aria-label="{{ ariaNav }}" style="position:relative; display:flex; align-items:center; gap: {{ navGap }}; margin-left: {{ navMl }}">`,
    "nav list");
  h = once(h,
    `style="position:relative; display:flex; align-items:center; gap:3px; padding:8px 12px; border-radius:8px; font-size:15px; font-weight:500; white-space:nowrap; color: {{ m.fg }}; opacity: {{ m.opacity }}; transition: opacity .2s, color .2s"><span aria-hidden="true" style="position:absolute; left:50%; bottom:1px; width:14px; height:2px; margin-left:-7px; border-radius:2px; background:var(--acc); opacity: {{ m.dotOp }}; transition: opacity .25s"></span>{{ m.label }}<svg`,
    `style="position:relative; display:flex; align-items:center; gap:3px; padding: {{ navItemPad }}; border-radius:8px; font-size:15px; font-weight: {{ m.fw }}; white-space:nowrap; color: {{ m.fg }}; background: {{ m.curBg }}; opacity: {{ m.opacity }}; transition: opacity .2s, color .2s, background .2s">{{ m.label }}<sc-if value="{{ m.cur }}" hint-placeholder-val="{{ false }}"><span aria-hidden="true" style="flex:none; width:6px; height:6px; margin:0 2px 0 4px; border-radius:50%; background:var(--mc-dark-accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--mc-dark-accent) 25%, transparent)"></span></sc-if><svg`,
    "nav item");
  h = once(h,
    `      <sc-if value="{{ isDesktop }}" hint-placeholder-val="{{ true }}">\n        <button data-px onClick="{{ goContact }}"`,
    LOGIN_BTN + `      <sc-if value="{{ isDesktop }}" hint-placeholder-val="{{ true }}">\n        <button data-px onClick="{{ goContact }}"`,
    "login button");
  h = once(h,
    `      <sc-if value="{{ isMobile }}" hint-placeholder-val="{{ false }}">\n        <button onClick="{{ toggleMobile }}"`,
    `      <sc-if value="{{ navCompact }}" hint-placeholder-val="{{ false }}">\n        <button onClick="{{ toggleMobile }}"`,
    "menu button");
  h = once(h,
    `    <sc-if value="{{ isDesktop }}" hint-placeholder-val="{{ true }}">\n      <div aria-hidden="true" style="position:absolute; top: {{ caretTop }}px;`,
    `    <sc-if value="{{ navFull }}" hint-placeholder-val="{{ true }}">\n      <div aria-hidden="true" style="position:absolute; top: {{ caretTop }}px;`,
    "panel");
  h = once(h,
    `<span style="display:block; min-width:0"><span style="display:block; font-size:15px; font-weight:600; color:var(--mc-navy)">{{ s.title }}</span><span style="display:block; font-size:13px; line-height:1.45; color:var(--mc-text-grey); margin-top:3px">{{ s.menu }}</span></span>`,
    `<span style="display:block; min-width:0"><span style="display:flex; align-items:center; flex-wrap:wrap; gap:6px 8px; font-size:15px; font-weight:600; color:var(--mc-navy)">{{ s.title }}${HERE_CHIP.replace("HOST", "s")}</span><span style="display:block; font-size:13px; line-height:1.45; color:var(--mc-text-grey); margin-top:3px">{{ s.menu }}</span></span>`,
    "services card title");
  h = once(h, `        <div data-menu-content="pricing"`, PANELS + `        <div data-menu-content="pricing"`, "panels");
  return h;
}

/* ------------------------------------------------------------------ footer */
function patchFooter(f) {
  return once(f,
    `style="display:flex; align-items:center; gap:8px; font-size:14px; color: {{ l.fg }}; font-weight: {{ l.fw }}; padding:5px 0; transition: color .2s" style-hover="color:var(--mc-white)"><span aria-hidden="true" style="flex:none; width:5px; height:5px; border-radius:50%; background:var(--mc-dark-accent); opacity: {{ l.dotOp }}; transition: opacity .25s"></span>{{ l.label }}</a>`,
    `style="position:relative; display:flex; align-items:center; font-size:14px; color: {{ l.fg }}; font-weight: {{ l.fw }}; padding:5px {{ l.padX }}; margin-left: {{ l.ml }}; border-radius:6px; background: {{ l.bg }}; transition: color .2s" style-hover="color:var(--mc-white)"><sc-if value="{{ l.on }}" hint-placeholder-val="{{ false }}"><span aria-hidden="true" style="position:absolute; left:-2px; top:5px; bottom:5px; width:3px; border-radius:3px; background:var(--mc-stream)"></span></sc-if>{{ l.label }}</a>`,
    "footer link");
}

/* ------------------------------------------------------------------ script */
const STATICS = (self) => `  static SELF = '${self}';
  /* Where a page sits: which header item is active and the trail the breadcrumb
   * pill shows. Keyed by artboard file name, like SELF and PAGES. */
  static TRAIL = {
    'McCain Digital Uebersicht.dc.html': { nav: 'services', up: [], here: { de: 'Leistungen', en: 'Services' } },
    'McCain Digital KI.dc.html': { nav: 'services', up: ['svc'], here: { de: 'KI & Automatisierung', en: 'AI & automation' } },
    'McCain Digital Web-Apps.dc.html': { nav: 'services', up: ['svc'], here: { de: 'Web-Apps & Plattformen', en: 'Web apps & platforms' } },
    'McCain Digital Websites.dc.html': { nav: 'services', up: ['svc'], here: { de: 'Websites & Landingpages', en: 'Websites & landing pages' } },
    'McCain Digital Software.dc.html': { nav: 'services', up: ['svc'], here: { de: 'Individualsoftware', en: 'Custom software' } },
    'McCain Digital Tech Next.dc.html': { nav: 'services', up: ['svc', 'apps'], here: 'Next.js' },
    'McCain Digital Tech MCP.dc.html': { nav: 'services', up: ['svc', 'ai'], here: { de: 'MCP-Server', en: 'MCP servers' } },
    'McCain Digital Tech RAG.dc.html': { nav: 'services', up: ['svc', 'ai'], here: { de: 'RAG & Retrieval', en: 'RAG & retrieval' } },
    'McCain Digital Tech ERP.dc.html': { nav: 'services', up: ['svc', 'custom'], here: { de: 'ERP-Integration', en: 'ERP integration' } },
    'McCain Digital Vergleich WordPress.dc.html': { nav: 'resources', up: ['cmp'], here: { de: 'WordPress oder handgeschrieben', en: 'WordPress or hand-written' } },
    'McCain Digital Vergleich RAG.dc.html': { nav: 'resources', up: ['cmp'], here: { de: 'ChatGPT oder eigenes RAG', en: 'ChatGPT or your own RAG' } },
    'McCain Digital md-recall.dc.html': { nav: 'software', up: ['sw'], here: 'md-recall' },
    'McCain Digital md-cms.dc.html': { nav: 'software', up: ['sw'], here: 'md-cms' },
    'McCain Digital md-portal.dc.html': { nav: 'software', up: ['sw'], here: 'md-portal' },
    'McCain Digital Preise.dc.html': { nav: 'pricing', up: [], here: { de: 'Preise', en: 'Pricing' } },
    'McCain Digital Studio.dc.html': { nav: 'studio', up: [], here: 'Studio' },
    'McCain Digital Kontakt.dc.html': { nav: null, up: [], here: { de: 'Kontakt', en: 'Contact' } },
    'McCain Digital Recht.dc.html': { nav: null, up: [], here: { de: 'Rechtliches', en: 'Legal' } },
    'McCain Digital Styleguide.dc.html': { nav: 'resources', up: ['brand'], here: { de: 'Styleguide', en: 'Style guide' } },
    'McCain Digital Brand Guide v2.dc.html': { nav: 'resources', up: [], here: { de: 'Marke', en: 'Brand' } },
    'McCain Digital News.dc.html': { nav: 'resources', up: [], here: 'News' },
    'McCain Digital News md-recall.dc.html': { nav: 'resources', up: ['news'], here: 'md-recall' },
  };
  static CRUMB_UP = {
    svc: [{ de: 'Leistungen', en: 'Services' }, 'McCain Digital Uebersicht.dc.html'],
    ai: [{ de: 'KI & Automatisierung', en: 'AI & automation' }, 'McCain Digital KI.dc.html'],
    apps: [{ de: 'Web-Apps', en: 'Web apps' }, 'McCain Digital Web-Apps.dc.html'],
    custom: [{ de: 'Individualsoftware', en: 'Custom software' }, 'McCain Digital Software.dc.html'],
    cmp: [{ de: 'Vergleich', en: 'Comparison' }, 'McCain Digital Uebersicht.dc.html#vergleiche'],
    sw: ['Software', 'McCain Digital Studio.dc.html#produkte'],
    news: ['News', 'McCain Digital News.dc.html'],
    brand: [{ de: 'Marke', en: 'Brand' }, 'McCain Digital Brand Guide v2.dc.html'],
  };
  /* The "Software" menu. Status says what is true today: md-cms has login and
   * the sites overview, the editor is still being built. */
  static SOFTWARE = [
    { id: 'recall', title: 'md-recall', live: true, status: 'Live', menu: { de: 'KI-natives Projektgedächtnis für Software-Teams', en: 'AI-native project memory for software teams' } },
    { id: 'cms', icon: 'layers', title: 'md-cms', live: false, status: { de: 'Im Aufbau', en: 'Early build' }, menu: { de: 'Das CMS für die Websites, die wir bauen', en: 'The CMS for the websites we build' } },
    { id: 'portal', icon: 'layout', title: 'md-portal', live: true, status: 'Live', menu: { de: 'Ihr Kundenportal: Projekte, Aufgaben, Rechnungen', en: 'Your client portal: projects, tasks, invoices' } },
  ];
  static SOFTWARE_SOON = { title: '360', menu: { de: '360°-Panoramen hosten und einbetten', en: 'Host and embed 360° panoramas' } };
  static LOGIN = [
    { icon: 'layers', name: 'md-cms', href: 'https://cms.mccain-digital.com', domain: 'cms.mccain-digital.com', desc: { de: 'Ihre Websites im Überblick', en: 'Your websites at a glance' } },
    { icon: 'layout', name: 'md-portal', href: 'https://portal.mccain-digital.com', domain: 'portal.mccain-digital.com', desc: { de: 'Projekte, Aufgaben, Freigaben', en: 'Projects, tasks, approvals' } },
  ];
`;

const UPDATE_CRUMB = `  /* The breadcrumb pill (desktop, >= 1180 px): shown once the page's own
   * breadcrumb has scrolled under the header. The current section and the
   * progress line are written straight into the DOM, like updateProcess(), so
   * scrolling never re-renders the page; only crossing the threshold does. */
  updateCrumb() {
    const root = this.rootEl; if (!root) return;
    const pill = root.querySelector('[data-crumb]');
    if (!pill) { if (this.state.crumbShow) this.setState({ crumbShow: false }); return; }
    const own = Array.prototype.find.call(root.querySelectorAll('nav[aria-label]'), (n) => !n.closest('header'));
    const show = own ? own.getBoundingClientRect().bottom < 72 : window.scrollY > 480;
    if (show !== this.state.crumbShow) this.setState({ crumbShow: show });
    if (!show) return;
    let label = '';
    const hs = root.querySelectorAll('section h2');
    for (let i = 0; i < hs.length; i++) { if (hs[i].getBoundingClientRect().top > 160) break; const e = hs[i].previousElementSibling, s = e ? e.textContent.trim() : ''; label = s.length <= 40 ? s : ''; }
    const sec = pill.querySelector('[data-crumb-sec]');
    if (sec && sec.textContent !== label) { sec.textContent = label; sec.parentElement.style.display = label ? 'inline' : 'none'; }
    const bar = pill.querySelector('[data-crumb-bar]');
    if (bar) { const d = document.documentElement, max = Math.max(1, d.scrollHeight - window.innerHeight); bar.style.transform = 'scaleX(' + Math.min(1, window.scrollY / max).toFixed(4) + ')'; }
  }
`;

function patchScript(s, self) {
  /* The Brand Guide addresses the brand folder from the root, every other page relatively. */
  const pre = s.includes("src: '/brand/mccain-recall-logo-128.png'") ? "/brand/" : "brand/";
  s = once(s, "class Component extends DCLogic {\n", "class Component extends DCLogic {\n" + STATICS(self), "class");
  /* The new md-recall mark brings its own navy tile (rx 8 of 32), so the white tile and ring around the old PNG go. */
  s = once(s,
    `iconSm: c.id === 'recall' ? React.createElement('img', { src: '${pre}mccain-recall-logo-128.png', alt: '', width: 24, height: 24, style: { display: 'block', borderRadius: '6px' } })`,
    `iconSm: c.id === 'recall' ? React.createElement('img', { src: '${pre}md-recall-mark.svg', alt: '', width: 34, height: 34, style: { display: 'block' } })`, "cases iconSm");
  s = once(s,
    "tileBg: c.id === 'recall' ? 'var(--mc-white)' : c.tileBg, tileRing: c.id === 'recall' ? 'inset 0 0 0 1px color-mix(in srgb, var(--mc-navy) 12%, transparent)' : 'none',",
    "tileBg: c.id === 'recall' ? 'transparent' : c.tileBg, tileRing: 'none',", "cases tile");
  s = once(s,
    `{ icon: React.createElement('img', { src: '${pre}mccain-recall-logo-128.png', alt: '', width: 24, height: 24, style: { display: 'block', borderRadius: '6px' } }), iconBg: 'var(--mc-white)', iconRing: 'inset 0 0 0 1px color-mix(in srgb, var(--mc-navy) 12%, transparent)',`,
    `{ icon: React.createElement('img', { src: '${pre}md-recall-mark.svg', alt: '', width: 36, height: 36, style: { display: 'block' } }), iconBg: 'transparent', iconRing: 'none',`, "resItems recall");
  s = once(s,
    "static MENU_W = { services: 780, work: 540, studio: 560, process: 540, resources: 780, pricing: 480 };",
    "static MENU_W = { services: 780, work: 540, studio: 560, process: 540, resources: 780, software: 600, pricing: 480, login: 320 };",
    "MENU_W");
  s = once(s, "  static PAGES = { styleguide:", "  static PAGES = { cms: 'McCain Digital md-cms.dc.html', portal: 'McCain Digital md-portal.dc.html', styleguide:", "PAGES");
  s = once(s, "menu: { de: 'Menü', en: 'Menu' } },", "menu: { de: 'Menü', en: 'Menu' }, software: 'Software', login: { de: 'Kunden-Login', en: 'Client login' } },", "T.nav");
  s = once(s, "    footer: {\n      services: { de: 'Leistungen', en: 'Services' },",
    "    footer: {\n      software: 'Software', loginAt: { de: 'Login', en: 'Sign in:' },\n      services: { de: 'Leistungen', en: 'Services' },", "T.footer");
  s = once(s, "    menus: {\n",
    "    menus: {\n      here: { de: 'Sie sind hier', en: 'You are here' }, soon: { de: 'Bald', en: 'Soon' },\n      swFoot: { de: 'Eigene Software – gebaut und betrieben von uns.', en: 'Our own software — built and run by us.' }, swFootLink: { de: 'Wir sind unser erster Kunde', en: 'We are our first client' },\n      loginTitle: { de: 'Anmelden bei', en: 'Sign in to' }, loginNote: { de: 'Ein Konto für beides.', en: 'One account for both.' },\n", "T.menus");
  s = once(s, "    gauge: ['m12 14 4-4', 'M3.34 19a10 10 0 1 1 17.32 0']\n  };",
    "    gauge: ['m12 14 4-4', 'M3.34 19a10 10 0 1 1 17.32 0'],\n    user: ['M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2', 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z']\n  };", "ICONS");
  s = once(s, "    const isDesktop = S.vw >= 960;\n",
    "    const isDesktop = S.vw >= 960;\n    /* The full header needs 1180 px; below that the menu button takes over (it used to cut off \"Kontakt\" between 960 and 1180). */\n    const navFull = S.vw >= 1180, navWide = S.vw >= 1400;\n", "isDesktop");
  s = once(s, "const ids = ['services', 'work', 'studio', 'process', 'resources', 'pricing'];",
    "const ids = ['services', 'work', 'studio', 'process', 'resources', 'software', 'pricing'];", "ids");
  s = once(s,
    "const here = (typeof location !== 'undefined' ? decodeURIComponent(String(location.pathname).split('/').pop() || '') : '');\n",
    "const trail = Component.TRAIL[Component.SELF] || null;\n", "here");
  s = once(s,
    "const onSvc = /KI\\.dc|Web-Apps\\.dc|Websites\\.dc|Software\\.dc/.test(here), onStudio = /Studio\\.dc/.test(here);\n",
    "const crumbs = trail ? [{ label: S.lang === 'de' ? 'Start' : 'Home', href: 'McCain Digital v2.dc.html' }].concat(trail.up.map((k) => ({ label: this.loc(Component.CRUMB_UP[k][0]), href: Component.CRUMB_UP[k][1] }))) : [];\n", "onSvc");
  s = once(s,
    "const activeNav = onSvc ? 'services' : onStudio ? 'studio' : /Preise\\.dc/.test(here) ? 'pricing' : /md-recall\\.dc/.test(here) ? 'work' : null;",
    "const activeNav = trail ? trail.nav : null;", "activeNav");
  s = once(s, "fg: cur ? 'var(--acc-text)' : navFg,",
    "fg: navFg, cur, fw: cur ? '600' : '500', curBg: cur ? (onGradient ? 'color-mix(in srgb, var(--mc-white) 16%, transparent)' : 'var(--mc-action-tint)') : 'transparent',", "navItems fg");
  s = once(s, "pe: on ? 'auto' : 'none' }; });",
    "pe: on ? 'auto' : 'none' }; }); mv.login = { op: S.menu === 'login' ? 1 : 0, tf: S.menu === 'login' ? 'translateX(0)' : 'translateX(28px)', pe: S.menu === 'login' ? 'auto' : 'none' };", "mv");
  s = once(s,
    "current: (typeof location !== 'undefined' && decodeURIComponent(String(location.pathname)).indexOf(Component.PAGES[s.id]) >= 0), curBg: (typeof location !== 'undefined' && decodeURIComponent(String(location.pathname)).indexOf(Component.PAGES[s.id]) >= 0) ? 'var(--mc-surface)' : 'transparent',",
    "current: Component.PAGES[s.id] === Component.SELF ? 'page' : undefined, isHere: Component.PAGES[s.id] === Component.SELF, curBg: Component.PAGES[s.id] === Component.SELF ? 'var(--mc-action-tint)' : 'transparent',", "services current");
  s = once(s, "    const footerCols = [\n",
    "    const swItems = this.loc(Component.SOFTWARE).map((p) => { const here = Component.PAGES[p.id] === Component.SELF; return Object.assign(p, { href: Component.PAGES[p.id], current: here ? 'page' : undefined, isHere: here, curBg: here ? 'var(--mc-action-tint)' : 'transparent', statusFg: p.live ? 'var(--mc-green-ink)' : 'var(--mc-text-grey)', statusBg: p.live ? 'color-mix(in srgb, var(--mc-success-on-dark) 16%, transparent)' : 'color-mix(in srgb, var(--mc-navy) 6%, transparent)', mark: p.id === 'recall' ? React.createElement('img', { src: '" + pre + "md-recall-mark.svg', alt: '', width: 36, height: 36, style: { display: 'block' } }) : this.icon(p.icon, 18), tileBg: p.id === 'recall' ? 'transparent' : 'var(--mc-navy)' }); });\n" +
    "    const sw360 = Object.assign(this.loc(Component.SOFTWARE_SOON), { icon: this.icon('globe', 18) });\n" +
    "    const loginItems = this.loc(Component.LOGIN).map((l) => Object.assign(l, { icon: this.icon(l.icon, 16) }));\n" +
    "    const footerCols = [\n", "footerCols");
  s = once(s, "      { title: t.footer.studio, links:",
    "      { title: t.footer.software, links: swItems.map((p) => ({ label: p.title, href: p.href, target: '_self' })).concat(loginItems.map((l) => ({ label: t.footer.loginAt + ' ' + l.name, href: l.href, target: '_self' }))) },\n      { title: t.footer.studio, links:", "footer software column");
  s = once(s,
    "const footerActive = (() => { try { return decodeURIComponent((window.location.pathname.split('/').pop() || '')); } catch (e) { return ''; } })();",
    "const footerActive = Component.SELF;", "footerActive");
  s = once(s,
    "const h = decodeURIComponent(String(l.href || '')).split('#')[0]; const on = !!h && !!footerActive && h === footerActive;",
    "const h = String(l.href || ''); const on = h.indexOf('#') < 0 && h === footerActive;", "footer on");
  s = once(s, "l.dotOp = on ? '1' : '0'; }));",
    "l.dotOp = on ? '1' : '0'; l.on = on; l.bg = on ? 'color-mix(in srgb, var(--mc-white) 7%, transparent)' : 'transparent'; l.ml = on ? '-8px' : '0px'; l.padX = on ? '8px' : '0px'; }));", "footer style");
  s = once(s, "      { title: t.nav.pricing, links: [{ label: t.menus.configurator,",
    "      { title: t.nav.software, links: swItems.map((p) => ({ label: p.title, onClick: () => { window.location.href = p.href; } })) },\n      { title: t.nav.login, links: loginItems.map((l) => ({ label: l.name, onClick: () => { window.location.href = l.href; } })) },\n      { title: t.nav.pricing, links: [{ label: t.menus.configurator,", "mobile groups");
  s = once(s, "      showSearchLabel: S.vw >= 520,\n",
    "      showSearchLabel: navFull ? navWide : S.vw >= 520, navFull, navCompact: !navFull, navGap: navWide ? '4px' : '2px', navItemPad: navWide ? '8px 12px' : S.vw >= 1280 ? '8px 9px' : '8px 8px', navMl: navWide ? '8px' : '0px',\n" +
    "      swItems, sw360, loginItems, loginIcon: this.icon('user', 17), loginOpen: () => this.openMenu('login'), loginToggle: () => this.toggleMenu('login'), loginBg: S.menu === 'login' ? 'var(--mc-surface)' : 'var(--mc-white)',\n" +
    "      crumbOn: navFull && !!trail, crumbs, crumbHere: trail ? this.loc(trail.here) : '', crumbOp: S.crumbShow ? 1 : 0, crumbTf: S.crumbShow ? 'translateY(0)' : 'translateY(-6px)', crumbPe: S.crumbShow ? 'auto' : 'none',\n", "render values");
  s = once(s, "showLangInNav: !isDesktop || S.vw >= 1080,", "showLangInNav: !navFull || S.vw >= 1280,", "showLangInNav");
  s = once(s, "indOp: menuOpen ? 1 : 0,", "indOp: menuOpen && S.menu !== 'login' ? 1 : 0,", "indOp");
  s = once(s, "  state = { ", "  state = { crumbShow: false, ", "state");
  s = once(s, "this.updateProcess(); const bar = this.rootEl", "this.updateProcess(); this.updateCrumb(); const bar = this.rootEl", "onScroll");
  s = once(s, "  updateProcess() {", UPDATE_CRUMB + "  updateProcess() {", "updateProcess");
  return s;
}

/* The Lighthouse labels under the four score rings (#work, site mock) print
 * {{ l }} while each item is { k, d } (lhScores maps its strings to objects):
 * "[object Object]". prerender's EXPORT_FIXES corrected it in the build only,
 * so the raw artboard view kept showing it. Fixed at the source instead.
 * (The first run of this patch also turned the lhScores strings into objects
 * - wrong, since .map already does that; lh-revert.mjs undid it.) */
const LH_LABEL = '<div style="font-size:10px; color:var(--mc-text-grey); margin-top:6px; line-height:1.3">{{ l';
function patchBody(b) {
  return once(b, LH_LABEL + " }}</div>", LH_LABEL + ".k }}</div>", "lighthouse label");
}

function patchFile(file, self) {
  const t = fs.readFileSync(file, "utf8");
  const hs = t.indexOf('<header data-screen-label="Navigation"'), he = t.indexOf("</header>", hs);
  if (hs < 0 || he < 0 || t.indexOf('<header data-screen-label="Navigation"', hs + 1) >= 0) throw new Error("navigation header not found exactly once");
  const fs0 = t.indexOf("<footer data-screen-label=\"Footer\""), fe = t.indexOf("</footer>", fs0);
  const sc = t.indexOf('<script type="text/x-dc" data-dc-script');
  if (!(hs < he && he < fs0 && fs0 < fe && fe < sc)) throw new Error("unexpected block order");
  const mid = t.slice(he + "</header>".length, fs0);
  if (!mid.startsWith("\n")) throw new Error("no newline after </header>");
  const markup = patchBody(t.slice(0, hs) + patchHeader(t.slice(hs, he)) + "</header>\n" + CRUMB.trimStart() + mid.slice(1)
    + patchFooter(t.slice(fs0, fe)) + t.slice(fe, sc));
  return markup + patchScript(t.slice(sc), self);
}

if (argv.includes("--all")) {
  const files = fs.readdirSync(DIR).filter((f) => /^McCain Digital .*\.dc\.html$/.test(f) && !/ DEV\.dc\.html$/.test(f));
  const done = [];
  for (const f of files) {
    const t = fs.readFileSync(path.join(DIR, f), "utf8");
    if (!t.includes('<header data-screen-label="Navigation"')) continue;
    if (t.includes("static SELF = ")) throw new Error(f + ": already patched");
    const out = patchFile(path.join(DIR, f), f);
    fs.writeFileSync(path.join(DIR, f), out, "utf8");
    done.push(f);
  }
  console.log("patched", done.length, "artboards:\n  " + done.join("\n  "));
} else {
  const file = arg("--file"); if (!file) throw new Error("--file or --all");
  const self = arg("--self") || path.basename(file);
  const out = patchFile(path.isAbsolute(file) ? file : path.join(DIR, file), self);
  const dest = arg("--out");
  if (dest) { fs.writeFileSync(dest, out, "utf8"); console.log("wrote", dest); } else console.log("ok (dry run)", out.length);
}
