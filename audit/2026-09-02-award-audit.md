# Award-Audit — Stand 2. September 2026

Befund gegen `df6efbd` (der Merger-Stand, wie er auf `mccain-digital.vercel.app` liegt).
Der Audit war **strikt read-only** — an der Seite wurde nichts geändert.

**Die gerenderte Fassung:** [`2026-09-02-award-audit.html`](2026-09-02-award-audit.html) — im Browser
öffnen, sie trägt das System der Seite selbst. Online als Artifact:
<https://claude.ai/code/artifact/d5abbea2-b5b3-46de-a6f8-d9586d98dd84>
**Die Rohdaten:** [`2026-09-02-findings.json`](2026-09-02-findings.json) — alle 68 Funde mit Beleg,
Vorschlag, Aufwand und Prüfstatus. Maschinenlesbar, für die Abarbeitung auf dem PC gedacht.

---

## Methode und wie belastbar das ist

Zweistufig angelegt: acht Befund-Linsen gehen mit einem echten Browser durch die laufende Seite
(Layout auf 1512/1920/1090/390, Motion, Mikrointeraktion, Informationsarchitektur, Award-Benchmark,
Seiten-Konsistenz, A11y, Performance), danach vier Skeptiker, die jeden Fund widerlegen sollen.

- **Befund-Stufe: vollständig gelaufen.** 68 Funde, 1,16 Mio Token, 545 Werkzeugaufrufe.
- **Skeptiker-Stufe: alle vier am Session-Limit gescheitert.**

Deshalb sind **11 Funde von Hand nachgemessen** (die drei P0 und die schwersten P1), **1 davon
widerlegt**. Die restlichen **57 sind ungeprüft** — jeder trägt einen Beleg, aber keiner wurde
gegengeprüft. Erfahrungswert bei dieser Methode: **30–60 % Fehlalarm**. Nicht an ungeprüften Funden
bauen, ohne sie vorher selbst anzusehen.

| | |
|---|---|
| Funde gesamt | 68 |
| P0 | 3 — alle nachgemessen |
| P1 | 17 — 4 nachgemessen |
| P2 / P3 | 29 / 19 |
| nachgemessen | 11 (davon 1 widerlegt) |
| ungeprüft | 57 |

---

## Die drei P0 — reproduziert, mit Ursache

### 1. Der Haupt-CTA verschwindet beim Hover vollständig

„Start a project" in der Leiste: Maus drauf → kein Text, kein Hintergrund, nichts.

**Ursache**, gefunden in `pixel-engine.js:928-930`:

```js
var bg = cs.backgroundColor;
var hasBg = bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent";
```

Der Button trägt keinen `background-color`, sondern einen `repeating-linear-gradient(112deg, …)`
— den wandernden Rand. `backgroundColor` ist damit `rgba(0,0,0,0)`, `hasBg` wird `false`, und die
helle Pille wird nie ins Offscreen-Canvas gemalt. Gesampelt wird nur die Beschriftung in
`color: #0b0b0c` — eine Farbe, die für den hellen Verlauf entworfen wurde. `.pxbtn.px-active`
schaltet den echten Button auf transparent, das Canvas zeichnet fast schwarze Pixel auf fast
schwarzen Grund. Ergebnis: unsichtbar.

Gemessen im Hover-Zustand: `matchesHover: true`, `color: rgba(0,0,0,0)`, Canvas 265×166 vorhanden
und mit `opacity: 1` — es malt, nur eben Schwarz auf Schwarz.

**Betroffen ist genau ein Button** — der wichtigste. `See the work` daneben hat ebenfalls keinen
`background-color`, aber eine helle Schrift (`#f2f2ef`) und bleibt deshalb sichtbar.

**Fix:** in `build()` zusätzlich `cs.backgroundImage` auswerten und den Verlauf ins Offscreen malen
(die Stops stehen als Token in `v3.css`, sind also bekannt) — oder Gradient-Buttons vom Effekt
ausnehmen und nativ hovern lassen.

### 2. Der Index-Footer bricht unter 760 px

Bei 390 px gemessen:

