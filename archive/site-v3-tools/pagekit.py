# The shared shell every static subpage is built from.
#
# WHY THIS EXISTS
# The start page is a React component rendered by support.js. The subpages are
# not, and deliberately so: they are prose and lists, they have to be fast, and
# the two defects that shipped a dead start page were both hydration defects.
# A page with no hydration cannot have them.
#
# WHAT CHANGED ON 11.9.2026, AND WHY
# The first version of this file got "stick to the design" wrong in a way that
# is worth writing down. It took the design TOKENS off the rendered start page
# with getComputedStyle - correctly - and then built a page out of them that
# shares not one structural idea with the start page. The owner's words:
# "lieblos, nicht im stil, keine animationen, alle sehen gleich aus". He was
# right, and a measurement said so: 34 divergences, of which the four that
# matter are
#
#   - no motion at all. Four pages, one <script>, and it was JSON-LD.
#   - no gradient bloom. The start page gives every service its OWN three
#     colours (Component.FLOW); the subpages were four identical white grids.
#     That is the whole reason all four looked the same.
#   - the container was 1120px against the start page's 1440, and the band
#     rhythm was tighter at every width, so nothing sat in the same box.
#   - the striped grey tint bands. The start page never paints one; its tint is
#     a soft radial wash.
#
# Three v3 idioms had also survived the palette change and no longer exist
# anywhere on the start page: the mono-uppercase eyebrow, the mono tag pill and
# the mono footer headings. They are gone from here too.
#
# The values below are still measured, not eyeballed - internal/design-reference
# .json plus the reference export itself. Where a value is quoted from the
# export, the comment says where from.
#
#   h1   clamp(34px,4.9vw,74px)  600  -.04em     (70.56px at 1440)
#   h2   clamp(30px,3.6vw,48px)  700  -.03em
#   h3   clamp(22px,1.7vw,27px)  600  -.025em
#   body 16px root, 18px lead, 15px card copy, #425466 on #fff, ink #0A2540
#   card radius 16px, rest shadow 0 0 0 1px #E3E8EE, 0 1px 2px rgba(10,37,64,.04)
#   card hover translateY(-4px) over .45s cubic-bezier(.2,.8,.2,1) + deep shadow
#   accent #635BFF, accent text #4D47C7, ring rgba(99,91,255,.28)
import io
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import chrome  # noqa: E402  - the start page's own header/footer/pill

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

# ---------------------------------------------------------------- the colours
# Component.FLOW, reference export line 803, verbatim. THIS is the built-in
# differentiator: three colours per service, used for the tile bloom, the icon
# square and its glow. Four services, four different colour triples - copying
# them here is what stops the four subpages from being the same page.
FLOW = {
    "ai": ("#FF5A8C", "#FFB46B", "#C05CFF"),
    "apps": ("#6E7BFF", "#5FC3FF", "#C05CFF"),
    "web": ("#FFB46B", "#FF5A8C", "#FF8A5B"),
    "software": ("#C05CFF", "#6E7BFF", "#FF5A8C"),
    "recall": ("#6E7BFF", "#C05CFF", "#5FC3FF"),
    "site": ("#5FC3FF", "#FFB46B", "#FF5A8C"),
    "kontakt": ("#635BFF", "#5FC3FF", "#C05CFF"),
}

# The hero stream, per page. preset picks the colour ramp (stream.js resamples
# FLOW in OKLab), cfg is (topX, bend, bulge, mirror) as fractions of the canvas
# width and w scales the ribbon's half-width. Four visibly different curves -
# see stream.md section 4. The curve only exists in mode 0 (a bounded panel);
# on a full-viewport canvas the shader discards it.
# The stream is GLOBAL - one fixed canvas behind the whole document, u_mode=1,
# as on the start page. In that mode the shader discards cfg/w entirely
# (mix(cx, cxg, u_mode)) and runs its own S-curve, whose period (2400 document
# px), amplitude and phase are hard-coded. The only way to put a subpage on a
# different part of that curve is scrollOffset - 0 / 600 / 1200 / 1800 are the
# four quarters: bending right, crossing, bending left, crossing back.
# Colour is the second axis and the loud one: stream.js resamples each service's
# Component.FLOW triple onto the five ramp stops, in OKLab.
STREAM = {
    "ai": {"preset": "ai", "offset": 0},
    "apps": {"preset": "apps", "offset": 600},
    "web": {"preset": "web", "offset": 1200},
    "software": {"preset": "software", "offset": 1800},
    "kontakt": {"preset": "home", "offset": 300},
}


def esc(s):
    return (str(s).replace("&", "&amp;").replace("<", "&lt;")
            .replace(">", "&gt;").replace('"', "&quot;"))


def rel(depth):
    """Prefix that reaches the site root from a page `depth` folders down."""
    return "../" * depth


