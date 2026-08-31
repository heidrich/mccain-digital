# Static check of the v3 proposal: every internal href/src resolves to a real
# file, every #anchor exists on its target page, every id is unique.
import io
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

pages = []
for base, dirs, files in os.walk(ROOT):
    dirs[:] = [d for d in dirs if d not in
               ("old", "_parked", "fonts", "img", "team", "node_modules", ".git")]
    for f in files:
        if f.endswith(".html"):
            pages.append(os.path.join(base, f))

ids = {}
problems = []

for p in pages:
    s = io.open(p, encoding="utf-8").read()
    found = re.findall('id="([^"]+)"', s)
    dupes = set(x for x in found if found.count(x) > 1)
    if dupes:
        problems.append((p, "duplicate id(s): " + ", ".join(sorted(dupes))))
    ids[os.path.normpath(p)] = set(found)

# ids the scripts inject at runtime, so a static scan cannot see them
RUNTIME_IDS = {"cmenu", "cmInput", "cmList", "cmPrev", "cmCount", "chipTip"}

for p in pages:
    s = io.open(p, encoding="utf-8").read()
    rel = os.path.relpath(p, ROOT)
    refs = re.findall('(?:href|src)="([^"]+)"', s)
    for r in refs:
        if r.startswith(("http://", "https://", "mailto:", "tel:", "data:")):
            continue
        target, _, anchor = r.partition("#")
        if not target:
            # same-page anchor
            if anchor and anchor not in ids[os.path.normpath(p)] and anchor not in RUNTIME_IDS:
                problems.append((rel, "anchor #" + anchor + " does not exist on this page"))
            continue
        # 404.html is served from any depth, so its paths are root-absolute
        if target.startswith("/"):
            abspath = os.path.normpath(os.path.join(ROOT, target.lstrip("/")))
        else:
            abspath = os.path.normpath(os.path.join(os.path.dirname(p), target))
        if not os.path.exists(abspath):
            problems.append((rel, "missing file: " + r))
            continue
        if anchor and abspath.endswith(".html"):
            tids = ids.get(os.path.normpath(abspath))
            if tids is None:
                t = io.open(abspath, encoding="utf-8").read()
                tids = set(re.findall('id="([^"]+)"', t))
            if anchor not in tids and anchor not in RUNTIME_IDS:
                problems.append((rel, "anchor #" + anchor + " missing in " + target))

print("pages scanned:", len(pages))
for p in sorted(pages):
    print("  ", os.path.relpath(p, ROOT))
print()
if problems:
    print("PROBLEMS:", len(problems))
    for where, what in problems:
        print("  !", where, "->", what)
    sys.exit(1)
print("no broken links, no missing anchors, no duplicate ids")
