# Uebergabe — Stand 2026-09-01 (spaeter Abend)

**Alles auf `main`, aber NICHT gepusht: 14 Commits liegen lokal.**
Arbeitsbaum sauber. Vercel zeigt noch den Stand von heute Mittag.

## Fuer eine frische Session: START HIER

Der Refresh ist **uebernommen und gemerged**. `index.html` IST jetzt der
Entwurf — nicht mehr `preview/refresh.html`. Wer den Dev-Server unter
`http://127.0.0.1:8898/` aufmacht, sieht die neue Startseite.

**Was heute passiert ist, in einem Satz:** die drei uebrigen Service-Seiten
sind auf das System umgestellt, danach wurde der Entwurf zur echten
Startseite gemacht, und danach kam eine Runde Owner-Korrekturen, die gegen
**das live laufende Original auf mccain-digital.com** gelesen wurden.

### Der Stand der Startseite

- **Hero**: full width, zweizeilige Plakatzeile. Der Hintergrund ist ein
  **Pixelmosaik** von `img/circuit-macro-1200.webp`, gefahren von
  `PixelFX.image` — also demselben Aufruf wie die Work-Karten. Das schwarze
  Loch folgt der Maus und zerstoert echte Partikel. Die Stage beginnt bei
  y=0 und endet bei `100svh`; ihr Inhalt haelt `--nav` Abstand zur Leiste.
- **Kopfleiste**: oben transparent mit weisser Schrift, ab 8px Scroll faehrt
  die Platte ein. Keine Haarlinie — Pac-Man ist die Trennung. Alle
  Bedienelemente 38px, nichts umbricht. Der CTA traegt den Verlauf statt
  Gelb. Die **Status-Pille** traegt ihn als wandernde Kante — gebaut wie der
  Rahmen der Konsole (geclipptes Verlaufsblatt + deckende Innenflaeche,
  1.5px), **nicht** mit `mask-composite`, das Kurven treppt. Beim Scrollen
  raeumt die Pille ihren Platz fuer die Kapitel-Anzeige; unter 480px verlaesst
  der CTA die Leiste.
- **Logo**: die Wortmarke des Originals und nur sie — **kein Icon**. Zwei
  Woerter, `mccain` in 800/Papier, `digital` in 600/Logo-Gelb, Grundlinie,
  .3em Wortabstand. Das Original sagt es in seinem eigenen Stylesheet:
  `/* clean typographic wordmark - no icon */`.
- **Favicon**: zerfaellt bei Tab-Wechsel in lose Pixel, Titel wird
  „we'll be here. — mccain digital". Aus dem Original uebernommen, aber es
  wirft die Pixel des ECHTEN `favicon.svg` statt die Glyphen neu zu setzen.
- **(05)**: dunkles Band, Akzentschrift im vollen Spektrum der Konsole.
- **Fusszeile**: full width wie die Leiste, Wortmarke einzeilig via `15cqi`.
- **Keine Fuehrungsschienen** auf der Startseite; die Service-Seiten behalten
  ihre.

### Was als naechstes dran ist

1. **`preview/refresh.html` aufraeumen.** Es hat sein altes `<style>` noch
   inline und ist damit eine Dublette zu `v3.css` — es rendert inzwischen
   ANDERS als die echte Startseite und wird nur noch verwirren. Entweder auf
   `v3.css` umstellen oder loeschen. **Owner-Entscheidung, noch offen.**
2. **Pushen.** 14 Commits liegen lokal.
3. **Inhalte** — drei freigegebene Kundenzitate, zwei Work-Cases, echte
   Portraits. Groesste Luecke vor dem Livegang, nichts davon darf erfunden
   werden.
4. **`ANTHROPIC_API_KEY`** setzt der Owner selbst in Vercel Production, plus
   Spend-Limit; danach `AI_MODE` in `v3.js` auf `"live"`.
5. **Beim Livegang:** `noindex` raus, `preview/` aus dem Deployment. Der
   Owner zieht gerade **mccain-digital.com auf Vercel** um — dort laeuft
   aktuell noch die alte Einzeldatei-Version, und die ist die Referenz fuer
   „das Original".

### CHANGELOG.md reist nicht mit

`CHANGELOG.md` steht in `.gitignore`, unter der Ueberschrift „internal — kept
on disk for development, never part of the public site", seit dem ersten
oeffentlichen Release. Er wird gepflegt und ist aktuell, aber ein `git push`
nimmt ihn nicht mit. Wer das aendern will, aendert eine Zeile in `.gitignore`
— und macht damit interne Notizen in einem oeffentlichen Repo sichtbar. Das
ist eine Owner-Entscheidung, keine Aufraeumarbeit.

### Vor jeder Aenderung, ohne Ausnahme

```
python prodserve.py 8898 --dev     # die Waechter brauchen den Server
bash tools/sweep.sh 1090 614       # und 390 844, 1512 850, 1920 1080
bash tools/accent_audit.sh
```

**1090x614 gehoert ab jetzt in jede Messreihe.** Das ist ein 1920x1080-Schirm
bei 175% Windows-Skalierung — ein echtes Geraet, auf dem der Owner liest, und
das Fenster, auf dem der Hero heute zerbrochen ist.

`tools/stage_probe.js` misst den Kontrast jedes Textblocks im Hero gegen die
GELIEFERTEN Pixel. Es liest jetzt die Ebene, die tatsaechlich sichtbar ist
(Mosaik oder Foto), bildet ueber das Rechteck DIESER Ebene ab und rechnet den
CSS-Filter heraus, durch den man sie sieht. Per `agent-browser eval -b` mit
base64 einspeisen, so wie `sweep.sh` es mit `probe.js` macht.

### Was diese Runde gekostet hat, und was daraus zu lernen ist

- **Ein Waechter, der auf einen umbenannten Selektor zeigt, meldet nichts.**
  `stage_probe.js` suchte `.dither-l` — ein Canvas, das der Hero seit dem
  Mosaik nicht mehr hat — und antwortete `no field canvas` statt einer Zahl.
  Dahinter lag ein echter Fehler: `--muted` auf der Stage mass 4,46:1 gegen
  den hellsten ausgelieferten Pixel unter dem Intro. Dieselbe Form ein
  zweites Mal am selben Tag: `.rail .nav-where` in `v3.css`, nach dem Merger
  auf nichts mehr gerichtet. **Nach jedem Umbenennen nach dem ALTEN Namen
  grepen.**
- **Ein negatives Margin gegen eine `fixed` Leiste kompensiert nichts.**
  `.stage` hatte `margin-top: -var(--nav)` UND `padding-top: var(--nav)`.
  Die Leiste nimmt im Fluss keinen Platz, also hoben sich beide auf: der Text
  sass hinter der Leiste, die Box endete 68px ueber der Falzkante. Auf einem
  hohen Fenster hat `align-content: center` das verdeckt. **Layout auch auf
  dem KURZEN Viewport messen.**
- **`mask-composite` treppt Kurven.** Es verrechnet zwei einzeln geglaettete
  Masken per XOR. Der Nachbar im selben Stylesheet — der Rahmen der Konsole,
  den der Owner mag — loest dasselbe Problem ohne Maske. Zum zweiten Mal in
  zwei Tagen war die Antwort: **die Mechanik von nebenan nehmen, nicht eine
  zweite bauen, die so aussieht.**
- **Das Original ist die Quelle, nicht mein Gedaechtnis.** Die Logo-Frage war
  drei Anlaeufe lang offen und stand die ganze Zeit als Kommentar im
  Stylesheet der laufenden Seite.

### Die vierzehn Commits von heute

```
c58f21b  fix(css): wordmark type, pill edge, footer width, hero on a short screen
9805d8d  fix(logo): the wordmark has no icon, and never had one
b463ff4  feat(runtime): the favicon dissolves when the tab goes away
f5428d1  fix(tools): the hero's contrast guard was reading a canvas that is gone
b80b57f  docs: the handover, written for the session after the merge
988ae66  feat(nav): the bar goes transparent over a stage, one height
57d9d6e  perf(hero): the mosaic costs what a card costs, bar drops hairline
27c82c1  fix(home): the real logo, the spectrum back, no rails, one-line mark
91e16f2  feat(home): the merger — index.html IS the refresh now
439997e  feat(studio): (05) takes the console's gradient as its text colour
2fb2b00  fix(field): the protection map reads cell CENTRES
c461b51  fix(stage): the hole is the images' hole
41c0efe  feat(stage): the void follows the hand
65b53a3  feat(system): the other three service pages join the system
```

### Gemessen am Ende dieser Runde

- Jeder Textkasten im Hero 4,65–13,70:1 gegen den hellsten ausgelieferten
  Pixel unter ihm, bei 1090x614 und 1512x850.
- Akzentschrift besteht auf allen 11 Seiten in beiden Themes (die Wortmarke
  ist per Entscheidung ausgenommen, WCAG 1.4.3).
- 11 Seiten: keine Page-Errors, keine Konsolenfehler, kein horizontaler
  Ueberlauf bei 390, 1090, 1512, 1920.
- Der Hero fuellt bei 1090x614 und 1512x850 exakt einen Bildschirm.

## DAS SYSTEM IST ÜBERNOMMEN — und eine Unterseite ist fertig

Owner 2026-09-01, nach dem Entwurf: „die neue version WESENTLICH besser zu
lesen, auch die farben finde ich besser" → „kannst du die farben, schriften und
header bg und button form mal auf die alte seite anwenden" → „bau mal eine
unterseite fertig".

Auf `main`. Eine Unterseite ist komplett umgestellt, die anderen zehn erben die
Systemebene und laufen unverändert weiter.

→ **https://mccain-digital.vercel.app/services/ai-tools.html**

### In `v3.css`, also für alle elf Seiten

- **Grund neutral** `#0b0b0c` statt `#0d0c0a` (Rot und Grün über Blau = Sepia
  neben dem warmen Gelb). Papier, Karten und Haarlinien folgen. Grau von warm
  `#9b958a` (6,61:1) auf neutral `#a3a3a0` (7,78:1).
- **Das gemochte Grün `#7a8c00` ist zweites Signal** (`--sig` / `--sig-text` /
  `--sig-ink`) — dieselbe Zwei-Gewichte-einer-Farbe-Regel wie beim Gelb.
- **Der wandernde Rand ist kein Regenbogen mehr.** Die Stops stehen als Token
  in `v3.css` (Gelb → Grün → Gelb); `common.js` rechnet nur noch die
  Geometrie, also den Teil, der gerechnet werden MUSS.
- **Typo trägt selbst:** `.sec-h` Gewicht 780, Laufweite -0.028em, Zeile 0.96;
  `.hero-h` Zeile 0.92.
- **Eine Knopfform:** 4px statt 100px-Pille. Die Pille war das einzige Runde in
  einem System aus Haarlinien, Eckmarken und Mono-Labels. Hover-Lift 2px.
