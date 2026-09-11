# The shared shell every static subpage is built from.
#
# WHY THIS EXISTS
# The start page is a React component rendered by support.js. The subpages are
# not, and deliberately so: they are prose and lists, they have to be fast, and
# the two defects that shipped a dead start page were both hydration defects.
# A page with no hydration cannot have them.
#
# "Stick to the design" then has to mean something checkable, so none of the
# values below are eyeballed. They were read off the rendered start page with
# getComputedStyle by tools/extract_design.mjs and are kept in
# internal/design-reference.json:
#
#   h1   600, -0.04em      (70.56px / -2.8224px at 1440)
#   h2   700, -0.03em      (48px / -1.44px)
#   h3   600, -0.025em     (24.48px / -0.612px)
#   body 18px / 1.6, #425466 on #fff, ink #0A2540
#   card radius 16px, shadow 0 0 0 1px #E3E8EE, 0 1px 2px rgba(10,37,64,.04)
#   accent #635BFF, accent text #4D47C7
#
# The sizes are clamped rather than fixed: the start page hero is larger than a
# subpage headline should be, so the scale is in the same family, one step down.
import io
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)
ORIGIN = "https://mccain-digital.com"

with io.open(os.path.join(SITE, "site.config.json"), encoding="utf-8") as _f:
    CONFIG = json.load(_f)
ROBOTS = "noindex, follow" if CONFIG["noindex"] else "index, follow, max-image-preview:large, max-snippet:-1"

# The public Web3Forms key. Public by design - it identifies the destination
# inbox, it is not a secret - and it is the SAME key the previous site used. The
# reviewed privacy policy names Web3Forms as the processor of the contact form,
# so this is the documented channel rather than a new decision.
WEB3FORMS_KEY = "d3e1fa0a-cbe1-45cd-b823-c63eff37c66a"

SERVICES = [
    ("ai", "services/ai-tools.html", "KI-Tools"),
    ("apps", "services/web-apps.html", "Web-Apps"),
    ("web", "services/websites.html", "Websites"),
    ("software", "services/software.html", "Software"),
]

LEGAL = [
    ("legal/imprint.html", "Impressum"),
    ("legal/privacy.html", "Datenschutz"),
    ("legal/terms.html", "AGB"),
    ("legal/withdrawal.html", "Widerruf"),
]


def esc(s):
    return (str(s).replace("&", "&amp;").replace("<", "&lt;")
            .replace(">", "&gt;").replace('"', "&quot;"))


def rel(depth):
    """Prefix that reaches the site root from a page `depth` folders down."""
    return "../" * depth


