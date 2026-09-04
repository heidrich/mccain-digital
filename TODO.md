# TODO — Stand 4. September 2026 (abends)

Abgeleitet aus dem Award-Audit vom 2.9. (`audit/2026-09-02-findings.json`, 68 Funde) plus den
offenen Owner-Entscheidungen aus `HANDOFF.md`. Gegen `4b91833` geschrieben.

**Die Rohdaten bleiben die Quelle.** Diese Datei ist der Arbeitszettel: was noch offen ist, in
welcher Reihenfolge, mit heute nachgeprüften Zeilennummern. Beleg, Vorschlag und Aufwand zu jedem
Fund stehen in der JSON unter seiner `id`.

## Wie belastbar das ist

Die Skeptiker-Stufe des Audits ist nie gelaufen — alle vier Prüfer sind am Session-Limit
gescheitert. **Von den ursprünglich 58 Punkten sind 38 offen** — die Wellen vom 4.9. haben zwanzig geschlossen (einer davon als Fehlalarm).
Von den 51 ist keiner gegengeprüft.
Erfahrungswert dieser Methode: 30–60 % Fehlalarm. Die schwersten Funde (P0, die härtesten P1) sind
nachgemessen; ab P2 gilt: **vor dem Bauen selbst nachsehen.**

Das `status`-Feld in der JSON ist seit dem Audit **nicht** nachgeführt. Es sagt zu elf Funden noch
„offen", die längst erledigt sind — die Wahrheit steht unten und ist im Code geprüft.

---

## Erledigt seit dem Audit (im Code verifiziert, 4.9.)

| Fund | Was | Beleg heute |
|---|---|---|
| UI-1 / FX-2 (P0/P1) | CTA-Hover war unsichtbar — Gradient wird jetzt gelesen | `pixel-engine.js:332` |
| FX-1 (P1) | `--d-micro` / `--d-ui` fehlten, 5 Übergänge liefen auf `0s` | `v3.css:77-78` |
| LM-1 (P0) | Index-Footer brach unter 760 px | `v3.css:5251` |
| UI-4 / AW-5 (P2) | Default-Scrollbars in Menü, Konsole und Dock | `v3.css:1489-1503` |
| AP-2 (P2) | **Widerlegt** — die doppelte Font-Ladung war ein `--dev`-Artefakt | — |

Merke daraus: **Netzwerk-Befunde gegen Produktion messen, nicht gegen `prodserve.py --dev`.**

### Welle vom 4.9. (abends) — der P0-Block, im Browser nachgemessen

| Fund | Was | Messung |
|---|---|---|
| IA-1 (P0) | `contact.html` im neuen System: `hero--stage guides` + `data-field`, echte Schrift statt Raster | Bühne bekommt `hs has-field go`, H1 bei Deckkraft 1 |
| SC-2 (P1) | die drei Systemabstände derselben Seite | `data-pixel` dort 0, `hero-side` als linierte Zahlentabelle |
| SC-3 (P1) | `404.html` auf Systemklassen | 4 Inline-Styles raus, jetzt 0; H1 als `data-words`, 4 Wörter sichtbar |
| SC-4 (P1) | „Presence“ lief in seinen eigenen Text | Glyphen 108 px in 119-px-Spalte, 16 px Luft |
| AW-4 (P1) | beide Seiten brachen die Typo an den emotionalsten Punkten | mit SC-2 + SC-3 zu |
| LM-2 (P1) | iOS-Zoom beim Fokus | alle Felder **und** `#consoleInput` auf 390 px: 16 px |
| UI-8 (P2) | Formular ohne Validierung | leer absenden markiert 3 Felder, Fokus aufs erste, Meldung |
| Owner 2 | Formulardaten | Feldsatz der alten Seite übernommen, Optionen auf die 4 aktuellen Leistungen |

Dazu: **beide Formulare senden jetzt wirklich.** Eine Mechanik in `common.js`, zwei Mounts —
Startseite 3 Felder, Kontaktseite 6, fehlende Felder gehen als „—“ mit. Erfolgs- und Fehlerpfad
mit abgefangenem `fetch` geprüft, ohne echte Anfrage an Web3Forms. Nebenbei: `--d-ui` war nach
dem Fix vom Vormittag ein totes Token und hat jetzt seinen Zweck; eine doppelt verschachtelte
`ai-word`-Span in `services/ai-tools.html` ist weg (animierte unendlich mit, ohne Glyphen zu malen).

