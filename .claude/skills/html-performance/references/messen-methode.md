# Messen: Grundmethode und Messumgebung — html-performance

> Teil des Skills [[html-performance]] · Stand 2026-09-17 · Belege: mccain-digital (HANDOFF, CHANGELOG, Commits), weitere Projekte des Owners, Recherche mit Quell-URLs

Dieses Kapitel behandelt die Grundmethode des Messens: Zeitachse statt Summe, Vorher/Nachher mit kontrollierten Zwischenzuständen, produktionsnahes Messen (Server, Cache, Kompression, Anfragegröße/Sichtbarkeit), eine ruhige Maschine mit deterministischen Läufen, die Zuverlässigkeit der eigenen Mess-Wächter (Fehlerkanäle, verwaiste Selektoren, abgelöste Muster, Kommentare im Suchraum) und der Prozess, der das Messen zum Teil des Gates macht. Lighthouse-/PSI-spezifisches Scoring, Drosselungsarten und Messfenster stehen in [messen-lighthouse-fenster.md](messen-lighthouse-fenster.md); Hauptthread-Lesen, Beobachter, `content-visibility`, fps/Software-GL und Mobile-Emulation in [messen-hauptthread-observer.md](messen-hauptthread-observer.md). Wie Befunde behoben werden: die `laden-*`- und `rendern-*`-Referenzen ([laden-kritischer-pfad.md](laden-kritischer-pfad.md), [laden-javascript.md](laden-javascript.md), [laden-auslieferung.md](laden-auslieferung.md), [rendern-hauptthread.md](rendern-hauptthread.md), [rendern-animationen.md](rendern-animationen.md), [rendern-canvas-webgl.md](rendern-canvas-webgl.md)); wie Lighthouse daraus einen Score errechnet: [lighthouse-psi.md](lighthouse-psi.md). Jede Regel nennt das Skript, das sie prüfbar macht.

