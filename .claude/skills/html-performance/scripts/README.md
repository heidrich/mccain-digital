# Messskripte des Skills `html-performance`

Neun Kommandozeilen-Werkzeuge, die dieselben Fragen beantworten, die
Lighthouse/PageSpeed Insights stellen - LCP, TBT, CLS, Hauptthread-Zeit,
Requests, Observer-Last, `content-visibility`, Animationen, Bildrate -, aber
mit Rohdaten und Zeitleisten statt nur einem Score, damit sich ein Befund
tatsächlich einer Ursache im Code zuordnen lässt. Acht Skripte sind
Node-ESM-Module (`.mjs`) und messen per Playwright/CDP in echtem Chromium;
das neunte, `prodserve.py`, ist kein Messwerkzeug, sondern der
produktionsnahe Server, gegen den alle anderen messen. Jedes Skript läuft
einzeln, nimmt eine URL als Argument und kennt `--json` sowie `--help`/`-h`.

## Setup

Einmal pro Maschine, in diesem Ordner:

```bash
npm install
```

Das installiert nur `playwright-core` - kein Chromium-Download über npm
(siehe `package.json`). Jedes Skript sucht beim Start selbst ein
vorhandenes Chromium: zuerst `HP_CHROME` oder `CHROME_PATH`
(Umgebungsvariable auf eine Binary), danach der höchste `chromium-NNN`-Build
im ms-playwright-Cache (`~/Library/Caches/ms-playwright` unter macOS),
zuletzt eine normale System-Installation von Chrome. Fehlt beides, bricht
`launch()` mit einer Fehlermeldung samt Installationsbefehl ab.

`lighthouse-psi.mjs` startet zusätzlich Lighthouse selbst: zuerst über ein
`lighthouse` auf dem PATH, sonst über `npx --yes lighthouse@13` (Major-Version
gepinnt, damit sich Audit-IDs nicht unter uns wegändern). Der erste Aufruf
lädt das Paket einmalig, npx cacht es danach lokal - spätere Läufe starten
ohne erneuten Download.

Node 22 vorausgesetzt.

## Messregeln, von denen die Skripte ausgehen

- **Immer gegen einen produktionsnahen Server messen** - `prodserve.py`, nie
  `python3 -m http.server` (kein Gzip, keine Cache-Header, verzerrt vor allem
  Render-Blocking-CSS) und nie einen Dev-Server mit `Cache-Control: no-store`
  (jede zweite Anfrage sieht dann wie ein "Duplikat" aus, das es in
  Produktion nie gäbe).
- **`mobile` heißt Touch + `isMobile`**, nicht nur ein schmaler Viewport -
  sonst greifen `(hover: hover)`/`(pointer: fine)`-Gates der Seite wie am
  Desktop, und die Messung prüft die falsche Variante.
- **CPU-Drosselung 4x ist ein Stresstest, kein PageSpeed-Abbild.** PSI/
  Lightrider rechnet mit `cpuSlowdownMultiplier: 1.2` auf eigener Hardware
  (mobil) bzw. 1 (Desktop, kein Throttling). `lighthouse-psi.mjs` bildet das
  automatisch nach; `--cpu 4` in den anderen Skripten misst bewusst
  schlechtere Hardware, nicht "wie PSI".
- **Software-GL** (`--software-gl`, SwiftShader) ist der einzige Weg, echte
  GPU-Last zu erzeugen - `Emulation.setCPUThrottlingRate` bremst nur den
  Hauptthread-Prozess, nicht den GPU-Prozess.
- **Nie messen, während die Maschine belastet ist** - ein zweiter Browser mit
  vielen Tabs, ein laufender Build, ein zweiter Messlauf parallel. Chrome
  liefert dann innerhalb der Wartefenster kein `first-contentful-paint`, und
  Lighthouse bricht mit `runtimeError NO_FCP` ab. Bei den Probeläufen für
  dieses README ist genau das einmal passiert (im zweiten Versuch danach
  sauber durchgelaufen) - kein Einzelfall, kein Bug in den Skripten.
- **Beide Formfaktoren messen.** Ein Fix für Mobile kann Desktop unberührt
  lassen oder sogar verschlechtern - `--mobile` und Desktop (Default) gehören
  beide zu jedem Befund.
