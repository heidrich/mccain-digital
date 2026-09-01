#!/usr/bin/env bash
# Loads every page in a fresh browser session, reports console errors,
# page errors and a widget/overflow summary. $1 = viewport width (default 1280).
W=${1:-1280}
H=${2:-820}
S=${3:-sweep}
BASE=http://127.0.0.1:8898

# A dead server answers every question with an error page, and an error page
# has no accent text, no mosaics and no console errors - so this whole tool
# reports a clean pass on nothing at all. It has already done that once.
if ! curl -fsS -o /dev/null "$BASE/index.html"; then
  echo "the dev server is not answering on $BASE - start it with: python prodserve.py 8898 --dev" >&2
  exit 2
fi

PAGES="index.html 404.html contact.html services/ai-tools.html services/web-apps.html services/websites.html services/software.html legal/imprint.html legal/privacy.html legal/terms.html legal/withdrawal.html"

# probe.js goes in base64-encoded: the shell mangles backslashes and quotes in
# anything this size, and `eval -b` bypasses shell interpretation entirely.
# Encoded here rather than checked in, so it can never go stale against probe.js.
PROBE=$(python -c "import base64,io,sys; print(base64.b64encode(io.open(sys.argv[1],encoding='utf-8').read().encode()).decode())" "$(dirname "$0")/probe.js")

agent-browser --session "$S" close >/dev/null 2>&1
agent-browser --session "$S" set viewport "$W" "$H" >/dev/null

for p in $PAGES; do
  echo "===== $p @ ${W}x${H} ====="
  agent-browser --session "$S" errors --clear >/dev/null 2>&1
  agent-browser --session "$S" console --clear >/dev/null 2>&1
  agent-browser --session "$S" open "$BASE/$p" >/dev/null
  agent-browser --session "$S" wait --load networkidle >/dev/null
  agent-browser --session "$S" wait 700 >/dev/null
  echo "--- page errors:"
  agent-browser --session "$S" errors 2>&1 | head -12
  echo "--- console (errors/warnings):"
  agent-browser --session "$S" console 2>&1 | grep -iE 'error|warn|failed|refused|404' | head -12
  echo "--- state:"
  agent-browser --session "$S" eval -b "$PROBE"
done

agent-browser --session "$S" close >/dev/null 2>&1
