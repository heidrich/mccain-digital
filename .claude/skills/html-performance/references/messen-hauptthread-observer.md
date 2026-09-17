# Messen: Hauptthread, Beobachter, content-visibility und fps — html-performance

> Teil des Skills [[html-performance]] · Stand 2026-09-16 · Belege: mccain-digital (HANDOFF, CHANGELOG, Commits), weitere Projekte des Owners, Recherche mit Quell-URLs

Dieses Kapitel behandelt das Lesen und Instrumentieren der Laufzeit: Lighthouses sieben Hauptthread-Gruppen und „Other", IntersectionObserver/ResizeObserver/Timer/rAF selbst beobachten, `content-visibility` messen, fps und Software-GL, sowie die Mobile-Emulation (Touch, Scrollen, reduced motion, Viewports), die diese Messungen realistisch macht. Die Grundmethode des Messens steht in [messen-methode.md](messen-methode.md); Lighthouse-/PSI-Spezifika und Messfenster in [messen-lighthouse-fenster.md](messen-lighthouse-fenster.md). Wie Befunde behoben werden: [rendern-hauptthread.md](rendern-hauptthread.md), [rendern-animationen.md](rendern-animationen.md), [rendern-canvas-webgl.md](rendern-canvas-webgl.md); wie Lighthouse daraus einen Score errechnet: [lighthouse-psi.md](lighthouse-psi.md).

Bis zum 17.9.2026 stand dieser Inhalt zusammen mit den anderen `Messen`-Themen in `messen.md`; die Regeln sind hier neu von 1 durchnummeriert, alte Verweise gelten nicht mehr.

## Kurzfassung

