# McCain Digital — mccain-digital.com

> We build digital products.

The marketing site for **McCain Digital**, a digital product studio in Bavaria,
Germany (AI tools, web apps, websites and custom software).

🔗 **Deployment:** [mccain-digital.vercel.app](https://mccain-digital.vercel.app)

> **`mccain-digital.com` does not serve this repository yet.** Measured
> 18.9.2026: the domain's DNS is at Vercel (`ns1/ns2.vercel-dns.com`), the apex
> answers 404 from Vercel because no project is assigned to it, and this Vercel
> project still carries only its own `*.vercel.app` domains. Google sees that
> 404 now. `node tools/domain_check.mjs` compares the two and fails while they
> differ.
>
> Switching the domain is an owner decision and is **not** just a DNS change:
> this build is `noindex`, and pointing an indexed domain at a noindex site asks
> Google to remove it. Turn `noindex` off first, rebuild, verify, then move DNS.

> **The site is `noindex` right now, deliberately.** Owner's call on 12.9.2026:
> the copy still has to be revised and md-recall finished before this is
> indexed. The switch is `site.config.json`; flipping it is the go-live gesture,
> and `tools/verify_site.mjs` fails if the build, the meta tags and the
> `X-Robots-Tag` header disagree about it.

---

## What this repository is

**The repository root *is* the deployed site.** `git push` is the deploy. But
the root is **generated**: all 21 pages are built out of the Claude Design
export in [`mccain-design-system/`](mccain-design-system/), which is never
itself served.

Every `index.html`, `logic.gen.js` and `index.md` under the root is build
output. **Editing one by hand is lost work** — change the export and run the
build.

### Why there is a build at all

Each artboard is a client-rendered React component: every word of copy is a
`{{ }}` placeholder resolved at runtime from `content.json`. A crawler that does
not run JavaScript reads a few dozen words of decoration — no headline, no
title, no prose. Rendered, the 21 pages carry **33,498 words**. Meta tags alone
would have been cosmetic.

So the build renders each component — at build time, not in the visitor's
browser — and ships the result as plain HTML with a small hand-written binder
instead of React. A shipped page carries:

| in the page | what it is for |
|---|---|
| `<div id="dc-root">` | the finished markup the build wrote — what a crawler reads and what paints first, there is nothing behind it to render |
| `<template id="dc-template">` | the component template, **inert**, the binder's own source for what to do when state changes |
| `<script type="application/json" id="v5-data">` | route, props, and which template nodes carry hover/focus styles |
| `<script src="<route>logic.gen.js" defer>` | the page's own component class, minified from the export at build time |
| `<script src="/runtime.js" defer>` | the binder: `tools/runtime.js`, hand-written and shipped minified — the one file all 21 pages share |

There is no `<x-dc>`, no `MutationObserver`, no hydration and no second copy of
the page. The runtime never rebuilds the tree; it binds the template to the
delivered DOM once and, from then on, writes only what a state change actually
altered. Read the header comments of
[`tools/prerender.mjs`](tools/prerender.mjs) and
[`tools/v5build.mjs`](tools/v5build.mjs) before changing the build — they carry
the history of what this used to be (a scrape, then a React hydration step)
and why each of those was replaced.

### What the build fixes in the export

The export is a design deliverable, not a website, and the difference is not
cosmetic. `tools/prerender.mjs` documents each of these where it makes them:

- **the contact forms send nothing.** All 21 pages ship
  `this.setState({ formSent: true })` with no request. Wired to Web3Forms, and
  the patch **asserts its own count per page** so a redesigned handler fails the
  build rather than quietly going back to lying.
- **three pages carry the legal page's `<helmet>`**, canonical included. The
  route decides the canonical; the descriptions come from each page's own hero.
- **60 nav links resolve to nothing** off the start page (`#work`, `#process`,
  `#faq`, `#stack`). Rewritten per page, only where the page cannot resolve them.
- **asset paths are relative**, so anything a folder deep 404s.
- **nine brand-guide icons** hand an array to a single `<path d>`.
- **boolean attributes without a value are dropped** by the export's own
  template compiler (`required`, `download`) — every form validated nothing
  until 17.9.2026. `valueBooleans()` gives them their name as value before
  support.js sees the template (52 on the 21 pages).
- **static text has one language.** Bound text follows the DE/EN switch
  through the binder (a skipped `content-visibility` block catches up when it
  comes into view); plain markup text — the brand guide, the workshop band —
  carries both as `<span data-lang="de">…</span><span data-lang="en">…</span>`
  and `LANG_CSS` shows the one `html[lang]` names. `tools/markdown.mjs` leaves
  the English half out of the twin. Touch targets are opt-in: `[data-touch]`
  grows to 44 px on coarse pointers only (the DE/EN switch on every page, the
  toggles on `/leistungen/websites/`).
- **React and both typefaces load from CDNs** — see below, that one is legal.

## The 21 pages

| route | artboard |
|---|---|
| `/` | McCain Digital v2 |
| `/leistungen/` | Uebersicht |
| `/leistungen/ki-automatisierung/` · `web-apps/` · `websites/` · `individualsoftware/` | the four services |
| `/leistungen/nextjs-entwicklung/` · `mcp-server-entwickeln/` · `rag-beratung/` · `erp-integration/` | the four technology pages |
| `/vergleich/wordpress-oder-handgeschrieben/` · `chatgpt-oder-eigenes-rag/` | the two comparisons |
| `/md-recall/` | the product page |
| `/preise/` · `/studio/` · `/kontakt/` · `/rechtliches/` · `/styleguide/` | |
| `/news/` · `/news/md-recall/` | index and first article |
| `/marke/` | brand guide and downloads |

Eighteen of those routes come from the export's own `sitemap.xml`. Three —
`/news/`, `/news/md-recall/`, `/marke/` — are not in it and were read off the
design rather than invented; `tools/pages.mjs` (the route table both builds
read) says how.

Old URLs 301 to their new route: `/kontakt.html`, `/brand-guide.html`, the four
`/services/*.html` and the four `/legal/*.html`.

## Measured, not claimed

Numbers from this build, 12 September 2026, measured locally with production
headers:

|     |     |
| --- | --- |
| Pages | **21** |
| Third-party hosts | **0** — nothing loads from a CDN |
| Console errors / warnings | **0** on every page |
| Failed requests | **0** on every page |
| Words of rendered text | **33,498** across the 21 pages |
| Horizontal overflow | none at 390 / 768 / 1024 / 1440 |
| Broken links, missing anchors, duplicate ids | none |
| Contact forms that actually post | 22 of 22 |

Lighthouse 13.4.1 with PageSpeed's own settings (simulated throttling, mobile
CPU ×1.2), run locally against the production headers on 17 September 2026,
release build:

