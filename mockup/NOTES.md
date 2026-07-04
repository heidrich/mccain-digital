# Redesign-Mockup „Pixel Physics“ — Stand 2026-07-02 (Welle 4)

**Was:** Design-Source-of-Truth für den McCain-Digital-Relaunch (Homepage). Mix aus
fabrica.framer.media (Ink-Panels auf Off-White, Perioden-Headings, (00X)-Ordinale,
Load-Choreografie) × madebyshape.co.uk (Verspieltheit, Foto-Trust) × unserer
Pixel-Physik-Engine. Später 1:1-Port in den React-Stack, Ziel 4×100 Lighthouse +
SEO 3/3, Awwwards-Einreichung.

**Ansehen:** `index.html` direkt öffnen (file:// funktioniert) oder
`python -m http.server 8091` in diesem Ordner.

## Owner-Regeln (hart)

- KEINE Brauntöne in Schrift. Gelb #F5C518 NUR im Logo (+ Pac-Man).
- Logo/Footer-Wordmark: Original-Font (Segoe UI), „mccain“ fett + „digital“ gelb.
- AI weit oben (Owner: „das ist die zukunft“) — Sektion 2, Content-Basis = Live-Site 00.5.
- Signature-Gimmicks Pflicht: Pixel-Headlines mit Black Hole, Pixel-Buttons, Pac-Man-Scrollbar, Void-Reveal.

## Farb-ROLLENSYSTEM (Welle 3 — Owner: „das bunte hat kein focus“)

- **Grün ist DER Akzent**: alle Interaktions-/Punktuations-Akzente (Heading-Dots,
  Pfeile, Nav-Underline, Stats-Suffixe, Rotator, Focus-Ringe, Terminal-✓) nutzen
  acid #DBFF00 (auf Ink) bzw. acid-deep #7A8C00 (auf Hell, owner-geliebt).
- Violett #5B2EFF + Pink #FF3D8A NUR als große bewusste Flächen: CMS-Work-Cover,
  „Yours next“-Fragezeichen, Pac-Man-Linien-Zyklus. NIE als Streusel in Details.
- Awwwards-Research bestätigt: Top-Studios fahren maximal EINEN Akzent.

## Spacing-System (Welle 3 — Owner: „abstände passen nicht“)

- EINE Rhythmus-Skala: `--sec` (vw-basiert, nicht vh!) — jede Sektion trägt
  `--sec/2` block-padding → Abstand zwischen zwei Blöcken ist ÜBERALL --sec.
- Schmale Bänder auf Multiplikatoren: Stats ×.35, Statement ×.75, Panel-Inner ×.6.
- `--head-gap` (Heading→Content) + `--eyebrow-gap` (Chip-Zeile→Heading). Keine
  losen rem-Inline-Margins mehr — nur Tokens.

## Struktur (Welle 3+4 — Research: 7 Studio-Sites + Awwwards Top 10)

Hero → Statement(001) → **AI(002, INK-PANEL = DER Anker)** → Studio-Foto-Mosaik →
Work(003) → Stats-Band (Pixel-Zahlen) → Services(004, Dark-Panel) → Process(005) →
Reviews(006) → Contact(007) → Footer.

### Welle 4 (Owner-Review der Welle 3)

- **AI-Sektion = eigenes Ink-Panel** mit green-accent.jpg rechts (`.ai-top`-Grid;
  Bild ABSOLUT positioniert, sonst bläht intrinsische Höhe den Grid-Track auf!).
  Pixel-h2 `data-ink="#F4F4F1"` (auf Dark kein data-flash nötig, Default-Acid sichtbar),
  voidHost ebenfalls `#F4F4F1`, Terminal eine Stufe heller (#161613 + Inset-Ring).
- **Work-Covers = Mini-Produkt-UIs** (Owner: „geht viel viel besser"): recall =
  Terminal-FENSTER (Chrome-Dots + Schatten) + Ring; This site = 4 Lighthouse-GAUGES
  (conic-gradient-Ringe, sofort erkennbar); CMS = Editor-Fenster (Layer-Bars ·
  Canvas mit Pixel-W · Inspector mit Acid-Swatch); Next = Dot-Grid + Pink-?.
- **Stats = pixel-assembelte Zahlen** statt Count-up (Owner: „ausgelutscht") —
  jede Zahl ein data-pixel-Host (gap 2.2, size 1.8), Suffixe (+, ×, h, .) leben
  als Live-Text in acid-deep AUSSERHALB des Hosts (data-ink erzwingt Einfarbigkeit).
  Count-up-JS entfernt.
- **Hero-Service-Index verlinkt** (Owner-Wunsch): (001)→#product, Rest→#services.
- **Reviews-Sektion (006)** vor Contact: 3 Platzhalter-Zitate mit Initialen-Scheiben
  und „5.0 on Google“-Badge (alles PLACEHOLDER). Contact = (007).
- **Bugfixes:** `.brands{min-width:0}` (Flex-min-size-Blowout: Marquee-Track drückte
  die Seite auf 2364px!) · ai-photo absolut (Grid-Track-Inflation).
- **KEIN Accordion mehr**: kein einziges Top-Studio versteckt Services hinter Klicks.
  Services = immer sichtbare nummerierte Zeilen: Name + EINE Kunden-Nutzen-Zeile
  („Get found. Look sharp. Load instantly.“) + Capability-Tags.
- Stats VOR Services (Proof vor Pitch). AI-Tiles in Klartext-Nutzen (Humaan-Muster:
  konkrete Aufgaben, kein Tech-Jargon). Work-Tags = Outcomes.
- Testimonial mit Initialen-Scheibe direkt vor dem Kontakt-CTA (PLACEHOLDER —
  echte Referenz einsetzen; nie ein Fake-Stock-Gesicht).
- Footer: Obys-Charme = Live-Uhr (Europe/Berlin).
- Awwwards-Befund: Craft-Elite nennt AI NICHT auf der Homepage → unsere
  AI-First-Positionierung ist eine echte Lücke, solange der Ton Craft bleibt
  (zeigen/Terminal/eigenes Produkt), nicht Consultancy („Transformation“).

## Bilder (`img/`, 10 Unsplash-Downloads, Attribution im Git-Log dieser Welle)

- Platziert: studio-wide + portrait-tall (Studio-Mosaik), process-notes /
  hands-keyboard / team-collab (Process-Steps).
- Reserve: abstract-detail, green-accent (acid auf schwarz, sehr markentreu),
  screen-work, code-screen, circuit-macro.
- ALLE = PLACEHOLDER für echte Studio-Fotografie (Shape-Trust-Pattern braucht
  echte Menschen; Awwwards-Elite nutzt gar keine Stock-Fotos).
- Einheitliche Behandlung: `filter: saturate(.94) contrast(1.04)`.

## Engine-Contract (mockup/pixel-engine.js — gepatchte Kopie von upload/)

- Pixel-Headlines auf hellem Grund: `data-ink` setzen (sonst AA-Fringe-Grau) + `data-flash` (Acid ist auf hell unsichtbar).
- `PixelFX.headline()` auto-playt NICHT → Bootstrap ruft `play()` per IntersectionObserver.
- Webfont im SVG-Rasterizer: `window.PixelFXFontCSS` — http via fetch→FileReader,
  file:// lädt `fonts/schibsted-inline.js` als Fallback-Script.
- voidReveal: Text via `visibility` verstecken (nie `color:transparent`), `play()` per IO.
- voidReveal-Canvas ist breiter als der Text (Sweep-Raum) → `#product { overflow-x: clip }`
  sonst 50px+ H-Overflow auf Mobile.

## Verifiziert (Browser, 2026-07-02 Welle 3)

Boot-Kette komplett (Engine, voidReveal armed, Pac-Bar, Uhr, Statement-Spans),
Bilder lazy-loaden korrekt, Mobile 390px ohne H-Overflow (390=390), Desktop 1440.

## Offen

- Owner-Review Welle 4.
- Echte Studio-Fotos + echte Kundenreferenz vor Launch.
- Unterseiten-Mockups; React-Port-Plan (Engine braucht destroy()-API + Module-Split).

Voller Kontext: Memory `project_mcd_redesign_mockup_0702` + `feedback_mcd_redesign_color_rules`.
