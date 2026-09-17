"""Pull the two third-party runtime dependencies into the repository.

The design component as exported loads React from unpkg.com and its fonts from
fonts.googleapis.com. Both are wrong for this site, for two separate reasons:

  LEGAL   Every visitor's IP is handed to a US CDN before they can consent.
          For Google Fonts specifically a German court has already ruled on
          this (LG Muenchen I, 3 O 17493/20, 20.01.2022) and the site carries
          a Datenschutzerklaerung that would have to declare the transfer.
          Self-hosting removes the transfer instead of declaring it.

  SPEED   Two extra origins means two extra DNS lookups and TLS handshakes on
          the critical path, and the font CSS is render-blocking. The retired
          v3 site self-hosted its font for exactly this reason and measured
          4x100 in Lighthouse.

Both families are OFL licensed, so redistributing the .woff2 files inside this
repository is permitted.

    python tools/vendor_assets.py

Idempotent: re-running overwrites with the same bytes. Prints every file it
writes, and fails loudly rather than leaving a half-populated folder behind.
"""
import io
import os
import re
import sys
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)

# A modern UA, or Google serves the legacy .ttf format to what it thinks is an
# old browser - which is 4x the bytes and no unicode-range subsetting.
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")

FONT_CSS = ("https://fonts.googleapis.com/css2"
            "?family=Instrument+Sans:ital,wght@0,400..700;1,400..700"
            "&family=JetBrains+Mono:wght@400;500&display=swap")

# German needs latin; latin-ext covers the rest of the European diacritics that
# a client name might carry. Cyrillic, Greek and Vietnamese are dead weight on
# a German/English site - dropping them is most of the saving.
KEEP_SUBSETS = ("latin", "latin-ext")

VENDOR = [
    ("https://unpkg.com/react@18.3.1/umd/react.production.min.js",
     "tools/vendor-build/react-18.3.1.production.min.js"),
    ("https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js",
     "tools/vendor-build/react-dom-18.3.1.production.min.js"),
]


def get(url, binary=False):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        data = r.read()
    return data if binary else data.decode("utf-8")


def write(relpath, data):
    p = os.path.join(SITE, relpath)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    mode = "wb" if isinstance(data, bytes) else "w"
    kw = {} if isinstance(data, bytes) else {"encoding": "utf-8", "newline": "\n"}
    with io.open(p, mode, **kw) as f:
        f.write(data)
    print(f"  {relpath:<52} {len(data):>8,} bytes")
    return p


def main():
    print("react (UMD production builds, tools/prerender.mjs's build-time renderer expects):")
    for url, dest in VENDOR:
        write(dest, get(url, binary=True))

    print("\nfonts:")
    css = get(FONT_CSS)

    # The stylesheet is a run of "/* subset */ @font-face{...}" pairs. Keep the
    # pairs whose subset we want, download each src, and repoint it at fonts/.
    blocks = re.findall(r"/\*\s*([\w-]+)\s*\*/\s*(@font-face\s*\{[^}]*\})", css)
    if not blocks:
        sys.exit("ABORT: could not parse the Google Fonts stylesheet - format changed?")

    out, seen, kept = [], {}, 0
    for subset, block in blocks:
        if subset not in KEEP_SUBSETS:
            continue
        m = re.search(r"url\((https://fonts\.gstatic\.com/[^)]+)\)", block)
        if not m:
            sys.exit(f"ABORT: no gstatic url in a {subset} block")
        url = m.group(1)
        if url not in seen:
            # Name the file after what it IS - family, style, subset - and never
            # after Google's filename. Those differ between the roman and the
            # italic face only by the CASE of one letter (pxitypc9vs against
            # pxiTypc9vs), so on Windows the second download silently overwrote
            # the first and the roman face was served as italic; on Linux the
            # other name then 404ed. It survived local testing precisely because
            # NTFS is case-insensitive and Vercel's filesystem is not.
            fam = re.search(r"font-family:\s*'([^']+)'", block)
            fam = fam.group(1).lower().replace(" ", "-") if fam else "font"
            sty = re.search(r"font-style:\s*(\w+)", block)
            sty = sty.group(1).lower() if sty else "normal"
            local = f"fonts/{fam}-{sty}-{subset}.woff2"
            if local in seen.values():
                sys.exit(f"ABORT: two different urls both want {local}")
            write(local, get(url, binary=True))
            seen[url] = local
        out.append(f"/* {subset} */\n" + block.replace(url, "../" + seen[url]).strip())
        kept += 1

    # The bug above was invisible because nothing counted. One file per distinct
    # url, or something collided again.
    on_disk = {os.path.basename(p) for p in seen.values()}
    if len(on_disk) != len(seen):
        sys.exit(f"ABORT: {len(seen)} urls collapsed onto {len(on_disk)} filenames")

    if not kept:
        sys.exit("ABORT: no font faces survived the subset filter")

    header = (
        "/* Self-hosted Instrument Sans + JetBrains Mono (both OFL).\n"
        " *\n"
        " * Generated by tools/vendor_assets.py - do not hand-edit; re-run the\n"
        " * script instead. Served from this repository on purpose: the Google\n"
        " * Fonts CDN would hand every visitor's IP to a US server before the\n"
        " * page can ask, which is the transfer LG Muenchen I ruled on in 2022.\n"
        " *\n"
        " * The url()s are written ../fonts/... because this file is loaded from\n"
        " * fonts/fonts.css - a bare fonts/x.woff2 would resolve to fonts/fonts/.\n"
        " */\n"
    )
    write("fonts/fonts.css", header + "\n".join(out) + "\n")
    print(f"\n  {kept} @font-face rules kept ({', '.join(KEEP_SUBSETS)}), "
          f"{len(blocks) - kept} dropped")


if __name__ == "__main__":
    main()