def flow(key):
    """The four derived paints for one service - export line 988, flow(id)."""
    c = FLOW.get(key) or FLOW["ai"]
    return {
        "iconBg": f"linear-gradient(135deg, {c[0]}, {c[2]})",
        "iconGlow": c[2] + "B3",
        "gradA": (f"radial-gradient(42% 46% at 30% 36%, {c[0]} 0%, transparent 100%), "
                  f"radial-gradient(46% 50% at 74% 28%, {c[1]} 0%, transparent 100%), "
                  f"linear-gradient(135deg, {c[0]}, {c[2]})"),
        "gradB": (f"radial-gradient(48% 52% at 66% 72%, {c[2]} 0%, transparent 100%), "
                  f"radial-gradient(36% 40% at 22% 78%, {c[1]} 0%, transparent 100%)"),
    }


CSS = """
:root{--acc:#635BFF;--acc-soft:rgba(99,91,255,.10);--acc-ring:rgba(99,91,255,.28);
  --acc-text:#4d47c7;--ink:#0A2540;--body:#425466;--muted:#626F8A;--rule:#E3E8EE;
  --tint:#F6F9FC;--navy:#0A1F44;--navy-ink:#C5D0F5;
  /* the chrome's own five, read off the start page with the rest */
  --muted2:#727F96;--navy-mut:#8DA2E0;--dock:#10285A;--dock-in:#0F2456;
  --nav-h:72px;
  --ease:cubic-bezier(.2,.8,.2,1);--ease-out:cubic-bezier(.16,1,.3,1)}
*,*::before,*::after{box-sizing:border-box}
/* The six nav triggers are <button>s. Without this they render as boxed
   controls with the platform border, which is exactly what they looked like
   the first time the real header was pasted in. */
button{font:inherit;color:inherit;background:none;border:0;padding:0;
  cursor:pointer;text-align:inherit}
input,textarea,select{font:inherit}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth;
  scrollbar-color:var(--acc) var(--tint)}
body{margin:0;background:#fff;color:var(--ink);
  font-family:'Instrument Sans',system-ui,-apple-system,sans-serif;
  font-size:16px;line-height:1.6;-webkit-font-smoothing:antialiased;
  overflow-x:hidden}
img{max-width:100%;height:auto}
::selection{background:rgba(99,91,255,.22)}
a{color:var(--acc-text);text-decoration:none}
a:hover{color:var(--ink);text-decoration:underline}
:focus-visible{outline:2px solid var(--acc);outline-offset:2px;
  box-shadow:0 0 0 4px var(--acc-ring);border-radius:4px}
h1,h2,h3,h4,p,ul,ol,figure{margin:0}
/* A link inside running text must be tellable apart WITHOUT colour - measured
   as "Links rely on color to be distinguishable" on every page that has one.
   Navigation, buttons and breadcrumbs are excluded on purpose: they are not
   text blocks, and underlining them would just be noise. */
main p a,main li a,.faq p a{text-decoration:underline;
  text-underline-offset:2px;text-decoration-thickness:1px}
::-webkit-scrollbar{width:10px;height:10px}
::-webkit-scrollbar-track{background:var(--tint)}
::-webkit-scrollbar-thumb{background:var(--acc);border-radius:999px;
  border:2px solid var(--tint)}

.skip{position:absolute;left:-9999px;top:0;z-index:60;background:#fff;
  padding:12px 18px;border-radius:8px;box-shadow:0 0 0 1px var(--rule)}
.skip:focus{left:16px;top:16px}

/* Reveal targets are hidden by a class the inline head script adds, never by a
   stylesheet - so with JavaScript off, or if reveal.js fails to load, the page
   is complete rather than blank. The previous site had it the other way round. */
.mcd-pre [data-reveal]{opacity:0}
/* ...but never the fold. A [data-reveal] inside the hero delays First
   Contentful Paint by however long the deferred script takes to run - measured
   on services/ai-tools.html at 1012 ms (1192 -> 180). The hero is painted, not
   revealed; its motion is the gradient stream, which costs no paint delay
   because the canvas is empty in the HTML. */
.mcd-pre .hero [data-reveal]{opacity:1}

.btn{display:inline-flex;align-items:center;gap:8px;height:44px;padding:0 20px;
  border-radius:999px;background:var(--acc);color:#fff;font-weight:600;font-size:15px;
  border:0;cursor:pointer;transition:background .2s,transform .2s}
.btn:hover{background:#7A73FF;color:#fff;text-decoration:none;transform:translateY(-1px)}
/* The start page's ghost-on-white: accent text inside an accent hairline, not a
   grey-ringed white box. Hover tightens the ring to full accent and lifts. */
.btn.ghost{background:rgba(255,255,255,.9);color:var(--acc-text);
  box-shadow:inset 0 0 0 1px rgba(99,91,255,.35)}
.btn.ghost:hover{background:rgba(255,255,255,.9);color:var(--acc-text);
  box-shadow:inset 0 0 0 1px var(--acc);transform:translateY(-1px)}
/* 999px = "go somewhere", 8px = "do something here". Both exist on the start
   page and the distinction is deliberate. */
.btn.square{border-radius:8px}

/* ---------------------------------------------------------------- layout */
main{display:block}
.wrap{max-width:1440px;margin:0 auto;padding:0 clamp(20px,4vw,48px)}
.prose{max-width:760px}
section.band{padding:clamp(72px,8vw,120px) 0;scroll-margin-top:72px;
  position:relative}
section.band.wide{padding:clamp(96px,10vw,150px) 0}
/* The start page never paints a full-width grey stripe. Its tint is a soft
   radial wash that fades in and out, sitting behind the content. */
section.band.tint::before{content:"";position:absolute;inset:0;z-index:-2;
  pointer-events:none;
  background:radial-gradient(55% 60% at 100% 0%, rgba(255,180,107,.12), transparent 60%),
    radial-gradient(50% 50% at 0% 100%, rgba(95,195,255,.12), transparent 60%),
    linear-gradient(180deg, rgba(246,249,252,0) 0%, var(--tint) 22%,
      var(--tint) 78%, rgba(246,249,252,0) 100%)}
.crumb{font-size:13px;color:var(--muted);margin:0 0 18px}
.crumb a{color:var(--muted)}
.crumb b{color:var(--ink);font-weight:600}
.crumb i{font-style:normal;padding:0 8px;color:#C6CEDA}
.eyebrow{font-size:15px;font-weight:600;color:var(--acc-text);margin:0 0 10px}

h1{font-size:clamp(34px,4.9vw,74px);line-height:1.04;letter-spacing:-.04em;
  font-weight:600;text-wrap:balance}
h2{font-size:clamp(30px,3.6vw,48px);line-height:1.1;letter-spacing:-.03em;
  font-weight:700;text-wrap:balance}
h3{font-size:clamp(22px,1.7vw,27px);line-height:1.2;letter-spacing:-.025em;
  font-weight:600;text-wrap:balance}
.lead{font-size:18px;line-height:1.6;color:var(--body);margin:18px 0 0;
  text-wrap:pretty}
p{color:var(--body);text-wrap:pretty}
.kicker{color:var(--body);margin:16px 0 0;font-size:18px}
.kicker.small{font-size:15px;color:var(--muted)}
.head{margin:0 0 clamp(34px,4.5vw,58px)}

/* --------------------------------------------------------------- artwork */
/* ONE canvas for the whole document, exactly as the start page carries it
   (index.html: <canvas data-global> position:fixed inset:0 z-index:-1
   pointer-events:none image-rendering:pixelated). The first version of this
   file put a small bounded canvas inside the hero instead, with its own curve
   - and the owner saw immediately what that was: "der datenstrohm geht in die
   falsche richtung". It was not a wrong direction, it was a different object.
   The start page's ribbon is ONE S-curve travelling through the whole document
   as you scroll; a box in the hero cannot be that. */
.pagestream{position:fixed;inset:0;width:100%;height:100%;display:block;
  z-index:-1;pointer-events:none;image-rendering:pixelated}

/* ------------------------------------------------------------------ hero */
.hero{position:relative;padding:clamp(48px,6vw,84px) 0 clamp(56px,7vw,96px);
  scroll-margin-top:72px}
.hero-grid{display:grid;gap:clamp(28px,4vw,56px);align-items:center;
  grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr)}
@media (max-width:980px){.hero-grid{grid-template-columns:minmax(0,1fr)}}
.hero-copy{min-width:0}
.hero-viz{min-width:0;justify-self:end;width:100%;max-width:520px}
@media (max-width:980px){.hero-viz{justify-self:start;max-width:100%}}
.actions{display:flex;flex-wrap:wrap;gap:12px;margin:30px 0 0}

/* ----------------------------------------------------------------- stats */
.stats{display:grid;gap:16px;margin:clamp(34px,4vw,52px) 0 0;
  grid-template-columns:repeat(auto-fit,minmax(min(200px,100%),1fr))}
.stat{background:#fff;border-radius:16px;padding:20px 22px;
  box-shadow:0 0 0 1px var(--rule),0 1px 2px rgba(10,37,64,.04);
  transition:transform .45s var(--ease),box-shadow .45s var(--ease)}
.stat:hover{transform:translateY(-4px);
  box-shadow:0 0 0 1px var(--rule),0 34px 70px -30px rgba(10,37,64,.28)}
.stat b{display:block;font-size:clamp(26px,2.6vw,34px);line-height:1.1;
  letter-spacing:-.03em;font-weight:700;color:var(--ink);
  font-variant-numeric:tabular-nums}
.stat span{display:block;margin-top:6px;font-size:15px;color:var(--body)}

/* ----------------------------------------------------------------- cards */
.grid{display:grid;gap:20px;
  grid-template-columns:repeat(auto-fit,minmax(min(290px,100%),1fr))}
.grid.two{grid-template-columns:repeat(auto-fit,minmax(min(420px,100%),1fr))}
.card{position:relative;background:#fff;border-radius:16px;padding:26px;
  box-shadow:0 0 0 1px var(--rule),0 1px 2px rgba(10,37,64,.04);
  transition:transform .45s var(--ease),box-shadow .45s var(--ease)}
.card:hover{transform:translateY(-4px);
  box-shadow:0 0 0 1px var(--rule),0 34px 70px -30px rgba(10,37,64,.28)}
.card h3{margin:0 0 10px}
.card p{margin:0;font-size:15px}
/* The stack pill, as the start page draws it: sans, ink, tint, inset hairline.
   The mono-uppercase version was a v3 idiom and is gone from the start page. */
.tag{display:inline-block;font-size:11px;font-weight:600;color:var(--ink);
  background:var(--tint);box-shadow:inset 0 0 0 1px var(--rule);
  border-radius:999px;padding:4px 10px;margin:0 0 14px}
.out{margin:14px 0 0;font-size:15px;color:var(--ink);font-weight:600;
  display:flex;gap:10px;align-items:flex-start}
.out::before{content:"";flex:none;width:22px;height:22px;border-radius:7px;
  background:var(--acc-soft);color:var(--acc-text);margin-top:1px;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' \
viewBox='0 0 24 24' fill='none' stroke='%234d47c7' stroke-width='3' \
stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 6 9 17l-5-5'/%3E%3C/svg%3E");
  background-size:13px;background-position:center;background-repeat:no-repeat}

/* the bloom - the one component that makes the four pages different */
.bloom{position:absolute;inset:-40%;opacity:.9;pointer-events:none;
  border-radius:inherit}
.bloom i{position:absolute;inset:0;display:block;will-change:transform}
.bloom i:first-child{animation:flowA 26s ease-in-out infinite}
.bloom i:last-child{animation:flowB 32s ease-in-out infinite;opacity:.85}
@keyframes flowA{0%{transform:translate3d(-7%,-5%,0) scale(1.1)}
  50%{transform:translate3d(7%,6%,0) scale(1.3)}
  100%{transform:translate3d(-7%,-5%,0) scale(1.1)}}
@keyframes flowB{0%{transform:translate3d(6%,7%,0) scale(1.25)}
  50%{transform:translate3d(-7%,-6%,0) scale(1.05)}
  100%{transform:translate3d(6%,7%,0) scale(1.25)}}

/* --------------------------------------------------------------- stepper */
/* The start page walks its process on a rail with a filling line and numbered
   dots, not on a flat grid of boxes. */
.stepper{position:relative;display:grid;gap:0;padding:0;margin:0;
  grid-template-columns:44px minmax(0,1fr);column-gap:clamp(18px,2.4vw,32px)}
.stepper::before{content:"";position:absolute;left:21px;top:22px;bottom:22px;
  width:2px;background:var(--rule);border-radius:2px}
.stepper .fill{position:absolute;left:21px;top:22px;width:2px;border-radius:2px;
  background:linear-gradient(180deg,var(--acc),#C05CFF);height:0;
  transition:height .45s var(--ease)}
.stepper .n{grid-column:1;justify-self:center;position:relative;z-index:1;
  width:44px;height:44px;border-radius:50%;display:grid;place-items:center;
  background:#fff;box-shadow:0 0 0 1px var(--rule);font-size:14px;font-weight:700;
  color:var(--muted);font-variant-numeric:tabular-nums;
  transition:background .35s var(--ease),color .35s var(--ease),
    box-shadow .35s var(--ease)}
.stepper .st[data-on] .n{background:var(--acc);color:#fff;
  box-shadow:0 0 0 1px var(--acc),0 10px 22px -10px rgba(99,91,255,.7)}
.stepper .st{display:contents}
.stepper .body{grid-column:2;padding:0 0 clamp(28px,3.4vw,44px)}
.stepper .st:last-child .body{padding-bottom:0}
.stepper .body h3{margin:8px 0 8px}
.stepper .body p{font-size:16px;max-width:64ch}

/* ----------------------------------------------------------------- chips */
.chips{display:flex;flex-wrap:wrap;gap:10px;margin:0;padding:0}
.chip{list-style:none;font-size:13px;font-weight:600;color:var(--ink);
  background:#fff;border-radius:999px;padding:8px 14px;
  box-shadow:inset 0 0 0 1px var(--rule);
  transition:transform .3s var(--ease),box-shadow .3s var(--ease)}
.chip:hover{transform:translateY(-2px);box-shadow:inset 0 0 0 1px var(--acc)}

/* ------------------------------------------------------------------- faq */
/* One white card, hairline dividers, a plus that turns into an x. <details>
   keeps it correct with no JavaScript; the script upgrades the open to an
   animated grid row. */
.faq{max-width:860px;background:#fff;border-radius:16px;padding:4px 24px;
  box-shadow:0 1px 2px rgba(10,37,64,.06),0 0 0 1px rgba(10,37,64,.06)}
.faq details{border-top:1px solid rgba(10,37,64,.08)}
.faq details:first-of-type{border-top:0}
.faq summary{cursor:pointer;list-style:none;display:flex;gap:16px;
  align-items:flex-start;justify-content:space-between;padding:20px 0;
  font-size:clamp(17px,1.5vw,19px);font-weight:600;color:var(--ink);
  text-wrap:balance}
.faq summary::-webkit-details-marker{display:none}
.faq summary::after{content:"";flex:none;width:26px;height:26px;border-radius:50%;
  background:#F0F3FA no-repeat center/12px;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' \
viewBox='0 0 24 24' stroke='%230A2540' stroke-width='2.5' stroke-linecap='round'%3E\
%3Cpath d='M12 5v14M5 12h14'/%3E%3C/svg%3E");
  transition:transform .4s var(--ease),background-color .4s var(--ease)}
.faq details[open] summary::after{transform:rotate(45deg);background-color:#E3E8F5}
.faq .a{display:grid;grid-template-rows:1fr;overflow:hidden}
.faq .a>div{min-height:0}
.faq details p{margin:0 0 22px;font-size:16px;max-width:68ch}

/* ---------------------------------------------------------------- related */
.rel{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(min(230px,100%),1fr))}
.rel a{display:flex;align-items:center;justify-content:space-between;gap:12px;
  background:#fff;border-radius:16px;padding:18px 20px;color:var(--ink);font-weight:600;
  box-shadow:0 0 0 1px var(--rule),0 1px 2px rgba(10,37,64,.04);
  transition:transform .45s var(--ease),box-shadow .45s var(--ease)}
.rel a:hover{text-decoration:none;transform:translateY(-4px);color:var(--acc-text);
  box-shadow:0 0 0 1px var(--rule),0 34px 70px -30px rgba(10,37,64,.28)}
.rel a span{color:var(--acc)}

/* ------------------------------------------------------------------- cta */
.cta{position:relative;overflow:hidden;background:var(--navy);color:#EEF1FA;
  border-radius:16px;padding:clamp(34px,5vw,64px);margin:0}
.cta h2{color:#fff;position:relative}
.cta p{color:var(--navy-ink);margin:16px 0 0;font-size:18px;max-width:58ch;
  position:relative}
.cta .actions{position:relative}
.cta .btn.ghost{background:rgba(255,255,255,.10);color:#fff;
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.22)}
.cta .btn.ghost:hover{background:rgba(255,255,255,.18);color:#fff;
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.45)}
.cta .bloom{opacity:.34;mix-blend-mode:screen}

/* ---------------------------------------------------------------- forms */
.form{display:grid;gap:16px;max-width:560px}
.form label{display:grid;gap:6px;font-size:13px;font-weight:600;color:var(--ink)}
.form input,.form textarea,.form select{width:100%;font:inherit;font-size:16px;
  color:var(--ink);background:#fff;border:1px solid var(--rule);border-radius:10px;
  padding:12px 14px;transition:border-color .2s,box-shadow .2s}
.form textarea{resize:vertical;min-height:130px}
.form input:focus,.form textarea:focus,.form select:focus{outline:none;
  border-color:var(--acc);box-shadow:0 0 0 4px var(--acc-ring)}
.form .hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}
.form .hint{font-size:13px;color:var(--muted);font-weight:400}
.form .note{font-size:13px;color:var(--muted)}
.form .note a{color:var(--acc-text)}
#form-status{margin:0;font-size:15px;font-weight:600}
#form-status[data-state="error"]{color:#B4232A}
#form-status[data-state="ok"]{color:#0A7C3F}

/* The header, the mobile drawer, the footer and the "Die Seite fragen"
   pill are NOT defined here. They are the start page's own chrome, lifted
   out of the export and generated by tools/chrome.py - one object on every
   page, so a subpage cannot wear a different header from the page it came
   from. chrome.CSS is appended to this stylesheet in head(). */
/* `animation:none` was the wrong instrument here and it shipped: it removes
   the `forwards` fill, so anything that relies on an animation to reach its end
   state stays at its START state - invisible content under reduced motion.
   .01ms always lands. This is the start page's rule, verbatim. */
@media (prefers-reduced-motion:reduce){
  *,*::before,*::after{animation-duration:.01ms!important;
    animation-iteration-count:1!important;transition-duration:.01ms!important;
    scroll-behavior:auto!important}}
"""

