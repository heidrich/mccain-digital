# Uebergabe — Stand 13. September 2026

## ▶ STAND 13.9. 03:00 — zwei weitere Runden, alles live

`main` = `55d2a32`. Alle Tore grün, 21 Seiten, 0 Konsolenfehler.
**Google mobil und desktop je 82** (Desktop kam von 59 — größter Sprung des Tages).

### Was heute Nacht dazu kam

| Runde | Was | Gemessen |
| --- | --- | ---: |
| 5 | Notizen: kein 2-s-Layout-Poll, Start nach `load`+10 s, nur `(pointer:fine)` | Layoutlesungen 4.010 -> 1.823 |
| 6 | Hero-Rotation gezielt, Pixel-Engine deferred, Cookie auf 7 s | TBT 1.440 -> 1.185 ms, lange Aufgaben 18 -> 16 |

### DIE EINE ZAHL, DIE NOCH NICHT STIMMT, UND WARUM

Auf der Startseite mit Hero im Bild — **und genau so sieht Lighthouse die
Seite, es scrollt nie** — rendert React alle **6,5 Sekunden** den ganzen Baum
neu. Beweis: dieses eine Intervall blockiert und neu gemessen:

| | mit Rotation | ohne |
| --- | ---: | ---: |
| längste Ruhe | 6.432 ms | **26.171 ms** |
| lange Aufgaben nach 5 s | 4 | **0** |

**NÄCHSTE RUNDE, Owner hat sie schon entschieden:** *„warum ist das js und nicht
reines css.. macht keinen sinn das als js rotieren zu lassen."* Richtig. Der
Haken ist nicht Schwierigkeit, sondern: CSS kann nur Wörter überblenden, die
**alle im DOM** stehen — und der Export begründet selbst, warum sie es nicht
sind: *„only the active variant stays in the DOM – otherwise the h1 reads as
four concatenated sentences."* Eine SEO-Entscheidung auf einer
Performance-Entscheidung. Vor dem Bauen klären: wie liest Google eine H1 mit
vier Varianten, von denen drei per CSS unsichtbar sind.

### Tote Bytes — exakt gezählt, nicht geschätzt

Chromes Abdeckungsrekorder, ganze Seite durchgescrollt:

**221,3 KB JS ausgeliefert, 139,4 KB nie ausgeführt = 63 %**

| Datei | geliefert | nie ausgeführt | |
| --- | ---: | ---: | ---: |
| `pixel-engine.js` | 42,1 KB | 38,7 KB | **92 %** |
| `react-dom` | 128,7 KB | 76,8 KB | 60 % |
| `support.js` | 36,5 KB | 16,7 KB | 46 % |

**Wichtig:** die 92 % sind nicht tot, sondern **unerreichbar**. `window.PixelFX`
bietet 16 Eingänge, die Seite ruft **zwei** (`PX.button`, `PX.image`, je 21×).
Löschen ist eine eigene Entscheidung mit eigenem Risiko — erst jeden Eingang
gegen alle 21 Seiten UND gegen Interaktion prüfen, nicht nur gegen Scrollen.

CSS: 91 % ungenutzt, aber nur 13,3 KB — und die Messung sieht `style=""`
überhaupt nicht, und das ist hier die Mehrheit der Gestaltung.

### Owner-Entscheidungen von heute Nacht

- Notizen: nicht nur „kein Telefon", sondern **nur mit Maus** — `(pointer:fine)`
  plus 1280 px. Fängt Tablets im Querformat, die eine Breitenregel durchlässt.
- Cookie-Hinweis: **7 Sekunden**.
- Erste Hero-Rotation: darf später starten (7 s).
- Deko-Animationen dürfen generell später anfangen — **aber**: Einblender starten
  bei `opacity:0`, die anzuhalten hieße leere Seite. Trennung: Endlosschleifen
  warten, einmalige Einblender laufen sofort. NOCH NICHT GEBAUT.
- JS splitten: bringt **keine** Auswertungszeit (dieselben Bytes), aber
  Zuordnung und echtes Deferring. Wert dafür, nicht für die 460 ms.

### Werkzeuge, die es jetzt gibt (jetzt in `tools/`)

- `quiet.mjs` — rechnet Lighthouses TTI/TBT auf dem eigenen Longtask-Strom nach.
  **Das Werkzeug, das diese ganze Runde möglich gemacht hat.** `--cpu 4`.
- `whoruns.mjs` — CPU-Profil in einem SPÄTEN Fenster. Was hier auftaucht, tut die
  Seite für immer.
- `deadcode.mjs` — Abdeckung JS+CSS. Achtung: V8 verschachtelt Bereiche, äußere
  zuerst; „count>0 = benutzt" meldet **0 % tot** für jede Datei. In Reihenfolge
  anwenden und innere überschreiben lassen.
- `count.mjs` — zählt `getBoundingClientRect` und ResizeObserver pro Sekunde.
- `pxcheck.mjs` — beweist, dass die Pixeleffekte initialisiert haben.

### Nicht nochmal probieren

- **PageSpeed-API ohne Schlüssel** — Tageskontingent des geteilten Projekts ist
  aufgebraucht, 429. Braucht einen API-Key oder den Bericht aus dem Browser.
- **`ResizeObserver` auf `<body>` als Verdächtigen für Dauerlast** — gemessen:
  feuert 4× in 22 s, ist unschuldig.
- Die 60 `getBoundingClientRect`/s sind die **Pixel-Engine** (`movePoints` liest
  jeden Frame `canvas.getBoundingClientRect()`), nicht die Notizen.

---

## ▶ STAND 13.9. NACHTS — vier Runden gebaut, alles live

`main` = `25aef20`. Alle Tore grün, `hydrateRoot` auf allen 21 Seiten,
0 Konsolenfehler. **PageSpeed mobil 84 -> 91** (TBT 320 -> 80 ms, CLS 0).

| Runde | Was | Wirkung |
| --- | --- | ---: |
| 1 | Bauzeit-Rendering (`ssrRender`) + `hydrateRoot` (`patchRuntime`) | mobil 84 -> 91 |
| 2 | Bewegungsbudget: pausiert Animationen ausserhalb des Bildes | 25 laufende -> 5 |
| 3 | Markenzeichen als externe SVG-Datei (`markToFile`) | DOM 3.168 -> 2.438 |
| 4 | Preload/fetchpriority fuer die Header-Marke, Cookie-Rahmen ruhig, Notizen mobil aus | Hauptthread -> 3.910 ms |

`index.html`: **905.070 -> 676.109 B** roh, **133.588 -> 119.004 B** gzip.
Style-Attribute 2.207 -> 1.464. `Layout`-Aufrufe (Owner-Trace) 358 -> 65.

### Die eine offene Zahl

Googles **Desktop**-Lauf meldet TBT 13.060 ms und "Other" 30.533 ms bei FCP 0,4 s
und LCP 0,8 s. **Nicht reproduzierbar**: lokal misst Desktop 96, und in der
eigenen Aufzeichnung des Owners ist derselbe Rechner auf derselben Live-Seite
**68 % im Leerlauf** (gesamtes Seiten-Skript unter 300 ms, `movePointsGlobal`
1,1 %, Pixel-Engine 2,7 %).

Die plausibelste Lesart kam vom Owner: **5 % CPU auf einer schnellen Maschine
sind 30-50 % auf einem alten Notebook** - und genau dort misst Google. Also
Hardware-Abstand, kein verstecktes Leck. **Gebraucht wird Googles eigener
Bericht als JSON** (DevTools -> Lighthouse -> Desktop -> Bericht speichern), sonst
bleibt es Raten.

### Als naechstes, nach Messung sortiert

1. **Nicht-composited Animationen** (Lighthouse: 17 Elemente). `rail` animiert
   `top` (Layout!), `word-in` `clip-path`, `streamBorder`/`ai-grad`
   `background-position`, `stp`/`stpdot` `color`/`background-color`. Jede davon
   ist pro Frame Hauptthread-Arbeit - auf langsamer Hardware das Vielfache.
   `top -> translateY` ist nicht 1:1 (100 % bezieht sich auf verschiedene Boxen),
   also je Fall pruefen.
2. **`measureHero`** baut bei jedem Resize ein Probe-Element, kopiert berechnete
   Stile darauf, haengt es an `<body>` und misst. Erzwungenes Layout.
3. **`movePointsGlobal`s Kollisionsscan** liest alle zwei Sekunden
   `getBoundingClientRect()` von jedem `h1..p, li, button, a, img, svg, form`.
4. **`/marke/`**: 19 Marken, 913 von 3.161 Knoten. Nach gzip nur 13.938 B -
   Knoteneffekt ja, Byteeffekt nein. Vier davon sind Bewegungs-Demos und
   muessen animiert bleiben.
5. **Phase 2** (Einbahnstrasse): Vorlage + Laufzeit-Uebersetzer nicht mehr
   ausliefern, `'unsafe-eval'` faellt. Kostet gemessen nur ~20 ms Skriptzeit -
   es ist eine **Korrektheits**maszahme, keine Geschwindigkeitsmaszahme.

### Gemessen und als Verdaechtige ausgeschieden

- Vorlagen-Umweg parse/serialisieren/parse: **15,3 ms**.
- Pixelstrom: **eine** laufende Schleife, Desktop wie mobil, ~2 % Hauptthread.
  Beide Sichtbarkeitstore funktionieren. Bleibt (Owner).
- Die 1.000 DOM-Aenderungen/s: real, aber 63 ms in 5,7 s.
- Die Marken-Bytes auf `/marke/`: 460 KB roh, 13.938 B gzip.
- "Die URL wird 6x aufgerufen": nein, **1** Dokument-Anfrage. Die Spalte in
  Lighthouses Tabelle der langen Aufgaben ist das *zugeordnete Skript*.

---

## ▶ ZUERST: wo wir stehen, in fuenf Zeilen

- **Die Seite wird seit 13.9. zur Bauzeit gerendert und hydriert.** `ssrRender()`
  laesst `react-dom/server` das Markup schreiben, `patchRuntime()` bringt
  `support.js` dazu, es zu **uebernehmen** statt daneben alles neu zu bauen.
  `hydrateRoot` laeuft auf allen 21 Seiten, 0 Konsolenfehler, alle Tore gruen.
  Owner beim Ansehen: *„die seite ist brutal schnell."*
- **v4 ist gebaut, geprueft und live** auf `mccain-digital.vercel.app`: 21 Seiten
  aus dem Claude-Design-Export.
- `tools/prerender.mjs` ist der **ganze Build** — eine Schleife ueber die
  Routen-Tabelle `PAGES`. Diese Tabelle ist die einzige Wahrheit darueber, was
  existiert und unter welcher URL; `sitemap.xml` und das Seitenverzeichnis in
  `llms.txt` werden daraus geschrieben.
- **`noindex` bleibt an** (Owner 12.9.: Texte ueberarbeiten + md-recall fertig).
- **Nicht mehr erwaehnen:** der Domain-Umzug laeuft (Owner 13.9., bis zu 12 Tage),
  und vor dem Launch ist neben der Seite noch recall fertigzumachen. Der Owner
  kennt beides. Nicht wieder aufwaermen.

---

## ▶ WAS AM 13.9. GEBAUT WURDE — Phase 1: Bauzeit-Rendering + Hydration

### Der Befund, der es ausgeloest hat

Owner 12.9. nachts: *„wir bauen mit react, ABER eine react CORE function geht
nicht. also haben wir nicht correct gebaut."* Er hatte recht.

Diese Seite war **keine gebaute React-Anwendung**, sondern ein Design-Export,
den ein Interpreter im Browser abspielt. Der Build liess jede Seite ein paar
Sekunden laufen, scrollte sie durch und nahm `innerHTML` ab. Fuer Crawler
richtig — fuer Hydration strukturell unbrauchbar, weil ein Abzug **nach**
Sekunden Leben nie zu Reacts **erstem** Rendering passt.

Gemessen, mobil, dieselbe Seite: **wie ausgeliefert 70, React geladen und
geparst aber nie gebootet 91, wirklich plain HTML 95.** Die Bibliothek kostet
einen Punkt. Das Neubauen kostet 21.

### Die Machbarkeitsprobe kam vor der ersten Zeile Code

`renderToString` auf die eigene kompilierte Komponente des Exports, dann
`hydrateRoot` dagegen, ueber alle 21 ausgelieferten Artboards:

| | |
| --- | ---: |
| Artboards ohne einen einzigen Hydrationsfehler | **20 von 21** |
| Ausreisser Brand Guide v2 | 19 |
| derselbe Versuch gegen den *gesetzten* Abzug (12.9.) | 32 |

Der Ausreisser war ein Beleg, kein Gegenbeweis: dasselbe Artboard wirft roh
schon 45 Konsolenfehler und rendert 9 ungueltige `d`-Attribute — der Fehler, den
`fixIconGallery()` im ausgelieferten Skript repariert. Daraus wurde die zweite
Haelfte des Entwurfs: **gerendert wird aus den gepatchten Quellen, nie aus dem
Roh-Artboard.**

**Warum es ueberhaupt passt:** die Komponente hat *keinen Konstruktor*. `state`
ist beim ersten Rendern leer und wird erst in `componentDidMount` gefuellt —
Server- und erstes Client-Rendering starten aus demselben Zustand.

### Was jetzt im Build steht

- **`ssrRender()`** schreibt gepatchte Vorlage + gepatchtes Skript nach
  `_dcbuild/`, laesst `support.js` sie kompilieren, rendert durch
  `react-dom/server`. Das Staging-Dokument traegt bewusst **kein** `#dc-root`,
  damit `support.js` dort seinen alten Weg nimmt.
- **`patchRuntime()`** — der eine Logik-Patch an `support.js`, gezaehlt:
  gefuelltes `#dc-root` uebernehmen, leeres `<x-dc>` wegwerfen, `hydrateRoot`.
  **Beide Zweige ueberleben**, ein Roh-Artboard hat kein `#dc-root`.
- **Die Reihenfolge ist tragend:** Assets werden **vor** dem Browserstart
  kopiert, sonst rendert der Build gegen den Runtime des vorherigen Laufs.
- **Ersatzlos weg:** `snapshot()` samt seinen drei DOM-Reparaturen, `SWAP`,
  `NOTES_LABELS`, `#dc-prerender`.

Jede Seite traegt jetzt **eine** Kopie: `<div id="dc-root">` (Crawler-Text,
erster Paint und Hydrationsziel in einem), daneben das leere `<x-dc>` als Weg
zur Vorlage und `<template id="dc-template">`.

| | vorher | nachher |
| --- | ---: | ---: |
| `index.html` roh | 905 KB | **760 KB** |
| `index.html` gzip | 133.588 B | **125.578 B** |
| Mount-Weg | `createRoot` | **`hydrateRoot`, alle 21 Seiten** |
| Inline-Skripte / CSP-Hashes | 4 | 3 |

### Der Schreckmoment, der ein Befund war

Der Owner sah kurz **alles zweimal**, transparent, um die Hero-Hoehe nach unten
versetzt. Kein Rendering-Fehler: sein Browser hielt das **gecachte alte**
Dokument mit `#dc-prerender`, der **neue** `support.js` fand darin kein
gefuelltes `#dc-root`, legte eines an und rannte hinein — die alte Kopie blieb
liegen. Hard Reload raeumte es weg.

Im Betrieb kann das nicht passieren: `vercel.json` stellt `.html` **und** `.js`
auf `max-age=0, must-revalidate`; nur `/vendor/` und Bilder sind `immutable` und
tragen ihre Version im Dateinamen.

`verify_site.mjs` kennt den Fall jetzt trotzdem: es haengt sich per
`addInitScript` an `window.ReactDOM` und protokolliert, **welche** Mount-Funktion
lief, plus die Zahl der `.sc-host`-Kopien. Ein Rueckfall auf `createRoot` kostet
20 Punkte, sieht identisch aus und druckt nichts. Gewickelt wird beim **Lesen**,
nicht beim Schreiben — der React-UMD weist ein leeres Objekt zu und fuellt es
erst danach.

