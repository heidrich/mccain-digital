# Messen — html-performance

> Teil des Skills [[html-performance]] · Stand 2026-09-16 · Belege: mccain-digital (HANDOFF, CHANGELOG, Commits), weitere Projekte des Owners, Recherche mit Quell-URLs

Dieses Kapitel behandelt **wie** man misst und Ergebnisse liest — nicht wie man Befunde behebt (dafür [laden.md](laden.md) und [rendern.md](rendern.md)) und nicht, wie Lighthouse aus Messwerten einen Score errechnet (dafür [lighthouse-psi.md](lighthouse-psi.md)). Jede Regel nennt das Skript, das sie prüfbar macht.

## Kurzfassung

- **Miss in 250-ms-Zeitscheiben, nicht in Summen** — eine Summe zeigt nur DASS der Hauptthread beschäftigt war, nie WANN ([→](#1-miss-in-250-ms-zeitscheiben-nicht-in-summen-über-den-ganzen-lauf))
- **Miss exakt die Seite und die Geste, mit der ausgeliefert wird** — eine Lab-Seite mit Hover ist nicht die Startseite mit Scroll ([→](#2-miss-exakt-die-seite-und-die-geste-mit-der-ausgeliefert-wird))
- **Eigenzeit statt Bruttodauer verwenden** — sonst zählt verschachtelte Arbeit doppelt ([→](#3-eigenzeit-self-time-verwenden-nicht-bruttodauer))
- **Pixel-Diff und TextMetrics statt Behauptung und Augenmaß** — visuelle Gleichheit und exakte Periodizität beweisen, nicht annehmen ([→](#4-pixel-diff-und-textmetrics-statt-behauptung-und-augenmaß))
- **Kontrollierte Zwischenzustände und die theoretische Obergrenze messen** — ein einzelnes Vorher/Nachher vermischt Ursachen, ein einzelner Score-Wert kann eine stetige Verbesserung verdecken ([→](#5-kontrollierte-zwischenzustände-und-die-theoretische-obergrenze-messen-nicht-nur-ein-vorhernachher))
- **Gegen einen produktionsnahen Server messen, nie gegen den blanken Dev-Server** — ein unkomprimierter Server macht eine Seite bis zu 6,8x zu schwer ([→](#6-gegen-einen-produktionsnahen-server-messen-nie-gegen-den-blanken-dev-server))
- **no-store nur zum Ansehen, nie zum Messen** — sonst wirkt jede Navigation wie ein Duplikat-Download ([→](#7-no-store-nur-zum-ansehen-nie-zum-messen))
- **CDN-Cache-Header nach Deploy prüfen, bevor eine Messung als Beleg gilt** — sonst misst man die alte, gecachte Version ([→](#8-cdn-cache-header-nach-deploy-prüfen-bevor-eine-messung-als-beleg-gilt))
- **Anfragegröße und Sichtbarkeit korrekt lesen** — Bytes aus sizes(), nicht aus content-length; sichtbar heißt im Viewport UND nicht versteckt ([→](#9-anfragegröße-aus-requestsizes-lesen-und-sichtbarkeit-korrekt-prüfen))
- **Nie unter Maschinenlast messen** — parallele Chrome-Prozesse erzeugen NO_FCP und Phantom-125-Sekunden-Erstmalungen ([→](#10-nie-unter-maschinenlast-messen))
- **Treiber von Messlogik trennen, Treiberversion pinnen** — ein Gate, das lautlos hängt, ist kein Gate ([→](#11-treiber-von-messlogik-trennen-und-die-version-pinnen))
- **Erste Messung nach einem (Re)Start ist oft ein Kaltstart-Ausreißer** — mehrfach messen, den warmen Wert nehmen ([→](#12-erste-messung-nach-einem-restart-ist-oft-ein-kaltstart-ausreißer--mehrfach-messen-den-warmen-wert-nehmen))
- **Drei Drosselungsarten kennen: simulate, devtools, provided** — PSI und der CLI-Default nutzen immer simulate ([→](#13-drei-drosselungsarten-kennen-simulate-devtools-provided))
- **Die 5,25-s-Ruhefenster gelten nicht für PSI** — sie greifen nur bei explizitem --throttling-method=devtools/provided ([→](#14-die-525-s-ruhefenster-gelten-nicht-für-psi))
- **PSI drosselt die CPU mobil mit 1,2x, nicht mit 4x** — Desktop gar nicht ([→](#15-psi-drosselt-die-cpu-mobil-mit-12x-nicht-mit-4x--desktop-gar-nicht))
- **PSI lokal exakt nachbilden** — lr-mobile-config.js/lr-desktop-config.js als eigene Config verwenden ([→](#16-psi-lokal-exakt-nachbilden-gerät-netzwerk-config))
- **Varianzquellen kennen und einplanen** — PSI-Hardware ist fix, deine Maschine nicht ([→](#17-varianzquellen-kennen-psi-hardware-ist-fix-deine-maschine-nicht))
- **"observed" ist die reale Traceszeit — der Bericht ist bei simulate eine Nachrechnung** — Lantern kann stark abweichen ([→](#18-observed-ist-die-reale-tracezeit--der-bericht-ist-bei-simulate-eine-nachrechnung))
- **LCP-Reporting endet an echter Eingabe, nicht an Mausbewegung** — Klick, Tap und Tastendruck stoppen, Hover nicht ([→](#19-lcp-reporting-endet-an-echter-eingabe-nicht-an-mausbewegung))
- **Ein späterer, größerer Kandidat zählt bis zum Fensterende oder bis zur Eingabe** — mit Zähl-Feinheiten (einmal pro Element, Byte-/Rauschfilter) ([→](#20-ein-späterer-größerer-kandidat-wird-lcp-bis-fensterende-oder-eingabe))
- **Ein zu später erster Paint verschiebt das ganze Messfenster** — Software-GL/getContext kann das auslösen ([→](#21-ein-zu-später-erster-paint-verschiebt-das-ganze-messfenster))
- **Die 7 Gruppen von Lighthouses Main-thread work breakdown, exakt gelesen** — und was "Other" wirklich ist ([→](#22-die-7-gruppen-von-lighthouses-main-thread-work-breakdown-und-was-other-ist))
- **IntersectionObserver-Kosten stecken oft in "Other" und skalieren mit Zielen** — sichtbar nur per gewrapptem Konstruktor ([→](#23-intersectionobserver-kosten-stecken-oft-in-other-und-skalieren-mit-zielen-nicht-instanzen))
- **Lighthouses Skriptkosten-Spalte pro URL ist eine Zuordnung, keine Anfragezahl** — gegen eine echte Netzwerkmessung prüfen ([→](#24-lighthouses-skriptkosten-spalte-pro-url-ist-eine-zuordnung-keine-anfragezahl))
- **V8-Coverage-Bereiche sind verschachtelt** — ein naives count>0 meldet 0 % tot für jede Datei ([→](#25-v8-coverage-bereiche-sind-verschachtelt-ein-naives-count0-meldet-0--tot-für-jede-datei))
- **Timer, rAF und Observer vor dem ersten Seitenskript patchen** — sonst hält die Seite schon eine native Referenz ([→](#26-timer-raf-und-observer-vor-dem-ersten-seitenskript-patchen))
- **ResizeObserver auf body mit height:100% ist ein Unschulds-Artefakt, kein Beweis** — beobachte die echte Komponentenwurzel ([→](#27-resizeobserver-auf-body-mit-height100-ist-ein-unschulds-artefakt-kein-beweis))
- **contentvisibilityautostatechange ist der einzige verlässliche Skip/Show-Beweis** — die ~150-%-Marge gehört gemessen, nicht angenommen ([→](#28-contentvisibilityautostatechange-ist-der-einzige-verlässliche-beweis-die-150--marge-gehört-gemessen))
- **Seitenhöhe vor/nach Scroll vergleichen** — deckt eine falsche contain-intrinsic-size auf ([→](#29-seitenhöhe-vor-und-nach-einem-vollständigen-scroll-vergleichen))
- **IO-Ziel in übersprungenem Block: Kosten in der Bootstrap-Phase, nicht bei jedem Frame** — korrigierte Lesart ([→](#30-io-ziel-in-übersprungenem-content-visibility-block-kosten-in-der-bootstrap-phase))
- **Screenshot und IntersectionObserver lügen für übersprungene Blöcke** — erst nach dem Rendern beobachten ([→](#31-screenshot-und-intersectionobserver-lügen-für-übersprungene-blöcke))
- **fps per rAF-Sampling über viele Frames, p95 statt Einzeldifferenz** — ein Plateau, nicht ein Einzelwert, beweist Drosselung ([→](#32-fps-per-raf-sampling-über-viele-frames-messen-p95-nicht-einzeldifferenz))
- **Nur Software-GL erzeugt echte WebGL-Last, CPU-Drosselung nicht** — Renderer per WEBGL_debug_renderer_info bestätigen ([→](#33-nur-software-gl-erzeugt-echte-webgl-last--cpu-drosselung-erreicht-den-gpu-prozess-nicht))
- **getContext() blockiert synchron und kann den ersten Paint der ganzen Seite verzögern** — nie im kritischen Pfad ([→](#34-getcontext-blockiert-synchron-und-kann-den-ersten-paint-der-ganzen-seite-verzögern))
- **SwiftShader wird von Chrome zunehmend blockiert** — Re-Enable-Flag nötig, exakter Meilenstein unklar ([→](#35-swiftshader-wird-von-chrome-zunehmend-blockiert))
- **Nur echte GPU-Hardware beweist, dass WebGL wirklich rendert** — Headless kann falsch UND unbewegt sein ([→](#36-nur-echte-gpu-hardware-beweist-dass-webgl-wirklich-rendert--headless-kann-falsch-und-unbewegt-sein))
- **"mobile" heißt Touch + isMobile, nicht nur ein schmaler Viewport** — sonst greifen Desktop-Media-Queries ([→](#37-mobile-heißt-touch--ismobile-nicht-nur-ein-schmaler-viewport))
- **Scrollen in Messläufen immer instant, nie smooth** — sonst bricht jeder neue Scroll-Befehl den vorigen ab ([→](#38-scrollen-in-messläufen-immer-instant-nie-smooth))
- **reducedMotion und vorab akzeptierter Consent für Screenshot-Vergleiche** — sonst wird eine Animation zum Bild-Unterschied ([→](#39-reducedmotion-und-vorab-akzeptierten-consent-für-screenshot-vergleiche-setzen))
- **Emulierter iPhone-Viewport meldet pointer:fine, nicht pointer:coarse** — eine coarse-only-Regel bleibt so ungetestet ([→](#40-emulierter-iphone-viewport-meldet-pointerfine-nicht-pointercoarse))
- **Einen realen skalierten Geräte-Viewport in jede Messreihe aufnehmen** — neben den Standard-Breakpoints ([→](#41-einen-realen-skalierten-geräte-viewport-in-jede-messreihe-aufnehmen))
- **console und pageerror sind getrennte Fehlerkanäle** — ein Gate muss beide hören ([→](#42-console-und-pageerror-sind-getrennte-fehlerkanäle))
- **Bei hydrierenden Seiten das DOM nach der Hydration auditieren** — nicht nur die Server-Antwort ([→](#43-bei-hydrierenden-seiten-das-dom-nach-der-hydration-auditieren-nicht-nur-die-server-antwort))
- **Vor jeder Messreihe prüfen, ob der Server überhaupt antwortet** — ein toter Server liefert eine Fehlerseite, die alles "besteht" ([→](#44-vor-jeder-messreihe-prüfen-ob-der-server-überhaupt-antwortet))
- **"Nichts gefunden" ist ein möglicher Tool-Ausfall, kein Bestehen** — jeder Guard braucht eine Mindest-Fundzahl ([→](#45-nichts-gefunden-ist-ein-möglicher-tool-ausfall-kein-bestehen))
- **Ein Wächter mit derselben fehlerhaften Methode wie der Bug bleibt blind** — nach jedem Messfehler die eigene Testinfrastruktur gegenprüfen ([→](#46-ein-wächter-mit-derselben-fehlerhaften-methode-wie-der-bug-bleibt-blind))
- **Nach jedem Rename auf verwaiste Selektoren grepen** — ein still ins Leere zeigender Selektor meldet "kein Fund" statt Fehler ([→](#47-nach-jedem-rename-explizit-auf-verwaiste-selektoren-grepen))
- **Ein Wächter, der ein abgelöstes Muster prüft, ist schlechter als kein Gate** — Tooling mit dem System retirieren, das es misst ([→](#48-ein-wächter-der-ein-abgelöstes-muster-prüft-ist-schlechter-als-kein-gate))
- **Kommentare vor einer Text-/Regex-Prüfung entfernen** — Dokumentation, die das Muster zitiert, liegt sonst im Suchraum ([→](#49-kommentare-vor-einer-text--und-regex-prüfung-entfernen))
- **getComputedStyle und ein fester Wait mitten in einer Animation lügen** — auf ein explizites Settled-Signal warten ([→](#50-getcomputedstyle-und-ein-fester-wait-mitten-in-einer-animation-lügen))
- **Eine laufende Animation erst beweisen, dann ihre Performance messen** — ein Guard gegen einen behobenen Bug muss mit ihm verschwinden ([→](#51-eine-laufende-animation-erst-beweisen-dann-ihre-performance-messen))
- **TTI: erstes 5-s-Fenster ganz ohne Long Task nach FCP** — eine Endlosschleife erreicht TTI nie ([→](#52-tti-erstes-5-s-fenster-ganz-ohne-long-task-nach-fcp))
- **TBT: Summe der Long-Task-Dauer minus 50 ms zwischen FCP und TTI** — spätes Deferred-Work verschiebt TTI und zieht weitere Long Tasks hinein ([→](#53-tbt-summe-der-long-task-dauer-minus-50-ms-zwischen-fcp-und-tti))
- **Einen unbelegten externen Einzelwert nicht blind als Ziel übernehmen** — ohne Rohdaten keine Ursachenzuordnung ([→](#54-einen-unbelegten-externen-einzelwert-nicht-blind-als-ziel-übernehmen))
- **Mobil ist die Zahl, die zählt — aber auf beiden Formfaktoren messen** — mit dem exakten, dokumentierten Befehl ([→](#55-mobil-ist-die-zahl-die-zählt--aber-auf-beiden-formfaktoren-messen))
- **Erreichbarkeit ist kein Beweis für Funktion** — grüne Status-/Meta-Checks fanden den toten Kontaktkanal nicht ([→](#56-erreichbarkeit-ist-kein-beweis-für-funktion))
- **Veröffentlichte Performance-Zahlen laufend gegen echte Messwerte verifizieren** — eine veraltete Behauptung ist ein Risiko, keine Petitesse ([→](#57-veröffentlichte-performance-zahlen-laufend-gegen-echte-messwerte-verifizieren))
- **Geskripteter Sweep über alle Seiten × Kern-Viewports als Regressionsgate** — nach jeder Änderung, nicht nur auf der berührten Seite ([→](#58-geskripteter-sweep-über-alle-seiten--kern-viewports-als-regressionsgate))

## Inhalt

- [Grundmethode](#grundmethode-zeitachse-statt-summe-vorhernachher-eine-änderung-pro-messung)
- [Produktionsnah messen](#produktionsnah-messen-server-cache-kompression)
- [Was lädt, wie groß, wirklich sichtbar](#was-lädt-wie-groß-wirklich-sichtbar)
- [Ruhige Maschine, deterministische Läufe](#ruhige-maschine-deterministische-läufe)
- [Lighthouse CLI, PageSpeed Insights, DevTools](#lighthouse-cli-pagespeed-insights-devtools)
- [Observed vs. simuliert, und wann das Messfenster endet](#observed-vs-simuliert-und-wann-das-messfenster-endet)
- [Hauptthread lesen](#hauptthread-lesen-gruppen-eigenzeit-other)
- [Beobachter selbst beobachten](#beobachter-selbst-beobachten-intersectionobserver-resizeobserver-timer-raf)
- [content-visibility messen](#content-visibility-messen)
- [fps und Software-GL](#fps-und-software-gl)
- [Mobile-Emulation, Scrollen, Viewports](#mobile-emulation-scrollen-reduced-motion-viewports)
- [Fehlerkanäle und Wächter-Zuverlässigkeit](#fehlerkanäle-und-wächter-zuverlässigkeit)
- [TTI und TBT](#tti-und-tbt-wie-die-skripte-sie-berechnen)
- [Prozess](#prozess-messen-ist-teil-des-gates)

## Grundmethode: Zeitachse statt Summe, Vorher/Nachher, eine Änderung pro Messung

### 1. Miss in 250-ms-Zeitscheiben, nicht in Summen über den ganzen Lauf
**Warum:** Eine Summe über den gesamten Lauf zeigt nur, DASS der Hauptthread beschäftigt war, nie WANN welche Phase dominiert. In einem Fall verschleierte eine Summenansicht ("Stil+Layout 1.389 ms" neben "Skript 1.076 ms") zehn Stunden lang den echten Engpass.
**Woran man es erkennt:** Erst die Aufschlüsselung in 250-ms-Scheiben zeigte, dass bei 2250 ms 466 von 510 ms Skript waren (eine einzelne Aufgabe blockierte den Hauptthread fast vollständig), während andere Fenster von Stil+Layout dominiert wurden.
**Fix:** `node scripts/mainthread.mjs <url> --slices` — Zeitachse ab Navigationsstart in 250-ms-Buckets mit Balkendiagramm je Lighthouse-Gruppe, statt nur der Summentabelle.
**Beleg:** mccain-digital, HANDOFF „STAND 13.9. 03:30", Zeile 319-335: 1000 ms → Stil+Layout 168/241 ms; 2250 ms → Skript 466/510 ms. Ursache war Layout von 2.408 Knoten, nicht JavaScript. · Sicherheit: gemessen
**Gilt für:** allgemein

### 2. Miss exakt die Seite und die Geste, mit der ausgeliefert wird
**Warum:** Eine Performance-Aussage („kostet nichts messbares") gilt strikt nur für die konkrete Seite und Geste, mit der gemessen wurde — nicht für eine andere Seite (v. a. mit mehr gleichzeitigen Instanzen desselben Effekts) oder eine andere Interaktion.
**Woran man es erkennt:** Ein Hover-Sweep auf einer isolierten Lab-Seite maß „nichts Messbares" für eine verworfene Pixel-Dichte-Einstellung; derselbe Effekt auf der echten Startseite unter Scroll maß 50,0 ms Median, 65 % Frames > 20 ms, 9 Long Tasks.
**Fix:** Miss auf der Seite, die live geht, mit der Geste, die Nutzer ausführen (`--scroll` bei `scripts/fps.mjs`, echte Seiten-URL statt Lab-Seite bei allen Skripten). Prüfe vorab, ob das Instrument einen bekannt schlechten Zustand überhaupt als schlecht erkennt, bevor du „kostet nichts" glaubst.
**Beleg:** mccain-digital, HANDOFF Zeile 3101-3125: drei Konfigurationen verglichen, u. a. 1.1/1.0 (verworfen, Scroll-Median 50,0 ms, 65 % Frames > 20 ms) vs. 3.0/2.0 (final, Scroll-Median 16,7 ms, 0 % Frames > 20 ms). · Sicherheit: gemessen
**Gilt für:** allgemein

### 3. Eigenzeit (self time) verwenden, nicht Bruttodauer
**Warum:** Trace-/Profiler-Spans verschachteln sich; ohne Abzug der Kind-Dauer zählt innere Arbeit doppelt. Lighthouse selbst (`core/lib/tracehouse/main-thread-tasks.js`, `_computeRecursiveSelfTime`) rechnet jedem Ereignis nur seine eigene Dauer minus die Dauer seiner direkten Kinder zu.
**Woran man es erkennt:** `scripts/mainthread.mjs` baut aus ts/dur jedes Ereignisses einen Stack auf (sortiert nach Startzeit, längste/äußerste Spanne zuerst) und zieht die Kind-Dauer ab, bevor eine Zeile in eine Gruppe einsortiert wird.
**Fix:** Bei jeder eigenen Trace-/Profiler-Auswertung Eigenzeit statt Gesamtdauer berechnen; Reihenfolge der Spans muss outermost-first pro Startzeit sortiert sein, sonst bricht die Stack-basierte Berechnung.
**Beleg:** Quelle: GoogleChrome/lighthouse `core/lib/tracehouse/main-thread-tasks.js`, 13.4.1, 2026-09-16; Implementierung: `scripts/mainthread.mjs`. · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 4. Pixel-Diff und TextMetrics statt Behauptung und Augenmaß
**Warum:** Visuelle Gleichheit oder exakte Periodizität einer Animation lassen sich nicht durch Lesen des Codes behaupten — nur durch tatsächlichen Bildvergleich beweisen. Dasselbe gilt für Sub-Pixel-Fragen zu Textbreiten: das Auge irrt, die tatsächlich gerenderte Breite nicht.
**Woran man es erkennt:** Ein rein struktureller Refactor (Deko-Layer hinter statt Copy darüber) wurde per Vorher/Nachher-Screenshot desselben Bereichs pixelweise verglichen: null abweichende Pixel. Eine Loop-Animation, die alle 6 s sichtbar zurücksprang, wurde durch Rendern bei Offset 0 und bei Offset „ein voller Umlauf" und Kanaldiff entlarvt: 98,5 mittlere Abweichung vorher, 0,2 nachher (der Fehler lag in der Periodenformel eines diagonalen Verlaufs: `|W·sin θ| + |H·cos θ|`, nicht der halben Blattbreite).
**Fix:** Zwei Zustände screenshotten, in zwei `<canvas>` laden, Pixel für Pixel Kanaldifferenz summieren (Schwelle z. B. > 48 = „anders"); für Textbreiten die Canvas-`TextMetrics`-API messen statt zu schätzen.
**Beleg:** mccain-digital, HANDOFF „Was zuletzt passiert ist" Punkt 5 (Zeile 2591-2601) und Commit `2337309` (2026-08-31); TextMetrics: Commit `ee545da` (2026-09-01). Verwandtes Werkzeug: `tools/v5compare.mjs`-Pattern. · Sicherheit: gemessen
**Gilt für:** allgemein

### 5. Kontrollierte Zwischenzustände und die theoretische Obergrenze messen, nicht nur ein Vorher/Nachher
**Warum:** Ein einzelnes Vorher/Nachher-Delta vermischt mehrere unabhängige Ursachen zu einer Zahl und beantwortet nicht, welcher Teil eines Fixes tatsächlich wirkt oder wie viel Potenzial überhaupt vorhanden ist. Der Lighthouse-Score selbst schwankt zwischen Läufen genug, um eine reale, stetige Verbesserung zu verdecken.
**Woran man es erkennt:** Vor dem gezielten Pausieren unsichtbarer Animationen wurde zuerst die theoretische Obergrenze gemessen (alle CSS-Animationen global deaktiviert): mobil LCP 3.650→2.759 ms, TBT 793→530 ms, Hauptthread 4.641→3.730 ms, Stil+Layout 1.175→941 ms — danach ließ sich der reale, konstruktionsbedingt konservativere Fix (nur Off-Screen-Animationen pausieren, 25→5 laufende Animationen) gegen diese Obergrenze einordnen. Getrennt davon zerlegte ein Drei-Varianten-Vergleich (wie ausgeliefert / Bibliothek geladen aber inert / komplett ohne Skript) einen Score von 70 in seine Ursachenanteile: Bibliothek selbst 1 Punkt, das Hydrationsverfahren 21 Punkte, das Dokument selbst 5 Punkte. In einer dritten Messreihe blieb der lokale Lighthouse-Score über drei Shipping-Stände bei 68-71, während die Hauptthread-Zeit in denselben drei Ständen stetig von 4.210 auf 3.910 ms sank — der Score allein hätte die reale Verbesserung nicht gezeigt.
**Fix:** Vor einem gezielten Fix zuerst die theoretische Obergrenze messen (das ganze Feature versuchsweise abschalten), um zu wissen, wie viel überhaupt zu holen ist; bei der Ursachenzuordnung mehrere kontrollierte Zwischenvarianten messen (je eine Variable entfernt), statt aus einem einzelnen Delta zu schließen; beim Bewerten, ob eine Änderung wirkt, rohe Kategorie-/Hauptthread-Zeiten (`scripts/mainthread.mjs`) über mehrere Stände vergleichen, nicht nur den einzelnen Lighthouse-Score.
**Beleg:** mccain-digital, Commit `80beb85` (2026-09-13, Obergrenze vor `tools/motion-budget.js`); Commit `8f6a325` (2026-09-12, Drei-Varianten-Zerlegung); Commit `25aef20` (2026-09-13, Score 68-71 bei stetig fallendem Hauptthread 4.210→4.177→3.910 ms). · Sicherheit: gemessen
**Gilt für:** allgemein

## Produktionsnah messen: Server, Cache, Kompression

### 6. Gegen einen produktionsnahen Server messen, nie gegen den blanken Dev-Server
**Warum:** Ein roher `http.server` liefert ohne Kompression und ohne Cache-Header aus. Bis zu einem konkreten Fixdatum wurden Verzeichnis-Routen (`/pfad/`) nicht auf `index.html` aufgelöst, bevor die Kompressionsprüfung griff — sie liefen dadurch komplett unkomprimiert.
**Woran man es erkennt:** Eine Startseite maß sich dadurch 6,8x zu schwer, obwohl derselbe Inhalt unter `/pfad/index.html` korrekt komprimiert auslieferte. Alle absoluten Zahlen des Projekts vor dem Fix waren zu pessimistisch.
**Fix:** `python3 scripts/prodserve.py <ordner> 8897` (ohne `--dev`) nutzen: löst die Route zuerst auf index.html auf, entscheidet erst danach über Kompression/Header, spiegelt Security-Header aus `vercel.json` (per `--headers`), damit CSP-Verstöße schon lokal sichtbar werden.
**Beleg:** mccain-digital, Commit `14cdd19` (12.9.2026 abends): Score `/` vs. `/index.html` 45 vs. 63, FCP 5.171 ms vs. 1.272 ms, 907 KB vs. 134 KB (Faktor ≈6,8×); Skript-Kommentar in `scripts/prodserve.py`. · Sicherheit: gemessen
**Gilt für:** allgemein, Vercel

### 7. no-store nur zum Ansehen, nie zum Messen
**Warum:** `Cache-Control: no-store` lässt jede Navigation wie einen Duplikat-Download aussehen, unabhängig von der echten Produktionskonfiguration — `no-cache` wäre noch trügerischer, weil es speichert und revalidiert (ein 304 auf einen veralteten Last-Modified kann denselben Fehler erneut auslösen).
**Woran man es erkennt:** Ein Audit meldete „Font wird zweimal geladen, 94 KB" gegen `prodserve --dev`; gegen echte Produktion lag der zweite Font-Fetch bei `transferSize 0` in 1 ms, weil `vercel.json` woff2 als `immutable` cachet.
**Fix:** `python3 scripts/prodserve.py <ordner> 8898 --dev` nur zum Ansehen verwenden; jede Netzwerk-/Caching-Messung gegen den Modus ohne `--dev` (oder echte Produktion) fahren.
**Beleg:** mccain-digital, Commit `25304a7` (2026-09-02). · Sicherheit: gemessen
**Gilt für:** allgemein, Vercel

### 8. CDN-Cache-Header nach Deploy prüfen, bevor eine Messung als Beleg gilt
**Warum:** Eine PageSpeed-/Lighthouse-Messung direkt nach einem Deploy kann eine gecachte alte Antwort statt der neuen Änderung treffen.
**Woran man es erkennt:** Den `X-Vercel-Cache`-Response-Header lesen: `STALE` = alte Version, `HIT` = gecacht, `MISS` = frisch von diesem Deploy.
**Fix:** Nach jedem Performance-relevanten Deploy zuerst den Cache-Status-Header prüfen, dann erst die Messung als „wirkt"/„wirkt nicht" interpretieren.
**Beleg:** Quelle: `~/.claude` Projekt-Notiz feedback_session_learnings. · Sicherheit: dokumentiert
**Gilt für:** Vercel

## Was lädt, wie groß, wirklich sichtbar

### 9. Anfragegröße aus request.sizes() lesen, und Sichtbarkeit korrekt prüfen
**Warum:** Der `content-length`-Header fehlt regelmäßig bei chunked/komprimierten/opaken Antworten — er ist nur ein Notnagel. Und „im Viewport" ist nicht dasselbe wie „sichtbar": ein Element kann im sichtbaren Bereich liegen und trotzdem unsichtbar sein (`opacity:0`, `visibility:hidden`, `display:none` an einem Vorfahren, oder eine übersprungene `content-visibility:auto`-Subtree).
**Woran man es erkennt:** `scripts/requests.mjs` bucketet jede Anfrage nach Phase (vor DOMContentLoaded / vor Load / nach Load / nach Interaktion) und markiert Duplikate; die Sichtbarkeitsprüfung läuft den Vorfahren-Pfad hoch.
**Fix:** `node scripts/requests.mjs <url> --for 12 [--interact 8]` — Größe kommt aus `request.sizes().responseBodySize`, nicht aus dem Header; Duplikate aus einer Dev-Messung sind ein Hinweis, kein Urteil (gegen produktionsnahen Server erneut prüfen, siehe Regel 6). `loading=lazy` verzögert nur den Zeitpunkt, `fetchpriority` ist nur ein Hinweis an den Scheduler — beides sagt nichts darüber, ob das Ergebnis überhaupt zu sehen ist.
**Beleg:** Skript-Kommentar `scripts/requests.mjs`; Herkunftsmuster: `tools/requests_audit.mjs`, `tools/whoasks.mjs` (mccain-digital). · Sicherheit: dokumentiert
**Gilt für:** allgemein

## Ruhige Maschine, deterministische Läufe

### 10. Nie unter Maschinenlast messen
**Warum:** Parallele Chrome-/Node-Prozesse auf derselben Maschine verzögern das Rendering der Testseite so stark, dass Lighthouse gar keinen First Paint mehr registriert oder ihn erst nach Minuten meldet.
**Woran man es erkennt:** Derselbe `lighthouse`-Befehl (identische Flags, identischer Server) lief 4× hintereinander: Lauf 1 `NO_FCP` nach 378.581 ms Wanduhrzeit, Lauf 2 (nicht-Default 20-s-Wait) `NO_FCP` nach ~63.000 ms, Lauf 3 `NO_FCP` plus kaskadierender `ConnectionClosedError`, Lauf 4 erfolgreich (Score 1, LCP 1652 ms) — aber erst, nachdem 17 parallel laufende, nicht von dieser Session gestartete Chrome/Playwright-Hintergrundprozesse beendet waren (danach: 0). Mit künstlich auf 300.000/360.000 ms angehobenem `maxWaitForFcp`/`maxWaitForLoad` maß derselbe Befehl unter Last `observedFirstContentfulPaint = observedLargestContentfulPaint = 125.226 ms` — ein realer, fast 2,5 Minuten verzögerter erster Paint, kein Lighthouse-Bug: nur 2 Long Tasks bei ~125.144 ms lagen im Trace, der Rest der Zeit war die Seite schlicht nicht dran.
**Fix:** Vor jeder Messreihe `ps`/Aktivitätsanzeige prüfen und andere Browser-/Node-Prozesse beenden; bei einem `NO_FCP` oder ungewöhnlich hohem `observedFirstContentfulPaint` zuerst Maschinenlast als Ursache ausschließen, bevor am Code gesucht wird.
**Beleg:** mccain-digital, 16.9.2026, `.../lh/old-mobile-simulate.json` + `old-extended-diag.json` (siehe auch `scratchpad/swgl_fcp.mjs`-Messung am selben Tag mit 17 parallelen Chrome-Prozessen). · Sicherheit: gemessen
**Gilt für:** allgemein

### 11. Treiber von Messlogik trennen, und die Version pinnen
**Warum:** Ein Mess-/Test-Werkzeug, das auf einer Zielumgebung zuverlässig hängt (kein Timeout, kein Fehler), ist als Gate wertlos, egal wie gut seine Messlogik ist. Zwei Maschinen, die mit unterschiedlichen Browser-Treiber-Versionen gegen dieselben Gates messen, liefern keine validen Vorher/Nachher-Vergleiche.
**Woran man es erkennt:** `agent-browser set viewport` hing wiederholt an zwei Tagen ohne Output, Exit oder Fehler, auch nach vollständiger Bereinigung verwaister Chrome-Prozesse.
**Fix:** Treiber (Browser-Start, Viewport, CPU-Throttle) strikt von der Messlogik trennen — genau das leistet `scripts/lib/browser.mjs`: die eigentlichen Probe-Skripte lesen/werten wörtlich dieselbe Logik aus, unabhängig vom darunterliegenden Treiber. Playwright-/Chromium-Version projektweit fixieren (`scripts/package.json`), nicht pro Maschine frei aktualisieren lassen.
**Beleg:** mccain-digital, Commit `a8ec5a8` („a gate that cannot be run is not a gate", 2026-09-10) und Commit `06a6d09` (Treiber gepinnt, 2026-09-10). · Sicherheit: gemessen
**Gilt für:** allgemein

### 12. Erste Messung nach einem (Re)Start ist oft ein Kaltstart-Ausreißer — mehrfach messen, den warmen Wert nehmen
**Warum:** Server-/Runtime-Vorgänge, die nur beim allerersten Request einer Ressource laufen (eine synchrone Bild-Encodierung beim ersten Zugriff, ein Lambda-/Serverless-Cold-Start, eine erste Kompilierung), machen die erste Messung nach einem (Re)Start strukturell schlechter als jede folgende — das ist kein Messfehler, aber auch keine Zahl, die die Produktion widerspiegelt, wenn Produktion die aufwendige Arbeit bereits einmalig erledigt und danach cached.
**Woran man es erkennt:** Eine lokale Lighthouse-Mobile-Messung gegen `next start` zeigte beim allerersten Bild-Request LCP ~9,4 s / Score 75, weil `next start` das Bild synchron zu AVIF encodierte; alle Folgemessungen (Bild bereits im lokalen Cache) lagen bei Score 95, LCP 2,8 s, TBT 20 ms.
**Fix:** Nach jedem (Re)Start/Deploy nicht die erste Messung als Wahrheit nehmen, sondern mehrfach messen und den eingeschwungenen (warmen) Wert verwenden — er entspricht dem echten Produktions-Steady-State, wenn ein CDN/Cache die teure Erstarbeit ohnehin nur einmal trägt.
**Beleg:** 360 (company-portal), Wave 6, siehe [fallstudien.md](fallstudien.md#wave-6--360-company-portal--cold-cache-artefakt-bei-next-start). · Sicherheit: gemessen
**Gilt für:** allgemein, Vercel

## Lighthouse CLI, PageSpeed Insights, DevTools

Alle Angaben in diesem Abschnitt: Lighthouse 13.4.1 (main-Branch = aktuelles npm-„latest"), Stand 2026-09-16.

### 13. Drei Drosselungsarten kennen: simulate, devtools, provided
**Warum:** `--throttling-method` bestimmt, WIE eine Seite gedrosselt und WAS am Ende berichtet wird. `simulate` (Lantern) ist der Default von CLI **und** PSI; `devtools` drosselt real per Chrome DevTools Protocol; `provided` fügt gar keine zusätzliche Drosselung hinzu (z. B. bei echtem gedrosseltem Mobilfunk über ein Gerät, kombiniert mit `--screenEmulation.disabled --throttling.cpuSlowdownMultiplier=1`).
**Woran man es erkennt:** PSI-Lab-Diagnosen laufen laut offizieller Doku *immer* mit simuliertem Throttling — nie mit `devtools`.
**Fix:** Für PSI-nahe lokale Zahlen `--throttling-method` unangetastet lassen (Default = simulate); `devtools` nur bewusst wählen, wenn reale CDP-Drosselung gebraucht wird, z. B. um zu sehen, wie sich eine Seite unter echtem Netzwerk-Delay tatsächlich verhält.
**Beleg:** Quelle: GoogleChrome/lighthouse `docs/throttling.md`, 13.4.1, 2026-09-16. · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 14. Die 5,25-s-Ruhefenster gelten nicht für PSI
**Warum:** Frühere Annahme: PSI warte 5,25 s auf Netzwerk-/CPU-Ruhe, bevor es abschließt. Das ist falsch — Verwechslung mit dem devtools-Modus. `core/config/config.js::overrideThrottlingWindows()` hebt `pauseAfterFcpMs`/`pauseAfterLoadMs`/`networkQuietThresholdMs`/`cpuQuietThresholdMs` nur dann von 1000 ms auf 5250 ms an, wenn `throttlingMethod` **nicht** `simulate` ist. PSI bleibt aber laut `lr-mobile-config.js`/`lr-desktop-config.js` und offizieller Doku immer bei `simulate`. Details zur Widerlegung: [widerlegt.md](widerlegt.md#1-psi-wartet-525-sekunden-auf-netzwerk-cpu-ruhe).
**Woran man es erkennt:** Die lr-Configs überschreiben tatsächlich nur `maxWaitForFcp` (15.000 ms) und `maxWaitForLoad` (35.000 ms) — beides *niedriger* als der CLI-Default (30.000/45.000 ms), nicht höher.
**Fix:** Für PSI-genaue lokale Läufe die vier Quiet-Settings beim generischen 1000-ms-Default belassen; die 5250-ms-Werte nur erwarten, wenn `--throttling-method` explizit auf `devtools` oder `provided` gesetzt wird.
**Beleg:** Quelle: GoogleChrome/lighthouse `core/config/{constants.js,config.js,lr-mobile-config.js}`, 13.4.1, 2026-09-16. · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 15. PSI drosselt die CPU mobil mit 1,2x, nicht mit 4x — Desktop gar nicht
**Warum:** `lr-mobile-config.js` überschreibt `cpuSlowdownMultiplier` explizit auf **1,2** (Kommentar im Code: „Determined using PSI CPU benchmark median"), weil die Lightrider-VMs selbst schon deutlich langsamer sind als eine typische Dev-Maschine. Das generische 4x ist nur der CLI-/DevTools-Panel-Default (`mobileSlow4G`-Preset) — kein PSI-Abbild. Desktop-PSI nutzt `cpuSlowdownMultiplier=1` (kein Throttle).
**Woran man es erkennt:** `scripts/mainthread.mjs --cpu 4` und `scripts/quiet`-artige TTI/TBT-Läufe sind bei 4x ein bewusster Stresstest; absolute Millisekunden dort sind NICHT direkt mit einem PSI-Bericht vergleichbar — nur die Proportionen zwischen den Gruppen bleiben aussagekräftig.
**Fix:** Für einen PSI-nahen Vergleichswert `--cpu 1.2` auf Mobile-Läufen nutzen; 4x explizit als Härtetest kennzeichnen, nicht als PSI-Erwartungswert kommunizieren.
**Beleg:** Quelle: GoogleChrome/lighthouse `core/config/lr-mobile-config.js`, 13.4.1, 2026-09-16; Kopfkommentar `scripts/mainthread.mjs`. · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 16. PSI lokal exakt nachbilden: Gerät, Netzwerk, Config
**Warum:** Die genaueste lokale Annäherung an PSI ist, `lr-mobile-config.js`/`lr-desktop-config.js` 1:1 als eigene Lighthouse-Config zu verwenden — `throttlingMethod` bleibt dabei automatisch bei `simulate`.
**Woran man es erkennt:** PSI-Mobile-Emulation: Moto G Power, 412×823 CSS-px, `deviceScaleFactor:1.75`. PSI-Desktop: 1350×940, `deviceScaleFactor:1`. Netzwerk mobil: RTT 150 ms, 1,6 Mbps down / 750 Kbps up; Desktop: RTT 40 ms, 10 Mbps. PSI überspringt zusätzlich zwei Audits (`modern-http-insight`, `bf-cache` — Letzteres, weil es in Headless immer scheitert), die daher lokal ebenfalls fehlen dürfen, ohne ein Bug zu sein. INP läuft im PSI-Lab-Bericht grundsätzlich nie (Audit ist `timespan`-only und liefert `notApplicable:true` unter `simulate`) — kein fehlender Wert ist hier kein Fehler.
**Fix:** `node scripts/lighthouse-psi.mjs <url> [--desktop] [--method simulate|devtools] [--runs 5] [--keep] [--json]` — baut automatisch dieselbe Config wie `lr-mobile-config.js`/`lr-desktop-config.js` (`maxWaitForFcp` 15000, `maxWaitForLoad` 35000, `skipAudits` `modern-http-insight`+`bf-cache`, mobil `cpuSlowdownMultiplier` 1,2 bzw. Desktop 1 mit `rttMs` 40/`throughputKbps` 10.240) und ruft damit den echten `lighthouse`-Befehl auf; warnt selbst automatisch bei einem LCP-Kandidaten > 3000 ms nach FCP oder einem Trace-Ende > 20 s. Für eine reine Handkopie ohne dieses Skript: `lighthouse <url> --config-path=./lr-mobile-config.js` (Config aus dem Lighthouse-Repo). Achtung dabei: `--preset`/`--config-path` sind nur CLI-Flags — bei programmatischer Nutzung über das Node-Modul werden sie ignoriert, dort muss die Config als drittes Argument an `lighthouse()` übergeben werden. Die übrigen Skripte in diesem Ordner (`mainthread.mjs`, `fps.mjs` &c.) messen dagegen bewusst OHNE Lighthouse-Abhängigkeit über eigene CDP-Aufrufe (`scripts/lib/browser.mjs` `MOBILE`/`DESKTOP`-Presets) — beide Wege existieren parallel für unterschiedliche Fragen.
**Beleg:** Quelle: GoogleChrome/lighthouse `core/config/constants.js`, `docs/readme.md`, 13.4.1, 2026-09-16; Kopfkommentar `scripts/lighthouse-psi.mjs` (Settings 1:1 aus lighthouse@13.4.1 `lr-mobile-config.js`/`lr-desktop-config.js` abgeschrieben, im npx-Cache verifiziert). · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 17. Varianzquellen kennen: PSI-Hardware ist fix, deine Maschine nicht
**Warum:** Laut Lighthouses eigener Varianz-Doku sind Hardware- und lokale Netzwerk-Varianz auf PSI „UNLIKELY" (feste Lightrider-VMs), auf einer normalen lokalen Maschine dagegen „LIKELY" — das ist die Hauptursache für Abweichungen zwischen einem lokalen Lauf und PSI. Seiten-Nichtdeterminismus (z. B. zeitgesteuerte Inhaltswechsel) bleibt dagegen *immer* unmitigiert, auch auf PSI selbst.
**Woran man es erkennt:** Ein exakt PSI-konfigurierter lokaler Lauf derselben v5-Seite maß wiederholt Score 100 mit LCP-Element `img.s23` (Logo) — kein lokaler Trace erfasste je die rotierende Hero-Headline als Kandidaten (Trace-Ende 2,4 s bei simulate bzw. 13,3 s bei devtools, jeweils vor `animation-delay:13.5s`). Der Owner maß auf derselben Seite über den echten PSI-Dienst dagegen einen Einbruch auf Performance 60 mit LCP-Render-Delay 20.490 ms auf der Headline (`span.v5-r`). Der Mechanismus dahinter ist inzwischen bestätigt (Regel 20, Commit `ca40094`): eine seinerzeit noch vorhandene Rotation erzeugte neue, spätere LCP-Kandidaten. Offen bleibt nur, warum die lokale, config-genaue Kopie strukturell keine Chance hatte, dieselbe Rotation überhaupt zu sehen, während der echte PSI-Dienst es tat — vermutlich, weil PSIs tatsächliche Wanduhrzeit pro Lauf länger reicht als das, was ein lokaler `simulate`-Trace beobachtet, bevor er endet.
**Fix:** Für konsistente lokale Läufe dedizierte, nicht-burstable Hardware nutzen (≥2 Kerne, 4 empfohlen; ≥2 GB RAM, 4–8 GB empfohlen — AWS t-Familie, GCP N1/E2 shared-core und FaaS wie Lambda explizit meiden), ≥5 Läufe messen und den Median nehmen (z. B. `@lhci/cli` mit `lhci collect -n 5`, optional direkt gegen die echte PSI-API mit `--mode psi --psiApiKey=...`); bei einer Seite mit zeitgesteuertem Content (Rotation, verzögertes Nachladen) zusätzlich prüfen, ob ein späterer, größerer Kandidat erst nach dem Ende des eigenen lokalen Trace einträfe (Regel 20) — das ist bei einem dramatischen PSI-Einbruch die wahrscheinlichere Erklärung als reine Hardware-Varianz.
**Beleg:** Quelle: GoogleChrome/lighthouse `docs/variability.md`, 13.4.1, 2026-09-16; Commit `ca40094` (16.9.2026) und [fallstudien.md](fallstudien.md#2026-09-16--mccain-digital--v5-optimierungsrunde-und-chromium-verifikation) bestätigen den Mechanismus nachträglich für diesen Fall. · Sicherheit: gemessen (Mechanismus) / dokumentiert (Hardware-Varianz)
**Gilt für:** allgemein

## Observed vs. simuliert, und wann das Messfenster endet

### 18. „observed" ist die reale Tracezeit — der Bericht ist bei simulate eine Nachrechnung
**Warum:** Bei `throttlingMethod=simulate` lädt Chrome die Seite einmal weitgehend ungedrosselt und zeichnet den Trace auf; Lantern baut daraus einen Netzwerk- + CPU-Abhängigkeitsgraphen und „spielt" ihn mit angepassten RTT-/Durchsatz-Werten und CPU-Dauer×Multiplikator erneut ab. Die im Bericht ganz oben stehenden Werte (`firstContentfulPaint`, `largestContentfulPaint`, …) sind bei simulate also SIMULIERT, nicht die literalen Zeitstempel aus dem Trace — das sind die `observed*`-Felder.
**Woran man es erkennt:** Im selben simulate-Lauf: `observedFirstContentfulPaint: 80 ms`, aber `firstContentfulPaint (final): 797 ms`. Unter `--throttling-method=devtools` (keine Simulation nötig, die Drosselung war schon real) sind beide Werte identisch: `observedFirstContentfulPaint: 1533 ms` = `firstContentfulPaint (final): 1533 ms`. Ein Extremfall mit künstlich angehobenem `maxWaitForFcp`/`maxWaitForLoad` (300.000/360.000 ms statt Default 30.000/45.000 ms) zeigt die Spannweite: `observedFirstContentfulPaint = observedLargestContentfulPaint = 125.226 ms` (ein realer, durch Maschinenlast fast 2,5 Minuten verzögerter erster Paint, siehe Regel 10), während der simulierte, berichtete Wert bei `firstContentfulPaint: 777 ms`/`largestContentfulPaint: 1727 ms` blieb — Lantern rechnet aus dem Netzwerk-/CPU-Graphen neu, unabhängig davon, wie lange der reale Trace tatsächlich brauchte.
**Fix:** Beim Lesen eines Lighthouse-JSON-Reports immer prüfen, welcher `throttlingMethod` galt, bevor `observed*` gegen die Top-Level-Metrik verglichen wird — bei simulate sind das zwei verschiedene Dinge, bei devtools dasselbe.
**Beleg:** mccain-digital, 16.9.2026, `.../lh/old-mobile-simulate.json` vs. `old-mobile-devtools.json`, Extremfall `.../lh/old-extended-diag.json`. Bekannte Lantern-Schwäche: „if there's a single slow render-blocking request that shares an origin with several fast responses then Lighthouse will underestimate page load time" — und ein dokumentiertes Divergenz-Beispiel, bei dem eine beobachtete, ungedrosselte LCP von 2,4 s auf 11,8 s (~5x) simuliert hochgerechnet wurde. · Sicherheit: gemessen
**Gilt für:** allgemein

### 19. LCP-Reporting endet an echter Eingabe, nicht an Mausbewegung
**Warum:** Das Reporting stoppt bei einem echten, „trusted" Scroll-Event ODER einem aufgelösten Input-Event — Letzteres nur bei vollständigem Klick/Tap (`pointerdown`+`up`/`click`) oder vollständigem Tastendruck (`keydown`+`keyup`). `mousemove`/Hover erzeugen nie eine `interactionId` und stoppen deshalb NICHT.
**Woran man es erkennt:** `scripts/lcp-window.mjs --interact N` löst die Grenze absichtlich per Tab-Taste aus (ein vollständiger Tastendruck) und markiert den Zeitpunkt in der Ausgabe: „LCP-Reporting sollte ab hier enden."
**Fix:** Bei jeder automatisierten LCP-Messung mit `mousemove` operieren, wenn das Fenster bewusst offen bleiben soll; einen echten Tastendruck/Klick nutzen, wenn das reale Nutzerverhalten (das Reporting beendet) simuliert werden soll.
**Beleg:** Quelle: W3C Largest Contentful Paint Working Draft, Event-Timing-Spec, abgerufen 2026-09-16; Implementierung `scripts/lcp-window.mjs`. · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 20. Ein späterer, größerer Kandidat wird LCP bis Fensterende oder Eingabe
**Warum:** Bei jedem Paint vergleicht der Algorithmus die Größe neu gemalter Bilder/Textknoten gegen die bisher größte; nur ein größerer Kandidat erzeugt einen neuen Eintrag — der zuletzt gemeldete zählt, solange weder Scroll noch Input stattfand. Das gilt auch für nachladende Bilder oder eine JS-Rotation von Headlines.
**Woran man es erkennt:** `scripts/lcp-window.mjs` protokolliert JEDEN LCP-Kandidaten mit Zeit/Größe/Element und markiert einen Kandidaten > 3000 ms nach FCP explizit als `WARNUNG: später LCP-Kandidat`.
**Fix:** Bei der Interpretation eines LCP-Werts immer die volle Kandidaten-Timeline lesen, nicht nur den finalen Wert. Zähl-Feinheiten, die dabei mitspielen: jedes Element wird genau einmal gemeldet (ein späterer Web-Font-Swap am selben Element erzeugt keinen zweiten Eintrag, nur ein dadurch neu größtes ANDERES Element würde einen neuen Kandidaten setzen); ein Kandidat mit Fläche = exakt Viewport-Fläche zählt nie (Splash-Screen-Heuristik); ein neuer Kandidat, der sich in Breite UND Höhe um ≤ 3 px vom aktuellen unterscheidet, wird verworfen (Rauschfilter); ein entferntes Element bleibt trotzdem Kandidat, bis ein größeres erscheint; ein Bild zählt nur, wenn sein Transfergewicht ≥ 0,004 Byte/Pixel beträgt (filtert komprimierte Gradient-Platzhalter), und wird bei Upscaling über seine natürliche Auflösung hinaus im Gewicht durch den Skalierungsfaktor geteilt.
**Beleg:** mccain-digital, 16.9.2026: kein lokaler Lauf zeigte ein Element der Klassen `v5-r`/`v5-w` (rotierende Headline) als LCP-Kandidaten — bei simulate lag der einzige Kandidat bei 106 ms (Logo `img.s23`), bei devtools-Throttling endete der Trace vor der ersten CSS-Rotation (`animation-delay:13.5s`). Der reale Mechanismus dahinter ist über den echten Owner-Lauf bestätigt: Commit `ca40094` (16.9.2026) behebt eine rotierende Hero-Headline, deren drei Varianten (13,5/20/26,5 s) je einen neuen, größeren LCP-Kandidaten erzeugten und den Score von 95 auf 60 einbrechen ließen (LCP 20,5 s) — nach Entfernen der Rotation wieder Performance 100 (Details: [fallstudien.md](fallstudien.md#2026-09-16--mccain-digital--v5-optimierungsrunde-und-chromium-verifikation)). Quelle Zählregeln: W3C Largest Contentful Paint Working Draft §Report/§Effective visual size, abgerufen 2026-09-16. · Sicherheit: gemessen (Projektfall) / dokumentiert (Zählregeln)
**Gilt für:** allgemein

### 21. Ein zu später erster Paint verschiebt das ganze Messfenster
**Warum:** Wartet der erste Paint der gesamten Seite auf einen synchron blockierenden Vorgang (z. B. `getContext("webgl")` unter Software-GL), verschiebt sich damit auch der Ausgangspunkt jeder nachfolgenden Fenstermessung — inklusive der Frage, welche später erscheinenden, größeren Elemente noch als LCP-Kandidat in Frage kommen (Regel 20) und ob der Trace lange genug läuft, um sie zu erfassen.
**Woran man es erkennt:** Mobil emuliert, `getContext` vor dem Seitenskript gewrappt: mit GPU (ANGLE Metal) lag FCP bei 188 ms, `getContext` blockierte 12 ms; mit SwiftShader (Software-GL) lag FCP bei 2216–2392 ms, `getContext` allein blockierte 230–341 ms als Long Task — CPU-Drosselung änderte daran fast nichts, weil der GPU-Prozess nicht gedrosselt wird.
**Fix:** FCP-Verzögerung gezielt unter einer Software-GL-Variante messen: `scripts/fps.mjs <url> --software-gl` zeigt den Frameraten-/Renderer-Effekt; die FCP-Zeile selbst braucht einen `softwareGl:true`-Lauf von `scripts/lcp-window.mjs` — `lib/browser.mjs` unterstützt die Option bereits (`launch({softwareGl:true})`), `lcp-window.mjs` liest aktuell aber kein `--software-gl`-Flag aus den Argumenten; bis das ergänzt ist, den Aufruf mit einer lokalen Kopie der `launchOpts`-Zeile ergänzen.
**Beleg:** mccain-digital, 16.9.2026, `scratchpad/swgl_fcp.mjs` (3 Szenarien, je 1 Lauf, ruhige Maschine); Zusammenhang mit Lighthouse: derselbe Tag maß unter Maschinenlast `observedFirstContentfulPaint: 125.226 ms` auf derselben Seite (siehe Regel 10). · Sicherheit: gemessen
**Gilt für:** allgemein, WebGL/Canvas

## Hauptthread lesen: Gruppen, Eigenzeit, "Other"

### 22. Die 7 Gruppen von Lighthouses Main-thread work breakdown, und was "Other" ist
**Warum:** Lighthouse sortiert jedes Trace-Ereignis in eine von sechs benannten Gruppen; der Rest landet in „Other" — der einen Zeile, die niemand direkt reparieren kann, weil sie nur über das definiert ist, was sie NICHT ist. Ein Ereignis ohne explizite Zuordnung erbt die Gruppe seines Parent-Tasks; nur ein wirklich unbekanntes Top-Level-Ereignis ohne gemappten Vorfahren landet in „Other".
**Woran man es erkennt:** Die 7 Gruppen exakt: `parseHTML` (ParseHTML, ParseAuthorStyleSheet), `styleLayout`/„Stil+Layout" (ScheduleStyleRecalculation, UpdateLayoutTree, InvalidateLayout, Layout), `paintCompositeRender`/„Rendern" (Animation, Paint, RasterTask, CompositeLayers, PrePaint …), `scriptParseCompile`/„Kompil." (v8.compile, v8.parseOnBackground), `scriptEvaluation`/„Skript" (EventDispatch, EvaluateScript, TimerFire, FireAnimationFrame …), `garbageCollection`/„GC" (MinorGC, MajorGC, BlinkGC.AtomicPhase), `other`/„Other" — explizit nur drei Task-Hüllen (`MessageLoop::RunTask`, `TaskQueueManager::ProcessTaskFromWorkQueue`, `ThreadControllerImpl::DoWork`) plus alles Unbekannte. Die angezeigten Dauern sind rohe Self-Times × `cpuSlowdownMultiplier` (nur bei simulate) — bei PSI mobil also ×1,2, bei Desktop ×1 (siehe Regel 15): absolute ms bei einem lokalen 4x-Lauf sind daher kein PSI-Abbild, nur die Proportionen zwischen Gruppen bleiben vergleichbar.
**Fix:** `node scripts/mainthread.mjs <url> --top 15` — druckt die Gruppentabelle UND die teuersten Einzelereignisse mit Funktionsname/Skript-URL, damit „Other" nicht als Sackgasse endet, sondern als konkrete Ereignisliste.
**Beleg:** Quelle: GoogleChrome/lighthouse `core/lib/tracehouse/task-groups.js` und `core/lib/tracehouse/main-thread-tasks.js`, `core/audits/mainthread-work-breakdown.js`, 13.4.1, 2026-09-16; 1:1 nachgebaut in `scripts/mainthread.mjs`. · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 23. IntersectionObserver-Kosten stecken oft in "Other" und skalieren mit Zielen, nicht Instanzen
**Warum:** `IntersectionObserverController::computeIntersections` läuft zwischen den Frames im Browser, nicht in einer eigenen benannten Funktion — es taucht in KEINEM JS-/CPU-Profil auf und fällt in Lighthouses Trace-Gruppierung typischerweise unter „Other". Die Kosten skalieren mit der Zahl der BEOBACHTETEN ZIELE, nicht mit der Zahl der Observer-Instanzen: ein Observer mit 400 Zielen kostet wie 400 Observer mit je einem.
**Woran man es erkennt:** `scripts/mainthread.mjs` weist IntersectionObserver-Ereignisse separat aus, statt sie in „Other" verschwinden zu lassen; `scripts/observers.mjs` zeigt zusätzlich die maximale Zielzahl je Observer-Instanz und deren Entstehungsort (Stack-Trace).
**Fix:** `node scripts/observers.mjs <url> --sweep` — zählt Ziele pro Observer-Instanz und Callback-Häufigkeit; Instanz mit sehr vielen Zielen ist der eigentliche Kostentreiber, nicht die Zahl der `new IntersectionObserver(...)`-Aufrufe.
**Beleg:** Herkunft: `tools/iocount.mjs`, `tools/mainthread.mjs` (mccain-digital). Hinweis zur Konfidenz: dass IntersectionObserver-Kosten konkret in „Other" statt in einer eigenen Kategorie landen, ist praktisch beobachtet und in `scripts/mainthread.mjs` fest codiert, aber nicht wörtlich in offizieller Lighthouse-Dokumentation bestätigt — nur der generische Fallback-Mechanismus (unbekanntes Ereignis → Parent-Gruppe → „Other") ist am Quellcode verifiziert. · Sicherheit: gemessen (Kostenskalierung) / vermutet (Zuordnung zu „Other" im Detail)
**Gilt für:** allgemein

### 24. Lighthouses Skriptkosten-Spalte pro URL ist eine Zuordnung, keine Anfragezahl
**Warum:** Lighthouse rechnet ausgeführte/inline Skriptkosten der Dokument-URL als Herkunfts-Label zu; dieselbe URL kann dadurch in einer Kosten-/Attributionstabelle mehrfach auftauchen, ohne dass die Seite tatsächlich mehrfach angefragt wurde.
**Woran man es erkennt:** Ein Bericht schien zu zeigen, dass die eigene Seiten-URL „6× angefragt" wurde; die tatsächliche Netzwerkmessung zeigte 1 Dokument-Request und 25 Requests insgesamt.
**Fix:** Bei einer wiederholt auftauchenden URL in einer Lighthouse-Kosten-/Attributionsspalte zuerst prüfen, ob es sich um eine Skriptkosten-Zuordnung statt eines Requests handelt, und mit einer echten Netzwerkmessung gegenprüfen (`node scripts/requests.mjs <url> --for 12`) statt die Spalte direkt als Netzwerkbefund zu werten.
**Beleg:** mccain-digital, Commit `80beb85` (2026-09-13). · Sicherheit: gemessen
**Gilt für:** allgemein

### 25. V8-Coverage-Bereiche sind verschachtelt, ein naives count>0 meldet 0 % tot für jede Datei
**Warum:** V8s JS-/CSS-Coverage-API liefert Bereiche verschachtelt, äußerster zuerst — ein äußerer Bereich (z. B. eine ganze Funktion) hat fast immer `count > 0`, selbst wenn der innere, eigentlich interessante Bereich nie ausgeführt wurde. Eine naive Prüfung „`count > 0` = benutzt" trifft dadurch fast immer zuerst den äußeren Bereich und meldet praktisch jede Datei als 0 % tot.
**Woran man es erkennt:** Eine so gebaute Coverage-Auswertung meldete 0 % toten Code für jede einzelne Datei im Projekt, unabhängig vom tatsächlichen Nutzungsgrad.
**Fix:** Coverage-Bereiche nach Start-Offset UND Verschachtelungstiefe auswerten und die INNERSTE (am spätesten startende, am engsten umschließende) Range für eine gegebene Codeposition gewinnen lassen, nicht die erste mit `count > 0`. Dieser Skill liefert aktuell kein eigenes Coverage-Skript (Playwright `page.coverage.startJSCoverage()`/`Profiler.takePreciseCoverage()` sind die Rohquelle) — bis eins existiert, diese Verschachtelungsregel in jeder eigenen Coverage-Auswertung von Hand beachten.
**Beleg:** mccain-digital, Commit `0c5eae6` (2026-09-13, Kopfkommentar `deadcode.mjs`); siehe auch [widerlegt.md](widerlegt.md#22-die-v8-coverage-regel-count-größer-0-liefert-einen-korrekten-tot-code-anteil). · Sicherheit: gemessen
**Gilt für:** allgemein

## Beobachter selbst beobachten: IntersectionObserver, ResizeObserver, Timer, rAF

### 26. Timer, rAF und Observer vor dem ersten Seitenskript patchen
**Warum:** Ohne `addInitScript` (vor `page.goto`) hält die Seite zum Patch-Zeitpunkt schon eine Referenz auf die native Funktion (z. B. `const IO = window.IntersectionObserver` im allerersten `<script>`) — der Patch käme zu spät, die Messung wäre leer oder unvollständig.
**Woran man es erkennt:** `scripts/observers.mjs` ersetzt `IntersectionObserver`, `ResizeObserver`, `Element.prototype.getBoundingClientRect`, `setTimeout` und `requestAnimationFrame` per `context.addInitScript()`, bevor die Seite überhaupt navigiert.
**Fix:** `node scripts/observers.mjs <url> --for 15 --sweep` — zählt `getBoundingClientRect`-Aufrufe pro Sekunde UND pro Call-Stack (zeigt, WER liest), bucketet `setTimeout`-Aufrufe nach Verzögerung (deckt Polling-Loops mit fester Millisekundenzahl auf) und `requestAnimationFrame`-Aufrufe pro Sekunde (deckt Endlosschleifen auf, die im Profiler unauffällig wie normale ~60/s-Bildwiederholung aussehen).
**Beleg:** Herkunft: `tools/count.mjs`, `tools/iocount.mjs` (mccain-digital); Prinzip 1:1 in `scripts/observers.mjs`. · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 27. ResizeObserver auf body mit height:100% ist ein Unschulds-Artefakt, kein Beweis
**Warum:** Ist `html,body{height:100%}` gesetzt, ändert `document.body` seine Höhe praktisch nie, egal wie viel Inhalt sich intern ändert — ein `ResizeObserver` darauf feuert dann fast nie, selbst wenn er der Hauptverdächtige für Dauerlast war.
**Woran man es erkennt:** Ein per `ResizeObserver` auf `<body>` gemessener „Hauptverdächtiger" für Dauerlast maß sich mit `scripts/observers.mjs`-artiger Instrumentierung „unschuldig": 4 Aufrufe in 22 s.
**Fix:** Beobachte die tatsächliche Komponentenwurzel (z. B. `#root`/`#app`), nicht pauschal `document.body`, wenn `height:100%` im Spiel ist — sonst wird ein „0 Callbacks"-Ergebnis fälschlich als Entwarnung gelesen.
**Beleg:** mccain-digital, HANDOFF (Fund via `tools/count.mjs`). · Sicherheit: gemessen
**Gilt für:** allgemein

## content-visibility messen

### 28. contentvisibilityautostatechange ist der einzige verlässliche Beweis, die 150-%-Marge gehört gemessen
**Warum:** `content-visibility:auto` entscheidet sein Skip/Show-Verhalten über einen internen, dokumentweiten IntersectionObserver mit `kViewportMarginPercentage = 150.f` (Chromium-Quellcode). Das ist ein Implementierungsdetail, kein garantierter Spec-Wert — Polling per `getComputedStyle` verpasst oder verfälscht den genauen Umschlagpunkt.
**Woran man es erkennt:** Das native Event `contentvisibilityautostatechange` (mit `e.skipped`) feuert einmal initial pro Block und danach nur bei einem echten Zustandswechsel — kein Polling nötig, aber Feature-Detection ist Pflicht (`"oncontentvisibilityautostatechange" in document.body`), sonst wird „keine Events" fälschlich als „nichts wird deferred" statt als „Browser unterstützt es nicht" gelesen.
**Fix:** `node scripts/cv-audit.mjs <url>` — hört den Event-Kanal, scannt danach jedes Element mit berechnetem `content-visibility:auto`/`hidden`, und führt einen Scroll-Sweep in 0,5-Viewport-Schritten, der die tatsächliche Render-Marge pro Block in Pixel UND % Viewporthöhe ausgibt, statt die 150 % anzunehmen.
**Beleg:** Quelle: Chromium HEAD `cabdc32a` (abgerufen 16.09.2026), `display_lock_document_state.cc:123-135`; CSS Containment 2 §4.3: „Elements with content-visibility: auto that have not determined proximity to the viewport must determine their proximity … in the next update the rendering cycle." Nur `auto` ist betroffen — `hidden` bleibt dauerhaft gesperrt. · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 29. Seitenhöhe vor und nach einem vollständigen Scroll vergleichen
**Warum:** Weicht die Gesamthöhe der Seite nach einem kompletten Scroll-Durchlauf von der Höhe vor dem Scroll ab, ist `contain-intrinsic-size` falsch geschätzt — der Platzhalter hatte auf mindestens einer Achse keine passende reservierte Größe, und die Seite springt beim echten Scrollen.
**Woran man es erkennt:** `scripts/cv-audit.mjs` misst `document.documentElement`-Höhe vor dem Sweep und danach und meldet die Differenz in Pixel als Befund.
**Fix:** Bei jedem content-visibility-Umbau `scripts/cv-audit.mjs` ohne `--no-sweep` laufen lassen und auf „Seitenhöhe ändert sich beim Scrollen um …px" prüfen, bevor der Umbau als abgeschlossen gilt.
**Beleg:** Skript-Logik `scripts/cv-audit.mjs`, Herkunft `tools/cvtest.mjs` (mccain-digital). · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 30. IO-Ziel in übersprungenem content-visibility-Block: Kosten in der Bootstrap-Phase
**Warum:** Frühere, zu scharfe Lesart: „Ein IntersectionObserver-Ziel in einem bereits übersprungenen Subtree erzwingt pro Frame Style/Layout." Für den eingeschwungenen Zustand ist das widerlegt (Details: [widerlegt.md](widerlegt.md#6-intersectionobserver-ziele-in-gesperrten-subtrees-erzwingen-pro-frame-layout)) — `IntersectionGeometry::GetTargetLayoutObject` gibt für Nachfahren übersprungener Subtrees `nullptr` zurück, ohne Style/Layout zu erzwingen. Zwei belegte Mechanismen erklären den gemessenen Effekt stattdessen: (a) in der Bootstrap-Phase, bevor die Nähe zum Viewport überhaupt bestimmt ist, läuft für jedes Ziel eine echte Geometrie-Berechnung — die Kosten skalieren hier mit der Zielzahl; (b) jedes Layout-lesende Aufruf (`getBoundingClientRect`, `offset*`, `client*`, `scroll*`) auf einem Knoten IN einem übersprungenen Block erzwingt Style + Layout der gesperrten Vorfahren — und lädt dabei deren CSS-Bilder (`background-image`/`mask-image`), weil Bild-Fetches beim Style-Recalc starten, nicht bei Layout/Paint.
**Woran man es erkennt:** `scripts/observers.mjs` (Ziel-Zahl je Observer) kombiniert mit `scripts/cv-audit.mjs` (Skip/Show-Zustand je Block) zeigt, ob viele IO-Ziele in einer Bootstrap-Phase gleichzeitig aktiv sind, und `scripts/mainthread.mjs` zeigt, ob Layout-Lese-Aufrufe zeitlich mit dem Laden von Hintergrundbildern zusammenfallen.
**Fix:** Beobachtung/Messung eines Elements erst starten, wenn der umschließende Block gerendert hat (`contentvisibilityautostatechange` mit `e.skipped === false`), statt Ziele blind schon während der Bootstrap-Phase zu registrieren.
**Beleg:** Chromium HEAD `cabdc32a` (16.09.2026), CSS Containment 2 §4.3/§4.5; gemessener Effekt: 28 → 11 Anfragen, `computeIntersections` 508 ms bei 132 Zielen → 97 ms bei 25 Zielen. Projektfall: mccain-digital, Commit `902108a`/`ca40094` (16.9.2026), siehe [fallstudien.md](fallstudien.md#2026-09-16--mccain-digital--v5-optimierungsrunde-und-chromium-verifikation). · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 31. Screenshot und IntersectionObserver lügen für übersprungene Blöcke
**Warum:** Übersprungener Inhalt wird nicht gemalt — ein Vollseiten-Screenshot zeigt für jeden noch `skipped`-Block nichts Verlässliches. IntersectionObserver-Ziele darin lösen ebenfalls nicht aus.
**Woran man es erkennt:** `document.getAnimations()` sieht keine CSS-Animationen in übersprungenen content-visibility-Blöcken — „nicht gefunden" heißt hier „noch nicht gerendert", nicht „existiert nicht".
**Fix:** Vor einem visuellen Vergleich oder einer Animations-/Sichtbarkeitsprüfung den Block einmal aktiv rendern (Scroll-Sweep — bei `scripts/cv-audit.mjs` standardmäßig an, nur per `--no-sweep` abschaltbar; bei `scripts/animations.mjs` per `--sweep` einschalten), statt den Anfangszustand als vollständig zu behandeln.
**Beleg:** Skript-Kopfkommentar `scripts/cv-audit.mjs`, `scripts/animations.mjs`. · Sicherheit: dokumentiert
**Gilt für:** allgemein

## fps und Software-GL

### 32. fps per rAF-Sampling über viele Frames messen, p95 nicht Einzeldifferenz
**Warum:** Eine fps-Zahl aus EINER `performance.now()`-Differenz zweier Frames ist Rauschen — ein einzelner GC-Pause-Frame verzerrt das Ergebnis vollständig.
**Woran man es erkennt:** `scripts/fps.mjs` sammelt jeden `requestAnimationFrame`-Zeitstempel über das gesamte Messfenster IM Browser (kein Node↔Browser-Polling, das die Kette selbst stören würde), bucketet sie in 1-s-Fenster und berechnet fps als Framezahl im Bucket sowie p95 der Frame-zu-Frame-Abstände; Jank = Abstand > 33 ms.
**Fix:** `node scripts/fps.mjs <url> --for 10 --cpu 1,4` — immer die ganze Zeitleiste ansehen, nicht nur den Mittelwert: eine gut gebaute Seite fährt ihre Qualität testweise wieder hoch, ein einzelner niedriger Wert ist kein dauerhaftes Drosseln — erst ein Plateau über mehrere Sekunden ist eins.
**Beleg:** Skript-Kopfkommentar `scripts/fps.mjs`, Herkunft `tools/pxfps.mjs` (mccain-digital). · Sicherheit: dokumentiert
**Gilt für:** allgemein, WebGL/Canvas

### 33. Nur Software-GL erzeugt echte WebGL-Last — CPU-Drosselung erreicht den GPU-Prozess nicht
**Warum:** `Emulation.setCPUThrottlingRate` bremst nur den Renderer-Hauptthread-Prozess, nicht den GPU-Prozess. Eine WebGL-Animation, die im Compositor/GPU-Prozess läuft, bremst dadurch kaum — eine GPU-beschleunigte Headless-Messung ist für „was sieht ein Besucher mit schwacher Hardware" strukturell zu optimistisch. Präzisierung: SwiftShader läuft laut Chromiums eigener Doku ebenfalls IM GPU-Prozess, nicht im gedrosselten Renderer — der Unterschied ist also der PROZESS (Renderer vs. GPU), nicht Hardware- vs. Software-Rendering. `--cpu` und `--software-gl` testen deshalb zwei unabhängige Achsen (Renderer-JS-Last vs. Rendering-Hardware-Qualität), keine sich gegenseitig verstärkende Drosselung derselben Arbeit (Details: [widerlegt.md](widerlegt.md#9-cpu-drosselung-lässt-sich-an-gedrosselter-shader-framerate-erkennen)).
**Woran man es erkennt:** `scripts/fps.mjs --software-gl` startet Chromium zusätzlich mit `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader` und liest den tatsächlich genutzten Renderer über `WEBGL_debug_renderer_info`/`UNMASKED_RENDERER_WEBGL` aus, um zu bestätigen, dass wirklich Software rendert (nicht nur GPU + Drosselung).
**Fix:** `node scripts/fps.mjs <url> --cpu 1,4 --software-gl` — jedes CPU-Szenario zusätzlich mit SwiftShader wiederholen, um beide Achsen (JS-Last, Rendering-Qualität) getrennt und in Kombination zu erfassen.
**Beleg:** Skript-Kopfkommentar `scripts/fps.mjs` und `scripts/mainthread.mjs`, `scripts/lib/browser.mjs` (`SOFTWARE_GL_ARGS`); Herkunft `tools/fpsslow.mjs`; Quelle: Chromium `docs/gpu/swiftshader.md`, abgerufen 2026-09-16 („all of the rendering work is done in a separate process; the GPU process"). · Sicherheit: dokumentiert
**Gilt für:** WebGL/Canvas

### 34. getContext() blockiert synchron und kann den ersten Paint der ganzen Seite verzögern
**Warum:** `HTMLCanvasElement.getContext()` ist ein synchroner Aufruf; unter Software-GL kann allein die Kontext-Erzeugung mehrere hundert Millisekunden Hauptthread-Zeit kosten (siehe Regel 21) — und liefert laut Spezifikation `null`, wenn aus irgendeinem Grund (nicht unterstützte Context-ID, GPU-Blacklisting, Ressourcenerschöpfung) kein Kontext erzeugt werden kann.
**Woran man es erkennt:** Praxisbeobachtungen (sekundäre Quelle, nicht Google-primär): `--disable-gpu` erzwingt lautlos wieder SwiftShader; `--in-process-gpu` zerstört die von ANGLE benötigte GL-Surface; Mesa-llvmpipe braucht selbst headless eine echte GL/X11-Surface — ohne sie degradiert WebGL laut Beobachtung „silently … to a flat 2D fallback", während die Seite trotzdem HTTP 200 liefert.
**Fix:** `getContext()`-Aufrufe für Deko-Canvases nie im kritischen Render-Pfad platzieren (das WIE gehört zu [rendern.md](rendern.md)); zur reinen Messung des Effekts `scripts/fps.mjs --software-gl` (Renderer-Bestätigung) mit einer FCP-Messung (Regel 21) kombinieren.
**Beleg:** Quelle: MDN `HTMLCanvasElement.getContext()`, abgerufen 2026-09-16 (Standardverhalten, primär); Microlink-Blog „WebGL without a GPU", abgerufen 2026-09-16 (Praxisbeobachtungen, sekundär, eigene Benchmarks des Autors). · Sicherheit: dokumentiert
**Gilt für:** WebGL/Canvas

### 35. SwiftShader wird von Chrome zunehmend blockiert
**Warum:** Der automatische WebGL-Fallback auf SwiftShader gilt als Sicherheitsrisiko (JIT-Code im GPU-Prozess) und wird von Chrome zunehmend abgeschaltet; DevTools zeigt seit Chrome 130 eine Warnung dazu.
**Woran man es erkennt:** Ein `getContext("webgl")`, das in einer aktuellen Chrome-Version plötzlich `null` statt eines Software-Kontexts liefert, kann dieser Meilenstein sein statt eines echten Bugs.
**Fix:** Für Software-GL-Messungen `--enable-unsafe-swiftshader` explizit setzen (bereits in `scripts/lib/browser.mjs` `SOFTWARE_GL_ARGS` enthalten).
**Beleg:** Quelle: Blink-dev Intent-to-Remove-Thread, abgerufen 2026-09-16. Exakter Default-Removal-Meilenstein widersprüchlich berichtet (eine Quelle „Shipping on Desktop 137", eine andere M133) — als offen markiert, siehe [Offene Fragen](#offene-fragen). · Sicherheit: vermutet (Meilenstein) / dokumentiert (Flag)
**Gilt für:** WebGL/Canvas

### 36. Nur echte GPU-Hardware beweist, dass WebGL wirklich rendert — Headless kann falsch UND unbewegt sein
**Warum:** SwiftShader ist ein reiner Software-WebGL-Fallback ohne echte GPU; bestimmte Shader-/Compositing-Pfade liefern dort schlicht kein Bild (nicht nur langsam — sichtbar schwarz), unabhängig davon, ob die Seite auf echter Hardware korrekt rendert. Zusätzlich setzen Headless-Browser standardmäßig `prefers-reduced-motion:reduce`, wodurch `clip-path`- und SMIL-Zeitlinien in Headless zusätzlich als unzuverlässig gelten.
**Woran man es erkennt:** Ein interaktiver Three.js-Canvas ließ sich per Playwright-Headless (SwiftShader) nicht screenshotten — der Canvas blieb durchgängig schwarz, obwohl er auf echter GPU korrekt rendert. Trat unabhängig in zwei Projekten auf.
**Fix:** WebGL-/Canvas-Features, deren KORREKTHEIT (nicht nur Performance) geprüft werden soll, zusätzlich auf echter GPU-Hardware verifizieren, nie ausschließlich per Headless-CI-Screenshot; für einen Headless-Animationstest `reducedMotion:"no-preference"` explizit setzen (`scripts/lib/browser.mjs` `launch({reducedMotion:false, …})`), sonst testet man versehentlich den reduced-motion-Zustand.
**Beleg:** 360 (wow-demo) und whatever-recall-internal (GraphCanvas), siehe [fallstudien.md](fallstudien.md). · Sicherheit: gemessen
**Gilt für:** WebGL/Canvas

## Mobile-Emulation, Scrollen, reduced motion, Viewports

### 37. "mobile" heißt Touch + isMobile, nicht nur ein schmaler Viewport
**Warum:** Ohne `isMobile:true`/`hasTouch:true` greifen `(hover:hover)`/`(pointer:fine)`-Media-Queries der Seite wie am Desktop — die Messung prüft dann eine Variante, die kein echtes Mobilgerät je zeigt.
**Woran man es erkennt:** `scripts/lib/browser.mjs` setzt bei `mobile:true` sowohl `isMobile` als auch `hasTouch` im Playwright-Context, Viewport 412×915 bei `deviceScaleFactor:1.75` (Moto G Power laut Lighthouse: 412×823 — die 915 entsprechen Playwrights Preset für dasselbe Gerät ohne Browser-Leiste; für exakte CLS-/Layout-Vergleiche mit einem echten PSI-Report ist das ein kleiner, aber realer Unterschied in der Höhe).
**Fix:** Bei jedem Skript in diesem Skill `--mobile` statt manueller `--width 412 --height ...` nutzen, damit Touch/isMobile automatisch mitgesetzt werden.
**Beleg:** Quelle: `scripts/lib/browser.mjs`; PSI-Referenzwerte GoogleChrome/lighthouse `core/config/constants.js`, 13.4.1, 2026-09-16. · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 38. Scrollen in Messläufen immer instant, nie smooth
**Warum:** Setzt eine Seite `scroll-behavior:smooth`, unterbricht jeder neue `scrollBy`/`scrollIntoView`-Aufruf im schnellen Testtakt die noch laufende Smooth-Scroll-Animation des vorherigen Aufrufs — ein `scrollBy()` im 40-ms-Takt brach die eigene Animation immer wieder ab.
**Woran man es erkennt:** Alle Sweep-Funktionen in diesem Skill (`scripts/observers.mjs`, `scripts/cv-audit.mjs`, `scripts/fps.mjs --scroll`) rufen `scrollTo({top, behavior:"instant"})` auf, nie den Seiten-Default.
**Fix:** In jedem selbst geschriebenen Mess-/Automatisierungsskript, das wiederholt und schnell scrollt, `behavior:"instant"` explizit erzwingen, unabhängig davon, was die Seite selbst als Default setzt.
**Beleg:** mccain-digital, HANDOFF „STAND 16.9. NACHMITTAGS", „Fallen", Zeile 148-150. · Sicherheit: gemessen
**Gilt für:** allgemein

### 39. reducedMotion und vorab akzeptierten Consent für Screenshot-Vergleiche setzen
**Warum:** Ohne `reducedMotion:"reduce"` und ohne vorab per `localStorage` akzeptierten Consent laufen Reveal-Animationen, Zähler und rotierende Inhalte während des Screenshots weiter — ein Pixel-Diff (Regel 4) meldet dann Unterschiede, die keine echte Regression sind, sondern nur unterschiedliche Animationsphasen.
**Woran man es erkennt:** `scripts/lib/browser.mjs`s `launch({reducedMotion:true})` setzt den Playwright-Context auf `reduce`; für Consent-Banner muss der Wert zusätzlich vor `page.goto` per `addInitScript` in `localStorage` gesetzt werden.
**Fix:** Bei jedem visuellen Vergleich beide Seiten mit identischem Motion-/Consent-Zustand laden — sonst meldet das Werkzeug Unterschiede, die keine sind.
**Beleg:** Herkunft `tools/v5compare.mjs` (mccain-digital). · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 40. Emulierter iPhone-Viewport meldet pointer:fine, nicht pointer:coarse
**Warum:** Die Emulation eines iPhones über reine Viewport-Größe (z. B. 390 px Breite) meldet dem Media-Query-System `pointer:fine`, nicht `pointer:coarse` wie ein echtes Touchgerät — eine nur bei `pointer:coarse` greifende Regel (z. B. 16-px-Mindestschriftgröße gegen iOS-Auto-Zoom) lässt sich damit nicht verifizieren.
**Woran man es erkennt:** Ein Test, der ausschließlich `pointer:coarse`/`hover:none` über eine Device-Emulation prüft, bleibt für diese Regelklasse blind, egal wie oft er läuft.
**Fix:** Zusätzlich zu einer `pointer:coarse`-Regel eine breitenbasierte Parallelregel einbauen, die nicht von der Pointer-Emulation abhängt, oder auf einem echten Touchgerät gegenprüfen.
**Beleg:** mccain-digital, Commit `5a132f3` (2026-09-04). · Sicherheit: gemessen
**Gilt für:** allgemein

### 41. Einen realen skalierten Geräte-Viewport in jede Messreihe aufnehmen
**Warum:** Standard-Breakpoint-Listen (390, 1512, 1920 px …) decken keine realen Betriebssystem-Skalierungsfaktoren ab, unter denen echte Nutzer die Seite sehen.
**Woran man es erkennt:** 1090×614 ist kein Standard-Breakpoint, sondern ein 1920×1080-Bildschirm bei 175 % Windows-Skalierung — ein reales Gerät, auf dem ein Layout tatsächlich zerbrochen war.
**Fix:** Neben Standard-Breakpoints mindestens einen realen, skalierten Geräte-Viewport in jede automatisierte Layout-/Performance-Messreihe aufnehmen, sobald bekannt ist, worauf Stakeholder tatsächlich schauen (`--width`/`--height` auf jedem Skript in diesem Ordner).
**Beleg:** mccain-digital, HANDOFF „Vor jeder Änderung, ohne Ausnahme", Zeile 2201-2203. · Sicherheit: dokumentiert
**Gilt für:** allgemein

## Fehlerkanäle und Wächter-Zuverlässigkeit

Diese Klasse von Fehlern — ein Guard, der etwas falsch oder gar nicht prüft, aber trotzdem grün meldet — ist im Ausgangsmaterial die mit Abstand am häufigsten wiederkehrende. Jede Messung ist nur so gut wie das Werkzeug, das sie erzeugt. Wiederkehrendes Muster: ein Gate, das nur EINEN Kanal beobachtet (nur Ladezustand, nur `pageerror`, nur eine Textsuche), beweist nichts über die anderen — ein belastbarer Guard prüft mehrere unabhängige Kanäle (Laden, Konsole, Netzwerk, DOM-Zustand) UND verifiziert, dass er tatsächlich gegen echten Code prüft, nicht gegen seinen eigenen Dokumentationskommentar (Commit `536d56d`: „a load check does not prove a page works"; „a guard can blind itself").

### 42. console und pageerror sind getrennte Fehlerkanäle
**Warum:** `pageerror` fängt nur ungefangene Exceptions; `console.error`/`console.warn` sowie Browser-eigene Parser-/Ressourcenwarnungen erreichen diesen Kanal nie. Eine DRITTE Fehlerklasse erreicht KEINEN der beiden Kanäle: ein `<use href>` auf eine fehlende SVG-Sprite-ID zeichnet einfach nichts und wirft weder eine Exception noch eine Konsolenmeldung.
**Woran man es erkennt:** Ein Gate meldete „0 page errors", während parallel 70 (Startseite) bzw. 37 (Brand Guide) Konsolenmeldungen liefen (Commit `4ca2a26`, ein live geparster `<x-dc>`-Teilbaum als unsichtbare Zweitkopie der Seite — nach Fix: 0/0). Unabhängig davon fehlten auf mehreren Seiten sämtliche Icons, ganz ohne Konsolen- oder Sichtausgabe (Commit `95fbcb6`: 31 Markup-Pfade plus 10 JS-Literale zeigten auf eine falsche Sprite-ID).
**Fix:** Beide Kanäle separat abonnieren (`page.on("console")` UND `page.on("pageerror")`); keines der acht Skripte in diesem Ordner deckt das aktuell dediziert ab — bei einem eigenen Playwright-Check beide Listener explizit registrieren, Nachrichten normalisieren (URLs/Zahlen durch Platzhalter ersetzen), damit z. B. 100 gleichartige SVG-Fehler zu einer Gruppe statt zu 100 Zeilen werden. Für die dritte Klasse (stille Ressourcen-Referenzfehler) hilft nur eine explizite Existenzprüfung im Build/Test (jede referenzierte Sprite-/Bild-ID gegen die tatsächlich vorhandenen IDs), kein Fehlerkanal fängt sie ein.
**Beleg:** mccain-digital, Commit `4ca2a26` (2026-09-11, HANDOFF Zeile ~1401-1404, ~1211-1214); Commit `95fbcb6` (2026-09-11); Herkunft `tools/console_audit.mjs`. · Sicherheit: gemessen
**Gilt für:** allgemein

### 43. Bei hydrierenden Seiten das DOM NACH der Hydration auditieren, nicht nur die Server-Antwort
**Warum:** Ein Audit, das nur die initiale HTML-Antwort liest, sieht nicht, was clientseitiges JavaScript danach noch ins Dokument schreibt — ein serverseitig korrekter `<head>` kann nach der Hydration trotzdem dupliziert oder verändert sein.
**Woran man es erkennt:** Der vor-hydrierte `<head>` sah bei jeder Prüfung korrekt aus; erst die hydrierte Seite zeigte, dass ein clientseitiges Skript das bereits vom Build geschriebene `<title>`, die Description, `og:url`, JSON-LD und Canonical ein zweites Mal einfügte (18 Tags pro Seite dupliziert, ein Runtime-Canonical zusätzlich relativ und falsch).
**Fix:** Einen Head-/Meta-Tag-Audit für jede hydrierende Seite explizit gegen das DOM NACH Abschluss der Hydration laufen lassen (auf ein Hydration-Signal warten, siehe Regel 50 zum Vermeiden eines festen Waits), nicht gegen die Server-Antwort; bei einem clientseitigen Head-Update-Mechanismus prüfen, ob er bereits vom Build gesetzte Tags kennt und ausspart, statt sie zu duplizieren.
**Beleg:** mccain-digital, Commit `9060559` (2026-09-12): Performance `/marke/` 49→64 (TBT 870→400 ms) nach dem Fix. · Sicherheit: gemessen
**Gilt für:** react-ssr

### 44. Vor jeder Messreihe prüfen, ob der Server überhaupt antwortet
**Warum:** Ein toter/nicht erreichbarer Server liefert eine Fehlerseite, gegen die praktisch jedes Gate fälschlich „sauber" durchläuft — eine Seite ohne Inhalt hat weder Accent-Text noch Canvas noch Long Tasks, also „besteht" jede Prüfung.
**Woran man es erkennt:** Ein Kontrast-Audit gegen einen toten Dev-Server meldete „accent nodes 0, pixel canvases 0, failing 0 … passes on every page" — ein scheinbar perfekter Durchlauf.
**Fix:** Jedes Skript in diesem Ordner ruft vor der eigentlichen Messung `requireUrl(url)` aus `scripts/lib/browser.mjs` auf (per `fetch`, wirft bei Status ≥ 400 oder Netzwerkfehler mit klarer Meldung inklusive Hinweis auf `scripts/prodserve.py`).
**Beleg:** mccain-digital, HANDOFF „Lehren, die ich nicht nochmal lernen will" Punkt 6, Zeile ~2655-2659; Commit `f75acf8` (2026-09-01). · Sicherheit: gemessen
**Gilt für:** allgemein

### 45. "Nichts gefunden" ist ein möglicher Tool-Ausfall, kein Bestehen
**Warum:** Feste Wartezeiten in Test-Sonden sind unter Systemlast unzuverlässig; ein Guard, der ohne Fund einfach „passt" meldet, kann genauso gut selbst ausgefallen sein wie tatsächlich nichts gefunden haben.
**Woran man es erkennt:** `accent_audit.sh` fiel unter Last gelegentlich mit „NOTHING MEASURED" statt mit einem echten Kontrast-Fund aus (3 von 12 Läufen in einer Sitzung, während paralleler Sweeps).
**Fix:** Jeder automatisierte Guard muss eine erwartete Mindestmenge an Messpunkten durchsetzen und aktiv fehlschlagen, wenn er darunter bleibt — eine gelockerte Wartezeit verdeckt genau die Fehler, für die der Guard da ist; besser auf ein echtes Boot-/Ready-Signal warten als auf feste Millisekunden.
**Beleg:** mccain-digital, CHANGELOG „## 2026-09-04 (3)", Zeile 119-128; Commit `f75acf8` (2026-09-01). · Sicherheit: gemessen
**Gilt für:** allgemein

### 46. Ein Wächter mit derselben fehlerhaften Methode wie der Bug bleibt blind
**Warum:** Ein automatisierter Test, der dieselbe (potenziell fehlerhafte) Messmethode wie der zu prüfende Code verwendet, kann strukturell blind für genau die Fehlerklasse sein, die er verhindern soll.
**Woran man es erkennt:** `tools/pixel_scale_probe.js` blieb grün, während ein Mosaik sichtbar gestaucht dargestellt wurde — der Guard maß selbst mit `getBoundingClientRect()` und verglich Hülle gegen Hülle, derselbe methodische Fehler wie im geprüften Produktionscode.
**Fix:** Nach jedem gefundenen Messfehler die eigene Testinfrastruktur auf denselben Fehler prüfen und eine Gegenprobe fahren: den Guard bewusst gegen die bekannt-fehlerhafte alte Implementierung laufen lassen und sicherstellen, dass er dort tatsächlich fehlschlägt.
**Beleg:** mccain-digital, HANDOFF Zeile 2991-2997; Commit `3471a63` (2026-08-31). · Sicherheit: gemessen
**Gilt für:** allgemein

### 47. Nach jedem Rename explizit auf verwaiste Selektoren grepen
**Warum:** Ein Mess-/Audit-Skript, das per CSS-Selektor auf DOM-Elemente zeigt, meldet nach einem Rename/Refactor still „kein Fund" statt eines Fehlers — ein still ins Leere zeigender Selektor täuscht ein Bestehen vor.
**Woran man es erkennt:** `stage_probe.js` suchte weiter `.dither-l`, einen Canvas, den der Hero seit der Umstellung aufs Mosaik nicht mehr hatte, und antwortete „no field canvas" statt einer Zahl — am selben Tag traf derselbe Fehler zwei weitere Selektoren (`.rail .nav-where`, `.shot`). Dahinter lag ein echter, sonst übersehener Kontrastfehler (4,46:1 statt gefordert).
**Fix:** Nach jedem Umbenennen von Klassen/Selektoren gezielt nach dem ALTEN Namen grepen, um verwaiste Selektoren in Tooling/Skripten zu finden — bevor „kein Fund" als „kein Problem" interpretiert wird.
**Beleg:** mccain-digital, HANDOFF „Was diese Session gekostet hat", Zeile ~2219-2226. · Sicherheit: gemessen
**Gilt für:** allgemein

### 48. Ein Wächter, der ein abgelöstes Muster prüft, ist schlechter als kein Gate
**Warum:** Tooling, das nicht zusammen mit dem System retiriert wird, das es misst, meldet weiter „sauber" — es prüft dann etwas, das gar nicht mehr ausgeliefert wird, und beantwortet nie wieder die Frage, die es eigentlich beantworten soll.
**Woran man es erkennt:** Mehrere Audit-Skripte meldeten weiter eine saubere Bilanz für CSS-Klassen und Design-Tokens eines bereits abgelösten Designsystems (v3) — sie prüften ein Muster, das auf der tatsächlich ausgelieferten Seite längst nicht mehr existierte.
**Fix:** Beim Ablösen eines Musters/Systems die zugehörigen Audit-/Test-Skripte im selben Schritt retirieren oder auf das neue Muster umschreiben, nie stillschweigend weiterlaufen lassen — abgelöste Skripte in einen klar benannten Archivordner mit einer Notiz verschieben, was sie maßen und was sie ersetzt.
**Beleg:** mccain-digital, Commit `6a99190` (2026-09-11): 14 Skripte archiviert, 18 verbleibende messen die tatsächlich ausgelieferte Seite. · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 49. Kommentare vor einer Text- und Regex-Prüfung entfernen
**Warum:** Ein Dokumentationskommentar, der das gesuchte Muster als Beispiel zitiert, liegt im selben Suchraum wie das echte Muster — eine textbasierte Prüfung kann dadurch den falschen (dokumentierten statt echten) Treffer finden.
**Woran man es erkennt:** Zwei Prüfungen suchten nach dem Literal `<template id="dc-template">` und trafen einen Doku-Kommentar, der genau dieses Tag zitierte; der Treffer lief bis zum echten `</template>` und schnitt damit das vorgerenderte Markup aus der eigenen Prüfung heraus (Commit `b99e912`: derselbe Kommentar-Treffer, plus am selben Tag ein zweiter Fund — escapte Beispiel-Markup im Brand-Guide-Fließtext wurde als echte doppelte ID gemeldet).
**Fix:** Bei jeder Regex-/String-Suche gegen generierten Code Kommentare vor der Musterprüfung zuerst entfernen; eine Prüfung, die Markup wie ein Browser lesen soll, muss escapte Entities zuerst dekodieren, statt roh auf dem Quelltext zu matchen.
**Beleg:** mccain-digital, HANDOFF Zeile ~1406-1411; Commit `b99e912` (2026-09-11). · Sicherheit: gemessen
**Gilt für:** allgemein

### 50. getComputedStyle und ein fester Wait mitten in einer Animation lügen
**Warum:** `getComputedStyle()` während einer laufenden CSS-Transition/Animation liefert den interpolierten Zwischenwert, nicht den Zielwert — und eine feste, zu kurze Wartezeit trifft denselben Zwischenzustand mit derselben Konsequenz.
**Woran man es erkennt:** Ein Pill maß als unfarbig, ein 44-px-Chip als 43,47 px, ein Reveal wirkte hängengeblieben — alles Messungen mitten in einer laufenden Animation. Vier weitere Vorfälle in zwei Sitzungen: ein glatt scrollendes `scrollIntoView` noch nicht angekommen, ein Mosaik noch im Aufbau, ein Rand noch pausiert.
**Fix:** Animationen für die Messung einfrieren, erst nach Animationsende messen, oder auf eine explizite, vom Code gesetzte Fertig-Bedingung warten (z. B. ein `data-*-settled`-Attribut) statt auf `getComputedStyle` oder eine feste Millisekundenzahl. Ein Beispiel dafür kostete eine Stunde Fehlersuche an einer unschuldigen Headline, bis der wahre Grund (Messzeitpunkt, nicht die Headline) gefunden war.
**Beleg:** mccain-digital, Commit `bdd7615` (2026-09-04, drei Fälle an einem Abend); HANDOFF „Lehren, die ich nicht nochmal lernen will" Punkt 5+8; Commit `a06f8e3` (2026-09-01). · Sicherheit: gemessen
**Gilt für:** allgemein

### 51. Eine laufende Animation erst beweisen, dann ihre Performance messen
**Warum:** Eine Performance-Messung ist wertlos, solange nicht zuerst bestätigt ist, dass der gemessene Effekt tatsächlich aktiv läuft — ein Sicherheits-Guard gegen einen früheren, spezifischen Fehlerzustand kann zur stillen Falle werden, wenn sich später die Bedingungen ändern, unter denen er auslöst.
**Woran man es erkennt:** Zweimal wurde „60 fps, läuft" für eine Animation gemessen, die in Wirklichkeit gar nicht lief — eine Guard-Klausel („wenn ALLE Zellen die Akzentfarbe tragen, ist die Erkennung kaputt, also abschalten") war für zwei frühere Bugs korrekt, aber falsch für eine Headline, die tatsächlich komplett akzentfarben war, und schaltete die Welle dadurch lautlos ab.
**Fix:** Vor jeder Aussage über eine laufende Animation zwei Zustandsmessungen im Abstand einer bekannten Zeitspanne vergleichen (z. B. `document.getAnimations()`-Census bei `--at` und `--at2` in `scripts/animations.mjs`), statt sich auf den optischen fps-Eindruck zu verlassen; einen Guard, der eine Animation bedingt abschaltet, bei jeder Änderung der Auslösebedingung neu prüfen und ggf. mit dem ursprünglichen Bug zusammen entfernen.
**Beleg:** mccain-digital, Commit `465f8f9` (2026-08-31): „Twice in this session I measured 60fps on an animation that was not running." · Sicherheit: measured
**Gilt für:** allgemein

## TTI und TBT: wie die Skripte sie berechnen

### 52. TTI: erstes 5-s-Fenster ganz ohne Long Task nach FCP
**Warum:** TTI ist der erste Zeitpunkt nach FCP, ab dem 5000 ms lang keine neue Long Task mehr beginnt (Lighthouse: zusätzlich ≤2 gleichzeitige Requests — von den Skripten hier nicht mitgeprüft, nur die Long-Task-Ruhe).
**Woran man es erkennt:** `scripts/lcp-window.mjs` und die `quiet`-Logik berechnen TTI, indem sie ab FCP einen Cursor durch alle Long Tasks schieben und die erste Lücke ≥ 5000 ms suchen; wird sie nie erreicht, bleibt `tti: null` und `ttiReached: false`.
**Fix:** Bei einer Seite mit endlosem Animations-/Rotationsloop erwarten, dass TTI NIE erreicht wird — das ist kein Skriptfehler, sondern die korrekte Konsequenz eines nie ruhigen Hauptthreads.
**Beleg:** Quelle: GoogleChrome/lighthouse `core/computed/metrics/interactive.js` (`REQUIRED_QUIET_WINDOW=5000`, `ALLOWED_CONCURRENT_REQUESTS=2`), 13.4.1, 2026-09-16; Implementierung `scripts/lcp-window.mjs`. · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 53. TBT: Summe der Long-Task-Dauer minus 50 ms zwischen FCP und TTI
**Warum:** „Blocking Time [ist] any time interval … where task length exceeds 50 ms … Total Blocking Time is the sum of all Blocking Time between First Contentful Paint and Interactive Time." Ein 110-ms-Task liefert damit 60 ms Blocking Time. TTI wird intern immer berechnet (auch wenn sein Lighthouse-Audit `weight:0`/`group:"hidden"` trägt), weil TBT es als Fensterende braucht. Spätes Deferred-Work setzt den 5-s-Ruhetimer aus Regel 52 zurück, verschiebt TTI selbst nach hinten und zieht damit potenziell weitere, eigentlich schon „nach TTI" liegende Long Tasks zusätzlich ins TBT-Fenster.
**Woran man es erkennt:** `scripts/lcp-window.mjs` summiert `max(0, Dauer - 50)` über alle Long Tasks zwischen FCP und TTI (bzw. bis „jetzt", wenn TTI nie erreicht wird) und markiert das Ergebnis dann als `tbtOpenEnded: true` — eine Seite, die in 0,8 s malt, aber nie zur Ruhe kommt, wird dadurch rechnerisch zu einer Seite mit einem beliebig wachsenden TBT.
**Fix:** Bei einem hohen oder „offenen" TBT-Wert zuerst prüfen, WANN im Long-Task-Verlauf die 5-s-Lücke ausbleibt (`scripts/lcp-window.mjs`-Ausgabe „Long Tasks nach 5 s"), statt den TBT-Wert isoliert zu optimieren.
**Beleg:** Quelle: GoogleChrome/lighthouse `core/computed/metrics/total-blocking-time.js`, 13.4.1, 2026-09-16. · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 54. Einen unbelegten externen Einzelwert nicht blind als Ziel übernehmen
**Warum:** Ein von einem externen Tool genannter Einzelwert lässt sich ohne die zugrundeliegenden Rohdaten (z. B. den vollständigen Trace/JSON-Bericht) nicht auf eine Ursache zurückführen — dagegen zu optimieren zielt womöglich auf ein Phantom statt auf einen belegten Kostenblock.
**Woran man es erkennt:** Ein von PageSpeed genannter Wert von 30.533 ms ließ sich mit eigenen Traces (`scripts/mainthread.mjs`) nicht reproduzieren oder zuordnen; die eigene Messung für „Other" lag bei 1.477–1.486 ms, weit darunter. Derselbe PSI-Desktop-Bericht nannte zusätzlich TBT 13.060 ms — lokal maß Desktop dagegen 96 Punkte, und eine eigene Aufzeichnung derselben Live-Seite zeigte 68 % Leerlauf; plausibelste Erklärung war Throttling-Verstärkung kleiner CPU-Anteile auf der PSI-Testmaschine, kein realer Bug (Einordnung: [widerlegt.md](widerlegt.md#21-psi-desktop-tbt-13060-ms-zeigt-einen-realen-performance-bug)).
**Fix:** Einen unerklärten externen Wert bewusst als unerklärt vermerken statt spekulativ dagegen zu optimieren; erst mit den eigenen Skripten (`scripts/mainthread.mjs`, `scripts/lcp-window.mjs`) nachmessen und nur belegte Kostenblöcke angehen. Auf einer bekanntermaßen langsamen Testmaschine (wie einer PSI-VM) können 5 % CPU-Last wie 30–50 % auf einem alten Notebook wirken — ein Ausreißer ohne lokale Reproduktion ist eher ein Testmaschinen-Artefakt als ein Bug-Beweis.
**Beleg:** mccain-digital, HANDOFF „STAND 16.9. Pixelstrom", Zeile 243; PSI-Desktop-Bericht TBT 13.060 ms/„Other" 30.533 ms, siehe [widerlegt.md](widerlegt.md#21-psi-desktop-tbt-13060-ms-zeigt-einen-realen-performance-bug). · Sicherheit: gemessen
**Gilt für:** allgemein

## Prozess: Messen ist Teil des Gates

### 55. Mobil ist die Zahl, die zählt — aber auf beiden Formfaktoren messen
**Warum:** PageSpeed Insights und damit die typische Owner-/Kunden-Zielzahl bewerten primär mobil — Desktop-Werte allein reichen als Nachweis nicht. Gleichzeitig kann eine rein mobile Messreihe eine Desktop-spezifische Regression verdecken und umgekehrt.
**Woran man es erkennt:** Fester dokumentierter Befehl für die maßgebliche Zahl: `npx lighthouse "<url>" --form-factor=mobile --screenEmulation.mobile --throttling-method=simulate --only-categories=performance,accessibility --chrome-flags="--headless=new"`.
**Fix:** Diesen exakten Befehl (oder `scripts/mainthread.mjs`/`scripts/lcp-window.mjs --mobile`) für die bindende mobile Zahl nutzen, UND zusätzlich Desktop mitmessen, statt Desktop-Ausreißer unreflektiert als reale Regression zu behandeln — ein Desktop-TBT-Ausreißer kann auch ein CPU-Throttling-Artefakt der eigenen Testmaschine sein (siehe Regel 10). Eine Optimierung ist dabei nie automatisch kostenlos, nur weil sie plausibel klingt — auch eine rein inhaltliche Änderung (z. B. eine rotierende Hero-Headline) kann den Score einbrechen lassen, indem sie neue, spätere LCP-Kandidaten erzeugt (Details, inkl. eines Falls mit Absturz von 95 auf 60 Punkte: [lighthouse-psi.md](lighthouse-psi.md)).
**Beleg:** mccain-digital, HANDOFF Zeile 1126-1128. · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 56. Erreichbarkeit ist kein Beweis für Funktion
**Warum:** Grüne Erreichbarkeits-/Lade-Metriken (Status 200, Bilder da, Meta-Tags da, Wortzahl stimmt) sind kein Beleg dafür, dass eine Seite tatsächlich funktioniert — sie prüfen nicht, ob Interaktion und Datenversand wirklich ankommen.
**Woran man es erkennt:** Ein Kontaktformular war vollständig tot, während Status, Bilder, Meta-Tags und Wortzahl durchgehend grün waren — gefunden hat es am Ende der Owner durch echtes Klicken, nicht ein automatisierter Check. Ein komplett inerter Relaunch (kein JS-Mount lief) kam an denselben Checks grün vorbei: Status 200, Bilder geladen, Meta-Tags da, 1.886 Wörter echter Text — weil kein Check je etwas anklickte (Commit `72546fd`).
**Fix:** Vor jedem Push echte Interaktion ausführen und prüfen (Formular absenden, Menü, Modal, Klicks) — dafür siehe [[browser-verify]] und [[audit-website]] für die breitere Prüfung über Performance hinaus; ein reachability-only-Gate reicht nicht. Konkretes Muster: `verify_site.mjs` (Commit `72546fd`) prüft bei Komponentenseiten zusätzlich, ob die Hydration wirklich stattfand (Platzhalter verschwunden, Root gefüllt, keine page errors), öffnet dann simuliert Navigation und eine Kachel und verlangt eine echte DOM-Änderung als Beweis — und flaggt bewusst NICHT bekannte Nicht-Probleme (z. B. eine Seite ohne Menü), sonst wird das Gate irgendwann ignoriert.
**Beleg:** mccain-digital, HANDOFF Zeile ~1398-1400; Commit `72546fd` (2026-09-11). · Sicherheit: gemessen
**Gilt für:** allgemein

### 57. Veröffentlichte Performance-Zahlen laufend gegen echte Messwerte verifizieren
**Warum:** Eine im eigenen Marketingtext behauptete Zahl (z. B. „Lighthouse 100", „TBT 0 ms") kann durch spätere Regressionen (neue Features, eine Canvas-Engine) ODER durch einen kompletten Relaunch falsch werden — und ist dann nicht nur peinlich, sondern in Deutschland als Werbeaussage über die eigene Leistung potenziell abmahnfähig. Eine unverifizierte Performance-Behauptung in der eigenen Doku ist dabei selbst ein Bug, kein kosmetischer Punkt.
**Woran man es erkennt:** Eine Website behauptete auf allen 21 Seiten „4×100", „Lighthouse 100 mit laufender Canvas-Engine", „Total Blocking Time 0 ms" — gemessen waren tatsächlich 65–73 mobil und TBT 639–1.085 ms; nur CLS 0 stimmte noch. Nach einem kompletten Relaunch (neue Architektur am selben Repo-Root) stand dieselbe „4×100"-Zahl weiter in der README, obwohl sie auf der vorherigen, inzwischen ersetzten Architektur gemessen worden war (Commit `b99e912`); in einem anderen Fall wurde eine Zahl vor der eigentlichen Messung notiert und dann als verifiziert weitergetragen (Commit `878e94c`).
**Fix:** Veröffentlichte Zahlen nicht nur einmalig zum Launch verifizieren, sondern in denselben Sweep (Regel 58) aufnehmen; nach JEDEM Relaunch/Rebuild explizit neu messen, statt eine alte Zahl stillschweigend mitzuführen — wird eine alte Zahl bewusst als historisch zitiert, das ausdrücklich als „gemessen auf der vorherigen Version" kennzeichnen. Bei einer Abweichung den Fund als Owner-Entscheidung zurückgeben, nicht redaktionell selbst „reparieren".
**Beleg:** mccain-digital, HANDOFF Abschnitt „◑ D", Zeile 1027-1035; Commit `b99e912` (2026-09-11); Commit `878e94c` (2026-09-11). · Sicherheit: gemessen
**Gilt für:** allgemein

### 58. Geskripteter Sweep über alle Seiten × Kern-Viewports als Regressionsgate
**Warum:** Manuelle Stichproben übersehen Regressionen auf nicht direkt getesteten Seiten/Viewports — ein Sweep, der jede Seite in mehreren Viewports lädt und auf Page-/Console-Errors, Overflow, Widget-Boot und A11y-Basics prüft, deckt Regressionen systematisch statt zufällig auf.
**Woran man es erkennt:** Wiederholt genutztes Ergebnis: „sweep over 11 pages × 2 viewports with no page or console errors, pixel-scale guard green."
**Fix:** Einen geskripteten Full-Site-Sweep (alle Seiten × Kern-Viewports, inkl. des realen skalierten Geräte-Viewports aus Regel 41) nach JEDER Änderung laufen lassen, nicht nur auf der direkt berührten Seite — als Pflicht-Gate vor jedem Push, ergänzt um [[browser-verify]] für die tatsächliche Browser-Interaktion. Die Orchestrierung dieses und der anderen html-performance-Schritte im Gesamtablauf eines Webprojekts zeigt [[web-skills-suite]].
**Beleg:** mccain-digital, Commit `16dabe6` (2026-08-03); Herkunft `sweep.sh`/`probe.js`/`check_links.py`, `verify_site.mjs` (Pflicht vor jedem Push, 21 Seiten). · Sicherheit: dokumentiert
**Gilt für:** allgemein

## Offene Fragen

- Der exakte Chrome-Meilenstein, ab dem der automatische SwiftShader-WebGL-Fallback standardmäßig entfernt wurde, ist zwischen Quellen widersprüchlich (Desktop M137 vs. M133); chromestatus.com ließ sich als clientseitig gerenderte SPA in dieser Recherche nicht direkt auslesen.
- Ob Googles eigene PSI/Lightrider-Chrome-Instanz `--enable-unsafe-swiftshader` selbst explizit setzt, um WebGL-Software-Rendering trotz entferntem Auto-Fallback zu erhalten, ist nicht öffentlich dokumentiert — am zuverlässigsten empirisch über eine echte PSI-Messung einer Testseite mit sichtbarem `getContext`-Ergebnis zu klären.
- Ob IntersectionObserver-bezogene Trace-Events konkret (mangels Mapping) in Lighthouses „Other"-Kategorie landen, ist nur als generischer Fallback-Mechanismus am Quellcode verifiziert, nicht als benannter Einzelfall in offizieller Lighthouse-Doku oder -Issues.
- Die genaue Kausalkette der bei 125 ms ladenden Mask-Bilder im content-visibility-Fall (IO-Geometrie in der Bootstrap-Phase oder ein Layout-Lesen in Seiten-eigenen IO-Callbacks) ist nicht abschließend verifiziert.
- Der Mechanismus hinter der berichteten externen PSI-Diskrepanz (Performance 60, LCP-Render-Delay 20.490 ms auf `span.v5-r`) ist seit Commit `ca40094` (16.9.2026) grundsätzlich geklärt: eine rotierende Hero-Headline erzeugte neue, spätere LCP-Kandidaten (Regel 20) und wurde entfernt (danach wieder Performance 100). Offen bleibt nur, warum keiner der 6 lokalen Lighthouse-Traces (simulate/devtools, mobil/Desktop) auf dem damaligen Buildstand die Rotation überhaupt als Kandidaten sah — die Traces enden strukturell vor der ersten Rotation (2,4 s bei simulate, 13,3 s bei devtools, gegenüber `animation-delay:13.5s`).
- `scripts/lcp-window.mjs` liest aktuell kein `--software-gl`-Flag aus den Argumenten, obwohl `scripts/lib/browser.mjs` die Option bereitstellt — bis ergänzt, ist eine Software-GL-FCP-Messung nur mit einer lokal angepassten Kopie des Skripts möglich (siehe Regel 21).
- Für `duplicated-javascript-insight` (Lighthouse) ließ sich in dieser Recherche keine feste Byte-Mindestschwelle finden — nicht in den messen.md-Geltungsbereich fallend, aber als Lücke vermerkt, falls lighthouse-psi.md sie aufgreift.

## Quellen

- https://github.com/GoogleChrome/lighthouse/blob/main/core/config/constants.js
- https://github.com/GoogleChrome/lighthouse/blob/main/core/config/config.js
- https://github.com/GoogleChrome/lighthouse/blob/main/core/config/lr-mobile-config.js
- https://github.com/GoogleChrome/lighthouse/blob/main/core/config/default-config.js
- https://github.com/GoogleChrome/lighthouse/blob/main/core/lib/tracehouse/task-groups.js
- https://github.com/GoogleChrome/lighthouse/blob/main/core/lib/tracehouse/main-thread-tasks.js
- https://github.com/GoogleChrome/lighthouse/blob/main/core/audits/mainthread-work-breakdown.js
- https://github.com/GoogleChrome/lighthouse/blob/main/core/computed/metrics/total-blocking-time.js
- https://github.com/GoogleChrome/lighthouse/blob/main/core/computed/metrics/interactive.js
- https://github.com/GoogleChrome/lighthouse/blob/main/docs/throttling.md
- https://github.com/GoogleChrome/lighthouse/blob/main/docs/variability.md
- https://github.com/GoogleChrome/lighthouse/blob/main/docs/readme.md
- https://www.w3.org/TR/largest-contentful-paint/
- https://w3c.github.io/event-timing/
- https://calendar.perfplanet.com/2021/how-does-lighthouse-simulated-throttling-work/
- https://groups.google.com/a/chromium.org/g/blink-dev/c/yhFguWS_3pM
- https://chromestatus.com/feature/5166674414927872
- https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext
- https://microlink.io/blog/webgl-without-a-gpu
- https://chromium.googlesource.com/chromium/src/+/refs/heads/main/docs/gpu/swiftshader.md
- https://registry.npmjs.org/lighthouse/latest
- Chromium main, HEAD cabdc32a717663075a71718eb8750f6abdaedb64 (intersection_geometry.cc, display_lock_utilities.cc, display_lock_document_state.cc, document.cc, css_image_value.cc), abgerufen 16.09.2026
- CSS Containment Module Level 2, §4.3 und §4.5 (w3.org)
- w3c/csswg-drafts#8542; Mozilla Bugzilla 1807253
- mccain-digital: HANDOFF.md, CHANGELOG.md, Commits (siehe einzelne Belege oben)
- mccain-digital: scratchpad/swgl_fcp.mjs-Messung, 16.09.2026 (lokal, nicht im Repo)
- mccain-digital: Lighthouse-Läufe `.../scratchpad/skill/raw/lh/*.json`, 16.09.2026
