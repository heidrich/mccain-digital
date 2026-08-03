# v3-proposal — Stand 2026-08-03

Neuer Homepage-Entwurf. **Nicht live.** `upload/` (live) und `upload-v2/`
(4×100-Vorwelle) sind unangetastet.

## Git

Alles liegt auf **`v2-homepage-refresh`**, gepusht nach `origin`
(`heidrich/mccain-digital`). Der v3-Commit ist `16dabe6`, 62 Dateien.
Der Branch ist zwei Commits vor `main`: der v2-Refresh und dieser hier.
PR-Link steht in der Push-Ausgabe bereit, ist aber noch nicht angelegt.

**Nicht committet und mit Absicht liegengelassen:** drei geänderte Dateien in
`upload/` (`services/ai-tools.html`, `styles.css`, `svc-page.js`, zusammen
+717 Zeilen). Die stammen aus einer Session im Juni, nicht aus dieser Arbeit —
wer sie einsammelt, sollte vorher wissen, was da halbfertig ist.

`CHANGELOG.md` steht in `.gitignore` (bewusst: nur intern), wird aber trotzdem
gepflegt — der v3-Eintrag steht unter `[Unreleased]`.

## Starten

```bash
cd v3-proposal && python -m http.server 8898   # dieser Entwurf
cd upload-v2   && python -m http.server 8899   # Vorwelle, 4×100
cd _v2-preview && python -m http.server 8890   # Claude-Design-Vorlage "Fresh v2"
```

Hell/Dunkel: Sonnen-Icon in der Nav (Zustand in `localStorage`).

## Entscheidungen (Owner)

| Thema | Entscheidung |
| --- | --- |
| Stack | **Vanilla bleibt.** React/Next war im Gespräch, einziges starkes Argument wäre Dogfooding von Whatever-CMS gewesen — CMS ist aber nicht fertig und kommt erst nach den anderen Projekten. |
| WebGL | **Verworfen.** GPU-Wortmarke, Ink→Paper-Shader und Bild-Displacement gefielen nicht. Code liegt in `_parked/webgl.js`, ist nicht eingebunden. |
| Services | **Vier statt sechs:** AI Tools · Web Apps · Websites · Software für Firmen. Mobile Apps und Design & Brand raus. |
| Logo | Unsere Wortmarke `mccain` weiß + `digital` gelb. Die `mccain digital®`-Pille der Vorlage war falsch. |
| Nav-Auto-Hide | **Entfernt und bleibt entfernt** — es hat Pac-Man kaputt gemacht. |
| Serifen | Keine. Hausschrift Schibsted Grotesk überall. |

## Dateien

- `data.js` — **eine Quelle für alle Seiten.** `window.MCD` = `{ SERVICES, NAV,
  FAQ, KB, FALLBACK, TIPS, lookup, stream }`. Preise, Versprechen, Service-Namen
  und der Typewriter stehen **nur hier**. Konsole, FAQ und Menü teilen sich
  dieselbe Wissensbasis. `NAV` enthält auch die vier Rechtsseiten.
- `common.js` — **die geteilte Laufzeit jeder Seite**: Webfont-Einbettung,
  Theme, Nav, magnetische Buttons, Marquee, Chip-Tooltips, FAQ-Widget,
  Kontaktformular-Hinweis, Pixel-Boot. Veröffentlicht `window.MCDUI`.
- `v3.js` — **nur** die Startseite: KI-Konsole, Work-Slider, Sticky-Service-
  Karten, Score-Chips.
- `menu.js` — Kommando-Menü, **auf jeder Seite**
- `index.html` — Startseite
- `contact.html` — Kontakt
- `services/*.html` — vier Service-Seiten (ai-tools, web-apps, websites, software)
- `legal/*.html` — Impressum, Datenschutz, AGB, Widerruf.
  **Der Fließtext ist wörtlich aus `upload/legal/` übernommen** — juristisch
  geprüfte Formulierung, nicht neu tippen. Neu erzeugen statt von Hand
  bearbeiten: `scratchpad/build_legal.py` (siehe unten).