```
.foot-top  grid-template-columns: "0px 318px"
.foot-say  width 0, height 359
```

Die CTA-Spalte kollabiert auf null Breite, der Text „One mail is enough…" läuft über die
Linkspalten. `.foot-top` steht in `v3.css:4869` **top-level**, ohne Media-Query — die
Mobile-Query stellt nur `.foot-cols` um. Betrifft nur `index.html`; die Unterseiten haben den
schmalen Footer (`foot-in`) und sind sauber.

### 3. Der Kauf-Funnel endet im Altdesign

Jeder „Start a project"-Klick von einer Unterseite, alle Legal-Footer, die 404 und das
⌘K-Menü zeigen auf `contact.html` — gerasterte Pixel-Überschrift, alte Statusleiste, direkt neben
dem neuen Index-Look. Der Punkt der höchsten Kaufabsicht ist der einzige mit sichtbarem
Systembruch.

---

## Ein Regressionsfehler aus der System-Übernahme

`--d-micro` und `--d-ui` sind **nirgends in `v3.css` definiert** — sie existieren nur in
`preview/refresh.html:85-86` und wurden beim Übernehmen des Refresh ins System vergessen.
`v3.css` benutzt sie fünfmal (Zeilen 4836, 4861, 4908, 4938, 5012), jeweils in der
`transition`-Kurzform:

```css
transition: transform var(--d-micro) var(--e-out)
```

Ein ungültiges `var()` macht die ganze Deklaration ungültig; die Dauer fällt auf `0s`. Diese
fünf Übergänge **springen**, statt zu laufen. Fix: zwei Zeilen in `:root` (`--d-micro: .16s`,
`--d-ui: .22s` — die Werte aus dem Entwurf).

Nebenbei: `--wave-stops-quiet` ist definiert und wird nirgends referenziert — toter Code.

---

## Widerlegt

**Die gemeldete doppelte Font-Ladung (94 KB) ist ein Artefakt des Dev-Servers.** `prodserve.py --dev`
sendet `no-store`, deshalb lädt `embedFont()` in `common.js:32` die Datei ein zweites Mal über das
Netz. Gegen Produktion gemessen: zweiter Fetch `transferSize: 0`, Dauer 1 ms — der HTTP-Cache
liefert ihn, `vercel.json` setzt `max-age=31536000, immutable` für woff2. Kein Problem.

Merke für künftige Perf-Messungen: **Netzwerk-Befunde gegen Produktion messen, nicht gegen `--dev`.**

---

## Was fehlt — Module und Sektionen

Unabhängig davon, dass Texte und Bilder bewusst Platzhalter sind. Es geht um **Strukturlücken**.

**Drei fertige Module liegen exklusiv auf der alten `contact.html`** und sind von der Startseite aus
unerreichbar:

1. **Der 4-Schritte-Prozess** — „(02) — What happens next": kostenlose Ersteinschätzung → Gespräch
   30–45 min → Fixquote in 48 h → Klickbares in Woche eins. Die Startseite hat **kein**
   Prozess-Modul. HANDOFF nennt die Lücke selbst.
2. **Die Anti-Fit-Liste** — „(03) — Being straight about it" mit Scale/Price/Presence. Auf der
   Startseite nur über die AI-Konsole erreichbar (`data.js:125`), also nur für den, der aktiv
   fragt. Die ⌘K-Beschreibung von „Straight answers" **verspricht** den Inhalt bereits.