**Das Kontrast-Audit misst wieder.** `tools/accent_audit.sh` fiel laut HANDOFF auf
`contact.html [dark]` immer mit „NOTHING MEASURED“ aus — Ursache waren die 4 `data-pixel`-Raster,
der teuerste Boot im Repo. Jetzt: `accent nodes 18, gradient text 2, failing 0`, alle 6 Seiten,
beide Themes, Exit 0. `data-pixel` ist auf den Live-Seiten repo-weit **0**.

### Zweite Welle vom 4.9. — die zwei Kaufpfad-Module gespiegelt

| Fund | Was | Messung |
|---|---|---|
| IA-2 (P1) | 4-Schritte-Prozess als Kapitel **(08)** auf der Startseite | 4 Schritte, alle erreichen Deckkraft 1 beim Scrollen; Leiste meldet „(08) What happens next“ |
| IA-3 (P1) | Anti-Fit als **siebter FAQ-Tab** | 7 Tabs, Antwort streamt vollständig durch (563 Zeichen), nennt Scale/Price/Presence |

Beide Texte sind aus `contact.html` **gespiegelt, nicht umgeschrieben** — zwei Orte, eine Zusage.
Die Kapitel-Umnummerierung kostete drei Stellen: das Label, den Kommentar und `CHAPTERS`; der
IntersectionObserver läuft über dieselbe Liste und findet den neuen Abschnitt von allein.

### Dritte Welle vom 4.9. — Touch-Ziele (LM-3)

Zwei Mechaniken, weil zwei Probleme. Wortzeichen, Theme-Knopf, Menü-Knopf und die zwei
Mail-Links stehen **allein** — ihre Trefferfläche wächst über `::before` auf 44 px, die Optik
bleibt. Das ist dieselbe Mechanik, mit der `.scard-link::after` aus einem 115×23-Link eine ganze
Karte macht, nicht eine neue. Die Konsolen-Chips und die Fußzeilen-Spalten stehen **in Gruppen** —
dort wäre eine unsichtbare Vergrößerung falsch, weil sie dem Nachbarn Tipps wegnimmt; die
wachsen echt. Gemessen: jede Fläche trifft sich selbst, jeder Nachbar behält seinen eigenen Tipp.

**`::before` und nicht `::after`, und das ist keine Vorliebe:** `.foot-bar a::after` malt die
goldene Unterstreichung jedes Fußzeilen-Links, und `.foot-bar>.logo::after { content: none }`
hält sie vom Wortzeichen fern. Ich hatte diese Zeile als toten Code entfernt — die Suche nach
`.logo::after` findet nur die Unterdrückung und nichts, was sie unterdrückt. Sie unterdrückt eine
Regel, die „logo" gar nicht im Selektor hat. Wiederhergestellt.

---

## P0 — zu (4.9. abends)

### 1. IA-1 · Der Kauf-Funnel endete im Altdesign

`contact.html` läuft im neuen System: `hero--stage guides` + `data-field`, echte Schrift statt
Raster, die Zahlen in der linierten Tabelle, `stage-meta`-Streifen am Fuß der Bühne. Und das
Formular sendet — mit dem Feldsatz der alten Seite.

**Owner-Entscheidung 2 war kein Blocker.** Die Daten lagen im Repo: `old/upload/contact.html` ist
die Fassung, die auf `mccain-digital.com` steht, und `old/upload/contact.js` trägt die komplette
Web3Forms-Mechanik. Übernommen statt nachgebaut.

**Die eine Ermessensentscheidung, die ich getroffen habe:** die alte Seite bot **sieben**
Projekttypen an, darunter Mobile App und Design & Brand. Die Seite verkauft heute vier Leistungen
(`data.js` ist die Quelle). Der **Feldsatz** ist unverändert übernommen, die **Optionen** spiegeln
das aktuelle Angebot: AI tools · Web apps · Websites · Software for companies · Not sure yet.
Budget und Zeitrahmen stehen wortgleich wie vorher. **Eine Zeile genügt, wenn die alten sieben
zurück sollen.**

**Die drei Module liegen weiterhin nur auf `contact.html`.** Sie auf die Startseite zu spiegeln ist
IA-2 und IA-3, nicht Teil dieser Welle:

| Modul | wo |
|---|---|
| 4-Schritte-Prozess „(02) — What happens next" | `contact.html` |
| Anti-Fit-Liste „(03) — Being straight about it" | `contact.html` |
| Service-Router „Not sure which one it is?" | `contact.html` |

