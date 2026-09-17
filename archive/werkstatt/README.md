# werkstatt — the Dev-Modus of the v5 pages (16.–17. September 2026)

The page shown from the inside, on every page: DOM tree, an element's HTML,
its template bindings and CSS rules, the source files with jumps from element
to function (`map.json`), the numbers of the visit (LCP, layout shifts, long
tasks, waterfall, frame rate, skipped blocks, device), knobs, and how Google
and language models read the page. Native ES modules, no build step; texts in
`texte.js`. Design: `docs/plans/2026-09-16-dev-modus-design.md`.

Removed from the site on 17.9.2026 (owner: "release fertig, weg vom
Dev-Modus"): the runtime no longer arms the switch (`armDevMode`,
`showDevSwitch`, `loadDev` left `tools/runtime.js`), the build no longer
clones the "Werkstatt" band after "Arbeiten", and `tools/v5dev-check.mjs`
is gone. The modules here expect `window.__v5` from the binder and were
loaded as `/v5/dev/index.js`; wired back in, they would need the switch and
the band again (both in git history at `6c80a89`).

Nothing under `archive/` is deployed (`.vercelignore`); `tools/verify_site.mjs`
asserts that `/archive/werkstatt/index.js` answers 404 on the live host.
