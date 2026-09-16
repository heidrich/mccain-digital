# Wie Lighthouse und PageSpeed Insights bewerten — html-performance

> Teil des Skills [[html-performance]] · Stand 2026-09-16 · Belege: mccain-digital (HANDOFF, CHANGELOG, Commits), weitere Projekte des Owners, Recherche mit Quell-URLs

Bezug: Lighthouse 13.4.1 (main-Branch/npm latest, Stand 2026-09-16). Insights, Schwellen und Konfigurationswerte ändern sich mit Major-Versionen — Version bei jeder Neubewertung gegenprüfen. Wie man misst und Ergebnisse liest: [messen.md](messen.md). Wie man Ursachen behebt: [laden-kritischer-pfad.md](laden-kritischer-pfad.md), [laden-javascript.md](laden-javascript.md), [laden-auslieferung.md](laden-auslieferung.md) (Laden) und [rendern-hauptthread.md](rendern-hauptthread.md), [rendern-animationen.md](rendern-animationen.md), [rendern-canvas-webgl.md](rendern-canvas-webgl.md) (Laufzeit). Datierte Fälle mit vollem Zahlenverlauf: [fallstudien.md](fallstudien.md). Widerlegte Annahmen im Detail: [widerlegt.md](widerlegt.md).

## Kurzfassung

