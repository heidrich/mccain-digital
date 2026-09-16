# Rendern: Hauptthread und Layout — html-performance

> Teil des Skills [[html-performance]] · Stand 2026-09-16 · Belege: mccain-digital (HANDOFF, CHANGELOG, Commits), weitere Projekte des Owners, Recherche mit Quell-URLs

Diese Datei deckt ab, was nach dem ersten Bild den Hauptthread und das Layout beschäftigt: content-visibility im Detail, erzwungener Reflow, IntersectionObserver/ResizeObserver, Hauptthread und „Other“, DOM-Größe. Animationen stehen in [rendern-animationen.md](rendern-animationen.md), Canvas und WebGL in [rendern-canvas-webgl.md](rendern-canvas-webgl.md). Ladereihenfolge, Fonts, Bilder und Caching: [laden-kritischer-pfad.md](laden-kritischer-pfad.md), [laden-javascript.md](laden-javascript.md), [laden-auslieferung.md](laden-auslieferung.md); Lighthouse/PSI-Scoring in [lighthouse-psi.md](lighthouse-psi.md), Mess-Methodik in [messen.md](messen.md), der Framework-Delta in [react-nextjs.md](react-nextjs.md).

Bis zum 16.9.2026 stand dieser Inhalt zusammen mit den anderen `Rendern`-Themen in `rendern.md`; die Regeln sind hier neu von 1 durchnummeriert, alte Verweise gelten nicht mehr.

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
- **Den Skript-Start in Tasks unter 50 ms teilen, mit einem Yield ohne Frame-Wartezeit** — MessageChannel statt setTimeout(0); TBT 96 → 21 ms ([→](#34-den-skript-start-in-tasks-unter-50-ms-teilen-mit-einem-yield-ohne-frame-wartezeit))

**DOM-Größe**
- **Initial unsichtbare Elemente als template auslagern statt live zu rendern** — senkt die aktive DOM-Größe ohne Einsatzbereitschaft zu verlieren ([→](#31-initial-unsichtbare-elemente-als-template-auslagern-statt-live-zu-rendern))
- **Gzip-Größe ist kein Indikator für DOM-Rendering-Kosten** — stark komprimierbare SVG-Struktur kann trotzdem den Hauptthread belasten ([→](#32-gzip-größe-ist-kein-indikator-für-dom-rendering-kosten))
- **Alte DOM-Node-Schwellenwerte sind obsolet** — die neue Insight-Logik misst tatsächliche Layout-/Style-Recalc-Kosten ([→](#33-alte-dom-node-schwellenwerte-sind-obsolet))

## Inhalt

- [content-visibility: auto und hidden in der Tiefe](#content-visibility-auto-und-hidden-in-der-tiefe)
- [Erzwungener Reflow](#erzwungener-reflow)
- [IntersectionObserver und ResizeObserver](#intersectionobserver-und-resizeobserver)
- [Hauptthread und „Other"](#hauptthread-und-other)
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
**Woran man es erkennt:** Die Gesamtseitenlänge/Scrollbar-Höhe direkt nach dem Laden weicht von der Länge nach dem ersten vollständigen Scroll ab; CLS bleibt dabei oft nahezu unverändert. `scripts/cv-audit.mjs` meldet die Drift als Befund, `scripts/cv-heights.mjs` zeigt je Sektion und Breite Platzhalter gegen echte Höhe.
**Fix:** `contain-intrinsic-size: auto 900px` statt `contain-intrinsic-size: 900px` — reale Höhen zur Bauzeit messen (`scripts/cv-heights.mjs <url> --widths 412,768,1024,1350` liefert fertige Regeln je Breite als `@media (min-width)`-Gruppen) und als Startwert einsetzen, damit auch der allererste Skip nah an der Wahrheit liegt; die Zuordnung im Build über id oder data-Attribut, nicht über generierte Klassennamen. Gemessen wird die INHALTSHÖHE (`clientHeight` minus vertikales Padding): `contain-intrinsic-size` beschreibt die Inhaltsbox, Padding und Rahmen legt das Layout obendrauf; mit der Rahmenbox gemessen startet jede gepolsterte Sektion exakt um ihr Padding zu groß.
**Beleg:** mccain-digital, HANDOFF.md „STAND 13.9. 03:30" Zeile 367-371: 15.916 statt 19.611 px direkt nach dem Laden, korrigiert sich beim Scrollen, CLS unverändert bei 0,0012 · Fix 16.9.2026 abends (v5, `tools/v5heights.mjs` + `v5build.mjs`): Inhaltshöhen je Block bei 412/620/760/960/1280/1350 px als `[data-cv="key"]`-Regeln im Build → Drift beim ersten Scroll mobil +3.402 → 0 px, Desktop −3.095 → −1 px; mit Rahmenbox statt Inhaltsbox gemessen blieben −749/−902 px (je +72 px Padding pro Sektion) · Sicherheit: gemessen (Symptom und Fix) + dokumentiert (auto-Semantik, [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/contain-intrinsic-size))
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
**Fix:** (a) Wie in Regel 16: IO-Ziele auf Container statt Einzelelemente bündeln, das senkt die Kosten in der Bootstrap-Phase direkt. (b) Beobachtung/Messung eines Blocks erst starten, wenn er tatsächlich rendert (`contentvisibilityautostatechange` mit `skipped === false`, siehe Regel 6) — nicht weil `observe()` selbst schädlich wäre, sondern weil das die Bootstrap-Phase-Kosten vermeidet und verhindert, dass eigener Code aus Versehen Layout-Reads auf Knoten im gesperrten Subtree ausführt. (c) Niemals `getBoundingClientRect`, `offsetTop`, `clientWidth` oder ähnliche layout-erzwingende APIs (Liste unter [Erzwungener Reflow](#erzwungener-reflow)) auf einem Knoten **innerhalb** eines aktuell übersprungenen `content-visibility: auto`-Blocks aufrufen — das erzwingt Style **und** Layout der gesperrten Vorfahren und lädt dabei deren CSS-Bilder vorzeitig. Nur `content-visibility: hidden` bleibt dauerhaft gesperrt; `auto` kann jederzeit in die Bootstrap- oder Render-Phase wechseln.
**Beleg:** mccain-digital, HANDOFF.md „STAND 16.9. NACHMITTAGS", „Fallen" Zeilen 129-132: 14 Masken laden nicht mehr bei 125 ms nach Entfernen der `observe()`-Aufrufe auf den Kindelementen; motion-budget.js Container-Bündelung senkt IO-Zeit 508 → 97 ms, Anfragen 28 → 11 · `scratchpad/skill/raw/chromium_io_verdict.md` (16.09.2026, Chromium-Quellcodeprüfung) · Sicherheit: gemessen (Zahlen) + dokumentiert (Mechanismus, Chromium-Quellcode); die ursprüngliche scharfe Formulierung ist **widerlegt** (siehe [widerlegt.md](widerlegt.md#6-intersectionobserver-ziele-in-gesperrten-subtrees-erzwingen-pro-frame-layout))
**Gilt für:** allgemein

### 8. document.getAnimations() in übersprungenen Blöcken nicht blind vertrauen
**Warum:** Ein an `document.getAnimations()` gekoppeltes Motion-Budget-System im Projekt erfasste CSS-Animationen in übersprungenen `content-visibility`-Blöcken nicht. Die CSSWG hat in Issue #5611 aber beschlossen, dass `content-visibility` solche Animationen **pausieren** soll (wie `animation-play-state: paused`), nicht entfernen — ein pausiertes Web-Animations-API-Objekt bleibt nach dem allgemeinen Modell ein normal existierendes Animation-Objekt. `element.getAnimations()` liefert ohne `{subtree: true}` ohnehin nur Animationen des Elements selbst, nicht seiner Nachfahren. Diese Spezifikations-Aussage widerspricht der Projektbeobachtung — welche Variante in aktuellen Browsern tatsächlich stimmt, ist nicht eindeutig mit einer Primärquelle belegt.
**Woran man es erkennt:** Ein per `getAnimations()` gezählter Animations-Bestand bleibt nach dem Rendern eines vorher übersprungenen Blocks unerwartet konstant oder springt plötzlich hoch.
**Fix:** Nicht allein auf einen einmaligen `getAnimations()`-Scan beim Start verlassen. Bei jedem `contentvisibilityautostatechange`-Event (Regel 6) neu scannen, unabhängig davon, ob die Spezifikation die pausierten Animationen eigentlich schon mitliefern sollte — und vor produktivem Einsatz empirisch in aktuellem Chrome/Firefox/Safari nachprüfen (siehe [Offene Fragen](#offene-fragen)).
**Beleg:** mccain-digital, HANDOFF.md „STAND 16.9. NACHMITTAGS", „Fallen" Zeilen 136-138 (Projektbeobachtung) · [CSSWG Issue #5611](https://github.com/w3c/csswg-drafts/issues/5611) (Spec-Beschluss: pausieren, nicht entfernen) · Sicherheit: vermutet (Widerspruch zwischen Messung und Spezifikation nicht aufgelöst)
**Gilt für:** allgemein

## Erzwungener Reflow

Präzisierung vorab: „Forced reflow" ist als Konsolen-Warnung („Forced reflow while executing JavaScript took Xms") und im DevTools-Performance-Panel (Flame-Chart-Warndreieck) sichtbar ([Quelle](https://developer.chrome.com/docs/performance/insights/forced-reflow)) — **und seit Lighthouse 12/13 zusätzlich ein eigener Performance-Insight**: `forced-reflow-insight` (Report-Titel „Forced reflow", [`core/audits/insights/forced-reflow-insight.js`](https://github.com/GoogleChrome/lighthouse/blob/main/core/audits/insights/forced-reflow-insight.js)). Beide Wege zeigen praktisch dasselbe, weil `core/audits/insights/*.js` seit Lighthouse 12/13 nur noch ein dünner Adapter auf das externe Paket `@paulirish/trace_engine` ist — dieselbe Trace-Engine, die auch das DevTools-Performance-Panel antreibt. Der Insight ist einer von 17 in `default-config.js`, komplett neu ohne abgelöstes Vorgänger-Audit, und zählt wie alle Insights mit `weight: 0` nicht in den Performance-Score — erscheint aber real im Report, mit Top-Function-Call- und Bottom-up-Aufrufliste je exakter Quellcode-Position (URL/Zeile/Spalte); der Owner sah ihn am 16.9. als „Erzwungener dynamischer Umbruch", Quellort `logic.gen.js:336:113`, 52 ms. „PageSpeed meldete X ms erzwungenen Umbruch" ist damit in mehreren Projekt-Learnings präzise zitiert, nicht nur eine DevTools-Nebenbeobachtung; vollständige Insight-Liste in [lighthouse-psi.md](lighthouse-psi.md#die-17-performance-insights-lighthouse-13); dieselbe Korrektur mit identischem Beispiel in [widerlegt.md](widerlegt.md#8-layout-lesende-apis-pro-frame-lösen-einen-lighthouse-forced-reflow-befund-aus). Layout-erzwingende APIs sind u. a. `window.scrollX/scrollY`, `innerHeight/innerWidth`, `getBoundingClientRect()`, `getClientRects()`, `clientWidth/clientHeight/clientLeft/clientTop`, `offsetWidth/Height/Left/Top/Parent`, Scroll-Methoden, `focus()`, `innerText` und teilweise `getComputedStyle()` (siehe Regel 6 in [rendern-animationen.md](rendern-animationen.md#6-werte-aus-laufenden-animationen-sind-beim-messen-unsicher) für die genauen Bedingungen) — [vollständige Liste mit Chromium-Quellcodezeilen](https://gist.github.com/paulirish/5d52fb081b3570c81e3a). Ein erzwungenes Reflow kostet nur dann etwas, wenn Style/Layout seit dem letzten Flush bereits invalidiert wurde (DOM-/Klassen-Änderung, Pseudoklassen-Wechsel wie `:focus`); reines, wiederholtes Lesen ohne zwischenzeitliches Schreiben ist günstig — teuer wird das Read-after-Write-Muster in Schleifen („layout thrashing").

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
**Fix:** Jede laufende Canvas-/CSS-Animation (Partikelfelder, wandernde Ränder, Farbverläufe) per `IntersectionObserver` pausieren, sobald ihr Container nicht sichtbar ist — dasselbe Muster, das bereits für ein Partikelfeld etabliert wurde, auf neue Effekte (z. B. einen wandernden Rand mit Glow) übertragen. Konkreter Parameter aus `tools/motion-budget.js`: 300 px Vorlauf-Marge vor dem Viewport (pausiert erst bei Verlassen dieser Marge, nicht erst beim tatsächlichen Rausscrollen) plus ein `visibilitychange`-Pausiergrund für einen backgrounded Tab; canvas-eigene rAF-Loops haben ihr eigenes Sichtbarkeits-Gate (Regel 21 in [rendern-canvas-webgl.md](rendern-canvas-webgl.md#21-canvas-animationseffekte-kontrolliert-starten-und-unter-reduced-motion-gar-nicht-aufbauen)) und sind davon ausgenommen. Vor dem Bau den theoretischen Deckel messen (alle Animationen global abschalten), um zu wissen, welcher Anteil der gezielte Fix tatsächlich einfängt.
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

## DOM-Größe

### 31. Initial unsichtbare Elemente als template auslagern statt live zu rendern
**Warum:** Werden große Mengen initial unsichtbarer oder erst bei Interaktion benötigter Elemente (Tooltips, Menüs, Notizen) vollständig ins initiale Markup gerendert, erhöht das die aktive DOM-Größe (relevant für Style-/Layout-Kosten) unabhängig davon, ob sie je gebraucht werden.
**Woran man es erkennt:** Die aktive DOM-Knotenzahl liegt deutlich über dem, was aktuell sichtbar ist; `scripts/requests.mjs`/DOM-Zensus zeigt viele Knoten ohne aktuellen visuellen Beitrag.
**Fix:** Initial unsichtbare Elemente als inertes `<template>` im Markup halten statt live zu rendern (siehe Regel 28); Nachladen erst bei tatsächlichem Bedarf. Für ein initial verstecktes, aber interaktiv einblendbares Element eignet sich alternativ `content-visibility: hidden` (Regel 5).
**Beleg:** mccain-digital, HANDOFF.md „STAND 16.9. NACHMITTAGS" Zeile 82, 109-110: 336 Stream-Notizen und 321 Mega-Menü-Knoten ausgelagert, DOM-Elemente ~2.540 → 2.206 · Sicherheit: gemessen
**Gilt für:** allgemein

### 32. Gzip-Größe ist kein Indikator für DOM-Rendering-Kosten
**Warum:** Viele DOM-Knoten (z. B. eine stark wiederholte SVG-Struktur) erzeugen Style-/Layout-/Rendering-Aufwand unabhängig von der übertragenen Byte-Größe, weil gzip stark wiederholende Strukturen sehr klein komprimiert — ein hochkomprimierbarer, aber knotenreicher Markup-Anteil kann den Hauptthread stark belasten, obwohl er im Netzwerktransfer kaum ins Gewicht fällt.
**Woran man es erkennt:** Eine Seite/Sektion mit sehr kleiner gzip-Größe zeigt trotzdem hohe Style-/Layout-Zeit im Trace; ein Blick auf die reine Transfergröße allein hätte kein Problem vermuten lassen.
**Fix:** DOM-Knotenzahl und übertragene Byte-Größe getrennt prüfen, nicht die eine aus der anderen ableiten; bei hoher Knotenzahl trotz kleiner gzip-Größe gezielt auf Vereinfachung oder Canvas-Alternative (siehe Regel 15 in [rendern-animationen.md](rendern-animationen.md#15-den-wahren-verursacher-isoliert-messen-statt-der-naheliegenden-komponente-die-schuld-zu-geben)) prüfen.
**Beleg:** mccain-digital, HANDOFF.md „STAND 13.9. NACHTS" Zeile 548-550 und 561: `/marke/`-Seite, 913 von 3.161 DOM-Knoten für 19 Markenzeichen, nach gzip nur 13.938 B bei 460 KB roh; zweites Beispiel am selben Logo wie Regel 15 in [rendern-animationen.md](rendern-animationen.md#15-den-wahren-verursacher-isoliert-messen-statt-der-naheliegenden-komponente-die-schuld-zu-geben), commit `e34127b` (2026-09-13, Rasterisierung statt 146-Rect-Live-SVG): DOM 3.168 → 2.438 Knoten (−23 %) und Inline-Style-Elemente 2.207 → 1.464, während die gzip-Größe von index.html nur 125.578 → 119.004 B (−5 %) sank — die Byte-Ersparnis allein hätte den DOM-Effekt deutlich unterschätzt · Sicherheit: gemessen
**Gilt für:** allgemein

### 33. Alte DOM-Node-Schwellenwerte sind obsolet
**Warum:** Der frühere Lighthouse-Audit „dom-size" existiert im aktuellen main-Branch nicht mehr als eigene Datei und wurde durch „dom-size-insight" ersetzt (`replacesAudits: ['dom-size']`). Die neue, gemeinsam mit Chrome-DevTools genutzte Insight-Logik bewertet DOM-Größe nicht mehr über eine feste Gesamt-Node-Anzahl-Kurve, sondern korreliert sie mit tatsächlich beobachteten langsamen Rendering-Events: Nur Layout-/Style-Recalc-Events über 40 ms Dauer werden betrachtet, ein Layout-Event zählt als „groß" ab mehr als 100 betroffenen Layout-Objekten (`LAYOUT_OBJECTS_THRESHOLD = 100`), ein Style-Recalc ab mehr als 300 betroffenen Elementen (`STYLE_RECALC_ELEMENTS_THRESHOLD = 300`).
**Woran man es erkennt:** Ein Audit oder eine Doku zitiert noch die alten Richtwerte ~800/1.400 bzw. 1.500 DOM-Knoten, 60 Breite, 32 Tiefe.
**Fix:** Diese alten Zahlen nicht mehr verwenden. Stattdessen mit `scripts/mainthread.mjs` gezielt nach Layout-Events über 40 ms mit mehr als 100 betroffenen Layout-Objekten bzw. Style-Recalcs mit mehr als 300 betroffenen Elementen suchen — das sind die tatsächlich bewerteten Schwellen.
**Beleg:** [Lighthouse dom-size-insight.js](https://github.com/GoogleChrome/lighthouse/blob/main/core/audits/insights/dom-size-insight.js), [DevTools-Frontend DOMSize.ts](https://github.com/ChromeDevTools/devtools-frontend/blob/main/front_end/models/trace/insights/DOMSize.ts) („These thresholds were selected to maximize the number of long (>40ms) events above the threshold while maximizing the number of short (<40ms) events below the threshold.") · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 34. Den Skript-Start in Tasks unter 50 ms teilen, mit einem Yield ohne Frame-Wartezeit
**Warum:** Total Blocking Time zählt von jedem Task nur den Teil über 50 ms. Ein Start, der Vorlage kompiliert, 1.600 Knoten übernimmt und die Seite mountet, kostet in einem Task 72–116 ms bei 4× CPU und damit 22–66 ms TBT; dieselbe Arbeit in drei Tasks kostet nichts, weil keiner die Linie reißt. `setTimeout(fn, 0)` ist dafür das falsche Werkzeug: es wird auf ≥ 1 ms geklemmt und landet oft hinter dem nächsten Paint, also einen Frame später. Ein `MessageChannel`-Ereignis läuft als nächster Task ohne Frame-Wartezeit; `scheduler.yield()` ebenso, wo es existiert.
**Woran man es erkennt:** `scripts/lcp-window.mjs --cpu 4` zeigt eine Long Task kurz nach DOMContentLoaded von 100+ ms, deren Anteil der eigene Start ist (mit `performance.mark` je Phase belegen); TBT liegt spürbar über dem, was Style/Layout allein erklären.
**Fix:** Startphasen trennen (Parsen/Kompilieren → Binden/Übernehmen → Mount), zwischen den Phasen mit `MessageChannel` (Fallback `setTimeout`) yielden, und die Lücke absichern: Zustandsänderungen, die vor dem Mount eintreffen, werden gesammelt und vom ersten Durchlauf angewendet; Blöcke, die vorher rendern, werden nachgeholt. Jede Phase mit `performance.mark` versehen, damit die Werkstatt und die Messskripte sie ausweisen.
**Beleg:** mccain-digital `v5/runtime.js` (17.9.2026), Startseite Telefon 4× CPU: Start in einem Task 72–116 ms (kompilieren ~20, übernehmen ~40, Mount ~12 ms), TBT 96 ms; in drei Tasks Long Tasks 67 + 54 ms, **TBT 21 ms**; LCP unverändert (284 ms), CLS 0. · Sicherheit: gemessen
**Gilt für:** allgemein

## Offene Fragen

- **Doppel-Fire von contentvisibilityautostatechange:** [CSSWG-Issue #9803](https://github.com/w3c/csswg-drafts/issues/9803) beschreibt eine mögliche Race Condition (redundantes zweites initiales Event, wenn die Viewport-Näherung nicht synchron vorliegt) und war zum Recherchezeitpunkt offen/„Needs Edits". Vor produktivem Einsatz empirisch in aktuellem Chrome/Firefox/Safari nachprüfen, ob/wie oft ein doppeltes initiales Event tatsächlich auftritt (betrifft Regel 6).
- **document.getAnimations() in übersprungenen content-visibility-Subtrees:** Ob `getAnimations()`/`getAnimations({subtree: true})` pausierte Animationen in einem gerade übersprungenen Subtree zurückgibt, ausschließt, oder selbst den „Forced-Rendering"-Warnpfad auslöst, ließ sich nicht anhand einer eindeutigen Primärquelle klären — nur indirekte Hinweise. Gezielter Empirie-Test in aktuellem Chrome, Firefox, Safari empfohlen (betrifft Regel 8).
- **IntersectionObserver direkt auf einem Ziel mitten in einem geskippten Subtree (nicht am Container):** Ob das irgendeine Style-/Layout-Arbeit erzwingt oder einfach non-intersecting zurückgibt, ist nicht abschließend mit einer Primärquelle belegt; [Chromium-Bug 40733057](https://issues.chromium.org/issues/40733057) deutet auf reale Randfälle hin, war aber nur über Such-Snippets einsehbar (Login-Wall). Lohnt sich mit eingeloggtem Google-Account direkt nachzulesen (betrifft Regel 7).
- **Browser-Support von scheduler.yield(), scheduler.postTask() und der Long-Animation-Frames-API in Safari:** Caniuse zeigte zum Recherchezeitpunkt (Safari ~26/27.x, September 2026) durchgängig „nicht unterstützt"; WebKit kann zwischen caniuse-Updates neue Features shippen. Zum Zeitpunkt der tatsächlichen Skill-Nutzung frisch prüfen (betrifft Regel 29).
- **„ResizeObserver loop limit exceeded" vs. „loop completed with undelivered notifications":** Für den ersten, historisch bekannten Wortlaut wurde keine offizielle, eigenständige Spec-/Chromium-Primärquelle gefunden, die ihn als eigenständig definierte Meldung beschreibt — nur Community-Bestätigung, dass beide denselben Schutzmechanismus meinen (verwandt mit Regel 19, der einzigen ResizeObserver-Regel; der Loop-Schutz selbst hat keine eigene Regel).
- **CLS bei Doppel-Layout durch Chromiums internen Relevanz-Mechanismus:** Laut [Chromium-Bug 40733057](https://issues.chromium.org/issues/40733057) kann eine legitime Größenänderung beim Unskip eines `content-visibility: auto`-Elements teils fälschlich als Layout-Shift gezählt werden (Style/Layout entdeckt das Element, IO wird registriert, der erste IO-Schritt läuft synchron) — als offener/nuancierter Implementierungskompromiss dokumentiert, nicht abschließend geklärt (betrifft Regel 2 und Regel 7).
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
- https://source.chromium.org/chromium/chromium/src
- https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver/IntersectionObserver
- https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserverEntry/intersectionRect
- https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver/observe
- https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver
- https://trackjs.com/javascript-errors/resizeobserver-loop-completed-with-undelivered-notifications/
- https://gist.github.com/paulirish/5d52fb081b3570c81e3a
- https://developer.chrome.com/docs/performance/insights/forced-reflow
- https://github.com/GoogleChrome/lighthouse/blob/main/core/audits/insights/forced-reflow-insight.js
- https://github.com/GoogleChrome/lighthouse/blob/main/core/config/default-config.js
- https://developer.chrome.com/blog/hardware-accelerated-animations
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
- https://developer.chrome.com/blog/background_tabs
