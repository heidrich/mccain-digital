# McCain Digital — mccain-digital.com

> We build digital products.

The marketing site for **McCain Digital**, a digital product studio in Bavaria,
Germany (AI tools, web apps, websites and custom software).

🔗 **Live:** [mccain-digital.com](https://mccain-digital.com)

> **The site is `noindex` right now.** The 2026 relaunch is not finished —
> subpages are still being built and two owner decisions are open (see
> `HANDOFF.md`). The switch is `site.config.json`; flipping it is the go-live
> gesture, and `tools/verify_site.mjs` fails if the generators, the meta tags and
> the `X-Robots-Tag` header disagree about it.

---

## What this repository is

**The repository root *is* the deployed site.** `git push` is the deploy. But
unlike the version this replaced, the root is now **generated**: the start page
and the brand guide are built out of a Claude Design component export that lives
in [`mccain-design-system/`](mccain-design-system/) and is never itself served.

`index.html` and `brand-guide.html` are build output. **Editing them by hand is
lost work** — change the export and run the build.

### Why there is a build at all

The export is a client-rendered React component: every word of copy is a
`{{ }}` placeholder resolved at runtime from `content.json`. Measured on the
untouched export, a crawler that does not run JavaScript reads **145 words** of
decoration — no headline, no title, no prose. Rendered, the same page carries
**1,896**. Meta tags alone would have been cosmetic.

So the build renders the component in a real browser and ships **both copies**:

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
[`tools/prerender.mjs`](tools/prerender.mjs) and in `HANDOFF.md`. Read that file
before changing the build.

---

## Measured, not claimed

Numbers from the deployed site, 11 September 2026:

|     |     |
| --- | --- |
| Third-party hosts | **0** — React and both typefaces are vendored |
| Console errors / warnings | **0** on every page |
| Requests, start page | ~30, all same-origin |
| `index.html` | 661 KB raw, **66 KB brotli** |
| Words of real text for a crawler | 1,896 |
| Structured data | `ProfessionalService`, `WebSite`, `FAQPage` (7 questions) |

A Lighthouse / PageSpeed score for **this** build has not been taken yet. The
four-times-100 figure that appears on the page itself is a number from the
previous site and is one of the open items in `HANDOFF.md`.

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
brand-guide.html        GENERATED   the brand and download page
legal/                  GENERATED   imprint, privacy, terms, withdrawal
404.html
site.config.json        the noindex switch, read by every generator
support.js              the Claude Design runtime (third party, unmodified)
pixel-engine.js         the canvas pixel-physics engine
content.json            every word of copy, de + en
vendor/                 React 18.3.1 UMD
fonts/ img/ team/ brand/ assets
robots.txt · sitemap.xml · llms.txt · og-image.png
vercel.json             edge cache, security headers, X-Robots-Tag
.vercelignore           what must NOT be published — archive/, internal/, tools/

mccain-design-system/   the Claude Design export the site is BUILT FROM
tools/                  generators and gates
api/ask.js              the only server-side function

archive/site-apache/    the site that was live on Apache until the Vercel move.
                        SOURCE OF RECORD for the reviewed legal wording and for
                        the old contact page.
archive/site-v3/        the site the 2026 relaunch replaced.
internal/               audit findings, design notes, parked experiments,
                        screen recordings and source material.
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
node  tools/prerender.mjs           # index.html, brand-guide.html, og-image.png
python tools/build_legal.py         # the four legal pages
python tools/build_sitemap.py       # last: it checks itself against the disk
node  tools/verify_site.mjs         # REQUIRED before every push
```

### The gates

|     |     |
| --- | --- |
| `verify_site.mjs` | **clicks.** Hydration, the mega menu, a modal, the pixel engine, the console, `noindex`, and what must stay 404. Takes a URL to run against production. |
| `console_audit.mjs` | every console message, grouped by shape |
| `requests_audit.mjs` | every request, counted — a duplicate is the finding |
| `weigh.mjs` | what the shipped bytes actually consist of |
| `check_links.py` | internal links, anchors and duplicate ids on deployed pages |

`verify_site.mjs` exists because a load check does not prove a page works. The
relaunch went live with 200s, loaded images, correct meta tags and 1,886 words of
text — and every button dead. Nothing that was measured had asked whether
anything *does* something.

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
