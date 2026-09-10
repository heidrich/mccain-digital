#!/usr/bin/env bash
# Kept as the name every note in HANDOFF.md and TODO.md already calls.
# The measuring lives in sweep.mjs now (and the logic, as before, in probe.js)
# — the shell no longer drives a browser, because the CLI it used to drive
# hangs on this machine. See tools/browser.mjs.
#
# $1 = width (default 1280), $2 = height (default 820). A third argument used
# to name an agent-browser session; it is accepted and ignored.
set -e
cd "$(dirname "$0")/.."
[ -d tools/node_modules ] || npm --prefix tools install >/dev/null
exec node tools/sweep.mjs "$@"
