# Generates the four v3 legal pages.
#
# The BODY of each page is lifted verbatim out of the live site — that
# wording is legally reviewed and must not be re-typed or paraphrased.
# Only the shell around it (nav, footer, scripts) is ours.
import io
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))          # <repo>/tools
SITE = os.path.dirname(HERE)                               # <repo> — the site itself
# The reviewed wording still lives with the retired site under old/. It is the
# source of record for the legal text; this script only ever rewrites hrefs.
SRC = os.path.join(SITE, "old", "upload", "legal")
DST = os.path.join(SITE, "legal")

# The imprint is the page search engines read for the company identity, so it
# carries the Organization graph. The other three need none.
IMPRINT_LD = """  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "McCain Digital",
    "url": "https://mccain-digital.com/",
    "email": "info@mccain-digital.com",
    "telephone": "+49 170 59 222 03",
    "foundingDate": "2016",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Holderweg 1",
      "postalCode": "86869",
      "addressLocality": "Oberostendorf",
      "addressRegion": "Bavaria",
      "addressCountry": "DE"
    }
  }
  </script>
"""

PAGES = [
    ("imprint.html", "Imprint",
     "Information pursuant to section 5 DDG, contact details, tax numbers and liability notices for McCain Digital.",
     IMPRINT_LD),
    ("privacy.html", "Privacy",
     "How McCain Digital handles personal data: hosting, contact form, cookies, analytics and your rights under the GDPR.",
     ""),
    ("terms.html", "Terms",
     "General terms and conditions for services provided by McCain Digital.",
     ""),
    ("withdrawal.html", "Withdrawal",
     "Right of withdrawal and the model withdrawal form for consumers.",
     ""),
]

SHELL = """<!DOCTYPE html>
<!-- data-root tells menu.js and common.js how far the site root is from here.

     BODY TEXT IS VERBATIM from the live site (old/upload/legal/{src}).
     It is legally reviewed wording — regenerate this page with
     tools/build_legal.py rather than editing the prose by hand.
     The social/canonical block is added afterwards by tools/add_meta.py. -->
<html lang="en" data-theme="dark" data-root="..">

<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title} — McCain Digital</title>
  <meta name="robots" content="noindex, nofollow">
  <meta name="description" content="{desc}">
  <link rel="icon" href="../favicon.svg" type="image/svg+xml">
  <link rel="preload" href="../fonts/schibsted-normal-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="../v3.css">
{ld}</head>

<body>

  <div class="prog" aria-hidden="true"></div>
  <canvas id="pacbar" aria-hidden="true"></canvas>

  <!-- ================= NAV ================= -->
  <nav class="nav" id="nav" aria-label="Main navigation">
    <a class="logo" href="../index.html#top">mccain <i>digital</i><span class="sr-only"> &mdash; home</span></a>

    <span class="nav-status">
      <i class="ns-dot" aria-hidden="true"></i>
      <b>M&uuml;nchen</b> &middot; available for new projects
    </span>

    <div class="nav-right">
      <a class="nav-link hide-s" href="../index.html#work">Work</a>
      <a class="nav-link hide-s" href="../index.html#services">Services</a>
      <a class="nav-link hide-s" href="../index.html#ai">AI</a>
      <button class="menu-t" type="button" data-menu-open aria-haspopup="dialog" aria-controls="cmenu">
        <i aria-hidden="true"></i>Menu <kbd data-menu-key>&#8984;K</kbd>
      </button>
      <button class="theme-t" id="themeT" type="button" aria-label="Switch between light and dark">
        <svg class="t-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 2v2.6M12 19.4V22M2 12h2.6M19.4 12H22M4.9 4.9l1.9 1.9M17.2 17.2l1.9 1.9M19.1 4.9l-1.9 1.9M6.8 17.2l-1.9 1.9" />
        </svg>
        <svg class="t-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
          <path d="M20 14.2A8.4 8.4 0 1 1 9.8 4a6.6 6.6 0 0 0 10.2 10.2Z" />
        </svg>
      </button>
      <a class="btn" href="../contact.html">Start a project</a>
    </div>
  </nav>

  <main id="top">
    <section class="band">
      <div class="wrap">
        <nav class="crumb" aria-label="Breadcrumb">
          <a href="../index.html#top">Home</a><i aria-hidden="true">/</i>
          <b aria-current="page">{title}</b>
        </nav>

        <article class="legal">
{body}
          <p class="l-updated">Design prototype &middot; wording taken unchanged from the live site</p>
        </article>
      </div>
    </section>
  </main>

  <!-- ================= FOOTER ================= -->
  <footer class="foot">
    <div class="wrap foot-in">
      <a class="logo" href="../index.html#top">mccain <i>digital</i></a>
      <span>&copy; 2026 &middot; Bavaria, Germany</span>
      <span class="nav-status"><i class="ns-dot" aria-hidden="true"></i> available for new projects</span>
      <div class="foot-links">
        <a href="../index.html#work">Work</a>
        <a href="../index.html#services">Services</a>
        <a href="../index.html#ai">AI</a>
        <a href="../contact.html">Contact</a>
      </div>
      <div class="foot-legal">
        <a href="imprint.html">Imprint</a>
        <a href="privacy.html">Privacy</a>
        <a href="terms.html">Terms</a>
        <a href="withdrawal.html">Withdrawal</a>
      </div>
    </div>
  </footer>

  <!-- ORDER IS LOAD-BEARING - see index.html -->
  <script src="../data.js" defer></script>
  <script src="../pixel-engine.js" defer></script>
  <script src="../common.js" defer></script>
  <script src="../pacman.js" defer></script>
  <script src="../menu.js" defer></script>
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
    # The prose links to the other legal pages with root-absolute paths, which
    # only resolve when the site is served from a domain root. Make them
    # relative so the proposal also works from a sub-folder or file://.
    # This rewrites HREFS ONLY — never a word of the wording.
    inner = inner.replace('href="/legal/', 'href="')
    inner = inner.replace('href="/"', 'href="../index.html"')
    # re-indent to sit inside <article class="legal">
    lines = [ln.rstrip() for ln in inner.strip("\n").split("\n")]
    base = min((len(ln) - len(ln.lstrip()) for ln in lines if ln.strip()), default=0)
    return "\n".join(("          " + ln[base:]) if ln.strip() else "" for ln in lines)


os.makedirs(DST, exist_ok=True)
for src, title, desc, ld in PAGES:
    body = body_of(os.path.join(SRC, src))
    html = SHELL.format(src=src, title=title, desc=desc, body=body, ld=ld)
    out = os.path.join(DST, src)
    io.open(out, "w", encoding="utf-8", newline="\n").write(html)
    print("wrote", out, len(html), "bytes,", body.count("<h2") , "h2 sections")