# 195 bytes, inline, in <head> before the stylesheet: hides the reveal targets
# before first paint so a deferred script cannot cause a visible->hidden->visible
# flash, and un-hides them after 2.5s so a missing or broken reveal.js can never
# leave the page blank. That failure mode is what the previous site shipped.
PRE_SCRIPT = (
    "<script>(function(d){if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;"
    "var c=d.documentElement.classList;c.add('mcd-pre');"
    "setTimeout(function(){c.remove('mcd-pre')},2500)})(document)</script>"
)

# The two behaviours that belong to the shell rather than to the content: the
# header's scrolled shadow, and the FAQ's animated open. Inline because together
# they are under 700 bytes and a request would cost more than they weigh.
CHROME_SCRIPT = """<script>
(function(){
  var h=document.querySelector('header.site');
  if(h){var t=function(){if(scrollY>12)h.setAttribute('data-scrolled','');
    else h.removeAttribute('data-scrolled')};t();
    addEventListener('scroll',t,{passive:true})}
  /* <details> cannot animate its own open, so the height is animated on a grid
     row inside it and the element is kept open for the length of the close. */
  var red=matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('.faq details').forEach(function(d){
    var a=d.querySelector('.a'); if(!a||red) return;
    a.style.gridTemplateRows=d.open?'1fr':'0fr';
    d.querySelector('summary').addEventListener('click',function(e){
      e.preventDefault();
      if(d.open){a.style.gridTemplateRows='0fr';
        var end=function(){d.open=false;a.removeEventListener('transitionend',end)};
        a.addEventListener('transitionend',end);
      }else{d.open=true;a.offsetHeight;a.style.gridTemplateRows='1fr'}
    });
  });

  /* The process stepper lights up as it is read past, the way the start page's
     does: a step is "on" once its dot has crossed the reading line at 55% of
     the viewport, and the rail fills to the last lit dot. Pure decoration -
     every step is fully readable without it. */
  document.querySelectorAll('[data-stepper]').forEach(function(st){
    var dots=[].slice.call(st.querySelectorAll('.st')),
        fill=st.querySelector('.fill');
    if(!dots.length) return;
    var tick=function(){
      var line=innerHeight*0.55, last=-1;
      dots.forEach(function(d,i){
        var n=d.querySelector('.n'); if(!n) return;
        var r=n.getBoundingClientRect();
        if(r.top+r.height/2<=line){d.setAttribute('data-on','');last=i}
        else d.removeAttribute('data-on');
      });
      if(fill){
        if(last<0){fill.style.height='0px';return}
        var a=dots[0].querySelector('.n').getBoundingClientRect(),
            b=dots[last].querySelector('.n').getBoundingClientRect();
        fill.style.height=Math.max(0,(b.top+b.height/2)-(a.top+a.height/2))+'px';
      }
    };
    var q=0,run=function(){q=0;tick()};
    var sched=function(){if(!q)q=requestAnimationFrame(run)};
    tick(); addEventListener('scroll',sched,{passive:true});
    addEventListener('resize',sched);
  });
})();
</script>"""


