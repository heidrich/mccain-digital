# Fallstudien — html-performance

> Teil des Skills [[html-performance]] · Stand 2026-09-16 · Belege: mccain-digital (HANDOFF, CHANGELOG, Commits), weitere Projekte des Owners, Recherche mit Quell-URLs
> Neuer Eintrag: oben einfügen (newest first) — Überschrift `## <Datum> · <Projekt> · <was gemessen wurde>`, Zahlen immer vorher→nachher angeben, am Ende die betroffenen Regeln in den Nachbardateien verlinken.

## Kurzfassung

| Datum | Projekt | Fall | Ergebnis (Zahlen) | Regel(n) |
|---|---|---|---|---|
| 2026-09-16 abends | mccain-digital | v5: Platzhalterhöhen aus dem Build, Motion-Budget-Timer, WebGL-Gegenprobe | Drift beim ersten Scroll mobil +3.402→0 px, Desktop −3.095→−1 px; setTimeout(250) im Sweep 25→0; rAF-Aufschub für WebGL: FCP 2,4→2,2 s, TBT 0→2,2 s | [](rendern-hauptthread.md#2-contain-intrinsic-size-genau-setzen-und-die-auto-form-nutzen), [](rendern-hauptthread.md#6-auf-contentvisibilityautostatechange-hören-checkvisibility-nur-als-start-fallback), [](rendern-canvas-webgl.md#1-getcontext-ist-synchron-der-erste-paint-darf-nicht-auf-canvas-oder-webgl-warten), [](widerlegt.md#51-zwei-requestanimationframe-ticks-nach-dem-skript-start-garantieren-einen-gemalten-ersten-frame--webgl-danach-zu-starten-entlastet-fcp-und-score) |
| 2026-09-16 | mccain-digital | v5-Optimierungsrunde + Chromium-Verifikation | "Other" 1.340→641ms, IO 508→97ms, PSI mobil 95→60→100 | [](rendern-hauptthread.md#4-content-visibility-erzeugt-einen-stacking-context-und-einen-containing-block), [](rendern-hauptthread.md#16-intersectionobserver-kosten-skalieren-mit-der-zielzahl-nicht-der-instanzzahl), lighthouse-psi.md#2-rechne-beim-psi-standard-mit-1000-ms-ruhefenster-nicht-5250-ms, widerlegt.md#3-object-pooling-verbessert-die-webgl-pixelstrom-performance |
| 2026-09-13 | mccain-digital | Prerender + Hydration in vier Runden | PSI mobil 84→91, LCP −49% (2.980→1.516ms) | react-nextjs.md, [](rendern-hauptthread.md#1-content-visibility-auto-auf-lange-off-screen-sektionen-anwenden), [](laden-auslieferung.md#2-html-und-die-zugehörige-runtime-js-datei-nie-gemeinsam-immutable-cachen) |
| 2026-09-11/12 | mccain-digital | "Mobil 41" war eine Fehlmessung + Logo-Animationen gefunden | Score 45→63 (Messfehler), 63→69 nach Fix | messen.md, [](rendern-animationen.md#15-den-wahren-verursacher-isoliert-messen-statt-der-naheliegenden-komponente-die-schuld-zu-geben) |
| 2026-09-02 bis 09-10 | mccain-digital | Der Award-Audit: Render-Pipeline und Kategorien A–D | SVG-Konsolenfehler 70/37→0/0, Elemente ~4.200→~2.200 | [](rendern-hauptthread.md#28-platzhalter-markup-gehört-in-ein-inertes-template-nie-in-einen-lebendigen-custom-element-teilbaum), messen.md, [](rendern-animationen.md#2-will-changetransform-gezielt-einsetzen-nicht-pauschal) |
| 2026-09-01 | mccain-digital | Der Refresh: index.html wird die Startseite | Dither-Feld 68 Long Tasks/4s → 0 Long Tasks | [](rendern-canvas-webgl.md#12-vor-der-naheliegenden-zeichenoperation-die-tatsächliche-ursache-profilen), [](rendern-canvas-webgl.md#18-getboundingclientrect-liefert-bei-transformierten-elementen-die-hülle-nicht-die-echte-box), messen.md |
| 2026-08-31 | mccain-digital | Bild-Pixel-Engine: Geometrie- und Compositing-Bugs | Canvas-Redraw 5,15ms→0,54ms, MutationObserver-TBT 260→120ms | [](rendern-canvas-webgl.md#7-ruhezustand-einmal-in-ein-offscreen-canvas-cachen-pro-frame-nur-die-dirty-region-neu-zeichnen), [](rendern-canvas-webgl.md#17-naturalwidth-und-naturalheight-sind-dichte-korrigierte-css-pixel-keine-bitmap-pixel), [](rendern-hauptthread.md#20-mutationobserver-mit-subtreetrue-neben-hochfrequenten-textänderungen-treibt-tbt-hoch) |
| 2026-08-03 | mccain-digital | v3-Proposal: 11 Seiten mit generierter SEO-Ebene | TBT 260→120ms, A11y 95/96→100 | [](rendern-hauptthread.md#20-mutationobserver-mit-subtreetrue-neben-hochfrequenten-textänderungen-treibt-tbt-hoch), [](rendern-hauptthread.md#10-layout-properties-nie-im-selben-tick-direkt-nach-einer-dom-mutation-lesen), [](rendern-animationen.md#8-above-the-fold-inhalt-nicht-per-scroll-reveal-oder-fade-animieren) |
| 2026-07-20 | mccain-digital | Homepage v2-Refresh: CLS-Ursache gefunden | Lighthouse 4×100, CLS 0 | widerlegt.md#1-async-css-swap-per-preload-und-onload-ist-eine-sichere-optimierung, [](laden-kritischer-pfad.md#8-nicht-kritisches-css-nicht-blockierend-nachladen) |
| 2026-06-28 | mccain-digital | Hero-Zyklus ohne Layout-Shift | 0 CLS über alle Zykluswörter | [](laden-kritischer-pfad.md#20-widthheight-oder-aspect-ratio-an-jedem-bild-gegen-cls) |
| 2026-06-21 | mccain-digital | SEO Agentic Browsing von 2/3 auf 3/3 | Score 2/3→3/3 | lighthouse-psi.md |
| 2026-06-16 | whatever-recall-internal | CSS-Inlining und Font-Preload-Bereinigung | ~600ms gespart, mobile LCP 3,2s behoben | react-nextjs.md, [](laden-kritischer-pfad.md#10-font-preload-nur-für-die-tatsächlich-above-the-fold-gerenderte-schrift-setzen) |
| 2026-06-12 | mccain-digital | Feinschliff-Welle 3: Canvas-Face-Sampling | kein getImageData-Ruckler mehr | [](rendern-canvas-webgl.md#14-teure-synchrone-canvas-operationen-aus-dem-interaktions-hotpath-in-eine-idle-phase-verschieben) |
| ADR-28/29 | 360 (company-portal) | Von der CSR-SPA zu Next.js RSC und ISR | Mobile Lighthouse 56%→95% | laden-kritischer-pfad.md#28-externe-platzhalterbild-dienste-sind-ein-versteckter-hauptkostentreiber, widerlegt.md#7-externe-platzhalter-bilddienste-sind-performance-mäßig-vernachlässigbar |
| Wave 6 | 360 (company-portal) | Cold-Cache-Artefakt bei next start | LCP 9,4s (kalt) vs. 2,8s (warm) | messen.md |
| Cream-Migration Phase 2 | 360 (company-portal) | Lightning CSS verschluckt Keyframes | 9 von 27 @keyframes lautlos verworfen | [](laden-auslieferung.md#14-moderne-css-parser-können-bei-unausgeglichenen-klammern-ganze-blöcke-lautlos-verschlucken) |
| alpha.100 | mccain-cms | Motion-Editor-Slider-Lag | 40 PATCH/s → 1 PUT pro 350ms | react-nextjs.md |
| Publish-Cron | mccain-cms | Batch-Updates statt N Einzel-Schreibvorgänge | 101 DB-Calls → 3 | (Datenbank-Regel, außerhalb des html-performance-Skills) |
| Font-Preload P2 | mccain-cms | Preload nur für Above-the-Fold-Schrift | Font-Preload-Warning behoben | [](laden-kritischer-pfad.md#10-font-preload-nur-für-die-tatsächlich-above-the-fold-gerenderte-schrift-setzen) |
| alpha.124 | mccain-cms | Client-Bundle zieht Server-Only-Dependency mit | Build-Fehler, von tsc nicht erkannt | react-nextjs.md |
| — | mccain-cms/general | Hydration-Mismatch durch localStorage | 2 Hydration-Errors behoben | react-nextjs.md |
| — | meza-website | Custom Image Loader zerstört Edge-CDN | LCP 5,4s → 2,3s | react-nextjs.md |
| — | 360 / whatever-recall-internal | Headless-Chromium rendert WebGL schwarz | 2 Projekte unabhängig betroffen | messen.md |
| ADR-040 | mccain-cms | Browser-Runtime-Tests für DOM-Effekte | 13/13 grün im neuen Harness | [[browser-verify]], messen.md |
| alpha.164 / B7-B8 | mccain-cms | Zwei widerlegte Annahmen (GSAP, Reduced-Motion) | Subsystem entfernt, 33 Tests gestrichen | widerlegt.md#8-gsaps-scrolltriggerscroll-ist-der-korrekte-weg-zum-externen-scrubben, widerlegt.md#9-ein-automatisches-reduced-motion-system-schützt-ohne-kosten |
| — | whatever-recall-internal | 3D-Preview: 0×-Verifikation überzeugte trotzdem nicht | Feature nicht auf Homepage ausgeliefert | (Produktentscheidung, keine Performance-Regel) |

## 2026-09-16 abends · mccain-digital · v5: Platzhalterhöhen aus dem Build, Motion-Budget-Timer, WebGL-Gegenprobe

**Ausgangslage:** Drei Befunde der neuen Skill-Messskripte gegen `http://localhost:8897/v5/` (Chrome for Testing 148, ruhige Maschine): (1) `cv-audit.mjs`: alle 15 `data-cv`-Sektionen starten mit `contain-intrinsic-size: auto 900px`, die Seite ist nach dem ersten Scroll mobil 3.402 px länger (16.105 → 19.507 px) und am Desktop 3.095 px kürzer (15.384 → 12.289 px). (2) `observers.mjs --sweep`: 25 `setTimeout(…, 250)`-Aufrufe in 15 s, paarweise bei jedem Sektionswechsel. (3) `lcp-window.mjs --mobile --software-gl` (neues Flag): FCP 2.388 ms statt 196 ms mit GPU, Long Tasks 420 + 130 ms vor FCP, TBT 0.

**Befund und Fix:**
- **Platzhalterhöhen.** Neues Repo-Werkzeug `tools/v5heights.mjs` misst nach einem vollständigen Scroll-Durchlauf die Inhaltshöhe jeder Sektion bei 412/620/760/960/1280/1350 px (Mobil-Preset unter 760, weil `(pointer:coarse)` das Layout ändert) und schreibt `tools/v5-heights.json`; `v5build.mjs` stempelt jeder Sektion einen stabilen Schlüssel (`id` → `data-screen-label` → Position: `data-cv="fall"`, `"cv-2"` …) und schreibt `[data-cv="key"]{contain-intrinsic-size:auto Hpx}` je Breite als `@media (min-width)`-Gruppen hinter die pauschale Regel. Erster Versuch mit der Rahmenbox (`getBoundingClientRect().height`) ließ −749/−902 px Drift stehen: jede gepolsterte Sektion startete exakt um ihr vertikales Padding (72 px) zu groß, weil `contain-intrinsic-size` die Inhaltsbox beschreibt. Mit `clientHeight` minus Padding: **mobil 19.611 → 19.611 px (0), Desktop 12.290 → 12.289 px (−1)**. Zweiter Fallstrick: die letzte Sektion wurde im Sweep bei 620 px nicht gerendert; das Werkzeug scrollt ungesehene Blöcke jetzt einzeln ins Bild. `cv-audit.mjs` toleriert seither 24 px Drift, damit 1 px Rauschen kein Befund ist. Generische Fassung im Skill: `scripts/cv-heights.mjs`.
- **`setTimeout(…, 250)`.** Ursache war `tools/motion-budget.js`: der Debounce für den Rescan nach DOM-Mutationen wurde auch bei jedem `contentvisibilityautostatechange` neu scharf gestellt und lief dann in ein volles `document.getAnimations()`. Jetzt ein `requestAnimationFrame` pro Frame und `getAnimations({subtree:true})` nur auf dem gerade gerenderten Block. **Sweep 15 s Desktop: 25 → 0 Aufrufe während des Scrollens** (Rest beim Mount und an der 10-s-Marke, wo Notes und Pixel-Engine Elemente einfügen), Animations-Census bei 8 s vorher/nachher identisch (41 laufend, 37 endlose Loops offscreen innerhalb der 300-px-Marge), keine Konsolenfehler. Root-`motion-budget.js` über denselben esbuild-Schritt wie in `prerender.mjs` neu erzeugt (vorher geprüft, dass Quelle und Root-Datei übereinstimmen).
- **WebGL vor dem ersten Paint (Gegenprobe, nicht geändert).** `getContext('webgl')` in `home.js` nur um zwei `requestAnimationFrame`-Ticks zu schieben brachte unter Software-GL nichts: **FCP 2.188/2.280 ms** (vorher 2.388), dafür **eine Long Task von 2.271/2.306 ms ab 106/142 ms und TBT 2.221/2.256 ms** statt 0; mit GPU FCP 100 ms, TBT 0. Der GPU-Prozess (SwiftShader) präsentiert den ersten Frame erst nach der Kontext-Erzeugung, egal von wo sie ausgelöst wird, und die Hauptthread-Blockade wandert hinter FCP, wo sie TBT zählt. Konsequenz: entweder bewusst vor FCP lassen (kostet FCP/LCP, nicht TBT) oder `OffscreenCanvas` im Worker mit Start nach `first-contentful-paint`. Entscheidung liegt beim Owner (HANDOFF).

**Ergebnis (vorher → nachher, mobil, ruhige Maschine):** Seitenhöhen-Drift +3.402 → 0 px; `setTimeout(250)` im Sweep 25 → 0; LCP 196 → 116 ms (Rauschen), TBT 0 → 0, CLS 0 → 0; Desktop-Drift −3.095 → −1 px.

**Nebenbefunde (offen):** 255 `getBoundingClientRect`-Aufrufe in einer Sekunde am Ende des Sweeps aus `dgPaths` (`logic.gen.js:55-69`); `UpdateLayoutTree` 325 ms in 12 s mobil im Leerlauf.

**Regeln:** [rendern-hauptthread.md Regel 2](rendern-hauptthread.md#2-contain-intrinsic-size-genau-setzen-und-die-auto-form-nutzen), [rendern-hauptthread.md Regel 6](rendern-hauptthread.md#6-auf-contentvisibilityautostatechange-hören-checkvisibility-nur-als-start-fallback), [rendern-canvas-webgl.md Regel 1](rendern-canvas-webgl.md#1-getcontext-ist-synchron-der-erste-paint-darf-nicht-auf-canvas-oder-webgl-warten), [widerlegt.md 51](widerlegt.md#51-zwei-requestanimationframe-ticks-nach-dem-skript-start-garantieren-einen-gemalten-ersten-frame--webgl-danach-zu-starten-entlastet-fcp-und-score).

## 2026-09-16 · mccain-digital · v5-Optimierungsrunde und Chromium-Verifikation

**Ausgangslage:** Vor der Runde: Hauptthread-Kategorie "Other" (Desktop, 4×CPU-Drosselung, 12s-Fenster) 1.340ms, Hauptthread gesamt 3.560ms, IntersectionObserver 508ms über 132 Ziele/8 Observer, DOM ~2.540 Elemente, 28 Anfragen in 12s.

**Befund:**
- IO-Ziel (`observe()`) in einem übersprungenen `content-visibility`-Block erzwingt Style-Berechnung: 14 Logo-Masken luden trotzdem schon bei 125ms.
- Fixiertes, immer sichtbares Canvas wurde unnötig per IntersectionObserver beobachtet; `motion-budget.js` beobachtete 76 Einzelelemente statt Container.
- `content-visibility` erzeugt einen eigenen Stacking Context: die dunklen Bänder (KI-Konsole, Studio, FAQ, News, Kontakt, Footer) malten ihren `z-index:-2`-Grund über dem fixierten `z-index:-1`-Canvas.
- `ResizeObserver` auf `<body>` bei `html,body{height:100%}` unbrauchbar: `body` feuerte 1×, das Wurzelelement 16× (Höhe 16.523→12.477px).
- Forced Reflow 52ms durch `scrollY`-Lesung pro Frame in der WebGL-Animationsschleife.
- Rotierende Hero-Headline: Owner-PageSpeed 95→60, LCP 20,5s — Varianten bei 13,5/20/26,5s wurden zu neuen, größeren LCP-Kandidaten; Nachladen bei 7s/10s hielt zusätzlich das Messfenster offen.
- Adaptive fps (30↔60) lässt sich aus stabilen 30fps-Frames nicht auf 60fps-Headroom schließen (SwiftShader bei 2560×1440: nur ~13fps trotz 30fps-Ziel).
- `document.getAnimations()` sieht keine Animationen in übersprungenen `content-visibility`-Blöcken.
- React-Seite vs. v5 (statisches HTML): "Other" praktisch identisch (1.477ms vs. 1.486ms) — der gemeinsame WebGL-Pixelstrom-Loop ist die Ursache, nicht der Rendering-Ansatz.
- Ein von Google/PSI genannter Wert (30.533ms) ließ sich mit eigenen Traces nicht reproduzieren und wurde ohne Rohdaten nicht weiterverfolgt.
- `scroll-behavior:smooth` bricht programmatische Test-Scrolls (`scrollBy` im 40ms-Takt) ab.
- Zwei parallele Build-Pfade (`tools/v5build.mjs` vs. `tools/prerender.mjs`) teilen Performance-Fixes NICHT automatisch — die React-Seiten hatten nach dem v5-Umbau weiterhin die alten IO-/DOM-Probleme.

**Eingriff:** `motion-budget.js` beobachtet jetzt Container (`[data-cv]`/`[data-screen-label]`) statt Einzelelemente; `observe()` in übersprungenen Blöcken entfernt; IO auf dem fixierten Canvas entfernt; Arbeit an `contentvisibilityautostatechange` gekoppelt statt Timer-Polling (eine 800ms-Tipp-Demo-Abfrage ganz entfernt); `data-cv` sitzt jetzt auf dem Content-Wrapper nach dem Grund-Layer, neues Build-Gate in `verify_site.mjs` ("no background layer over the stream"); `ResizeObserver` auf `documentElement` statt `body`; Animationsloop liest `scrollY`/Resize nur noch aus Event-Listenern; nur noch eine feste Hero-Headline (Commit `ca40094`); Notizen (336 Elemente) als inertes `<template>`, Mega-Menü (321 Knoten) `content-visibility:hidden`, `pixel-engine.js` lädt erst bei erster Mausbewegung ODER 10s nach `load`, nur `(hover:hover) and (pointer:fine)`, nie auf Touch. Eigene Mess-Skripte gebaut (`mainthread.mjs`, `iocount.mjs`, `v5compare`, `verify_site.mjs`) gegen `prodserve.py :8897`.

**Ergebnis:** "Other" 1.340→641ms, Hauptthread gesamt 3.560→2.164ms, IntersectionObserver 508→97ms (132→25 Ziele), Anfragen in 12s 28→11, DOM ~2.540→2.206. TBT blieb bei 28–29ms nahezu unverändert (TBT reagiert nur auf Tasks >50ms, nicht auf Gesamtreduktion), TTI ~340→~302ms. Owner-PageSpeed mobil auf Commit `ca40094` (Lighthouse 13.4.1, Moto G Power, 16.9.2026 12:30 MESZ): Performance 100, A11y 100, Best Practices 100, SEO 69 (bewusst `noindex`), Agentic 3/3, FCP 0,9s, LCP 1,6s, TBT 10ms, CLS 0,002, SI 2,0s. Das Stacking-Gate schlug vor dem Fix bei 21/21 Seiten fehl (Commit `0d3f091`), danach alle grün.

Am selben Tag außerdem drei vertiefende Messungen für diesen Skill: **Lighthouse-Trace-Fenster OLD (`902108a`) vs. NEW** (Lighthouse 13.4.1, Chrome for Testing 148.0.7778.96): identische Werte (Score 100, LCP 1.652ms simuliert, LCP-Element beide Male `img.s23` = Header-Logo). Unter `--throttling-method=devtools` endet der Trace bei OLD (13.266ms) und NEW (13.279ms) jeweils VOR der ersten CSS-Rotation der Headline (`animation-delay:13,5s`) — Lighthouses eigenes Messfenster kann die Rotation strukturell gar nicht sehen. Kein einziger der 6 lokalen Traces zeigt ein Element der Klassen `v5-r`/`v5-w` als LCP-Kandidat. Dazu dokumentierter Nicht-Determinismus: derselbe OLD-mobile-simulate-Befehl scheiterte 3× mit `NO_FCP` (378.581ms, ~63.000ms, ohne Report), bevor er beim 4. Versuch erfolgreich lief — nach Beendigung zweier fremder Chrome/Playwright-Hintergrundprozesse (vorher 17 parallele Chrome-Prozesse). **Software-GL verzögert FCP** (`scratchpad/swgl_fcp.mjs`, Chrome for Testing 148, Mobil-Preset 412×915 dpr1,75): GPU (ANGLE Metal) FCP 188ms; SwiftShader FCP 2.216ms (`getContext` blockiert 311ms); SwiftShader+4×CPU FCP 2.392ms (`getContext` blockiert 230ms). Ohne GPU wartet der GESAMTE erste Paint der Seite auf den WebGL-Hintergrund — `getContext` ist synchron und blockiert 230–341ms. Erklärt retrospektiv, warum ein Lighthouse-Lauf unter Maschinenlast FCP bei 125.226ms maß bzw. `NO_FCP` lieferte. **Chromium-Quellcode-Verifikation** (HEAD `cabdc32a717663075a71718eb8750f6abdaedb64`, 16.09.2026) der Regel "IO-Ziel im cv-Block erzwingt Style/Layout": Verdikt teilweise. Der gemessene Effekt (508→97ms, 132→25 Ziele, 28→11 Anfragen) ist real, die scharfe Lesart ist für den eingeschwungenen Zustand widerlegt — `IntersectionGeometry::GetTargetLayoutObject` gibt für Ziele in gesperrten Subtrees früh `nullptr` zurück, ohne Style/Layout zu erzwingen. Realer Mechanismus: (a) `content-visibility:auto` nutzt zur Nähe-Bestimmung einen internen dokumentweiten IntersectionObserver mit 150%-Viewport-Margin — in dieser Bootstrap-Phase laufen Style/Layout/Bild-Fetches noch normal, proportional zur Zielzahl; (b) jedes Layout-Lesen (`getBoundingClientRect`, `offset*`, `scroll*`) auf einem Knoten im gesperrten Subtree erzwingt über `Document::UpdateStyleAndLayoutForNode`/`ScopedForcedUpdate` Style+Layout der gesperrten Vorfahren und lädt dabei deren CSS-Bilder.

**Lehre:** Ein einzelner gemeinsamer Kostenblock (hier: der WebGL-Canvas-Loop plus IO-Overhead) schlägt fast immer stärker zu Buche als der Rendering-Ansatz selbst — vor jeder Architekturentscheidung per Trace-Vergleich prüfen. Nicht die 5,25s-Ruhe-Logik macht jedes späte Nachladen/jede späte Rotation zum LCP-Risiko — PSI/CLI-Default laufen im `simulate`-Modus mit nur 1000ms Ruhefenster, 5.250ms gelten nur bei `throttlingMethod` `devtools`/`provided`; der eigentliche Mechanismus ist, dass Lighthouse neue LCP-Kandidaten bis zur ersten echten Eingabe (Klick, Tap, Taste, Scroll — Mausbewegung zählt nicht) oder bis Tracefenster-Ende erfasst, siehe [lighthouse-psi.md](lighthouse-psi.md#2-rechne-beim-psi-standard-mit-1000-ms-ruhefenster-nicht-5250-ms). Die heutige Chromium-Verifikation zeigt: eine plausible, mehrfach reproduzierte Messung kann trotzdem eine zu scharfe Ursachen-Erklärung tragen — Mechanismus und Messung getrennt dokumentieren. → [](rendern-hauptthread.md#4-content-visibility-erzeugt-einen-stacking-context-und-einen-containing-block), [](rendern-hauptthread.md#16-intersectionobserver-kosten-skalieren-mit-der-zielzahl-nicht-der-instanzzahl), [](rendern-canvas-webgl.md#1-getcontext-ist-synchron-der-erste-paint-darf-nicht-auf-canvas-oder-webgl-warten), lighthouse-psi.md#2-rechne-beim-psi-standard-mit-1000-ms-ruhefenster-nicht-5250-ms, lighthouse-psi.md#8-prüfe-den-eigenanteil-des-benannten-lcp-elements-bevor-du-es-änderst, widerlegt.md#3-object-pooling-verbessert-die-webgl-pixelstrom-performance, widerlegt.md#6-intersectionobserver-ziele-in-gesperrten-subtrees-erzwingen-pro-frame-layout

## 2026-09-13 · mccain-digital · Prerender und Hydration in vier Runden

**Ausgangslage:** React-Homepage der Design-Export-Pipeline (Claude-Design-Export, `createRoot`-Client-Rendering ohne Bauzeit-HTML) lag bei PageSpeed mobil 84, TBT 320ms.

**Befund:** `content-visibility` auf 15 Sektionen senkt LCP um 49% (2.980→1.516ms). Nach den Layout-Fixes bleibt TBT bei 726ms mit einer einzelnen 515ms-Aufgabe — reine React-Hydration am Stück, die `content-visibility` nicht anfasst. `contain-intrinsic-size`-Schätzung verzerrt die Seitenlänge kurzzeitig (15.916 statt 19.611px). CSS-Coverage meldet 91% "ungenutzt" bei nur 13,3KB, weil sie `style=""`-Attribute gar nicht erfasst (2.207 Inline-Attribute wären die Mehrheit). Tote-Bytes-Messung: 221,3KB JS ausgeliefert, 139,4KB (63%) nie ausgeführt — `pixel-engine.js` 92%, `react-dom` 60%, `support.js` 46%, größtenteils UNERREICHBAR (16 `PixelFX`-Eingänge, nur 2 genutzt), nicht wirklich tot. Zeitscheiben-Messung (250ms) deckte auf: im am stärksten ausgelasteten Fenster (1,0–1,9s, Hauptthread 100% busy) lag die Skript-Auswertung bei nur 1ms — die aggregierte Trace-Summe hatte "Skript 1.076ms" neben "Style & Layout 1.389ms" gezeigt und damit fälschlich Skript als Hauptverdächtigen nahegelegt; Ursache war tatsächlich Layout von 2.408 Knoten auf rund 19.000px Seitenhöhe für einen ~900px sichtbaren Viewport, nicht JavaScript. Ein ungated `setInterval` für die rotierende Hero-Headline (`heroIdx`) lief alle 6,5s auf allen 21 Seiten, obwohl nur die Startseiten-Vorlage den Wert überhaupt rendert — ein voller Reconciliation-Durchlauf eines ~2.400-Knoten-Baums für nichts auf zwanzig Seiten. Ein ungebuffertes `<script>`-Tag geriet mittig ins Dokument und blockierte den Parser 42KB lang; ein einfaches `defer` schied aus, weil React bereits beim Mount `initPixels()` aufruft, dessen erste Zeile `if (!PX) return` lautet — ein zeitverzögertes Script hätte dadurch alle Pixel-Effekte lautlos deaktiviert. 146 unendliche SVG-Animationen im 34px-Markenzeichen kosten 3,5s Hauptthread. Namens-Laufband ist LCP-Element, trägt aber nur 106 von 3.659ms zur Gesamtzeit bei. Zerlegung der Kosten: wie ausgeliefert 70, React geladen/geparst aber nie gebootet 91, plain HTML 95 — die Bibliothek kostet 1 Punkt, das falsche Hydrationsverfahren 21. Machbarkeitsprobe VOR Code: `renderToString`+`hydrateRoot` gegen alle 21 Artboards, 20/21 fehlerfrei (Ausreißer Brand Guide v2: 19 Fehler; derselbe Test gegen den alten DOM-Abzug vom 12.9.: 32 Fehler). Inline-Styles machen 57% des Dokuments aus (2.207 Attribute, 699 verschieden, einer 730× = 79KB) — React schreibt sie nach jedem Mount aus dem Komponenten-State zurück. Aggressive HTML/JS-Cache-Header verursachten sichtbares Doppel-Rendering nach Deploy (altes `#dc-prerender` gegen neues `support.js`). Ein `position:fixed`-Consent-Banner animierte `background-position` (8s linear infinite) über die gesamte Seitenlebensdauer — nicht kompositierbar, erzwingt jeden Frame neuen Paint, und `position:fixed` hält den Layer dauerhaft am Leben, auch off-screen. PSI-Desktop-Ausreißer (TBT 13.060ms, "Other" 30.533ms) erwies sich als CPU-Throttling-Artefakt der Testmaschine, nicht reproduzierbar (lokal 96, Owner-Aufnahme 68% Leerlauf) — passend dazu lag das setInterval-Ruhefenster mit 6,4s nur 1,4s unter Lighthouses 5s-TTI-Schwelle: lokal blieb es meist knapp darunter (210ms TBT gemessen), auf Googles langsamerer Testhardware kippte dieselbe knappe Marge in einen als blockierend gezählten TTI-Bereich. DOM-Knotenzahl erzeugt Kosten unabhängig von der gzip-Größe: `/marke/` 913 von 3.161 Knoten, aber nur 13.938B gzip bei 460KB roh.

**Eingriff:** Runde 1 Bauzeit-Rendering (`ssrRender`) + `hydrateRoot` (`patchRuntime`); Runde 2 Bewegungsbudget pausiert Off-screen-Animationen (Decke vorab gemessen: alle Animationen aus senkt LCP 3.650→2.759ms, TBT 793→530ms — die reale, enger gefasste Lösung soll einen möglichst großen Anteil dieser Decke einfahren, nicht alles); Runde 3 Markenzeichen als externe SVG-Datei; Runde 4 Preload/`fetchpriority` für Header-Marke, Consent-Banner-Animation gestoppt. Hero-Intervall wird nur noch dort armiert, wo `heroIdx` gerendert wird (Sichtbarkeits-Gate per ohnehin vorhandenem IntersectionObserver, Start bei 7s); das parser-blockierende `<script>` wanderte vor `support.js` in den `<head>` statt ein bloßes `defer` zu bekommen, dazu ein neuer Check, der auf 5 Seiten die Canvas-Anzahl zählt, um ein stilles Ausbleiben der Pixel-Effekte zu fangen. `mark()` auf `static` gesetzt. `vercel.json`: `.html` UND `.js` auf `max-age=0, must-revalidate`, nur `/vendor/` und Bilder bleiben `immutable` mit Namens-Version. `PageSpeed`-API-Abfragen brauchen einen eigenen Key (429 bei geteiltem Kontingent); Lighthouse-CLI gegen Port 8897 scheiterte reproduzierbar (`FAILED_DOCUMENT_REQUEST`), `tools/lighthouse_audit.py` als Alternative.

**Ergebnis:** PageSpeed mobil 84→91 über die vier Runden (TBT 320→80ms, CLS 0, 25→5 laufende Animationen, DOM 3.168→2.438 Knoten, index.html 905.070→676.109B roh / 133.588→119.004B gzip, Style-Attribute 2.207→1.464, Layout-Aufrufe 358→65). Nach dem Intervall-Fix allein: längste Ruhelücke 6.432→26.171ms, Long Tasks nach der 5s-Marke 4→0.

**Disproven in dieser Runde:** `ResizeObserver` auf `<body>` war nicht der Verdächtige (4× in 22s, unschuldig); 60 `getBoundingClientRect`/s stammten von der Pixel-Engine (`movePoints`), nicht von den Notizen; die naive V8-Coverage-Regel ("count>0 = benutzt") meldet 0% tot für JEDE Datei, weil Coverage-Bereiche verschachtelt sind; ein Attribut-Reihenfolge-Test (`style` vor/nach `data-screen-label`) hätte 4 von 5 Overlays fälschlich stumm eingesperrt; "URL wird 6× aufgerufen" war Lighthouses Spalte für das zugeordnete Skript, kein Request-Zähler; `hydrateRoot` gegen den alten DOM-Abzug scheiterte 2×; `fonts.css` inline ziehen brachte keine Wirkung; ein vermuteter "gezählter Patch" für `window`-Handles war nie nötig; der Vorlagen-Umweg kostete nur 15,3ms; 1.000 DOM-Änderungen/s kosteten nur 63ms in 5,7s; die Marken-Bytes (460KB roh) sind kein Transferproblem (13.938B gzip); der PSI-Desktop-TBT-Ausreißer war kein realer Bug.

**Lehre:** Ein DOM-Snapshot nach Laufzeit-Interaktion ist kein SSR — Hydration braucht einen zur Bauzeit identisch erzeugten ersten Render, sonst fällt React auf volles Client-Rendering zurück und der ganze SSR-Vorteil ist weg. Content-visibility optimiert Layout, nicht Skriptkosten — eine große Hydrationsaufgabe bleibt bestehen. Absolute Zahlen aus einer Messreihe sind nur so gut wie ihre Infrastruktur (Cache-Header, PSI-Testmaschine); bei einem Ausreißer zuerst den Messweg prüfen — hier bestätigte sich das erst im Nachhinein, als derselbe Ausreißer über die TTI-Marge eines ungated Intervalls erklärbar wurde. → react-nextjs.md, [](rendern-hauptthread.md#1-content-visibility-auto-auf-lange-off-screen-sektionen-anwenden), [](laden-auslieferung.md#2-html-und-die-zugehörige-runtime-js-datei-nie-gemeinsam-immutable-cachen), messen.md, widerlegt.md#16-hydrateroot-läuft-erfolgreich-gegen-einen-nachträglich-gesetzten-dom-snapshot, widerlegt.md#2-fontscss-inline-ziehen-verbessert-die-performance, widerlegt.md#21-psi-desktop-tbt-13060-ms-zeigt-einen-realen-performance-bug

## 2026-09-11/12 · mccain-digital · "Mobil 41" war eine Fehlmessung, Logo-Animationen gefunden

**Ausgangslage:** Ein Extremwert ("mobil 41") stand im Raum; der WebGL-Pixelstrom galt als Hauptverdächtiger für hohe TBT/Hauptthread-Zeit.

**Befund:** `prodserve.py` komprimierte nur Pfade, die auf `.html` enden — jede Route dieses Projekts endet auf `/`, also lief jede bisherige Messung gegen eine unkomprimierte Seite. Score `/` vs. `/index.html`: 45 vs. 63, FCP 5.171ms vs. 1.272ms, 907KB vs. 134KB — jede absolute Zahl des Projekts vor dem 12.9. abends war zu pessimistisch. Separat davon liefen zwei Tage Performance-Arbeit gegen `mccain-digital.vercel.app` statt die echte Live-Domain — `mccain-digital.com` zeigte nie auf Vercel und lief weiterhin über nginx auf SiteGround, die als "live" protokollierten Zahlen maßen also eine URL, die kein echter Besucher aufruft. Ein Vier-Varianten-A/B-Test (nur ein Stylesheet unterschied sich) zeigte: unverändert 63/TBT 1.026ms/8.497ms Hauptthread; Datenstrom aus 64/1.010ms/8.485ms (praktisch keine Änderung); Logo-Animation aus 68/778ms/4.971ms — 146 der 170 Endlos-Animationen liefen in einem einzigen 34×34px-`<svg>` mit 146 `<rect>`-Elementen, NICHT im WebGL-Pixelstrom. Plain HTML ohne jedes `<script>` erreichte Score 95, aber TBT 212ms trotz 0ms Skriptauswertung — allein durch Style/Layout von 2.812 Knoten mit 2.207 Inline-Style-Attributen (56,6% des Dokuments, ein String 730× = 79KB). Der Content wurde dreifach ausgeliefert: `#dc-prerender` (563.511B/47.003B gz) + `<template>` (147.219B/23.670B gz) + `<script type=text/x-dc>` (172.113B/56.768B gz). `hydrateRoot` gegen den per Headless-Chrome abgezogenen DOM schlug 2× fehl: 1.193 von ~3.000 Knotenpositionen weichen ab, React-Fehler #418/#425/#423, Rückfall auf Client-Rendering, 32 Konsolenfehler. Ein Bild-Box-Verhältnis-Mismatch ließ den Browser 43% der geladenen Zeilen verwerfen (Box-Verhältnis 2,625 vs. Bild 1,5). Marketing-Text behauptete "4×100/TBT 0ms" auf 21 Seiten, gemessen waren 65–73 mobil / TBT 639–1.085ms.

**Eingriff:** `prodserve.py` komprimiert jetzt auch Verzeichnis-Routen; neue Regel, vor jeder Messreihe per `curl -sI -H "Accept-Encoding: gzip"` gegenzuprüfen. `mark()` auf `static` gesetzt, ein 1,6s-Re-Render-Timer entfernt. Icon-Zielgröße auf 128px statt 48px gesetzt, weil dieselbe Grafik anderswo in einer 58px-Box steht. Marketing-Behauptung als offener Punkt an den Owner zurückgegeben (in DE abmahnfähig), nicht selbst redaktionell verändert.

**Ergebnis:** Nach dem Logo-/Timer-Fix: 24 statt 270 laufende Animationen; sechs Seiten im Vorher/Nachher-Vergleich: Start 63→69, KI 70, Rechtliches 70, News 73, Preise 65, Marke 65 (A11y 100 außer `/marke/` 93, Best Practices 100, CLS 0).

**Disproven:** Der WebGL-Pixelstrom war NICHT die Hauptursache der TBT (s. A/B-Test oben); der DOM-Snapshot-Hydrationsansatz funktioniert nicht; `fonts.css` inline ohne Wirkung; das Namens-Laufband ist LCP-Element, aber nicht LCP-Ursache; "mobil 41" spiegelte nicht die reale Live-Performance wider.

**Lehre:** Vor jeder Ursachenanalyse die Messgrundlage selbst verifizieren (Kompression, Cache-Header, tatsächlich angesprochene Domain) — ein systematischer Messfehler kann jede folgende Optimierungsentscheidung in die falsche Richtung lenken. Viele kleine Endlos-Animationen in einem winzigen Element können mehr kosten als ein großflächiger Canvas-Effekt; den tatsächlichen Verursacher immer per isoliertem A/B messen, nicht der naheliegenden Komponente die Schuld geben. → messen.md, [](rendern-animationen.md#15-den-wahren-verursacher-isoliert-messen-statt-der-naheliegenden-komponente-die-schuld-zu-geben), [](rendern-hauptthread.md#27-tausende-individuelle-inline-styles-kosten-tbt-auch-ganz-ohne-javascript), widerlegt.md#16-hydrateroot-läuft-erfolgreich-gegen-einen-nachträglich-gesetzten-dom-snapshot, widerlegt.md#11-lokal-gemessene-sehr-niedrige-scores-spiegeln-die-live-performance, widerlegt.md#14-die-eigene-4100-lighthouse-aussage-stimmt-für-den-aktuellen-build, widerlegt.md#20-der-webgl-pixelstrom-ist-hauptursache-der-hohen-tbt

## 2026-09-02 bis 2026-09-10 · mccain-digital · Der Award-Audit: Render-Pipeline und Kategorien A–D

**Ausgangslage:** Die Konsole zeigte 70 (Startseite) bzw. 37 (Brand Guide) SVG-Fehler, während das bestehende Fehler-Tor (`pageerror`) "0 page errors" meldete — Auftakt eines mehrtägigen Audits in Kategorien A (Performance) bis D, parallel zu Commits vom 2.9. bis 10.9.

**Befund — Render-Pipeline:** Ein live geparster `<x-dc>`-Teilbaum mit `{{ }}`-Platzhaltern erzeugte eine vollständig gelayoutete, unsichtbare Zweitkopie der Seite (pixel-engine.js 2×, Favicon 3×, ~4.200 statt ~2.200 Layout-Elemente). Eine choreografierte Hero-Reveal-Animation ohne Zeit-Notausgang hielt bei kaltem Laden sichtbaren Content bis ~2.400ms zurück (FCP bereits bei ~1.130ms). Homepage-Score 68 (FCP 349ms, LCP 1.398ms, TBT 663ms) erwies sich als Hydrationskosten (1.493ms Skriptauswertung für ~2.140 Elemente + 364ms Layout), kein Ausliefer-Bug — vier statische Unterseiten ohne Hydration erreichten 100/100/100. React-Preload verschlechterte FCP messbar (349→485ms); `support.js` deferren + React vorladen bewegte den Score in 3 Läufen nicht (68/69/69). Font-Dateinamen-Kollision (Groß-/Kleinschreibung auf NTFS) führte zu 404 auf Vercel — die vendorten Dateien tragen seitdem sprechende Namen (Familie/Schnitt/Subset) statt des CDN-Hashes, ein Build-Abbruch verhindert Kollisionen künftig. Separat sparte das Entfernen zweier präventiv geladener, aber unicode-range-/style-gegateter Font-Subsets (`latin-ext`, italic) 40KB auf dem kritischen Pfad. Ein Snapshot NACH Mount-Ersetzung (`dc.replaceWith`) enthält keinen Mount-Punkt mehr (leere, fehlerfreie Hülle, jeder Knopf tot); ein kompletter `<head>`-Kopie-Ansatz dupliziert die Runtime und bricht React-Hooks.

**Befund — Methodik-Fallen (mehrfach im selben Zeitraum):** Lighthouse gegen die Live-URL scheiterte reproduzierbar (`FAILED_DOCUMENT_REQUEST`), obwohl curl/Playwright dieselbe URL problemlos laden — Workaround über lokalen Server mit identischen Headern (Live nutzt sogar Brotli 66KB statt gzip 102KB lokal). Ein Erreichbarkeits-Check bewies keine Funktion: ein Kontaktformular war komplett tot trotz grüner 200er/Bilder/Meta-Tags — der Owner fand es, nicht die Automatisierung. `pageerror` meldete 0 Fehler, während 70 `console`-Meldungen liefen. Ein Wächter blendete sich an seiner eigenen Dokumentations-Kommentarzeile (String-Suche traf den Kommentar statt des echten Codes). `agent-browser set viewport` hing lautlos an zwei Tagen, auch nach Prozess-Bereinigung → Umstellung auf `playwright-core`, Mess-Logik (`probe.js`) unverändert — derselbe Fund taucht unabhängig auch am 1.9. wieder auf. `getComputedStyle` während laufender Animation lieferte Zwischenwerte bzw. `calc()`-Strings, die `parseFloat` still zu 0 machte. `will-change:transform` auf einem Nachkommen brach `background-clip:text` des Vorfahren (leeres Wort trotz korrektem Verlauf). Vier `data-pixel`-Canvas-Raster auf einer Seite waren "der teuerste Boot im Repo" und ließen den Audit unter Last 3 von 12 Läufen mit "NOTHING MEASURED" scheitern.

**Befund — Audit-Kategorien A–D:** Netzwerk-/Caching-Befunde nur gegen Produktion messen — `prodserve --dev` (no-store) täuschte "Font 2× geladen, 94KB" vor, gegen Produktion war der zweite Font-Fetch 0 Bytes (vercel.json cached woff2 immutable). Ein emulierter iPhone-Viewport meldet `pointer:fine` statt `pointer:coarse` bei 390px. Canvas-Headline-Rasterung war der teuerste Boot-Pfad und machte `contact.html` im Audit flaky (0 Accent-Knoten) — nach Umstellung auf echten Text stabil bei 18 Knoten. Ein Kontrast-Tool las `cs.color` (bei `background-clip:text` immer transparent) und war blind für Gradient-Text. LCP-Choreografie-Varianten wurden über 3 echte Messläufe verglichen statt geschätzt (844ms → 640ms → 556ms, alle im dokumentierten 800–1.600ms-Band, keine Änderung vorgenommen). View Transitions unter `prefers-reduced-motion` brauchen `navigation:none`, nicht `animation:none`. Eine reduced-motion-Override-Regel stand vor statt nach den zu überschreibenden Regeln — 7 Animationen liefen trotzdem endlos weiter. `PixelFX.button()` prüfte nur `backgroundColor` und übersah Gradient-Hintergründe als "kein Hintergrund" (CTA-Button beim Hover unsichtbar). Undefinierte CSS-Custom-Properties in einem `transition`-Shorthand invalidierten die GANZE Deklaration (5 Transitions liefen bei 0s). Re-Sampling-Kosten beim Hover wurden gemessen statt geschätzt: 0,7ms Median/1,3ms p90 gegen ein 16,7ms-Budget.

**Eingriff:** Platzhalter-Markup in `<template>` gekapselt, dreizeiliger Shim; Choreografie prüft jetzt FCP UND `performance.now()>600`; React-Preload verworfen; Minifizierung benennt nur Bezeichner um (nicht Eigenschaftsnamen), weil `support.js` zur Laufzeit namentlich zugreift; Font-Vendoring bricht bei Namenskollision hart ab; Audit-Selektoren gegen echtes Live-DOM statt gegen die Absicht verifiziert (`.ph canvas` hatte 0 Treffer im ganzen Repo und lief als PASS durch — Accent-Knoten pro Service-Seite danach 27–32→34–40).

**Ergebnis:** SVG-Konsolenfehler 70/37→0/0, pixel-engine.js 2×→1×, Favicon 3×→1×, Layout-Elemente ~4.200→~2.200. `support.js` 67,5→36,4KB roh, `pixel-engine.js` 137,3→42,1KB roh (zusammen 26,8KB weniger über die Leitung). Nach Umstellung auf `playwright-core`: `accent_audit` über 6 Seiten × 2 Themes 0 Fehler außerhalb der Wordmark.

**Disproven:** Die Startseite ist NICHT der letzte Aufrufer von `PixelFX.headline`/`voidReveal` — `contact.html`/`404.html` trugen noch fünf `data-pixel`-Vorkommen, `voidReveal` hatte längst gar keinen Aufrufer mehr.

**Lehre:** Ein Fehlerkanal-Tor (`pageerror`) und ein Erreichbarkeits-Check sind beide blind für die häufigsten realen Fehlerklassen (Konsolenfehler, tote Interaktion) — automatisierte Gates brauchen mehrere Kanäle UND eine Mindestmenge an Messpunkten, sonst maskiert ein kaputtes Ziel als bestanden. `will-change` und `background-clip:text` kollidieren strukturell und tauchen in diesem Projekt in mindestens zwei verschiedenen Komponenten wieder auf. → [](rendern-hauptthread.md#28-platzhalter-markup-gehört-in-ein-inertes-template-nie-in-einen-lebendigen-custom-element-teilbaum), messen.md, [](rendern-animationen.md#2-will-changetransform-gezielt-einsetzen-nicht-pauschal), widerlegt.md#12-die-schriftart-wird-in-produktion-zweimal-heruntergeladen, widerlegt.md#18-supportjs-deferren-und-react-vorladen-verbessert-den-score, widerlegt.md#19-react-vorzuladen-kann-dem-fcp-nur-helfen-nie-schaden, [](laden-kritischer-pfad.md#16-bei-generierten-font-dateinamen-auf-groß-kleinschreibungs-kollisionen-prüfen), [](laden-auslieferung.md#10-minifizierung-bei-jedem-build-aus-derselben-quelle-ableiten-property-mangling-gezielt-abschalten)

## 2026-09-01 · mccain-digital · Der Refresh: index.html wird die Startseite

**Ausgangslage:** `index.html` wird zur alleinigen, gemergten Startseite; parallel Referenz-Recherche bei MengTo/Skills für einen Dither-Canvas-Hintergrund.

**Befund:** Der `entry`-Bereich einer `view()`-Timeline war für eine flache Überschrift zu kurz (Wortversätze sprangen 62→38/44/50/56→0/5/11/17→0 statt gleichmäßig). 43 gleichzeitige Wort-Scroll-Timelines kosteten Frames (p99 17,1→32,7ms, 9% der Frames >20ms). Ein Canvas-Partikelfeld halbiert (10px→5px-Raster, 12.920→51.510 Partikel) ist fast kostenlos, aber der Erscheinungs-Schwarm skaliert mit der Gesamtzahl. Das MengTo/Skills-Dither-Rezept, naiv übernommen, ruft `fillRect` PRO ZELLE PRO FRAME auf (~26.000 Aufrufe) UND berechnet vier Rausch-Oktaven (16 Sinus) PRO ZELLE JEDEN FRAME neu — 68 Long Tasks, 4s blockierter Hauptthread; nicht das Zeichnen war teuer, sondern die Neuberechnung. `getBoundingClientRect()` liefert bei rotierten Portraits die achsenparallele Hülle (428×513 statt echter 381×477 bei −6,5°, 12%/8% Abweichung); ein eigener Test maß mit derselben fehlerhaften Methode und blieb dabei blind für genau diesen Bug. Ein Theme-Wechsel NACH dem Parsen ließ eine Canvas-Textrasterisierung die Farbe des alten Themes einfangen (Kontrast 1,03:1, fast unsichtbar). Ein CSS-Merge per Substring-Test löschte Regeln fälschlich (`.stage` steckt in `.hero--stage`) — der Header kam 780px statt als volle `100svh`-Stage heraus. Ein doppelt angehängtes Canvas lief unsichtbar für immer weiter. `overflow:clip` auf einem Effekt-Container brach `position:sticky` im Inneren — derselbe Fallstrick trat in drei aufeinanderfolgenden Commits auf. `IntersectionObserver`-Ratio erwies sich als ungeeignet für binäre Docking-Logik (Deep-Links/Reload/Scroll-Sprünge brechen es, weil "oberhalb" und "unterhalb" beide Ratio 0 liefern). Eine Reihe von Methodik-Lehren wurde als "Lehren, die ich nicht nochmal lernen will" festgehalten: ein settled-Zustand (`data-px-settled`) statt fester Wartezeit; ein Guard, der nichts findet, kann ausgefallen statt bestanden sein; zu kurzes Warten fälschte 4× in zwei Sitzungen die Messung; die Periode eines diagonalen Verlaufs hängt von Breite UND Höhe ab (`|W·sinT|+|H·cosT|`), nicht nur von der Breite (23%/31% sichtbarer Sprung vor dem Fix); ein Guard gegen einen behobenen Fehler muss MIT dem Fehler entfernt werden — die Farbwelle lief 2× unbemerkt gar nicht, obwohl "60fps" gemessen wurde; ein Wächter, der auf einen umbenannten Selektor zeigt, meldet gar nichts (`.dither-l`/`.rail .nav-where`/`.shot` gleich 3× am selben Tag) — dahinter verbarg sich ein echter Kontrastfehler (`--muted` 4,46:1 statt gefordert 3:1).

**Eingriff:** `view()`-Timeline auf `cover()` umgestellt; `will-change:transform` auf die Wort-Elemente (gerechtfertigt, weil sie wiederholt in den Scrollbereich zurückkehren); Erscheinungs-Schwarm für den Hero deaktiviert; Rauschfeld als Ringpuffer aus vorausberechneten Spalten (1 neue Spalte pro Takt); `build()` nutzt `getComputedStyle().width/height` statt `getBoundingClientRect()`; Theme jetzt inline im `<head>` VOR dem Stylesheet; CSS-Merge vergleicht jetzt den vollständigen Selektor-Kopf; Engine verweigert ein zweites Canvas pro Host; sticky Leiste liegt außerhalb des Effekt-Containers; Docking-Zustand aus einer per `ResizeObserver` gemessenen Kante abgeleitet, ein Spacer verhindert den Layout-Sprung beim Herauslösen aus dem Fluss; gerasterte Canvas-Headlines gegen echten Text mit CSS-Masken-Reveal getauscht.

**Ergebnis:** Wortversätze gleichmäßig statt sprunghaft; 43 Wort-Timelines am Ende bei 0 Long Tasks, p90 16,9ms, p99 17,1ms, 0% Frames >20ms. Canvas-Aufbau 5 Long Tasks/693ms→3/466ms. Dither-Feld nach Umbau: 0 Long Tasks, 0% Frames >20ms (vorher 68 Long Tasks, 4s blockiert, 27,5% >20ms). Pointer-Mapping-Fehler auf 1,0–1,1px reduziert. Kontrast nach Theme-Fix 3,42–4,21:1 (vorher 1,03:1). CSS-Fix an 11 Seiten fehlerfrei verifiziert. Docking kostete nichts Messbares (18,0ms Median mit/ohne). Pixel-gerasterte Headlines: `[data-pixel]`-Vorkommen auf 0, vorher medianer Frame ~35ms mit mehreren Long Tasks, nachher beim Scroll 0 Long Tasks, p90 16,9ms.

**Disproven:** Die 26.000 `fillRect`-Aufrufe pro Frame waren NICHT der Flaschenhals (das Neuberechnen des Rauschens war es); ein Loop-Periodizitätstest per `animation-delay` auf einer pausierten Animation lieferte immer identische, aber falsche Screenshots; eine Neuerfindung der "schwarzes Loch"-Hover-Mechanik war unnötig — die Engine hatte sie bereits; die "strukturelle Grau-Mittelung"-Theorie für blasse Pixel-Headlines im Hellmodus war falsch (echte Ursache: Theme-Timing).

**Lehre:** Bei Canvas-Jank nie von der naheliegenden Zeichenoperation auf die Ursache schließen — Profiling verifiziert, ob Zeichnen oder Berechnung die Zeit kostet. `getBoundingClientRect()` ist für transformierte Elemente strukturell falsch, sowohl im Produktionscode als auch in Tests dagegen. → [](rendern-canvas-webgl.md#12-vor-der-naheliegenden-zeichenoperation-die-tatsächliche-ursache-profilen), [](rendern-canvas-webgl.md#18-getboundingclientrect-liefert-bei-transformierten-elementen-die-hülle-nicht-die-echte-box), [](rendern-animationen.md#2-will-changetransform-gezielt-einsetzen-nicht-pauschal), messen.md, widerlegt.md#27-ein-externes-referenz-rezept-lässt-sich-direkt-übernehmen

## 2026-08-31 · mccain-digital · Bild-Pixel-Engine: Geometrie- und Compositing-Bugs

**Ausgangslage:** Owner-Feedback zur Bild-Pixel-Engine (Portraits/Work-Karten): "die pixel dichte ist zu hoch, keine pixel mehr zu sehen und die performance ist tot".

**Befund/Eingriff (Patch-Serie):** Ein kompletter Redraw von 14.157 Partikeln kostete 5,15ms (DPR1) / 6,75ms (DPR2), zwei Drittel davon reines `fillStyle`-String-Parsing → Ruhezustand einmal in ein Offscreen-Canvas, pro Frame 1 `drawImage` + nur "dirty"-Zellen (~1.370 von 14.157) neu gemalt → 0,54ms/0,70ms (~10× schneller). `naturalWidth`/`naturalHeight` sind dichte-korrigierte CSS-Pixel, `drawImage`-Source-Rechtecke erwarten rohe Bitmap-Pixel: `code-screen-640.webp` ist 640×440 auf der Platte, meldet aber 559×384 — der Ausschnitt griff nur die linken oberen 87% (bei einer DPR-2,14-Variante nur ein Viertel) → 5-Argument-`drawImage`, nur das Seitenverhältnis aus `natural*` lesen. Zwei deckende Ebenen per CSS-`opacity` überblendet ergeben `a+b(1-a)` ≈75% Gesamtdeckkraft in der Mitte — sichtbarer dunkler Puls auf dunklen Karten → scharfes Foto als opaker Boden, Mosaik mit variablem Alpha darüber (Fade-Dauer 460→640ms senkte die wahrgenommene Härte von 15,3 auf 11,9). Ein Effekt-Overlay brauchte eine eigene Zeichen-Ebene, sonst sichtbare Kante an der gestörten Box. Zellweise Mittelung statt Punktabtastung (Bild direkt in ein `COLS×ROWS`-Offscreen-Canvas gezeichnet) senkte den Rückleseaufwand von 224.000 auf 14.000 Pixel (~16× weniger) auf einer Work-Karte. `getBoundingClientRect()` lieferte bei rotierten Portraits erneut die Hülle statt der echten Box (428×513 vs. 381×477 bei −6,5°). Pixel-Rasterzellen mussten auf ganze Gerätepixel geklemmt werden (`GRID_DEV=round(GAP·DPR)`, Block mindestens 1 Gerätepixel kleiner) — sonst kann der sichtbare Zwischenraum bei bestimmten DPR-/Eingabe-Kombinationen rechnerisch verschwinden (Defaults 1.1/1.0→3.0/2.0). Headline-Pixel wirkten blass (mittlerer Alpha 140/255): fraktionale Device-Pixel-Positionen wurden antialiast → auf ganze Device-Pixel snappen → Alpha 255/255, Farbfläche 21%→25,2%. Glyphen-Sampling per Einzelpunkt-pro-Zelle verwarf Kantenpixel (Pixel-Headlines wirkten dünner/heller/kleiner) → Flächen-Downscale-Sampling, Schwellenwert 120→70.

**Weitere Funde desselben Tages:** Cache-Kompromiss (revalidierend statt `immutable` für `v3.css`/`common.js`) kostete NACH dem Vercel-Umzug gemessen keine Performance (Lighthouse Desktop 99, LCP 0,7s, TBT 0ms, CLS 0,002) — die geplante `?v=`-Versionierung wurde nie gebaut. Zwei Server für zwei Zwecke: `prodserve.py` mit Produktions-Headern (`immutable`) ist als Dev-Server eine Falle (geänderte Datei ein Jahr lang nicht neu geholt) — je eine Stunde Fehlersuche gekostet, bis `:8898 --dev` (no-store) von `:8897` (nur zum Messen) getrennt wurde. Mobile Lighthouse-Werte streuen stark unter 4×CPU-Drosselung (3 Läufe derselben Seite: 91/97/91). `will-change:transform` auf einem Nachkommen bricht erneut `background-clip:text`. Ein `MutationObserver` auf `<body>` mit `subtree:true` neben einer Schreibmaschinen-Animation (alle ~9ms `innerHTML`) trieb TBT auf 260ms → nach Umstellung auf einen einmaligen `DOMContentLoaded`-Durchlauf 120ms, Score 94→98. Forced Reflows durch Layout-Lesen direkt nach DOM-Mutation: Marquee 125ms, AI-Konsole 79ms, Pac-Man 25ms → alle drei ins nächste `requestAnimationFrame` verschoben. Ein bekannter Forced-Reflow-Hinweis am Work-Slider wurde bewusst NICHT behoben, weil die Alternative einen sichtbaren Sprung verursacht hätte (Seite bleibt trotzdem bei 100/TBT 0ms). CSS-`transform` (Hover-Scale) auf `<img>` und ein Canvas-Pixelfeld auf zweiter Ebene liefen auseinander (23px Versatz je Wechsel) → CSS-Zoom entfernt, `PixelFX.button` unterdrückt Zoom aktiv.

**Ergebnis:** Siehe Zahlen oben je Patch; zusammengenommen der aufwendigste Einzeltag der Bild-Pixel-Engine mit fünf bis sechs unabhängig gemessenen Fixes.

**Disproven:** Pixel-Dichte erhöhen heißt NICHT, Blöcke größer zu machen (Block≥Grid schließt die Lücken; der Versuch wurde zurückgerollt); blasse Farben waren NICHT Symptom zu geringer Grid-Dichte, sondern Antialiasing; Pixel-Headlines lasen sich NICHT kürzer wegen eines Schriftgrößen-/Geometriefehlers (Ink-Box war exakt gleich, 336 vs. 337px) — Ursache war Einzelpunkt-Sampling; "wenn alle Zellen Akzent sind, ist die Regel kaputt" galt nicht mehr, nachdem eine Hero-Zeile legitim komplett akzentfarben wurde.

**Lehre:** Dieselben drei Bugklassen (naturalWidth/Height, getBoundingClientRect bei Transform, will-change bricht background-clip:text) tauchen in dieser Canvas-Engine wiederholt in neuen Komponenten wieder auf — ein wiederverwendbarer Lint-/Test-Check würde sich lohnen. Ein Sicherheits-Guard muss überprüft werden, sobald sich seine Auslösebedingung ändert. → [](rendern-canvas-webgl.md#7-ruhezustand-einmal-in-ein-offscreen-canvas-cachen-pro-frame-nur-die-dirty-region-neu-zeichnen), [](rendern-canvas-webgl.md#17-naturalwidth-und-naturalheight-sind-dichte-korrigierte-css-pixel-keine-bitmap-pixel), [](rendern-canvas-webgl.md#18-getboundingclientrect-liefert-bei-transformierten-elementen-die-hülle-nicht-die-echte-box), [](rendern-hauptthread.md#20-mutationobserver-mit-subtreetrue-neben-hochfrequenten-textänderungen-treibt-tbt-hoch), [](rendern-hauptthread.md#10-layout-properties-nie-im-selben-tick-direkt-nach-einer-dom-mutation-lesen), [](laden-auslieferung.md#1-immutable-nur-für-assets-mit-content-hash-im-dateinamen), messen.md, widerlegt.md#37-pixel-dichte-erhöhen-heißt-die-blöcke-größer-zu-machen, widerlegt.md#6-nicht-immutable-cache-header-senken-den-performance-score

## 2026-08-03 · mccain-digital · v3-Proposal: 11 Seiten mit generierter SEO-Ebene

**Ausgangslage:** Komplette 11-Seiten-Site mit generierter SEO-Ebene, Ziel "100 across the board".

**Befund:** Ein `MutationObserver` auf `<body>` feuerte eine dokumentweite Query bei jedem einzelnen getippten Zeichen des Typewriter-Effekts. Forced Reflows in drei Widgets: Marquee 125ms, AI-Konsole 79ms, Pac-Man 25ms. Scroll-Reveal-Animationen liefen auch auf Above-the-Fold-Inhalt der Contact-/Service-Seiten (A11y 95/96).

**Eingriff:** Observer-Scope verengt statt dokumentweiter Query pro Zeichen; Forced-Reflow-Ursachen in allen drei Widgets behoben; Reveal-Animation für Above-the-Fold-Inhalt entfernt.

**Ergebnis:** TBT 260→120ms, Mobile-Score 94→98; A11y 95/96→100 auf Contact- und Service-Seiten.

**Lehre:** Ein `MutationObserver` auf einer breiten Wurzel neben einer hochfrequenten Text-Animation multipliziert Hauptthread-Kosten — eng scopen. Above-the-Fold-Inhalt nie per Scroll-Reveal animieren. → [](rendern-hauptthread.md#20-mutationobserver-mit-subtreetrue-neben-hochfrequenten-textänderungen-treibt-tbt-hoch), [](rendern-hauptthread.md#10-layout-properties-nie-im-selben-tick-direkt-nach-einer-dom-mutation-lesen), [](rendern-animationen.md#8-above-the-fold-inhalt-nicht-per-scroll-reveal-oder-fade-animieren)

## 2026-07-20 · mccain-digital · Homepage v2-Refresh: CLS-Ursache gefunden

**Ausgangslage:** Ziel Lighthouse 4×100; eine frühere Prüfung hatte den asynchronen CSS-Ladeweg per "pixel-identical render"-Vergleich für sicher befunden.

**Befund:** `styles.css` wurde asynchron per `<link rel="preload">`→`onload`-Swap nachgeladen; da das Stylesheet layoutrelevant ist (Nav-Layout), löste der Aktivierungsmoment einen vollen FOUC-Reflow aus, der als Layout-Shift zählte. Die frühere Prüfung hatte nur das finale Rendering verglichen, nicht den Zwischenzustand während des Ladens.

**Eingriff:** `styles.css` auf allen Seiten wieder render-blocking eingebunden, Nav-Layout zusätzlich inline im HTML.

**Ergebnis:** Lighthouse 4×100 (Performance 100, A11y 100, Best Practices 100, SEO 100), CLS 0, FCP 0,5s, LCP 0,6s (Desktop).

**Disproven:** "CSS asynchron per preload→onload-Swap zu laden ist automatisch eine Verbesserung, weil sie render-blocking CSS vermeidet" — falsch für layoutrelevantes CSS; "pixelidentisches Endrendering beweist die Sicherheit eines async-CSS-Swaps" — ignoriert den Zwischenzustand, den nur eine CLS-Messung (kein Screenshot) erfasst.

**Lehre:** Für layoutkritisches CSS (z. B. Navigation) ist render-blocking CSS plus kritisches Inline-CSS der CLS-sichere Weg; ein Vorher/Nachher-Screenshot-Vergleich prüft nicht den Ladeverlauf. → widerlegt.md#1-async-css-swap-per-preload-und-onload-ist-eine-sichere-optimierung, [](laden-kritischer-pfad.md#8-nicht-kritisches-css-nicht-blockierend-nachladen)

## 2026-06-28 · mccain-digital · Hero-Zyklus ohne Layout-Shift

**Ausgangslage:** Hero-Zeile 2 sollte durch mehrere Substantive zykeln (digital products. → AI products. → web apps. …).

**Befund/Eingriff:** Zyklus alle 4,4s (2,8s wirkte "gehetzt", die Pixel-Assembly-Animation frisst davon ~1s), stabiles `aria-label` für Screenreader statt des wechselnden Texts; H1-Unterkante, Sub-Oberkante und Zeile-2-Box wurden für JEDES Zykluswort auf Pixelidentität verifiziert statt angenommen.

**Ergebnis:** 0 CLS über alle Zykluswörter, kein Overflow bei 1440px oder 390px.

**Lehre:** Das ist ein anderes Problem als die LCP-Regression durch Hero-Rotation vom 16.9. (siehe oben) — CLS-Stabilität und LCP-Kandidatur einer rotierenden Textkomponente müssen unabhängig voneinander geprüft werden; 0 CLS schützt nicht davor, dass eine spätere Variante zum neuen, größeren LCP-Kandidaten wird. → [](laden-kritischer-pfad.md#20-widthheight-oder-aspect-ratio-an-jedem-bild-gegen-cls), lighthouse-psi.md#1-rechne-mit-einem-neuen-lcp-kandidaten-bis-klick-tap-taste-oder-scroll

## 2026-06-21 · mccain-digital · SEO Agentic Browsing von 2/3 auf 3/3

**Ausgangslage:** Lighthouse "Agentic Browsing" stand bei 2/3.

**Befund:** Der `llms.txt`-Audit scheiterte mit "the file contains no links" — die Datei enthielt nur Bullet-Text zu Seiten/Services, aber keine echten Markdown-Links, wie es der llmstxt.org-Standard verlangt.

**Eingriff:** `llms.txt` neu aufgebaut mit H1, Blockquote und echten Markdown-Links zu bestehenden URLs.

**Ergebnis:** Score 2/3→3/3.

**Lehre:** Ein "Agentic Browsing"/LLM-Crawler-Checker sucht gezielt nach `[text](url)`-Syntax — Prosa oder Bullet-Erwähnungen reichen nicht. → lighthouse-psi.md

## 2026-06-16 · whatever-recall-internal · CSS-Inlining und Font-Preload-Bereinigung

**Ausgangslage:** Next.js lieferte pro Route ein externes, render-blocking `<link>`-Stylesheet; parallel preloadeten `next/font`-Deklarationen mehr Schriftschnitte als above-the-fold gebraucht wurden.

**Befund/Eingriff:** `experimental.inlineCss` inlined das routenspezifische CSS direkt ins HTML (Commit `3d47f95`). Unabhängig davon preloadete das Projekt Instrument-Serif UND JetBrains-Mono, obwohl beides reine Akzent-Schriften außerhalb des above-the-fold-Bereichs sind — die Hero-Eyebrow (einziges above-the-fold-Mono-Element) wurde komplett auf einen System-Mono-Stack umgestellt (Commit `6b5ab62`, "mobile LCP fix").

**Ergebnis:** ~600ms gespart, 0 render-blocking Stylesheet-Links pro Route. Mobile LCP 3,2s / Speed Index 4,1s (mit 3 JetBrains-woff2 in der Preload-Chain) behoben, `<head>` preloadet danach nur noch Inter.

**Lehre:** Jede `next/font`- bzw. `<link rel=preload as=font>`-Deklaration einzeln daraufhin prüfen, ob sie tatsächlich above-the-fold gerendert wird; für das above-the-fold-Element selbst ist ein System-Font-Stack oft schneller als ein Webfont. → react-nextjs.md, [](laden-kritischer-pfad.md#10-font-preload-nur-für-die-tatsächlich-above-the-fold-gerenderte-schrift-setzen)

## 2026-06-12 · mccain-digital · Feinschliff-Welle 3, Canvas-Face-Sampling

**Ausgangslage:** Video-Review-Runde; Ghost-Buttons ("Let's talk") verloren beim Canvas-Sampling ihre weißen Pixel, sichtbarer `getImageData`-Ruckler beim Hover-Start.

**Befund:** Das Sampling der Button-Fläche geschah im `pointerenter`-Handler — zu dem Zeitpunkt waren die `:hover`-Stile (Farbe/Rahmen) bereits aktiv, sodass der Hover- statt der Ruhezustand eingefangen wurde, synchron im Interaktionsmoment.

**Eingriff:** Das Face wird jetzt während einer Idle-Phase vorgesampelt statt im `pointerenter`-Handler.

**Ergebnis:** Kein `getImageData`-Ruckler mehr beim Hover-Start.

**Lehre:** Teure synchrone Canvas-Operationen wie `getImageData` gehören nie in den Interaktions-Hotpath — während einer Idle-Phase vorab ausführen und dabei den tatsächlichen Ruhezustand einfangen, nicht den schon aktiven Hover-Zustand. Dieselbe Engine wird knapp drei Monate später (04.09., siehe Award-Audit) am selben Mechanismus erneut angefasst: dort wird bei bewegtem Gradient-Hintergrund sogar bei JEDEM Hover-Enter neu gesampelt (0,7ms Median), weil Re-Sampling günstig genug ist. → [](rendern-canvas-webgl.md#14-teure-synchrone-canvas-operationen-aus-dem-interaktions-hotpath-in-eine-idle-phase-verschieben)

*Ab hier: Fälle aus weiteren Projekten des Owners, in der Quelle ohne exaktes Kalenderdatum — identifiziert über ADR-Nummer, Versions-Tag oder Commit statt Datum.*

## ADR-28/29 · 360 (company-portal) · Von der CSR-SPA zu Next.js RSC und ISR

**Ausgangslage:** Reine Vite-CSR-SPA: FCP 2,9s, LCP 4,5s, render-blocking ~1.430ms, main-thread busy 4,8s, Payload 8,9MB.

**Befund:** FCP/LCP mussten auf das komplette JS-Bundle warten, bevor überhaupt HTML gerendert wurde (leeres `<div id=root>`), zusätzlich lief ein Live-Three.js-Hero above-the-fold auf dem kritischen Pfad. 4,9MB der 8,9MB Payload stammten aus externen `picsum.photos`-Platzhalterbildern (Demo-Content) plus einem zusätzlichen Drittanbieter-DNS-Handshake.

**Eingriff:** Migration zu Next.js 16 App Router mit RSC+ISR (echtes Server-HTML für alle öffentlichen Routen); Three.js-Hero durch statisches Poster ersetzt, WebGL lädt erst nach Interaktion ("Step inside"); `picsum` vollständig entfernt, ersetzt durch 10 selbst-gehostete CC0-360°-Panoramen (Poly Haven) über `next/image`.

**Ergebnis:** Mobile-Lighthouse 56%→95%.

**Disproven:** "Externe kostenlose Platzhalter-Bilddienste sind für Demo-Content performance-harmlos" — sie waren der Hauptkostentreiber (4,9 von 8,9MB) und mitverantwortlich für den 56%-Score.

**Lehre:** Eine reine CSR-SPA hat strukturell ein First-Paint-Problem, das kein Bild-/CSS-Tuning kompensiert, solange der Rendering-Ansatz clientseitig bleibt — für öffentliche Routen ist Server-HTML der strukturelle Fix. → [](laden-kritischer-pfad.md#1-lcp-in-vier-phasen-denken-und-pro-phase-gezielt-eingreifen), widerlegt.md#7-externe-platzhalter-bilddienste-sind-performance-mäßig-vernachlässigbar, [[vercel-react-best-practices]]

## Wave 6 · 360 (company-portal) · Cold-Cache-Artefakt bei next start

**Ausgangslage:** Lokale Lighthouse-Mobile-Messung gegen `next start` zeigte beim allerersten Bild-Request LCP ~9,4s / Score 75.

**Befund:** Beim ersten Request kodiert `next start` das Bild synchron zu AVIF (via `sharp`) — teuer und einmalig; danach liegt das Bild im lokalen Cache.

**Eingriff:** Nicht die erste (kalte) Messung als Wahrheit nehmen, mehrfach messen und den warmen Wert nutzen.

**Ergebnis:** Folgemessungen (warm): Score 95, LCP 2,8s, TBT 20ms, CLS 0, FCP 1,2s.

**Lehre:** In Produktion cached die Vercel Edge CDN die optimierte Bildvariante ohnehin, der warme lokale Wert entspricht dem echten Prod-Steady-State. → messen.md

## Cream-Migration Phase 2 · 360 (company-portal) · Lightning CSS verschluckt Keyframes

**Ausgangslage:** 27 `@keyframes` wurden per `sed`-Append aus einer Handoff-CSS-Datei angehängt.

**Befund:** 9 der 27 Keyframes fielen mitten im Build lautlos weg, mehrere Sections brachen (Grid kaputt). Der `sed`-Append erzeugte zwei off-by-N-Fehler (eine verirrte `.hero {`-Öffnung und ein abgeschnittenes `.faq-wrap {`), wodurch Lightning CSS alles darunter fälschlich als in `.hero` verschachtelt interpretierte und Regeln stillschweigend verwarf.

**Eingriff:** Alle `@keyframes` in einen eigenen Block ans Dateiende gehoben, Fix über Klammer-Balance-Zähler verifiziert (849==849 Klammern vorher/nachher).

**Ergebnis:** Visuell verifizierter Bugfix; Root-Cause via Klammerzählung bestätigt.

**Lehre:** Moderne CSS-Parser (Lightning CSS, von Tailwind4/Next genutzt) können bei unausgeglichenen Klammern ganze Regel-Blöcke lautlos verschlucken statt einen Fehler zu werfen — bei maschinellem Anhängen/Verschieben großer CSS-Blöcke immer die Klammerbalance vorher/nachher zählen. → [](laden-auslieferung.md#14-moderne-css-parser-können-bei-unausgeglichenen-klammern-ganze-blöcke-lautlos-verschlucken)

## alpha.100 · mccain-cms · Motion-Editor-Slider-Lag

**Ausgangslage:** User-Report "unfassbar laggy, Controls nicht zu bedienen" beim Ziehen eines Sliders im Motion-Editor.

**Befund:** Jeder Pointermove-Tick feuerte ein eigenes PATCH → Parent-Refetch → neue Objekt-Referenz → 200ms-Debounce → vollen GSAP-Controller-Remount; bei einem Drag entstanden 40+ Round-Trips/Sekunde. Zusätzlich lief eine `motionGraphHash`-Berechnung als vollständiger `JSON.stringify`-Walk bei jedem Keystroke/Slider-Tick.

**Eingriff:** Neuer Bulk-Replace-Endpoint (1 PUT statt N PATCH); Authoring-Logik auf lokalem optimistic State mit einem einzigen debounced Flush (350ms Idle); Structural-vs-Value-Edit-Split, sodass reine Wertänderungen keinen GSAP-Remount mehr auslösen; `motionGraphHash` auf flachen ID+Typ-Walk reduziert.

**Ergebnis:** 40 PATCH/s → 1 PUT pro 350ms Idle; Controller-Remount pro Non-Motion-Edit: jeder Keystroke → 0.

**Lehre:** Hochfrequente UI-Events (Pointermove/Drag/Slider) nie direkt an Netzwerk-Requests oder teure Re-Mounts koppeln; zwischen struktureller und reiner Wertänderung unterscheiden. → react-nextjs.md, [[vercel-react-best-practices]]

## Publish-Cron · mccain-cms · Batch-Updates statt N Einzel-Schreibvorgänge

**Ausgangslage:** Bei 50 geplanten Seiten liefen 101 einzelne DB-Calls (je 1 UPDATE + 1 Audit-INSERT pro Seite).

**Eingriff:** `toPublish`/`toUnpublish` laufen jetzt je in einer `db.transaction` mit einem einzigen `UPDATE...WHERE id = ANY(...)` statt N seriellen Updates; Audit-Logs über `logAuditBatch` in einem einzigen INSERT.

**Ergebnis:** 101 DB-Calls → 3 bei 50 geplanten Seiten.

**Lehre:** Ein Cron/Batch-Job, der N gleichartige Zeilen ändert, sollte nie N einzelne DB-Roundtrips machen. (Datenbank-Regel, außerhalb dieses Skills — siehe die Datenbank-Konventionen des Owners.)

## Font-Preload P2 · mccain-cms · Preload nur für Above-the-Fold-Schrift

**Ausgangslage:** `next/font` preloadete `Instrument_Serif`, obwohl diese Schrift im Visual Editor nie gerendert wurde.

**Eingriff:** `preload:false` auf jede Font außer der tatsächlichen LCP-/Above-Fold-Body-Font.

**Ergebnis:** Font-Preload-Warning behoben.

**Lehre:** `next/font` preloadet standardmäßig jede deklarierte Font-Instanz unabhängig von ihrer tatsächlichen Nutzung — dasselbe Muster wie beim whatever-recall-internal-Fund vom 16.6. → [](laden-kritischer-pfad.md#10-font-preload-nur-für-die-tatsächlich-above-the-fold-gerenderte-schrift-setzen)

## alpha.124 · mccain-cms · Client-Bundle zieht Server-Only-Dependency mit

**Ausgangslage:** `npm run build` brach mit "Module not found" gegen `postgres`-interne Module, obwohl `tsc --noEmit` sauber war.

**Befund:** Eine `'use client'`-Komponente importierte aus einer lib-Datei, die nur eine kleine Konstante brauchte — dieselbe Datei exportierte aber auch eine Funktion, die transitiv `@/lib/db` (postgres) importierte. Next bündelt beim Client-Import immer den kompletten transitiven Import-Graphen der Datei.

**Eingriff:** Reine Konstanten/Typen in eine eigene `*-constants.ts`-Datei ausgelagert, die der Client direkt importiert.

**Ergebnis:** Build-Fehler behoben; wichtig: nur `npm run build`, nicht `tsc --noEmit`, deckte das Problem auf.

**Lehre:** Server-Logik und eine vom Client gebrauchte Konstante nie in derselben lib-Datei mischen. → react-nextjs.md

## — · mccain-cms/general · Hydration-Mismatch durch localStorage

**Ausgangslage:** Eine Sidebar-Komponente (`expandedGroups`) und ein Toast-Portal (`VEToast`) warfen React-Hydration-Errors.

**Befund:** `useState(() => JSON.parse(localStorage.getItem(...)))` liefert dem Server einen Default- und dem Client einen gespeicherten Wert; `{typeof window !== 'undefined' && createPortal(...)}` direkt im JSX rendert am Server `false`, am Client `true`.

**Eingriff:** State immer mit einem Default initialisieren, den `localStorage`-Wert erst in einem `useEffect` nach dem Mount nachziehen; Portal-Rendering hinter einem `mounted`-State+`useEffect`-Guard statt eines inline `typeof window`-Checks im JSX.

**Ergebnis:** Beide Hydration-Bugs behoben.

**Lehre:** Jede Komponente, die Browser-only-APIs anfasst, gehört hinter `useEffect` oder einen `mounted`-Guard — nie `typeof window` direkt im JSX, nie `localStorage` direkt im `useState`-Initializer. → react-nextjs.md

## — · meza-website · Custom Image Loader zerstört Edge-CDN

**Ausgangslage:** LCP-Score schwankte 79–95%; mit Custom-Loader gemessene LCP 5,4s.

**Befund:** Ein custom Image-Loader (Supabase/Cloudinary) für `next/image` umgeht die Vercel Edge CDN — jeder Bild-Request geht mit variabler Origin-Latenz statt über den optimierten Edge-Cache.

**Eingriff:** Custom Loader entfernt; `next.config.ts` nutzt `remotePatterns` statt `loader`-Prop, `minimumCacheTTL 86400`, Formate webp/avif.

**Ergebnis:** LCP 5,4s → 2,3s, Score-Varianz 79–95% eliminiert.

**Lehre:** Auf Vercel niemals einen custom Image-Loader für `next/image` verwenden. Die Regel wurde danach explizit auf neue-webseite/mccain-cms/company-portal übertragen — ein Hinweis darauf, dass dieselbe Lektion sonst in jedem Projekt neu gelernt worden wäre. → react-nextjs.md, [[neue-webseite]]

## — · 360 / whatever-recall-internal · Headless-Chromium rendert WebGL schwarz

**Ausgangslage:** Ein interaktiver Three.js-Canvas ließ sich per Playwright-Headless (SwiftShader-Software-Renderer) nicht screenshotten — der Canvas blieb schwarz, obwohl er auf echter GPU korrekt rendert. Trat unabhängig in zwei Projekten auf (360 wow-demo und whatever-recall-internal GraphCanvas).

**Befund:** SwiftShader ist ein reiner Software-WebGL-Fallback ohne echte GPU; bestimmte Shader-/Compositing-Pfade liefern dort kein Bild. Zusatzbefund: Headless-Browser setzen standardmäßig `prefers-reduced-motion:reduce`; `clip-path`/SMIL-Timelines gelten in Headless ebenfalls als unzuverlässig.

**Eingriff:** Canvas-Features manuell auf echter GPU-Hardware verifizieren statt per Headless-CI-Screenshot; Animations-Tests setzen `reducedMotion:'no-preference'` explizit.

**Lehre:** WebGL/Canvas-Rendering nie ausschließlich per Headless-CI-Screenshot verifizieren. → messen.md, [[browser-verify]]

## ADR-040 · mccain-cms · Browser-Runtime-Tests für DOM-Effekte

**Ausgangslage:** Nach 4 Audit-Runden hatten Motion-Features gleichzeitig grüne Unit-Tests UND keine funktionierende Animation im Live-Preview.

**Befund:** `jsdom` (Vitest) simuliert DOM-Effekte anders als echtes Chromium — fehlende `data`-Attribute, falsche Query-Scopes, Remount-Loops und Handle-Semantik-Unterschiede wurden von reinen Unit-Tests nie erfasst.

**Eingriff:** Zwei-Schicht-Playwright-Harness für jedes Feature, das DOM manipuliert: (1) Standalone (`page.setContent` + esbuild-Bundle, kein Dev-Server, <5s) für Executor-Korrektheit, (2) Live-Dev-Server-Harness für Renderer-Mount-Integration. Kein Feature-Commit ohne gleichzeitigen Browser-Test.

**Ergebnis:** 13/13 grün im neuen Browser-Runtime-Harness, deckte reale Bugs auf, die Vitest nicht fand.

**Lehre:** `tsc`+Unit-Test-grün reicht für DOM-manipulierende Features nicht als Fertig-Kriterium — ein Browser-Runtime-Test gegen echtes Chromium muss die tatsächliche DOM-Wirkung verifizieren. → messen.md, [[browser-verify]]

## alpha.164 / B7-B8 · mccain-cms · Zwei widerlegte Annahmen (GSAP, Reduced-Motion)

**Fall 1 — GSAP scrollTrigger.scroll():** Die offiziell dokumentierte Methode `scrollTrigger.scroll(pos)` (laut GSAP-Forum-Antwort der korrekte Weg für externes Scrubbing) funktioniert nur auf einer "nackten" Seite ohne Smooth-Scroll-Wrapper. Sobald Lenis zwischen Trigger und echtem Page-Scroller sitzt, wird das synthetische Scroll-Event verschluckt oder ScrollTrigger synct den Tween beim nächsten Refresh sofort zurück (sichtbarer Loop). Fix: `tween.progress()` direkt treiben, ScrollTrigger währenddessen deaktivieren — verifiziert über neue Tests (`getProgressCalls`/`getDisableCalls`).

**Fall 2 — Automatisches Reduced-Motion-System:** Ein System, das "nicht-essenzielle" Transform-Properties unter einer Default-Stufe "minimal" herausfilterte, sollte Nutzer schützen. Es filterte stattdessen lautlos JEDE Transform-Animation site-weit im Default-Zustand, ohne anzuzeigen, was gerade unterdrückt wird — als "bevormundend" eingestuft und komplett entfernt (33 Tests gestrichen) statt repariert.

**Lehre:** Eine offiziell dokumentierte Bibliotheks-Methode gilt nicht automatisch unter jedem Wrapper (Smooth-Scroll-Libraries verändern die Event-Semantik). Ein automatisches Sicherheitssystem ohne sichtbares Feedback kann mehr Schaden anrichten als der Zustand, den es verhindern soll. → widerlegt.md#8-gsaps-scrolltriggerscroll-ist-der-korrekte-weg-zum-externen-scrubben, widerlegt.md#9-ein-automatisches-reduced-motion-system-schützt-ohne-kosten

## — · whatever-recall-internal · 3D-Preview: 0×-Verifikation überzeugte trotzdem nicht

**Ausgangslage:** Ein per Klick code-gesplitteter WebGL/Three.js-Chunk (645KB) wurde für den initialen Seitenaufruf gebaut.

**Befund:** Im Build-Output verifiziert: der Chunk taucht beim initialen Laden 0× auf.

**Entscheidung:** Der Owner entschied trotzdem gegen den Einsatz auf der Homepage — selbst ein click-gated WebGL-Pfad war ihm ein unnötiges Risiko für "die Seite muss rasend schnell sein" auf der wichtigsten Konversions-Seite; stattdessen wurde nur ein vorgerechnetes Standbild ausgeliefert.

**Lehre:** Technische Verifikation (0× Ladepfad) und Produktentscheidung sind getrennte Fragen — eine performance-neutrale Lösung kann trotzdem als Risiko abgelehnt werden, wenn die Seite eine Null-Kompromiss-Anforderung hat.

## Muster über die Fälle hinweg

- Canvas-/WebGL-Engines sind Wiederholungstäter: dieselben Fehlerklassen (naturalWidth/Height-Verwechslung, getBoundingClientRect bei Transform, fehlender Offscreen-Cache, will-change bricht background-clip:text) tauchen über Monate hinweg in immer neuen Komponenten derselben Engine wieder auf — Juni (Ghost-Buttons) → August (Work-Karten/Headlines) → September (AI-Wort-Welle, Award-Audit).
- Eine falsche Messgrundlage kostet mehr Zeit als der eigentliche Bug: Dev-Server-Kompression/no-store, Cache-Header-Verwechslung, Lighthouse-CLI gegen Live-URL, CPU-Throttling-Artefakte der PSI-Testmaschine — mehrfach ganze Sessions verbrannt, bevor der Messfehler selbst gefunden wurde.
- `content-visibility` ist nie "fertig": Stacking-Context-Bruch, IO-Ziele in gesperrten Blöcken, ResizeObserver auf `body`, contain-intrinsic-size-Schätzfehler — dieselbe CSS-Eigenschaft erzeugt in praktisch jedem Projekt eine neue Klasse von Seiteneffekten, zuletzt am 16.9. sogar bis auf Chromium-Quellcode-Ebene nachverfolgt.
- Hydration ist ein Alles-oder-Nichts-Vertrag: ein DOM-Snapshot nach Laufzeit-Interaktion ist kein SSR, egal wie überzeugend er aussieht — zwei unabhängige Anläufe (12.9. und 13.9.) und ein zweites Projekt (mccain-cms ADR-040, andere Fehlerart) bestätigen dasselbe Prinzip aus verschiedenen Richtungen.
- Automatisierte Gates, die stillschweigend "PASS" melden, sind einer der teuersten Fehler im Werkzeugkasten: tote Server, umbenannte Selektoren, blinde Fehlerkanäle, ein Guard gegen einen längst behobenen Bug — jedes Mal hätte eine einfache Mindestmenge-an-Messpunkten-Prüfung gereicht.
- "LCP-Element" ist nicht dasselbe wie "LCP-Ursache" — dieselbe Verwechslung wird in mindestens drei unabhängigen Runden (13.9., Award-Audit, 11./12.9.) neu gelernt, jedes Mal wird zuerst fälschlich am Element selbst optimiert.
- Rotierender/wechselnder Text ist doppelt gefährlich: dieselbe Technik kann CLS-neutral sein (28.6.) und trotzdem Monate später ein später, größerer LCP-Kandidat werden (16.9.) — beide Metriken müssen unabhängig geprüft werden.
- Die relevanten Zahlen sitzen selten dort, wo man zuerst sucht: fillRect-Anzahl statt Rauschberechnung, HTML-Kommentare statt JS-Engine-Kommentare, der WebGL-Datenstrom statt eines 34px-Logos — Profiling schlägt Intuition praktisch immer.
- Dieselbe Lektion wird von unterschiedlichen Projekten unabhängig neu gelernt und danach bewusst projektübergreifend übertragen: der Custom-Image-Loader-Fund aus meza-website wurde explizit als Regel auf neue-webseite/mccain-cms/company-portal übertragen — ein Beleg dafür, dass genau dafür dieser Skill existiert.
- Methodik-Fallen häufen sich in "Nachtsitzungen": Messungen während laufender Animationen (getComputedStyle liefert Zwischenwerte/calc()-Strings), zu kurzes Warten, und "es lief doch, ich habs ja gemessen"-Aussagen ohne echten Beweis wiederholen sich wortgleich über mehrere Projekte und Monate hinweg.

## Quellen

- mccain-digital: HANDOFF.md (Stände 16.9. Nachmittags/Abends/Pixelstrom; 13.9. 03:00/03:30/Nachts/"Was am 13.9. gebaut wurde"/"Was als nächstes dran ist"; weitere unbenannte und nummerierte Abschnitte inkl. "Der nächste Durchgang", "Mobil 41 war eine Fehlmessung", Patch 4–8; "Der Refresh"/MengTo-Skills-Abschnitt)
- mccain-digital: CHANGELOG.md (Einträge 2026-06-12, 2026-06-28, 2026-07-20, 2026-08-03, 2026-09-01, 2026-09-04, 2026-09-16 (2)/(3))
- mccain-digital: Git-Commit-Historie, u. a. 16dabe6, 3471a63, a4aee9f, 4b3e71d, aca605c, 645d034, 465f8f9, 3ecda0d, 6ac3074, 9a3b6fc, 6e6435d, d73393b, 16fe47b, 91e16f2, ab05b06, e9f39a3, 41c0efe, 57d9d6e, c461b51, a06f8e3, f75acf8, a2035d0, b0b2ab0, 7e9b70d, 25304a7, 5a132f3, 7dea153, 8a17735, 988975f, 9fe2c41, a4ddb84, a8ec5a8, bdd7615, c2ca0dd, e34aa26, 1a36a82, ca40094, 0d3f091
- mccain-digital, Git-Commit-Historie ergänzt beim Prüfdurchgang 16.9.2026 (vier Commit-Chunks, 44 Commits, 2026-09-10 bis 2026-09-16): 099cc88, 2713c58, 55d2a32, 33faaf9, edec528, 3d568d1, 1919705
- mccain-digital, Zusatzmessungen 16.9.2026 (für diesen Skill erhoben): scratchpad/skill/raw/lighthouse_window.md (Lighthouse 13.4.1, Chrome for Testing 148.0.7778.96, Reports unter scratchpad/skill/raw/lh/)
- mccain-digital, Zusatzmessungen 16.9.2026: scratchpad/skill/raw/swgl_fcp_finding.md (scratchpad/swgl_fcp.mjs, Chrome for Testing 148)
- mccain-digital, Zusatzmessungen 16.9.2026: scratchpad/skill/raw/chromium_io_verdict.md — Chromium main, HEAD cabdc32a717663075a71718eb8750f6abdaedb64; CSS Containment 2 Spezifikation §4.3/§4.5; IntersectionObserver-Spezifikation; w3c/csswg-drafts Issue #8542; Mozilla Bugzilla 1807253
- 360 (company-portal): .claude/docs/decisions.md (ADR-28, ADR-29, ADR-40), .claude/docs/nextjs-migration-plan.md, .claude/docs/session-handoff.md, .claude/docs/session-handoff-archive.md, CHANGELOG.md ("Wave 6 KOMPLETT")
- mccain-cms: CHANGELOG.md (alpha.100 "Motion-Editor Perf-Fix", alpha.124, alpha.164, "Publish-Cron transactional + batch-audit", "B7/B8 — Reduced-motion system removed wholesale", Font-Preload-Warnings P2), .claude/docs/decisions.md (ADR-040), wiki/wiki/internal/features/motion.md (alpha.100)
- whatever-recall-internal: CHANGELOG.md (2026-06-16, Commits 3d47f95, 6b5ab62; "Website mobile + PageSpeed wave"), .recall/HANDOFF.md (2026-06-18, 2026-06-21), internal/3d-preview/README.md
- ~/.claude memory (Owner-übergreifende Lehren): feedback_browser_runtime_tests_for_dom_effects.md, feedback_client_bundle_import_graph.md, feedback_hydration_localstorage.md, feedback_session_learnings_20260329.md, feedback_no_custom_image_loader.md, project_360_wow_demo.md