| page | performance | FCP | LCP | TBT | CLS |
| --- | ---: | ---: | ---: | ---: | ---: |
| `/` mobile | **99** | 0.9 s | 2.1 s | 9 ms | 0 |
| `/kontakt/` mobile | **99** | 0.8 s | 2.3 s | 0 ms | 0 |
| `/` desktop | **100** | 0.26 s | 0.48 s | 0 ms | 0 |

The owner's PageSpeed Insights run on the previous build (16.9.2026, Moto G
Power) scored 100 / LCP 1.6 s; a PSI run on this build is the next step
(`HANDOFF.md`). The "4×100" figure in the page's own background text is a
number from the previous site and is an open item of the text pass.

### Why React and the fonts are in the repository

Not a preference — **GDPR**, and it still applies to the half of this that
visitors actually receive. Loading a font or a script from a CDN sends the
visitor's IP address to that CDN's operator. LG München I, 3 O 17493/20
(20 January 2022) awarded damages for exactly that with Google Fonts, and the
reasoning applied to unpkg.com in the same way while the export still loaded
React from there.

- **Instrument Sans and JetBrains Mono** live in [`fonts/`](fonts/), subset to
  `latin` and `latin-ext`, named after what they are rather than after Google's
  URL hash, and are shipped to every visitor. (Two of them once differed only
  in capitalisation and silently overwrote each other on NTFS — see
  `tools/vendor_assets.py`.)
- **React is no longer shipped at all.** Since the switch to plain HTML, it is
  a build tool: the three UMD builds live in
  [`tools/vendor-build/`](tools/vendor-build/) (see its own README) and are
  copied into `_dcbuild/` while `tools/prerender.mjs` and `tools/v5build.mjs`
  run. Nothing under `_dcbuild/` is deployed — it is gitignored and in
  `.vercelignore` — and the root no longer has a `support.js` or a `vendor/`
  to serve in the first place.

---

## The pixel engine

