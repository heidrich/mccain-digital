# Generates the four legal pages in the 2026 relaunch design.
#
# THE BODY OF EACH PAGE IS VERBATIM from the live site (archive/site-apache/upload/legal/*).
# That wording is legally reviewed and must not be re-typed, paraphrased or
# translated here. This script only ever builds the shell around it and rewrites
# hrefs. If the wording has to change, it changes at the source and this runs
# again.
#
#     python tools/build_legal.py
#
# NOTE ON LANGUAGE - open decision for the owner:
# The reviewed wording is ENGLISH, because the site it was written for was
# English. The relaunched site is German-first. These pages therefore declare
# lang="en" while the rest of the site is lang="de". That is honest markup for
# the text that is actually there, but a German company's Impressum being
# English-only is a question for a lawyer, not for this script - so it is
# flagged rather than silently "fixed" by machine-translating legal text.
import io
import os
import json
import re

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)
SRC = os.path.join(SITE, "archive", "site-apache", "upload", "legal")
DST = os.path.join(SITE, "legal")
ORIGIN = "https://mccain-digital.com"

# One switch for the whole site - see site.config.json. Kept in a file rather
# than in each generator because three tools emit this tag and a fourth serves
# it as a header; tools/verify_site.mjs fails if any of them disagree.
with io.open(os.path.join(SITE, "site.config.json"), encoding="utf-8") as _f:
    CONFIG = json.load(_f)
ROBOTS = "noindex, follow" if CONFIG["noindex"] else "index, follow, max-snippet:-1"

# The imprint is the page search engines read for the company identity, so it
# carries the Organization graph. The other three need none.
IMPRINT_LD = """
<script type="application/ld+json">
{
 "@context": "https://schema.org",
 "@type": "Organization",
 "@id": "https://mccain-digital.com/#studio",
 "name": "McCain Digital",
 "url": "https://mccain-digital.com/",
 "email": "info@mccain-digital.com",
 "telephone": "+49 170 59 222 03",
 "foundingDate": "2016",
 "logo": "https://mccain-digital.com/brand/mccain-mark-free-color.svg",
 "address": {
  "@type": "PostalAddress",
  "streetAddress": "Holderweg 1",
  "postalCode": "86869",
  "addressLocality": "Oberostendorf",
  "addressRegion": "Bayern",
  "addressCountry": "DE"
 },
 "founder": [
  { "@type": "Person", "name": "Kathrin Mc Cain" },
  { "@type": "Person", "name": "Christian Mc Cain" }
 ]
}
</script>"""

PAGES = [
    ("imprint.html", "Imprint", "Impressum",
     "Information pursuant to section 5 DDG, contact details, tax numbers and "
     "liability notices for McCain Digital.", IMPRINT_LD),
    ("privacy.html", "Privacy", "Datenschutz",
     "How McCain Digital handles personal data: hosting, contact form, cookies, "
     "analytics and your rights under the GDPR.", ""),
    ("terms.html", "Terms", "AGB",
     "General terms and conditions for services provided by McCain Digital.", ""),
    ("withdrawal.html", "Withdrawal", "Widerruf",
     "Right of withdrawal and the model withdrawal form for consumers.", ""),
]

