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
import io
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pagekit as pk  # noqa: E402

SITE = pk.SITE
LANG = "de"

# content.json key -> (path, short label, breadcrumb label)
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


def service_page(key, svc, meta, labels, modal):
    """meta: the {eyebrow, title, lead, kind} block read off the start page."""
    path, short = MAP[key]
    depth = path.count("/")
    r = pk.rel(depth)
    e = pk.esc

    stats = "".join(
        f'<div class="stat"><b>{e(loc(s["v"]))}</b><span>{e(loc(s["l"]))}</span></div>'
        for s in svc["stats"]
    )

    cases = "".join(
        f'<article class="card">'
        f'<p class="tag">{e(loc(c["tag"]))}</p>'
        f'<h3>{e(loc(c["title"]))}</h3>'
        f'<p class="out">{e(loc(c["out"]))}</p>'
        f"</article>"
        for c in svc["useCases"]
    )

    caps = "".join(
        f'<article class="card"><h3>{e(loc(c["title"]))}</h3><p>{e(loc(c["text"]))}</p></article>'
        for c in svc["caps"]
    )

    steps = "".join(
        f'<article class="step"><span class="n">{i + 1:02d}</span>'
        f'<h3>{e(loc(s["title"]))}</h3><p>{e(loc(s["text"]))}</p></article>'
        for i, s in enumerate(svc["steps"])
    )

    chips = "".join(f'<li class="chip">{e(t)}</li>' for t in svc["stack"])

    faqs = "".join(
        f"<details><summary>{e(loc(f['q']))}</summary><p>{e(loc(f['a']))}</p></details>"
        for f in svc["faqs"]
    )

    others = "".join(
        f'<a href="{r}{h}">{e(l)}<span aria-hidden="true">→</span></a>'
        for k, (h, l) in MAP.items() if k != key
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
    )

    body = f"""{pk.header(kind="Leistung", depth=depth, current=path)}

<main id="content">
  <section class="band">
    <div class="wrap">
      {pk.crumb(depth=depth, trail=[("index.html", "Start"), ("index.html#services", "Leistungen"), (None, short)])}
      <div class="prose">
        <p class="eyebrow">{e(meta["eyebrow"])}</p>
        <h1>{e(meta["title"])}</h1>
        <p class="lead">{e(meta["lead"])}</p>
        <div class="actions">
          <a class="btn" href="{r}kontakt.html">Projekt anfragen</a>
          <a class="btn ghost" href="{r}index.html#services">Alle Leistungen</a>
        </div>
      </div>
      <div class="stats">{stats}</div>
    </div>
  </section>

  <section class="band tint">
    <div class="wrap">
      <div class="head prose">
        <h2>{e(labels["useCases"]["heading"])}</h2>
        <p class="kicker">{e(labels["useCases"]["kicker"])}</p>
        <p class="kicker">{e(disclaimer_of(modal["text"]))}</p>
      </div>
      <div class="grid">{cases}</div>
    </div>
  </section>

  <section class="band">
    <div class="wrap">
      <div class="head prose">
        <h2>{e(labels["caps"]["heading"])}</h2>
        <p class="kicker">{e(labels["caps"]["kicker"])}</p>
      </div>
      <div class="grid">{caps}</div>
    </div>
  </section>

  <section class="band tint">
    <div class="wrap">
      <div class="head prose">
        <h2>{e(labels["steps"]["heading"])}</h2>
        <p class="kicker">{e(labels["steps"]["kicker"])}</p>
      </div>
      <div class="steps">{steps}</div>
    </div>
  </section>

  <section class="band">
    <div class="wrap">
      <div class="head prose"><h2>{e(labels["stack"]["heading"])}</h2></div>
      <ul class="chips">{chips}</ul>
    </div>
  </section>

  <section class="band tint">
    <div class="wrap">
      <div class="head prose">
        <h2>{e(labels["faqs"]["heading"])}</h2>
        <p class="kicker">{e(labels["faqs"]["kicker"])}</p>
      </div>
      <div class="faq">{faqs}</div>
    </div>
  </section>

  <section class="band">
    <div class="wrap">
      <div class="head prose"><h2>Weitere Leistungen</h2></div>
      <div class="rel">{others}</div>
    </div>
  </section>

  <section class="band">
    <div class="wrap">
      <div class="cta">
        <h2>{e(labels["cta"]["heading"])}</h2>
        <p>Antwort in 24 Stunden, Festpreis in 48 – von einer der zwei Personen,
           die es bauen würden.</p>
        <div class="actions">
          <a class="btn" href="{r}kontakt.html">Projekt anfragen</a>
          <a class="btn ghost" href="mailto:info@mccain-digital.com">info@mccain-digital.com</a>
        </div>
      </div>
    </div>
  </section>
</main>

{pk.footer(depth=depth, current=path)}"""

    banner = (f"""GENERATED - do not edit by hand.  python tools/build_pages.py

     Copy comes from content.json ('{key}') and from the rendered start page
     via internal/design-reference.json. Editing this file is lost work.""")
    return pk.document(lang=LANG, banner=banner, head_html=head, body_html=body)