def head(*, title, desc, canonical, depth, ld="", extra="", stream=False):
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
{PRE_SCRIPT}
<style>{CSS}{CONTACT_CSS}{chrome.CSS}</style>{ld}{extra}"""


def scripts(*, depth, stream=False, form=True):
    """The deferred behaviour a subpage carries. None of it blocks paint.

    form defaults to True because every page now ends on the contact band, so
    every page has a form to upgrade."""
    r = rel(depth)
    out = [
        CHROME_SCRIPT,
        f'<script src="{r}chrome.js" defer></script>',
        f'<script src="{r}reveal.js" defer></script>',
    ]
    if stream:
        out.insert(1, f'<script src="{r}stream.js" defer></script>')
    if form:
        out.append("<script>" + CONTACT_JS + "</script>")
    return "\n".join(out)


# Which top-level menu a page belongs under. Marks the trigger visually; it is
# NOT aria-current, because "Leistungen" is a button that opens a menu, not a
# link to the page you are on.
SECTION_OF = {
    "services/ai-tools.html": "services",
    "services/web-apps.html": "services",
    "services/websites.html": "services",
    "services/software.html": "services",
    "kontakt.html": "",
    "brand-guide.html": "resources",
}


def header(*, kind, depth, current=""):
    """The start page's header - six dropdown panels, the promo card, the
    indicator, the mobile drawer - not a reduced version of it. Both are
    generated from tools/chrome.py so the page a visitor lands on wears the
    same chrome as the page they came from."""
    r = rel(depth)
    return (
        '<a class="skip" href="#content">Zum Inhalt springen</a>\n'
        + chrome.SPRITE + "\n"
        + chrome.header(r=r, kind=kind, current=current,
                        section=SECTION_OF.get(current, ""))
        + "\n" + chrome.drawer(r=r, current=current)
    )


def crumb(*, depth, trail):
    """trail: list of (href_or_None, label); the last one is the current page."""
    r = rel(depth)
    parts = []
    for href, label in trail[:-1]:
        # "Start" on its own is flagged as non-descriptive link text, and it is:
        # out of its visual context it says nothing about where it goes.
        aria = ' aria-label="Zur Startseite"' if label == "Start" else ""
        parts.append(f'<a href="{r}{href}"{aria}>{esc(label)}</a>')
    parts.append(f'<b aria-current="page">{esc(trail[-1][1])}</b>')
    return '<nav class="crumb" aria-label="Brotkrume">' + '<i aria-hidden="true">/</i>'.join(parts) + "</nav>"


def bloom(key):
    """The two drifting colour layers, in this service's own three colours."""
    f = flow(key)
    return (f'<span class="bloom" aria-hidden="true">'
            f'<i data-anim style="background:{f["gradA"]}"></i>'
            f'<i data-anim style="background:{f["gradB"]}"></i></span>')


