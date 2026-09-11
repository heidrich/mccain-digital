# Design-Befund — 5. September 2026

Ausgelöst durch vier Sätze des Owners: *„zu bildarm, zu viel Textblöcke untereinander, zu wenig
Space (die Infos aber nicht raushauen), die 4 Service-Seiten sind alles vom Layout gleich, das
verwirrt den User"* — dazu *„auch die Mainpage nochmal unter die Lupe nehmen"* und *„wir brauchen
eine DE-Loka"*.

Sieben Analyse-Linsen haben die Seite vermessen: Luft/Dichte, die vier Service-Seiten, die
Startseite Kapitel für Kapitel, Text-der-Bild-werden-will, das helle Theme, die Pixel-Engine als
Signatur, und die Lokalisierung. 56 Befunde.

## Wie belastbar das ist

**Die Gegenlese ist nicht gelaufen.** Alle 35 Skeptiker-Agenten sind am Sitzungslimit gestorben.
Ich habe deshalb **zwölf tragende Behauptungen selbst nachgemessen** — sie stehen unten unter
„Nachgemessen". Alles andere ist die Aussage einer einzelnen Linse und trägt deren Vertrauensgrad
(`gemessen` / `beobachtet` / `vermutung`). Vor dem Bauen gilt dieselbe Regel wie beim Award-Audit:
**erst selbst nachsehen.**

Rohmaterial: `scratchpad/round1_findings.md` (alle 56 Befunde mit Beleg, Vorschlag, Preis),
`scratchpad/density/TABLES.md` (Dichtekarte je Band), `scratchpad/shots/` + `scratchpad/tiles/`
(Ganzseiten dark/light/390, Kacheln, Motion-Aufnahmen).

---

## Nachgemessen — die zwölf, auf die ich mich festlege

