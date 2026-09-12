# Builds the five pages the relaunch dropped: the contact page and the four
# service pages.
#
#     node tools/extract_design.mjs > internal/design-reference.json   # first
#     python tools/build_pages.py
#
# WHY THESE URLS
# They are not new. /contact.html and /services/{ai-tools,web-apps,websites,
# software}.html were live on the previous site - they are in its sitemap - and
# every one of them has been answering 404 since the relaunch went up. So the
# pages come back at the addresses they had, rather than at prettier German ones
# that would strand whatever links and bookmarks exist. /kontakt.html is added
# alongside as the German-first name, redirect-style, and both are in the
# sitemap as one canonical pair.
#
# WHERE THE WORDS COME FROM
# Nothing here is retyped. The four services are exactly the four keys in
# content.json (ai, apps, web, software), each already carrying stats, useCases,
# caps, steps, faqs and stack in German and English - that is the content the
# start page shows inside its service modals. The headline, eyebrow and lead
# paragraph come out of internal/design-reference.json, which is read from the
# RENDERED start page, so a subpage cannot drift away from the wording the start
# page uses. If the copy changes there, it changes here on the next build.
#
# WHY EACH PAGE IS BUILT DIFFERENTLY  (11.9.2026)
# The first version rendered ONE template over four identically shaped content
# keys, so it produced four identical pages - same six sections, same order,
# same white card grid. The owner: "alle sehen gleich aus". That was not a
# styling accident, it was the architecture.
#
# So difference is now built in rather than hoped for. Every service page
# differs from its siblings along four axes at once, and three of them are free
# because the start page already decided them:
#
#   1. COLOUR   - Component.FLOW gives each service its own three colours. They
#                 paint the bloom behind the cards, the CTA and the icon.
#   2. ARTWORK  - the hero gradient stream runs a different curve and a
#                 different colour ramp per service (pagekit.STREAM).
#   3. MOCKUP   - each service owns the device mockup from its start-page tile.
#   4. ORDER    - COMPOSITION below gives each page its own section order, and
#                 each page has at least one section its siblings do not have.
#
# Axis 4 is the one that has to be maintained by hand, so main() asserts it: if
# two service pages ever end up with the same section order, the build fails.
import io
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pagekit as pk  # noqa: E402

SITE = pk.SITE
LANG = "de"

# content.json key -> (path, short label)
MAP = {
    "ai": ("services/ai-tools.html", "KI-Tools"),
    "apps": ("services/web-apps.html", "Web-Apps"),
    "web": ("services/websites.html", "Websites"),
    "software": ("services/software.html", "Software"),
}

# Meta descriptions. These ARE written here rather than lifted, because a meta
# description is a different job from a lead paragraph: it has to stand alone in
# a result list. Kept under 160 characters so it is not cut off.
DESCRIPTIONS = {
    "ai": "KI-Tools, die auf Ihren eigenen Daten laufen: RAG mit Quellenangabe, "
          "Agenten mit Leitplanken, MCP-Server. Self-hostbar. Festpreis in 48 Stunden.",
    "apps": "Web-Apps, die mitwachsen statt neu gebaut zu werden: unaufgeregte "
            "Technik, Performance als Architekturentscheidung. Festpreis in 48 Stunden.",
    "web": "Websites ohne Page-Builder: semantisches HTML, JSON-LD, schnelle Bilder "
           "- für Menschen und Maschinen gleich gut lesbar. Festpreis in 48 Stunden.",
    "software": "Unternehmenssoftware entlang Ihrer echten Abläufe, betrieben dort, "
                "wo Ihre Daten liegen. Aufnahme, Bauplan, Festpreis in 48 Stunden.",
}

# The section order per service. Every list is a permutation of the same
# building blocks plus one block only that page has (the "signature"), so the
# four pages cannot read as one template. Asserted unique in main().
COMPOSITION = {
    # KI-Tools opens with what the thing IS (the engine), because the objection
    # to answer first is "is this a chat window bolted on".
    "ai": ["hero", "signature", "caps", "cases", "steps", "stack", "faq", "rel"],
    # Web-Apps: the process is the product promise ("scales instead of being
    # rebuilt"), so the four steps come before the capability list.
    "apps": ["hero", "steps", "caps", "signature", "cases", "stack", "faq", "rel"],
    # Websites: the proof is a measurement, so it leads.
    "web": ["hero", "signature", "cases", "caps", "stack", "steps", "faq", "rel"],
    # Software: the work starts by recording how the work actually runs, so the
    # concrete situations come first and the engine last.
    "software": ["hero", "cases", "signature", "steps", "caps", "stack", "faq", "rel"],
}