- **Nur Läufe unter denselben Bedingungen vergleichen** - derselbe
  Server-Modus (MESSEN, nicht ANSEHEN), dasselbe Geräte-Preset, dieselbe
  CPU-Drosselung, eine unbelastete Maschine. Alles andere vergleicht Rauschen.

## Die neun Werkzeuge

| Skript | Frage | Aufruf | Worauf achten |
|---|---|---|---|
| `lcp-window.mjs` | Welches Element wird LCP, und wird die Seite je ruhig (TTI/TBT/CLS)? | `node lcp-window.mjs <url> --for 30 --mobile` | keine WARNUNG "später LCP-Kandidat"; TTI wird erreicht; TBT nicht "bis Fensterende" offen; CLS niedrig, Quellen bekannt |
| `mainthread.mjs` | Wohin gehen die Hauptthread-Millisekunden, was steckt in Lighthouses "Other"? | `node mainthread.mjs <url> --for 12 --mobile --slices` | "Other" erklärbar (IntersectionObserver-Zeile prüfen); teuerste Einzelereignisse einem Skript/einer Funktion zuordenbar |
| `requests.mjs` | Was lädt wann, wie groß, doppelt, und sieht man es überhaupt? | `node requests.mjs <url> --for 12 --mobile` | keine unerklärten Duplikate; "geladen, aber unsichtbar" leer oder nur `loading=lazy`-Fälle |
| `observers.mjs` | Wer beobachtet wie viele Elemente, wer liest Layout, wer pollt? | `node observers.mjs <url> --for 15 --sweep` | kein Observer mit unerklärt hoher Zielzahl; kein "Polling-Verdacht" bei setTimeout; rAF ~Bildwiederholrate |
| `cv-audit.mjs` | Was tut `content-visibility` wirklich, und wo lauern seine Fallen? | `node cv-audit.mjs <url> --mobile` | Befund-Liste leer (keine Stacking-/Containing-Block-Falle, kein `contain-intrinsic-size: none`); Seitenhöhe ändert sich beim Sweep nicht |
| `animations.mjs` | Was animiert, wie lange noch, sichtbar, Compositor? | `node animations.mjs <url> --sweep --at2 8000` | keine endlose Animation läuft offscreen; laufende Animationen nur mit compositor-fähigen Properties |
| `fps.mjs` | Hält die Seite ihre Bildrate, und drosselt sie sich selbst erkennbar? | `node fps.mjs <url> --for 8 --cpu 1,4 --software-gl` | mean/min fps nahe Bildwiederholrate, kein dauerhaftes Plateau darunter; `--attr`-Qualitätsstufe fährt nach Last wieder hoch |
| `lighthouse-psi.mjs` | Wie bewertet Lighthouse im PSI-Modus die Seite? | `node lighthouse-psi.mjs <url> --runs 3` | kein `runtimeError`; observedLCP − observedFCP ≤ 3000 ms; Score/LCP/TBT/CLS im Zielbereich |
| `prodserve.py` | (kein Messwerkzeug - der produktionsnahe Server für alle anderen) | `python3 prodserve.py dist 8897` | Start-Zeile zeigt "MEASURE, production headers"; `curl -sI` zeigt `Cache-Control` + ggf. `Content-Encoding` |

## Typischer Ablauf

Ist-Stand → Ursache → Eingriff → Nachmessen - immer gegen denselben,
produktionsnahen Server und in derselben Konfiguration.

```bash
# 1. Produktionsnahen Server starten (bleibt für die Sitzung offen)
python3 prodserve.py dist 8897 &

# 2. Ist-Stand feststellen (beide Formfaktoren)
node lighthouse-psi.mjs http://localhost:8897/ --runs 3
node lighthouse-psi.mjs http://localhost:8897/ --desktop --runs 3

# 3. Ursache eingrenzen, z. B. bei zu spätem LCP
node lcp-window.mjs http://localhost:8897/ --for 20 --mobile
node mainthread.mjs http://localhost:8897/ --for 12 --mobile --slices
node requests.mjs http://localhost:8897/ --for 12 --mobile

# 4. Eingriff im Code (z. B. fetchpriority="high" aufs LCP-Bild,
#    contain-intrinsic-size korrigieren, Animation pausieren)

# 5. Nachmessen - derselbe Server, dieselbe Konfiguration
node lcp-window.mjs http://localhost:8897/ --for 20 --mobile
node lighthouse-psi.mjs http://localhost:8897/ --runs 3
```

