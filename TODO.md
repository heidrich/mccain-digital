# TODO — Stand 4. September 2026 (abends)

Abgeleitet aus dem Award-Audit vom 2.9. (`audit/2026-09-02-findings.json`, 68 Funde) plus den
offenen Owner-Entscheidungen aus `HANDOFF.md`. Gegen `4b91833` geschrieben.

**Die Rohdaten bleiben die Quelle.** Diese Datei ist der Arbeitszettel: was noch offen ist, in
welcher Reihenfolge, mit heute nachgeprüften Zeilennummern. Beleg, Vorschlag und Aufwand zu jedem
Fund stehen in der JSON unter seiner `id`.

## Wie belastbar das ist

Die Skeptiker-Stufe des Audits ist nie gelaufen — alle vier Prüfer sind am Session-Limit
gescheitert. **Von den ursprünglich 58 Punkten sind 48 offen** — die drei Wellen vom 4.9. haben zehn geschlossen.
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

## P1 — 7 offen

### Hingen an P0 — alle vier zu (4.9. abends)

SC-2, SC-4, AW-4 und SC-3 sind erledigt und gemessen — siehe die Tabelle oben.

`data-pixel` steht damit auf den Live-Seiten bei **0** (der Rest liegt in `old/` und `preview/`).
**Die Aufräum-Falle bleibt offen:** Audit-Punkt 7 will `PixelFX.headline` und `voidReveal`
zusammen entsorgen, sobald das erreicht ist — aber AW-2 muss `voidReveal` erst noch einsetzen.
**Nicht löschen vor AW-2.**

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
- **LM-4** (M) — Command-Menü auf 390: die Hover-Vorschau frisst das halbe Panel, die Nav-Liste zeigt ~35 %

### Award-Hebel (alle billig)

- **AW-2** (S) — **zweiter typografischer Höhepunkt fehlt.** `voidReveal` liegt fertig in
  `pixel-engine.js:1847` (Export `:3061`), im Kommentar selbst „the AI-section signature" — und wird
  **nirgends aufgerufen** (heute geprüft: 0 Verwendungen außerhalb der Engine). Genau **einmal**
  einsetzen, hinten: Billboard-Zeile der (03)-Sektion oder das Footer-Statement. Auslösung per
  IntersectionObserver nach dem Muster von `bootPixels` in `common.js`, hinter dem reduced-Guard.
  Nicht loopen — sonst konkurriert er mit dem Hero.
- **AW-3** (S) — jede interne Navigation ist ein harter Schnitt. `@view-transition { navigation: auto }`
  plus kurze Fade-Regel hinter `prefers-reduced-motion`. Null JS, null Dependencies.
- **SC-1** (M) — zwei Footer-Architekturen: `index` Mega-Footer, die 9 anderen Seiten schmal

### Rest

- **UI-2** (S) — verwaistes „A" mit hängendem Caret bei jedem Menü→Konsole-Handoff
- **AP-1** (M) — LCP-Element (Hero-H1) durch den Wort-Stagger um ~715 ms verzögert

---

## P2 — 25 offen (Politur, alle ungeprüft)

**Diese Liste ist nicht nachgemessen.** Je Punkt vor dem Bauen selbst nachsehen.

- ~~**UI-8**~~ — erledigt: `required`, `aria-invalid`, Fehlerzeile je Feld, Fokus aufs erste Fehlerfeld,
  Erfolgs- und Fehlerzustand — und das Formular sendet.
- **UI-7 / AP-3** (S) — kein Skip-Link (heute geprüft: repo-weit keiner). Doppelt gemeldet, ein Fix.
- **LM-8** (M) — hover-gebundene Inhalte auf Touch unerreichbar, obwohl die Copy zum Hovern auffordert
- **LM-5** (M) — Hero-Lesefolge auf 390: die drei Fakten stehen **zwischen** Intro und H1
- **LD-4 / LD-5** (M) — Score-Band: rechte Hälfte auf beiden Breiten leer; im Light-Theme
  verschwindet es als Band ganz
- **FX-3** (S) — Reduced-Motion-Lücken: Studio-Wavetext, Status-Punkt-Pulse, Scroll-Cue laufen trotzdem
- **FX-4** (M) — die ersten 3 Sekunden zeigen kein einziges Pixel-Moment
- **AW-7** (M) — 90-Sekunden-Problem: Brief-Tab, Palette-Ask, Favicon-Dissolve, Pac-Man und die 404
  sind die besten Momente der Seite und alle versteckt
- **AW-8** (L) — Kaufpfad-Module: kein Preisrahmen, keine interne Referenzstrecke
- weiter: LD-1, LD-2, LD-3, LM-6, LM-7, FX-5, UI-3, UI-5, UI-6, IA-5, IA-6, AW-6, SC-5, AP-4–AP-8

## P3 — 16 offen (Ideen)

- **FX-8** (S) — `--wave-stops-quiet` ist toter Code, steht heute noch in `v3.css`
- **FX-7** (M) — Timing-System nur dem Namen nach: 25 Literal-Durations
- **FX-6** (S) — Marquee friert beim Verlassen des Viewports mit vollem Skew ein
- **UI-9** (S) — ⌘K kennt keine deutschen Suchbegriffe („kontakt" → 0 Treffer)
- **AP-6** (S) — Theme-Toggle kommuniziert seinen Zustand nicht an Screenreader
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
