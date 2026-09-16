# Laden: Caching, Auslieferung, Build — html-performance

> Teil des Skills [[html-performance]] · Stand 2026-09-16 · Belege: mccain-digital (HANDOFF, CHANGELOG, Commits), weitere Projekte des Owners, Recherche mit Quell-URLs

Scope: alles zwischen Build und Browser — Cache-Header und `immutable`, Content-Hashes, bfcache, Kompression (Brotli, Zstd), Speculation Rules, sowie Build-Pipeline-Effekte wie Minifizierung, doppelte Auslieferung, Bild-Encoding und Self-Hosting von Laufzeit-Bibliotheken. LCP-Pfad, kritisches CSS, Fonts und Bilder stehen in [laden-kritischer-pfad.md](laden-kritischer-pfad.md), JavaScript-Ladereihenfolge und Nachladen in [laden-javascript.md](laden-javascript.md). Laufzeitverhalten nach dem ersten Render: [rendern-hauptthread.md](rendern-hauptthread.md), [rendern-animationen.md](rendern-animationen.md), [rendern-canvas-webgl.md](rendern-canvas-webgl.md); Lighthouse/PSI-Scoring in [lighthouse-psi.md](lighthouse-psi.md), Mess-Methodik in [messen.md](messen.md), der Framework-Delta in [react-nextjs.md](react-nextjs.md).

Bis zum 16.9.2026 stand dieser Inhalt zusammen mit den anderen `Laden`-Themen in `laden.md`; die Regeln sind hier neu von 1 durchnummeriert, alte Verweise gelten nicht mehr.

## Kurzfassung