- `v3.css` — Designsystem (Tokens, zwei Themes, Scroll-Choreografie, Menü,
  Service-Bausteine, Rechtsseiten-Typografie)
- `pacman.js` — Scroll-Fortschritt, 1:1 aus dem Live-Stand extrahiert
- `pixel-engine.js` — Kopie der Live-Engine **plus drei Patches** (siehe unten)
- `prodserve.py` — Mess-Server mit gzip + Cache-Headern (siehe Lighthouse)
- `img/logos/*.svg` — echte Herstellermarken (simple-icons), per CSS-Mask getönt

**Skript-Reihenfolge ist bindend** (alle `defer`, laufen also der Reihe nach):

```html
<script src="data.js" defer></script>       <!-- MUSS zuerst: alle lesen daraus -->
<script src="pixel-engine.js" defer></script><!-- common.js hängt sich sync ein -->
<script src="common.js" defer></script>      <!-- setzt window.MCDUI -->
<script src="pacman.js" defer></script>
<script src="menu.js" defer></script>
<script src="v3.js" defer></script>          <!-- NUR index.html -->
```

Eine Service-, Kontakt- oder Rechtsseite braucht **kein eigenes Skript**:
`common.js` verdrahtet ein FAQ, dessen Reiter schon im HTML stehen, selbst
(`#faqList` + `#faqSrc`). Die Startseite rendert ihre Reiter aus `data.js` und
ruft `MCDUI.faq()` danach selbst auf — ein Widget, zwei Inhaltsquellen.

**Rechtsseiten neu erzeugen** (nach einer Änderung an `upload/legal/`):

```bash
python tools/build_legal.py     # liest upload/legal/, schreibt v3-proposal/legal/
```

Das Skript hebt den `<main>`-Inhalt unverändert heraus und setzt ihn in die
v3-Hülle. Es schreibt **nur** Hrefs um (`/legal/x.html` → `x.html`, `/` →
`../index.html`), damit die Seiten auch aus einem Unterordner funktionieren —
nie ein Wort des Textes.

## Das Kommando-Menü (`menu.js`)

Bewusst **kein** Mega-Dropdown. Eine Vollbildfläche, die drei Dinge kann, die
eine Linkliste nicht kann:

1. **Tippen zum Springen** — filtert über Titel, Stichwörter (`k`) und
   Beschreibung aller Services und `NAV`-Ziele.
2. **Fragen statt navigieren** — ab zwei Zeichen gibt es immer eine
   „Ask"-Zeile. Sie beantwortet die Frage aus `MCD.lookup()` direkt in der
   Vorschau. Es gibt kein „keine Treffer".
3. **Vorschau** — rechts steht, was auf der Zielseite steht: Nummer,
   Beschreibung, „what you get", Proof-Zeile. Die Überschrift decodiert sich
   aus Rauschen (`aria-hidden`, damit der Screenreader nicht das Flackern
   vorgelesen bekommt — der echte Name steht in der Option-Zeile).

Enter auf der Ask-Zeile geht auf `index.html?ask=…#ai`; `v3.js` nimmt den
Parameter auf, lässt die Konsole antworten und putzt ihn per `replaceState`
wieder aus der URL.

Tastatur: **⌘K / Strg+K** von überall, `/` zum Öffnen (nicht während man in
einem Feld tippt), ↑↓, Home/End, Enter, Esc. Sauberes Combobox-Muster:
`aria-activedescendant` statt fokussierbarer Optionen, Fokus-Falle,
Scroll-Sperre mit Scrollbar-Ausgleich (sonst springt das Layout um ~15px),
Fokus geht an den Auslöser zurück.

**Seiten unterhalb der Wurzel brauchen `data-root=".."` am `<html>`** — daraus
baut `menu.js` alle Pfade. Auslöser ist ein beliebiges Element mit
`data-menu-open`; ein `<kbd data-menu-key>` darin bekommt automatisch ⌘ oder
Ctrl je nach Plattform.