Bis zum 17.9.2026 stand dieser Inhalt zusammen mit den anderen `Messen`-Themen in `messen.md`; die Regeln sind hier neu von 1 durchnummeriert, alte Verweise gelten nicht mehr.

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
- **console und pageerror sind getrennte Fehlerkanäle** — ein Gate muss beide hören ([→](#13-console-und-pageerror-sind-getrennte-fehlerkanäle))
- **Bei hydrierenden Seiten das DOM nach der Hydration auditieren** — nicht nur die Server-Antwort ([→](#14-bei-hydrierenden-seiten-das-dom-nach-der-hydration-auditieren-nicht-nur-die-server-antwort))
- **Vor jeder Messreihe prüfen, ob der Server überhaupt antwortet** — ein toter Server liefert eine Fehlerseite, die alles "besteht" ([→](#15-vor-jeder-messreihe-prüfen-ob-der-server-überhaupt-antwortet))
- **"Nichts gefunden" ist ein möglicher Tool-Ausfall, kein Bestehen** — jeder Guard braucht eine Mindest-Fundzahl ([→](#16-nichts-gefunden-ist-ein-möglicher-tool-ausfall-kein-bestehen))
- **Ein Wächter mit derselben fehlerhaften Methode wie der Bug bleibt blind** — nach jedem Messfehler die eigene Testinfrastruktur gegenprüfen ([→](#17-ein-wächter-mit-derselben-fehlerhaften-methode-wie-der-bug-bleibt-blind))
- **Nach jedem Rename auf verwaiste Selektoren grepen** — ein still ins Leere zeigender Selektor meldet "kein Fund" statt Fehler ([→](#18-nach-jedem-rename-explizit-auf-verwaiste-selektoren-grepen))
- **Ein Wächter, der ein abgelöstes Muster prüft, ist schlechter als kein Gate** — Tooling mit dem System retirieren, das es misst ([→](#19-ein-wächter-der-ein-abgelöstes-muster-prüft-ist-schlechter-als-kein-gate))
- **Kommentare vor einer Text-/Regex-Prüfung entfernen** — Dokumentation, die das Muster zitiert, liegt sonst im Suchraum ([→](#20-kommentare-vor-einer-text--und-regex-prüfung-entfernen))
- **getComputedStyle und ein fester Wait mitten in einer Animation lügen** — auf ein explizites Settled-Signal warten ([→](#21-getcomputedstyle-und-ein-fester-wait-mitten-in-einer-animation-lügen))
- **Eine laufende Animation erst beweisen, dann ihre Performance messen** — ein Guard gegen einen behobenen Bug muss mit ihm verschwinden ([→](#22-eine-laufende-animation-erst-beweisen-dann-ihre-performance-messen))
- **Mobil ist die Zahl, die zählt — aber auf beiden Formfaktoren messen** — mit dem exakten, dokumentierten Befehl ([→](#23-mobil-ist-die-zahl-die-zählt--aber-auf-beiden-formfaktoren-messen))
- **Erreichbarkeit ist kein Beweis für Funktion** — grüne Status-/Meta-Checks fanden den toten Kontaktkanal nicht ([→](#24-erreichbarkeit-ist-kein-beweis-für-funktion))
- **Veröffentlichte Performance-Zahlen laufend gegen echte Messwerte verifizieren** — eine veraltete Behauptung ist ein Risiko, keine Petitesse ([→](#25-veröffentlichte-performance-zahlen-laufend-gegen-echte-messwerte-verifizieren))
- **Geskripteter Sweep über alle Seiten × Kern-Viewports als Regressionsgate** — nach jeder Änderung, nicht nur auf der berührten Seite ([→](#26-geskripteter-sweep-über-alle-seiten--kern-viewports-als-regressionsgate))

## Inhalt

- [Grundmethode](#grundmethode-zeitachse-statt-summe-vorhernachher-eine-änderung-pro-messung)
- [Produktionsnah messen](#produktionsnah-messen-server-cache-kompression)
- [Was lädt, wie groß, wirklich sichtbar](#was-lädt-wie-groß-wirklich-sichtbar)
- [Ruhige Maschine, deterministische Läufe](#ruhige-maschine-deterministische-läufe)
- [Fehlerkanäle und Wächter-Zuverlässigkeit](#fehlerkanäle-und-wächter-zuverlässigkeit)
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

**Auch Funktionstore mit Zeitregeln scheitern unter paralleler Browserlast.** Ein Tor, das prüft, ob ein Schalter genau 10,0–12,5 s nach der ersten Aktion erscheint, scheiterte zweimal, während ein zweites Playwright-Tor parallel lief (Chrome-Helfer bei 45 % + 39 % CPU); allein und in acht Einzelversuchen kam der Schalter jedes Mal nach 10,0–10,1 s. Zeitabhängige Tore nacheinander laufen lassen, nie neben Lighthouse oder einem zweiten Browser.
**Beleg:** mccain-digital, 17.9.2026, `tools/v5dev-check.mjs` gegen ein parallel laufendes zweites Playwright-Tor. · Sicherheit: gemessen

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

## Fehlerkanäle und Wächter-Zuverlässigkeit

Diese Klasse von Fehlern — ein Guard, der etwas falsch oder gar nicht prüft, aber trotzdem grün meldet — ist im Ausgangsmaterial die mit Abstand am häufigsten wiederkehrende. Jede Messung ist nur so gut wie das Werkzeug, das sie erzeugt. Wiederkehrendes Muster: ein Gate, das nur EINEN Kanal beobachtet (nur Ladezustand, nur `pageerror`, nur eine Textsuche), beweist nichts über die anderen — ein belastbarer Guard prüft mehrere unabhängige Kanäle (Laden, Konsole, Netzwerk, DOM-Zustand) UND verifiziert, dass er tatsächlich gegen echten Code prüft, nicht gegen seinen eigenen Dokumentationskommentar (Commit `536d56d`: „a load check does not prove a page works"; „a guard can blind itself").

### 13. console und pageerror sind getrennte Fehlerkanäle
**Warum:** `pageerror` fängt nur ungefangene Exceptions; `console.error`/`console.warn` sowie Browser-eigene Parser-/Ressourcenwarnungen erreichen diesen Kanal nie. Eine DRITTE Fehlerklasse erreicht KEINEN der beiden Kanäle: ein `<use href>` auf eine fehlende SVG-Sprite-ID zeichnet einfach nichts und wirft weder eine Exception noch eine Konsolenmeldung.
**Woran man es erkennt:** Ein Gate meldete „0 page errors", während parallel 70 (Startseite) bzw. 37 (Brand Guide) Konsolenmeldungen liefen (Commit `4ca2a26`, ein live geparster `<x-dc>`-Teilbaum als unsichtbare Zweitkopie der Seite — nach Fix: 0/0). Unabhängig davon fehlten auf mehreren Seiten sämtliche Icons, ganz ohne Konsolen- oder Sichtausgabe (Commit `95fbcb6`: 31 Markup-Pfade plus 10 JS-Literale zeigten auf eine falsche Sprite-ID).
**Fix:** Beide Kanäle separat abonnieren (`page.on("console")` UND `page.on("pageerror")`); keines der acht Skripte in diesem Ordner deckt das aktuell dediziert ab — bei einem eigenen Playwright-Check beide Listener explizit registrieren, Nachrichten normalisieren (URLs/Zahlen durch Platzhalter ersetzen), damit z. B. 100 gleichartige SVG-Fehler zu einer Gruppe statt zu 100 Zeilen werden. Für die dritte Klasse (stille Ressourcen-Referenzfehler) hilft nur eine explizite Existenzprüfung im Build/Test (jede referenzierte Sprite-/Bild-ID gegen die tatsächlich vorhandenen IDs), kein Fehlerkanal fängt sie ein.
**Beleg:** mccain-digital, Commit `4ca2a26` (2026-09-11, HANDOFF Zeile ~1401-1404, ~1211-1214); Commit `95fbcb6` (2026-09-11); Herkunft `tools/console_audit.mjs`. · Sicherheit: gemessen
**Gilt für:** allgemein

### 14. Bei hydrierenden Seiten das DOM NACH der Hydration auditieren, nicht nur die Server-Antwort
**Warum:** Ein Audit, das nur die initiale HTML-Antwort liest, sieht nicht, was clientseitiges JavaScript danach noch ins Dokument schreibt — ein serverseitig korrekter `<head>` kann nach der Hydration trotzdem dupliziert oder verändert sein.
**Woran man es erkennt:** Der vor-hydrierte `<head>` sah bei jeder Prüfung korrekt aus; erst die hydrierte Seite zeigte, dass ein clientseitiges Skript das bereits vom Build geschriebene `<title>`, die Description, `og:url`, JSON-LD und Canonical ein zweites Mal einfügte (18 Tags pro Seite dupliziert, ein Runtime-Canonical zusätzlich relativ und falsch).
**Fix:** Einen Head-/Meta-Tag-Audit für jede hydrierende Seite explizit gegen das DOM NACH Abschluss der Hydration laufen lassen (auf ein Hydration-Signal warten, siehe Regel 21 zum Vermeiden eines festen Waits), nicht gegen die Server-Antwort; bei einem clientseitigen Head-Update-Mechanismus prüfen, ob er bereits vom Build gesetzte Tags kennt und ausspart, statt sie zu duplizieren.
**Beleg:** mccain-digital, Commit `9060559` (2026-09-12): Performance `/marke/` 49→64 (TBT 870→400 ms) nach dem Fix. · Sicherheit: gemessen
**Gilt für:** react-ssr

### 15. Vor jeder Messreihe prüfen, ob der Server überhaupt antwortet
**Warum:** Ein toter/nicht erreichbarer Server liefert eine Fehlerseite, gegen die praktisch jedes Gate fälschlich „sauber" durchläuft — eine Seite ohne Inhalt hat weder Accent-Text noch Canvas noch Long Tasks, also „besteht" jede Prüfung.
**Woran man es erkennt:** Ein Kontrast-Audit gegen einen toten Dev-Server meldete „accent nodes 0, pixel canvases 0, failing 0 … passes on every page" — ein scheinbar perfekter Durchlauf.
**Fix:** Jedes Skript in diesem Ordner ruft vor der eigentlichen Messung `requireUrl(url)` aus `scripts/lib/browser.mjs` auf (per `fetch`, wirft bei Status ≥ 400 oder Netzwerkfehler mit klarer Meldung inklusive Hinweis auf `scripts/prodserve.py`).
**Beleg:** mccain-digital, HANDOFF „Lehren, die ich nicht nochmal lernen will" Punkt 6, Zeile ~2655-2659; Commit `f75acf8` (2026-09-01). · Sicherheit: gemessen
**Gilt für:** allgemein

### 16. "Nichts gefunden" ist ein möglicher Tool-Ausfall, kein Bestehen
**Warum:** Feste Wartezeiten in Test-Sonden sind unter Systemlast unzuverlässig; ein Guard, der ohne Fund einfach „passt" meldet, kann genauso gut selbst ausgefallen sein wie tatsächlich nichts gefunden haben.
**Woran man es erkennt:** `accent_audit.sh` fiel unter Last gelegentlich mit „NOTHING MEASURED" statt mit einem echten Kontrast-Fund aus (3 von 12 Läufen in einer Sitzung, während paralleler Sweeps).
**Fix:** Jeder automatisierte Guard muss eine erwartete Mindestmenge an Messpunkten durchsetzen und aktiv fehlschlagen, wenn er darunter bleibt — eine gelockerte Wartezeit verdeckt genau die Fehler, für die der Guard da ist; besser auf ein echtes Boot-/Ready-Signal warten als auf feste Millisekunden.
**Beleg:** mccain-digital, CHANGELOG „## 2026-09-04 (3)", Zeile 119-128; Commit `f75acf8` (2026-09-01). · Sicherheit: gemessen
**Gilt für:** allgemein

### 17. Ein Wächter mit derselben fehlerhaften Methode wie der Bug bleibt blind
**Warum:** Ein automatisierter Test, der dieselbe (potenziell fehlerhafte) Messmethode wie der zu prüfende Code verwendet, kann strukturell blind für genau die Fehlerklasse sein, die er verhindern soll.
**Woran man es erkennt:** `tools/pixel_scale_probe.js` blieb grün, während ein Mosaik sichtbar gestaucht dargestellt wurde — der Guard maß selbst mit `getBoundingClientRect()` und verglich Hülle gegen Hülle, derselbe methodische Fehler wie im geprüften Produktionscode.
**Fix:** Nach jedem gefundenen Messfehler die eigene Testinfrastruktur auf denselben Fehler prüfen und eine Gegenprobe fahren: den Guard bewusst gegen die bekannt-fehlerhafte alte Implementierung laufen lassen und sicherstellen, dass er dort tatsächlich fehlschlägt.
**Beleg:** mccain-digital, HANDOFF Zeile 2991-2997; Commit `3471a63` (2026-08-31). · Sicherheit: gemessen
**Gilt für:** allgemein

### 18. Nach jedem Rename explizit auf verwaiste Selektoren grepen
**Warum:** Ein Mess-/Audit-Skript, das per CSS-Selektor auf DOM-Elemente zeigt, meldet nach einem Rename/Refactor still „kein Fund" statt eines Fehlers — ein still ins Leere zeigender Selektor täuscht ein Bestehen vor.
**Woran man es erkennt:** `stage_probe.js` suchte weiter `.dither-l`, einen Canvas, den der Hero seit der Umstellung aufs Mosaik nicht mehr hatte, und antwortete „no field canvas" statt einer Zahl — am selben Tag traf derselbe Fehler zwei weitere Selektoren (`.rail .nav-where`, `.shot`). Dahinter lag ein echter, sonst übersehener Kontrastfehler (4,46:1 statt gefordert).
**Fix:** Nach jedem Umbenennen von Klassen/Selektoren gezielt nach dem ALTEN Namen grepen, um verwaiste Selektoren in Tooling/Skripten zu finden — bevor „kein Fund" als „kein Problem" interpretiert wird.
**Beleg:** mccain-digital, HANDOFF „Was diese Session gekostet hat", Zeile ~2219-2226. · Sicherheit: gemessen
**Gilt für:** allgemein

### 19. Ein Wächter, der ein abgelöstes Muster prüft, ist schlechter als kein Gate
**Warum:** Tooling, das nicht zusammen mit dem System retiriert wird, das es misst, meldet weiter „sauber" — es prüft dann etwas, das gar nicht mehr ausgeliefert wird, und beantwortet nie wieder die Frage, die es eigentlich beantworten soll.
**Woran man es erkennt:** Mehrere Audit-Skripte meldeten weiter eine saubere Bilanz für CSS-Klassen und Design-Tokens eines bereits abgelösten Designsystems (v3) — sie prüften ein Muster, das auf der tatsächlich ausgelieferten Seite längst nicht mehr existierte.
**Fix:** Beim Ablösen eines Musters/Systems die zugehörigen Audit-/Test-Skripte im selben Schritt retirieren oder auf das neue Muster umschreiben, nie stillschweigend weiterlaufen lassen — abgelöste Skripte in einen klar benannten Archivordner mit einer Notiz verschieben, was sie maßen und was sie ersetzt.
**Beleg:** mccain-digital, Commit `6a99190` (2026-09-11): 14 Skripte archiviert, 18 verbleibende messen die tatsächlich ausgelieferte Seite. · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 20. Kommentare vor einer Text- und Regex-Prüfung entfernen
**Warum:** Ein Dokumentationskommentar, der das gesuchte Muster als Beispiel zitiert, liegt im selben Suchraum wie das echte Muster — eine textbasierte Prüfung kann dadurch den falschen (dokumentierten statt echten) Treffer finden.
**Woran man es erkennt:** Zwei Prüfungen suchten nach dem Literal `<template id="dc-template">` und trafen einen Doku-Kommentar, der genau dieses Tag zitierte; der Treffer lief bis zum echten `</template>` und schnitt damit das vorgerenderte Markup aus der eigenen Prüfung heraus (Commit `b99e912`: derselbe Kommentar-Treffer, plus am selben Tag ein zweiter Fund — escapte Beispiel-Markup im Brand-Guide-Fließtext wurde als echte doppelte ID gemeldet).
**Fix:** Bei jeder Regex-/String-Suche gegen generierten Code Kommentare vor der Musterprüfung zuerst entfernen; eine Prüfung, die Markup wie ein Browser lesen soll, muss escapte Entities zuerst dekodieren, statt roh auf dem Quelltext zu matchen.
**Beleg:** mccain-digital, HANDOFF Zeile ~1406-1411; Commit `b99e912` (2026-09-11). · Sicherheit: gemessen
**Gilt für:** allgemein

### 21. getComputedStyle und ein fester Wait mitten in einer Animation lügen
**Warum:** `getComputedStyle()` während einer laufenden CSS-Transition/Animation liefert den interpolierten Zwischenwert, nicht den Zielwert — und eine feste, zu kurze Wartezeit trifft denselben Zwischenzustand mit derselben Konsequenz.
**Woran man es erkennt:** Ein Pill maß als unfarbig, ein 44-px-Chip als 43,47 px, ein Reveal wirkte hängengeblieben — alles Messungen mitten in einer laufenden Animation. Vier weitere Vorfälle in zwei Sitzungen: ein glatt scrollendes `scrollIntoView` noch nicht angekommen, ein Mosaik noch im Aufbau, ein Rand noch pausiert.
**Fix:** Animationen für die Messung einfrieren, erst nach Animationsende messen, oder auf eine explizite, vom Code gesetzte Fertig-Bedingung warten (z. B. ein `data-*-settled`-Attribut) statt auf `getComputedStyle` oder eine feste Millisekundenzahl. Ein Beispiel dafür kostete eine Stunde Fehlersuche an einer unschuldigen Headline, bis der wahre Grund (Messzeitpunkt, nicht die Headline) gefunden war.
**Beleg:** mccain-digital, Commit `bdd7615` (2026-09-04, drei Fälle an einem Abend); HANDOFF „Lehren, die ich nicht nochmal lernen will" Punkt 5+8; Commit `a06f8e3` (2026-09-01). · Sicherheit: gemessen
**Gilt für:** allgemein

### 22. Eine laufende Animation erst beweisen, dann ihre Performance messen
**Warum:** Eine Performance-Messung ist wertlos, solange nicht zuerst bestätigt ist, dass der gemessene Effekt tatsächlich aktiv läuft — ein Sicherheits-Guard gegen einen früheren, spezifischen Fehlerzustand kann zur stillen Falle werden, wenn sich später die Bedingungen ändern, unter denen er auslöst.
**Woran man es erkennt:** Zweimal wurde „60 fps, läuft" für eine Animation gemessen, die in Wirklichkeit gar nicht lief — eine Guard-Klausel („wenn ALLE Zellen die Akzentfarbe tragen, ist die Erkennung kaputt, also abschalten") war für zwei frühere Bugs korrekt, aber falsch für eine Headline, die tatsächlich komplett akzentfarben war, und schaltete die Welle dadurch lautlos ab.
**Fix:** Vor jeder Aussage über eine laufende Animation zwei Zustandsmessungen im Abstand einer bekannten Zeitspanne vergleichen (z. B. `document.getAnimations()`-Census bei `--at` und `--at2` in `scripts/animations.mjs`), statt sich auf den optischen fps-Eindruck zu verlassen; einen Guard, der eine Animation bedingt abschaltet, bei jeder Änderung der Auslösebedingung neu prüfen und ggf. mit dem ursprünglichen Bug zusammen entfernen.
**Beleg:** mccain-digital, Commit `465f8f9` (2026-08-31): „Twice in this session I measured 60fps on an animation that was not running." · Sicherheit: measured
**Gilt für:** allgemein

## Prozess: Messen ist Teil des Gates

### 23. Mobil ist die Zahl, die zählt — aber auf beiden Formfaktoren messen
**Warum:** PageSpeed Insights und damit die typische Owner-/Kunden-Zielzahl bewerten primär mobil — Desktop-Werte allein reichen als Nachweis nicht. Gleichzeitig kann eine rein mobile Messreihe eine Desktop-spezifische Regression verdecken und umgekehrt.
**Woran man es erkennt:** Fester dokumentierter Befehl für die maßgebliche Zahl: `npx lighthouse "<url>" --form-factor=mobile --screenEmulation.mobile --throttling-method=simulate --only-categories=performance,accessibility --chrome-flags="--headless=new"`.
**Fix:** Diesen exakten Befehl (oder `scripts/mainthread.mjs`/`scripts/lcp-window.mjs --mobile`) für die bindende mobile Zahl nutzen, UND zusätzlich Desktop mitmessen, statt Desktop-Ausreißer unreflektiert als reale Regression zu behandeln — ein Desktop-TBT-Ausreißer kann auch ein CPU-Throttling-Artefakt der eigenen Testmaschine sein (siehe Regel 10). Eine Optimierung ist dabei nie automatisch kostenlos, nur weil sie plausibel klingt — auch eine rein inhaltliche Änderung (z. B. eine rotierende Hero-Headline) kann den Score einbrechen lassen, indem sie neue, spätere LCP-Kandidaten erzeugt (Details, inkl. eines Falls mit Absturz von 95 auf 60 Punkte: [lighthouse-psi.md](lighthouse-psi.md)).
**Beleg:** mccain-digital, HANDOFF Zeile 1126-1128. · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 24. Erreichbarkeit ist kein Beweis für Funktion
**Warum:** Grüne Erreichbarkeits-/Lade-Metriken (Status 200, Bilder da, Meta-Tags da, Wortzahl stimmt) sind kein Beleg dafür, dass eine Seite tatsächlich funktioniert — sie prüfen nicht, ob Interaktion und Datenversand wirklich ankommen.
**Woran man es erkennt:** Ein Kontaktformular war vollständig tot, während Status, Bilder, Meta-Tags und Wortzahl durchgehend grün waren — gefunden hat es am Ende der Owner durch echtes Klicken, nicht ein automatisierter Check. Ein komplett inerter Relaunch (kein JS-Mount lief) kam an denselben Checks grün vorbei: Status 200, Bilder geladen, Meta-Tags da, 1.886 Wörter echter Text — weil kein Check je etwas anklickte (Commit `72546fd`).
**Fix:** Vor jedem Push echte Interaktion ausführen und prüfen (Formular absenden, Menü, Modal, Klicks) — dafür siehe [[browser-verify]] und [[audit-website]] für die breitere Prüfung über Performance hinaus; ein reachability-only-Gate reicht nicht. Konkretes Muster: `verify_site.mjs` (Commit `72546fd`) prüft bei Komponentenseiten zusätzlich, ob die Hydration wirklich stattfand (Platzhalter verschwunden, Root gefüllt, keine page errors), öffnet dann simuliert Navigation und eine Kachel und verlangt eine echte DOM-Änderung als Beweis — und flaggt bewusst NICHT bekannte Nicht-Probleme (z. B. eine Seite ohne Menü), sonst wird das Gate irgendwann ignoriert.
**Beleg:** mccain-digital, HANDOFF Zeile ~1398-1400; Commit `72546fd` (2026-09-11). · Sicherheit: gemessen
**Gilt für:** allgemein

### 25. Veröffentlichte Performance-Zahlen laufend gegen echte Messwerte verifizieren
**Warum:** Eine im eigenen Marketingtext behauptete Zahl (z. B. „Lighthouse 100", „TBT 0 ms") kann durch spätere Regressionen (neue Features, eine Canvas-Engine) ODER durch einen kompletten Relaunch falsch werden — und ist dann nicht nur peinlich, sondern in Deutschland als Werbeaussage über die eigene Leistung potenziell abmahnfähig. Eine unverifizierte Performance-Behauptung in der eigenen Doku ist dabei selbst ein Bug, kein kosmetischer Punkt.
**Woran man es erkennt:** Eine Website behauptete auf allen 21 Seiten „4×100", „Lighthouse 100 mit laufender Canvas-Engine", „Total Blocking Time 0 ms" — gemessen waren tatsächlich 65–73 mobil und TBT 639–1.085 ms; nur CLS 0 stimmte noch. Nach einem kompletten Relaunch (neue Architektur am selben Repo-Root) stand dieselbe „4×100"-Zahl weiter in der README, obwohl sie auf der vorherigen, inzwischen ersetzten Architektur gemessen worden war (Commit `b99e912`); in einem anderen Fall wurde eine Zahl vor der eigentlichen Messung notiert und dann als verifiziert weitergetragen (Commit `878e94c`).
**Fix:** Veröffentlichte Zahlen nicht nur einmalig zum Launch verifizieren, sondern in denselben Sweep (Regel 26) aufnehmen; nach JEDEM Relaunch/Rebuild explizit neu messen, statt eine alte Zahl stillschweigend mitzuführen — wird eine alte Zahl bewusst als historisch zitiert, das ausdrücklich als „gemessen auf der vorherigen Version" kennzeichnen. Bei einer Abweichung den Fund als Owner-Entscheidung zurückgeben, nicht redaktionell selbst „reparieren".
**Beleg:** mccain-digital, HANDOFF Abschnitt „◑ D", Zeile 1027-1035; Commit `b99e912` (2026-09-11); Commit `878e94c` (2026-09-11). · Sicherheit: gemessen
**Gilt für:** allgemein

### 26. Geskripteter Sweep über alle Seiten × Kern-Viewports als Regressionsgate
**Warum:** Manuelle Stichproben übersehen Regressionen auf nicht direkt getesteten Seiten/Viewports — ein Sweep, der jede Seite in mehreren Viewports lädt und auf Page-/Console-Errors, Overflow, Widget-Boot und A11y-Basics prüft, deckt Regressionen systematisch statt zufällig auf.
**Woran man es erkennt:** Wiederholt genutztes Ergebnis: „sweep over 11 pages × 2 viewports with no page or console errors, pixel-scale guard green."
**Fix:** Einen geskripteten Full-Site-Sweep (alle Seiten × Kern-Viewports, inkl. des realen skalierten Geräte-Viewports aus Regel 20 in [messen-hauptthread-observer.md](messen-hauptthread-observer.md#20-einen-realen-skalierten-geräte-viewport-in-jede-messreihe-aufnehmen)) nach JEDER Änderung laufen lassen, nicht nur auf der direkt berührten Seite — als Pflicht-Gate vor jedem Push, ergänzt um [[browser-verify]] für die tatsächliche Browser-Interaktion. Die Orchestrierung dieses und der anderen html-performance-Schritte im Gesamtablauf eines Webprojekts zeigt [[web-skills-suite]].
**Beleg:** mccain-digital, Commit `16dabe6` (2026-08-03); Herkunft `sweep.sh`/`probe.js`/`check_links.py`, `verify_site.mjs` (Pflicht vor jedem Push, 21 Seiten). · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 27. Aufräum-Prüfungen vergleichen vorher mit nachher, nicht mit „leer“

Ein Tor, das nach dem Schließen eines Werkzeugs prüft „Eigenschaft X ist leer“, besteht auch dann, wenn die Seite X selbst gesetzt hatte und das Aufräumen den Wert gelöscht statt wiederhergestellt hat. Genau das passierte in mccain-digital (17.9.2026): die Seite setzt `--acc` als Inline-Stil auf `<html>`, der Akzent-Regler der Werkstatt entfernte die Eigenschaft beim Zurücksetzen und beim Schließen, und das Tor `v5dev-check.mjs` meldete monatelang „ok“, weil `""` erwartet wurde. Regel: den Wert VOR dem Eingriff merken und danach auf Gleichheit prüfen; das Werkzeug selbst merkt sich beim ersten Eingriff, was es vorfand, und schreibt genau das zurück (`before`/`restore`), statt `removeProperty` aufzurufen. Die neue Prüfung schlug beim ersten Lauf fehl und deckte den Fehler auf — ein Tor, das nie rot war, hat noch nichts bewiesen (siehe Regel 24).

## Quellen

- https://github.com/GoogleChrome/lighthouse/blob/main/core/lib/tracehouse/main-thread-tasks.js
- mccain-digital: HANDOFF.md, CHANGELOG.md, Commits (siehe einzelne Belege oben)
- mccain-digital: scratchpad/swgl_fcp.mjs-Messung, 16.09.2026 (lokal, nicht im Repo)
- mccain-digital: Lighthouse-Läufe `.../scratchpad/skill/raw/lh/*.json`, 16.09.2026