- **Die 7 Gruppen von Lighthouses Main-thread work breakdown, exakt gelesen** — und was "Other" wirklich ist ([→](#1-die-7-gruppen-von-lighthouses-main-thread-work-breakdown-und-was-other-ist))
- **IntersectionObserver-Kosten stecken oft in "Other" und skalieren mit Zielen** — sichtbar nur per gewrapptem Konstruktor ([→](#2-intersectionobserver-kosten-stecken-oft-in-other-und-skalieren-mit-zielen-nicht-instanzen))
- **Lighthouses Skriptkosten-Spalte pro URL ist eine Zuordnung, keine Anfragezahl** — gegen eine echte Netzwerkmessung prüfen ([→](#3-lighthouses-skriptkosten-spalte-pro-url-ist-eine-zuordnung-keine-anfragezahl))
- **V8-Coverage-Bereiche sind verschachtelt** — ein naives count>0 meldet 0 % tot für jede Datei ([→](#4-v8-coverage-bereiche-sind-verschachtelt-ein-naives-count0-meldet-0--tot-für-jede-datei))
- **Timer, rAF und Observer vor dem ersten Seitenskript patchen** — sonst hält die Seite schon eine native Referenz ([→](#5-timer-raf-und-observer-vor-dem-ersten-seitenskript-patchen))
- **ResizeObserver auf body mit height:100% ist ein Unschulds-Artefakt, kein Beweis** — beobachte die echte Komponentenwurzel ([→](#6-resizeobserver-auf-body-mit-height100-ist-ein-unschulds-artefakt-kein-beweis))
- **contentvisibilityautostatechange ist der einzige verlässliche Skip/Show-Beweis** — die ~150-%-Marge gehört gemessen, nicht angenommen ([→](#7-contentvisibilityautostatechange-ist-der-einzige-verlässliche-beweis-die-150--marge-gehört-gemessen))
- **Seitenhöhe vor/nach Scroll vergleichen** — deckt eine falsche contain-intrinsic-size auf ([→](#8-seitenhöhe-vor-und-nach-einem-vollständigen-scroll-vergleichen))
- **IO-Ziel in übersprungenem Block: Kosten in der Bootstrap-Phase, nicht bei jedem Frame** — korrigierte Lesart ([→](#9-io-ziel-in-übersprungenem-content-visibility-block-kosten-in-der-bootstrap-phase))
- **Screenshot und IntersectionObserver lügen für übersprungene Blöcke** — erst nach dem Rendern beobachten ([→](#10-screenshot-und-intersectionobserver-lügen-für-übersprungene-blöcke))
- **fps per rAF-Sampling über viele Frames, p95 statt Einzeldifferenz** — ein Plateau, nicht ein Einzelwert, beweist Drosselung ([→](#11-fps-per-raf-sampling-über-viele-frames-messen-p95-nicht-einzeldifferenz))
- **Nur Software-GL erzeugt echte WebGL-Last, CPU-Drosselung nicht** — Renderer per WEBGL_debug_renderer_info bestätigen ([→](#12-nur-software-gl-erzeugt-echte-webgl-last--cpu-drosselung-erreicht-den-gpu-prozess-nicht))
- **getContext() blockiert synchron und kann den ersten Paint der ganzen Seite verzögern** — nie im kritischen Pfad ([→](#13-getcontext-blockiert-synchron-und-kann-den-ersten-paint-der-ganzen-seite-verzögern))
- **SwiftShader wird von Chrome zunehmend blockiert** — Re-Enable-Flag nötig, exakter Meilenstein unklar ([→](#14-swiftshader-wird-von-chrome-zunehmend-blockiert))
- **Nur echte GPU-Hardware beweist, dass WebGL wirklich rendert** — Headless kann falsch UND unbewegt sein ([→](#15-nur-echte-gpu-hardware-beweist-dass-webgl-wirklich-rendert--headless-kann-falsch-und-unbewegt-sein))
- **"mobile" heißt Touch + isMobile, nicht nur ein schmaler Viewport** — sonst greifen Desktop-Media-Queries ([→](#16-mobile-heißt-touch--ismobile-nicht-nur-ein-schmaler-viewport))
- **Scrollen in Messläufen immer instant, nie smooth** — sonst bricht jeder neue Scroll-Befehl den vorigen ab ([→](#17-scrollen-in-messläufen-immer-instant-nie-smooth))
- **reducedMotion und vorab akzeptierter Consent für Screenshot-Vergleiche** — sonst wird eine Animation zum Bild-Unterschied ([→](#18-reducedmotion-und-vorab-akzeptierten-consent-für-screenshot-vergleiche-setzen))
- **Emulierter iPhone-Viewport meldet pointer:fine, nicht pointer:coarse** — eine coarse-only-Regel bleibt so ungetestet ([→](#19-emulierter-iphone-viewport-meldet-pointerfine-nicht-pointercoarse))
- **Einen realen skalierten Geräte-Viewport in jede Messreihe aufnehmen** — neben den Standard-Breakpoints ([→](#20-einen-realen-skalierten-geräte-viewport-in-jede-messreihe-aufnehmen))

## Inhalt

- [Hauptthread lesen](#hauptthread-lesen-gruppen-eigenzeit-other)
- [Beobachter selbst beobachten](#beobachter-selbst-beobachten-intersectionobserver-resizeobserver-timer-raf)
- [content-visibility messen](#content-visibility-messen)
- [fps und Software-GL](#fps-und-software-gl)
- [Mobile-Emulation, Scrollen, Viewports](#mobile-emulation-scrollen-reduced-motion-viewports)
- [Offene Fragen](#offene-fragen)
- [Quellen](#quellen)

## Hauptthread lesen: Gruppen, Eigenzeit, "Other"

### 1. Die 7 Gruppen von Lighthouses Main-thread work breakdown, und was "Other" ist
**Warum:** Lighthouse sortiert jedes Trace-Ereignis in eine von sechs benannten Gruppen; der Rest landet in „Other" — der einen Zeile, die niemand direkt reparieren kann, weil sie nur über das definiert ist, was sie NICHT ist. Ein Ereignis ohne explizite Zuordnung erbt die Gruppe seines Parent-Tasks; nur ein wirklich unbekanntes Top-Level-Ereignis ohne gemappten Vorfahren landet in „Other".
**Woran man es erkennt:** Die 7 Gruppen exakt: `parseHTML` (ParseHTML, ParseAuthorStyleSheet), `styleLayout`/„Stil+Layout" (ScheduleStyleRecalculation, UpdateLayoutTree, InvalidateLayout, Layout), `paintCompositeRender`/„Rendern" (Animation, Paint, RasterTask, CompositeLayers, PrePaint …), `scriptParseCompile`/„Kompil." (v8.compile, v8.parseOnBackground), `scriptEvaluation`/„Skript" (EventDispatch, EvaluateScript, TimerFire, FireAnimationFrame …), `garbageCollection`/„GC" (MinorGC, MajorGC, BlinkGC.AtomicPhase), `other`/„Other" — explizit nur drei Task-Hüllen (`MessageLoop::RunTask`, `TaskQueueManager::ProcessTaskFromWorkQueue`, `ThreadControllerImpl::DoWork`) plus alles Unbekannte. Die angezeigten Dauern sind rohe Self-Times × `cpuSlowdownMultiplier` (nur bei simulate) — bei PSI mobil also ×1,2, bei Desktop ×1 (siehe Regel 3 in [messen-lighthouse-fenster.md](messen-lighthouse-fenster.md#3-psi-drosselt-die-cpu-mobil-mit-12x-nicht-mit-4x--desktop-gar-nicht)): absolute ms bei einem lokalen 4x-Lauf sind daher kein PSI-Abbild, nur die Proportionen zwischen Gruppen bleiben vergleichbar.
**Fix:** `node scripts/mainthread.mjs <url> --top 15` — druckt die Gruppentabelle UND die teuersten Einzelereignisse mit Funktionsname/Skript-URL, damit „Other" nicht als Sackgasse endet, sondern als konkrete Ereignisliste.
**Beleg:** Quelle: GoogleChrome/lighthouse `core/lib/tracehouse/task-groups.js` und `core/lib/tracehouse/main-thread-tasks.js`, `core/audits/mainthread-work-breakdown.js`, 13.4.1, 2026-09-16; 1:1 nachgebaut in `scripts/mainthread.mjs`. · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 2. IntersectionObserver-Kosten stecken oft in "Other" und skalieren mit Zielen, nicht Instanzen
**Warum:** `IntersectionObserverController::computeIntersections` läuft zwischen den Frames im Browser, nicht in einer eigenen benannten Funktion — es taucht in KEINEM JS-/CPU-Profil auf und fällt in Lighthouses Trace-Gruppierung typischerweise unter „Other". Die Kosten skalieren mit der Zahl der BEOBACHTETEN ZIELE, nicht mit der Zahl der Observer-Instanzen: ein Observer mit 400 Zielen kostet wie 400 Observer mit je einem.
**Woran man es erkennt:** `scripts/mainthread.mjs` weist IntersectionObserver-Ereignisse separat aus, statt sie in „Other" verschwinden zu lassen; `scripts/observers.mjs` zeigt zusätzlich die maximale Zielzahl je Observer-Instanz und deren Entstehungsort (Stack-Trace).
**Fix:** `node scripts/observers.mjs <url> --sweep` — zählt Ziele pro Observer-Instanz und Callback-Häufigkeit; Instanz mit sehr vielen Zielen ist der eigentliche Kostentreiber, nicht die Zahl der `new IntersectionObserver(...)`-Aufrufe.
**Beleg:** Herkunft: `tools/iocount.mjs`, `tools/mainthread.mjs` (mccain-digital). Hinweis zur Konfidenz: dass IntersectionObserver-Kosten konkret in „Other" statt in einer eigenen Kategorie landen, ist praktisch beobachtet und in `scripts/mainthread.mjs` fest codiert, aber nicht wörtlich in offizieller Lighthouse-Dokumentation bestätigt — nur der generische Fallback-Mechanismus (unbekanntes Ereignis → Parent-Gruppe → „Other") ist am Quellcode verifiziert. · Sicherheit: gemessen (Kostenskalierung) / vermutet (Zuordnung zu „Other" im Detail)
**Gilt für:** allgemein

### 3. Lighthouses Skriptkosten-Spalte pro URL ist eine Zuordnung, keine Anfragezahl
**Warum:** Lighthouse rechnet ausgeführte/inline Skriptkosten der Dokument-URL als Herkunfts-Label zu; dieselbe URL kann dadurch in einer Kosten-/Attributionstabelle mehrfach auftauchen, ohne dass die Seite tatsächlich mehrfach angefragt wurde.
**Woran man es erkennt:** Ein Bericht schien zu zeigen, dass die eigene Seiten-URL „6× angefragt" wurde; die tatsächliche Netzwerkmessung zeigte 1 Dokument-Request und 25 Requests insgesamt.
**Fix:** Bei einer wiederholt auftauchenden URL in einer Lighthouse-Kosten-/Attributionsspalte zuerst prüfen, ob es sich um eine Skriptkosten-Zuordnung statt eines Requests handelt, und mit einer echten Netzwerkmessung gegenprüfen (`node scripts/requests.mjs <url> --for 12`) statt die Spalte direkt als Netzwerkbefund zu werten.
**Beleg:** mccain-digital, Commit `80beb85` (2026-09-13). · Sicherheit: gemessen
**Gilt für:** allgemein

### 4. V8-Coverage-Bereiche sind verschachtelt, ein naives count>0 meldet 0 % tot für jede Datei
**Warum:** V8s JS-/CSS-Coverage-API liefert Bereiche verschachtelt, äußerster zuerst — ein äußerer Bereich (z. B. eine ganze Funktion) hat fast immer `count > 0`, selbst wenn der innere, eigentlich interessante Bereich nie ausgeführt wurde. Eine naive Prüfung „`count > 0` = benutzt" trifft dadurch fast immer zuerst den äußeren Bereich und meldet praktisch jede Datei als 0 % tot.
**Woran man es erkennt:** Eine so gebaute Coverage-Auswertung meldete 0 % toten Code für jede einzelne Datei im Projekt, unabhängig vom tatsächlichen Nutzungsgrad.
**Fix:** Coverage-Bereiche nach Start-Offset UND Verschachtelungstiefe auswerten und die INNERSTE (am spätesten startende, am engsten umschließende) Range für eine gegebene Codeposition gewinnen lassen, nicht die erste mit `count > 0`. Dieser Skill liefert aktuell kein eigenes Coverage-Skript (Playwright `page.coverage.startJSCoverage()`/`Profiler.takePreciseCoverage()` sind die Rohquelle) — bis eins existiert, diese Verschachtelungsregel in jeder eigenen Coverage-Auswertung von Hand beachten.
**Beleg:** mccain-digital, Commit `0c5eae6` (2026-09-13, Kopfkommentar `deadcode.mjs`); siehe auch [widerlegt.md](widerlegt.md#22-die-v8-coverage-regel-count-größer-0-liefert-einen-korrekten-tot-code-anteil). · Sicherheit: gemessen
**Gilt für:** allgemein

## Beobachter selbst beobachten: IntersectionObserver, ResizeObserver, Timer, rAF

### 5. Timer, rAF und Observer vor dem ersten Seitenskript patchen
**Warum:** Ohne `addInitScript` (vor `page.goto`) hält die Seite zum Patch-Zeitpunkt schon eine Referenz auf die native Funktion (z. B. `const IO = window.IntersectionObserver` im allerersten `<script>`) — der Patch käme zu spät, die Messung wäre leer oder unvollständig.
**Woran man es erkennt:** `scripts/observers.mjs` ersetzt `IntersectionObserver`, `ResizeObserver`, `Element.prototype.getBoundingClientRect`, `setTimeout` und `requestAnimationFrame` per `context.addInitScript()`, bevor die Seite überhaupt navigiert.
**Fix:** `node scripts/observers.mjs <url> --for 15 --sweep` — zählt `getBoundingClientRect`-Aufrufe pro Sekunde UND pro Call-Stack (zeigt, WER liest), bucketet `setTimeout`-Aufrufe nach Verzögerung (deckt Polling-Loops mit fester Millisekundenzahl auf) und `requestAnimationFrame`-Aufrufe pro Sekunde (deckt Endlosschleifen auf, die im Profiler unauffällig wie normale ~60/s-Bildwiederholung aussehen).
**Beleg:** Herkunft: `tools/count.mjs`, `tools/iocount.mjs` (mccain-digital); Prinzip 1:1 in `scripts/observers.mjs`. · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 6. ResizeObserver auf body mit height:100% ist ein Unschulds-Artefakt, kein Beweis
**Warum:** Ist `html,body{height:100%}` gesetzt, ändert `document.body` seine Höhe praktisch nie, egal wie viel Inhalt sich intern ändert — ein `ResizeObserver` darauf feuert dann fast nie, selbst wenn er der Hauptverdächtige für Dauerlast war.
**Woran man es erkennt:** Ein per `ResizeObserver` auf `<body>` gemessener „Hauptverdächtiger" für Dauerlast maß sich mit `scripts/observers.mjs`-artiger Instrumentierung „unschuldig": 4 Aufrufe in 22 s.
**Fix:** Beobachte die tatsächliche Komponentenwurzel (z. B. `#root`/`#app`), nicht pauschal `document.body`, wenn `height:100%` im Spiel ist — sonst wird ein „0 Callbacks"-Ergebnis fälschlich als Entwarnung gelesen.
**Beleg:** mccain-digital, HANDOFF (Fund via `tools/count.mjs`). · Sicherheit: gemessen
**Gilt für:** allgemein

## content-visibility messen

### 7. contentvisibilityautostatechange ist der einzige verlässliche Beweis, die 150-%-Marge gehört gemessen
**Warum:** `content-visibility:auto` entscheidet sein Skip/Show-Verhalten über einen internen, dokumentweiten IntersectionObserver mit `kViewportMarginPercentage = 150.f` (Chromium-Quellcode). Das ist ein Implementierungsdetail, kein garantierter Spec-Wert — Polling per `getComputedStyle` verpasst oder verfälscht den genauen Umschlagpunkt.
**Woran man es erkennt:** Das native Event `contentvisibilityautostatechange` (mit `e.skipped`) feuert einmal initial pro Block und danach nur bei einem echten Zustandswechsel — kein Polling nötig, aber Feature-Detection ist Pflicht (`"oncontentvisibilityautostatechange" in document.body`), sonst wird „keine Events" fälschlich als „nichts wird deferred" statt als „Browser unterstützt es nicht" gelesen.
**Fix:** `node scripts/cv-audit.mjs <url>` — hört den Event-Kanal, scannt danach jedes Element mit berechnetem `content-visibility:auto`/`hidden`, und führt einen Scroll-Sweep in 0,5-Viewport-Schritten, der die tatsächliche Render-Marge pro Block in Pixel UND % Viewporthöhe ausgibt, statt die 150 % anzunehmen.
**Beleg:** Quelle: Chromium HEAD `cabdc32a` (abgerufen 16.09.2026), `display_lock_document_state.cc:123-135`; CSS Containment 2 §4.3: „Elements with content-visibility: auto that have not determined proximity to the viewport must determine their proximity … in the next update the rendering cycle." Nur `auto` ist betroffen — `hidden` bleibt dauerhaft gesperrt. · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 8. Seitenhöhe vor und nach einem vollständigen Scroll vergleichen
**Warum:** Weicht die Gesamthöhe der Seite nach einem kompletten Scroll-Durchlauf von der Höhe vor dem Scroll ab, ist `contain-intrinsic-size` falsch geschätzt — der Platzhalter hatte auf mindestens einer Achse keine passende reservierte Größe, und die Seite springt beim echten Scrollen.
**Woran man es erkennt:** `scripts/cv-audit.mjs` misst `document.documentElement`-Höhe vor dem Sweep und danach und meldet die Differenz in Pixel als Befund.
**Fix:** Bei jedem content-visibility-Umbau `scripts/cv-audit.mjs` ohne `--no-sweep` laufen lassen und auf „Seitenhöhe ändert sich beim Scrollen um …px" prüfen, bevor der Umbau als abgeschlossen gilt.
**Beleg:** Skript-Logik `scripts/cv-audit.mjs`, Herkunft `tools/cvtest.mjs` (mccain-digital). · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 9. IO-Ziel in übersprungenem content-visibility-Block: Kosten in der Bootstrap-Phase
**Warum:** Frühere, zu scharfe Lesart: „Ein IntersectionObserver-Ziel in einem bereits übersprungenen Subtree erzwingt pro Frame Style/Layout." Für den eingeschwungenen Zustand ist das widerlegt (Details: [widerlegt.md](widerlegt.md#6-intersectionobserver-ziele-in-gesperrten-subtrees-erzwingen-pro-frame-layout)) — `IntersectionGeometry::GetTargetLayoutObject` gibt für Nachfahren übersprungener Subtrees `nullptr` zurück, ohne Style/Layout zu erzwingen. Zwei belegte Mechanismen erklären den gemessenen Effekt stattdessen: (a) in der Bootstrap-Phase, bevor die Nähe zum Viewport überhaupt bestimmt ist, läuft für jedes Ziel eine echte Geometrie-Berechnung — die Kosten skalieren hier mit der Zielzahl; (b) jedes Layout-lesende Aufruf (`getBoundingClientRect`, `offset*`, `client*`, `scroll*`) auf einem Knoten IN einem übersprungenen Block erzwingt Style + Layout der gesperrten Vorfahren — und lädt dabei deren CSS-Bilder (`background-image`/`mask-image`), weil Bild-Fetches beim Style-Recalc starten, nicht bei Layout/Paint.
**Woran man es erkennt:** `scripts/observers.mjs` (Ziel-Zahl je Observer) kombiniert mit `scripts/cv-audit.mjs` (Skip/Show-Zustand je Block) zeigt, ob viele IO-Ziele in einer Bootstrap-Phase gleichzeitig aktiv sind, und `scripts/mainthread.mjs` zeigt, ob Layout-Lese-Aufrufe zeitlich mit dem Laden von Hintergrundbildern zusammenfallen.
**Fix:** Beobachtung/Messung eines Elements erst starten, wenn der umschließende Block gerendert hat (`contentvisibilityautostatechange` mit `e.skipped === false`), statt Ziele blind schon während der Bootstrap-Phase zu registrieren.
**Beleg:** Chromium HEAD `cabdc32a` (16.09.2026), CSS Containment 2 §4.3/§4.5; gemessener Effekt: 28 → 11 Anfragen, `computeIntersections` 508 ms bei 132 Zielen → 97 ms bei 25 Zielen. Projektfall: mccain-digital, Commit `902108a`/`ca40094` (16.9.2026), siehe [fallstudien.md](fallstudien.md#2026-09-16--mccain-digital--v5-optimierungsrunde-und-chromium-verifikation). · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 10. Screenshot und IntersectionObserver lügen für übersprungene Blöcke
**Warum:** Übersprungener Inhalt wird nicht gemalt — ein Vollseiten-Screenshot zeigt für jeden noch `skipped`-Block nichts Verlässliches. IntersectionObserver-Ziele darin lösen ebenfalls nicht aus.
**Woran man es erkennt:** `document.getAnimations()` sieht keine CSS-Animationen in übersprungenen content-visibility-Blöcken — „nicht gefunden" heißt hier „noch nicht gerendert", nicht „existiert nicht".
**Fix:** Vor einem visuellen Vergleich oder einer Animations-/Sichtbarkeitsprüfung den Block einmal aktiv rendern (Scroll-Sweep — bei `scripts/cv-audit.mjs` standardmäßig an, nur per `--no-sweep` abschaltbar; bei `scripts/animations.mjs` per `--sweep` einschalten), statt den Anfangszustand als vollständig zu behandeln.
**Beleg:** Skript-Kopfkommentar `scripts/cv-audit.mjs`, `scripts/animations.mjs`. · Sicherheit: dokumentiert
**Gilt für:** allgemein

## fps und Software-GL

### 11. fps per rAF-Sampling über viele Frames messen, p95 nicht Einzeldifferenz
**Warum:** Eine fps-Zahl aus EINER `performance.now()`-Differenz zweier Frames ist Rauschen — ein einzelner GC-Pause-Frame verzerrt das Ergebnis vollständig.
**Woran man es erkennt:** `scripts/fps.mjs` sammelt jeden `requestAnimationFrame`-Zeitstempel über das gesamte Messfenster IM Browser (kein Node↔Browser-Polling, das die Kette selbst stören würde), bucketet sie in 1-s-Fenster und berechnet fps als Framezahl im Bucket sowie p95 der Frame-zu-Frame-Abstände; Jank = Abstand > 33 ms.
**Fix:** `node scripts/fps.mjs <url> --for 10 --cpu 1,4` — immer die ganze Zeitleiste ansehen, nicht nur den Mittelwert: eine gut gebaute Seite fährt ihre Qualität testweise wieder hoch, ein einzelner niedriger Wert ist kein dauerhaftes Drosseln — erst ein Plateau über mehrere Sekunden ist eins.
**Beleg:** Skript-Kopfkommentar `scripts/fps.mjs`, Herkunft `tools/pxfps.mjs` (mccain-digital). · Sicherheit: dokumentiert
**Gilt für:** allgemein, WebGL/Canvas

### 12. Nur Software-GL erzeugt echte WebGL-Last — CPU-Drosselung erreicht den GPU-Prozess nicht
**Warum:** `Emulation.setCPUThrottlingRate` bremst nur den Renderer-Hauptthread-Prozess, nicht den GPU-Prozess. Eine WebGL-Animation, die im Compositor/GPU-Prozess läuft, bremst dadurch kaum — eine GPU-beschleunigte Headless-Messung ist für „was sieht ein Besucher mit schwacher Hardware" strukturell zu optimistisch. Präzisierung: SwiftShader läuft laut Chromiums eigener Doku ebenfalls IM GPU-Prozess, nicht im gedrosselten Renderer — der Unterschied ist also der PROZESS (Renderer vs. GPU), nicht Hardware- vs. Software-Rendering. `--cpu` und `--software-gl` testen deshalb zwei unabhängige Achsen (Renderer-JS-Last vs. Rendering-Hardware-Qualität), keine sich gegenseitig verstärkende Drosselung derselben Arbeit (Details: [widerlegt.md](widerlegt.md#9-cpu-drosselung-lässt-sich-an-gedrosselter-shader-framerate-erkennen)).
**Woran man es erkennt:** `scripts/fps.mjs --software-gl` startet Chromium zusätzlich mit `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader` und liest den tatsächlich genutzten Renderer über `WEBGL_debug_renderer_info`/`UNMASKED_RENDERER_WEBGL` aus, um zu bestätigen, dass wirklich Software rendert (nicht nur GPU + Drosselung).
**Fix:** `node scripts/fps.mjs <url> --cpu 1,4 --software-gl` — jedes CPU-Szenario zusätzlich mit SwiftShader wiederholen, um beide Achsen (JS-Last, Rendering-Qualität) getrennt und in Kombination zu erfassen.
**Beleg:** Skript-Kopfkommentar `scripts/fps.mjs` und `scripts/mainthread.mjs`, `scripts/lib/browser.mjs` (`SOFTWARE_GL_ARGS`); Herkunft `tools/fpsslow.mjs`; Quelle: Chromium `docs/gpu/swiftshader.md`, abgerufen 2026-09-16 („all of the rendering work is done in a separate process; the GPU process"). · Sicherheit: dokumentiert
**Gilt für:** WebGL/Canvas

### 13. getContext() blockiert synchron und kann den ersten Paint der ganzen Seite verzögern
**Warum:** `HTMLCanvasElement.getContext()` ist ein synchroner Aufruf; unter Software-GL kann allein die Kontext-Erzeugung mehrere hundert Millisekunden Hauptthread-Zeit kosten (siehe Regel 9 in [messen-lighthouse-fenster.md](messen-lighthouse-fenster.md#9-ein-zu-später-erster-paint-verschiebt-das-ganze-messfenster)) — und liefert laut Spezifikation `null`, wenn aus irgendeinem Grund (nicht unterstützte Context-ID, GPU-Blacklisting, Ressourcenerschöpfung) kein Kontext erzeugt werden kann.
**Woran man es erkennt:** Praxisbeobachtungen (sekundäre Quelle, nicht Google-primär): `--disable-gpu` erzwingt lautlos wieder SwiftShader; `--in-process-gpu` zerstört die von ANGLE benötigte GL-Surface; Mesa-llvmpipe braucht selbst headless eine echte GL/X11-Surface — ohne sie degradiert WebGL laut Beobachtung „silently … to a flat 2D fallback", während die Seite trotzdem HTTP 200 liefert.
**Fix:** `getContext()`-Aufrufe für Deko-Canvases nie im kritischen Render-Pfad platzieren (das WIE gehört zu [rendern-canvas-webgl.md](rendern-canvas-webgl.md#1-getcontext-ist-synchron-der-erste-paint-darf-nicht-auf-canvas-oder-webgl-warten)); zur reinen Messung des Effekts `scripts/fps.mjs --software-gl` (Renderer-Bestätigung) mit einer FCP-Messung (Regel 9 in [messen-lighthouse-fenster.md](messen-lighthouse-fenster.md#9-ein-zu-später-erster-paint-verschiebt-das-ganze-messfenster)) kombinieren.
**Beleg:** Quelle: MDN `HTMLCanvasElement.getContext()`, abgerufen 2026-09-16 (Standardverhalten, primär); Microlink-Blog „WebGL without a GPU", abgerufen 2026-09-16 (Praxisbeobachtungen, sekundär, eigene Benchmarks des Autors). · Sicherheit: dokumentiert
**Gilt für:** WebGL/Canvas

### 14. SwiftShader wird von Chrome zunehmend blockiert
**Warum:** Der automatische WebGL-Fallback auf SwiftShader gilt als Sicherheitsrisiko (JIT-Code im GPU-Prozess) und wird von Chrome zunehmend abgeschaltet; DevTools zeigt seit Chrome 130 eine Warnung dazu.
**Woran man es erkennt:** Ein `getContext("webgl")`, das in einer aktuellen Chrome-Version plötzlich `null` statt eines Software-Kontexts liefert, kann dieser Meilenstein sein statt eines echten Bugs.
**Fix:** Für Software-GL-Messungen `--enable-unsafe-swiftshader` explizit setzen (bereits in `scripts/lib/browser.mjs` `SOFTWARE_GL_ARGS` enthalten).
**Beleg:** Quelle: Blink-dev Intent-to-Remove-Thread, abgerufen 2026-09-16. Exakter Default-Removal-Meilenstein widersprüchlich berichtet (eine Quelle „Shipping on Desktop 137", eine andere M133) — als offen markiert, siehe [Offene Fragen](#offene-fragen). · Sicherheit: vermutet (Meilenstein) / dokumentiert (Flag)
**Gilt für:** WebGL/Canvas

### 15. Nur echte GPU-Hardware beweist, dass WebGL wirklich rendert — Headless kann falsch UND unbewegt sein
**Warum:** SwiftShader ist ein reiner Software-WebGL-Fallback ohne echte GPU; bestimmte Shader-/Compositing-Pfade liefern dort schlicht kein Bild (nicht nur langsam — sichtbar schwarz), unabhängig davon, ob die Seite auf echter Hardware korrekt rendert. Zusätzlich setzen Headless-Browser standardmäßig `prefers-reduced-motion:reduce`, wodurch `clip-path`- und SMIL-Zeitlinien in Headless zusätzlich als unzuverlässig gelten.
**Woran man es erkennt:** Ein interaktiver Three.js-Canvas ließ sich per Playwright-Headless (SwiftShader) nicht screenshotten — der Canvas blieb durchgängig schwarz, obwohl er auf echter GPU korrekt rendert. Trat unabhängig in zwei Projekten auf.
**Fix:** WebGL-/Canvas-Features, deren KORREKTHEIT (nicht nur Performance) geprüft werden soll, zusätzlich auf echter GPU-Hardware verifizieren, nie ausschließlich per Headless-CI-Screenshot; für einen Headless-Animationstest `reducedMotion:"no-preference"` explizit setzen (`scripts/lib/browser.mjs` `launch({reducedMotion:false, …})`), sonst testet man versehentlich den reduced-motion-Zustand.
**Beleg:** 360 (wow-demo) und whatever-recall-internal (GraphCanvas), siehe [fallstudien.md](fallstudien.md). · Sicherheit: gemessen
**Gilt für:** WebGL/Canvas

## Mobile-Emulation, Scrollen, reduced motion, Viewports

### 16. "mobile" heißt Touch + isMobile, nicht nur ein schmaler Viewport
**Warum:** Ohne `isMobile:true`/`hasTouch:true` greifen `(hover:hover)`/`(pointer:fine)`-Media-Queries der Seite wie am Desktop — die Messung prüft dann eine Variante, die kein echtes Mobilgerät je zeigt.
**Woran man es erkennt:** `scripts/lib/browser.mjs` setzt bei `mobile:true` sowohl `isMobile` als auch `hasTouch` im Playwright-Context, Viewport 412×915 bei `deviceScaleFactor:1.75` (Moto G Power laut Lighthouse: 412×823 — die 915 entsprechen Playwrights Preset für dasselbe Gerät ohne Browser-Leiste; für exakte CLS-/Layout-Vergleiche mit einem echten PSI-Report ist das ein kleiner, aber realer Unterschied in der Höhe).
**Fix:** Bei jedem Skript in diesem Skill `--mobile` statt manueller `--width 412 --height ...` nutzen, damit Touch/isMobile automatisch mitgesetzt werden.
**Beleg:** Quelle: `scripts/lib/browser.mjs`; PSI-Referenzwerte GoogleChrome/lighthouse `core/config/constants.js`, 13.4.1, 2026-09-16. · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 17. Scrollen in Messläufen immer instant, nie smooth
**Warum:** Setzt eine Seite `scroll-behavior:smooth`, unterbricht jeder neue `scrollBy`/`scrollIntoView`-Aufruf im schnellen Testtakt die noch laufende Smooth-Scroll-Animation des vorherigen Aufrufs — ein `scrollBy()` im 40-ms-Takt brach die eigene Animation immer wieder ab.
**Woran man es erkennt:** Alle Sweep-Funktionen in diesem Skill (`scripts/observers.mjs`, `scripts/cv-audit.mjs`, `scripts/fps.mjs --scroll`) rufen `scrollTo({top, behavior:"instant"})` auf, nie den Seiten-Default.
**Fix:** In jedem selbst geschriebenen Mess-/Automatisierungsskript, das wiederholt und schnell scrollt, `behavior:"instant"` explizit erzwingen, unabhängig davon, was die Seite selbst als Default setzt.
**Beleg:** mccain-digital, HANDOFF „STAND 16.9. NACHMITTAGS", „Fallen", Zeile 148-150. · Sicherheit: gemessen
**Gilt für:** allgemein

### 18. reducedMotion und vorab akzeptierten Consent für Screenshot-Vergleiche setzen
**Warum:** Ohne `reducedMotion:"reduce"` und ohne vorab per `localStorage` akzeptierten Consent laufen Reveal-Animationen, Zähler und rotierende Inhalte während des Screenshots weiter — ein Pixel-Diff (Regel 4 in [messen-methode.md](messen-methode.md#4-pixel-diff-und-textmetrics-statt-behauptung-und-augenmaß)) meldet dann Unterschiede, die keine echte Regression sind, sondern nur unterschiedliche Animationsphasen.
**Woran man es erkennt:** `scripts/lib/browser.mjs`s `launch({reducedMotion:true})` setzt den Playwright-Context auf `reduce`; für Consent-Banner muss der Wert zusätzlich vor `page.goto` per `addInitScript` in `localStorage` gesetzt werden.
**Fix:** Bei jedem visuellen Vergleich beide Seiten mit identischem Motion-/Consent-Zustand laden — sonst meldet das Werkzeug Unterschiede, die keine sind.
**Beleg:** Herkunft `tools/v5compare.mjs` (mccain-digital). · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 19. Emulierter iPhone-Viewport meldet pointer:fine, nicht pointer:coarse
**Warum:** Die Emulation eines iPhones über reine Viewport-Größe (z. B. 390 px Breite) meldet dem Media-Query-System `pointer:fine`, nicht `pointer:coarse` wie ein echtes Touchgerät — eine nur bei `pointer:coarse` greifende Regel (z. B. 16-px-Mindestschriftgröße gegen iOS-Auto-Zoom) lässt sich damit nicht verifizieren.
**Woran man es erkennt:** Ein Test, der ausschließlich `pointer:coarse`/`hover:none` über eine Device-Emulation prüft, bleibt für diese Regelklasse blind, egal wie oft er läuft.
**Fix:** Zusätzlich zu einer `pointer:coarse`-Regel eine breitenbasierte Parallelregel einbauen, die nicht von der Pointer-Emulation abhängt, oder auf einem echten Touchgerät gegenprüfen.
**Beleg:** mccain-digital, Commit `5a132f3` (2026-09-04). · Sicherheit: gemessen
**Gilt für:** allgemein

### 20. Einen realen skalierten Geräte-Viewport in jede Messreihe aufnehmen
**Warum:** Standard-Breakpoint-Listen (390, 1512, 1920 px …) decken keine realen Betriebssystem-Skalierungsfaktoren ab, unter denen echte Nutzer die Seite sehen.
**Woran man es erkennt:** 1090×614 ist kein Standard-Breakpoint, sondern ein 1920×1080-Bildschirm bei 175 % Windows-Skalierung — ein reales Gerät, auf dem ein Layout tatsächlich zerbrochen war.
**Fix:** Neben Standard-Breakpoints mindestens einen realen, skalierten Geräte-Viewport in jede automatisierte Layout-/Performance-Messreihe aufnehmen, sobald bekannt ist, worauf Stakeholder tatsächlich schauen (`--width`/`--height` auf jedem Skript in diesem Ordner).
**Beleg:** mccain-digital, HANDOFF „Vor jeder Änderung, ohne Ausnahme", Zeile 2201-2203. · Sicherheit: dokumentiert
**Gilt für:** allgemein

## Offene Fragen

- Der exakte Chrome-Meilenstein, ab dem der automatische SwiftShader-WebGL-Fallback standardmäßig entfernt wurde, ist zwischen Quellen widersprüchlich (Desktop M137 vs. M133); chromestatus.com ließ sich als clientseitig gerenderte SPA in dieser Recherche nicht direkt auslesen.
- Ob Googles eigene PSI/Lightrider-Chrome-Instanz `--enable-unsafe-swiftshader` selbst explizit setzt, um WebGL-Software-Rendering trotz entferntem Auto-Fallback zu erhalten, ist nicht öffentlich dokumentiert — am zuverlässigsten empirisch über eine echte PSI-Messung einer Testseite mit sichtbarem `getContext`-Ergebnis zu klären.
- Ob IntersectionObserver-bezogene Trace-Events konkret (mangels Mapping) in Lighthouses „Other"-Kategorie landen, ist nur als generischer Fallback-Mechanismus am Quellcode verifiziert, nicht als benannter Einzelfall in offizieller Lighthouse-Doku oder -Issues.
- Die genaue Kausalkette der bei 125 ms ladenden Mask-Bilder im content-visibility-Fall (IO-Geometrie in der Bootstrap-Phase oder ein Layout-Lesen in Seiten-eigenen IO-Callbacks) ist nicht abschließend verifiziert.

## Quellen

- https://github.com/GoogleChrome/lighthouse/blob/main/core/lib/tracehouse/task-groups.js
- https://github.com/GoogleChrome/lighthouse/blob/main/core/lib/tracehouse/main-thread-tasks.js
- https://github.com/GoogleChrome/lighthouse/blob/main/core/audits/mainthread-work-breakdown.js
- https://github.com/GoogleChrome/lighthouse/blob/main/core/config/constants.js
- Chromium main, HEAD cabdc32a717663075a71718eb8750f6abdaedb64 (intersection_geometry.cc, display_lock_utilities.cc, display_lock_document_state.cc, document.cc, css_image_value.cc), abgerufen 16.09.2026
- CSS Containment Module Level 2, §4.3 und §4.5 (w3.org)
- w3c/csswg-drafts#8542; Mozilla Bugzilla 1807253
- https://chromium.googlesource.com/chromium/src/+/refs/heads/main/docs/gpu/swiftshader.md
- https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext
- https://microlink.io/blog/webgl-without-a-gpu
- https://groups.google.com/a/chromium.org/g/blink-dev/c/yhFguWS_3pM
- https://chromestatus.com/feature/5166674414927872
- mccain-digital: HANDOFF.md, CHANGELOG.md, Commits (siehe einzelne Belege oben)
