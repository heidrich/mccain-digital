# Messen: Lighthouse, PSI und Messfenster — html-performance

> Teil des Skills [[html-performance]] · Stand 2026-09-16 · Belege: mccain-digital (HANDOFF, CHANGELOG, Commits), weitere Projekte des Owners, Recherche mit Quell-URLs

Dieses Kapitel behandelt Lighthouse-/PageSpeed-Insights-Spezifika: die drei Drosselungsarten, warum die 5,25-s-Ruhefenster nicht für PSI gelten, PSI lokal exakt nachbilden, Varianzquellen, observed gegen simuliert, wann das Messfenster für einen LCP-Kandidaten endet, sowie TTI-/TBT-Berechnung. Die Grundmethode des Messens (Zeitachse, produktionsnah, ruhige Maschine, Wächter-Zuverlässigkeit, Prozess) steht in [messen-methode.md](messen-methode.md); Hauptthread-Lesen, Beobachter, `content-visibility`, fps/Software-GL und Mobile-Emulation in [messen-hauptthread-observer.md](messen-hauptthread-observer.md). Wie Befunde behoben werden: die `laden-*`- und `rendern-*`-Referenzen; wie Lighthouse aus diesen Messwerten einen Score errechnet: [lighthouse-psi.md](lighthouse-psi.md).

Bis zum 17.9.2026 stand dieser Inhalt zusammen mit den anderen `Messen`-Themen in `messen.md`; die Regeln sind hier neu von 1 durchnummeriert, alte Verweise gelten nicht mehr.

## Kurzfassung