- **Die Leiste ist nie durchsichtig über dem Kopf** (Owner-Regel) und **Ink in
  BEIDEN Themes** — im hellen Modus schwebte vorher eine blasse Leiste über der
  immer dunklen Bühne und die Wortmarke verschwand fast. Bei der ersten
  Bewegung (8px statt 24) kommt die tiefere Hülle **choreografiert**: eine
  Fläche schiebt sich in 280 ms von oben herein, dann zieht eine Haarlinie in
  520 ms von links durch. Eine Leiste, die ANKOMMT, liest sich als
  Entscheidung; eine, die einblendet, als Render-Artefakt.
- **`.rv` von 44 px auf 22 px** — 44 war fast das Doppelte der Bandbreite.
- **Drei geteilte Bauteile:** Bühnen-Header, Wort-Reveal, Pixel-Marke. Beide
  **opt-in aus dem Markup** (`data-field`, `data-words`), weil die Seiten, die
  ihre Überschriften noch rastern, denselben Text nicht zusätzlich in
  Wort-Spans zerlegt bekommen dürfen.

### `services/ai-tools.html` — fertig

Bühnen-Header über die volle Breite mit Dither-Feld, Rails und Eckmarken,
gerippter Fakten-Spalte und einem Mono-Streifen an der Basis. **Acht
Pixel-Hosts entfernt** — die Überschriften sind echte, lesbare Type, ihre
Wörter steigen durch eine Maske. Die Wortmarke trägt die 7×7-Pixelmarke.

### Gemessen

| | |
|---|---|
| Alle 11 Seiten, 1440 und 390 | booten sauber, keine Page-/Console-Fehler, kein horizontaler Überlauf |
| Akzent-Text | besteht auf jeder Seite in beiden Themes |
| Text auf der Bühne | 4,85–14,49:1 (aus ausgelieferten Pixeln, Grund aus einem glyphenfreien Streifen) |
| Überschrift | 10,44:1 weiß · 7,19:1 gelb gegen die hellste Zelle, die das Feld rendert |
| Kompletter Scroll | 0 Long Tasks, p90 17 ms, 0,4 % der Frames über 20 ms |

### Drei Fehler, alle durch Messen gefunden

- **`.hero` ist ein Spalten-Flex-Container**, und `margin-inline: auto` auf
  einem Flex-Item hebt `stretch` auf — `.hero-inner.wrap` schrumpfte auf seinen
  Inhalt, die Copy sass 145 px INNERHALB der Rails, die ihre Kante markieren
  sollen. Dieselbe Falle wie bei der Leiste im Entwurf.
- **Bei 390 px machte die Pixelmarke die Wortmarke ~30 px breiter** und schob
  den CTA aus der Leiste. **Gegen `main` gemessen: dort kein Überlauf** — also
  meiner, nicht vorher da. Der doppelte CTA fällt unter 720 px weg, das
  Kommandomenü trägt ihn ohnehin.
- **Der Perzentil-Waechter hat wieder gelogen.** Das Fakten-Label mass exakt
  4,50:1 — die AA-Zahl selbst. Es war nicht Grund gegen Type: ein dichtes
  Mono-Label deckt weit mehr als ein Fünftel seiner Box, p80 war schon
  Buchstabe. Gegen einen Streifen gemessen, der keinen Glyphen enthalten KANN:
  4,85:1 — und die rechte Abdunklung von .04 auf .3 ist, was diese Marge
  gekauft hat.

### Nächster Schritt

Die restlichen drei Service-Seiten und `index.html` nach demselben Muster:
`data-pixel` raus, `data-words` rein, Header auf `hero--stage guides
data-field`, Wortmarke mit `.mark`. Pro Seite ein kleiner, gleichförmiger Diff.

## DER REFRESH — `preview/refresh.html`

Owner 2026-09-01: neue Hintergruende „echt klasse", aber **nur im Header** und
der Header **full width**; die Seite „braucht noch was"; die **Pixel-Schriften
sitzen nicht** und sind mit Sehschwaeche schlecht lesbar — „pixel engine
behalten, aber raus aus den headings", stattdessen „gezielt in mehr bildern
oder die buttons"; Schriftfarben anpassen; kompletter Refresh aus der
Skill-Sammlung; „du kannst ALLES veraendern — auch farben, logo alles".

Dann, nach der ersten Runde: „das ist recht cool geworden … tune das mal
weiter. **die console und den chat bot will ich drin**, **alle bereiche auf der
main page die wir schon haben sollen auch drin sein**" — plus „schoener
footer", „tolles menue".

→ **https://mccain-digital.vercel.app/preview/refresh.html**

### Die Architektur ist die wichtigste Entscheidung

Die Seite laedt **`v3.css` und danach ihre eigenen Overrides**, und sie laedt
**alle sechs echten Skripte** (`data.js`, `pixel-engine.js`, `common.js`,
`pacman.js`, `menu.js`, `v3.js`).

Damit sind Konsole, ⌘K-Kommandomenue, FAQ, Service-Stack, Work-Track, Scores,
Kontaktformular, Pac-Man und der angedockte Assistent **die echten** — keine
Kopien, die ab Tag eins auseinanderlaufen. Der Refresh aendert das **System**
(Palette, Typo, Buehne, Bedienelemente, Fuss, wo die Pixel-Engine laeuft) und
erbt die **Maschinerie**. Beim Uebernehmen ist der Diff gegen `v3.css` deshalb
in einer Sitzung lesbar.

Alle acht Bereiche der Hauptseite sind drin, in derselben Reihenfolge und mit
denselben IDs: (01) AI-Konsole + Stack-Rail · (02) Work · (03) Scores ·
(04) Services · (05) Studio · (06) FAQ · (07) Proof · (08) Kontakt.

### Die fuenf Entscheidungen

**1 — Die Pixel-Engine verlaesst die Schrift.** Der Beweis stand im eigenen
Screenshot: „Things that" in Punktrastern war nicht lesbar, der Hover-Scatter
zerlegte mitten im Wort ein „useful". `[data-pixel]` auf der Seite: **0**.
Sie laeuft jetzt auf **27 Bildern** (Schwarm beim Reinscrollen, Verpixeln unter
dem Zeiger), auf **16 Buttons**, und sie **ist das Logo** — eine 7×7-Marke auf
demselben Raster, das die Engine zeichnet, als statisches SVG.

**2 — Der Header ist eine Buehne ueber die volle Breite.** Dither dort und
nirgendwo sonst. Guide-Rails und Eckmarken darueber, Copy links unten, Platte
rechts oben. Die Leiste liegt **ausserhalb** der Buehne: die traegt fuer das
Feld `overflow: clip`, und `sticky` klebt nur innerhalb seines eigenen
Clip-Vorfahren.

**3 — Die Palette verliert ihr Braun.** `#0d0c0a` hatte Rot und Gruen ueber
Blau; neben warmem Gelb liest sich das als Sepia. Jetzt `#0b0b0c`. Gelb
unangetastet und das einzige Warme auf der Seite. Das gemochte Gruen `#7a8c00`
wird zweites Signal (5,23:1 auf Ink fuer sich). Grau neutral: `#a3a3a0`,
7,78:1 statt 6,61:1.

**4 — Auch der wandernde Rand kommt in die Palette.** `common.js` malte
`--wave-stops` aus `wavePalette("rainbow")` — ein volles Spektrum war das
Lauteste auf einer Seite, deren ganzer Punkt eine zurueckgenommene Palette ist.
Gleiche Bewegung, gleiche Periode, aber Gelb → Gruen → Gelb. Als
`!important`-Regel, weil `common.js` inline auf `:root` schreibt und nur eine
wichtige Autoren-Regel das ueberstimmt.

**5 — Der Fuss ist ein Kapitel.** Einladung + drei Spalten (Studio, Leistungen,
Adresse) + ueberdimensionierte Wortmarke + Rechtsleiste.

### Die Bewegung — gegen Zahlen gebaut, nicht gegen Geschmack

Owner: „ich moechte mehr scroll und motion effekte, einblenden verblassen,
uebergaenge etc". Die Messlatte ist der `animation-systems`-Skill (siehe
`reference_motion_number_bands` im Gedaechtnis), nicht mein Auge:

| | |
|---|---|
| Micro (Hover, Press) | 120–200 ms |
| UI-Zustandswechsel | 180–260 ms |
| Sektionseintritt | 400–800 ms |
| Hero-Sequenz | 800–1600 ms, mit inneren Beats |
| Stagger | 40–90 ms |
| Fade+Rise | 12–24 px |
| Hover-Lift | −2 bis −6 px |
| Reveal | bei 20–30 % Sichtbarkeit, **einmal** |

**Was drin ist:**

1. **Woerter steigen durch eine Maske.** Jede Ueberschrift wird in Wort-Spans
   zerlegt (`TreeWalker` nur ueber Textknoten, damit `<br>`, `.dim` und `.acc`
   ueberleben — die Ueberschrift als String zu ersetzen haette alle drei
   zerstoert). Maske = `overflow: clip`, Timing = native `view()`-Timeline.
   Kein GSAP.
2. **Der Held ist eine Sequenz, kein Reveal.** Eine `view()`-Timeline kann
   nichts animieren, was beim Laden schon im Bild steht — ihr `entry`-Bereich
   liegt vor dem ersten Frame. Also laeuft die Buehne auf Zeit: Linie →
   Augenbraue → Woerter → Platte → Zahlen, gemessen ~1,1 s.
3. **Die Buehne uebergibt beim Verlassen.** Copy geht schneller raus als die
   Platte; zwei Geschwindigkeiten machen daraus eine Bewegung statt eines
   ausgeschalteten Abschnitts. Parallaxe unter 5 % des Viewports.
4. **Die Leiste meldet, in welchem Kapitel du bist.** Sobald die Buehne hinter
   dir liegt, tritt die Status-Zeile ab und macht dem Kapitel Platz.
5. **Ein Scroll-Hinweis, der abtritt**, sobald man ihm gefolgt ist.
6. **Hover-Micros**: Unterstriche wachsen von der Seite, von der gelesen wird.

**Was die Loeschregel rausgeworfen hat:** alles, was weder Hierarchie erklaert,
noch eine Handlung bestaetigt, Aufmerksamkeit fuehrt, Kontinuitaet haelt oder
Handwerk zeigt.

**Und v3.css' eigener Reveal war ausserhalb der Bandbreite:** `.rv` kam aus
44 px, fast das Doppelte der Obergrenze; auf die Distanz liest sich das als
Sprung statt als Ankommen. Jetzt 22 px.

**Drei Fehler beim Bauen, alle durch Messen gefunden:**

- **Ein versteckter Zustand ohne sichtbaren Gegenzustand ist keine Animation,
  sondern eine Loeschung.** Ich schrieb `.stage.hs .stage-kicker::before {
  transform: scaleX(0) }` ohne die `.go`-Regel dazu — die gelbe Linie kam nie
  wieder.