def page_stream(key):
    """The one canvas the whole page is painted on. Empty in the HTML and
    aria-hidden: if stream.js never runs, the page is exactly what it was."""
    s = STREAM.get(key) or STREAM["ai"]
    return (f'<canvas class="pagestream" data-global aria-hidden="true" '
            f'data-stream="{s["preset"]}" data-scroll-offset="{s["offset"]}"></canvas>')


# The dark contact band that closes every page on the start page, directly
# above the footer and sharing its navy ground, with the pixel stream running
# through both. Every value below is read off the prerendered #contact section
# in index.html; the form is the same Web3Forms channel the reviewed privacy
# policy names, with the same hidden fields and the same honeypot.
CONTACT_CSS = """
.endband{position:relative;padding:0;color:#EEF1FA}
.endband>.ground{position:absolute;inset:0;z-index:-2;background:var(--navy)}
.endband .inner{max-width:1440px;margin:0 auto;
  padding:clamp(56px,6vw,96px) clamp(20px,4vw,48px) clamp(48px,5vw,80px);
  border-left:1px solid rgba(255,255,255,.08);
  border-right:1px solid rgba(255,255,255,.08);
  display:grid;grid-template-columns:1fr 1fr;gap:clamp(36px,5vw,96px);
  align-items:start}
@media (max-width:900px){.endband .inner{grid-template-columns:1fr}}
.endband .eyebrow{font-size:13px;font-weight:600;letter-spacing:.02em;
  color:#9F99FF;margin:0}
.endband h2{font-size:clamp(26px,2.6vw,36px);line-height:1.25;letter-spacing:-.02em;
  font-weight:600;color:#fff;margin-top:14px;text-wrap:pretty}
.endband .lead{font-size:16px;line-height:1.6;color:var(--navy-mut);margin-top:14px;
  max-width:46ch}
.endband .rows{display:grid;gap:14px;margin-top:32px;font-size:15px;
  color:var(--navy-ink)}
.endband .rows>*{display:flex;gap:12px;align-items:center}
.endband .rows a{color:#fff;font-weight:600}
.endband .rows a:hover{color:#fff}
.endband .ib{flex:0 0 auto;width:36px;height:36px;border-radius:8px;
  background:#14275F;color:var(--navy-ink);display:grid;place-items:center;
  box-shadow:inset 0 0 0 1px rgba(143,161,230,.22)}
.endband .ib svg{width:17px;height:17px}
.endband .card{background:var(--dock);color:#EEF1FA;
  border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:28px;
  box-shadow:0 40px 100px -30px rgba(0,0,0,.7)}
.endband form{display:grid;gap:16px;position:relative}
.endband label{display:grid;gap:6px;font-size:13px;font-weight:600;
  color:var(--navy-ink)}
.endband input,.endband textarea{width:100%;padding:0 14px;height:46px;
  border:1px solid rgba(255,255,255,.14);border-radius:8px;
  background:rgba(255,255,255,.06);color:#fff;font-size:15px;font-weight:400;
  outline:none;transition:border-color .2s,box-shadow .2s}
.endband textarea{height:auto;padding:12px 14px;line-height:1.5;resize:vertical}
.endband input:focus,.endband textarea:focus{border-color:var(--acc);
  box-shadow:0 0 0 4px var(--acc-ring)}
.endband ::placeholder{color:rgba(197,208,245,.55)}
/* a grid item stretches; on the start page the submit is an auto-width pill */
.endband form .btn{justify-self:start}
.endband .hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}
.endband .note{font-size:13px;color:var(--navy-mut);margin:0}
.endband .note a{color:var(--navy-ink);text-decoration:underline}
.endband #form-status{margin:0;font-size:14px;font-weight:600}
.endband #form-status[data-state="ok"]{color:#7BE0A8}
.endband #form-status[data-state="error"]{color:#FF9AA2}
/* The band and the footer are ONE navy region on the start page, with the
   stream running through both. The footer's own top margin would cut a white
   stripe between them. */
.endband+.site-foot{margin-top:0}
"""