## Patches an der Engine (nur hier, nicht live)

1. **Canvas-Versatz auf die Textbox.** `build()` setzt jetzt `cv.style.top/left`
   auf `textRect - hostRect`. Ohne das sitzt das Pixelfeld bei `line-height`
   unter dem Glyphen-Ratio (~1.23em) zu tief und schmiert in die nächste Zeile.
   **Die Live-Engine hat den Bug noch** — dort fällt er nur nicht auf.
2. **Webfont-Einbettung** für den Rasterizer (`window.PixelFXFontCSS`), sonst
   rasterisiert der foreignObject-Pfad in der Fallback-Schrift.
3. **`pixelImage().reveal()`** — die Fresh-v2-Mechanik nachgebaut: das scharfe
   Bild wird für einen Frame versteckt, der Mosaik-Schwarm fliegt aus einer
   Streuung zusammen (easeOutCubic, 0.9 s + 0.5 s Versatz pro Partikel) und
   übergibt dann an das echte Foto. Hover re-pixelt sofort und öffnet das
   schwarze Loch; beim Verlassen federn die Pixel heim und das Foto kommt
   zurück. **Nicht** an Hover-Fähigkeit gekoppelt — Touch bekommt den Reveal,
   nur kein Loch. Schlägt `build()` fehl (Bild noch nicht geladen, tainted,
   zu klein), bleibt das scharfe Foto sichtbar; kein Zustand lässt es hängen.

## Bekannte Fallstricke der Scroll-Choreografie

- `.rv` / `.rv-s` / `.stagger` animieren **`translate`/`scale`/`rotate`**, nicht
  `transform`. Eine Animation auf `transform` schlägt jeden `:hover`-Transform
  auf demselben Element — damit waren Chip- und Karten-Lifts still tot.
- Bänder mit `position: sticky`-Kindern (`#services`, `#faq`) bekommen
  **`fx-dim`** (nur Opazität). `fx-out` setzt `translate`/`scale` und würde die
  Sticky-Boxen umhängen.
- `#contact` bekommt **gar keinen** Band-Ausblender — nichts darf abdunkeln,
  während jemand das Formular ausfüllt.
- Der Marquee-Track wird zur Laufzeit dupliziert. Deshalb sechs Elemente, nicht
  fünf: bei ungerader Anzahl kippt die voll/hohl-Parität an der Naht.
- `.worktrack` hat `overflow-x: auto` — damit wird `overflow-y` **rechnerisch
  auch `auto`**, die Box clippt also vertikal. Ohne `padding-block: 14px 36px`
  wird beim Hover die obere Kante der Karte abgeschnitten und der Schatten
  unten gekappt.
- `.console` hat **bewusst kein** `overflow: hidden`: der Send-Button zerfällt
  wie jeder gelbe Button und braucht ~64px Flugraum für seine Pixel.
- **Jeder gelbe Button** bekommt den Pixel-Zerfall: `.btn:not(.btn--ghost)`,
  `.console-send`, `.case-peek`. Die „Open →"-Pille ist dafür ein echtes `<a>`
  **über** dem gestreckten Karten-Link (z-index 6) und nur bei `:hover` der
  Karte klickbar — sonst würde die Engine auf einer unsichtbaren Pille feuern.
  `aria-hidden` + `tabindex="-1"`, damit es für Tastatur und Screenreader
  weiterhin genau ein Link pro Karte ist.
- Die Tool-Leiste hängt **unter** dem `.ai-grid`, nicht in der Textspalte. In
  einer halben Spalte brechen fünf Marken immer um; über die volle Breite mit
  `flex-wrap: nowrap` + `space-between` läuft sie als eine Schiene durch
  (ab 1000px; darunter darf sie umbrechen).
- Die Testimonial-Karten sind **Papier-Inseln in beiden Themes** — lokale
  Token-Overrides (`--bg/--fg/--muted/--line`), damit Avatar-Scheibe,
  Sekundärtext und Haarlinien automatisch mitkippen.