---

## P1 — 3 offen

### Hingen an P0 — alle vier zu (4.9. abends)

SC-2, SC-4, AW-4 und SC-3 sind erledigt und gemessen — siehe die Tabelle oben.

`data-pixel` steht damit auf den Live-Seiten bei **0** (der Rest liegt in `old/` und `preview/`).
**Die Aufräum-Falle von Audit-Punkt 7 ist entschärft, aber andersherum als gedacht:** Punkt 7 will
`PixelFX.headline` und `voidReveal` zusammen entsorgen, sobald `data-pixel` bei 0 ist. Seit AW-2
wird `voidReveal` **aufgerufen** — es darf also NICHT mit weg. `headline` allein ist tot, sobald
niemand mehr `data-pixel` schreibt; `voidReveal` ist es nicht.

### Kaufpfad-Struktur

- ~~**IA-2**~~ — erledigt: der 4-Schritte-Prozess ist ein eigenes Kapitel **(08) What happens next**
  auf der Startseite, zwischen Proof und Formular. Wortgleich gespiegelt, nicht neu geschrieben.
  Kontakt ist dadurch **(09)**; die Kapitelleiste (`CHAPTERS` in `index.html`) zieht mit.
- ~~**IA-3**~~ — erledigt: die Anti-Fit-Liste ist der **siebte FAQ-Tab** („Is there a reason NOT to
  hire you?“). Damit trifft das ⌘K-Versprechen aus `data.js` („why you might not want us“) endlich
  auf einen Inhalt, der es einlöst — es zeigt auf `index.html#faq`, und dort stand die Liste nicht.
- **IA-4** (M) — keine Work-Detailform. 3 von 4 Work-Karten enden auf `#contact`; für die zwei
  geplanten Kundenfälle gibt es keine Seitenform. Die Schablone (`work/<slug>.html` im System der
  Service-Seiten) gehört jetzt festgelegt, nicht erst wenn der Content freigegeben ist.

### Mobil (alle drei nachgemessen)

- ~~**LM-2**~~ — erledigt: alle Felder und `#consoleInput` auf 16 px, unter 860 px bzw. `pointer: coarse`.
- ~~**LM-3**~~ — erledigt: von **62 Flächen unter 44 px auf 8**, und die 8 sind 44 px **hoch**
  (Fußzeilen-Spaltenlinks, 31–101 px breit). Die Audit-Zahl „~50" war zum größten Teil Fehlalarm:
  28 davon sind Karten-Links mit `tabindex="-1"`, deren `::after` die ganze 335×567-Karte
  abdeckt, 13 sind Fließtext-Links (von WCAG 2.5.8 ausdrücklich ausgenommen) und 10 sind
  fokussierbare Nicht-Bedienelemente. Echt waren zehn.
  **Der benannte Rest:** volle 44×44 bräuchte den Anker auf Spaltenbreite — dann liefe die
  Hover-Unterstreichung (`left:0;right:0`) über die ganze Spalte statt unter dem Wort. Die Reihen
  sind 44 px hoch und 26 px von der Nachbarspalte entfernt, bestehen AA (24×24) also deutlich;
  die Breite verfehlt AAA. Bewusst so gelassen.
- ~~**LM-4**~~ — erledigt: unter 640 px sind Vorschau und Tastatur-Hinweisleiste ausgeblendet.
  Die Liste geht damit von **293 px auf 649 px** (33 % → 74 % ihrer Höhe), 12 statt 5,5 von 16
  Einträgen sichtbar. 640 und nicht die bestehenden 800: ein schmales Desktop-Fenster hat eine
  Maus und behält die Vorschau. `menu.js` streamt zusätzlich nicht mehr in die versteckte Fläche.

### Award-Hebel (alle billig)