CONTACT_JS = """
(function () {
  var f = document.getElementById('contact-form');
  var out = document.getElementById('form-status');
  if (!f || !out) return;

  /* Web3Forms redirects here after a native (non-fetch) submit, which is the
     fallback path both this form and the start page's form use when the request
     cannot be made. Without this the visitor lands on a contact page that looks
     like nothing happened. */
  if (/[?&]sent=1(&|$)/.test(location.search)) {
    out.setAttribute('data-state', 'ok');
    out.textContent = 'Danke – Ihre Nachricht ist da. Sie hören innerhalb von 24 Stunden von Christian oder Kathi.';
    if (history.replaceState) history.replaceState({}, '', location.pathname);
  }

  if (!window.fetch || !window.FormData) return;
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    if (f.elements.company && f.elements.company.value) return;   /* honeypot */
    var btn = f.querySelector('button[type=submit]');
    var label = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Wird gesendet …'; }
    out.removeAttribute('data-state');
    out.textContent = '';
    fetch(f.action, { method: 'POST', body: new FormData(f) })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || d.success !== true) throw new Error('rejected');
        f.reset();
        out.setAttribute('data-state', 'ok');
        out.textContent = 'Danke – Ihre Nachricht ist da. Sie hören innerhalb von 24 Stunden von Christian oder Kathi.';
      })
      .catch(function () {
        /* Never claim it was sent. Let the browser post the form the ordinary
           way; if that is blocked too, the address next to the form still is. */
        out.setAttribute('data-state', 'error');
        out.textContent = 'Das Senden hat nicht geklappt – wir versuchen es direkt.';
        f.submit();
      })
      .then(function () { if (btn) { btn.disabled = false; btn.textContent = label; } });
  });
})();
"""