[`pixel-engine.js`](pixel-engine.js) exposes `window.PixelFX`: one 2-D canvas
physics core feeding the effects over headlines, buttons and tiles. It is
presentation only and `aria-hidden` — every word on the page is real,
selectable, crawlable DOM underneath.

It is also 42 KB the binder does not load until somebody can use it: `armPixels`
in [`tools/runtime.js`](tools/runtime.js) (shipped minified as `/runtime.js`)
requests `pixel-engine.js` on the first real mouse or pen movement, or
automatically ten seconds after load on a device that has a mouse at all —
never on a touch device and never with `prefers-reduced-motion`.

---

## Project structure

Every route is three GENERATED files, not one: `index.html` (the markup and its
inline `<style>`), `logic.gen.js` (the page's component class), `index.md` (the
Markdown twin). All three come out of the same build run and are never edited
by hand.

```text
index.html logic.gen.js index.md        GENERATED   the start page
leistungen/…                            GENERATED   overview + 4 services + 4 technology pages, each the same 3 files
vergleich/…                             GENERATED   the two comparison pages
md-recall/ preise/ studio/ kontakt/ rechtliches/ styleguide/   GENERATED
news/ news/md-recall/                   GENERATED   index and first article
marke/                                  GENERATED   brand guide and downloads
404.html                the ONLY hand-written page — it must work when the
                        runtime does not, so it depends on nothing

werkstatt/              HAND-WRITTEN   the workshop (Dev-Modus, shown to visitors
                        as „Tools“ since 17.9.2026), loaded as
                        /werkstatt/index.js; runtime.src.js and
                        motion-budget.src.js beside it are GENERATED copies of
                        tools/runtime.js and tools/motion-budget.js for its
                        own Code tab, not additional sources

site.config.json        the noindex switch, read by the build and the gate
runtime.js              GENERATED   the binder every one of the 21 pages loads,
                        minified from the hand-written tools/runtime.js
motion-budget.js        GENERATED   how much motion this visit gets, per page
pixel-engine.js         the canvas pixel-physics engine, loaded lazily by the binder
image-slot.js           the canvas image-slot component (10 empty slots on
                        /md-recall/ are waiting for screenshots)
content.json            every word of copy, de + en
fonts/ img/ team/ brand/
robots.txt · sitemap.xml · llms.txt · og-image.png      all GENERATED but robots
vercel.json             redirects, edge cache, security headers, CSP hashes, X-Robots-Tag —
                        the CSP and the page list are rewritten by the build
.vercelignore           what must NOT be published — archive/, internal/, tools/, _dcbuild/

mccain-design-system/   the Claude Design export the site is BUILT FROM
tools/                  the two-stage builder, the gates, the vendored React
                        build tool (tools/vendor-build/), and the two
                        hand-written sources it builds from: tools/runtime.js
                        (the binder) and tools/motion-budget.js (see
                        werkstatt/ above)
_dcbuild/               build scratch — React's first render of every page and
                        the React/font files the build needs offline. Gitignored
                        and in .vercelignore, never deployed, safe to delete

archive/old3/           the site the v4 import replaced (September 2026).
archive/site-apache/    the site that was live on Apache until the Vercel move.
                        SOURCE OF RECORD for the reviewed legal wording.
archive/site-v3/        the site the 2026 relaunch replaced.
archive/site-react/     the React edition of the v4 design, live 12.–17.9.2026
                        until the v5 build replaced it (its last commit, 7612481).
archive/site-v3-tools/  the generators the v4 import made obsolete.
internal/               audit findings, design notes, the parked export zip.
HANDOFF.md              the working notes — start here, it opens with a
                        READ-THIS-FIRST block
```

Nothing under `archive/`, `internal/`, `tools/`, `mccain-design-system/` or
`_dcbuild/` is deployed. For the first four that is not a promise, it is a
test: `tools/verify_site.mjs` asks the live host for representative paths under
each and fails unless they answer 404.

---

## Build and check

Order matters, and it is two build stages now, not one. The dev server has to
be running for the first stage, because it renders each component through it.

```bash
python prodserve.py 8898 --dev      # must be running
python tools/vendor_assets.py       # React + the typefaces into the repo
node  tools/prerender.mjs           # stage 1: every artboard, into _dcbuild/react/
node  tools/v5build.mjs             # stage 2: every page to the site root, then sitemap.xml, llms.txt, the CSP
node  tools/verify_site.mjs         # REQUIRED before every push
```

