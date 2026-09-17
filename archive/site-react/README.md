# site-react — the React edition of the v4 design (12.–17. September 2026)

The site as it was live on Vercel until the switch to the v5 build on
17.9.2026, taken from its last commit (`7612481`). Twenty-one pages rendered
by `tools/prerender.mjs` from the Claude Design export, each carrying React's
own first render in `#dc-root`, the inert template, and the export's runtime
(`support.js`, patched to hydrate) plus React 18.3.1 from `vendor/`.

Kept as a record, like `site-v3/` and `site-apache/`: what the pages said,
how they were wired (forms to Web3Forms, consent, the deferred sections), and
the exact runtime they ran on. **Not runnable from here** — every script and
asset path is absolute (`/support.js`, `/vendor/…`, `/img/…`), so the pages
only work at a site root. The images, typefaces, brand files and team
portraits are not duplicated: they are the same files that still live at the
repository root (`img/`, `fonts/`, `brand/`, `team/`).

Why it was replaced: every state change re-rendered the whole page through
React (64–84 ms at 4× CPU, measured 16.9.2026); the v5 build ships the same
markup as plain HTML with one binder, `v5/runtime.js`, and writes only what a
state change alters. Design and measurements:
`docs/plans/2026-09-17-v5-alle-seiten-design.md`, `HANDOFF.md` „STAND 17.9.".

Nothing under `archive/` is deployed (`.vercelignore`); `tools/verify_site.mjs`
asserts that `/archive/site-react/index.html` answers 404 on the live host.