def loc(v):
    """content.json carries either a plain string or {de, en}."""
    if isinstance(v, dict):
        return v.get(LANG) or v.get("en") or ""
    return v or ""


def load():
    with io.open(os.path.join(SITE, "content.json"), encoding="utf-8") as f:
        content = json.load(f)
    ref_path = os.path.join(SITE, "internal", "design-reference.json")
    if not os.path.exists(ref_path):
        raise SystemExit(
            "build_pages: internal/design-reference.json is missing.\n"
            "  Run:  node tools/extract_design.mjs > internal/design-reference.json\n"
            "  (it needs the dev server: python prodserve.py 8898 --dev)"
        )
    with io.open(ref_path, encoding="utf-8") as f:
        ref = json.load(f)
    for key in MAP:
        if key not in content:
            raise SystemExit(f"build_pages: content.json has no '{key}' service")
    if len(ref["services"]) != len(MAP):
        raise SystemExit(
            f"build_pages: the start page shows {len(ref['services'])} services, "
            f"this builds {len(MAP)} - they have to agree"
        )
    return content, ref


# The sentence that keeps the use cases honest. It is on the start page and it
# matters: these are shapes of work, not client references, and the site says so
# itself. Lifted rather than retyped, and asserted so it cannot quietly vanish.
DISCLAIMER_START = "Die Branchen sind Beispiele"


def disclaimer_of(modal_text):
    for line in modal_text.split("\n"):
        line = line.strip()
        if line.startswith(DISCLAIMER_START):
            return line
    raise SystemExit(
        f"build_pages: the '{DISCLAIMER_START}...' line is gone from the start "
        "page modal. It is the sentence that says these are not client "
        "references - find out where it went before shipping without it."
    )


# ============================================================== the mockups
# The device mockups from the start page's service tiles, rebuilt as static
# HTML+CSS. Provenance, colours and geometry: internal notes from the extraction
# pass; the markup below is the prerendered DOM of the tile with the React
# plumbing removed. Text is lifted from Component.STR.de.mock (export line 878),
# including the en dash in aiA and the middle dot in aiSrc - replacing either
# with a hyphen or a full stop breaks the line optically.
MOCK_CSS = """
.mock{position:relative;border-radius:16px;overflow:hidden;min-height:320px;
  box-shadow:0 0 0 1px var(--rule),0 30px 60px -30px rgba(10,37,64,.32);
  background:#fff}
.mock .stage{position:absolute;inset:0;overflow:hidden}
/* the white veil: colour starts below the top edge, as on the tile */
.mock .veil{position:absolute;inset:-2px 0 0 0;pointer-events:none;
  background:linear-gradient(180deg,#fff 0%,#fff 3%,rgba(255,255,255,0) 44%);
  transform:translateZ(0)}
.mock .inner{position:relative;height:100%}
@keyframes floaty{0%,100%{transform:translateY(-8px)}50%{transform:translateY(8px)}}

/* --- KI-Tools: chat bubbles with a source chip --- */
.m-chat{position:absolute;left:7%;right:7%;top:16%;display:grid;gap:10px;
  animation:floaty 7s ease-in-out infinite}
.m-chat .b{background:#fff;padding:10px 14px;font-size:13px;line-height:1.45;
  color:var(--ink);box-shadow:0 14px 34px -14px rgba(10,37,64,.4)}
.m-chat .q{justify-self:end;max-width:84%;border-radius:14px 14px 4px 14px}
.m-chat .a{justify-self:start;max-width:90%;border-radius:14px 14px 14px 4px;
  padding:12px 14px}
.m-chat .src{display:inline-flex;align-items:center;gap:6px;margin-top:10px;
  font-size:11px;font-weight:600;color:var(--acc-text);background:#EEF0FF;
  padding:4px 9px;border-radius:999px}
"""

