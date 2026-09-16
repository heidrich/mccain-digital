#!/usr/bin/env python3
"""Lokaler Server, der eine gebaute Seite so ausliefert wie Produktion.

Warum: `python3 -m http.server` schickt alles unkomprimiert und ohne
Cache-Header - das macht Render-Blocking-CSS um ein Vielfaches schwerer
als in Produktion und lässt jeden Cache-Audit durchfallen. Konkreter
Schaden in einem realen Projekt: Verzeichnis-Routen ("/pfad/") wurden vor
der Gzip-Prüfung nicht auf index.html aufgelöst und liefen unkomprimiert
raus - eine Startseite maß sich dadurch 6,8x zu schwer, obwohl derselbe
Inhalt unter "/pfad/index.html" korrekt komprimiert wurde. Deshalb löst
dieses Skript die Route ZUERST auf und entscheidet erst danach über
Kompression und Header.

Zwei Modi, nicht mischen:
    MESSEN  (ohne --dev)  Produktions-Header, echtes Caching - die
                           ehrliche Basis für Lighthouse & Co.
    ANSEHEN (mit --dev)   `Cache-Control: no-store` auf allem, nur zum
                           Ansehen - NIE zum Messen: ohne Cache sieht
                           jede Navigation wie ein Duplikat-Download
                           aus, was es in Produktion gar nicht gibt.

Beispiele:
    python3 prodserve.py dist 8910
    python3 prodserve.py dist 8910 --headers vercel.json
    python3 prodserve.py dist 8910 --dev
"""
import argparse
import gzip
import json
import mimetypes
import os
import re
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlsplit

try:
    import brotli
except ImportError:
    brotli = None

# Text formats worth gzipping; wasm is already dense binary and left out.
COMPRESSIBLE_EXT = {
    ".html", ".css", ".js", ".mjs", ".json", ".svg", ".xml", ".txt",
}
HASHED_RE = re.compile(r"[.-][0-9a-f]{8,}\.")
ASSET_DIR_HINTS = ("/_next/static/", "/assets/", "/static/")
DEFAULT_HEADERS = (("X-Content-Type-Options", "nosniff"),)
SKIP_HEADER_KEYS = ("Cache-Control", "X-Robots-Tag")
EXTRA_TYPES = {
    ".html": "text/html", ".css": "text/css", ".js": "text/javascript",
    ".mjs": "text/javascript", ".json": "application/json",
    ".svg": "image/svg+xml", ".xml": "application/xml",
    ".txt": "text/plain", ".wasm": "application/wasm",
    ".woff2": "font/woff2",
}


def compile_source(source):
    """vercel.json `source` -> compiled, anchored regex.

    Supports a ready-made regex like "/(.*)" (used as-is) and a simple
    glob like "/assets/*" (escaped, with "*" turned into ".*").
    """
    if not source:
        return None
    if any(c in source for c in "(){}[]\\"):
        pattern = source
    else:
        pattern = re.escape(source).replace(r"\*", ".*")
    pattern = pattern if pattern.startswith("^") else "^" + pattern
    pattern = pattern if pattern.endswith("$") else pattern + "$"
    try:
        return re.compile(pattern)
    except re.error as exc:
        print(f"warning: bad source pattern {source!r}: {exc}",
              file=sys.stderr)
        return None


def load_header_rules(path):
    """Read a vercel.json `headers` array into (regex, [(key, value)]).

    Cache-Control and X-Robots-Tag are dropped: Cache-Control is this
    script's own job, X-Robots-Tag would silently skew a local audit.
    """
    try:
        with open(path, encoding="utf-8") as fh:
            conf = json.load(fh)
    except (OSError, ValueError) as exc:
        print(f"warning: {path} unreadable ({exc}) - using minimal headers",
              file=sys.stderr)
        return []
    rules = []
    for block in conf.get("headers", []):
        pattern = compile_source(block.get("source", ""))
        pairs = [(h["key"], h["value"]) for h in block.get("headers", [])
                 if h.get("key") not in SKIP_HEADER_KEYS]
        if pattern and pairs:
            rules.append((pattern, pairs))
    return rules


def is_hashed_asset(fs_path):
    """True for a content-hashed filename or a typical build-output dir."""
    if HASHED_RE.search(os.path.basename(fs_path)):
        return True
    normalized = fs_path.replace(os.sep, "/")
    return any(hint in normalized for hint in ASSET_DIR_HINTS)


def content_type_for(path):
    """Content-Type, with a charset for text formats."""
    ext = os.path.splitext(path)[1].lower()
    ctype = EXTRA_TYPES.get(ext)
    if ctype is None:
        ctype = mimetypes.guess_type(path)[0] or "application/octet-stream"
    if ctype.startswith("text/") or ctype in (
            "application/json", "image/svg+xml", "application/xml"):
        ctype += "; charset=utf-8"
    return ctype