| # | Befund | Messung |
|---|---|---|
| 1 | **Das „Partikelfeld" der fünf Service-/Kontakt-Heros hat zwei Töne** | `.dither-l`, 160×97 Zellen auf 1440×873 gestreckt: **3 verschiedene Farben**, davon `rgb(11,11,12)` **84,7 %** und `rgb(20,20,21)` **15,1 %** — Abstand **9 von 255**. Die Engine baut eine 6-Stufen-Rampe; fünf Stufen sind praktisch leer. |
| 2 | **Es gibt kein AA-taugliches Gelb auf Papier, das nicht braun ist** | Hue 47°, gegen `#f2f2ef` gerechnet: 4,5:1 verlangt Helligkeit ≤26 % (`#856800`), 5,2:1 ≤24 % (`#7a6000`), selbst 3:1 nur 33 % (`#a88400`). `--acc-ink #806400` misst 5,01:1 und ist HSL(47, 100 %, 25 %) — Braun-Gold. Auf Ink misst dasselbe Gelb 12,07:1. |
| 3 | **Das Kontrast-Gate ist blind für jede Farbe außer Gelb** | `isAccent()` in `tools/accent_audit_probe.js`: `r>90 && g>70 && b<90 && r>=g && g>b`. Durchgefallen: Grün `#7A8C00`, `--sig-ink`, **`--sig-text #a4bd00` (wird heute schon ausgeliefert)**, Violett, Pink, Acid. |
| 4 | **Die Canvas-Hälfte des Gates misst nichts** | Sie prüft `.ph canvas`; `data-pixel` ist repo-weit 0. `accent_audit.sh` meldet auf jeder Seite `pixel canvases 0`. Grün auf nichts. |
| 5 | **Der Brief-Generator nennt falsche Preise** | `brief()` in `v3.js:157–163`, mit den Beispielen der Seite selbst durchgerechnet: „A web app for our clinic" → **Mobile app, 8–14 Wochen, €30–70k** (die FAQ daneben sagt Web-App-MVP 6–12 Wochen). „A booking site for our hotel" → **AI tool €20–60k**, weil *boo**ki**ng* die Regel `/ki/` trifft. „A website with a tr**ai**ner directory" → AI tool. |
| 6 | **3762 px ohne einen Tonwechsel im Dark-Theme** | Bandgründe gemessen: Services (3104) → Studio → FAQ → Proof → bis Process (6866) alle `rgb(11,11,12)`. Das sind **4,2 Viewports eine Fläche**. Im Light-Theme laufen Work→Score→Services 2666 px Papier (2,96 Viewports). |
| 7 | **Die Luft fehlt innen, nicht zwischen den Bändern** | `var(--t-body)` steht **2×** in `v3.css`, `var(--t-small)` **42×**. Jede Karte, jeder Schritt, jede Notiz liest **14,24 px** (auf 390: 12,8). |
| 8 | **73–79 Zeichen je Zeile bei 14,24 px** | Gemessen über Zeilenkästen: `.scard-p` 73, `.step p` 74, `.brand-note` 73, `.form-note` 79. Zum Vergleich das eigene gute Maß der Seite: `.lead` bei 16,8 px = **46**. |
| 9 | **Der Sticky-Stapel der vier Service-Tafeln hat nichts zu tun** | Vier Karten à 225 px spannen **953 px** in einem 900-px-Viewport. Der Lead verspricht „the one you're reading stays, the next slides over it" — es bleiben 53 px Überlappung. |
| 10 | **Die strukturierten Daten kennen 6 von 7 FAQ-Fragen** | `index.html`: 6× `"@type": "Question"`, `data.js`: 7 Einträge. Der Anti-Fit-Tab („Is there a reason NOT to hire you?") fehlt — `tools/build_jsonld.py` lief nach dem siebten Tab nicht mehr. |
| 11 | **Im Besucherband steht Entwicklertext, und er stimmt nicht** | `index.html:338`: *„Right now this prototype answers from a local knowledge base; flip `AI_MODE` to `live` in `v3.js` once the endpoint is deployed."* — `AI_MODE` steht auf `"auto"` (`v3.js:35`), der Endpunkt existiert. |
| 12 | **Der Hero steht 70 km neben der Firma** | `stage-coords`: `48.14° N · 11.58° E` = Münchner Innenstadt. Anschrift in JSON-LD, Kontaktband und Fuß: **86869 Oberostendorf** (≈47,93° N / 10,75° E). Der Marquee sagt „Est. 2016 · München". |

Dazu zwei kleinere, ebenfalls geprüfte: `.scard-ghost` (das große Ziffern-Wasserzeichen der
Service-Tafeln) steht auf `opacity: 0` und wird **nur** bei `:hover` sichtbar — auf Touch also nie,
und auf keinem Screenshot. Und das Feld `proof` in `data.js` (je Leistung ein Beweissatz) rendert
**nur** das ⌘K-Menü, nicht die Karte.

---

## Was die vier Klagen des Owners wirklich sind

**„Zu bildarm"** — stimmt, aber die Ursache ist nicht die Zahl der Fotos. Die Pixel-Engine, die
Signatur dieser Seite, ist **ausschließlich auf Bilder verdrahtet** (`IMG_TARGETS` in
`common.js:619`). Wo kein Bild ist, kann auch kein Engine-Moment sein. Auf der Startseite haben
7 von 11 Bändern keine Bildfläche, auf den Service-Seiten 10 von 11. Nach dem Hero hat `index`
zwei Engine-Ereignisse auf 9,9 Viewports, danach vier Viewports ohne eines; `contact` hat keines.
Und das eine Feld, das fünf Heros tragen sollen, ist zweifarbig (Befund 1).

**„Zu viel Textblöcke untereinander"** — die Startseite hat neun Kapitel für vier Aufgaben und
erledigt jede mehrfach: dieselbe Wissensbasis in zwei streamenden Widgets ((01) Konsole und (06)
FAQ), 4×100 an vier Stellen, die Gründungszahlen in drei aufeinanderfolgenden Kapiteln, Mail und
Anschrift zweimal in den letzten 1005 px. Das ist nicht zu viel Information — es ist **dieselbe
Information zu oft, und jedes Mal als eigenes Band.**

**„Zu wenig Space"** — nicht zwischen den Bändern. Inhalt zu Inhalt stehen sie gleichförmig
145–234 px auseinander, und der Kommentar in `v3.css:293` belegt, dass mehr schon einmal gescheitert
ist („280 px leere Seite zwischen jedem Abschnitt"). Die Enge sitzt **innen**: 14,24-px-Fließtext
über 73–79 Zeichen in Karten mit 22-px-Rasterlücken. Die Seite wechselt zwischen 200 px Leere und
dichtem Klumpen — das liest sich gleichzeitig als „gedrungen" und „zu wenig Luft".

**„Die vier Service-Seiten sind alle gleich"** — gemessen: Skelett-Ähnlichkeit **97–98 %** unter
web-apps/websites/software, **137 Zeilen byte-identisch**, identische Bandfolge, identische
Kapitel-Labels, identisch komponierte Heros. Und die Pointe: **nur 4 von rund 80 Sätzen je Seite
sind wortgleich.** Die Arbeit steckt im Text, das Layout entwertet sie. Wer zwei Seiten scrollt,
glaubt, dieselbe gelesen zu haben.

---

## Der Vorschlag

### Die Startseite: neun Kapitel werden sieben

Nichts wird gestrichen — alles zieht um, verdichtet sich oder wird Grafik.

| Neu | Was | Woher, und warum |
|---|---|---|
| Bühne | unverändert; auf ≤860 px die Lesefolge Kicker → **H1** → Intro → CTAs → Fakten | heute stehen auf 390 die drei Belegzahlen **vor** der Behauptung, die sie belegen |
| (01) Konsole | bleibt der zweite Schlag; `ai-note` wird ein Besuchersatz; Chips werden Aufgaben statt FAQ-Fragen | sie löst den Primär-CTA der Bühne ein und ist der einzige interaktive Beweis des Claims |
| (02) **Vier Türen** (Services) | rückt von 3,4 auf ~1,9 Viewports nach vorn, 2×2-Raster, je Karte eine Farbe, Ziffern-Wasserzeichen **im Ruhezustand** sichtbar, `proof`-Zeile aus `data.js` endlich gerendert | drei der vier Türen haben nichts mit AI zu tun; das Angebot ist die zweite Frage nach dem Claim |
| (03) Work | Scroller wie heute + darunter der **P.S.-Streifen** (die fünf Score-Pillen) und die drei Zitat-Slots als schmale Reihe | P.S. war ein 453-px-Kapitel für 43 Wörter mit leerer rechter Hälfte |
| (04) Studio | + Markenleiste samt UWG-Hinweis als volle Zeile, + ein Satz „nach dem Launch" aus FAQ 05 | die Leitzeile verspricht „what happens after launch", der Bandkörper liefert Gründungsfakten |
| (05) FAQ | erste Antwort offen ohne Stream, Rest wie heute | ein Tippeffekt pro Kapitel reicht |
| (06) Prozess | Vier Schritte als **Zeitleiste** (`<ol>`, T+24 h / +30–45 min / T+48 h / Woche 1) statt vier Zeilen mit 80 % leerer rechter Hälfte; Schritt 03 bekommt den **Preisrahmen** | die Zeiten stehen heute schon in den Überschriften; die Spannen existieren nur im Brief-Generator |
| (07) Kontakt **+ Fuß** | ein Band: Formular rechts, links Lead, Mail, Anschrift und der Schlusssatz aus dem Fuß; darunter der schmale `foot-in`-Balken der neun anderen Seiten | Mail und Anschrift stehen heute zweimal in 1005 px; der Mega-Fuß existiert nur auf `index` |

Dazu der **Tonplan**: `#services` wird `band--paper`, `#contact` wird `band--ink`. Der längste
Einton-Lauf sinkt von 3762 auf ~2850 px (dark) und von 2666 auf ~2000 px (light).

Geschätzte Höhe: **−19 %** bei 1440 px, ohne dass eine Information verschwindet.

### Die vier Service-Seiten: eine Familie, vier Räume

**Konstant (die Familie):** Nav, Breadcrumb, Fuß, CTA-Band, FAQ-Mechanik, Related, und die
Zusagen „Festpreis in 48 h" / „30 Tage Support" / „no lock-in".

**Variabel je Seite:** Signal, Hero-Exponat, ein Signatur-Modul, die Bandfolge der ersten vier
Bänder, die Bildbehandlung.

| Seite | Signal | Hero-Exponat (rechte Bühnenhälfte, heute leer) | Signatur-Modul, das keine andere hat |
|---|---|---|---|
| **AI tools** | die Farbwelle | die **Konsole selbst** | die Konsole als Band (02) — heute liegt das einzige AI-Modul der Seite auf der Startseite, und die AI-Seite verlinkt dorthin |
| **Web apps** | Violett `#5B2EFF` (5,71:1 Papier) | Interface im Browser-Rahmen | Zeitleiste „Tag 1 → Tag 7 → Woche 6–12" |
| **Websites** | Pink `#FF3D8A` / auf Papier `#c2004d` | **diese Seite mit Live-Scores** | „This page, audited": Score-Tabelle + Gewichtsbalken statt Stockfoto |
| **Software** | Grün `#7A8C00` (existiert als `--sig`) | Inseln-Diagramm | Vorher/Nachher der Systeme, die nicht miteinander reden |

Die Farbe beginnt **auf der Startseite**: dieselbe Farbe an der Tür (Karte /01–/04) und im Raum
dahinter. Das ist die Identitätskette, die heute fehlt.

**Zwingende Nebenkosten:** ohne Erweiterung von `isAccent()` prüft das Kontrast-Gate keine dieser
Farben (Befund 3). Das ist kein Nice-to-have — es ist die Bedingung dafür, dass eine Freigabe
etwas bedeutet.

### Text, der Bild werden will

Ohne ein Wort zu streichen:

- **Prozess → Zeitleiste.** 879 Wörter in sechs Instanzen; jede Überschrift trägt ihre Zeit schon
  im Text. `<ol>` statt `<div>`, Zeit als eigenes Label. Kostet ~80 Zeilen CSS, 0 Frames, bringt
  nebenbei die Listen-Semantik.
- **Scores → Quittung.** Die leere rechte Hälfte von (03) wird eine Tabelle: 11 Seiten × 5 Audits,
  mit Messdatum und Bedingung. *Vorbedingung:* die Mobil-Zahlen neu messen — `HANDOFF` nennt 91–98,
  `TIPS.performance` behauptet 100.
- **Gewichtsbalken.** „287 KB, Engine inklusive" in fünf Segmenten — auf der Websites-Seite, wo
  heute ein Stockfoto neben dem Satz „nothing in the bundle we can't account for" steht.
- **Spannen aus einer Quelle.** Wochen und Euro stehen an fünf Orten und driften bereits
  (Befund 5). Ein `RANGES`-Array in `data.js`, aus dem Brief-Generator, FAQ und eine Balken-Tabelle
  rendern — das ist zugleich der fehlende Preisrahmen.
- **Stack als Markenreihe.** Nur die AI-Seite hat Logos; die drei anderen haben 14–15 Text-Pillen.
- **Was Text bleibt:** Problemsatz, Studio-Haltung, Anti-Fit, UWG-Hinweis und die Payoff-Sätze der
  Use-Case-Karten. Deren Zahlen sind ausdrücklich illustrativ — ein Balken daraus wäre eine
  erfundene Messung.

### Das helle Theme

Die schwerste Erkenntnis der Runde, und sie beantwortet die **offene Owner-Frage Nr. 1**:

> Auf Papier gibt es kein Gelb, das gleichzeitig lesbar und nicht braun ist. Das ist Arithmetik,
> keine Geschmacksfrage.

Die heutige Lösung (Gelb für Papier abdunkeln → `--acc-ink #806400`) **kann** die Regel „keine
Brauntöne" nicht erfüllen. Der Ausweg: **Gelb ist auf Papier Fläche, nie Schrift.** Zwei Zeilen
setzen `--acc-text` im Light-Theme auf `--fg`; an den vier bis sechs Display-Stellen trägt statt der
Farbe ein gelber **Marker** hinter Ink-Schrift (11,67:1). Das Gelb bleibt sichtbar, das Braun
verschwindet.

Dazu: die Wellenschrift auf Papier trägt vier von zwölf Stops in Braun/Rost/Oliv — dort ersetzt der
Bandvordergrund die warmen Stops, und aus „Gelb→Grün→Gelb" wird auf Papier „Ink→kalt→Ink". Auf Ink
bleibt alles wie es ist.

Und ein Strukturfehler: **alle Kontrast-Inseln sind Papier-Inseln** und verschwinden deshalb auf
Papier. Eine Klasse `band--island`, die im Dark hell und im Light dunkel ist, macht aus der Regel
„Inseln halten ihre *Farbe*" die Regel „Inseln halten ihren *Kontrast*".

### Die Signatur

Der billigste große Hebel ist Befund 1: **die Schwelle des Dither-Felds.** `dsmooth(0.52, 1.02)`
lässt nur 20 % der Zellen überhaupt einen Wert haben. Auf `0.40/0.90` sind es vier sichtbare Töne,
auf `0.34/0.80` fünf — bei identischen Frame-Kosten (Ring-Puffer, 12 fps). Und wenn der obere
Rampenpunkt je Seite die Signalfarbe ist, sind die vier Heros aus einer Zeile Konfiguration
unterscheidbar.

Der zweite: **ein autonomer Loch-Pass** auf der Bühne, einmal, bei ~2 s. Der Treiber existiert als
toter Code in `headline()`. Gemessen läuft der Zeiger-Pfad mit 60 fps und 0 Long Tasks. Damit sieht
auch ein Touch-Besucher den Effekt, den es für ihn heute gar nicht gibt.

Der dritte: **Bild-Slots in den bildlosen Bändern** — die Engine ist auf `.shot > .shot-img > img`
schon verdrahtet, es braucht keine JS-Zeile. Zwei ungenutzte Fotos liegen im Repo
(`img/process-notes.jpg`, `img/studio-wide.jpg`).

Grenze bleibt: **die Engine geht nicht zurück auf die Schrift.** Grauzone mit Owner-Frage: Zahlen,
die sich einmal aus Pixeln setzen (das Muster von `voidReveal`), auf Ink-Grund.

---

## Bauplan

| Welle | Was | Aufwand | Warum zuerst |
|---|---|---|---|
| **0 — Wahrheit** | Befunde 5, 10, 11, 12: Brief-Generator auf Wortgrenzen + `RANGES`; `build_jsonld.py` laufen lassen; `ai-note` wird Besuchertext; Koordinaten | **S**, ½ Tag | Vier falsche Aussagen, eine davon mit Preisschild. Kostet nichts und ist heute falsch. |
| **1 — Das Gate schärfen** | `isAccent()` auf Token-Liste; Canvas-Schleife auf alle Canvases | **S** | Ohne sie ist jede Farb-Freigabe der Wellen 2–4 blind. |
| **2 — Luft** | `--t-copy` (16,4 px) für 14 Selektoren, `max-width: 58ch`, Innenabstände eine Stufe | **M**, 1 Tag | Trifft „zu wenig Space" direkt und auf allen elf Seiten gleichzeitig. |
| **3 — Signatur** | Dither-Schwelle + Rampen-Endpunkt je Seite; Loch-Pass; Ziffern-Wasserzeichen im Ruhezustand | **M**, 1 Tag | Der sichtbarste Gewinn pro Zeile Code im ganzen Plan. |
| **4 — Vier Räume** | `data-svc`-Signal (Tür → Raum), Hero-Exponat-Slot, je Seite ein Signatur-Modul, Bandfolge variieren | **L**, 3–4 Tage | Die Klage, die am meisten Arbeit ist — und die einzige, die Struktur ändert. |
| **5 — Startseite** | Kapitelumbau, Tonplan, Zeitleiste, Quittung, Kontakt+Fuß | **L**, 2–3 Tage | Braucht die Entscheidungen aus §Owner. |
| **6 — Licht** | Gelb wird Fläche, Papier-Welle, `band--island` | **M**, 1 Tag | Hängt an Owner-Entscheidung 1. |
| **7 — DE** | siehe unten | **M–L**, ~3 Tage + Owner-Zeit | Größter Reichweiten-Hebel, aber erst wenn die Struktur steht — sonst wird zweimal übersetzt. |

Jede Welle durch dieselben Tore: `tools/accent_audit.sh` (beide Themes), `tools/sweep.sh`
(11 Seiten), `tools/check_links.py`, und bei allem, was den Hero berührt, eine LCP-Messung
vorher/nachher.

---

## Die deutsche Fassung

**Ist:** `lang="en"` auf 11 von 11 Seiten, 0× `hreflang`, kein `/de/`, keine Sprachlogik.
Inventar: **11.823 Wörter in HTML** (davon 2.307 rechtlich geprüfter Legal-Text, der nicht
übersetzt werden darf), **~1.980 Wörter in fünf JS-Dateien**, 929 in `llms.txt` — netto rund
**9.500 Wörter in ~1.000 Segmenten.**

Heute beantwortet die KI-Signatur der Seite deutsche Fragen englisch oder gar nicht: „Was kostet
das?" trifft den Schlüssel `kosten` nicht (Stamm `kostet`), die ⌘K-Palette findet zu „kontakt",
„preise", „leistungen" **null** Treffer — nur die vier Rechtsbegriffe tragen deutsche Stichwörter.

**Empfehlung: EN bleibt handgeschriebene Quelle, `/de/` wird erzeugt.** Ein `tools/build_de.py` im
Stil der vorhandenen Generatoren liest die EN-Seiten und ersetzt Segmente aus
`tools/i18n/de.json`; ein fehlendes Segment ist ein **Build-Fehler, kein stiller Zustand**.
JS-Strings wandern in `data.de.js` plus ein `UI`-Wörterbuch — die Skripte lesen `MCD.UI.*` und
müssen die Sprache nie kennen.

Die Alternativen, kurz: 22 handgeschriebene Dateien driften (die Legal-Shell im Generator hinkt
schon heute den ausgelieferten Seiten hinterher). Laufzeit-i18n in JS bricht das eigene Versprechen
„the text is always real DOM" und macht `hreflang` unmöglich.

**Erste drei Schritte:** (1) Owner entscheidet Sie/Du, KI/AI, Pfad, Schalter, Redirect.
(2) Werkzeug + `/de/index.html` als Musterseite durch alle Tore. (3) Transkreation mit Glossar,
DE-Rechtstexte extern beschaffen.

---

## Owner-Entscheidungen

1. **Gelb auf Papier.** Es gibt kein lesbares Gelb auf Papier, das nicht braun ist (Befund 2).
   *Empfehlung:* Gelb wird auf Papier **Fläche** (Marker hinter Ink-Schrift), nicht Schrift.
   *Alternative:* Papier-Akzent wird das gemochte Grün `#5c6b00` (5,26:1) oder Violett `#5B2EFF`
   (5,71:1) — dann ist Gelb auf Papier ganz weg.
2. **Farbe je Service-Seite.** Violett, Pink, Grün als Signale — „bunt ist erlaubt, aber nicht
   alles gleichzeitig". *Empfehlung:* ja, **eine** Farbe je Seite, nie als Rahmen. Ohne sie bleibt
   die Klage „alle gleich" zur Hälfte offen.
3. **Preisspannen öffentlich?** Website €8–25k · Web-App/interne Software €25–70k · AI-Tool
   €20–60k stehen heute im Brief-Generator und werden nur auf Nachfrage sichtbar.
   *Empfehlung:* in den Prozess-Schritt „A fixed quote". Es ist die meistgestellte Frage der Seite.
4. **Die Konsole zieht auf die AI-Seite** (als zweite Instanz, `api/ask.js` existiert) — oder
   bleibt exklusiv auf der Startseite? *Empfehlung:* zweite Instanz; die AI-Seite verlinkt heute
   auf die Startseite, um ihr eigenes Kernstück zu zeigen.
5. **Proof als eigenes Kapitel aufgeben** (Marken zu Studio, Zitat-Slots zu Work)?
   *Empfehlung:* ja, spart ~500 px und beseitigt die Dreifachnennung derselben Zahlen.
6. **Koordinaten im Hero:** auf Oberostendorf korrigieren, oder „Est. 2016 in München · now
   Oberostendorf"? Beide kosten eine Zeile.
7. **Zahlen aus Pixeln** (die Hero-Fakten setzen sich einmal aus Partikeln, dann echter Text) —
   Grauzone der Regel „die Engine verlässt die Schrift". *Empfehlung:* einmal probieren, nur auf
   Ink-Grund.
8. **DE:** Sie oder Du · KI oder AI in der Prosa · `/de/`-Pfad mit `x-default` = EN · Schalter
   neben dem Theme-Knopf · **kein** Auto-Redirect · `mccain-digital.de` kaufen (frei, ~10 €/Jahr,
   nicht über Vercel — Registrar nötig) · DE-Rechtstexte extern.

---

## Was ich nicht behaupte

Die zwei Linsen „Bilder" und „Mobil" sind zweimal am Sitzungslimit gestorben — ihre Fragen sind
teilweise von den anderen mitbeantwortet (Bild-Slots, 390-px-Dichtekarten), aber es gibt **keinen
eigenen Mobil-Befund**. Die offenen Audit-Punkte LM-5 bis LM-9 und UI-5 sind weiterhin ungeprüft.

Und alles außerhalb der zwölf nachgemessenen Punkte ist die Aussage **einer** Linse. Die
Fehlalarm-Quote solcher Runden liegt erfahrungsgemäß bei 30–60 %. Vor jedem Bauschritt gilt: das
betroffene Detail selbst nachmessen.