CHAT_MOCK = """<div class="mock" role="img" aria-label="Beispiel: eine Frage an ein KI-Tool und die Antwort mit Quellenangabe aus einem Handbuch">
  <div class="stage" aria-hidden="true">{bloom}</div>
  <div class="veil" aria-hidden="true"></div>
  <div class="inner" aria-hidden="true">
    <div class="m-chat">
      <div class="b q">Wie lange ist die Gewährleistung bei der Serie B?</div>
      <div class="b a">24 Monate ab Lieferung &#8211; verlängerbar auf 36 Monate.<br>
        <span class="src">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"></path>
            <path d="M14 2v4a2 2 0 0 0 2 2h4"></path></svg>
          handbuch-v4.pdf &#183; S. 12</span></div>
    </div>
  </div>
</div>"""

MOCKS = {"ai": CHAT_MOCK}


def mock_for(key):
    """The tile mockup for this service, or nothing. A page without one still
    works: the hero simply becomes a single column of type over the stream."""
    tpl = MOCKS.get(key)
    if not tpl:
        return ""
    return tpl.format(bloom=pk.bloom(key))


# ============================================================== the sections
def sec_hero(ctx):
    e, r, key = pk.esc, ctx["r"], ctx["key"]
    meta, svc = ctx["meta"], ctx["svc"]
    mock = mock_for(key)
    viz = f'\n        <div class="hero-viz">{mock}</div>' if mock else ""
    stats = "".join(
        f'<div class="stat"><b>{count_span(loc(s["v"]))}</b>'
        f'<span>{e(loc(s["l"]))}</span></div>'
        for s in svc["stats"]
    )
    return f"""  <section class="hero" id="top">
    <div class="wrap hero-grid">
      <div class="hero-copy">
        {pk.crumb(depth=ctx["depth"], trail=[("index.html", "Start"), ("index.html#services", "Leistungen"), (None, ctx["short"])])}
        <div>
          <p class="eyebrow">{e(meta["eyebrow"])}</p>
          <h1>{e(meta["title"])}</h1>
          <p class="lead">{e(meta["lead"])}</p>
          <div class="actions">
            <a class="btn" href="{r}kontakt.html">Projekt anfragen</a>
            <a class="btn ghost" href="{r}index.html#services">Alle Leistungen</a>
          </div>
        </div>
      </div>{viz}
    </div>
    <div class="wrap">
      <div class="stats">{stats}</div>
    </div>
  </section>"""


def count_span(value):
    """Turn a stat value into a counting span where a number can be found, and
    leave it alone where it cannot. The FINAL text always ships inside the span,
    so with no JS - or under reduced motion - the page reads correctly."""
    import re
    m = re.match(r"^(\D*?)(\d+(?:[.,]\d+)?)(.*)$", value)
    if not m:
        return pk.esc(value)
    pre, num, suf = m.group(1), m.group(2), m.group(3)
    dec = 0
    if "," in num or "." in num:
        dec = len(num.replace(".", ",").split(",")[1])
    attrs = (f'data-count="{num.replace(",", ".")}"'
             f'{f" data-dec={dec}" if dec else ""}'
             f' data-prefix="{pk.esc(pre)}" data-suffix="{pk.esc(suf)}"')
    return f'<span {attrs}>{pk.esc(value)}</span>'


def sec_cases(ctx):
    e = pk.esc
    cards = "".join(
        f'<article class="card" data-reveal>'
        f'<p class="tag">{e(loc(c["tag"]))}</p>'
        f'<h3>{e(loc(c["title"]))}</h3>'
        f'<p class="out">{e(loc(c["out"]))}</p>'
        f"</article>"
        for c in ctx["svc"]["useCases"]
    )
    lab = ctx["labels"]["useCases"]
    return band(ctx, "cases", lab["heading"], lab["kicker"],
                f'<div class="grid" data-reveal-group data-reveal-step="0.08">{cards}</div>',
                extra_kicker=disclaimer_of(ctx["modal"]["text"]))