Je nach Befund in Schritt 3 gezielt nachfassen: Animation verdächtig →
`animations.mjs --sweep`; `content-visibility` im Spiel → `cv-audit.mjs`;
Layout-Thrashing oder Polling-Verdacht → `observers.mjs --sweep`. Schritt 5
nur mit Schritt 2 vergleichen, nie mit einem Lauf unter anderen Bedingungen
(anderer Server-Modus, anderes Gerät, belastete Maschine).

## Fehlerbehebung

**"kein Chromium gefunden"** - `HP_CHROME` oder `CHROME_PATH` auf eine
vorhandene Chrome/Chromium-Binary setzen, oder
`npx playwright-core install chromium` laufen lassen.

**Port belegt** - ein alter `prodserve.py`- oder Testserver-Prozess läuft
noch: `lsof -i :<port>` zeigt die PID, `kill <PID>` beendet ihn. `8897` und
`8898` sind der laufende Test-Server dieses Setups - nicht anfassen, nicht
belegen.

**NO_FCP / Timeout** - fast immer eine belastete Maschine (siehe
Messregeln oben), kein Bug. Andere Browserfenster/-Tabs schließen, laufende
Builds oder parallele Messungen abwarten, dann einmal wiederholen.

**LCP-Reporting endet nicht** - es endet mit der ersten echten
Nutzereingabe (Klick, Tastendruck, Scroll), nicht mit `mousemove`.
`lcp-window.mjs --interact <s>` und `requests.mjs --interact <s>` lösen das
gezielt per Tab-Taste aus, um die Grenze sichtbar zu machen.

**Trace/DevtoolsLog von Lighthouse behalten** - `lighthouse-psi.mjs --keep
--out ./lh-psi` lässt das Arbeitsverzeichnis samt Report, Trace und
DevtoolsLog stehen, statt es nach dem Lauf zu löschen.

**Automatisierung/CI** - jedes Skript kennt `--json` und schreibt dann
ausschließlich maschinenlesbares JSON auf stdout (Konsolentext sonst auf
stdout, Fehler auf stderr; Exit-Code 0 = ok, 1 = Fehler).

## Neues Werkzeug hinzufügen

Alle Skripte sind bewusst generisch: Die URL ist ein Argument, es gibt keine
Projekt-Pfade und keine fest verdrahteten Selektoren. Dasselbe Skript läuft
gegen jede Seite in jedem Projekt.

Für ein neues Skript:

1. Aus `lib/browser.mjs` importieren statt selbst zu bauen: `launch()`
   (Browser/Kontext/Seite mit Geräte-Preset, CPU-Drosselung, Software-GL),
   `parseArgs()` (Flags), `requireUrl()` (wirft mit klarer Meldung, wenn der
   Server nicht antwortet - sonst "besteht" jede Messung gegen eine
   Fehlerseite), `DESCRIBE_ELEMENT_SRC` (Kurzbeschreibung eines Elements für
   Ausgaben, per `addInitScript` einbinden) und `table()` (Textausgabe).
2. Deutscher Kopfkommentar: welche Frage das Skript beantwortet, welche
   Methode es verwendet, welche Fallstricke es kennt.
3. `--help`/`-h` nach dem Muster der anderen acht Skripte: `Nutzung: node
   <skript>.mjs <url> [Optionen]`, eine Zeile Frage, `Optionen:`-Liste mit
   `--json` und `--help`, ein `Beispiel:`. Dieselbe Hilfe erscheint, wenn die
   URL fehlt.
4. `--json` für maschinenlesbare Rohdaten (`JSON.stringify`), Textbericht als
   Default.
5. Gegen zwei unterschiedliche Seiten testen, nicht nur gegen eine - ein
   Skript, das nur gegen eine bestimmte Seite funktioniert, ist kein
   generisches Werkzeug mehr.