CSS = """
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}
body{margin:0;background:#fff;color:#0A2540;
  font-family:'Instrument Sans',system-ui,-apple-system,sans-serif;
  font-size:17px;line-height:1.6;-webkit-font-smoothing:antialiased}
img{max-width:100%;height:auto}
::selection{background:rgba(99,91,255,.22)}
a{color:#4D47C7;text-decoration:none}
a:hover{color:#0A2540;text-decoration:underline}
:focus-visible{outline:2px solid #635BFF;outline-offset:2px;
  box-shadow:0 0 0 4px rgba(99,91,255,.28);border-radius:4px}
h1,h2,h3,h4,p,ul,ol,figure{margin:0}

.skip{position:absolute;left:-9999px;top:0;z-index:20;background:#fff;
  padding:12px 18px;border-radius:8px;box-shadow:0 0 0 1px #E3E8EE}
.skip:focus{left:16px;top:16px}

/* ---------------------------------------------------------------- chrome */
header.site{position:sticky;top:0;z-index:10;min-height:72px;display:flex;
  align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;
  padding:10px clamp(20px,4vw,48px);
  background:rgba(255,255,255,.92);backdrop-filter:blur(14px);
  box-shadow:0 1px 0 #E3E8EE}
.lockup{display:flex;align-items:center;gap:12px;color:#0A2540;font-weight:600;
  font-size:17px;letter-spacing:-.02em}
.lockup:hover{text-decoration:none;color:#0A2540}
.lockup img{display:block}
.lockup .sep{color:#C6CEDA;font-weight:400}
.lockup .kind{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:12px;
  letter-spacing:.06em;color:#727F96;font-weight:400}
.hnav{display:flex;align-items:center;gap:clamp(12px,2vw,24px);flex-wrap:wrap;
  font-size:15px;font-weight:500}
.hnav a{color:#425466}
.hnav a:hover{color:#0A2540;text-decoration:none}
.hnav a[aria-current]{color:#0A2540;font-weight:600}
.btn{display:inline-flex;align-items:center;gap:8px;height:44px;padding:0 20px;
  border-radius:999px;background:#635BFF;color:#fff;font-weight:600;font-size:15px;
  border:0;cursor:pointer;transition:background .2s,transform .2s}
.btn:hover{background:#7A73FF;color:#fff;text-decoration:none;transform:translateY(-1px)}
.btn.ghost{background:#fff;color:#0A2540;box-shadow:0 0 0 1px #E3E8EE}
.btn.ghost:hover{background:#F6F9FC;color:#0A2540}

/* ---------------------------------------------------------------- layout */
main{display:block}
.wrap{max-width:1120px;margin:0 auto;padding:0 clamp(20px,4vw,48px)}
.prose{max-width:720px}
section.band{padding:clamp(52px,7vw,104px) 0}
section.band.tint{background:#F6F9FC;box-shadow:0 1px 0 #E3E8EE inset,0 -1px 0 #E3E8EE inset}
.crumb{font-size:13px;color:#727F96;margin:0 0 18px}
.crumb a{color:#727F96}
.crumb b{color:#0A2540;font-weight:600}
.crumb i{font-style:normal;padding:0 8px;color:#C6CEDA}
.eyebrow{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:12px;
  letter-spacing:.06em;color:#4D47C7;margin:0 0 14px;text-transform:uppercase}

h1{font-size:clamp(34px,5vw,58px);line-height:1.05;letter-spacing:-.04em;
  font-weight:600;text-wrap:balance}
h2{font-size:clamp(27px,3.3vw,42px);line-height:1.12;letter-spacing:-.03em;
  font-weight:700;text-wrap:balance}
h3{font-size:clamp(18px,1.7vw,23px);line-height:1.2;letter-spacing:-.025em;
  font-weight:600;text-wrap:balance}
.lead{font-size:clamp(18px,1.6vw,21px);line-height:1.55;color:#425466;
  margin:20px 0 0;text-wrap:pretty}
p{color:#425466;text-wrap:pretty}
.kicker{color:#727F96;margin:12px 0 0;font-size:17px}
.head{margin:0 0 clamp(28px,4vw,52px)}

/* ----------------------------------------------------------- components */
.actions{display:flex;flex-wrap:wrap;gap:12px;margin:30px 0 0}

.stats{display:grid;gap:18px;margin:44px 0 0;
  grid-template-columns:repeat(auto-fit,minmax(210px,1fr))}
.stat{background:#fff;border-radius:16px;padding:22px 24px;
  box-shadow:0 0 0 1px #E3E8EE,0 1px 2px rgba(10,37,64,.04)}
.stat b{display:block;font-size:clamp(26px,2.6vw,34px);line-height:1.1;
  letter-spacing:-.03em;font-weight:700;color:#0A2540}
.stat span{display:block;margin-top:8px;font-size:15px;color:#425466}

.grid{display:grid;gap:18px;
  grid-template-columns:repeat(auto-fit,minmax(290px,1fr))}
.card{background:#fff;border-radius:16px;padding:26px;
  box-shadow:0 0 0 1px #E3E8EE,0 1px 2px rgba(10,37,64,.04)}
.card h3{margin:0 0 10px}
.card p{margin:0;font-size:16px}
.tag{display:inline-block;font-family:'JetBrains Mono',ui-monospace,monospace;
  font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#4D47C7;
  background:rgba(99,91,255,.10);border-radius:999px;padding:5px 10px;margin:0 0 14px}
.out{margin:14px 0 0;font-size:15px;color:#0A2540;font-weight:600;
  display:flex;gap:8px;align-items:flex-start}
.out::before{content:"→";color:#635BFF;flex:none}

.steps{display:grid;gap:18px;grid-template-columns:repeat(auto-fit,minmax(250px,1fr))}
.step{position:relative;background:#fff;border-radius:16px;padding:26px;
  box-shadow:0 0 0 1px #E3E8EE,0 1px 2px rgba(10,37,64,.04)}
.step .n{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:12px;
  letter-spacing:.08em;color:#635BFF;font-weight:500;display:block;margin:0 0 12px}

.chips{display:flex;flex-wrap:wrap;gap:10px;margin:0}
.chip{list-style:none;font-family:'JetBrains Mono',ui-monospace,monospace;
  font-size:13px;color:#0A2540;background:#fff;border-radius:8px;padding:8px 12px;
  box-shadow:0 0 0 1px #E3E8EE}

.faq{max-width:820px}
.faq details{border-bottom:1px solid #E3E8EE;padding:4px 0}
.faq summary{cursor:pointer;list-style:none;padding:20px 34px 20px 0;
  font-size:clamp(17px,1.5vw,19px);font-weight:600;color:#0A2540;position:relative;
  text-wrap:balance}
.faq summary::-webkit-details-marker{display:none}
.faq summary::after{content:"";position:absolute;right:6px;top:50%;width:9px;height:9px;
  border-right:2px solid #8DA2E0;border-bottom:2px solid #8DA2E0;
  transform:translateY(-70%) rotate(45deg);transition:transform .2s}
.faq details[open] summary::after{transform:translateY(-30%) rotate(225deg)}
.faq details p{margin:0 0 20px;font-size:17px;max-width:68ch}

.rel{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(230px,1fr))}
.rel a{display:flex;align-items:center;justify-content:space-between;gap:12px;
  background:#fff;border-radius:14px;padding:18px 20px;color:#0A2540;font-weight:600;
  box-shadow:0 0 0 1px #E3E8EE,0 1px 2px rgba(10,37,64,.04);transition:transform .2s}
.rel a:hover{text-decoration:none;transform:translateY(-2px);color:#4D47C7}
.rel a span{color:#635BFF}

/* ------------------------------------------------------------------ cta */
.cta{background:#0A1F44;color:#EEF1FA;border-radius:22px;
  padding:clamp(34px,5vw,56px);margin:0}
.cta h2{color:#fff}
.cta p{color:#C5D0F5;margin:16px 0 0;font-size:18px;max-width:58ch}
.cta .btn.ghost{background:rgba(255,255,255,.10);color:#fff;box-shadow:0 0 0 1px rgba(255,255,255,.22)}
.cta .btn.ghost:hover{background:rgba(255,255,255,.18);color:#fff}

/* ---------------------------------------------------------------- forms */
.form{display:grid;gap:16px;max-width:560px}
.form label{display:grid;gap:6px;font-size:13px;font-weight:600;color:#0A2540}
.form input,.form textarea,.form select{width:100%;font:inherit;font-size:16px;
  color:#0A2540;background:#fff;border:1px solid #E3E8EE;border-radius:10px;
  padding:12px 14px;transition:border-color .2s,box-shadow .2s}
.form textarea{resize:vertical;min-height:130px}
.form input:focus,.form textarea:focus,.form select:focus{outline:none;
  border-color:#635BFF;box-shadow:0 0 0 4px rgba(99,91,255,.28)}
.form .hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}
.form .hint{font-size:13px;color:#727F96;font-weight:400}
.form .note{font-size:13px;color:#727F96}
.form .note a{color:#4D47C7}
#form-status{margin:0;font-size:15px;font-weight:600}
#form-status[data-state="error"]{color:#B4232A}
#form-status[data-state="ok"]{color:#0A7C3F}

/* --------------------------------------------------------------- footer */
footer.site{background:#0A1F44;color:#C5D0F5;
  padding:clamp(46px,6vw,72px) 0 34px;margin-top:clamp(64px,8vw,110px)}
footer.site a{color:#C5D0F5}
footer.site a:hover{color:#fff}
footer.site a[aria-current]{color:#fff;font-weight:600}
.fcols{display:grid;gap:32px;grid-template-columns:repeat(auto-fit,minmax(190px,1fr))}
.fcol h2{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;
  letter-spacing:.08em;text-transform:uppercase;color:#8DA2E0;font-weight:500;
  margin:0 0 14px;letter-spacing:.08em}
.fcol ul{list-style:none;padding:0;margin:0;display:grid;gap:10px;font-size:15px}
.fbot{display:flex;flex-wrap:wrap;gap:12px 26px;align-items:center;
  margin-top:38px;padding-top:22px;font-size:14px;
  border-top:1px solid rgba(255,255,255,.08)}
.fbot .copy{color:#8DA2E0}

@media (prefers-reduced-motion:reduce){*{animation:none!important;
  transition:none!important;scroll-behavior:auto!important}}
"""


