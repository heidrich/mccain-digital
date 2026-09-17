# Build-time only

Three UMD builds of React 18.3.1, downloaded from unpkg and vendored rather than
installed so the build is reproducible on both machines without a package step:

- `react-18.3.1.production.min.js` and `react-dom-18.3.1.production.min.js` -
  what the export's runtime (support.js) asks unpkg for. `tools/prerender.mjs`
  copies them to `_dcbuild/vendor/` and points support.js there through its
  `window.__resources` hook, so the staging documents of the build render
  against them. Until 17.9.2026 they shipped from `/vendor/`; the pages that
  ship now load no React at all (see `tools/v5build.mjs`, `v5/runtime.js`).
- `react-dom-server-legacy-18.3.1.js` - `react-dom/server.browser`. The build
  copies it to `_dcbuild/rds.js` and renders every artboard through
  `renderToString`. The *legacy* file, not
  `react-dom-server.browser.production.min.js`: the non-legacy UMD exposes only
  `renderToReadableStream`. Both write the same `window.ReactDOMServer` global.

**None of it is deployed.** `_dcbuild/` is in `.gitignore` and `.vercelignore`,
and `tools/verify_site.mjs` asserts that the old `/support.js` and `/vendor/`
paths answer 404.

All three must be the same version. If React is ever bumped, bump them together:
a server renderer from a different minor writes markup the client refuses to
adopt, and `tools/v5build.mjs` merges what the server renderer writes.