def make_handler(root, dev, quiet, header_rules):
    """Build a request handler bound to this invocation's settings."""

    class Handler(BaseHTTPRequestHandler):
        protocol_version = "HTTP/1.1"
        server_version = "prodserve/1.0"

        def resolve_path(self):
            """URL -> filesystem path; directory routes -> index.html.

            Runs BEFORE compression/headers - the bug this fixes served
            a directory route raw because it never resolved to a file.
            """
            url_path = unquote(urlsplit(self.path).path)
            rel = os.path.normpath(url_path).lstrip("/")
            if ".." in rel.split(os.sep):
                return None
            fs_path = os.path.join(root, rel) if rel else root
            if os.path.isfile(fs_path) and not url_path.endswith("/"):
                return fs_path
            for candidate in (os.path.join(fs_path, "index.html"),
                               fs_path + ".html"):
                if os.path.isfile(candidate):
                    return candidate
            return None

        def do_GET(self):
            self.handle_request(send_body=True)

        def do_HEAD(self):
            self.handle_request(send_body=False)

        def handle_request(self, send_body):
            fs_path = self.resolve_path()
            raw = b""
            if fs_path is not None:
                try:
                    with open(fs_path, "rb") as fh:
                        raw = fh.read()
                except OSError:
                    fs_path = None
            self.respond(fs_path, raw, send_body)

        def respond(self, fs_path, raw, send_body):
            """Compress, build headers and send - in that order, on the
            file resolve_path() already picked."""
            encoding, body = None, raw
            accept = self.headers.get("Accept-Encoding", "")
            ext = os.path.splitext(fs_path or "")[1].lower()
            if fs_path is not None and ext in COMPRESSIBLE_EXT:
                if brotli is not None and "br" in accept:
                    encoding, body = "br", brotli.compress(raw)
                elif "gzip" in accept:
                    encoding, body = "gzip", gzip.compress(raw, 6)
            headers = dict(DEFAULT_HEADERS)
            url_path = urlsplit(self.path).path
            for pattern, pairs in header_rules:
                if pattern.match(url_path):
                    headers.update(pairs)
            if fs_path is not None:
                headers["Content-Type"] = content_type_for(fs_path)
                if dev:
                    cache = "no-store"
                elif is_hashed_asset(fs_path):
                    cache = "public, max-age=31536000, immutable"
                else:
                    cache = "public, max-age=0, must-revalidate"
                headers["Cache-Control"] = cache
                if encoding:
                    headers["Content-Encoding"] = encoding
                    headers["Vary"] = "Accept-Encoding"
            headers["Content-Length"] = str(len(body))
            status = 200 if fs_path is not None else 404
            self.send_response(status)
            for key, value in headers.items():
                self.send_header(key, value)
            self.end_headers()
            if send_body and body and fs_path is not None:
                try:
                    self.wfile.write(body)
                except (BrokenPipeError, ConnectionResetError):
                    pass
            if not quiet:
                print(f"{self.command} {self.path} {status} "
                      f"{encoding or '-'} {len(body)}B")

        def log_message(self, fmt, *args):
            pass  # replaced by the line respond() prints above

    return Handler


def parse_args(argv):
    parser = argparse.ArgumentParser(
        prog="prodserve.py",
        description="Liefert eine gebaute Seite so aus wie Produktion "
                     "(gzip + Cache- + Security-Header).",
        epilog="Zwei Modi, nicht mischen: MESSEN (ohne --dev) mit "
               "Produktions-Headern und echtem Caching - die ehrliche "
               "Basis fuer Lighthouse & Co.; ANSEHEN (mit --dev) setzt "
               "Cache-Control: no-store auf allem, nur zum Ansehen, nie "
               "zum Messen.")
    parser.add_argument("root", help="directory to serve")
    parser.add_argument("port", type=int, help="port to listen on")
    parser.add_argument(
        "--dev", action="store_true",
        help="no-store everywhere - for viewing, never for measuring")
    parser.add_argument(
        "--headers", metavar="vercel.json",
        help="apply security headers from a vercel.json headers array")
    parser.add_argument(
        "--quiet", action="store_true", help="suppress per-request logging")
    return parser.parse_args(argv)


def main(argv=None):
    # Redirected to a file (`> server.log &`), stdout is block-buffered by
    # default - the per-request log line would sit invisible in the buffer
    # instead of being tailable while a Lighthouse run is in progress.
    sys.stdout.reconfigure(line_buffering=True)
    args = parse_args(sys.argv[1:] if argv is None else argv)
    root = os.path.abspath(args.root)
    if not os.path.isdir(root):
        print(f"error: not a directory: {root}", file=sys.stderr)
        return 1
    rules = load_header_rules(args.headers) if args.headers else []
    handler = make_handler(root, args.dev, args.quiet, rules)
    server = ThreadingHTTPServer(("127.0.0.1", args.port), handler)
    mode = "DEV, no-store" if args.dev else "MEASURE, production headers"
    print(f"serving {root} on http://127.0.0.1:{args.port}/ ({mode})")
    if args.headers:
        print(f"  headers from {args.headers}: {len(rules)} rule(s)")
    if brotli is None:
        print("  note: 'brotli' module not installed - gzip only")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    return 0


if __name__ == "__main__":
    sys.exit(main())