(The tool names — `v5build.mjs`, `v5probe.mjs`, `v5heights.mjs`, `v5cv.mjs`,
`tools/v5-heights.json` — still say `v5`. Nothing lives under a `v5/` path any
more; `v5` is the name of this build generation, not a path.)

**Stage 1, `tools/prerender.mjs`:** renders each artboard with
`react-dom/server` in a staging document — patched exactly as a browser would
patch it — and writes the result to `_dcbuild/react/<route>/index.html`, a
build intermediate: gitignored, in `.vercelignore`, never deployed. It also
copies assets, derives the images, and builds `og-image.png` and
`motion-budget.js`. It always builds all 21 routes; there is no `--route` flag
at this stage.

**Stage 2, `tools/v5build.mjs`:** reads those React renders and turns them into
the pages that ship. Each component is rendered again, at eight widths, and the
renders are merged node by node into one markup with media queries; the
component's own class ships minified as `<route>logic.gen.js` (esbuild, target
`esnext`, no syntax lowering, a one-line banner comment), with a readable
`<route>logic.src.js` beside it — the same code unminified, loaded only by the
workshop's Code tab, never by the page; the export's template ships inert in
the page; and
[`tools/runtime.js`](tools/runtime.js) — one hand-written binder, shipped
minified the same way as `/runtime.js` and shared by all 21 pages — binds
template and delivered DOM and writes only what a state change alters (~1-2 ms
per change instead of a 64-84 ms React re-render). Everything the export can do
still works: mega menu, search (Cmd/Ctrl+K), DE/EN, forms, FAQ, consent, mobile
menu, the pages' own widgets.

Only a full run — no `--route` — writes `sitemap.xml`, `llms.txt` and the CSP
hashes in `vercel.json`, all derived from what the run actually built, so they
cannot drift from the pages:

```bash
node tools/v5build.mjs                                        # every route
node tools/v5build.mjs --route /preise/ --route /kontakt/      # only these — sitemap/llms/CSP are left as they are
```

`llms.txt` links each page's Markdown twin (`<route>index.md`) and names the
HTML page next to it. The CSP carries no `'unsafe-eval'`: `support.js` used to
compile the component with `new Function`, the binder does not, and nothing
that ships (`runtime.js`, `logic.gen.js`, `pixel-engine.js`, `image-slot.js`,
`motion-budget.js`, `werkstatt/`) evaluates code — the only inline script left
is the contact-form sender, and its hash is what `v5build.mjs` writes into
`script-src`.

The deferred sections (`data-cv`) carry a measured placeholder height per
viewport width and per page (`tools/v5-heights.json`, keys from
`tools/v5cv.mjs`). After any change to copy or layout, measure again before
building, on an otherwise idle machine:

```bash
python prodserve.py 8897            # the built pages with production headers
node tools/v5heights.mjs            # all built routes; --route /x/ for one
node tools/v5build.mjs
```

`v5build.mjs` names every block it could not find in the file; the skill's
`cv-audit.mjs` reports a page-height drift above 24 px when the numbers have
gone stale. `tools/runtime.js` and `tools/motion-budget.js` are hand-written;
everything `v5build.mjs` derives from them and from the export — `runtime.js`
and `motion-budget.js` at the root, every `logic.gen.js` and `logic.src.js`,
and `werkstatt/runtime.src.js` / `werkstatt/motion-budget.src.js` — is
generated. Everything else under `werkstatt/` is hand-written.

Every page also gets its Markdown twin (`<route>index.md`), the page as
Markdown for crawlers and language models (converter in `tools/markdown.mjs`,
announced with `<link rel="alternate" type="text/markdown">`, served as
`text/markdown` by `vercel.json` and `prodserve.py`).

Checks, all against the running servers:

```bash
node tools/v5probe.mjs --all        # every page: no console errors, nothing written at start, menu, search, EN/DE, FAQ, form (intercepted), consent, mobile menu
node tools/markdown-check.mjs --all # every twin: served as text/markdown, words and headings
node tools/v5dev-check.mjs --route /kontakt/   # the workshop on one page
```

#### The workshop (Dev-Modus)

