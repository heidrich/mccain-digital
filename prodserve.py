"""Serve v3-proposal the way a real host would: gzip + cache headers.

python -m http.server sends everything raw and uncached, which makes
render-blocking CSS look ~6x heavier than it is in production and fails
both cache audits outright. This is the honest comparison baseline.

    python prodserve.py 8897          MEASURE  — production headers, for Lighthouse
    python prodserve.py 8898 --dev    LOOK AT  — same gzip, never cached

Use the right one. In measuring mode .css/.js carry
`max-age=31536000, immutable`, which is correct for a CDN and a trap in a
browser: an edited stylesheet is never re-fetched, for a year. A bare
`python -m http.server` is no safer — it sends no cache headers at all, so
browsers fall back to heuristic caching off Last-Modified and happily serve
a stale file too. Both have already cost an hour of chasing a fix that was
long since on disk. --dev sends `no-store` so that cannot happen.
"""
import gzip
import io
import json
import os
import subprocess
import sys
import urllib.parse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

# Derived from where this file lives, never written out. An absolute path
# hardcoded here kept serving a folder that no longer existed once the site
# moved to the repository root, and every page answered 404 with no error in
# the log — the server was healthy, it was pointed at nothing.
ROOT = os.path.dirname(os.path.abspath(__file__))
COMPRESSIBLE = (".html", ".css", ".js", ".svg", ".json", ".txt", ".xml", ".md")
IMMUTABLE = (".woff2", ".webp", ".jpg", ".png", ".svg", ".css", ".js")


def site_wide_headers():
    """The security headers vercel.json applies to every path.

    Read here rather than restated, so the Content-Security-Policy the build
    generates is the one being measured. A CSP is the one header where "we will
    see when it is deployed" is not an acceptable test: it fails silently and
    it fails in production. Sent in BOTH modes - it is not a caching concern.
    """
    try:
        conf = json.load(open(os.path.join(ROOT, "vercel.json"), encoding="utf-8"))
    except (OSError, ValueError) as exc:
        print("  ! vercel.json unreadable (%s) - serving without security headers" % exc)
        return []
    out = []
    for block in conf.get("headers", []):
        if block.get("source") != "/(.*)":
            continue
        for h in block.get("headers", []):
            # Cache-Control is decided per file type below; X-Robots-Tag is a
            # deploy decision and would only confuse a local Lighthouse run.
            if h["key"] in ("Cache-Control", "X-Robots-Tag"):
                continue
            out.append((h["key"], h["value"]))
    return out


SECURITY_HEADERS = site_wide_headers()

# LIVE RELOAD, --dev ONLY (19.9.2026). The owner watched pages that only change
# after a ten-minute build, while the artboards they come from were edited all
# along. Every HTML page served in --dev now carries /__live.js: it asks
# /__live?p=<its path> every 0.8 s for the modification times of the files
# behind the page and reloads when they change - the artboard plus colors.css
# for a raw artboard, the built file for a built page (a finished build
# reloads it). Keeps the scroll position. Inert under automation
# (navigator.webdriver): the build and the gates render through this server
# and must see the page as it ships. An external script, not inline, so the
# built pages' CSP (script-src 'self' + hashes) lets it run unchanged.
LIVE_JS = b"""(() => {
  if (navigator.webdriver) return;
  try { const y = sessionStorage.getItem('__liveY'); if (y !== null) { sessionStorage.removeItem('__liveY'); addEventListener('load', () => setTimeout(() => scrollTo(0, +y), 350)); } } catch (e) {}
  let sig = null;
  const tick = async () => {
    if (!document.hidden) {
      try {
        const s = await (await fetch('/__live?p=' + encodeURIComponent(location.pathname), { cache: 'no-store' })).text();
        if (sig !== null && s !== sig) { try { sessionStorage.setItem('__liveY', String(scrollY)); } catch (e) {} location.reload(); return; }
        sig = s;
      } catch (e) { /* the server is restarting - keep asking */ }
    }
    setTimeout(tick, 800);
  };
  tick();
})();
"""
LIVE_TAG = b'<script src="/__live.js" defer></script>'


def with_live_tag(html):
    at = html.rfind(b"</body>")
    return html[:at] + LIVE_TAG + html[at:] if at >= 0 else html + LIVE_TAG


