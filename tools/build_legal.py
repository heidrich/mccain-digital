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
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pagekit as pk  # noqa: E402

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
LEGAL_CSS = """
.col{max-width:720px;margin:0 auto}
.legal h1{font-size:clamp(32px,4.2vw,48px);line-height:1.1;letter-spacing:-.03em;
  font-weight:700;margin:0 0 28px;text-wrap:balance}
.legal h2{font-size:clamp(20px,2.2vw,24px);line-height:1.25;letter-spacing:-.02em;
  font-weight:600;margin:44px 0 12px;text-wrap:balance}
.legal p{font-size:17px;line-height:1.65;color:#425466;margin:0 0 16px;
  text-wrap:pretty}
.legal ul{margin:0 0 16px;padding-left:22px}
.legal li{font-size:17px;line-height:1.65;color:#425466;margin:0 0 8px}
.legal strong{color:#0A2540;font-weight:600}
/* Same reason as the other pages: colour alone is not a distinction. */
.legal p a,.legal li a,.legal td a{text-decoration:underline;
  text-underline-offset:2px;text-decoration-thickness:1px}
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
  font-size:13px;color:#626F8A}


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
    os.makedirs(DST, exist_ok=True)
    for src, title, kind, desc, ld in PAGES:
        path = "legal/" + src
        body = body_of(os.path.join(SRC, src))
        head = pk.head(
            title=f"{title} — McCain Digital",
            desc=desc,
            canonical=path,
            depth=1,
            ld=ld,
            extra="\n<style>" + LEGAL_CSS + "</style>",
        )
        # The page declares German because the shell around the text - header,
        # six menus, contact band, footer - is German and is most of the markup.
        # The reviewed wording itself is English and says so on the <article>,
        # which is the element the text is actually in. Machine-translating
        # reviewed legal wording is not on the table; see the note at the top.
        html_body = f"""{pk.page_stream("kontakt")}
{pk.header(kind=kind, depth=1, current=path)}

<main id="content">
  <section class="band">
    <div class="wrap">
      {pk.crumb(depth=1, trail=[("index.html", "Start"), (None, kind)])}
      <p class="eyebrow">{kind}</p>
      <article class="legal prose" lang="en">
{body}
        <p class="l-updated" lang="de">Wortlaut unverändert aus der geprüften Fassung
          der Live-Seite übernommen.</p>
      </article>
    </div>
  </section>
</main>

{pk.footer(depth=1, current=path)}
{pk.scripts(depth=1, stream=True)}"""

        banner = "\n".join([
            "GENERATED - do not edit by hand.  python tools/build_legal.py",
            "",
            f"     Body text is VERBATIM from archive/site-apache/upload/legal/{src};",
            "     that wording is legally reviewed. Regenerate rather than editing",
            "     the prose here. The shell is the site's own, from tools/pagekit.py.",
        ])
        out_html = pk.document(lang="de", banner=banner, head_html=head,
                               body_html=html_body)
        out = os.path.join(DST, src)
        io.open(out, "w", encoding="utf-8", newline="\n").write(out_html)
        print(f"  {path:<24} {len(out_html):>7,} bytes   "
              f"{body.count('<h2')} sections")


if __name__ == "__main__":
    main()
