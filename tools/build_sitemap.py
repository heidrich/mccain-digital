# Writes sitemap.xml from the pages actually present on disk, so a new page
# cannot be forgotten and a deleted one cannot linger as a 404 in the index.
import io
import os
import time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SITE = "https://mccain-digital.com"

# path -> (priority, changefreq). Order is the order in the file.
PAGES = [
    # STATE, not intent: today the relaunch ships index.html plus the brand
    # guide and the four legal pages. The four service pages, an about page and
    # a contact page ARE planned (owner, 11.9.), and so are project pages -
    # the first one for whatever-recall, whose content and URL are to be moved
    # onto this domain and redirected. None of them are built yet.
    # Add each one here as it lands: the checks above refuse to write a sitemap
    # that lists a file which is not on disk, and refuse to leave an .html on
    # disk out of the sitemap. So this list cannot silently drift either way.
    ("index.html", "1.0", "monthly"),
    ("brand-guide.html", "0.5", "yearly"),
    ("legal/imprint.html", "0.3", "yearly"),
    ("legal/privacy.html", "0.3", "yearly"),
    ("legal/terms.html", "0.3", "yearly"),
    ("legal/withdrawal.html", "0.3", "yearly"),
]

missing = [p for p, _, _ in PAGES if not os.path.exists(os.path.join(ROOT, p.replace("/", os.sep)))]
if missing:
    raise SystemExit("listed but not on disk: " + ", ".join(missing))

on_disk = set()
for base, dirs, files in os.walk(ROOT):
    # Everything that is on disk but never served. "old 2" is the retired v3
    # site and mccain-design-system is the Claude Design export the page is
    # built FROM - both are in .vercelignore, and both are full of .html that
    # would otherwise trip the "on disk but not in the sitemap" check below.
    dirs[:] = [d for d in dirs if d not in
               ("archive", "internal", "preview", "fonts", "img", "team",
                "tools", "vendor", "node_modules", ".git", "audit",
                "mccain-design-system", "assets-src", "v3-proposal",
                # brand/ holds mccain-signatur.html - an email signature
                # snippet, an asset rather than a page of the site
                "brand", "legal-src")]
    for f in files:
        if f.endswith(".html") and f != "404.html":
            on_disk.add(os.path.relpath(os.path.join(base, f), ROOT).replace(os.sep, "/"))
unlisted = on_disk - {p for p, _, _ in PAGES}
if unlisted:
    raise SystemExit("on disk but not in the sitemap list: " + ", ".join(sorted(unlisted)))

out = ['<?xml version="1.0" encoding="UTF-8"?>',
       '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
for rel, prio, freq in PAGES:
    loc = SITE + "/" if rel == "index.html" else SITE + "/" + rel
    mod = time.strftime("%Y-%m-%d", time.gmtime(os.path.getmtime(os.path.join(ROOT, rel.replace("/", os.sep)))))
    out += ["  <url>",
            "    <loc>%s</loc>" % loc,
            "    <lastmod>%s</lastmod>" % mod,
            "    <changefreq>%s</changefreq>" % freq,
            "    <priority>%s</priority>" % prio,
            "  </url>"]
out.append("</urlset>")

io.open(os.path.join(ROOT, "sitemap.xml"), "w", encoding="utf-8", newline="\n").write("\n".join(out) + "\n")
print("sitemap.xml:", len(PAGES), "URLs")