3. **Der Service-Router** („Not sure which one you need?").

Alle drei Texte existieren — das ist **Spiegeln, kein Erfinden**.

**Strukturell fehlt außerdem die Work-Detailform.** Drei von vier Work-Karten enden auf `#contact`
(„Want one like it →", „Placeholder →"). HANDOFF plant zwei Kundenfälle und drei freigegebene
Zitate — es gibt aber keine Seitenform, in die ein Fall einziehen könnte. Die Schablone
(`work/<slug>.html` im System der Service-Seiten) gehört jetzt festgelegt, nicht erst wenn der
Content freigegeben ist.

**Die Kontaktseite ist der Auftrag des Owners.** Beides bauen: der `#contact`-Anker auf der
Startseite bleibt der Schnellweg (Formular + Mail), und `contact.html` wird im neuen System
neu aufgebaut — `hero--stage`-Kopf wie `services/ai-tools.html` — und nimmt die drei Module oben
auf.

---

## Award-Einschätzung

Nach Awwwards-Gewichtung (Design 40 %, Usability 30 %, Creativity 20 %, Content 10 %):
**Design 8 · Usability 8 · Creativity 7,5 · Content 6,5 → gewichtet ~7,7.** Shortlist-fähig, kein
sicherer Gewinn. **Das ist eine Einschätzung der Audit-Linse, keine Messung.**

Die drei stärksten Hebel laut Linse, alle billig:

- **`contact.html` und `404.html` typografisch ins System ziehen.** Der Juror landet per Haupt-CTA
  genau dort.
- **`voidReveal` genau einmal einsetzen.** Der Set-Piece-Effekt (schwarzes Loch legt echten
  DOM-Text als Pixelfeld frei) liegt fertig in `pixel-engine.js:1630`, ist als „the AI-section
  signature" kommentiert, exportiert — und wird **nirgends aufgerufen**. Der Scroll flacht nach
  (04) ab, weil es keinen zweiten typografischen Höhepunkt gibt.
- **Seiten-Übergänge deklarativ:** `@view-transition { navigation: auto }` plus eine kurze
  Fade-Regel hinter `prefers-reduced-motion`. Null JS, null Dependencies, kein Lighthouse-Risiko.

---

## Reihenfolge für die nächste Sitzung

Nach Hebelwirkung pro Aufwand, nicht nach Linse.

1. **CTA-Hover reparieren** — `pixel-engine.js:928`, Gradient-Hintergrund mitlesen. (P0)
2. **`--d-micro` / `--d-ui` in `:root` nachziehen** — zwei Zeilen, behebt fünf tote Übergänge.
3. **Index-Footer unter 760 px** — `.foot-top` braucht eine Mobile-Regel. (P0)
4. **Kontaktseite im neuen System bauen** — plus die drei Module übernehmen. (P0, Owner-Auftrag)
5. **Prozess + Anti-Fit auf die Startseite spiegeln** — Anti-Fit als siebter FAQ-Tab, Text steht
   wortgleich in `data.js:125`.
6. **Touch-Ziele und Eingabefeld-Größe** — 50 Flächen unter 44 px bei 390 px; vier von fünf Inputs
   auf 12,8 px, unter 16 px zoomt iOS Safari beim Fokus.
7. **`404.html` + `contact.html` typografisch ins System.** Danach ist `data-pixel` repo-weit 0 und
   `PixelFX.headline` kann mit `voidReveal` zusammen raus.
8. **Zweiter typografischer Höhepunkt** — `voidReveal` einmal einsetzen.
9. **View Transitions.**
10. **Erst dann die Skeptiker-Runde auf die restlichen 57 Funde** — bevor daran gebaut wird.

---

## Wie die Rohdaten zu lesen sind

`2026-09-02-findings.json`, ein Array aus 68 Objekten:

| Feld | Bedeutung |
|---|---|
| `id` | Linsen-Präfix + Nummer (`LD` Layout Desktop, `LM` Layout Mobil, `FX` Motion, `UI` Mikrointeraktion, `IA` Architektur, `AW` Award, `SC` Konsistenz, `AP` A11y/Perf) |
| `severity` | `P0` schadet sichtbar · `P1` klarer Gewinn, award-relevant · `P2` Politur · `P3` Idee |
| `effort` | `S` unter einer Stunde · `M` halber Tag · `L` mehr |
| `evidence` | Screenshot-Name, Messwert oder Datei:Zeile — die Grundlage des Fundes |
| `suggestion` | konkreter, vanilla-tauglicher Vorschlag |
| `status` | `CONFIRMED` von Hand nachgemessen · `REFUTED` widerlegt · `OFFEN` ungeprüft |

Die referenzierten Screenshots liegen **nicht** im Repo — sie standen im Scratchpad der
Audit-Sitzung und sind mit ihr weg. Die Messwerte in `evidence` stehen für sich.