def contact_band(depth):
    """The page's ending. Not a white "Bereit für ein Gespräch?" card - the
    start page closes on a full navy band carrying the real form, and the
    footer continues the same ground underneath it."""
    r = rel(depth)
    ic = f'{r}brand/mccain-icons.svg'
    return f"""<section class="endband" id="kontakt">
  <div class="ground" aria-hidden="true"></div>
  <div class="inner">
    <div data-reveal>
      <p class="eyebrow">Kontakt</p>
      <h2>Erzählen Sie uns von Ihrem Vorhaben.</h2>
      <p class="lead">Eine Antwort innerhalb von 24 Stunden, ein Festpreis innerhalb
        von 48 &#8211; von einer der zwei Personen, die es bauen würden.</p>
      <div class="rows">
        <a href="mailto:info@mccain-digital.com"><span class="ib" aria-hidden="true">
          <svg viewBox="0 0 24 24"><use href="{ic}#mail"></use></svg></span>info@mccain-digital.com</a>
        <a href="tel:+491705922203"><span class="ib" aria-hidden="true">
          <svg viewBox="0 0 24 24"><use href="{ic}#phone"></use></svg></span>+49 170 59 222 03</a>
        <div><span class="ib" aria-hidden="true">
          <svg viewBox="0 0 24 24"><use href="{ic}#globe"></use></svg></span>
          Holderweg 1 &#183; 86869 Oberostendorf &#183; Bayern</div>
        <div><span class="ib" aria-hidden="true">
          <svg viewBox="0 0 24 24"><use href="{ic}#calendar"></use></svg></span>
          Mo&#8211;Fr &#183; 9:00&#8211;18:00 Uhr (MEZ)</div>
      </div>
    </div>
    <div class="card" data-reveal="0.1">
      <form id="contact-form" method="POST" action="https://api.web3forms.com/submit">
        <input type="hidden" name="access_key" value="{WEB3FORMS_KEY}">
        <input type="hidden" name="subject" value="Anfrage über mccain-digital.com">
        <input type="hidden" name="from_name" value="mccain-digital.com">
        <input type="hidden" name="redirect" value="{ORIGIN}/kontakt.html?sent=1">
        <label>Name<input name="name" type="text" required autocomplete="name"></label>
        <label>E-Mail<input name="email" type="email" required autocomplete="email"></label>
        <label>Worum geht es?<textarea name="message" rows="4" required
          placeholder="Eine Zeile reicht."></textarea></label>
        <div class="hp" aria-hidden="true">
          <label>Firma<input name="company" type="text" tabindex="-1" autocomplete="off"></label>
        </div>
        <button class="btn" type="submit">Anfrage senden
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><use href="{ic}#chevron-right"></use></svg></button>
        <p id="form-status" role="status" aria-live="polite"></p>
        <p class="note">Ihre Angaben werden nur zur Beantwortung Ihrer Anfrage
          verwendet &#8211; <a href="{r}legal/privacy.html">Datenschutz</a>.</p>
      </form>
    </div>
  </div>
</section>"""


def footer(*, depth, current="", contact=True):
    """The page's ending, as the start page ends: the dark contact band, the
    five-column footer on the same navy ground, and the "Die Seite fragen"
    pill. Same object on every page.

    contact=False only on the contact page itself, which would otherwise carry
    the same form twice - and two elements with id="contact-form" is a bug, not
    a duplication.

    The pill is a LINK to index.html#ai, not a second console. The start page's
    console calls window.claude.complete(), which exists only inside the Claude
    Design runtime; a static copy would be a chat window that cannot chat."""
    r = rel(depth)
    band = contact_band(depth) + "\n\n" if contact else ""
    return band + chrome.footer(r=r, current=current) + "\n" + chrome.pill(r=r)


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