- **Work-Slider ist endlos** (beide Richtungen). Der Satz liegt dreifach im
  DOM, die **Originale in der Mitte** — so behalten ihre Pixel-Engine-Instanzen
  ihre Element-Identität. Geklont wird in Abschnitt 11, also **vor** dem
  Engine-Boot; dadurch verdrahtet die Engine alle zwölf Karten von selbst.
  Klone tragen `aria-hidden` und `tabindex="-1"` auf jedem Link (ein
  `aria-hidden`-Teilbaum darf nichts Fokussierbares enthalten).
  Der Sprung um genau eine Satzbreite passiert **erst im Scroll-Leerlauf**
  (160 ms): ein `scrollBy({behavior:"smooth"})` läuft auf ein *absolutes* Ziel
  zu — verschiebt man ihm den Boden mitten im Flug, landet es auf der falschen
  Karte. Beim Trackpad-Schwung ist der Sprung dagegen unsichtbar, weil der
  Inhalt an dieser Stelle identisch ist.

## Lighthouse (2026-08-03, alle zehn Seiten)

Gemessen gegen `prodserve.py` — einen kleinen Server, der **gzip + Cache-Header**
schickt. `python -m http.server` liefert alles roh und uncached und misst damit
grob falsch: derselbe Stand kam dort auf Speed Index **4.6 s** statt **1.2 s**.
Immer so messen:

```bash
python prodserve.py 8897        # in v3-proposal/
npx -y lighthouse http://127.0.0.1:8897/services/ai-tools.html   --preset=desktop --quiet --output=json --output-path=lh.json || true
```

Das `|| true` ist nötig: Lighthouse beendet sich mit Code 1, weil
chrome-launcher sein Temp-Verzeichnis unter Windows nicht löschen kann
(`EPERM … lighthouse.86294882`). **Der Report ist zu dem Zeitpunkt längst
geschrieben** — ohne `|| true` bricht die Kette ab und man sucht einen Fehler,
den es nicht gibt.

