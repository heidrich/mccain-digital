"""Serve v3-proposal the way a real host would: gzip + cache headers.

python -m http.server sends everything raw and uncached, which makes
render-blocking CSS look ~6x heavier than it is in production and fails
both cache audits outright. This is the honest comparison baseline.
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

    def end_headers(self):
        path = self.path.split("?")[0]
        if path.endswith(".html") or path.endswith("/"):
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
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8897
    ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