# Only the values actually used, taken from mccain-design-system/tokens/*.css.
# Inlined rather than linked: four small pages, and one fewer render-blocking
# request beats the shared-cache win at this size.
CSS = """
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:#fff;color:#0A2540;
  font-family:'Instrument Sans',system-ui,-apple-system,sans-serif;
  -webkit-font-smoothing:antialiased}
::selection{background:rgba(99,91,255,.22)}
a{color:#4D47C7;text-decoration:none}
a:hover{color:#0A2540;text-decoration:underline}
:focus-visible{outline:2px solid #635BFF;outline-offset:2px;
  box-shadow:0 0 0 4px rgba(99,91,255,.28);border-radius:4px}

.skip{position:absolute;left:-9999px;top:0;z-index:10;background:#fff;
  padding:12px 18px;border-radius:8px;box-shadow:0 0 0 1px #E3E8EE}
.skip:focus{left:16px;top:16px}

header.site{position:sticky;top:0;z-index:5;height:72px;display:flex;
  align-items:center;justify-content:space-between;
  padding:0 clamp(20px,4vw,48px);
  background:rgba(255,255,255,.92);backdrop-filter:blur(14px);
  box-shadow:0 1px 0 #E3E8EE}
.lockup{display:flex;align-items:center;gap:12px;color:#0A2540;font-weight:600;
  font-size:17px;letter-spacing:-.02em}
.lockup:hover{text-decoration:none;color:#0A2540}
.lockup img{display:block}
.lockup .sep{color:#C6CEDA;font-weight:400}
.lockup .kind{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:12px;
  letter-spacing:.06em;color:#727F96;font-weight:400}
.back{display:inline-flex;align-items:center;gap:8px;font-size:15px;
  font-weight:600;color:#0A2540}
.back:hover{color:#4D47C7;text-decoration:none}

main{padding:clamp(48px,7vw,96px) clamp(20px,4vw,48px) 0}
.col{max-width:720px;margin:0 auto}
.crumb{font-size:13px;color:#727F96;margin:0 0 18px}
.crumb a{color:#727F96}
.crumb b{color:#0A2540;font-weight:600}
.crumb i{font-style:normal;padding:0 8px;color:#C6CEDA}
.eyebrow{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:12px;
  letter-spacing:.06em;color:#4D47C7;margin:0 0 12px;text-transform:uppercase}

.legal h1{font-size:clamp(32px,4.2vw,48px);line-height:1.1;letter-spacing:-.03em;
  font-weight:700;margin:0 0 28px;text-wrap:balance}
.legal h2{font-size:clamp(20px,2.2vw,24px);line-height:1.25;letter-spacing:-.02em;
  font-weight:600;margin:44px 0 12px;text-wrap:balance}
.legal p{font-size:17px;line-height:1.65;color:#425466;margin:0 0 16px;
  text-wrap:pretty}
.legal ul{margin:0 0 16px;padding-left:22px}
.legal li{font-size:17px;line-height:1.65;color:#425466;margin:0 0 8px}
.legal strong{color:#0A2540;font-weight:600}
.legal code{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:14px;
  background:#F6F9FC;border-radius:6px;padding:2px 6px;color:#0A2540}
.legal table{width:100%;border-collapse:collapse;margin:0 0 20px;font-size:15px}
.legal th,.legal td{text-align:left;padding:12px 14px;
  border-bottom:1px solid #E3E8EE;color:#425466;vertical-align:top}
.legal th{color:#0A2540;font-weight:600;background:#F6F9FC}
.legal .note,.legal .form-box{background:#F6F9FC;border-radius:16px;
  padding:22px 24px;margin:0 0 20px;box-shadow:0 0 0 1px #E3E8EE}
.legal .note p:last-child,.legal .form-box p:last-child{margin-bottom:0}
.legal .l-actions{display:flex;flex-wrap:wrap;gap:12px;margin:24px 0}
.legal .l-btn{display:inline-flex;align-items:center;height:44px;padding:0 20px;
  border-radius:999px;background:#635BFF;color:#fff;font-weight:600;font-size:15px}
.legal .l-btn:hover{background:#7A73FF;color:#fff;text-decoration:none}
.l-updated{margin:56px 0 0;padding-top:20px;border-top:1px solid #E3E8EE;
  font-size:13px;color:#727F96}

footer.site{margin-top:clamp(64px,8vw,110px);background:#0A1F44;color:#C5D0F5;
  padding:clamp(40px,5vw,64px) clamp(20px,4vw,48px)}
footer.site .in{max-width:720px;margin:0 auto;display:flex;flex-wrap:wrap;
  gap:16px 28px;align-items:center;font-size:14px}
footer.site a{color:#C5D0F5}
footer.site a:hover{color:#fff}
footer.site .legal-links{display:flex;flex-wrap:wrap;gap:16px;
  width:100%;padding-top:18px;margin-top:4px;
  border-top:1px solid rgba(255,255,255,.08)}
footer.site .legal-links a[aria-current]{color:#fff;font-weight:600}

@media (prefers-reduced-motion:reduce){*{animation:none!important;
  transition:none!important;scroll-behavior:auto!important}}
"""