| Seite | Perf | A11y | Best Pr. | SEO¹ | Agentic |
| --- | --- | --- | --- | --- | --- |
| index (Desktop) | **100** | **100** | **100** | 63 | **100** |
| contact | **100** | **100** | **100** | 60 | **100** |
| services/* (alle vier) | **100** | **100** | **100** | 63 | **100** |
| legal/* | **100** | **100** | **100** | 60 | **100** |
| index (mobil) | **98** | **100** | **100** | 63 | **100** |
| services/ai-tools (mobil) | 94 | **100** | **100** | 63 | **100** |
| contact (mobil) | 91–97² | **100** | **100** | 60 | **100** |

¹ Einziges SEO-Manko ist `Page is blocked from indexing` — das bewusste
`<meta name="robots" content="noindex">` des Entwurfs. **Beim Livegang
entfernen, dann steht SEO auf 100.**

² Mobile Messungen streuen deutlich (4× CPU-Drosselung): drei Läufe derselben
Seite ergaben 91 / 97 / 91. Bei mobilen Zahlen immer mehrfach messen, bevor man
einer Änderung eine Wirkung zuschreibt.

**Was in dieser Welle behoben wurde:**

- **A11y 96 → 100 auf allen Seiten:** Das `⌘K`-Kürzel im Menü-Auslöser hatte
  `opacity: .75` auf `--muted` — effektiv 4.15:1 gegen die dunkle Nav, also
  unter den geforderten 4.5:1. Opazität raus; die kleinere Mono-Größe trennt
  den Tastenhinweis ohnehin ausreichend.
- **A11y 95/96 → 100 auf contact und den Service-Seiten:** axe misst
  `.rv`-Elemente **mitten in der Einblend-Animation** und liest die halb
  transparente Farbe als Kontrastfehler. Betroffen war jeweils das erste Band
  nach dem Hero, weil es (mobil erst recht) noch im ersten Bildschirm steht.
  Dort ist die Reveal-Animation jetzt raus — Inhalt an der Falzkante soll
  ohnehin nicht einblenden.
- **Mobil 94 → 98 (TBT 260 → 120 ms):** Die Tooltip-Verdrahtung in `common.js`
  hing an einem `MutationObserver` auf `<body>` mit `subtree: true`. Die
  Schreibmaschine schreibt alle ~9 ms `innerHTML` — der Observer feuerte also
  pro getipptem Zeichen ein dokumentweites `querySelectorAll`. Jetzt ein
  einziger Durchlauf auf `DOMContentLoaded` (läuft nach allen `defer`-Skripten,
  erwischt also auch die von `v3.js` gerenderten Score-Chips).
- **Erzwungene Reflows:** Marquee 125 ms (`scrollWidth` direkt nach dem
  Verdoppeln des Markups — misst jetzt im ersten Frame), Konsole 79 ms
  (`scrollHeight` direkt nach `appendChild` — jetzt im rAF), Pac-Man 25 ms
  (erste `measure()` jetzt im ersten Frame).

**Bewusst nicht behoben:**

- Der Work-Slider liest beim Start eine Kartenbreite, um auf dem mittleren Satz
  zu landen. Das erzwingt die erste Layout-Berechnung der Seite und taucht als
  „Forced reflow" auf. In einen rAF verschoben würde ein Frame mit
  `scrollLeft: 0` gezeigt, wo `scroll-snap` die erste Karte linksbündig stellt,
  bevor sie in die Mitte springt. Ein sichtbarer Sprung ist schlimmer als eine
  Diagnosemeldung auf einer Seite, die 100 mit TBT 0 ms erreicht.
- `v3.css` bleibt render-blockierend — asynchrones Nachladen reflowt beim
  Ankommen und kostet CLS.
- Minify für CSS/JS fehlt (kein Build-Schritt); bei Bedarf beim Deploy
  erledigen, nicht im Repo.

**Bilder neu erzeugen** (wenn echte Fotos kommen, Dateinamen beibehalten):

```python
from PIL import Image
im = Image.open('img/foo.jpg').convert('RGB')       # dann mittig auf 16/11
im.resize((1200, 825), Image.LANCZOS).save('img/foo-1200.webp','WEBP',quality=82,method=6)
im.resize((640, 440),  Image.LANCZOS).save('img/foo-640.webp', 'WEBP',quality=82,method=6)
```

Porträts: 4/5, Breiten 840 und 440.

## Nächster Schritt (Stand 2026-08-03)

Design ist vom Owner **abgenommen und eingefroren** — keine unaufgeforderten
Optik-Änderungen mehr, nur noch Umsetzung.

**Alle zehn Seiten stehen.** Was jetzt fehlt, hängt an Inhalten und an
Infrastruktur, nicht mehr am Entwurf:

1. **Drei Kundenzitate und zwei Work-Cases** — liefert der Owner.
2. **`/api/ask`** als Serverless-Funktion, dann `AI_MODE` in `v3.js` auf
   `"live"`. Key server-only, Rate-Limit.
3. **Kontaktformular verdrahten** (live läuft Web3Forms).
4. **Echte Porträts** nach `team/`, WebP @840 und @440.
5. **`noindex` entfernen** — auf allen elf Seiten (`tools/add_meta.py` fasst es
   nicht an, es steht direkt im `<head>` jeder Seite). Dann steht SEO auf 100.
6. **Live-Aufräumen für die Service-Reduktion:** `upload/services/apps.html`
   und `design-brand.html` löschen, dazu Mega-Menü, Footer, `sitemap.xml`,
   `llms.txt` und „Related services" nachziehen.
7. **Cookie-Banner** — `upload/consent.js` (235 Zeilen) ist noch nicht
   portiert. Solange der Entwurf nichts trackt, braucht er auch keinen.

## SEO, Social und Maschinenlesbarkeit

Alles davon wird **generiert**, nicht von Hand gepflegt — sonst driftet es.

| Datei | Erzeugt von | Inhalt |
| --- | --- | --- |
| `robots.txt` | von Hand | AI-Crawler ausdrücklich erlaubt (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, Applebot-Extended, CCBot …), Sitemap-Verweis |
| `sitemap.xml` | `tools/build_sitemap.py` | 10 URLs mit `lastmod` aus der Dateizeit. **Bricht ab**, wenn eine HTML-Datei auf der Platte nicht in der Liste steht oder umgekehrt — eine neue Seite kann nicht vergessen werden |
| `llms.txt` | von Hand | Vollständige Prosa-Zusammenfassung für AI-Agenten: alle Seiten, die vier Services, die FAQ-Antworten, das eigene Produkt, plus der UWG-Hinweis zur Brand-Leiste |
| Social-Block in jedem `<head>` | `tools/add_meta.py` | canonical, OG, Twitter-Card, `theme-color`, `apple-touch-icon`, Sitemap-Link. **Liest Titel und Description aus der Seite zurück** — Titel ändern, Skript laufen lassen, Karten stimmen |
| JSON-LD Startseite | `tools/build_jsonld.py` | ProfessionalService (mit OfferCatalog aus den vier Services), WebSite, **FAQPage** — alles aus `data.js` gelesen |
| JSON-LD Unterseiten | in der Seite bzw. `build_legal.py` | Service + BreadcrumbList je Service-Seite, ContactPage, Organization im Impressum |

**Warum FAQPage wichtig ist:** Auf der Startseite rendert `v3.js` die FAQ zur
Laufzeit aus `data.js`. Ein Crawler ohne JavaScript sieht dort ein leeres Panel.
Das JSON-LD trägt dieselben Fragen und Antworten im Markup — und `llms.txt`
dieselben noch einmal als Prosa. Damit ist der Inhalt dreifach erreichbar, ohne
`data.js` als einzige Quelle aufzugeben.

**404.html** liegt im v3-Look vor, wird aus jeder Tiefe ausgeliefert und nutzt
deshalb **root-absolute Pfade** (`/v3.css`, `/data.js`). Sie bekommt bewusst
**kein** canonical und **kein** Open Graph: eine Fehlerseite soll weder indexiert
noch geteilt werden. `noindex, follow` ist gesetzt, damit die Links darauf
trotzdem verfolgt werden.

Nach jeder inhaltlichen Änderung:

```bash
python tools/build_legal.py     # nur wenn upload/legal/ sich geändert hat
python tools/build_jsonld.py    # nach jeder Änderung an SERVICES oder FAQ
python tools/build_sitemap.py   # nach jeder neuen oder gelöschten Seite
python tools/add_meta.py        # IMMER zuletzt — überschreibt seinen eigenen Block
python tools/check_links.py
```

Die Reihenfolge ist wichtig: `add_meta.py` läuft zum Schluss, weil
`build_legal.py` die Rechtsseiten komplett neu schreibt und den Social-Block
dabei verlieren würde.

**SEO-Score:** 69 statt 100, und der einzige Grund ist weiterhin
`Page is blocked from indexing` — das bewusste `noindex` auf allen elf Seiten.

## Testen

Zwei Skripte im Scratchpad, beide ohne Abhängigkeiten:

```bash
python  tools/check_links.py          # jede Datei, jeder Anker, doppelte IDs
bash    tools/sweep.sh 1280 820 d     # alle 10 Seiten: Konsolenfehler,
bash    tools/sweep.sh  390 844 m     # Widgets, Overflow, A11y-Basics
```

Stand 2026-08-03: 10 Seiten × 2 Viewports, **keine Seitenfehler, keine
Konsolenfehler, kein horizontaler Overflow, kein fehlendes `alt`, kein
namenloser Button, genau ein `h1` pro Seite.**

Interaktionen sind einzeln geprüft: Kommando-Menü aus zwei Ebenen Tiefe
(Pfad-Auflösung über `data-root`), Filter auf deutsche Stichwörter
(„widerruf" → Withdrawal), Pfeil-/Home-/End-Navigation im FAQ, Theme-Wechsel
über Seitengrenzen, `?ask=`-Übergabe von einer Service-Seite an die Konsole,
Formular-Hinweis.

## Offen — nach Wichtigkeit

1. **Drei Review-Slots und zwei Work-Cases sind leer.** Im ganzen Repo liegt
   **keine einzige echte Kundenreferenz** — geprüft über alle Ordner inklusive
   `mockup/` und `_v2-preview/`. Die Slots sagen das offen, statt etwas zu
   erfinden. Owner liefert Zitat + Name + Rolle + Firma, dann fällt
   `testi--open` weg.
2. Die Brand-Leiste unter (07) ist eine **Karriere-Referenz, keine Kundenliste**
   (UWG §5). Der Hinweis steht sichtbar darunter und im `aria-label`. **Nicht**
   zu „trusted by" oder „unsere Kunden" weichspülen.
3. Tool-Logos in der Stack-Leiste sind echte simple-icons SVGs; die Marken in
   `.tagset` bewusst nur Text — für jede davon eine Wortmarke nachzuzeichnen
   war genau das, was vorher falsch aussah.
4. Offene Frage an den Owner: „das black hole ist viel zu groß" — beim
   Zurückrollen auf die Original-Werte `R=46, FORCE=2.4` gesetzt, weil unklar
   war, ob der WebGL-Krater oder das 2D-Loch gemeint war.

## Gelöste Fallen (nicht erneut hineinlaufen)

- `width`/`height`-Attribute am `<img>` hebeln `aspect-ratio` aus → `height:auto`.
- `PixelFX.headline()` spielt nicht von selbst; IntersectionObserver muss
  `.play()` rufen.
- `PixelFX.button()` braucht die `.pxbtn .pxc { position:absolute }`-Regel,
  sonst steht sein Canvas im Fluss und der Button wird ~340px hoch.
- Die Engine setzt `display:block` **inline** — CSS-Klassen können ihre
  Canvases nicht abschalten.
- Nach einem Theme-Wechsel erst **nach** dem 0.5s-Farbübergang neu sampeln,
  sonst wird die Headline im Hellmodus unsichtbar.
- Bänder-Polster: zwei Sektionen à `11vw` ergaben ~280px Leere dazwischen.
  Jetzt `7vw`; Seitenhöhe fiel von 9142px auf 6361px.
- `agent-browser set viewport` hängt **nur, wenn eine Seite schon offen ist.**
  In einer frischen Session **vor** dem `open` gesetzt, läuft es sofort durch:
  `agent-browser --session mob set viewport 390 844` → dann `open`. Damit ist
  mobil endlich prüfbar; Playwright braucht es dafür nicht.
- `:hover`-Zustände lassen sich nicht klicken. Zum Prüfen die `:hover`-Regeln
  einmalig auf eine Testklasse spiegeln (alle `cssRules` durchgehen,
  `:hover` → `.fh` ersetzen, als `<style>` anhängen, Klasse setzen).
- **`.rv`/`.stagger` an der Falzkante = Kontrastfehler.** axe misst die
  halb eingeblendete Farbe. Alles, was im ersten Bildschirm stehen kann,
  bekommt keine Reveal-Animation.
- **Kein `MutationObserver` auf `<body>`,** solange irgendwo eine
  Schreibmaschine läuft: sie ändert das DOM alle 9 ms.
- **Lighthouse endet unter Windows immer mit Code 1** (`EPERM` beim Aufräumen
  des Chrome-Temp-Ordners). Report ist trotzdem geschrieben → `|| true`.
- **Der Bash-Heredoc dieses Setups frisst Backslashes.** Ein `
` in einer
  Python-Regex kommt als echtes Newline an. Für alles mit Escapes: Datei per
  Write-Tool anlegen und ausführen, nicht per Heredoc.
- **`scroll-snap` korrigiert ein gesetztes `scrollLeft` nach.** Wer den
  Wert danach zurückliest und mit seiner Rechnung vergleicht, findet einen
  Fehler, der keiner ist — die Differenz ist die Zentrierung.