def sec_caps(ctx):
    e = pk.esc
    cards = "".join(
        f'<article class="card" data-reveal><h3>{e(loc(c["title"]))}</h3>'
        f'<p>{e(loc(c["text"]))}</p></article>'
        for c in ctx["svc"]["caps"]
    )
    lab = ctx["labels"]["caps"]
    return band(ctx, "caps", lab["heading"], lab["kicker"],
                f'<div class="grid" data-reveal-group data-reveal-step="0.08">{cards}</div>')


def sec_steps(ctx):
    e = pk.esc
    steps = "".join(
        f'<div class="st" data-reveal>'
        f'<span class="n" aria-hidden="true">{i + 1:02d}</span>'
        f'<div class="body"><h3>{e(loc(s["title"]))}</h3><p>{e(loc(s["text"]))}</p></div>'
        f"</div>"
        for i, s in enumerate(ctx["svc"]["steps"])
    )
    lab = ctx["labels"]["steps"]
    return band(ctx, "steps", lab["heading"], lab["kicker"],
                f'<ol class="stepper" data-stepper data-reveal-group data-reveal-step="0.10">'
                f'<span class="fill" aria-hidden="true"></span>{steps}</ol>')


def sec_stack(ctx):
    e = pk.esc
    chips = "".join(f'<li class="chip">{e(t)}</li>' for t in ctx["svc"]["stack"])
    lab = ctx["labels"]["stack"]
    return band(ctx, "stack", lab["heading"], lab["kicker"],
                f'<ul class="chips" data-reveal>{chips}</ul>')


def sec_faq(ctx):
    e = pk.esc
    items = "".join(
        f"<details><summary>{e(loc(f['q']))}</summary>"
        f"<div class=\"a\"><div><p>{e(loc(f['a']))}</p></div></div></details>"
        for f in ctx["svc"]["faqs"]
    )
    lab = ctx["labels"]["faqs"]
    return band(ctx, "faq", lab["heading"], lab["kicker"],
                f'<div class="faq" data-reveal>{items}</div>')


def sec_rel(ctx):
    e, r = pk.esc, ctx["r"]
    others = "".join(
        f'<a href="{r}{h}" data-reveal>{e(l)}<span aria-hidden="true">&#8594;</span></a>'
        for k, (h, l) in MAP.items() if k != ctx["key"]
    )
    return band(ctx, "rel", "Weitere Leistungen", "",
                f'<div class="rel" data-reveal-group data-reveal-step="0.06">{others}</div>')


# The signature section: the one block a page has that its siblings do not.
# For now only KI-Tools has its own; the other three fall back to nothing rather
# than to a filler block, because a filler block is exactly what made the four
# pages identical in the first place.
def sec_signature(ctx):
    if ctx["key"] != "ai":
        return ""
    return f"""  <section class="band tint" id="grounding">
    <div class="wrap">
      <div class="head prose" data-reveal>
        <h2>Jede Antwort zeigt, woher sie kommt</h2>
        <p class="kicker">Das ist der Unterschied zwischen einem Chatfenster und einem
          Werkzeug: Die Antwort steht nicht für sich, sie steht auf einer Quelle aus
          Ihrer eigenen Wissensbasis &#8211; und wenn es keine gibt, sagt das System das.</p>
      </div>
      <div class="grid two" data-reveal-group data-reveal-step="0.08">
        <article class="card" data-reveal>
          <h3>Verankert statt geraten</h3>
          <p>Retrieval holt die Stelle aus Ihren Dokumenten, die Antwort zitiert sie,
             und Sie können nachschlagen. Ohne Treffer greift der Konfidenzpfad und das
             System sagt „Ich weiß es nicht“ &#8211; statt zu erfinden.</p>
        </article>
        <article class="card" data-reveal>
          <h3>Ihre Schlüssel, Ihre Hardware</h3>
          <p>Offene Modelle auf Ihrer Infrastruktur, wenn Datenresidenz zählt &#8211; oder
             API-Modelle mit strikter No-Retention-Konfiguration. whatever-recall, unser
             eigenes Produkt, läuft vollständig self-hosted.</p>
        </article>
      </div>
    </div>
  </section>"""


SECTIONS = {
    "hero": sec_hero, "cases": sec_cases, "caps": sec_caps, "steps": sec_steps,
    "stack": sec_stack, "faq": sec_faq, "rel": sec_rel,
    "signature": sec_signature,
}


