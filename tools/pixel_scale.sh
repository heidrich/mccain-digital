#!/usr/bin/env bash
# Checks that every pixel mosaic sits on its photo at scale 1.
# Guards the srcset density trap: naturalWidth is density-corrected CSS px,
# drawImage's SOURCE rectangle is raw bitmap px, and mixing the two zooms the
# mosaic (200% on a display that picks a 2x candidate). See HANDOFF, patch 5.
#
#   bash tools/pixel_scale.sh [width] [height]
#
# Exits non-zero if any card reports a best-fit scale other than 1.00.
W=${1:-1440}
H=${2:-900}
S=pxscale
BASE=http://127.0.0.1:8898

# Pages that carry a pixel image. The work cards need the slider scrolled to.
PAGES="index.html services/ai-tools.html services/web-apps.html services/websites.html services/software.html"

PROBE=$(python -c "import base64,io,sys; print(base64.b64encode(io.open(sys.argv[1],encoding='utf-8').read().encode()).decode())" "$(dirname "$0")/pixel_scale_probe.js")

agent-browser --session "$S" close >/dev/null 2>&1
agent-browser --session "$S" set viewport "$W" "$H" >/dev/null

fail=0
for p in $PAGES; do
  echo "===== $p @ ${W}x${H} ====="
  agent-browser --session "$S" open "$BASE/$p" >/dev/null
  agent-browser --session "$S" wait --load networkidle >/dev/null
  # scroll the pictures into view so the fields are built, then let the
  # scroll-in swarm finish — a mid-assemble read would compare against a swarm
  agent-browser --session "$S" eval 'scrollTo(0, document.body.scrollHeight * 0.35); "ok"' >/dev/null
  agent-browser --session "$S" wait 900 >/dev/null
  agent-browser --session "$S" eval 'scrollTo(0, document.body.scrollHeight * 0.7); "ok"' >/dev/null
  agent-browser --session "$S" wait 1600 >/dev/null
  res=$(agent-browser --session "$S" eval -b "$PROBE")
  echo "$res"
  case "$res" in
    *'\"FAIL\": 0'*|*'"FAIL": 0'*) ;;
    *) fail=1 ;;
  esac
done

agent-browser --session "$S" close >/dev/null 2>&1
if [ "$fail" -ne 0 ]; then
  echo
  echo "FAIL — at least one mosaic does not sit at scale 1 on its photo."
  exit 1
fi
echo
echo "every mosaic sits on its photo at scale 1.00"