SHELL = """<!DOCTYPE html>
<!-- GENERATED - do not edit by hand.

     Body text is VERBATIM from archive/site-apache/upload/legal/{src}; that wording is legally
     reviewed. Regenerate with `python tools/build_legal.py` rather than editing
     the prose here. The shell (header, footer, styles) is ours.

     lang="en" is deliberate: the reviewed wording is English while the rest of
     the site is German. See the note at the top of tools/build_legal.py. -->
<html lang="en">

<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} — McCain Digital</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{origin}/legal/{src}">
<meta name="robots" content="{ROBOTS}">
<meta name="theme-color" content="#635BFF">
<meta property="og:type" content="article">
<meta property="og:site_name" content="McCain Digital">
<meta property="og:locale" content="en_GB">
<meta property="og:url" content="{origin}/legal/{src}">
<meta property="og:title" content="{title} — McCain Digital">
<meta property="og:description" content="{desc}">
<meta property="og:image" content="{origin}/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="../brand/mccain-favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="../brand/apple-touch-icon-180.png">
{preloads}
<link rel="stylesheet" href="../fonts/fonts.css">
<style>{css}</style>{ld}
</head>

<body>
<a class="skip" href="#content">Skip to content</a>

<header class="site">
  <a class="lockup" href="../index.html">
    <img src="../brand/mccain-mark-free-color.svg" alt="" width="28" height="28">
    <span>mccain digital</span>
    <span class="sep">/</span>
    <span class="kind">{kind}</span>
  </a>
  <a class="back" href="../index.html">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M19 12H5M12 19l-7-7 7-7"/>
    </svg>
    Zur Startseite
  </a>
</header>

<main id="content">
  <div class="col">
    <nav class="crumb" aria-label="Breadcrumb">
      <a href="../index.html">Start</a><i aria-hidden="true">/</i><b aria-current="page">{kind}</b>
    </nav>
    <p class="eyebrow">{kind}</p>
    <article class="legal">
{body}
      <p class="l-updated">Wording taken unchanged from the reviewed live-site text.</p>
    </article>
  </div>
</main>

<footer class="site">
  <div class="in">
    <a class="lockup" href="../index.html" style="color:#fff">
      <img src="../brand/mccain-mark-free-white.svg" alt="" width="24" height="24">
      <span>mccain digital</span>
    </a>
    <span>© {year} · Bayern, Deutschland</span>
    <nav class="legal-links" aria-label="Legal">
{footlinks}
    </nav>
  </div>
</footer>

</body>

</html>
"""


def body_of(path):
    s = io.open(path, encoding="utf-8").read()
    m = re.search("<main[^>]*>(.*?)</main>", s, re.S)
    if not m:
        raise SystemExit("no <main> in " + path)
    inner = m.group(1)
    # the live pages carry their own back-link / updated stamp; drop only
    # navigational chrome, never prose
    inner = re.sub('<a class="l-back"[^>]*>.*?</a>', "", inner, flags=re.S)
    inner = re.sub(r'<nav class="crumb".*?</nav>', "", inner, flags=re.S)
    inner = re.sub(r'<p class="l-updated">.*?</p>', "", inner, flags=re.S)
    # The prose links to the other legal pages with root-absolute paths, which
    # only resolve when the site is served from a domain root - not on a preview
    # deploy and not from a sub-folder. Make them relative.
    # THIS REWRITES HREFS ONLY - never a word of the wording.
    inner = inner.replace('href="/legal/', 'href="')
    inner = inner.replace('href="/"', 'href="../index.html"')
    lines = [ln.rstrip() for ln in inner.strip("\n").split("\n")]
    base = min((len(ln) - len(ln.lstrip()) for ln in lines if ln.strip()), default=0)
    return "\n".join(("      " + ln[base:]) if ln.strip() else "" for ln in lines)


def main():
    fonts = os.path.join(SITE, "fonts")
    if not os.path.isdir(fonts):
        raise SystemExit("fonts/ is missing - run tools/vendor_assets.py first")
    preloads = "\n".join(
        f'<link rel="preload" href="../fonts/{f}" as="font" type="font/woff2" crossorigin>'
        for f in sorted(os.listdir(fonts))
        if f.endswith("-normal-latin.woff2")
    )
    if preloads.count("<link") != 2:
        raise SystemExit("expected 2 upright latin faces in fonts/ - "
                         "run tools/vendor_assets.py")

    os.makedirs(DST, exist_ok=True)
    for src, title, kind, desc, ld in PAGES:
        footlinks = "\n".join(
            '      <a href="{h}"{cur}>{k}</a>'.format(
                h=p[0], k=p[2], cur=' aria-current="page"' if p[0] == src else ""
            )
            for p in PAGES
        )
        body = body_of(os.path.join(SRC, src))
        html = SHELL.format(
            src=src, title=title, kind=kind, desc=desc, body=body, ld=ld,
            css=CSS, preloads=preloads, origin=ORIGIN, year=2026,
            footlinks=footlinks, ROBOTS=ROBOTS,
        )
        out = os.path.join(DST, src)
        io.open(out, "w", encoding="utf-8", newline="\n").write(html)
        print(f"  {('legal/' + src):<24} {len(html):>7,} bytes   "
              f"{body.count('<h2')} sections")


if __name__ == "__main__":
    main()
