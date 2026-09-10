#!/usr/bin/env bash
# Kept as the name every note in HANDOFF.md and TODO.md already calls.
# The measuring lives in accent_audit.mjs now (and the logic, as before, in
# accent_audit_probe.js) — the shell no longer drives a browser, because the
# CLI it used to drive hangs on this machine. See tools/browser.mjs.
set -e
cd "$(dirname "$0")/.."
[ -d tools/node_modules ] || npm --prefix tools install >/dev/null
exec node tools/accent_audit.mjs "$@"
