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

Every `index.html` under the root is build output. **Editing one by hand is
lost work** — change the export and run the build.

### Why there is a build at all

Each artboard is a client-rendered React component: every word of copy is a
`{{ }}` placeholder resolved at runtime from `content.json`. A crawler that does
not run JavaScript reads a few dozen words of decoration — no headline, no
title, no prose. Rendered, the 21 pages carry **33,498 words**. Meta tags alone
would have been cosmetic.

So the build renders each component in a real browser and ships **both copies**:

| in the page | what it is for |
|---|---|
| `<div id="dc-prerender">` | the settled markup — what a crawler reads and what paints first |
| `<x-dc></x-dc>` | the empty mount point `support.js` replaces with `#dc-root` |
| `<template id="dc-template">` | the component template, **inert**, handed to `support.js` by a shim |

A `MutationObserver` removes the prerendered copy once React has actually
rendered — and leaves it in place if React never arrives, so a visitor without
JavaScript keeps a readable page.

Two mistakes in that design each shipped a page that looked perfect and was
completely dead. Both are written up at the top of
[`tools/prerender.mjs`](tools/prerender.mjs). Read that file before changing the
build.

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
design rather than invented; `tools/prerender.mjs` says how.

Old URLs 301 to their new route: `/kontakt.html`, `/brand-guide.html`, the four
`/services/*.html` and the four `/legal/*.html`.

## Measured, not claimed

Numbers from this build, 12 September 2026, measured locally with production
headers:

|     |     |
| --- | --- |
| Pages | **21** |
| Third-party hosts | **0** — React and both typefaces are vendored |
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

Not a preference — **GDPR**. Loading a font or a script from a CDN sends the
visitor's IP address to that CDN's operator. LG München I, 3 O 17493/20
(20 January 2022) awarded damages for exactly that with Google Fonts, and the
reasoning applies to unpkg.com in the same way. So:

- React 18.3.1 UMD lives in [`vendor/`](vendor/) and is injected through
  `support.js`'s own `window.__resources` hook — no patching of third-party code,
  and the SRI hashes still match because the bytes are identical.
- Instrument Sans and JetBrains Mono live in [`fonts/`](fonts/), subset to
  `latin` and `latin-ext`, named after what they are rather than after Google's
  URL hash. (Two of them once differed only in capitalisation and silently
  overwrote each other on NTFS — see `tools/vendor_assets.py`.)

---

## The pixel engine

[`pixel-engine.js`](pixel-engine.js) exposes `window.PixelFX`: one 2-D canvas
physics core feeding the effects over headlines, buttons and tiles. It is
presentation only and `aria-hidden` — every word on the page is real,
selectable, crawlable DOM underneath. Touch devices and
`prefers-reduced-motion` get the effect-free page.

---

## Project structure

```text
index.html              GENERATED   the start page
leistungen/             GENERATED   overview + 4 services + 4 technology pages
vergleich/              GENERATED   the two comparison pages
md-recall/ preise/ studio/ kontakt/ rechtliches/ styleguide/   GENERATED
news/ news/md-recall/   GENERATED   index and first article
marke/                  GENERATED   brand guide and downloads
404.html                the ONLY hand-written page — it must work when the
                        runtime does not, so it depends on nothing

site.config.json        the noindex switch, read by the build and the gate
support.js              the Claude Design runtime (third party, minified only)
pixel-engine.js         the canvas pixel-physics engine
image-slot.js           the canvas image-slot component (10 empty slots on
                        /md-recall/ are waiting for screenshots)
content.json            every word of copy, de + en
vendor/                 React 18.3.1 UMD
fonts/ img/ team/ brand/
robots.txt · sitemap.xml · llms.txt · og-image.png      all GENERATED but robots
vercel.json             redirects, edge cache, security headers, X-Robots-Tag
.vercelignore           what must NOT be published — archive/, internal/, tools/

mccain-design-system/   the Claude Design export the site is BUILT FROM
tools/                  the builder and the gates

archive/old3/           the site the v4 import replaced (September 2026).
archive/site-apache/    the site that was live on Apache until the Vercel move.
                        SOURCE OF RECORD for the reviewed legal wording.
archive/site-v3/        the site the 2026 relaunch replaced.
archive/site-v3-tools/  the generators the v4 import made obsolete.
internal/               audit findings, design notes, the parked export zip.
HANDOFF.md              the working notes — start here, it opens with a
                        READ-THIS-FIRST block
```

Nothing under `archive/`, `internal/`, `tools/` or `mccain-design-system/` is
deployed. That is not a promise, it is a test: `tools/verify_site.mjs` asks the
live host for those paths and fails unless they are 404.

---

## Build and check

Order matters. The dev server has to be running, because the build renders the
component through it.

```bash
python prodserve.py 8898 --dev      # must be running
python tools/vendor_assets.py       # React + the typefaces into the repo
node  tools/prerender.mjs           # ALL 21 pages, sitemap.xml, llms.txt, og-image
node  tools/verify_site.mjs         # REQUIRED before every push
```

`prerender.mjs` is the whole build now. It renders each artboard through the dev
server, writes the page, copies the assets, and writes `sitemap.xml` and the
page index in `llms.txt` from the same route table — so those cannot drift from
what exists.

### v5, the static start page

`v5/` is built from the rendered root `index.html`, so it follows a
`prerender.mjs` run whenever the design export changed:

```bash
python prodserve.py 8898 --dev      # must be running
node tools/v5build.mjs              # writes v5/index.html and v5/logic.gen.js
```

The deferred sections (`data-cv`) carry a measured placeholder height per
viewport width (`tools/v5-heights.json`, keys from `tools/v5cv.mjs`). After any
change to copy or layout, measure again before building:

```bash
python prodserve.py 8897            # the built page with production headers
node tools/v5heights.mjs            # rewrites tools/v5-heights.json
node tools/v5build.mjs
```

`v5build.mjs` names every block it could not find in the file; the skill's
`cv-audit.mjs` reports a page-height drift above 24 px when the numbers have
gone stale. `v5/home.js` is the only hand-written file in `v5/`.

### The gates

|     |     |
| --- | --- |
| `verify_site.mjs` | **clicks.** All 21 pages: hydration, the inert template, the mega menu, a modal, the pixel engine, the console, `noindex`, that every route is reachable from `/`, that the forms are wired, and what must stay 404. Takes a URL to run against production. |
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