def dev_index():
    """/__dev: every artboard, most recently edited first, with its raw view
    (live, no build) and its built route (as of the last build)."""
    import html
    import re
    import time
    try:
        table = open(os.path.join(ROOT, "tools", "pages.mjs"), encoding="utf-8").read()
    except OSError:
        table = ""
    routes = dict(re.findall(r'src:\s*"([^"]+)"[\s\S]*?route:\s*"([^"]+)"', table))
    folder = os.path.join(ROOT, "mccain-design-system")
    boards = sorted((f for f in os.listdir(folder) if f.startswith("McCain Digital ") and f.endswith(".dc.html")),
                    key=lambda f: -os.stat(os.path.join(folder, f)).st_mtime)
    now = time.time()

    def ago(f):
        m = int((now - os.stat(os.path.join(folder, f)).st_mtime) // 60)
        return "gerade eben" if m < 1 else "vor %d Min." % m if m < 120 else "vor %d Std." % (m // 60) if m < 2880 else "vor %d Tagen" % (m // 1440)

    rows = "".join(
        '<tr><td><a href="/mccain-design-system/%s">%s</a></td><td>%s</td><td>%s</td></tr>' % (
            urllib.parse.quote(f), html.escape(f[len("McCain Digital "):-len(".dc.html")]),
            ('<a href="%s">%s</a>' % (routes[f], routes[f])) if f in routes else "–", ago(f))
        for f in boards)
    page = ("<!doctype html><meta charset=utf-8><title>Dev – McCain Digital</title>"
            # No colours of its own: a tool page, and the site's colours live in colors.css only.
            "<style>body{font:15px/1.5 system-ui,sans-serif;margin:32px}"
            "h1{font-size:20px;margin:0 0 4px}p{margin:0 0 20px;opacity:.75}"
            "table{border-collapse:collapse}td,th{padding:6px 18px 6px 0;text-align:left;"
            "border-bottom:1px solid color-mix(in srgb,currentColor 15%,transparent)}"
            "th{font-size:12px;text-transform:uppercase;letter-spacing:.06em;opacity:.7}</style>"
            "<h1>Arbeitsstand</h1><p>Artboard = Arbeitsansicht, zeigt jede Änderung sofort und lädt sich selbst neu. "
            "Route = gebaute Seite, Stand des letzten Builds.</p>"
            "<table><tr><th>Artboard (live)</th><th>Gebaute Seite</th><th>Geändert</th></tr>" + rows + "</table>")
    return with_live_tag(page.encode("utf-8"))


def live_signature(url_path):
    """Modification times of the files a page is made of, as one string."""
    rel = url_path.split("?")[0].lstrip("/")
    target = os.path.normpath(os.path.join(ROOT, *rel.split("/")))
    if os.path.commonpath([ROOT, target]) != ROOT:
        return ""
    if os.path.isdir(target):
        target = os.path.join(target, "index.html")
    files = [target]
    if rel.startswith("mccain-design-system/") and rel.endswith(".dc.html"):
        files.append(os.path.join(ROOT, "mccain-design-system", "tokens", "colors.css"))
    return "|".join(str(os.stat(f).st_mtime_ns) if os.path.isfile(f) else "-" for f in files)


class Handler(SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    dev = False

    def guess_type(self, path):
        # The Markdown twins (index.md next to each page) are read by language models and by
        # the workshop's crawler view. vercel.json sends them as
        # text/markdown; charset=utf-8 - the same here, so a wrong charset
        # cannot hide behind the local server.
        if path.endswith(".md"):
            return "text/markdown; charset=utf-8"
        return super().guess_type(path)

    def end_headers(self):
        path = self.path.split("?")[0]
        # NOT ON THE EXPORT. The policy describes the BUILT site; the artboards
        # under /mccain-design-system/ are the build's input and still load
        # React from unpkg and the fonts from Google, the way Claude Design
        # wrote them. Sending them the site's CSP blocked both, the component
        # never mounted, and tools/prerender.mjs failed on every page - the
        # exact "a wrong CSP kills it silently" shape, aimed at our own build.
        # Vercel never sees this folder either: it is not deployed, and
        # verify_site asserts it answers 404.
        #
        # NOR ON THE BUILD SCRATCH. Since 17.9.2026 the CSP hashes come from
        # the pages that ship, which carry no React. The staging documents
        # under /_dcbuild/ (tools/prerender.mjs, tools/v5build.mjs) still
        # render with React: an inline window.__resources map plus support.js.
        # Under the site's CSP that inline script is unhashed and support.js
        # falls back to unpkg, which the policy blocks - the build dies on the
        # first page. Not deployed either (.vercelignore), verify_site asserts
        # the 404.
        if not (path.startswith("/mccain-design-system/") or path.startswith("/_dcbuild/")):
            for key, value in SECURITY_HEADERS:
                self.send_header(key, value)
        if self.dev:
            # no-store, not no-cache: no-cache still stores and revalidates,
            # and a 304 off a stale Last-Modified is exactly the failure mode
            self.send_header("Cache-Control", "no-store")
        elif path.endswith(".html") or path.endswith("/"):
            self.send_header("Cache-Control", "no-cache")
        elif path.endswith(IMMUTABLE):
            self.send_header("Cache-Control", "public, max-age=31536000, immutable")
        super().end_headers()

    def send_bytes(self, body, ctype):
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        return io.BytesIO(body)

    def send_head(self):
        if self.dev and self.path == "/__live.js":
            return self.send_bytes(LIVE_JS, "text/javascript; charset=utf-8")
        if self.dev and self.path.split("?")[0] in ("/__dev", "/__dev/"):
            return self.send_bytes(dev_index(), "text/html; charset=utf-8")
        if self.dev and self.path.startswith("/__live?"):
            p = urllib.parse.parse_qs(urllib.parse.urlsplit(self.path).query).get("p", [""])[0]
            return self.send_bytes(live_signature(urllib.parse.unquote(p)).encode(), "text/plain; charset=utf-8")
        path = self.translate_path(self.path)
        # THE ARTBOARDS WRITE TOKENS (19.9.2026). An artboard says var(--mc-navy),
        # also inside JS strings a canvas parses; the build resolves that through
        # tools/tokens.mjs, and so does this server, so an artboard opened straight
        # out of mccain-design-system/ looks like the page it builds.
        rel = self.path.split("?")[0]
        if rel.startswith("/mccain-design-system/") and (rel.endswith(".dc.html") or "/static/" in rel) and os.path.isfile(path):
            try:
                out = subprocess.run(["node", os.path.join(ROOT, "tools", "tokens.mjs"), "--resolve", path],
                                     capture_output=True)
            except OSError as exc:
                self.send_error(500, "tokens.mjs: node did not start (%s)" % exc)
                return None
            if out.returncode != 0:
                self.send_error(500, "tokens.mjs: " + out.stderr.decode("utf-8", "replace")[:200])
                return None
            body = out.stdout
            if self.dev and rel.endswith(".dc.html"):
                body = with_live_tag(body)
            return self.send_bytes(body, "text/html; charset=utf-8")
        if os.path.isdir(path):
            # A DIRECTORY REQUEST IS A PAGE REQUEST, AND IT WAS NOT BEING GZIPPED.
            #
            # Every route on this site ends in a slash, so every single page went
            # through the branch below and came back RAW: 907 KB for the start
            # page instead of 134 KB. Found 12.9.2026 by measuring the same file
            # twice - "/" scored 45 on mobile and "/index.html", byte for byte
            # the same page, scored far better. Vercel compresses; the tool that
            # exists to be the honest comparison baseline did not, and every
            # mobile number this project has recorded was taken against a page
            # 6.8x too heavy.
            #
            # Resolve the index here so the compression path below sees a file.
            # Only when the URL already ends in a slash - without that, the
            # parent's redirect is the correct answer and must not be skipped.
            index = os.path.join(path, "index.html")
            if self.path.split("?")[0].endswith("/") and os.path.isfile(index):
                path = index
            else:
                return super().send_head()
        if not (path.endswith(COMPRESSIBLE) and "gzip" in self.headers.get("Accept-Encoding", "")):
            return super().send_head()
        try:
            raw = open(path, "rb").read()
        except OSError:
            self.send_error(404)
            return None
        if self.dev and path.endswith(".html"):
            raw = with_live_tag(raw)
        body = gzip.compress(raw, 6)
        self.send_response(200)
        self.send_header("Content-Type", self.guess_type(path))
        self.send_header("Content-Encoding", "gzip")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        return io.BytesIO(body)

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("-")]
    Handler.dev = "--dev" in sys.argv
    port = int(args[0]) if args else 8897
    print("serving %s on 127.0.0.1:%d (%s)" %
          (ROOT, port, "DEV, no-store" if Handler.dev else "MEASURE, production headers"))
    print("  security headers from vercel.json: %s" %
          (", ".join(k for k, _ in SECURITY_HEADERS) or "none"))
    ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
