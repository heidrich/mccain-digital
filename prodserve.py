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
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

# Derived from where this file lives, never written out. An absolute path
# hardcoded here kept serving a folder that no longer existed once the site
# moved to the repository root, and every page answered 404 with no error in
# the log — the server was healthy, it was pointed at nothing.
ROOT = os.path.dirname(os.path.abspath(__file__))
COMPRESSIBLE = (".html", ".css", ".js", ".svg", ".json", ".txt", ".xml")
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


class Handler(SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    dev = False

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
        if not path.startswith("/mccain-design-system/"):
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

    def send_head(self):
        path = self.translate_path(self.path)
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
