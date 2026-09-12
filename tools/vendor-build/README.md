# Build-time only

`react-dom-server-legacy-18.3.1.js` is the UMD build of `react-dom/server.browser`
for React 18.3.1, downloaded from unpkg. It is vendored rather than installed so
the build is reproducible on both machines without a package step.

**It is never shipped.** The build copies it to `_dcbuild/rds.js` while it renders
the pages and deletes that directory afterwards; nothing in the site references it.

The *legacy* file, not `react-dom-server.browser.production.min.js`: the non-legacy
UMD exposes only `renderToReadableStream`. `renderToString` lives here. Both write
the same `window.ReactDOMServer` global.

Version must match `vendor/react-dom-18.3.1.production.min.js`. If React is ever
bumped, bump this with it - a server renderer from a different minor writes markup
the client refuses to hydrate.