**Caching und Auslieferung**
- **immutable nur für Assets mit Content-Hash im Dateinamen** — immutable nur bei Content-Hash im Namen — sonst kann eine geänderte Datei nie ankommen ([→](#1-immutable-nur-für-assets-mit-content-hash-im-dateinamen))
- **HTML und die zugehörige Runtime-JS-Datei nie gemeinsam immutable cachen** — HTML+JS gemeinsam immutable cachen kann zu sichtbarem Doppel-Rendering nach Deploy führen ([→](#2-html-und-die-zugehörige-runtime-js-datei-nie-gemeinsam-immutable-cachen))
- **Content-Hash-Umbenennung bringt nur etwas, wenn die referenzierende HTML selbst langfristig cachebar ist** — Hash-Umbenennung lohnt sich nur, wenn auch die referenzierende HTML langfristig cachebar ist ([→](#3-content-hash-umbenennung-bringt-nur-etwas-wenn-die-referenzierende-html-selbst-langfristig-cachebar-ist))
- **Cache-Header-Wirkung nur gegen einen produktionsnah konfigurierten Server prüfen** — no-store verhindert Wiederverwendung auch innerhalb einer Seite — Dev-Server täuscht Duplikate vor ([→](#4-cache-header-wirkung-nur-gegen-einen-produktionsnah-konfigurierten-server-prüfen))
- **Cache-Buster per Query-String als Notlösung auf Hosts ohne granulare Cache-Kontrolle** — Query-String-Versionierung als Notlösung, wenn der Host selbst lange Cache-Zeiten erzwingt ([→](#5-cache-buster-per-query-string-als-notlösung-auf-hosts-ohne-granulare-cache-kontrolle))
- **Verzeichnis-Routen vor der Kompressionsprüfung auf index.html auflösen** — Verzeichnis-Route ohne Auflösung auf index.html maß sich in einem Fall 6,8× zu schwer ([→](#6-verzeichnis-routen-vor-der-kompressionsprüfung-auf-indexhtml-auflösen))
- **bfcache kennen und nicht versehentlich ausschließen** — bfcache spart bei Zurück/Vorwärts komplett Netzwerk+Skriptstart — no-store/unload schließen aus ([→](#7-bfcache-kennen-und-nicht-versehentlich-ausschließen))
- **Kompression: Brotli ist Standard, Zstd wächst, beide schlagen gzip** — Brotli praktisch überall verfügbar und ~14 % kleiner als gzip, Zstd wächst aber noch lückenhaft ([→](#8-kompression-brotli-ist-standard-zstd-wächst-beide-schlagen-gzip))
- **Speculation Rules API für Mehrseiten-Sites erwägen, aber Support-Lücken einplanen** — prerendert die wahrscheinliche nächste Seite, aber nur in Chromium wirklich verbreitet ([→](#9-speculation-rules-api-für-mehrseiten-sites-erwägen-aber-support-lücken-einplanen))

**Build-Pipeline-Effekte**
- **Minifizierung bei jedem Build aus derselben Quelle ableiten, Property-Mangling gezielt abschalten** — Minifizierung aus einer Quelle je Build ableiten, Property-Mangling bei dynamischem Zugriff aus ([→](#10-minifizierung-bei-jedem-build-aus-derselben-quelle-ableiten-property-mangling-gezielt-abschalten))
- **Gewichtsanteil je Datei einzeln nachmessen statt zu vermuten** — der reale Gewichtsfund kann in einer ganz anderen Datei liegen als vermutet ([→](#11-gewichtsanteil-je-datei-einzeln-nachmessen-statt-zu-vermuten))
- **Inhalt nicht doppelt oder dreifach ausliefern — zur Bauzeit kompilieren statt zur Laufzeit interpretieren** — Design-Tool-Exporte liefern denselben Inhalt teils dreifach — zur Bauzeit kompilieren spart 24 KB gz/Seite ([→](#12-inhalt-nicht-doppelt-oder-dreifach-ausliefern--zur-bauzeit-kompilieren-statt-zur-laufzeit-interpretieren))
- **Build-Reihenfolge: Alle Runtime-Assets vor dem Browserstart an ihrem Ort** — Runtime-Assets müssen vor dem Start eines rendernden Browser-Prozesses am Ort liegen ([→](#13-build-reihenfolge-alle-runtime-assets-vor-dem-browserstart-an-ihrem-ort))
- **Moderne CSS-Parser können bei unausgeglichenen Klammern ganze Blöcke lautlos verschlucken** — Lightning CSS & Co. verschlucken bei Klammerfehlern ganze Regel-Blöcke ohne Fehlermeldung ([→](#14-moderne-css-parser-können-bei-unausgeglichenen-klammern-ganze-blöcke-lautlos-verschlucken))
- **Bild-Encoding zwischen Maschinen ist nicht deterministisch — inhaltlich prüfen, nicht nur per Byte-Diff** — WebP/PNG-Encoding erzeugt je nach Maschine leicht andere Bytes trotz gleichem Bildinhalt ([→](#15-bild-encoding-zwischen-maschinen-ist-nicht-deterministisch--inhaltlich-prüfen-nicht-nur-per-byte-diff))
- **Bild-Assets zentral verwalten und auf Duplikate, Auflösung und größte Verwendung prüfen** — Bildreferenzen zentral verwalten, per Hash auf Duplikate und auf größte Verwendungsbox prüfen ([→](#16-bild-assets-zentral-verwalten-und-auf-duplikate-auflösung-und-größte-verwendung-prüfen))
- **Sitemap- und llms.txt-Generierung vom Performance-Build trennen** — sitemap.xml/llms.txt beeinflussen die Ladezeit der Seite selbst nicht ([→](#17-sitemap--und-llmstxt-generierung-vom-performance-build-trennen))
- **Drittanbieter-Laufzeit-Bibliotheken selbst hosten, nicht nur Fonts** — dieselbe Origin-Logik wie bei Fonts gilt auch für CDN-geladene JS-Libraries wie React ([→](#18-drittanbieter-laufzeit-bibliotheken-selbst-hosten-nicht-nur-fonts))
- **Ein Preload für ein großes Skript kann den FCP verschlechtern statt verbessern** — der Preload konkurriert mit dem Dokument selbst um Priorität — vorher/nachher messen ([→](#19-ein-preload-für-ein-großes-skript-kann-den-fcp-verschlechtern-statt-verbessern))

## Inhalt

- [Caching und Auslieferung](#caching-und-auslieferung)
- [Build-Pipeline-Effekte](#build-pipeline-effekte)
- [Offene Fragen](#offene-fragen)
- [Quellen](#quellen)

## Caching und Auslieferung

### 1. immutable nur für Assets mit Content-Hash im Dateinamen
**Warum:** Cache-Control: immutable unterdrückt die Revalidierungs-Anfrage beim manuellen Reload (Firefox ab 49 über HTTPS, Safari ab 11; Chrome implementiert das Schlüsselwort gar nicht separat, ignoriert es aber folgenlos). Das ist nur sicher, wenn sich der Inhalt hinter der URL per Definition nie ändert — also bei einem Content-Hash oder einer Versionsnummer im Dateinamen. Vercel setzt genau dafür standardmäßig public, max-age=31536000, immutable; Next.js-Dateien im public/-Ordner ohne Hash bekommen dagegen nur max-age=0.
**Woran man es erkennt:** Ein Asset trägt immutable/eine sehr lange max-age, obwohl sein Dateiname sich bei einer Inhaltsänderung NICHT automatisch ändert.
**Fix:** Nur Dateien mit Content-Hash/Versionsnummer im Namen (z. B. app.a1b2c3.js, hero.png?v=deadbeef) mit Cache-Control: public, max-age=31536000, immutable ausliefern. Alles andere braucht entweder eine andere Cache-Strategie oder muss erst gehasht werden.
**Beleg:** mccain-digital, Commit 645d034: vercel.json lässt CSS/JS revalidieren statt immutable, Bilder/Fonts (Name trägt Größe) bleiben 1 Jahr immutable — Performance blieb bei 99 auf dem Edge, ganz ohne die ursprünglich geplante ?v=-Versionierung | MDN, Cache-Control | caniuse.com, immutable | vercel.com/docs, Cache-Control-Headers. · Sicherheit: gemessen
**Gilt für:** allgemein

### 2. HTML und die zugehörige Runtime-JS-Datei nie gemeinsam immutable cachen
**Warum:** Können sich HTML und die zugehörige Runtime-JS-Datei gemeinsam ändern und wird eine davon mit langem Cache-Header ausgeliefert, kann ein Browser mit gecachtem altem HTML gegen eine neue Runtime laufen (oder umgekehrt) — mit sichtbar inkonsistentem Ergebnis.
**Woran man es erkennt:** Nach einem Deploy erscheint der Seiteninhalt kurzzeitig doppelt oder transparent versetzt; ein Hard-Reload behebt es sofort (klares Cache-Symptom).
**Fix:** .html UND die zugehörige .js-Datei auf max-age=0, must-revalidate setzen, solange beide keinen Content-Hash im Namen tragen. Nur wirklich versionierte, dateinamen-gehashte Assets (z. B. /vendor/) dürfen immutable sein.
**Beleg:** mccain-digital, HANDOFF "WAS AM 13.9. GEBAUT WURDE": Owner sah nach Deploy kurz alles zweimal, transparent, um die Hero-Höhe versetzt — der Browser hielt das gecachte alte Dokument, der neue support.js fand darin kein gefülltes Root-Element und legte eines an, die alte Kopie blieb liegen. Fix: .html und .js auf max-age=0, must-revalidate, nur /vendor/ und Bilder immutable. · Sicherheit: gemessen
**Gilt für:** allgemein

### 3. Content-Hash-Umbenennung bringt nur etwas, wenn die referenzierende HTML selbst langfristig cachebar ist
**Warum:** Ist die HTML-Datei ohnehin must-revalidate, kostet jeder Besuch bereits eine Rundreise auf derselben warmen Verbindung. Der einzige Zusatzgewinn von Content-Hash-Dateinamen für die referenzierten Skripte wären dann nur ein paar 304-Antworten bei Wiederbesuch — kein Effekt auf den kritischen Pfad des ersten Aufrufs.
**Woran man es erkennt:** Eine geplante Umbenennungs-/Hash-Maßnahme für Skripte, während die referenzierende HTML-Datei bereits max-age=0, must-revalidate trägt.
**Fix:** Vor einer riskanten Mehrstellen-Umbenennung auf Content-Hash-Dateinamen prüfen, ob die referenzierende HTML-Datei überhaupt langfristig cachebar (immutable) ist oder werden kann — sonst das Risiko (Umbenennung trifft an vielen Stellen genau die Datei, deren Fehlen die Seite lahmlegen kann) gegen einen Gewinn abwägen, der nur den Wiederbesuch betrifft.
**Beleg:** mccain-digital, HANDOFF Zeile 1077-1083: Umbenennung bewusst zurückgestellt, weil die HTML-Datei ohnehin must-revalidate bleibt und die Umbenennung an sechs Stellen genau die Datei träfe, deren Fehlen das Projekt schon zweimal komplett lahmgelegt hatte. · Sicherheit: vermutet
**Gilt für:** allgemein

### 4. Cache-Header-Wirkung nur gegen einen produktionsnah konfigurierten Server prüfen
**Warum:** Cache-Control: no-store bedeutet laut MDN, dass "Caches jeder Art (privat oder geteilt)" die Antwort nicht speichern dürfen — das schließt den In-Memory-Cache des Browsers INNERHALB eines einzelnen Seitenaufrufs ein, nicht nur den Festplatten-Cache über Navigationen hinweg. Referenziert eine Seite dieselbe Ressource mehrfach (Font in mehreren Kontexten, ein Sprite in mehreren Elementen), muss der Browser ohne jede Cache-Speicherung jedes Mal erneut über das Netz laden. Ein nacktes python -m http.server ist keine Rettung: es schickt gar keine Cache-Header, der Browser cached dann heuristisch über Last-Modified und liefert ebenso irreführende Ergebnisse.
**Woran man es erkennt:** Mit einem Dev-Server (no-store oder keine Cache-Header) gemessen: Schriften/Sprite/Assets werden scheinbar doppelt angefragt. Gegen einen produktionsnah konfigurierten Server (echte Cache-Header) gemessen: je eine Anfrage.
**Fix:** Zwei Server strikt trennen: einen mit Cache-Control: no-store NUR zum Ansehen von Änderungen während der Entwicklung, einen mit echten Produktions-Headern NUR für Performance-Messungen (Lighthouse, eigene Skripte). Nie gegen den Dev-Server messen und ein "Duplikat" für einen echten Bug halten. Details zur Mess-Methodik: [messen.md](messen.md).
**Beleg:** mccain-digital: mit --dev (no-store) Schriften/Sprite doppelt angefragt, mit prodserve.py (Produktions-Header) je einmal — kein Code-Fehler | claim_check (confirmed): MDN-Definition von no-store erklärt den Mechanismus exakt. · Sicherheit: gemessen
**Gilt für:** allgemein

### 5. Cache-Buster per Query-String als Notlösung auf Hosts ohne granulare Cache-Kontrolle
**Warum:** Setzt die Hosting-Umgebung selbst eine lange, nicht kontrollierbare Cache-Lebensdauer für statische Assets (z. B. klassischer Apache-Webspace mit 7 Tagen für JS), erreicht eine reine Code-Änderung die Nutzer sonst tagelang nicht.
**Woran man es erkennt:** Eine aktualisierte JS-/CSS-Datei zeigt bei Nutzern mit warmem Cache weiterhin den alten Stand, ohne dass eine erneute Auslieferung erzwingbar wäre.
**Fix:** Einen versionierten Query-String (datei.js?v=h1) oder Dateinamen als Cache-Buster einsetzen, um eine erzwungene Neu-Auslieferung sicherzustellen. Sobald möglich auf eine Plattform mit granularer/immutabler Cache-Kontrolle (Content-Hash im Dateinamen, Edge-Cache-Header) migrieren, statt dauerhaft mit Query-Strings zu arbeiten.
**Beleg:** mccain-digital, CHANGELOG 2026-06-12 "Welle H": Cache-Buster pixel-engine.js?v=h1 wegen 7-tägigem JS-Caching auf dem alten Apache-Webspace eingesetzt. · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 6. Verzeichnis-Routen vor der Kompressionsprüfung auf index.html auflösen
**Warum:** Ein lokaler Messserver, der Verzeichnis-Routen (/pfad/) nicht vor der Gzip-Prüfung auf index.html auflöst, liefert sie unkomprimiert aus — dieselbe Seite misst sich dadurch krass zu schwer, obwohl derselbe Inhalt unter dem vollen Pfad korrekt komprimiert wird.
**Woran man es erkennt:** Eine Seite ist unter /pfad/ deutlich schwerer als unter /pfad/index.html, obwohl der Inhalt identisch ist; Response-Header der Verzeichnis-Route zeigen keine Content-Encoding.
**Fix:** Im lokalen Mess-/Prod-Server die Route ZUERST auf die tatsächliche Datei auflösen (Verzeichnis → index.html) und erst danach über Kompression und Cache-Header entscheiden.
**Beleg:** mccain-digital, scripts/prodserve.py (Docstring): eine Startseite maß sich dadurch 6,8× zu schwer, obwohl derselbe Inhalt unter "/pfad/index.html" korrekt komprimiert auslief. · Sicherheit: gemessen
**Gilt für:** allgemein

### 7. bfcache kennen und nicht versehentlich ausschließen
**Warum:** Alle drei großen Engines unterstützen den Back/Forward-Cache (Chrome seit Version 96, Firefox, Safari) — eine Rückkehr per Zurück/Vorwärts kann dann komplett ohne Netzwerk-Request und ohne Skript-Neustart erfolgen. Cache-Control: no-store schließt eine Seite grundsätzlich vom bfcache aus; seit einem vollständigen Chrome-Rollout (März/April 2025) erlaubt Chrome bfcache dort dennoch, wo es sicher ist — dann mit auf 3 statt 10 Minuten reduziertem Timeout, weiterhin ausgeschlossen bei Cookie-/Auth-Änderungen, WebSocket/WebTransport/WebRTC oder no-store-Antworten auf Fetch/XHR. Andere Disqualifizierer bestehen fort, z. B. ein unload-Listener auf dem Desktop bei Chrome/Firefox.
**Woran man es erkennt:** Chrome DevTools → Application → Back/forward cache zeigt den Status und ggf. den Ausschlussgrund einer Seite.
**Fix:** unload-Listener vermeiden (pagehide/visibilitychange verwenden), offene Verbindungen (WebSocket etc.) beim Verstecken sauber behandeln statt sie zu erzwingen, und no-store nur dort einsetzen, wo es wirklich nötig ist — nicht pauschal auf HTML.
**Beleg:** developer.chrome.com, bfcache and Cache-Control:no-store | web.dev, bfcache (inkl. Update Juni 2026: offene WebSocket-Verbindungen schließen eine Seite nicht mehr zwingend aus, der Browser schließt sie beim bfcache-Eintritt automatisch). · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 8. Kompression: Brotli ist Standard, Zstd wächst, beide schlagen gzip
**Warum:** Brotli ist praktisch universell unterstützt (Chrome 50+, Firefox 44+, Safari 11+, Edge 15+, ~96 % global) und komprimiert JS-Dateien im Schnitt ca. 14 % kleiner als gzip, weil es serverseitig ein gemeinsames Wörterbuch häufiger Web-Begriffe nutzt. Zstd ist neuer (Chrome seit 123, 118–122 hinter Flag; Firefox seit 129; Edge seit 124; Safari erst ab 26.1 teilweise) und wird von Chrome nur über HTTPS angeboten.
**Woran man es erkennt:** Content-Encoding-Response-Header prüfen: gzip statt br/zstd, obwohl der Client sie im Accept-Encoding anbietet.
**Fix:** Textbasierte Assets (HTML/CSS/JS) serverseitig mit Brotli ausliefern, sofern die Plattform es unterstützt; Zstd zusätzlich anbieten, wo verfügbar, mit Gzip als Fallback. Ob Vercels Edge Network vorkomprimierte Brotli-Dateien direkt ausliefert oder nur on-the-fly komprimiert, ist offiziell nicht eindeutig geklärt (siehe Offene Fragen).
**Beleg:** testmuai.com, Brotli browser support (Sekundärquelle) | Chromium Intent-to-Ship, Zstd Content-Encoding. · Sicherheit: dokumentiert
**Gilt für:** allgemein

### 9. Speculation Rules API für Mehrseiten-Sites erwägen, aber Support-Lücken einplanen
**Warum:** Die Speculation Rules API lässt den Browser eine wahrscheinliche nächste Navigation vorab prefetchen oder komplett vorrendern (prerender) — ein Klick auf die tatsächlich vorgerenderte Seite wirkt dann praktisch instant, wie eine Auslieferung aus dem Cache. Sie gilt bei MDN aber als "Limited availability" und ist NICHT Baseline: stabil nur in Chromium-Engines (Chrome/Edge ab 109), Firefox unterstützt sie nicht, Safari laut einer Sekundärquelle ab 26.2 nur hinter einem standardmäßig deaktivierten Flag.
**Woran man es erkennt:** <script type="speculationrules"> im Quelltext prüfen; auf nicht unterstützten Browsern (Firefox, die meisten Safari-Versionen) hat die Regel keinerlei Effekt — normale Navigation als Fallback, kein Fehler.
**Fix:** Für Mehrseiten-Sites mit klaren, wahrscheinlichen Navigationspfaden (z. B. Startseite → am häufigsten angeklickte Unterseite) <script type="speculationrules"> mit prerender- oder prefetch-Regeln ergänzen. Da nicht unterstützende Browser die Regeln folgenlos ignorieren, ist das Risiko gering — aber auch der Nutzen nur für einen Teil der Besucher (aktuell primär Chromium) real.
**Beleg:** MDN, Speculation Rules API. · Sicherheit: dokumentiert
**Gilt für:** allgemein

## Build-Pipeline-Effekte

### 10. Minifizierung bei jedem Build aus derselben Quelle ableiten, Property-Mangling gezielt abschalten
**Warum:** Greift ein Skript zur Laufzeit namentlich auf Objekt-Eigenschaften zu, bricht Property-Mangling (das Umbenennen von Objekt-Eigenschaften bei der Minifizierung) diese Zugriffe lautlos — sichtbar nur an der minifizierten Fassung, nicht an der unminifizierten.
**Woran man es erkennt:** Eine interne (kommentierte) und eine externe (minifizierte) Fassung desselben Skripts laufen auseinander, oder ein Feature funktioniert nur in der Dev-Version.
**Fix:** Bei jedem Build sowohl die interne als auch die externe Fassung aus derselben Quelle neu ableiten, statt sie von Hand parallel zu pflegen. Property-Mangling im Minifizierer abschalten, sobald Code dynamisch/namentlich auf Objekteigenschaften zugreift; nur Bezeichner (Variablennamen) umbenennen lassen.
**Beleg:** mccain-digital, HANDOFF Zeile 1337-1349: support.js 67,5 KB → 36,4 KB roh (16,3 → 12,3 KB brotli), pixel-engine.js 137,3 KB → 42,1 KB roh (37,2 → 14,4 KB brotli) — zusammen 26,8 KB weniger über die Leitung, 126 KB weniger zu parsen. · Sicherheit: gemessen
**Gilt für:** allgemein

### 11. Gewichtsanteil je Datei einzeln nachmessen statt zu vermuten
**Warum:** Bei der Frage "wo steckt unnötiges Gewicht" liegt der reale Fund oft in einer ganz anderen Datei als der naheliegendsten (z. B. HTML) vermuteten.
**Woran man es erkennt:** Eine Vermutung über die Gewichtsquelle (etwa "viele Kommentare in der Live-Seite") ohne tatsächlichen Datei-für-Datei-Vergleich.
**Fix:** Jede ausgelieferte Datei einzeln auf ihren Gewichtsanteil (z. B. Kommentaranteil, Whitespace, tote Abschnitte) prüfen, bevor optimiert wird — kompromierte Bytes zählen, nicht rohe.
**Beleg:** mccain-digital, HANDOFF Zeile 1351-1353: In der HTML waren es 0,9 KB von 661 KB — nichts. In pixel-engine.js waren es 55 KB von 137 KB — das war der reale Fund. · Sicherheit: gemessen
**Gilt für:** allgemein

### 12. Inhalt nicht doppelt oder dreifach ausliefern — zur Bauzeit kompilieren statt zur Laufzeit interpretieren
**Warum:** Ein Build, der zur Crawler-Unterstützung einen gerenderten DOM-Snapshot abzieht, aber zusätzlich weiterhin die Design-Tool-Export-Vorlage plus den Interpreter-Code ausliefert, sendet denselben Inhalt bis zu dreifach über die Leitung — und lässt ihn zur Laufzeit ein drittes Mal vom Hauptthread neu aufbauen.
**Woran man es erkennt:** Eine index.html enthält gleichzeitig einen fertig gerenderten DOM-Bereich, ein <template> mit derselben Seite unkompiliert und ein <script type="text/x-...">, das dieselbe Seite zur Laufzeit ein drittes Mal erzeugt — jeweils einzeln in Bytes/gzip nachmessbar.
**Fix:** Den Komponentenbaum zur BAUZEIT serverseitig kompilieren (z. B. renderToString) und danach weder Vorlage noch Laufzeit-Interpreter mit ausliefern, statt zur Laufzeit per generischem Interpreter dieselbe Seite neu zu erzeugen.
**Beleg:** mccain-digital, HANDOFF Abschnitt "DER NÄCHSTE DURCHGANG": index.html 905.070 B roh/133.588 B gzip, davon #dc-prerender 563.511 B/47.003 B gz, <template> 147.219 B/23.670 B gz, Interpreter-Script 172.113 B/56.768 B gz — geplante Kompilierung zur Bauzeit spart 24 KB gz je Seite. · Sicherheit: gemessen
**Gilt für:** allgemein

### 13. Build-Reihenfolge: Alle Runtime-Assets vor dem Browserstart an ihrem Ort
**Warum:** Startet ein Build einen Browser-Prozess zum Rendern und werden Runtime-Assets (Skripte, die dieser Browser lädt) erst DANACH kopiert, rendert der bereits laufende Browser-Kontext noch gegen den alten Stand aus dem vorherigen Lauf.
**Woran man es erkennt:** Ein Build-Ergebnis entspricht sporadisch nicht dem aktuellen Quellcode, obwohl die Quelle korrekt aktualisiert wurde.
**Fix:** Im Build strikt festlegen: alle Runtime-Assets werden VOR dem Start des rendernden Browser-Prozesses final kopiert.
**Beleg:** mccain-digital, HANDOFF "WAS AM 13.9. GEBAUT WURDE": als "tragende" Build-Regel geführt. · Sicherheit: gemessen
**Gilt für:** statisches HTML

### 14. Moderne CSS-Parser können bei unausgeglichenen Klammern ganze Blöcke lautlos verschlucken
**Warum:** Wird ein CSS-Block maschinell angehängt/verschoben (z. B. per sed) und entsteht dabei eine falsche Klammerverschachtelung, interpretiert ein moderner CSS-Parser wie Lightning CSS (von Tailwind v4/Next.js genutzt) alles darunter fälschlich als in den vorherigen Selektor verschachtelt und verwirft betroffene Regeln — ohne Fehlermeldung.
**Woran man es erkennt:** Sichtbar kaputtes Layout oder fehlende Animationen nach einem automatisierten CSS-Merge, ohne dass der Build einen Fehler meldet.
**Fix:** Beim maschinellen Anhängen/Verschieben großer CSS-Blöcke die Klammerbalance vorher/nachher zählen und verifizieren (Anzahl öffnender gleich Anzahl schließender Klammern), statt nur visuell zu prüfen.
**Beleg:** 360, session-handoff-archive.md (Cream-Migration Phase 2, Commit bcddf66): 27 @keyframes per sed-Append angehängt, 9 davon fielen mitten im Build lautlos weg (Grid kaputt); Ursache waren zwei off-by-N-Klammerfehler. Fix verifiziert über einen Klammer-Balance-Zähler (849==849 vorher/nachher). · Sicherheit: gemessen
**Gilt für:** allgemein

### 15. Bild-Encoding zwischen Maschinen ist nicht deterministisch — inhaltlich prüfen, nicht nur per Byte-Diff
**Warum:** Bild-Encoding-Schritte in Build-Pipelines (WebP-/PNG-Kompression) können je nach Maschine/Encoder-Version nicht-deterministische Bytes erzeugen, auch bei identischem Quellbild und identischem Inhalt.
**Woran man es erkennt:** Nach einem lokalen Build unterscheiden sich Bilddateien minimal von der committeten Version (Git zeigt einen Diff), obwohl sich am Bildinhalt sichtbar nichts geändert hat.
**Fix:** Vor dem Committen von Build-Ausgaben prüfen, ob sich der Bildinhalt tatsächlich geändert hat, und rein encoding-bedingte Diffs verwerfen (z. B. git checkout -- auf die betroffenen Dateien), statt sie als echte Änderung zu committen.
**Beleg:** mccain-digital, HANDOFF "STAND 16.9. Pixelstrom, Geprüft": beobachtet als wiederkehrende Falle beim lokalen Bauen auf dem Mac gegenüber der Referenzmaschine/CI. · Sicherheit: gemessen
**Gilt für:** allgemein

### 16. Bild-Assets zentral verwalten und auf Duplikate, Auflösung und größte Verwendung prüfen
**Warum:** Ohne zentrale Verwaltung können Bildvarianten inkonsistent verlinkt werden oder ein Bild wird nur teilweise verdrahtet; ohne Duplikat-/Auflösungsprüfung schleichen sich byte-identische Dateien unter verschiedenen Namen oder zu klein beschaffte Quellbilder ein.
**Woran man es erkennt:** Mehrere Bildpfade im Code statt einer zentralen Referenz; identische MD5-Hashes bei unterschiedlich benannten Bilddateien; ein Quellbild schmaler als seine größte Anzeige-Box im responsiven Layout.
**Fix:** Abgeleitete Bildvarianten über eine einzige, build-seitige Verweistabelle auflösen statt Pfade an mehreren Codestellen zu duplizieren. Bilddateien regelmäßig per Hash-Vergleich (z. B. MD5) auf Duplikate prüfen. Bei der Export-Auflösung eines wiederverwendeten Bildes/Icons ALLE Verwendungsstellen im Projekt berücksichtigen — die größte Anzeige-Box gewinnt, nicht die Stelle, an der gerade optimiert wird. Ist ein Quellbild kleiner als seine größte Anzeige-Box, hilft keine Build-Optimierung — ein höher aufgelöstes Original beschaffen.
**Beleg:** mccain-digital, HANDOFF Zeilen 988-1003: Badge auf 128 px statt 48 px optimiert (9,8 KB PNG → 2,9 KB WebP), weil eine andere Seite dieselbe Grafik in einer 58-px-Box zeigt; zwei Portrait-Bilder byte-identisch (MD5 25edd2c1…); ein Studiofoto mit 1200 px Originalbreite für eine 1344-px-Box zu klein. · Sicherheit: dokumentiert
**Gilt für:** statisches HTML

### 17. Sitemap- und llms.txt-Generierung vom Performance-Build trennen
**Warum:** sitemap.xml und llms.txt werden von Crawlern bzw. Agenten gelesen, nicht vom Browser beim Seitenaufbau — ihre Generierung im selben Build-Lauf hat keinen Einfluss auf TTFB, LCP, TBT oder CLS der ausgelieferten Seite.
**Woran man es erkennt:** Diskussionen über Format/Inhalt von llms.txt/sitemap.xml im selben Kontext wie ein Performance-Build-Review.
**Fix:** Anforderungen an llms.txt/sitemap.xml (z. B. echte Markdown-Links statt Prosa) getrennt vom Performance-Budget behandeln — Details dazu gehören zu SEO-/Agentic-Browsing-Audits, nicht zu diesem Dokument.
**Beleg:** Scope-Klarstellung ohne eigene Projektmessung. · Sicherheit: vermutet
**Gilt für:** allgemein

### 18. Drittanbieter-Laufzeit-Bibliotheken selbst hosten, nicht nur Fonts
**Warum:** Genau wie bei Fonts (Regel 15 in [laden-kritischer-pfad.md](laden-kritischer-pfad.md#15-self-hosting-statt-google-fonts-cdn--mit-ehrlicher-einschränkung)) kostet jede von einem fremden CDN geladene Laufzeit-Bibliothek (z. B. React von unpkg.com) einen zusätzlichen DNS-/TCP-/TLS-Handshake zu einem fremden Origin — und macht die Seite zusätzlich von der Verfügbarkeit und den Cache-Regeln dieses Drittanbieters abhängig.
**Woran man es erkennt:** Externe Script-Quellen wie unpkg.com oder cdn.jsdelivr.net im Network-Panel oder Quelltext, neben oder statt fonts.googleapis.com.
**Fix:** Laufzeit-Bibliotheken ins eigene Origin vendoren statt sie von einem fremden CDN zu laden (z. B. über einen Resource-Hook, der Imports auf die eigene, gebaute Kopie umleitet); per Build-Gate automatisiert verifizieren, dass die ausgelieferte Seite null Drittanbieter-Hosts kontaktiert.
**Beleg:** mccain-digital: verify_site.mjs-Gate bestätigt 0 Drittanbieter-Hosts über 21 Seiten (Commit 2cfdc85, 2026-09-12); nach dem v4-Relaunch kontaktiert die gebaute Seite 32 URLs, alle same-origin (Commit 95fbcb6, 2026-09-11) — vorher lud React standardmäßig von unpkg.com. · Sicherheit: gemessen
**Gilt für:** allgemein

### 19. Ein Preload für ein großes Skript kann den FCP verschlechtern statt verbessern
**Warum:** <link rel="preload" as="script"> konkurriert um Netzwerkpriorität und Bandbreite mit dem Dokument selbst — und das Dokument ist es, was den ersten Paint tatsächlich bringt. Ein vorab geladenes, großes Skript ist deshalb nicht automatisch neutral oder hilfreich; es kann dem Dokument-Request Priorität wegnehmen und den FCP verzögern.
**Woran man es erkennt:** FCP vor und nach dem Hinzufügen eines Skript-Preloads vergleichen, nicht nur die Bytegröße des Preloads betrachten.
**Fix:** Preload für ein großes Skript nur nach einer Vorher/Nachher-FCP-Messung einsetzen und beibehalten, nie aus reiner Vorsicht oder Hoffnung auf Wirkung.
**Beleg:** mccain-digital: React-Preload für die Startseite getestet, Median-FCP 349 ms → 485 ms (schlechter) — Preload wieder entfernt (Commit 5448b74, 2026-09-11). · Sicherheit: gemessen
**Gilt für:** allgemein

## Offene Fragen

- Der Safari-Status der Speculation Rules API (Version 26.2, standardmäßig deaktiviert) stammt nur aus einer Sekundärquelle und wurde nicht gegen WebKit-eigene Release Notes oder den WebKit-Bugtracker gegengeprüft.
- Ob Vercels Edge Network vorkomprimierte Brotli-Dateien direkt ausliefert oder ausschließlich on-the-fly komprimiert, ist in der offiziellen Doku nicht eindeutig geklärt — ein Community-Thread berichtet von Problemen mit vorkomprimierten Brotli-Assets.

## Quellen

- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control
- https://caniuse.com/mdn-http_headers_cache-control_immutable
- https://vercel.com/docs/caching/cache-control-headers
- https://developer.chrome.com/docs/web-platform/bfcache-ccns
- https://web.dev/articles/bfcache
- https://www.testmuai.com/learning-hub/brotli-browser-support/
- https://groups.google.com/a/chromium.org/g/blink-dev/c/GFFOLCF12a4
- https://developer.mozilla.org/en-US/docs/Web/API/Speculation_Rules_API