# The contact form posts to Web3Forms, which is what the previous site did and
# what the reviewed privacy policy names as the processor. Progressive
# enhancement on purpose: the <form> has a real action and method, so it works
# with no JavaScript at all; the script upgrades it to an inline answer and
# falls back to the native submit if the request fails. A form that reports
# success without sending is the one outcome that must not be possible - the
# start page had exactly that defect.
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

    body = f"""{pk.header(kind="Kontakt", depth=depth, current="kontakt.html")}

<main id="content">
  <section class="band">
    <div class="wrap">
      {pk.crumb(depth=depth, trail=[("index.html", "Start"), (None, "Kontakt")])}
      <div class="prose">
        <p class="eyebrow">Kontakt</p>
        <h1>Erzählen Sie uns von Ihrem Vorhaben.</h1>
        <p class="lead">Eine Antwort innerhalb von 24 Stunden, ein Festpreis innerhalb
          von 48 – von einer der zwei Personen, die es bauen würden. Kein Vertrieb,
          kein Callcenter.</p>
      </div>

      <div class="grid" style="margin-top:44px;align-items:start">
        <div class="card">
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
            <button class="btn" type="submit">Anfrage senden</button>
            <p id="form-status" role="status" aria-live="polite"></p>
            <p class="note">Ihre Angaben werden nur zur Beantwortung Ihrer Anfrage
              verwendet. Das Formular wird über Web3Forms verarbeitet –
              <a href="{r}legal/privacy.html">Datenschutz</a>.</p>
          </form>
        </div>

        <div class="card">
          <h2 style="font-size:clamp(20px,1.8vw,24px);margin:0 0 20px">Direkt</h2>
          <p style="margin:0 0 18px"><a href="mailto:info@mccain-digital.com">info@mccain-digital.com</a><br>
            <a href="tel:+491705922203">+49 170 59 222 03</a></p>
          <p style="margin:0 0 18px">McCain Digital<br>
            Holderweg 1<br>86869 Oberostendorf<br>Bayern, Deutschland</p>
          <p style="margin:0">Mo–Fr · 9:00–18:00 Uhr (MEZ)</p>
        </div>
      </div>
    </div>
  </section>

  <section class="band tint">
    <div class="wrap">
      <div class="head prose">
        <h2>Was als Nächstes passiert</h2>
        <p class="kicker">Drei Schritte, keine Warteschleife.</p>
      </div>
      <div class="steps">
        <article class="step"><span class="n">01</span>
          <h3>Antwort in 24 Stunden</h3>
          <p>Eine echte Antwort von Christian oder Kathi – keine Eingangsbestätigung
             aus einem Automaten.</p></article>
        <article class="step"><span class="n">02</span>
          <h3>Ein Gespräch über die Sache</h3>
          <p>20–30 Minuten zu Ihren Abläufen. Wir sagen auch, wo wir nicht der
             richtige Partner sind.</p></article>
        <article class="step"><span class="n">03</span>
          <h3>Festpreis in 48 Stunden</h3>
          <p>Umfang, Preis und Termin schriftlich. Kein offener Stundenzähler,
             kein Nachverhandeln.</p></article>
      </div>
    </div>
  </section>
</main>

{pk.footer(depth=depth, current="kontakt.html")}
<script>{CONTACT_JS}</script>"""

    banner = "GENERATED - do not edit by hand.  python tools/build_pages.py"
    return pk.document(lang=LANG, banner=banner, head_html=head, body_html=body)


def main():
    content, ref = load()
    labels = ref["labels"]
    written = []

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
