#!/usr/bin/env bash
# Every element painting accent-coloured text, measured against the background
# actually behind it, on both themes.
#
#   bash tools/accent_audit.sh [width] [height]
#
# Exists because --acc (the logo yellow) measures 1.48:1 on paper and 11.99:1
# on ink: the SAME token is fine on one surface and unreadable on the other, so
# a rule that looks right in the stylesheet can still be wrong on the page.
# Text now uses --acc-text, which resolves to --acc-ink (#806400) on light
# surfaces; fills and lines keep --acc.
#
# The wordmark is the one deliberate failure: the owner's standing rule is that
# the logo yellow is never re-tinted, and WCAG 1.4.3 exempts logotypes. It
# appears twice per page (nav + footer). Any OTHER failure is a real one.
#
# It also measures the PIXEL HEADLINES, by reading their canvases. Those are
# not text by the time anyone sees them, and the colour on them is a travelling
# gradient no stylesheet declares - this audit passed while the wave's
# blue-violet sat at 2.64:1 on the near-black band, because everything else
# here asks getComputedStyle and a canvas answers to nobody.
#
# Exits non-zero if anything but the wordmark fails.
W=${1:-1440}
H=${2:-900}
S=accaudit
BASE=http://127.0.0.1:8898
PAGES="index.html contact.html services/ai-tools.html services/web-apps.html services/websites.html services/software.html"

PROBE=$(python -c "import base64,io,sys; print(base64.b64encode(io.open(sys.argv[1],encoding='utf-8').read().encode()).decode())" "$(dirname "$0")/accent_audit_probe.js")

agent-browser --session "$S" close >/dev/null 2>&1
agent-browser --session "$S" set viewport "$W" "$H" >/dev/null

fail=0
for p in $PAGES; do
  for th in dark light; do
    # Set the theme BEFORE the page boots. It is persisted in localStorage, so
    # clicking the toggle inside a loop leaks the previous page's theme into
    # the next run and silently mislabels every result.
    agent-browser --session "$S" open "$BASE/$p" >/dev/null
    agent-browser --session "$S" eval "localStorage.setItem('mcd-v3-theme','$th');'set'" >/dev/null
    agent-browser --session "$S" open "$BASE/$p" >/dev/null
    agent-browser --session "$S" wait --load networkidle >/dev/null
    agent-browser --session "$S" wait 1500 >/dev/null
    # walk the page so lazily-built sections exist before they are measured
    agent-browser --session "$S" eval 'scrollTo(0,document.body.scrollHeight);"ok"' >/dev/null
    agent-browser --session "$S" wait 1600 >/dev/null
    agent-browser --session "$S" eval 'scrollTo(0,0);"ok"' >/dev/null
    agent-browser --session "$S" wait 700 >/dev/null
    res=$(agent-browser --session "$S" eval -b "$PROBE")
    line=$(printf '%s' "$res" | python -c "
import sys, json
d = json.loads(json.loads(sys.stdin.read()))
real = [f for f in d['fails'] if f['sel'] != 'i']
print('$p [$th] accent nodes %d, pixel canvases %d (%d not settled), failing %d, excluding the wordmark %d'
      % (d['accentTextNodes'], d['canvasesChecked'], d['canvasesSkipped'], d['failing'], len(real)))
for f in real:
    print('   ', f['sel'], f['fg'], f['ratio'], '<', f['need'], '|', f['text'])
print('REAL', len(real))
")
    printf '%s\n' "$line" | grep -v '^REAL'
    case "$(printf '%s' "$line" | tail -1)" in
      "REAL 0") ;;
      *) fail=1 ;;
    esac
  done
done

agent-browser --session "$S" close >/dev/null 2>&1
if [ "$fail" -ne 0 ]; then
  echo
  echo "FAIL — accent text below its required contrast somewhere other than the wordmark."
  exit 1
fi
echo
echo "accent text passes on every page, both themes (wordmark exempt by decision)"