- **Rechne mit einem neuen LCP-Kandidaten bis Klick, Tap, Taste oder Scroll** — die Stop-Bedingung greift in einem automatisierten PSI-Lauf praktisch nie ([→](#1-rechne-mit-einem-neuen-lcp-kandidaten-bis-klick-tap-taste-oder-scroll))
- **Rechne beim PSI-Standard mit 1000 ms Ruhefenster, nicht 5250 ms** — die 5250 ms gelten nur, wenn throttlingMethod ≠ simulate ([→](#2-rechne-beim-psi-standard-mit-1000-ms-ruhefenster-nicht-5250-ms))
- **Rechne damit, dass eine späte Aufgabe das TTI-Fenster neu startet** — sie zieht weitere Long Tasks ins TBT-Fenster ([→](#3-rechne-damit-dass-eine-späte-aufgabe-das-tti-fenster-neu-startet))
- **Verlass dich bei einer PSI-Regression nicht auf einen stillen lokalen Lauf** — der 95→60-Fall reproduzierte sich in keiner von sechs lokalen Konfigurationen ([→](#4-verlass-dich-bei-einer-psi-regression-nicht-auf-einen-stillen-lokalen-lauf))
- **Erkenne die vier Ausnahmen vom größer-gewinnt-Mechanismus** — Vollbild, ≤3px-Rauschen, opacity:0-Text, entfernte Elemente ([→](#5-erkenne-die-vier-ausnahmen-vom-größer-gewinnt-mechanismus))
- **Erwarte, dass Gradient-Platzhalter und hochskalierte Bilder aus dem Rennen fallen** — Bytegewicht- und Upscaling-Heuristik ([→](#6-erwarte-dass-gradient-platzhalter-und-hochskalierte-bilder-aus-dem-rennen-fallen))
- **Erwarte pro Element nur einen LCP-Eintrag, auch bei Font-Swap** — nur ein neues, größeres Element erzeugt einen neuen Kandidaten ([→](#7-erwarte-pro-element-nur-einen-lcp-eintrag-auch-bei-font-swap))
- **Prüfe den Eigenanteil des benannten LCP-Elements, bevor du es änderst** — benannt ≠ Ursache ([→](#8-prüfe-den-eigenanteil-des-benannten-lcp-elements-bevor-du-es-änderst))
- **Rechne TBT nur aus Millisekunden über 50 ms pro Aufgabe** — Gesamtzeit senken bewegt TBT kaum ([→](#9-rechne-tbt-nur-aus-millisekunden-über-50-ms-pro-aufgabe))
- **Nimm für CLS die größte Session-Fenster-Summe, nicht die Summe aller Shifts** — <1 s Abstand, max. 5 s Fenster ([→](#10-nimm-für-cls-die-größte-session-fenster-summe-nicht-die-summe-aller-shifts))
- **Erwarte von PSI nie einen Lab-INP-Wert** — notApplicable unter simulate, Gewicht 0 ([→](#11-erwarte-von-psi-nie-einen-lab-inp-wert))
- **Trenn FCP und Speed Index von Interaktivität** — beide messen sichtbaren Fortschritt, keine Bedienbarkeit ([→](#12-trenn-fcp-und-speed-index-von-interaktivität))
- **Kenn die Gewichte: FCP 10, SI 10, LCP 25, TBT 30, CLS 25** — INP und TTI zählen mit 0 ([→](#13-kenn-die-gewichte-fcp-10-si-10-lcp-25-tbt-30-cls-25))
- **Lies den Score als log-normale Kurve, nicht als lineare Skala** — p10 ≈ Score 0,9, Median ≈ Score 0,5 ([→](#14-lies-den-score-als-log-normale-kurve-nicht-als-lineare-skala))
- **Nimm für PSI mobil CPU-Faktor 1,2 an, nicht 4** — 4× ist nur der generische CLI/DevTools-Default ([→](#15-nimm-für-psi-mobil-cpu-faktor-12-an-nicht-4))
- **Behandle simulierte Werte als Lantern-Nachbau, nicht als Messung** — Divergenzen bis ~5× sind dokumentiert ([→](#16-behandle-simulierte-werte-als-lantern-nachbau-nicht-als-messung))
- **Erwarte modern-http-insight und bf-cache nie im PSI-Report** — bewusst per skipAudits entfernt ([→](#17-erwarte-modern-http-insight-und-bf-cache-nie-im-psi-report))
- **Lies lcp-breakdown-insight, nicht largest-contentful-paint-element** — der alte Audit-Key existiert in LH 13 nicht mehr ([→](#18-lies-lcp-breakdown-insight-nicht-largest-contentful-paint-element))
- **Erwarte beim Cache-Insight ein Altersdezil-Modell, keine starre 30-Tage-Grenze** ([→](#19-erwarte-beim-cache-insight-ein-altersdezil-modell-keine-starre-30-tage-grenze))
- **Lies "Keine Daten" als Popularitäts-Grenze, nicht als perfekten Wert** — CrUX braucht Auffindbarkeit + Mindest-Traffic ([→](#20-lies-keine-daten-als-popularitäts-grenze-nicht-als-perfekten-wert))
- **Miss mobil immer mehrfach und nimm den Median** — 91/97/91 bei drei Läufen derselben Seite ([→](#21-miss-mobil-immer-mehrfach-und-nimm-den-median))
- **Kopiere lr-mobile-config.js/lr-desktop-config.js 1:1, statt Presets zu raten** ([→](#22-kopiere-lr-mobile-configjslr-desktop-configjs-11-statt-presets-zu-raten))
- **Zieh bei einem Ausreißer den JSON-Report, bevor du debuggst** — kann ein Throttling-Artefakt der Testmaschine sein ([→](#23-zieh-bei-einem-ausreißer-den-json-report-bevor-du-debuggst))
- **Erkenne Skript-Kosten-Attribution auf die Dokument-URL, keine Mehrfachanfrage** — dieselbe URL kann als Attributions-Label mehrfach erscheinen, ohne echte Mehrfachanfrage zu sein ([→](#24-erkenne-skript-kosten-attribution-auf-die-dokument-url-keine-mehrfachanfrage))

## Inhalt

- [Das Messfenster: wann Lighthouse aufhört zu messen](#das-messfenster-wann-lighthouse-aufhört-zu-messen)
- [LCP: wie der Kandidat bestimmt wird](#lcp-wie-der-kandidat-bestimmt-wird)
- [Metrikdefinitionen: FCP, TBT, Speed Index, CLS, INP](#metrikdefinitionen-fcp-tbt-speed-index-cls-inp)
- [Score-Gewichte und die log-normale Kurve](#score-gewichte-und-die-log-normale-kurve)
- [PSI/Lightrider: die tatsächliche Konfiguration](#psilightrider-die-tatsächliche-konfiguration)
- [Die 17 Performance-Insights (Lighthouse 13)](#die-17-performance-insights-lighthouse-13)
- [CrUX-Felddaten](#crux-felddaten)
- [PSI lokal nachstellen](#psi-lokal-nachstellen)

## Das Messfenster: wann Lighthouse aufhört zu messen

Die teuerste falsche Annahme über PSI: dass die Messung endet, sobald die Seite "sichtbar fertig" ist. Sie endet, wenn Lighthouse aufhört, Trace und Netzwerk aufzuzeichnen — und das kann deutlich länger dauern, mit direkten Folgen für LCP und TBT.

### 1. Rechne mit einem neuen LCP-Kandidaten bis Klick, Tap, Taste oder Scroll
**Warum:** Der LCP-Algorithmus (W3C-Spezifikation) vergleicht bei jedem Paint die Fläche des neu gemalten Bild-/Textknotens gegen die bisher größte Fläche; ist die neue Fläche größer, wird sie sofort neuer Kandidat. Das Reporting stoppt erst, wenn ein "trusted" Scroll-Event auftritt oder ein vollständiger Klick/Tap (pointerdown+up bzw. click) oder ein vollständiger Tastendruck (keydown+keyup) eine interactionId erzeugt. Reine Mausbewegung/Hover erzeugt keine interactionId und stoppt nichts. In einem normalen automatisierten Lighthouse-/PSI-Lauf (navigation-Modus) klickt, tippt und scrollt niemand — diese Stop-Bedingung greift dort praktisch nie. Was den Wettbewerb tatsächlich beendet, ist ausschließlich das Ende der Aufzeichnung (nächste Regel).
**Woran man es erkennt:** Mit `scripts/lcp-window.mjs <url> --for 30`: mehrere LCP-Kandidaten-Zeitpunkte statt einem; im Rohtrace mehrere `largestContentfulPaint::Candidate`-Events, jedes mit größerer `size` (px²) als das vorherige — das letzte vor Tracende zählt.
**Fix:** Fix siehe [laden-kritischer-pfad.md](laden-kritischer-pfad.md#5-nach-dem-ersten-render-darf-kein-element-größer-werden-als-der-lcp-kandidat) (kein Element darf nach dem ersten sichtbaren Laden größer neu erscheinen als der bisherige LCP-Kandidat).
**Beleg:** W3C Largest Contentful Paint, Abschnitt "Report largest contentful paint"; Event-Timing-Spezifikation für die interactionId-Auflösung (keyup/compositionstart/input/pointercancel/pointerup/click/contextmenu inkl. gepaarter keydown/pointerdown). Sicherheit: dokumentiert
**Gilt für:** allgemein

### 2. Rechne beim PSI-Standard mit 1000 ms Ruhefenster, nicht 5250 ms
**Warum:** Verbreitete (auch projektintern dokumentierte) Annahme war: "PSI misst bis ~5,25 s Ruhe ohne lange Aufgaben und ohne Netzverkehr." Das ist falsch. Die 5250-ms-Werte existieren im Code (`nonSimulatedSettingsOverrides`, `core/config/config.js`), greifen laut `overrideThrottlingWindows(settings)` aber NUR, wenn `throttlingMethod` NICHT `simulate` ist (`if (settings.throttlingMethod === 'simulate') return;`). PSI/Lightrider bleibt laut `lr-mobile-config.js`/`lr-desktop-config.js` UND laut offizieller Doku ("PageSpeed Insights always use simulated throttling") immer bei `simulate` — die vier Ruhefenster-Einstellungen (`pauseAfterFcpMs`, `pauseAfterLoadMs`, `networkQuietThresholdMs`, `cpuQuietThresholdMs`) bleiben für PSI beim generischen Default von 1000 ms. Was die lr-Configs tatsächlich überschreiben, ist `maxWaitForFcp` (15.000 ms) und `maxWaitForLoad` (35.000 ms) — für mobil UND Desktop, und beides NIEDRIGER als der CLI-Default (30.000 ms/45.000 ms), nicht höher. Praktisch: Lighthouse hört auf zu beobachten, sobald 1 s lang weder neue Netzwerk-Requests noch CPU-Long-Tasks aufgetreten sind — reißt ein neuer Request/eine neue Aufgabe diese Ruhe ab, verlängert sich die Beobachtung erneut, bis maximal 35 s erreicht sind.
**Woran man es erkennt:** `scripts/lighthouse-psi.mjs` bzw. die Felder `observedTraceEnd`/`timing.total` im Lighthouse-JSON.
**Fix:** n/a — bei spätem Nachladen/Timern die tatsächliche 35-s-Grenze im Kopf behalten, nicht 5,25 s. Herkunft der falschen Annahme: [widerlegt.md](widerlegt.md).
**Beleg:** Lighthouse `core/config/config.js` (`overrideThrottlingWindows`), `core/config/constants.js` (`defaultSettings`), `core/config/lr-mobile-config.js`/`lr-desktop-config.js`, `docs/throttling.md`, alle Lighthouse 13.4.1, main-Branch, gelesen 2026-09-16. Sicherheit: dokumentiert
**Gilt für:** allgemein

### 3. Rechne damit, dass eine späte Aufgabe das TTI-Fenster neu startet
**Warum:** TBT ist laut Quellcode-Kommentar "die Summe aller Blocking Time zwischen First Contentful Paint und Interactive Time (TTI)" — jede Aufgabe über 50 ms trägt (Dauer − 50 ms) bei, alles davor/danach zählt nicht. Time to Interactive (TTI) hat zwar Gewicht 0 (Gruppe "hidden") im sichtbaren Score, wird aber weiterhin als eigener Audit UND als notwendige Abhängigkeit für das TBT-Fensterende berechnet (`Interactive.request(...)` im beobachteten Pfad, `LanternInteractive.request(...)` im simulierten). TTI selbst braucht ein Fenster von `REQUIRED_QUIET_WINDOW=5000 ms` ohne Long Task und mit höchstens `ALLOWED_CONCURRENT_REQUESTS=2` gleichzeitigen Requests, gerechnet ab FCP. Eine Aufgabe über 50 ms, die nach dem vermeintlich ruhigen Ladezeitpunkt anfällt, setzt dieses 5-Sekunden-Fenster zurück — sie zählt nicht nur selbst direkt zu TBT, sie verschiebt TTI nach hinten und zieht damit weitere, sonst ausgeschlossene Long Tasks mit ins TBT-Fenster. Besonders tückisch: Ein periodischer Task (`setInterval`) hat einen Wanduhr-Startabstand, der vom `cpuSlowdownMultiplier` unberührt bleibt, aber eine Ausführungsdauer, die mit ihm skaliert — auf einer langsameren Maschine schrumpft die Lücke zwischen zwei Tasks ohne Code-Änderung. Ein Task, der lokal die 5-s-Ruhe nur knapp einhält, kann auf der langsameren PSI-Lightrider-VM darunterfallen und TTI dauerhaft verschieben.
**Woran man es erkennt:** `scripts/mainthread.mjs --slices` bzw. `scripts/lcp-window.mjs --for 30`: Long Tasks nach der 5-s-Marke. Ein wiederkehrender Task mit nur knappem Puffer über der 5-s-Grenze (z. B. 6,5-s-Intervall, 6,4-s-Ruhelücke = 1,4 s Puffer) ist ein Warnsignal, auch wenn TTI lokal noch erreicht wird.
**Fix:** Fix siehe [laden-javascript.md](laden-javascript.md#4-nachladen-strikt-an-echte-nutzerabsicht-und-zeit-koppeln) und [rendern-hauptthread.md](rendern-hauptthread.md#22-nicht-kritische-beobachter-und-schwere-effekte-erst-nach-interaktion-aktivieren) (deferred/lazy Code ereignisgetrieben statt gebündelt initialisieren).
**Beleg:** Lighthouse `core/computed/metrics/total-blocking-time.js`, `core/computed/metrics/interactive.js`, Lighthouse 13.4.1. Projektfall 1: eine Long Task bei 10,4 s hielt das Fenster offen; nach Umstellung auf `contentvisibilityautostatechange`-getriebene, gebündelte Initialisierung verschwand sie (Long Tasks nach 5 s: 1→0; HANDOFF.md, "STAND 16.9. NACHMITTAGS", Zeile 80). Projektfall 2: ein `setInterval(…, 6500)` ohne sichtbare Wirkung auf 20 von 21 Seiten ließ nur 1,4 s Puffer über der 5-s-Grenze; nach Entfernen Ruhelücke 6,4→26,2 s, Long Tasks nach 5 s 4→0 (Commits 2713c58/55d2a32, 2026-09-13). Sicherheit: gemessen
**Gilt für:** allgemein

### 4. Verlass dich bei einer PSI-Regression nicht auf einen stillen lokalen Lauf
**Warum:** Eine rotierende Hero-Headline ließ das Owner-PageSpeed (mobil) von 95 auf 60 einbrechen: Varianten 2-4 der Headline wurden bei 13,5 s/20 s/26,5 s (CSS `animation-delay`) zu neuen, größeren LCP-Kandidaten (Regel 1), und zusätzliches Nachladen bei 7 s/10 s hielt das Ruhefenster offen (Regel 2) — externe PSI-Zahl laut Aufgabenstellung: Performance 60, LCP-Render-Delay 20.490 ms auf `span.v5-r`. **Ein direkter lokaler Nachbau desselben Commits (902108a) reproduziert diesen Mechanismus NICHT.** Im `simulate`-Modus (PSI-Standard) endet der lokale Trace bereits nach 2409-2413 ms — weit vor jeder Rotation. Im `devtools`-Modus endet er nach 13.266-13.279 ms — knapp VOR der ersten Rotation bei 13,5 s. Kein einziger lokaler Lauf (6 Konfigurationen, plus ein Zusatzlauf mit `maxWaitForFcp=300000`/`maxWaitForLoad=360000` statt PSI-eigenen 15.000/35.000 ms) zeigt ein Element der Klassen `v5-r`/`v5-w` als LCP-Kandidat.
**Woran man es erkennt:** Trace-Ende (`observedTraceEnd`, per Skript aus den letzten Trace-Events nachgerechnet) bei simulate ≈2,41 s, bei devtools ≈13,27 s (alter wie neuer Commit); im Zusatzlauf mit stark erhöhtem `maxWaitFor*` lag `observedLoad` bei nur 52 ms — es gab lokal schlicht keinen Grund, das Fenster offenzuhalten, weil nichts bei 7 s/10 s nachlud.
**Fix:** Ein unauffälliger lokaler Lauf widerlegt einen PSI-Befund nicht. Vier Kandidaten, warum die Live-/PSI-Umgebung den Mechanismus zeigte und der lokale Nachbau nicht — keiner davon in dieser Session gegeneinander getestet, alle **vermutet**: (1) Die auf der langsameren/geteilten Lightrider-VM real anfallenden Nachlade-/Long-Task-Zeitpunkte (7 s/10 s) können dort tatsächlich mehrere Sekunden später liegen als auf einer schnellen, isolierten lokalen Maschine, wodurch die 13,5-s-Rotation dort noch im offenen Fenster liegt. (2) Der `devtools`-Lauf verfehlte die 13,5-s-Rotation nur um 0,2-0,7 s — ein noch etwas langsameres Profil hätte sie vermutlich erfasst. (3) Der Zusatzlauf erhöhte nur `maxWaitForFcp`/`maxWaitForLoad` manuell, nicht die tatsächlichen PSI-Werte, UND lief gegen einen Server ohne jede 7-s/10-s-Nachladeaktivität — ein Lauf mit `--config-path=lr-mobile-config.js` direkt gegen den PSI-getesteten Live-Stand fehlt noch. (4) Unterschiedlicher Server-/Build-Zustand zwischen dem tatsächlichen PSI-Ziel (Live-Deployment) und dem hier gegen `prodserve.py` gemessenen Worktree-Stand kann Asset-Timings verschieben.
**Beleg:** Lokal gemessen (Lighthouse 13.4.1, Chrome for Testing 148.0.7778.96, `--headless=new`, 16.9.2026): OLD/NEW mobile simulate Score 100/100, LCP 1652/1652 ms simuliert, Trace-Ende 2409,6/2412,8 ms; OLD/NEW mobile devtools Score 97/100, LCP 1808/1720 ms, Trace-Ende 13266,0/13278,5 ms, LCP-Element beidemal `p.s122` (35956 px²); Zusatzlauf `maxWaitForFcp=300000`: Trace-Ende 127552,76 ms, LCP-Kandidat weiterhin nur `img.s23` (1156 px², ts 125225,56 ms). Externe PSI-Zahl (laut Aufgabenstellung, in dieser Session nicht reproduziert): Performance 60, LCP-Render-Delay 20.490 ms auf `span.v5-r`. Owner-Fix (Commit ca40094, nur noch eine Headline): PSI danach Performance 100, FCP 0,9 s, LCP 1,6 s, TBT 10 ms, CLS 0,002, SI 2,0 s. Sicherheit: gemessen
**Gilt für:** allgemein

## LCP: wie der Kandidat bestimmt wird

Innerhalb des offenen Fensters (oben) entscheidet der LCP-Algorithmus selbst, welcher Kandidat gewinnt. Die folgenden Regeln stammen direkt aus der W3C-Spezifikation, nicht aus Lighthouse-eigenem Code.

### 5. Erkenne die vier Ausnahmen vom größer-gewinnt-Mechanismus
**Warum:** Grundsätzlich gilt: Ist die Fläche eines neu gemalten Bild-/Textknotens größer als die des bisherigen Kandidaten, wird er neuer Kandidat (Regel 1). Vier Sonderfälle durchbrechen das: (1) Ein Kandidat, dessen Fläche exakt der Viewport-Fläche entspricht, wird NIE gezählt (`if size is equal to rootWidth times rootHeight, return null` — Heuristik gegen Splash-/Ladebildschirme). (2) Unterscheiden sich Breite UND Höhe des neuen Kandidaten jeweils um ≤3 px vom aktuellen, wird er verworfen (Rauschfilter gegen Sub-Pixel-Neuberechnungen). (3) Text mit Alpha-/Opacity-Wert ≤0 wird übersprungen, AUSSER er hat `text-shadow≠none`, `stroke-color≠transparent` oder `stroke-image≠none`. (4) Wird das aktuell größte Element aus DOM oder Viewport entfernt, bleibt es trotzdem der Kandidat, bis ein noch größeres erscheint — explizit als Limitation dokumentiert, wegen Bild-Karussells, was bei Splashscreens zum Problem wird.
**Woran man es erkennt:** Ein Karussell-Slide, das nach dem Wechsel aus dem DOM entfernt wird, taucht im Trace trotzdem weiter als LCP-Kandidat auf; ein knapp abweichender Reflow-Kandidat (±2 px) erzeugt keinen neuen `Candidate`-Event.
**Fix:** Fix siehe [laden-kritischer-pfad.md](laden-kritischer-pfad.md#4-fetchpriority-gezielt-und-sparsam-einsetzen-nie-zusammen-mit-loadinglazy-auf-demselben-bild)/[rendern-hauptthread.md](rendern-hauptthread.md#21-animationen-außerhalb-des-viewports-pausieren) (Slider/Carousel: nur das initial sichtbare Bild priorisieren).
**Beleg:** W3C Largest Contentful Paint, Abschnitte "Determine the effective visual size", "Report largest contentful paint", "1.3 Limitations" (Karussell-Zitat). Sicherheit: dokumentiert
**Gilt für:** allgemein

### 6. Erwarte, dass Gradient-Platzhalter und hochskalierte Bilder aus dem Rennen fallen
**Warum:** Ein Bild-Kandidat zählt nur, wenn sein Transfer-Byte-Gewicht mindestens 0,004 Bytes pro dargestelltem Pixel beträgt (`if content length < size * 0.004, return null`) — das filtert stark komprimierte Low-Content-Bilder (einfarbige Flächen, CSS-Gradient-Ersatzbilder) aus dem LCP-Wettbewerb, auch bei großer Fläche. Wird ein Bild über seine native Auflösung hinaus hochskaliert (`scaleFactor>1`), wird seine gemeldete Größe durch den Skalierungsfaktor geteilt — ein verschwommen hochgezogenes kleines Bild wiegt im Kandidatenvergleich also weniger, als seine dargestellte Fläche vermuten lässt.
**Woran man es erkennt:** Ein großflächiger, aber leichter Gradient-Hintergrund erscheint nie als LCP-Kandidat, obwohl er optisch den größten Bereich einnimmt.
**Fix:** Fix siehe [laden-kritischer-pfad.md](laden-kritischer-pfad.md#18-eine-reproduzierbare-bildpipeline-mit-festen-breiten-und-fester-webp-qualität-führen) (Bildpipeline: reale Auflösung statt Upscaling, keine Fake-Content-Platzhalter als LCP-Kandidat einplanen).
**Beleg:** W3C Largest Contentful Paint, Abschnitt "Determine the effective visual size of an element". Sicherheit: dokumentiert
**Gilt für:** allgemein

### 7. Erwarte pro Element nur einen LCP-Eintrag, auch bei Font-Swap
**Warum:** Jedes Bild bzw. jeder Textknoten wird laut Spezifikation genau EINMAL gemeldet — beim ersten Paint, bei dem es "paintable" (Opacity/Visibility erfüllt) UND "contentful" ist (Bild geladen bzw. blockierende Fonts ausreichend geladen). Ein späterer Web-Font-Swap am selben Element erzeugt KEINEN zweiten Eintrag; nur wenn der Swap ein ANDERES, jetzt größeres Element zum neuen Sieger macht, entsteht ein neuer Kandidat. Ebenso erzeugen spätere Animationen/Resizes desselben, bereits gemeldeten Elements keinen neuen Eintrag.
**Woran man es erkennt:** Ein Wechsel von Fallback- zu Webfont auf der H1 verändert die gemeldete LCP-Zeit nur, wenn dadurch ein anderer Textknoten größer wird als die H1 — nicht durch den Swap selbst.
**Fix:** n/a — bei Font-bedingter LCP-Verzögerung an `font-display`/Preload ansetzen ([laden-kritischer-pfad.md](laden-kritischer-pfad.md#fonts)), nicht am Kandidaten-Mechanismus.
**Beleg:** W3C Largest Contentful Paint, Abschnitt "Report largest contentful paint"; ergänzend web.dev/articles/lcp. Sicherheit: dokumentiert
**Gilt für:** allgemein

### 8. Prüfe den Eigenanteil des benannten LCP-Elements, bevor du es änderst
**Warum:** Das von Lighthouse/PSI als "LCP-Element" benannte Element ist nicht notwendigerweise die Ursache einer langen LCP-Zeit — `lcp-breakdown-insight` zerlegt LCP in `timeToFirstByte`, `resourceLoadDelay`, `resourceLoadDuration` und `elementRenderDelay`; oft steckt die eigentliche Verzögerung in vorgelagerter Hauptthread- oder Ressourcen-Ketten-Arbeit, während das Element selbst nur wenige Millisekunden beiträgt.
**Woran man es erkennt:** Ein Namens-Laufband (CSS-Marquee, neun Wörter) wurde als LCP-Element identifiziert, kostete aber gemessen nur 106 ms von insgesamt 3.659 ms LCP-Zeit (Vergleichsmessung mit/ohne Laufband: 3.659 ms vs. 3.553 ms).
**Fix:** Vor jeder Optimierung/Entfernung eines vermeintlichen LCP-Elements per A/B-Messung (mit/ohne) prüfen, wie viel Zeit es tatsächlich selbst beiträgt — Fix für die eigentliche Ursache dann in der passenden `laden-*`-/`rendern-*`-Referenz ([Regelindex](../SKILL.md#regelindex)).
**Beleg:** HANDOFF.md, Zeilen 1049-1053, 893-894, 703-704: 106 ms Differenz von 3.659 ms Gesamtzeit; Element unverändert belassen ("die Referenzen sind echt"). Sicherheit: gemessen
**Gilt für:** allgemein

## Metrikdefinitionen: FCP, TBT, Speed Index, CLS, INP

Kurzdefinitionen der fünf im Score gewichteten Lab-Metriken plus INP (Gewicht 0, Feld-only).

### 9. Rechne TBT nur aus Millisekunden über 50 ms pro Aufgabe
**Warum:** Total Blocking Time summiert ausschließlich den Anteil jeder Aufgabe, der 50 ms übersteigt (eine 110-ms-Aufgabe liefert 60 ms Blocking Time). Eine Reduktion der GESAMTEN Hauptthread- oder "Other"-Zeit verbessert TBT deshalb nicht zwangsläufig proportional — nur das Verkürzen oder Wegfallen von Aufgaben über 50 ms wirkt sich aus. Verteilt sich eingesparte Arbeit über viele kleine Tasks unter 50 ms, bewegt sich TBT kaum.
**Woran man es erkennt:** In einem Owner-Projekt halbierte sich "Other" (Desktop 1.340→641 ms) und die Hauptthread-Gesamtzeit sank deutlich (3.560→2.164 ms) — TBT blieb bei 28-29 ms praktisch unverändert, TTI verbesserte sich nur leicht (~340→~302 ms).
**Fix:** Bei der Erfolgsmessung TBT, TTI und Gesamtzeit gemeinsam betrachten, nicht nur eine Zahl als Stellvertreter nehmen; gezielt auf Aufgaben >50 ms zielen ([rendern-hauptthread.md](rendern-hauptthread.md#hauptthread-und-other)), nicht auf die Gesamtsumme.
**Beleg:** HANDOFF.md, "STAND 16.9. NACHMITTAGS", Zeilen 71-84. Sicherheit: gemessen
**Gilt für:** allgemein

### 10. Nimm für CLS die größte Session-Fenster-Summe, nicht die Summe aller Shifts
**Warum:** Layout-Shifts werden zu "Session-Fenstern" gruppiert: Ein Shift mit weniger als 1 s Abstand zum vorherigen gehört zum selben Fenster, ein Fenster dauert maximal 5 s. Der CLS-Wert ist die höchste kumulierte Shift-Summe unter allen Fenstern der gesamten Seiten-Lebensdauer — nicht die Summe aller einzelnen Shifts. Ein einzelner später, großer Sprung kann also mehr wiegen als viele kleine frühe Sprünge, wenn er allein ein eigenes Fenster bildet.
**Woran man es erkennt:** Lighthouse zeigt nur den finalen CLS-Wert; die zugrundeliegenden Fenster sieht man im DevTools-Performance-Panel (Experience-Spur) oder über `cls-culprits-insight` (Abschnitt "Die 17 Performance-Insights"), das je Cluster bis zu 3 Ursachen mit 500-ms-Rückschau meldet (Ursachentypen: WEB_FONT, IFRAMES, ANIMATIONS, UNSIZED_IMAGE).
**Fix:** Fix siehe [laden-kritischer-pfad.md](laden-kritischer-pfad.md#bilder)/[laden-kritischer-pfad.md](laden-kritischer-pfad.md#fonts) (Bild-/Embed-Maße, Font-Fallback-Metriken, keine späten Einschübe oberhalb des sichtbaren Bereichs).
**Beleg:** web.dev, "Cumulative Layout Shift (CLS)": Session-Fenster <1 s Abstand, max. 5 s Fensterdauer, CLS = Maximum der Fenstersummen; `cls-culprits-insight` ROOT_CAUSE_WINDOW=500ms, MAX_TOP_CULPRITS=3 (@paulirish/trace_engine, LH 13.4.1). Sicherheit: dokumentiert
**Gilt für:** allgemein

### 11. Erwarte von PSI nie einen Lab-INP-Wert
**Warum:** Der Audit `interaction-to-next-paint` hat `supportedModes:['timespan']` — er läuft nie im normalen Single-Page-Load/"navigation"-Modus, den PSI nutzt — und liefert zusätzlich `{score:null, notApplicable:true}`, sobald `throttlingMethod==='simulate'` ist, was bei PSI immer zutrifft (Kommentar im Code: "responsiveness isn't yet supported by lantern"). INP hat außerdem Gewicht 0 im Performance-Score (wird trotzdem in der Metrik-Gruppe angezeigt, sofern ein Feldwert existiert). INP löste FID am 12. März 2024 offiziell als Core Web Vital ab.
**Woran man es erkennt:** Ein PSI-Report enthält NIE einen Lab-INP-Wert — nur ggf. ein Feld-INP-Badge aus CrUX, wenn genug echte Nutzerdaten vorliegen (Abschnitt "CrUX-Felddaten").
**Fix:** Für echte INP-Optimierung auf Feld-/RUM-Daten oder eigene Timespan-/User-Flow-Messungen setzen, nicht auf einen PSI-Lab-Wert warten, der nie kommt. Debounce-/Remount-Muster gegen hochfrequente Interaktionen: [rendern-hauptthread.md](rendern-hauptthread.md#erzwungener-reflow).
**Beleg:** Lighthouse `core/audits/metrics/interaction-to-next-paint.js`, Lighthouse 13.4.1; INP-Ablösung von FID: web.dev/blog/inp-cwv-march-12 ("INP will officially become a Core Web Vital and replace FID on March 12" 2024). Sicherheit: dokumentiert
**Gilt für:** allgemein

### 12. Trenn FCP und Speed Index von Interaktivität
**Warum:** FCP ist der Zeitpunkt des ersten gerenderten Inhalts (Text, Bild, Canvas, nicht-weißes SVG) — nicht des größten (das ist LCP) und keine Aussage über Interaktivität. Speed Index misst, wie schnell sich der sichtbare Seiteninhalt WÄHREND des Ladens vervollständigt: Lighthouse zeichnet den Seitenaufbau als Video auf und berechnet den visuellen Fortschritt zwischen den Frames (Speedline-Modul, Methodik nach WebPageTest.org) — ein niedriger Wert bedeutet, dass der größte Teil des finalen Layouts früh sichtbar ist, unabhängig davon, wann die Seite tatsächlich bedienbar wird.
**Woran man es erkennt:** Eine Seite kann einen frühen FCP und dennoch einen späten Speed Index haben, wenn laufende Einblend-Animationen sie optisch lange "unfertig" wirken lassen, obwohl längst Inhalt gemalt wurde.
**Fix:** n/a — Fix für frühen FCP in [laden-kritischer-pfad.md](laden-kritischer-pfad.md) (kritischer Pfad, Fonts), für sauberen Speed-Index-Verlauf in [rendern-animationen.md](rendern-animationen.md#14-früher-first-paint-später-speed-index-durch-weiterlaufende-einblend-animationen) (keine späten/laufenden Einblendungen über sichtbarem Content).
**Beleg:** developer.chrome.com/docs/lighthouse/performance/speed-index; Lighthouse `core/config/default-config.js` (Metrik-Gewichte). Sicherheit: dokumentiert
**Gilt für:** allgemein

## Score-Gewichte und die log-normale Kurve

Wie aus den fünf Lab-Metriken der eine sichtbare Performance-Score (0-100) wird.

### 13. Kenn die Gewichte: FCP 10, SI 10, LCP 25, TBT 30, CLS 25
**Warum:** Der Performance-Score ist eine gewichtete Summe von fünf Lab-Metriken; INP (Gewicht 0, wird trotzdem angezeigt) und die alte TTI-Metrik (Gewicht 0, Gruppe "hidden") fließen NICHT in den sichtbaren Score ein, obwohl beide weiterhin berechnet werden (Regel 3, Regel 11).
**Woran man es erkennt:** `default-config.js`, category 'performance': first-contentful-paint 10, largest-contentful-paint 25, total-blocking-time 30, cumulative-layout-shift 25, speed-index 10, interaction-to-next-paint 0, interactive 0, max-potential-fid 0.
**Fix:** Optimierungsreihenfolge nach Gewicht: TBT (30) und LCP/CLS (je 25) zuerst, FCP/SI (je 10) folgen meist automatisch mit. Details: die `laden-*`- und `rendern-*`-Referenzen, siehe [Regelindex](../SKILL.md#regelindex).
**Beleg:** Lighthouse `core/config/default-config.js`, Lighthouse 13.4.1. Sicherheit: dokumentiert
**Gilt für:** allgemein

### 14. Lies den Score als log-normale Kurve, nicht als lineare Skala
**Warum:** Jede Metrik wird über eine log-normale Verteilung auf 0-1 abgebildet (Abramowitz-Stegun-Näherung der Gauß-Fehlerfunktion `erf`): der p10-Kontrollpunkt (10. Perzentil realer Websites) ergibt Score 0,9, der Median-Kontrollpunkt ergibt Score 0,5. Farbbänder: [0,9-1] grün/passing, [0,5-0,9) orange/average, [0-0,5) rot/failing. Werte über 0,9 bekommen einen kleinen Bonus (+0,05×(Perzentil-0,9)), damit nahezu perfekte Läufe auf 1 runden.
**Woran man es erkennt:** Ein LCP von genau 2500 ms (mobil) entspricht Score ≈0,9 (grün), 4000 ms ≈0,5 (Grenze orange/rot) — nicht linear zwischen "gut" und "schlecht" interpolierbar.
**Fix:** n/a — Referenzwerte für eigene Zielsetzung nutzen (Tabelle unten), keine lineare Interpolation zwischen zwei gemeldeten Werten annehmen.
**Beleg:** Lighthouse `shared/statistics.js` (`getLogNormalScore`, MIN_PASSING_SCORE=0.9, MIN_AVERAGE_SCORE=0.5) und `shared/util.js` (`computeLogNormalScore`, 0,9+-Bonus); p10/Median-Tabelle aus `core/audits/metrics/*.js`, Lighthouse 13.4.1. Sicherheit: dokumentiert
**Gilt für:** allgemein

| Metrik | Mobil p10 | Mobil Median | Desktop p10 | Desktop Median |
| --- | ---: | ---: | ---: | ---: |
| LCP | 2500 ms | 4000 ms | 1200 ms | 2400 ms |
| FCP | 1800 ms | 3000 ms | 934 ms | 1600 ms |
| Speed Index | 3387 ms | 5800 ms | 1311 ms | 2300 ms |
| TBT | 200 ms | 600 ms | 150 ms | 350 ms |
| CLS | 0,1 | 0,25 | 0,1 | 0,25 |
| TTI (hidden, Gewicht 0) | 3785 ms | 7300 ms | 2468 ms | 4500 ms |

## PSI/Lightrider: die tatsächliche Konfiguration

PSI heißt intern "Lightrider". Was es tatsächlich konfiguriert — nicht das, was als generischer Lighthouse-CLI-Default kursiert.

### 15. Nimm für PSI mobil CPU-Faktor 1,2 an, nicht 4
**Warum:** Der generische CLI-/DevTools-Panel-Default für gedrosseltes Mobil-Testing ist `cpuSlowdownMultiplier: 4` (mobileSlow4G-Preset) — das ist NICHT, was PSI mobil tatsächlich verwendet. `lr-mobile-config.js` überschreibt den Multiplikator explizit auf 1,2, begründet im Code-Kommentar mit dem PSI-eigenen CPU-Benchmark-Median: Die Lightrider-VMs sind schon von sich aus langsamer als eine typische Dev-Maschine, daher reicht ein kleinerer zusätzlicher Faktor für dasselbe Mid-Tier-Mobile-Ziel. PSI Desktop nutzt sogar `cpuSlowdownMultiplier: 1` (kein Throttle).
**Woran man es erkennt:** Ein lokaler Lauf mit `--throttling-method=devtools --form-factor=mobile` (CLI-Default 4×) liefert spürbar andere TBT-/Hauptthread-Werte als ein Lauf mit `--config-path=lr-mobile-config.js` (1,2×) — bei identischer Seite.
**Fix:** Für lokale PSI-Annäherung immer `--config-path=lr-mobile-config.js`/`lr-desktop-config.js` verwenden (Regel 22), nicht den CLI-Default mit `--throttling-method=devtools` und Faustzahl 4×.
**Beleg:** Lighthouse `core/config/lr-mobile-config.js`, Kommentar "Determined using PSI CPU benchmark median [...]", Lighthouse 13.4.1. Sicherheit: dokumentiert
**Gilt für:** allgemein

### 16. Behandle simulierte Werte als Lantern-Nachbau, nicht als Messung
**Warum:** PSI-Lab-Diagnosen laufen laut offizieller Doku IMMER mit `throttlingMethod: 'simulate'`, nie mit `devtools`. Dabei lädt Chrome die Seite einmal weitgehend ungedrosselt und zeichnet einen echten Trace auf; die Lantern-Engine baut daraus einen Netzwerk-/CPU-Abhängigkeitsgraphen und "spielt" ihn mit angepassten RTT-/Durchsatz-Werten und mit CPU-Knotendauer×`cpuSlowdownMultiplier` erneut ab. Die berichteten FCP-/LCP-/TBT-Werte sind SIMULIERTE, keine literal gestoppten Zeiten. Bekannter Schwachpunkt: Teilt sich eine einzelne langsame render-blockierende Anfrage die Origin mit mehreren schnellen, unterschätzt Lighthouse die Ladezeit (Optimistic-/Pessimistic-Graph-Mittelung).
**Woran man es erkennt:** Ein dokumentiertes Divergenz-Beispiel zeigt eine beobachtete/ungedrosselte LCP von 2,4 s, die auf 11,8 s simuliert wurde (~5×) — simulierte und beobachtete Werte können weit auseinanderliegen, ohne dass das ein Messfehler ist.
**Fix:** n/a — bei Unstimmigkeiten die `observedXxx`-Felder (echte Trace-Zeiten) gegen die simulierten Feld-für-Feld vergleichen, statt eines für falsch zu halten. Lokal nachstellen: Regel 22.
**Beleg:** Lighthouse `docs/throttling.md` ("The lab diagnostics on PageSpeed Insights always use simulated throttling."); Divergenz-Beispiel: calendar.perfplanet.com, "How does Lighthouse's simulated throttling work?" (2021, Kernmechanik laut Recherche unverändert für LH 13.x). Sicherheit: dokumentiert
**Gilt für:** allgemein

### 17. Erwarte modern-http-insight und bf-cache nie im PSI-Report
**Warum:** `lr-mobile-config.js`/`lr-desktop-config.js` setzen `skipAudits: ['modern-http-insight', 'bf-cache']`. Der HTTP-Versions-Audit wird laut Code-Kommentar übersprungen, "so it doesn't lie to us" (Lightrider-Infrastruktur kann die gemessene HTTP-Version verzerren; GitHub-Issue #6539); bf-cache wird übersprungen, weil er in Headless-Chrome immer fehlschlägt.
**Woran man es erkennt:** Ein lokaler Lauf ohne `--config-path` zeigt "Modern HTTP" und "Back/forward cache" an, der PSI-Report für dieselbe Seite nie — kein Bug, sondern bewusst konfiguriert.
**Fix:** n/a — diese zwei Audits nicht als "von PSI bewertet" erwarten; wer sie prüfen will, braucht einen separaten lokalen Lauf ohne `skipAudits`.
**Beleg:** Lighthouse `core/config/lr-mobile-config.js`, `skipAudits`-Array, Lighthouse 13.4.1. Sicherheit: dokumentiert
**Gilt für:** allgemein

`lr-mobile-config.js` und `lr-desktop-config.js` sind strukturell unterschiedlich gebaut: Mobil überschreibt innerhalb von `throttling` nur `cpuSlowdownMultiplier` (1,2) — Netzwerk (RTT/Durchsatz), Viewport und User-Agent kommen unverändert aus `lighthouse:default`, weil Formfaktor `mobile` dort ohnehin die Voreinstellung ist. Desktop ersetzt `throttling` dagegen komplett durch das Preset `desktopDense4G` und setzt `screenEmulation`/`emulatedUserAgent` explizit auf die Desktop-Werte, weil der Default sonst mobil bliebe. Die folgende Tabelle fasst beide Ergebnisse zusammen, unabhängig vom jeweiligen Zustandekommen.

| Parameter | PSI Mobil | PSI Desktop |
| --- | --- | --- |
| throttlingMethod | simulate | simulate |
| cpuSlowdownMultiplier | 1,2 | 1 |
| Viewport | 412×823 | 1350×940 |
| deviceScaleFactor | 1,75 | 1 |
| User-Agent-Gerät | "moto g power (2022)", Chrome/136.0.0.0 | Macintosh; Intel Mac OS X 10_15_7, Chrome/136.0.0.0 |
| Netzwerk-RTT | 150 ms | 40 ms |
| Durchsatz down | 1,6 Mbit/s (1638,4 Kbit/s) | 10 Mbit/s (10240 Kbit/s) |
| Durchsatz up | 750 Kbit/s | — |
| maxWaitForFcp | 15.000 ms | 15.000 ms |
| maxWaitForLoad | 35.000 ms | 35.000 ms |
| Ruhefenster (pauseAfterFcpMs u. a.) | 1000 ms (generischer Default, nicht überschrieben) | 1000 ms |
| skipAudits | modern-http-insight, bf-cache | modern-http-insight, bf-cache |

`DEVTOOLS_RTT_ADJUSTMENT_FACTOR=3,75` und `DEVTOOLS_THROUGHPUT_ADJUSTMENT_FACTOR=0,9` existieren im selben Lantern-Constants-Modul, korrigieren aber ausschließlich den `devtools`-Pfad (echtes `Network.emulateNetworkConditions` per CDP) — dort liest Lighthouse `requestLatencyMs`/`downloadThroughputKbps`/`uploadThroughputKbps`. Im `simulate`-Pfad, den PSI immer nutzt, liest `Simulator.createSimulator()` stattdessen direkt `throttling.rttMs`/`throttling.throughputKbps` — also die rohen, unkorrigierten 150 ms/1638,4 Kbit/s (mobil) bzw. 40 ms/10240 Kbit/s (Desktop) aus der Tabelle oben, ohne jede Korrektur. `desktopDense4G` setzt die DevTools-only-Felder (`requestLatencyMs`, `downloadThroughputKbps`, `uploadThroughputKbps`) sogar explizit auf 0 (unset), weil sie im simulate-Pfad nie gelesen werden. Die Chrome-Versionsnummer im User-Agent (136.0.0.0) ist nur ein grober Indikator für die Lightrider-Chrome-Version und kann von echtem Chrome Stable abweichen.

## Die 17 Performance-Insights (Lighthouse 13)

Seit Lighthouse 12/13 heißen die alten Performance-Audits "Insights" und liegen im externen Paket `@paulirish/trace_engine` (derselben Engine, die auch das Chrome-DevTools-Performance-Panel antreibt); `core/audits/insights/*.js` sind nur noch dünne Adapter (`adaptInsightToAuditProduct`). Von 17 Insights lösen 14 einen oder mehrere alte Audits ab (`replacesAudits`), 3 sind komplett neu: Forced reflow, Modern HTTP, Legacy JavaScript. Ein 18. Insight-Modul, `slow-css-selector-insight`, existiert im selben Paket und hat ebenfalls einen dünnen Lighthouse-Adapter (`core/audits/insights/slow-css-selector-insight.js`) — es fehlt aber in der Audit-Liste von `default-config.js` und läuft deshalb in keinem Lighthouse-13.4.1- oder PSI-Report.

### 18. Lies lcp-breakdown-insight, nicht largest-contentful-paint-element
**Warum:** Beim Umbau auf Insights verschwand der alte Audit-Key `largest-contentful-paint-element` ersatzlos aus `--only-categories=performance` — inhaltlich identisch ersetzt durch `lcp-breakdown-insight` (liefert Selector + TTFB/Load Delay/Load Duration/Render Delay statt eines einzelnen Elements).
**Woran man es erkennt:** Ein eigenes Auswertungsskript, das `report.audits['largest-contentful-paint-element']` ausliest, bekommt unter Lighthouse 13.4.1 mit `--only-categories=performance` `undefined`.
**Fix:** `audits['lcp-breakdown-insight']` lesen statt des alten Keys.
**Beleg:** Praktisch bestätigt an allen sechs lokalen Reports dieser Recherche (16.9.2026, Lighthouse 13.4.1: old/new-mobile-simulate.json, old/new-mobile-devtools.json, old-desktop-simulate.json, old-extended-diag.json); Lighthouse `core/audits/insights/`-Verzeichnis, `replacesAudits`-Felder. Sicherheit: gemessen
**Gilt für:** allgemein

| Insight (Titel) | Ersetzt | Prüft / Schwelle | Meldet |
| --- | --- | --- | --- |
| LCP breakdown | largest-contentful-paint-element | zerlegt LCP in 4 Phasen | timeToFirstByte, resourceLoadDelay, resourceLoadDuration, elementRenderDelay je in ms |
| LCP request discovery | prioritize-lcp-image + lcp-lazy-loaded | ist die LCP-Ressource sofort aus dem initialen HTML auffindbar, ist sie lazy-loaded | ja/nein je Kriterium |
| Forced reflow | (neu) | JS-Zugriffe auf geometrische Properties (z. B. `offsetWidth`) nach invalidierten Styles | Top-Function-Call- und Bottom-up-Liste, je mit exakter Quellcode-Position (URL/Zeile/Spalte) |
| Layout shift culprits | layout-shifts | ROOT_CAUSE_WINDOW=500 ms Rückschau je Shift-Cluster, max. 3 Ursachen/Cluster | Ursachentyp je Cluster: WEB_FONT, IFRAMES, ANIMATIONS, UNSIZED_IMAGE |
| INP breakdown | work-during-interaction | zerlegt die längste Interaktion | inputDelay, processingDuration (mainThreadHandling), presentationDelay — läuft in PSI nie (Regel 11) |
| Network dependency tree | critical-request-chains + uses-rel-preconnect | Ketten <50 ms ignoriert; Preconnect "verschwendet" ab 15 s ungenutzt; >4 Preconnects gelten als exzessiv | Abhängigkeitskette + überzählige/ungenutzte Preconnects |
| Render-blocking requests | render-blocking-resources | MINIMUM_WASTED_MS=50 ms | Requests mit geschätzter Verzögerung ≥50 ms |
| Font display | font-display | `font-display: swap`/`optional` empfohlen | Fonts mit wastedTime>0, erwähnt Font-Metric-Overrides |
| Use efficient cache lifetimes | uses-long-cache-ttl | ignoriert TTL≥30 Tage, IGNORE_THRESHOLD_IN_PERCENT=0,925, Altersdezil-Modell (Regel 19) | geschätzte Wasted Bytes je Ressource |
| Optimize DOM size | dom-size | DOM_SIZE_DURATION_THRESHOLD=40 ms, LAYOUT_OBJECTS_THRESHOLD=100, STYLE_RECALC_ELEMENTS_THRESHOLD=300 | gemessene Style-/Layout-Kosten statt starrer Knotenzahl |
| 3rd parties | third-party-summary | Hauptthread-/Transferkosten je Drittanbieter | Titel im UI exakt "3rd parties", nicht "Third parties" |
| Duplicated JavaScript | duplicated-javascript | ABSOLUTE_SIZE_THRESHOLD_BYTES=512 Bytes UND RELATIVE_SIZE_THRESHOLD=0,1 (10 % der größten Kopie) je Duplikat; Gruppe entfällt komplett, wenn danach <2 Kopien übrig bleiben | Summe aller Kopien außer der größten (estimatedDuplicateBytes) |
| Legacy JavaScript | (neu) | BYTE_THRESHOLD=5000 Bytes | Polyfills/Transforms für Baseline-Features ab 5000 Bytes |
| Improve image delivery | modern-image-formats + uses-optimized-images + efficient-animated-content + uses-responsive-images | TARGET_BYTES_PER_PIXEL_AVIF≈0,167 (2/12); GIF_SIZE_THRESHOLD=100 KB; BYTE_SAVINGS_THRESHOLD=4096 Byte; BYTE_SAVINGS_THRESHOLD_RESPONSIVE_BREAKPOINTS=12288 Byte | Ersparnis-Kategorie je Bild |
| Optimize viewport for mobile | viewport | fehlende Viewport-Optimierung, Interaktionen mit inputDelay≥50000µs | Risiko von bis zu 300 ms Tap-Delay |
| Document request latency | redirects + server-response-time + uses-text-compression | TOO_SLOW_THRESHOLD_MS=600 (TTFB), TARGET_MS=100, IGNORE_THRESHOLD_IN_BYTES=1400 (Kompression) | TTFB, Redirects, fehlende Kompression |
| Modern HTTP | (neu) | HTTP/1.1-Requests statt HTTP/2+ | veraltete Requests — auf PSI/Lightrider per skipAudits übersprungen (Regel 17) |

### 19. Erwarte beim Cache-Insight ein Altersdezil-Modell, keine starre 30-Tage-Grenze
**Warum:** "Use efficient cache lifetimes" ignoriert Ressourcen mit TTL≥30 Tagen komplett, schätzt den Wasted-Bytes-Anteil für alles darunter aber über reale HTTP-Archive-Wiederbesuchs-Altersdezile ([0, 0.2, 1, 3, 8, 12, 24, 48, 72, 168, 8760, ∞] Stunden) statt eines starren Cutoffs; `IGNORE_THRESHOLD_IN_PERCENT=0,925`.
**Woran man es erkennt:** Zwei Ressourcen mit gleicher TTL knapp unter 30 Tagen können unterschiedlich stark als "wasted" gemeldet werden, je nach geschätzter Wiederbesuchs-Wahrscheinlichkeit in diesem Dezil-Modell — nicht nach einer einfachen Ja/Nein-Schwelle.
**Fix:** Fix siehe [laden-auslieferung.md](laden-auslieferung.md#caching-und-auslieferung) (Cache-Control-/Immutable-Strategie).
**Beleg:** Lighthouse `@paulirish/trace_engine/models/trace/insights/Cache.js`, Lighthouse 13.4.1. Sicherheit: dokumentiert
**Gilt für:** allgemein

## CrUX-Felddaten

CrUX ist Googles Felddatensatz aus echten Chrome-Nutzern — die Werte im PSI-Abschnitt "Von echten Nutzern gemeldete Daten", nicht die Lab-Werte darunter.

### 20. Lies "Keine Daten" als Popularitäts-Grenze, nicht als perfekten Wert
**Warum:** CrUX nimmt eine Seite/Origin nur auf, wenn sie (a) öffentlich auffindbar ist (HTTP 200, kein `X-Robots-Tag: noindex`, kein `<meta name=robots content=noindex>`) UND (b) einen undokumentierten Mindest-Traffic erreicht; zusätzlich fällt eine Seite komplett heraus, wenn >20 % ihres Traffics auf nicht-eligible Dimensionskombinationen entfällt. "Keine Daten" heißt also "zu wenig/keine belastbaren echten Nutzerdaten", nicht "einwandfrei". Die Daten selbst sind ein rollierender 28-Tage-Durchschnitt (`collectionPeriod` zeigt immer 28 Tage, auch bei jüngeren Seiten), bewertet am 75. Perzentil (p75).
**Woran man es erkennt:** PSI zeigt den Abschnitt "Von echten Nutzern gemeldete Erfahrungen für diese Seite" nicht bzw. mit Hinweis auf fehlende Daten an, obwohl Lab-Werte vorhanden sind.
**Fix:** n/a — für eigene, noch nicht ausreichend besuchte Seiten bleiben nur Lab-Daten (PSI/Lighthouse) als Referenz; ein bewusstes `noindex` (z. B. auf einer internen Seite) schließt CrUX-Daten strukturell aus.
**Beleg:** developer.chrome.com/docs/crux/api ("28-day rolling average"); developer.chrome.com/docs/crux/methodology (Eligibility-Kriterien, >20-%-Regel). CrUX-Schwellen bei p75: LCP gut ≤2500 ms/schlecht >4000 ms, INP gut ≤200 ms/schlecht >500 ms, CLS gut ≤0,1/schlecht >0,25 (web.dev, "Defining the Core Web Vitals metrics thresholds"). Sicherheit: dokumentiert
**Gilt für:** allgemein

## PSI lokal nachstellen

Wie nah ein lokaler Lauf an die echte PSI-Zahl herankommt — und wo die Grenze liegt.

### 21. Miss mobil immer mehrfach und nimm den Median
**Warum:** Lighthouse dokumentiert Hardware- und Netzwerk-Varianz als Hauptursache für Lauf-zu-Lauf-Unterschiede; auf PSI (feste Lightrider-VMs) sind diese Quellen "UNLIKELY", auf einer normalen lokalen Maschine dagegen "LIKELY". Page-Nondeterminismus (z. B. A/B-Tests) bleibt dagegen IMMER unmitigiert, auch auf PSI selbst.
**Woran man es erkennt:** Drei aufeinanderfolgende mobile Läufe derselben Seite (4×-CPU-Drosselung, lokaler CLI-Default) ergaben in einem Owner-Projekt 91/97/91 Performance-Punkte — ohne Änderung dazwischen.
**Fix:** ≥5 Läufe, Median nehmen (z. B. `@lhci/cli`: `lhci collect -n 5`, optional direkt gegen die echte PSI-API mit `--mode psi --psiApiKey=<key>` — ohne eigenen Key blockiert das geteilte Tageskontingent mit HTTP 429). Dedizierte, nicht-burstable Hardware verwenden (≥2 Cores, ≥2 GB RAM; Shared-Core- und FaaS-Instanzen vermeiden).
**Beleg:** Lighthouse `docs/variability.md`, Lighthouse 13.4.1. Projekt-Beleg: 91/97/91 bei drei Läufen (HANDOFF.md, Fußnote 2); PageSpeed-API-429 bei fehlendem eigenen Key (HANDOFF.md, "STAND 13.9. 03:30"). Sicherheit: gemessen
**Gilt für:** allgemein

### 22. Kopiere lr-mobile-config.js/lr-desktop-config.js 1:1, statt Presets zu raten
**Warum:** Die genaueste lokale Annäherung an PSI ist, die echten Lightrider-Configs direkt als eigene Lighthouse-Config zu verwenden: `lighthouse <url> --config-path=./lr-mobile-config.js`. `throttlingMethod` bleibt dabei automatisch bei `simulate` (PSI-Default), CPU/Netzwerk/Emulation/skipAudits entsprechen exakt dem, was PSI tatsächlich rechnet (Regeln 15-17) — ein von Hand zusammengestelltes `--throttling-method=devtools --form-factor=mobile` trifft diese Kombination nicht.
**Woran man es erkennt:** n/a (Konfigurationsentscheidung vor der Messung).
**Fix:** `--config-path=lr-mobile-config.js` bzw. `-desktop-` verwenden; `--preset`/`--config-path` sind reine CLI-Flags und werden bei programmatischer Node-Nutzung ignoriert (Config dort als 3. Argument an `lighthouse()` übergeben). Praktischer Einstieg im Skill: `scripts/lighthouse-psi.mjs`.
**Beleg:** Lighthouse `docs/readme.md`, Lighthouse 13.4.1. Sicherheit: dokumentiert
**Gilt für:** allgemein

### 23. Zieh bei einem Ausreißer den JSON-Report, bevor du debuggst
**Warum:** Ein extrem hoher TBT-/"Other"-Wert in einem PSI-Lauf, der sich lokal auf schneller Hardware nicht reproduzieren lässt, kann ein Artefakt des CPU-Throttling-Faktors der PSI-Testmaschine sein statt ein reales Leck — kleine CPU-Anteile auf einer schnellen Maschine entsprechen einem deutlich größeren Anteil auf der (relativ langsameren) Lightrider-VM.
**Woran man es erkennt:** Ein Owner-PSI-Desktop-Lauf meldete TBT 13.060 ms und "Other" 30.533 ms bei FCP 0,4 s/LCP 0,8 s; lokal maß dieselbe Seite Desktop 96 Punkte, eine Aufzeichnung auf derselben Maschine zeigte 68 % Leerlauf.
**Fix:** Vor dem Debuggen den offiziellen PSI-JSON-Bericht ziehen (DevTools → Lighthouse → Bericht speichern, oder PSI-API) statt den Wert 1:1 auf die eigene, schnellere Testhardware zu übertragen.
**Beleg:** HANDOFF.md, "STAND 13.9. NACHTS", Zeile 522-534: TBT 13.060 ms/"Other" 30.533 ms (PSI) vs. Desktop 96 Punkte (lokal), 68 % Leerlauf (Owner-Aufzeichnung). Sicherheit: gemessen
**Gilt für:** allgemein

### 24. Erkenne Skript-Kosten-Attribution auf die Dokument-URL, keine Mehrfachanfrage
**Warum:** Lighthouse ordnet inline/ausgeführte Skriptkosten in manchen Tabellen (z. B. Hauptthread-/Drittanbieter-Aufschlüsselungen) der Dokument-URL als Attributions-Label zu, nicht als Netzwerk-Request — dieselbe URL kann dadurch mehrfach als Attributionsziel auftauchen, ohne dass die Seite tatsächlich mehrfach angefragt wurde.
**Woran man es erkennt:** Eine Zeile, die die eigene Dokument-URL mehrfach listet (z. B. "6× angefragt"), obwohl das Netzwerk-Panel nur einen einzigen Dokument-Request zeigt.
**Fix:** Gegen die tatsächliche Netzwerkaktivität gegenprüfen (DevTools-Netzwerk-Tab oder eigenes Skript), bevor eine wiederholt gelistete URL als doppelte Anfrage gemeldet wird.
**Beleg:** Owner-Projekt: Attributionsspalte zeigte die Dokument-URL scheinbar 6×, das echte Netzwerk-Log zeigte 1 Dokument-Request von 25 Requests insgesamt (Commit 80beb85, 2026-09-13). Ausführlicher Fall mit Zahlen: [widerlegt.md](widerlegt.md#35-eine-ressource-wird-laut-lighthouse-tabelle-sechsmal-aufgerufen). Sicherheit: gemessen
**Gilt für:** allgemein

## Offene Fragen

- Der exakte Mindest-Traffic-Schwellenwert, ab dem eine Seite/Origin überhaupt CrUX-Daten bekommt ("sufficiently popular"), wird von Google bewusst nicht veröffentlicht.
- Warum sich das PSI-Messfenster im 95→60-Fall extern bis mindestens 20,5 s öffnete, während lokal weder im `simulate`- noch im `devtools`-Modus (auch mit stark erhöhtem `maxWaitFor*`) ein Long Task oder Netzwerk-Ereignis nach 2,4 s bzw. 13,3 s auftrat, ist ungeklärt — die vier Kandidaten in Regel 4 sind nicht gegeneinander getestet. Nächster sinnvoller Schritt: `--config-path=lr-mobile-config.js` (echte PSI-Werte, nicht die manuell erhöhten 300.000/360.000 ms) direkt gegen den damals live getesteten Stand laufen lassen.
- Setzt PSI/Lightrider bei sonst identischer Konfiguration noch weitere, nicht-öffentliche interne Parameter (VM-Auslastung, realer Netzwerkpfad statt `localhost`), die das Messfenster zusätzlich beeinflussen? Dazu gibt es keine öffentliche Dokumentation.

## Quellen

https://github.com/GoogleChrome/lighthouse/blob/main/core/config/lr-mobile-config.js
https://github.com/GoogleChrome/lighthouse/blob/main/core/config/lr-desktop-config.js
https://github.com/GoogleChrome/lighthouse/blob/main/core/config/constants.js
https://github.com/GoogleChrome/lighthouse/blob/main/core/lib/emulation.js
https://cdn.jsdelivr.net/npm/@paulirish/trace_engine/models/trace/lantern/simulation/Constants.js
https://cdn.jsdelivr.net/npm/@paulirish/trace_engine/models/trace/lantern/simulation/Simulator.js
https://github.com/GoogleChrome/lighthouse/issues/6539
https://github.com/GoogleChrome/lighthouse/blob/main/core/config/config.js
https://github.com/GoogleChrome/lighthouse/blob/main/docs/throttling.md
https://www.w3.org/TR/largest-contentful-paint/
https://w3c.github.io/event-timing/
https://github.com/GoogleChrome/lighthouse/blob/main/core/config/default-config.js
https://github.com/GoogleChrome/lighthouse/blob/main/shared/statistics.js
https://github.com/GoogleChrome/lighthouse/blob/main/core/audits/metrics/largest-contentful-paint.js
https://calendar.perfplanet.com/2021/how-does-lighthouse-simulated-throttling-work/
https://github.com/GoogleChrome/lighthouse/tree/main/core/audits/insights
https://github.com/GoogleChrome/lighthouse/blob/main/core/audits/insights/forced-reflow-insight.js
https://cdn.jsdelivr.net/npm/@paulirish/trace_engine/models/trace/insights/ForcedReflow.js
https://cdn.jsdelivr.net/npm/@paulirish/trace_engine/models/trace/insights/LCPBreakdown.js
https://cdn.jsdelivr.net/npm/@paulirish/trace_engine/models/trace/insights/RenderBlocking.js
https://cdn.jsdelivr.net/npm/@paulirish/trace_engine/models/trace/insights/CLSCulprits.js
https://cdn.jsdelivr.net/npm/@paulirish/trace_engine/models/trace/insights/INPBreakdown.js
https://cdn.jsdelivr.net/npm/@paulirish/trace_engine/models/trace/insights/FontDisplay.js
https://cdn.jsdelivr.net/npm/@paulirish/trace_engine/models/trace/insights/Cache.js
https://cdn.jsdelivr.net/npm/@paulirish/trace_engine/models/trace/insights/DocumentLatency.js
https://cdn.jsdelivr.net/npm/@paulirish/trace_engine/models/trace/insights/DOMSize.js
https://cdn.jsdelivr.net/npm/@paulirish/trace_engine/models/trace/insights/ImageDelivery.js
https://cdn.jsdelivr.net/npm/@paulirish/trace_engine/models/trace/insights/LegacyJavaScript.js
https://cdn.jsdelivr.net/npm/@paulirish/trace_engine/models/trace/insights/NetworkDependencyTree.js
https://cdn.jsdelivr.net/npm/@paulirish/trace_engine/models/trace/insights/Viewport.js
https://github.com/GoogleChrome/lighthouse/blob/main/core/computed/metrics/total-blocking-time.js
https://github.com/GoogleChrome/lighthouse/blob/main/core/computed/metrics/interactive.js
https://github.com/GoogleChrome/lighthouse/blob/main/core/audits/metrics/interaction-to-next-paint.js
https://web.dev/articles/defining-core-web-vitals-thresholds
https://developer.chrome.com/docs/crux/api
https://developer.chrome.com/docs/crux/methodology
https://github.com/GoogleChrome/lighthouse/blob/main/docs/readme.md
https://github.com/GoogleChrome/lighthouse/blob/main/docs/variability.md
https://registry.npmjs.org/lighthouse/latest
https://github.com/GoogleChrome/lighthouse/blob/v11.7.1/core/config/constants.js
https://web.dev/articles/cls
https://web.dev/blog/inp-cwv-march-12
https://developer.chrome.com/docs/lighthouse/performance/speed-index
https://cdn.jsdelivr.net/npm/@paulirish/trace_engine/models/trace/insights/DuplicatedJavaScript.js
https://cdn.jsdelivr.net/npm/@paulirish/trace_engine/models/trace/extras/ScriptDuplication.js
https://cdn.jsdelivr.net/npm/@paulirish/trace_engine/models/trace/insights/SlowCSSSelector.js
