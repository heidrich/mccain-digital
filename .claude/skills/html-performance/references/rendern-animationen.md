# Rendern: Animationen — html-performance

> Teil des Skills [[html-performance]] · Stand 2026-09-16 · Belege: mccain-digital (HANDOFF, CHANGELOG, Commits), weitere Projekte des Owners, Recherche mit Quell-URLs

Diese Datei deckt CSS- und JavaScript-Animationen ab: compositor-freundliche Eigenschaften, `will-change`, `prefers-reduced-motion`, Scroll-Choreografien, rAF-Schleifen, Animationsbibliotheken, der Speed-Index-Effekt weiterlaufender Einblendungen sowie Mess-Fallstricke bei Animationen (Werte aus laufenden Animationen, Ursache isoliert messen). Hauptthread, Layout, content-visibility und Beobachter stehen in [rendern-hauptthread.md](rendern-hauptthread.md), Canvas und WebGL in [rendern-canvas-webgl.md](rendern-canvas-webgl.md). Ladereihenfolge, Fonts, Bilder und Caching: [laden-kritischer-pfad.md](laden-kritischer-pfad.md), [laden-javascript.md](laden-javascript.md), [laden-auslieferung.md](laden-auslieferung.md); Lighthouse/PSI-Scoring in [lighthouse-psi.md](lighthouse-psi.md), Mess-Methodik in [messen.md](messen.md), der Framework-Delta in [react-nextjs.md](react-nextjs.md).

Bis zum 16.9.2026 stand dieser Inhalt zusammen mit den anderen `Rendern`-Themen in `rendern.md`; die Regeln sind hier neu von 1 durchnummeriert, alte Verweise gelten nicht mehr.

## Kurzfassung