- **Drei Drosselungsarten kennen: simulate, devtools, provided** — PSI und der CLI-Default nutzen immer simulate ([→](#1-drei-drosselungsarten-kennen-simulate-devtools-provided))
- **Die 5,25-s-Ruhefenster gelten nicht für PSI** — sie greifen nur bei explizitem --throttling-method=devtools/provided ([→](#2-die-525-s-ruhefenster-gelten-nicht-für-psi))
- **PSI drosselt die CPU mobil mit 1,2x, nicht mit 4x** — Desktop gar nicht ([→](#3-psi-drosselt-die-cpu-mobil-mit-12x-nicht-mit-4x--desktop-gar-nicht))
- **PSI lokal exakt nachbilden** — lr-mobile-config.js/lr-desktop-config.js als eigene Config verwenden ([→](#4-psi-lokal-exakt-nachbilden-gerät-netzwerk-config))
- **Varianzquellen kennen und einplanen** — PSI-Hardware ist fix, deine Maschine nicht ([→](#5-varianzquellen-kennen-psi-hardware-ist-fix-deine-maschine-nicht))
- **"observed" ist die reale Traceszeit — der Bericht ist bei simulate eine Nachrechnung** — Lantern kann stark abweichen ([→](#6-observed-ist-die-reale-tracezeit--der-bericht-ist-bei-simulate-eine-nachrechnung))
- **LCP-Reporting endet an echter Eingabe, nicht an Mausbewegung** — Klick, Tap und Tastendruck stoppen, Hover nicht ([→](#7-lcp-reporting-endet-an-echter-eingabe-nicht-an-mausbewegung))
- **Ein späterer, größerer Kandidat zählt bis zum Fensterende oder bis zur Eingabe** — mit Zähl-Feinheiten (einmal pro Element, Byte-/Rauschfilter) ([→](#8-ein-späterer-größerer-kandidat-wird-lcp-bis-fensterende-oder-eingabe))
- **Ein zu später erster Paint verschiebt das ganze Messfenster** — Software-GL/getContext kann das auslösen ([→](#9-ein-zu-später-erster-paint-verschiebt-das-ganze-messfenster))
- **TTI: erstes 5-s-Fenster ganz ohne Long Task nach FCP** — eine Endlosschleife erreicht TTI nie ([→](#10-tti-erstes-5-s-fenster-ganz-ohne-long-task-nach-fcp))
- **TBT: Summe der Long-Task-Dauer minus 50 ms zwischen FCP und TTI** — spätes Deferred-Work verschiebt TTI und zieht weitere Long Tasks hinein ([→](#11-tbt-summe-der-long-task-dauer-minus-50-ms-zwischen-fcp-und-tti))
- **Einen unbelegten externen Einzelwert nicht blind als Ziel übernehmen** — ohne Rohdaten keine Ursachenzuordnung ([→](#12-einen-unbelegten-externen-einzelwert-nicht-blind-als-ziel-übernehmen))

## Inhalt

- [Lighthouse CLI, PageSpeed Insights, DevTools](#lighthouse-cli-pagespeed-insights-devtools)
- [Observed vs. simuliert, und wann das Messfenster endet](#observed-vs-simuliert-und-wann-das-messfenster-endet)
- [TTI und TBT](#tti-und-tbt-wie-die-skripte-sie-berechnen)
- [Offene Fragen](#offene-fragen)
- [Quellen](#quellen)

## Lighthouse CLI, PageSpeed Insights, DevTools

Alle Angaben in diesem Abschnitt: Lighthouse 13.4.1 (main-Branch = aktuelles npm-„latest"), Stand 2026-09-16.

### 1. Drei Drosselungsarten kennen: simulate, devtools, provided
**Warum:** `--throttling-method` bestimmt, WIE eine Seite gedrosselt und WAS am Ende berichtet wird. `simulate` (Lantern) ist der Default von CLI **und** PSI; `devtools` drosselt real per Chrome DevTools Protocol; `provided` fügt gar keine zusätzliche Drosselung hinzu (z. B. bei echtem gedrosseltem Mobilfunk über ein Gerät, kombiniert mit `--screenEmulation.disabled --throttling.cpuSlowdownMultiplier=1`).
**Woran man es erkennt:** PSI-Lab-Diagnosen laufen laut offizieller Doku *immer* mit simuliertem Throttling — nie mit `devtools`.
**Fix:** Für PSI-nahe lokale Zahlen `--throttling-method` unangetastet lassen (Default = simulate); `devtools` nur bewusst wählen, wenn reale CDP-Drosselung gebraucht wird, z. B. um zu sehen, wie sich eine Seite unter echtem Netzwerk-Delay tatsächlich verhält.
**Beleg:** Quelle: GoogleChrome/lighthouse `docs/throttling.md`, 13.4.1, 2026-09-16. · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 2. Die 5,25-s-Ruhefenster gelten nicht für PSI
**Warum:** Frühere Annahme: PSI warte 5,25 s auf Netzwerk-/CPU-Ruhe, bevor es abschließt. Das ist falsch — Verwechslung mit dem devtools-Modus. `core/config/config.js::overrideThrottlingWindows()` hebt `pauseAfterFcpMs`/`pauseAfterLoadMs`/`networkQuietThresholdMs`/`cpuQuietThresholdMs` nur dann von 1000 ms auf 5250 ms an, wenn `throttlingMethod` **nicht** `simulate` ist. PSI bleibt aber laut `lr-mobile-config.js`/`lr-desktop-config.js` und offizieller Doku immer bei `simulate`. Details zur Widerlegung: [widerlegt.md](widerlegt.md#1-psi-wartet-525-sekunden-auf-netzwerk-cpu-ruhe).
**Woran man es erkennt:** Die lr-Configs überschreiben tatsächlich nur `maxWaitForFcp` (15.000 ms) und `maxWaitForLoad` (35.000 ms) — beides *niedriger* als der CLI-Default (30.000/45.000 ms), nicht höher.
**Fix:** Für PSI-genaue lokale Läufe die vier Quiet-Settings beim generischen 1000-ms-Default belassen; die 5250-ms-Werte nur erwarten, wenn `--throttling-method` explizit auf `devtools` oder `provided` gesetzt wird.
**Beleg:** Quelle: GoogleChrome/lighthouse `core/config/{constants.js,config.js,lr-mobile-config.js}`, 13.4.1, 2026-09-16. · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 3. PSI drosselt die CPU mobil mit 1,2x, nicht mit 4x — Desktop gar nicht
**Warum:** `lr-mobile-config.js` überschreibt `cpuSlowdownMultiplier` explizit auf **1,2** (Kommentar im Code: „Determined using PSI CPU benchmark median"), weil die Lightrider-VMs selbst schon deutlich langsamer sind als eine typische Dev-Maschine. Das generische 4x ist nur der CLI-/DevTools-Panel-Default (`mobileSlow4G`-Preset) — kein PSI-Abbild. Desktop-PSI nutzt `cpuSlowdownMultiplier=1` (kein Throttle).
**Woran man es erkennt:** `scripts/mainthread.mjs --cpu 4` und `scripts/quiet`-artige TTI/TBT-Läufe sind bei 4x ein bewusster Stresstest; absolute Millisekunden dort sind NICHT direkt mit einem PSI-Bericht vergleichbar — nur die Proportionen zwischen den Gruppen bleiben aussagekräftig.
**Fix:** Für einen PSI-nahen Vergleichswert `--cpu 1.2` auf Mobile-Läufen nutzen; 4x explizit als Härtetest kennzeichnen, nicht als PSI-Erwartungswert kommunizieren.
**Beleg:** Quelle: GoogleChrome/lighthouse `core/config/lr-mobile-config.js`, 13.4.1, 2026-09-16; Kopfkommentar `scripts/mainthread.mjs`. · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 4. PSI lokal exakt nachbilden: Gerät, Netzwerk, Config
**Warum:** Die genaueste lokale Annäherung an PSI ist, `lr-mobile-config.js`/`lr-desktop-config.js` 1:1 als eigene Lighthouse-Config zu verwenden — `throttlingMethod` bleibt dabei automatisch bei `simulate`.
**Woran man es erkennt:** PSI-Mobile-Emulation: Moto G Power, 412×823 CSS-px, `deviceScaleFactor:1.75`. PSI-Desktop: 1350×940, `deviceScaleFactor:1`. Netzwerk mobil: RTT 150 ms, 1,6 Mbps down / 750 Kbps up; Desktop: RTT 40 ms, 10 Mbps. PSI überspringt zusätzlich zwei Audits (`modern-http-insight`, `bf-cache` — Letzteres, weil es in Headless immer scheitert), die daher lokal ebenfalls fehlen dürfen, ohne ein Bug zu sein. INP läuft im PSI-Lab-Bericht grundsätzlich nie (Audit ist `timespan`-only und liefert `notApplicable:true` unter `simulate`) — kein fehlender Wert ist hier kein Fehler.
**Fix:** `node scripts/lighthouse-psi.mjs <url> [--desktop] [--method simulate|devtools] [--runs 5] [--keep] [--json]` — baut automatisch dieselbe Config wie `lr-mobile-config.js`/`lr-desktop-config.js` (`maxWaitForFcp` 15000, `maxWaitForLoad` 35000, `skipAudits` `modern-http-insight`+`bf-cache`, mobil `cpuSlowdownMultiplier` 1,2 bzw. Desktop 1 mit `rttMs` 40/`throughputKbps` 10.240) und ruft damit den echten `lighthouse`-Befehl auf; warnt selbst automatisch bei einem LCP-Kandidaten > 3000 ms nach FCP oder einem Trace-Ende > 20 s. Für eine reine Handkopie ohne dieses Skript: `lighthouse <url> --config-path=./lr-mobile-config.js` (Config aus dem Lighthouse-Repo). Achtung dabei: `--preset`/`--config-path` sind nur CLI-Flags — bei programmatischer Nutzung über das Node-Modul werden sie ignoriert, dort muss die Config als drittes Argument an `lighthouse()` übergeben werden. Die übrigen Skripte in diesem Ordner (`mainthread.mjs`, `fps.mjs` &c.) messen dagegen bewusst OHNE Lighthouse-Abhängigkeit über eigene CDP-Aufrufe (`scripts/lib/browser.mjs` `MOBILE`/`DESKTOP`-Presets) — beide Wege existieren parallel für unterschiedliche Fragen.
**Beleg:** Quelle: GoogleChrome/lighthouse `core/config/constants.js`, `docs/readme.md`, 13.4.1, 2026-09-16; Kopfkommentar `scripts/lighthouse-psi.mjs` (Settings 1:1 aus lighthouse@13.4.1 `lr-mobile-config.js`/`lr-desktop-config.js` abgeschrieben, im npx-Cache verifiziert). · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 5. Varianzquellen kennen: PSI-Hardware ist fix, deine Maschine nicht
**Warum:** Laut Lighthouses eigener Varianz-Doku sind Hardware- und lokale Netzwerk-Varianz auf PSI „UNLIKELY" (feste Lightrider-VMs), auf einer normalen lokalen Maschine dagegen „LIKELY" — das ist die Hauptursache für Abweichungen zwischen einem lokalen Lauf und PSI. Seiten-Nichtdeterminismus (z. B. zeitgesteuerte Inhaltswechsel) bleibt dagegen *immer* unmitigiert, auch auf PSI selbst.
**Woran man es erkennt:** Ein exakt PSI-konfigurierter lokaler Lauf derselben v5-Seite maß wiederholt Score 100 mit LCP-Element `img.s23` (Logo) — kein lokaler Trace erfasste je die rotierende Hero-Headline als Kandidaten (Trace-Ende 2,4 s bei simulate bzw. 13,3 s bei devtools, jeweils vor `animation-delay:13.5s`). Der Owner maß auf derselben Seite über den echten PSI-Dienst dagegen einen Einbruch auf Performance 60 mit LCP-Render-Delay 20.490 ms auf der Headline (`span.v5-r`). Der Mechanismus dahinter ist inzwischen bestätigt (Regel 8, Commit `ca40094`): eine seinerzeit noch vorhandene Rotation erzeugte neue, spätere LCP-Kandidaten. Offen bleibt nur, warum die lokale, config-genaue Kopie strukturell keine Chance hatte, dieselbe Rotation überhaupt zu sehen, während der echte PSI-Dienst es tat — vermutlich, weil PSIs tatsächliche Wanduhrzeit pro Lauf länger reicht als das, was ein lokaler `simulate`-Trace beobachtet, bevor er endet.
**Fix:** Für konsistente lokale Läufe dedizierte, nicht-burstable Hardware nutzen (≥2 Kerne, 4 empfohlen; ≥2 GB RAM, 4–8 GB empfohlen — AWS t-Familie, GCP N1/E2 shared-core und FaaS wie Lambda explizit meiden), ≥5 Läufe messen und den Median nehmen (z. B. `@lhci/cli` mit `lhci collect -n 5`, optional direkt gegen die echte PSI-API mit `--mode psi --psiApiKey=...`); bei einer Seite mit zeitgesteuertem Content (Rotation, verzögertes Nachladen) zusätzlich prüfen, ob ein späterer, größerer Kandidat erst nach dem Ende des eigenen lokalen Trace einträfe (Regel 8) — das ist bei einem dramatischen PSI-Einbruch die wahrscheinlichere Erklärung als reine Hardware-Varianz.
**Beleg:** Quelle: GoogleChrome/lighthouse `docs/variability.md`, 13.4.1, 2026-09-16; Commit `ca40094` (16.9.2026) und [fallstudien.md](fallstudien.md#2026-09-16--mccain-digital--v5-optimierungsrunde-und-chromium-verifikation) bestätigen den Mechanismus nachträglich für diesen Fall. · Sicherheit: gemessen (Mechanismus) / dokumentiert (Hardware-Varianz)
**Gilt für:** allgemein

## Observed vs. simuliert, und wann das Messfenster endet

### 6. „observed" ist die reale Tracezeit — der Bericht ist bei simulate eine Nachrechnung
**Warum:** Bei `throttlingMethod=simulate` lädt Chrome die Seite einmal weitgehend ungedrosselt und zeichnet den Trace auf; Lantern baut daraus einen Netzwerk- + CPU-Abhängigkeitsgraphen und „spielt" ihn mit angepassten RTT-/Durchsatz-Werten und CPU-Dauer×Multiplikator erneut ab. Die im Bericht ganz oben stehenden Werte (`firstContentfulPaint`, `largestContentfulPaint`, …) sind bei simulate also SIMULIERT, nicht die literalen Zeitstempel aus dem Trace — das sind die `observed*`-Felder.
**Woran man es erkennt:** Im selben simulate-Lauf: `observedFirstContentfulPaint: 80 ms`, aber `firstContentfulPaint (final): 797 ms`. Unter `--throttling-method=devtools` (keine Simulation nötig, die Drosselung war schon real) sind beide Werte identisch: `observedFirstContentfulPaint: 1533 ms` = `firstContentfulPaint (final): 1533 ms`. Ein Extremfall mit künstlich angehobenem `maxWaitForFcp`/`maxWaitForLoad` (300.000/360.000 ms statt Default 30.000/45.000 ms) zeigt die Spannweite: `observedFirstContentfulPaint = observedLargestContentfulPaint = 125.226 ms` (ein realer, durch Maschinenlast fast 2,5 Minuten verzögerter erster Paint, siehe Regel 10 in [messen-methode.md](messen-methode.md#10-nie-unter-maschinenlast-messen)), während der simulierte, berichtete Wert bei `firstContentfulPaint: 777 ms`/`largestContentfulPaint: 1727 ms` blieb — Lantern rechnet aus dem Netzwerk-/CPU-Graphen neu, unabhängig davon, wie lange der reale Trace tatsächlich brauchte.
**Fix:** Beim Lesen eines Lighthouse-JSON-Reports immer prüfen, welcher `throttlingMethod` galt, bevor `observed*` gegen die Top-Level-Metrik verglichen wird — bei simulate sind das zwei verschiedene Dinge, bei devtools dasselbe.
**Beleg:** mccain-digital, 16.9.2026, `.../lh/old-mobile-simulate.json` vs. `old-mobile-devtools.json`, Extremfall `.../lh/old-extended-diag.json`. Bekannte Lantern-Schwäche: „if there's a single slow render-blocking request that shares an origin with several fast responses then Lighthouse will underestimate page load time" — und ein dokumentiertes Divergenz-Beispiel, bei dem eine beobachtete, ungedrosselte LCP von 2,4 s auf 11,8 s (~5x) simuliert hochgerechnet wurde. · Sicherheit: gemessen
**Gilt für:** allgemein

### 7. LCP-Reporting endet an echter Eingabe, nicht an Mausbewegung
**Warum:** Das Reporting stoppt bei einem echten, „trusted" Scroll-Event ODER einem aufgelösten Input-Event — Letzteres nur bei vollständigem Klick/Tap (`pointerdown`+`up`/`click`) oder vollständigem Tastendruck (`keydown`+`keyup`). `mousemove`/Hover erzeugen nie eine `interactionId` und stoppen deshalb NICHT.
**Woran man es erkennt:** `scripts/lcp-window.mjs --interact N` löst die Grenze absichtlich per Tab-Taste aus (ein vollständiger Tastendruck) und markiert den Zeitpunkt in der Ausgabe: „LCP-Reporting sollte ab hier enden."
**Fix:** Bei jeder automatisierten LCP-Messung mit `mousemove` operieren, wenn das Fenster bewusst offen bleiben soll; einen echten Tastendruck/Klick nutzen, wenn das reale Nutzerverhalten (das Reporting beendet) simuliert werden soll.
**Beleg:** Quelle: W3C Largest Contentful Paint Working Draft, Event-Timing-Spec, abgerufen 2026-09-16; Implementierung `scripts/lcp-window.mjs`. · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 8. Ein späterer, größerer Kandidat wird LCP bis Fensterende oder Eingabe
**Warum:** Bei jedem Paint vergleicht der Algorithmus die Größe neu gemalter Bilder/Textknoten gegen die bisher größte; nur ein größerer Kandidat erzeugt einen neuen Eintrag — der zuletzt gemeldete zählt, solange weder Scroll noch Input stattfand. Das gilt auch für nachladende Bilder oder eine JS-Rotation von Headlines.
**Woran man es erkennt:** `scripts/lcp-window.mjs` protokolliert JEDEN LCP-Kandidaten mit Zeit/Größe/Element und markiert einen Kandidaten > 3000 ms nach FCP explizit als `WARNUNG: später LCP-Kandidat`.
**Fix:** Bei der Interpretation eines LCP-Werts immer die volle Kandidaten-Timeline lesen, nicht nur den finalen Wert. Zähl-Feinheiten, die dabei mitspielen: jedes Element wird genau einmal gemeldet (ein späterer Web-Font-Swap am selben Element erzeugt keinen zweiten Eintrag, nur ein dadurch neu größtes ANDERES Element würde einen neuen Kandidaten setzen); ein Kandidat mit Fläche = exakt Viewport-Fläche zählt nie (Splash-Screen-Heuristik); ein neuer Kandidat, der sich in Breite UND Höhe um ≤ 3 px vom aktuellen unterscheidet, wird verworfen (Rauschfilter); ein entferntes Element bleibt trotzdem Kandidat, bis ein größeres erscheint; ein Bild zählt nur, wenn sein Transfergewicht ≥ 0,004 Byte/Pixel beträgt (filtert komprimierte Gradient-Platzhalter), und wird bei Upscaling über seine natürliche Auflösung hinaus im Gewicht durch den Skalierungsfaktor geteilt.
**Beleg:** mccain-digital, 16.9.2026: kein lokaler Lauf zeigte ein Element der Klassen `v5-r`/`v5-w` (rotierende Headline) als LCP-Kandidaten — bei simulate lag der einzige Kandidat bei 106 ms (Logo `img.s23`), bei devtools-Throttling endete der Trace vor der ersten CSS-Rotation (`animation-delay:13.5s`). Der reale Mechanismus dahinter ist über den echten Owner-Lauf bestätigt: Commit `ca40094` (16.9.2026) behebt eine rotierende Hero-Headline, deren drei Varianten (13,5/20/26,5 s) je einen neuen, größeren LCP-Kandidaten erzeugten und den Score von 95 auf 60 einbrechen ließen (LCP 20,5 s) — nach Entfernen der Rotation wieder Performance 100 (Details: [fallstudien.md](fallstudien.md#2026-09-16--mccain-digital--v5-optimierungsrunde-und-chromium-verifikation)). Quelle Zählregeln: W3C Largest Contentful Paint Working Draft §Report/§Effective visual size, abgerufen 2026-09-16. · Sicherheit: gemessen (Projektfall) / dokumentiert (Zählregeln)
**Gilt für:** allgemein

### 9. Ein zu später erster Paint verschiebt das ganze Messfenster
**Warum:** Wartet der erste Paint der gesamten Seite auf einen synchron blockierenden Vorgang (z. B. `getContext("webgl")` unter Software-GL), verschiebt sich damit auch der Ausgangspunkt jeder nachfolgenden Fenstermessung — inklusive der Frage, welche später erscheinenden, größeren Elemente noch als LCP-Kandidat in Frage kommen (Regel 8) und ob der Trace lange genug läuft, um sie zu erfassen.
**Woran man es erkennt:** Mobil emuliert, `getContext` vor dem Seitenskript gewrappt: mit GPU (ANGLE Metal) lag FCP bei 188 ms, `getContext` blockierte 12 ms; mit SwiftShader (Software-GL) lag FCP bei 2216–2392 ms, `getContext` allein blockierte 230–341 ms als Long Task — CPU-Drosselung änderte daran fast nichts, weil der GPU-Prozess nicht gedrosselt wird.
**Fix:** FCP-Verzögerung gezielt unter einer Software-GL-Variante messen: `scripts/fps.mjs <url> --software-gl` zeigt den Frameraten-/Renderer-Effekt; die FCP-Zeile selbst braucht einen `softwareGl:true`-Lauf von `scripts/lcp-window.mjs` — `lib/browser.mjs` unterstützt die Option bereits (`launch({softwareGl:true})`), `lcp-window.mjs` liest aktuell aber kein `--software-gl`-Flag aus den Argumenten; bis das ergänzt ist, den Aufruf mit einer lokalen Kopie der `launchOpts`-Zeile ergänzen.
**Beleg:** mccain-digital, 16.9.2026, `scratchpad/swgl_fcp.mjs` (3 Szenarien, je 1 Lauf, ruhige Maschine); Zusammenhang mit Lighthouse: derselbe Tag maß unter Maschinenlast `observedFirstContentfulPaint: 125.226 ms` auf derselben Seite (siehe Regel 10 in [messen-methode.md](messen-methode.md#10-nie-unter-maschinenlast-messen)). · Sicherheit: gemessen
**Gilt für:** allgemein, WebGL/Canvas

## TTI und TBT: wie die Skripte sie berechnen

### 10. TTI: erstes 5-s-Fenster ganz ohne Long Task nach FCP
**Warum:** TTI ist der erste Zeitpunkt nach FCP, ab dem 5000 ms lang keine neue Long Task mehr beginnt (Lighthouse: zusätzlich ≤2 gleichzeitige Requests — von den Skripten hier nicht mitgeprüft, nur die Long-Task-Ruhe).
**Woran man es erkennt:** `scripts/lcp-window.mjs` und die `quiet`-Logik berechnen TTI, indem sie ab FCP einen Cursor durch alle Long Tasks schieben und die erste Lücke ≥ 5000 ms suchen; wird sie nie erreicht, bleibt `tti: null` und `ttiReached: false`.
**Fix:** Bei einer Seite mit endlosem Animations-/Rotationsloop erwarten, dass TTI NIE erreicht wird — das ist kein Skriptfehler, sondern die korrekte Konsequenz eines nie ruhigen Hauptthreads.
**Beleg:** Quelle: GoogleChrome/lighthouse `core/computed/metrics/interactive.js` (`REQUIRED_QUIET_WINDOW=5000`, `ALLOWED_CONCURRENT_REQUESTS=2`), 13.4.1, 2026-09-16; Implementierung `scripts/lcp-window.mjs`. · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 11. TBT: Summe der Long-Task-Dauer minus 50 ms zwischen FCP und TTI
**Warum:** „Blocking Time [ist] any time interval … where task length exceeds 50 ms … Total Blocking Time is the sum of all Blocking Time between First Contentful Paint and Interactive Time." Ein 110-ms-Task liefert damit 60 ms Blocking Time. TTI wird intern immer berechnet (auch wenn sein Lighthouse-Audit `weight:0`/`group:"hidden"` trägt), weil TBT es als Fensterende braucht. Spätes Deferred-Work setzt den 5-s-Ruhetimer aus Regel 10 zurück, verschiebt TTI selbst nach hinten und zieht damit potenziell weitere, eigentlich schon „nach TTI" liegende Long Tasks zusätzlich ins TBT-Fenster.
**Woran man es erkennt:** `scripts/lcp-window.mjs` summiert `max(0, Dauer - 50)` über alle Long Tasks zwischen FCP und TTI (bzw. bis „jetzt", wenn TTI nie erreicht wird) und markiert das Ergebnis dann als `tbtOpenEnded: true` — eine Seite, die in 0,8 s malt, aber nie zur Ruhe kommt, wird dadurch rechnerisch zu einer Seite mit einem beliebig wachsenden TBT.
**Fix:** Bei einem hohen oder „offenen" TBT-Wert zuerst prüfen, WANN im Long-Task-Verlauf die 5-s-Lücke ausbleibt (`scripts/lcp-window.mjs`-Ausgabe „Long Tasks nach 5 s"), statt den TBT-Wert isoliert zu optimieren.
**Beleg:** Quelle: GoogleChrome/lighthouse `core/computed/metrics/total-blocking-time.js`, 13.4.1, 2026-09-16. · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 12. Einen unbelegten externen Einzelwert nicht blind als Ziel übernehmen
**Warum:** Ein von einem externen Tool genannter Einzelwert lässt sich ohne die zugrundeliegenden Rohdaten (z. B. den vollständigen Trace/JSON-Bericht) nicht auf eine Ursache zurückführen — dagegen zu optimieren zielt womöglich auf ein Phantom statt auf einen belegten Kostenblock.
**Woran man es erkennt:** Ein von PageSpeed genannter Wert von 30.533 ms ließ sich mit eigenen Traces (`scripts/mainthread.mjs`) nicht reproduzieren oder zuordnen; die eigene Messung für „Other" lag bei 1.477–1.486 ms, weit darunter. Derselbe PSI-Desktop-Bericht nannte zusätzlich TBT 13.060 ms — lokal maß Desktop dagegen 96 Punkte, und eine eigene Aufzeichnung derselben Live-Seite zeigte 68 % Leerlauf; plausibelste Erklärung war Throttling-Verstärkung kleiner CPU-Anteile auf der PSI-Testmaschine, kein realer Bug (Einordnung: [widerlegt.md](widerlegt.md#21-psi-desktop-tbt-13060-ms-zeigt-einen-realen-performance-bug)).
**Fix:** Einen unerklärten externen Wert bewusst als unerklärt vermerken statt spekulativ dagegen zu optimieren; erst mit den eigenen Skripten (`scripts/mainthread.mjs`, `scripts/lcp-window.mjs`) nachmessen und nur belegte Kostenblöcke angehen. Auf einer bekanntermaßen langsamen Testmaschine (wie einer PSI-VM) können 5 % CPU-Last wie 30–50 % auf einem alten Notebook wirken — ein Ausreißer ohne lokale Reproduktion ist eher ein Testmaschinen-Artefakt als ein Bug-Beweis.
**Beleg:** mccain-digital, HANDOFF „STAND 16.9. Pixelstrom", Zeile 243; PSI-Desktop-Bericht TBT 13.060 ms/„Other" 30.533 ms, siehe [widerlegt.md](widerlegt.md#21-psi-desktop-tbt-13060-ms-zeigt-einen-realen-performance-bug). · Sicherheit: gemessen
**Gilt für:** allgemein

## Offene Fragen

- Der Mechanismus hinter der berichteten externen PSI-Diskrepanz (Performance 60, LCP-Render-Delay 20.490 ms auf `span.v5-r`) ist seit Commit `ca40094` (16.9.2026) grundsätzlich geklärt: eine rotierende Hero-Headline erzeugte neue, spätere LCP-Kandidaten (Regel 8) und wurde entfernt (danach wieder Performance 100). Offen bleibt nur, warum keiner der 6 lokalen Lighthouse-Traces (simulate/devtools, mobil/Desktop) auf dem damaligen Buildstand die Rotation überhaupt als Kandidaten sah — die Traces enden strukturell vor der ersten Rotation (2,4 s bei simulate, 13,3 s bei devtools, gegenüber `animation-delay:13.5s`).
- `scripts/lcp-window.mjs` liest aktuell kein `--software-gl`-Flag aus den Argumenten, obwohl `scripts/lib/browser.mjs` die Option bereitstellt — bis ergänzt, ist eine Software-GL-FCP-Messung nur mit einer lokal angepassten Kopie des Skripts möglich (siehe Regel 9).
- Für `duplicated-javascript-insight` (Lighthouse) ließ sich in dieser Recherche keine feste Byte-Mindestschwelle finden — nicht in den messen-Geltungsbereich fallend, aber als Lücke vermerkt, falls lighthouse-psi.md sie aufgreift.

## Quellen

- https://github.com/GoogleChrome/lighthouse/blob/main/core/config/constants.js
- https://github.com/GoogleChrome/lighthouse/blob/main/core/config/config.js
- https://github.com/GoogleChrome/lighthouse/blob/main/core/config/lr-mobile-config.js
- https://github.com/GoogleChrome/lighthouse/blob/main/core/config/default-config.js
- https://github.com/GoogleChrome/lighthouse/blob/main/core/computed/metrics/total-blocking-time.js
- https://github.com/GoogleChrome/lighthouse/blob/main/core/computed/metrics/interactive.js
- https://github.com/GoogleChrome/lighthouse/blob/main/docs/throttling.md
- https://github.com/GoogleChrome/lighthouse/blob/main/docs/variability.md
- https://github.com/GoogleChrome/lighthouse/blob/main/docs/readme.md
- https://www.w3.org/TR/largest-contentful-paint/
- https://w3c.github.io/event-timing/
- https://calendar.perfplanet.com/2021/how-does-lighthouse-simulated-throttling-work/
- https://registry.npmjs.org/lighthouse/latest
- mccain-digital: HANDOFF.md, CHANGELOG.md, Commits (siehe einzelne Belege oben)
- mccain-digital: scratchpad/swgl_fcp.mjs-Messung, 16.09.2026 (lokal, nicht im Repo)
- mccain-digital: Lighthouse-Läufe `.../scratchpad/skill/raw/lh/*.json`, 16.09.2026
