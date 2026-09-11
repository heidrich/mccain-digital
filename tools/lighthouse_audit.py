# Lighthouse over the pages that matter, as a table instead of five HTML reports.
#
#     python tools/lighthouse_audit.py                      # against live
#     python tools/lighthouse_audit.py http://127.0.0.1:8898
#
# WHY A WRAPPER
# Two things make the raw CLI awkward here. It exits non-zero on this machine
# because chrome-launcher cannot delete its own temp profile (EPERM on Windows)
# AFTER the run has finished and the report has been written - the measurement
# is fine, the cleanup is not, and a non-zero exit hides a perfectly good result.
# And a score on its own does not say what to fix, so every audit below 100 is
# listed by name.
#
# READ THE SEO NUMBER WITH ONE THING IN MIND
# While site.config.json says noindex, Lighthouse fails `is-crawlable` and the
# SEO category cannot reach 100. That is the switch doing its job, not a defect.
# This script says so rather than leaving a 69 to be misread.
import io
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)
OUT = os.path.join(SITE, "internal", "lighthouse")

PAGES = [
    ("/", "start page"),
    ("/kontakt.html", "contact"),
    ("/services/ai-tools.html", "service page"),
    ("/legal/imprint.html", "legal page"),
    ("/brand-guide.html", "brand guide"),
]

CATEGORIES = "performance,accessibility,best-practices,seo"
METRICS = [
    ("first-contentful-paint", "FCP"),
    ("largest-contentful-paint", "LCP"),
    ("total-blocking-time", "TBT"),
    ("cumulative-layout-shift", "CLS"),
    ("speed-index", "SI"),
]


def chrome_path():
    root = os.path.join(os.environ.get("LOCALAPPDATA", ""), "ms-playwright")
    if os.path.isdir(root):
        for d in sorted(os.listdir(root), reverse=True):
            exe = os.path.join(root, d, "chrome-win64", "chrome.exe")
            if os.path.exists(exe):
                return exe
    return None


def run(base, path, slug):
    report = os.path.join(OUT, slug + ".json")
    env = dict(os.environ)
    exe = chrome_path()
    if exe:
        env["CHROME_PATH"] = exe
    # A LIST with shell=True is wrong on Windows: cmd.exe takes the first item
    # as the command and drops the rest, so lighthouse ran with no URL and wrote
    # a report full of zeroes that looked like a measurement. One string.
    cmd = (
        f'npx --no-install lighthouse "{base + path}" --quiet --output=json '
        f'--output-path="{report}" --only-categories={CATEGORIES} --preset=desktop'
    )
    subprocess.run(cmd, env=env, shell=True, capture_output=True, text=True)
    # The exit code is deliberately ignored: see the header. What counts is
    # whether a parseable report landed on disk.
    if not os.path.exists(report):
        return None
    try:
        with io.open(report, encoding="utf-8") as f:
            d = json.load(f)
    except (ValueError, OSError):
        return None
    # A report can exist and still contain nothing: Lighthouse writes one with
    # every score null when the page would not load. Saying so beats printing a
    # column of zeroes that reads like a terrible result.
    if d.get("runtimeError"):
        print(f"      ! {d['runtimeError'].get('code')}: "
              f"{d['runtimeError'].get('message', '')[:110]}")
        return None
    return d


def main():
    # Default is the LOCAL measuring server, not live. Lighthouse cannot navigate
    # the deployed host from this machine - every run ends in
    # FAILED_DOCUMENT_REQUEST / net::ERR_ABORTED on the document, while curl and
    # Playwright fetch the same URL without trouble. prodserve.py in measuring
    # mode sends the same compression and cache headers, so the numbers are
    # comparable and, unlike a CDN, reproducible.
    #
    #     python prodserve.py 8897        # MEASURE - production headers
    base = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8897").rstrip("/")
    os.makedirs(OUT, exist_ok=True)
    print(f"\nlighthouse  {base}\n")
    print(f"  {'page':<26} {'perf':>5} {'a11y':>5} {'best':>5} {'seo':>5}   "
          f"{'FCP':>8} {'LCP':>8} {'TBT':>8} {'CLS':>7}")
    print("  " + "-" * 92)

    problems = {}
    for path, label in PAGES:
        slug = re.sub(r"[^a-z0-9]+", "-", path.lower()).strip("-") or "index"
        d = run(base, path, slug)
        if not d:
            print(f"  {label:<26}  could not be measured")
            continue
        cats = d["categories"]

        def score(key):
            v = cats.get(key, {}).get("score")
            return round(v * 100) if v is not None else 0

        def metric(key):
            a = d["audits"].get(key) or {}
            return a.get("displayValue", "-")

        print(f"  {label:<26} {score('performance'):>5} {score('accessibility'):>5} "
              f"{score('best-practices'):>5} {score('seo'):>5}   "
              f"{metric('first-contentful-paint'):>8} {metric('largest-contentful-paint'):>8} "
              f"{metric('total-blocking-time'):>8} {metric('cumulative-layout-shift'):>7}")

        for a in d["audits"].values():
            if a.get("score") is not None and a["score"] < 1 and a.get("scoreDisplayMode") != "notApplicable":
                problems.setdefault(a["id"], (a["title"], []))[1].append(label)

    if problems:
        print("\n  audits below 100, and where\n")
        for aid, (title, where) in sorted(problems.items(), key=lambda kv: -len(kv[1][1])):
            note = ""
            if aid == "is-crawlable":
                note = "   <- site.config.json noindex, on purpose"
            print(f"    {aid:<32} {title[:54]:<56}{note}")
            print(f"      {', '.join(where)}")
    print(f"\n  full reports: internal/lighthouse/*.json")


if __name__ == "__main__":
    main()