**Animationen**
- **Nur transform, opacity und filter animieren, der unanimierte Zustand ist der Endzustand** — alles andere kostet Hauptthread pro Frame ([→](#1-nur-transform-opacity-und-filter-animieren-der-unanimierte-zustand-ist-der-endzustand))
- **will-change:transform gezielt einsetzen, nicht pauschal** — nur für wiederholt betretbare Bereiche, dynamisch, nie auf body ([→](#2-will-changetransform-gezielt-einsetzen-nicht-pauschal))
- **CSS-Override-Reihenfolge bei prefers-reduced-motion: die spätere Regel gewinnt** — Cascade-Reihenfolge schlägt Absicht ([→](#3-css-override-reihenfolge-bei-prefers-reduced-motion-die-spätere-regel-gewinnt))
- **View Transitions unter reduced-motion mit navigation:none abschalten** — animation:none lässt eine leere Transition laufen ([→](#4-view-transitions-unter-reduced-motion-mit-navigationnone-abschalten))
- **prefers-reduced-motion muss auch JS-getriebene Kosten abschalten und live reagieren** — CSS-Media-Query allein reicht nicht ([→](#5-prefers-reduced-motion-muss-auch-js-getriebene-kosten-abschalten-und-live-reagieren))
- **Werte aus laufenden Animationen sind beim Messen unsicher** — calc()-Strings lassen parseFloat still auf 0 fallen ([→](#6-werte-aus-laufenden-animationen-sind-beim-messen-unsicher))
- **view()-Timelines eignen sich nur für Elemente, die noch unsichtbar ins Bild kommen** — sonst zeitbasiert animieren, cover statt entry bei kurzen Elementen ([→](#7-view-timelines-eignen-sich-nur-für-elemente-die-noch-unsichtbar-ins-bild-kommen))
- **Above-the-Fold-Inhalt nicht per Scroll-Reveal oder Fade animieren** — verzögert gefühlte Fertigstellung und stört Audits ([→](#8-above-the-fold-inhalt-nicht-per-scroll-reveal-oder-fade-animieren))
- **Animationsphase aus Wall-Clock-Zeit ableiten, Loops um ein Vielfaches der Periode verschieben** — Frame-Zähler macht Geschwindigkeit von der Bildwiederholrate abhängig ([→](#9-animationsphase-aus-wall-clock-zeit-ableiten-loops-um-ein-vielfaches-der-periode-verschieben))
- **Eine modernere Web-API nicht ohne bestehenden Bedarf migrieren** — erst prüfen, ob das Problem überhaupt noch existiert ([→](#10-eine-modernere-web-api-nicht-ohne-bestehenden-bedarf-migrieren))
- **Eine rAF-Schleife für interaktionsgebundene Effekte soll sich selbst schlafen legen** — self-sleeping statt Dauerlauf ([→](#11-eine-raf-schleife-für-interaktionsgebundene-effekte-soll-sich-selbst-schlafen-legen))
- **Für Scroll-Choreografien Transform-Einzeleigenschaften statt der Shorthand verwenden** — transform überschreibt jeden :hover-Transform ([→](#12-für-scroll-choreografien-transform-einzeleigenschaften-statt-der-shorthand-verwenden))
- **Vor einer Animationsbibliothek natives CSS oder einen eigenen Wrapper prüfen** — Lenis statt bezahltem ScrollSmoother, eigener IO-Wrapper statt GSAP/Framer ([→](#13-vor-einer-animationsbibliothek-natives-css-oder-einen-eigenen-wrapper-prüfen))
- **Früher First Paint, später Speed Index durch weiterlaufende Einblend-Animationen** — FCP/LCP allein zeigen das Problem nicht ([→](#14-früher-first-paint-später-speed-index-durch-weiterlaufende-einblend-animationen))
- **Den wahren Verursacher isoliert messen statt der naheliegenden Komponente die Schuld zu geben** — 146 Animationen in einem 34-px-Logo kosteten mehr als der WebGL-Strom ([→](#15-den-wahren-verursacher-isoliert-messen-statt-der-naheliegenden-komponente-die-schuld-zu-geben))
- **`will-change`/Compositing-Ebene nie mit `background-clip: text` kombinieren** — Chrome rastert getrennt, der Verlaufstext verschwindet; dreimal im Projekt ([→](#16-will-change-transform-oder-eine-erzwungene-compositing-ebene-nie-mit-background-clip-text-kombinieren))

## Inhalt

- [Animationen](#animationen)
- [Offene Fragen](#offene-fragen)
- [Quellen](#quellen)

## Animationen

### 1. Nur transform, opacity und filter animieren, der unanimierte Zustand ist der Endzustand
**Warum:** Nach Chromes eigenem Blog sind aktuell standardmäßig nur `transform`, `opacity` und `filter` auf dem Compositor hardwarebeschleunigt; `background-color` und `clip-path` sind als geplante Ergänzungen genannt, aber ohne verifizierte feste Versionsnummer — bis zur Bestätigung im eigenen DevTools-„non-composited animations"-Insight gelten sie weiter als hauptthread-kostend. `top`, `background-position`, `color`/`background-color` und `clip-path` erzeugen pro Frame echte Layout-/Paint-Arbeit statt reinem Compositing; nach allen sonstigen v5-Fixes blieben nicht-composited Animationen im Projekt der größte Rest von RunTask (~390 ms). Der Lighthouse-Audit „non-composited animations" bewertet dabei ausschließlich die technische Compositor-Fähigkeit (`scoreDisplayMode: INFORMATIVE`, `metricSavings.CLS` bewusst immer 0, da der CLS-Einfluss zu unsicher vorherzusagen ist), erfordert Chrome ≥ m86.
**Woran man es erkennt:** Lighthouse meldet „non-composited animations" mit konkreter Elementzahl; `scripts/animations.mjs` klassifiziert Properties nach „safe" (transform/opacity/filter/translate/rotate/scale/backdrop-filter) und „ambiguous" (background-color/clip-path).
**Fix:** Nur `transform`, `opacity`, `filter` (und die Einzeleigenschaften `translate`/`rotate`/`scale`) animieren; der unanimierte HTML/CSS-Default jedes Effekts muss bereits sein fertiger Endzustand sein, damit ein Browser ohne Scroll-Timeline-/Animations-Unterstützung nur die Bewegung verliert, nie den Inhalt. `top` → `translateY` ist dabei **nicht** 1:1 austauschbar, weil sich Prozentwerte bei `top` und `translateY` auf unterschiedliche Bezugsboxen beziehen — je Fall einzeln prüfen. Referenz-Zeitraster aus dem Projekt: Micro 120–200 ms, UI-State 180–260 ms, Section-Entrance 400–800 ms, Hero 800–1600 ms, Stagger 40–90 ms, Fade+Rise 12–24 px, Hover-Lift −2 bis −6 px.
**Beleg:** mccain-digital, HANDOFF.md „STAND 13.9. NACHTS" Zeile 538-543 (17 nicht-composited Elemente, Lighthouse) und Zeile 156-157/45 (~390 ms RunTask-Rest) · commit `ab05b06` (2026-09-01, Zeitraster) · Gegenbeispiel für die Kosten einer Verletzung, wenn Regel 21 in [rendern-hauptthread.md](rendern-hauptthread.md#21-animationen-außerhalb-des-viewports-pausieren) nicht greifen kann: ein `position: fixed`-Consent-Banner animierte `background-position` (nicht compositable) endlos, weil ein fixiertes Element nie offscreen gerät — Layout-Calls 358 → 65, Paint 292 → 255 ms, UpdateLayoutTree 242 → 205 ms nach Entfernen der Loop-Animation (commit `33faaf9`, 2026-09-13) · [Chrome-Blog](https://developer.chrome.com/blog/hardware-accelerated-animations) (uncertain: bg-color/clip-path „soon") · [Lighthouse non-composited-animations.js](https://github.com/GoogleChrome/lighthouse/blob/main/core/audits/non-composited-animations.js) · Sicherheit: gemessen + dokumentiert (mit offener Frage zum Compositor-Support-Stand, siehe [Offene Fragen](#offene-fragen))
**Gilt für:** allgemein

### 2. will-change:transform gezielt einsetzen, nicht pauschal
**Warum:** MDN warnt ausdrücklich, `will-change` nur als letztes Mittel bei **bestehenden** Performance-Problemen einzusetzen, nicht vorbeugend, es dynamisch per Skript an-/abzuschalten statt dauerhaft im Stylesheet zu setzen, und es nicht auf großflächige Container (`<body>`) anzuwenden, da es auf den gesamten Teilbaum wirkt — exzessiver Einsatz erhöht Speicherverbrauch und macht Rendering komplexer statt schneller. Im Projekt behob `will-change: transform` Jank bei 43 gleichzeitig laufenden, scroll-getriebenen Wort-Timelines, aber die Begründung gilt nur für Bereiche, die **wiederholt** betreten werden können (die Animation bleibt dauerhaft „lebendig") — für einmalig ablaufende Sequenzen (z. B. eine Hero-Sequenz beim ersten Laden) gilt sie nicht, dort sollte `will-change` nach Ablauf wieder entfernt werden, um keinen dauerhaften Compositor-Layer ohne Nutzen zu binden.
**Woran man es erkennt:** `scripts/fps.mjs` zeigt einen hohen Anteil an Frames über 20 ms und steigendes p99 korreliert mit der Zahl gleichzeitig aktiver Scroll-Timelines.
**Fix:** `will-change: transform` gezielt auf Elemente mit wiederholt betretbarem Scroll-Bereich setzen; nicht pauschal, nicht auf `<body>`, und für einmalige Sequenzen nach Ablauf wieder entfernen.
**Beleg:** mccain-digital, HANDOFF.md „DER REFRESH", „Drei Fehler beim Bauen" Punkt 3 (ca. Zeile 2467-2472): mit 43 aktiven Wort-Timelines 9 % der Frames über 20 ms, p99 17,1 → 32,7 ms; mit `will-change: transform` wieder 0 % über 20 ms, p99 17,3 ms · [MDN will-change](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/will-change) · Sicherheit: gemessen + dokumentiert
**Gilt für:** allgemein

### 3. CSS-Override-Reihenfolge bei prefers-reduced-motion: die spätere Regel gewinnt
**Warum:** Bei gleicher Spezifität gewinnt im CSS die im Quelltext **spätere** Regel, nicht die „gemeinte" Override-Regel. Stand eine `prefers-reduced-motion`-Override-Regel im Stylesheet vor den Regeln, die sie eigentlich aushebeln sollte, gewann leise die spätere, ursprüngliche Animations-Regel.
**Woran man es erkennt:** Animationen laufen trotz `prefers-reduced-motion: reduce` unverändert weiter, ohne dass ein offensichtlicher Fehler im Media-Query-Selektor vorliegt; betroffene Selektoren lassen sich im Browser (berechnete Werte) zuverlässiger finden als per `grep` nach dem Animationsnamen.
**Fix:** Die `prefers-reduced-motion`-Override-Regel ans Ende der Datei verschieben, damit sie bei gleicher Spezifität nach den Regeln steht, die sie aushebeln soll.
**Beleg:** mccain-digital, commit `9fe2c41` (2026-09-04): vorher 7 Animationen (Availability-Dot, Scroll-Cue, Wave durch Claim und vier Figuren) liefen trotz reduced-motion unendlich weiter, nachher 0, während 30 normale Animationen weiterlaufen · Sicherheit: gemessen
**Gilt für:** allgemein

### 4. View Transitions unter reduced-motion mit navigation:none abschalten
**Warum:** `animation: none` schaltet unter `@view-transition` nur die Animation ab, lässt den Browser aber weiterhin eine (dann leere) View Transition ausführen — nur ohne etwas, das sie sichtbar antreibt.
**Woran man es erkennt:** Ein `pageswap`-Event liefert unter reduced-motion weiterhin eine reale `ViewTransition`, obwohl `animation: none` gesetzt ist.
**Fix:** Unter `prefers-reduced-motion: reduce` `navigation: none` statt `animation: none` setzen, um die Transition selbst zu verhindern.
**Beleg:** mccain-digital, commit `988975f` (2026-09-04): verifiziert per `pageswap`-Event — reale `ViewTransition` im Normalfall, `false` unter reduced motion · Sicherheit: gemessen
**Gilt für:** allgemein

### 5. prefers-reduced-motion muss auch JS-getriebene Kosten abschalten und live reagieren
**Warum:** Wort-Splitting (DOM-Arbeit für viele Spans), Canvas-Dither-Rauschen oder ein Spiel-Effekt laufen unabhängig von CSS-Transitions und kosten weiterhin Hauptthread, wenn `prefers-reduced-motion` nur CSS-Animationen abschaltet. Nutzer:innen können die Systemeinstellung zudem live umschalten, während die Seite bereits offen ist — bei rein CSS-getriebenen Animationen reicht `@media (prefers-reduced-motion: reduce)`, bei JS-gesteuerten Loops muss der Code selbst per `window.matchMedia(...)` plus `change`-Listener reagieren. Der korrekte Zielzustand ist außerdem der **fertige** Endzustand, nicht nur eine schnellere Animation — eine rein verkürzte Animation bleibt für Nutzer:innen mit Bewegungsempfindlichkeit weiterhin eine Animation und kostet weiterhin Rechenzeit für Dither/Partikel-Canvas.
**Woran man es erkennt:** Unter aktiviertem `prefers-reduced-motion` laufen weiterhin JS-Effekte (Wort-Splitting, Canvas-Noise, Spiel-Loops) im Profiler; ein Umschalten der Systemeinstellung bei bereits offener Seite ändert nichts am Verhalten.
**Fix:** Bei aktivem Reduced-Motion: 0 Wort-Splits, kein Dither, kein zusätzlicher Spiel-Effekt — direkt der fertige Endzustand statt einer beschleunigten Animation; zusätzlich jede nicht-essenzielle loopende Animation an Sichtbarkeit koppeln (pausieren, wenn ihr Element nicht sichtbar ist, siehe Regel 21 in [rendern-hauptthread.md](rendern-hauptthread.md#21-animationen-außerhalb-des-viewports-pausieren)) und den JS-Zustand per `matchMedia('(prefers-reduced-motion: reduce)')`-`change`-Listener aktuell halten, nicht nur einmalig beim Laden prüfen.
**Beleg:** mccain-digital, commit `ab05b06` (2026-09-01) und HANDOFF.md „Gemessen, nicht beurteilt" (ca. Zeile 2481) sowie „faee58f" (2026-06-29, Mega-Menu-Stagger, AI-Band-Rotator u. a.) · [web.dev prefers-reduced-motion](https://web.dev/articles/prefers-reduced-motion) (dokumentiert: Live-Listener-Empfehlung) · Sicherheit: dokumentiert + dokumentiert
**Gilt für:** allgemein

### 6. Werte aus laufenden Animationen sind beim Messen unsicher
**Warum:** `getComputedStyle()` kann für eine laufende Keyframe-Animation/Transition einen `calc()`-Ausdruck zurückgeben (z. B. `calc(0% + 358.054px)`) statt einer reinen Pixelzahl; `parseFloat()` darauf liefert `0`, ohne einen Fehler zu werfen. Zusätzlich hat eine aktive CSS-Animation Vorrang vor einmalig per `element.style` gesetzten Werten auf derselben Eigenschaft — wer zu Testzwecken einen Wert erzwingt, während eine Keyframe-Animation auf derselben Eigenschaft läuft, misst weiterhin die alte Animationsphase. Präzisierung: `getComputedStyle()` erzwingt Style-Recalc praktisch immer, aber **Layout** nur unter einer von drei Bedingungen — das Element liegt in einem Shadow-Tree, es gibt viewport-bezogene Media-Queries im Stylesheet, oder die abgefragte Eigenschaft gehört zu einer bestimmten Liste (u. a. `height`/`width`/`top`/`transform`/`grid*`).
**Woran man es erkennt:** Ein aus `getComputedStyle` gelesener Positions-/Farbwert liest sich immer als 0/ungefärbt, obwohl visuell erkennbar etwas anderes gilt; ein zu Testzwecken gesetzter Inline-Style ändert sichtbar nichts.
**Fix:** `calc()`-Ausdrücke explizit parsen statt sich auf `parseFloat()` direkt zu verlassen, und bei animierten Positionswerten immer auf `NaN` prüfen statt auf einen stillen 0-Fallback zu vertrauen; alternativ vor dem Messen `animation: none` setzen oder das Ende der Animation abwarten, um den Endzustand statt eine Zwischenphase zu lesen.
**Beleg:** mccain-digital, commit `a4ddb84` (2026-09-04) und HANDOFF.md Zeile ~1857-1858, ~1926-1929, ~1968-1975: drei konkrete Folgefehler durch denselben Mechanismus — eine Pille las sich als „ungefärbt", ein 44-px-Chip als 43,47 px, ein Reveal als „hängend"; `pixel-engine.js:cssPx` parst `calc()` jetzt korrekt · [Paul-Irish-Gist](https://gist.github.com/paulirish/5d52fb081b3570c81e3a) (dokumentiert: getComputedStyle-Layout-Bedingungen) · Sicherheit: gemessen + dokumentiert
**Gilt für:** allgemein

### 7. view()-Timelines eignen sich nur für Elemente, die noch unsichtbar ins Bild kommen
**Warum:** Der `entry`-Bereich einer `animation-timeline: view()` liegt per Definition vor dem ersten Frame — ein Element, das beim Laden bereits im Viewport sichtbar ist, hat seinen Entry-Bereich bereits durchlaufen und lässt sich darüber nicht mehr animieren. Zusätzlich kann der `entry`-Bereich bei kurzen/flachen Elementen (z. B. eine nur 60 px hohe Headline) zu wenig Scrollstrecke liefern und dadurch wie ein Sprung statt eines Reveals wirken.
**Woran man es erkennt:** Above-the-fold-Elemente mit `view()`-Timeline zeigen beim Laden gar keine Animation; kurze Elemente „springen" beim Scroll-Reveal statt sanft einzusteigen — messbar, wenn der Offset zwischen zwei nahen Scroll-Samples direkt von einem größeren Wert auf 0 springt statt gleichmäßig abzustufen.
**Fix:** Für Above-the-fold-Inhalt, der schon beim Laden sichtbar ist, eine zeitbasierte Sequenz statt einer Scroll-Timeline verwenden (z. B. Web-Animations-API mit Delay-Kette). Für kurze/flache Zielelemente den benannten Range von `entry` auf `cover` umstellen, wo ein Prozentsatz der Timeline durchgängig eine sinnvolle Scrollstrecke bedeutet.
**Beleg:** mccain-digital, commit `ab05b06` (2026-09-01): Hero-Sequenz läuft zeitbasiert (Regel, Eyebrow, Wörter, Platte, Zahlen; fertig nach 1,1 s; Opacity-Sampling 0,24/0,12/0,01 bei 120 ms, sauberer Verlauf bei 300 ms) statt über `view()`; `entry` → `cover` bei einer flachen Überschrift: Wortversatz-Abstufung vorher 62 → 0 (Sprung), nachher 62 → 38/44/50/56 → 0/5/11/17 → 0 (gleichmäßig) · Sicherheit: gemessen
**Gilt für:** allgemein

### 8. Above-the-Fold-Inhalt nicht per Scroll-Reveal oder Fade animieren
**Warum:** Fade-/Reveal-on-Scroll-Logik auf Inhalt, der beim Laden bereits im ersten Viewport sichtbar ist, verzögert die gefühlte Fertigstellung des Layouts und kann von Accessibility-Audits (`axe`) mitten im Übergang erwischt werden — die halbtransparente Zwischenfarbe liest sich dann als Kontrastfehler.
**Woran man es erkennt:** `axe`-Scans melden Kontrastfehler auf Elementen mit aktiver Reveal-/Fade-Klasse, typischerweise auf dem ersten Band direkt nach dem Hero.
**Fix:** Die Reveal-/Fade-Animation für Inhalt im ersten Bildschirm entfernen — dieser Inhalt lädt sofort im Endzustand; Reveal-Animationen nur für Inhalt einsetzen, der erst durch Scrollen ins Bild kommt.
**Beleg:** mccain-digital, commit `16dabe6` (2026-08-03) und HANDOFF.md Zeile 3558-3563/3735-3737 (dieselbe Ursache, unabhängig gefunden): A11y-Score 95/96 → 100 auf Contact- und Service-Seiten · Sicherheit: gemessen
**Gilt für:** statisches HTML

### 9. Animationsphase aus Wall-Clock-Zeit ableiten, Loops um ein Vielfaches der Periode verschieben
**Warum:** Wird die Phase einer Animation aus einem Frame-Zähler und der Elementposition abgeleitet, hängt die wahrgenommene Geschwindigkeit von Bildwiederholrate und Boxgröße ab — zwei gleich gemeinte Effekte liefen im Projekt mit 127 px/s gegenüber 9 px/s auseinander. Für eine nahtlose Loop-Animation (driftendes Muster) erzeugt ein beliebiger Reset-Punkt einen sichtbaren Sprung; verschiebt sich das Muster dagegen um ein exaktes ganzzahliges Vielfaches seiner eigenen Periode, ist der Loop-Reset pixelgleich mit dem Ausgangsbild.
**Woran man es erkennt:** Zwei augenscheinlich gleich schnelle Animationen laufen auf verschiedenen Geräten/Displays unterschiedlich schnell; eine Loop-Animation zeigt einen sichtbaren Ruckler am Wiederholungspunkt.
**Fix:** Phase aus verstrichener Wall-Clock-Zeit und Seitenposition berechnen statt aus Frame-Zähler und Elementposition — bleibt auf 30-Hz- und 120-Hz-Displays gleich schnell. Die Translationsdistanz einer Loop-Animation stets auf ein ganzzahliges Vielfaches der Muster-/Kachelperiode legen.
**Beleg:** mccain-digital, commit `d8948b9` (2026-09-01, Wall-Clock-Phase) und commit `4d58954` (2026-09-01, Periodenvielfaches; dieselbe Technik zusätzlich für Headline-Wave und Assistenten-Rand verwendet, drei Effekte ohne sichtbaren Sprung) · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 10. Eine modernere Web-API nicht ohne bestehenden Bedarf migrieren
**Warum:** Eine modernere Web-API (hier: CSS `view()`-Timelines als Ersatz für eine bestehende JS-Reveal-Lösung) sollte nicht allein wegen ihrer Modernität übernommen werden — zuerst prüfen, ob das zugrunde liegende Performance-Problem überhaupt noch besteht, und das tatsächliche UX-Verhalten der Alternative gegen den erhofften, möglicherweise gar nicht vorhandenen Vorteil abwägen.
**Woran man es erkennt:** Eine geplante Migration hat keinen an einer aktuellen Messung festgemachten Grund.
**Fix:** Migration unterlassen, wenn die Zielmetrik bereits am Optimum liegt und die Alternative einen unerwünschten UX-Nebeneffekt hätte — hier: `view()`-Timelines hätten die Reveal-Animation beim Zurückscrollen ungewollt zurückgespult.
**Beleg:** mccain-digital, CHANGELOG.md „## 2026-06-12 — Awwwards-Welle B+C" Zeilen 842-843: „TBT ist bereits 0" · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 11. Eine rAF-Schleife für interaktionsgebundene Effekte soll sich selbst schlafen legen
**Warum:** Ein Effekt, der nur bei bestimmten Ereignissen (Scroll, Hover, Interaktion) sichtbar etwas tut, verschwendet bei dauerhaft laufender `requestAnimationFrame`-Schleife kontinuierlich Hauptthread-/Akkukosten, solange niemand interagiert.
**Woran man es erkennt:** `scripts/observers.mjs`/Profiler zeigen eine konstant aktive rAF-Schleife auch ganz ohne Nutzerinteraktion.
**Fix:** Die Schleife „self-sleeping" bauen — nur bei Scroll/Hover/Interaktion laufen lassen, sonst von selbst pausieren.
**Beleg:** mccain-digital, CHANGELOG.md „## 2026-06-12 — Welle H" Zeilen 718-719 (Pac-Bar-Canvas-Animation) · Sicherheit: vermutet
**Gilt für:** allgemein

### 12. Für Scroll-Choreografien Transform-Einzeleigenschaften statt der Shorthand verwenden
**Warum:** Eine Animation auf die `transform`-Shorthand überschreibt jeden `:hover`-`transform` auf demselben Element vollständig — Chip- und Karten-Hover-Lift-Effekte wirken dann „still tot". Die CSS-Einzeleigenschaften `translate`, `scale`, `rotate` koexistieren dagegen unabhängig von einer `:hover`-Regel auf `transform`.
**Woran man es erkennt:** Ein per `:hover` erwarteter Lift-/Scale-Effekt zeigt keine Wirkung auf Elementen, die gleichzeitig eine Scroll-Choreografie mit `transform`-Shorthand tragen.
**Fix:** Scroll-Choreografien auf `translate`/`scale`/`rotate` umstellen statt auf `transform`, wenn dasselbe Element an anderer Stelle ebenfalls einen Transform erhalten soll (z. B. `:hover`).
**Beleg:** mccain-digital, HANDOFF.md „Bekannte Fallstricke der Scroll-Choreografie" Zeile 3475-3477 · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 13. Vor einer Animationsbibliothek natives CSS oder einen eigenen Wrapper prüfen
**Warum:** Für einfache Scroll-Reveal-Effekte (Fade/Slide-in beim Scrollen) und Smooth-Scroll braucht es in der Regel keine vollständige Animationsbibliothek (GSAP, Framer Motion) — ein selbstgebauter `IntersectionObserver`-Wrapper oder native CSS-`view()`-Timelines decken den Fall ab und sparen das komplette Library-Bundle. Für Smooth-Scroll auf einer Multi-Tenant-Plattform ist ein MIT-lizenziertes, kleines Paket (Lenis, ~3 kB gzipped) einem kostenpflichtigen Club-GreenSock-Plugin (ScrollSmoother) vorzuziehen, das sonst pro Kunde einen eigenen Lizenzvertrag erfordert hätte.
**Woran man es erkennt:** Ein Bundle-Analyse zeigt eine vollständige Animationsbibliothek für einfache Fade/Slide-Reveals; eine Lizenzprüfung zeigt ein kostenpflichtiges Plugin für eine Multi-Tenant-Plattform.
**Fix:** Für einfache Scroll-Reveals einen eigenen `IntersectionObserver`-Wrapper bauen, der Geschwister-Elemente über eine CSS-Variable staggert; Server und erster Client-Paint rendern den Inhalt vollständig sichtbar (kein FOUC), JS „armt" das Element erst nach dem Mount, ohne JS bzw. bei `prefers-reduced-motion` zeigt sich der Inhalt direkt. Für wortweise Reveals native `view()`-Timelines nutzen (Wörter per `TreeWalker` **nur** über Textknoten in Spans zerlegen, damit `<br>` und Inline-Formatierung erhalten bleiben; Maske per `overflow: clip`). Für Smooth-Scroll auf Multi-Tenant-Plattformen Lenis statt ScrollSmoother, mit `ScrollTrigger.scrollerProxy` für Kompatibilität zu bestehenden Scroll-Triggers und `smoothTouch: false` als Default (natives Touch-Scrolling ist bereits smooth, Software-Smoothing kostet auf Low-End-Geräten Frames).
**Beleg:** whatever-recall-internal/CHANGELOG.md 2026-06-16 (Reveal.tsx, SSR-verifiziert: HTML trägt Content ohne `is-armed`-Klasse) · mccain-cms .claude/docs/decisions.md ADR-034 und CHANGELOG.md alpha.96 Sprint 09.8 (Lenis-Ersatz) · mccain-digital HANDOFF.md „DER REFRESH" Unterpunkt 1 (ca. Zeile 2432-2436, native Wort-Reveal): 43 Wort-Timelines bei 0 Long Tasks, p90 16,9 ms, p99 17,1 ms nach dem `will-change`-Fix aus Regel 2 · Sicherheit: dokumentiert
**Gilt für:** allgemein · siehe auch [[web-skills-suite]], [[neue-webseite]]

### 14. Früher First Paint, später Speed Index durch weiterlaufende Einblend-Animationen
**Warum:** Speed Index kann trotz früher FCP/LCP schlecht bleiben, wenn CSS-Animationen — auch rein CSS-basierte, JS-unabhängige `animation`-Deklarationen direkt am Element — nach dem ersten Paint weiterlaufen und die visuelle Fertigstellung der Seite verzögern. FCP/LCP allein zeigen dieses Problem nicht, weil beide nur den ersten sichtbaren Inhalt messen, nicht wann die Seite optisch „fertig" wirkt.
**Woran man es erkennt:** Speed Index liegt deutlich über FCP/LCP in derselben Messreihe, auch in einer Variante ganz ohne JavaScript.
**Fix:** Wurzelursache meist dieselbe wie bei Regel 27 in [rendern-hauptthread.md](rendern-hauptthread.md#27-tausende-individuelle-inline-styles-kosten-tbt-auch-ganz-ohne-javascript) (zu viele Knoten mit je eigenem Inline-Stil/eigener Animation) — Inline-Styles/Animationen in Klassen konsolidieren, Zahl gleichzeitig laufender Einblend-Animationen reduzieren.
**Beleg:** mccain-digital, HANDOFF.md Zeilen 798-806: Speed Index 3.386 ms bei FCP 972 ms / LCP 1.880 ms in der reinen HTML-Fassung ohne JS · Sicherheit: gemessen
**Gilt für:** statisches HTML

### 15. Den wahren Verursacher isoliert messen statt der naheliegenden Komponente die Schuld zu geben
**Warum:** Viele kleine, gleichzeitig unendlich laufende CSS-/SVG-Animationen auf denselben Elementen können trotz winziger visueller Fläche mehr Hauptthread-Zeit kosten als ein großflächiger, augenscheinlich „teurerer" Canvas/WebGL-Effekt — die naheliegende Vermutung (großer sichtbarer Effekt = Hauptverdächtiger) kann komplett danebenliegen. Nur eine echte A/B-Isolation (eine Variable geändert, sonst identisch) zeigt den tatsächlichen Anteil.
**Woran man es erkennt:** Vier identische Lighthouse-Läufe, die sich nur durch ein eingeschobenes Stylesheet unterscheiden, zeigen den Score-/TBT-Sprung bei genau einer Variante.
**Fix:** Vor einer Optimierung den tatsächlichen Verursacher isoliert messen (ein Stylesheet/eine Komponente gezielt deaktivieren, Rest unverändert), statt der naheliegenden Komponente die Schuld zu geben. Bei vielen kleinen, gleichzeitig laufenden CSS-Animationen auf einem winzigen Element (z. B. einem Logo-SVG) den Modus auf „static" umstellen, sofern eine Komponente das unterstützt; ein Wächter, der Modus-Vorkommen zählt, verhindert versehentliche Rückfälle. Danach sind ursprünglich geplante Folge-Optimierungen (hier: Animationen außerhalb des Sichtfelds pausieren) unter Umständen bereits hinfällig und sollten neu bewertet, nicht blind umgesetzt werden. Als dauerhafte Lösung, wenn die Animation optisch erhalten bleiben soll: eine `<canvas>`-Zeichnung mit einem einzigen Zeichenaufruf pro Frame kann dieselbe Optik liefern wie dutzende parallele CSS-Keyframe-Animationen, deutlich günstiger für den Hauptthread.
**Beleg:** mccain-digital, HANDOFF.md „Ebenfalls freigegeben" Zeilen 877-885 und „A — Performance" Zeilen 924-947 (Vier-Varianten-Vergleich: unverändert Score 63/TBT 1.026 ms/8.497 ms Hauptthread; Datenstrom aus Score 64/TBT 1.010 ms/8.485 ms; Logo-Animation aus Score 68/TBT 778 ms/4.971 ms): 146 der 170 unendlichen Animationen der Startseite liefen in einem einzigen 34×34-px-`<svg>` mit 146 `<rect>`-Elementen; nach Fix (Modus „static", 1,6-s-Loop-Timer entfernt) noch 24 statt 270 laufende Animationen auf der Startseite, geplanter nächster Schritt Canvas-Migration mit Owner-Freigabe · Sicherheit: gemessen
**Gilt für:** allgemein

### 16. `will-change: transform` oder eine erzwungene Compositing-Ebene nie mit `background-clip: text` kombinieren
**Warum:** `-webkit-background-clip: text` malt den Hintergrund durch die Glyphen. Wird dasselbe Element oder ein Nachfahre per `will-change: transform`, `transform`- oder `opacity`-Animation auf eine eigene Compositing-Ebene gehoben, rastert Chrome Text und Hintergrund getrennt, und der Clip greift nicht mehr: Verlaufstext wird unsichtbar oder zeigt seinen Hintergrundkasten.
**Woran man es erkennt:** Verlaufs- oder Bildtext verschwindet oder zeigt einen Kasten, sobald Hover-/Reveal-Animationen laufen oder ein `will-change` gesetzt ist. Im Projekt dreimal in neuen Komponenten derselben Canvas-Engine (Ghost-Buttons 06/2026, Work-Karten und Headlines 08/2026, AI-Wort-Welle 09/2026), jedes Mal erst nach dem Bau entdeckt.
**Fix:** Den geclippten Text in ein eigenes Element ohne `will-change` legen; animiert wird ein Wrapper ohne `background-clip`. Hover-Effekte auf Verlaufstext über `opacity`/`transform` des Wrappers, nie auf dem geclippten Element. Kein pauschales `will-change` (siehe Regel 2). Ein Lint- oder Test-Check, der `background-clip: text` neben `will-change`/`transform` im selben Element oder Nachfahren meldet, lohnt sich bei jeder Engine, die beides nutzt.
**Beleg:** mccain-digital, drei Fälle ([fallstudien.md](fallstudien.md), 2026-06-12, 2026-08-31, 2026-09-02/10) · Sicherheit: gemessen (Effekt), vermutet (Compositing-Mechanismus)
**Gilt für:** allgemein

## Offene Fragen

- **Compositor-Support für background-color/clip-path:** Die exakte Chrome-Version, ab der diese beiden Eigenschaften standardmäßig/vollständig auf dem Compositor laufen, ließ sich nicht finden — der Chrome-Blog nennt sie nur als „planned", Community-Bugreports bis Chrome ~151 deuten auf einen noch nicht vollständig ausgereiften Rollout hin. Vor Verwendung als „sicher compositable" in dieser Doku: aktuellen Chrome-Stable direkt im DevTools-„non-composited animations"-Insight testen (betrifft Regel 1).

## Quellen

- https://gist.github.com/paulirish/5d52fb081b3570c81e3a
- https://github.com/GoogleChrome/lighthouse/blob/main/core/audits/non-composited-animations.js
- https://developer.chrome.com/blog/hardware-accelerated-animations
- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/will-change
- https://web.dev/articles/prefers-reduced-motion
