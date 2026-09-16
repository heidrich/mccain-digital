# Rendern — html-performance

> Teil des Skills [[html-performance]] · Stand 2026-09-16 · Belege: mccain-digital (HANDOFF, CHANGELOG, Commits), weitere Projekte des Owners, Recherche mit Quell-URLs

Diese Datei deckt alles ab, was nach dem ersten Bild den Hauptthread, das Layout und die GPU beschäftigt: content-visibility im Detail, erzwungener Reflow, IntersectionObserver/ResizeObserver, Hauptthread und „Other", Animationen, Canvas/WebGL, DOM-Größe. Ladereihenfolge, Fonts, Bilder und Caching stehen in [laden.md](laden.md), Lighthouse/PSI-Scoring in [lighthouse-psi.md](lighthouse-psi.md), Mess-Methodik in [messen.md](messen.md), der Framework-Delta in [react-nextjs.md](react-nextjs.md).

## Kurzfassung

**content-visibility**
- **content-visibility:auto auf lange Off-Screen-Sektionen anwenden** — spart Layout/Paint für Nicht-Sichtbares, senkt LCP messbar ([→](#1-content-visibility-auto-auf-lange-off-screen-sektionen-anwenden))
- **contain-intrinsic-size genau setzen und die auto-Form nutzen** — sonst verzerrt eine geratene Platzhaltergröße kurzzeitig die Seitenlänge ([→](#2-contain-intrinsic-size-genau-setzen-und-die-auto-form-nutzen))
- **Die 150-Prozent-Vorrender-Marge von Chrome einplanen** — Chrome rendert Blöcke weit vor dem Viewport-Eintritt vor ([→](#3-die-150-prozent-vorrender-marge-von-chrome-einplanen))
- **content-visibility erzeugt einen Stacking Context und einen Containing Block** — Hintergrund-Layer können über einem außen fixierten Element landen ([→](#4-content-visibility-erzeugt-einen-stacking-context-und-einen-containing-block))
- **Bei content-visibility:hidden den Zustand vor dem Einblenden umschalten** — sonst poppt der Inhalt ungerendert auf ([→](#5-bei-content-visibilityhidden-den-zustand-vor-dem-einblenden-umschalten))
- **Auf contentvisibilityautostatechange hören, checkVisibility nur als Start-Fallback** — Timer-Polling verschwendet Hauptthread-Zeit ([→](#6-auf-contentvisibilityautostatechange-hören-checkvisibility-nur-als-start-fallback))
- **IntersectionObserver in einem content-visibility-Block: die korrigierte Regel** — nicht jedes observe() im Skip-Bereich erzwingt Arbeit, aber Layout-Reads darin schon ([→](#7-intersectionobserver-in-einem-content-visibility-block-die-korrigierte-regel))
- **document.getAnimations() in übersprungenen Blöcken nicht blind vertrauen** — Spezifikation und Projektbeobachtung widersprechen sich hier ([→](#8-documentgetanimations-in-übersprungenen-blöcken-nicht-blind-vertrauen))

**Erzwungener Reflow**
- **Layout-Werte aus Scroll- und Resize-Events cachen, nie pro Frame live lesen** — scrollY & Co. in einer rAF-Schleife erzwingen synchrones Layout ([→](#9-layout-werte-aus-scroll--und-resize-events-cachen-nie-pro-frame-live-lesen))
- **Layout-Properties nie im selben Tick direkt nach einer DOM-Mutation lesen** — scrollWidth/scrollHeight direkt nach append erzwingen Reflow ([→](#10-layout-properties-nie-im-selben-tick-direkt-nach-einer-dom-mutation-lesen))
- **Ein an body gehängtes Sondierungselement erzwingt bei jedem Resize Layout** — Miss-Muster für Style-Messungen ([→](#11-ein-an-body-gehängtes-sondierungselement-erzwingt-bei-jedem-resize-layout))
- **Periodische Vollscans mit getBoundingClientRect skalieren mit der Elementzahl** — Kollisionsscans über alle Content-Elemente sind teuer ([→](#12-periodische-vollscans-mit-getboundingclientrect-skalieren-mit-der-elementzahl))
- **Nicht jede Forced-Reflow-Warnung blind beheben** — manchmal ist die technisch sauberere Lösung sichtbar schlechter ([→](#13-nicht-jede-forced-reflow-warnung-blind-beheben))
- **Nach einem behobenen Messfehler abhängige Kennzahlen als neu zu messen markieren** — sonst mischen sich gültige und ungültige Zahlen ([→](#14-nach-einem-behobenen-messfehler-abhängige-kennzahlen-als-neu-zu-messen-markieren))
- **DOM-Reads im Scroll- und Pointer-Handler cachen statt live zu lesen** — useRef/Cache statt live getBoundingClientRect oder useState-Re-Render ([→](#15-dom-reads-im-scroll--und-pointer-handler-cachen-statt-live-zu-lesen))

**IntersectionObserver und ResizeObserver**
- **IntersectionObserver-Kosten skalieren mit der Zielzahl, nicht der Instanzzahl** — Container statt Einzelelemente beobachten ([→](#16-intersectionobserver-kosten-skalieren-mit-der-zielzahl-nicht-der-instanzzahl))
- **Dauerhaft sichtbare fixierte Elemente nicht mit IntersectionObserver beobachten** — liefert keine Information, kostet aber weiter ([→](#17-dauerhaft-sichtbare-fixierte-elemente-nicht-mit-intersectionobserver-beobachten))
- **IntersectionObserver meldet Übergänge, keine Zustände** — Scroll-Sprünge/Deep-Links überspringen die Schwelle ([→](#18-intersectionobserver-meldet-übergänge-keine-zustände))
- **ResizeObserver auf einem Element mit height:100% feuert praktisch nie** — Wurzel-/Viewport-Element beobachten ([→](#19-resizeobserver-auf-einem-element-mit-height100-feuert-praktisch-nie))
- **MutationObserver mit subtree:true neben hochfrequenten Textänderungen treibt TBT hoch** — jede Mutation löst eine dokumentweite Query aus ([→](#20-mutationobserver-mit-subtreetrue-neben-hochfrequenten-textänderungen-treibt-tbt-hoch))
- **Animationen außerhalb des Viewports pausieren** — Hintergrund-Tab-Throttling schützt nicht vor Offscreen-im-sichtbaren-Tab ([→](#21-animationen-außerhalb-des-viewports-pausieren))

**Hauptthread und „Other"**
- **Nicht-kritische Beobachter und schwere Effekte erst nach Interaktion aktivieren** — halbiert die Hauptthread-Zeit im Ladefenster ([→](#22-nicht-kritische-beobachter-und-schwere-effekte-erst-nach-interaktion-aktivieren))
- **Periodische Timer vor dem Start auf Existenz ihrer Zielelemente prüfen** — sonst läuft ein Timer als reine Verschwendung weiter ([→](#23-periodische-timer-vor-dem-start-auf-existenz-ihrer-zielelemente-prüfen))
- **Vor teuren DOM-Updates die Sichtbarkeit des Zielelements prüfen** — Streaming-Text in ein verstecktes Pane kostet trotzdem ([→](#24-vor-teuren-dom-updates-die-sichtbarkeit-des-zielelements-prüfen))
- **Nach Refactorings von Animationselementen auf leere, weiterlaufende Instanzen prüfen** — Verschachtelung kann Animations-Geister erzeugen ([→](#25-nach-refactorings-von-animationselementen-auf-leere-weiterlaufende-instanzen-prüfen))
- **„Other" im Trace richtig einordnen — und wissen, was es nicht senkt** — Object Pooling, will-change und scheduler.yield senken „Other" NICHT ([→](#26-other-im-trace-richtig-einordnen--und-wissen-was-es-nicht-senkt))
- **Tausende individuelle Inline-Styles kosten TBT auch ganz ohne JavaScript** — Style-Auflösung und Layout sind die Kosten, nicht Skript ([→](#27-tausende-individuelle-inline-styles-kosten-tbt-auch-ganz-ohne-javascript))
- **Platzhalter-Markup gehört in ein inertes template, nie in einen lebendigen Custom-Element-Teilbaum** — sonst rendert der Browser eine unsichtbare Zweitkopie der Seite ([→](#28-platzhalter-markup-gehört-in-ein-inertes-template-nie-in-einen-lebendigen-custom-element-teilbaum))
- **scheduler.yield() und Long Animation Frames verbessern INP, nicht die Hauptthread-Summe** — Yielding verteilt Arbeit um, spart keine ([→](#29-scheduleryield-und-long-animation-frames-verbessern-inp-nicht-die-hauptthread-summe))
- **Nach jedem neuen dauerhaften Effekt explizit gegenmessen** — Sorge vor Regression durch Median-Frame-Zeit und Long-Task-Zahl ersetzen ([→](#30-nach-jedem-neuen-dauerhaften-effekt-explizit-gegenmessen))

**Animationen**
- **Nur transform, opacity und filter animieren, der unanimierte Zustand ist der Endzustand** — alles andere kostet Hauptthread pro Frame ([→](#31-nur-transform-opacity-und-filter-animieren-der-unanimierte-zustand-ist-der-endzustand))
- **will-change:transform gezielt einsetzen, nicht pauschal** — nur für wiederholt betretbare Bereiche, dynamisch, nie auf body ([→](#32-will-changetransform-gezielt-einsetzen-nicht-pauschal))
- **CSS-Override-Reihenfolge bei prefers-reduced-motion: die spätere Regel gewinnt** — Cascade-Reihenfolge schlägt Absicht ([→](#33-css-override-reihenfolge-bei-prefers-reduced-motion-die-spätere-regel-gewinnt))
- **View Transitions unter reduced-motion mit navigation:none abschalten** — animation:none lässt eine leere Transition laufen ([→](#34-view-transitions-unter-reduced-motion-mit-navigationnone-abschalten))
- **prefers-reduced-motion muss auch JS-getriebene Kosten abschalten und live reagieren** — CSS-Media-Query allein reicht nicht ([→](#35-prefers-reduced-motion-muss-auch-js-getriebene-kosten-abschalten-und-live-reagieren))
- **Werte aus laufenden Animationen sind beim Messen unsicher** — calc()-Strings lassen parseFloat still auf 0 fallen ([→](#36-werte-aus-laufenden-animationen-sind-beim-messen-unsicher))
- **view()-Timelines eignen sich nur für Elemente, die noch unsichtbar ins Bild kommen** — sonst zeitbasiert animieren, cover statt entry bei kurzen Elementen ([→](#37-view-timelines-eignen-sich-nur-für-elemente-die-noch-unsichtbar-ins-bild-kommen))
- **Above-the-Fold-Inhalt nicht per Scroll-Reveal oder Fade animieren** — verzögert gefühlte Fertigstellung und stört Audits ([→](#38-above-the-fold-inhalt-nicht-per-scroll-reveal-oder-fade-animieren))
- **Animationsphase aus Wall-Clock-Zeit ableiten, Loops um ein Vielfaches der Periode verschieben** — Frame-Zähler macht Geschwindigkeit von der Bildwiederholrate abhängig ([→](#39-animationsphase-aus-wall-clock-zeit-ableiten-loops-um-ein-vielfaches-der-periode-verschieben))
- **Eine modernere Web-API nicht ohne bestehenden Bedarf migrieren** — erst prüfen, ob das Problem überhaupt noch existiert ([→](#40-eine-modernere-web-api-nicht-ohne-bestehenden-bedarf-migrieren))
- **Eine rAF-Schleife für interaktionsgebundene Effekte soll sich selbst schlafen legen** — self-sleeping statt Dauerlauf ([→](#41-eine-raf-schleife-für-interaktionsgebundene-effekte-soll-sich-selbst-schlafen-legen))
- **Für Scroll-Choreografien Transform-Einzeleigenschaften statt der Shorthand verwenden** — transform überschreibt jeden :hover-Transform ([→](#42-für-scroll-choreografien-transform-einzeleigenschaften-statt-der-shorthand-verwenden))
- **Vor einer Animationsbibliothek natives CSS oder einen eigenen Wrapper prüfen** — Lenis statt bezahltem ScrollSmoother, eigener IO-Wrapper statt GSAP/Framer ([→](#43-vor-einer-animationsbibliothek-natives-css-oder-einen-eigenen-wrapper-prüfen))
- **Früher First Paint, später Speed Index durch weiterlaufende Einblend-Animationen** — FCP/LCP allein zeigen das Problem nicht ([→](#44-früher-first-paint-später-speed-index-durch-weiterlaufende-einblend-animationen))
- **Den wahren Verursacher isoliert messen statt der naheliegenden Komponente die Schuld zu geben** — 146 Animationen in einem 34-px-Logo kosteten mehr als der WebGL-Strom ([→](#45-den-wahren-verursacher-isoliert-messen-statt-der-naheliegenden-komponente-die-schuld-zu-geben))

**Canvas und WebGL**
- **getContext() ist synchron, der erste Paint darf nicht auf Canvas oder WebGL warten** — Software-GL blockiert 230–341 ms, FCP springt auf über 2 s ([→](#46-getcontext-ist-synchron-der-erste-paint-darf-nicht-auf-canvas-oder-webgl-warten))
- **CPU-Throttling in DevTools erreicht den GPU-Prozess nicht** — weder Hardware- noch Software-GL werden dadurch gedrosselt ([→](#47-cpu-throttling-in-devtools-erreicht-den-gpu-prozess-nicht))
- **Adaptive Framerate aktiv mit Backoff hochtasten, nicht aus Stabilität ableiten** — ein gedrosseltes Ziel läuft immer pünktlich ([→](#48-adaptive-framerate-aktiv-mit-backoff-hochtasten-nicht-aus-stabilität-ableiten))
- **WebGL-Kontexte sind ein begrenztes Budget, nie doppelt anhängen, immer freigeben** — Browser verwerfen den ältesten Kontext ab ~30 (Chromium) bzw. 16 (Firefox) ([→](#49-webgl-kontexte-sind-ein-begrenztes-budget-nie-doppelt-anhängen-immer-freigeben))
- **Partikel- und Zellzahl skaliert mit der Fläche, Stride an die Elementgröße anpassen** — derselbe feine Wert auf Karte und Vollbild treibt Kosten quadratisch hoch ([→](#50-partikel--und-zellzahl-skaliert-mit-der-fläche-stride-an-die-elementgröße-anpassen))
- **Canvas-Rasterzellen auf ganze Gerätepixel klemmen** — sonst verschwimmt die Farbe oder der Effekt kollabiert bei bestimmten DPR ([→](#51-canvas-rasterzellen-auf-ganze-gerätepixel-klemmen))
- **Ruhezustand einmal in ein Offscreen-Canvas cachen, pro Frame nur die Dirty-Region neu zeichnen** — zehnfacher Geschwindigkeitsgewinn möglich ([→](#52-ruhezustand-einmal-in-ein-offscreen-canvas-cachen-pro-frame-nur-die-dirty-region-neu-zeichnen))
- **Ein gerastertes Mosaik ist ein kleines Canvas, hochskaliert** — ein drawImage/putImageData ersetzt tausende Einzel-Draw-Calls ([→](#53-ein-gerastertes-mosaik-ist-ein-kleines-canvas-hochskaliert))
- **Beim Verkleinern auf ein grobes Zellraster flächenmittelnd downscalen** — Punktabtastung verwirft Kanten und feine Details zufällig ([→](#54-beim-verkleinern-auf-ein-grobes-zellraster-flächenmittelnd-downscalen))
- **Teure Bildabtastung einmal pro Größe cachen, im Loop nur Lookup und Lerp** — keine Neudekodierung pro Frame ([→](#55-teure-bildabtastung-einmal-pro-größe-cachen-im-loop-nur-lookup-und-lerp))
- **Teure und billige Effekt-Anteile an unterschiedlichem Takt laufen lassen** — Rauschen mit reduzierter Rate, Bewegung mit voller Framerate ([→](#56-teure-und-billige-effekt-anteile-an-unterschiedlichem-takt-laufen-lassen))
- **Vor der naheliegenden Zeichenoperation die tatsächliche Ursache profilen** — 26.000 fillRect wirkten schuldig, zwei Millionen Sinus-Aufrufe waren es ([→](#57-vor-der-naheliegenden-zeichenoperation-die-tatsächliche-ursache-profilen))
- **Vor dem Verwerfen eines Interaktions-Resamplings die Kosten gegen das Frame-Budget messen** — 0,7 ms Median passen komfortabel in 16,7 ms ([→](#58-vor-dem-verwerfen-eines-interaktions-resamplings-die-kosten-gegen-das-frame-budget-messen))
- **Teure synchrone Canvas-Operationen aus dem Interaktions-Hotpath in eine Idle-Phase verschieben** — getImageData im pointerenter-Handler ruckelt sichtbar ([→](#59-teure-synchrone-canvas-operationen-aus-dem-interaktions-hotpath-in-eine-idle-phase-verschieben))
- **Ein Hintergrund-Check muss auch background-image prüfen, nicht nur backgroundColor** — Gradients zählen als Hintergrund ([→](#60-ein-hintergrund-check-muss-auch-background-image-prüfen-nicht-nur-backgroundcolor))
- **Hover-Reveals auf einem Zellraster per Resampling lösen, nicht per zusätzlicher Zeichnung** — inverses Resampling ist günstiger als Kreis+Glow ([→](#61-hover-reveals-auf-einem-zellraster-per-resampling-lösen-nicht-per-zusätzlicher-zeichnung))
- **naturalWidth und naturalHeight sind dichte-korrigierte CSS-Pixel, keine Bitmap-Pixel** — bei drawImage mit srcset zoomt das Bild sonst bis zu 200 % ([→](#62-naturalwidth-und-naturalheight-sind-dichte-korrigierte-css-pixel-keine-bitmap-pixel))
- **getBoundingClientRect liefert bei transformierten Elementen die Hülle, nicht die echte Box** — rotierte Elemente werden falsch vermessen ([→](#63-getboundingclientrect-liefert-bei-transformierten-elementen-die-hülle-nicht-die-echte-box))
- **Beim Schichten von Canvas-Ebenen auf korrektes Alpha-Compositing achten** — zwei deckende Ebenen gegenläufig überblendet erzeugen einen Helligkeits-Puls ([→](#64-beim-schichten-von-canvas-ebenen-auf-korrektes-alpha-compositing-achten))
- **Ein Canvas-Overlay und sein transformiertes Trägerelement laufen sonst auseinander** — ein CSS-transform auf dem Bild ohne den Canvas mitzuführen versetzt beide Ebenen ([→](#65-ein-canvas-overlay-und-sein-transformiertes-trägerelement-laufen-sonst-auseinander))
- **Canvas-Animationseffekte kontrolliert starten und unter reduced-motion gar nicht aufbauen** — Engines starten nicht von selbst, IntersectionObserver muss auslösen ([→](#66-canvas-animationseffekte-kontrolliert-starten-und-unter-reduced-motion-gar-nicht-aufbauen))
- **Canvas-gerasterten Text durch echten DOM-Text mit CSS-Masken-Reveal ersetzen** — teuerster Boot-Pfad, a11y-Falle, Theme-Wechsel-Falle in einem ([→](#67-canvas-gerasterten-text-durch-echten-dom-text-mit-css-masken-reveal-ersetzen))
- **Ein sich wiederholendes Deko-Muster einmal zeichnen und nur per CSS-Transform driften lassen** — null Pro-Frame-JavaScript ([→](#68-ein-sich-wiederholendes-deko-muster-einmal-zeichnen-und-nur-per-css-transform-driften-lassen))
- **Für die konversionskritischste Seite ein Standbild statt Live-WebGL erwägen** — PageSpeed schlägt beeindruckende 3D-Optik ([→](#69-für-die-konversionskritischste-seite-ein-standbild-statt-live-webgl-erwägen))
- **Eine laufende Schleife ist nicht automatisch teuer, neue GPU-Effekte trotzdem vorher messen** — ~2 % Hauptthread bei korrekten Sichtbarkeits-Gates sind kein Optimierungsziel ([→](#70-eine-laufende-schleife-ist-nicht-automatisch-teuer-neue-gpu-effekte-trotzdem-vorher-messen))

**DOM-Größe**
- **Initial unsichtbare Elemente als template auslagern statt live zu rendern** — senkt die aktive DOM-Größe ohne Einsatzbereitschaft zu verlieren ([→](#71-initial-unsichtbare-elemente-als-template-auslagern-statt-live-zu-rendern))
- **Gzip-Größe ist kein Indikator für DOM-Rendering-Kosten** — stark komprimierbare SVG-Struktur kann trotzdem den Hauptthread belasten ([→](#72-gzip-größe-ist-kein-indikator-für-dom-rendering-kosten))
- **Alte DOM-Node-Schwellenwerte sind obsolet** — die neue Insight-Logik misst tatsächliche Layout-/Style-Recalc-Kosten ([→](#73-alte-dom-node-schwellenwerte-sind-obsolet))
- **`will-change`/Compositing-Ebene nie mit `background-clip: text` kombinieren** — Chrome rastert getrennt, der Verlaufstext verschwindet; dreimal im Projekt ([→](#74-will-change-transform-oder-eine-erzwungene-compositing-ebene-nie-mit-background-clip-text-kombinieren))

## Inhalt

- [content-visibility: auto und hidden in der Tiefe](#content-visibility-auto-und-hidden-in-der-tiefe)
- [Erzwungener Reflow](#erzwungener-reflow)
- [IntersectionObserver und ResizeObserver](#intersectionobserver-und-resizeobserver)
- [Hauptthread und „Other"](#hauptthread-und-other)
- [Animationen](#animationen)
- [Canvas und WebGL](#canvas-und-webgl)
- [DOM-Größe](#dom-größe)
- [Offene Fragen](#offene-fragen)
- [Quellen](#quellen)

## content-visibility: auto und hidden in der Tiefe

Grundmechanik, die alle Regeln dieses Abschnitts voraussetzen: `content-visibility: auto` schaltet **immer** Layout-, Style- und Paint-Containment ein, unabhängig davon, ob der Inhalt gerade übersprungen wird — nur Size-Containment und das tatsächliche Überspringen von Layout/Paint der Nachfahren gelten ausschließlich, solange das Element nicht „relevant to the user" ist. Ein Element gilt als relevant, wenn mindestens eines zutrifft: es liegt im Viewport (oder einem UA-Rand darum), es oder sein Inhalt hat Fokus, es oder sein Inhalt ist selektiert, oder es liegt im Top Layer. `content-visibility: hidden` verhält sich für übersprungenen Inhalt wie `display: none` (nicht erreichbar für Find-in-Page, Tab-Reihenfolge, Selektion, Fokus); `auto` bleibt dafür auch während des Skips normal erreichbar — das ist der entscheidende Unterschied bei der Wahl zwischen beiden. Baseline-Support: Chrome/Edge ab 85, Firefox ab 125, Safari ab 18.0 (Quelle: [caniuse](https://caniuse.com/css-content-visibility)).

### 1. content-visibility auto auf lange Off-Screen-Sektionen anwenden
**Warum:** Für Sektionen, die nicht relevant sind, überspringt der Browser Layout und Paint komplett und ersetzt sie durch eine Platzhaltergröße — das spart die Arbeit für den gesamten Rest der Seite, nicht nur für das, was gerade gebraucht wird.
**Woran man es erkennt:** LCP ist hoch, obwohl das LCP-Element selbst klein/früh ist; `scripts/mainthread.mjs` zeigt hohe Layout-/Style-Zeit für Inhalt weit unterhalb des Folds.
**Fix:** `content-visibility: auto` (mit passendem `contain-intrinsic-size`, siehe Regel 2) auf lange, teils außerhalb des Viewports liegende Seitenabschnitte anwenden — fixierte Overlays (`position: fixed`, z. B. Header, Cookie-Banner, globaler Hintergrund-Canvas) dabei explizit ausschließen, sonst greift der Stacking-Context-Fehler aus Regel 4.
**Beleg:** mccain-digital, HANDOFF.md „STAND 13.9. 03:30" Zeile 343: content-visibility auf 15 Sektionen (Runde 7), LCP 2.980 → 1.516 ms (−49 %); dieselben Zahlen zusätzlich in commit `e97dfb0` (2026-09-13) bestätigt, dort mit explizitem Ausschluss der fünf `position: fixed`-Overlays der Seite (2.408 Layout-Knoten über ~19.000 px Seitenlänge für einen ~900-px-Viewport) · Sicherheit: gemessen
**Gilt für:** allgemein

### 2. contain-intrinsic-size genau setzen und die auto-Form nutzen
**Warum:** `contain-intrinsic-size` ist die Platzhaltergröße für eine noch nie gerenderte, übersprungene Sektion. Die `auto <length>`-Form merkt sich zusätzlich die zuletzt tatsächlich gerenderte Größe und nutzt sie als Platzhalter, sobald die Sektion einmal gerendert wurde — nur vor dem allerersten Rendern (keine gespeicherte Größe) gilt die angegebene `<length>`.
**Woran man es erkennt:** Die Gesamtseitenlänge/Scrollbar-Höhe direkt nach dem Laden weicht von der Länge nach dem ersten vollständigen Scroll ab; CLS bleibt dabei oft nahezu unverändert.
**Fix:** `contain-intrinsic-size: auto 900px` statt `contain-intrinsic-size: 900px` — reale Höhen möglichst zur Bauzeit messen und als Startwert einsetzen, damit auch der allererste Skip nah an der Wahrheit liegt.
**Beleg:** mccain-digital, HANDOFF.md „STAND 13.9. 03:30" Zeile 367-371: 15.916 statt 19.611 px direkt nach dem Laden, korrigiert sich beim Scrollen, CLS unverändert bei 0,0012 · Sicherheit: gemessen (Symptom) + dokumentiert (auto-Semantik, [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/contain-intrinsic-size))
**Gilt für:** allgemein

### 3. Die 150-Prozent-Vorrender-Marge von Chrome einplanen
**Warum:** Chromium nutzt für `content-visibility: auto` intern einen eigenen, dokumentweiten IntersectionObserver mit Marge `Length::Percent(kViewportMarginPercentage)`, und diese Konstante ist im Quellcode `150.f` — nicht die 50 %, die die Spezifikation nur als „reasonable default" vorschlägt. Chrome beginnt also, Blöcke bereits ab dem 1,5-fachen der Viewport-Höhe Entfernung vorzurendern, und schaltet sie erst jenseits davon wieder ab.
**Woran man es erkennt:** `cv-audit.mjs` misst die tatsächliche Render-Marge per Scroll-Sweep, statt sie anzunehmen; in eigenen Tests rendern Blöcke bei ≤150 % Viewport-Abstand bereits vor.
**Fix:** Bei der Planung von „was ist in den ersten X Sekunden sichtbar" den 150-%-Vorrender-Bereich mitrechnen — Sektionen, die knapp unterhalb dieser Marge liegen, sind beim Laden bereits gerendert, nicht erst beim Scrollen.
**Beleg:** mccain-digital, HANDOFF.md „STAND 16.9. NACHMITTAGS", „Fallen" Zeilen 133-135: gemessen bei 420/900/915 px Höhe · Chromium-Quellcode `display_lock_document_state.h`/`.cc`: `static constexpr float kViewportMarginPercentage = 150.f;` · Sicherheit: gemessen + dokumentiert
**Gilt für:** allgemein

### 4. content-visibility erzeugt einen Stacking Context und einen Containing Block
**Warum:** Die Paint-Containment-Box, die `content-visibility` immer einschaltet, erzeugt laut Spezifikation einen neuen Stacking Context (§3.4 Punkt 3) und etabliert einen Containing Block sowohl für `position: absolute` **als auch** für `position: fixed`-Nachfahren (§3.4 Punkt 2). Ein Kind mit negativem `z-index` kann diesen Stacking Context nicht mehr verlassen, um mit einem außerhalb liegenden, ebenfalls negativ gestackten Geschwister-Element (z. B. einem `position: fixed`-Canvas dahinter) zu konkurrieren — die ganze Sektion wird an ihrer eigenen, normalerweise `z-index: auto` liegenden Position im Elternkontext gemalt, also oberhalb eines global negativ gestackten Canvas. Dieselbe Paint-Containment-Box hat eine zweite, unabhängige Nebenwirkung: Sie beschneidet ihren Inhalt an der Padding-Kante, auch bei `overflow: visible` — ein Kind mit `transform: scale()` über 1 kann dadurch sichtbar abgeschnitten werden, wo es ohne `content-visibility` frei über den Rand gereicht hätte (bisher nur spezifiziert, nicht im Projekt beobachtet).
**Woran man es erkennt:** Ein fixierter Hintergrund-Canvas (`z-index: -1`) verschwindet hinter Sektionen, die selbst dunkle Grund-Layer mit `z-index: -2` haben; `cv-audit.mjs` prüft das automatisch (eingebaute Falle „STACKING CONTEXT").
**Fix:** Die `content-visibility`-Markierung (z. B. das Attribut, an dem der Build sie erkennt) auf einen inneren Inhalts-Wrapper setzen, der auf den Hintergrund-Layer folgt — nicht auf die Sektion selbst. So bleibt der Grund-Layer im normalen Seiten-Stacking-Context, während der teure Inhalt weiterhin übersprungen wird. Ein Build-Guard, der prüft, dass kein Negativ-`z-index`-Layer nicht-leer ist, verhindert Rückfälle.
**Beleg:** mccain-digital, HANDOFF.md „STAND 16.9. Pixelstrom" Zeilen 170-189: `data-cv` in `tools/prerender.mjs` auf den Inhalts-Wrapper statt die Sektion verschoben, `verify_site.mjs`-Tor („no background layer over the stream") schlug vorher bei 21 von 21 Seiten fehl, danach 21/21 grün; identischer Bug zusätzlich am 16.9. in CHANGELOG.md unter „Pixelstrom wieder vor den dunklen Bändern" dokumentiert (commit `e5d3353`) · Sicherheit: gemessen + dokumentiert (Mechanismus laut [CSS Containment 2](https://www.w3.org/TR/css-contain-2/#paint-containment) bestätigt)
**Gilt für:** statisches HTML (Effekt tritt bei jedem Stacking-Kontext-Konflikt mit content-visibility auf, unabhängig vom Rendering-Ansatz)

### 5. Bei content-visibility:hidden den Zustand vor dem Einblenden umschalten
**Warum:** `content-visibility: hidden` entfernt den Renderzustand eines Elements vollständig, solange es aktiv ist. Wird ein Panel eingeblendet, ohne vorher den Zustand zu ändern, der `content-visibility: hidden` aufhebt, ist es beim ersten Sichtbarwerden schlicht nicht gerendert.
**Woran man es erkennt:** Ein Panel/Menü/Modal poppt beim Öffnen leer oder unvollständig auf und „rastet" erst einen Frame später ein.
**Fix:** Den Zustandswechsel, der `content-visibility: hidden` aufhebt (z. B. ein Attribut wie `data-v5-open`), **vor** dem sichtbaren Einblenden setzen, nie gleichzeitig oder danach.
**Beleg:** mccain-digital, HANDOFF.md „STAND 16.9. NACHMITTAGS" Zeile 113-115, als offener Implementierungshinweis für Stufe 2 des Mega-Menüs vermerkt · Sicherheit: vermutet (noch nicht umgesetzt, aber aus der Spezifikation direkt ableitbar)
**Gilt für:** allgemein

### 6. Auf contentvisibilityautostatechange hören, checkVisibility nur als Start-Fallback
**Warum:** `contentvisibilityautostatechange` feuert auf einem Element mit `content-visibility: auto`, wenn es beginnt oder aufhört, relevant zu sein; `event.skipped` gibt den neuen Zustand an. Alle drei Engines (Chromium, WebKit, Gecko) feuern es beim allerersten Übergang von „undefiniert" zu einem Relevanz-Wert — es gibt also praktisch einen initialen Fire pro Element. `checkVisibility({contentVisibilityAuto: true})` prüft synchron, ob ein Element gerade übersprungen wird, taugt aber nur als Fallback für den Start, bevor das erste Event gelaufen ist, nicht als Ersatz für laufende Beobachtung.
**Woran man es erkennt:** Arbeit (Beobachter, Nachladen, Animations-Scans), die an einen Timer statt an dieses Event gekoppelt ist, läuft auch dann, wenn der zugehörige Block noch gar nicht gerendert ist — oder verpasst, dass er gerade gerendert wurde.
**Fix:** Jede pro Sektion nötige Arbeit an `contentvisibilityautostatechange` koppeln, mit `checkVisibility({contentVisibilityAuto: true})` als synchronem Fallback für den initialen Zustand vor dem ersten Event. Tot geglaubten Code (z. B. einen Timer, der nach nicht mehr existierenden Elementen sucht) beim Umbau konsequent entfernen statt weiterlaufen zu lassen.
**Beleg:** mccain-digital, HANDOFF.md „STAND 16.9. NACHMITTAGS" Zeilen 95-103, 122-124: Teil der Maßnahmen, die „Other" (Desktop) von 1.340 auf 641 ms halbierten · Sicherheit: gemessen (Projekt) + dokumentiert ([MDN Event](https://developer.mozilla.org/en-US/docs/Web/API/Element/contentvisibilityautostatechange_event), [MDN checkVisibility](https://developer.mozilla.org/en-US/docs/Web/API/Element/checkVisibility))

**Achtung beim Bauen:** Ein noch offenes CSSWG-Issue (#9803) beschreibt eine Race Condition — weil die Viewport-Näherungsberechnung nicht immer synchron zum ersten Style/Layout-Pass vorliegt, kann in manchen Fällen zusätzlich zum initialen Event kurz danach ein zweites, korrigierendes Event feuern, uneinheitlich zwischen Durchläufen. Handler entsprechend idempotent schreiben (siehe [Offene Fragen](#offene-fragen)).
**Gilt für:** allgemein

### 7. IntersectionObserver in einem content-visibility-Block: die korrigierte Regel
**Warum:** Beim Bau von `motion-budget.js` fielen 14 Logo-Masken auf, die trotz Lage in einem übersprungenen `content-visibility`-Block bereits bei 125 ms luden. Die naheliegende, im Projekt zunächst gezogene Schlussfolgerung war: „ein IntersectionObserver-Ziel in einem übersprungenen Block erzwingt pro Berechnung Style/Layout dieses Blocks". Diese scharfe Lesart ist **für den eingeschwungenen Zustand widerlegt** und darf nicht in dieser Form weitergegeben werden.
**Was tatsächlich passiert (Chromium main, HEAD `cabdc32a717663075a71718eb8750f6abdaedb64`, Quelldateien verifiziert):**
1. **Eingeschwungener Zustand — billig, erzwingt nichts:** `IntersectionGeometry::GetTargetLayoutObject` (`intersection_geometry.cc:313-334`) bricht für Ziele in gesperrten Subtrees früh ab: `if (target->GetFrameView()->IsDisplayLocked() || DisplayLockUtilities::IsInLockedSubtreeCrossingFrames(target_element)) { return nullptr; }`. `IsInLockedSubtreeCrossingFrames` (`display_lock_utilities.cc:668-692`) ist ein reiner Ancestor-Walk ohne Seiteneffekte — kein Aufruf von `UpdateStyleAndLayoutForNode` im IO-Codepfad.
2. **Bootstrap-Phase — hier entstehen die echten Kosten:** Bevor `content-visibility: auto` seine Nähe zum Viewport bestimmt hat, ist noch nichts gesperrt (CSS Containment 2 §4.3, normativ). In dieser Phase laufen Style, Layout **und Bild-Fetches** normal, und jedes Autor-IO-Ziel durchläuft eine echte `IntersectionGeometry`-Berechnung — das erklärt Kosten proportional zur Zielzahl.
3. **Der eigentliche Trigger, „forced rendering":** `Document::UpdateStyleAndLayoutForNode` (`document.cc:2990-3002`) nutzt `DisplayLockUtilities::ScopedForcedUpdate`, das für jeden Vorfahren `ForceDisplayLockIfNeeded` aufruft. Das ist der Pfad hinter `getBoundingClientRect()`, `offsetTop`, `clientWidth` & Co. auf einem Knoten **im** übersprungenen Block — nicht hinter dem IO-`observe()`-Aufruf selbst. Chromium warnt dafür explizit in der Konsole: „Rendering was performed in a subtree hidden by content-visibility." (nach 500 Meldungen unterdrückt).
4. **CSS-Bilder laden beim Style-Recalc:** `CSSImageValue::CacheImage` (`css_image_value.cc:113-131`) startet den Fetch beim Aufbau des ComputedStyle — wird also entweder in der Bootstrap-Phase (2) oder durch erzwungenen Style eines Layout-Reads (3) ausgelöst, nicht durch Layout oder Paint selbst.
**Woran man es erkennt:** Ressourcen (hier: Masken-Bilder) laden früher als erwartet, obwohl ihr Block als „übersprungen" gilt; `computeIntersections`-Zeit im Trace steigt mit der Zielzahl unabhängig davon, ob Ziele in content-visibility-Blöcken liegen.
**Fix:** (a) Wie in Regel 16: IO-Ziele auf Container statt Einzelelemente bündeln, das senkt die Kosten in der Bootstrap-Phase direkt. (b) Beobachtung/Messung eines Blocks erst starten, wenn er tatsächlich rendert (`contentvisibilityautostatechange` mit `skipped === false`, siehe Regel 6) — nicht weil `observe()` selbst schädlich wäre, sondern weil das die Bootstrap-Phase-Kosten vermeidet und verhindert, dass eigener Code aus Versehen Layout-Reads auf Knoten im gesperrten Subtree ausführt. (c) Niemals `getBoundingClientRect`, `offsetTop`, `clientWidth` oder ähnliche layout-erzwingende APIs (siehe Regel 9) auf einem Knoten **innerhalb** eines aktuell übersprungenen `content-visibility: auto`-Blocks aufrufen — das erzwingt Style **und** Layout der gesperrten Vorfahren und lädt dabei deren CSS-Bilder vorzeitig. Nur `content-visibility: hidden` bleibt dauerhaft gesperrt; `auto` kann jederzeit in die Bootstrap- oder Render-Phase wechseln.
**Beleg:** mccain-digital, HANDOFF.md „STAND 16.9. NACHMITTAGS", „Fallen" Zeilen 129-132: 14 Masken laden nicht mehr bei 125 ms nach Entfernen der `observe()`-Aufrufe auf den Kindelementen; motion-budget.js Container-Bündelung senkt IO-Zeit 508 → 97 ms, Anfragen 28 → 11 · `scratchpad/skill/raw/chromium_io_verdict.md` (16.09.2026, Chromium-Quellcodeprüfung) · Sicherheit: gemessen (Zahlen) + dokumentiert (Mechanismus, Chromium-Quellcode); die ursprüngliche scharfe Formulierung ist **widerlegt** (siehe [widerlegt.md](widerlegt.md#6-intersectionobserver-ziele-in-gesperrten-subtrees-erzwingen-pro-frame-layout))
**Gilt für:** allgemein

### 8. document.getAnimations() in übersprungenen Blöcken nicht blind vertrauen
**Warum:** Ein an `document.getAnimations()` gekoppeltes Motion-Budget-System im Projekt erfasste CSS-Animationen in übersprungenen `content-visibility`-Blöcken nicht. Die CSSWG hat in Issue #5611 aber beschlossen, dass `content-visibility` solche Animationen **pausieren** soll (wie `animation-play-state: paused`), nicht entfernen — ein pausiertes Web-Animations-API-Objekt bleibt nach dem allgemeinen Modell ein normal existierendes Animation-Objekt. `element.getAnimations()` liefert ohne `{subtree: true}` ohnehin nur Animationen des Elements selbst, nicht seiner Nachfahren. Diese Spezifikations-Aussage widerspricht der Projektbeobachtung — welche Variante in aktuellen Browsern tatsächlich stimmt, ist nicht eindeutig mit einer Primärquelle belegt.
**Woran man es erkennt:** Ein per `getAnimations()` gezählter Animations-Bestand bleibt nach dem Rendern eines vorher übersprungenen Blocks unerwartet konstant oder springt plötzlich hoch.
**Fix:** Nicht allein auf einen einmaligen `getAnimations()`-Scan beim Start verlassen. Bei jedem `contentvisibilityautostatechange`-Event (Regel 6) neu scannen, unabhängig davon, ob die Spezifikation die pausierten Animationen eigentlich schon mitliefern sollte — und vor produktivem Einsatz empirisch in aktuellem Chrome/Firefox/Safari nachprüfen (siehe [Offene Fragen](#offene-fragen)).
**Beleg:** mccain-digital, HANDOFF.md „STAND 16.9. NACHMITTAGS", „Fallen" Zeilen 136-138 (Projektbeobachtung) · [CSSWG Issue #5611](https://github.com/w3c/csswg-drafts/issues/5611) (Spec-Beschluss: pausieren, nicht entfernen) · Sicherheit: vermutet (Widerspruch zwischen Messung und Spezifikation nicht aufgelöst)
**Gilt für:** allgemein

## Erzwungener Reflow

Präzisierung vorab: „Forced reflow" ist als Konsolen-Warnung („Forced reflow while executing JavaScript took Xms") und im DevTools-Performance-Panel (Flame-Chart-Warndreieck) sichtbar ([Quelle](https://developer.chrome.com/docs/performance/insights/forced-reflow)) — **und seit Lighthouse 12/13 zusätzlich ein eigener Performance-Insight**: `forced-reflow-insight` (Report-Titel „Forced reflow", [`core/audits/insights/forced-reflow-insight.js`](https://github.com/GoogleChrome/lighthouse/blob/main/core/audits/insights/forced-reflow-insight.js)). Beide Wege zeigen praktisch dasselbe, weil `core/audits/insights/*.js` seit Lighthouse 12/13 nur noch ein dünner Adapter auf das externe Paket `@paulirish/trace_engine` ist — dieselbe Trace-Engine, die auch das DevTools-Performance-Panel antreibt. Der Insight ist einer von 17 in `default-config.js`, komplett neu ohne abgelöstes Vorgänger-Audit, und zählt wie alle Insights mit `weight: 0` nicht in den Performance-Score — erscheint aber real im Report, mit Top-Function-Call- und Bottom-up-Aufrufliste je exakter Quellcode-Position (URL/Zeile/Spalte); der Owner sah ihn am 16.9. als „Erzwungener dynamischer Umbruch", Quellort `logic.gen.js:336:113`, 52 ms. „PageSpeed meldete X ms erzwungenen Umbruch" ist damit in mehreren Projekt-Learnings präzise zitiert, nicht nur eine DevTools-Nebenbeobachtung; vollständige Insight-Liste in [lighthouse-psi.md](lighthouse-psi.md#die-17-performance-insights-lighthouse-13); dieselbe Korrektur mit identischem Beispiel in [widerlegt.md](widerlegt.md#8-layout-lesende-apis-pro-frame-lösen-einen-lighthouse-forced-reflow-befund-aus). Layout-erzwingende APIs sind u. a. `window.scrollX/scrollY`, `innerHeight/innerWidth`, `getBoundingClientRect()`, `getClientRects()`, `clientWidth/clientHeight/clientLeft/clientTop`, `offsetWidth/Height/Left/Top/Parent`, Scroll-Methoden, `focus()`, `innerText` und teilweise `getComputedStyle()` (siehe Regel 36 für die genauen Bedingungen) — [vollständige Liste mit Chromium-Quellcodezeilen](https://gist.github.com/paulirish/5d52fb081b3570c81e3a). Ein erzwungenes Reflow kostet nur dann etwas, wenn Style/Layout seit dem letzten Flush bereits invalidiert wurde (DOM-/Klassen-Änderung, Pseudoklassen-Wechsel wie `:focus`); reines, wiederholtes Lesen ohne zwischenzeitliches Schreiben ist günstig — teuer wird das Read-after-Write-Muster in Schleifen („layout thrashing").

### 9. Layout-Werte aus Scroll- und Resize-Events cachen, nie pro Frame live lesen
**Warum:** Eine rAF-/Canvas-Animationsschleife, die pro Frame direkt `scrollY` oder andere layoutabhängige Werte liest, erzwingt bei jedem Frame einen synchronen Layout-Reflow, sobald Style/Layout seit dem letzten Flush invalidiert wurde.
**Woran man es erkennt:** PageSpeed/DevTools melden „erzwungener Umbruch" (Forced Reflow) mit Bezug zu `scrollY` in einer Animationsschleife; `scripts/mainthread.mjs` zeigt wiederkehrende Layout-Spitzen im Takt der Schleife.
**Fix:** Layout-Werte nicht live aus dem DOM lesen, sondern aus Scroll-/Resize-Event-Listenern zwischenspeichern (z. B. `this.view` aus dem Event aktualisieren) und im Frame nur aus dem Cache lesen. Den Start der Schleife an das erste `ResizeObserver`-Signal koppeln statt an einen beliebigen frühen Zeitpunkt.
**Beleg:** mccain-digital, CHANGELOG.md „## 2026-09-16 (3)" Zeilen 12-13 und HANDOFF.md „STAND 16.9. ABENDS" Zeilen 20-23: 52 ms erzwungener Umbruch durch `scrollY`-Lesung in der Pixelstrom-Schleife beseitigt, Teil des Commits, der zu PSI-Score 100 (TBT 10 ms) führte · Sicherheit: gemessen
**Gilt für:** allgemein

### 10. Layout-Properties nie im selben Tick direkt nach einer DOM-Mutation lesen
**Warum:** `scrollWidth`, `scrollHeight`, `offsetHeight` & Co. direkt nach einer DOM-Mutation (append, Markup verdoppeln) zu lesen erzwingt einen synchronen Reflow, weil der Browser das gerade geänderte Layout erst neu berechnen muss, bevor er antworten kann.
**Woran man es erkennt:** Konkrete Forced-Reflow-Kosten im Performance-Trace direkt nach einer erkennbaren DOM-Änderung; im Projekt gemessen: Marquee 125 ms, KI-Konsole 79 ms, Pac-Man 25 ms.
**Fix:** Die Messung in ein `requestAnimationFrame` verschieben, damit der Browser den nächsten reguären Layout-Pass nutzt statt einen zusätzlichen zu erzwingen — konkret: `scrollWidth` des Marquee erst im ersten Frame messen (nicht direkt nach dem Verdoppeln des Markups), `scrollHeight` der Konsole erst im `requestAnimationFrame` nach `appendChild`, Pac-Mans erste `measure()` in den ersten Frame verlegen.
**Beleg:** mccain-digital, HANDOFF.md Zeile 3570-3573 (Fix-Details) sowie CHANGELOG.md „## 2026-08-03" Zeile 532 und commit `16dabe6` (2026-08-03, dieselben Zahlen 125/79/25 ms) · Sicherheit: gemessen
**Gilt für:** allgemein

### 11. Ein an body gehängtes Sondierungselement erzwingt bei jedem Resize Layout
**Warum:** Das Muster „ein Mess-Element bauen, berechnete Stile draufkopieren, an `<body>` anhängen und sofort auslesen" (z. B. `measureHero`) erzwingt synchrones Layout bei jedem Resize-Event, weil das Anhängen selbst schon eine Layout-Invalidierung auslöst und der nachfolgende Read sie sofort einfordert.
**Woran man es erkennt:** Forced-Reflow-Warnungen bei jedem Resize-Event, korreliert mit einer Funktion, die ein Hilfselement an `<body>` hängt.
**Fix:** Solche Messungen batchen/cachen oder per `ResizeObserver` mit `requestAnimationFrame` entkoppeln, statt synchron im Resize-Handler zu lesen. Im Ursprungsprojekt als nächster Optimierungsschritt identifiziert, zum Zeitpunkt der Messung noch nicht umgesetzt.
**Beleg:** mccain-digital, HANDOFF.md „STAND 13.9. NACHTS" Zeile 544-545, als Kandidat Nr. 2 einer nach Messung sortierten To-do-Liste · Sicherheit: vermutet (Kandidat, nicht selbst gemessen)
**Gilt für:** allgemein

### 12. Periodische Vollscans mit getBoundingClientRect skalieren mit der Elementzahl
**Warum:** Ein periodischer Kollisionsscan, der `getBoundingClientRect()` von jedem relevanten Content-Element (`h1..p, li, button, a, img, svg, form`) liest, ist eine erzwungene Layout-Quelle, deren Kosten mit der Elementzahl der Seite mitwachsen.
**Woran man es erkennt:** Regelmäßige, mit der Scan-Frequenz korrelierte Layout-Spitzen im Trace, unabhängig von Nutzerinteraktion.
**Fix:** Frequenz senken, Sichtbereich einschränken (nur Elemente in Viewport-Nähe scannen) oder auf `IntersectionObserver`/`ResizeObserver` umstellen statt zu pollen. Im Ursprungsprojekt als Kandidat Nr. 3 identifiziert, noch nicht behoben.
**Beleg:** mccain-digital, HANDOFF.md „STAND 13.9. NACHTS" Zeile 546-547: `movePointsGlobal`-Kollisionsscan alle 2 s über alle Content-Elemente der Seite · Sicherheit: vermutet
**Gilt für:** WebGL/Canvas

### 13. Nicht jede Forced-Reflow-Warnung blind beheben
**Warum:** Manchmal ist die technisch sauberere Lösung (Messung per `requestAnimationFrame` verschieben) ein sichtbarer visueller Fehler — z. B. wenn die erste Layout-Berechnung nötig ist, um sofort auf dem richtigen Scroll-Snap-Element zu landen.
**Woran man es erkennt:** Eine bekannte, unbehobene Forced-Reflow-Warnung im Trace, deren Alternative (ein Frame Verzögerung) einen sichtbaren Sprung verursachen würde.
**Fix:** Bewusst nicht beheben, wenn der Gesamtscore darunter nicht faktisch leidet — z. B. ein Work-Slider, der beim Start eine Kartenbreite liest, um auf dem mittleren Kartensatz zu landen: eine Verschiebung in `requestAnimationFrame` würde für einen Frame `scrollLeft: 0` zeigen, bevor die Karte in die Mitte springt.
**Beleg:** mccain-digital, HANDOFF.md Zeile 3577-3582: Seite erreicht trotz dieser bekannten Warnung Performance 100, TBT 0 ms · Sicherheit: gemessen
**Gilt für:** allgemein

### 14. Nach einem behobenen Messfehler abhängige Kennzahlen als neu zu messen markieren
**Warum:** Wird ein systematischer Messfehler (z. B. fehlende Kompression auf dem Messserver) behoben, sind alle davon abhängigen Detail-Metriken — hier: Forced-Reflow-Dauer — möglicherweise verzerrt und dürfen nicht unverändert weitergetragen werden.
**Woran man es erkennt:** Eine Kennzahl aus einer älteren Messreihe (z. B. 259–386 ms erzwungener Umbruch) steht neben neueren, nach einem Fix gewonnenen Zahlen, ohne dass klar ist, ob sie noch gilt.
**Fix:** Betroffene Kennzahlen explizit als „neu zu messen" markieren statt sie stillschweigend weiterzuführen, damit sich gültige und ungültige Zahlen nicht im selben Dokument vermischen.
**Beleg:** mccain-digital, HANDOFF.md Zeilen 949-950 (Punkt A4, nach Behebung eines Kompressions-Bugs) · Sicherheit: gemessen (als offener Punkt dokumentiert)
**Gilt für:** allgemein

### 15. DOM-Reads im Scroll- und Pointer-Handler cachen statt live zu lesen
**Warum:** Ein Scroll-/Pointermove-Handler, der bei jedem Event live DOM-Properties (`getBoundingClientRect`, `offsetTop`) ausliest oder per `useState` einen Re-Render auslöst, erzwingt bei jedem Event entweder einen synchronen Layout-Reflow oder eine React-Re-Render-Kaskade.
**Woran man es erkennt:** Forced-Reflow- oder übermäßige Re-Render-Warnungen korreliert mit Scroll-/Pointer-Aktivität; in React zusätzlich sichtbar an häufigen Commits ohne DOM-Änderung.
**Fix:** DOM-Reads einmal cachen (`useRef`, `ResizeObserver`) statt im Handler neu zu lesen; scroll-getriebene visuelle Änderungen direkt per `ref.current.style...` setzen statt über `useState` einen Re-Render auszulösen.
**Beleg:** meza-website/CLAUDE.md „Animationen"-Sektion; dotclaude/skills/neue-webseite/references/performance.md Abschnitt 6 (konsistente Konvention aus zwei unabhängigen Quellen) · Sicherheit: dokumentiert
**Gilt für:** React/SSR (Pattern gilt analog für jeden Framework-Scroll-Handler)

## IntersectionObserver und ResizeObserver

### 16. IntersectionObserver-Kosten skalieren mit der Zielzahl, nicht der Instanzzahl
**Warum:** Die browserinterne `computeIntersections`-Berechnung kostet pro beobachtetem **Ziel**, nicht pro Observer-Instanz — ein Observer mit 400 Zielen kostet wie 400 Observer mit je einem Ziel. Werden viele einzeln animierte Elemente separat beobachtet statt gemeinsam über ihren Container, addiert sich das zu spürbarer „Other"-Zeit im Trace.
**Woran man es erkennt:** `scripts/observers.mjs` zeigt eine hohe Zahl beobachteter Ziele über wenige Observer-Instanzen; `computeIntersections` ist im Trace ein signifikanter Anteil von „Other".
**Fix:** IntersectionObserver-Ziele auf gemeinsame Container (z. B. das nächste `[data-cv]`- oder Sektions-Element) statt auf jedes animierte Einzelelement setzen; einen neuen Scan nur laufen lassen, wenn Elemente hinzukommen oder eine Sektion neu rendert.
**Beleg:** mccain-digital, HANDOFF.md „STAND 16.9. NACHMITTAGS" Zeilen 71-93: beobachtete IO-Ziele 132 → 25, IntersectionObserver-Zeit 508 → 97 ms (Desktop, 4× CPU, 12 s) · Sicherheit: gemessen
**Gilt für:** allgemein

### 17. Dauerhaft sichtbare fixierte Elemente nicht mit IntersectionObserver beobachten
**Warum:** Ein Element, das garantiert immer sichtbar ist (z. B. `position: fixed` über dem gesamten Viewport), liefert durch IntersectionObserver keine neue Information, kostet aber weiterhin Berechnungszeit bei jeder Intersection-Runde.
**Woran man es erkennt:** `scripts/observers.mjs` listet ein `position: fixed`-Element als beobachtetes IO-Ziel.
**Fix:** IO-Beobachtung auf garantiert dauerhaft sichtbaren Elementen ersatzlos entfernen.
**Beleg:** mccain-digital, HANDOFF.md „STAND 16.9. NACHMITTAGS" Zeile 119: Teil der Maßnahmen, die IntersectionObserver-Zeit von 508 auf 97 ms senkten (Pixelstrom-Canvas war zuvor unnötig beobachtet) · Sicherheit: gemessen
**Gilt für:** WebGL/Canvas

### 18. IntersectionObserver meldet Übergänge, keine Zustände
**Warum:** IntersectionObserver feuert nur bei Überschreiten der konfigurierten Schwellen. Ein Element, das per Sprung (schnelles Scrollen, `scrollIntoView`, Deep-Link, Reload mitten auf der Seite) von „weit darüber" zu „weit darunter" wechselt, hat in beiden Zuständen Intersection-Ratio 0 und feuert dazwischen keinen Callback.
**Woran man es erkennt:** Eine auf IO basierende binäre Logik (z. B. „Docking" einer Konsole) funktioniert beim manuellen Scrollen, versagt aber bei Deep-Links, Reload mitten auf der Seite oder Scroll-Sprüngen.
**Fix:** Zustand aus einer aktiv **gemessenen** Kante ableiten statt allein aus dem nächsten Observer-Callback: ein `ResizeObserver` hält die Kantenposition durch Font-Loading/Reflow aktuell, ein Scroll-Handler vergleicht zwei bereits bekannte Zahlen, ohne dafür Layout neu zu lesen.
**Beleg:** mccain-digital, commit `e9f39a3` (2026-09-01, KI-Konsole dockt beim Verlassen ihres Ursprungsabschnitts): Fix kostete nichts messbar (18,0 ms medianer Frame, 8,7 % über 20 ms mit Dock, 18,0 ms/9,6 % ganz ohne) · als feste Lehre auch in HANDOFF.md „Lehren, die ich nicht nochmal lernen will" Punkt 2 (Zeile ca. 2645-2647) festgehalten · Sicherheit: gemessen
**Gilt für:** allgemein

### 19. ResizeObserver auf einem Element mit height:100% feuert praktisch nie
**Warum:** Ein `ResizeObserver` auf `<body>` (oder jedem Element mit `height: 100%`, dessen Höhe rein vom Elternelement abgeleitet wird) liefert praktisch keine zuverlässigen Resize-Callbacks, weil sich diese Höhe nie „von selbst" ändert, egal wie viel Inhalt sich ändert.
**Woran man es erkennt:** Eine an `ResizeObserver` gekoppelte Ausweich-/Layout-Logik greift nicht — z. B. legen sich mitlaufende Notizen über Text, den sie eigentlich umgehen sollten.
**Fix:** Das Wurzel- bzw. tatsächliche Komponenten-Element beobachten, nicht `<body>`.
**Beleg:** mccain-digital, CHANGELOG.md „## 2026-09-16" Zeilen 50-53 · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 20. MutationObserver mit subtree:true neben hochfrequenten Textänderungen treibt TBT hoch
**Warum:** Ein `MutationObserver` auf einer breiten Wurzel (`<body>`) mit `subtree: true`, der bei jeder Mutation eine dokumentweite Query (`querySelectorAll`) erneut ausführt, multipliziert seine Kosten mit der Mutationsfrequenz — eine Schreibmaschinen-/Typewriter-Animation, die alle ~9 ms `innerHTML` schreibt, löst dann pro Zeichen eine teure Suche aus.
**Woran man es erkennt:** TBT ist hoch, obwohl kein einzelner Task auffällig lang wirkt; im Trace korrelieren viele kurze Tasks mit der Tippgeschwindigkeit einer Typewriter-Animation.
**Fix:** Observer eng scopen statt breit auf `<body>` mit `subtree: true`; für einmalige Verdrahtung nach fertigem Rendern (z. B. Tooltip-Setup) einen einzigen Durchlauf auf `DOMContentLoaded` (nach allen `defer`-Skripten) verwenden statt eines dauerhaften Observers.
**Beleg:** mccain-digital, commit `16dabe6` (2026-08-03) und HANDOFF.md Zeile 3564-3569/3738-3739 (dieselbe Ursache, `common.js`-Tooltip-Verdrahtung neben Typewriter): TBT 260 → 120 ms, Mobil-Performance-Score 94 → 98 · Sicherheit: gemessen
**Gilt für:** statisches HTML

### 21. Animationen außerhalb des Viewports pausieren
**Warum:** Ohne Sichtbarkeitsprüfung läuft eine CSS-/Canvas-Animation permanent weiter, auch wenn ihr Container nicht sichtbar ist. Wichtige Einschränkung: Chrome drosselt `requestAnimationFrame` nur in **vollständig im Hintergrund befindlichen Tabs** auf ca. 1 Aufruf/Sekunde (dieses Verhalten existiert bereits seit ca. 2011) — ein Element, das in einem sichtbaren Tab nur außerhalb des Viewports gescrollt ist, wird dadurch **nicht** automatisch gedrosselt und muss aktiv pausiert werden.
**Woran man es erkennt:** `scripts/animations.mjs --sweep` zeigt laufende Animationen für Elemente, die aktuell nicht im Viewport sind.
**Fix:** Jede laufende Canvas-/CSS-Animation (Partikelfelder, wandernde Ränder, Farbverläufe) per `IntersectionObserver` pausieren, sobald ihr Container nicht sichtbar ist — dasselbe Muster, das bereits für ein Partikelfeld etabliert wurde, auf neue Effekte (z. B. einen wandernden Rand mit Glow) übertragen. Konkreter Parameter aus `tools/motion-budget.js`: 300 px Vorlauf-Marge vor dem Viewport (pausiert erst bei Verlassen dieser Marge, nicht erst beim tatsächlichen Rausscrollen) plus ein `visibilitychange`-Pausiergrund für einen backgrounded Tab; canvas-eigene rAF-Loops haben ihr eigenes Sichtbarkeits-Gate (Regel 66) und sind davon ausgenommen. Vor dem Bau den theoretischen Deckel messen (alle Animationen global abschalten), um zu wissen, welcher Anteil der gezielte Fix tatsächlich einfängt.
**Beleg:** mccain-digital, HANDOFF.md „Was zuletzt passiert ist" Punkt 4 (ca. Zeile 2590) und commit `afc013f` (2026-09-01) · Chrome-Blog zum Background-Tab-Throttling · zusätzlich commit `80beb85` (2026-09-13): Deckel-Messung (alles aus, mobil) LCP 3.650 → 2.759 ms, TBT 793 → 530 ms, Hauptthread 4.641 → 3.730 ms; realer, gezielter Fix senkte laufende Animationen 25 → 5 · Sicherheit: dokumentiert (Projekt) + dokumentiert ([developer.chrome.com/blog/background_tabs](https://developer.chrome.com/blog/background_tabs))
**Gilt für:** allgemein

## Hauptthread und „Other"

### 22. Nicht-kritische Beobachter und schwere Effekte erst nach Interaktion aktivieren
**Warum:** Zu viele gleichzeitig aktive Beobachter und sofort geladene/gerenderte Effekte im initialen Ladefenster (IntersectionObserver auf sehr vielen Einzelzielen, eine Pixel-Engine, dekorative Elemente auch auf Mobile, ein geschlossenes aber trotzdem gerendertes Mega-Menü) summieren sich zu spürbarer Hauptthread-Zeit, bevor der Nutzer überhaupt etwas davon sieht.
**Woran man es erkennt:** `scripts/mainthread.mjs` zeigt hohe „Other"- und Gesamt-Hauptthread-Zeit im ersten 10–12-Sekunden-Fenster; `scripts/requests.mjs` zeigt Ressourcen, die geladen, aber nicht sichtbar sind.
**Fix:** Beobachter auf Container statt Einzelelemente bündeln (Regel 16); schwere Engines erst bei erster Mausbewegung oder nach einem Timeout (z. B. 10 s) laden, auf reinen Touch-Geräten ggf. nie; rein dekorative Elemente auf Handys ganz aus dem DOM entfernen, auf Desktop verzögert einfügen; im Header nur das Logo sofort laden; ein geschlossenes Overlay/Menü nicht rendern, solange es geschlossen ist. Gehört die Elternstruktur einem Framework (z. B. React), das ein bedingtes JS-Entfernen der Knoten mit der Reconciliation in Konflikt bringen würde: stattdessen eine reine CSS-Media-Query (`display: none` unterhalb des Breakpoints, vor jedem Skript wirksam) verwenden und die zugehörige Pro-Frame-Logik separat auf denselben Breakpoint gaten — die Knoten bleiben dann zwar im DOM, kosten aber weder Layout/Paint noch Skriptzeit.
**Beleg:** mccain-digital, CHANGELOG.md „## 2026-09-16 (2) — v5: halb so viel „Other", nichts Unsichtbares in den ersten 10 Sekunden" Zeilen 15-33: „Other" 1.340 → 641 ms, Hauptthread gesamt 3.560 → 2.164 ms (Desktop, 4× CPU, 12 s), 336 DOM-Elemente weniger auf Handys; zusätzlich commit `25aef20` (2026-09-13, CSS-Pre-Paint-Hide + Doppel-Gate für Desktop-only-Dekoration): Mobil-Hauptthread 4.210 → 3.910 ms bei über die drei Zwischenstände nahezu unverändertem, verrauschtem Lighthouse-Score (68-71) · Sicherheit: gemessen
**Gilt für:** allgemein

### 23. Periodische Timer vor dem Start auf Existenz ihrer Zielelemente prüfen
**Warum:** Ein periodischer Timer, der auf DOM-Elemente prüft, ohne vorher zu prüfen, ob die aktuelle Seite diese Elemente überhaupt enthält, läuft als reine Verschwendung von Hauptthread-Zeit über die gesamte Sitzungsdauer.
**Woran man es erkennt:** Ein wiederkehrender Task im Trace ohne erkennbare Wirkung, dessen Intervall zu keiner sichtbaren Funktion der aktuellen Seite passt.
**Fix:** Vor dem Start eines periodischen Timers prüfen, ob seine Zielelemente auf der aktuellen Seite existieren — bei einem größeren Seitenumbau tot gewordene Timer konsequent entfernen statt sie weiterlaufen zu lassen. Derselbe Verschwendungs-Typ tritt auch ganz ohne fehlendes Zielelement auf: Ein wiederkehrendes State-Update (`setInterval`/`setState`), dessen Ergebnis auf der aktuellen Seite von keiner Vorlage gerendert wird, zahlt weiterhin die volle Reconciliation-Kosten für null visuellen Effekt — vor dem Start also auch prüfen, ob überhaupt ein Template den Wert konsumiert, nicht nur ob das Zielelement existiert.
**Beleg:** mccain-digital, CHANGELOG.md „## 2026-09-16 (2)" Zeile 36: eine Tipp-Demo suchte alle 800 ms nach Elementen, die in v5 gar nicht mehr existierten · Sicherheit: dokumentiert (als Fund/Fix vermerkt, keine Vorher/Nachher-Zahl). Zweiter Fall, commit `55d2a32` (2026-09-13): ein `setInterval` aktualisierte denselben Hero-Index alle 6,5 s auf allen 21 Seiten, obwohl nur die Startseite ihn im Markup band — die anderen 20 reconcilierten einen ~2.400-Knoten-Baum für identische Pixel; nach Gate auf die tatsächlich rendernde Seite: längste Ruhelücke 6.432 → 26.171 ms, Long Tasks nach 5 s 4 → 0 · Sicherheit: gemessen
**Gilt für:** allgemein

### 24. Vor teuren DOM-Updates die Sichtbarkeit des Zielelements prüfen
**Warum:** Ohne Sichtbarkeitsprüfung schreibt Code weiter in ein Element, das aktuell gar nicht angezeigt wird — z. B. ein Preview-Pane, das unterhalb einer bestimmten Breite per CSS versteckt ist, aber bei jedem Tastendruck trotzdem eine gestreamte Antwort erhält.
**Woran man es erkennt:** Hauptthread-Arbeit (DOM-Writes, Streaming-Updates) läuft unvermindert weiter, obwohl das Zielelement laut Breakpoint/Zustand unsichtbar sein sollte.
**Fix:** Den computed style abfragen, um Sichtbarkeit zu prüfen (`offsetParent === null` bei `fixed`-Vorfahren beachten), statt eine zweite, hartcodierte Kopie des Breakpoints im Skript zu pflegen.
**Beleg:** mccain-digital, commit `988975f` (2026-09-04): `menu.js` prüft Sichtbarkeit jetzt per computed style vor jedem Schreibzugriff · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 25. Nach Refactorings von Animationselementen auf leere, weiterlaufende Instanzen prüfen
**Warum:** Verschachtelt ein Refactoring zwei gleichartige Elemente ineinander (z. B. einen `.ai-word`-Span in einen weiteren `.ai-word`-Span), hat das innere Element keinen eigenen Text mehr zu zeichnen, läuft aber weiterhin als eigene Animations-Instanz — dauerhafte Main-Thread-Zyklen ohne sichtbaren Effekt.
**Woran man es erkennt:** Eine Animations-Klasse/-Instanz ohne erkennbare visuelle Wirkung, gefunden z. B. per `scripts/animations.mjs`-Zensus (Kategorie „läuft, zeichnet aber nichts").
**Fix:** Verschachtelung auflösen; nach jedem Refactoring text-tragender Animationselemente gezielt auf solche Geister-Instanzen prüfen.
**Beleg:** mccain-digital, commit `5a132f3` (2026-09-04, `services/ai-tools.html`) · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 26. „Other" im Trace richtig einordnen — und wissen, was es nicht senkt
**Warum:** Die von Lighthouse und Chrome-DevTools gemeinsam genutzte Taxonomie definiert „Other" (`id: 'other'`) als **ausschließlich** die Trace-Events `MessageLoop::RunTask`, `TaskQueueManager::ProcessTaskFromWorkQueue` und `ThreadControllerImpl::DoWork` — generischer Task-/Message-Loop-Scheduling-Overhead des Browsers, nicht Skript-Ausführung, Style/Layout, Rendering/Compositing oder GC. „Garbage Collection" (`MinorGC`/`MajorGC`/`BlinkGC.AtomicPhase`) ist eine davon vollständig getrennte Kategorie. Drei naheliegende, im Projekt diskutierte Optimierungsideen wirken deshalb **nicht** auf „Other": Object Pooling senkt GC-Pausen (Kategorie „Garbage Collection", nicht „Other"); `will-change`/`translateZ(0)` auf einem Canvas verschiebt Arbeit in die Kategorie „Rendering" (Layer-Promotion/Compositing) — ein bereits über WebGL gerendertes Canvas läuft ohnehin schon über GPU/Compositor, zusätzliche erzwungene Layer-Promotion kann durch Speicher-/Layer-Explosion sogar schaden (moderner, nebenwirkungsärmerer Weg für einen gezielt neuen Stacking Context: `isolation: isolate` statt der veralteten `translateZ(0)`/`opacity: 0.999`-Hacks); `scheduler.yield()` verteilt einen langen Task in mehrere neu eingeplante, priorisierte Tasks — das nutzt tendenziell **mehr**, nicht weniger von genau der Scheduling-Maschinerie, die „Other" ausmacht, verbessert aber INP/Responsiveness (siehe Regel 29).
**Woran man es erkennt:** `scripts/mainthread.mjs` schlüsselt „Other" separat von Scripting/Rendering/GC auf; ein Vergleich zweier Seiten-Varianten mit unterschiedlichem Rendering-Ansatz (z. B. React-Hydration vs. statisches HTML) kann bei geteilter Ursache nahezu identische „Other"-Werte zeigen.
**Fix:** Vor jeder „Other"-Optimierung prüfen, ob die geplante Maßnahme tatsächlich `RunTask`/`ProcessTaskFromWorkQueue`/`DoWork` reduziert — nicht GC, nicht Compositing, nicht Task-Umverteilung. Im mccain-digital-Projekt lag die reale gemeinsame Ursache für „Other" bei React („/") und v5 (statisch) im geteilten WebGL-Pixelstrom (RunTask/IO-Berechnung durch den Dauer-Frame-Zyklus), nicht am Rendering-Ansatz selbst: „Other" praktisch identisch (1.477 ms vs. 1.486 ms), davon RunTask 625 vs. 648 ms, `computeIntersections` 518 vs. 577 ms. Der spezifische Hydrations-Kostenanteil der React-Variante gehört in [react-nextjs.md](react-nextjs.md).
**Beleg:** mccain-digital, HANDOFF.md „STAND 16.9. Pixelstrom", „Other"-Tabelle Zeilen 218-225 (gemessen) · [Lighthouse task-groups.js](https://github.com/GoogleChrome/lighthouse/blob/main/core/lib/tracehouse/task-groups.js) (dokumentiert: Definition „Other"/GC) · [Chrome-Blog zu hardwarebeschleunigten Animationen](https://developer.chrome.com/blog/hardware-accelerated-animations) (dokumentiert: will-change/translateZ wirkt auf „Rendering") · [Chrome-Blog zu scheduler.yield](https://developer.chrome.com/blog/use-scheduler-yield) (dokumentiert) · Sicherheit: gemessen + dokumentiert; drei geprüfte Optimierungsvorschläge sind **widerlegt** (siehe [widerlegt.md](widerlegt.md))
**Gilt für:** allgemein

### 27. Tausende individuelle Inline-Styles kosten TBT auch ganz ohne JavaScript
**Warum:** Style-Auflösung und Layout von tausenden individuellen `style="…"`-Attributen kosten reale Hauptthread-Zeit unabhängig von jeder Skript-Ausführung — ein Browser muss jedes Inline-Style-Attribut einzeln parsen, statt eine kleine Zahl CSS-Regeln einmal aufzulösen und wiederzuverwenden.
**Woran man es erkennt:** Hoher TBT/Hauptthread-Wert bei einer Seite mit (fast) keiner Skript-Auswertungszeit; eine Analyse der Dokumentgröße zeigt einen sehr hohen Anteil an `style="…"`-Bytes mit wenigen einzigartigen Werten.
**Fix:** Wiederkehrende Inline-Styles als Klassen in ein gemeinsames, cachebares Stylesheet auslagern — eine rein mechanische Umformung ohne visuelle Änderung. Der Browser löst dann wenige CSS-Regeln auf statt tausender Attribute, das Stylesheet lädt einmal über alle Seiten statt in jede HTML-Datei kopiert zu werden.
**Beleg:** mccain-digital, HANDOFF.md „▶ DER NÄCHSTE DURCHGANG" Zeilen 764-813: reines HTML ohne jedes `<script>` maß Score 95, FCP/LCP 972/1.880 ms, aber TBT 212 ms bei nur 9 ms Skript-Auswertung; Dokument (581.178 B) bestand zu 56,6 % (329.119 B) aus Inline-Styles, 2.207 Attribute mit nur 699 verschiedenen Werten, der schlimmste Einzelfall 730× identisch (79 KB identischer Text); Fix: 699 Klassen statt 2.207 Attribute · Sicherheit: gemessen
**Gilt für:** statisches HTML

### 28. Platzhalter-Markup gehört in ein inertes template, nie in einen lebendigen Custom-Element-Teilbaum
**Warum:** Ein `<template>`-Element ist inert (nicht Teil des gerenderten Baums). Jedes Custom-Element, das Platzhalter-Markup mit `{{ }}`-artigen Ausdrücken als lebendigen Teilbaum einbindet, lässt den Browser dieses Markup vollständig parsen, layouten und malen — auch wenn niemand es je sieht, inklusive eines Fetches pro `src="{{ … }}"` und doppelt ausgeführter `<script>`-Tags.
**Woran man es erkennt:** Konsolenfehler pro Platzhalter-Attribut (z. B. ungültige SVG-Attribute), Ressourcen (Skripte, Favicons), die doppelt geladen werden, eine im Vergleich zum sichtbaren Inhalt deutlich zu hohe Elementzahl beim Parsen.
**Fix:** Platzhalter-/Vorlagen-Markup immer in `<template id="…">` kapseln, nie als lebendigen DOM-Teilbaum ausliefern; ein leeres Montage-Element plus ein kurzer Shim übernehmen die eigentliche Instanziierung. Vor der Umstellung prüfen, dass `<template>` exakt denselben String liefert wie die alte Variante.
**Beleg:** mccain-digital, HANDOFF.md „Die 100 SVG-Fehler in der Konsole — behoben" und „Vier Fallen im Build" Punkt 3 (Zeile ~1209-1232, ~1382-1387): Konsolenfehler Start/Brand-Guide 70/37 → 0/0, doppelt geladenes Skript 2× → 1×, Favicon 3× → 1×, Elemente im Layout beim Parsen ~4.200 → ~2.200; String-Identität vorab verifiziert (143.641 Zeichen auf beiden Wegen) · Sicherheit: gemessen

Verwandter, aber eigener Befund (nicht Gegenstand dieser Datei, siehe [react-nextjs.md](react-nextjs.md)): Eine separat gemessene Homepage mit Performance-Score 68 (FCP 349 ms, LCP 1.398 ms, TBT 663 ms) gegenüber 100 auf vier statischen Unterseiten hing an 1.493 ms React-Hydrations-Skriptauswertung für ~2.140 Elemente plus 364 ms Layout — ein Architekturkosten-Punkt der Hydration, kein Ausliefer-Bug.
**Gilt für:** allgemein

### 29. scheduler.yield() und Long Animation Frames verbessern INP, nicht die Hauptthread-Summe
**Warum:** `scheduler.yield()` zerlegt einen langen Task in mehrere kleinere, neu priorisierte Tasks, zwischen denen der Browser hochpriorisierte Arbeit (Input, Rendering) einschieben kann — das verbessert Responsiveness/INP, senkt aber nicht die Summe der Hauptthread-Zeit (siehe Regel 26). INP selbst setzt sich aus Input Delay, Processing Duration und Presentation Delay zusammen; in aggregierten Felddaten trägt Presentation Delay mit rund 42 % zur Gesamt-INP bei, hauptsächlich getrieben von DOM-Größe und Rendering-Arbeit. Die Long-Animation-Frames-API (LoAF) meldet Rendering-Updates, die um mehr als ca. 50 ms verzögert sind, inklusive Attribution — der modernere Nachfolger für „welcher Task war das".
**Woran man es erkennt:** Lange Tasks nach dem `load`-Event im Trace, insbesondere wenn sie erst durch Nachlade-Timing oder verzögerte Interaktion entstehen; hohe INP trotz niedriger Gesamt-Skriptzeit deutet auf einen hohen Presentation-Delay-Anteil.
**Fix:** Lange, für die Nutzerwahrnehmung nicht-blockende Arbeit mit `scheduler.yield()` (Chrome/Edge ab 129, Firefox ab 142) oder `scheduler.postTask()` (Chrome/Edge ab 94, Firefox ab 142) in Chunks aufteilen; LoAF (Chrome/Edge ab 123) zur Attribution langer Frames nutzen. Safari unterstützt Stand der Recherche keine der drei APIs — Fallback/Feature-Detection einplanen.
**Beleg:** [caniuse scheduler.yield](https://caniuse.com/mdn-api_scheduler_yield), [caniuse scheduler.postTask](https://caniuse.com/mdn-api_scheduler_posttask), [Chrome-Blog LoAF](https://developer.chrome.com/blog/loaf-has-shipped), [web.dev INP](https://web.dev/articles/optimize-inp) · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 30. Nach jedem neuen dauerhaften Effekt explizit gegenmessen
**Warum:** Ob ein neuer, dauerhaft laufender visueller Effekt (Rand-Animation, Glow, Farbverlauf) eine Performance-Regression verursacht, lässt sich nicht verlässlich schätzen — Compositor-/Paint-Kosten hängen stark vom konkreten Effekt und seiner Umgebung ab.
**Woran man es erkennt:** Eine Sorge vor Regression ohne begleitende Messung nach dem Hinzufügen eines Effekts.
**Fix:** Nach dem Bauen explizit Median-Frame-Zeit, Anteil der Frames über 20 ms und Long-Task-Zahl gegen den Stand **ohne** den neuen Effekt messen (`scripts/fps.mjs`), statt die Kosten anzunehmen.
**Beleg:** mccain-digital, HANDOFF.md „Was zuletzt passiert ist", letzter Absatz (ca. Zeile 2611-2613): mit laufendem Rand und Glow Median 16,7 ms, 0 % der Frames über 20 ms, keine Long Tasks — gegen 16,7 ms und 0,6–1,1 % ganz ohne Rand · Sicherheit: gemessen
**Gilt für:** allgemein

## Animationen

### 31. Nur transform, opacity und filter animieren, der unanimierte Zustand ist der Endzustand
**Warum:** Nach Chromes eigenem Blog sind aktuell standardmäßig nur `transform`, `opacity` und `filter` auf dem Compositor hardwarebeschleunigt; `background-color` und `clip-path` sind als geplante Ergänzungen genannt, aber ohne verifizierte feste Versionsnummer — bis zur Bestätigung im eigenen DevTools-„non-composited animations"-Insight gelten sie weiter als hauptthread-kostend. `top`, `background-position`, `color`/`background-color` und `clip-path` erzeugen pro Frame echte Layout-/Paint-Arbeit statt reinem Compositing; nach allen sonstigen v5-Fixes blieben nicht-composited Animationen im Projekt der größte Rest von RunTask (~390 ms). Der Lighthouse-Audit „non-composited animations" bewertet dabei ausschließlich die technische Compositor-Fähigkeit (`scoreDisplayMode: INFORMATIVE`, `metricSavings.CLS` bewusst immer 0, da der CLS-Einfluss zu unsicher vorherzusagen ist), erfordert Chrome ≥ m86.
**Woran man es erkennt:** Lighthouse meldet „non-composited animations" mit konkreter Elementzahl; `scripts/animations.mjs` klassifiziert Properties nach „safe" (transform/opacity/filter/translate/rotate/scale/backdrop-filter) und „ambiguous" (background-color/clip-path).
**Fix:** Nur `transform`, `opacity`, `filter` (und die Einzeleigenschaften `translate`/`rotate`/`scale`) animieren; der unanimierte HTML/CSS-Default jedes Effekts muss bereits sein fertiger Endzustand sein, damit ein Browser ohne Scroll-Timeline-/Animations-Unterstützung nur die Bewegung verliert, nie den Inhalt. `top` → `translateY` ist dabei **nicht** 1:1 austauschbar, weil sich Prozentwerte bei `top` und `translateY` auf unterschiedliche Bezugsboxen beziehen — je Fall einzeln prüfen. Referenz-Zeitraster aus dem Projekt: Micro 120–200 ms, UI-State 180–260 ms, Section-Entrance 400–800 ms, Hero 800–1600 ms, Stagger 40–90 ms, Fade+Rise 12–24 px, Hover-Lift −2 bis −6 px.
**Beleg:** mccain-digital, HANDOFF.md „STAND 13.9. NACHTS" Zeile 538-543 (17 nicht-composited Elemente, Lighthouse) und Zeile 156-157/45 (~390 ms RunTask-Rest) · commit `ab05b06` (2026-09-01, Zeitraster) · Gegenbeispiel für die Kosten einer Verletzung, wenn `Regel 21` nicht greifen kann: ein `position: fixed`-Consent-Banner animierte `background-position` (nicht compositable) endlos, weil ein fixiertes Element nie offscreen gerät — Layout-Calls 358 → 65, Paint 292 → 255 ms, UpdateLayoutTree 242 → 205 ms nach Entfernen der Loop-Animation (commit `33faaf9`, 2026-09-13) · [Chrome-Blog](https://developer.chrome.com/blog/hardware-accelerated-animations) (uncertain: bg-color/clip-path „soon") · [Lighthouse non-composited-animations.js](https://github.com/GoogleChrome/lighthouse/blob/main/core/audits/non-composited-animations.js) · Sicherheit: gemessen + dokumentiert (mit offener Frage zum Compositor-Support-Stand, siehe [Offene Fragen](#offene-fragen))
**Gilt für:** allgemein

### 32. will-change:transform gezielt einsetzen, nicht pauschal
**Warum:** MDN warnt ausdrücklich, `will-change` nur als letztes Mittel bei **bestehenden** Performance-Problemen einzusetzen, nicht vorbeugend, es dynamisch per Skript an-/abzuschalten statt dauerhaft im Stylesheet zu setzen, und es nicht auf großflächige Container (`<body>`) anzuwenden, da es auf den gesamten Teilbaum wirkt — exzessiver Einsatz erhöht Speicherverbrauch und macht Rendering komplexer statt schneller. Im Projekt behob `will-change: transform` Jank bei 43 gleichzeitig laufenden, scroll-getriebenen Wort-Timelines, aber die Begründung gilt nur für Bereiche, die **wiederholt** betreten werden können (die Animation bleibt dauerhaft „lebendig") — für einmalig ablaufende Sequenzen (z. B. eine Hero-Sequenz beim ersten Laden) gilt sie nicht, dort sollte `will-change` nach Ablauf wieder entfernt werden, um keinen dauerhaften Compositor-Layer ohne Nutzen zu binden.
**Woran man es erkennt:** `scripts/fps.mjs` zeigt einen hohen Anteil an Frames über 20 ms und steigendes p99 korreliert mit der Zahl gleichzeitig aktiver Scroll-Timelines.
**Fix:** `will-change: transform` gezielt auf Elemente mit wiederholt betretbarem Scroll-Bereich setzen; nicht pauschal, nicht auf `<body>`, und für einmalige Sequenzen nach Ablauf wieder entfernen.
**Beleg:** mccain-digital, HANDOFF.md „DER REFRESH", „Drei Fehler beim Bauen" Punkt 3 (ca. Zeile 2467-2472): mit 43 aktiven Wort-Timelines 9 % der Frames über 20 ms, p99 17,1 → 32,7 ms; mit `will-change: transform` wieder 0 % über 20 ms, p99 17,3 ms · [MDN will-change](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/will-change) · Sicherheit: gemessen + dokumentiert
**Gilt für:** allgemein

### 33. CSS-Override-Reihenfolge bei prefers-reduced-motion: die spätere Regel gewinnt
**Warum:** Bei gleicher Spezifität gewinnt im CSS die im Quelltext **spätere** Regel, nicht die „gemeinte" Override-Regel. Stand eine `prefers-reduced-motion`-Override-Regel im Stylesheet vor den Regeln, die sie eigentlich aushebeln sollte, gewann leise die spätere, ursprüngliche Animations-Regel.
**Woran man es erkennt:** Animationen laufen trotz `prefers-reduced-motion: reduce` unverändert weiter, ohne dass ein offensichtlicher Fehler im Media-Query-Selektor vorliegt; betroffene Selektoren lassen sich im Browser (berechnete Werte) zuverlässiger finden als per `grep` nach dem Animationsnamen.
**Fix:** Die `prefers-reduced-motion`-Override-Regel ans Ende der Datei verschieben, damit sie bei gleicher Spezifität nach den Regeln steht, die sie aushebeln soll.
**Beleg:** mccain-digital, commit `9fe2c41` (2026-09-04): vorher 7 Animationen (Availability-Dot, Scroll-Cue, Wave durch Claim und vier Figuren) liefen trotz reduced-motion unendlich weiter, nachher 0, während 30 normale Animationen weiterlaufen · Sicherheit: gemessen
**Gilt für:** allgemein

### 34. View Transitions unter reduced-motion mit navigation:none abschalten
**Warum:** `animation: none` schaltet unter `@view-transition` nur die Animation ab, lässt den Browser aber weiterhin eine (dann leere) View Transition ausführen — nur ohne etwas, das sie sichtbar antreibt.
**Woran man es erkennt:** Ein `pageswap`-Event liefert unter reduced-motion weiterhin eine reale `ViewTransition`, obwohl `animation: none` gesetzt ist.
**Fix:** Unter `prefers-reduced-motion: reduce` `navigation: none` statt `animation: none` setzen, um die Transition selbst zu verhindern.
**Beleg:** mccain-digital, commit `988975f` (2026-09-04): verifiziert per `pageswap`-Event — reale `ViewTransition` im Normalfall, `false` unter reduced motion · Sicherheit: gemessen
**Gilt für:** allgemein

### 35. prefers-reduced-motion muss auch JS-getriebene Kosten abschalten und live reagieren
**Warum:** Wort-Splitting (DOM-Arbeit für viele Spans), Canvas-Dither-Rauschen oder ein Spiel-Effekt laufen unabhängig von CSS-Transitions und kosten weiterhin Hauptthread, wenn `prefers-reduced-motion` nur CSS-Animationen abschaltet. Nutzer:innen können die Systemeinstellung zudem live umschalten, während die Seite bereits offen ist — bei rein CSS-getriebenen Animationen reicht `@media (prefers-reduced-motion: reduce)`, bei JS-gesteuerten Loops muss der Code selbst per `window.matchMedia(...)` plus `change`-Listener reagieren. Der korrekte Zielzustand ist außerdem der **fertige** Endzustand, nicht nur eine schnellere Animation — eine rein verkürzte Animation bleibt für Nutzer:innen mit Bewegungsempfindlichkeit weiterhin eine Animation und kostet weiterhin Rechenzeit für Dither/Partikel-Canvas.
**Woran man es erkennt:** Unter aktiviertem `prefers-reduced-motion` laufen weiterhin JS-Effekte (Wort-Splitting, Canvas-Noise, Spiel-Loops) im Profiler; ein Umschalten der Systemeinstellung bei bereits offener Seite ändert nichts am Verhalten.
**Fix:** Bei aktivem Reduced-Motion: 0 Wort-Splits, kein Dither, kein zusätzlicher Spiel-Effekt — direkt der fertige Endzustand statt einer beschleunigten Animation; zusätzlich jede nicht-essenzielle loopende Animation an Sichtbarkeit koppeln (pausieren, wenn ihr Element nicht sichtbar ist, siehe Regel 21) und den JS-Zustand per `matchMedia('(prefers-reduced-motion: reduce)')`-`change`-Listener aktuell halten, nicht nur einmalig beim Laden prüfen.
**Beleg:** mccain-digital, commit `ab05b06` (2026-09-01) und HANDOFF.md „Gemessen, nicht beurteilt" (ca. Zeile 2481) sowie „faee58f" (2026-06-29, Mega-Menu-Stagger, AI-Band-Rotator u. a.) · [web.dev prefers-reduced-motion](https://web.dev/articles/prefers-reduced-motion) (dokumentiert: Live-Listener-Empfehlung) · Sicherheit: dokumentiert + dokumentiert
**Gilt für:** allgemein

### 36. Werte aus laufenden Animationen sind beim Messen unsicher
**Warum:** `getComputedStyle()` kann für eine laufende Keyframe-Animation/Transition einen `calc()`-Ausdruck zurückgeben (z. B. `calc(0% + 358.054px)`) statt einer reinen Pixelzahl; `parseFloat()` darauf liefert `0`, ohne einen Fehler zu werfen. Zusätzlich hat eine aktive CSS-Animation Vorrang vor einmalig per `element.style` gesetzten Werten auf derselben Eigenschaft — wer zu Testzwecken einen Wert erzwingt, während eine Keyframe-Animation auf derselben Eigenschaft läuft, misst weiterhin die alte Animationsphase. Präzisierung: `getComputedStyle()` erzwingt Style-Recalc praktisch immer, aber **Layout** nur unter einer von drei Bedingungen — das Element liegt in einem Shadow-Tree, es gibt viewport-bezogene Media-Queries im Stylesheet, oder die abgefragte Eigenschaft gehört zu einer bestimmten Liste (u. a. `height`/`width`/`top`/`transform`/`grid*`).
**Woran man es erkennt:** Ein aus `getComputedStyle` gelesener Positions-/Farbwert liest sich immer als 0/ungefärbt, obwohl visuell erkennbar etwas anderes gilt; ein zu Testzwecken gesetzter Inline-Style ändert sichtbar nichts.
**Fix:** `calc()`-Ausdrücke explizit parsen statt sich auf `parseFloat()` direkt zu verlassen, und bei animierten Positionswerten immer auf `NaN` prüfen statt auf einen stillen 0-Fallback zu vertrauen; alternativ vor dem Messen `animation: none` setzen oder das Ende der Animation abwarten, um den Endzustand statt eine Zwischenphase zu lesen.
**Beleg:** mccain-digital, commit `a4ddb84` (2026-09-04) und HANDOFF.md Zeile ~1857-1858, ~1926-1929, ~1968-1975: drei konkrete Folgefehler durch denselben Mechanismus — eine Pille las sich als „ungefärbt", ein 44-px-Chip als 43,47 px, ein Reveal als „hängend"; `pixel-engine.js:cssPx` parst `calc()` jetzt korrekt · [Paul-Irish-Gist](https://gist.github.com/paulirish/5d52fb081b3570c81e3a) (dokumentiert: getComputedStyle-Layout-Bedingungen) · Sicherheit: gemessen + dokumentiert
**Gilt für:** allgemein

### 37. view()-Timelines eignen sich nur für Elemente, die noch unsichtbar ins Bild kommen
**Warum:** Der `entry`-Bereich einer `animation-timeline: view()` liegt per Definition vor dem ersten Frame — ein Element, das beim Laden bereits im Viewport sichtbar ist, hat seinen Entry-Bereich bereits durchlaufen und lässt sich darüber nicht mehr animieren. Zusätzlich kann der `entry`-Bereich bei kurzen/flachen Elementen (z. B. eine nur 60 px hohe Headline) zu wenig Scrollstrecke liefern und dadurch wie ein Sprung statt eines Reveals wirken.
**Woran man es erkennt:** Above-the-fold-Elemente mit `view()`-Timeline zeigen beim Laden gar keine Animation; kurze Elemente „springen" beim Scroll-Reveal statt sanft einzusteigen — messbar, wenn der Offset zwischen zwei nahen Scroll-Samples direkt von einem größeren Wert auf 0 springt statt gleichmäßig abzustufen.
**Fix:** Für Above-the-fold-Inhalt, der schon beim Laden sichtbar ist, eine zeitbasierte Sequenz statt einer Scroll-Timeline verwenden (z. B. Web-Animations-API mit Delay-Kette). Für kurze/flache Zielelemente den benannten Range von `entry` auf `cover` umstellen, wo ein Prozentsatz der Timeline durchgängig eine sinnvolle Scrollstrecke bedeutet.
**Beleg:** mccain-digital, commit `ab05b06` (2026-09-01): Hero-Sequenz läuft zeitbasiert (Regel, Eyebrow, Wörter, Platte, Zahlen; fertig nach 1,1 s; Opacity-Sampling 0,24/0,12/0,01 bei 120 ms, sauberer Verlauf bei 300 ms) statt über `view()`; `entry` → `cover` bei einer flachen Überschrift: Wortversatz-Abstufung vorher 62 → 0 (Sprung), nachher 62 → 38/44/50/56 → 0/5/11/17 → 0 (gleichmäßig) · Sicherheit: gemessen
**Gilt für:** allgemein

### 38. Above-the-Fold-Inhalt nicht per Scroll-Reveal oder Fade animieren
**Warum:** Fade-/Reveal-on-Scroll-Logik auf Inhalt, der beim Laden bereits im ersten Viewport sichtbar ist, verzögert die gefühlte Fertigstellung des Layouts und kann von Accessibility-Audits (`axe`) mitten im Übergang erwischt werden — die halbtransparente Zwischenfarbe liest sich dann als Kontrastfehler.
**Woran man es erkennt:** `axe`-Scans melden Kontrastfehler auf Elementen mit aktiver Reveal-/Fade-Klasse, typischerweise auf dem ersten Band direkt nach dem Hero.
**Fix:** Die Reveal-/Fade-Animation für Inhalt im ersten Bildschirm entfernen — dieser Inhalt lädt sofort im Endzustand; Reveal-Animationen nur für Inhalt einsetzen, der erst durch Scrollen ins Bild kommt.
**Beleg:** mccain-digital, commit `16dabe6` (2026-08-03) und HANDOFF.md Zeile 3558-3563/3735-3737 (dieselbe Ursache, unabhängig gefunden): A11y-Score 95/96 → 100 auf Contact- und Service-Seiten · Sicherheit: gemessen
**Gilt für:** statisches HTML

### 39. Animationsphase aus Wall-Clock-Zeit ableiten, Loops um ein Vielfaches der Periode verschieben
**Warum:** Wird die Phase einer Animation aus einem Frame-Zähler und der Elementposition abgeleitet, hängt die wahrgenommene Geschwindigkeit von Bildwiederholrate und Boxgröße ab — zwei gleich gemeinte Effekte liefen im Projekt mit 127 px/s gegenüber 9 px/s auseinander. Für eine nahtlose Loop-Animation (driftendes Muster) erzeugt ein beliebiger Reset-Punkt einen sichtbaren Sprung; verschiebt sich das Muster dagegen um ein exaktes ganzzahliges Vielfaches seiner eigenen Periode, ist der Loop-Reset pixelgleich mit dem Ausgangsbild.
**Woran man es erkennt:** Zwei augenscheinlich gleich schnelle Animationen laufen auf verschiedenen Geräten/Displays unterschiedlich schnell; eine Loop-Animation zeigt einen sichtbaren Ruckler am Wiederholungspunkt.
**Fix:** Phase aus verstrichener Wall-Clock-Zeit und Seitenposition berechnen statt aus Frame-Zähler und Elementposition — bleibt auf 30-Hz- und 120-Hz-Displays gleich schnell. Die Translationsdistanz einer Loop-Animation stets auf ein ganzzahliges Vielfaches der Muster-/Kachelperiode legen.
**Beleg:** mccain-digital, commit `d8948b9` (2026-09-01, Wall-Clock-Phase) und commit `4d58954` (2026-09-01, Periodenvielfaches; dieselbe Technik zusätzlich für Headline-Wave und Assistenten-Rand verwendet, drei Effekte ohne sichtbaren Sprung) · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 40. Eine modernere Web-API nicht ohne bestehenden Bedarf migrieren
**Warum:** Eine modernere Web-API (hier: CSS `view()`-Timelines als Ersatz für eine bestehende JS-Reveal-Lösung) sollte nicht allein wegen ihrer Modernität übernommen werden — zuerst prüfen, ob das zugrunde liegende Performance-Problem überhaupt noch besteht, und das tatsächliche UX-Verhalten der Alternative gegen den erhofften, möglicherweise gar nicht vorhandenen Vorteil abwägen.
**Woran man es erkennt:** Eine geplante Migration hat keinen an einer aktuellen Messung festgemachten Grund.
**Fix:** Migration unterlassen, wenn die Zielmetrik bereits am Optimum liegt und die Alternative einen unerwünschten UX-Nebeneffekt hätte — hier: `view()`-Timelines hätten die Reveal-Animation beim Zurückscrollen ungewollt zurückgespult.
**Beleg:** mccain-digital, CHANGELOG.md „## 2026-06-12 — Awwwards-Welle B+C" Zeilen 842-843: „TBT ist bereits 0" · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 41. Eine rAF-Schleife für interaktionsgebundene Effekte soll sich selbst schlafen legen
**Warum:** Ein Effekt, der nur bei bestimmten Ereignissen (Scroll, Hover, Interaktion) sichtbar etwas tut, verschwendet bei dauerhaft laufender `requestAnimationFrame`-Schleife kontinuierlich Hauptthread-/Akkukosten, solange niemand interagiert.
**Woran man es erkennt:** `scripts/observers.mjs`/Profiler zeigen eine konstant aktive rAF-Schleife auch ganz ohne Nutzerinteraktion.
**Fix:** Die Schleife „self-sleeping" bauen — nur bei Scroll/Hover/Interaktion laufen lassen, sonst von selbst pausieren.
**Beleg:** mccain-digital, CHANGELOG.md „## 2026-06-12 — Welle H" Zeilen 718-719 (Pac-Bar-Canvas-Animation) · Sicherheit: vermutet
**Gilt für:** allgemein

### 42. Für Scroll-Choreografien Transform-Einzeleigenschaften statt der Shorthand verwenden
**Warum:** Eine Animation auf die `transform`-Shorthand überschreibt jeden `:hover`-`transform` auf demselben Element vollständig — Chip- und Karten-Hover-Lift-Effekte wirken dann „still tot". Die CSS-Einzeleigenschaften `translate`, `scale`, `rotate` koexistieren dagegen unabhängig von einer `:hover`-Regel auf `transform`.
**Woran man es erkennt:** Ein per `:hover` erwarteter Lift-/Scale-Effekt zeigt keine Wirkung auf Elementen, die gleichzeitig eine Scroll-Choreografie mit `transform`-Shorthand tragen.
**Fix:** Scroll-Choreografien auf `translate`/`scale`/`rotate` umstellen statt auf `transform`, wenn dasselbe Element an anderer Stelle ebenfalls einen Transform erhalten soll (z. B. `:hover`).
**Beleg:** mccain-digital, HANDOFF.md „Bekannte Fallstricke der Scroll-Choreografie" Zeile 3475-3477 · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 43. Vor einer Animationsbibliothek natives CSS oder einen eigenen Wrapper prüfen
**Warum:** Für einfache Scroll-Reveal-Effekte (Fade/Slide-in beim Scrollen) und Smooth-Scroll braucht es in der Regel keine vollständige Animationsbibliothek (GSAP, Framer Motion) — ein selbstgebauter `IntersectionObserver`-Wrapper oder native CSS-`view()`-Timelines decken den Fall ab und sparen das komplette Library-Bundle. Für Smooth-Scroll auf einer Multi-Tenant-Plattform ist ein MIT-lizenziertes, kleines Paket (Lenis, ~3 kB gzipped) einem kostenpflichtigen Club-GreenSock-Plugin (ScrollSmoother) vorzuziehen, das sonst pro Kunde einen eigenen Lizenzvertrag erfordert hätte.
**Woran man es erkennt:** Ein Bundle-Analyse zeigt eine vollständige Animationsbibliothek für einfache Fade/Slide-Reveals; eine Lizenzprüfung zeigt ein kostenpflichtiges Plugin für eine Multi-Tenant-Plattform.
**Fix:** Für einfache Scroll-Reveals einen eigenen `IntersectionObserver`-Wrapper bauen, der Geschwister-Elemente über eine CSS-Variable staggert; Server und erster Client-Paint rendern den Inhalt vollständig sichtbar (kein FOUC), JS „armt" das Element erst nach dem Mount, ohne JS bzw. bei `prefers-reduced-motion` zeigt sich der Inhalt direkt. Für wortweise Reveals native `view()`-Timelines nutzen (Wörter per `TreeWalker` **nur** über Textknoten in Spans zerlegen, damit `<br>` und Inline-Formatierung erhalten bleiben; Maske per `overflow: clip`). Für Smooth-Scroll auf Multi-Tenant-Plattformen Lenis statt ScrollSmoother, mit `ScrollTrigger.scrollerProxy` für Kompatibilität zu bestehenden Scroll-Triggers und `smoothTouch: false` als Default (natives Touch-Scrolling ist bereits smooth, Software-Smoothing kostet auf Low-End-Geräten Frames).
**Beleg:** whatever-recall-internal/CHANGELOG.md 2026-06-16 (Reveal.tsx, SSR-verifiziert: HTML trägt Content ohne `is-armed`-Klasse) · mccain-cms .claude/docs/decisions.md ADR-034 und CHANGELOG.md alpha.96 Sprint 09.8 (Lenis-Ersatz) · mccain-digital HANDOFF.md „DER REFRESH" Unterpunkt 1 (ca. Zeile 2432-2436, native Wort-Reveal): 43 Wort-Timelines bei 0 Long Tasks, p90 16,9 ms, p99 17,1 ms nach dem `will-change`-Fix aus Regel 32 · Sicherheit: dokumentiert
**Gilt für:** allgemein · siehe auch [[web-skills-suite]], [[neue-webseite]]

### 44. Früher First Paint, später Speed Index durch weiterlaufende Einblend-Animationen
**Warum:** Speed Index kann trotz früher FCP/LCP schlecht bleiben, wenn CSS-Animationen — auch rein CSS-basierte, JS-unabhängige `animation`-Deklarationen direkt am Element — nach dem ersten Paint weiterlaufen und die visuelle Fertigstellung der Seite verzögern. FCP/LCP allein zeigen dieses Problem nicht, weil beide nur den ersten sichtbaren Inhalt messen, nicht wann die Seite optisch „fertig" wirkt.
**Woran man es erkennt:** Speed Index liegt deutlich über FCP/LCP in derselben Messreihe, auch in einer Variante ganz ohne JavaScript.
**Fix:** Wurzelursache meist dieselbe wie bei Regel 27 (zu viele Knoten mit je eigenem Inline-Stil/eigener Animation) — Inline-Styles/Animationen in Klassen konsolidieren, Zahl gleichzeitig laufender Einblend-Animationen reduzieren.
**Beleg:** mccain-digital, HANDOFF.md Zeilen 798-806: Speed Index 3.386 ms bei FCP 972 ms / LCP 1.880 ms in der reinen HTML-Fassung ohne JS · Sicherheit: gemessen
**Gilt für:** statisches HTML

### 45. Den wahren Verursacher isoliert messen statt der naheliegenden Komponente die Schuld zu geben
**Warum:** Viele kleine, gleichzeitig unendlich laufende CSS-/SVG-Animationen auf denselben Elementen können trotz winziger visueller Fläche mehr Hauptthread-Zeit kosten als ein großflächiger, augenscheinlich „teurerer" Canvas/WebGL-Effekt — die naheliegende Vermutung (großer sichtbarer Effekt = Hauptverdächtiger) kann komplett danebenliegen. Nur eine echte A/B-Isolation (eine Variable geändert, sonst identisch) zeigt den tatsächlichen Anteil.
**Woran man es erkennt:** Vier identische Lighthouse-Läufe, die sich nur durch ein eingeschobenes Stylesheet unterscheiden, zeigen den Score-/TBT-Sprung bei genau einer Variante.
**Fix:** Vor einer Optimierung den tatsächlichen Verursacher isoliert messen (ein Stylesheet/eine Komponente gezielt deaktivieren, Rest unverändert), statt der naheliegenden Komponente die Schuld zu geben. Bei vielen kleinen, gleichzeitig laufenden CSS-Animationen auf einem winzigen Element (z. B. einem Logo-SVG) den Modus auf „static" umstellen, sofern eine Komponente das unterstützt; ein Wächter, der Modus-Vorkommen zählt, verhindert versehentliche Rückfälle. Danach sind ursprünglich geplante Folge-Optimierungen (hier: Animationen außerhalb des Sichtfelds pausieren) unter Umständen bereits hinfällig und sollten neu bewertet, nicht blind umgesetzt werden. Als dauerhafte Lösung, wenn die Animation optisch erhalten bleiben soll: eine `<canvas>`-Zeichnung mit einem einzigen Zeichenaufruf pro Frame kann dieselbe Optik liefern wie dutzende parallele CSS-Keyframe-Animationen, deutlich günstiger für den Hauptthread.
**Beleg:** mccain-digital, HANDOFF.md „Ebenfalls freigegeben" Zeilen 877-885 und „A — Performance" Zeilen 924-947 (Vier-Varianten-Vergleich: unverändert Score 63/TBT 1.026 ms/8.497 ms Hauptthread; Datenstrom aus Score 64/TBT 1.010 ms/8.485 ms; Logo-Animation aus Score 68/TBT 778 ms/4.971 ms): 146 der 170 unendlichen Animationen der Startseite liefen in einem einzigen 34×34-px-`<svg>` mit 146 `<rect>`-Elementen; nach Fix (Modus „static", 1,6-s-Loop-Timer entfernt) noch 24 statt 270 laufende Animationen auf der Startseite, geplanter nächster Schritt Canvas-Migration mit Owner-Freigabe · Sicherheit: gemessen
**Gilt für:** allgemein

## Canvas und WebGL

Grundmodell vorab: Chrome-DevTools-CPU-Throttling wirkt ausschließlich auf den Haupt-Thread/Renderer-Prozess der Seite; der separate GPU-Prozess bleibt komplett unberührt (wörtlich: „DevTools CPU throttling doesn't touch the GPU process"). SwiftShader, Chromes Software-GL/Vulkan-Fallback, läuft ebenfalls **innerhalb** des GPU-Prozesses, nicht im gedrosselten Renderer — der unterscheidende Faktor ist also „welcher Prozess", nicht „Hardware- vs. Software-GL" (siehe Regel 47). Ab Chrome 134 kalibriert DevTools CPU-Throttling gegen die reale Leistung der Entwicklungsmaschine (Presets „Low-tier mobile" ≈ 6× + 3G, „Mid-tier mobile" ≈ 4× + Slow-4G).

### 46. getContext() ist synchron, der erste Paint darf nicht auf Canvas oder WebGL warten
**Warum:** `getContext("webgl")` ist ein synchroner Aufruf, der den Hauptthread blockieren kann, bevor überhaupt ein erster Frame gemalt wurde — unter echter GPU-Beschleunigung kostet das kaum etwas, unter Software-GL (SwiftShader) kann allein die Kontext-Erzeugung 230–311 ms dauern. Fehlt eine GPU komplett oder ist der angeforderte Kontexttyp nicht verfügbar, liefert `getContext()` zusätzlich `null` zurück — ebenso wenn auf demselben `<canvas>` bereits ein anderer Kontexttyp gebunden wurde (ein Canvas kann nur einen Kontexttyp über seine Lebensdauer haben).
**Woran man es erkennt:** `scripts/fps.mjs --software-gl` und `scripts/lcp-window.mjs` (FCP-Zeile) in einer Software-GL-Variante zeigen einen stark verzögerten FCP mit einem Long Task exakt beim `getContext`-Aufruf; in einem Lighthouse-Lauf unter Maschinenlast können daraus `NO_FCP`-Ausreißer oder FCP-Werte im 6-stelligen ms-Bereich entstehen.
**Fix:** Canvas-/WebGL-Hintergründe erst nach dem ersten Frame initialisieren (`requestAnimationFrame` nach `load` oder `requestIdleCallback`), bis dahin einen CSS-Fallback (Verlauf/Farbe) zeigen. `getContext()`-Rückgabewert immer auf `null` prüfen, bevor darauf zugegriffen wird. Wo verfügbar (Safari ab 17/iOS 17, sowie Chromium) `OffscreenCanvas` in einem Web Worker erwägen, um die synchrone Kontext-Erzeugung ganz vom Hauptthread zu nehmen.
**Beleg:** mccain-digital, `scratchpad/skill/raw/swgl_fcp_finding.md` (16.09.2026, Chrome for Testing 148, headless, Mobil-Preset 412×915 DPR 1,75, Produktionsheader): GPU/ANGLE Metal FCP 188 ms (getContext bei 70 ms, 12 ms Dauer) gegen SwiftShader FCP 2.216 ms bzw. 2.392 ms unter 4× CPU (getContext() selbst blockiert dabei 311 ms bzw. 230 ms; der Browser registriert zusätzlich je zwei separate Long Tasks: 341 ms bzw. 346 ms direkt bei getContext, plus einen zweiten, kleineren Task 89 ms bzw. 104 ms kurz danach) — CPU-Drosselung ändert daran fast nichts, da der GPU-Prozess nicht gedrosselt wird; in Lighthouse-Läufen unter Last derselben Seite mit Standard-Wartezeiten schlugen 3 von 4 Versuchen mit `NO_FCP` fehl (der vierte gelang mit FCP 797 ms), mit stark verlängerter Wartezeit (`maxWaitForFcp` 300.000 ms) zeigte derselbe reale FCP 125.226 ms · [MDN getContext](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext), [MDN OffscreenCanvas-Safari-Support-Korrektur](https://github.com/mdn/browser-compat-data/issues/21127) · Sicherheit: gemessen (3 Szenarien, je 1 Lauf, ruhige Maschine) + dokumentiert
**Gilt für:** WebGL/Canvas

### 47. CPU-Throttling in DevTools erreicht den GPU-Prozess nicht
**Warum:** Weder echte Hardware-GPU-Arbeit noch SwiftShader-Softwarerendering werden durch Chrome-DevTools-CPU-Throttling gebremst, weil beide im (davon ausgenommenen) GPU-Prozess laufen — die frühere Projekt-Annahme „CPU-Throttling testet auch die Shader-Performance" ist damit **präzisiert**: nicht „Software-GL wird zusätzlich verlangsamt", sondern „Software-Rasterisierung ist unabhängig von jeder Drosselung von Haus aus sehr viel langsamer als Hardware". Auf hochauflösenden Bildschirmen bleibt unter Software-GL die interne Canvas-Auflösung selbst der Hauptkostenfaktor.
**Woran man es erkennt:** Ein Shader zeigt unter aktiviertem CPU-Throttling in DevTools/Lighthouse unveränderte Framerate; erst ein expliziter Start mit `--use-angle=swiftshader` zeigt die reale Worst-Case-Last.
**Fix:** Für Grafiklast-Tests (Geräte/Server ohne GPU-Beschleunigung simulieren) Chrome explizit mit `--use-angle=swiftshader` starten, nicht auf CPU-Throttling verlassen. Ist die Auflösung unter Software-GL der Engpass, die interne Canvas-Auflösung gezielt senken (unabhängig von der CSS-Anzeigegröße) — das kostet sichtbare Schärfe, ist aber der wirksamste Hebel. Ergänzend `devicePixelRatio` für Canvas/WebGL grundsätzlich deckeln, z. B. `Math.min(window.devicePixelRatio, 2)`, da DPR 4 bis zu 16× so viele Pixel bedeutet wie DPR 1; für pixelgenaue Ergebnisse `ResizeObserver` mit `box: 'device-pixel-content-box'` statt schlichter Multiplikation verwenden.
**Beleg:** mccain-digital, HANDOFF.md „STAND 16.9. NACHMITTAGS", „Fallen" Zeile 144-152: SwiftShader bei 2560×1440 schafft selbst mit 30-fps-Ziel nur ~13 fps · [Chrome-Blog](https://developer.chrome.com/blog/devtools-grounded-real-world) und [Chromium-SwiftShader-Doku](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/docs/gpu/swiftshader.md) (dokumentiert, claim „partly" bestätigt: Prozess-Trennung ist der wahre Faktor) · [MDN WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices) (DPR-Deckelung) · Sicherheit: gemessen + dokumentiert; ursprüngliche Kausal-Erklärung war zu ungenau (siehe [widerlegt.md](widerlegt.md))
**Gilt für:** WebGL/Canvas

### 48. Adaptive Framerate aktiv mit Backoff hochtasten, nicht aus Stabilität ableiten
**Warum:** Ein auf ein Ziel-fps gedrosselter Loop läuft konstruktionsbedingt pünktlich, egal ob mehr möglich wäre — stabile 30-fps-Frames liefern also kein Signal, ob Browser/GPU tatsächlich 60 fps schaffen würden. Der Canvas-„Strom" im Projekt passt seine Bildrate zusätzlich adaptiv an (60/30 fps) und liest dabei kein Layout mehr pro Frame.
**Woran man es erkennt:** `scripts/fps.mjs --software-gl --cpu 1,4` über mehrere Minuten zeigt, ob ein System dauerhaft bei der niedrigeren Stufe bleibt oder zur höheren wechselt.
**Fix:** Die höhere Framerate periodisch aktiv ausprobieren statt sie aus der aktuellen Stabilität abzuleiten, mit wachsendem Abstand zwischen den Versuchen (z. B. 5 → 10 → 20 → 40 → 60 s).
**Beleg:** mccain-digital, CHANGELOG.md „## 2026-09-16 (2)" Zeilen 31-32 (Grundmechanismus) und HANDOFF.md „STAND 16.9. NACHMITTAGS", „Fallen" Zeilen 139-145: mit SwiftShader bleibt das System bei 30 fps samt Probe-Versuchen, mit Apple-GPU wird nie umgeschaltet (durchgehend höhere Rate) · Sicherheit: gemessen
**Gilt für:** WebGL/Canvas

### 49. WebGL-Kontexte sind ein begrenztes Budget, nie doppelt anhängen, immer freigeben
**Warum:** Browser begrenzen die Zahl gleichzeitig lebender WebGL-Kontexte — Community-Berichte nennen für Chromium eine Größenordnung von rund 30 („Too many active WebGL contexts. Oldest context will be lost."), für Firefox explizit 16 pro Principal; der älteste Kontext wird beim Überschreiten automatisch verworfen. Zwei häufige Ursachen für stillen Kontext-Verbrauch: (1) eine Engine, die vor dem Anhängen eines Canvas nicht prüft, ob ihr Host schon eines trägt — ein unsichtbares erstes Canvas behält dann seinen Pointer-Handler und rAF-Loop aktiv; (2) ein nicht memoized abgeleiteter Wert in einem 60-fps-rAF-Loop, der bei jedem Frame eine neue Objekt-Identität bekommt und dadurch einen davon abhängigen `useEffect` erneut feuern lässt, der eine neue Three.js-Szene mountet statt die bestehende weiterzuverwenden.
**Woran man es erkennt:** Ein Element trifft zwei Effekt-Ziele gleichzeitig und nur der zweite Canvas ist sichtbar; ein Split-Render-Bug zeigt zwei überlagerte Three.js-Canvases; die Browser-Konsole meldet „Too many active WebGL contexts".
**Fix:** Jede Canvas-Effekt-Engine muss vor dem Anhängen prüfen, ob ihr Host schon ein Canvas trägt, und ein zweites verweigern. In React von einem `useEffect` abhängige, pro Frame abgeleitete Objekte per `useMemo`/`useRef` stabil halten. WebGL-Kontexte aktiv über die `WEBGL_lose_context`-Extension (`loseContext()`) freigeben, sobald sie definitiv nicht mehr gebraucht werden — MDN betont ausdrücklich, dafür **keinen** `unload`-Handler zu registrieren, das sei nicht nötig. Ein WebGL/Canvas-Wrapper sollte als eigenständige disposable Klasse mit explizitem Lifecycle (load → mutate → dispose) gebaut werden statt als reine React-Hook-Closure: Texturen bei Modus-/State-Wechseln cachen statt neu decodieren, `dispose()` muss Renderer, Texturen, alle Meshes und Event-Listener wirklich freigeben, der Constructor sollte defensiv alte Canvases aus dem Mount-Container räumen (schützt gegen React-19-StrictMode-Doppelmounts).
**Beleg:** mccain-digital, commit `91e16f2` (2026-09-01, doppeltes Canvas: doppelter dither-Canvas schob den Header eine ganze Viewporthöhe nach unten) · 360/.claude/docs/session-handoff-archive.md „Source identity fix" (Hero.tsx, `useMemo` auf `[uploaded]`) · 360/.claude/docs/decisions.md ADR-13 und ARCHITECTURE.md (Disposable-Three.js-Klasse, Textur-Cache, kein GPU-Leak mehr beim Moduswechsel) · [OpenLayers-Issue zu Kontext-Limits](https://github.com/openlayers/openlayers/issues/16118), [MDN WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices) · Sicherheit: gemessen (Projektbugs) + dokumentiert (Kontext-Limits, `WEBGL_lose_context`)
**Gilt für:** WebGL/Canvas

### 50. Partikel- und Zellzahl skaliert mit der Fläche, Stride an die Elementgröße anpassen
**Warum:** Die Partikel-/Zellzahl eines Canvas-Mosaiks ist eine Flächenfunktion des Zellabstands (Fläche/Stride²) — denselben feinen Stride-Wert für eine kleine Karte und einen vollflächigen Hintergrund zu verwenden treibt die Kosten quadratisch hoch, weil jedes Partikel pro Frame mindestens ein `fillStyle` (Farbstring-Neuparsing) plus ein `fillRect` kostet. Wichtige Differenzierung: nicht jeder Teileffekt eines Partikelfelds hängt an der Gesamtzahl — ein Hover-/Lochbereich-Effekt kann rein am Radius des Lochs hängen und bleibt auch bei feinerem Raster günstig, während der einmalige „Erscheinungs-Schwarm" beim Laden sehr wohl an der Gesamtzahl hängt.
**Woran man es erkennt:** `scripts/fps.mjs` zeigt beim Ändern von Zellabstand/Stride überproportional (quadratisch) steigende Long-Task-Zahl und blockierte Zeit.
**Fix:** Stride proportional zur tatsächlichen Elementfläche skalieren, nicht denselben Wert wie bei einer kleinen Vorlage übernehmen; für vollflächige Hintergründe den einmaligen Erscheinungs-Schwarm bei Bedarf deaktivieren/optional machen und stattdessen einen kurzen Dissolve-Übergang nutzen, während das laufende (Hover-/Loch-)Verhalten unverändert bleiben kann. Vor jeder Änderung den jeweiligen Teileffekt einzeln messen (anzahl- vs. radius-abhängig), statt pauschal von „feiner ist teurer" auszugehen.
**Beleg:** mccain-digital, commit `16fe47b` (2026-09-01): Zellabstand 10 → 5 vervierfacht die Partikelzahl (12.920 → 51.510 bei 1512×850), Swarm für den Vollbild-Hero deaktiviert: 100 ms Assemble-p95/18 Long Tasks/1.386 ms blockiert → 17 ms/3 Long Tasks/466 ms blockiert · commit `57d9d6e` (2026-09-01): Stride 4–5 px → 10 px senkt Partikel 57.600 → 14.400, Long Tasks 14 → 0, längster Frame 117 → 33 ms, Frames über 20 ms 8,3 % → 0,4 % · HANDOFF.md „Der Stand der Startseite" (ca. Zeile 2103-2111): feineres Raster (5 px, 51.510 Partikel) bei abgeschaltetem Swarm bleibt bei 17 ms (60 fps), Seitenaufbau sinkt von 5 Long Tasks/693 ms auf 3 Long Tasks/466 ms · Sicherheit: gemessen
**Gilt für:** WebGL/Canvas

### 51. Canvas-Rasterzellen auf ganze Gerätepixel klemmen
**Warum:** Werden Zell- und Blockgröße eines pixelbasierten Canvas-Rastereffekts aus CSS-Pixelwerten ohne Bezug zum tatsächlichen Geräte-Pixel-Raster berechnet, kann Rundung dazu führen, dass Block- und Zellgröße gleich groß werden — der sichtbare Zwischenraum (der eigentliche „Pixel-Look") verschwindet dann bei bestimmten DPR-/Eingabe-Kombinationen vollständig. Werden Blöcke zusätzlich an fraktionalen (nicht-ganzzahligen) Device-Pixel-Positionen gezeichnet, antialiast der Browser sie gegen Nachbarpixel, sodass keine Farbe mehr vollständig opak wirkt.
**Woran man es erkennt:** Ein Pixel-Effekt „verschwindet" bei bestimmten Zoomstufen/Displays komplett; Weiß-/Gelbtöne in einem Pixel-Raster wirken blass statt kräftig (messbar: mittlerer Alpha-Wert deutlich unter 255).
**Fix:** Zell- und Blockgröße immer in tatsächlichen Gerätepixeln berechnen, z. B. `GRID_DEV = Math.max(2, Math.round(GAP * DPR))` und `BLOCK_DEV = Math.min(GRID_DEV - 1, Math.max(1, Math.round(SIZE * DPR)))`, sodass der Block per Klemmung immer mindestens ein Gerätepixel kleiner als die Zelle bleibt — konfigurierte `data-gap`/`data-size`-Werte werden dadurch zu einer Bitte, kein garantiertes Ergebnis. Zusätzlich alle Zeichenpfade (Assemble, Physik, Ruhezustand) Position **und** Größe auf ganze Device-Pixel snappen lassen.
**Beleg:** mccain-digital, commit `4b3e71d` (2026-08-31, Zellgrößen-Klemmung): feines Grid vorher scroll median 50,0 ms/65 % Frames über 20 ms/9 Long Tasks, nachher 16,7 ms/0 %/0 · commit `aca605c` (2026-08-31, Device-Pixel-Snapping): mittlerer Alpha 140/255 → 255/255, Farbfläche 21 % → 25,2 % der Canvas, Hover-Sweep p90 16,7 ms bei 23.600 Zellen ohne Mehrkosten · HANDOFF.md Zeile 3085-3097 (GRID_DEV/BLOCK_DEV-Formel, Defaults 1.1/1.0 → 3.0/2.0) · Sicherheit: gemessen
**Gilt für:** WebGL/Canvas

### 52. Ruhezustand einmal in ein Offscreen-Canvas cachen, pro Frame nur die Dirty-Region neu zeichnen
**Warum:** Malt eine Zeichenschleife bei jedem Frame das gesamte Bild/Mosaik neu, unabhängig davon, ob sich etwas geändert hat, kostet das linear mit der Partikel-/Zellzahl — bei einer Work-Karte mit 14.157 Partikeln allein 5,15 ms/Frame (DPR1), zwei Drittel davon reines `fillStyle`-Setzen (ein neu geparster `"rgb(...)"`-String pro Partikel pro Frame). Wird der Ruhezustand stattdessen einmal in ein Offscreen-Canvas gerendert, kostet ein Frame nur noch einen `drawImage`-Blit plus das gezielte Neuzeichnen der tatsächlich veränderten („dirty") Zellen.
**Woran man es erkennt:** `scripts/fps.mjs` zeigt Frame-Kosten, die linear mit der Gesamt-Partikelzahl statt mit der Größe der sichtbaren Interaktion (z. B. einem Cursor-„Loch") skalieren.
**Fix:** Das ruhende Mosaik einmal in ein Offscreen-Canvas zeichnen (`home`); pro Frame nur ein `drawImage`, dazu eine in Rasterkoordinaten geführte „dirty"-Box, die um die Interaktion wächst und auf das schrumpft, was noch „nicht daheim" ist — nur diese Zellen einzeln löschen und neu malen. Dasselbe Prinzip trägt auch neue, zusätzliche Animationen (z. B. eine Farbwelle) über einem bestehenden statischen Canvas: Ruhezustand vorrendern, pro Frame nur wenige zusätzliche, von der Elementzahl unabhängige Zeichenoperationen (zwei `drawImage` plus eine Verlaufsfüllung) hinzufügen.
**Beleg:** mccain-digital, commit `3471a63` (2026-08-31): 5,15 ms → 0,54 ms/Frame (DPR1), Hover-Sweep p90 33,2 → 16,7 ms · HANDOFF.md Patch 4 (Zeile 2869-2882, identische Zahlen plus DPR2: 6,75 → 0,70 ms, ~1.370 von 14.157 Zellen betroffen) und Zeile 3200-3206 (Farbwelle über Pixel-Überschriften: Scroll-Median 16,7 ms, 0 % über 20 ms, 0 Long Tasks, identisch zu „Welle aus") · Sicherheit: gemessen
**Gilt für:** WebGL/Canvas

### 53. Ein gerastertes Mosaik ist ein kleines Canvas, hochskaliert
**Warum:** Ist die Zellgröße gleich dem Zellabstand, ist ein Pixel-Mosaik exakt ein kleines COLS×ROWS-Canvas, nur hochskaliert — ein Pro-Zelle-`fillRect`-Loop ist dann überflüssig. Für synthetisch erzeugte Pixel-Effekte (Dither, Mosaik) lässt sich dieselbe Idee andersherum nutzen: ein 1-px-Offscreen-Canvas pixelweise per `ImageData` befüllen und dann mit deaktiviertem Image-Smoothing hochskalieren, statt für jeden sichtbaren „Pixelblock" einen einzelnen `fillRect` abzusetzen.
**Woran man es erkennt:** Ein ruhendes Mosaik zeichnet im Profiler sichtbar tausende einzelne `fillStyle`/`fillRect`-Paare pro Frame, obwohl sich das Bild nicht ändert.
**Fix:** ✅ Ein `drawImage`-Aufruf mit `imageSmoothingEnabled = false` vom Sample-Canvas auf Zielgröße ersetzt den Pro-Zelle-Loop; dieser bleibt nur für den Fall bestehen, den der Shortcut nicht abdeckt. ✅ Für synthetische Dither-Muster: `putImageData` auf ein kleines Offscreen-Canvas (z. B. Bayer-4×4-Dither in Markenfarben), danach Nearest-Neighbor-Upscale — „3-px-Blöcke kosten ein `putImageData` statt 50.000 `fillRect`s".
**Beleg:** mccain-digital, commit `16fe47b` (2026-09-01): Guard `tools/pixel_scale.sh` bestätigt `bestScale 1.00` nach der Umstellung, identisch zum alten Ergebnis, für alle sechs Mosaike der Seite · CHANGELOG.md „## 2026-06-12 — Awwwards-Welle B+C" Zeilen 830-832 (`PixelFX.imageRenderer`) · Sicherheit: gemessen + dokumentiert
**Gilt für:** WebGL/Canvas

### 54. Beim Verkleinern auf ein grobes Zellraster flächenmittelnd downscalen
**Warum:** Wird pro Rasterzelle nur ein einzelnes Pixel gelesen (Punktabtastung), verwirft das an Kanten/dünnen Strichen zufällig Bildinformation — an einer Glyphenkante ist genau das obere linke Pixel oft ein antialiastes Pixel unter dem Schwellenwert, wodurch die ganze Zelle verworfen wird, auch mitten im Buchstaben. Zeichnet man das Quellbild stattdessen direkt in ein Offscreen-Canvas mit der Zielauflösung (COLS×ROWS bzw. ein Texel pro Rasterzelle), übernimmt die native Bildverkleinerung des Browsers automatisch die Flächenmittelung.
**Woran man es erkennt:** Pixel-Headlines wirken dünner/heller/kleiner als danebenstehender normaler Text, mit Löchern mitten in Buchstaben; ein Photo-zu-Mosaik-Readback liest deutlich mehr Pixel als nötig (`W×H` statt `COLS×ROWS`).
**Fix:** Bild/Maske in ein Offscreen-Canvas mit exakt der Zielauflösung zeichnen und die native Verkleinerung mitteln lassen, statt Einzelpixel im Quellbild per Punktabtastung auszulesen; bei gemittelten Kantenzellen den Schwellenwert entsprechend absenken.
**Beleg:** mccain-digital, commit `a4aee9f` (2026-08-31, Glyphen-Downscale, Schwellenwert 120 → 70; Geometrie war bereits exakt, 336 px vs. 337 px Text-Box) · HANDOFF.md Patch 8 (Zeile 2937-2946, Foto-zu-Mosaik: 224.000 → 14.000 Pixel, ~16× weniger auf einer Work-Karte) · Sicherheit: gemessen
**Gilt für:** WebGL/Canvas

### 55. Teure Bildabtastung einmal pro Größe cachen, im Loop nur Lookup und Lerp
**Warum:** Ein Hover-Effekt, der ein Bild hinter einem Partikelfeld freilegt, müsste das Bild bei einer naiven Umsetzung pro Frame erneut abtasten/dekodieren.
**Woran man es erkennt:** Ein Bild-basierter Canvas-Effekt zeigt im Profiler pro Frame Dekodier-/Sampling-Arbeit statt reiner Lookup-Operationen.
**Fix:** Das Bild einmal pro Größe in ein Byte-Triple pro Zelle sampeln; im laufenden Loop nur noch ein Lookup plus Lerp ausführen.
**Beleg:** mccain-digital, commit `41c0efe` (2026-09-01): Ziehen über den Hero, 612 Frames, 0 Long Tasks, p50=p90=p99 16,7 ms, max 16,9 ms, 0 % über 20 ms · Sicherheit: gemessen
**Gilt für:** WebGL/Canvas

### 56. Teure und billige Effekt-Anteile an unterschiedlichem Takt laufen lassen
**Warum:** Kombiniert ein Effekt eine teure Rausch-Berechnung mit einer billigen arithmetischen Bewegung, verschwendet es Hauptthread-Zeit, beide bei voller Framerate zu berechnen — nur die Bewegung, nicht das Rauschen, muss jeden Frame sichtbar neu sein.
**Woran man es erkennt:** Ein Effekt mit prozeduralem Rauschen zeigt im Profiler eine gleichmäßig hohe Pro-Frame-Kostenlast, obwohl der sichtbare Bewegungsanteil viel einfacher ist als das Rauschmuster.
**Fix:** Die teure prozedurale Berechnung (z. B. vier Oktaven Noise) mit reduzierter Rate laufen lassen (z. B. zwölfmal pro Sekunde statt 60), nur die billige, sichtbare Bewegung an die volle Framerate koppeln.
**Beleg:** mccain-digital, commit `41c0efe` (2026-09-01): Teil derselben Messung wie Regel 55 — 612 Frames, 0 Long Tasks, p50 bis p99 16,7 ms · Sicherheit: dokumentiert
**Gilt für:** WebGL/Canvas

### 57. Vor der naheliegenden Zeichenoperation die tatsächliche Ursache profilen
**Warum:** Eine hohe Zahl von Zeichenoperationen (z. B. ~26.000 `fillRect`-Aufrufe pro Frame bei 3-px-Zellen) wirkt wie der naheliegende Verdächtige für Jank — die tatsächliche Ursache kann stattdessen in einer pro Zelle wiederholten, teuren Berechnung liegen (im Projekt: vier Oktaven Value-Noise = 16 Sinus-Berechnungen pro Zelle, macht bei drei Feldern auf einer Seite rund 2 Millionen Sinus-Aufrufe pro Frame). Das reine Optimieren des Zeichnens behebt das Problem dann nicht; erst der Umbau der Berechnung selbst hilft. Die nachhaltige Lösung für ein driftendes prozedurales Feld ist zudem, pro Tick nur die neu sichtbare Spalte zu berechnen statt das komplette Gitter — das senkt die Kosten von O(Breite×Höhe) auf O(Höhe) pro Frame.
**Woran man es erkennt:** Ein Dither-/Rausch-Hintergrundfeld drückt die Seite auf 20 fps; `scripts/mainthread.mjs` zeigt viele Long Tasks trotz vermeintlich einfacher Zeichenoperationen.
**Fix:** Per Profiling verifizieren, ob Zeichnen oder Berechnung tatsächlich die Zeit kostet, statt von der naheliegenden Operation auf die Ursache zu schließen. Das Feld in einem Ringpuffer aus vorausberechneten Spalten halten; pro Tick genau eine neue Spalte berechnen statt das gesamte Gitter. Größenabhängige Elemente (z. B. eine Vignette) nur einmal pro Resize berechnen, nicht pro Frame.
**Beleg:** mccain-digital, commit `d73393b` (2026-09-01, „from MengTo/Skills"): vor dem Fix mit drei Feldern auf einer Seite 68 Long Tasks, 4 s blockierter Hauptthread, 27,5 % der Frames über 20 ms; nach dem Ringpuffer-Umbau 0 Long Tasks, 0 % über 20 ms, p90 16,7 ms · dieselben Zahlen zusätzlich unabhängig als „fillRect-Anzahl war nicht der Flaschenhals" dokumentiert · Sicherheit: gemessen
**Gilt für:** WebGL/Canvas

### 58. Vor dem Verwerfen eines Interaktions-Resamplings die Kosten gegen das Frame-Budget messen
**Warum:** Ein Button, dessen Fläche aus einem animierten CSS-Gradient besteht, hält bei einmaligem Canvas-Sampling (nur beim Laden/Resize) ein veraltetes Pixelmuster fest, obwohl der Gradient weiterläuft — Partikel „springen" sichtbar bei jedem Hover-Wechsel. Ein pro Interaktion (z. B. bei jedem Hover-Enter) wiederholtes Resampling erscheint zunächst wie ein Performance-Risiko, ist aber oft weit günstiger als befürchtet.
**Woran man es erkennt:** Ein gesampeltes Canvas-„Face" zeigt beim Hover-Wechsel sichtbar veraltete Farben/Positionen.
**Fix:** Bevor ein pro-Interaktion wiederholtes, potenziell teures Offscreen-Rendering (Canvas-Resampling, `getImageData` o. Ä.) aus Perf-Sorge verworfen wird, die tatsächlichen Kosten gegen das Frame-Budget messen (16,7 ms bei 60 fps) — oft liegen sie weit darunter und rechtfertigen sich gegenüber einem sichtbaren Korrektheitsfehler. Konkret: Fläche bei jedem Hover-Enter neu sampeln.
**Beleg:** mccain-digital, CHANGELOG.md „## 2026-09-04" Zeilen 257-266 und commit `a4ddb84` (2026-09-04, identische Zahlen): gemessen 0,7 ms im Median, 1,3 ms bei p90, gegen ein 16,7-ms-Frame · Sicherheit: gemessen
**Gilt für:** WebGL/Canvas

### 59. Teure synchrone Canvas-Operationen aus dem Interaktions-Hotpath in eine Idle-Phase verschieben
**Warum:** Geschieht das Sampling einer Button-Fläche (`getImageData`) im `pointerenter`-Handler, fällt der Zeitpunkt mit dem synchronen Interaktionsmoment zusammen und verursacht sichtbares Ruckeln — zusätzlich waren zu diesem Zeitpunkt bereits `:hover`-Stile (Farbe/Rahmen) aktiv, sodass der falsche (Hover- statt Ruhe-)Zustand eingefangen wurde. Zusätzliche Nuance: Der Standard-Weg, ein „echtes" Zeigegerät zu erkennen und teure Hover-Effekte entsprechend zu gaten, ist die **kombinierte** Prüfung `(hover: hover) and (pointer: fine)` — manche Android-Geräte emulieren Hover per Long-Press, `hover: hover` allein reicht daher nicht.
**Woran man es erkennt:** Ein sichtbarer `getImageData`-Ruckler beim Hover-Start im Profiler; ein gesampeltes Element verliert dabei Pixel, die im Ruhezustand eigentlich vorhanden wären (z. B. weiße Pixel eines Ghost-Buttons).
**Fix:** Das Sampling während einer Idle-Phase (`requestIdleCallback`) vorab ausführen statt im `pointerenter`-Handler, und dabei sicherstellen, dass der tatsächliche Ruhezustand erfasst wird, nicht der bereits aktive Hover-Zustand. Verzögert eine Engine ihre teure Neuberechnung bewusst per Idle-Callback plus Resize-Debounce, muss jede Messung/jeder Test dasselbe Timing respektieren — ein `resize`-Event feuern und die Debounce-Zeit (im Projekt >220 ms) abwarten, sonst liest man einen veralteten Cache-Wert und hält ihn fälschlich für einen Bug.
**Beleg:** mccain-digital, CHANGELOG.md „## 2026-06-12 — Feinschliff-Welle 3" Zeilen 872-875: „kein getImageData-Ruckler mehr beim Hover-Start" · HANDOFF.md Zeile ~1977-1981 (Debounce-Timing für Messungen) · [Smashing Magazine, hover/pointer Media Queries](https://www.smashingmagazine.com/2022/03/guide-hover-pointer-media-queries/) (dokumentiert) · Sicherheit: gemessen + dokumentiert
**Gilt für:** WebGL/Canvas

### 60. Ein Hintergrund-Check muss auch background-image prüfen, nicht nur backgroundColor
**Warum:** Prüft eine „hat dieses Element einen Hintergrund?"-Logik nur `cs.backgroundColor`, übersieht sie einen `repeating-linear-gradient` als `background-image` — dessen `backgroundColor` bleibt `rgba(0,0,0,0)`, obwohl visuell ein Hintergrund vorhanden ist.
**Woran man es erkennt:** Ein Canvas-Partikel-Effekt über einem Element mit Gradient-Hintergrund wird beim Hover unsichtbar, weil das „Gesicht" nie gemalt wird; gemessen wurden vorher 350 gemalte Pixel mit 0 hellen, danach ~4.200 Pixel mit 94 % hell.
**Fix:** Das berechnete `background-image` lesen, in dem jede `var()` bereits aufgelöst ist, statt nur der CSS-Variablen-Tokens dahinter — gezielt für die lineare-Gradient-Familie.
**Beleg:** mccain-digital, commit `a4ddb84` (2026-09-04): 350 → ~4.200 gemalte Pixel, 0 % → 94 % hell, max. Luminanz 14 → 198 · Sicherheit: gemessen
**Gilt für:** WebGL/Canvas

### 61. Hover-Reveals auf einem Zellraster per Resampling lösen, nicht per zusätzlicher Zeichnung
**Warum:** Eine zusätzliche Zeichnung (z. B. Kreis mit Glow) für einen Hover-Effekt ist teurer als inverses Resampling auf einem bereits bestehenden Zellraster — eine Zelle bei Radius r liest dabei einfach die zugrunde liegende Wolke bei einem leicht verschobenen Radius.
**Woran man es erkennt:** Ein Hover-Effekt zeichnet zusätzliche Formen (Kreis, Glow) über einem bereits vorhandenen Zellraster.
**Fix:** Den Effekt als Resampling des bestehenden Rasters implementieren statt als zusätzliche Zeichnung; bei mehreren gleichzeitig möglichen Instanzen (z. B. autonome Idle-Passagen) ein gemeinsames Lock verwenden, das überlappende Passagen verhindert.
**Beleg:** mccain-digital, commit `c461b51` (2026-09-01): durchgehendes Ziehen über den Hero, 551 Frames, 0 Long Tasks, p50 16,7 ms, p99 16,8 ms, 0 % über 20 ms · Sicherheit: gemessen
**Gilt für:** WebGL/Canvas

### 62. naturalWidth und naturalHeight sind dichte-korrigierte CSS-Pixel, keine Bitmap-Pixel
**Warum:** `naturalWidth`/`naturalHeight` melden die dichte-korrigierte Größe in CSS-Pixeln; die 9-Argument-Form von `drawImage` erwartet ihr Quellrechteck aber in rohen Bitmap-Pixeln. Ein `<img>` mit `srcset`, das eine 2×-Kandidatin wählt, liefert damit ein Quellrechteck, das nur einen Bruchteil des tatsächlichen Bilds trifft — im Projekt meldete eine 640×440-px-Datei auf der Platte `naturalWidth/Height` von 559×384 bei Dichte 1,14, wodurch der Ausschnitt nur die linken oberen ~87 % traf; bei Dichte 2,14 blieb nur noch ein Viertel des Bildes sichtbar.
**Woran man es erkennt:** Ein Canvas-Mosaik/-Effekt über einem `<img srcset>` erscheint auf manchen Displays gezoomt und oben links verankert, auf anderen korrekt.
**Fix:** ✅ Auf die 5-Argument-Form von `drawImage` wechseln, die das gesamte Bild in ein Ziel-Rechteck skaliert — nie eine Größe im Bitmap-Raum aus `natural*` ableiten, nur das (dichte-unabhängige) Seitenverhältnis. Ein Regressionstest darf dabei nicht nach Verschiebung suchen (eine reine Fehlskalierung hat ihr Optimum bei `dx = dy = 0`), sondern muss über Skalierungsfaktoren suchen.
**Beleg:** mccain-digital, commit `3471a63` (2026-08-31) und HANDOFF.md Patch 5 (Zeile 2883-2899, identischer Bug, reicher dokumentiert): Fehlerfaktor variierte mit `srcset`/DPR, bei der 1200-w-Variante mit Dichte 2,14 nur noch ein Viertel des Bildes sichtbar · Sicherheit: gemessen
**Gilt für:** WebGL/Canvas

### 63. getBoundingClientRect liefert bei transformierten Elementen die Hülle, nicht die echte Box
**Warum:** `getBoundingClientRect()` liefert bei rotierten/transformierten Elementen die achsenparallele **Hülle** um das Element, nicht seine eigentliche (gedrehte) Box — ein Element, das per CSS rotiert ist und dessen Scroll-Drift die Rotation animiert, meldet dadurch eine deutlich größere Fläche als seine tatsächliche Ausdehnung.
**Woran man es erkennt:** Ein Canvas-Mosaik über einem rotierten Element wirkt gestaucht (im Projekt 12 % in der Breite, 8 % in der Höhe); ein Hover-Effekt (z. B. ein „Krater") landet spürbar neben dem tatsächlichen Cursor (im Projekt 18–22,5 px bei 46 px Radius).
**Fix:** Für pixelgenaues Canvas-Sizing oder Pointer-Mapping die tatsächliche Layout-Box messen statt der Hülle; wo das nicht direkt möglich ist, das Pointer-Mapping empirisch mit einer nullgroßen Probe an mehreren bekannten lokalen Punkten kalibrieren, einmal invertieren und cachen.
**Beleg:** mccain-digital, commit `3471a63` (2026-08-31): Pointer-Mapping-Fehler nach Fix auf 1,0 px reduziert, ohne messbare Zusatzkosten · Sicherheit: gemessen
**Gilt für:** WebGL/Canvas

### 64. Beim Schichten von Canvas-Ebenen auf korrektes Alpha-Compositing achten
**Warum:** Zwei vollständig deckende (opake) visuelle Ebenen, die per gegenläufiger CSS-`opacity` überblendet werden, ergeben mathematisch `a + b·(1−a)` — in der Mitte der Blende ergibt das nur rund 75 % Gesamtdeckkraft statt 100 %, sichtbar als dunkler „Puls". Besteht ein Effekt zusätzlich aus mehreren Teil-Layern, die gemeinsam ein-/überblendet werden sollen, erzeugt es eine sichtbare Kante, wenn jeder Teil-Layer sein eigenes Blend-„Rezept" direkt auf der Hauptfläche bekommt, statt dass der gesamte Effekt zuerst deckend auf einer eigenen Zwischen-Ebene zusammengesetzt wird.
**Woran man es erkennt:** Beim Überblenden zweier Canvas-Layer erscheint in der Mitte des Übergangs ein sichtbarer Helligkeits-/Dunkelheits-Puls; ein zusammengesetzter Effekt zeigt eine „gestörte Box" als schwaches Rechteck mit anderer Mischung als seine Umgebung.
**Fix:** Eine Ebene als undurchsichtigen Boden fest zeichnen (Alpha 1) und nur die zweite mit variablem Alpha darüberlegen — die Übergangsdauer bleibt dann der einzige Regler für die wahrgenommene „Weichheit" (im Projekt: 460 → 640 ms senkte die Härte pro 100 ms von 15,3 auf 11,9). Besteht ein Effekt aus mehreren Teil-Layern: den gesamten Effekt zuerst deckend auf einer eigenen Zwischen-Ebene (Offscreen-Canvas) zusammensetzen, und erst diese eine Ebene mit dem gemeinsamen Alpha überblenden.
**Beleg:** mccain-digital, HANDOFF.md Patch 6 (Zeile 2900-2915, Helligkeit konstant 40,2–40,4 über den gesamten Blend-Verlauf gemessen) und Patch 7 (Zeile 2916-2933, Zusatzkosten der Zwischen-Ebene in der Messung nicht nachweisbar, Median 16,7 ms, 0 Frames über 20 ms) · Sicherheit: gemessen
**Gilt für:** WebGL/Canvas

### 65. Ein Canvas-Overlay und sein transformiertes Trägerelement laufen sonst auseinander
**Warum:** Ein Element kann nicht gleichzeitig ein CSS-`transform` auf einer visuellen Ebene (z. B. `<img>`) und ein davon unabhängiges Canvas-Pixelfeld auf einer zweiten, exakt überlagerten Ebene fahren, ohne dass beide Ebenen synchron transformiert werden — sonst schieben sich die Ebenen bei jedem Wechsel sichtbar auseinander.
**Woran man es erkennt:** Beim Hover einer Karte läuft `transform: scale(1.04)` auf dem `<img>`, während das Canvas-Mosaik bei Skalierung 1 festgenagelt bleibt —„das Bild zoomt und ruckelt" (im Projekt konkret 23 px Versatz gemessen).
**Fix:** Entweder das CSS-`transform` auf dem darunterliegenden Element ersatzlos entfernen, oder den Transform explizit auf **beide** Ebenen gleichzeitig anwenden und die Zeigerkoordinaten im Eventhandler entsprechend gegenrechnen. Etablierter Weg im Projekt: aktiv unterdrücken, z. B. `.pxbtn.px-active { transform: none !important }`.
**Beleg:** mccain-digital, HANDOFF.md Zeile 3715-3723 · Sicherheit: gemessen
**Gilt für:** WebGL/Canvas

### 66. Canvas-Animationseffekte kontrolliert starten und unter reduced-motion gar nicht aufbauen
**Warum:** Eine Canvas-Engine (z. B. `PixelFX.headline()`) spielt nicht von selbst ab — sie muss explizit gestartet werden, sonst bleibt sie im Ruhezustand, auch wenn ihr Element sichtbar ist. Umgekehrt muss ein Canvas-Reveal-Effekt unter `prefers-reduced-motion` **gar nicht erst aufgebaut** werden: hält ein „armed"-Flag den echten Inhalt bis zum Reveal versteckt, bliebe der Inhalt unter reduced motion sonst dauerhaft unsichtbar, bis (falls überhaupt) ein Observer feuert.
**Woran man es erkennt:** Ein Canvas-Effekt bleibt trotz sichtbarem Element untätig, solange kein expliziter Start-Trigger vorhanden ist; unter aktiviertem reduced-motion bleibt ein Reveal-Text dauerhaft unsichtbar statt sofort lesbar.
**Fix:** Einen `IntersectionObserver` `.play()` aufrufen lassen, sobald das Element sichtbar wird. Unter `prefers-reduced-motion` keinen Canvas aufbauen und kein Verstecken-Flag setzen — der Inhalt bleibt direkt sichtbar; wird trotzdem „armed", dann erst **nach** dem erfolgreichen Konstruieren, damit ein Fehler den Inhalt nicht dauerhaft verschwinden lässt.
**Beleg:** mccain-digital, HANDOFF.md Zeile 3709-3710 (IO-Start) · commit `f97788c` (2026-09-04, voidReveal unter reduced motion: Zustandskette `vr-armed → vr-playing → vr-done` verifiziert, reduced motion erzeugt 0 Canvas und 0 Klassen, bei 390 px Breite Canvas 322×114 ohne Overflow) · Sicherheit: dokumentiert
**Gilt für:** WebGL/Canvas

### 67. Canvas-gerasterten Text durch echten DOM-Text mit CSS-Masken-Reveal ersetzen
**Warum:** Dauerhaft als Canvas-Pixelraster gezeichneter Text bindet eine Seite an kontinuierliches Canvas-Rendering statt an normalen DOM-Text: Pixel-gerasterte Headlines waren bei eingeschränktem Sehvermögen unlesbar, ein Hover-Scatter-Effekt zerriss Wörter mitten im Wort, und Canvas-Inhalte reagieren nicht automatisch auf CSS-Custom-Property-Änderungen (ein Theme-Wechsel brauchte deshalb einen eigenen, zusätzlichen 600-ms-Redraw-Pass für alte Farben). Mehrere solcher Canvas-Raster auf einer Seite waren im Projekt zudem „der teuerste Boot-Pfad im Repo" und ließen automatisierte Audits mit festen Wartezeiten wiederholt mit „NOTHING MEASURED" statt einem echten Ergebnis fehlschlagen (die methodische Konsequenz für Test-Tooling gehört in [messen.md](messen.md)).
**Woran man es erkennt:** `[data-pixel]`- bzw. äquivalente Canvas-Raster-Attribute kommen im Live-Markup vor; ein Audit scheitert wiederholt und last-abhängig mit „NOTHING MEASURED" statt einem echten Kontrast-/Struktur-Fund auf derselben Seite; ein Theme-Wechsel zeigt kurz die alte Textfarbe.
**Fix:** Canvas-Engine nur noch für Bilder, Buttons und ein statisches SVG-Logo einsetzen, nicht für Fließtext/Headlines; Headlines als echten DOM-Text mit einer CSS-Maske (`overflow: clip` + Transition) einsteigen lassen. Migration per Skript mit Assertion pro Seite absichern (bei Abweichung bricht nur die betroffene Seite unverändert ab, „halb angewendet ist schlimmer als gar nicht migriert").
**Beleg:** mccain-digital, commit `6e6435d` (2026-09-01): `[data-pixel]`-Vorkommen 0, vorher (Commit `d8948b9`) medianer Frame ~35 ms mit mehreren Long Tasks, nachher 0 Long Tasks, p90 16,9 ms · commit `1a36a82` (2026-09-02, Migrationsskript): 9 von 11 Seiten rastern keine Headline mehr, Sweep über 11 Seiten bei 1440×900 und 390×844 ohne Fehler · commit `5a132f3` (2026-09-04): contact.html [dark] audit-Flake behoben, danach stabil 18 Accent-Knoten/2 Gradient-Texte auf 6 Seiten in beiden Themes, `data-pixel` 0 auf jeder Live-Seite · commit `3383e78` (2026-09-10): 600-ms-Theme-Redraw-Pass komplett entfernt (mit dem Theme-Toggler selbst) · Sicherheit: gemessen
**Gilt für:** statisches HTML (Migrationsweg), Mechanismus allgemein

### 68. Ein sich wiederholendes Deko-Muster einmal zeichnen und nur per CSS-Transform driften lassen
**Warum:** Ein Canvas in voller Bandgröße pro Deko-Layer wäre riesig (im Projekt rund 38 MB Pixel pro Layer) und ein Pro-Frame-Neuzeichnen zusätzlich teuer — für ein rein dekoratives, sich wiederholendes Muster über mehrere Sektionen reicht eine einzige kleine Kachel.
**Woran man es erkennt:** Ein Deko-Hintergrund über mehreren Sektionen zeichnet sich pro Frame per JavaScript neu, obwohl das Muster selbst statisch ist und nur driftet.
**Fix:** Eine kleine Kachel (im Projekt 192 px) einmal in ein Canvas zeichnen, als CSS-`repeating-background` verwenden und die Drift ausschließlich per CSS-Transform laufen lassen — der Compositor verschiebt dann nur eine bereits vorhandene Textur, null Pro-Frame-JavaScript, kein Repaint. Off-screen (Regel 21) zusätzlich pausieren, weil „billig" multipliziert über jedes Band einer langen Seite sonst nicht mehr billig ist.
**Beleg:** mccain-digital, commit `4d58954` (2026-09-01) · Sicherheit: dokumentiert
**Gilt für:** WebGL/Canvas

### 69. Für die konversionskritischste Seite ein Standbild statt Live-WebGL erwägen
**Warum:** Bei einem Konflikt zwischen einem visuell beeindruckenden Live-3D-Feature und maximaler Ladegeschwindigkeit auf der wichtigsten, konversionskritischen Marketing-Seite gilt die Prioritätsreihenfolge PageSpeed > SEO > A11y > Feature — selbst ein lazy/click-gated WebGL-Chunk ist dort oft noch zu riskant.
**Woran man es erkennt:** Ein interaktiver Three.js-Prototyp ist für die Homepage vorgesehen, obwohl „die Seite muss rasend schnell sein" als Owner-Priorität feststeht.
**Fix:** Das Live-3D-Feature woanders zeigen (Doku/App) oder als vorgerechnetes Standbild ausliefern: den WebGL-Prototyp als separates, nie deploytes Tool behalten, das per Headless-Chromium/Playwright einen einzelnen Frame einfängt, und der Live-Seite nur dieses eine optimierte Standbild (AVIF→WebP, lazy, explizite `width`/`height`, kein JS) geben.
**Beleg:** whatever-recall-internal/internal/3d-preview/README.md, .recall/HANDOFF.md 2026-06-18/21: 0 Three.js auf dem kritischen Pfad der Live-Seite, Poster-Bild 38 KB AVIF / 61 KB WebP · Sicherheit: dokumentiert
**Gilt für:** WebGL/Canvas · siehe auch [[audit-website]], [[web-skills-suite]]

### 70. Eine laufende Schleife ist nicht automatisch teuer, neue GPU-Effekte trotzdem vorher messen
**Warum:** Eine WebGL-/Canvas-Dauerschleife ist nicht per se ein Performance-Problem — mit korrekt funktionierenden Sichtbarkeits-Gates (Regel 21) kann sie einen vernachlässigbaren Hauptthread-Anteil haben; den tatsächlichen Anteil messen, bevor Optimierungsaufwand investiert wird. Die Kehrseite gilt genauso: ein neuer, GPU-lastiger Effekt über einem bestehenden Canvas (z. B. ein gestufter `backdrop-filter`/progressiver Blur über einem laufenden Canvas-Hintergrund) sollte vor dem Einbau isoliert auf seine Frame-Kosten geprüft werden, statt ihn ungeprüft aus einer Ideensammlung zu übernehmen — `backdrop-filter` erzwingt fortlaufendes Neuberechnen der dahinterliegenden Pixel und kann über einem animierten Canvas teuer werden.
**Woran man es erkennt:** Eine laufende Schleife wird ohne Messung als Optimierungsziel vermutet, obwohl `scripts/mainthread.mjs` nur einen niedrigen einstelligen Prozentanteil zeigt; umgekehrt steht eine `backdrop-filter`-Idee über einem Canvas-Hintergrund im Backlog, ohne dass ihre Kosten je gemessen wurden.
**Fix:** Gemessenen Anteil vor jeder Entscheidung heranziehen — weder „läuft dauerhaft" noch „sieht nach GPU-Arbeit aus" für sich genommen reicht als Kriterium.
**Beleg:** mccain-digital, HANDOFF.md „STAND 13.9. NACHTS" Zeile 558-559: Pixelstrom-Loop, Desktop wie mobil, ~2 % Hauptthread, beide Sichtbarkeitstore funktionieren, „Bleibt (Owner)" · HANDOFF.md „MengTo/Skills", „Brauchbar, aber noch nicht gebaut" (ca. Zeile 2554-2557): progressive-blur „kostet aber backdrop-filter über einem laufenden Canvas; erst messen" · Sicherheit: gemessen + vermutet (backdrop-filter-Fall noch nicht gebaut)
**Gilt für:** WebGL/Canvas

## DOM-Größe

### 71. Initial unsichtbare Elemente als template auslagern statt live zu rendern
**Warum:** Werden große Mengen initial unsichtbarer oder erst bei Interaktion benötigter Elemente (Tooltips, Menüs, Notizen) vollständig ins initiale Markup gerendert, erhöht das die aktive DOM-Größe (relevant für Style-/Layout-Kosten) unabhängig davon, ob sie je gebraucht werden.
**Woran man es erkennt:** Die aktive DOM-Knotenzahl liegt deutlich über dem, was aktuell sichtbar ist; `scripts/requests.mjs`/DOM-Zensus zeigt viele Knoten ohne aktuellen visuellen Beitrag.
**Fix:** Initial unsichtbare Elemente als inertes `<template>` im Markup halten statt live zu rendern (siehe Regel 28); Nachladen erst bei tatsächlichem Bedarf. Für ein initial verstecktes, aber interaktiv einblendbares Element eignet sich alternativ `content-visibility: hidden` (Regel 5).
**Beleg:** mccain-digital, HANDOFF.md „STAND 16.9. NACHMITTAGS" Zeile 82, 109-110: 336 Stream-Notizen und 321 Mega-Menü-Knoten ausgelagert, DOM-Elemente ~2.540 → 2.206 · Sicherheit: gemessen
**Gilt für:** allgemein

### 72. Gzip-Größe ist kein Indikator für DOM-Rendering-Kosten
**Warum:** Viele DOM-Knoten (z. B. eine stark wiederholte SVG-Struktur) erzeugen Style-/Layout-/Rendering-Aufwand unabhängig von der übertragenen Byte-Größe, weil gzip stark wiederholende Strukturen sehr klein komprimiert — ein hochkomprimierbarer, aber knotenreicher Markup-Anteil kann den Hauptthread stark belasten, obwohl er im Netzwerktransfer kaum ins Gewicht fällt.
**Woran man es erkennt:** Eine Seite/Sektion mit sehr kleiner gzip-Größe zeigt trotzdem hohe Style-/Layout-Zeit im Trace; ein Blick auf die reine Transfergröße allein hätte kein Problem vermuten lassen.
**Fix:** DOM-Knotenzahl und übertragene Byte-Größe getrennt prüfen, nicht die eine aus der anderen ableiten; bei hoher Knotenzahl trotz kleiner gzip-Größe gezielt auf Vereinfachung oder Canvas-Alternative (siehe Regel 45) prüfen.
**Beleg:** mccain-digital, HANDOFF.md „STAND 13.9. NACHTS" Zeile 548-550 und 561: `/marke/`-Seite, 913 von 3.161 DOM-Knoten für 19 Markenzeichen, nach gzip nur 13.938 B bei 460 KB roh; zweites Beispiel am selben Logo wie Regel 45, commit `e34127b` (2026-09-13, Rasterisierung statt 146-Rect-Live-SVG): DOM 3.168 → 2.438 Knoten (−23 %) und Inline-Style-Elemente 2.207 → 1.464, während die gzip-Größe von index.html nur 125.578 → 119.004 B (−5 %) sank — die Byte-Ersparnis allein hätte den DOM-Effekt deutlich unterschätzt · Sicherheit: gemessen
**Gilt für:** allgemein

### 73. Alte DOM-Node-Schwellenwerte sind obsolet
**Warum:** Der frühere Lighthouse-Audit „dom-size" existiert im aktuellen main-Branch nicht mehr als eigene Datei und wurde durch „dom-size-insight" ersetzt (`replacesAudits: ['dom-size']`). Die neue, gemeinsam mit Chrome-DevTools genutzte Insight-Logik bewertet DOM-Größe nicht mehr über eine feste Gesamt-Node-Anzahl-Kurve, sondern korreliert sie mit tatsächlich beobachteten langsamen Rendering-Events: Nur Layout-/Style-Recalc-Events über 40 ms Dauer werden betrachtet, ein Layout-Event zählt als „groß" ab mehr als 100 betroffenen Layout-Objekten (`LAYOUT_OBJECTS_THRESHOLD = 100`), ein Style-Recalc ab mehr als 300 betroffenen Elementen (`STYLE_RECALC_ELEMENTS_THRESHOLD = 300`).
**Woran man es erkennt:** Ein Audit oder eine Doku zitiert noch die alten Richtwerte ~800/1.400 bzw. 1.500 DOM-Knoten, 60 Breite, 32 Tiefe.
**Fix:** Diese alten Zahlen nicht mehr verwenden. Stattdessen mit `scripts/mainthread.mjs` gezielt nach Layout-Events über 40 ms mit mehr als 100 betroffenen Layout-Objekten bzw. Style-Recalcs mit mehr als 300 betroffenen Elementen suchen — das sind die tatsächlich bewerteten Schwellen.
**Beleg:** [Lighthouse dom-size-insight.js](https://github.com/GoogleChrome/lighthouse/blob/main/core/audits/insights/dom-size-insight.js), [DevTools-Frontend DOMSize.ts](https://github.com/ChromeDevTools/devtools-frontend/blob/main/front_end/models/trace/insights/DOMSize.ts) („These thresholds were selected to maximize the number of long (>40ms) events above the threshold while maximizing the number of short (<40ms) events below the threshold.") · Sicherheit: dokumentiert
**Gilt für:** allgemein

## Nachträge aus dem Prüfdurchgang

Regeln, die erst nach der ersten Fassung dazukamen; sie behalten ihre Nummer, damit bestehende Verweise stabil bleiben.

### 74. `will-change: transform` oder eine erzwungene Compositing-Ebene nie mit `background-clip: text` kombinieren
**Warum:** `-webkit-background-clip: text` malt den Hintergrund durch die Glyphen. Wird dasselbe Element oder ein Nachfahre per `will-change: transform`, `transform`- oder `opacity`-Animation auf eine eigene Compositing-Ebene gehoben, rastert Chrome Text und Hintergrund getrennt, und der Clip greift nicht mehr: Verlaufstext wird unsichtbar oder zeigt seinen Hintergrundkasten.
**Woran man es erkennt:** Verlaufs- oder Bildtext verschwindet oder zeigt einen Kasten, sobald Hover-/Reveal-Animationen laufen oder ein `will-change` gesetzt ist. Im Projekt dreimal in neuen Komponenten derselben Canvas-Engine (Ghost-Buttons 06/2026, Work-Karten und Headlines 08/2026, AI-Wort-Welle 09/2026), jedes Mal erst nach dem Bau entdeckt.
**Fix:** Den geclippten Text in ein eigenes Element ohne `will-change` legen; animiert wird ein Wrapper ohne `background-clip`. Hover-Effekte auf Verlaufstext über `opacity`/`transform` des Wrappers, nie auf dem geclippten Element. Kein pauschales `will-change` (siehe Regel 32). Ein Lint- oder Test-Check, der `background-clip: text` neben `will-change`/`transform` im selben Element oder Nachfahren meldet, lohnt sich bei jeder Engine, die beides nutzt.
**Beleg:** mccain-digital, drei Fälle ([fallstudien.md](fallstudien.md), 2026-06-12, 2026-08-31, 2026-09-02/10) · Sicherheit: gemessen (Effekt), vermutet (Compositing-Mechanismus)
**Gilt für:** allgemein

## Offene Fragen

- **Doppel-Fire von contentvisibilityautostatechange:** [CSSWG-Issue #9803](https://github.com/w3c/csswg-drafts/issues/9803) beschreibt eine mögliche Race Condition (redundantes zweites initiales Event, wenn die Viewport-Näherung nicht synchron vorliegt) und war zum Recherchezeitpunkt offen/„Needs Edits". Vor produktivem Einsatz empirisch in aktuellem Chrome/Firefox/Safari nachprüfen, ob/wie oft ein doppeltes initiales Event tatsächlich auftritt (betrifft Regel 6).
- **document.getAnimations() in übersprungenen content-visibility-Subtrees:** Ob `getAnimations()`/`getAnimations({subtree: true})` pausierte Animationen in einem gerade übersprungenen Subtree zurückgibt, ausschließt, oder selbst den „Forced-Rendering"-Warnpfad auslöst, ließ sich nicht anhand einer eindeutigen Primärquelle klären — nur indirekte Hinweise. Gezielter Empirie-Test in aktuellem Chrome, Firefox, Safari empfohlen (betrifft Regel 8).
- **IntersectionObserver direkt auf einem Ziel mitten in einem geskippten Subtree (nicht am Container):** Ob das irgendeine Style-/Layout-Arbeit erzwingt oder einfach non-intersecting zurückgibt, ist nicht abschließend mit einer Primärquelle belegt; [Chromium-Bug 40733057](https://issues.chromium.org/issues/40733057) deutet auf reale Randfälle hin, war aber nur über Such-Snippets einsehbar (Login-Wall). Lohnt sich mit eingeloggtem Google-Account direkt nachzulesen (betrifft Regel 7).
- **Compositor-Support für background-color/clip-path:** Die exakte Chrome-Version, ab der diese beiden Eigenschaften standardmäßig/vollständig auf dem Compositor laufen, ließ sich nicht finden — der Chrome-Blog nennt sie nur als „planned", Community-Bugreports bis Chrome ~151 deuten auf einen noch nicht vollständig ausgereiften Rollout hin. Vor Verwendung als „sicher compositable" in dieser Doku: aktuellen Chrome-Stable direkt im DevTools-„non-composited animations"-Insight testen (betrifft Regel 31).
- **Browser-Support von scheduler.yield(), scheduler.postTask() und der Long-Animation-Frames-API in Safari:** Caniuse zeigte zum Recherchezeitpunkt (Safari ~26/27.x, September 2026) durchgängig „nicht unterstützt"; WebKit kann zwischen caniuse-Updates neue Features shippen. Zum Zeitpunkt der tatsächlichen Skill-Nutzung frisch prüfen (betrifft Regel 29).
- **„ResizeObserver loop limit exceeded" vs. „loop completed with undelivered notifications":** Für den ersten, historisch bekannten Wortlaut wurde keine offizielle, eigenständige Spec-/Chromium-Primärquelle gefunden, die ihn als eigenständig definierte Meldung beschreibt — nur Community-Bestätigung, dass beide denselben Schutzmechanismus meinen (betrifft Regel 19).
- **CLS bei Doppel-Layout durch Chromiums internen Relevanz-Mechanismus:** Laut [Chromium-Bug 40733057](https://issues.chromium.org/issues/40733057) kann eine legitime Größenänderung beim Unskip eines `content-visibility: auto`-Elements teils fälschlich als Layout-Shift gezählt werden (Style/Layout entdeckt das Element, IO wird registriert, der erste IO-Schritt läuft synchron) — als offener/nuancierter Implementierungskompromiss dokumentiert, nicht abschließend geklärt (betrifft Regel 4).
- **Exakte Kausalkette der 125-ms-Mask-Fetches im mccain-digital-Projekt:** Ob sie aus der IO-Geometrie-Berechnung der Bootstrap-Phase oder aus Layout-Lesen innerhalb der IO-Callbacks der Seite selbst stammen, ist laut `chromium_io_verdict.md` nicht verifiziert (betrifft Regel 7).

## Quellen

- https://www.w3.org/TR/css-contain-2/
- https://www.w3.org/TR/css-contain-2/#paint-containment
- https://www.w3.org/TR/css-contain-2/#relevant-to-the-user
- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/content-visibility
- https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment/Using
- https://developer.mozilla.org/en-US/docs/Web/API/Element/contentvisibilityautostatechange_event
- https://developer.mozilla.org/en-US/docs/Web/API/Element/checkVisibility
- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/contain-intrinsic-size
- https://caniuse.com/css-content-visibility
- https://github.com/w3c/csswg-drafts/issues/9803
- https://github.com/w3c/csswg-drafts/issues/8542
- https://github.com/w3c/csswg-drafts/issues/5611
- https://issues.chromium.org/issues/40733057
- https://bugzilla.mozilla.org/show_bug.cgi?id=1807253
- https://chromium.googlesource.com/chromium/src/+/main/third_party/blink/renderer/core/display_lock/display_lock_document_state.h
- https://chromium.googlesource.com/chromium/src/+/main/third_party/blink/renderer/core/display_lock/display_lock_document_state.cc
- https://source.chromium.org/chromium/chromium/src (intersection_geometry.cc, display_lock_utilities.cc, document.cc, css_image_value.cc — siehe `scratchpad/skill/raw/chromium_io_verdict.md`, HEAD `cabdc32a717663075a71718eb8750f6abdaedb64`)
- https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver/IntersectionObserver
- https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserverEntry/intersectionRect
- https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver/observe
- https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver
- https://trackjs.com/javascript-errors/resizeobserver-loop-completed-with-undelivered-notifications/
- https://gist.github.com/paulirish/5d52fb081b3570c81e3a
- https://developer.chrome.com/docs/performance/insights/forced-reflow
- https://github.com/GoogleChrome/lighthouse/blob/main/core/audits/insights/forced-reflow-insight.js
- https://github.com/GoogleChrome/lighthouse/blob/main/core/config/default-config.js
- https://github.com/GoogleChrome/lighthouse/blob/main/core/audits/non-composited-animations.js
- https://developer.chrome.com/blog/hardware-accelerated-animations
- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/will-change
- https://developer.mozilla.org/en-US/docs/Web/API/Element/getAnimations
- https://caniuse.com/mdn-api_scheduler_yield
- https://caniuse.com/mdn-api_scheduler_posttask
- https://developer.chrome.com/blog/loaf-has-shipped
- https://developer.chrome.com/blog/use-scheduler-yield
- https://web.dev/articles/optimize-inp
- https://github.com/GoogleChrome/lighthouse/blob/main/core/audits/insights/dom-size-insight.js
- https://github.com/ChromeDevTools/devtools-frontend/blob/main/front_end/models/trace/insights/DOMSize.ts
- https://developer.chrome.com/docs/devtools/performance/reference
- https://github.com/GoogleChrome/lighthouse/blob/main/core/lib/tracehouse/task-groups.js
- https://developer.chrome.com/docs/devtools/memory-problems
- https://developer.chrome.com/blog/devtools-grounded-real-world
- https://chromium.googlesource.com/chromium/src/+/refs/heads/main/docs/gpu/swiftshader.md
- https://github.com/openlayers/openlayers/issues/16118
- https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext
- https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices
- https://github.com/mdn/browser-compat-data/issues/21127
- https://developer.chrome.com/blog/background_tabs
- https://www.smashingmagazine.com/2022/03/guide-hover-pointer-media-queries/
- https://web.dev/articles/prefers-reduced-motion