- **`entry` ist bei einer flachen Ueberschrift zu kurz.** Gemessen sprangen die
  Woerter zwischen zwei Scroll-Proben 150 px auseinander von 62 px Versatz auf
  0. Jetzt auf `cover` gemessen, wo ein Prozent eine brauchbare Scroll-Strecke
  ist: 62 → 38/44/50/56 → 0/5/11/17 → 0.
- **43 Wort-Timelines waren nicht umsonst.** 9 % der Frames ueber 20 ms, p99 von
  17,1 auf 32,7. Mit abgeschalteten Woertern wieder 0 % — damit war bewiesen,
  dass sie es waren. `will-change: transform` bringt es zurueck auf 0 % / 17,3.
  (Das ist der Fall, fuer den es die Eigenschaft gibt: jeder Scroll kann den
  Bereich neu betreten, die Animation ist dauerhaft lebendig. Auf den Woertern
  des Helden steht es **nicht** — die laufen einmal.)

### Gemessen, nicht beurteilt

| | |
|---|---|
| Kleintext auf der Buehne | Koordinaten 7,28:1 · Fakten-Labels 4,71:1 · Intro 13,27:1 · Platten-Tag 8,39:1 |
| Ueberschrift | 16,41:1 weiss · 11,29:1 gelb |
| Kompletter Scroll, 1440×900 | **0 Long Tasks**, p90 16,9 ms, p99 17,1, **0 %** der Frames ueber 20 ms — mit allen 43 Wort-Timelines |
| Reduced Motion | 0 Wort-Splits, kein Dither, kein Pac-Man: der FERTIGE Zustand, keine schnellere Animation |
| A11y-Probe | 0 fehlende alt, 0 leere Links, 0 namenlose Buttons, 1 h1 |
| Mobil 390×844 | kein horizontaler Ueberlauf; Menue und Theme-Schalter erreichbar |

Der Kleintext ist aus den **ausgelieferten Pixeln** gelesen, gegen die
**hellste** Grundzelle unter der Zeile. Die Ueberschrift **nicht** — bei
Zeilenabstand 0,9 gibt es zwischen ihren Zeilen keinen glyphenfreien Streifen,
jedes Perzentil ihrer Box ist schon Buchstabe. Sie ist deshalb gegen die
hellste Zelle gemessen, die das Feld **tatsaechlich rendert** (aus dem Canvas
gelesen, 20/255). Zwei Anlaeufe davor waren Instrumentenfehler, keine
Designfehler: erst die dunkelste Zelle als Grund (schmeichelt), dann dasselbe
Perzentil auf Plakatschrift angewandt, das dort 1,01:1 meldete.

### Was noch offen ist

- **Portraits und Referenzen.** Die Portrait-Platzhalter und die drei
  Testimonial-Slots sind ehrlich als solche beschriftet. Groesste Luecke vor
  dem Livegang.
- **Das Kommandomenue traegt die Pixel-Marke noch nicht** — es injiziert seine
  eigene Wortmarke aus `menu.js`, einer Live-Datei. Kommt beim Uebernehmen mit.
- **Zweiter Schriftschnitt.** Schibsted 800 eng traegt. Ein Condensed-Schnitt
  gaebe den Plakatzeilen einen Gang mehr, kostet eine Font-Datei.
- **Uebernahme.** Wenn der Entwurf steht, wandern die Overrides in `v3.css`
  und die Buehne in `index.html`; `PixelFX.headline` und `voidReveal` fliegen
  dann aus der Engine, weil sie keinen Aufrufer mehr haetten.

## Zum Aussuchen — diese Seiten sind JETZT erreichbar

Sie lagen unter `_parked/`, und das haelt `.vercelignore` vom Deployment fern:
jeder Link darauf war ein 404. Ich hatte im Handover behauptet, man koenne sie
direkt auf dem Deployment aufrufen, ohne das je zu pruefen. Sie liegen jetzt
unter `preview/` und werden ausgeliefert (noindex + `Disallow: /preview/`; beim
Livegang fliegt der Ordner raus).