def head(*, title, desc, canonical, depth, ld="", extra=""):
    r = rel(depth)
    fonts = [f for f in sorted(os.listdir(os.path.join(SITE, "fonts")))
             if f.endswith("-normal-latin.woff2")]
    if len(fonts) != 2:
        raise SystemExit(f"pagekit: expected 2 upright latin faces, found {len(fonts)}")
    preloads = "\n".join(
        f'<link rel="preload" href="{r}fonts/{f}" as="font" type="font/woff2" crossorigin>'
        for f in fonts
    )
    return f"""<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
<link rel="canonical" href="{ORIGIN}/{canonical}">
<meta name="robots" content="{ROBOTS}">
<meta name="theme-color" content="#635BFF">
<meta property="og:type" content="website">
<meta property="og:site_name" content="McCain Digital">
<meta property="og:locale" content="de_DE">
<meta property="og:url" content="{ORIGIN}/{canonical}">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:image" content="{ORIGIN}/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="{r}brand/mccain-favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="{r}brand/apple-touch-icon-180.png">
{preloads}
<link rel="stylesheet" href="{r}fonts/fonts.css">
<style>{CSS}</style>{ld}{extra}"""


def header(*, kind, depth, current=""):
    r = rel(depth)
    links = "".join(
        f'\n    <a href="{r}{href}"{" aria-current=\"page\"" if href == current else ""}>{esc(label)}</a>'
        for _id, href, label in SERVICES
    )
    return f"""<a class="skip" href="#content">Zum Inhalt springen</a>

<header class="site">
  <a class="lockup" href="{r}index.html">
    <img src="{r}brand/mccain-mark-free-color.svg" alt="" width="28" height="28">
    <span>mccain digital</span>
    <span class="sep">/</span>
    <span class="kind">{esc(kind)}</span>
  </a>
  <nav class="hnav" aria-label="Leistungen">{links}
    <a href="{r}kontakt.html"{" aria-current=\"page\"" if current == "kontakt.html" else ""}>Kontakt</a>
  </nav>
</header>"""


