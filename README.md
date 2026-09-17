# McCain Digital — mccain-digital.com

> We build digital products.

The marketing site for **McCain Digital**, a digital product studio in Bavaria,
Germany (AI tools, web apps, websites and custom software).

🔗 **Deployment:** [mccain-digital.vercel.app](https://mccain-digital.vercel.app)

> **`mccain-digital.com` does not serve this repository.** Measured 11.9.2026:
> the domain still points at SiteGround's nginx and serves the English v2 site
> from June, indexable, with the contact and service pages 404. The Vercel
> project carries only its own `*.vercel.app` domains. `node
> tools/domain_check.mjs` compares the two and fails while they differ.
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
| `<script src="<route>logic.gen.js" defer>` | the page's own component class, copied whole from the export |
| `<script src="/v5/runtime.js" defer>` | the binder: the one hand-written file all 21 pages share |

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

A Lighthouse / PageSpeed score for **this** build has not been taken yet. The
"4×100" figure that appears in the page's own background text is a number from
the previous site and is an open item in `HANDOFF.md`.

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
in [`v5/runtime.js`](v5/runtime.js) requests `pixel-engine.js` on the first real
mouse or pen movement, or automatically ten seconds after load on a device that
has a mouse at all — never on a touch device and never with
`prefers-reduced-motion`.

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

v5/runtime.js           HAND-WRITTEN   the binder every one of the 21 pages loads
v5/dev/                 HAND-WRITTEN   the workshop (Dev-Modus), see below

site.config.json        the noindex switch, read by the build and the gate
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
tools/                  the two-stage builder, the vendored React build tool
                        (tools/vendor-build/), and the gates
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

(The tool names still say `v5` and the runtime lives under `v5/` — that is the
working name this build carried while it shipped from `/v5/` as a preview next
to the React site. The prefix is gone, the names are not.)

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
component's own class ships whole as `<route>logic.gen.js`; the export's
template ships inert in the page; and
[`v5/runtime.js`](v5/runtime.js) — one hand-written binder shared by all 21
pages — binds template and delivered DOM and writes only what a state change
alters (~1-2 ms per change instead of a 64-84 ms React re-render). Everything
the export can do still works: mega menu, search (Cmd/Ctrl+K), DE/EN, forms,
FAQ, consent, mobile menu, the pages' own widgets.

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
`motion-budget.js`, `v5/dev/`) evaluates code — the only inline script left is
the contact-form sender, and its hash is what `v5build.mjs` writes into
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
gone stale. Hand-written under `v5/`: `runtime.js` and the workshop in
`v5/dev/` — nothing else in that folder is generated.

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

`v5/dev/` is the page shown from the inside, on every page: DOM tree, the
element's HTML, its template bindings and the CSS rules that apply, the source
files with jumps from element to function (`map.json`, hand-maintained), the
numbers of the visit (LCP, layout shifts, long tasks, waterfall, frame rate,
skipped blocks, device), knobs, and how Google and language models read the
page. Native ES modules, no build step; texts live in `texte.js`. Nothing of
it exists before the visitor's first click, key, wheel or touch, and the switch
appears ten seconds after that (`armDevMode` in `runtime.js`); `?werkstatt`
opens it at once. The rule is checked, not trusted:

```bash
python prodserve.py 8897            # or 8898 --dev
node tools/v5dev-check.mjs          # five phases, screenshots in $TMPDIR/v5dev-check
```

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