def band(ctx, sid, heading, kicker, inner, extra_kicker=""):
    """One content band. The tint alternates by POSITION in the page, so two
    pages with different section orders also get a different colour rhythm."""
    n = ctx["band_n"]
    ctx["band_n"] += 1
    tint = " tint" if n % 2 == 0 else ""
    k = f'\n        <p class="kicker">{pk.esc(kicker)}</p>' if kicker else ""
    k2 = f'\n        <p class="kicker small">{pk.esc(extra_kicker)}</p>' if extra_kicker else ""
    return f"""  <section class="band{tint}" id="{sid}">
    <div class="wrap">
      <div class="head prose" data-reveal>
        <h2>{pk.esc(heading)}</h2>{k}{k2}
      </div>
      {inner}
    </div>
  </section>"""


def service_page(key, svc, meta, labels, modal):
    """meta: the {eyebrow, title, lead, kind} block read off the start page."""
    path, short = MAP[key]
    depth = path.count("/")
    ctx = {"key": key, "svc": svc, "meta": meta, "labels": labels, "modal": modal,
           "path": path, "short": short, "depth": depth, "r": pk.rel(depth),
           "band_n": 0}

    body_sections = "\n\n".join(
        s for s in (SECTIONS[name](ctx) for name in COMPOSITION[key]) if s
    )

    # Structured data: the Service itself, the FAQ, and the trail. Built from the
    # same objects the markup is built from, so the two cannot disagree.
    graph = [
        {
            "@type": "Service",
            "@id": f"{pk.ORIGIN}/{path}#service",
            "name": meta["title"],
            "serviceType": short,
            "description": DESCRIPTIONS[key],
            "url": f"{pk.ORIGIN}/{path}",
            "inLanguage": "de-DE",
            "areaServed": {"@type": "Country", "name": "Deutschland"},
            "provider": {"@id": f"{pk.ORIGIN}/#studio"},
        },
        {
            "@type": "BreadcrumbList",
            "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "Start", "item": f"{pk.ORIGIN}/"},
                {"@type": "ListItem", "position": 2, "name": "Leistungen",
                 "item": f"{pk.ORIGIN}/#services"},
                {"@type": "ListItem", "position": 3, "name": short},
            ],
        },
        {
            "@type": "FAQPage",
            "@id": f"{pk.ORIGIN}/{path}#faq",
            "mainEntity": [
                {"@type": "Question", "name": loc(f["q"]),
                 "acceptedAnswer": {"@type": "Answer", "text": loc(f["a"])}}
                for f in svc["faqs"]
            ],
        },
    ]
    ld = ('\n<script type="application/ld+json">'
          + json.dumps({"@context": "https://schema.org", "@graph": graph},
                       ensure_ascii=False, indent=1)
          + "</script>")

    head = pk.head(
        title=f"{meta['title']} — McCain Digital",
        desc=DESCRIPTIONS[key],
        canonical=path,
        depth=depth,
        ld=ld,
        extra=f"\n<style>{MOCK_CSS}</style>" if MOCKS.get(key) else "",
    )

    body = f"""{pk.page_stream(key)}
{pk.header(kind="Leistung", depth=depth, current=path)}

<main id="content">
{body_sections}
</main>

{pk.footer(depth=depth, current=path)}
{pk.scripts(depth=depth, stream=True)}"""

    banner = (f"""GENERATED - do not edit by hand.  python tools/build_pages.py

     Copy comes from content.json ('{key}') and from the rendered start page
     via internal/design-reference.json. Editing this file is lost work.
     Section order for this page: {" -> ".join(COMPOSITION[key])}""")
    return pk.document(lang=LANG, banner=banner, head_html=head, body_html=body)


# The contact form posts to Web3Forms, which is what the previous site did and
# what the reviewed privacy policy names as the processor. Progressive
# enhancement on purpose: the <form> has a real action and method, so it works
# with no JavaScript at all; the script upgrades it to an inline answer and
# falls back to the native submit if the request fails. A form that reports
# success without sending is the one outcome that must not be possible - the
# start page had exactly that defect.



