# McCain Digital — mccain-digital.com

> We build digital products.

The marketing site for our new small company **McCain Digital**, a digital product studio in Bavaria, Germany (AI tools, web apps, mobile apps, websites and custom software).

It is hand-written **vanilla HTML / CSS / JS** — no framework, no build step, no dependencies — and scores **100 / 100 / 100 / 100** on Google PageSpeed (Performance, Accessibility, Best Practices, SEO), with Total Blocking Time 0 ms and Cumulative Layout Shift 0 — *while* running a custom canvas **pixel-physics engine** over every headline, button and tile.

🔗 **Live:** [mccain-digital.com](https://mccain-digital.com)

---

## What makes it interesting

- **One HTML file, one JS file, zero build.** [`upload/index.html`](upload/index.html) is the whole page (inlined CSS + scripts); [`upload/pixel-engine.js`](upload/pixel-engine.js) is the shared effect engine. Drop the `upload/` folder on any static host and it runs.
- **No dependencies, no web fonts.** A system font stack (`system-ui`) means nothing is downloaded for type; the only network requests are the page, the engine and a handful of images.
- **The text is always real DOM.** Every word is selectable, crawlable HTML — the pixel effects are `aria-hidden` `<canvas>` overlays drawn *on top*. Structured data via JSON-LD (`ProfessionalService`, `WebSite`, `SoftwareApplication`).
- **Graceful by default.** Touch devices and `prefers-reduced-motion` get the native, effect-free site. The canvas is presentation only; it can fail and the page still works.
- **Frame-frugal.** Every animation loop runs *only* while something is actually moving and on-screen, then parks itself — an idle page burns zero frames. That is how the effects coexist with a 0 ms Total Blocking Time.

---

## Tech stack

| Concern | Choice |
|---|---|
| Markup / styling / logic | Hand-written **HTML5, CSS3, vanilla JS** (ES5-style, IIFE, no modules) |
| Build step | **None** — files are served as-authored |
| Dependencies | **None** |
| Effects | Custom `<canvas>` 2D **pixel-physics engine** (`window.PixelFX`) |
| Type | **Schibsted Grotesk**, self-hosted in `fonts/` |
| SEO | Per-page meta, Open Graph, JSON-LD structured data, `sitemap.xml`, `robots.txt`, `llms.txt` |
| Hosting | **Vercel**, deployed from the repository root on `git push`; headers via `vercel.json` |

---

## The pixel engine — how the particles are calculated

[`upload/pixel-engine.js`](upload/pixel-engine.js) is one physics core feeding five effects. The pipeline is the same everywhere:

**1. Rasterize → sample into particles.** The engine takes a real DOM node (a headline, a button face, a tile), clones it with its computed styles inlined, and renders it into an `<svg><foreignObject>` which is drawn to an offscreen canvas. It then reads the raw pixels back with `getImageData` and walks them on a fixed grid (`gap` px). Every sampled pixel above an alpha threshold becomes a **particle** carrying its colour `[r,g,b]`, its alpha, and its **home position** `(hx, hy)`. Everything is `devicePixelRatio`-aware (capped at 3) so it stays crisp on retina without over-drawing.

**2. Simulate.** Each frame, particles integrate simple velocity-based physics toward (or away from) their home position. The shared building blocks:

- **The cursor is a "black hole".** For every particle within radius `R` of the pointer, a radial push is applied that grows as you get closer to the centre:

  ```
  if (dist² < R²) {
    force = (1 − dist / R) · FORCE     // 0 at the rim, strongest at the centre
    vx   += (dx / dist) · force
    vy   += (dy / dist) · force
  }
  ```

- **A spring pulls every particle home**, and velocity is damped each frame, so the field always wants to re-form the text:

  ```
  vx += (homeX − x) · SPRING           // pull back toward home
  vy += (homeY − y) · SPRING
  vx *= DAMP;  vy *= DAMP               // friction
  x  += vx;    y  += vy
  ```

  For the headlines that is `R = 46`, `FORCE = 2.4`, `SPRING = 0.10`, `DAMP = 0.86`.

- **Assembly** (the intro, and re-forming) interpolates each particle from a random start to its home over ~1 s with a cubic ease-out `e = 1 − (1 − t)³` and a small per-particle delay, so the text *snaps together* rather than sliding uniformly.

- **Scroll shear.** A single lerped scroll-velocity value is broadcast on a small "velocity bus"; headlines use it to shear their rows like a CRT tear while you scroll, then spring back.

The five consumers built on that core:

1. **Pixel headlines** — text assembles from scattered pixels, then *stays* pixels. The cursor punches the black hole through it; with no pointer, an autonomous "pass" drifts the hole through the text every ~30 s (random side, random lane), and a real pointer always takes over.
2. **Disintegrating buttons** — hover tears the whole button face into pixels that scatter around the cursor; click triggers a **vacuum** (an accelerating pull into the click point), a short mustard flash, and *then* fires the real action (navigate / submit / event). Keyboard, touch and reduced-motion use the plain button.
3. **Tile morph** — a card's front face dissolves into pixels blasted away from the cursor entry point and reassembles as its back face out of the debris.
4. **Scroll-velocity bus** — one decaying scroll-velocity value, lerped, that consumers subscribe to; the loop runs only while it decays.
5. **Falling sand** — clicking content shatters it into grains governed by a **cellular automaton** (fall straight down, else slide diagonally, else pile up). The cursor stirs the pile; after 5 s idle the grains vacuum back to their sampled home. The 404 page turns this into a little "sweep up the pixels" game.

---

## Project structure

The repository root **is** the site — what is here is what gets served.

```
index.html              home
contact.html
services/               ai-tools · web-apps · websites · software
legal/                  imprint · privacy · terms · withdrawal
404.html                falling-sand "collect" game

data.js                 the single content source (services, FAQ, knowledge base)
pixel-engine.js         the shared canvas pixel-physics engine
common.js               shared page runtime (theme, nav, marquee, FAQ, tooltips)
pacman.js · menu.js     scroll-progress Pac-Man · the ⌘K command menu
v3.js                   what only the home page has
v3.css                  every style

fonts/ · img/ · team/   assets
robots.txt · sitemap.xml · llms.txt · og-image.png · favicon.svg
vercel.json             edge cache + security headers
.vercelignore           what must NOT be published (old/, tools/, notes)

tools/                  generators and guards, not deployed
old/                    the retired site, kept for reference — see below
HANDOFF.md              the working notes
```

**Script order is load-bearing:** `data.js` → `pixel-engine.js` → `common.js` →
`pacman.js` → `menu.js` → page script. `pixel-engine.js` must come before
`common.js`, because the marquee subscribes to `PixelFX.onVelocity`
synchronously.

### `old/`

The site that was live on classic Apache webspace until the move to Vercel,
plus the design studies that led here (`upload/`, `upload-v2/`, `mockup/`,
`_v2-preview/`). It is kept because it is the source of record for the legal
wording — `tools/build_legal.py` lifts that text verbatim out of
`old/upload/legal/` and only ever rewrites hrefs. It is listed in
`.vercelignore`, so it is never published: a second, older copy of the same
company reachable under `/old/` would be a genuine SEO problem.

## Run locally

No build, no install. Use the small server in the repository rather than
`python -m http.server`, which sends no compression or cache headers and
measures roughly 4x worse in Lighthouse for the same files:

```bash
python prodserve.py 8898 --dev   # to look at:  Cache-Control: no-store
python prodserve.py 8897         # to measure:  production headers + gzip
```

## Deploy

`git push` — Vercel builds from the repository root. There is nothing to
compile. `vercel.json` carries the cache and security headers; `.vercelignore`
decides what stays unpublished.

---

---

## License

© McCain Digital. All rights reserved. Published for reference and portfolio purposes; not licensed for reuse or redistribution.