### Korrektur an der eigenen Notiz vom Vortag

`support.js` legt sehr wohl Griffe auf `window`: `getDC()`, `__dcRegistry`,
`__dcTemplateSource`, `__dcAnnotatedTemplate`, `__dcRootName`, `DCLogic`. Der
„gezaehlte Patch", den der Plan fuer Schritt 1 vorsah, war nie noetig.

---

## ▶ WAS ALS NAECHSTES DRAN IST — Phase 2

Phase 1 hat die Einbahnstrasse **nicht** genommen: der Export bleibt die Quelle,
Claude Design bleibt der Editor. Was noch offen ist:

1. **Die Vorlage und den Laufzeit-Uebersetzer nicht mehr ausliefern.** 147 KB
   Vorlage + der Uebersetzer je Seite, und `'unsafe-eval'` faellt damit aus der
   CSP. Braucht einen Bauzeit-Compiler — dann ist der Export zu echtem Quelltext
   geworden, und **das** ist die Einbahnstrasse (Claude Design ist danach nicht
   mehr der Editor). Fuer das geplante Kundenbackend mit Projekt-Tracking muss
   sie ohnehin genommen werden.
2. **Inline-Styles in echtes CSS.** 2.207 Attribute, nur **699 verschiedene**,
   einer davon **730-mal** (79 KB je Seite, die Zellen des Markenzeichens).
   57 % des Dokuments. *4a sofort:* die 730 Marken-Zellen bekommen eine Klasse.
   *4b:* die uebrigen 698 als generierte Klassen — braucht Schritt 1 vorher,
   weil React sie sonst nach dem Mounten als `style`-Objekte zurueckschreibt.
3. **Markenzeichen auf Canvas** (Owner freigegeben): 146 unendliche Animationen
   in einem 34-px-`<svg>` kosteten 3,5 s Hauptthread und stehen deshalb auf
   `static`. Auf Canvas sieht es identisch aus und kostet einen Zeichenaufruf
   pro Bild — die Animation kommt zurueck.

### Was NICHT nochmal probiert wird

- **`hydrateRoot` gegen einen gesetzten Abzug.** Zweimal gemessen, zweimal
  gescheitert. Erst rendern, dann hydrieren — so herum laeuft es jetzt.
- **`fonts.css` inline ziehen.** Erledigt, gemessen, ohne Wirkung.
- **Das Namens-Laufband.** 106 ms von 3.659. Es ist das LCP-*Element*, nicht die
  *Ursache*. Bleibt, und **die Referenzen sind echt.**

---

## ⚠ OWNER-REGEL, neu am 12.9. — NICHT UEBERGEHEN

> „bitte nicht einfach farben ändern! oder fonts! das muss vorher abgesprochen werden“

Ausgeloest durch mich: ich hatte fuer den Fehlerhinweis im Formular `#991B1B`,
`#FEF2F2`, `#FECACA` **erfunden**, obwohl `mccain-design-system/tokens/colors.css`
mit `--mc-danger:#E5484D` alles Noetige hatte. Ist korrigiert (nur noch
Systemwerte).

**Regel ab jetzt:** vor jeder Farb- oder Schriftentscheidung fragen. Wenn ein
Wert gebraucht wird, zuerst in `tokens/colors.css` nachsehen — dort stehen auch
`--mc-success`, `--mc-success-text`, `--mc-danger`, `--mc-check`. Nichts
ableiten, nichts dazuerfinden.

**Offen dazu:** `404.html` habe ich von Grund auf geschrieben. Die Werte kommen
aus dem System, die **Gestaltung ist meine** und vom Owner nicht abgenommen.

---

## ▶ DER NÄCHSTE DURCHGANG — „was, warum, wie" (Owner 12.9. nachts)

> „wir bauen mit react, ABER eine react CORE function geht nicht. also haben
> wir nicht correct gebaut" · „4x 100 oder 95 bei speed mobile möglich sind mit
> dicken react sein, ist kein problem, das haben wir schon oft gebaut" ·
> „92 ist einfach zu wenig in 2026, da muss 95+ locker drin sein"

Der Owner hat recht, und das ist der wichtigere Befund als alles andere von
heute. Wenn `hydrateRoot` — eine Kernfunktion des Frameworks — an dieser Seite
scheitert, ist nicht die Funktion schuld.

### WAS falsch ist

**Diese Seite ist keine gebaute React-Anwendung. Sie ist ein Design-Export, den
ein Interpreter im Browser abspielt.** Gemessen an `index.html`:

| Teil | roh | gzip | was es ist |
| --- | ---: | ---: | --- |
| `#dc-prerender` | 563.511 B | 47.003 B | der gesetzte DOM als Abzug |
| `<template id="dc-template">` | 147.219 B | 23.670 B | **dieselbe Seite nochmal**, unkompiliert |
| `<script type="text/x-dc">` | 172.113 B | 56.768 B | der Code, der dieselbe Seite ein drittes Mal erzeugt |
| Kopf (Stile + Schriften inline) | 19.008 B | 4.955 B | |
| **`index.html` gesamt** | **905.070 B** | **133.588 B** | für **eine** Seite |

Dazu zur Laufzeit `content.json` (62 KB / 18 KB gz), `support.js` (37 KB),
`pixel-engine.js` (43 KB), React (143 KB / 48 KB gz).

**Der Inhalt wird dreimal ausgeliefert** und der Browser arbeitet die Kette
jedes Mal komplett ab: 563 KB gesetztes Markup parsen und malen → `support.js`
liest die 147-KB-Vorlage und übersetzt sie mit `new Function` → der
172-KB-Komponentencode läuft → React baut **2.812 Knoten mit 10.920
Inline-Style-Deklarationen** neu auf, um dasselbe Bild zu zeigen.

Deshalb geht Hydration nicht: der Abzug ist kein *Server-Rendering*, sondern
ein **DOM-Abzug nach Sekunden Leben**. React hat nie eine Fassung gesehen, die
zu seinem ersten Rendering passt.

### Und der Grundfehler darunter: das HTML selbst

Owner: *„ohne react und js ist das plain html. das MUSS 100 sein, das geht gar
nicht anders. also MUSS was fundamental falsch gebaut sein."* Richtig — und
meine erste Zahl dazu war schief. Der Lauf, den ich „nur HTML+CSS" genannt
habe, enthielt noch die 147-KB-Vorlage, den 172-KB-Skriptblock und vier
Inline-Skripte.

**Echtes plain HTML gemessen** — Kopf + vorgerenderte Kopie, null `<script>`:

| | |
| --- | ---: |
| Score | **95** |
| FCP / LCP | 972 / 1.880 ms |
| TBT | **212 ms** |
| Hauptthread | **2.930 ms** |
| davon Script Evaluation | **9 ms** |

**212 ms Blockierzeit und 2,9 s Hauptthread ohne eine Zeile JavaScript.** Das
ist kein Skript-Problem, das ist das Dokument. Zerlegt:

| | |
| --- | ---: |
| Dokument | 581.178 B |
| **davon `style="…"`-Attribute** | **329.119 B = 56,6 %** |
| Attribute | 2.207 |
| Deklarationen | 12.707 |
| **verschiedene Style-Strings** | **699** |
| exakte Wiederholungen | 1.508 |

Der schlimmste Einzelfall: `transform-box: fill-box; transform-origin: center
center; animation: …` steht **730-mal** in derselben Datei — **79 KB
identischer Text pro Seite**, nur für die Zellen des Markenzeichens.

**Wo die fehlenden fünf Punkte liegen** — aus demselben Lauf: Speed Index
**3.386 ms** bei FCP 972 und LCP 1.880. Die Seite ist also früh da und wird
trotzdem erst spät fertig: die Einblend-Animationen laufen auch in der reinen
HTML-Fassung weiter, weil sie als Inline-`animation` an den Elementen hängen.
Dazu 212 ms Blockierzeit aus Style und Layout von 2.812 Knoten. Beides führt
auf dieselbe Wurzel: **zu viele Knoten, jeder mit seinem eigenen Stil.**
Owner-Maßstab: *„plain html muss 100 haben. ansonsten ist alles kaputt und
falsch."*

**699 Klassen würden 2.207 Inline-Attribute ersetzen.** Der Browser löst dann
699 Regeln auf statt 2.207 Attribute, das Stylesheet wird über alle 21 Seiten
**einmal** geladen statt in jede HTML-Datei kopiert, und das Dokument
halbiert sich. Das ist eine rein mechanische Umformung — gleiche
Deklarationen, gleiches Aussehen, kein Gestaltungsspielraum und damit auch
kein Risiko dabei.

### WARUM es so gebaut wurde

Nicht aus Unwissen, sondern aus einer Kette einzeln richtiger Entscheidungen
mit einem falschen Gesamtergebnis:

1. Claude Design liefert die Seite als **Vorlage + Komponentenskript**, die nur
   sein eigener Browser-Player `support.js` ausführen kann (`new Function`).
2. Damit Crawler etwas sehen, brauchte es vorgerendertes Markup → naheliegender
   Weg: **Chrome fahren, warten, `innerHTML` abziehen**.
3. Das ist für Crawler richtig und war die Rettung des Projekts. Für Hydration
   ist es **strukturell unbrauchbar** — und das ist erst aufgefallen, als
   Hydration das Ziel wurde.

Kurz: der Build wurde gebaut, um **einen Export lauffähig zu machen**. Er wurde
nie gebaut, um **eine React-Anwendung zu sein**. Das ist die Lücke.

### WIE es richtig geht — der Plan

Zur Bauzeit übersetzen statt zur Laufzeit abspielen. Reihenfolge:

**1. Den Komponentenbaum zur Bauzeit rendern (`renderToString`).**
Statt den gesetzten DOM abzuziehen: denselben React-Baum, den `support.js`
montiert, durch `react-dom/server` schicken. Das Ergebnis **ist per Definition
Reacts erstes Rendering** — damit passt `hydrateRoot` ohne Abgleich.
*Erster Schritt und Machbarkeitsprobe:* `support.js` legt nichts auf `window`
außer `__dcContentKeyed`, der Wurzel-Element ist also von außen nicht
greifbar. Es braucht einen kleinen, gezählten Patch, der `StandaloneRoot`
herausreicht — dann `ReactDOMServer.renderToString()` im Build-Browser.
*Prüfen bevor gebaut wird:* stimmen die ersten 200 Knoten von
`renderToString` mit dem überein, was React beim Mounten erzeugt?

**2. `hydrateRoot` statt `createRoot`.** Der Patch ist schon einmal geschrieben
und gemessen worden (siehe unten) — er war nicht falsch, ihm fehlte nur eine
passende Vorlage. Erwartung nach Schritt 1: **+20 Punkte**.

**3. Die Vorlage nicht mehr ausliefern.** Ist der Komponentencode zur Bauzeit
kompiliert, brauchen Browser weder die 147-KB-Vorlage noch den Übersetzer.
Spart 24 KB gz je Seite, **und `'unsafe-eval'` fällt aus der CSP** — die einzige
Schwachstelle der jetzigen Policy.

**4. Die Inline-Styles in echtes CSS heben — der Schritt für die 100.**
2.207 Attribute, 699 verschiedene. Zwei Stufen:

*4a, sofort und klein:* die **730 identischen Zellen-Styles des
Markenzeichens** bekommen eine Klasse. Ein gezählter Patch in `mark()`, eine
CSS-Regel, **79 KB weniger pro Seite** — 14 % des Dokuments, ohne dass sich
irgendetwas ändert. Das ist genau die Sorte Eingriff, die dieser Build schon
zwanzigmal macht.

*4b, der ganze Weg:* die übrigen 698 Style-Strings als generierte Klassen, ein
Stylesheet für alle 21 Seiten. Braucht Schritt 1–3 vorher, weil die Vorlage und
der Komponentencode dieselben Styles nochmal erzeugen — solange React sie zur
Laufzeit als `style`-Objekte setzt, kommen sie nach dem Mounten zurück.

**Werkzeug ist da:** `esbuild` liegt schon in `tools/node_modules` und wird für
die Minifizierung benutzt. Was fehlt, ist `react-dom/server` (nur zur Bauzeit,
wird nicht ausgeliefert).

**Zielmarke: 95+ mobil, und die Zahlen sagen, dass mehr geht.** Plain HTML
steht heute bei 95 — mit einem Dokument, das zu 57 % aus wiederholten
Style-Attributen besteht. Schritt 4 hebt diese Decke, Schritt 1–3 holen die 21
Punkte zurück, die das Neubauen kostet.

### Ebenfalls freigegeben: das Markenzeichen auf Canvas

> „ja das mit dem logo können wir so bauen."

146 unendliche CSS-Animationen in einem 34-px-`<svg>` wurden auf `static`
gestellt, weil sie 3,5 s Hauptthread kosteten. Auf ein `<canvas>` gezeichnet
sieht es identisch aus und kostet einen Zeichenaufruf pro Bild. Damit lebt das
Logo wieder — **die Animationen sind dem Owner wichtig, die Seite ist ein
Flaggschiff und muss zeigen, was das Studio kann.**

### Was NICHT nochmal probiert wird

- **`hydrateRoot` gegen den gesetzten Abzug.** Zwei Anläufe, beide gemessen,
  beide gescheitert: 1.193 von ~3.000 Knotenpositionen weichen ab. Erst
  Schritt 1, dann Hydration.
- **`fonts.css` inline ziehen.** Erledigt, gemessen, ohne Wirkung.
- **Das Namens-Laufband.** Gemessen: 106 ms von 3.659. Es ist das
  LCP-*Element*, nicht die *Ursache*. Bleibt, und **die Referenzen sind echt.**

---

## ▶ DER ARBEITSPLAN — Stand nach dem Durchgang vom 12.9. abends