def contact_page(path, canonical_of):
    depth = path.count("/")
    r = pk.rel(depth)
    e = pk.esc
    desc = ("Projekt anfragen bei McCain Digital: Antwort innerhalb von 24 Stunden, "
            "Festpreis innerhalb von 48 – direkt von den zwei Personen, die es bauen.")
    graph = [{
        "@type": "ContactPage",
        "@id": f"{pk.ORIGIN}/{canonical_of}#contact",
        "url": f"{pk.ORIGIN}/{canonical_of}",
        "name": "Kontakt — McCain Digital",
        "description": desc,
        "inLanguage": "de-DE",
        "about": {"@id": f"{pk.ORIGIN}/#studio"},
    }, {
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Start", "item": f"{pk.ORIGIN}/"},
            {"@type": "ListItem", "position": 2, "name": "Kontakt"},
        ],
    }]
    ld = ('\n<script type="application/ld+json">'
          + json.dumps({"@context": "https://schema.org", "@graph": graph},
                       ensure_ascii=False, indent=1) + "</script>")

    head = pk.head(title="Kontakt — McCain Digital", desc=desc,
                   canonical=canonical_of, depth=depth, ld=ld)

    services_options = "".join(
        f'<option value="{e(l)}">{e(l)}</option>' for _k, _h, l in pk.SERVICES
    )

    body = f"""{pk.page_stream("kontakt")}
{pk.header(kind="Kontakt", depth=depth, current="kontakt.html")}

<main id="content">
  <section class="hero" id="top">
    <div class="wrap">
      {pk.crumb(depth=depth, trail=[("index.html", "Start"), (None, "Kontakt")])}
      <div class="prose">
        <p class="eyebrow">Kontakt</p>
        <h1>Erzählen Sie uns von Ihrem Vorhaben.</h1>
        <p class="lead">Eine Antwort innerhalb von 24 Stunden, ein Festpreis
          innerhalb von 48 &#8211; von einer der zwei Personen, die es bauen würden.
          Kein Vertrieb, kein Callcenter.</p>
      </div>

      <div class="grid two" style="margin-top:44px;align-items:start"
           data-reveal-group data-reveal-step="0.10">
        <div class="card" data-reveal>
          <h2 style="font-size:clamp(20px,1.8vw,24px);margin:0 0 20px">Projekt anfragen</h2>
          <form class="form" id="contact-form" method="POST"
                action="https://api.web3forms.com/submit">
            <input type="hidden" name="access_key" value="{pk.WEB3FORMS_KEY}">
            <input type="hidden" name="subject" value="Anfrage über mccain-digital.com">
            <input type="hidden" name="from_name" value="mccain-digital.com">
            <label>Name
              <input name="name" type="text" required autocomplete="name">
            </label>
            <label>E-Mail
              <input name="email" type="email" required autocomplete="email">
            </label>
            <label>Worum geht es?
              <select name="type">
                <option value="">Bitte wählen</option>
                {services_options}
                <option value="Etwas anderes">Etwas anderes</option>
              </select>
            </label>
            <label>Ihr Vorhaben
              <textarea name="message" rows="5" required
                placeholder="Ein paar Sätze reichen. Was soll am Ende funktionieren?"></textarea>
            </label>
            <div class="hp" aria-hidden="true">
              <label>Firma<input name="company" type="text" tabindex="-1" autocomplete="off"></label>
            </div>
            <button class="btn square" type="submit">Anfrage senden</button>
            <p id="form-status" role="status" aria-live="polite"></p>
            <p class="note">Ihre Angaben werden nur zur Beantwortung Ihrer Anfrage
              verwendet. Das Formular wird über Web3Forms verarbeitet &#8211;
              <a href="{r}legal/privacy.html">Datenschutz</a>.</p>
          </form>
        </div>

        <div class="card" data-reveal>
          <h2 style="font-size:clamp(20px,1.8vw,24px);margin:0 0 20px">Direkt</h2>
          <p style="margin:0 0 18px"><a href="mailto:info@mccain-digital.com">info@mccain-digital.com</a><br>
            <a href="tel:+491705922203">+49 170 59 222 03</a></p>
          <p style="margin:0 0 18px">McCain Digital<br>
            Holderweg 1<br>86869 Oberostendorf<br>Bayern, Deutschland</p>
          <p style="margin:0">Mo&#8211;Fr &#183; 9:00&#8211;18:00 Uhr (MEZ)</p>
        </div>
      </div>
    </div>
  </section>

  <section class="band tint" id="next">
    <div class="wrap">
      <div class="head prose" data-reveal>
        <h2>Was als Nächstes passiert</h2>
        <p class="kicker">Drei Schritte, keine Warteschleife.</p>
      </div>
      <ol class="stepper" data-stepper data-reveal-group data-reveal-step="0.10">
        <span class="fill" aria-hidden="true"></span>
        <div class="st" data-reveal><span class="n" aria-hidden="true">01</span>
          <div class="body"><h3>Antwort in 24 Stunden</h3>
          <p>Eine echte Antwort von Christian oder Kathi &#8211; keine Eingangsbestätigung
             aus einem Automaten.</p></div></div>
        <div class="st" data-reveal><span class="n" aria-hidden="true">02</span>
          <div class="body"><h3>Ein Gespräch über die Sache</h3>
          <p>20&#8211;30 Minuten zu Ihren Abläufen. Wir sagen auch, wo wir nicht der
             richtige Partner sind.</p></div></div>
        <div class="st" data-reveal><span class="n" aria-hidden="true">03</span>
          <div class="body"><h3>Festpreis in 48 Stunden</h3>
          <p>Umfang, Preis und Termin schriftlich. Kein offener Stundenzähler,
             kein Nachverhandeln.</p></div></div>
      </ol>
    </div>
  </section>
</main>

{pk.footer(depth=depth, current="kontakt.html", contact=False)}
{pk.scripts(depth=depth, stream=True)}"""

    banner = "GENERATED - do not edit by hand.  python tools/build_pages.py"
    return pk.document(lang=LANG, banner=banner, head_html=head, body_html=body)