| | |
|---|---|
| [**Refresh-Mockup**](https://mccain-digital.vercel.app/preview/refresh.html) | **das Neue** — ganze Seite, Pixel raus aus der Schrift, Dither nur im Header |
| [Hintergruende Runde 2](https://mccain-digital.vercel.app/preview/bg-lab.html) | **wartet auf deine Wahl** — Dither-Wolke grob/fein, Guides ohne Bewegung, beides kombiniert |
| [Hintergruende Runde 1](https://mccain-digital.vercel.app/preview/life-lab.html) | durchgefallen; bleibt als Vergleich stehen |
| [Wellen-Paletten und die Achse](https://mccain-digital.vercel.app/preview/wave-lab.html) | falls der Verlauf auf Schrift doch nochmal ein Thema wird |
| [Gelb auf Papier](https://mccain-digital.vercel.app/preview/accent-lab.html) | misst den Kontrast selbst |
| [Rastervarianten](https://mccain-digital.vercel.app/preview/pixel-lab.html) | Zelle/Block/Deckung, selbst gemessen |

## MengTo/Skills — was davon brauchbar ist

Owner: „schau dir doch mal diese skills an … koennen wir davon was gebrauchen".
`github.com/MengTo/Skills/tree/main/agent-skills/web-design`, **MIT**, ~5.700
Sterne, zuletzt Ende August aktualisiert. Rund 90 Ordner, jeder mit einer
`SKILL.md`. Das eigene README sagt „draft set … pending: finalize each skill's
SKILL.md" — es ist also eine Sammlung von Ideen unterschiedlicher Reife, keine
gepruefte Bibliothek. Entsprechend gelesen.

**Eingebaut (beides opt-in, nichts ist eingeschaltet):**

| Skill | was wir daraus gemacht haben |
|---|---|
| `dither-background` | `PixelFX.dither()` — Bayer-Dither-Wolke hinter einem Band. Die Idee ist ihre, die Umsetzung nicht (siehe unten). |
| `container-lines` | `.guides` in `v3.css` — zwei Haarlinien auf den Container-Kanten plus vier Eckmarken, aus `--maxw`/`--gut` positioniert. |

**Warum die Umsetzung nicht uebernommen werden konnte:** ihre Referenz ruft
`fillRect` **pro Zelle pro Frame** — bei 3px-Zelle ~26.000 Zeichenaufrufe pro
Frame, also genau die Arbeitsform, die diese Seite schon einmal auf 20fps
gebracht hat. Und das Zeichnen zu reparieren war die falsche Haelfte: teuer ist
das **Rauschen** (vier Oktaven = sechzehn Sinus pro Zelle). Gemessen mit drei
Feldern: 68 Long Tasks, 4 Sekunden blockierter Hauptthread. Jetzt wird die
Wolke nicht neu gerechnet, sondern **gescrollt**: ein Ring aus Spalten, pro
Takt genau eine neue Spalte. Danach 0 Long Tasks, 0 % der Frames ueber 20 ms.

**Brauchbar, aber noch nicht gebaut:**
- `css-border-gradient` — die Maskenvariante (`mask-composite: exclude`) ist
  eine saubere Art, einen reinen Rand-Layer zu bekommen. Fuer unseren
  *wandernden* Rand nicht noetig (wir brauchen ein bewegtes Blatt), fuer
  statische Karten-Raender aber die kuerzere Loesung als eine Extra-Ebene.
- `css-alpha-masking`, `progressive-blur` — Kantenabdunklung per
  `mask-image` bzw. gestufte `backdrop-filter`. Der Progressive-Blur waere
  unter der Navigation denkbar, kostet aber `backdrop-filter` ueber einem
  laufenden Canvas; erst messen.

**Nichts zu holen:**
- `number-details`, `beautiful-shadows` — ersteres machen wir laengst ((01),
  (02) in Mono), zweiteres sind woertliche Tailwind-Klassen.
- Rund die Haelfte der Ordner umhuellt **three.js, GSAP, Vanta, globe.gl,
  Matter.js, Unicorn Studio**. Das kollidiert mit „alles selbst bauen, keine
  externen Libraries" und mit der schon gefallenen WebGL-Absage.

**Was die Sammlung wirklich taugt:** als *Ideenliste* und als Wortschatz fuer
Effekte, die man sonst nicht benennen kann. Als Code nur dort, wo sie reines
CSS zeigt. Jeder Canvas-Rezept-Teil ist ungemessen und muss vor dem Einbau
durch dieselbe Performance-Pruefung wie alles andere hier.

## Was zuletzt passiert ist

1. **Der Verlauf ist von der h1 runter.** `data-wave` steht in der Engine jetzt
   auf `"off"` als Standard, statt es auf zwei Spans hinzuschreiben — so erbt
   die naechste Ueberschrift den Effekt nicht aus Versehen. Die h1 war die
   einzige Stelle mit einem Akzent-Span in einer Pixel-Ueberschrift, also die
   einzige, an der er je zu sehen war.
2. **Derselbe Verlauf laeuft jetzt auf dem Rand der Konsole in 01** — und auf
   demselben Rand, wenn die Konsole unten am Seitenrand angedockt ist. Ein
   Bauteil (`.rim` in `v3.css`), zwei Nutzer, eine Palette auf `:root`. Der
   Rand liest `--acc` (das Logo-Gelb), NICHT `--acc-text`: das dunkle Gold fuer
   Papier machte den Rand im hellen Modus matt, ohne dass es etwas bringt —
   die Konsole sitzt in beiden Themes auf demselben dunklen Band, und ein
   1,5px-Zierrand ist keine Schrift.
3. **Der Rahmen beschneidet nicht.** `.console` traegt einen ausdruecklichen
   Kommentar, dass ihr Senden-Knopf beim Hover zerfaellt und die Truemmer ~64px
   Flugraum brauchen. Ein `overflow: hidden` um sie herum haette diesen Effekt
   still getoetet. Beschnitten wird nur die wandernde Flaeche, in einer eigenen
   Ebene — sie war das Einzige, was je beschnitten werden musste.
4. Off screen pausiert der Rand, wie das Zellenfeld.
5. **Der Rand sprang alle 6 Sekunden zurueck** („sehr unnatuerlich und
   abgehakt") — behoben. Meine Begruendung „halbe Blattbreite = eine Periode"
   gilt nur fuer einen WAAGERECHTEN Verlauf: ein schraeger liegt auf seiner
   Gradient-Linie, deren Laenge `|W*sin T| + |H*cos T|` ist, also steckt die
   Hoehe des Kastens in der Periode — waehrend eine waagerechte Verschiebung um
   dX nur `dX*sin T` weiterrueckt. Gemessen: Periode 761px, Verschiebung 588px,
   also 23 % Sprung pro Umlauf (am Knopf 31 %). Jetzt steht die Periode als
   Token da (`--rim-period: 480px`) und verschoben wird um
   `period / sin(winkel)`. Nachweis: Blatt bei Versatz 0 und bei Versatz „ein
   voller Umlauf" gerendert und die Pixel verglichen — mittlere Kanalabweichung
   **98,5 vorher, 0,2 nachher**.
6. **Zwei Fehler aus der Gegenpruefung**, beide am laufenden Bild bestaetigt
   und behoben: `.rim-in>.console` erreichte die angedockte Konsole nie (dort
   liegt sie eine Ebene tiefer, in `.dock-slot`), also behielt sie ihren
   eigenen 14px-Rahmen im 18,5px-Rahmen plus zweiten Schatten — genau das
   Doppelrand-Problem, das der Kommentar darueber zu verhindern behauptet. Und
   die Platzhalterhoehe war beim Andocken eingefroren: nach einem Resize im
   angedockten Zustand kollabierte Sektion 01 beim Zurueckscrollen um 144px.
   Sie wird jetzt neu gemessen.

Kosten: auf 01 sitzend mit laufendem Rand und Glow Median 16,7 ms, 0 % der
Frames ueber 20 ms, keine Long Tasks — gegen 16,7 ms und 0,6–1,1 % auf dem
Stand davor ganz ohne Rand.

## Offene Punkte

**Verschoben nach oben** — die aktuelle, gueltige Liste steht im Abschnitt
„Fuer eine frische Session: START HIER" ganz am Anfang dieser Datei. Was hier
frueher stand, ist entweder erledigt oder dort neu formuliert:

- Hintergrund aussuchen → **erledigt**: die Dither-Wolke ist gewaehlt und laeuft
  im Header. `field()` und `.guides` blieben in der Engine, weil die Guides als
  Rails auf der Buehne jetzt DOCH benutzt werden; `PixelFX.field` hat keinen
  Aufrufer mehr und kann beim naechsten Aufraeumen raus.
- Pixelschrift im hellen Modus → **gegenstandslos**: die Pixel-Engine ist aus
  den Ueberschriften raus. Der damalige Fehler (1,03:1 durch die
  Theme-Transition) ist trotzdem behoben, und der Theme-Bootstrap im `<head>`
  bleibt noetig, solange irgendeine Seite noch rastert.

## Werkzeuge

| | |
|---|---|
| `bash tools/sweep.sh` | jede Seite laden, Konsolenfehler + Overflow + a11y |
| `bash tools/accent_audit.sh` | jeder Akzent-Textknoten UND jede Pixel-Leinwand gegen ihren echten Grund, 6 Seiten x 2 Themes |
| `bash tools/pixel_scale.sh` | sitzt jedes Mosaik im Massstab 1.00 auf seinem Foto |
| `python tools/check_links.py` | Links, Anker, doppelte IDs |

## Lehren, die ich nicht nochmal lernen will

1. **Ein Link, den niemand oeffnen kann, ist kein Angebot.** Die
   Vergleichsseiten lagen hinter `.vercelignore`, und ich hatte das Gegenteil
   ins Handover geschrieben, ohne es zu pruefen. Eine Behauptung ueber
   Erreichbarkeit kostet einen `curl`.
2. **Ein IntersectionObserver meldet UEBERGAENGE, keine Zustaende.** „unter dem
   Fenster" und „ueber dem Fenster" sind beide Verhaeltnis null; wer springt,
   bekommt gar nichts. Zustand aus einer gemessenen Kante ableiten.
3. **Eine Schwelle, die sich beim Ueberqueren verschiebt, wird zweimal
   ueberquert.** Platzhalter in Originalgroesse, bevor etwas aus dem Fluss
   genommen wird.
4. **Eine Theme-Transition vergiftet jeden, der die Farbe LIEST.** Theme inline
   im `<head>` setzen, vor dem Stylesheet.
5. **Ein Waechter muss lesen, was der Besucher SIEHT** — Leinwand statt
   `getComputedStyle` — und erst, wenn sie fertig ist.
6. **Ein Waechter, der NICHTS findet, hat nicht bestanden — er ist
   ausgefallen.** Der Dev-Server war tot, der Kontrast-Audit pruefte die
   Fehlerseite und meldete „accent nodes 0 ... passes on every page". Alle
   Runner pruefen jetzt zuerst per `curl`, ob der Server antwortet, und eine
   Seite ohne Akzent-Text UND ohne Mosaik gilt als Fehler.
7. **Ein SCHRAEGER Verlauf verschiebt sich nicht um seine eigene Breite.**
   Periode = Breite UND Hoehe. Hinschreiben statt ableiten.
8. **Ein zu kurzes Warten faelscht jede Messung.** Viermal in zwei Sitzungen:
   ein glatt scrollendes `scrollIntoView` war nicht angekommen, ein Mosaik noch
   im Aufbau, ein Rand noch pausiert. Erst die Fertig-Bedingung, dann messen.

---

# Stand 2026-08-31 — die Seite liegt jetzt im Repo-Wurzelverzeichnis

**Struktur-Umzug (Owner 2026-08-31):** „die originale version die jetzt live
ist, packen wir in einen old ordner. die neue version an der wir arbeiten IST
ab sofort die neue version die auch live gehen wird." Und: „bei dem vercel
projekt nehmen wir direkt die neue iteration als main, da brauchen wir kein v3
oder so."

Also: der Inhalt von `v3-proposal/` ist ins **Repo-Wurzelverzeichnis** gezogen,
die abgelöste Seite liegt unter `old/` (`upload/`, `upload-v2/`, `mockup/`,
`_v2-preview/`). Damit stimmen Vercels Vorgaben von allein — Root Directory
leer, Production Branch `main` — und es muss nichts im Dashboard eingestellt
werden.

**Deployment steht und ist verifiziert (2026-08-31).**
`https://mccain-digital.vercel.app` liefert die neue Seite, Production aus
`main`, kein Dashboard-Eingriff nötig. Nachgemessen auf der Edge:

| Prüfung | Ergebnis |
| --- | --- |
| alle 10 Seiten + 404 | 200 bzw. 404 mit unserer eigenen 404-Seite |
| `v3.css`, `common.js` | `max-age=0, must-revalidate` — greift wie geplant |
| Bilder, Fonts | `max-age=31536000, immutable` |
| `/old/…`, `/tools/…`, `/HANDOFF.md`, `/_parked/…` | **404** — `.vercelignore` hält sie draußen |
| Security-Header | `nosniff`, `strict-origin-when-cross-origin`, `SAMEORIGIN` |
| Lighthouse Desktop **live** | Perf **99** · A11y **100** · Best Practices **100** · Agentic **100** · SEO 69 (allein das bewusste `noindex`) |

**Die Sorge um den Cache-Kompromiss war unbegründet — gemessen, nicht
vermutet.** CSS und JS revalidieren statt `immutable` zu sein, und die
Performance steht trotzdem auf 99 (LCP 0,7 s, TBT 0 ms, CLS 0,002). Die
geplante `?v=`-Versionierung samt `bump_assets.py` wird also **nicht** gebaut.

**Dabei gefunden und behoben:** `og:title` und `twitter:title` der vier
Rechtsseiten trugen `Imprint &amp;mdash; McCain Digital` — eine
Social-Vorschau hätte die Entity wörtlich angezeigt. Ursache an beiden Enden:
`build_legal.py` schrieb `&mdash;` in den Titel, wo jede andere Seite das
Zeichen selbst schreibt, und `add_meta.py` liest Titel aus den Seiten zurück,
also **Markup** — es maskiert jetzt erst nach dem Dekodieren.

**Was dabei brach und repariert wurde:**

- `prodserve.py` hatte das Wurzelverzeichnis **absolut hartcodiert** auf den
  alten Ordner. Nach dem Umzug antwortete jede Seite 404, ohne eine einzige
  Fehlermeldung im Log — der Server war gesund und zeigte auf nichts. Jetzt
  wird es aus dem Ort der Datei abgeleitet.
- `tools/build_legal.py` liest die Rechtsseiten jetzt aus `old/upload/legal/`.
- `tools/build_sitemap.py` und `tools/check_links.py` überspringen `old/` —
  ohne das bricht der Sitemap-Wächter sofort ab („on disk but not listed"),
  weil er die ganze alte Seite mitzählt.
- `.vercelignore` hält `old/`, `tools/`, `_parked/`, die Notizen und die
  Aufzeichnungen aus dem Deployment. **Lokal ist `/old/upload/index.html` mit
  200 erreichbar** — auf der Edge darf es das nicht sein, sonst steht dieselbe
  Firma ein zweites Mal, älter, im Index. Nach jedem Struktur-Eingriff prüfen:
  `curl -sI https://<host>/old/upload/index.html` muss 404 liefern.

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

**Zwei Server, zwei Zwecke — nicht verwechseln:**

```bash
python prodserve.py 8898 --dev   # ANSCHAUEN, Cache-Control: no-store
python prodserve.py 8897         # MESSEN (Lighthouse), Produktions-Header
cd upload-v2   && python -m http.server 8899       # Vorwelle, 4×100
cd _v2-preview && python -m http.server 8890       # Claude-Design-Vorlage "Fresh v2"
```

**Zum Anschauen NIE 8897 benutzen.** Der Messserver schickt für `.css`/`.js`
`max-age=31536000, immutable` — richtig für ein CDN, im Browser eine Falle: eine
geänderte Datei wird ein Jahr lang nicht neu geholt. Ein nacktes
`python -m http.server` ist keine Rettung, es schickt gar keine Cache-Header,
worauf der Browser heuristisch über `Last-Modified` zwischenspeichert und
ebenfalls alte Dateien liefert. Beides hat schon je eine Stunde Fehlersuche an
einem längst behobenen Fehler gekostet. `--dev` schickt `no-store`.

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
  **Der Fließtext ist wörtlich aus `old/upload/legal/` übernommen** — juristisch
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

**Rechtsseiten neu erzeugen** (nach einer Änderung an `old/upload/legal/`):

```bash
python tools/build_legal.py     # liest old/upload/legal/, schreibt legal/
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
4. **Bild-Zeichenpfad kostet das Loch, nicht das Bild** (2026-08-03). Vorher
   wurde pro Frame das ganze Feld neu gemalt: bei der Work-Karte 14 157
   Partikel, 5,15 ms bei DPR 1 und 6,75 ms bei DPR 2 — davon zwei Drittel
   allein das Setzen von `fillStyle` (ein `"rgb(...)"`-String pro Partikel,
   pro Frame). Das ist der ganze Unterschied zu den Buttons, die dieselbe
   Schleife mit ~400 Partikeln fahren. Jetzt: das ruhende Mosaik einmal in ein
   Offscreen-Canvas (`home`), pro Frame **ein** `drawImage`, und nur die vom
   Loch berührten Zellen (~1 370) werden gelöscht und einzeln neu gemalt →
   **0,54 ms bzw. 0,70 ms**. Die Zeichenkosten hängen ab jetzt am Radius des
   Lochs, nicht an der Bildgröße; eine doppelt so große Karte kostet gleich
   viel. Buchführung: `dirty`-Box in Rasterkoordinaten, die jeden Frame um die
   Zeigerscheibe wächst und auf das schrumpft, was noch nicht daheim ist —
   „nicht daheim" zählt, nicht „bewegt sich", sonst malt der nächste Blit einen
   im Krater geparkten Pixel hinter seinem Rücken wieder nach Hause.
5. **Der Bildausschnitt kam per Ziel-Rechteck, nie per Quell-Rechteck**
   (2026-08-03) — der Fehler, den der Owner als „das Bild zoomt gewaltig" sah.
   `build()` hatte den Cover-Ausschnitt aus `naturalWidth/naturalHeight`
   gerechnet und als 9-Argument-Quellrechteck an `drawImage` gegeben. Für jedes
   `<img>` mit `srcset` ist das falsch: **`naturalWidth` meldet die
   dichte-korrigierte Größe in CSS-Pixeln, `drawImage` liest sein Quellrechteck
   in rohen Bitmap-Pixeln.** `code-screen-640.webp` ist 640×440 auf der Platte
   und meldet 559×384 — der Ausschnitt griff also die linken oberen 87 %.
   Auf einer Anzeige, die per DPR die 1200w-Variante mit Dichte 2,14 wählt,
   griff er ein **Viertel**: das Bild erschien bei 200 %, oben links verankert.
   Jetzt die 5-Argument-Form, die das **ganze** Bild in ein Ziel-Rechteck
   skaliert — es wird nie eine Größe im Bitmap-Raum genannt, nur das
   Seitenverhältnis aus `natural*` gelesen, und ein Verhältnis ist
   dichte-unabhängig. **Testfalle:** ein Abgleich, der nur nach Verschiebung
   sucht, findet das nie (eine reine Skalierung hat ihr Optimum bei dx=dy=0) —
   und auf DPR 1 mit der 640er Variante beträgt der Fehler nur 1,14×. Der Test
   in `tools/` sucht deshalb über **Skalierung**.
6. **Weiche Blende zwischen Foto und Mosaik — im Canvas, nicht in CSS.**
   Erst probiert und verworfen: harter Schnitt in beide Richtungen (wie
   `PixelFX.button`). Grund für den Verwurf war der Owner-Wunsch „viel viel
   weicher". CSS-Deckkraft geht dafür nicht: zwei deckende Ebenen, die
   aneinander vorbeiblenden, ergeben `a + b(1-a)`, in der Mitte ~75 % — auf den
   dunklen Karten ein sichtbarer dunkler Puls. Lösung: das scharfe Foto liegt
   als **undurchsichtiger Boden** (`photoCv`, Alpha 1) im Canvas, das Mosaik
   darüber mit Alpha `mix`. Die Deckung ist damit in jedem Moment 100 %
   (gemessen: Helligkeit konstant 40,2–40,4 über den ganzen Verlauf). Im
   Dauer `FADE = 640 ms`, easeInOutCubic — **das ist der einzige Regler für
   „weicher"**: als hart empfindet man die steilste Stelle in der Mitte, und die
   liegt bei `3/FADE`. 460 → 640 ms senkte sie von 15,3 auf 11,9 (Blockigkeit
   pro 100 ms). Der `<img>`-Tausch passiert nur noch bei `mix` 0 oder 1, wo
   Canvas und Foto dasselbe Bild zeigen — also unsichtbar. Federschwanz-Timer
   und Rückgabe-Kappe sind damit ersatzlos entfallen: die Blende entscheidet,
   nicht die Physik.
7. **Der Effekt liegt auf einer eigenen Ebene (`fxCv`)** — sonst sieht man die
   aufgeräumte Box. Erster Anlauf von Patch 6 hat die gestörte Box direkt auf
   die Hauptfläche gerechnet: Foto mit `1-mix` **innerhalb**, mit `1`
   **außerhalb**. Damit bekam die Box eine andere Mischung als ihre Umgebung
   und stand mitten in der Blende als schwaches Rechteck im Bild — der Owner
   hat es gesehen, bevor ich es gemessen hatte. (Meine ersten beiden
   Herleitungen waren falsch: die Deckung ist überall 255, es war ein reiner
   Farbunterschied.) Jetzt in zwei Schritten: **(1)** die ganze Wirkung wird
   deckend auf `fxCv` gebaut — Mosaik, Box freigeräumt, mit `voidCol` gefüllt,
   Partikel darüber; nichts davon kennt `mix`. **(2)** die Hauptfläche bekommt
   genau zwei Befehle: Foto mit Alpha 1, `fxCv` mit Alpha `mix`. Kein Bereich
   hat mehr ein eigenes Rezept, also kann es keine Kante geben — das ist eine
   Eigenschaft der Konstruktion, nicht eine gut eingestellte Zahl.
   `voidCol` ist der Hintergrund des ersten Vorfahren, der wirklich einen hat
   (`readVoid()`, bei jedem `activate()` neu wegen Themenwechsel) — geprüft:
   Krater `rgb(21,20,15)` = `.case`-Hintergrund. Kosten: zwei zusätzliche
   Vollflächen-`drawImage` pro Frame, in der Messung nicht nachweisbar
   (Median 16,7 ms, 0 Frames > 20 ms).
8. **Zwei Anleihen bei der Claude-Design-Vorlage** (`_v2-preview/assets/
   5e7a8095-*.js`) — die Architektur dort **nicht** übernehmen, sie malt jedes
   Frame das ganze Feld neu und ruckelt entsprechend (vom Owner bestätigt).
   - **Zellweise Mittelung statt Punktabtastung.** Das Bild wird jetzt in ein
     Offscreen von genau `COLS × ROWS` gezeichnet, ein Texel pro Rasterzelle;
     der Browser mittelt beim Verkleinern. Vorher wurde je Zelle das linke obere
     Pixel gegriffen, was auf feinem Inhalt (Code, Platinen) sprenkelte. Der
     Rückleseaufwand fällt von `W*H` auf `COLS*ROWS` — 14 k statt 224 k Pixel
     auf einer Work-Karte. Nebenbei entfällt die alte Bruchzahl-`GAP`-Falle:
     Zellen werden über ganzzahlige Indizes adressiert, keine Koordinate kann
     mehr zwischen RGBA-Bytes landen. **Wichtig:** der Cover-Ausschnitt wird
     weiterhin aus `W/H` gerechnet und nur durch `GAP` geteilt — `COLS/ROWS`
     trägt einen Rundungsfehler und würde `tools/pixel_scale.sh` brechen.
   - **Der Krater ist kein Ausstanzen mehr, sondern eine Abdunklung.**
     `VOID = 0.62` (`opts.voidStrength`): die gestörte Box wird mit `voidCol`
     bei dieser Deckkraft überzogen, die lebenden Pixel danach deckend darüber.
     Kein `clearRect` mehr — eine Zelle, deren Pixel daheim ist, wird ohnehin
     wieder überdeckt; eine, deren Pixel weg ist, behält einen verblassten
     Abdruck, und **dieser Abdruck ist der Krater**. Bei `VOID = 1` ist es
     wieder das harte Loch von vorher. Grund: im hellen Modus stand sonst eine
     harte weiße Scheibe mitten im dunklen Foto. Die Vorlage löst dasselbe
     anders — ihre Blöcke sind kleiner als das Raster (`size = gap - 1.2`), der
     Hintergrund scheint überall zu 36 % durch, das Loch ist dort nie ein
     Fremdkörper. Das schleiert aber jedes Bild zur Seitenfarbe hin, was das
     dichte Mosaik hier bewusst nicht tut — daher der Regler statt des Rasters.

6. **Ein rotiertes Bild wird in seiner LAYOUT-Box gemessen, nie im
   `getBoundingClientRect`.** Owner (2026-08-31): „unter 05 wenn ich da über die
   bilder gehe, dann transformiert der die bilder höhe leicht. das darf nicht
   passieren." Die Porträts unter (05) sind rotiert, und ihre Scroll-Drift
   **animiert** die Rotation (`pdA` −6,5° → −1,2°). `getBoundingClientRect`
   liefert für ein transformiertes Element die achsenparallele **Hülle**: bei
   −6,5° sind das 428 × 513 statt 381 × 477 — 12 % zu breit, 8 % zu hoch, und
   der Betrag hängt am Scrollstand. Das Canvas hängt per CSS an der Box
   (`inset:0; width:100%`), also wurde ein in Hüllgröße gebautes Feld
   **ungleichmäßig gestaucht** dargestellt: das Bild änderte sichtbar die Höhe,
   sobald der Hover an das Canvas übergab. `build()` nimmt jetzt `boxSize()` —
   `getComputedStyle().width/height`, also Used Values im eigenen
   Koordinatensystem des Elements, transformfrei per Definition und stabil
   während die Drift läuft. Die Work-Karten waren nie betroffen, weil sie nicht
   rotiert sind.

   Derselbe Denkfehler steckte im **Maus-Handler**: `clientX − rect.left`
   stimmt nur für eine achsenparallele Box. Gemessen saß der Krater **18 px
   (Porträt 1) bzw. 22,5 px (Porträt 2)** neben dem Cursor — bei `R = 46` ein
   halber Radius. Die Matrix aus den Computed Styles zu rekonstruieren wäre
   brüchig (`translate`/`rotate`/`scale` sind eigene Eigenschaften neben
   `transform`, und die Drift animiert sie), also wird die Abbildung
   **gemessen**: eine 0×0-Sonde an drei bekannten lokalen Punkten meldet ihre
   transformierte Lage, das ergibt die affine Vorwärtsmatrix, die einmal
   invertiert und zwischengespeichert wird. Fehler danach **1,0–1,1 px**. Der
   Cache fällt bei `activate()`, `resize` und `scroll` — der Scroll-Listener
   hängt nur, solange die Karte aktiv ist, und die Sonde lebt so lange wie die
   Karte (kein DOM-Müll pro Mausbewegung). Kosten: keine — Hover-Sweep p90
   16,7 ms, 0 Frames über 20 ms, auch beim Sweep **während** des Scrollens, dem
   Fall, der pro Bewegung neu misst.

   **Der Wächter war auf diesen Defekt blind** und ist nachgeeicht:
   `tools/pixel_scale_probe.js` maß selbst mit `getBoundingClientRect` und
   verglich damit Hülle gegen Hülle — er blieb grün, während das Mosaik
   gestaucht angezeigt wurde. Er rechnet jetzt in der Layout-Box und prüft
   zusätzlich direkt `Canvas-Backing (CSS-px) == Layout-Box` (`boxOk`).
   Gegenprobe gefahren: mit dem alten `build()` schlägt er fehl, mit dem neuen
   ist er grün.

## Umzug zu Vercel (Owner-Entscheid 2026-08-31)

**Warum überhaupt.** Punkt 4 der offenen Liste ist `/api/ask` als
Serverfunktion. Die Seite liegt heute auf **klassischem Apache-Webspace, rein
statisch** (`upload/.htaccess`, Deploy = Ordner hochladen) — dort gibt es
keinen Ort, an dem eine Funktion laufen könnte. Zur Wahl standen: nur den
Endpunkt auslagern, PHP-Proxy, oder die ganze Seite umziehen. **Owner hat den
Umzug gewählt** und legt das Vercel-Projekt selbst an; deployt wird künftig per
`git push`, nicht per FTP.

**Punkt 7 der offenen Liste entfällt damit voraussichtlich.** Er lautete:
`upload/services/apps.html` und `design-brand.html` löschen und Menü, Footer,
`sitemap.xml`, `llms.txt` nachziehen — also die Live-Seite von sechs auf vier
Services bringen. das Repo-Wurzelverzeichnis ist von vornherein auf vier gebaut; sobald es
die Live-Seite ist, gibt es dort nichts aufzuräumen. Erst wenn der Umzug doch
scheitert, wird Punkt 7 wieder aktuell.

### Was der Owner in Vercel einstellt

- Repository `heidrich/mccain-digital` verbinden.
- **Root Directory: leer** (Vorgabe) — durch den Struktur-Umzug ist die
  Repo-Wurzel bereits die Seite.
- **Framework Preset: Other** — es gibt keinen Build-Schritt, die Dateien
  werden ausgeliefert wie sie sind. Build Command und Install Command leer.
- **Production Branch: `v2-homepage-refresh`** (nicht `main`) — auf `main`
  liegt noch der alte Stand. Solange keine Domain dranhängt, ist die
  Vercel-URL damit gleich dem aktuellen Entwurf.
- **Keine Domain verbinden**, solange die Inhalte fehlen (Kundenzitate, zwei
  Work-Cases, echte Porträts). Bis dahin ist es eine Vorschau-URL, und das
  bewusste `noindex` in jedem `<head>` bleibt drin.

### Was schon vorbereitet ist

`vercel.json` übersetzt die Header-Politik von `prodserve.py`
(gegen die alle 100er gemessen wurden) auf die Edge.

**Die alte Frage — wo Vercel `vercel.json` bei gesetztem Root Directory sucht —
erledigt sich durch den Umzug:** die Datei liegt in der Repo-Wurzel, und die ist
das Deployment-Verzeichnis. Zu prüfen bleibt, ob die Header ankommen:

```bash
curl -sI https://<host>/v3.css   | grep -i cache-control   # max-age=0, must-revalidate
curl -sI https://<host>/img/…webp | grep -i cache-control   # immutable, ein Jahr
curl -sI https://<host>/old/upload/index.html               # MUSS 404 sein
```

Liefert CSS etwas anderes, stimmen die `source`-Muster in `vercel.json` nicht —
Vercel benutzt path-to-regexp, und ob `/(.*).(css|js)` den Punkt als Literal
nimmt, ist genau das, was diese Prüfung beantwortet.

**Eine Sache aus `prodserve.py` wird bewusst NICHT übernommen.** Dort steht
`.css` und `.js` in `IMMUTABLE`, also `max-age=31536000, immutable`. Für den
Messserver ist das richtig — für Produktion wäre es ein Zeitzünder: die Dateien
heißen `v3.css`, `common.js`, **ohne Hash im Namen**. Ein Besucher, der die
Seite einmal geladen hat, behielte ein Jahr lang die alte Fassung, und
`immutable` lässt sich nicht einmal per Reload durchbrechen. In `vercel.json`
stehen CSS und JS deshalb auf `max-age=0, must-revalidate` (ETag-Revalidierung,
ein 304 ist billig). Bilder und Fonts bleiben ein Jahr immutable — ihre Namen
tragen die Größe (`-440`, `-840`) und ändern sich nicht in-place.

**Falls Lighthouse deswegen meckert** („efficient cache policy"): erst messen,
dann optimieren. Der saubere Ausweg ohne Build-Schritt wäre
Query-Versionierung (`v3.css?v=9`) plus ein `tools/bump_assets.py`, das die
Zahl in allen elf Seiten hebt — dann können CSS und JS wieder immutable werden.
Nicht vorab bauen, solange nicht gemessen ist, dass es nötig ist.

### Danach, in dieser Reihenfolge

1. Erstes Deployment abwarten, Header prüfen (siehe oben), `404.html` prüfen
   (Vercel sollte sie automatisch für 404er nehmen — verifizieren, nicht
   annehmen), alle elf Seiten einmal durchklicken.
2. `/api/ask` als Vercel Function unter `api/ask.js`. Offen und vom Owner zu
   entscheiden: **welches Modell und wessen Key** (die Konsole wirbt mit
   „model-agnostic"), dazu Rate-Limit und Budget-Deckel. Danach `AI_MODE` in
   `v3.js` auf `"live"`.
3. Kontaktformular verdrahten (live läuft Web3Forms).
4. Erst wenn die Inhalte stehen: `noindex` raus, Domain umhängen, alte
   Webspace-Fassung abschalten.

## Pixel-Überschriften: Raster in Gerätepixeln (2026-08-31, dritter Anlauf)

**Owner:** „man kann das weiss und gelb ob super schwer lesen, weil es zu blass
wirkt", „keine transparenz bei den farben" — und nach dem zweiten Anlauf:
„die pixel dichte ist zu hoch, keine pixel mehr zu sehen und die performance
ist tot."

**Zwei Zahlen wurden vorher geraten, jetzt sind beide abgeleitet.** Zelle und
Block liegen auf **ganzen Gerätepixeln**, und der Block ist per Klemmung immer
mindestens ein Gerätepixel **kleiner** als die Zelle:

```js
var GRID_DEV  = Math.max(2, Math.round(GAP * DPR));
var BLOCK_DEV = Math.min(GRID_DEV - 1, Math.max(1, Math.round(SIZE * DPR)));
```

Die Klemmung ist der eigentliche Fix: *die Lücke zwischen den Blöcken IST der
Pixeleffekt*. Sie kann nicht mehr zufallen, egal was jemand einstellt.
`data-gap` / `data-size` sind seitdem eine **Bitte, kein Ergebnis** — mehrere
Eingaben landen auf demselben Raster.

**Defaults 1.1/1.0 → 3.0/2.0** (bei DPR 1: 3-px-Zelle, 2-px-Block).

| Stand | Zelle/Block | Fläche eingefärbt | Deckkraft | Scroll-Median | Frames >20 ms | Hover-Median |
|---|---|---|---|---|---|---|
| 2.4/1.7 (Monate live) | fraktional | 21 % | **140/255** | — | — | — |
| 1.1/1.0 (verworfen) | 1 px / 1 px | 25,2 % | 255 | **50,0 ms** | **65 %** | **66,6 ms** |
| **3.0/2.0 (jetzt)** | 3 px / 2 px | 13,4 % | 255 | **16,7 ms** | **0 %** | **16,7 ms** |

Weniger Fläche als 1.1/1.0, aber **mehr sichtbare Farbe als 2.4/1.7**: 13,4 %
bei voller Deckkraft schlagen 21 % bei 140/255 (≈ 11,5 % effektiv). Und
**36 % weniger Teilchen als der Stand, mit dem der Owner zufrieden war** —
7.100 statt 11.100 in der Hero-Zeile, gegen 52.900 beim verworfenen Stand.

### Meine Performance-Messung war blind — das ist die wichtigere Lehre

Beim verworfenen Stand hatte ich „p90 16,7 ms, kostet nichts Messbares"
geschrieben. Der Owner sah 20 fps. Beide Messungen stimmten: ich hatte einen
**Hover-Sweep über eine kleine Überschrift auf der Lab-Seite** gemessen, nicht
**Scrollen über die echte Startseite**, wo alle Felder gleichzeitig gebaut
werden. Dieselbe Sonde auf `index.html` zeigt den Unterschied sofort und
brutal (Tabelle oben).

**Regel: eine Performance-Aussage gilt nur für die Seite und die Geste, die
gemessen wurden.** Und vor jedem „kostet nichts" gegenprüfen, ob das
Instrument einen bekannten schlechten Stand überhaupt als schlecht erkennt —
das hier hätte 90 Sekunden gekostet (`git checkout <bad> -- pixel-engine.js`,
messen, zurück).

**Varianten vergleichen:** `preview/pixel-lab.html` rendert fünf Einstellungen
nebeneinander mit echter Schrift, echter Engine und funktionierendem Loch. Sie
**misst jetzt jede Zeile selbst aus** (Zelle, Block, Fläche, Deckkraft) und
schreibt das Ergebnis neben die Überschrift, statt es beschriftet zu bekommen
— die handgeschriebenen Beschriftungen waren nach der Klemmung sofort falsch.
Eine Zeile wird erst übernommen, wenn sie **fertig eingeblendet** ist
(`soft > 1 %` → verwerfen); die erste Fassung maß mitten in der Animation und
meldete „20-px-Zelle, 100 % transparent".

## Akzentfarbe: `--acc-text` neben `--acc` (2026-08-31)

**Owner-Entscheid:** `#806400` fuer Akzent-**Text** auf hellen Flaechen.
Ausgewaehlt am Bild (`preview/accent-lab.html`), gemessen im Browser gegen den
tatsaechlich gemalten Hintergrund:

| Farbe | auf Papier | |
|---|---|---|
| `#f5c518` (Logo-Gelb) | 1,48:1 | faellt bei jeder Groesse durch |
| `#8a6d00` | 4,48:1 | verfehlt AA fuer Flie&szlig;text um 0,02 |
| **`#806400` (gewaehlt)** | **5,11:1** | besteht AA in jeder Groesse |
| `#7A8C00` (Gruen) | 3,42:1 | nur gro&szlig;e Schrift |
| `#6b5400` | 6,60:1 | besteht, liest sich als Bronze |

**Zwei Token, eine Marke.** `--acc` bleibt ueberall das Logo-Gelb. Neu ist
`--acc-text`, das auf Tinte `var(--acc)` ist und auf Papier `var(--acc-ink)`
(`#806400`). Die Regel ist mechanisch und laesst sich pruefen:

- Wer eine **Schriftfarbe** setzt (`color`, und der `-webkit-text-stroke` der
  hohlen Schriftzuege, wo die Kontur die Letter IST), nimmt `--acc-text`.
- Wer eine **Flaeche oder Linie** setzt (`background`, `border-color`,
  `outline-color`, `box-shadow`, Verlaeufe, Glows), behaelt `--acc`. Ein Knopf
  muss kein Textkontrastverhaeltnis erfuellen.

31 Stellen sind umgestellt, 43 behalten das Logo-Gelb. Auf dunklem Grund
aendert sich **nichts**, weil `--acc-text` dort auf `--acc` aufloest.

**Die eine bewusste Ausnahme ist die Wortmarke** (`.logo i`, „mccain
*digital*"). Sie behaelt das Logo-Gelb auf jedem Grund, nach der stehenden
Owner-Regel, dass das Logo-Gelb nie umgefaerbt wird; WCAG 1.4.3 nimmt
Logotypen aus. Sie misst 3,72:1 auf der hellen Leiste. Das ist eine
Entscheidung, kein Versehen, und steht so im Stylesheet.

**Neuer Waechter: `bash tools/accent_audit.sh`.** Misst jedes Element, das
Akzentfarbe auf Text malt, gegen den Grund, der wirklich dahinter liegt — sechs
Seiten, beide Themes. Aktuell 0 Fehler ausser der Wortmarke (die zweimal
auftaucht, Nav und Fu&szlig;). Gegengeprueft: mit dem alten Gelb meldet er 11
Fehler, erkennt den schlechten Zustand also.

**Drei Fehler in meinem eigenen Pruefskript, alle beim Bauen gefunden — sie
stehen im Skript als Kommentar, weil jeder davon ein stiller Fehlalarm war:**

1. `color(srgb 1 0.99 0.98 / 0.9)` hat **0–1-Kanaele**, nicht 0–255. Als Bytes
   gelesen wurde ein fast wei&szlig;es Kaertchen zu fast schwarz und erfand neun
   Fehler.
2. Eine **durchscheinende** Flaeche zeigt, was darunter liegt. Der Waechter
   rechnet den Stapel jetzt bis zur ersten deckenden Schicht zusammen.
3. Das Theme haengt in `localStorage`. Den Umschalter in einer Schleife zu
   klicken schleppt das Theme der Vorseite mit und **vertauscht die
   Beschriftungen aller Ergebnisse**. Das Theme wird jetzt vor dem Booten
   gesetzt.

## Farbwelle ueber den Pixeln (2026-08-31)

**Owner:** „koennen wir die pixel animieren mit verschiedenen farben die wie in
einer welle laufen oder random sind? wuerde auch zum animierten border der
console passen."

**Standard ist `data-wave="accent"`**: nur die akzentfarbenen Zellen tragen die
wandernde Farbe, die Zeile behaelt also ihre zwei Toene und die Bewegung landet
auf der Phrase, um die es geht. `preview/wave-lab.html` hat „all" (ganze Zeile),
„shimmer" (Welle plus Flackern) und „off" nebeneinander; umschalten ist EIN
Attribut, `data-wave-colors` setzt die Palette.

**Warum es nichts kostet.** Der Ruhezustand wird EINMAL in ein Offscreen-Canvas
gezeichnet; pro Frame kostet die Welle zwei `drawImage` und eine
Verlaufsfuellung — unabhaengig davon, wie viele Zellen die Ueberschrift hat.
Der teure Weg waere gewesen, die 7.000 `fillRect` pro Frame zu wiederholen; das
ist genau die Last, die die Seite schon einmal auf 20 fps gezogen hat. Gemessen
auf `index.html`: Scroll-Median 16,7 ms, 0 % Frames ueber 20 ms, 0 Long Tasks,
Ruhezustand ueber 4 s identisch mit „Welle aus".

Sie laeuft nur, wenn die Ueberschrift **im Bild** ist, **fertig aufgebaut** ist
und **das schwarze Loch ruht**. Alle Zellen bleiben voll deckend.

### Die Palette wird ERZEUGT, nicht aufgezaehlt

**Owner zur ersten Palette:** „statt regenbogen haben wir ein haessliches
gruen"; zum Gewuenschten: „halt wie ein gradient effekt", „wie als wenn wir
einen border animieren".

**Der Fehler war nicht die Farbwahl, sondern dass es zwei aufgezaehlte Farben
waren.** Ein Verlauf zeigt ueberwiegend das, was ZWISCHEN seinen Stops liegt,
und zwei Farbtoene in sRGB gemischt laufen immer durch eine entsaettigte Mitte
— Gold nach Gruen verbringt den groessten Teil der Strecke als Oliv. Schoenere
Endpunkte helfen nicht, weil der Matsch dazwischen sitzt.

Die Stops werden jetzt **erzeugt**: Saettigung und Helligkeit der Akzentfarbe
bleiben fest, nur der Farbton wandert. Dann kann nichts zwischen zwei Stops
matter sein als die Stops selbst — genau das macht ein animierter
Gradient-Border.

| `data-wave-style` | |
|---|---|
| `rainbow` | ganzer Farbkreis — **Standard** |
| `hue` | ±32°, bleibt nah an der Marke |
| `sheen` | ein Farbton, Helligkeit schwingt — Glanz statt Farbe |
| `data-wave-colors` | ueberschreibt weiterhin mit einer festen Liste |

Standard ist `rainbow`, weil der Owner den Border-Look wollte und
ausdruecklich in Kauf nimmt, dass das Gelb mitwandert.

`PixelFX.wavePalette(style)` gibt die erzeugten Stops heraus, und
`preview/wave-lab.html` malt pro Zeile die **tatsaechliche** Palette als
Streifen darunter. Ein von Hand geschriebener Streifen waere ein Bild von dem
gewesen, was ich meinte, nicht von dem, was laeuft — und genau dieser Streifen
macht das Oliv sichtbar, ohne auf die wandernde Welle zu warten. Er hat auch
sofort gezeigt, dass mein „hue"-Bogen mit ±55° Gruen und Rot erreicht, waehrend
die Beschriftung „bleibt im warmen Bereich" behauptete. Jetzt ±32°.

### Vier Fehler auf dem Weg, alle gemessen statt gesehen

1. **Die Welle fiel aus, wenn das Loch lief.** Erst tintete nur der
   Ruhe-Pfad; sobald das Loch die Zeile beruehrte, sprang sie auf ihre
   Grundfarben zurueck. Dieselbe Fehlerklasse wie zwei Zeichenpfade mit
   verschiedenen Rastern. Jetzt malt der Physik-Pfad mit demselben Verlauf.
2. **„Akzent" ueber `.accent` zu bestimmen war falsch** — die Klasse traegt nur
   in `.hero-h` eine Farbe, also passte ueberall sonst JEDE Zelle und die ganze
   Zeile wellte.
3. **„Alles, was nicht Grundfarbe ist" war auch falsch** — das faengt die
   gedimmte Haelfte von „Things that *actually shipped*" mit und haette graue
   Woerter vergoldet. Die Regel fragt jetzt das **Token** `--acc-text`, das
   immer definiert ist, egal ob die Seite es benutzt.
4. **Der Verlauf spannte ueber die ganze Zeile.** Das Akzentwort ist oft nur
   das letzte Drittel — die Farbe wanderte also die meiste Zeit durch die
   weisse Haelfte, wo sie nichts aendert, und am Wort stand dauerhaft die
   Endfarbe. Der Verlauf spannt jetzt ueber die Zellen, die er einfaerbt.

### Und ein Waechter, der laenger lebte als sein Fehler

Gegen (2) und (3) hatte ich eingebaut: „wenn ALLE Zellen als Akzent gelten, ist
die Regel kaputt — Welle aus". Nach Fix (3) war die Bedingung nicht mehr
Beweis fuer einen Fehler, sondern ein voellig normaler Fall: **die zweite
Hero-Zeile besteht komplett aus Akzentfarbe**. Sie schaltete sich also selbst
ab, und zwar lautlos. Zweimal habe ich in dieser Session „laeuft, 60 fps"
gemessen, waehrend gar nichts lief.

**Regel daraus: ein Waechter gegen einen Fehler muss mit dem Fehler
verschwinden.** Bleibt er stehen, ist er nur noch ein Bug mit einer guten
Begruendung im Kommentar. Und: **vor jeder Aussage ueber eine Animation zuerst
beweisen, dass sie laeuft** — hier durch zwei Farbmessungen im Abstand von
900 ms, nicht durch einen Blick auf die Bildrate.

## Pixelschrift im hellen Modus — war ein FEHLER, keine Grundsatzfrage

**Owner (2026-08-31):** „hell funktioniert die pixel schrift echt garnicht. da
muessen wir uns spaeter mal was anderes ueberlegen. ggf streichen wir den hell
modus ODER wir machen im hellen was ganz anderes mit der schrift."

**Gefunden und behoben in der Nacht auf 2026-09-01. Bitte nochmal ansehen,
bevor irgendwas gestrichen wird.**

Die Ueberschrift ueber der Falz stand im hellen Modus bei **1,03:1** — nahezu
weisse Zellen auf Papier, praktisch unsichtbar. Das war kein Gestaltungsproblem,
sondern eine Ladereihenfolge:

- Die Seite liefert `data-theme="dark"` im HTML, `common.js` stellt nach dem
  Parsen auf `light` um — und das startet eine 0,5s-Farbtransition.
- Die Pixel-Engine rastert den ECHTEN DOM-Text und liest seine Farbe per
  `getComputedStyle`.
- Die erste Ueberschrift baut genau in diesem Fenster, faengt das Weiss des
  alten Themes ein und behaelt es fuer den Rest des Besuchs. Nur die erste —
  alle spaeteren bauen, wenn die Transition laengst gelandet ist. Deshalb war
  es genau EIN Element pro Seite, immer dasselbe, immer nur hell.

Behoben an der Wurzel: das gespeicherte Theme wird jetzt **inline im `<head>`**
gesetzt, vor dem Stylesheet. Beim Laden gibt es dann gar keine Transition, also
nichts, was man mitten im Flug einfangen kann — und das dunkle Aufblitzen beim
Laden im hellen Modus ist damit auch weg.

**Was jetzt gemessen wird** (schlechteste gezeichnete Zelle gegen den echten
Grund, `bash tools/accent_audit.sh` prueft es bei jedem Lauf mit):

| | dunkel | hell |
|---|---|---|
| schlechteste Zelle | 3,42:1 | 4,21:1 |
| noetig (grosse Schrift) | 3:1 | 3:1 |

**Meine frueher hier notierte Begruendung war falsch** — ich hatte
argumentiert, ein Mosaik faerbe nur 44 % seiner Flaeche und mittle sich auf
Papier zu Grau, das sei „strukturell und nicht durch Farbe" kaputt. Das war
eine Theorie ueber einen Effekt, dessen echte Ursache ich nicht gemessen hatte.
Die Deckung ist auf Papier weiterhin geringer als bei Volltext — aber das ist
eine Geschmacksfrage und keine Sackgasse, und es ist NICHT das, was der Owner
gesehen hat.

**Also: bitte einmal im hellen Modus ansehen.** Wenn es dann immer noch nicht
gefaellt, stehen die alten Auswege weiter offen (hellen Modus streichen; auf
Papier eine andere Behandlung; `data-ink` mit dichterem Raster nur dort) — aber
dann als Geschmacksentscheidung, nicht als Reparatur.

## `/api/ask` — die Konsole kann jetzt mit Claude antworten

**Owner-Entscheid 2026-08-31:** Haiku 4.5, abgesichert über ein **Spend-Limit
in der Anthropic Console**. Vorher gemessen statt geschätzt: die Wissensbasis
ist **777 Token**, eine Frage kostet also rund 1.180 Input- und 250
Output-Token — **~2,43 $ pro 1.000 Fragen** (Sonnet 5 wären 4,85 $, Opus 5
12,13 $).

Auf die Frage „geht das nicht über unser Abo": **nein.** Ein Claude-Abo hängt
am Benutzerkonto, hat keine API-Zugangsdaten, und es als Backend einer
öffentlichen Seite zu benutzen verstößt gegen die Nutzungsbedingungen.

### Was der Owner noch tun muss (dann ist es live)

1. **Anthropic Console** → API-Key erzeugen.
2. **Dort ein Spend-Limit setzen** (z. B. 10 $/Monat). Das ist die einzige
   Grenze, die anbieterseitig durchgesetzt wird und die niemand umgehen kann.
3. **Vercel** → Project Settings → Environment Variables →
   `ANTHROPIC_API_KEY`, Environment **Production** (und Preview, wenn dort
   auch getestet werden soll).
4. **Einmal neu deployen** — eine Function sieht eine neu gesetzte Variable
   erst im nächsten Deployment. Ein leerer Commit reicht.

Bis dahin antwortet der Endpunkt `{"fallback": true, "reason": "no key
configured"}` und die Konsole arbeitet lokal weiter. **Nichts muss umgestellt
werden, wenn der Key kommt** — `AI_MODE` steht auf `"auto"`.

### Der Leitgedanke: der Endpunkt darf die Seite nie schlechter machen

- **Jeder Fehlerpfad antwortet HTTP 200 mit `{fallback:true}`** — kein Key,
  Rate-Limit, Budget aufgebraucht, Refusal, Anbieter-Ausfall. Der Client
  antwortet dann aus der lokalen Wissensbasis, die ohnehin jede Frage abdeckt,
  für die die Seite gebaut wurde. Der Besucher sieht in jedem Fall eine
  funktionierende Konsole, keine Fehlermeldung.
- **Der Client fällt auf `lookup()` zurück, nicht auf `FALLBACK`.** Der alte
  Live-Zweig zeigte den generischen „dafür habe ich keine Antwort"-Text —
  damit wäre „live" beim ersten Fehlschlag *schlechter* gewesen als „local".
- **Der Brief-Generator bleibt lokal.** Er ist ein Formular, kein Gespräch.
- Meldet der Endpunkt „no key configured", fragt der Client für den Rest des
  Besuchs nicht mehr, statt pro Frage einen Roundtrip für dieselbe Auskunft zu
  verbrauchen.

### Warum `data.js` geladen und nicht kopiert wird

Die Function macht `require("../data.js")` — dieselbe Datei, die der Browser
lädt. Eine zweite Kopie der Wissensbasis wäre an dem Tag veraltet, an dem
jemand eine der beiden bearbeitet. Dafür war **eine** Änderung an `data.js`
nötig: die Reduced-Motion-Abfrage lief auf Modulebene und machte die Datei
außerhalb eines Browsers unladbar. Sie wird jetzt bei Bedarf gelesen — was
nebenbei einen Besucher respektiert, der die Einstellung mitten im Besuch
umstellt, statt den Wert beim Laden einzufrieren.

### Das Rate-Limit ist eine Bremse, keine Mauer

8 Anfragen pro IP und 10 Minuten, im Speicher der Instanz. Vercel kann mehrere
Instanzen fahren, jede hat ihre eigene Map — ein entschlossener Aufrufer
bekommt also ein Vielfaches. **Die Mauer ist das Spend-Limit.** Was die Bremse
kauft: ein einzelnes Skript kann nicht das Monatsbudget an einem Nachmittag
verfeuern und die Konsole für alle anderen bis zum Monatsende totlegen.

*(Der Owner hatte nur das Spend-Limit gewählt; das Limit ist trotzdem drin,
weil es nichts kostet und einen realen Ausfall verhindert — kann raus, wenn er
es nicht will.)*

### Geprüft

Lokal: 405 auf GET, 400 ohne Frage, Fallback ohne Key, Rate-Limit greift beim
9. Aufruf, Wissensbasis erreicht den Prompt (10 Einträge, 4 Services). Live:
`POST /api/ask` liefert `{"fallback":true,"reason":"no key configured"}`, und
die Konsole auf `mccain-digital.vercel.app` beantwortet Fragen korrekt aus der
lokalen Basis, ohne Seitenfehler. **Noch nicht prüfbar, weil kein Key gesetzt
ist:** der eigentliche Modellpfad und das Rate-Limit im Livebetrieb.

## Die Tafeln unter (04) sind ganzflächig anklickbar

Owner (2026-08-31): „die tafeln, die sollten alle hover pointer aktiv sein,
nicht nur der more on this link. gerade auch weil mobile das sich wiederholt."

Die Work-Karten machen das seit jeher (`.case .scard-link::after { inset: 0 }`,
Kommentar dort: „the card is the click target, the visible link is only its
label"). Die Service-Karten hatten es nie. **Gemessen vorher: 30 von 126
Prüfpunkten** über eine Tafel landeten auf dem Link; danach 126 von 126,
Zeigerhand überall, Desktop wie Telefon.

**Warum das nicht mit einer Zeile ging.** `.scard > *:not(.scard-ghost)` stand
auf `position: relative` (damit der Text über Spotlight und Geisterziffer
liegt). Ein positionierter Vorfahre wird zum **Bezugsrahmen** für das
`::after`-Overlay des Links — das Overlay spannte deshalb über die mittlere
Spalte (544 × 133) statt über die Tafel (1325 × 225). Statt den Text zu heben,
liegt die Deko jetzt **darunter**:

- `.scard::after` (Spotlight) und `.scard-ghost` auf `z-index: -1`.
- `.scard { isolation: isolate }` — sonst hinge es daran, dass `v3.js` ein
  `z-index` inline schreibt; ohne Stacking-Context fiele die Deko hinter die
  Sektion.
- Die Regel, die den Inhalt anhob, ist ersatzlos weg.

**Optik unverändert — belegt, nicht behauptet:** Pixel-Diff der gehoverten
Sektion vorher/nachher ergibt **null** abweichende Pixel unterhalb der
Kopfzeile; die einzigen Unterschiede waren die Pacman-Leiste und die animierte
Pixel-Headline, die beide ohnehin laufen.

Dazu: jeder Link trägt `aria-label="More on this — <Service>"`, damit vier
gleichlautende Beschriftungen unterscheidbar sind, ohne den sichtbaren Text zu
ändern (der sichtbare Text bleibt im zugänglichen Namen enthalten, WCAG 2.5.3).

**Preis des Musters:** Text innerhalb einer Tafel lässt sich nicht mehr
markieren — das Overlay liegt darüber. Bei den Work-Karten ist das seit jeher
so akzeptiert.

## Die Banderole unter (05)

Owner (2026-08-31): „das ein und ausblenden des textes unten ist viel zu
schnell und wirkt abgehackt, ich würde sagen, den text setzen wir wie eine
schöne Banderole unten an das Bild."

**Es hat nie geblendet.** Die `figcaption` stand auf `z-index: auto`, das
Canvas der Engine steht auf 2 — beim Hover wurde der Text schlicht **verdeckt**
und beim Verlassen wieder freigegeben. Kein Übergang, ein Schalter. Deshalb
wirkte es abgehackt, und deshalb hätte eine längere Transition das Problem auch
nicht gelöst.

Gebaut ist **Variante B** aus `_parked/banderole-mockup.html` (vier Entwürfe,
mit den echten Fotos und laufender Engine; liegt in `_parked/`, weil
`build_sitemap.py` und `check_links.py` diesen Ordner überspringen — eine
zusätzliche HTML-Datei anderswo bricht den Sitemap-Wächter):

- Band über die volle Bildbreite, `z-index: 3`, also **über** dem Canvas.
- **Deckend** (`rgba(13,12,10,.94)`), kein Verlauf: dahinter läuft im Hover ein
  Mosaik mit einem Krater darin, über dem ein Verlauf unlesbar wird.
- 2 px Oberkante in `--acc`.
- Name links, Rolle rechts über `margin-left: auto` statt `text-align` — so
  sitzt sie hart rechts, solange beide eine Zeile teilen, und bleibt an Ort und
  Stelle, wenn die Karte zu schmal wird und sie umbricht (mobil bei 203 px
  Kartenbreite: zwei Zeilen, kein Überlauf).

Kontrast im schlechtesten Fall (helles Foto hinter dem 94-%-Band): Rolle
**6,8:1**, Name **15,3:1**, gelbe Kante 10,6:1.

**Wenn je eine überstehende Banderole gewünscht wird** (Varianten A/C/D im
Mockup): `.pcard` muss dann `overflow: visible` bekommen, und der Eck-Radius
muss auf `.px-img` wandern — sonst verlieren die Fotos ihre runden Ecken, weil
das Clipping der Karte sie bisher rundet. Das Canvas erbt den Radius bereits
(`.px-canvas { border-radius: inherit }`). Zu bedenken: die zwei Karten in (05)
überlappen sich, ein überstehendes Band legt sich also über die Nachbarkarte.

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
python prodserve.py 8897        # im Repo-Wurzelverzeichnis
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
python tools/build_legal.py     # nur wenn old/upload/legal/ sich geändert hat
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

Drei Skripte, alle ohne Abhängigkeiten:

```bash
python  tools/check_links.py          # jede Datei, jeder Anker, doppelte IDs
bash    tools/sweep.sh 1280 820 d     # alle 11 Seiten: Konsolenfehler,
bash    tools/sweep.sh  390 844 m     # Widgets, Overflow, A11y-Basics
bash    tools/pixel_scale.sh          # sitzt jedes Mosaik auf seinem Foto?
```

`pixel_scale.sh` prüft alle acht Pixelbilder (Work-Karten, Team-Porträts,
Service-Aufnahmen) und **sucht über Skalierung, nicht über Verschiebung** —
sonst findet es den srcset-Dichte-Fehler aus Patch 5 nie, denn eine reine
Skalierung hat ihr Optimum bei dx=dy=0. Erwartet `bestScale 1.00` überall;
Exit-Code ≠ 0, sobald eine Karte abweicht.

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
- **Ein Element kann nicht gleichzeitig ein CSS-`transform` und ein Pixelfeld
  fahren.** `.case:hover .case-img img { transform: scale(1.04) }` lief 0,9 s
  lang, während das Mosaik im Canvas bei Skalierung 1 festgenagelt blieb — die
  beiden Ebenen schoben sich bei jedem Wechsel 23 px auseinander, rein wie
  raus. Das las sich als „das Bild zoomt und ruckelt". Regel entfernt;
  `PixelFX.button` macht dasselbe seit jeher über
  `.pxbtn.px-active { transform: none !important }`. Wer den Zoom zurückwill,
  muss ihn auf **beide** Ebenen legen und die Zeigerkoordinaten in `onMove`
  gegenrechnen (`x * W / rect.width`) — das Mosaik wird dabei weichgerechnet.
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
