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
    ("index.html", "1.0", "monthly"),
    ("contact.html", "0.9", "yearly"),
    ("services/ai-tools.html", "0.9", "monthly"),
    ("services/web-apps.html", "0.9", "monthly"),
    ("services/websites.html", "0.9", "monthly"),
    ("services/software.html", "0.9", "monthly"),
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
    dirs[:] = [d for d in dirs if d not in
               ("old", "_parked", "preview", "fonts", "img", "team", "tools", "node_modules", ".git")]
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
