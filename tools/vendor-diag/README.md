# Diagnosis only

Two files, used by `tools/reactprof.mjs` to look inside React while a page loads.
Neither is ever served: `tools/` is in `.vercelignore`, and nothing in the site
references this folder. The measuring tool swaps them in inside the browser it
drives, not on disk.

| File | Source | sha256 |
| --- | --- | --- |
| `react-dom-18.3.1.profiling.min.js` | npm `react-dom@18.3.1`, `umd/react-dom.profiling.min.js` | `2daedab06b577dc0674514e9fa738b9cce256741735451cadff6ee26aee0ff41` |
| `react-scan-0.5.7.auto.global.js` | npm `react-scan@0.5.7`, `dist/auto.global.js` | `64297cd23b2a93e1677fec65c5f4624c00e62076b8b0ca4964b7f5c2f315f180` |

**Why the profiling build.** `<Profiler onRender>` and the per-fiber
`actualDuration` / `selfBaseDuration` fields are compiled out of
`react-dom.production.min.js`. The profiling build is the same production code
with the timers left in - so the numbers it reports are slightly HIGHER than
what a visitor pays, but the proportions between parts of the page hold.

**Why vendored, not installed.** The npm package `react-scan` pulls `@babel/core`
plus `react-doctor` and `react-grab` at version `latest` - unpinned, re-resolved on
every install. The global build is self-contained, so the one file is pinned
here instead.

**It phones out.** The global build fetches `https://www.react-grab.com/api/version`
on start. `tools/reactprof.mjs` aborts every request that does not go to the
local server, so a measurement never leaves the machine.

Version must match `vendor/react-dom-18.3.1.production.min.js`. If React is ever
bumped, bump the profiling build with it.
