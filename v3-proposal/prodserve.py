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
import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = r"C:\Users\Christian\Documents\GitHub\mccain-digital\v3-proposal"
COMPRESSIBLE = (".html", ".css", ".js", ".svg", ".json", ".txt", ".xml")
IMMUTABLE = (".woff2", ".webp", ".jpg", ".png", ".svg", ".css", ".js")


class Handler(SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    dev = False

    def end_headers(self):
        path = self.path.split("?")[0]
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
    ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