`werkstatt/` is the page shown from the inside: a console loaded as `<script
type="module" src="/werkstatt/index.js">` by `loadDev` in
[`tools/runtime.js`](tools/runtime.js), never before it opens. It docks three
ways: as a free-floating window by default on a desktop (`data-dock="float"`,
`?tools=fenster`, 760×520px starting bottom-right with a 24px margin,
dragged by its header or lead line, clamped to the viewport), bottom (full
width, starting at 42% of the window height, 55% on a phone, where it is the
only mode), or right (a 480px column) —
buttons in the header (`data-dock-to`) switch between the three, except below
960px where it is always bottom-docked with no switcher. A drag handle
resizes bottom/right docking: `.wk-grip` (`role="separator"`), pointer drag, a
second press within 400ms snaps to full size and back, arrow keys/Home/End
move it (Shift = 120px), bounds are 220px up to the full window height
(bottom) or 360px up to window width minus 80 (right). The floating window
instead resizes from three handles (`.wk-rs`: right edge, bottom edge,
corner; 360×240px at minimum, the window minus an 8px margin at most) and
moves by its header; its keyboard control sits on the title (`tabindex="0"`
in float mode): arrows move it 24px, Shift+arrows resize it, Home resets it,
Enter snaps to full size and back — the footer's key row swaps to match
(`T.keysFloat`). Shape and docking live in module memory for the session
only — nothing goes to `localStorage`, because the workshop promises to
store nothing. `scroll-padding-bottom` / `-right` on `<html>` keeps "Auf der
Seite zeigen" from landing behind the open console while docked bottom or
right (not applied floating), removed again on close. `?tools=rechts`
starts docked right, `?tools=fenster` starts floating; `?tools=fragen`
/ `=google` opens straight on that view (`?werkstatt=` is still accepted).

Three views: **Röntgen** — the DOM tree, the element's HTML, its template
bindings and the CSS rules that apply, the readable code (the route's own
`logic.src.js` next to its minified `logic.gen.js`, plus
`werkstatt/runtime.src.js` and `werkstatt/motion-budget.src.js`, with jumps
from element to function via `map.json`, hand-maintained), the numbers of the
visit (LCP, layout shifts, long tasks, waterfall, frame rate, skipped blocks,
device), and knobs; **Google & KI**, how crawlers and language models read
the page; and **Fragen**, questions answered from the visit's own facts
(below). The header is one line — brand, the three views, a "Wählen" tab,
tools, × — with a lead sentence per tab underneath (`.wk-lead`) and a status
line in the footer (`.wk-status`: the last action, or a button's `data-hint`
on hover/focus), above the key row and "Alles zurücksetzen". Layout responds
to the console's own width through a container query (`container: wk / size`
on `#v5-dev`): cards flow into two columns from 880px, three from 1360px; the
Code tab gets a file-list sidebar and a full-width viewer sized to the
console's own height (`cqh`), with a wrap toggle (`data-wrap`) that defaults
to on in a narrow console.

Native ES modules, no build step; texts live in `texte.js`. Explanations are
a system, not one-offs (`werkstatt/ui.js`, `werkstatt/texte.js`): every "Warum
das gut ist" always shows its first sentence, the rest folds under "mehr"; a
25-term glossary (LCP, FCP, TTFB, CLS, TBT, main thread, `content-visibility`,
CSP, canonical, JSON-LD, rich results, WCAG, DOM, crawler, screen reader,
language model, token, template, binder, re-render, specificity, landmarks,
Markdown, cache, Brotli) is reachable by clicking the first occurrence of any
of those words anywhere in the workshop's own text (`rich()`, a dotted
underline marks it); a three-step tour runs on the empty Element tab; every
button carries a hint shown in the status line. All texts are provisional
until the copy pass.

