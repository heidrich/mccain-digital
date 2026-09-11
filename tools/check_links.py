# Every internal href/src on a DEPLOYED page resolves to a real file, every
# #anchor exists on its target page, every id is unique.
#
#     python tools/check_links.py
#
# mccain-design-system/ is skipped on purpose. It is the Claude Design export
# the site is built FROM, it is in .vercelignore, and it is full of href="{{ x }}"
# template placeholders and links to sibling components that were never
# published. Reporting those made this tool print a dozen findings on every run
# that nobody could act on - and a checker that is always red stops being read.
import io
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

pages = []
for base, dirs, files in os.walk(ROOT):
    dirs[:] = [d for d in dirs if d not in
               ("archive", "internal", "mccain-design-system", "fonts", "img", "team",
                "node_modules", ".git")]
    for f in files:
        if f.endswith(".html"):
            pages.append(os.path.join(base, f))

ids = {}
problems = []

# The component template ships as inert <template id="dc-template"> content: the
# browser never resolves anything inside it, support.js interpolates the {{ }}
# expressions before React renders them, and nothing in there is a request. A
# text scan cannot tell that apart from a real href, so it is cut out before the
# scan rather than explained away in eight findings per run.
#
# Comments are stripped FIRST, and that order is the whole point: the banner at
# the top of the generated page explains the structure and contains the literal
# string <template id="dc-template">, so a regex looking for that tag matched
# the COMMENT, ran on to the one real </template> and deleted the prerendered
# markup along with it. The check then reported four anchors as missing that
# were sitting in the part it had just thrown away. A pattern named in
# documentation is inside the search space too.
COMMENT = re.compile(r"<!--.*?-->", re.S)
TEMPLATE_BLOCK = re.compile(
    r'<template id="dc-template">.*?</template>', re.S)
# A <script> body is code, not markup. The component script carries strings like
# icons: 'Alle Icons als SVG-Sprite mit <symbol id="...">.' - prose about markup,
# which a text scan reads as markup. The opening tag stays, because src= on it is
# a real reference.
SCRIPT_BODY = re.compile(r"(<script[^>]*>).*?</script>", re.S)
# Escaped markup is markup being SHOWN, not applied. The brand guide documents
# the icon sprite as &lt;symbol id="..."&gt; three times in its prose, which this
# checker reported as a duplicate id - a false finding, and false findings are
# how a real one later goes unnoticed.
SHOWN_MARKUP = re.compile(r"&lt;[^&]{0,400}?&gt;")


def servable(path):
    """Only the markup a browser actually resolves.

    Everything removed here is present in the file and inert: comments, the
    template support.js interpolates later, script bodies, and markup quoted as
    documentation. What is left is what a link can actually point at.
    """
    s = io.open(path, encoding="utf-8").read()
    s = COMMENT.sub("", s)
    s = TEMPLATE_BLOCK.sub("", s)
    s = SCRIPT_BODY.sub(r"", s)
    s = SHOWN_MARKUP.sub("", s)
    return s


for p in pages:
    s = servable(p)
    found = re.findall('id="([^"]+)"', s)
    dupes = set(x for x in found if found.count(x) > 1)
    if dupes:
        problems.append((p, "duplicate id(s): " + ", ".join(sorted(dupes))))
    ids[os.path.normpath(p)] = set(found)

# ids the scripts inject at runtime, so a static scan cannot see them
RUNTIME_IDS = {"cmenu", "cmInput", "cmList", "cmPrev", "cmCount", "chipTip"}

for p in pages:
    s = servable(p)
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