def crumb(*, depth, trail):
    """trail: list of (href_or_None, label); the last one is the current page."""
    r = rel(depth)
    parts = []
    for href, label in trail[:-1]:
        parts.append(f'<a href="{r}{href}">{esc(label)}</a>')
    parts.append(f'<b aria-current="page">{esc(trail[-1][1])}</b>')
    return '<nav class="crumb" aria-label="Brotkrume">' + '<i aria-hidden="true">/</i>'.join(parts) + "</nav>"


def footer(*, depth, current=""):
    r = rel(depth)

    def li(href, label):
        cur = ' aria-current="page"' if href == current else ""
        return f'<li><a href="{r}{href}"{cur}>{esc(label)}</a></li>'

    services = "".join(li(h, l) for _i, h, l in SERVICES)
    legal = "".join(li(h, l) for h, l in LEGAL)
    return f"""<footer class="site">
  <div class="wrap">
    <div class="fcols">
      <div class="fcol">
        <h2>Leistungen</h2>
        <ul>{services}</ul>
      </div>
      <div class="fcol">
        <h2>Studio</h2>
        <ul>
          {li("kontakt.html", "Kontakt")}
          {li("index.html", "Startseite")}
          <li><a href="{r}index.html#studio">Team</a></li>
          <li><a href="{r}index.html#process">Ablauf</a></li>
        </ul>
      </div>
      <div class="fcol">
        <h2>Ressourcen</h2>
        <ul>
          {li("brand-guide.html", "Marke &amp; Downloads")}
          <li><a href="{r}llms.txt">llms.txt</a></li>
          <li><a href="{r}index.html#faq">Fragen &amp; Antworten</a></li>
        </ul>
      </div>
      <div class="fcol">
        <h2>Rechtliches</h2>
        <ul>{legal}</ul>
      </div>
    </div>
    <div class="fbot">
      <span class="copy">© 2026 McCain Digital · Oberostendorf, Bayern</span>
      <a href="mailto:info@mccain-digital.com">info@mccain-digital.com</a>
      <a href="tel:+491705922203">+49 170 59 222 03</a>
    </div>
  </div>
</footer>"""


def document(*, lang="de", banner, head_html, body_html):
    return f"""<!DOCTYPE html>
<!-- {banner} -->
<html lang="{lang}">
<head>
{head_html}
</head>
<body>
{body_html}
</body>
</html>
"""