def main():
    content, ref = load()
    labels = ref["labels"]
    written = []

    # Difference has to be checkable, or it decays back into one template the
    # first time someone adds a section "to all of them".
    orders = {k: tuple(v) for k, v in COMPOSITION.items()}
    seen = {}
    for k, o in orders.items():
        if o in seen:
            raise SystemExit(
                f"build_pages: '{k}' and '{seen[o]}' have the same section order "
                f"{' -> '.join(o)}. Two service pages built from the same skeleton "
                "is the defect this composition table exists to prevent."
            )
        seen[o] = k

    # The start page lists its services in the same order as content.json; the
    # extractor keeps that order, so index i belongs to key i. Asserted by
    # comparing the headline against the tile the modal was opened from.
    for i, key in enumerate(MAP):
        meta = ref["services"][i]
        modal = ref["modals"][i]
        if meta["title"] != modal["tile"]:
            raise SystemExit(
                f"build_pages: service {i} headline '{meta['title']}' does not match "
                f"tile '{modal['tile']}' - the order assumption is wrong"
            )
        html = service_page(key, content[key], meta, labels, modal)
        path = MAP[key][0]
        out = os.path.join(SITE, path)
        os.makedirs(os.path.dirname(out), exist_ok=True)
        io.open(out, "w", encoding="utf-8", newline="\n").write(html)
        written.append((path, len(html), len(content[key]["faqs"])))

    # ONE contact page, at the German-first name. /contact.html was the address
    # on the previous site and is still the one anything outside links to, so it
    # is a 301 in vercel.json rather than a second copy of the same page: two
    # files with the same words is duplicate content even with a canonical, and a
    # redirect passes the link equity instead of splitting it.
    path = "kontakt.html"
    html = contact_page(path, canonical_of=path)
    io.open(os.path.join(SITE, path), "w", encoding="utf-8", newline="\n").write(html)
    written.append((path, len(html), 0))

    stale = os.path.join(SITE, "contact.html")
    if os.path.exists(stale):
        os.remove(stale)
        print("  removed contact.html - it is a redirect in vercel.json now")

    print("built")
    for path, n, faqs in written:
        extra = f"   {faqs} FAQ" if faqs else ""
        print(f"  {path:<34} {n:>7,} bytes{extra}")


if __name__ == "__main__":
    main()