- ~~**AW-2**~~ — erledigt: `voidReveal` läuft **einmal**, auf der Studio-Leitzeile in (05).
  **Nicht dort, wo das Audit es vorschlug.** Seine beiden Kandidaten — die (03)-Billboard-Zeile und
  der Fußzeilen-Satz — liegen auf `--bg`, und das ist im hellen Theme **Papier**; ein schwarzer
  Kern auf Papier ist ein Fleck, kein Loch. (05) ist `band--ink`, gemessen `rgb(11,11,12)` in
  **beiden** Themes. Dafür wurde die Scheibe gezeichnet.
  **Der CSS-Vertrag fehlte:** `.vr-txt` und `.vr-canvas` standen nirgends in `v3.css` — nur im
  Mockup. Ohne sie säße das Canvas im Fluss statt über der Zeile und der echte Text bliebe
  sichtbar: der Effekt scheitert nicht laut, er zeichnet doppelt. Aus `old/mockup/index.html`
  übernommen, nicht neu erfunden.
  Gemessen: `vr-armed` → `vr-playing` → `vr-done`, Text kommt zurück, Box unverändert (kein
  Layout-Sprung). Bei `prefers-reduced-motion` wird gar nichts aufgebaut — kein Canvas, keine
  Klasse, Text schlicht da.
- ~~**AW-3**~~ — erledigt: `@view-transition { navigation: auto }` plus eine 0,26-s-Blende auf
  `::view-transition-old/new(root)`. Nur die Wurzel: benannte Übergänge auf Nav oder Wortzeichen
  würden den Browser bitten, Elemente **zwischen Dokumenten** zu morphen, und jedes davon ist eine
  Gelegenheit für eine verrutschte Box. Bei reduzierter Bewegung `navigation: none` statt
  `animation: none` — die Animation abschalten lässt den Browser weiter eine Transition fahren,
  nur ohne Antrieb. Belegt per `pageswap`: normal ein echtes `ViewTransition`-Objekt, unter
  reduzierter Bewegung `false`.
- **SC-1** (M) — zwei Footer-Architekturen: `index` Mega-Footer, die 9 anderen Seiten schmal

### Rest

- ~~**UI-2**~~ — erledigt: `?ask=` wird jetzt **vor** `setMode` gelesen, und mit einer Frage in
  der Hand wird gar keine Begrüßung gestreamt. Vorher brach `answer()` sie nach dem ersten
  Zeichen ab und liess ein einzelnes „A" über jeder übergebenen Konversation stehen. Zweiter
  Fix in `data.js`: `stream()`s Abbruch gibt jetzt die `caret`-Klasse zurück — sonst blinkt ein
  Cursor bis zum Sessionende auf einer Zeile, die nie fertig wird.