Owner hat am 12.9. **A, B, C2, D, E, F und die 404** freigegeben („das setzen
wir erstmal um, das sind alles technisch notwendige sachen"). **C1 — die drei
Kontrastfehler — bewusst nicht**, das sind Farbentscheidungen.

Der Befund von vorher als Artifact:
<https://claude.ai/code/artifact/0e1c630e-37a6-4883-acd3-ec2c57b2ef24> —
**seine absoluten Zahlen sind hinfällig**, siehe gleich.

### ⚠ ZUERST: „mobil 41" war eine Fehlmessung

`prodserve.py` komprimierte nur Pfade, die auf `.html` enden. Jede Route dieser
Seite endet auf `/` → **jede Seitenmessung dieses Projekts lief gegen eine
unkomprimierte Seite**, Startseite 907 KB statt 134 KB. Behoben.

Dieselbe Datei über `/` und über `/index.html`: Score 45 gegen 63, FCP 5.171 ms
gegen 1.272 ms. Die *Vergleiche* untereinander stimmten immer, die Hausnummer
nie. **Vercel komprimiert — die Live-Seite war nie so langsam, wie wir sie
gemessen haben.** Wenn eine Zahl aus diesem Projekt älter ist als der 12.9.
abends, ist sie zu pessimistisch.

Gegenprobe vor jeder künftigen Messreihe, dreißig Sekunden:

    curl -sI -H "Accept-Encoding: gzip" http://127.0.0.1:8898/ | grep -i content-encoding

### ✔ A — Performance: erledigt, und der Verdächtige war der falsche

Der Plan nannte den Datenstrom. Vier identische Läufe, die sich nur durch ein
eingeschobenes Stylesheet unterschieden:

| Variante | Score | TBT | Hauptthread |
| --- | ---: | ---: | ---: |
| unverändert | 63 | 1.026 ms | 8.497 ms |
| Datenstrom aus | 64 | 1.010 ms | 8.485 ms |
| **Logo-Animation aus** | **68** | **778 ms** | **4.971 ms** |

Der Datenstrom kostet nichts. Die Rechenzeit lag im **Zeichen im Kopf**: ein
34 × 34 px `<svg>` aus 146 `<rect>`, jedes mit eigener unendlicher Animation —
146 der 170 unendlichen Animationen der Startseite in einem Quadrat.

**A1 — erledigt.** `mark()` läuft im Modus `static`, den die Komponente selbst
dokumentiert (`mode: static | in | loop`). Dazu fällt der 1,6-s-Timer weg, der
auf `loop` schaltete und dafür die ganze Anwendung neu rendert. Beide Patches
zählen ihre Treffer und brechen ab, wenn der nächste Export sie verschiebt.
Owner: *„hau das logo raus, wenn wir das nicht gefixt bekommen. und ersetze es
durch ein statisches"*.

**A2 — hinfällig.** Nach A1 laufen auf der Startseite noch **24** Animationen
statt 270. Außerhalb des Bildes anzuhalten würde jetzt nichts mehr einbringen.

**A4 — offen, aber neu zu messen.** Die 259–386 ms erzwungener Umbruch stammen
aus der unkomprimierten Messreihe.

**A5 — `hydrateRoot`: gebaut, gemessen, zurückgenommen. NICHT WIEDER AUFMACHEN.**
Zerlegung mobil: nur HTML+CSS **92** · React geladen und geparst, bootet nie
**91** · nur React **72** · wie ausgeliefert **70**. Also: die Bibliothek kostet
**einen Punkt**, die 21 Punkte sind das *Neubauen*. `support.js` montiert mit
`createRoot` in ein leeres div, obwohl die fertige Seite schon dasteht.
Umgebaut auf `hydrateRoot` → React #418/#425/#423, Rückfall auf volles
Client-Rendering, 32 Konsolenfehler, kein Gewinn. Grund gemessen: zwischen
Reacts erstem Rendering und dem gesetzten DOM liegen **1.193 von ~3.000
Knotenpositionen** (rotierende Überschrift, Zähler 0→77, 205 imperativ
erzeugte Knoten). Zweiter Anlauf mit Snapshot beim ersten Commit: auch 32
Fehler. Vollständig zurückgenommen.

**A3 — spätes Hydrieren, der einzige verbliebene Hebel.** Gemessene Obergrenze
**92**. Was jetzt noch im Hauptthread steht: Script Evaluation 1.528 ms ·
Other 1.373 ms · Style & Layout 1.342 ms · Rendering 571 ms. **Mit genau dem
Risiko, das dieses Projekt zweimal getroffen hat** — braucht ein sichtbares
Bereitschaftssignal, nicht nebenbei.

**Owner 12.9. zur Richtung:** die Animationen sind wichtig, die Seite ist ein
Flaggschiff und muss zeigen, was das Studio kann; später soll ein Kundenbereich
mit Projekt-Tracking andocken. React bleibt also — die Messung oben sagt
ohnehin, dass es nicht das Problem ist.

**Ergebnis mobil, gleiche Bedingungen, komprimiert:**

| | vorher | nachher |
| --- | ---: | ---: |
| Score Startseite | 63 | **69** |
| Hauptthread | 8.497 ms | **4.999 ms** |
| TBT | 1.026 ms | **811 ms** |
| LCP | 4.050 ms | **3.669 ms** |

Sechs Seiten: Start 69 · KI 70 · Rechtliches 70 · News 73 · Preise 65 ·
Marke 65. A11y 100 überall außer `/marke/` (93 = C1). Best Practices 100.
CLS 0. Gesamtgewicht Startseite 393 KiB.

### ✔ B — Bilder: 211 KB Platzhalter sind 65 KB

Portraits 840 × 1050 → 240 × 300 (67,6 → 12,6 KB je Stück). Studiofoto
1200 × 800 → **1200 × 457 zugeschnitten**: die Box hat Verhältnis 2.625, der
Browser warf 43 % der Zeilen weg, *nachdem* er sie geladen hatte. Abzeichen
9,8 KB PNG → 2,9 KB WebP bei 128 px (nicht 48: auf `/md-recall/` steht dasselbe
Bild in einer 58-px-Box).

Tabelle `DERIVED` im Build; `localise()` liest die Verweise daraus, damit ein
neues Bild nicht halb verdrahtet werden kann. Marken-SVGs auf `/marke/` bleiben
absichtlich außen vor — Vektor **und** die angebotene Download-Datei.

**Zwei Befunde für den Owner:** die beiden Portraits sind **byte-identisch**
(dieselbe Datei zweimal, `md5 25edd2c1…`), und das Studiofoto ist mit 1200 px
für eine 1344-px-Box zu klein — das braucht ein größeres Original, keinen
Build-Schritt.

### ✔ C2 — jede Seite hat ein `<main>`

Vorher keine einzige. Der Rahmen liegt um **beide** Kopien — die vorgerenderte
und die Vorlage, aus der React rendert; nur in der ersten wäre er nach einer
Zehntelsekunde wieder weg.

`/marke/` ist anders gebaut: ihr Inhalt liegt in einem Wrapper, der mit einem
eigenen `<header>` beginnt. Ein `<main>` ab der ersten Sektion hätte diesen Kopf
draußen gelassen — als **zweite `banner`-Landmarke**. Der Rahmen geht deshalb
vom Seitenkopf bis zum Fuß. Das Tor zählt beides.

### ◑ D — Titel erledigt, Aussagen offen

**Erledigt:** sieben Titel waren über 60 Zeichen und wurden abgeschnitten.
Gemessen mit aufgelösten Entities (`&amp;` sind 5 Zeichen in der Datei und 1 auf
dem Schirm — das verschiebt zwei Titel über die Grenze). Der Markenzusatz fällt
weg, und nur dort: 44–51 Zeichen, längster der Seite 60. Der Text selbst
unberührt.

**Offen, Owner:**

- **`/news/` heißt „News · McCain Digital", 21 Zeichen.** Zu dünn, braucht Worte.
- **Die Lighthouse-Aussagen über die eigene Seite.** Das ist größer als
  gedacht: **auf allen 21 Seiten**, nicht nur im Hintergrundtext. Als sichtbare
  Kennzahl `{ v: '4×100', l: 'Lighthouse' }`, als Fließtext „Lighthouse-Wertung
  der eigenen Website", „Lighthouse 100 mit laufender Canvas-Engine", und als
  Merkmalsliste „Cumulative Layout Shift 0, **Total Blocking Time 0 ms**".
  Gemessen sind es heute 65–73 mobil und TBT 639–1.085 ms. **CLS 0 stimmt.**
  Nicht angefasst: das ist Text, teils Werbeaussage über die eigene Leistung,
  und in DE abmahnfähig. Die Zusagen über *Kundenprojekte*
  („Lighthouse-Budget in der CI") sind davon unberührt und bleiben richtig.
- Die drei Descriptions in `PAGES` sind weiterhin von mir formuliert.

### ◑ E — was noch ins Leere zeigt (Owner)

Gemessen, nicht geschätzt — pro Seite:

- ~~„Tech-Notizen" → `#`~~ — **erledigt 12.9.**, Owner: „tech notizen kann raus,
  das machen wir eh nicht". Eintrag aus Menü **und** Fußzeile entfernt, nicht nur
  der Link. Tote Anker im SEO-Befund **23 → 4**.
- **`/news/` zeigt drei Artikel, zwei davon zeigen auf `#`** („Warum der…",
  „Zwei Personen…"). Nur `md-recall` existiert.
- **`/md-recall/`: „Repository öffnen" → `#`.** Eine URL zu raten ist genau das,
  was ich nicht tue.
- ~~Das Namens-Laufband im Hero~~ — **erledigt, bleibt wie es ist.** Owner
  12.9.: die Referenzen sind echt und zwanzig Jahre alt. **Nicht wieder
  aufmachen.** Technisch ist es auch kein Posten: gemessen mit und ohne, LCP
  3.659 vs. 3.553 ms — 106 ms von 3.659, neun Wörter in reinem CSS.
  Es ist das LCP-*Element*, nicht die LCP-*Ursache*.
- **`/md-recall/` hat 10 leere Bildslots.** Die Screenshots müssen in den
  Export; auf der ausgelieferten Seite kann man dort nichts ablegen.

### ✔ F — CSP, Permissions-Policy, Caching

**Content-Security-Policy**, ihr Wert vom Build geschrieben: jedes
Inline-`<script>` **der gebauten Datei** wird gehasht, keine gepflegte Liste.
Ein fünftes Skript aktualisiert die Policy im selben Lauf.

- `'unsafe-eval'` ist unvermeidbar: `support.js` übersetzt die Komponente über
  `new Function(...)`. Es kostet nicht viel — ein eingeschleustes `<script>`
  braucht weiter einen Hash, `src=` weiter die eigene Domain. Der
  Komponenten-Code ist `type="text/x-dc"`, wird nie ausgeführt, braucht keinen.
- `img-src data:` ist nötig: `image-slot.js` und `pixel-engine.js` erzeugen
  Bilder über `toDataURL`. Nachgesehen, nicht geraten.

Dazu `Permissions-Policy` (Kamera, Mikrofon, Standort, Zahlung, USB, Kohorten —
aus) und `immutable` für `/vendor/`, wo die Version im Dateinamen steht.

**`prodserve.py` schickt die Sicherheits-Header jetzt aus `vercel.json` mit** —
eine CSP ist der eine Header, bei dem „sehen wir beim Deployen" keine Prüfung
ist. Das Tor fängt jeden Verstoß, weil ein CSP-Verstoß eine Konsolenmeldung ist.

**Nicht gemacht, mit Grund: Dateinamen mit Inhalts-Hash** für `support.js`,
`pixel-engine.js`, `image-slot.js`. Gewinn wären drei `304`-Antworten pro
Wiederbesuch, und die HTML-Datei ist ohnehin `must-revalidate`, kostet also eine
Rundreise auf derselben warmen Verbindung — **kein Gewinn auf dem kritischen
Pfad.** Dafür träfe die Umbenennung an sechs Stellen genau die Datei, deren
Fehlen diese Seite zweimal tot ausgeliefert hat. Eigener Durchgang, nicht
angehängt.

### ◑ 404 — Farben korrigiert, Gestaltung weiter nicht abgenommen

`404.html` benutzte `rgba(10,37,64,.1)` und `rgba(10,37,64,.28)` — beide
**abgeleitet**, beide nicht im System, dasselbe Muster wie die erfundenen
Rottöne. Jetzt `--mc-line` und `--mc-indigo-ring`. `<main>` hatte sie schon.
**Die Komposition ist meine und der Owner hat sie nie gesehen.**

### Was das Tor jetzt zusätzlich prüft

`node tools/verify_site.mjs` fragt auf jeder der 21 Seiten am laufenden
Browser: genau ein `<main>`, Fußzeile nicht darin, Sprungziel darin, genau eine
`banner`-Landmarke, **null** laufende Animationen im Zeichen, CSP-Header
vorhanden. Die Patches im Build zählen ihre Treffer und brechen ab, statt still
danebenzugreifen.

---

## ▶ WERKZEUGE — womit das gemessen wurde

Dev-Server muss laufen: `python prodserve.py 8898 --dev` (bauen) bzw.
`python prodserve.py 8898` (messen, Produktionsheader).

**Vor jeder Messreihe einmal pruefen, dass der Server komprimiert** — bis zum
12.9. abends tat er es fuer Verzeichnis-Routen nicht, und das hat jede Zahl
dieses Projekts verschoben:

    curl -sI -H "Accept-Encoding: gzip" http://127.0.0.1:8898/ | grep -i content-encoding

Er schickt seit dem 12.9. auch die Sicherheits-Header aus `vercel.json` mit,
damit die CSP lokal pruefbar ist statt erst in Produktion.

| | |
| --- | --- |
| `node tools/prerender.mjs` | der ganze Build: 21 Seiten, sitemap, llms.txt, og-Bilder |
| `node tools/verify_site.mjs [url]` | **Pflicht vor jedem Push.** Klickt alle 21 Seiten |
| `node tools/seo_audit.mjs [url]` | **neu 12.9.** Meta, Ueberschriften, alt, Verlinkung, Waisen, sitemap — plus jede Seite einmal *ohne JavaScript* |
| `node tools/form_probe.mjs [url]` | Formular; `MCD_HEADED=1` fuer den Ende-zu-Ende-Beweis |
| `python tools/lighthouse_audit.py [url]` | sechs Seiten, Desktop |
| `node tools/responsive_audit.mjs` | Ueberlauf bei 390/768/1024/1440 |
| `node tools/weigh.mjs` · `python tools/check_links.py` | Bytes · Links, Anker, doppelte IDs |

Mobil messen (das ist die Zahl, die zaehlt) — eine Zeile:

    npx lighthouse "http://127.0.0.1:8898/" --form-factor=mobile --screenEmulation.mobile --throttling-method=simulate --only-categories=performance,accessibility --chrome-flags="--headless=new"

**`MCD_HEADED=1`** schaltet `tools/browser.mjs` auf einen sichtbaren Browser —
noetig, weil Cloudflare vor Web3Forms jeden headless-Browser und auch
`node fetch` mit Browser-UA mit 403 abweist.

---

## ⛔ WEITERHIN: `mccain-digital.com` liefert NICHT diesen Stand

Unveraendert seit dem 11.9. und **nicht** durch diesen Import beruehrt: die
Domain zeigt auf nginx/SiteGround und liefert die englische v2 vom 21. Juni,
**indexiert**. Das Vercel-Projekt `mccain-digital` traegt nur seine
`*.vercel.app`-Domains. `node tools/domain_check.mjs` stellt die Frage direkt.

Wo in diesem Dokument „live" steht, ist `mccain-digital.vercel.app` gemeint.

**Die Reihenfolge beim Umschalten bleibt:** erst `site.config.json` auf
`"noindex": false` **und** den `X-Robots-Tag` aus `vercel.json` nehmen, neu
bauen, `node tools/verify_site.mjs` — **dann** die Domain umhaengen. Eine
indexierte Domain auf eine noindex-Seite zu zeigen, heisst Google zu bitten,
sie aus dem Index zu nehmen.

---

## ▶ NOINDEX BLEIBT AN — Owner-Ansage 12.9.

> „die seite bitte vorerst auf no index stellen, wir müssen wenn alles fertig
> ist noch alle texte überarbeiten und recall fertig machen"

`site.config.json` steht auf `noindex: true`, jede der 21 Seiten traegt das
Meta-Tag, `vercel.json` schickt zusaetzlich den Header. Nicht anfassen, bis die
beiden Punkte unten erledigt sind.

---

## ▶ (ueberholt) Die Liste vom Vormittag des 12.9.

Die Punkte von hier sind in **DER ARBEITSPLAN** oben aufgegangen — dort stehen
sie mit den Zahlen aus dem Audit vom Abend. Diese Liste wurde entfernt, damit es
nicht zwei widersprechende To-dos gibt.

---

## ▶ ZUERST LESEN — Stand nach der Nacht zum 11.9.

**Der Relaunch steht am Repo-Root**, gebaut aus dem Claude-Design-Export in
`mccain-design-system/`. **Die ganze Seite steht auf `noindex`**, solange sie
unfertig ist — ein Schalter: `site.config.json`.

### ⚠ Das Wichtigste zuerst: das Kontaktformular hat NICHTS gesendet

Der Handler aus dem Export lautete:

```js
formSubmit = (e) => { e.preventDefault();
  const fd = new FormData(e.currentTarget);
  if (fd.get('company')) return;
  this.setState({ formSent: true }); };
```

Er hat die Danke-Meldung gezeigt — „Danke – Ihre Nachricht ist da. Sie hören
innerhalb von 24 Stunden von Christian oder Kathi." — und **null Requests**
abgesetzt. Gegen die Live-Seite gemessen: 0 Nicht-GET-Requests, Danke sichtbar,
Formular aus dem DOM entfernt. **Jede Anfrage wurde still verworfen, während dem
Absender gesagt wurde, sie sei angekommen.** Niemand auf beiden Seiten hätte das
je bemerkt.

Behoben: Das Formular postet wieder an **Web3Forms** — keine neue Entscheidung,
sondern die dokumentierte. Die alte Seite nutzte denselben öffentlichen
Schlüssel, und die **geprüfte Datenschutzerklärung nennt Web3Forms ausdrücklich**
als Verarbeiter. Umgesetzt als progressive Verbesserung: echtes `action` und
`method` (funktioniert ohne JavaScript), `fetch()` für die Antwort in der Seite,
nativer Submit als Rückfall — und die Danke-Meldung **nur bei Erfolg**.

Der Kanal ist Ende-zu-Ende geprüft (`success: true`). **Eine klar
gekennzeichnete Prüfnachricht liegt im Postfach** und erklärt sich selbst.

`tools/verify_site.mjs` prüft ab jetzt, dass jedes Formular ein brauchbares
`action` hat.

### Die 100 SVG-Fehler in der Konsole — behoben

Beim Laden druckte die Startseite **70** SVG-Fehler, der Brand Guide **37**,
während das Tor „0 page errors" meldete. `pageerror` trägt nur ungefangene
Ausnahmen; `console.error` und die Parser-Meldungen des Browsers erreichen es
nie. **Ein Tor, das einen Kanal beobachtet, sagt nichts über den anderen.**

Ursache war die Zustellform des Templates. Als lebendiger `<x-dc>`-Teilbaum
parst, layoutet und malt der Browser eine **zweite vollständige Kopie der Seite**,
die niemand sieht — voller `{{ }}`-Platzhalter, also ein Fehler je SVG-Attribut,
ein Fetch je `src="{{ … }}"` und `pixel-engine.js` **zweimal** geladen.

Jetzt: inertes `<template id="dc-template">` + leeres `<x-dc>` als Montagepunkt,
dazu ein dreizeiliger Shim. Vorher geprüft, dass ein `<template>` **exakt**
denselben String liefert wie ein `<x-dc>` — 143.641 Zeichen auf beiden Wegen.

| | vorher | jetzt |
| --- | --- | --- |
| Konsolenfehler Start / Brand | 70 / 37 | **0 / 0** |
| `pixel-engine.js` | 2× | 1× |
| Favicon | 3× | 1× |
| Elemente im Layout beim Parsen | ~4.200 | ~2.200 |

### Was gemessen wurde — Lighthouse, Desktop, lokale Produktionsheader

| Seite | Perf | A11y | Best | SEO | FCP | LCP | TBT |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Startseite | **68** | 99 | 100 | 69 | 349 ms | 1398 ms | 663 ms |
| Kontakt | **100** | **100** | 100 | 69 | 200 ms | 300 ms | 0 ms |
| Leistungsseite | **100** | **100** | 100 | 69 | 200 ms | 300 ms | 0 ms |
| Rechtsseite | **100** | **100** | 100 | 69 | 200 ms | 300 ms | 0 ms |
| Brand Guide | **100** | 91 | 100 | 69 | 400 ms | 700 ms | 0 ms |

**SEO 69 ist unser eigenes `noindex`** (`is-crawlable`), sonst nichts.

**Die „4×100 Lighthouse"-Aussage auf der Startseite stimmt für diesen Build
nicht.** Die Seite liegt bei **68**, gebunden an **1.493 ms Skriptauswertung**,
mit der React ~2.140 Elemente rendert, plus 364 ms Layout. Das ist der Entwurf
der Komponente, nicht ihre Auslieferung: `support.js` zu deferren und React
vorzuladen bewegte den Wert **gar nicht** (68/69/69 über je drei Läufe), und der
React-Preload verschlechterte FCP messbar von 349 ms auf 485 ms — deshalb ist er
nicht drin. Die Aussage muss entweder von der Seite oder die Seite muss anders
gebaut werden. **Owner-Entscheidung.**

Lighthouse kann von diesem Rechner aus **die Live-URL nicht** messen (jeder Lauf
endet in `FAILED_DOCUMENT_REQUEST` / `net::ERR_ABORTED`, während curl und
Playwright dieselbe URL problemlos holen). Gemessen wird deshalb gegen
`python prodserve.py 8897` — gleiche Kompression, gleiche Cache-Header,
reproduzierbar. Live liefert Brotli (66 KB) statt gzip (102 KB), ist also eher
besser als die Zahlen oben.

### Neu gebaut: fünf Seiten, die es schon einmal gab

`/contact.html` und `/services/{ai-tools,web-apps,websites,software}.html` waren
auf der Vorgängerseite live — sie stehen in deren Sitemap — und **lieferten seit
dem Relaunch alle 404**. Sie sind zurück, unter denselben Adressen:

- `/kontakt.html` — deutsch-zuerst; `/contact.html` ist eine **308-Weiterleitung**
  darauf, keine zweite Kopie
- `/services/ai-tools.html` · `web-apps` · `websites` · `software`

**Woher die Worte kommen:** nichts ist abgetippt. Die vier Leistungen sind die
vier Schlüssel in `content.json` (`ai`, `apps`, `web`, `software`) — Kennzahlen,
Anwendungsfälle, Fähigkeiten, Ablauf, FAQ, Stack, alles schon auf Deutsch. Das
ist derselbe Inhalt, den die Startseite in ihren Modals zeigt. Überschrift,
Kopfzeile und Einleitung kommen über `tools/extract_design.mjs` aus der
**gerenderten** Startseite, damit eine Unterseite nicht von deren Wortlaut
abdriften kann.

**„Halte dich an das Design"** ist ebenfalls nicht nach Augenmaß: Typo-Skala,
Farben, Kartenradius und Schatten in `tools/pagekit.py` sind mit
`getComputedStyle` von der gerenderten Startseite abgelesen (h1 600/−0.04em,
h2 700/−0.03em, h3 600/−0.025em, Fließtext #425466 auf #fff, Karte 16px +
`0 0 0 1px #E3E8EE`).

Die Seiten sind **statisches HTML ohne Hydration** — beide Fehler, die eine tote
Startseite ausgeliefert haben, waren Hydrationsfehler, und PageSpeed steht in
diesem Projekt vor allem anderen. Ergebnis: 100/100/100.

### Aufgeräumt: eine Archiv- und eine Interna-Ablage

| vorher | jetzt |
| --- | --- |
| `old/` | `archive/site-apache/` — **Quelle des geprüften Rechtstextes** und der alten Kontaktseite |
| `old 2/` | `archive/site-v3/` — die Seite, die der Relaunch abgelöst hat |
| `audit/`, `_parked/`, `TODO.md`, `DESIGN-BEFUND.md`, `assets-src/` | `internal/` |
| `sweep`, `accent_audit`, `type_scale` + 11 weitere | `archive/site-v3-tools/` (mit README) |

Dass nichts davon erreichbar ist, ist **keine Zusage, sondern ein Test**:
`tools/verify_site.mjs` fragt den Live-Host nach zehn Pfaden und fällt durch,
wenn einer **nicht** 404 liefert. `README.md` war komplett veraltet (beschrieb
v3: ein Stylesheet, Schibsted Grotesk, „zero build") und ist neu geschrieben.

### Der Build — Reihenfolge zählt

```
python prodserve.py 8898 --dev              # muss laufen
python tools/patch_export.py                # nach JEDEM neuen Claude-Design-Export
python tools/vendor_assets.py               # React + Schriften ins Repo
node  tools/prerender.mjs                   # index + brand-guide + og-image + minify
node  tools/extract_design.mjs > internal/design-reference.json
python tools/build_pages.py                 # Kontakt + die vier Leistungsseiten
python tools/build_legal.py                 # die vier Rechtsseiten
python tools/build_sitemap.py               # zuletzt, prüft gegen die Platte
node  tools/verify_site.mjs                 # PFLICHT vor jedem Push
```

`index.html`, `brand-guide.html`, `kontakt.html`, `services/*`, `legal/*` sind
**generiert**. Handänderungen gehen beim nächsten Build verloren.

**`tools/patch_export.py` ist neu und wichtig:** es sammelt jede bewusste
Änderung am Claude-Design-Export an einer Stelle (Kontaktformular, Fußzeilen-
Links) und ist wiederholbar. Ein frischer Export überschreibt den Ordner —
danach dieses Skript laufen lassen, sonst ist das Formular wieder tot.

### Die Tore

| | |
| --- | --- |
| `verify_site.mjs` | **klickt.** Hydration, Menü, Modal, Pixel-Engine, Konsole, `noindex`, Formular-`action`, Erreichbarkeit jeder Seite von der Startseite, und was 404 bleiben muss. Nimmt eine URL für live. |
| `console_audit.mjs` | jede Konsolenmeldung, nach Form gruppiert |
| `requests_audit.mjs` | jeder Request, gezählt — eine Dublette ist der Befund |
| `responsive_audit.mjs` | Überlauf bei 390/768/1024/1440 und **welches Element** ihn verursacht |
| `lighthouse_audit.py` | die Tabelle oben, plus jeder Prüfpunkt unter 100 |
| `form_probe.mjs` | füllt ein Formular aus, sendet ab, meldet was den Browser verlässt |
| `weigh.mjs` | woraus die ausgelieferten Bytes bestehen |
| `check_links.py` | Links, Anker, doppelte IDs auf den ausgelieferten Seiten |

### Optimiert, ohne die Seite zu zerstören

Interne (kommentierte) und externe (minifizierte) Fassung, bei jedem Build neu
abgeleitet, damit sie nicht auseinanderlaufen:

```
support.js        67,5 KB -> 36,4 KB roh   (16,3 -> 12,3 KB brotli)
pixel-engine.js  137,3 KB -> 42,1 KB roh   (37,2 -> 14,4 KB brotli)
```

**26,8 KB weniger über die Leitung, 126 KB weniger zu parsen.** Nur Bezeichner
werden umbenannt, keine Eigenschaftsnamen — `support.js` greift namentlich auf
Objekte zu. Das Tor klickt, ein kaputter Minifier wäre aufgefallen.

Zur Ausgangsfrage „viele Kommentare auf der Live-Seite?": **in der HTML sind es
0,9 KB von 661 KB — nichts.** In `pixel-engine.js` waren es 55 KB von 137 KB —
*das* war der reale Fund.

### ⚠ Vier Fallen im Build — jede hat schon etwas Kaputtes ausgeliefert

**1. Niemals den gesetzten DOM als `index.html` speichern.** `support.js`
montiert so:

```js
const dc = doc.querySelector("x-dc");
if (!dc) return null;          // <- ein Snapshot stirbt hier
dc.replaceWith(hostEl);        // x-dc wird <div id="dc-root">
```

Ein Snapshot entsteht NACH diesem Austausch, enthält also kein `<x-dc>` mehr.
Beim nächsten Laden rendert nichts. React lädt, PixelFX lädt, **null
Konsolenfehler**, jeder Knopf tot. Deshalb liefert die Seite **beide** Kopien:
`#dc-prerender` (gesetztes Markup — was Crawler lesen und was zuerst malt) und
darunter das leere `<x-dc>` als Montagepunkt, mit dem Template im inerten
`<template id="dc-template">`. Ein MutationObserver entfernt die Vorschau,
sobald `#dc-root` **mehr als 40 Elemente** hat — nicht schon beim ersten Kind:
„React hat eine leere Hülle montiert" und „React hat die Seite gerendert" sind
zwei Zustände, und nur einer darf die lesbare Kopie wegnehmen.

**2. Aus dem Snapshot-`<head>` nur die `<style>`-Blöcke übernehmen.** Den ganzen
Head mitzunehmen liefert `support.js` und `pixel-engine.js` **doppelt**. Zwei
Laufzeiten im Wettlauf, die zweite erreicht den Komponenten-Code bevor React
fertig ist: `Cannot read properties of null (reading 'useState')`, wieder
leeres `#dc-root`, wieder keine sichtbare Fehlermeldung.

**3. Das Template niemals als lebendiges Markup ausliefern.** Als
`<x-dc>`-Teilbaum baut der Browser einen kompletten zweiten DOM, der nie zu
sehen ist — und weil darin `{{ }}`-Platzhalter stehen, meldet er einen Fehler je
SVG-Attribut (70 auf der Startseite), holt jedes `src="{{ … }}"` als URL und
führt das `<script src="pixel-engine.js">` aus dem `<helmet>` ein zweites Mal
aus. Inertes `<template>` löst alle vier Punkte auf einmal.

**4. Gross-/Kleinschreibung in erzeugten Dateinamen.** Google Fonts benennt den
römischen und den kursiven Schnitt fast gleich (`pxitypc9vs` gegen
`pxiTypc9vs`). Auf NTFS überschrieb der zweite Download den ersten still — vier
Dateien statt sechs, eine mit dem falschen Schnitt — und der verschwundene Name
lief auf Vercel in 404. `vendor_assets.py` benennt jetzt nach Familie-Stil-Subset
und bricht ab, wenn zwei URLs auf denselben Dateinamen fallen.

**Die zwei Lehren, die am meisten gekostet haben:**

- **Eine Ladezeit-Prüfung beweist nicht, dass eine Seite funktioniert.** 200er,
  Bilder, Meta-Tags und Wortzahl waren alle grün, während die Seite vollständig
  tot war. Gefunden hat es der Owner. **Vor jedem Push klicken.**
- **Ein Tor, das einen Kanal beobachtet, sagt nichts über den anderen.**
  `pageerror` war leer, während 70 Meldungen auf `console` standen. Dasselbe
  Muster zweimal: eine grüne Messung ist erst dann eine Auskunft, wenn sie die
  Frage stellt, um die es geht.

**Und ein Wächter kann sich selbst blenden:** zwei Prüfungen suchten nach dem
Literal `<template id="dc-template">` und trafen den **Doku-Kommentar** oben in
der erzeugten Datei, der genau dieses Tag zitiert. Der Treffer lief bis zum
echten `</template>` und schnitt damit das vorgerenderte Markup aus der eigenen
Prüfung heraus. Kommentare kommen jetzt zuerst raus. **Was in der Dokumentation
ein Muster benennt, liegt mit im Suchraum.**

### Offen — Owner-Entscheidungen

1. **Die Logo-Reihe im Hero** (Deutsche Bank, Apple, Microsoft, Blizzard,
   Deutsches Museum, Ravensburger, Travian, AOK) liest sich als Kundenliste,
   während die Sektion darunter „Was Kunden sagen – **sobald sie es dürfen**"
   heißt und die `readme.md` des Design-Systems sagt, Beispiele seien
   „illustrativ, nie Kundenreferenzen". Sind das keine freigegebenen Kunden,
   ist das in DE ein Abmahn-Risiko.
2. **Die Rechtstexte sind Englisch**, die Seite ist Deutsch-zuerst. Die Seiten
   tragen deshalb `lang="en"`, und die deutsche Schale darin ist seit dem
   Nachtlauf korrekt als `lang="de"` ausgezeichnet. Der geprüfte Wortlaut darf
   nicht maschinell übersetzt werden — das bleibt eine Anwaltsfrage.
   **Dazu neu:** die Datenschutzerklärung nennt **SiteGround** als Hoster. Die
   Seite läuft seit dem Umzug auf **Vercel**. Das ist ein Fehler im geprüften
   Text, den ich nicht ändern darf — bitte beim Anwalt mitnehmen.
3. **„4×100 Lighthouse"** steht als Aussage über die eigene Seite auf der
   Startseite. **Jetzt gemessen: die Startseite liegt bei 68**, gebunden an
   1.493 ms Skriptauswertung für ~2.140 React-Elemente. Die Zahl stammt vom
   v3-Build und ist für diesen nicht belegt. Entweder die Aussage geht von der
   Seite, oder die Startseite wird anders gebaut. Die vier statischen
   Unterseiten liegen bei 100.
4. **„Tech-Notizen"** in der Fusszeile zeigt auf `#` — toter Platzhalter aus dem
   Entwurf.
5. **Das Bestätigungs-Postfach prüfen.** Im Postfach liegt eine Nachricht
   „[AUTOMATISCHE PRUEFUNG] Kontaktformular mccain-digital.com". Kommt sie an,
   ist der Kanal beweisbar in Ordnung. Kommt sie **nicht** an, obwohl die API
   `success: true` gemeldet hat, stimmt etwas an der Web3Forms-Zustellung — dann
   bitte Bescheid geben.

### Geplant, noch nicht gebaut

Eine **About-Seite** und **Projektseiten — die erste für whatever-recall**,
dessen Inhalt und URL auf diese Domain geholt und umgeleitet werden sollen.
recall ist stark geschrumpft, damit ist eine Projektseite hier der richtige Ort
statt einer eigenen Domain.

`tools/build_sitemap.py` trägt die Liste; sie verweigert den Bau, wenn eine
gelistete Datei fehlt **oder** eine vorhandene `.html` nicht gelistet ist.

### Zwei Befunde, die ich bewusst NICHT angefasst habe

Beide sitzen in der Claude-Design-Komponente, nicht in der Auslieferung:

- **Der Startseite fehlt ein `<main>`-Landmark** (Lighthouse A11y 99 statt 100).
  Richtig wäre, im Template die Sektionen zwischen Kopf- und Fusszeile in
  `<main>` zu fassen. `role="main"` auf `#dc-root` wäre **falsch** — dort stehen
  Kopf- und Fusszeile mit drin.
- **Der Brand Guide liegt bei A11y 91**: Bilder ohne `width`/`height`,
  Kontraste, und Links im Fließtext ohne nicht-farbliche Unterscheidung.

Beides sind Eingriffe in Fremd-Markup mit echtem Risiko, für eine Nacht ohne
Rückfrage zu viel. Wenn sie gemacht werden, gehören sie in
`tools/patch_export.py`, damit ein frischer Export sie nicht verschluckt.

### Historie unterhalb dieser Zeile

Alles ab hier ist **älter** und beschreibt teils die v3-Seite. Der aktuelle
Stand steht vollständig oben.

### Zuletzt gebaut: der Anzeigengrad, dritte Runde

Owner: „ist die font size ueberall viel zu gross, das sieht alles so riesig aus."
**Es war die dritte Meldung derselben Sache** — der Kommentar ueber `--t-display`
haelt die zwei frueheren fest. Beide Male wurde EIN Token bewegt und die Schicht
dazwischen blieb stehen. Gemessen (index, 1440×900): eine h1 mit 96 px, **acht**
h2 mit 58 und **zwoelf** h3 mit 43 — zwanzig Ueberschriften, keine unter 43 px,
ueber Fliesstext mit 16,4. **Der Fliesstext war nie das Problem und ist unangetastet.**

Jetzt bei 1440 / 1920×1080: h1 **74 / 88** (war 96,5 / 128), h2 **44 / 46**,
`.case-h` 33 / 35, `--t-h3` 24, `--t-body` 16,96 (war 18,88). Reihe bei 1440:
74 / 44 / 33 / 24 / 16,4 / 12. **Alle clamp-Untergrenzen unberuehrt** — 390 misst
h1 41,6 / h2 30,4 / Text 16, bitgleich zu vorher.

Der Umbau liegt als `tools/type_rescale.py` im Repo (15 gezaehlte Ersetzungen,
bricht vor dem Schreiben ab, wenn ein Muster nicht genau einmal trifft — hat es
getan). Nachmessen jederzeit mit `node tools/type_scale.mjs 1440 1920x1080 390`;
Bilder zum Draufschauen mit `node tools/shots.mjs <ordner> 1440 index.html`.

**Nicht skaliert, mit Grund:** `.display--fill` (Groesse ist Containerbreite ÷
Zeilenbreite bei 1em, eine gemessene Fuell-Zusage) und `.scard-ghost`
(angeschnittene Deko-Ziffer). Wer hier nachjustiert, laesst beide in Ruhe.

### Und: die Kontaktseite ist jetzt von der Startseite aus erreichbar

`contact.html` fehlte nie und ist auch nicht mehr das Altdesign (Audit AW-4 vom
2.9. ist ueberholt). Sie war nur von **index** aus praktisch unerreichbar: jede
andere Seite endet ihre Fusszeile mit `Work · Services · AI · Contact`, die
index-Spalte „Studio" ist genau diese Zeile — und hatte kein Contact. Einziger
Weg war ein Satz im Formular-Hinweis. `check_links` war dabei die ganze Zeit
gruen: neun andere Seiten zeigen ja hin. **Ein Link-Pruefer beantwortet „zeigt
irgendwer hierhin", nicht „kommt man von der Startseite hin."**

Der Nav-Knopf „Start a project" zeigt auf index weiterhin bewusst auf den Anker
`#contact` — das Kurzformular steht auf der Seite, die lange Fassung ist einen
Klick weiter. Falls das vereinheitlicht werden soll, ist es ein Owner-Entscheid.

**Die Werkzeuge laufen nicht mehr auf `agent-browser`** — der haengt auf diesem
PC an `set viewport`, an zwei getrennten Tagen, auch nach voller Bereinigung.
Beide Browser-Tore liegen jetzt auf `playwright-core`; die Sonden
(`probe.js`, `accent_audit_probe.js`) sind unveraendert und bleiben der einzige
Ort der Messlogik. **Einmal je Maschine:** `npm --prefix tools install`.

```
python prodserve.py 8898 --dev      # ANSEHEN  — gzip, no-store
python prodserve.py 8897            # MESSEN   — Produktions-Header, echter Cache
bash tools/sweep.sh 1280 820        # 11 Seiten: Fehler, Ueberlauf, A11y-Basics
bash tools/sweep.sh 390 844         #   ... und auf dem Telefon
bash tools/accent_audit.sh          # jeder Akzent-Textknoten gegen seinen echten Grund
python tools/check_links.py         # Links, Anker, doppelte IDs

node tools/type_scale.mjs 1440 1920x1080 390    # der GEMALTE Schriftgrad je Seite
node tools/shots.mjs <ordner> 1440 index.html   # Bilder zum Draufschauen

# Beide Browser-Tore laufen auch gegen live — der schnellste Deploy-Test:
MCD_BASE=https://mccain-digital.vercel.app node tools/sweep.mjs
```

**Was heute gebaut wurde** steht in den drei ⚡-Bloecken darunter: Bildwelle,
Welle 2 „Luft", die Tore auf Playwright, vier Owner-Entscheide (Light-Modus raus,
Bavaria, „Placeholder"-Wort raus, Kapitelumbau abgesagt), Gelb aus der wandernden
Verlaufsfarbe, das schwarze Loch aus (05), und sieben Punkte auf den
Service-Seiten inklusive Kommando-Menue.

### Gelb auf Papier — ERLEDIGT, entgegen meiner eigenen Notiz

Ich hatte das mehrfach als offene Owner-Entscheidung gefuehrt. **Nachgemessen am
Ende des Tages ueber alle 11 Seiten, jedes Blatt-Element auf jedem Papierband:
es gibt keine gelbe SCHRIFT auf Papier mehr.** Null `#806400`. Die 16
`.cap-meta`-Zeilen waren die letzten.

Gelb auf Papier existiert noch **9×, ausschliesslich als Flaeche mit
fast-schwarzer Schrift darauf (11,99:1)** — die fuenf Score-Chips in (03) P.S.
auf der Startseite (`.score b`) und der Abschluss-CTA je Service-Seite. Das ist
exakt die Regel, die der Befund empfohlen hat („Gelb ist auf Papier Flaeche, nie
Schrift"). **Da muss nichts passieren.**

**Zwei Reste, beide klein, beide Owner-Entscheid:**

1. `.band--paper` bildet weiterhin `--acc-text: var(--acc-ink)` ab. Heute malt
   damit nichts mehr Text — aber das naechste `color: var(--acc-text)` auf einem
   Papierband holt das Senfgelb lautlos zurueck. **Eine Zeile** (`--acc-text:
   var(--fg)` in dem Block) macht aus dem Zustand eine Regel und aendert optisch
   heute exakt nichts.
2. `services/websites.html` druckt `(03)` zweimal in `#5c6b00` (Farbton 68,
   dunkles Oliv, 5,26:1). Das ist **nicht** das Logo-Gelb, sondern die eigene
   Signalfarbe dieser Seite — der einzige der vier Signale, der auf Papier
   Richtung Senf kippt. Die vier Signalfarben sind im Befund weiterhin
   unbestaetigt.

### Naechste Welle (Owner-Wahl vom 10.9.)

„Struktur bleibt" — der Kapitelumbau der Startseite ist **abgesagt**, nicht
verschoben. Stattdessen: **die vier Service-Signatur-Module** gegen „die vier
sehen alle gleich aus" (97–98 % Skelett-Aehnlichkeit gemessen). Der Befund nennt
sie: ai-tools = die Konsole als eigenes Band · web-apps = Zeitleiste Tag 1 → Tag
7 → Woche 6–12 · websites = „This page, audited" (Score-Tabelle +
Gewichtsbalken statt Stockfoto) · software = Vorher/Nachher der Systeme, die
nicht miteinander reden. **Empfohlener Start: websites** — ersetzt ein Stockfoto
durch echte Daten, braucht aber vorher einen frischen Lighthouse-Lauf, weil sich
die Seitenhoehen geaendert haben.

**Kleinkram, offen:** LlamaIndex ist die einzige Pille ohne Marke (keine in
simple-icons) — wenn der Owner eine Datei liefert, ist es ein Handgriff.

---

> ⚡ **NACHTRAG 2 (10.9. abends): sieben Owner-Punkte, alle gebaut und
> nachgemessen** — `e34aa26` `63ff3cc` `9193483` `f54c46f`.
>
> 1. **Der Hero der Service-Seiten flackerte nicht, er war GERUEST.** Kalt
>    gemessen: FCP ~1130ms, `common.js` bei ~1100ms (drittes defer-Skript,
>    wartet auf 140KB Engine), Sequenz haelt alles auf 0 und ist erst bei
>    ~2400ms fertig. Bis dahin sieht man nur `.guides`, die vier `gmark` und
>    die `.hero-side`-Striche — das sind die „Linien". Die Choreografie prueft
>    jetzt FCP **und** `performance.now() > 600`; beides heisst „ueberfaellig",
>    und ueberfaelliger Inhalt wird gezeigt, nicht choreografiert. Warm
>    (Paint 72–80ms) bleibt das Schauspiel.
> 2. **Ein Rahmen.** `.uc` hatte 2px Signalstrich links UND einen Ring in 40 %
>    Logo-Gelb. Strich weg, Ring traegt die Signalfarbe. `.cap` genauso, beide
>    zusaetzlich auf `:focus-within`.
> 3. **Kein Senf in (03).** `.cap-meta` lief auf `--acc-text` → auf Papier
>    `#806400`, 16 Knoten. Jetzt `--fg`; **nachgemessen: null `#806400` auf der
>    ganzen Seite.** Was die Sonde auf `websites` noch meldet, ist deren eigene
>    olivgruene Signalfarbe — andere, weiter offene Frage.
> 4. **„The core five" nicht mehr gestreckt** (`space-between` → gruppiert).
> 5. **45 von 55 Pillen tragen jetzt ihre echte Marke** — 31 neue SVGs aus
>    simple-icons (CC0) in `img/logos/`, eine generierte Regel je Datei. Die
>    zehn ohne sind Faehigkeiten und Formate („Role-based access", „WebP /
>    AVIF", „llms.txt" …) plus LlamaIndex, das keine oeffentliche Marke hat.
> 6. **Pacman beisst nicht mehr in den CTA.** Mit dem Biss fielen der
>    `.nav .btn`-Lookup und die `ctaBox`-Messung, die nur ihn fuetterten.
> 7. **Das Kommando-Menue war in Fliesstextgroesse gesetzt.** Es setzte
>    NIRGENDS eine `font-size`, erbte also `--t-body` (18,88px): Panel
>    **1040×828** auf 900px Viewport, Zeilen 52px, 175px Chrome. Jetzt eigenes
>    Token **`--t-ui`** (15,2px) auf dem Panel, ein Balken statt zwei, Zeilen
>    34px, Panel **880×620**, Vorschau-Ueberschrift 19px statt 32.
>    **Zwei Fallen dabei:** der 18px-Verlauf am Listenende braucht 26px
>    Bodenpolster (Verlauf MUSS kleiner sein als das Polster, sonst dimmt er
>    die zuletzt erreichte Zeile), und die 16px-Touch-Regel gegen den
>    iOS-Fokus-Zoom steht 500 Zeilen weiter oben bei **gleicher Spezifitaet** —
>    gemessen stand `#cmInput` auf 390 bei **13,76px**, jedes andere Feld bei
>    16. Hinter der zu schlagenden Regel wiederholt.
>
> **Tore nach jedem Schritt gruen:** `sweep` 11 Seiten auf 1280×820 **und**
> 390×844, `accent_audit` 6 Seiten, `check_links`. `main` steht **18 vor
> `origin/main`**, nicht gepusht.

> ⚡ **NACHTRAG (10.9., `1ceb658`): die wandernde Verlaufsfarbe hat kein Gelb
> mehr.** `--wave-stops` ist die einzige Quelle fuer jeden bewegten Verlauf der
> Seite (Konsolenrand, Nav-Statuspille, Nav-CTA, die (05)-Aussage, jedes „AI" in
> einer Ueberschrift) — eine Zeile, alle Stellen.
> **Drei Stops zu loeschen ging nicht:** die alte Liste war eine volle
> Farbtonrunde, die auf dem Logo-Gelb schloss, damit die Wiederholung keine Naht
> hat. Nimmt man das Gelb aus einer Runde, sind die losen Enden Koralle und
> Gelbgruen — und der kuerzeste Weg dazwischen laeuft ueber Oliv und Sandbraun,
> also genau die Brauntoene, die verboten sind. **Jede Liste, die die Luecke
> schliesst, erfindet die Farbe neu, die raus sollte.**
> Deshalb ist es keine Runde mehr, sondern eine **Reise hin und zurueck**: Gruen
> an beiden Enden, die kalte Haelfte dazwischen, Koralle als einzige warme Wende
> in der Mitte. Symmetrisch, also nahtlos **durch Bauart** statt durch die Wahl
> der Schlussfarbe. Gleiche 480px-Periode, gleicher 40px-Takt — `--rim-shift`,
> `--rim-cycle` und die Geometrie in `paintRimPalette` unangetastet.
> Gemessen: Farbtoene 149 · 177 · 207 · 234 · 269 · 304 · 11 und zurueck, nichts
> im Gelbband (38–72°), auch nicht in den zehn abgeleiteten Bandlisten. **Der
> dunkelste Stop ist unveraendert** (`#a86ee8`, 5,68:1 gegen das Fast-Schwarz des
> Nav-CTA) — raus kamen die HELLSTEN Stops.
> **Weiterhin gelb, richtig so:** Wortmarke, Konsolen-Tab, Sende-Knopf,
> Pacman-Linie — das ist `--acc`, nicht die Welle. **Ebenfalls weg:**
> `--wave-stops-quiet`, nie referenziert (Audit FX-8).

> ⚡ **NACHTRAG (10.9., `2fb4791`): das schwarze Loch auf der (05)-Aussage ist
> raus.** Owner: „das sieht echt nicht gut aus." `PixelFX.voidReveal` lief auf
> der Studio-Aussage — weg aus allen drei Stellen: `.vr-host` im Markup, der
> Bau-und-Beobachte-Block in `common.js` (der einzige Aufrufer) und die vier
> `.vr-*`-Regeln in `v3.css`. **An der Aufrufstelle entfernt, nicht aus der
> Engine:** `voidReveal` wird weiter gebaut und exportiert, es kommt mit einer
> Klasse und einem Block zurueck. **Nicht angefasst, weil andere Effekte:** das
> Zeiger-Loch auf den Bildern (`PixelFX.image`) und die wandernde Wellenfarbe auf
> derselben Aussage (`data-wavetext` am Band).
> **Eine Falle:** der Block endete mit der `}`, die das umschliessende `if`
> schloss — bis zur naechsten Abschnitts-Ueberschrift zu schneiden nimmt sie mit.
> `node --check common.js` nach jedem Block-Ausbau, die Seite haette sonst nur
> einen Konsolenfehler gezeigt.

> 🔴 **VIER OWNER-ENTSCHEIDUNGEN vom 10.9., alle umgesetzt (`3383e78`) — und EINE
> davon hat nicht getan, was sie sollte.**
>
> 1. **„Struktur bleibt."** Die Startseite behaelt ihre neun Kapitel. Der
>    Kapitelumbau (9→7, −19 % Hoehe) ist **abgesagt**, nicht verschoben. Damit
>    bleibt die Seite auf der Laenge, die Welle 2 ihr gegeben hat. Stattdessen
>    gewuenscht: **die Service-Seiten weiter** — je Raum ein Signatur-Modul, gegen
>    „die vier sehen alle gleich aus" (97–98 % Skelett-Aehnlichkeit gemessen).
>    **Das ist die naechste Welle.** Der Befund nennt die vier Module:
>    AI-tools = die Konsole als eigenes Band · web-apps = Zeitleiste Tag 1 → Tag 7
>    → Woche 6–12 · websites = „This page, audited" (Score-Tabelle +
>    Gewichtsbalken statt Stockfoto) · software = Vorher/Nachher der Systeme, die
>    nicht miteinander reden.
> 2. **Light-Modus komplett raus.** Erledigt: `html[data-theme="light"]` weg, der
>    dunkle Block liegt auf `:root`, Umschalter + Icons + `data-theme` + der
>    `<head>`-Schnipsel raus aus allen elf Seiten, Theme-Code aus `common.js`, und
>    die Tore laufen jede Seite nur noch einmal.
>    **ABER: das Braun ist NICHT weg.** Es war als Antwort auf die
>    Gelb-auf-Papier-Frage gemeint, und es beantwortet sie nicht. Nach dem Ausbau
>    gemessen: **16 Knoten `#806400`** (`--acc-ink`) auf `span.cap-meta`, vier je
>    Service-Seite, **alle auf `.band--paper`**. Papierbaender sind der Tonplan
>    INNERHALB des einen Themes — der Ausbau hat den Umschalter entfernt, nicht das
>    Papier. **Offen bleibt genau die alte Frage:** Gelb als Marker hinter
>    Ink-Schrift, oder auf Papier gar keine farbige Schrift. (Nicht mitgezaehlt:
>    `#a4bd00` / `#5c6b00` auf der websites-Seite — das ist ihre olivgruene
>    Signalfarbe, eine andere Frage.)
> 3. **„Placeholder"-Wort raus, Bilder bleiben.** Fuenf Bildunterschriften und
>    fuenf Alt-Texte. Die Alt-Texte beschreiben jetzt das Bild, ohne zu behaupten,
>    es sei unseres; die software-Unterschrift wurde umformuliert, damit der Satz
>    sein Argument selbst traegt statt auf ein Stockfoto als Beleg zu zeigen.
>    **Weiterhin „Placeholder", mit Absicht:** die zwei leeren Work-Cases — dort ist
>    das Wort richtig, es ist keine Unterschriften-Marotte.
> 4. **Keine Koordinaten, „Bavaria".** Der Hero druckte die Muenchner Innenstadt,
>    waehrend Impressum, JSON-LD und `llms.txt` 86869 Oberostendorf sagen. Hero und
>    Marquee sagen jetzt beide Bavaria — englische Schreibung, weil die Augenbraue
>    eine Zeile darueber schon „Bavaria" sagte und `addressRegion` im JSON-LD auch.

> ⚡ **NEUESTES (10.9., PC): die Bildwelle ist zu, die Luft ist drin — und die
> zwei Browser-Tore laufen wieder.** Vier Commits — `a003742` `a8ec5a8` `353a174`
> `fe17ac9` — plus das eine vom 5.9., das schon vorlag: `main` steht **5 vor `origin/main`
> und ist NICHT gepusht** (die weiteren sind Doku und die tools-Lockdatei).
>
> **`a8ec5a8` — ein Tor, das man nicht laufen lassen kann, ist kein Tor.**
> `agent-browser set viewport` haengt auf diesem PC: keine Ausgabe, kein Exit,
> kein Fehler. Es hat das jetzt an **zwei verschiedenen Tagen** getan und die
> komplette Bereinigung ueberlebt — 10 verwaiste Chrome-Prozesse nach
> `CommandLine` gefiltert und beendet, 7 abgestandene Daemon-Dateien geloescht,
> frischer Session-Name. Damit waren `sweep` und `accent_audit` unbenutzbar, und
> jede Welle danach haette auf einem Argument statt auf einer Messung
> ausgeliefert. Die Orchestrierung liegt jetzt auf `playwright-core`, **die
> Sonden nicht**: `probe.js` und `accent_audit_probe.js` sind weiterhin der
> einzige Ort, an dem die Messlogik steht, werden weiterhin von der Platte
> gelesen und woertlich ausgewertet — gleiche Zahlen, anderer Treiber.
> `tools/browser.mjs` sucht das Chromium selbst (hoechster `ms-playwright`-Build,
> je Plattform, `MCD_CHROME` sticht). Die `.sh`-Dateien bleiben als duenne
> Huellen, weil jede Notiz in HANDOFF und TODO sie so nennt, und installieren
> `tools/` beim ersten Lauf. **Einmal je Maschine:** `npm --prefix tools install`.
> Neu: `sweep` **faellt jetzt durch** — Querueberlauf, fehlendes `alt`, ein Knopf
> ohne Namen oder eine h1-Zahl ungleich 1 wurden vorher gedruckt und bestanden.
>
> **`a003742` — die Bildwelle, und der Grund, warum sie hier endet.** index (08)
> Prozess bekommt das Bild in die leere rechte Haelfte (`.process-grid`, an der
> Linie des ersten Schritts ausgerichtet, **bewusst nicht sticky**: der Wrap
> traegt `.fx-out`, und ein `transform` am Vorfahren nimmt einer sticky-Box den
> Bezug). Die vier Service-Seiten bekommen einen 3/1-Streifen zwischen
> Use-Case-Gruppe A und B — das hoechste Band der Seite und ihr einziger
> Engine-Moment zwischen Hero und Proof; auf 390 wieder 16/10.
> **Der Fotovorrat ist damit aufgebraucht** — alle sechs Fotos in `img/` sind
> platziert. Jeder weitere Bildplatz heisst entweder ein Foto zweimal zeigen oder
> die Grafiken aus „Text, der Bild werden will" bauen (Prozess-Zeitleiste,
> Score-Quittung, Gewichtsbalken, Stack als Markenreihe). **Jede Bildunterschrift
> sagt „Placeholder", jeder Alt-Text auch** — es sind Stockfotos, und die Seite
> behauptet nichts anderes. Gleiche Regel wie bei den drei leeren Zitat-Slots.
>
> **`353a174` — Welle 2, die Luft (LUFT-1 + LUFT-2).** Die Enge sass innen:
> `--t-body` wurde in der ganzen Datei **zweimal** benutzt, `--t-small`
> **42-mal** — jede Karte, jeder Schritt, jede Notiz las 14,24 px (12,8 auf 390)
> ueber 62–78 Zeichen. Neues `--t-copy: clamp(.95rem, .25vw + .8rem, 1.05rem)`
> (1440: 16,4 · 1920: 16,8 · 390: 15,2) auf den 14 Fliesstext-Selektoren,
> `max-width: 58ch` auf Karten- und Notiztext, Innenluft eine Stufe hoch.
> Gemessen auf vier Seiten: **alle 14 Selektoren 14,24 → 16,40 px**, laengstes
> Mass **78 → 58 Zeichen**, typisch 67 → 57.
>
> **Die Bildunterschrift brauchte eine eigene Antwort.** Unter dem neuen
> 3/1-Streifen lief sie **152 Zeichen** pro Zeile, und ein `max-width` haette die
> graue Platte mitgeschrumpft — ein halber Balken unter einem vollbreiten Bild.
> Der Deckel sitzt deshalb auf dem Polster: `padding-right: max(1.1rem, 100% -
> 58ch - 1.1rem)`. Das Prozent bezieht sich auf die Platte, das `ch` auf die
> eigene Schrift der Unterschrift, und wo die Platte schmaler ist als das Mass
> faellt `max()` auf das normale Polster zurueck. Gemessen: Platte 1325 px,
> Textspalte 582 px = 58ch, laengste gemalte Zeile 54ch. **Kein Wrapper-Element.**
>
> **Die Seite ist dadurch LAENGER geworden, nicht kuerzer:** index +272 px,
> contact +168, ai-tools +521, websites +398. Der Befund schaetzte „±0 bis
> −250 px" — das galt fuer den *strukturellen* Teil mit (Baender verschmelzen,
> Proof auf die Zitat-Slots schrumpfen). Der Teil ist LUFT-4 bis LUFT-8 und offen.
>
> **`fe17ac9` — LUFT-8, und was daran nicht stimmte.** Das Bodenpolster der
> letzten sticky-Karte ist der Abstand zu einer Karte, die es nicht gibt. Gemessen
> Inhalt zu Inhalt, services → studio: **252 px** (33 unausgefuellter Rest des
> Kartenpolsters + 17,6 dieses Polster + 2 × 100,8 die zwei Baender), jetzt 235.
> **Der Befund nannte 282 px und „wird Normalabstand" — beide Zahlen liessen sich
> nicht reproduzieren.** Das Loch ist echt, es ist kleiner, und eine Deklaration
> schliesst es nicht.
>
> **ALLE TORE GRUEN** nach jeder Welle: `accent_audit` 6 Seiten × 2 Themes, 0
> echte Fehler; `sweep` 11 Seiten auf 1280×820 **und** 390×844, keine
> Seitenfehler, kein Querueberlauf; `check_links` sauber. Im Browser angesehen:
> Prozessband und Use-Case-Band auf 1440 und 390, hell und dunkel.
>
> **NAECHSTE WELLE — und die Entscheidung davor.** Was ohne den Owner geht, ist
> jetzt duenn: LUFT-4 bis LUFT-7 sind Strukturaenderungen (Baender verschmelzen,
> Score als Ringe, Marken-Rail zu Studio, Proof auf die Zitat-Slots) und haengen
> auf der Startseite am Kapitelumbau, der laut Befund die Owner-Entscheidungen
> braucht. **Die acht offenen Punkte stehen unveraendert im Befund
> (§Owner-Entscheidungen)** — Gelb auf Papier, Farbe je Service-Seite, Preisspannen
> oeffentlich, Konsole auf die AI-Seite, Proof als Kapitel, Hero-Koordinaten,
> Zahlen aus Pixeln, die acht DE-Fragen.

> ⚡ **NEUESTES (5.9., PC): der Design-Befund liegt vor, und die erste Welle daraus ist gebaut.**
>
> **Lies zuerst [`DESIGN-BEFUND.md`](DESIGN-BEFUND.md).** Der Owner hat vier Klagen genannt —
> zu bildarm, zu viel Textstapel, zu wenig Luft, die vier Service-Seiten sehen gleich aus („die
> Infos aber nicht raushauen") — plus „die Mainpage nochmal unter die Lupe" und „wir brauchen eine
> DE-Loka". Sieben Analyse-Linsen haben die Seite dagegen vermessen: **56 Befunde**, roh in
> `audit/2026-09-05-design-befunde.md`, Dichtekarte je Band in `audit/2026-09-05-dichtekarten.md`.
>
> **Die Gegenlese ist NICHT gelaufen** — alle 35 Skeptiker-Agenten sind am Sitzungslimit gestorben.
> Zwoelf tragende Punkte habe ich selbst nachgemessen, nur die stehen als Tatsache da (Tabelle im
> Befund). Alles andere traegt den Vertrauensgrad seiner Linse. **Zwei Linsen fehlen ganz** (Bilder,
> Mobil) — es gibt keinen eigenen Mobil-Befund, LM-5 bis LM-9 und UI-5 sind weiterhin ungeprueft.
>
> **`c2ca0dd` — die erste Welle: vier Raeume hinter vier Tueren, und ein Feld, das man sieht.**
>
> - **Das Dither-Feld hinter fuenf Heros hatte zwei Farben.** `dsmooth(0.52, 1.02)` sperrte oberhalb
>   dessen, was das Rauschen erreicht (`cloud + wave` laeuft -0,10 bis 0,64, Mittel 0,342). Gemessen:
>   84,7 % `rgb(11,11,12)` und 15,1 % `rgb(20,20,21)` — **neun Werte von 255 auseinander**, sechs
>   Palettenstufen gebaut, zwei benutzt. Jetzt 0,30/0,78 (aus einem Histogramm der echten Geometrie,
>   nicht nach Augenmass): 43,0 / 27,9 / 14,4 / 8,9 / 4,7 / 1,1. **Der Kontrast wandert nicht mit** —
>   der Deckel in `ditherRamp` sitzt auf der PALETTE, nicht auf der Verteilung. Schwelle ist jetzt
>   eine Option (`data-dither-lo/hi`).
> - **Ein Signal je Service-Seite**, nach der Zwei-Gewichte-Regel von Gelb und Gruen, weil kein
>   einzelner Wert auf beiden Gruenden AA schafft: ai-tools `#3fc9c2` (Ink 9,69 / Papier `#0b6660`
>   6,07) · web-apps `#5b2eff` (Ink `#8b6bff` 5,29 / Papier 5,71) · websites `#7a8c00` (Ink `#a4bd00`
>   9,24 / Papier `#5c6b00` 5,26) · software `#ff3d8a` (Ink 5,89 / Papier `#c2004d` 5,51). Es traegt
>   Augenbrauen-Strich, Kapitelnummern, Gruppenziffern, Capability-Chips, die Hover-Linie der
>   Use-Case-Karten, die Proof-Zahlen — **und das Hero-Feld** (`data-dither-token="--svc"`).
>   **Das H1-Akzentwort bleibt Logo-Gelb**, absichtlich: die Marke behaelt den ersten Viewport.
> - **Die Farbe beginnt auf der Startseite.** Jede `.scard` setzt ihre eigenen Tokens, die Tuer hat
>   die Farbe des Raums dahinter.
>
> **`783c8b1` — AP-4/AP-5:** Fokus-Indikator in Zwangsfarben (box-shadow wird dort nicht gedimmt,
> sondern fallen gelassen — die Felder hatten GAR keinen), Name fuer `#cmInput`. UI-6 war ein
> Fehlalarm. **`8a17735`** — der Theme-Knopf nennt sein Ziel.
>
> **DREI FALLEN, die das gekostet hat:**
>
> - **Ein Waechter, der nur eine Farbfamilie kennt, meldet null Fehler ueber eine Farbfamilie.**
>   `isAccent()` beschrieb Gelb/Gold ueber die Kanaele; Gruen, Violett, Pink und sogar `--sig-text`,
>   das die Seite schon ausliefert, fielen durch. Die Canvas-Haelfte prueft `.ph canvas` — davon gibt
>   es repo-weit **null**. Gruen auf nichts, zweimal. Jetzt Vereinigung aus Familie UND Token-Naehe
>   (Union, nicht Ersatz: Token allein mass neun Knoten WENIGER auf index), plus eine Pruefung des
>   Dither-Felds gegen den duennsten Text des Bandes.
> - **Eine Kontrast-Insel muss JEDES Signal neu erklaeren, nicht zwei von dreien.** Genau daran fiel
>   die erste Fassung der Kapitelnummern: 1,90:1 auf Papierbaendern im dunklen Theme, 3,33:1 auf
>   Ink-Baendern im hellen. Das geschaerfte Gate hat es gefangen, bevor es live ging.
> - **Eine Regel kann jahrelang auf nichts zeigen.** `.label b` war gestylt, die Kapitel-Labels
>   hatten gar kein `<b>`. 29 Nummern nachgezogen. Ebenso: `.scard-ghost` war gezeichnet, platziert
>   und dann auf `opacity: 0` gesetzt bis zum Hover — auf Touch existierte es nie, und sein
>   Ruhezustand stand mit 55 von 153 px ausserhalb einer Karte mit `overflow: hidden`.
>
> **OFFEN — Owner-Entscheidungen** (vollstaendig im Befund, §Owner-Entscheidungen): Gelb auf Papier
> (es gibt mathematisch **kein** lesbares Gelb auf Papier, das nicht braun ist — Hue 47 braucht
> Helligkeit ≤26 % fuer 4,5:1; Ausweg ist Gelb als Flaeche statt Schrift), Farbe je Service-Seite
> bestaetigen, Preisspannen oeffentlich, Konsole auf die AI-Seite, Proof als Kapitel aufgeben,
> Hero-Koordinaten (zeigen auf Muenchen, die Firma sitzt 70 km weiter in Oberostendorf), Zahlen aus
> Pixeln, und die acht DE-Fragen.
>
> **NAECHSTE WELLE:** die Bildplaetze in den bildlosen Baendern (7 von 11 auf index, 10 von 11 auf
> den Service-Seiten). Die Engine ist auf `.shot > .shot-img > img` schon verdrahtet — es braucht
> keine JS-Zeile, nur Markup. Danach: Luft (`--t-copy`, 58ch), dann der Kapitelumbau der Startseite.


> ⚡ **Der VORMITTAG in drei Commits** (auf dem Mac). Der Abend steht im Block darunter und
> brachte acht weitere — die Arbeitsliste dazu ist `TODO.md`, und die reist mit.
> Details mit allen Messwerten: `CHANGELOG.md` (reist NICHT mit, siehe unten).
>
> 1. `a4ddb84` — Audit-Punkte 1-3: CTA-Hover war beim Hovern unsichtbar, `--d-micro`/`--d-ui`
>    waren nie definiert (fuenf Uebergaenge liefen auf 0s), Index-Footer brach unter 760px.
> 2. `7dea153` / `f75b557` — **das Wort „AI" traegt die Welle**, ueberall wo eine Ueberschrift
>    es sagt, plus Hero-Fliesstext, Footer-Link, Nav und Befehlsmenue. In der Nav und im Menue
>    ist **Weiss die Basis** (Owner-Entscheidung), sonst die gegen den eigenen Grund getoente Welle.
> 3. Diese Runde — Nav entschlackt (`⌘K` raus, kein Ring am Menue-Button, mehr Luft), eigene
>    Scrollbalken, Ziffern auf den Service-Seiten solid statt hohl-braun, Kunden-Reihe laeuft
>    unter 760px als Ticker, „AI tools" in der Service-Liste (04) mit Verlauf.
>
> **Drei Fallen, die das gekostet hat — sie gelten weiter:**
>
> - **Eine laufende CSS-Animation ueberschreibt Inline-Styles.** Zum Testen erst
>   `animation: none`, sonst misst man die alte Phase.
> - **`getComputedStyle` liefert einen animierten Wert als `calc(0% + 358.054px)`**, nicht als
>   Laenge. `parseFloat` faellt still auf 0 zurueck.
> - **`will-change: transform` befoerdert ein Element auf eine eigene Ebene**, in die das
>   `background-clip: text` des Elternelements nicht hineinreicht. Ein Wort kam dadurch leer
>   heraus. Der Verlauf muss auf dem Element sitzen, das die Glyphen wirklich malt.
>
> **Und zwei ueber das Messen:**
>
> - **`--bg` ist eine Deklaration, nicht der gemalte Grund.** `groundOf()` in `common.js` sucht
>   jetzt den ersten Hintergrund, der wirklich deckt.
> - **Die Nav hat keinen aus dem DOM ableitbaren Grund.** Ihre dunkle Leiste ist `.nav::before`
>   und im Ruhezustand `opacity: 0` — dann steht sie ueber dem Hero, einem **Geschwister**.
>   Sonde und Laufzeit messen dort gegen `--ink`, weil das Design es zusichert.
>
> **`tools/accent_audit.sh` faellt unter Last aus — und zwar an einer Stelle:**
> `contact.html [dark]`, mit `accent nodes 0` und „NOTHING MEASURED", **nie** mit einem
> Kontrast-Fund. Das ist die Seite mit den 4 verbliebenen `data-pixel`-Rastern, dem teuersten
> Boot im Repo. Verschwindet vermutlich mit Audit-Punkt 4/7. **Ein FAIL mit „NOTHING MEASURED"
> ist kein Kontrast-Fund** — erst nachsehen, welche Zeile es ist.
>
> **OFFEN, Owner-Entscheidung:**
>
> 1. **Das Braun ist nicht ueberall weg.** Auf Papier toent `legibleStops` die Welle so weit
>    herunter, dass ihr gelbes Ende als Senf landet — „Map where **AI** actually pays off" steht
>    dort goldbraun. Die Ziffern sind erledigt, der Rest ist eine Systementscheidung: entweder das
>    warme Ende der Welle auf Papier neutralisieren, oder dort eine Tinten-Basis mit Farbschimmer
>    fahren (das Gegenstueck zur Weiss-Basis in der Nav).
> 2. **Das Kontaktformular ist noch nicht angepasst.** Owner: „das sind die gleichen Daten wie
>    beim Kontaktformular auf mccain-digital.com". Die alte Seite muss dafuer abgeglichen werden.
>    Haengt an Audit-Punkt 4 (`contact.html` ins neue System), der weiter offen ist.

> ⚡ **NEUESTES (4.9. abends, PC): sechs Wellen, der P0-Block ist zu.**
> **Die Arbeitsliste steht in [`TODO.md`](TODO.md)** — sie reist mit, im Gegensatz zum CHANGELOG,
> und trägt zu jedem Punkt die Messwerte. Hier nur, was jemand ohne sie wissen muss.
>
> `4f78fe9` TODO angelegt · `5a132f3` contact + 404 + Formulare · `ab66ee8` Prozess-Kapitel +
> Anti-Fit-Tab · `7ec92c3` Touch-Ziele · `f97788c` voidReveal · `80e3f00` Konsolen-„A" ·
> `988975f` View Transitions + Menü auf 390 · `9fe2c41` Skip-Link + Reduced Motion.
>
> **Der Kauf-Funnel läuft im neuen System, und beide Formulare senden wirklich.** Die Mechanik war
> nicht zu bauen — sie lag in `old/upload/contact.js`, der Fassung, die auf `mccain-digital.com`
> steht. Eine Sendefunktion in `common.js`, zwei Mounts: Startseite 3 Fragen, Kontaktseite 6,
> fehlende Felder gehen als „—" mit. Erfolgs- und Fehlerpfad mit abgefangenem `fetch` geprüft,
> ohne echte Anfrage. **Die eine Ermessensentscheidung:** die alte Seite bot sieben Projekttypen
> an, die Seite verkauft heute vier Leistungen — der Feldsatz ist identisch, die Optionen spiegeln
> das aktuelle Angebot. Eine Zeile genügt, wenn die alten sieben zurück sollen.
>
> **`data-pixel` ist auf den Live-Seiten bei 0** — und das hat eine gemessene Folge, die diese
> Datei vorhergesagt hat: `tools/accent_audit.sh` fiel auf `contact.html [dark]` immer mit
> „NOTHING MEASURED" aus. Die vier Raster waren die Ursache. Jetzt `accent nodes 18, failing 0`.
>
> **Die Aufräum-Falle von Audit-Punkt 7 hat sich umgedreht:** Punkt 7 will `PixelFX.headline` und
> `voidReveal` zusammen entsorgen. `voidReveal` wird jetzt **aufgerufen** (Studio-Leitzeile in
> (05)) — es darf NICHT mit weg. `headline` allein ist tot, sobald niemand mehr `data-pixel`
> schreibt.
>
> **Drei Fallen, die das gekostet hat — sie gelten weiter:**
>
> - **Eine Überschreibung, die VOR dem steht, was sie überschreibt, tut bei gleicher Spezifität
>   nichts** — und liest sich dabei wie ein Fix. Zweimal passiert (Fußzeilen-Touchziele,
>   Reduced-Motion-Block), beide Male erst im Browser aufgefallen. `v3.css` ist nach Thema
>   sortiert, nicht nach Kaskade.
> - **Eine Unterdrückung kann eine Regel treffen, die ihren Namen nicht trägt.**
>   `.foot-bar>.logo::after { content: none }` sah nach totem Code aus — ein Grep nach
>   `.logo::after` findet nur die Unterdrückung. Sie unterdrückt `.foot-bar a::after`. Entfernen
>   gab dem Wortzeichen eine goldene Unterstreichung. Wiederhergestellt.
> - **Ein emulierter iPhone meldet `pointer: fine`.** Eine `@media (pointer: coarse)`-Regel ist
>   hier unbeweisbar; darum sind die Touch- und 16px-Regeln komma-verknüpft mit `max-width: 860px`.
>
> **Und die Messfalle, die dreimal an einem Abend zuschlug:** `getComputedStyle` mitten in einer
> Animation liefert den Zwischenwert. Eine Pill las sich als „ungefärbt", ein 44-px-Chip als
> 43,47 (ein Vorfahr stand auf dem `rvs`-Startwert `scale: .988`), ein Reveal als hängend. Vor
> dem Messen die Animation stilllegen oder abwarten.
>
> **OFFEN, Owner-Entscheidung — alle drei verbliebenen P1:**
>
> 1. **AP-1 (LCP):** gemessen FCP ~110 ms, **LCP 824/836 ms** auf `H1.display`. Der
>    Audit-Vorschlag „Opacity entkoppeln" kann nichts bringen — `.w` hat `overflow: clip`, das Tor
>    ist der **Transform**. Und der Kommentar über der Regel sagt, der Kopf laufe absichtlich
>    „inside the 800-1600ms band". Kennzahl gegen Auftritt, keine Reparatur.
> 2. **IA-4:** keine Work-Detailform. Die Schablone (`work/<slug>.html`) gehört festgelegt.
> 3. **SC-1:** zwei Footer-Architekturen (index Mega, die 10 anderen schmal).
>
> Dazu die zwei alten Owner-Punkte: **das Braun auf Papier** (`legibleStops` tönt das gelbe
> Wellenende zu Senf) und **`AGENTS.md`** — von `recall init` erzeugt, unversioniert; ob das Repo
> eine autogenerierte Agenten-Datei führt, ist Owner-Wahl.

> ⚡ **Neuestes (4.9., Mac): Audit-Punkte 1-3 sind abgearbeitet.**
> Der CTA-Hover, die fuenf toten Uebergaenge und der Mobile-Footer. Alle drei waren
> nachgemessene Funde, alle drei sind nachgemessen wieder zu. Details mit den Zahlen
> davor und danach: `CHANGELOG.md`, Eintrag 2026-09-04.
>
> **Was von den drei P0 bleibt:** der **Kauf-Funnel endet weiter auf der alten
> `contact.html`** — Audit-Punkt 4, der ausdrueckliche Owner-Auftrag, und der groesste
> der drei. Das ist der naechste Schritt, zusammen mit den drei Modulen, die exklusiv
> dort liegen (4-Schritte-Prozess, Anti-Fit-Liste, Service-Router).
>
> **Eine Sache, die jemand entscheiden muss:** `tools/accent_audit.sh` faellt unter Last
> gelegentlich aus — 3 von 12 Laeufen, **jedes Mal** mit „NOTHING MEASURED" (eine Seite,
> die nicht gebootet hatte), **nie** mit einem Kontrast-Fund. Gegengeprueft: alle sechs
> Audit-Seiten booten im Light Theme sauber, danach 5 Laeufe hintereinander gruen. Ich
> habe die Wartezeiten des Guards **nicht** angefasst — eine gelockerte Wartezeit
> verdeckt genau das, wofuer er da ist. Wer es festnageln will, laesst ihn auf ein
> Boot-Signal warten statt auf feste Millisekunden.
>
> **Nicht angefasst:** die 57 ungeprueften Funde. Unveraendert gilt: nicht daran bauen,
> ohne sie selbst nachzumessen.
>
> **Zwei Fallen, die diese Runde gekostet hat — CHANGELOG.md reist nicht mit, also
> stehen sie hier:**
>
> 1. **Eine laufende CSS-Animation ueberschreibt Inline-Styles.** Wer `background-position`
>    zum Testen per `element.style` setzt, waehrend die Keyframes laufen, misst weiter die
>    alte Phase. `animation: none` zuerst.
> 2. **`getComputedStyle` liefert einen animierten Wert nicht als Laenge, sondern als
>    `calc(0% + 358.054px)`.** `parseFloat` gibt darauf auf und faellt still auf 0 zurueck.
>    Das hat einen echten Fehler in `faceGradient` unsichtbar gehalten, bis er gesucht
>    wurde: die Phase wurde nie gelesen, also fiel nicht auf, dass die Gradient-Rahmung
>    sie gar nicht ausgehalten haette. `pixel-engine.js:cssPx` versteht `calc()` jetzt.
>
> **Und eine ueber das Messen selbst:** `PixelFX.button()` baut die Flaeche nur beim
> Idle-Callback, beim ersten Hover und entprellt beim Resize. Wer eine Style-Aenderung am
> Button pruefen will, muss ein `resize` feuern und >220ms warten — sonst misst er das
> alte Sample. Und `.pxbtn.px-active` setzt `background: transparent !important`: nach dem
> Hovern liest man am Button nicht mehr, was zur Bauzeit galt.

> ⚡ **Vom 2.9. (Mac): Award-Audit liegt in [`audit/`](audit/).**
> 68 Funde aus acht Pruef-Linsen gegen die laufende Seite, read-only erhoben.
> **Hier anfangen:** [`audit/2026-09-02-award-audit.md`](audit/2026-09-02-award-audit.md) —
> Ursachen, Reihenfolge, was fehlt. Gerenderte Fassung:
> `audit/2026-09-02-award-audit.html` (im Browser oeffnen). Rohdaten mit Beleg pro Fund:
> `audit/2026-09-02-findings.json`.
>
> **Drei P0, alle nachgemessen** — (1) und (2) sind seit dem 4.9. behoben, (3) ist offen:
> (1) Der Haupt-CTA „Start a project" wird beim Hover
> **unsichtbar** — `pixel-engine.js:928` liest nur `backgroundColor`, der Button traegt aber
> einen Gradient, also wird die helle Pille nie gemalt und die fast schwarze Schrift landet
> auf fast schwarzem Grund. (2) Der Index-Footer bricht unter 760 px: `.foot-top` steht
> top-level ohne Mobile-Query, gemessen `grid-template-columns: 0px 318px`. (3) Der
> Kauf-Funnel endet auf der alten `contact.html`.
>
> **Regression aus der Uebernahme (behoben am 4.9.):** `--d-micro` und `--d-ui` existierten nur in
> `preview/refresh.html:85-86`, nie in `v3.css` — dort aber fuenfmal benutzt. Ungueltiges
> `var()` heisst Dauer `0s`: fuenf Hover-Uebergaenge springen. Zwei Zeilen in `:root`.
>
> **Wichtig zur Belastbarkeit:** die Skeptiker-Stufe des Audits ist am Session-Limit
> gescheitert. **11 Funde sind von Hand nachgemessen, 57 sind ungeprueft** (Erfahrungswert
> 30-60 % Fehlalarm). Nicht an einem ungeprueften Fund bauen, ohne ihn selbst anzusehen.
>
> `audit/` steht in `.vercelignore` — es reist zwischen den Maschinen, geht aber nie live.

## ACHTUNG: parallel gearbeitet — nicht zurueckdrehen

Am 2.9. lagen um 10:09 und 10:40 zwei Commits von einer ZWEITEN Maschine auf
dem Remote:

```
0710833  docs(readme): the layout section was right, the highlights were not
1a36a82  feat(refresh): the pattern reaches the last four pages
```

`1a36a82` ist **dieselbe Arbeit** wie `65b53a3` hier — die drei uebrigen
Service-Seiten auf das System umgestellt. Zwei unabhaengige Umsetzungen
derselben Aufgabe an denselben fuenf Dateien.

**Owner-Entscheidung:** „der Mac hat falsch gepusht, deine Version muss die
neue Index werden." Der Merge `f54e126` loest deshalb jede Datei, die beide
angefasst haben, zugunsten DIESES Zweiges auf:
`HANDOFF.md`, `index.html`, `services/{software,web-apps,websites}.html`.

Das ist keine Muenzwurf-Entscheidung: die andere Fassung traegt noch zwei
Dinge, die der Owner spaeter entfernen liess — die **7x7-SVG-Marke** im Logo
(„logo ist nicht wie das original") und **„Muenchen"** in der Status-Pille —
und ihr fehlt der `.stage-meta`-Streifen. Nachgeprueft: 0 Vorkommen von
`class="mark"` und 0 von „Muenchen" auf index und allen vier Service-Seiten.

`README.md` kam VON dort und ist bewusst behalten: dieser Zweig hat sie nie
angefasst, und der Commit behebt einen echten Fehler (Link auf
`upload/pixel-engine.js`, ein Pfad, den es seit dem Merger nicht mehr gibt).

**Nichts wurde force-gepusht.** Beide fremden Commits sind weiter in der
Historie erreichbar — ueberholt, nicht geloescht.

**Lehre, teuer bezahlt:** zwei Maschinen am selben Repo, dieselbe Aufgabe
zweimal gebaut. Vor dem Anfangen `git fetch && git log origin/main..main`
UND `main..origin/main` — beide Richtungen.

## Zwei Dinge, die NICHT mitreisen

1. **`https://mccain-digital.com/` zeigt weiter die ALTE Einzeldatei-Version**
   (Titel „We build digital products.", 100 kB, keiner der neuen Marker). Die
   Domain haengt also noch nicht an diesem Vercel-Projekt. Live ist der neue
   Stand nur unter `mccain-digital.vercel.app`.
2. **`CHANGELOG.md` steht in `.gitignore`** und kommt deshalb auf keiner
   zweiten Maschine an. Der gesamte Detailverlauf der letzten zwei Tage liegt
   nur auf der Windows-Platte. Wer auf dem Mac weitermacht, hat diese Datei
   NICHT. Entweder eine Zeile aus `.gitignore` streichen (macht interne
   Notizen in einem oeffentlichen Repo sichtbar) oder die Datei von Hand
   mitnehmen. **Owner-Entscheidung, offen.**

---

## ZUERST LESEN: der Befund

Am Ende dieser Session ist eine vollstaendige, **gemessene** Bestandsaufnahme
entstanden — SEO, Technik, Inhalt, mit Reihenfolge. Sie liegt als Artifact:

**https://claude.ai/code/artifact/4e4374bf-1b38-4c69-8bf0-a6328f77743a**

Eine frische Session liest sie mit dem Artifact-Werkzeug (`action: "read"`,
diese URL). **Vor jeder weiteren Arbeit an der Seite dort reinschauen** — der
Rest dieser Datei erklaert den Code, der Befund erklaert, was zu tun ist.

Die drei Kernbefunde in einem Satz:

1. **Beide Gruender-Portraits sind byteweise dieselbe Datei**
   (`md5 25edd2c1…` fuer christian UND kathi). Zwei benannte Menschen, ein
   Stockfoto. Darf so nicht live.
2. **Der Hero zeigt Muenchner Koordinaten** (`48.14° N · 11.58° E`), waehrend
   Impressum, JSON-LD und llms.txt Oberostendorf sagen — 80 km auseinander.
   **Das ist eine Owner-Entscheidung, kein Bug:** entweder Koordinaten und
   Marquee auf Oberostendorf ziehen, oder Muenchen offen als Einzugsgebiet
   formulieren. NICHT einfach selbst entscheiden.
3. **Es gibt kein deutsches Wort auf der Seite** (`lang="en"` 11/11, 0×
   hreflang). Groesster organischer Hebel, teuerster Punkt.

Was heute daraus schon erledigt ist: der zweite Faktenfehler. „The company is
eight years old" stand an **vier** Stellen — `data.js` (die sichtbare
FAQ-Antwort), derselbe Satz gespiegelt im FAQPage-JSON-LD von `index.html`,
der Studio-Absatz, und eine Zeile auf `services/software.html`. Alle vier auf
„has been going since 2016" gezogen, das altert nicht mehr. JSON-LD gegen die
sichtbare Antwort gegengeprueft, beide identisch.

---

## Fuer eine frische Session: START HIER

Der Refresh ist **uebernommen und gemerged**. `index.html` IST jetzt der
Entwurf — nicht mehr `preview/refresh.html`. Dev-Server:

```
python prodserve.py 8898 --dev
```

### Der Stand der Startseite

- **Hero**: full width, zweizeilige Plakatzeile. Hintergrund ist ein
  **Pixelmosaik** von `img/circuit-macro-1200.webp`, gefahren von
  `PixelFX.image` — demselben Aufruf wie die Work-Karten. Das schwarze Loch
  folgt der Maus und zerstoert echte Partikel. **Raster 5px** (Owner: „die
  pixel halbieren"), also 51.510 Partikel — und dafuer **ohne Schwarm** beim
  Erscheinen (`swarm: false`). Der Schwarm ist der einzige Teil des Effekts,
  dessen Kosten an der GESAMTZAHL haengen; alles andere haengt am Radius des
  Lochs. Gemessen: Ruhe und Loch 17 ms (60 fps), Seitenaufbau 3 Long Tasks /
  466 ms statt 5 / 693 ms mit dem groben Raster.
  Die Stage beginnt bei y=0 und endet bei `100svh`; ihr Inhalt haelt `--nav`
  Abstand zur Leiste.
- **Kopfleiste**: oben transparent mit weisser Schrift, ab 8 px Scroll faehrt
  die Platte ein. Keine Haarlinie — Pac-Man ist die Trennung. Alle
  Bedienelemente 38 px, nichts umbricht. Die **Status-Pille** traegt den
  Verlauf als wandernde Kante — gebaut wie der Rahmen der Konsole
  (geclipptes Verlaufsblatt + deckende Innenflaeche, 1.5 px), **nicht** mit
  `mask-composite`, das Kurven treppt. Beim Scrollen raeumt die Pille ihren
  Platz fuer die Kapitel-Anzeige; unter 480 px verlaesst der CTA die Leiste.
- **Logo**: die Wortmarke des Originals und nur sie — **kein Icon**.
  `mccain` 800/Papier, `digital` 600/Logo-Gelb, Grundlinie, .3em Wortabstand.
  Das Original sagt es in seinem eigenen Stylesheet:
  `/* clean typographic wordmark - no icon */`.
- **Favicon**: zerfaellt bei Tab-Wechsel in lose Pixel, Titel wird
  „we'll be here. — mccain digital". Wirft die Pixel des ECHTEN
  `favicon.svg`, statt die Glyphen neu zu setzen.
- **(05)**: dunkles Band, Akzentschrift im vollen Spektrum der Konsole.
- **Fusszeile**: full width wie die Leiste. Die riesige Wortmarke ist RAUS;
  signiert wird unten links mit `.logo` — derselben Wortmarke wie oben,
  gleiche Klasse, gleiche Regel. Einzige Ausnahme von der Regel „das
  Logo-Gelb wird nie umgefaerbt": hier `--acc-text` statt `--acc`, weil die
  Fusszeile im hellen Theme Papier ist und `#f5c518` dort 1,45:1 misst. Auf
  Ink ist `--acc-text` identisch mit `--acc`, die Leiste bleibt unberuehrt.
- **Keine Fuehrungsschienen** auf der Startseite; die Service-Seiten behalten
  ihre.

### Die Typo-Skala, und was „dynamisch" hier heisst

Alle 121 `font-size` in `v3.css` sind relativ — 81 Tokens, 26 fluide
`clamp()`, 10 `rem`, 3 `em`, 1 `cqi`, **null px**. Einheit ist `rem`, nicht
`em`: `em` multipliziert sich, `rem` nicht. Einziger fester Wert im Projekt:
`pacman.js:214`, die Sprechblase des Easter Eggs auf dem Canvas.

```
   vw x vh    display   h2      (nach der Verkleinerung vom 1.9.)
 1920x1080        128   58
 1920x 614         80   58     <- die 13vh-Decke greift
 1512x 850        101   58
 1090x 614         73   45
  390x 844         42   30
```

Die Decke `8rem` ist bei 1910 px erreicht — breiter wird die Zeile nie mehr.
Service-Seiten, Kontakt und 404 haben ihr **eigenes** Token
(`.hero--svc .hero-h`, 99 px bei 1920) und sind absichtlich nicht mitgezogen.

**Was NICHT mitwaechst:** `vw`-Groessen ignorieren sowohl die
Browser-Schriftgroesse als auch den Zoom — ein `vw`-Wert ist in Geraetepixeln
konstant. Fliesstext waechst um +25 % bei 20px-Root und verdoppelt sich bei
200 % Zoom, die Ueberschriften nicht. Wenn das gewuenscht wird, muss die
fluide Mitte von reinem `vw` auf `rem + vw` — das aendert dann aber die
Groessen bei allen anderen Breiten mit, ist also eine Design-Entscheidung.

### Was als naechstes dran ist

Reihenfolge steht im Befund (Artifact-Link oben). Kurzfassung:

1. **Ortskonflikt** — braucht deine Entscheidung, siehe oben.
2. **Inhalte** — Portraits, zwei Kundenfaelle, drei freigegebene Zitate.
   Der eigentliche Engpass, nichts davon darf erfunden werden.
3. **Formular verdrahten, `noindex` raus, `AI_MODE` auf `"live"`.**
   `ANTHROPIC_API_KEY` setzt der Owner selbst in Vercel Production, plus
   Spend-Limit. Formular danach mit einer echten Einsendung gegenpruefen,
   nicht nur optisch.
4. **Prozess-Abschnitt und Preisrahmen** — das Loch im Kaufpfad.
5. **Interne Verlinkung, `Person`-Schema, 404-Metadaten** — gebuendelt.
6. **Deutsche Sprachversion** — groesster Hebel, nicht vor 1–4 anfangen.
7. **`preview/refresh.html`** ist eine Dublette mit veraltetem Inline-CSS und
   rendert inzwischen ANDERS als die echte Startseite. Umstellen auf
   `v3.css` oder loeschen. **Owner-Entscheidung, offen.**
8. **Pushen.**

### CHANGELOG.md reist nicht mit

`CHANGELOG.md` steht in `.gitignore`, unter „internal — kept on disk for
development, never part of the public site", seit dem ersten oeffentlichen
Release. Er wird gepflegt und ist aktuell, aber ein `git push` nimmt ihn nicht
mit. Wer das aendern will, aendert eine Zeile in `.gitignore` — und macht
damit interne Notizen in einem oeffentlichen Repo sichtbar. Owner-Entscheidung.

### Vor jeder Aenderung, ohne Ausnahme

```
python prodserve.py 8898 --dev     # die Waechter brauchen den Server
bash tools/sweep.sh 1090 614       # und 390 844, 1512 850, 1920 1080
bash tools/accent_audit.sh
bash tools/pixel_scale.sh 1512 850
```

**1090x614 gehoert in jede Messreihe.** Das ist ein 1920x1080-Schirm bei
175 % Windows-Skalierung — ein echtes Geraet, auf dem der Owner liest, und
das Fenster, auf dem der Hero am 1.9. zerbrochen ist.

`tools/stage_probe.js` misst den Kontrast jedes Textblocks im Hero gegen die
GELIEFERTEN Pixel. Es liest die Ebene, die tatsaechlich sichtbar ist (Mosaik
oder Foto), bildet ueber das Rechteck DIESER Ebene ab und rechnet den
CSS-Filter heraus, durch den man sie sieht. Per `agent-browser eval -b` mit
base64 einspeisen, so wie `sweep.sh` es mit `probe.js` macht.

**Kontrast ehrlich messen:** der Probe zieht die Scrims NICHT ab, ist also
pessimistisch. Fuer eine belastbare Zahl den Screenshot-Weg gehen — Glyphen
per `color: transparent` verstecken, dazu `.stage-kicker::before` und
`.cue i` (das sind Dekorationen, keine Grundflaeche), dann den hellsten Pixel
in jeder Textbox messen. Sonst misst man den gelben Strich statt des Grundes.

### Was diese Session gekostet hat, und was daraus zu lernen ist

- **Ein Waechter, der auf einen umbenannten Selektor zeigt, meldet nichts.**
  `stage_probe.js` suchte `.dither-l` — ein Canvas, das der Hero seit dem
  Mosaik nicht mehr hat — und antwortete `no field canvas` statt einer Zahl.
  Dahinter lag ein echter Fehler: `--muted` auf der Stage mass 4,46:1.
  Dieselbe Form zweimal mehr am selben Tag: `.rail .nav-where` in `v3.css`
  (nach dem Merger auf nichts gerichtet) und `.shot` in `pixel_scale.sh`, das
  den Hero (`​.stage-shot`) nie geprueft hat. **Nach jedem Umbenennen nach
  dem ALTEN Namen grepen.**
- **Ein negatives Margin gegen eine `fixed` Leiste kompensiert nichts.**
  `.stage` hatte `margin-top: -var(--nav)` UND `padding-top: var(--nav)`.
  Beide hoben sich auf: der Text sass hinter der Leiste, die Box endete 68 px
  ueber der Falzkante. Auf einem hohen Fenster hat `align-content: center`
  das verdeckt. **Layout auch auf dem KURZEN Viewport messen.**
- **Eine Regel, die gegen einen spaeter verschobenen Wert geschrieben wurde,
  dreht ihre Wirkung um.** `@media (max-height:820px)` verschaerfte einst das
  alte `--t-display`; gegen das neue war sie in jedem Term groesser und setzte
  die Ueberschrift bei 1090x614 auf 105 px zurueck, waehrend das Root-Token
  73 wollte. Der Kommentar blieb dabei richtig klingen.
- **`mask-composite` treppt Kurven.** Der Nachbar im selben Stylesheet — der
  Rahmen der Konsole — loest dasselbe Problem ohne Maske. Zum wiederholten
  Mal war die Antwort: **die Mechanik von nebenan nehmen, nicht eine zweite
  bauen, die so aussieht.**
- **Der Augenschein hat einmal danebengelegen und die Messung hat es
  gerettet.** Die Schlagzeile sah optisch eingerueckt aus (3–6 px im
  Screenshot). `TextMetrics` sagt: „We" hat 0,009 em Vorbreite, also EINEN
  Pixel — der Rest war Kantenglaettung. Haette ich nach Augenschein
  korrigiert, waere die erste Zeile 3 px in den Gutter gerutscht.
- **Das Original ist die Quelle, nicht mein Gedaechtnis.** Die Logo-Frage war
  drei Anlaeufe lang offen und stand die ganze Zeit als Kommentar im
  Stylesheet der laufenden Seite auf mccain-digital.com.

### Gemessen am Ende dieser Session

- Jeder Textkasten im Hero **4,74–13,39:1** gegen den hellsten ausgelieferten
  Pixel unter ihm — bei 1879x864, 1512x850 und 1090x614, mit Mosaik UND mit
  Foto.
- Akzentschrift besteht auf allen 11 Seiten in beiden Themes (die Wortmarke
  ist per Entscheidung ausgenommen, WCAG 1.4.3).
- 11 Seiten: keine Page-Errors, keine Konsolenfehler, kein horizontaler
  Ueberlauf bei 390, 1090, 1512, 1879, 1920.
- Der Hero fuellt exakt einen Bildschirm, bei jeder geprueften Groesse.
- Jedes Mosaik sitzt auf seinem Foto bei `bestScale 1.00` — inklusive Hero,
  der bis heute ausserhalb dieses Waechters lag.
- Core Web Vitals gegen den gzip-Server: **CLS 0**, TTFB 47 ms, FCP 1204 ms,
  LCP 1936 ms (LCP-Element ist die `h1`, haengt also am Webfont).
  Service-Seite: FCP 304 ms, LCP 1488 ms. **Der FCP-Unterschied ist ein
  Verdacht, keine Diagnose — erst messen, was die Startseite zusaetzlich
  blockiert, bevor irgendetwas optimiert wird.**

---

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
