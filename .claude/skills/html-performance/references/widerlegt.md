# Widerlegt und präzisiert — html-performance

> Teil des Skills [[html-performance]] · Stand 2026-09-16 · Belege: mccain-digital (HANDOFF, CHANGELOG, Commits), weitere Projekte des Owners, Recherche mit Quell-URLs

Diese Datei sammelt Annahmen, die im Projekt gemessen oder aus Quellcode/Spec widerlegt wurden — einschließlich "offensichtlicher" Optimierungen, die ein Assistent (Gemini, ein Audit-Tool oder die eigene Intuition) vorschlagen würde. Zweck: niemand soll einen bereits gemessen falschen Fix noch einmal anwenden. Vor jedem Verdacht "das ist doch offensichtlich schneller" hier nachschlagen.

## Kurzfassung

**Widerlegt:**

- **"Async CSS-Swap per preload/onload ist sicher"** → Bei layoutrelevantem CSS erzeugt der Aktivierungs-Moment einen FOUC-Reflow (CLS). ([→](#1-async-css-swap-per-preload-und-onload-ist-eine-sichere-optimierung))
- **"fonts.css inline verbessert die Performance"** → Gemessen: ohne Wirkung. ([→](#2-fontscss-inline-ziehen-verbessert-die-performance))
- **"Object Pooling verbessert die WebGL-Pixelstrom-Performance"** → Kein Objekt-Allokations-Problem, GC lag bei 0-2 ms. ([→](#3-object-pooling-verbessert-die-webgl-pixelstrom-performance))
- **"will-change/translateZ auf dem Canvas hilft"** → Canvas ist bereits GPU-komponiert, kein Zusatznutzen belegt. ([→](#4-will-change-und-translatez-auf-dem-canvas-verbessern-die-performance))
- **"scheduler.yield() reduziert die Blockierung"** → Erreicht die eigentliche Kostenquelle (IntersectionObserver) nicht. ([→](#5-scheduleryield-reduziert-die-hauptthread-blockierung))
- **"Nicht-immutable Cache-Header senken den Score"** → Live gemessen: Score blieb bei 99. ([→](#6-nicht-immutable-cache-header-senken-den-performance-score))
- **"Platzhalter-Bilddienste sind vernachlässigbar"** → Waren 4,9 von 8,9 MB Mobile-Payload. ([→](#7-externe-platzhalter-bilddienste-sind-performance-mäßig-vernachlässigbar))
- **"GSAPs scrollTrigger.scroll ist der korrekte Weg extern zu scrubben"** → Bricht unter Smooth-Scroll-Wrappern (Lenis/iframe). ([→](#8-gsaps-scrolltriggerscroll-ist-der-korrekte-weg-zum-externen-scrubben))
- **"Ein automatisches Reduced-Motion-System schützt ohne Kosten"** → Filterte lautlos jede Transform-Animation, wurde komplett entfernt. ([→](#9-ein-automatisches-reduced-motion-system-schützt-ohne-kosten))
- **"Ein verifiziert 0×-ladender Code-Split-Chunk ist auf der Homepage risikofrei"** → Trotzdem gegen den Einsatz entschieden (Risiko-Budget). ([→](#10-ein-verifiziert-ungeladener-code-split-chunk-ist-auf-der-homepage-risikofrei))
- **"Lokal gemessene sehr niedrige Scores spiegeln die Live-Performance"** → Messfehler: `prodserve.py` komprimierte `/` nicht. ([→](#11-lokal-gemessene-sehr-niedrige-scores-spiegeln-die-live-performance))
- **"Die Schriftart wird in Produktion zweimal heruntergeladen"** → Artefakt von `prodserve --dev` mit `no-store`. ([→](#12-die-schriftart-wird-in-produktion-zweimal-heruntergeladen))
- **"Das LCP-Element ist automatisch ein wirksamer Hebel für LCP"** → Entfernen brachte nur 106 ms von 3.659 ms. ([→](#13-das-lcp-element-ist-automatisch-ein-wirksamer-hebel-für-lcp))
- **"Die eigene '4×100 Lighthouse'-Aussage stimmt für den aktuellen Build"** → Aktueller Build: 68, Zahl stammt vom alten v3-Build. ([→](#14-die-eigene-4100-lighthouse-aussage-stimmt-für-den-aktuellen-build))
- **"hydrateRoot statt createRoot behebt die Hydration-Lücke automatisch"** → Bibliothek kostet nur 1 Punkt, der Rückfall kostete 21. ([→](#15-hydrateroot-statt-createroot-behebt-die-hydration-lücke-automatisch))
- **"hydrateRoot läuft erfolgreich gegen einen nachträglich gesetzten DOM-Snapshot"** → Zweimal gemessen, zweimal gescheitert (32 Fehler). ([→](#16-hydrateroot-läuft-erfolgreich-gegen-einen-nachträglich-gesetzten-dom-snapshot))
- **"Opacity entkoppeln verbessert die LCP-Zeit der H1"** → Das eigentliche Gate ist `transform`, nicht Opacity. ([→](#17-opacity-entkoppeln-verbessert-die-lcp-zeit-der-h1))
- **"support.js deferren und React vorladen verbessert den Score"** → Score blieb bei 68/69/69 über drei Läufe. ([→](#18-supportjs-deferren-und-react-vorladen-verbessert-den-score))
- **"React vorzuladen kann dem FCP nur helfen"** → FCP verschlechterte sich von 349 auf 485 ms. ([→](#19-react-vorzuladen-kann-dem-fcp-nur-helfen-nie-schaden))
- **"Der WebGL-Pixelstrom ist Hauptursache der hohen TBT"** → 146 Endlos-Animationen in einem 34×34-px-Logo waren es. ([→](#20-der-webgl-pixelstrom-ist-hauptursache-der-hohen-tbt))
- **"PSI-Desktop TBT 13.060 ms zeigt einen realen Bug"** → Lokal 96, Owner-Aufzeichnung 68 % Leerlauf — Throttling-Verstärkung. ([→](#21-psi-desktop-tbt-13060-ms-zeigt-einen-realen-performance-bug))
- **"V8-Coverage 'count>0' liefert einen korrekten Tot-Code-Anteil"** → Meldet 0 % tot für jede Datei (verschachtelte Ranges). ([→](#22-die-v8-coverage-regel-count-größer-0-liefert-einen-korrekten-tot-code-anteil))
- **"naturalWidth/naturalHeight = rohe Bitmap-Pixel-Maße"** → Sind dichte-korrigierte CSS-Pixel; drawImage brauchte rohe Werte. ([→](#23-naturalwidth-und-naturalheight-entsprechen-rohen-bitmap-pixel-maßen))
- **"CSS-Opacity-Crossfade zweier deckender Ebenen blendet gleichmäßig"** → a+b(1-a) ergibt nur ~75 % in der Mitte. ([→](#24-css-opacity-crossfade-zweier-deckender-ebenen-blendet-gleichmäßig))
- **"Eine isolierte Lab-Messung beschreibt die reale Kostenlast"** → Hover-Sweep sagte "kostet nichts", echter Scroll zeigte 65 % Frames >20 ms. ([→](#25-eine-isolierte-lab-messung-beschreibt-die-reale-seiten-kostenlast))
- **"Neu bauen ist schneller als vorhandene Mechanik wiederverwenden"** → Kostete die meiste Zeit der Session, zweimal neu erfunden. ([→](#26-neu-bauen-ist-schneller-als-vorhandene-engine-mechanik-wiederverwenden))
- **"Ein externes Referenz-Rezept lässt sich direkt übernehmen"** → Enthielt denselben Fehler, der die Seite schon einmal auf 20fps brachte. ([→](#27-ein-externes-referenz-rezept-lässt-sich-direkt-übernehmen))
- **"Ein Attribut-Reihenfolge-Test erkennt zuverlässig alle Overlays"** → 4 von 5 Overlays schreiben Attribute in anderer Reihenfolge. ([→](#28-ein-attribut-reihenfolge-test-erkennt-zuverlässig-alle-overlays))
- **"Ein einmal eingebauter Sicherheits-Guard bleibt dauerhaft gültig"** → Schaltete später eine korrekt laufende Animation lautlos ab. ([→](#29-ein-einmal-eingebauter-sicherheits-guard-bleibt-dauerhaft-gültig))
- **"1.000 DOM-Änderungen/s sind ein relevantes Problem"** → Nur 63 ms kumulierte Kosten in 5,7 s. ([→](#30-1000-dom-änderungen-pro-sekunde-sind-ein-relevantes-problem))
- **"460 KB rohe Marken-Bytes sind ein relevantes Transfer-Problem"** → Nach gzip nur 13.938 B. ([→](#31-460-kb-rohe-marken-bytes-sind-ein-relevantes-transfer-problem))
- **"Der Vorlagen-Umweg Parse-Serialisieren-Parse ist teuer"** → Gemessen: 15,3 ms. ([→](#32-der-vorlagen-umweg-parse-serialisieren-parse-ist-teuer))
- **"ResizeObserver auf body ist Hauptverdächtiger für Dauerlast"** → Feuert nur 4× in 22 s. ([→](#33-resizeobserver-auf-body-ist-hauptverdächtiger-für-dauerlast))
- **"60 getBoundingClientRect/s stammen vom Notes-Overlay"** → Ist die Pixel-Engine (movePoints). ([→](#34-60-getboundingclientrect-aufrufe-pro-sekunde-stammen-vom-notes-overlay))
- **"Eine Ressource wird laut Lighthouse-Tabelle sechsmal aufgerufen"** → Spalte zeigt zugeordnetes Skript, nicht Request-Zahl (nur 1 Anfrage). ([→](#35-eine-ressource-wird-laut-lighthouse-tabelle-sechsmal-aufgerufen))
- **"Pixel-Headline-Text ist im Hellmodus strukturell unlesbar"** → War ein Theme-Timing-Bug, kein Mosaik-Effekt. ([→](#36-pixel-gerasterter-headline-text-ist-im-hellmodus-strukturell-unlesbar))
- **"Pixel-Dichte erhöhen = Blöcke größer machen"** → Größere Blöcke schließen die Lücken, Effekt geht verloren. ([→](#37-pixel-dichte-erhöhen-heißt-die-blöcke-größer-zu-machen))
- **"Blasse Pixel-Farben = zu geringe Grid-Dichte"** → War Antialiasing durch fraktionale Device-Pixel. ([→](#38-blasse-pixel-headline-farben-zeigen-zu-geringe-grid-dichte))
- **"Pixel-Headlines lesen sich kürzer/dünner (Box-Bug)"** → Geometrie war exakt; Sampling verwarf Kantenpixel. ([→](#39-pixel-headlines-lesen-sich-kürzer-und-dünner-wegen-eines-box-bugs))
- **"Der hue-Farbverlauf bleibt im warmen Bereich"** → Erreichte bei ±55° bereits Grün/Rot. ([→](#40-der-generierte-hue-farbverlauf-bleibt-im-warmen-bereich))
- **"Nahtlosigkeit per Pause + animation-delay verifizieren"** → animation-delay verschiebt eine pausierte Animation nicht. ([→](#41-nahtlosigkeit-lässt-sich-per-pause-und-animation-delay-verifizieren))
- **"Die Startseite ruft PixelFX.headline zuletzt auf"** → Zwei weitere Seiten trugen noch fünf Aufrufer. ([→](#42-die-startseite-ruft-pixelfxheadline-zuletzt-auf))
- **"Ein gezählter Patch ist nötig für support.js-Window-Handles"** → Handles existierten bereits. ([→](#43-ein-gezählter-patch-ist-nötig-für-supportjs-window-handles))
- **"Eine hohe aggregierte Script-Zeit im Trace zeigt den Flaschenhals"** → 250-ms-Fenster zeigten Script mit 1 ms, die reale Ursache war Layout von 2.408 Knoten. ([→](#44-eine-hohe-aggregierte-script-zeit-im-trace-zeigt-den-flaschenhals))
- **"Das periodische Nachbau-Polling der Stream-Notes verursachte den wiederkehrenden Long Task"** → Polling auf ResizeObserver umgestellt, der Long Task blieb unverändert. ([→](#45-das-periodische-nachbau-polling-der-stream-notes-verursachte-den-wiederkehrenden-long-task))
- **"defer auf dem Pixel-Engine-Script behebt das Parser-Blocking ohne Nebenwirkungen"** → Hätte jeden Pixel-Effekt lautlos deaktiviert (React ruft initPixels bereits selbst auf). ([→](#46-defer-auf-dem-pixel-engine-script-behebt-das-parser-blocking-ohne-nebenwirkungen))
- **"Die Vercel-Deployment-URL zu messen ist gleichwertig zur Messung der Live-Produktionsseite"** → Die echte Domain zeigte nie auf Vercel, lief weiter über nginx/SiteGround. ([→](#47-die-vercel-deployment-url-zu-messen-ist-gleichwertig-zur-messung-der-live-produktionsseite))
- **"'0 page errors' vom Lade-Gate bedeutet, die Seite hat keine Konsolenfehler"** → pageerror feuert nur bei unabgefangenen Exceptions; 70 bzw. 37 Konsolenfehler blieben unsichtbar. ([→](#48-0-page-errors-vom-lade-gate-bedeutet-die-seite-hat-keine-konsolenfehler))
- **"Wenn eine Drittanbieter-URL als Objekt-Schlüssel im Code auftaucht, wird dieser Origin auch tatsächlich geladen"** → window.__resources nutzt die URLs als Schlüssel gerade damit sie NIE angefragt werden. ([→](#49-wenn-eine-drittanbieter-url-als-objekt-schlüssel-im-code-auftaucht-wird-dieser-origin-auch-tatsächlich-geladen))
- **"Ein grünes Ergebnis von check_links.py bedeutet, es gibt keine kaputten Links oder doppelten IDs"** → Zwei Prüfungen matchten einen Dokumentationskommentar bzw. escapte Beispiel-Prosa statt des echten Markups. ([→](#50-ein-grünes-ergebnis-von-check_linkspy-bedeutet-es-gibt-keine-kaputten-links-oder-doppelten-ids))
- **"Zwei rAF-Ticks nach dem Skript-Start = der erste Frame ist gemalt; WebGL danach entlastet FCP und Score"** → Unter Software-GL blieb FCP bei 2,2 s, der Hauptthread bekam eine Long Task von 2,3 s nach FCP, TBT 0 → 2,2 s. ([→](#51-zwei-requestanimationframe-ticks-nach-dem-skript-start-garantieren-einen-gemalten-ersten-frame--webgl-danach-zu-starten-entlastet-fcp-und-score))

**Präzisiert:**

- **"PSI wartet 5,25 s auf Netzwerk-/CPU-Ruhe"** → Gilt nur für `devtools`-Throttling, PSI bleibt bei `simulate` (1 s). ([→](#1-psi-wartet-525-sekunden-auf-netzwerk-cpu-ruhe))
- **"PSI drosselt die CPU vierfach"** → PSI nutzt 1,2× mobil, 1× Desktop; 4× ist nur der CLI-Default. ([→](#2-psi-drosselt-die-cpu-vierfach-wie-die-devtools-voreinstellung))
- **"'Other' enthält IntersectionObserver-Arbeit"** → "Other" ist exakt 3 Scheduler-Events + Fallback; IO-Zuordnung nicht offiziell belegt. ([→](#3-die-lighthouse-kategorie-other-enthält-intersectionobserver-arbeit))
- **"PSI/Lighthouse liefert für WebGL immer null"** → Fallback-Entfernung bestätigt, exakter Meilenstein/PSI-Flag offen. ([→](#4-psilighthouse-liefert-für-webgl-immer-einen-null-kontext))
- **"contentvisibilityautostatechange feuert garantiert genau einmal"** → Meist ja, aber ein offenes Race-Condition-Issue erlaubt ein doppeltes Feuern. ([→](#5-contentvisibilityautostatechange-feuert-garantiert-genau-einmal-initial))
- **"IO-Ziele in gesperrten Subtrees erzwingen pro Frame Layout"** → Im eingeschwungenen Zustand nicht; Bootstrap-Phase und Layout-Lesen sind die echten Ursachen. ([→](#6-intersectionobserver-ziele-in-gesperrten-subtrees-erzwingen-pro-frame-layout))
- **"getAnimations zeigt Animationen gesperrter Subtrees erst beim Rendern"** → Animationen werden pausiert, nicht entfernt; Rückgabeverhalten ungeklärt. ([→](#7-getanimations-zeigt-animationen-gesperrter-subtrees-erst-beim-rendern))
- **"Layout-lesende APIs lösen einen Lighthouse-'forced reflow'-Befund aus"** → APIs stimmen; seit Lighthouse 13 stimmt auch der zweite Teil wieder — `forced-reflow-insight` ist ein echter (nur ungewichteter) Report-Befund, nicht nur ein DevTools-Feature. ([→](#8-layout-lesende-apis-pro-frame-lösen-einen-lighthouse-forced-reflow-befund-aus))
- **"CPU-Drosselung erkennbar an gedrosselter Shader-Framerate"** → CPU-Throttling trifft weder Hardware- noch Software-GL (beide im GPU-Prozess). ([→](#9-cpu-drosselung-lässt-sich-an-gedrosselter-shader-framerate-erkennen))
- **"decoding=async trägt zum Lazy-Load-Stopp bei"** → Nur `loading=lazy` + versteckter Container zählen. ([→](#10-decoding-async-trägt-zum-lazy-load-stopp-im-geschlossenen-menü-bei))

## Inhalt

- [Widerlegt (gemessen oder aus Quellcode/Spec)](#widerlegt-gemessen-oder-aus-quellcodespec)
- [Präzisiert (teilweise richtig)](#präzisiert-teilweise-richtig)
- [Offen (nicht verifizierbar)](#offen-nicht-verifizierbar)
- [Quellen](#quellen)

## Widerlegt (gemessen oder aus Quellcode/Spec)

### 1. „Async CSS-Swap per preload und onload ist eine sichere Optimierung“

**Herkunft:** Eigene Projekt-Annahme beim Homepage-v2-Refresh (verbreitete generische PageSpeed-Empfehlung: render-blocking CSS per `<link rel="preload">` → `onload`-Swap asynchron nachladen), zusätzlich vorab per Pixelvergleich als "pixelidentisch" verifiziert.
**Warum falsch:** Ist das nachgeladene Stylesheet layoutrelevant (hier: Nav-Layout), erzeugt der Aktivierungs-Moment einen ungestylten Flash (FOUC) mit vollem Seiten-Reflow — das zählt als Layout-Shift. Ein Pixelvergleich des FINALEN Renderings übersieht diesen kurzen Zwischenzustand während des Ladens.
**Beleg:** Commit 4d8d049 verifizierte "pixel-identical render" für den Async-Swap; Commit 3ecda0d (2026-07-20) führte eine spätere CLS-Regression exakt auf dieses Muster zurück. CHANGELOG.md, Abschnitt "2026-07-20 — Homepage v2-Refresh": nach Rückbau auf render-blocking `styles.css` + inline Nav-Layout Lighthouse 4×100, CLS 0, FCP 0,5 s, LCP 0,6 s (Desktop) · Sicherheit: gemessen.
**Was stattdessen gilt:** Layoutrelevantes CSS (Nav, above-the-fold) bleibt render-blocking oder wird inline gesetzt; async-Swap nur für Stylesheets ohne Einfluss auf die erste Layoutberechnung. [laden-kritischer-pfad.md](laden-kritischer-pfad.md#8-nicht-kritisches-css-nicht-blockierend-nachladen).

### 2. „fonts.css inline ziehen verbessert die Performance“

**Herkunft:** Eigene Optimierungsidee, zweimal notiert (STAND 13.9. und STAND A5-Bereich).
**Warum falsch:** Umgesetzt und gemessen, aber ohne messbare Wirkung.
**Beleg:** "fonts.css inline ziehen. Erledigt, gemessen, ohne Wirkung." (HANDOFF.md, "WAS ALS NAECHSTES DRAN IST", Zeile 702, wortgleich wiederholt Zeile 892) · Sicherheit: gemessen.
**Was stattdessen gilt:** Nicht jede Inline-Maßnahme wirkt; vor dem Umsetzen mit Vorher-Zahl planen, danach mit derselben Messung bestätigen (Grundsatz 10, SKILL.md). [laden-kritischer-pfad.md](laden-kritischer-pfad.md#6-kritisches-css-inline-den-rest-auslagern--und-den-trade-off-kennen).

### 3. „Object Pooling verbessert die WebGL-Pixelstrom-Performance“

**Herkunft:** Gemini-Vorschlag.
**Warum falsch:** Der Pixelstrom ist ein WebGL-Shader ohne Pixel-Objekte pro Frame — es gibt keine JS-Objekt-Allokation, die gepoolt werden könnte. "Garbage Collection" fällt laut der von Lighthouse und Chrome-DevTools gemeinsam genutzten Taxonomie (`task-groups.js`) zudem in eine von "Other" komplett getrennte Kategorie; Object Pooling wirkt auf GC-Pausen, nicht auf "Other".
**Beleg:** Gemessen mit `mainthread.mjs` (Desktop 4×CPU, 12 s): Garbage Collection React 2 ms / v5 0 ms (HANDOFF.md, STAND 16.9. Pixelstrom, "Einordnung der Gemini-Vorschläge", Zeilen 227-230). Taxonomie: github.com/GoogleChrome/lighthouse/blob/main/core/lib/tracehouse/task-groups.js · Sicherheit: gemessen · dokumentiert.
**Was stattdessen gilt:** Erst mit `mainthread.mjs` prüfen, in welcher Kategorie die Zeit wirklich anfällt, bevor eine generische Optimierung umgesetzt wird. [rendern-hauptthread.md](rendern-hauptthread.md#26-other-im-trace-richtig-einordnen--und-wissen-was-es-nicht-senkt).

### 4. „will-change und translateZ auf dem Canvas verbessern die Performance“

**Herkunft:** Gemini-Vorschlag (Compositing-Hack).
**Warum falsch:** Das Canvas ist bereits `fixed` positioniert und läuft als WebGL-Kontext bereits auf einer eigenen Compositor-/GPU-Ebene. `will-change`/`translateZ(0)` fallen laut derselben Taxonomie unter "Rendering" (`paintCompositeRender`), nicht unter "Other". `translateZ(0)` gilt zudem als veralteter Hack; `isolation: isolate` ist der modernere Weg für einen neuen Stacking-Context.
**Beleg:** Bewertung anhand der bestehenden Eigenschaften des Canvas (`fixed` + WebGL), HANDOFF.md, STAND 16.9. Pixelstrom, Zeilen 227-232 · Quelle: developer.chrome.com/blog/hardware-accelerated-animations · Sicherheit: dokumentiert.
**Was stattdessen gilt:** Bei einem bereits GPU-komponierten Canvas keine zusätzlichen Compositing-Hints ohne gemessenen Grund setzen. [rendern-animationen.md](rendern-animationen.md#2-will-changetransform-gezielt-einsetzen-nicht-pauschal).

### 5. „scheduler.yield reduziert die Hauptthread-Blockierung“

**Herkunft:** Gemini-Vorschlag.
**Warum falsch:** `scheduler.yield()` teilt nur eigenen JS-Code auf; die eigentliche Kostenquelle war die browserinterne `IntersectionObserver`-Berechnung, die dadurch nicht erreicht wird. Der dokumentierte Nutzen liegt zudem nicht in weniger Gesamt-CPU-Zeit, sondern darin, dass zwischen Chunks hochpriorisierte Arbeit eingeschoben werden kann (INP) — jede Fortsetzung wird als neuer Task über denselben Scheduler eingeplant, der "Other" ausmacht.
**Beleg:** `IntersectionObserver::computeIntersections` blieb mit 518 ms (React) / 577 ms (v5) der Hauptkostenblock im "Other"-Trace, unabhängig von JS-seitigen Yield-Strategien (HANDOFF.md, STAND 16.9., "Einordnung der Gemini-Vorschläge" und "Other"-Tabelle, Zeilen 218-235) · Quelle: developer.chrome.com/blog/use-scheduler-yield · Sicherheit: gemessen · dokumentiert.
**Was stattdessen gilt:** Erst die Zielzahl von Observern reduzieren (Grundsatz 7, SKILL.md), dann über Yield-Strategien nachdenken. [rendern-hauptthread.md](rendern-hauptthread.md#29-scheduleryield-und-long-animation-frames-verbessern-inp-nicht-die-hauptthread-summe).

### 6. „Nicht-immutable Cache-Header senken den Performance-Score“

**Herkunft:** Eigene Projekt-Annahme; geplant war eine `?v=`-Query-Versionierung samt `tools/bump_assets.py`, um immutable Cache-Header zu ermöglichen.
**Warum falsch:** Live gemessen blieb die Lighthouse-Desktop-Performance bei 99, obwohl `v3.css`/`common.js` revalidierende (`max-age=0, must-revalidate`) statt immutable Header trugen.
**Beleg:** "Die Sorge um den Cache-Kompromiss war unbegründet — gemessen, nicht vermutet." LCP 0,7 s, TBT 0 ms, CLS 0,002 (HANDOFF.md, Zeile 2695-2699) · Sicherheit: gemessen.
**Was stattdessen gilt:** Die geplante Versionierungslösung wurde nie gebaut — Cache-Strategie erst mit realem Live-Score prüfen, bevor zusätzliche Build-Komplexität investiert wird. [laden-auslieferung.md](laden-auslieferung.md#4-cache-header-wirkung-nur-gegen-einen-produktionsnah-konfigurierten-server-prüfen).

### 7. „Externe Platzhalter-Bilddienste sind performance-mäßig vernachlässigbar“

**Herkunft:** Annahme für Demo-/Platzhalter-Content (z. B. picsum.photos) im 360-Projekt.
**Warum falsch:** Sie waren tatsächlich der Hauptkostentreiber: 4,9 MB der gemessenen 8,9 MB Mobile-Payload stammten von picsum, plus ein zusätzlicher Drittanbieter-DNS-/Handshake auf der Landing-Page.
**Beleg:** Root-Cause-Analyse im Zuge der Next.js-Migration; nach Entfernen (Ersatz durch selbst-gehostete CC0-Bilder) stieg der Mobile-PageSpeed-Score von 56 % auf 95 % (360/.claude/docs/nextjs-migration-plan.md; 360/.claude/docs/decisions.md ADR-28) · Sicherheit: gemessen.
**Was stattdessen gilt:** Auch Platzhalter-/Demo-Bilder selbst hosten oder zumindest ihre Byte- und Verbindungskosten vorab messen. [laden-kritischer-pfad.md](laden-kritischer-pfad.md#28-externe-platzhalterbild-dienste-sind-ein-versteckter-hauptkostentreiber).

### 8. „GSAPs scrollTrigger.scroll ist der korrekte Weg zum externen Scrubben“

**Herkunft:** GSAP-Forum-Antwort, offiziell dokumentierte Methode `scrollTrigger.scroll(pos)`.
**Warum falsch:** Funktioniert nur auf einer "nackten" Seite ohne Smooth-Scroll-Wrapper. Sobald Lenis (oder ein iframe) zwischen Trigger und echtem Page-Scroller sitzt, wird das synthetische Scroll-Event lautlos verschluckt, bevor der Trigger es sieht; kommt es doch an, synct ScrollTrigger den Tween beim nächsten Refresh-Tick sofort wieder auf die echte Scroll-Position zurück — sichtbar als Loop.
**Beleg:** Zwei Live-Test-Bugs (Play-Button "tat nichts", danach schien alles zu loopen) auf diese Ursache zurückgeführt; Fix (direktes `tween.progress()`-Treiben + ScrollTrigger währenddessen deaktivieren) durch neue Tests (`getProgressCalls`/`getDisableCalls`) verifiziert (mccain-cms/CHANGELOG.md alpha.164) · Sicherheit: gemessen.
**Was stattdessen gilt:** Bei Smooth-Scroll-Wrappern `tween.progress()` direkt treiben und ScrollTrigger währenddessen deaktivieren statt `scrollTrigger.scroll()` zu nutzen. [rendern-animationen.md](rendern-animationen.md#animationen).

### 9. „Ein automatisches Reduced-Motion-System schützt ohne Kosten“

**Herkunft:** Eigenes Systemdesign (mccain-cms): "nicht-essenzielle" Transform-Properties (scale/rotate/translate) unter einer Default-Stufe "minimal" automatisch herausfiltern.
**Warum falsch:** Filterte lautlos jede transformbasierte Animation site-weit im Default-Zustand heraus; Autoren bauten Scale-Up-Hover- und Bounce-Effekte, die im Preview nie sichtbar feuerten, ohne Anzeige, was gerade unterdrückt wird.
**Beleg:** Als "bevormundend" eingestuft und komplett entfernt statt repariert: 33 zugehörige Tests entfernt, das komplette Subsystem (`reduced-motion.ts`, `reduced-motion-resolver.ts`, `mobile-policy.ts` + UI) gestrichen (mccain-cms/CHANGELOG.md, "B7/B8 — Reduced-motion system removed wholesale") · Sicherheit: dokumentiert.
**Was stattdessen gilt:** `prefers-reduced-motion` respektieren, aber sichtbar und pro Animation explizit, nicht als stille globale Default-Filterung. [rendern-animationen.md](rendern-animationen.md#5-prefers-reduced-motion-muss-auch-js-getriebene-kosten-abschalten-und-live-reagieren).

### 10. „Ein verifiziert ungeladener Code-Split-Chunk ist auf der Homepage risikofrei“

**Herkunft:** Eigene Abwägung zu einem klick-gesplitteten WebGL/Three.js-Chunk.
**Warum falsch:** Obwohl im Build-Output verifiziert war, dass der 645-KB-Three.js-Chunk beim initialen Laden 0× auftaucht, entschied der Owner trotzdem gegen den Einsatz auf der wichtigsten Konversions-Seite — selbst ein click-gated WebGL-Pfad wurde als unnötiges Risiko eingestuft.
**Beleg:** internal/3d-preview/README.md dokumentiert die Entscheidung explizit; .recall/HANDOFF.md bestätigt die Verifikation des 0×-Ladeverhaltens VOR der Entscheidung, es trotzdem nicht auf der Homepage einzusetzen (whatever-recall-internal, 2026-06-18/21) · Sicherheit: dokumentiert.
**Was stattdessen gilt:** Auf einer performance-kritischen Konversions-Seite zählt nicht nur der gemessene Ladeeffekt, sondern auch das Risiko-Budget des Owners — ein vorgerechnetes Standbild statt jeder WebGL-Option. [rendern-canvas-webgl.md](rendern-canvas-webgl.md#24-für-die-konversionskritischste-seite-ein-standbild-statt-live-webgl-erwägen).

### 11. „Lokal gemessene sehr niedrige Scores spiegeln die Live-Performance“

**Herkunft:** Eigene Projekt-Annahme; ein lokal gemessener Wert "mobil 41" wurde als reale Performance interpretiert.
**Warum falsch:** Messfehler: `prodserve.py` komprimierte Verzeichnis-Routen (`/`) nicht. Vercel komprimiert in Produktion tatsächlich — die Live-Seite war nie so langsam wie lokal gemessen.
**Beleg:** Score `/` vs. `/index.html`: 45 vs. 63, FCP 5.171 vs. 1.272 ms, Bytegrößen 907 KB vs. 134 KB (HANDOFF.md, "⚠ ZUERST: mobil 41 war eine Fehlmessung", Zeilen 908-922) · Sicherheit: gemessen.
**Was stattdessen gilt:** Jede Zahl des Projekts vor dem 12.9. abends gilt als zu pessimistisch. Immer mit echten Produktions-Headern messen (Grundsatz 8, SKILL.md). [messen.md](messen.md).

### 12. „Die Schriftart wird in Produktion zweimal heruntergeladen“

**Herkunft:** Eigene Projekt-Annahme, "94KB Mehrkosten" durch doppelten Font-Download.
**Warum falsch:** Artefakt der lokalen Dev-Umgebung: `prodserve --dev` sendet `Cache-Control: no-store`. Gegen echte Produktion ist der zweite Font-Fetch `transferSize` 0 in 1 ms, weil `vercel.json` `woff2` als `immutable` cached.
**Beleg:** Commit 25304a7 (2026-09-02): "the font downloaded twice, 94KB is an artefact of prodserve --dev sending no-store." · Sicherheit: gemessen.
**Was stattdessen gilt:** Kein Messen gegen einen `no-store`-Dev-Server (SKILL.md, "Was NICHT tun"). [messen.md](messen.md).

### 13. „Das LCP-Element ist automatisch ein wirksamer Hebel für LCP“

**Herkunft:** Eigene Projekt-Annahme zum Namens-Laufband im Hero, identifiziert als LCP-Element.
**Warum falsch:** Gemessen mit und ohne Laufband: LCP 3.659 ms vs. 3.553 ms — nur 106 ms Unterschied. Es ist das LCP-Element, aber nicht die LCP-Ursache.
**Beleg:** 3.659 vs. 3.553 ms Messvergleich (HANDOFF.md, Zeilen 893-894, 1049-1053) · Sicherheit: gemessen.
**Was stattdessen gilt:** Das LCP-Element zeigt nur WAS am längsten braucht, nicht WARUM. Es blieb unverändert, weil sein Inhalt dem Owner wichtig ist und die Zeit anderswo herkommt. [lighthouse-psi.md](lighthouse-psi.md#8-prüfe-den-eigenanteil-des-benannten-lcp-elements-bevor-du-es-änderst).

### 14. „Die eigene '4×100 Lighthouse'-Aussage stimmt für den aktuellen Build“

**Herkunft:** Auf der Startseite selbst behauptete Aussage aus einem früheren Build (v3).
**Warum falsch:** Gemessen liegt die Startseite bei Performance 68, gebunden an 1.493 ms Skriptauswertung für ~2.140 React-Elemente plus 364 ms Layout. Die Zahl 100 stammt vom v3-Build und ist für den aktuellen Build nicht belegt.
**Beleg:** Tabelle: Startseite Perf 68 (FCP 349 ms, LCP 1398 ms, TBT 663 ms) gegen vier Unterseiten bei Perf 100 (FCP 200-400 ms, LCP 300-700 ms, TBT 0 ms) (HANDOFF.md, Zeile ~1244-1251, Owner-Entscheidung Punkt 3, Zeile ~1428-1433) · Sicherheit: gemessen.
**Was stattdessen gilt:** Eine im Markup behauptete Kennzahl verfällt mit jedem Rebuild; nur die zuletzt gemessene Zahl zählt. [messen.md](messen.md).

### 15. „hydrateRoot statt createRoot behebt die Hydration-Lücke automatisch“

**Herkunft:** Eigene Annahme: die Bibliothek/Methode (`hydrateRoot` vs. `createRoot`) sei das Problem des Design-Exports.
**Warum falsch:** Der Umbau auf `hydrateRoot` gegen den per Headless-Chrome abgezogenen DOM führte zu React-Fehlern #418/#425/#423, vollständigem Rückfall auf Client-Rendering, 32 Konsolenfehlern und keinem Punktegewinn. Ursache: 1.193 von ~3.000 Knotenpositionen weichen zwischen Reacts erstem Rendering und dem abgezogenen DOM ab. Die Bibliothek selbst kostet laut Zerlegung nur 1 Punkt — die 21 Verlustpunkte kommen ausschließlich vom fehlgeschlagenen Hydration-Rückfall.
**Beleg:** Zerlegung mobil: nur HTML+CSS 92 · React geladen/geparst, bootet nie 91 · nur React 72 · wie ausgeliefert 70 (HANDOFF.md, "A5 — hydrateRoot: gebaut, gemessen, zurückgenommen", Zeilen 952-962, 889-891) · Sicherheit: gemessen.
**Was stattdessen gilt:** Erst rendern, dann hydrieren (echtes SSR über `react-dom/server`), nicht gegen einen nachträglich gesetzten DOM-Snapshot. [react-nextjs.md](react-nextjs.md).

### 16. „hydrateRoot läuft erfolgreich gegen einen nachträglich gesetzten DOM-Snapshot“

**Herkunft:** Übernommenes altes Build-Verfahren vom 12.9. (Abzug nach Sekunden Laufzeit statt echtem SSR).
**Warum falsch:** Zweimal gemessen, zweimal gescheitert: der gesetzte Abzug erzeugte beim Ausreißer-Artboard 32 Hydrationsfehler, während echtes SSR (`react-dom/server`, dann `hydrateRoot`) beim selben Artboard nur 19 und bei 20 von 21 Artboards 0 Fehler erzeugte.
**Beleg:** "Artboards ohne einen einzigen Hydrationsfehler 20 von 21 / Ausreißer Brand Guide v2 19 / derselbe Versuch gegen den gesetzten Abzug (12.9.) 32" (HANDOFF.md, "WAS AM 13.9. GEBAUT WURDE", Zeile 609-619, "WAS ALS NAECHSTES DRAN IST", Zeile 700-701) · Sicherheit: gemessen.
**Was stattdessen gilt:** Siehe Punkt 15 — echtes SSR vor `hydrateRoot`, kein nachträglicher DOM-Abzug. [react-nextjs.md](react-nextjs.md).

### 17. „Opacity entkoppeln verbessert die LCP-Zeit der H1“

**Herkunft:** Audit-Vorschlag (generisches Tool/Checkliste).
**Warum falsch:** `.w` hat `overflow: clip`; das eigentliche Nadelöhr ist der `transform`, nicht die Opacity. Der Kopf läuft laut Kommentar zudem absichtlich "inside the 800-1600ms band" — Design-Auftritt, kein Defekt.
**Beleg:** LCP gemessen bei 824/836 ms; `.w` mit `overflow: clip`; Transform als tatsächliches Gate identifiziert (HANDOFF.md, "AP-1 (LCP)", Zeile ~1933-1936) · Sicherheit: gemessen.
**Was stattdessen gilt:** Vor einem Audit-Vorschlag das tatsächlich blockierende CSS-Property identifizieren (hier: `transform`, nicht `opacity`). [rendern-animationen.md](rendern-animationen.md#15-den-wahren-verursacher-isoliert-messen-statt-der-naheliegenden-komponente-die-schuld-zu-geben).

### 18. „support.js deferren und React vorladen verbessert den Score“

**Herkunft:** Eigene Optimierungsidee zur Startseite (Score 68).
**Warum falsch:** Über drei Läufe blieb der Score praktisch unverändert (68/69/69) — der Flaschenhals ist die Skriptauswertungszeit der React-Hydration selbst, keine Lade-/Prioritätsfrage von `support.js` oder React.
**Beleg:** "68/69/69 über je drei Läufe" bei `support.js` deferred + React vorgeladen, kein messbarer Unterschied zur Baseline 68 (HANDOFF.md, Zeile ~1247-1249) · Sicherheit: gemessen.
**Was stattdessen gilt:** Bei hoher Skriptauswertungszeit hilft Umpriorisieren des Ladens nicht — die Auswertung selbst muss kleiner werden. [react-nextjs.md](react-nextjs.md).

### 19. „React vorzuladen kann dem FCP nur helfen, nie schaden“

**Herkunft:** Eigene Annahme vor dem Test von `<link rel=preload>` für React.
**Warum falsch:** Der React-Preload verschlechterte FCP messbar, weil er dem für FCP kritischen Pfad Bandbreite/Priorität wegnahm.
**Beleg:** FCP 349 ms ohne Preload vs. 485 ms mit React-Preload (HANDOFF.md, Zeile ~1248-1251) · Sicherheit: gemessen.
**Was stattdessen gilt:** Preload konkurriert um Bandbreite/Priorität mit dem tatsächlich kritischen Pfad — vor jedem Preload messen. [laden-javascript.md](laden-javascript.md#15-resource-hints-preconnectdns-prefetchearly-hints-nur-für-wirklich-bald-gebrauchte-origins).

### 20. „Der WebGL-Pixelstrom ist Hauptursache der hohen TBT“

**Herkunft:** Eigene Verdächtigung auf der Startseite (hohe TBT/Hauptthread-Zeit).
**Warum falsch:** Vier identische Lighthouse-Läufe, die sich nur durch ein eingeschobenes Stylesheet unterschieden, zeigten: "Datenstrom aus" änderte den Score nur 63→64, TBT 1.026→1.010 ms, Hauptthread 8.497→8.485 ms. Die tatsächliche Ursache waren 146 unendliche CSS-Animationen in einem 34×34-px-Logo-SVG.
**Beleg:** Vier-Varianten-Vergleichstabelle: unverändert 63/1.026 ms/8.497 ms; Datenstrom aus 64/1.010 ms/8.485 ms; Logo-Animation aus 68/778 ms/4.971 ms (HANDOFF.md, "✔ A — Performance: erledigt, und der Verdächtige war der falsche", Zeilen 924-937) · Sicherheit: gemessen.
**Was stattdessen gilt:** Verdächtige einzeln per A/B-Toggle isolieren statt den auffälligsten Codeblock zu vermuten. [rendern-animationen.md](rendern-animationen.md#15-den-wahren-verursacher-isoliert-messen-statt-der-naheliegenden-komponente-die-schuld-zu-geben).

### 21. „PSI-Desktop TBT 13.060 ms zeigt einen realen Performance-Bug“

**Herkunft:** Eigene Interpretation eines Googles PageSpeed-Desktop-Laufs (TBT 13.060 ms, "Other" 30.533 ms).
**Warum falsch:** Nicht reproduzierbar: lokal misst Desktop 96, und in einer eigenen Aufzeichnung des Owners ist derselbe Rechner auf derselben Live-Seite 68 % im Leerlauf. Plausibelste Erklärung: CPU-Throttling der PSI-Testmaschine verstärkt kleine CPU-Anteile massiv.
**Beleg:** "lokal misst Desktop 96, und in der eigenen Aufzeichnung des Owners ist derselbe Rechner auf derselben Live-Seite 68 % im Leerlauf (gesamtes Seiten-Skript unter 300 ms, movePointsGlobal 1,1 %, Pixel-Engine 2,7 %)." (HANDOFF.md, "STAND 13.9. NACHTS", Zeile 524-534) · Sicherheit: gemessen.
**Was stattdessen gilt:** Ein einzelner PSI-Wert ohne lokale Reproduktion ist kein Bug-Beweis — auf einer langsamen Testmaschine wirken 5 % CPU wie 30-50 % auf einem alten Notebook. [lighthouse-psi.md](lighthouse-psi.md#23-zieh-bei-einem-ausreißer-den-json-report-bevor-du-debuggst).

### 22. „Die V8-Coverage-Regel 'count größer 0' liefert einen korrekten Tot-Code-Anteil“

**Herkunft:** Eigene naive Auswertungsregel für V8-Coverage-Daten.
**Warum falsch:** V8-Coverage-Bereiche sind verschachtelt, äußerster zuerst; die naive Regel meldet dadurch 0 % tot für JEDE Datei.
**Beleg:** "V8-Abdeckung: Bereiche sind verschachtelt, äußerster zuerst. 'count>0 = benutzt' meldet 0 % tot für jede Datei." (HANDOFF.md, "STAND 13.9. 03:30", Zeile 408-409) · Sicherheit: gemessen.
**Was stattdessen gilt:** V8-Coverage-Ranges verschachtelt auswerten (innerste Range gewinnt), nicht naiv auf `count > 0` prüfen. [messen.md](messen.md).

### 23. „naturalWidth und naturalHeight entsprechen rohen Bitmap-Pixel-Maßen“

**Herkunft:** Eigene Annahme beim Einsatz von `drawImage` mit `srcset`-Bildern.
**Warum falsch:** `naturalWidth`/`naturalHeight` melden die dichte-korrigierte Größe in CSS-Pixeln, `drawImage` erwartet sein Quellrechteck aber in rohen Bitmap-Pixeln. Je nach gewählter `srcset`-Variante/DPR führte das zu einem falschen Bildausschnitt — im Extremfall war nur ein Viertel des Bildes sichtbar.
**Beleg:** "code-screen-640.webp ist 640×440 auf der Platte und meldet 559×384 — der Ausschnitt griff also die linken oberen 87 % ... auf einer Anzeige, die per DPR die 1200w-Variante mit Dichte 2,14 wählt, griff er ein Viertel." (HANDOFF.md, Zeile 2883-2894) · Sicherheit: gemessen.
**Was stattdessen gilt:** Für `drawImage`-Quellrechtecke die tatsächliche Bitmap-Auflösung verwenden, nicht `naturalWidth`/`naturalHeight` blind übernehmen. [rendern-canvas-webgl.md](rendern-canvas-webgl.md#17-naturalwidth-und-naturalheight-sind-dichte-korrigierte-css-pixel-keine-bitmap-pixel).

### 24. „CSS-Opacity-Crossfade zweier deckender Ebenen blendet gleichmäßig“

**Herkunft:** Eigene Annahme beim Übergang zwischen scharfem Foto und Mosaik-Ansicht.
**Warum falsch:** Zwei deckende Ebenen, die per Opacity gegeneinander überblendet werden, ergeben rechnerisch `a + b(1-a)` — in der Mitte der Blende nur ca. 75 % Gesamtdeckkraft statt 100 %, was auf dunklen Karten als sichtbarer dunkler Helligkeits-Puls auffiel.
**Beleg:** "CSS-Deckkraft geht dafür nicht: zwei deckende Ebenen, die aneinander vorbeiblenden, ergeben a + b(1-a), in der Mitte ~75 % — auf den dunklen Karten ein sichtbarer dunkler Puls." (HANDOFF.md, Zeile 2900-2908) · Sicherheit: gemessen · dokumentiert (Opazitäts-Formel).
**Was stattdessen gilt:** Für einen echten Crossfade zwischen zwei vollständig deckenden Ebenen eine dritte, tatsächlich animierte Deckkraftquelle nutzen (z. B. Canvas-Compositing) statt zweier gegenläufiger CSS-`opacity`-Werte. [rendern-canvas-webgl.md](rendern-canvas-webgl.md#19-beim-schichten-von-canvas-ebenen-auf-korrektes-alpha-compositing-achten).

### 25. „Eine isolierte Lab-Messung beschreibt die reale Seiten-Kostenlast“

**Herkunft:** Eigene Messung der Einstellung cell/block 1.1/1.0 per Hover-Sweep auf einer isolierten Lab-Seite ("kostet nichts Messbares", p90 16,7 ms).
**Warum falsch:** Diese Schlussfolgerung kam von einem Hover-Sweep auf einer isolierten Lab-Seite, nicht von einem Scroll der echten Homepage — der Interaktion, die der Owner tatsächlich spürte.
**Beleg:** Echte Seite per Scroll: 50,0 ms Median, 65 % Frames >20 ms, 9 Long Tasks/530 ms; korrigierte Einstellung (3.0/2.0): 16,7 ms Median, 0 % >20 ms, 0 Long Tasks (Commits 4b3e71d und 465f8f9, 2026-08-31; HANDOFF.md, Zeile 3101-3125) · Sicherheit: gemessen.
**Was stattdessen gilt:** Immer gegen die tatsächliche Interaktion auf der echten Seite messen, nie ausschließlich auf einer isolierten Testseite. [messen.md](messen.md).

### 26. „Neu bauen ist schneller als vorhandene Engine-Mechanik wiederverwenden“

**Herkunft:** Eigene Einschätzung während der Arbeit an der "schwarzes Loch"-Hover-Mechanik.
**Warum falsch:** Die Engine hatte die exakte Mechanik bereits (von `pixelImage` für Fotos genutzt); die Neuerfindung geschah laut Handover zweimal und kostete die meiste Zeit der Session, bevor sie durch Wiederverwendung der bestehenden Repulsions-Mechanik ersetzt wurde.
**Beleg:** Im Projekt-Handover als teuerste Lehre der Session festgehalten; endgültige Lösung in Commit c461b51 ersetzt den Eigenbau durch die geteilte Mechanik (Commit b0b2ab0, 2026-09-01) · Sicherheit: dokumentiert.
**Was stattdessen gilt:** Vor einer Neuimplementierung die vorhandene Engine nach einer ähnlichen Mechanik durchsuchen — allgemeine Lehre, aber teuer genug, um sie hier festzuhalten.

### 27. „Ein externes Referenz-Rezept lässt sich direkt übernehmen“

**Herkunft:** MengTo/Skills-Rezept "dither-background" (Referenz-Canvas-Implementierung für eine Dither-Wolke); eigene ursprüngliche Vermutung, die ~26.000 `fillRect`-Aufrufe pro Frame (3-px-Zellen) seien der Flaschenhals.
**Warum falsch:** Die Referenz ruft `fillRect` PRO ZELLE PRO FRAME auf (bei 3-px-Zelle ca. 26.000 Zeichenaufrufe pro Frame) und berechnet zusätzlich vier Rausch-Oktaven (16 Sinus-Berechnungen, ca. 2 Millionen Sinus-Aufrufe pro Frame) PRO ZELLE JEDEN FRAME neu. Nicht das Zeichnen war die teure Hälfte, sondern das ständige Neuberechnen des Rauschens.
**Beleg:** Mit drei Feldern in der ursprünglichen Form: 68 Long Tasks, 4 s blockierter Hauptthread, 27,5 % der Frames über 20 ms. Nach Umbau — Rauschfeld als Ring aus vorausberechneten Spalten scrollen (eine neue Spalte pro Takt): 0 Long Tasks, 0 % der Frames über 20 ms, p90 16,7 ms (Commit d73393b, 2026-09-01; HANDOFF.md, "MengTo/Skills — was davon brauchbar ist", ca. Zeile 2540-2547) · Sicherheit: gemessen.
**Was stattdessen gilt:** Externe Canvas-Rezepte vor der Übernahme auf Pro-Frame-Neuberechnung prüfen; teure prozedurale Berechnungen vorab cachen statt pro Frame neu auszuwerten. [rendern-canvas-webgl.md](rendern-canvas-webgl.md#10-teure-bildabtastung-einmal-pro-größe-cachen-im-loop-nur-lookup-und-lerp).

### 28. „Ein Attribut-Reihenfolge-Test erkennt zuverlässig alle Overlays“

**Herkunft:** Eigener Test, der nur die Attribute VOR dem gesuchten (`data-screen-label`) liest.
**Warum falsch:** Vier von fünf Overlays schreiben `style` NACH `data-screen-label`; alle vier wurden fälschlich markiert — Modal und Menü wären dadurch lautlos eingesperrt gewesen.
**Beleg:** "Vier von fünf Overlays schreiben style nach data-screen-label; alle vier waren markiert und Modal wie Menü wären eingesperrt gewesen, lautlos." (HANDOFF.md, "STAND 13.9. 03:30", Zeile 412-414) · Sicherheit: gemessen.
**Was stattdessen gilt:** Attribut-Reihenfolge im DOM ist keine verlässliche Erkennungsgrundlage; auf tatsächliche Werte/Zustände prüfen, nicht auf Reihenfolge im Markup.

### 29. „Ein einmal eingebauter Sicherheits-Guard bleibt dauerhaft gültig“

**Herkunft:** Eigene Guard-Logik: "Wenn jede Zelle einer Zeile die Akzent-Regel matcht, muss die Erkennungsregel kaputt sein — Welle automatisch abschalten."
**Warum falsch:** Korrekt für zwei frühere Bugs, aber es gab einen legitimen Fall (eine Hero-Zeile, die tatsächlich komplett akzentfarben ist), in dem der Guard eine korrekt laufende Animation still abschaltete. Nach einem späteren Fix wurde die Bedingung "alle Zellen sind Akzent" zu einem normalen, gültigen Fall.
**Beleg:** "Twice in this session I measured 60fps on an animation that was not running", weil der Guard sie abgeschaltet hatte (Commit 465f8f9, 2026-08-31; HANDOFF.md, Zeile 3264-3271) · Sicherheit: gemessen.
**Was stattdessen gilt:** Sicherheits-Guards nach jeder Logikänderung erneut gegen alle inzwischen legitimen Zustände prüfen. Eine FPS-Messung allein beweist nicht, dass die gemessene Animation auch läuft — mit `animations.mjs` den tatsächlichen Animationszustand mitprüfen.

### 30. „1.000 DOM-Änderungen pro Sekunde sind ein relevantes Problem“

**Herkunft:** Eigene Einschätzung anhand der reinen Änderungsrate.
**Warum falsch:** Real, aber mit nur 63 ms kumulierter Kostenzeit in 5,7 s Messfenster vernachlässigbar.
**Beleg:** "Die 1.000 DOM-Änderungen/s: real, aber 63 ms in 5,7 s." (HANDOFF.md, "STAND 13.9. NACHTS", Zeile 560) · Sicherheit: gemessen.
**Was stattdessen gilt:** Eine hohe Ereignisrate ist erst dann relevant, wenn ihre kumulierte Kostenzeit gemessen groß ist. [messen.md](messen.md).

### 31. „460 KB rohe Marken-Bytes sind ein relevantes Transfer-Problem“

**Herkunft:** Eigene Einschätzung zu den Bytes auf `/marke/` (460 KB roh, 913 von 3.161 DOM-Knoten).
**Warum falsch:** Nach gzip nur 13.938 B — der Byteeffekt ist praktisch null; problematisch ist ausschließlich die Knotenzahl, nicht das Transfervolumen.
**Beleg:** "Die Marken-Bytes auf /marke/: 460 KB roh, 13.938 B gzip." / "Nach gzip nur 13.938 B – Knoteneffekt ja, Byteeffekt nein." (HANDOFF.md, "STAND 13.9. 03:30", Zeile 548-550, "STAND 13.9. NACHTS", Zeile 561) · Sicherheit: gemessen.
**Was stattdessen gilt:** Rohbytes vor der gzip-Messung sagen wenig über realen Transfer aus; immer die komprimierte Größe prüfen. [messen.md](messen.md).

### 32. „Der Vorlagen-Umweg Parse-Serialisieren-Parse ist teuer“

**Herkunft:** Eigene Vermutung zum Build-Prozess.
**Warum falsch:** Gemessen: nur 15,3 ms — vernachlässigbar.
**Beleg:** "Vorlagen-Umweg parse/serialisieren/parse: 15,3 ms." (unter "Gemessen und als Verdächtige ausgeschieden", HANDOFF.md, "STAND 13.9. NACHTS", Zeile 557) · Sicherheit: gemessen.
**Was stattdessen gilt:** Auch Build-Pipeline-Schritte vor dem Optimieren messen statt nach Bauchgefühl priorisieren. [laden-auslieferung.md](laden-auslieferung.md#11-gewichtsanteil-je-datei-einzeln-nachmessen-statt-zu-vermuten).

### 33. „ResizeObserver auf body ist Hauptverdächtiger für Dauerlast“

**Herkunft:** Eigene Vermutung zur kontinuierlichen Hauptthread-Dauerlast.
**Warum falsch:** Direkt gemessen: der Observer feuert nur 4× in 22 Sekunden — unschuldig.
**Beleg:** "gemessen: 4 Aufrufe in 22 s, unschuldig" (HANDOFF.md, "STAND 13.9. 03:30" und "STAND 13.9. 03:00", wortgleich wiederholt) · Sicherheit: gemessen.
**Was stattdessen gilt:** Verdächtige Observer mit `observers.mjs` direkt zählen statt nach Plausibilität zu vermuten. [rendern-hauptthread.md](rendern-hauptthread.md#19-resizeobserver-auf-einem-element-mit-height100-feuert-praktisch-nie).

### 34. „60 getBoundingClientRect-Aufrufe pro Sekunde stammen vom Notes-Overlay“

**Herkunft:** Eigene Vermutung zur Quelle der gemessenen Layout-Lesungen.
**Warum falsch:** Per Profiling exakt zugeordnet: Ursache ist die Pixel-Engine — `movePoints` liest jeden Frame `canvas.getBoundingClientRect()`.
**Beleg:** "Die 60 getBoundingClientRect/s sind die Pixel-Engine (movePoints liest jeden Frame canvas.getBoundingClientRect()), nicht die Notizen." (HANDOFF.md, "STAND 13.9. 03:30", Zeile 415-416) · Sicherheit: gemessen.
**Was stattdessen gilt:** Layout-Lesungen per Profiling der tatsächlichen Aufrufstelle zuordnen, nicht der naheliegendsten Komponente zuschreiben. [rendern-canvas-webgl.md](rendern-canvas-webgl.md#12-vor-der-naheliegenden-zeichenoperation-die-tatsächliche-ursache-profilen).

### 35. „Eine Ressource wird laut Lighthouse-Tabelle sechsmal aufgerufen“

**Herkunft:** Eigene Lesart von Lighthouses Tabelle der langen Aufgaben.
**Warum falsch:** Verifiziert: nur 1 Dokument-Anfrage. Die Spalte in Lighthouses Tabelle der langen Aufgaben zeigt das zugeordnete Skript (attributed script), nicht die Zahl der Netzwerk-Requests.
**Beleg:** "'Die URL wird 6x aufgerufen': nein, 1 Dokument-Anfrage. Die Spalte in Lighthouses Tabelle der langen Aufgaben ist das zugeordnete Skript." (HANDOFF.md, "STAND 13.9. NACHTS", Zeile 562-563) · Sicherheit: gemessen.
**Was stattdessen gilt:** Lighthouses Long-Tasks-Tabelle zeigt Skript-Attribution, keine Request-Zahl — bei Zweifel gegen `requests.mjs` gegenprüfen. [lighthouse-psi.md](lighthouse-psi.md#die-17-performance-insights-lighthouse-13).

### 36. „Pixel-gerasterter Headline-Text ist im Hellmodus strukturell unlesbar“

**Herkunft:** Eigene Theorie: ein Mosaik tinte rund 44 % seiner Fläche ein und mittele auf Papier zu Grau — strukturelle Eigenschaft der Mosaik-Technik.
**Warum falsch:** Die tatsächliche Ursache war ein Theme-Übergangs-Timing-Bug: Die erste Headline baute mitten im Theme-Wechsel (0,5-s-Übergangsanimation) und übernahm per `getComputedStyle` dauerhaft das Weiß des dunklen Themes (Kontrast 1,03:1) — keine strukturelle Eigenschaft der Mosaik-Technik selbst.
**Beleg:** Nach Behebung des Theme-Timings (gespeichertes Theme inline im `<head>` vor dem Stylesheet anwenden, Commit a06f8e3) stieg der schlechteste Kontrast von 1,03:1 auf 3,42–4,21:1 (Commit 7e9b70d, 2026-09-01; HANDOFF.md, Zeile 3314-3320) · Sicherheit: gemessen.
**Was stattdessen gilt:** Theme-Zustand inline im `<head>` setzen, bevor irgendein Stylesheet oder Skript den ersten Frame rendert. "Das war eine Theorie über einen Effekt, dessen echte Ursache ich nicht gemessen hatte." [laden-kritischer-pfad.md](laden-kritischer-pfad.md#9-ein-persistiertes-theme-flag-gehört-synchron-inline-in-den-head-vor-dem-ersten-stylesheet).

### 37. „Pixel-Dichte erhöhen heißt, die Blöcke größer zu machen“

**Herkunft:** Eigene Umsetzung (Commit a4aee9f).
**Warum falsch:** Bei Blockgröße ≥ Grid schließen sich die Lücken zwischen den Blöcken, und der Effekt liest sich gar nicht mehr als Pixel; außerdem war nur der Ruhezustand gesnappt, sodass Blöcke sich sichtbar änderten, sobald die interaktive Physik übernahm.
**Beleg:** Versuch a4aee9f wurde in a607b64 zurückgerollt — "increase pixel density" bedeutet mehr, kleinere Pixel, nicht weniger, größere (Commit a4aee9f, 2026-08-31) · Sicherheit: gemessen.
**Was stattdessen gilt:** Pixel-Dichte erhöhen = Zellgröße verkleinern; Snapping muss auch für interaktive/physikbewegte Zustände gelten, nicht nur den Ruhezustand. [rendern-canvas-webgl.md](rendern-canvas-webgl.md#8-ein-gerastertes-mosaik-ist-ein-kleines-canvas-hochskaliert).

### 38. „Blasse Pixel-Headline-Farben zeigen zu geringe Grid-Dichte“

**Herkunft:** Eigene Theorie zur Ursache blasser/ausgewaschener Farben.
**Warum falsch:** Die Messung zeigte, dass die tatsächliche Ursache Antialiasing durch fraktionale Device-Pixel-Koordinaten war, nicht die Grobheit des Grids; Snappen auf ganze Device-Pixel behob die Blässe unabhängig von der Dichte.
**Beleg:** "The washed-out look was antialiasing, not the grid."; mittlerer Alpha 140/255 → 255/255 nach dem Snapping (Commit aca605c, 2026-08-31) · Sicherheit: gemessen.
**Was stattdessen gilt:** Bei blassen Canvas-Farben zuerst auf fraktionale vs. ganzzahlige Device-Pixel-Koordinaten prüfen, bevor die Grid-Auflösung erhöht wird. [rendern-canvas-webgl.md](rendern-canvas-webgl.md#6-canvas-rasterzellen-auf-ganze-gerätepixel-klemmen).

### 39. „Pixel-Headlines lesen sich kürzer und dünner wegen eines Box-Bugs“

**Herkunft:** Eigene Theorie: Schriftgrößen- oder Box-Geometrie-Fehler.
**Warum falsch:** Die gemessene Geometrie war bereits exakt (Ink-Box 336 px vs. 337 px Text-Box, gleiche Schriftgröße, Webfont geladen); die tatsächliche Ursache war, dass `sampleField` antialiaste Glyphenkanten-Pixel per Einzelpunkt-Sampling pro Zelle verwarf.
**Beleg:** Ink-Box 336 px gegen Text-Box 337 px gemessen gleich; behoben durch flächengemitteltes Downscale-Sampling mit Schwellenwert 120→70 (Commit a4aee9f, 2026-08-31) · Sicherheit: gemessen.
**Was stattdessen gilt:** Bei Canvas-Textsampling flächengemitteltes Downscale-Sampling statt Einzelpunkt-Sampling pro Zelle verwenden. [rendern-canvas-webgl.md](rendern-canvas-webgl.md#9-beim-verkleinern-auf-ein-grobes-zellraster-flächenmittelnd-downscalen).

### 40. „Der generierte hue-Farbverlauf bleibt im warmen Bereich“

**Herkunft:** Eigene Beschriftung/Annahme zum berechneten Farbbogen der Pixelwelle.
**Warum falsch:** Der tatsächlich berechnete Bogen erreichte bei ±55° bereits Grün und Rot, entgegen der eigenen Beschriftung "bleibt im warmen Bereich" — sichtbar gemacht durch den tatsächlich gemalten Paletten-Streifen in `wave-lab.html`.
**Beleg:** "Er hat auch sofort gezeigt, dass mein 'hue'-Bogen mit ±55° Grün und Rot erreicht, während die Beschriftung 'bleibt im warmen Bereich' behauptete. Jetzt ±32°." (HANDOFF.md, Zeile 3242-3244) · Sicherheit: gemessen.
**Was stattdessen gilt:** Farbbereiche visuell verifizieren (Paletten-Streifen rendern), nicht nur den Zahlenbereich der Formel durchrechnen. Bogen auf ±32° korrigiert.

### 41. „Nahtlosigkeit lässt sich per Pause und animation-delay verifizieren“

**Herkunft:** Eigener Test-Ansatz zur Verifikation einer CSS-Gradient-Animation.
**Warum falsch:** `animation-delay` kann eine bereits pausierte Animation nicht mehr verschieben, daher waren beide Vergleichs-Screenshots immer identisch, unabhängig von der tatsächlichen Korrektheit — der Test erklärte einen bekannt fehlerhaften Build fälschlich für nahtlos.
**Beleg:** Fehlerhafter Test: mittlere Kanal-Differenz 98,5 (schlechtester Wert 220) bei einem als "nahtlos" gemeldeten Build. Nach Umstellung auf direktes Setzen des Transforms als echte Messmethode: 0,2 (schlechtester Wert 1) am tatsächlich reparierten Build (Commit a2035d0, 2026-09-01) · Sicherheit: gemessen.
**Was stattdessen gilt:** Für Animationsphasen-Vergleiche den Transform/Zustand direkt setzen statt über `animation-delay` an einer pausierten Animation zu drehen. [rendern-animationen.md](rendern-animationen.md#6-werte-aus-laufenden-animationen-sind-beim-messen-unsicher).

### 42. „Die Startseite ruft PixelFX.headline zuletzt auf“

**Herkunft:** Eigene HANDOFF-Notiz zur Aufräumreihenfolge.
**Warum falsch:** `common.js:398` mappt jedes `[data-pixel]`-Element auf `headline`; `contact.html` und `404.html` trugen zu diesem Zeitpunkt zusammen noch fünf davon. `voidReveal` dagegen hatte tatsächlich schon gar keinen Aufrufer mehr.
**Beleg:** Commit 1a36a82 (2026-09-02), Korrektur direkt im Commit dokumentiert · Sicherheit: dokumentiert.
**Was stattdessen gilt:** Vor dem Entfernen einer vermeintlich toten Funktion alle Aufrufer über alle Seiten hinweg prüfen, nicht nur die zuletzt bearbeiteten.

### 43. „Ein gezählter Patch ist nötig für support.js-Window-Handles“

**Herkunft:** Eigene frühere Planungsnotiz zu Schritt 1 eines Plans.
**Warum falsch:** `support.js` legt bereits die Handles `getDC()`, `__dcRegistry`, `__dcTemplateSource`, `__dcAnnotatedTemplate`, `__dcRootName`, `DCLogic` auf `window` ab — der angenommene Patch war nie nötig.
**Beleg:** "support.js legt sehr wohl Griffe auf window: getDC(), __dcRegistry, __dcTemplateSource, __dcAnnotatedTemplate, __dcRootName, DCLogic. Der 'gezählte Patch', den der Plan für Schritt 1 vorsah, war nie nötig." (HANDOFF.md, "WAS AM 13.9. GEBAUT WURDE", Zeile 669-673) · Sicherheit: dokumentiert.
**Was stattdessen gilt:** Vor dem Planen eines Patches den Ist-Zustand des Zielskripts direkt prüfen, nicht aus einem älteren Plan übernehmen.

### 44. „Eine hohe aggregierte Script-Zeit im Trace zeigt den Flaschenhals“

**Herkunft:** Eigene Trace-Auswertung während der Pixelstrom-Optimierungsrunde ("half the Other").
**Warum falsch:** Die Trace-Summary zeigte "Style & Layout 1.389 ms" neben "Script 1.076 ms" und legte damit Script als Hauptverdächtigen nahe. Die Zerlegung derselben Messung in 250-ms-Fenster zeigte, dass Script Evaluation im tatsächlich voll ausgelasteten Fenster (1,0-1,9 s) nur 1 ms betrug — die reale Ursache war Layout von 2.408 Knoten.
**Beleg:** Commit 099cc88 (2026-09-13, "docs: handoff - the timeline showed what the totals hid"), Ursache bestätigt in Commit e97dfb0 · Sicherheit: gemessen.
**Was stattdessen gilt:** Eine aggregierte Kategorie-Summe im Trace vor dem Vertrauen in 250-ms-Fenster zerlegen, um zu sehen, wann die Kosten wirklich anfallen, nicht nur wie viel insgesamt. [messen.md](messen.md).

### 45. „Das periodische Nachbau-Polling der Stream-Notes verursachte den wiederkehrenden Long Task“

**Herkunft:** Eigene Verdächtigung zur Ursache eines alle 6,5 s wiederkehrenden Long Tasks, der das TTI-Fenster nur knapp offenhielt.
**Warum falsch:** Das 2-Sekunden-Polling der Notes-Vermeidungsliste wurde auf einen `ResizeObserver` umgestellt — Layout-Reads über 22 s fielen von 4.010 auf 1.823, aber der 6,5-s-Long-Task blieb davon vollständig unberührt. Die tatsächliche Ursache war ein unabhängiges `setInterval`, am selben Tag in einem separaten Fix gefunden.
**Beleg:** Commit 2713c58 (2026-09-13, "perf: the stream notes start late, on a mouse, and stop polling the layout"); echte Ursache behoben in Commit 55d2a32 · Sicherheit: gemessen.
**Was stattdessen gilt:** Nach dem Beheben eines plausiblen Verdächtigen den Zielwert erneut messen, bevor die Ursache als gefunden gilt — ein unveränderter Messwert nach einem Fix beweist, dass der Verdächtige unschuldig war. [messen.md](messen.md).

### 46. „defer auf dem Pixel-Engine-Script behebt das Parser-Blocking ohne Nebenwirkungen“

**Herkunft:** Naheliegender Fix für ein 42-KB-Script-Tag, das den HTML-Parser bei Zeile 1.312 von 3.000 blockierte.
**Warum falsch:** React ruft `initPixels` bereits selbst auf, dessen erste Zeile `if (!PX) return` lautet — ein `defer` hätte das Script erst NACH diesem Aufruf ausführen lassen und dadurch jeden Pixel-Effekt lautlos deaktiviert, ohne Konsolenfehler.
**Beleg:** Commit 55d2a32 (2026-09-13, "perf: the headline stops re-rendering 20 pages, the engine stops blocking the parser"): Fix verschob das Script-Tag stattdessen unverändert (kein `defer`) vor `support.js` in den `<head>`, plus ein neuer Check, der auf fünf Seiten Canvases zählt, um ein stilles Scheitern künftig zu erkennen · Sicherheit: dokumentiert.
**Was stattdessen gilt:** Eine Lade-Reihenfolge-Korrektur (Script früher platzieren) und eine Ausführungs-Reihenfolge-Korrektur (`defer`/`async`) sind nicht austauschbar, wenn anderer Code voraussetzt, dass das Script schon gelaufen ist. [laden-javascript.md](laden-javascript.md#1-defer-async-und-typemodule-unterscheiden-und-gezielt-wählen).

### 47. „Die Vercel-Deployment-URL zu messen ist gleichwertig zur Messung der Live-Produktionsseite“

**Herkunft:** Eigene Projekt-Annahme; zwei Tage Performance-Arbeit wurden gegen `mccain-digital.vercel.app` gemessen und als "live" dokumentiert.
**Warum falsch:** `mccain-digital.com` zeigte zu keinem Zeitpunkt auf Vercel und lief weiterhin über nginx auf SiteGround — das Vercel-Projekt trägt ausschließlich seine eigenen `*.vercel.app`-Domains. Die gemessene URL wird von keinem echten Besucher aufgerufen.
**Beleg:** Commit 3d568d1 (2026-09-11, "fix(docs): the canonical domain was never serving this repository") · Sicherheit: dokumentiert.
**Was stattdessen gilt:** Vor jeder Messreihe die tatsächlich vom Domain-Registrar/DNS bediente Produktions-URL verifizieren, nicht die Deployment-Plattform-URL als Live-Stellvertreter annehmen. [messen.md](messen.md).

### 48. „'0 page errors' vom Lade-Gate bedeutet, die Seite hat keine Konsolenfehler“

**Herkunft:** Eigene Interpretation des Build-Gates `verify_site.mjs`, das durchgehend "0 page errors" meldete.
**Warum falsch:** Das `pageerror`-Event feuert nur bei unabgefangenen Exceptions; `console.error`-Aufrufe und die eigenen Markup-Parsing-Beschwerden des Browsers erreichen dieses Event nie. Die Startseite hatte tatsächlich 70, der Brand-Guide 37 Konsolen-/SVG-Fehler, während das Gate durchgehend "0 page errors" meldete.
**Beleg:** Commit 4ca2a26 (2026-09-11, "fix(build): deliver the template inert - seventy console errors, gone") · Sicherheit: gemessen.
**Was stattdessen gilt:** Ein Fehler-Gate muss den `console`-Kanal (inkl. `console.error`) UND `pageerror` getrennt prüfen — ein grünes `pageerror`-Ergebnis allein ist kein Beweis für eine fehlerfreie Seite. [messen.md](messen.md).

### 49. „Wenn eine Drittanbieter-URL als Objekt-Schlüssel im Code auftaucht, wird dieser Origin auch tatsächlich geladen“

**Herkunft:** Eigener Build-Guard, der den Quelltext nach Drittanbieter-URLs durchsuchte, um externe Requests zu verhindern.
**Warum falsch:** `window.__resources` nutzt die unpkg-URLs bewusst als Schlüssel, gerade damit sie abgefangen und NIE tatsächlich angefragt werden — der Guard schlug auf die bloße Textpräsenz der URL an, nicht auf einen echten Netzwerk-Request.
**Beleg:** Commit 3b38a46 (2026-09-11, "fix(prerender): keep the mount point - the snapshot shipped a dead page"): Guard wurde umgeschrieben, um einen tatsächlich geladenen Origin zu erkennen statt eine bloße Erwähnung im Quelltext · Sicherheit: dokumentiert.
**Was stattdessen gilt:** Guards, die Drittanbieter-Requests verhindern sollen, gegen echte Netzwerkaktivität prüfen, nicht gegen die reine Textpräsenz einer URL im Quellcode. [messen.md](messen.md).

### 50. „Ein grünes Ergebnis von check_links.py bedeutet, es gibt keine kaputten Links oder doppelten IDs“

**Herkunft:** Eigenes Test-Tool zur Link-/ID-Prüfung, lief durchgehend grün.
**Warum falsch:** Zwei Prüfungen matchten den falschen Text: eine erkannte einen Dokumentationskommentar, der `<template id="dc-template">` nur beschrieb, als das echte Tag und übersprang dadurch das tatsächliche, nachgelagerte Markup; eine andere hielt escapte Beispiel-Markup in der Brand-Guide-Prosa für eine echte doppelte ID.
**Beleg:** Commit b99e912 (2026-09-11, "chore(repo): one archive folder, one internal folder, and a test that they stay unreachable"): Fix entfernt Kommentare aus dem Suchraum vor dem Pattern-Match und dekodiert escapte Entities wie ein Browser · Sicherheit: gemessen.
**Was stattdessen gilt:** Ein textbasierter Prüf-Test muss Kommentare/Dokumentation aus seinem Suchraum ausschließen und Markup so dekodieren, wie ein Browser es täte — sonst kann er grün melden, während er den falschen Text prüft. [messen.md](messen.md).

### 51. „Zwei requestAnimationFrame-Ticks nach dem Skript-Start garantieren einen gemalten ersten Frame – WebGL danach zu starten entlastet FCP und Score“

**Herkunft:** Eigene Annahme beim v5-Befund „`getContext('webgl')` blockiert den ersten Paint“ (16.9.2026, HANDOFF: „Canvas erst nach dem ersten Frame starten“), gestützt auf das verbreitete Muster `requestAnimationFrame(() => requestAnimationFrame(start))`.
**Warum falsch:** Der rAF-Callback läuft vor dem Paint eines Frames, und ob dieser Frame präsentiert wird, entscheidet der GPU-Prozess. Unter Software-GL (SwiftShader) präsentiert er den ersten Frame erst, nachdem die WebGL-Kontext-Erzeugung durch ist, egal ob der Hauptthread sie vor oder nach dem ersten Commit auslöst. Der Aufschub verschiebt die Blockade nur hinter FCP, wo Lighthouse sie als TBT zählt (TBT zählt erst ab FCP). Gemessen (`lcp-window.mjs --mobile --software-gl`, zwei Läufe): FCP 2.188/2.280 ms statt 2.388 ms, eine Long Task von 2.271/2.306 ms ab 106/142 ms, TBT 2.221/2.256 ms statt 0. Mit GPU unverändert unauffällig (FCP 100 ms, TBT 0).
**Beleg:** mccain-digital v5, Gegenprobe 16.9.2026 abends, `scratchpad/v5base/exp_defer_swgl_*.json`; Ausgangslage FCP 2.388 ms mit Long Tasks 420 + 130 ms vor FCP · Sicherheit: gemessen (2 Läufe + Ausgangslage, ruhige Maschine).
**Was stattdessen gilt:** Entweder den Block bewusst vor FCP lassen (kostet FCP/LCP, nicht TBT) oder `OffscreenCanvas` in einem Worker und den Start an `first-contentful-paint` (PerformanceObserver) hängen, nicht an rAF-Ticks. [rendern-canvas-webgl.md](rendern-canvas-webgl.md#1-getcontext-ist-synchron-der-erste-paint-darf-nicht-auf-canvas-oder-webgl-warten).

## Präzisiert (teilweise richtig)

### 1. „PSI wartet 5,25 Sekunden auf Netzwerk-/CPU-Ruhe“

**Herkunft:** Eigene Recherche-Annahme zu PSI/Lightrider-Configs (`lr-mobile-config.js`/`lr-desktop-config.js`).
**Warum zu grob:** Die 5.250-ms-Werte (`pauseAfterFcpMs`/`pauseAfterLoadMs`/`networkQuietThresholdMs`/`cpuQuietThresholdMs`) existieren im Code (`nonSimulatedSettingsOverrides`), gelten aber NUR wenn `throttlingMethod` NICHT `simulate` ist. PSI/Lightrider bleibt laut Lightrider-Configs und offizieller Doku ("PageSpeed Insights always use simulated throttling") immer bei `simulate` — die 5.250 ms greifen also gerade NICHT für PSI, sondern nur für CLI/DevTools-Nutzer mit explizitem `--throttling-method=devtools`. Was die lr-Configs für PSI tatsächlich überschreiben, ist `maxWaitForFcp` (15.000 ms) und `maxWaitForLoad` (35.000 ms) — niedrigere Werte als der CLI-Default (30.000/45.000 ms), nicht höhere.
**Beleg:** Quellcode: github.com/GoogleChrome/lighthouse/blob/main/core/config/config.js. Lokal reproduziert (`lighthouse_window.md`): `configSettings` zeigt für `throttlingMethod: simulate` durchgehend `pauseAfterLoadMs`/`networkQuietThresholdMs`/`cpuQuietThresholdMs`/`pauseAfterFcpMs` = 1000, für `throttlingMethod: devtools` durchgehend 5250 — bei sonst identischer Konfiguration (mobile, gleiche Seite) · Sicherheit: gemessen · dokumentiert.
**Was stattdessen gilt:** Das 5,25-s-Fenster gehört zur CLI/DevTools-Throttling-Methode, nicht zu PSI. Für PSI-nahes lokales Messen `--throttling-method=simulate` verwenden. [lighthouse-psi.md](lighthouse-psi.md#2-rechne-beim-psi-standard-mit-1000-ms-ruhefenster-nicht-5250-ms).

### 2. „PSI drosselt die CPU vierfach wie die DevTools-Voreinstellung“

**Herkunft:** Eigene Recherche-Annahme zur PSI-Mobile-Emulation.
**Warum zu grob:** Moto G Power (412×823, DSF 1,75) und das simulierte Throttling (mobileSlow4G: 150 ms RTT, 1,6 Mbit/s down/750 Kbit/s up) sind korrekt. Falsch ist aber "4× CPU-Slowdown" für PSI: `lr-mobile-config.js` überschreibt `cpuSlowdownMultiplier` explizit auf 1,2 ("Determined using PSI CPU benchmark median"), nicht 4 — 4× ist nur der generische CLI/DevTools-Panel-Default. Desktop-PSI nutzt sogar `cpuSlowdownMultiplier=1`. "Simulated (Lantern)" bedeutet zudem: die Seite lädt real ungedrosselt, aus dem Trace wird ein Abhängigkeitsgraph gebaut und mit angepassten Netzwerk-/CPU-Kosten erneut "durchgerechnet" — das ergibt simulierte, keine literal gemessenen Zeitstempel.
**Beleg:** Quellcode: github.com/GoogleChrome/lighthouse/blob/main/core/config/lr-mobile-config.js. Lokal reproduziert (`lighthouse_window.md`, "Zusatzlauf" mit künstlich erhöhtem `maxWaitForFcp`/`maxWaitForLoad`): `observedFirstContentfulPaint`/`observedLargestContentfulPaint` ballonen auf 125.226 ms, während der berichtete simulierte LCP bei 1.727 ms bleibt (Default-Lauf: 1.652–1.720 ms) — dieselbe Divergenz zwischen beobachtet und simuliert, die die Recherche dokumentiert (z. B. beobachtete 2,4 s vs. simulierte 11,8 s LCP bei einer realen Seite) · Sicherheit: dokumentiert · gemessen.
**Was stattdessen gilt:** SKILL.md nennt bereits korrekt "CPU 1,2×" für PSI. Für PSI-nahe lokale Läufe `cpuSlowdownMultiplier` nicht pauschal auf 4 setzen. [lighthouse-psi.md](lighthouse-psi.md#15-nimm-für-psi-mobil-cpu-faktor-12-an-nicht-4).

### 3. „Die Lighthouse-Kategorie 'Other' enthält IntersectionObserver-Arbeit“

**Herkunft:** Eigene Recherche-Annahme zur Zusammensetzung von "Other" im main-thread-work-breakdown.
**Warum zu grob:** Die 7 Gruppen und ihre Trace-Event-Zuordnung sind bestätigt. "Other" besteht laut Quellcode explizit aus genau 3 benannten Scheduler-Loop-Events (`MessageLoop::RunTask`, `TaskQueueManager::ProcessTaskFromWorkQueue`, `ThreadControllerImpl::DoWork`) plus einer generischen Fallback-Regel: jedes nicht gemappte Trace-Event erbt die Gruppe seines Parent-Tasks, nur ein ungemapptes Event OHNE gemappten Vorfahren landet in "Other". Die konkrete Nennung von "IntersectionObserver" als Beispiel dafür ließ sich in keiner offiziellen Lighthouse-Quelle verifizieren.
**Beleg:** Quellcode: github.com/GoogleChrome/lighthouse/blob/main/core/lib/tracehouse/task-groups.js · Sicherheit: dokumentiert.
**Was stattdessen gilt:** "Other" = RunTask-Self-Time + ungemappte Events ohne gemappten Vorfahren; ob eine konkrete `IntersectionObserver`-Berechnung darunter fällt, ist von Fall zu Fall über den Trace zu prüfen, nicht pauschal anzunehmen (siehe Offen). [messen.md](messen.md).

### 4. „PSI/Lighthouse liefert für WebGL immer einen null-Kontext“

**Herkunft:** Eigene Recherche-Annahme: PSI/Lighthouse läuft ohne GPU, Chrome entfernt den automatischen SwiftShader-Fallback für WebGL.
**Warum zu grob:** Bestätigt: DevTools-Warnung zum SwiftShader-Fallback seit Chrome 130; Re-Enable-Flag `--enable-unsafe-swiftshader` existiert; `getContext()` liefert laut MDN/Spezifikation grundsätzlich `null` bei fehlgeschlagener Kontext-Erzeugung. Nicht eindeutig verifizierbar: der exakte Meilenstein der tatsächlichen Default-Entfernung (eine Quelle nennt Desktop M137, eine andere M133) sowie ob Googles eigene PSI/Lightrider-Infrastruktur den Flag `--enable-unsafe-swiftshader` selbst setzt.
**Beleg:** groups.google.com/a/chromium.org/g/blink-dev/c/yhFguWS_3pM · Sicherheit: dokumentiert.
**Was stattdessen gilt:** Ein WebGL-Canvas darf nicht voraussetzen, dass `getContext('webgl')` in Lighthouse/PSI erfolgreich ist — immer auf `null` prüfen und einen Fallback (Standbild) vorhalten. [rendern-canvas-webgl.md](rendern-canvas-webgl.md#1-getcontext-ist-synchron-der-erste-paint-darf-nicht-auf-canvas-oder-webgl-warten).

### 5. „contentvisibilityautostatechange feuert garantiert genau einmal initial“

**Herkunft:** Eigene Recherche-Annahme zum Event-Verhalten von `content-visibility: auto`.
**Warum zu grob:** Für den Kernmechanismus bestätigt: Chromium, WebKit UND Gecko feuern das Event beim Übergang von "undefiniert" zu einem bestimmten Relevanz-Wert, praktisch für jedes Element beim ersten Layout. Es existiert aber ein offenes CSSWG-Issue (#9803, seit Februar 2024), das eine Race Condition beschreibt: wegen der asynchronen Viewport-Näherungs-Berechnung kann manchmal ein zusätzliches, redundantes zweites initiales Event feuern — uneinheitlich zwischen Durchläufen.
**Beleg:** github.com/w3c/csswg-drafts/issues/9803 · Sicherheit: dokumentiert.
**Was stattdessen gilt:** Listener für `contentvisibilityautostatechange` idempotent schreiben (doppeltes Feuern mit demselben `skipped`-Wert darf keine doppelte Nebenwirkung auslösen), nicht "genau ein Aufruf" voraussetzen. [rendern-hauptthread.md](rendern-hauptthread.md#6-auf-contentvisibilityautostatechange-hören-checkvisibility-nur-als-start-fallback).

### 6. „IntersectionObserver-Ziele in gesperrten Subtrees erzwingen pro Frame Layout“

**Herkunft:** Eigene, zu scharfe Lesart der gemessenen Kostenreduktion (508 ms → 97 ms bei 132 → 25 IO-Zielen) als "jedes IO-Ziel in einem übersprungenen Subtree kostet pro Frame Style/Layout".
**Warum zu grob:** Im eingeschwungenen Zustand ist `LayoutObject* target = target_element.GetLayoutObject()` für Nachfahren übersprungener Subtrees bereits `nullptr` (`intersection_geometry.cc:313-334`), und `IsInLockedSubtreeCrossingFrames` (`display_lock_utilities.cc:668-692`) ist ein reiner Ancestor-Walk ohne Seiteneffekte — kein Aufruf von `UpdateStyleAndLayoutForNode` im IO-Pfad gefunden. Der gemessene Effekt hat zwei andere, belegte Ursachen: (1) In der Bootstrap-Phase, bevor `content-visibility: auto` seine Nähe zum Viewport bestimmt hat (CSS Containment 2 §4.3), läuft für jedes Ziel eine echte `IntersectionGeometry`-Berechnung inklusive Style/Layout/Bild-Fetch — das erklärt Kosten proportional zur Zielzahl. (2) Jedes Layout-Lesen (`getBoundingClientRect`, `offset*`, `client*`, `scroll*`) auf einem Knoten IN einem übersprungenen Block erzwingt über `Document::UpdateStyleAndLayoutForNode`/`ScopedForcedUpdate` Style und Layout der gesperrten Vorfahren und lädt dabei deren CSS-Bilder (`CSSImageValue::CacheImage` startet beim Style-Recalc).
**Beleg:** Chromium main, HEAD cabdc32a717663075a71718eb8750f6abdaedb64 (`intersection_geometry.cc`, `display_lock_utilities.cc`, `display_lock_document_state.cc`, `document.cc:2990-3002`, `css_image_value.cc:113-131`); CSS Containment 2 §4.3/§4.5. Projekt-Messung: 132 → 25 IO-Ziele halbierte "Other", `computeIntersections` 508 ms → 97 ms, Anfragen 28 → 11 (chromium_io_verdict.md) · Sicherheit: gemessen · dokumentiert.
**Was stattdessen gilt:** IO-Ziele in `content-visibility`-Blöcken erst beobachten/vermessen, wenn der Block rendert (`contentvisibilityautostatechange`, `skipped === false`, Grundsatz 7 in SKILL.md) — nicht weil ein Ziel im gesperrten Zustand selbst pro Frame kostet, sondern weil die Bootstrap-Phase und jedes Layout-Lesen im Block echte Kosten und Bild-Ladevorgänge auslösen. `hidden` bleibt dauerhaft gesperrt, nur `auto` ist betroffen. [rendern-hauptthread.md](rendern-hauptthread.md#7-intersectionobserver-in-einem-content-visibility-block-die-korrigierte-regel).

### 7. „getAnimations zeigt Animationen gesperrter Subtrees erst beim Rendern“

**Herkunft:** Eigene Recherche-Annahme zu `document.getAnimations()` in `content-visibility`-Subtrees.
**Warum zu grob:** Die CSSWG hat beschlossen, dass `content-visibility` CSS-Animationen in geskippten Subtrees PAUSIERT (wie `animation-play-state: paused`) — NICHT entfernt/zerstört. Eine pausierte Web-Animations-API-Animation bleibt nach dem allgemeinen Animationsmodell ein normales, weiterhin existierendes Animation-Objekt. Ein Chromium-Team-Hinweis deutet sogar darauf hin, dass direkte Abfragen weiterhin korrekt aufgelöst werden — das würde der ursprünglichen Annahme eher widersprechen.
**Beleg:** github.com/w3c/csswg-drafts/issues/5611 · Sicherheit: dokumentiert (Mechanismus) — konkretes `getAnimations()`-Rückgabeverhalten nicht verifiziert, siehe Offen.
**Was stattdessen gilt:** Nicht davon ausgehen, dass `getAnimations()` pausierte Animationen in gesperrten Subtrees verschweigt oder zeigt — vor produktivem Einsatz empirisch in Chrome/Firefox/Safari testen (siehe Offen). [rendern-hauptthread.md](rendern-hauptthread.md#8-documentgetanimations-in-übersprungenen-blöcken-nicht-blind-vertrauen).

### 8. „Layout-lesende APIs pro Frame lösen einen Lighthouse-'forced reflow'-Befund aus“

**Herkunft:** Eigene Recherche-Annahme, zusammengesetzt aus zwei Teilen: welche APIs Layout erzwingen, und wo Lighthouse das meldet.
**Warum zu grob:** Erster Teil zu 100 % bestätigt: Paul Irishs Original-Gist listet `window.scrollX`/`scrollY`, `window.innerHeight`/`innerWidth`, `elem.getBoundingClientRect()`, `elem.clientWidth`/`clientHeight` u. a. explizit als Layout-erzwingende APIs — mit der wichtigen Ergänzung, dass das nur kostet, wenn Style/Layout seit dem letzten Flush bereits invalidiert wurde; reines wiederholtes Lesen ohne zwischenzeitliches Schreiben ist günstig. Zweiter Teil war selbst die zu grobe Korrektur: developer.chrome.com beschreibt "Forced reflow" zutreffend als Feature des Chrome-DevTools-Performance-Panels plus Konsolenwarnung, aber das ist nicht mehr die ganze Geschichte — Lighthouse 13 hat mit den 17 Performance Insights ein eigenes `forced-reflow-insight` eingeführt (`core/config/default-config.js`): ungewichtet (kein Score-Einfluss), aber sichtbar im Report, mit Top-Function-Call- und Bottom-up-Liste inklusive exakter Source-Location (Datei, Zeile, Spalte). Ein gescorter klassischer Lighthouse-Audit ist es also weiterhin nicht, ein Lighthouse-Report-Befund aber sehr wohl.
**Beleg:** github.com/GoogleChrome/lighthouse/blob/main/core/config/default-config.js — claim_check "Liste der Lighthouse-13-Performance-Insights", CONFIRMED: forced-reflow-insight liefert Top-Function-Call und Bottom-up-Liste mit Source-Location (research_lighthouse.json) · developer.chrome.com/docs/performance/insights/forced-reflow (DevTools-Feature, weiterhin gültig) · eigener Befund 16.9.2026: PSI zeigte "Erzwungener dynamischer Umbruch", Quellort `logic.gen.js:336:113`, 52 ms, für einen Pro-Frame-`scrollY`-Read in der Pixelstrom-Animationsschleife, behoben in Commit ca40094 · Sicherheit: gemessen · dokumentiert.
**Was stattdessen gilt:** Layout-Werte cachen und nur nach Scroll-/Resize-Events lesen, nie pro Frame nach einem DOM-Schreibzugriff (Grundsatz 6, SKILL.md) — und nach einem "forced reflow"-Befund sowohl im Chrome-DevTools-Performance-Panel als auch im Lighthouse-13-/PSI-Report unter den Performance Insights (`forced-reflow-insight`) suchen, nicht nur im einen oder anderen. [rendern-hauptthread.md](rendern-hauptthread.md#9-layout-werte-aus-scroll--und-resize-events-cachen-nie-pro-frame-live-lesen) und [lighthouse-psi.md](lighthouse-psi.md#die-17-performance-insights-lighthouse-13).

### 9. „CPU-Drosselung lässt sich an gedrosselter Shader-Framerate erkennen“

**Herkunft:** Eigene Beobachtung beim Testen (Chrome DevTools/Lighthouse CPU-Drosselung, z. B. 4×) plus eigene Folgerung "nur SwiftShader wird gedrosselt".
**Warum zu grob:** Erster Teil bestätigt (wörtliches Chrome-Blog-Zitat): "DevTools CPU throttling doesn't touch the GPU process" — der WebGL-Shader läuft im GPU-Prozess, den die CPU-Drosselung des Browsers nicht erfasst. Die eigene Folgerung "also wird wenigstens SwiftShader-Softwarerendering gedrosselt" ist aber ebenfalls falsch: SwiftShader läuft laut Chromiums eigener Doku GENAUSO innerhalb des (von der Drosselung ausgenommenen) GPU-Prozesses, nicht im gedrosselten Renderer-Hauptthread. Der Unterscheidungsfaktor ist "welcher Prozess" (Renderer vs. GPU-Prozess), nicht "Hardware- vs. Software-GL".
**Beleg:** Beobachtet beim Testen: reale Grafiklast entsteht erst mit dem expliziten Flag `--use-angle=swiftshader` (erzwungenes Software-Rendering), nicht durch DevTools-CPU-Throttling (HANDOFF.md, "STAND 16.9. NACHMITTAGS", "Fallen", Zeile 151-152). Quelle: chromium.googlesource.com/chromium/src/+/refs/heads/main/docs/gpu/swiftshader.md · Sicherheit: gemessen · dokumentiert.
**Was stattdessen gilt:** Für einen echten Grafik-Stresstest `--use-angle=swiftshader` explizit setzen (`scripts/fps.mjs --software-gl`); CPU-Throttling allein sagt nichts über die Shader-Framerate aus, egal ob Hardware- oder Software-GL. [rendern-canvas-webgl.md](rendern-canvas-webgl.md#2-cpu-throttling-in-devtools-erreicht-den-gpu-prozess-nicht).

### 10. „decoding async trägt zum Lazy-Load-Stopp im geschlossenen Menü bei“

**Herkunft:** Eigene Annahme: `loading="lazy"` + `decoding="async"` auf Bildern innerhalb eines geschlossenen (`content-visibility: hidden`) Mega-Menüs verhindern gemeinsam das Laden beim Start.
**Warum zu grob:** Der entscheidende Faktor ist `loading="lazy"`, nicht `decoding="async"`. Ein empirischer Cross-Browser-Test zeigt: `content-visibility: hidden` wirkt in Chrome für lazy-Bilder wie `display: none` — solange der Container versteckt ist (keine Layout-Box), feuert die native, geometriebasierte Lazy-Loading-Logik nicht. `decoding="async"` betrifft ausschließlich den Zeitpunkt des Bild-Decodings NACH dem Laden, nicht den Fetch-Zeitpunkt.
**Beleg:** phpied.com/image-requests-in-hidden-content/ · Sicherheit: dokumentiert.
**Was stattdessen gilt:** Bilder in geschlossenen Menüs/Panels brauchen `loading="lazy"` UND einen versteckten Container ohne Layout-Box; `decoding="async"` ist dafür irrelevant, aber unschädlich als generelle Praxis. [laden-kritischer-pfad.md](laden-kritischer-pfad.md#23-decodingasync-ergänzt-loading-ersetzt-es-nicht).

## Offen (nicht verifizierbar)

- Ob `IntersectionObserver`-Callbacks konkret in der Lighthouse-Kategorie "Other" auftauchen (als Beispiel für ein ungemapptes Trace-Event), ist nicht durch eine offizielle Lighthouse-Quelle belegt (siehe [Präzisiert Punkt 3](#3-die-lighthouse-kategorie-other-enthält-intersectionobserver-arbeit)). Klärung: im eigenen Trace ein IO-Callback-Event gezielt gegen die `task-groups.js`-Mappings abgleichen.
- Der exakte Chrome-Meilenstein, ab dem der automatische SwiftShader-Fallback für WebGL entfernt wurde (M133 oder M137, Quellen widersprechen sich), sowie ob PSI/Lightrider selbst `--enable-unsafe-swiftshader` setzt, ist nicht eindeutig verifizierbar (siehe [Präzisiert Punkt 4](#4-psilighthouse-liefert-für-webgl-immer-einen-null-kontext)). Klärung: chromestatus.com-Eintrag direkt prüfen oder `getContext('webgl')` empirisch gegen echtes PSI testen.
- Ob `document.getAnimations()` (mit/ohne `subtree: true`) auf einem `content-visibility: hidden`/`auto`-gesperrten Element die pausierten Animationen zurückgibt oder verschweigt, ist durch keine Spec-/MDN-Primärquelle eindeutig belegt (siehe [Präzisiert Punkt 7](#7-getanimations-zeigt-animationen-gesperrter-subtrees-erst-beim-rendern)). Klärung: empirisch in aktuellem Chrome, Firefox und Safari testen.
- Die exakte Kausalkette der Mask-Bild-Fetches bei 125 ms (Bootstrap-Phase-IO-Geometrie oder Layout-Lesen in den IO-Callbacks der Seite selbst) ist nicht abschließend zugeordnet; ein direkter Aufruf von `UpdateStyleAndLayoutForNode` aus dem IntersectionObserver-Zielpfad selbst wurde im Chromium-Quellcode nicht gefunden, und zu "IO erzwingt Layout in c-v:auto-Subtree" existiert kein bekanntes crbug (chromium_io_verdict.md; verwandt: offenes Issue w3c/csswg-drafts#8542, Mozilla Bugzilla 1807253 zu allgemeinem Timing von `content-visibility: auto`). Klärung: die Seite mit einem instrumentierten Chromium-Debug-Build oder gezielten Breakpoints in `intersection_observer_controller.cc` nachvollziehen.
- Ob PSIs extern berichteter Befund "Performance 60, LCP-Render-Delay 20.490 ms auf `span.v5-r`" denselben Mechanismus hat wie die bestätigte Nichtdeterminismus-/Throttling-Verzerrung ([Widerlegt Punkt 21](#21-psi-desktop-tbt-13060-ms-zeigt-einen-realen-performance-bug)) oder eine eigene Ursache, lässt sich mit den lokalen Traces nicht klären: kein einziger der 6 lokalen Lighthouse-Läufe (simulate/devtools, OLD/NEW, mobil/Desktop) identifiziert ein Element der Klassen `v5-r`/`v5-w` überhaupt als LCP-Kandidaten (lighthouse_window.md, "Was das zeigt", Punkt 4 und 6). Klärung: denselben Build direkt über PageSpeed Insights (nicht lokales Lighthouse) laufen lassen und den vollständigen PSI-Trace auswerten.
- Die dreimalige `NO_FCP`-Fehlschlagsrate desselben `OLD mobile simulate`-Befehls vor dem vierten, erfolgreichen Lauf korrelierte mit 17 parallel laufenden Chrome-/Playwright-Hintergrundprozessen, ist aber nicht als Kausalität nachgewiesen (lighthouse_window.md, Abschnitt 2). Klärung: denselben Lauf systematisch mit 0 vs. N Hintergrundprozessen wiederholen.

## Quellen

- https://github.com/GoogleChrome/lighthouse/blob/main/core/config/config.js
- https://github.com/GoogleChrome/lighthouse/blob/main/core/config/lr-mobile-config.js
- https://github.com/GoogleChrome/lighthouse/blob/main/core/config/default-config.js (17 Performance Insights inkl. forced-reflow-insight; siehe raw/research_lighthouse.json, claim_check "Liste der Lighthouse-13-Performance-Insights")
- https://github.com/GoogleChrome/lighthouse/blob/main/core/lib/tracehouse/task-groups.js
- https://groups.google.com/a/chromium.org/g/blink-dev/c/yhFguWS_3pM
- https://github.com/w3c/csswg-drafts/issues/9803
- https://github.com/w3c/csswg-drafts/issues/5611
- https://github.com/w3c/csswg-drafts/issues/8542 (referenziert in chromium_io_verdict.md, keine eigene Verifikation)
- https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserverEntry/intersectionRect
- https://developer.chrome.com/docs/performance/insights/forced-reflow
- https://developer.chrome.com/blog/hardware-accelerated-animations
- https://developer.chrome.com/blog/use-scheduler-yield
- https://chromium.googlesource.com/chromium/src/+/refs/heads/main/docs/gpu/swiftshader.md
- https://www.phpied.com/image-requests-in-hidden-content/
- Mozilla Bugzilla 1807253 "Unreliable timing for content-visibility:auto" (referenziert in chromium_io_verdict.md, keine URL im Quellmaterial, keine eigene Verifikation)
- Chromium main, HEAD cabdc32a717663075a71718eb8750f6abdaedb64, CSS Containment 2 §4.3/§4.5 (lokale Quellcode-Analyse, siehe chromium_io_verdict.md)
- mccain-digital: CHANGELOG.md, Abschnitt "2026-07-20 — Homepage v2-Refresh"
- mccain-digital: HANDOFF.md, Stände 13.9. (03:00, 03:30, NACHTS), 16.9. (Pixelstrom, NACHMITTAGS), Abschnitte "WAS AM 13.9. GEBAUT WURDE", "A5", "AP-1", "MengTo/Skills"
- mccain-digital: Commits 25304a7, 1a36a82, d73393b, a2035d0, b0b2ab0, c461b51, 7e9b70d, a06f8e3, a4aee9f, a607b64, 4b3e71d, 465f8f9, aca605c, 3ecda0d, 4d8d049
- mccain-digital: Commits 099cc88, e97dfb0, 2713c58, 55d2a32, 3d568d1, 4ca2a26, 3b38a46, b99e912, ca40094 (Gitlog-Nachtrag 2026-09-10 bis 2026-09-16, gitlog_1a–1d.json)
- mccain-digital: lighthouse_window.md (lokale Lighthouse-CLI-Traces, 16.09.2026, Lighthouse 13.4.1 / Chrome for Testing 148.0.7778.96)
- 360-Projekt: .claude/docs/nextjs-migration-plan.md, .claude/docs/decisions.md ADR-28
- mccain-cms: CHANGELOG.md (alpha.164 "Motion scroll-scrub", "B7/B8 — Reduced-motion system removed wholesale")
- whatever-recall-internal: internal/3d-preview/README.md, .recall/HANDOFF.md (2026-06-18/21)