- **AP-1** (M) — **Owner-Entscheidung, kein Fehler.** Gemessen (zwei saubere Läufe): FCP ~110 ms,
  **LCP 824 / 836 ms** auf `H1.display`, 8 Wörter, das letzte mit `--wi=7` also 336 ms Versatz plus
  720 ms Transform.
  **Zwei Korrekturen am Audit-Befund:** (1) Der Vorschlag „Opacity vom Wort-Versatz entkoppeln"
  kann nichts bringen — `.w` hat `overflow: clip`, ein Wort auf `translateY(115%)` ist unsichtbar
  unabhängig von seiner Deckkraft. Das Tor ist der **Transform**. (2) Der Kommentar über der Regel
  in `v3.css` sagt, der Kopf laufe **absichtlich** „inside the 800-1600ms band, with inner beats".
  Der gemessene LCP ist der Anfang genau dieses Bandes.
  **Also eine Abwägung, keine Reparatur:** Kennzahl gegen Auftritt. Hebel wären die Transform-Dauer
  (0,72 s) und der Versatz (48 ms/Wort). Nicht still nachgezogen — sag, ob dir der PageSpeed-Wert
  den kürzeren Auftritt wert ist.

  **Gemessen (je 3 saubere Läufe, Median):**

  | Variante | Transform | Versatz/Wort | LCP | Sequenz endet |
  |---|---|---|---|---|
  | **A — Ist** | 0,72 s | 48 ms | **844 ms** | 1056 ms |
  | **B** | 0,50 s | 28 ms | **640 ms** (−24 %) | 696 ms |
  | **C** | 0,38 s | 20 ms | **556 ms** (−34 %) | 520 ms |

  **Beide verlassen das dokumentierte Band** („inside the 800-1600ms band"): B endet bei 696 ms,
  C bei 520 ms. B behält mit 196 ms Gesamtversatz eine deutlich lesbare Staffelung; C liegt mit
  140 ms an der Schwelle, ab der ein Stagger nicht mehr als Choreografie liest, sondern als eine
  einzige Bewegung. **Meine Empfehlung: B** — der größere Teil des Gewinns, und der Auftritt
  bleibt einer. Nicht eingebaut; sag ein Wort, dann ist es zwei Zeilen.

---

## P2 — 20 offen (Politur, Rest ungeprüft)

**Diese Liste ist nicht nachgemessen.** Je Punkt vor dem Bauen selbst nachsehen.

- ~~**UI-8**~~ — erledigt: `required`, `aria-invalid`, Fehlerzeile je Feld, Fokus aufs erste Fehlerfeld,
  Erfolgs- und Fehlerzustand — und das Formular sendet.
- ~~**UI-7 / AP-3**~~ — erledigt: Skip-Link auf **allen 11 Seiten**, unsichtbar bis er Fokus hat.
  Der Sprungpunkt (`main#top`) hat `tabindex="-1"` bekommen — **ohne das scrollt der Browser nur**
  **und lässt den Fokus auf dem Link**, der nächste Tab läuft zurück in den Header, und der Link
  sieht funktionierend aus, während er nichts tut. Gemessen: erster Tab trifft ihn (143×48, also
  auch über 44 px), Enter setzt den Fokus auf `MAIN#top`, der nächste Tab landet **im Inhalt**.
- **LM-8** (M) — hover-gebundene Inhalte auf Touch unerreichbar, obwohl die Copy zum Hovern auffordert
- **LM-5** (M) — Hero-Lesefolge auf 390: die drei Fakten stehen **zwischen** Intro und H1
- **LD-4 / LD-5** (M) — Score-Band: rechte Hälfte auf beiden Breiten leer; im Light-Theme
  verschwindet es als Band ganz
- ~~**FX-3**~~ — erledigt: gemessen liefen bei `prefers-reduced-motion: reduce` **sieben**
  Animationen weiter, alle unendlich (Verfügbarkeits-Punkt, Scroll-Hinweis, Wellenschrift auf der
  Studio-Zeile und ihren vier Zahlen). Jetzt null; im Normalzustand laufen weiter 30. Nur die
  Animation fällt weg — Farbe, Linie und Verlauf bleiben.
  **Zwei Fallen dabei:** die Selektoren kamen aus dem Browser, nicht aus einem Grep (`animation:
  wave-text` zeigte auf die Nav, die längst gekapselt ist — die echten Treffer waren
  `[data-wavetext] .st-lead em` und `.st-fact b`). Und der Block steht am **Dateiende**: weiter
  oben verliert er bei gleicher Spezifität an der Quellreihenfolge und tut nichts, was er beim
  ersten Versuch auch tat.
- **FX-4** (M) — die ersten 3 Sekunden zeigen kein einziges Pixel-Moment
- **AW-7** (M) — 90-Sekunden-Problem: Brief-Tab, Palette-Ask, Favicon-Dissolve, Pac-Man und die 404
  sind die besten Momente der Seite und alle versteckt
- **AW-8** (L) — Kaufpfad-Module: kein Preisrahmen, keine interne Referenzstrecke
- ~~**AP-4**~~ — erledigt, und der Fund war größer als gemeldet. Über CDP mit echtem
  `forced-colors: active` gemessen (die agent-browser-CLI kann das nicht, `Emulation.setEmulatedMedia`
  schon): die zwei Formularfelder und die Paletten-Suchzeile schalten `outline: none` ab und ersetzen
  ihn durch einen inset-`box-shadow` — **und box-shadow wird in Windows-Kontrastmodus nicht gedimmt,
  sondern fallen gelassen.** Gemessen vorher `outline-style none · box-shadow none` = **gar kein**
  **Fokus-Indikator**; jetzt `outline-style solid, 2px` in `Highlight`. Im Normalzustand unverändert.
  **Beim Messen aufgefallen, nicht im Audit:** dieselbe Mechanik trägt die Pillen — ihr Rahmen *ist*
  der inset-Schatten, ihr Gewählt-Zustand *ist* die Akzentfüllung. Gemessen lasen beide Zustände
  identisch: weiße Schrift, kein Rahmen, Hintergrund auf Canvas gezwungen — die Gruppe war weder
  als Bedienelement noch in ihrer Auswahl erkennbar. Jetzt: ungewählt 1px `CanvasText`, gewählt
  `Highlight`-Füllung mit `HighlightText`. **Systemfarben überleben die Zwangsfärbung** — gemessen,
  kein `forced-color-adjust` nötig. `outline` statt `border`: ein Rahmen legte 2 px je Seite drauf und
  stritte mit der 44-px-Touch-Regel zweihundert Zeilen weiter oben.
  **`prefers-contrast` bleibt offen und absichtlich:** der Fund nennt es im Titel, belegt aber nur den
  Fokus-Indikator. Ohne gemessenen Mangel dort etwas zu bauen wäre geraten.
- ~~**AP-5**~~ — erledigt: `#cmInput` trägt `role="combobox"`, aber keinen Namen — ein Placeholder ist
  keiner. Jetzt `aria-label="Search the site, or ask a question"`. Gegenprobe war ein Rundumschlag:
  **jedes** Formularelement auf Start- und Kontaktseite auf einen Namen geprüft (18 Stück, inklusive
  Honigtopf und aller 13 Pillen) — die Paletten-Zeile war die einzige ohne.
- ~~**UI-6**~~ — **Fehlalarm, nichts zu tun.** Der Fund sagt, die Service-Karten sähen klickbar aus,
  seien es aber nicht; gemessen wurde `cursor: auto` am `<article>`. Das stimmt und ist belanglos:
  `.scard-link::after` steht auf `inset: 0` über der ganzen Karte. Trefferprobe an drei Punkten je
  Karte (Mitte, oben rechts, unten links), alle vier Karten: **jeder Punkt trifft `A.scard-link`**,
  Cursor dort `pointer`. Die ganze Karte ist das Ziel — dieselbe Mechanik, die schon LM-3 entlastet hat.
- weiter: LD-1, LD-2, LD-3, LM-6, LM-7, FX-5, UI-3, UI-5, IA-5, IA-6, AW-6, SC-5

## P3 — 15 offen (Ideen)

- **FX-8** (S) — `--wave-stops-quiet` ist toter Code, steht heute noch in `v3.css`
- **FX-7** (M) — Timing-System nur dem Namen nach: 25 Literal-Durations
- **FX-6** (S) — Marquee friert beim Verlassen des Viewports mit vollem Skew ein
- **UI-9** (S) — ⌘K kennt keine deutschen Suchbegriffe („kontakt" → 0 Treffer)
- ~~**AP-6**~~ — erledigt: die Beschriftung des Theme-Knopfs nennt jetzt das Ziel
  („Switch to light mode" / „Switch to dark mode") statt in beiden Richtungen dasselbe zu sagen.
  Die neutrale Beschriftung bleibt im Markup — sie ist, was ein Besucher ohne JS bekommt, und
  sie stimmt in beiden Zuständen. Gemessen: Beschriftung folgt dem Theme in beide Richtungen.
- weiter: LD-6, LD-7, LM-9, UI-10, IA-7, IA-8, IA-9, AW-9, AW-10, AW-11, AP-7
- **keine Aufgaben:** AW-1 (Juror-Note), SC-6 (Positiv-Befund: keine Token-Drift), LM-10 (verifiziert, keine Aktion)

---

## Owner-Entscheidungen — blockieren Arbeit

1. **Das Braun ist nicht überall weg.** Auf Papier tönt `legibleStops` die Welle so weit herunter,
   dass ihr gelbes Ende als Senf landet — „Map where **AI** actually pays off" steht dort goldbraun.
   Die Ziffern sind erledigt, der Rest ist eine Systementscheidung: entweder das warme Ende der
   Welle auf Papier neutralisieren, **oder** dort eine Tinten-Basis mit Farbschimmer fahren (das
   Gegenstück zur Weiß-Basis in der Nav).
2. **Die Formulardaten.** Owner: „das sind die gleichen Daten wie beim Kontaktformular auf
   mccain-digital.com". Die alte Seite muss dafür abgeglichen werden. **Hängt vor P0.**

## Meta

**Punkt 10 des Audits steht aus: die Skeptiker-Runde auf die 54 ungeprüften Funde**, bevor daran
gebaut wird. Die P0/P1-Reihe ist davon kaum betroffen — die schwersten sind nachgemessen.

**Nicht verwechseln:** `tools/accent_audit.sh` fällt unter Last an genau einer Stelle aus —
`contact.html [dark]`, mit `accent nodes 0` und „NOTHING MEASURED", **nie** mit einem Kontrast-Fund.
Das ist die Seite mit den 4 verbliebenen `data-pixel`-Rastern, dem teuersten Boot im Repo. Ein FAIL
mit „NOTHING MEASURED" ist **kein** Kontrast-Fund — erst nachsehen, welche Zeile es ist.
Verschwindet vermutlich mit P0.

**Die Screenshots aus dem Audit gibt es nicht mehr** — sie lagen im Scratchpad der Audit-Sitzung.
Die Messwerte in `evidence` stehen für sich.