**Fragen** sends Claude the visit's own facts — the page's header data, this
visit's measurements (TTFB, FCP, LCP, CLS, long tasks, transfer, DOM node
count), the selected element (path, HTML up to 500 characters, matching CSS
rules, template, map hit), the crawler numbers, the Markdown twin (up to 8000
characters) and the glossary — a card "Was Claude sieht" shows exactly that
payload. Suggested-question chips, a history kept only for the open tab (the
last 6 turns travel with each question), "Verlauf leeren". The endpoint is
[`api/ask.mjs`](api/ask.mjs), a dependency-free Vercel Node function at `/api/ask/` (the site's `trailingSlash: true` sends `/api/ask` there with a 308): POST,
same-origin only, body capped at 48KB, the question at 600 characters, the
history at 6 turns, 8 questions per minute per IP plus a daily cap (400 by
default) per warm instance as a brake rather than a durable limit, then the
Anthropic Messages API (`max_tokens` 450, model from `ASK_MODEL`, default
`claude-sonnet-5`, 25s timeout). Nothing is logged or stored. Without a key
the endpoint answers 503 and the workshop falls back to answering from the
same facts itself, labelled "ohne Claude" / sender "Tools" — the same
path a fully offline dev server takes. The console speaks the page's
language: `werkstatt/texte.en.js` mirrors `texte.js` key for key, `T` picks
by `html[lang]` on every access, and an open console rebuilds itself on the
switch; the endpoint answers in the language the client reports
(`facts.page.lang`). **Owner action required:** set
`ANTHROPIC_API_KEY` in the Vercel project's Production environment variables
(optionally `ASK_MODEL`, `ASK_DAILY_MAX`); until then the live site answers
503 and only the offline fallback runs.

Nothing of the console exists before the visitor's first click, key, wheel or
touch. A vertical flap at the left edge, centred, appears seven seconds after
that (`showDevSwitch`/`armDevMode` in `tools/runtime.js`, class
`.v5-dev-switch`, attribute `data-v5-dev-switch`, 38px wide on touch, z-index
70); `?tools` opens it at once, and so does the band after "Arbeiten" on
the start page (`data-v5-dev-open`). The flap is not a toggle while the
console is open — it hides itself
(`.v5-dev-switch[aria-expanded="true"] { display: none }`) so it can never sit
over the chat dock, which keeps the bottom-right corner to itself; closing
goes through the × in the header or Escape, and the flap reappears and takes
focus. The rule is checked, not trusted:

```bash
python prodserve.py 8897            # or 8898 --dev
node tools/v5dev-check.mjs          # being extended for the console, the
                                     # resize handle, docking, Fragen and the
                                     # glossary
```

Gates: `tools/verify_site.mjs` passes locally ("all checks passed");
`tools/weigh.mjs` measures `runtime.js` at 25.6 KB raw / 8.8 KB Brotli.

### The gates

|     |     |
| --- | --- |
| `verify_site.mjs` | **clicks.** Drives a real browser through every page: `#dc-root` filled in the server's own response, the inert template, the binder booted (`window.__v5`, the `v5:mount` mark, every template node adopted), no React and no request to `/support.js`, `/vendor/` or `/_dcbuild/`, the CSP without `'unsafe-eval'`, the pixel engine only after a real mouse move, the console, `noindex`, the Markdown twin next to every page, the mega menu, the search and a dialog on `/`, both contact forms against an intercepted Web3Forms, that every route is reachable from `/`, and what must stay 404. Takes a URL to run against production. |
| `console_audit.mjs` | every console message, grouped by shape |
| `requests_audit.mjs` | every request, counted — a duplicate is the finding |
| `weigh.mjs` | what the shipped bytes actually consist of |
| `responsive_audit.mjs` | horizontal overflow at 390 / 768 / 1024 / 1440, and the element that causes it |
| `form_probe.mjs` | fills the forms on `/` and `/kontakt/`, submits, and asserts a POST left the browser **and** that success is never claimed without one. `MCD_HEADED=1` to get past the bot filter and prove delivery end to end. |
| `domain_check.mjs` | whether the canonical domain actually serves this build — it does not |
| `check_links.py` | internal links, anchors and duplicate ids on deployed pages |

`verify_site.mjs` exists because a load check does not prove a page works. The
relaunch went live with 200s, loaded images, correct meta tags and 1,886 words of
text — and every button dead. Nothing that was measured had asked whether
anything *does* something.

`form_probe.mjs` exists for the same reason one level down: the v3 site and then
the v4 export both shipped a contact form that said "Ihre Nachricht ist da" and
posted nothing. Only asking the network can see that.

---

## Run locally

No install. Use the server in the repository rather than
`python -m http.server`, which sends no compression or cache headers and
measures roughly 4× worse for the same files:

```bash
python prodserve.py 8898 --dev   # to look at:  Cache-Control: no-store
python prodserve.py 8898         # to measure:  brotli + production headers
```

---

## Deploy

Vercel, from the repository root, on push to `main`. Headers come from
`vercel.json`. There is no build step on Vercel — the generated files are
committed, so what is in the repository is exactly what is served.

---

## License

© McCain Digital. All rights reserved. The brand assets under `brand/` and the
copy are not licensed for reuse.
